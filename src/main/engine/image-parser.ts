import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ImageMetadata, ImageBootType } from '../../shared/types';

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

export async function parseImageMetadata(filePath: string): Promise<ImageMetadata> {
  const stats = await fs.promises.stat(filePath);
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase().replace('.', '');

  let imageType: ImageMetadata['imageType'] = 'unknown';
  if (['iso'].includes(ext)) imageType = 'iso';
  else if (['img', 'bin', 'raw'].includes(ext)) imageType = 'img';
  else if (['dmg'].includes(ext)) imageType = 'dmg';
  else if (['zip'].includes(ext)) imageType = 'zip';
  else if (['xz'].includes(ext)) imageType = 'xz';

  // Read header (first 64KB)
  const fd = await fs.promises.open(filePath, 'r');
  const buffer = Buffer.alloc(65536);
  const { bytesRead } = await fd.read(buffer, 0, 65536, 0);
  await fd.close();

  let isBootable = false;
  let bootType: ImageBootType = 'unknown';
  let osLabel = 'Generic Disk Image';

  // 1. Check for ISO 9660 Volume Descriptor (Offset 0x8000 / 32768)
  if (bytesRead >= 32774) {
    const magic = buffer.toString('ascii', 32769, 32774);
    if (magic === 'CD001') {
      isBootable = true;
      bootType = 'hybrid_iso';
      const volId = buffer.toString('ascii', 32768 + 40, 32768 + 72).trim();
      if (volId) {
        osLabel = volId;
      }
    }
  }

  // 2. Check MBR Boot Signature at byte 510 (0x55, 0xAA)
  if (bytesRead >= 512) {
    if (buffer[510] === 0x55 && buffer[511] === 0xaa) {
      isBootable = true;
      if (bootType === 'unknown') {
        bootType = 'bios_mbr';
      }
    }
  }

  // 3. Check GPT Header at byte 512 ("EFI PART")
  if (bytesRead >= 1024) {
    const gptMagic = buffer.toString('ascii', 512, 520);
    if (gptMagic === 'EFI PART') {
      isBootable = true;
      bootType = 'uefi_only';
    }
  }

  // 4. Infer OS Label from filename heuristics if volume descriptor was blank
  const lowerName = fileName.toLowerCase();
  if (lowerName.includes('ubuntu')) osLabel = 'Ubuntu Linux Desktop/Server';
  else if (lowerName.includes('debian')) osLabel = 'Debian GNU/Linux Installer';
  else if (lowerName.includes('archlinux')) osLabel = 'Arch Linux Live ISO';
  else if (lowerName.includes('fedora')) osLabel = 'Fedora Workstation';
  else if (lowerName.includes('kali')) osLabel = 'Kali Linux Penetration Suite';
  else if (lowerName.includes('tails')) osLabel = 'Tails Amnesic Live Incognito OS';
  else if (lowerName.includes('win11') || lowerName.includes('windows 11')) osLabel = 'Windows 11 Setup (UEFI)';
  else if (lowerName.includes('win10') || lowerName.includes('windows 10')) osLabel = 'Windows 10 Setup (BIOS/UEFI)';
  else if (lowerName.includes('raspios') || lowerName.includes('raspberry')) osLabel = 'Raspberry Pi OS (Raw Image)';

  return {
    filePath,
    fileName,
    fileSizeBytes: stats.size,
    fileSizeFormatted: formatBytes(stats.size),
    imageType,
    isBootable,
    bootType,
    osLabel,
  };
}

export async function calculateImageChecksum(
  filePath: string,
  algorithm: 'sha256' | 'sha1' | 'md5' = 'sha256',
  progressCb?: (percentage: number) => void
): Promise<string> {
  const stats = await fs.promises.stat(filePath);
  const totalSize = stats.size;
  let bytesHashed = 0;

  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm);
    const stream = fs.createReadStream(filePath, { highWaterMark: 4 * 1024 * 1024 });

    stream.on('data', (chunk) => {
      hash.update(chunk);
      bytesHashed += chunk.length;
      if (progressCb && totalSize > 0) {
        progressCb(Math.min(100, Math.round((bytesHashed / totalSize) * 100)));
      }
    });

    stream.on('end', () => {
      resolve(hash.digest('hex'));
    });

    stream.on('error', (err) => {
      reject(err);
    });
  });
}
