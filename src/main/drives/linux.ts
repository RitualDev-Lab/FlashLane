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

export async function detectLinuxDrives(): Promise<UsbDrive[]> {
  try {
    const { stdout } = await execAsync('lsblk -J -b -o NAME,PATH,SIZE,TYPE,MOUNTPOINT,TRAN,MODEL,VENDOR,RM');
    const parsed = JSON.parse(stdout);
    const blockdevices = parsed.blockdevices || [];
    const drives: UsbDrive[] = [];

    for (const dev of blockdevices) {
      if (dev.type !== 'disk') continue;

      const isUsb = dev.tran === 'usb' || Boolean(dev.rm);
      const isSystem = (dev.mountpoint === '/' || dev.mountpoint === '/boot') ||
        (dev.children && dev.children.some((c: any) => c.mountpoint === '/' || c.mountpoint === '/boot'));

      const sizeBytes = Number(dev.size) || 0;
      const mountpoints: string[] = [];
      if (dev.mountpoint) mountpoints.push(dev.mountpoint);
      if (dev.children) {
        for (const child of dev.children) {
          if (child.mountpoint) mountpoints.push(child.mountpoint);
        }
      }

      drives.push({
        id: dev.path || `/dev/${dev.name}`,
        devicePath: dev.path || `/dev/${dev.name}`,
        name: `${(dev.vendor || '').trim()} ${(dev.model || '').trim()} (${dev.name})`.trim(),
        model: (dev.model || '').trim() || 'USB Storage',
        vendor: (dev.vendor || '').trim() || 'Generic',
        sizeBytes,
        sizeFormatted: formatBytes(sizeBytes),
        busType: dev.tran || (isUsb ? 'usb' : 'internal'),
        isRemovable: isUsb,
        isSystemDrive: isSystem,
        mountpoints,
      });
    }

    return drives;
  } catch (err) {
    console.error('Failed to detect Linux drives via lsblk:', err);
    return [];
  }
}
