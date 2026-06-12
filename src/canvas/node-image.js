// node-image.js — shared node portrait image pick/clear utility
import { state, EventBus, saveHistory } from '../state.js';

export async function pickNodeImage(nodeId) {
  const filePath = await window.api.openMedia();
  if (!filePath) return null;
  if (!/\.(png|jpe?g|gif|webp)$/i.test(filePath)) return null;
  const b64 = await window.api.fsReadBinary(filePath);
  if (!b64) return null;
  const ext = filePath.split('.').pop().toLowerCase();
  const mime = ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : 'image/jpeg';
  const dataUrl = `data:${mime};base64,${b64}`;
  const n = state.nodes.find(n => n.id === nodeId);
  if (!n) return null;
  n.nodeImage = dataUrl;
  saveHistory();
  EventBus.emit('nodes:updated');
  return dataUrl;
}

export function clearNodeImage(nodeId) {
  const n = state.nodes.find(n => n.id === nodeId);
  if (!n) return;
  delete n.nodeImage;
  saveHistory();
  EventBus.emit('nodes:updated');
}

// Renders the hero avatar HTML + wires click-to-upload after DOM insertion.
// Call wireAvatarUpload(nodeId, rerenderFn) immediately after innerHTML is set.
export function avatarHTML(node) {
  const img = node.nodeImage
    ? `<img src="${node.nodeImage}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block">`
    : `<span style="pointer-events:none">${(node.letter || '?')}</span>`;
  return `<div class="profile-avatar node-av-zone" data-nid="${node.id}"
    style="background:${node.color||'#888'};cursor:pointer;position:relative" title="Click to set portrait image">
    ${img}
    ${node.nodeImage ? `<span class="node-av-clear" data-nid="${node.id}" title="Remove image">✕</span>` : ''}
  </div>`;
}

export function wireAvatarUpload(nodeId, rerenderFn) {
  document.querySelectorAll(`.node-av-zone[data-nid="${nodeId}"]`).forEach(el => {
    el.addEventListener('click', async (e) => {
      if (e.target.classList.contains('node-av-clear')) return;
      const url = await pickNodeImage(nodeId);
      if (url) rerenderFn();
    });
  });
  document.querySelectorAll(`.node-av-clear[data-nid="${nodeId}"]`).forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      clearNodeImage(nodeId);
      rerenderFn();
    });
  });
}
