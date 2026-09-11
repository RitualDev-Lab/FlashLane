import { ipcMain, dialog, shell, BrowserWindow } from 'electron';
import { getConnectedUsbDrives } from './drives/detector';
import { parseImageMetadata, calculateImageChecksum } from './engine/image-parser';
import { DiskFlasher } from './engine/flasher';
import { FlashOptions, FlashProgress, UsbDrive, ImageMetadata } from '../shared/types';

let currentFlasher: DiskFlasher | null = null;

export function registerIpcHandlers(mainWindow: BrowserWindow) {
  // 1. Enumerate USB Drives
  ipcMain.handle('drives:list', async (): Promise<UsbDrive[]> => {
    console.log('⚡ [IPC] drives:list requested...');
    const drives = await getConnectedUsbDrives(false);
    console.log(`⚡ [IPC] Found ${drives.length} drives:`, drives.map(d => `${d.name} [${d.devicePath}]`));
    return drives;
  });

  // 2. Open Native File Dialog to Select ISO/IMG
  ipcMain.handle('image:select', async (): Promise<string | null> => {
    console.log('⚡ [IPC] image:select requested...');
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Bootable Disk Image (ISO / IMG)',
      properties: ['openFile'],
      filters: [
        { name: 'Disk Images (*.iso, *.img, *.bin, *.raw, *.dmg)', extensions: ['iso', 'img', 'bin', 'raw', 'dmg', 'gz', 'xz', 'zip'] },
        { name: 'All Files (*.*)', extensions: ['*'] },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      console.log('⚡ [IPC] image:select canceled by user');
      return null;
    }
    console.log('⚡ [IPC] Selected image:', result.filePaths[0]);
    return result.filePaths[0];
  });

  // 3. Inspect Image Metadata & Bootability
  ipcMain.handle('image:inspect', async (_, filePath: string): Promise<ImageMetadata> => {
    return await parseImageMetadata(filePath);
  });

  // 4. Calculate Image Hash
  ipcMain.handle(
    'image:checksum',
    async (_, { filePath, algorithm }: { filePath: string; algorithm: 'sha256' | 'sha1' | 'md5' }): Promise<string> => {
      return await calculateImageChecksum(filePath, algorithm, (percent) => {
        mainWindow.webContents.send('image:checksum-progress', percent);
      });
    }
  );

  // 5. Start Flash Process
  ipcMain.handle('flash:start', async (_, options: FlashOptions) => {
    if (currentFlasher) {
      throw new Error('A flashing task is already running');
    }

    currentFlasher = new DiskFlasher();

    try {
      const result = await currentFlasher.flash(
        options,
        (progress: FlashProgress) => {
          mainWindow.webContents.send('flash:progress', progress);
        },
        (msg: string, level: 'info' | 'warn' | 'error' | 'success' = 'info') => {
          mainWindow.webContents.send('flash:log', {
            timestamp: new Date().toLocaleTimeString(),
            level,
            message: msg,
          });
        }
      );
      return result;
    } finally {
      currentFlasher = null;
    }
  });

  // 6. Cancel Flashing
  ipcMain.handle('flash:cancel', async () => {
    if (currentFlasher) {
      currentFlasher.cancel();
      currentFlasher = null;
      return true;
    }
    return false;
  });

  // 7. Window Controls
  ipcMain.on('window:minimize', () => mainWindow.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.on('window:close', () => mainWindow.close());

  // 8. Open External Links
  ipcMain.on('shell:openExternal', (_, url: string) => {
    shell.openExternal(url);
  });
}
