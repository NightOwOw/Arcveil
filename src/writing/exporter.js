// exporter.js — Export writing documents to TXT, Markdown, HTML
import { state } from '../state.js';

export async function exportDocument(docId, format) {
  const doc = (state.writing?.documents || []).find(d => d.id === docId);
  if (!doc) return;

  let content, filename, mimeType;

  switch (format) {
    case 'txt':
      content  = _toPlainText(doc);
      filename = _safeFilename(doc.title) + '.txt';
      mimeType = 'text/plain';
      break;
    case 'md':
      content  = _toMarkdown(doc);
      filename = _safeFilename(doc.title) + '.md';
      mimeType = 'text/markdown';
      break;
    case 'html':
      content  = _toHTML(doc);
      filename = _safeFilename(doc.title) + '.html';
      mimeType = 'text/html';
      break;
    default:
      return;
  }

  // Use Electron save dialog if available
  if (window.api?.saveDialog) {
    const filePath = await window.api.saveDialog(filename);
    if (filePath) {
      await window.api.fsWrite(filePath, content);
      return;
    }
  }

  // Fallback: browser download
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportAllDocuments(format) {
  const docs = state.writing?.documents || [];
  if (!docs.length) return;

  const combined = docs.map(doc => {
    const sep = '─'.repeat(60);
    const header = `\n${sep}\n${doc.title || 'Untitled'}\n${sep}\n\n`;
    return header + (format === 'md' ? _toMarkdown(doc) : _toPlainText(doc));
  }).join('\n\n');

  const project   = state.project?.name || 'ArcVeil Project';
  const filename  = _safeFilename(project) + '-export.' + (format === 'md' ? 'md' : 'txt');

  if (window.api?.saveDialog) {
    const filePath = await window.api.saveDialog(filename);
    if (filePath) { await window.api.fsWrite(filePath, combined); return; }
  }

  const blob = new Blob([combined], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export async function exportProjectJSON() {
  const json     = JSON.stringify(state, null, 2);
  const project  = state.project?.name || 'ArcVeil Project';
  const filename = _safeFilename(project) + '.arcveil.json';

  if (window.api?.saveDialog) {
    const filePath = await window.api.saveDialog(filename);
    if (filePath) { await window.api.fsWrite(filePath, json); return; }
  }

  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function _toPlainText(doc) {
  const title = doc.title || 'Untitled';
  const text  = (doc.text || '').replace(/\n{3,}/g, '\n\n');
  const wc    = text.trim().split(/\s+/).filter(Boolean).length;
  return `${title}\n${'='.repeat(title.length)}\n\nWord count: ${wc}\n\n${text}`;
}

function _toMarkdown(doc) {
  const title = doc.title || 'Untitled';
  const text  = (doc.text || '');
  return `# ${title}\n\n${text}`;
}

function _toHTML(doc) {
  const title = doc.title || 'Untitled';
  const body  = (doc.text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n\n+/g, '</p><p>')
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
body { font-family: Georgia, serif; max-width: 700px; margin: 60px auto; padding: 0 24px; line-height: 1.8; color: #222; }
h1 { font-size: 24px; font-weight: 800; margin-bottom: 8px; }
p { margin: 0 0 1em; }
</style>
</head>
<body>
<h1>${title}</h1>
<p>${body}</p>
</body>
</html>`;
}

function _safeFilename(str) {
  return (str || 'export').replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_').slice(0, 80);
}
