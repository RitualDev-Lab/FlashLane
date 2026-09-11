import { FlashOptions, FlashProgress, FlashResult } from '../../shared/types';

export class FlashingSimulator {
  private isCancelled = false;

  public cancel() {
    this.isCancelled = true;
  }

  public async runSimulation(
    options: FlashOptions,
    imageSizeBytes: number,
    onProgress: (progress: FlashProgress) => void,
    onLog: (msg: string, level?: 'info' | 'warn' | 'error' | 'success') => void
  ): Promise<FlashResult> {
    this.isCancelled = false;
    const startTime = Date.now();
    const targetSize = Math.max(imageSizeBytes, 100 * 1024 * 1024); // at least 100MB for simulation

    onLog(`[INIT] Starting flash task for: ${options.imagePath}`, 'info');
    onLog(`[TARGET] Selected drive: ${options.driveId} (${options.partitionScheme}/${options.targetSystem})`, 'info');
    onLog(`[SAFETY] Double confirmation verified. Target partition layout: ${options.fileSystem}`, 'info');

    // Phase 1: Preparing & Dismounting
    onProgress({
      phase: 'unmounting',
      bytesWritten: 0,
      totalBytes: targetSize,
      percentage: 2,
      speedMBs: 0,
      etaSeconds: 15,
      currentTask: 'Locking and dismounting existing drive volumes...',
    });
    onLog('[DISMOUNT] Requesting exclusive lock on storage device volumes...', 'info');
    await this.sleep(800);
    if (this.isCancelled) return this.cancelledResult();

    // Phase 2: Partitioning & Formatting
    onProgress({
      phase: 'formatting',
      bytesWritten: 0,
      totalBytes: targetSize,
      percentage: 5,
      speedMBs: 0,
      etaSeconds: 14,
      currentTask: `Writing ${options.partitionScheme} partition table & boot sector...`,
    });
    onLog(`[PARTITION] Initializing ${options.partitionScheme} partition structure (cluster size ${options.clusterSize} bytes)...`, 'info');
    await this.sleep(800);
    if (this.isCancelled) return this.cancelledResult();

    // Phase 3: Writing Blocks (High-Speed Direct I/O)
    const simulatedSpeedMBs = 65; // 65 MB/s simulation write speed
    const stepDurationMs = 150;
    const bytesPerStep = (simulatedSpeedMBs * 1024 * 1024 * stepDurationMs) / 1000;
    let written = 0;

    onLog(`[WRITE] Beginning direct block write with 4MB chunk buffer...`, 'info');

    // To make simulation responsive and realistic, advance in ~30 steps
    const totalSteps = 30;
    const bytesIncrement = targetSize / totalSteps;

    for (let i = 1; i <= totalSteps; i++) {
      if (this.isCancelled) {
        onLog('[CANCEL] User aborted flashing operation.', 'warn');
        return this.cancelledResult();
      }

      written = Math.min(targetSize, Math.round(i * bytesIncrement));
      const percentage = Math.min(85, Math.round((written / targetSize) * 80) + 5);
      const elapsedSeconds = Math.max(1, (Date.now() - startTime) / 1000);
      const currentSpeedMBs = (written / (1024 * 1024)) / elapsedSeconds;
      const remainingBytes = targetSize - written;
      const etaSeconds = Math.max(0, Math.round(remainingBytes / (currentSpeedMBs * 1024 * 1024)));

      onProgress({
        phase: 'writing',
        bytesWritten: written,
        totalBytes: targetSize,
        percentage,
        speedMBs: Number(currentSpeedMBs.toFixed(1)),
        etaSeconds,
        currentTask: `Writing sectors: ${(written / (1024 * 1024)).toFixed(0)} MB / ${(targetSize / (1024 * 1024)).toFixed(0)} MB`,
      });

      if (i % 6 === 0) {
        onLog(`[WRITE PROGRESS] ${percentage}% written (${(written / (1024 * 1024)).toFixed(1)} MB @ ${currentSpeedMBs.toFixed(1)} MB/s)`, 'info');
      }

      await this.sleep(stepDurationMs);
    }

    // Phase 4: Syncing & Verification Pass
    if (options.verifyAfterWrite) {
      onLog(`[VERIFY] Syncing buffers to disk and executing SHA-256 integrity verification...`, 'info');
      onProgress({
        phase: 'verifying',
        bytesWritten: targetSize,
        totalBytes: targetSize,
        percentage: 90,
        speedMBs: 110, // read speeds are faster
        etaSeconds: 3,
        currentTask: 'Verifying raw sector hash match against source ISO...',
      });
      await this.sleep(800);
      if (this.isCancelled) return this.cancelledResult();

      onProgress({
        phase: 'verifying',
        bytesWritten: targetSize,
        totalBytes: targetSize,
        percentage: 98,
        speedMBs: 115,
        etaSeconds: 1,
        currentTask: 'Calculating final checksum comparison...',
      });
      await this.sleep(600);
      onLog('[VERIFY] SHA-256 match confirmed! 0 corrupted sectors found.', 'success');
    }

    // Phase 5: Complete & Safe Eject
    const totalDurationSeconds = Number(((Date.now() - startTime) / 1000).toFixed(1));
    const avgSpeed = Number(((targetSize / (1024 * 1024)) / totalDurationSeconds).toFixed(1));

    onProgress({
      phase: 'completed',
      bytesWritten: targetSize,
      totalBytes: targetSize,
      percentage: 100,
      speedMBs: 0,
      etaSeconds: 0,
      currentTask: 'Flash complete! Device safely unmounted and ready to boot.',
    });

    onLog(`[SUCCESS] Bootable USB created successfully in ${totalDurationSeconds}s (Avg ${avgSpeed} MB/s)!`, 'success');

    return {
      success: true,
      durationSeconds: totalDurationSeconds,
      bytesWritten: targetSize,
      averageSpeedMBs: avgSpeed,
      checksumVerified: true,
    };
  }

  private cancelledResult(): FlashResult {
    return {
      success: false,
      durationSeconds: 0,
      bytesWritten: 0,
      averageSpeedMBs: 0,
      checksumVerified: false,
      error: 'Operation cancelled by user',
    };
  }

  private sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }
}
