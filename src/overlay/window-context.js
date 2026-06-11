// window-context.js — Active window detection (main process, CommonJS)
// OFF by default. Explicit opt-in required.

const { exec } = require('child_process');
const { ipcMain } = require('electron');

let _enabled  = false;
let _interval = null;
let _lastApp  = '';
let _onContext = null;

const APP_MODES = {
  // Writing apps
  'word': 'writing', 'docs': 'writing', 'notepad': 'writing',
  'scrivener': 'writing', 'typora': 'writing', 'obsidian': 'writing',
  'notion': 'writing', 'ia writer': 'writing',
  // Art apps (Ciona gets excited)
  'clip studio': 'art', 'photoshop': 'art', 'krita': 'art',
  'procreate': 'art', 'aseprite': 'art', 'gimp': 'art',
  'illustrator': 'art', 'affinity': 'art',
  // Research
  'chrome': 'research', 'firefox': 'research', 'edge': 'research',
  'safari': 'research',
  // ArcVeil itself
  'arcveil': 'arcveil',
};

function init(onContextFn) {
  _onContext = onContextFn;
  ipcMain.handle('window-context:enable',  () => enable());
  ipcMain.handle('window-context:disable', () => disable());
  ipcMain.handle('window-context:status',  () => _enabled);
}

function enable() {
  if (_enabled) return;
  _enabled = true;
  _poll();
  _interval = setInterval(_poll, 5000);
}

function disable() {
  _enabled = false;
  clearInterval(_interval);
  _interval = null;
}

function _poll() {
  if (!_enabled) return;
  _getActiveWindow().then(title => {
    if (!title || title === _lastApp) return;
    _lastApp = title;
    const lower = title.toLowerCase();
    let mode = 'other';
    for (const [key, m] of Object.entries(APP_MODES)) {
      if (lower.includes(key)) { mode = m; break; }
    }
    _onContext?.({ title, mode });
  }).catch(() => {});
}

function _getActiveWindow() {
  const platform = process.platform;
  return new Promise((resolve, reject) => {
    let cmd;
    if (platform === 'win32') {
      cmd = `powershell -command "Get-Process | Where-Object {$_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -ne ''} | Select-Object -First 1 MainWindowTitle | Format-List"`;
    } else if (platform === 'darwin') {
      cmd = `osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`;
    } else {
      cmd = `xdotool getactivewindow getwindowname 2>/dev/null`;
    }
    exec(cmd, { timeout: 3000 }, (err, stdout) => {
      if (err) { reject(err); return; }
      const title = stdout.trim().replace(/MainWindowTitle\s*:\s*/i, '');
      resolve(title);
    });
  });
}

module.exports = { init, enable, disable };
