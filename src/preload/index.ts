import { contextBridge, ipcRenderer } from 'electron';
import { FlashOptions, FlashProgress, UsbDrive, ImageMetadata, LogEntry, FlashResult } from '../shared/types';

export interface ElectronAPI {
  listDrives: () => Promise<UsbDrive[]>;
  selectImage: () => Promise<string | null>;
  inspectImage: (filePath: string) => Promise<ImageMetadata>;
  checksumImage: (args: { filePath: string; algorithm: 'sha256' | 'sha1' | 'md5' }) => Promise<string>;
  startFlash: (options: FlashOptions) => Promise<FlashResult>;
  cancelFlash: () => Promise<boolean>;
  onProgress: (callback: (progress: FlashProgress) => void) => () => void;
  onLog: (callback: (entry: LogEntry) => void) => () => void;
  onChecksumProgress: (callback: (percent: number) => void) => () => void;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  openExternal: (url: string) => void;
}

const api: ElectronAPI = {
  listDrives: () => ipcRenderer.invoke('drives:list'),
  selectImage: () => ipcRenderer.invoke('image:select'),
  inspectImage: (filePath: string) => ipcRenderer.invoke('image:inspect', filePath),
  checksumImage: (args) => ipcRenderer.invoke('image:checksum', args),
  startFlash: (options: FlashOptions) => ipcRenderer.invoke('flash:start', options),
  cancelFlash: () => ipcRenderer.invoke('flash:cancel'),
  onProgress: (callback) => {
    const handler = (_: any, progress: FlashProgress) => callback(progress);
    ipcRenderer.on('flash:progress', handler);
    return () => ipcRenderer.removeListener('flash:progress', handler);
  },
  onLog: (callback) => {
    const handler = (_: any, entry: LogEntry) => callback(entry);
    ipcRenderer.on('flash:log', handler);
    return () => ipcRenderer.removeListener('flash:log', handler);
  },
  onChecksumProgress: (callback) => {
    const handler = (_: any, percent: number) => callback(percent);
    ipcRenderer.on('image:checksum-progress', handler);
    return () => ipcRenderer.removeListener('image:checksum-progress', handler);
  },
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  openExternal: (url: string) => ipcRenderer.send('shell:openExternal', url),
};

contextBridge.exposeInMainWorld('electronAPI', api);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
