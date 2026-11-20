# AGENTS.md — hướng dẫn cho agent (Đảo Đèn Lồng)

Áp dụng cho mọi agent làm việc trong repo (Claude Code đọc qua `CLAUDE.md`). Phạm vi hiện hành: **Phase 2 — TICKET-02 "Ba hòn đảo", Test Contract v1.1**.

## Lệnh

| Việc | Lệnh |
|---|---|
| Cài | `npm ci` |
| Test (gọi CLI headless thật) | `npm test` |
| Headless | `node src/headless/cli.js --seed 1 --night 1\|2\|3 --ticks N --out o.jsonl [--scenario f] [--inputs f] [--snapshot-every k]` |
| Chơi | `npm run dev` → http://localhost:5173 (`?night=2` vào thẳng Đêm 2) |
| Build web | `npm run build` |
| Sinh bằng chứng | `node scripts/evidence.mjs [test\|scenarios\|determinism\|perf\|web\|clone]` (xem skill `phase-evidence`) |

## Nguồn yêu cầu

1. Ticket hiện hành, nguyên văn: [docs/phases/ticket-02.md](docs/phases/ticket-02.md). Ticket trước: `prd-0.md` (contract v1.0).
2. Spec + acceptance criteria (mã `P2-xx`, cột "Bước"): [docs/phases/phase-2.md](docs/phases/phase-2.md).
3. Giả định cho chỗ ticket chưa nói: [docs/assumptions.md](docs/assumptions.md) (`A2-xx`). **Không tự thêm luật**; chỗ mơ hồ → thêm dòng giả định + test, ghi câu hỏi mở cho GV trong `phase-2.md`.

## Kiến trúc (bắt buộc giữ)

| Thư mục | Vai trò | Cấm |
|---|---|---|
| `src/core/` | Logic thuần, tất định. `tuning.js` (`TUNING` = `tuning` của contract, `RULES` = số chuẩn khác), `maps.js` (bản đồ 3 Đêm), `world.js` (`createGame`, `step`, `snapshot`), `validate.js` | `three`, DOM, `window`, `Math.random`, `Date.now` (test `web-palette.test.js` tự kiểm). Ngẫu nhiên chỉ qua `g.rng` (`createRng(seed)`) |
| `src/headless/cli.js` | Test Contract: tham số, đọc/validate file (sai định dạng → mã 2), ghi JSONL | Luật game |
| `src/web/` | Chỉ hiển thị + input: `scene.js` (dựng cảnh từ map), `main.js` (chuỗi 3 Đêm, HUD, menu), `palette.js` (bảng màu chuẩn), `audio.js`, `settings.js` | Luật game; mọi hành vi phải đi qua `step()` |
| `tests/` | `contract.test.js` (AC Phase 1, đã cập nhật theo v1.1), `phase2-core`, `phase2-maps`, `phase2-features`, `web-palette` | — |
| `scenarios/phase2/` | Scenario mẫu + `*.expect.json` (kỳ vọng ghi **trước** khi chạy) | — |
| `evidence/phase-N/` | Bằng chứng sinh từ lệnh thật | **Sửa tay** |

Web và headless dùng cùng `step()` với `TICK_DT = 1/60`.

## Mô hình tick (contract v1.1 + TICKET-02)

- Bước k đọc input tick k, tạo trạng thái k+1; event ghi `tick = k+1`. `night_start` ở tick 1.
- Thứ tự 12 bước trong `step()` là **bắt buộc** (ticket Phần 1): input (pause trước) → bộ đếm → di chuyển Mây + rơi → nhặt đom đóm/bùa → nạp đèn → vùng an toàn → Tỏa Sáng → Bóng Mực + Gió Lạc di chuyển → chạm (Gió Lạc trước, Bóng Mực theo id) → sinh theo lịch → thắng/thua → snapshot.
- Tạm dừng: `tick` tăng, `sim_tick` + thời gian + hồi chiêu + spawn + TTL đứng yên, snapshot `state: "paused"`.
- Bộ đếm: đặt N tick ở tick k → hết ở tick k+N (A2-4). So sánh khoảng cách/độ cao dùng dung sai `1e-9` (A1-15).
- Trạng thái Bóng Mực chỉ: `spawning`, `wander`, `chase`, `recoil`, `stunned`. Gió Lạc: `idle`, `chase`, `flee`, `removed`.

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
| `headless-scenario` | Viết scenario/inputs v1.1 + kỳ vọng, chạy và đọc output |
| `phase-evidence` | Sinh/cập nhật bằng chứng cuối phase, đánh giá DoD |
