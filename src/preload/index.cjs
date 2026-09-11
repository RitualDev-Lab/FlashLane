const { contextBridge, ipcRenderer } = require('electron');

const api = {
  listDrives: () => ipcRenderer.invoke('drives:list'),
  selectImage: () => ipcRenderer.invoke('image:select'),
  inspectImage: (filePath) => ipcRenderer.invoke('image:inspect', filePath),
  checksumImage: (args) => ipcRenderer.invoke('image:checksum', args),
  startFlash: (options) => ipcRenderer.invoke('flash:start', options),
  cancelFlash: () => ipcRenderer.invoke('flash:cancel'),
  onProgress: (callback) => {
    const handler = (_, progress) => callback(progress);
    ipcRenderer.on('flash:progress', handler);
    return () => ipcRenderer.removeListener('flash:progress', handler);
  },
  onLog: (callback) => {
    const handler = (_, entry) => callback(entry);
    ipcRenderer.on('flash:log', handler);
    return () => ipcRenderer.removeListener('flash:log', handler);
  },
  onChecksumProgress: (callback) => {
    const handler = (_, percent) => callback(percent);
    ipcRenderer.on('image:checksum-progress', handler);
    return () => ipcRenderer.removeListener('image:checksum-progress', handler);
  },
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  openExternal: (url) => ipcRenderer.send('shell:openExternal', url),
};

console.log('⚡ [FlashLane Preload] Initialized successfully. Exposing electronAPI.');
try {
  contextBridge.exposeInMainWorld('electronAPI', api);
  console.log('⚡ [FlashLane Preload] contextBridge.exposeInMainWorld finished successfully.');
} catch (err) {
  console.error('⚡ [FlashLane Preload] Error exposing electronAPI:', err);
}
