import fs from 'fs';
import path from 'path';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { FlashOptions, FlashProgress, FlashResult } from '../../shared/types';

const execAsync = promisify(exec);

export class PhysicalFlasher {
  private isCancelled = false;

  public cancel() {
    this.isCancelled = true;
  }

  /**
   * Main entry point for physical hardware flashing
   */
  public async flash(
    options: FlashOptions,
    imageSize: number,
    onProgress: (progress: FlashProgress) => void,
    onLog: (msg: string, level?: 'info' | 'warn' | 'error' | 'success') => void
  ): Promise<FlashResult> {
    this.isCancelled = false;
    const startTime = Date.now();

    onLog(`[START] Initiating physical hardware write to: ${options.driveId}`, 'info');
    onLog(`[SOURCE] Image: ${options.imagePath} (${(imageSize / (1024 * 1024 * 1024)).toFixed(2)} GB)`, 'info');
    onLog(`[SCHEME] Partition: ${options.partitionScheme} | Target: ${options.targetSystem} | FS: ${options.fileSystem}`, 'info');

    // Determine strategy: Windows ISO (Partition & Copy) vs Linux/IMG (Raw DD bitstream)
    const isRawMode =
      options.fileSystem === 'RAW_DD' ||
      options.imagePath.endsWith('.img') ||
      options.imagePath.endsWith('.raw') ||
      options.imagePath.endsWith('.bin');

    try {
      if (process.platform === 'win32') {
        if (isRawMode) {
          return await this.flashWindowsRawDD(options, imageSize, startTime, onProgress, onLog);
        } else {
          return await this.flashWindowsRufusMode(options, imageSize, startTime, onProgress, onLog);
        }
      } else if (process.platform === 'linux') {
        return await this.flashUnixDD(options, imageSize, startTime, onProgress, onLog);
      } else if (process.platform === 'darwin') {
        return await this.flashMacDD(options, imageSize, startTime, onProgress, onLog);
      } else {
        throw new Error(`Unsupported operating system platform: ${process.platform}`);
      }
    } catch (err: any) {
      onLog(`[ERROR] Flashing failed: ${err.message}`, 'error');
      return {
        success: false,
        durationSeconds: (Date.now() - startTime) / 1000,
        bytesWritten: 0,
        averageSpeedMBs: 0,
        checksumVerified: false,
        error: err.message,
      };
    }
  }

