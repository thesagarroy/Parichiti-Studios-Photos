// Preload script for Electron
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow renderer to use desktop native features safely
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  isDesktop: true,
  
  // Native file dialogs
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (dataUrl, defaultName) => ipcRenderer.invoke('dialog:saveFile', { dataUrl, defaultName }),
  
  // Native printing & PDF export
  printSheet: () => ipcRenderer.invoke('action:print'),
  printToPDF: (defaultName) => ipcRenderer.invoke('action:printToPDF', { defaultName }),
  
  // External browser links
  openExternal: (url) => ipcRenderer.invoke('action:openExternal', url),
  
  // Navigation between studio pages
  navigateTo: (page) => ipcRenderer.invoke('nav:to', page),
  
  // Listen for menu shortcuts triggered from native application menu
  onMenuAction: (callback) => {
    ipcRenderer.on('menu:action', (_event, action) => {
      if (typeof callback === 'function') {
        callback(action);
      }
    });
  }
});

console.log('Parichiti Studios desktop environment bridge ready');
