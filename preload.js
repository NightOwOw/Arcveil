// ============================================
// preload.js — contextBridge secure IPC bridge
// Exposes safe APIs to renderer via window.api
// ============================================

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Window controls
  minimize:      ()    => ipcRenderer.invoke('window:minimize'),
  maximize:      ()    => ipcRenderer.invoke('window:maximize'),
  close:         ()    => ipcRenderer.invoke('window:close'),
  isMaximized:   ()    => ipcRenderer.invoke('window:is-maximized'),

  // File dialogs
  openDialog:    ()    => ipcRenderer.invoke('dialog:open'),
  saveDialog:    (n)   => ipcRenderer.invoke('dialog:save', n),
  openMedia:     ()    => ipcRenderer.invoke('dialog:open-media'),

  // File system
  fsRead:        (p)   => ipcRenderer.invoke('fs:read', p),
  fsWrite:       (p,c) => ipcRenderer.invoke('fs:write', p, c),
  fsExists:      (p)   => ipcRenderer.invoke('fs:exists', p),
  fsReadBinary:  (p)   => ipcRenderer.invoke('fs:read-binary', p),
  fsMkdir:       (p)   => ipcRenderer.invoke('fs:mkdir', p),
  fsList:        (p)   => ipcRenderer.invoke('fs:list', p),
  fsCopy:        (s,d) => ipcRenderer.invoke('fs:copy', s, d),

  // Shell
  openPath:      (p)   => ipcRenderer.invoke('shell:open-path', p),
  showFolder:    (p)   => ipcRenderer.invoke('shell:show-folder', p),

  // Settings
  loadSettings:  ()    => ipcRenderer.invoke('settings:load'),
  saveSettings:  (d)   => ipcRenderer.invoke('settings:save', d),

  // App info
  version:       ()    => ipcRenderer.invoke('app:version'),
  platform:      ()    => ipcRenderer.invoke('app:platform'),
  userData:      ()    => ipcRenderer.invoke('app:user-data'),

  // Events from main → renderer
  on:  (ch, fn) => ipcRenderer.on(ch, (_, ...a) => fn(...a)),
  off: (ch, fn) => ipcRenderer.removeListener(ch, fn),

  // Updates
  checkForUpdate: ()   => ipcRenderer.invoke('app:check-update'),

  // Quit
  quitConfirmed: ()    => ipcRenderer.send('app:quit-confirmed'),

  // Overlay windows
  overlayHudToggle:    ()    => ipcRenderer.invoke('overlay:hud-toggle'),
  overlaySummonToggle: ()    => ipcRenderer.invoke('overlay:summon-toggle'),
  overlayEdgeToggle:   ()    => ipcRenderer.invoke('overlay:edge-toggle'),
  overlayHudOpen:      ()    => ipcRenderer.invoke('overlay:hud-open'),
  overlayEdgeOpen:     ()    => ipcRenderer.invoke('overlay:edge-open'),
  overlaySummonOpen:   ()    => ipcRenderer.invoke('overlay:summon-open'),
  overlayStatePush:    (d)   => ipcRenderer.send('overlay:state-push', d),

  // Clipboard bridge
  clipboardEnable:     ()    => ipcRenderer.invoke('clipboard-bridge:enable'),
  clipboardDisable:    ()    => ipcRenderer.invoke('clipboard-bridge:disable'),
  clipboardStatus:     ()    => ipcRenderer.invoke('clipboard-bridge:status'),

  // Window context
  windowContextEnable: ()    => ipcRenderer.invoke('window-context:enable'),
  windowContextDisable:()    => ipcRenderer.invoke('window-context:disable'),

  // Companion window
  companionOpen:        ()    => ipcRenderer.invoke('companion:open'),
  companionClose:       ()    => ipcRenderer.invoke('companion:close'),
  companionToggle:      ()    => ipcRenderer.invoke('companion:toggle'),
  companionSay:           (p)   => ipcRenderer.send('companion:say', p),
  companionSwitch:        (id)  => ipcRenderer.send('companion:switch', id),
  companionStateUpdate:   (d)   => ipcRenderer.send('companion:state-update', d),
  companionSettingsUpdate:(d)   => ipcRenderer.send('companion:settings-update', d),
});