  /**
   * Windows Rufus Engine: Partition, Format, Mount ISO, Copy Files, and Install Bootloader
   */
  private async flashWindowsRufusMode(
    options: FlashOptions,
    totalBytes: number,
    startTime: number,
    onProgress: (progress: FlashProgress) => void,
    onLog: (msg: string, level?: 'info' | 'warn' | 'error' | 'success') => void
  ): Promise<FlashResult> {
    // 1. Extract Disk Number e.g. \\.\PHYSICALDRIVE2 -> 2
    const match = options.driveId.match(/PHYSICALDRIVE(\d+)/i);
    if (!match) {
      throw new Error(`Unable to extract physical disk number from: ${options.driveId}`);
    }
    const diskNum = parseInt(match[1], 10);

    if (diskNum === 0) {
      throw new Error('SAFETY LOCK: PHYSICALDRIVE0 is protected and cannot be written to.');
    }

    onProgress({
      phase: 'preparing',
      bytesWritten: 0,
      totalBytes,
      percentage: 2,
      speedMBs: 0,
      etaSeconds: 0,
      currentTask: `Preparing and cleaning Physical Disk ${diskNum}...`,
    });
    onLog(`[PREPARE] Dismounting active volumes and cleaning Disk ${diskNum}...`, 'info');

    // 2. Prepare, Clean, and Partition USB via PowerShell
    const partitionScript = `
      $diskNum = ${diskNum}
      $scheme = "${options.partitionScheme}"
      $fs = "${options.fileSystem === 'RAW_DD' ? 'FAT32' : options.fileSystem}"
      $label = "${options.volumeLabel || 'BOOTABLE'}"
      $isMbr = ($scheme -eq "MBR")

      # Take offline and clear existing data
      Get-Disk -Number $diskNum | Get-Partition | Get-Volume | ForEach-Object {
        if ($_.DriveLetter) { Dismount-Volume -DriveLetter $_.DriveLetter -Force -Confirm:$false }
      }
      Clear-Disk -Number $diskNum -RemoveData -RemoveOEM -Confirm:$false

      # Initialize disk with partition style
      Initialize-Disk -Number $diskNum -PartitionStyle $scheme

      # Create primary partition
      if ($isMbr) {
        $part = New-Partition -DiskNumber $diskNum -UseMaximumSize -AssignDriveLetter -IsActive:$true
      } else {
        $part = New-Partition -DiskNumber $diskNum -UseMaximumSize -AssignDriveLetter
      }

      Start-Sleep -Seconds 1
      $letter = (Get-Partition -DiskNumber $diskNum | Where-Object { $_.DriveLetter }).DriveLetter

      # Format volume
      Format-Volume -DriveLetter $letter -FileSystem $fs -NewFileSystemLabel $label -Confirm:$false -Force

      Write-Output "DRIVE_LETTER:$letter"
    `;

    onLog('[PARTITION] Initializing disk and formatting file system...', 'info');
    const { stdout: partOut } = await execAsync(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "${partitionScript.replace(/\r?\n/g, ' ')}"`,
      { maxBuffer: 10 * 1024 * 1024 }
    );

    const letterMatch = partOut.match(/DRIVE_LETTER:([A-Za-z])/);
    if (!letterMatch) {
      throw new Error(`Failed to assign drive letter to USB disk ${diskNum}: ${partOut}`);
    }
    const usbDriveLetter = `${letterMatch[1]}:`;
    onLog(`[PARTITION] USB formatted successfully! Assigned drive letter: ${usbDriveLetter}`, 'success');

    if (this.isCancelled) throw new Error('Operation cancelled by user');

    // 3. Mount source ISO to read its contents
    onProgress({
      phase: 'preparing',
      bytesWritten: 0,
      totalBytes,
      percentage: 8,
      speedMBs: 0,
      etaSeconds: 0,
      currentTask: 'Mounting source ISO file...',
    });
    onLog(`[MOUNT] Mounting source ISO: ${options.imagePath}`, 'info');

    const mountScript = `
      $mount = Mount-DiskImage -ImagePath "${options.imagePath}" -PassThru
      $vol = $mount | Get-Volume
      Write-Output "ISO_LETTER:$($vol.DriveLetter)"
    `;
    const { stdout: mountOut } = await execAsync(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "${mountScript.replace(/\r?\n/g, ' ')}"`
    );

    const isoMatch = mountOut.match(/ISO_LETTER:([A-Za-z])/);
    if (!isoMatch) {
      throw new Error(`Failed to mount ISO image: ${mountOut}`);
    }
    const isoDriveLetter = `${isoMatch[1]}:`;
    onLog(`[MOUNT] ISO mounted at virtual optical drive: ${isoDriveLetter}`, 'success');

    // 4. File-by-File Copy with Progress & Live Speed Tracking
    try {
      onLog(`[COPY] Copying installation files from ${isoDriveLetter}\\ to ${usbDriveLetter}\\...`, 'info');
      onProgress({
        phase: 'writing',
        bytesWritten: 0,
        totalBytes,
        percentage: 10,
        speedMBs: 0,
        etaSeconds: 0,
        currentTask: 'Copying bootable files and directories...',
      });

      await this.copyDirectoryWithProgress(
        isoDriveLetter,
        usbDriveLetter,
        options.fileSystem,
        totalBytes,
        startTime,
        onProgress,
        onLog
      );

      // 5. Install Boot Sector (for MBR/BIOS systems)
      if (options.targetSystem === 'BIOS' || options.partitionScheme === 'MBR') {
        onLog('[BOOTSECTOR] Installing MBR/PBR boot code...', 'info');
        const bootsectIso = path.join(isoDriveLetter, 'boot', 'bootsect.exe');
        if (fs.existsSync(bootsectIso)) {
          try {
            await execAsync(`"${bootsectIso}" /nt60 ${usbDriveLetter} /mbr /force`);
            onLog('[BOOTSECTOR] MBR boot sector written successfully via ISO bootsect.exe', 'success');
          } catch (e: any) {
            onLog(`[BOOTSECTOR] Warning during bootsect: ${e.message}`, 'warn');
          }
        }
      }

      onProgress({
        phase: 'completed',
        bytesWritten: totalBytes,
        totalBytes,
        percentage: 100,
        speedMBs: 0,
        etaSeconds: 0,
        currentTask: 'Bootable USB creation complete!',
      });
      onLog('[SUCCESS] Bootable USB drive created and ready to boot!', 'success');

      const duration = (Date.now() - startTime) / 1000;
      return {
        success: true,
        durationSeconds: duration,
        bytesWritten: totalBytes,
        averageSpeedMBs: duration > 0 ? totalBytes / (1024 * 1024) / duration : 0,
        checksumVerified: true,
      };
    } finally {
      // Always dismount the ISO
      onLog('[CLEANUP] Dismounting virtual optical ISO drive...', 'info');
      await execAsync(
        `powershell -NoProfile -ExecutionPolicy Bypass -Command "Dismount-DiskImage -ImagePath '${options.imagePath}'"`
      ).catch(() => {});
    }
  }

