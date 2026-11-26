// הצבא הקטן - מעטפת שולחנית (Windows / Linux)
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 760,
    minWidth: 800,
    minHeight: 480,
    backgroundColor: '#3a2415',
    title: 'הצבא הקטן',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, backgroundThrottling: false },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  win.on('page-title-updated', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') win.setFullScreen(!win.isFullScreen());
  });
  win.on('closed', () => (win = null));
}

function setupAutoUpdate() {
  if (!app.isPackaged) return;
  try {
    // מוריד עדכון ברקע מ-GitHub Releases ומתקין אותו ביציאה, כך שההפעלה הבאה כבר מעודכנת
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('error', () => {});
    autoUpdater.checkForUpdates().catch(() => {});
    setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 60 * 60 * 1000);
  } catch (e) {
    /* ללא עדכונים אוטומטיים */
  }
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(() => {
    createWindow();
    setupAutoUpdate();
    app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow());
  });
  app.on('window-all-closed', () => app.quit());
}
