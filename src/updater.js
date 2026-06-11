// updater.js — Auto-update via electron-updater (GitHub Releases)
// CommonJS — used by main process only

const { app, dialog, BrowserWindow } = require('electron');
const path = require('path');

let autoUpdater = null;
let _mainWin = null;

function initUpdater(mainWindow) {
  _mainWin = mainWindow;

  // electron-updater is an optional dependency (not present in dev without install)
  try {
    autoUpdater = require('electron-updater').autoUpdater;
  } catch {
    console.log('[updater] electron-updater not installed — skipping update checks');
    return;
  }

  autoUpdater.autoDownload    = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger          = console;

  autoUpdater.on('checking-for-update', () => {
    _send('updater:checking');
  });

  autoUpdater.on('update-available', info => {
    _send('updater:available', info);
    dialog.showMessageBox(mainWindow, {
      type:    'info',
      title:   'ArcVeil Update Available',
      message: `Version ${info.version} is available.`,
      detail:  'Would you like to download it now?\nYou can install it after ArcVeil closes.',
      buttons: ['Download', 'Later'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.downloadUpdate();
    });
  });

  autoUpdater.on('update-not-available', () => {
    _send('updater:up-to-date');
  });

  autoUpdater.on('download-progress', progress => {
    _send('updater:progress', { percent: Math.round(progress.percent), bytesPerSecond: progress.bytesPerSecond });
  });

  autoUpdater.on('update-downloaded', info => {
    _send('updater:downloaded', info);
    dialog.showMessageBox(mainWindow, {
      type:    'info',
      title:   'Update Ready',
      message: `ArcVeil ${info.version} has been downloaded.`,
      detail:  'Restart now to apply the update?',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall(true, true);
    });
  });

  autoUpdater.on('error', err => {
    console.warn('[updater] error:', err);
    _send('updater:error', err.message);
  });

  // Check on startup (after a short delay)
  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, 8000);
  }
}

function checkForUpdates() {
  if (!autoUpdater) return Promise.resolve();
  return autoUpdater.checkForUpdates().catch(() => {});
}

function _send(channel, data) {
  try {
    if (_mainWin && !_mainWin.isDestroyed()) {
      _mainWin.webContents.send(channel, data);
    }
  } catch {}
}

module.exports = { initUpdater, checkForUpdates };