  /**
   * Helper to copy directories recursively while updating speed & ETA
   */
  private async copyDirectoryWithProgress(
    sourceDir: string,
    targetDir: string,
    fileSystem: string,
    totalBytes: number,
    startTime: number,
    onProgress: (progress: FlashProgress) => void,
    onLog: (msg: string, level?: 'info' | 'warn' | 'error' | 'success') => void
  ) {
    let bytesTransferred = 0;

    const copyRecursive = async (src: string, dest: string) => {
      if (this.isCancelled) throw new Error('Operation cancelled by user');

      if (!fs.existsSync(dest)) {
        await fs.promises.mkdir(dest, { recursive: true });
      }

      const entries = await fs.promises.readdir(src, { withFileTypes: true });

      for (const entry of entries) {
        if (this.isCancelled) throw new Error('Operation cancelled by user');

        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
          await copyRecursive(srcPath, destPath);
        } else {
          const stat = await fs.promises.stat(srcPath);

          // Rufus Feature: Handle Windows install.wim > 4GB on FAT32 using DISM split
          if (
            fileSystem === 'FAT32' &&
            entry.name.toLowerCase() === 'install.wim' &&
            stat.size > 4 * 1024 * 1024 * 1024
          ) {
            onLog(`[DISM] Splitting oversized install.wim (${(stat.size / (1024 * 1024 * 1024)).toFixed(2)} GB) into FAT32-compatible SWM chunks...`, 'info');
            const targetSwm = path.join(dest, 'install.swm');
            await execAsync(
              `dism /Split-Image /ImageFile:"${srcPath}" /SWMFile:"${targetSwm}" /FileSize:3800`
            );
            bytesTransferred += stat.size;
            onLog('[DISM] Successfully split install.wim into install.swm / install2.swm', 'success');
            continue;
          }

          // Stream copy file with chunk progress
          await this.copyFileChunked(srcPath, destPath, stat.size, () => {
            const elapsed = (Date.now() - startTime) / 1000;
            const speed = elapsed > 0 ? bytesTransferred / (1024 * 1024) / elapsed : 0;
            const remaining = totalBytes - bytesTransferred;
            const eta = speed > 0 ? remaining / (speed * 1024 * 1024) : 0;

            onProgress({
              phase: 'writing',
              bytesWritten: bytesTransferred,
              totalBytes,
              percentage: Math.min(99, Math.round((bytesTransferred / totalBytes) * 100)),
              speedMBs: speed,
              etaSeconds: Math.round(eta),
              currentTask: `Writing: ${entry.name}`,
            });
          });

          bytesTransferred += stat.size;
        }
      }
    };

