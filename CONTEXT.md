# ArcVeil — Project Context

File này ghi lại tất cả các thay đổi, bug đã fix, và quyết định thiết kế trong quá trình phát triển.
Đọc file này khi bắt đầu session mới để nắm nhanh tình trạng dự án.

---

## Tổng quan dự án

**ArcVeil** là Electron desktop app (vanilla JS + ESM, không dùng framework) dành cho writers — quản lý nhân vật, thế giới, cốt truyện, lore, và writing docs. Có thêm companion VRM 3D (Three.js + @pixiv/three-vrm) dạng overlay.

- **Entry point**: `main.js` (Electron main process)
- **UI chính**: `index.html` + `src/router.js` (auto-boot khi load)
- **State**: `src/state.js` — EventBus + global state object + undo/redo
- **Companion**: `companion.html` + `companion-preload.js` (BrowserWindow riêng)
- **Hotkeys**: `src/overlay/hotkeys.js` — globalShortcut registration
- **Build**: `npm start` để dev, `npm run build` để package

---

## GitHub

Repo: https://github.com/NightOwOw/Arcveil.git
- `README.md` và `.gitignore` đã được tạo và push lên repo

---

## Các bug đã fix

### 1. DevTools mở khi nhấn Ctrl+Shift+C
**File**: `main.js`

**Nguyên nhân**: Chromium built-in shortcut "Inspect Element" (Ctrl+Shift+C) tự kích hoạt.

**Fix**: Dùng `devtools-opened` event để đóng DevTools ngay lập tức thay vì chặn key event (chặn key event sẽ phá globalShortcut):
```js
mainWindow.webContents.on('devtools-opened', () => mainWindow.webContents.closeDevTools());
companionWindow.webContents.on('devtools-opened', () => companionWindow.webContents.closeDevTools());
```

**Lý do không dùng `before-input-event` + `preventDefault()`**: Cách này có thể can thiệp vào globalShortcut của companion toggle.

---

### 2. Head tracking Y-axis bị ngược (hover lên → model nhìn xuống)
**File**: `companion.html` (~line 841)

**Fix**: Đảo dấu `relY`:
```js
_targetHeadX = Math.max(-0.2, Math.min(0.15, -relY / 600));  // đã thêm dấu trừ
```

---

### 3. Companion xuất hiện ngoài app, nổi trên tất cả app khác
**File**: `main.js` — `createCompanionWindow()`

**Nguyên nhân**: `alwaysOnTop: true`, `type: 'toolbar'`, `setVisibleOnAllWorkspaces(true)`

**Fix áp dụng**:
- Xóa `type: 'toolbar'` (nguyên nhân chính khiến float)
- Xóa `alwaysOnTop: true` → đặt `alwaysOnTop: false`
- Xóa `setVisibleOnAllWorkspaces(true)`
- Thêm `parent: mainWindow` → companion tự động z-order dưới app khác nhưng trên mainWindow
- Đổi position từ screen coords sang relative to mainWindow:
```js
const [mx, my] = mainWindow.getPosition();
const [mw, mh] = mainWindow.getSize();
const cw = 220, ch = 380;
const cx = mx + mw - cw - 20;
const cy = my + mh - ch - 10;
```
- Thêm listener minimize/restore để ẩn/hiện companion theo mainWindow:
```js
mainWindow.on('minimize', () => companionWindow?.hide());
mainWindow.on('restore',  () => companionWindow?.show());
```

**Lưu ý quan trọng**: KHÔNG thêm `blur`/`focus` listener trên mainWindow — khi `parent: mainWindow` được set, Windows gửi sự kiện `blur` tạm thời đến mainWindow khi companion window xuất hiện, khiến listener ngay lập tức ẩn companion vừa mở.

---

### 4. Ctrl+Shift+C không toggle được companion
**File**: `main.js`

