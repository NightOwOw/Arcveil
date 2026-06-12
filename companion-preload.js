// companion-preload.js — contextBridge for companion window
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('companionApi', {
  // Inbound events (main → renderer)
  onSay:       (fn) => ipcRenderer.on('companion:say',        (_, text) => fn(text)),
  onSwitch:    (fn) => ipcRenderer.on('companion:switch',     (_, id)   => fn(id)),
  onReady:     (fn) => ipcRenderer.on('companion:ready',      (_, data) => fn(data)),
  onCursorPos: (fn) => ipcRenderer.on('companion:cursor-pos', (_, pos)  => fn(pos)),
  onLoadModel: (fn) => ipcRenderer.on('companion:load-model', (_, url)  => fn(url)),
  onSettings:  (fn) => ipcRenderer.on('companion:settings',   (_, data) => fn(data)),

  // Outbound — mouse / drag
  startDrag:    ()  => ipcRenderer.send('companion:start-drag'),
  stopDrag:     ()  => ipcRenderer.send('companion:stop-drag'),
  enableMouse:  ()  => ipcRenderer.send('companion:enable-mouse'),
  disableMouse: ()  => ipcRenderer.send('companion:disable-mouse'),

  // Outbound — model
  getModelPath:   (id) => ipcRenderer.invoke('companion:get-model-path', id),
  openModelPicker: ()  => ipcRenderer.send('companion:open-model-picker'),

  // Outbound — AI
  aiChat:        (payload) => ipcRenderer.invoke('companion:ai-chat', payload),
  setFocusable:  (bool)    => ipcRenderer.send('companion:set-focusable', bool),
  getAiSettings: ()        => ipcRenderer.invoke('companion:get-ai-settings'),
});
