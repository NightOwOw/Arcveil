// icons.js — Monochrome SVG icon strings (use currentColor)
// Usage: `<span class="av-icon">${IC.char}</span>`

const s = (d) => `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">${d}</svg>`;

export const IC = {
  char:   s('<circle cx="10" cy="7" r="3.5"/><path d="M3 18c0-3.9 3.1-7 7-7s7 3.1 7 7"/>'),
  loc:    s('<path d="M10 2a5 5 0 0 1 5 5c0 4.5-5 9-5 9S5 11.5 5 7a5 5 0 0 1 5-5z"/><circle cx="10" cy="7" r="1.8"/>'),
  doc:    s('<path d="M5 2h7l4 4v12H5V2z"/><path d="M12 2v4h4"/><line x1="7" y1="9" x2="13" y2="9"/><line x1="7" y1="12" x2="13" y2="12"/>'),
  map:    s('<polygon points="2,5 8,2 12,5 18,2 18,15 12,18 8,15 2,18"/><line x1="8" y1="2" x2="8" y2="15"/><line x1="12" y1="5" x2="12" y2="18"/>'),
  lore:   s('<path d="M5 2h4a1 1 0 0 1 1 1v14a1 1 0 0 0-1-1H5V2z"/><path d="M15 2h-4a1 1 0 0 0-1 1v14a1 1 0 0 1 1-1h4V2z"/>'),
  link:   s('<circle cx="5" cy="10" r="2.5"/><circle cx="15" cy="10" r="2.5"/><line x1="7.5" y1="10" x2="12.5" y2="10"/>'),
  pencil: s('<path d="M14 2l4 4-10 10-4 1 1-4z"/><line x1="12" y1="4" x2="16" y2="8"/>'),
  img:    s('<rect x="2" y="4" width="16" height="12" rx="1.5"/><circle cx="7" cy="9" r="1.5"/><path d="M2 14l4-4 3 3 3-4 6 6"/>'),
  connect:s('<circle cx="5" cy="10" r="2"/><circle cx="15" cy="5" r="2"/><circle cx="15" cy="15" r="2"/><line x1="7" y1="9" x2="13" y2="6"/><line x1="7" y1="11" x2="13" y2="14"/>'),
  color:  s('<circle cx="10" cy="10" r="7"/><path d="M10 3v14M3 10h14" stroke-opacity="0.4"/><circle cx="10" cy="10" r="2.5" fill="currentColor" stroke="none"/>'),
  trash:  s('<polyline points="4,7 16,7"/><path d="M6 7V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><rect x="5" y="7" width="10" height="11" rx="1"/>'),
  plus:   s('<line x1="10" y1="4" x2="10" y2="16"/><line x1="4" y1="10" x2="16" y2="10"/>'),
  check:  s('<polyline points="4,10 8,14 16,6"/>'),
  folder: s('<path d="M2 5a1 1 0 0 1 1-1h5l2 2h7a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5z"/>'),
  write:  s('<path d="M17 4l-1-1-9 9-1 3 3-1 9-9z"/><line x1="3" y1="17" x2="17" y2="17"/>'),
  canvas: s('<rect x="3" y="3" width="14" height="14" rx="1.5"/><circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><line x1="8" y1="8" x2="12" y2="12"/>'),
  star:   s('<polygon points="10,2 12.5,7.5 18,8.5 14,12.5 15,18 10,15 5,18 6,12.5 2,8.5 7.5,7.5"/>'),
  eye:    s('<path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"/><circle cx="10" cy="10" r="2.5"/>'),
};