**Nguyên nhân**: `blur` listener trên mainWindow ẩn companion ngay sau khi tạo (xem bug #3).

**Fix**: Xóa `blur`/`focus` listeners — `parent: mainWindow` đã xử lý z-order tự động.

---

### 5. "Connect to..." trong Relationship Map không hoạt động
**File**: `src/ui/contextmenu.js`

**Nguyên nhân gốc**: Flow cũ yêu cầu hai lần click trên canvas sau khi chọn "Connect to..." — không có visual feedback rõ ràng, cursor chỉ đổi thành crosshair trên `document.body` nhưng bị override bởi CSS của node elements. Người dùng không biết cần click node khác.

**Bug phụ**: Nếu toolbar "Connect" button đang active (`_avCanvasMode = 'connect'`), việc dùng "Connect to..." từ context menu sẽ emit `canvas:start-connect` với target node thay vì tạo edge.

**Fix**: Thay thế flow hai-click bằng **modal picker**:
- Click "Connect to..." → overlay modal xuất hiện ngay lập tức
- Hiển thị danh sách tất cả node (có thể filter bằng search box)
- Node đã connected: greyed-out với dấu ✓, không thể click
- Click node trong list → edge được tạo ngay, modal đóng
- Đóng bằng Escape, click outside, hoặc Cancel

**File thay đổi**:
- `src/ui/contextmenu.js`: thêm `_showConnectDialog()` và `_showToast()`, đổi action "Connect to..."
- `src/canvas/edges.js`: `startEdgeConnect()` nay reset `window._avCanvasMode = 'select'` để tránh conflict

---

## Các file đã tạo mới

| File | Mục đích |
|------|----------|
| `README.md` | Tài liệu dự án cho GitHub |
| `.gitignore` | Loại trừ `node_modules/`, `dist/`, `out/`, `release/`, `*.lnk`, etc. |
| `CONTEXT.md` | File này — ghi lại lịch sử thay đổi |
| `drive-final.mjs` | Playwright script để launch + navigate app (xóa `ELECTRON_RUN_AS_NODE` trước khi launch) |
| `drive-verify2.mjs` | Playwright verification script |

---

## Ghi chú kỹ thuật quan trọng

### ELECTRON_RUN_AS_NODE
Claude Code tự set `ELECTRON_RUN_AS_NODE=1` trong environment vì bản thân nó cũng là Electron app. Khi chạy Playwright để launch ArcVeil, phải xóa biến này trước:
```js
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
```
Nếu không xóa, `require('electron')` trả về string (đường dẫn npm package) thay vì Electron API → app crash.

### EventBus pattern
`state.js` export một EventBus đơn giản (`on`, `off`, `emit`). Tất cả communication giữa modules đều qua EventBus. Không dùng DOM events cho app-level events.

### globalShortcut vs before-input-event
- `globalShortcut` (Electron): OS-level, fires trước khi window nhận event — dùng cho companion toggle (Ctrl+Shift+C)
- `before-input-event` (webContents): renderer-level — KHÔNG dùng để block DevTools vì có thể can thiệp vào globalShortcut

### parent: mainWindow
Khi companion window có `parent: mainWindow`:
- Companion tự động ở trên mainWindow nhưng dưới các app khác (OS handles z-order)
- Minimize/restore phải handle manually vì Electron không tự ẩn child khi parent minimize
- KHÔNG thêm `blur` listener vì tạo companion window trigger blur tạm thời trên parent

---

## Trạng thái hiện tại (tính đến session này)

- [x] README + .gitignore + push lên GitHub
- [x] Fix DevTools mở khi Ctrl+Shift+C
- [x] Fix head tracking Y-axis ngược
- [x] Fix companion nổi trên app khác
- [x] Fix companion toggle bị phá
- [x] Fix "Connect to..." trong Relationship Map
- [x] Fix edge arrows không hiển thị (SVG size 0 bug)
- [x] Thêm label/description dialog cho cả hai flow connect
- [x] Thêm connect-drag mode (kéo từ node này sang node kia trong chế độ Connect)
- [x] Implement ARCtor AI pipeline (Local AI + Cloud AI + Chat UI trên companion)
- [ ] Các tính năng khác chưa được kiểm tra/fix

---

### 6. Edge arrows không hiển thị trên Relationship Map
**File**: `src/canvas/edges.js`

**Nguyên nhân**: SVG có `width:100%;height:100%` nhưng parent `canvas-inner` có computed size = 0 (toàn child absolutely positioned). SVG 0×0 không render được dù có `overflow:visible`.

**Fix**: Set SVG explicit size trong `initEdges()`:
```js
_svg.style.width  = '10000px';
_svg.style.height = '10000px';
```

---

### 7. Relationship Map — kết nối có label/description
**Files**: `src/ui/contextmenu.js`, `src/canvas/edges.js`

**Thay đổi**:
- `_showConnectDialog` nay có 2 phase: (1) chọn target node, (2) nhập label + preset chips (Ally, Enemy, Mentor...)
- `_promptEdgeLabel()` trong edges.js: popup nhỏ xuất hiện ngay tại vị trí chuột sau khi drag connect

---

### 9. ARCtor AI — Local AI + Cloud AI + Chat UI
**Files**: `src/state.js`, `src/settings/settings-ui.js`, `main.js`, `companion-preload.js`, `companion.html`, `src/companion/companion.js`

**Tính năng**:
- **Local AI**: Ollama (localhost:11434) — cấu hình URL endpoint + tên model
- **Cloud AI**: hỗ trợ 3 provider với API key riêng biệt:
  - Anthropic → Claude Haiku (`claude-haiku-4-5-20251001`)
  - OpenAI → GPT-4o mini (`gpt-4o-mini`)
  - Google → Gemini Flash (`gemini-2.0-flash-lite`)
- **Chat UI**: bảng chat slide-up từ dưới companion window
  - Nút 💬 xuất hiện khi hover lên companion
  - Khi mở: companion window trở nên focusable để gõ bàn phím
  - `_aiSettings` được cập nhật qua IPC khi settings thay đổi
  - History giới hạn 12 tin nhắn gần nhất

**Luồng dữ liệu**:
1. `settings-ui.js` → mutate `state.companion` → `EventBus.emit('companion:settings-changed')`
2. `companion.js` → `window.api.companionSettingsUpdate()` → IPC → main.js
3. `main.js` → `companionWindow.webContents.send('companion:settings', data)`
4. `companion.html` → `onSettings(settings => { _aiSettings = settings; })`
5. User chat → `window.companionApi.aiChat({ messages, systemPrompt, settings })`
6. `companion-preload.js` → `ipcRenderer.invoke('companion:ai-chat', payload)`
7. `main.js` handler → `fetch()` to Ollama/Anthropic/OpenAI/Gemini → return `{ ok, text }`

**Settings push timing**:
- `_pushAiSettings()` trong settings-ui.js được gọi mỗi khi AI settings thay đổi
- `_pushAiSettingsToCompanion()` trong companion.js được gọi sau 3s khi app boot (để companion window kịp khởi động)

**Lưu ý**: `fetch()` trong main.js là Node.js 22 native global fetch — không cần import.

---

### 8. Connect-drag mode (toolbar Connect button)
**Files**: `src/canvas/nodes.js`, `src/canvas/edges.js`

**Behavior mới**: Khi `_avCanvasMode === 'connect'`, mousedown trên node bắt đầu drag thay vì select:
1. Giữ chuột trên node A → dashed rubber-band line xuất hiện
2. Kéo chuột sang node B (highlight bằng dashed outline)
3. Thả chuột tại node B → popup nhỏ hỏi label
4. Nhập label (hoặc Skip) → edge được tạo với mũi tên

**EventBus**: `canvas:connect-drag-start` emitted bởi nodes.js, handled bởi edges.js.
