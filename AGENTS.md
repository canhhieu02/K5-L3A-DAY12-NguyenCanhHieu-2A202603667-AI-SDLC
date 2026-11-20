# AGENTS.md — hướng dẫn cho agent (Đảo Đèn Lồng)

Áp dụng cho mọi agent làm việc trong repo (Claude Code đọc qua `CLAUDE.md`). Phạm vi hiện hành: **Phase 4 — TICKET-04 "Bình minh: phát hành v1.0.0" (non-functional + release), Test Contract v1.3**. Luật game = v1.2 (TICKET-03), không đổi ở Phase 4.

## Lệnh

| Việc | Lệnh |
|---|---|
| Cài | `npm ci` |
| Test (gọi CLI headless thật) | `npm test` |
| Headless | `node src/headless/cli.js --seed 1 --night 1\|2\|3 --ticks N --out o.jsonl [--scenario f] [--inputs f] [--snapshot-every k]` |
| Chơi (run_cmd) | `npm start` = `node server.mjs` → http://localhost:5173 (`?night=2` vào thẳng Đêm 2); `npm run dev` để sửa web |
| Bảng xếp hạng | `node server.mjs --export-leaderboard out.json` (lưu ở `save/leaderboard.json`, đổi bằng `DDL_LEADERBOARD`) |
| Bench (mở cửa sổ Chrome ~35 s) | `node scripts/bench.mjs --seed 42 --duration 30 --out bench.json` |
| Soak | `node --expose-gc src/headless/soak.js --seed 7 --nights 10 --out soak.json` |
| Gói release | `npm run release` → `release/dao-den-long-v1.0.0-web.zip` |
| Build web | `npm run build` |
| Sinh bằng chứng | `node scripts/evidence.mjs [test\|scenarios\|determinism\|perf\|web\|soak\|leaderboard\|bench\|clone]` (xem skill `phase-evidence`) |

## Nguồn yêu cầu

0. Ticket hiện hành (Phase 4), nguyên văn: [docs/phases/ticket-04.md](docs/phases/ticket-04.md) — bench, soak, bảng xếp hạng, dễ tiếp cận, đóng gói; **không đổi luật/đầu ra headless**. Spec: [phase-4.md](docs/phases/phase-4.md) (`P4-xx`), quyết định: [ADR 0002](docs/adr/0002-web-benchmark-and-local-server.md), giả định `A4-xx`.
1. Ticket luật gần nhất, nguyên văn: [docs/phases/ticket-03.md](docs/phases/ticket-03.md) — **thay thế** một số luật của TICKET-02 (mục đánh dấu [THAY THẾ]); phần còn lại của [ticket-02.md](docs/phases/ticket-02.md) vẫn hiệu lực. Ticket trước nữa: `prd-0.md` (v1.0).
2. Spec + acceptance criteria: [docs/phases/phase-3.md](docs/phases/phase-3.md) (`P3-xx`, bảng "Test cũ thay đổi"), [phase-2.md](docs/phases/phase-2.md) (`P2-xx` còn hiệu lực).
3. Quyết định mô hình đèn + luật thắng: [docs/adr/0001-lantern-fuel-and-dawn-win.md](docs/adr/0001-lantern-fuel-and-dawn-win.md). Breaking changes: [CHANGELOG.md](CHANGELOG.md).
4. Giả định cho chỗ ticket chưa nói: [docs/assumptions.md](docs/assumptions.md) (`A3-xx`, `A2-xx`). **Không tự thêm luật**; chỗ mơ hồ → thêm dòng giả định + test, ghi câu hỏi mở cho GV trong `phase-3.md`.

## Kiến trúc (bắt buộc giữ)

| Thư mục | Vai trò | Cấm |
|---|---|---|
| `src/core/` | Logic thuần, tất định. `tuning.js` (`TUNING` = `tuning` của contract, `RULES` = số chuẩn khác), `maps.js` (bản đồ 3 Đêm), `world.js` (`createGame`, `step`, `snapshot`), `validate.js` | `three`, DOM, `window`, `Math.random`, `Date.now` (test `web-palette.test.js` tự kiểm). Ngẫu nhiên chỉ qua `g.rng` (`createRng(seed)`) |
| `src/headless/cli.js` | Test Contract: tham số, đọc/validate file (sai định dạng → mã 2), ghi JSONL | Luật game |
| `src/headless/soak.js`, `scripts/bench.mjs`, `server.mjs` | soak_cmd, bench_cmd (Chrome + CDP), run_cmd (phục vụ `dist/` + API bảng xếp hạng) | Luật game; cảnh bench dựng bằng `createBenchGame` trong core (cờ `g.bench` chỉ tắt hao dầu/nhặt/hit/sinh/kết thúc) |
| `src/shared/` | Thuần, không luật game: `leaderboard.js` (tên, sắp xếp top 10), `bench-stats.js` (số đo, camera bench) | DOM |
| `src/web/` | Chỉ hiển thị + input: `scene.js` (dựng cảnh từ map), `main.js` (chuỗi 3 Đêm, HUD, menu, phụ đề, bảng xếp hạng, chế độ `?bench=1`), `palette.js` (bảng màu chuẩn), `audio.js`, `settings.js`, `keybinds.js` (đổi phím, thuần), `board-store.js` | Luật game; mọi hành vi phải đi qua `step()` |
| `tests/` | `contract.test.js` (AC Phase 1, cập nhật theo v1.1 + v1.2), `phase2-core`, `phase2-maps`, `phase2-features`, `phase3-fuel`, `phase4-release`, `web-palette`, `debug-mode` | `test.skip` / xóa test cũ không ghi lý do |
| `scenarios/phase2/`, `scenarios/phase3/` | Scenario mẫu + `*.expect.json` (kỳ vọng ghi **trước** khi chạy) | — |
| `evidence/phase-N/` | Bằng chứng sinh từ lệnh thật | **Sửa tay** |

