const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function getAppIcon() {
  const icoPath = path.join(__dirname, 'assets', 'icon.ico');
  const pngPath = path.join(__dirname, 'assets', 'icon.png');
  if (process.platform === 'win32' && fs.existsSync(icoPath)) {
    return icoPath;
  }
  return fs.existsSync(pngPath) ? pngPath : icoPath;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 900,
    minHeight: 650,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false, // Ensures local file:// protocol can load MediaPipe WASM and AI models offline
      allowRunningInsecureContent: false
    },
    icon: getAppIcon(),
    title: 'Parichiti Studios - Passport Photo Studio',
    backgroundColor: '#0f172a',
    autoHideMenuBar: false,
    show: false
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the initial quick generator page
  mainWindow.loadFile('index.html');

  // Open external links in user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:') || url.startsWith('mailto:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Create Windows-friendly application menu with full studio navigation
  const template = [
    {
      label: 'Studio',
      submenu: [
        {
          label: 'Simple Mode (Passport & Stamp)',
          accelerator: 'CmdOrCtrl+1',
          click: () => mainWindow.loadFile('index.html')
        },
        {
          label: 'Pro AI Editor',
          accelerator: 'CmdOrCtrl+2',
          click: () => mainWindow.loadFile('editor.html')
        },
        {
          label: 'A4 Print Studio',
          accelerator: 'CmdOrCtrl+3',
          click: () => mainWindow.loadFile('print.html')
        },
        { type: 'separator' },
        {
          label: 'Open Photo...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:action', 'open-file');
            }
          }
        },
        {
          label: 'Save Output...',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:action', 'save-file');
            }
          }
        },
        {
          label: 'Print Sheet...',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:action', 'print-sheet');
            }
          }
        },
        {
          label: 'Export PDF...',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:action', 'export-pdf');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
          role: 'quit'
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Parichiti Studios Website',
          click: async () => {
            await shell.openExternal('https://thesagarroy.github.io/Parichiti-Studios-Photos/');
          }
        },
        {
          label: 'Developer: Sagar Roy (GitHub)',
          click: async () => {
            await shell.openExternal('https://github.com/thesagarroy');
          }
        },
        { type: 'separator' },
        {
          label: 'Developer Tools',
          accelerator: 'F12',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          }
        },
        {
          label: 'About Parichiti Studios',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Parichiti Studios',
              message: 'Parichiti Studios - Passport Photo Studio',
              detail: 'Version 2.1.0\nCreated by Sagar Roy (Parichiti Digital Services)\n\nComplete offline Indian Passport, PAN, Stamp, and Visa photo generation suite with 300 DPI A4 print engine.',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers for Native Windows features
ipcMain.handle('dialog:openFile', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Photo - Parichiti Studios',
    properties: ['openFile'],
    filters: [
      { name: 'Image Files', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  const fileData = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return {
    filePath,
    fileName: path.basename(filePath),
    dataUrl: `data:${mimeType};base64,${fileData.toString('base64')}`
  };
});

ipcMain.handle('dialog:saveFile', async (event, { dataUrl, defaultName }) => {
  if (!mainWindow) return { success: false };
  const ext = (defaultName && path.extname(defaultName).slice(1)) || 'jpg';
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Output - Parichiti Studios',
    defaultPath: defaultName || 'parichiti-passport-photo.jpg',
    filters: [
      { name: `${ext.toUpperCase()} Image`, extensions: [ext] },
      { name: 'JPEG Image (*.jpg)', extensions: ['jpg', 'jpeg'] },
      { name: 'PNG Image (*.png)', extensions: ['png'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePath) return { success: false };

  try {
    let buffer;
    if (dataUrl.startsWith('data:')) {
      const base64Data = dataUrl.replace(/^data:[^;]+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      buffer = Buffer.from(dataUrl);
    }
    fs.writeFileSync(result.filePath, buffer);
    return { success: true, filePath: result.filePath };
  } catch (err) {
    console.error('Failed to save file:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('action:print', async () => {
  if (!mainWindow) return { success: false };
  return new Promise((resolve) => {
    mainWindow.webContents.print({ silent: false, printBackground: true }, (success, failureReason) => {
      resolve({ success, failureReason });
    });
  });
});

ipcMain.handle('action:printToPDF', async (event, { defaultName }) => {
  if (!mainWindow) return { success: false };
  try {
    const pdfBuffer = await mainWindow.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      marginsType: 0
    });
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export A4 Print Sheet as PDF',
      defaultPath: defaultName || 'parichiti-passport-sheet.pdf',
      filters: [{ name: 'PDF Document (*.pdf)', extensions: ['pdf'] }]
    });
    if (result.canceled || !result.filePath) return { success: false };
    fs.writeFileSync(result.filePath, pdfBuffer);
    return { success: true, filePath: result.filePath };
  } catch (err) {
    console.error('PDF export failed:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('action:openExternal', async (event, url) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:'))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

ipcMain.handle('nav:to', (event, page) => {
  if (!mainWindow) return;
  if (page === 'editor' || page === 'editor.html') {
    mainWindow.loadFile('editor.html');
  } else if (page === 'print' || page === 'print.html') {
    mainWindow.loadFile('print.html');
  } else {
    mainWindow.loadFile('index.html');
  }
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
