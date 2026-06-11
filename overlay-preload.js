// overlay-preload.js — shared contextBridge for all overlay windows
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlayApi', {
  onUpdate:  (fn) => ipcRenderer.on('overlay:update',  (_, d) => fn(d)),
  onData:    (fn) => ipcRenderer.on('overlay:data',    (_, d) => fn(d)),
  onShow:    (fn) => ipcRenderer.on('overlay:show',    ()     => fn()),
  onHide:    (fn) => ipcRenderer.on('overlay:hide',    ()     => fn()),
  onMessage: (fn) => ipcRenderer.on('companion:message', (_, d) => fn(d)),

  hide:    ()     => ipcRenderer.send('overlay:hide-self'),
  close:   ()     => ipcRenderer.send('overlay:close-self'),
  moveBy:  (x,y)  => ipcRenderer.send('overlay:move-by', { x, y }),
  resize:  (mode) => ipcRenderer.send('overlay:resize', mode),
  select:  (item) => ipcRenderer.send('overlay:select', item),
});
