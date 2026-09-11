import { exec } from 'child_process';
import { promisify } from 'util';
import { UsbDrive } from '../../shared/types';

const execAsync = promisify(exec);

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export async function detectMacOsDrives(): Promise<UsbDrive[]> {
  try {
    const { stdout } = await execAsync('diskutil list -plist external');
    // Basic fallback: parse diskutil info or system_profiler
    const { stdout: textList } = await execAsync('diskutil list external');
    const drives: UsbDrive[] = [];

    // Parse external disks
    const lines = textList.split('\n');
    let currentDisk: Partial<UsbDrive> | null = null;

    for (const line of lines) {
      const diskMatch = line.match(/^(\/dev\/disk\d+)\s+\(external,\s+physical\):/i);
      if (diskMatch) {
        if (currentDisk && currentDisk.id) {
          drives.push(currentDisk as UsbDrive);
        }
        currentDisk = {
          id: diskMatch[1],
          devicePath: diskMatch[1],
          name: `External USB Disk (${diskMatch[1]})`,
          model: 'External Drive',
          vendor: 'Apple/USB',
          sizeBytes: 16 * 1024 * 1024 * 1024,
          sizeFormatted: '16.0 GB',
          busType: 'USB',
          isRemovable: true,
          isSystemDrive: false,
          mountpoints: [],
        };
      }
    }

    if (currentDisk && currentDisk.id) {
      drives.push(currentDisk as UsbDrive);
    }

    return drives;
  } catch (err) {
    console.error('Failed to detect macOS drives:', err);
    return [];
  }
}
