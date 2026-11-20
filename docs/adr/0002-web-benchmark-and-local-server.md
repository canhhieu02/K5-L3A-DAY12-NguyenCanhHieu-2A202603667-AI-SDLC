# ADR 0002 — Bench cho game web và server cục bộ cho bảng xếp hạng

- Trạng thái: Chấp nhận (Phase 4, TICKET-04, contract v1.3)
- Liên quan: [ticket-04.md](../phases/ticket-04.md), [phase-4.md](../phases/phase-4.md), giả định A4-xx trong [assumptions.md](../assumptions.md)

## Bối cảnh

Game là bản web (three.js + Vite) từ Phase 1. TICKET-04 yêu cầu: (1) một lệnh bench mở **cửa sổ** 1280×720, tắt vsync, đo khung hình và RSS, tự thoát mã 0; (2) bảng xếp hạng **lưu trên đĩa** và xuất được bằng `<run_cmd> --export-leaderboard out.json`. Trình duyệt không tự ghi file ra đĩa và một trang web không tự đo được RSS hay tắt vsync.

## Quyết định

1. **Bench = launcher Node điều khiển Chrome/Edge thật**, không thêm thư viện (Puppeteer…):
   - `scripts/bench.mjs` phục vụ `dist/` bằng `server.mjs`, mở trình duyệt hệ thống ở chế độ `--app` (cửa sổ, không toàn màn hình) với `--disable-gpu-vsync --disable-frame-rate-limit --force-device-scale-factor=1`.
   - Dùng DevTools Protocol qua `WebSocket` có sẵn của Node 22 để chỉnh cửa sổ sao cho **vùng vẽ** (innerWidth × innerHeight) đúng 1280×720, rồi mới mở trang `?bench=1`.
   - Trang tự đo `dt` bằng timestamp `requestAnimationFrame`, gửi về launcher; launcher tính số liệu bằng hàm thuần `frameStats` (có test).
   - `load_ms` = epoch khung hình đầu tiên của cảnh bench (`performance.timeOrigin + t`) − `performance.timeOrigin` của tiến trình Node (cùng đồng hồ máy).
   - `peak_mem_mb` = tổng working set/RSS **mọi tiến trình** của trình duyệt (browser + GPU + renderer…) lấy mẫu mỗi 500 ms trong khoảng đo. Đây là "bộ nhớ tiến trình" của bản web; số này cao hơn RSS của một game native vì gồm cả trình duyệt và trang bộ nhớ dùng chung bị cộng nhiều lần.
   - Cảnh bench dựng trong **core** (`createBenchGame` + cờ `g.bench`) để luật wander/chase là luật thật; cờ chỉ tắt hao dầu, nhặt, sát thương, sinh thêm, kết thúc Đêm. Headless contract không bao giờ bật cờ này nên đầu ra không đổi (test P4-12 + toàn bộ test cũ).
2. **`run_cmd` = `node server.mjs`**: server tĩnh viết bằng module có sẵn của Node phục vụ `dist/` + API `/api/leaderboard` ghi `save/leaderboard.json` (ghi nguyên tử). `--export-leaderboard out.json` đọc file đó. `npm run dev`/`preview` dùng cùng API qua plugin Vite. Mở `dist/` bằng static server khác thì trang tự lùi về `localStorage` (vẫn còn sau khi mở lại, nhưng không xuất được bằng lệnh).
3. `npm ci` chạy `prepare` = `vite build`, nên clone sạch chỉ cần `npm ci` rồi `npm start` (2 lệnh); bench không phải build trong lúc đo `load_ms`.

## Hệ quả

- Máy chấm cần Chrome hoặc Edge (Windows có sẵn Edge). Đường dẫn khác: `CHROME_PATH=... node scripts/bench.mjs ...` hoặc `--browser`.
- Số FPS phụ thuộc GPU/driver trình duyệt (ANGLE/D3D11 trên Windows). Trên máy phát triển (Intel UHD tích hợp) đạt ~115 FPS TB; máy chấm sẽ cho số khác.
- `vsync_off: true` nghĩa là đã truyền cờ tắt vsync; nếu trình duyệt/driver vẫn ép vsync thì `avg_fps` sẽ dính ở tần số màn hình — ghi trong README.
- Không thêm phụ thuộc npm mới; `server.mjs` + `dist/` chạy được mà không cần `node_modules` (gói Release).

## Phương án đã loại

- **Puppeteer/Playwright**: tải thêm ~150 MB trình duyệt, mặc định headless (không phải cửa sổ thật, vsync/GPU khác lúc chơi).
- **Electron**: đo được RSS một tiến trình nhưng đổi cách đóng gói toàn bộ game ở phase cuối, rủi ro cao trong 90 phút.
- **Bench trong headless Node**: không render nên không đo được FPS như ticket yêu cầu.