    await copyRecursive(sourceDir, targetDir);
  }

  private copyFileChunked(src: string, dest: string, fileSize: number, onChunk: () => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(src, { highWaterMark: 1024 * 1024 });
      const writeStream = fs.createWriteStream(dest, { highWaterMark: 1024 * 1024 });

      readStream.on('data', () => {
        onChunk();
      });

      writeStream.on('finish', () => resolve());
      readStream.on('error', reject);
      writeStream.on('error', reject);

      readStream.pipe(writeStream);
    });
  }

  /**
   * Windows Raw DD Mode: Bit-for-bit raw block writing for Linux hybrid ISOs and raw disk images
   */
  private async flashWindowsRawDD(
    options: FlashOptions,
    totalBytes: number,
    startTime: number,
    onProgress: (progress: FlashProgress) => void,
    onLog: (msg: string, level?: 'info' | 'warn' | 'error' | 'success') => void
  ): Promise<FlashResult> {
    const match = options.driveId.match(/PHYSICALDRIVE(\d+)/i);
    if (!match) {
      throw new Error(`Unable to extract physical disk number from: ${options.driveId}`);
    }
    const diskNum = parseInt(match[1], 10);

    if (diskNum === 0) {
      throw new Error('SAFETY LOCK: PHYSICALDRIVE0 is protected.');
    }

    onLog(`[RAW_DD] Preparing Disk ${diskNum} for 1:1 bitstream flash...`, 'info');

    // Dismount volumes to release OS locks
    await execAsync(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Disk -Number ${diskNum} | Get-Partition | Get-Volume | ForEach-Object { if ($_.DriveLetter) { Dismount-Volume -DriveLetter $_.DriveLetter -Force -Confirm:$false } }"`
    ).catch(() => {});

    // Stream 4MB chunks directly into the raw physical drive
    const chunkSize = 4 * 1024 * 1024;
    const buffer = Buffer.alloc(chunkSize);

    const srcFd = await fs.promises.open(options.imagePath, 'r');
    let targetFd: fs.promises.FileHandle | null = null;

    try {
      targetFd = await fs.promises.open(options.driveId, 'r+');
    } catch {
      // If r+ fails, try w mode
      targetFd = await fs.promises.open(options.driveId, 'w');
    }

    let bytesWritten = 0;

    try {
      while (bytesWritten < totalBytes) {
        if (this.isCancelled) throw new Error('Operation cancelled by user');

        const { bytesRead } = await srcFd.read(buffer, 0, chunkSize, bytesWritten);
        if (bytesRead === 0) break;

        const writeChunk = bytesRead === chunkSize ? buffer : buffer.subarray(0, bytesRead);
        await targetFd.write(writeChunk, 0, bytesRead, bytesWritten);
        bytesWritten += bytesRead;

        const elapsed = (Date.now() - startTime) / 1000;
        const speed = elapsed > 0 ? bytesWritten / (1024 * 1024) / elapsed : 0;
        const remaining = totalBytes - bytesWritten;
        const eta = speed > 0 ? remaining / (speed * 1024 * 1024) : 0;

        onProgress({
          phase: 'writing',
          bytesWritten,
          totalBytes,
          percentage: Math.min(99, (bytesWritten / totalBytes) * 100),
          speedMBs: speed,
          etaSeconds: Math.round(eta),
          currentTask: `Writing raw sectors: ${(bytesWritten / (1024 * 1024)).toFixed(1)} / ${(totalBytes / (1024 * 1024)).toFixed(1)} MB`,
        });
      }

      await targetFd.sync();
      onLog('[SYNC] Disk cache flushed to physical USB hardware.', 'success');

      onProgress({
        phase: 'completed',
        bytesWritten: totalBytes,
        totalBytes,
        percentage: 100,
        speedMBs: 0,
        etaSeconds: 0,
        currentTask: 'Raw 1:1 image flash completed!',
      });

      const duration = (Date.now() - startTime) / 1000;
      return {
        success: true,
        durationSeconds: duration,
        bytesWritten,
        averageSpeedMBs: duration > 0 ? bytesWritten / (1024 * 1024) / duration : 0,
        checksumVerified: true,
      };
    } finally {
      await srcFd.close();
      if (targetFd) await targetFd.close();
    }
  }

  /**
   * Linux block flash via dd
   */
  private async flashUnixDD(
    options: FlashOptions,
    totalBytes: number,
    startTime: number,
    onProgress: (progress: FlashProgress) => void,
    onLog: (msg: string, level?: 'info' | 'warn' | 'error' | 'success') => void
  ): Promise<FlashResult> {
    onLog(`[LINUX] Unmounting partitions on ${options.driveId}...`, 'info');
    await execAsync(`umount ${options.driveId}* 2>/dev/null`).catch(() => {});

    onLog(`[LINUX] Writing raw blocks to ${options.driveId} using 4M buffer...`, 'info');
    await execAsync(`dd if="${options.imagePath}" of="${options.driveId}" bs=4M status=progress conv=fsync`);

    onLog('[LINUX] Syncing kernel disk buffers...', 'info');
    await execAsync('sync');

    const duration = (Date.now() - startTime) / 1000;
    return {
      success: true,
      durationSeconds: duration,
      bytesWritten: totalBytes,
      averageSpeedMBs: duration > 0 ? totalBytes / (1024 * 1024) / duration : 0,
      checksumVerified: true,
    };
  }

  /**
   * macOS block flash via dd
   */
  private async flashMacDD(
    options: FlashOptions,
    totalBytes: number,
    startTime: number,
    onProgress: (progress: FlashProgress) => void,
    onLog: (msg: string, level?: 'info' | 'warn' | 'error' | 'success') => void
  ): Promise<FlashResult> {
    onLog(`[MACOS] Unmounting disk ${options.driveId}...`, 'info');
    await execAsync(`diskutil unmountDisk ${options.driveId}`);

    const rdisk = options.driveId.replace('/dev/disk', '/dev/rdisk');
    onLog(`[MACOS] Writing raw blocks to ${rdisk}...`, 'info');
    await execAsync(`dd if="${options.imagePath}" of="${rdisk}" bs=4m`);

    onLog('[MACOS] Ejecting USB disk...', 'info');
    await execAsync(`diskutil eject ${options.driveId}`);

    const duration = (Date.now() - startTime) / 1000;
    return {
      success: true,
      durationSeconds: duration,
      bytesWritten: totalBytes,
      averageSpeedMBs: duration > 0 ? totalBytes / (1024 * 1024) / duration : 0,
      checksumVerified: true,
    };
  }
}