Web và headless dùng cùng `step()` với `TICK_DT = 1/60`.

## Mô hình tick (contract v1.2 = TICKET-02 + TICKET-03)

- Bước k đọc input tick k, tạo trạng thái k+1; event ghi `tick = k+1`. `night_start` ở tick 1.
- Thứ tự 12 bước trong `step()` là **bắt buộc** (ticket Phần 1): input (pause trước) → bộ đếm → di chuyển Mây + rơi → nhặt đom đóm/bùa → nạp đèn → vùng an toàn → Tỏa Sáng → Bóng Mực + Gió Lạc di chuyển → chạm (Gió Lạc trước, Bóng Mực theo id) → sinh theo lịch → thắng/thua → snapshot.
- Tạm dừng: `tick` tăng, `sim_tick` + thời gian + hồi chiêu + spawn + TTL đứng yên, snapshot `state: "paused"`.
- Bộ đếm: đặt N tick ở tick k → hết ở tick k+N (A2-4). So sánh khoảng cách/độ cao dùng dung sai `1e-9` (A1-15).
- Trạng thái Bóng Mực chỉ: `spawning`, `wander`, `chase`, `recoil`, `stunned`, `drain`. Gió Lạc: `idle`, `chase`, `flee`, `removed`.
- **Dầu đèn** (TICKET-03): lưu `L.fuelU` là số nguyên đơn vị 1/60 fuel (`FUEL_UNIT`), không dùng số thực; chỉ làm tròn khi xuất (`fuelOut`). Bước 2 cuối: hao 1 đơn vị/tick mỗi đèn sáng + 5 đơn vị/tick mỗi Bóng Mực `drain` (theo id), `fuel_drain` mỗi 60 tick hút, rồi đèn `fuelU ≤ 0` tắt (`lantern_out`). Vùng an toàn chỉ khi `hasSafeZone` (sáng, fuel ≥ 30) — đừng hỏi `L.lit` cho vùng an toàn.
- **Thắng chỉ ở bình minh** (bước 11): `no_flames` trước; hết giờ thì đèn đang sáng ≥ `litNeeded(g)` → `dawn_survived`, ngược lại `dawn`. Không còn `all_lit`.
- Hệ quả thứ tự: đèn sáng lúc bấm E (bước 5) đã hao ở bước 2 nên không bao giờ đúng 100 (A3-5); test có đèn `lit: true` cạnh Mây sẽ nhận `refuel`.

## Quy tắc làm việc

- Định dạng I/O headless phải khớp **nguyên văn** contract (tên khóa, sự kiện, làm tròn 3 chữ số).
- Đổi số liệu: sửa `TUNING` **và** `game.contract.json` cùng lúc (test AC-01 + P2-01 chặn lệch).
- Mỗi thay đổi hành vi phải có test headless (skill `add-rule`) hoặc scenario mẫu (skill `headless-scenario`); chạy `npm test` trước khi báo xong và dán output thật.
- Test viết theo `T.x` (tuning), không gắn cứng số. Scenario test dùng `empty()` / tắt `random_drifters`, `wind_enabled`, `charms: []` khi không kiểm những thứ đó (Bùa Gió mặc định ở Đêm 2 nằm giữa cầu!).
- Không push/tag trước khi người dùng duyệt; chỉ commit local. Không commit `.env`, key, token, `.claude/settings.local.json`.
- Phần sáng tạo thêm không được đổi đầu ra headless.

## Skill (`.claude/skills/`)

| Skill | Khi nào |
|---|---|
| `add-rule` | Thêm/sửa một luật hoặc tính năng game theo ticket |
| `headless-scenario` | Viết scenario/inputs v1.2 + kỳ vọng, chạy và đọc output |
| `phase-evidence` | Sinh/cập nhật bằng chứng cuối phase, đánh giá DoD |
