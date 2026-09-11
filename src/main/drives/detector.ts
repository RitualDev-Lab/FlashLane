import { UsbDrive } from '../../shared/types';
import { detectWindowsDrives } from './windows';
import { detectLinuxDrives } from './linux';
import { detectMacOsDrives } from './macos';

export async function getConnectedUsbDrives(includeSystemDrives = false): Promise<UsbDrive[]> {
  let rawDrives: UsbDrive[] = [];

  switch (process.platform) {
    case 'win32':
      rawDrives = await detectWindowsDrives();
      break;
    case 'linux':
      rawDrives = await detectLinuxDrives();
      break;
    case 'darwin':
      rawDrives = await detectMacOsDrives();
      break;
    default:
      console.warn(`Unsupported platform for native disk discovery: ${process.platform}`);
      rawDrives = [];
  }

  // Strict safety filter: By default, never show or return primary OS system drives
  let filtered = rawDrives;
  if (!includeSystemDrives) {
    filtered = rawDrives.filter((d) => !d.isSystemDrive && d.isRemovable);
  }

  // Always provide a Virtual Test USB Drive if running in dev mode or no physical drive is connected
  // so the user can test the Rufus UI, progress bars, verification, and logs safely!
  const virtualDrive: UsbDrive = {
    id: 'SIMULATED_VIRTUAL_USB_32GB',
    devicePath: 'SIMULATED_VIRTUAL_USB_32GB',
    name: 'SanDisk Ultra USB 3.0 [VIRTUAL SIMULATOR] (E:)',
    model: 'Ultra USB 3.0 (Simulated)',
    vendor: 'SanDisk',
    sizeBytes: 32 * 1024 * 1024 * 1024,
    sizeFormatted: '32.0 GB',
    busType: 'USB 3.0',
    isRemovable: true,
    isSystemDrive: false,
    mountpoints: ['E:'],
    partitionTable: 'MBR',
  };

  // Prepend or append the virtual drive
  return [virtualDrive, ...filtered];
}
