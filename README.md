# Đảo Đèn Lồng

> Video demo: _(sẽ cập nhật ở Phase 4)_
> Lab: Day 12 — AI SDLC · Đề bài: [docs/lab/](docs/lab/README.md) · PRD-0: [docs/phases/prd-0.md](docs/phases/prd-0.md)

Game 3D góc nhìn thứ ba: Mây, người giữ đèn nhỏ tuổi đội nón lá, gom đom đóm để thắp lại 5 Đèn Lồng Lớn trên Đảo Bến và né Bóng Mực trong sương đen.

## Cài đặt và chạy (Node.js >= 20, macOS/Linux/Windows)

```bash
npm ci
npm run dev        # mở http://localhost:5173
```

Test tự động: `npm test`

## Headless (Test Contract v1.0)

Khai báo trong [game.contract.json](game.contract.json). Ví dụ:

```bash
node src/headless/cli.js --seed 1 --night 1 --ticks 600 --out out.jsonl \
  --scenario scenarios/pickup-deposit.scenario.json --inputs scenarios/pickup-deposit.inputs.json
```

Chạy hoàn toàn bằng Node, không cần cửa sổ/GPU; không cần `npm ci` cho riêng headless (không phụ thuộc gói ngoài).

## Điều khiển

| Phím | Hành động |
|---|---|
| W A S D | Di chuyển (theo hướng camera) |
| Kéo chuột trái, ← → | Xoay camera (độ nhạy chỉnh trong Cài đặt) |
| Space | Nhảy |
| Shift | Lướt 14 m/s trong 0.2 s, hồi chiêu 1.5 s |
| E | Nạp đom đóm vào đèn gần nhất (trong 2 m) |
| F / J | Tỏa Sáng: tốn 3 đom đóm, làm choáng + đẩy Bóng Mực trong 5 m, hồi chiêu 3 s |
| Esc / P | Tạm dừng: Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu |

Mở `http://localhost:5173/?night=2` (hoặc 3) để vào thẳng một Đêm, bỏ qua menu. **Chế độ thử** (Cài đặt → bật): menu chính có nút chọn Đêm 1/2/3, menu tạm dừng có nút "Qua Đêm" (không tính điểm) — chỉ ở bản web, không ảnh hưởng headless. Nếu phím di chuyển lúc ăn lúc không, hãy tắt bộ gõ tiếng Việt (Unikey) khi chơi. Góc dưới trái hiện FPS hiện tại và trung bình (tắt trong Cài đặt).

## Luật và cách tính điểm

> **Phase 2 đang làm** ([docs/phases/phase-2.md](docs/phases/phase-2.md)): luật lõi, bản đồ 3 Đêm, Gió Lạc, Bùa Gió và bản web (chuỗi 3 Đêm, menu, tạm dừng, cài đặt, âm thanh, HUD) đã theo TICKET-02 (contract v1.1). Còn lại: harness agent và bằng chứng.

- Mang tối đa **10** đom đóm. Mỗi đèn cần **10** đom đóm để thắp. Thắp đủ **5** đèn → **thắng**.
- Bóng Mực xuất hiện từ giây thứ 5, đi lang thang và đuổi khi Mây trong 12 m (4 m/s). Bị chạm: mất **1 ngọn lửa**, **một nửa** số đom đóm đang mang rơi ra quanh Mây (nhặt lại được trong 8 s), bất tử 1.5 s; Bóng Mực lùi lại 2 m. Hết **3** ngọn lửa → **thua**.
- Rơi khỏi đảo: mất 1 ngọn lửa và toàn bộ đom đóm, 1 s sau hồi sinh ở giữa đảo.
- Lướt 14 m/s trong 0.2 s, hồi chiêu 1.5 s.
- Bóng Mực không vào được vòng **6 m** quanh đèn **đã thắp**.
- Đêm dài **300 s**; trời sáng mà chưa thắp hết đèn → **thua**.

| Sự kiện | Điểm |
|---|---|
| Nạp 1 đom đóm vào đèn | +10 |
| Thắp 1 đèn | +100 |
| Tỏa Sáng trúng 1 Bóng Mực | +5 |
| Khi thắng: mỗi giây còn lại (làm tròn xuống) | +2 |
| Khi thắng: mỗi ngọn lửa còn lại | +50 |

## Giả định (chỗ PRD-0 để mở)

Đầy đủ 17 giả định kèm test kiểm chứng: [docs/assumptions.md](docs/assumptions.md). Các điểm chính:

| Chủ đề | Cách game xử lý |
|---|---|
| Nhặt đom đóm | **Tự động** khi khoảng cách XZ ≤ `pickup_radius` (1 m). Đang mang đủ 10 thì **không nhặt**, đom đóm vẫn nằm trên đất |
| Nạp đèn | `F` nạp vào đèn **chưa thắp gần nhất** trong 2 m: `amount = min(carried, lantern_cost − deposited)`, **phần dư giữ lại**; `deposited` không vượt `lantern_cost` |
| Tỏa sáng | Trừ `pulse_cost` (3) vào `carried`. Không đủ hoặc đang hồi chiêu → **không kích hoạt, không ghi event** `pulse` |
| Bị chạm | `dropped = floor(carried × 0.5)`; đom đóm rơi **mất hẳn** (không thành mote mới) |
| Điểm thưởng thắng | Cộng **ngay tại tick `game_over` (won)**: `floor(time_left_s) × 2 + flames × 50`; nằm trong snapshot tick đó và dòng `end`. **Thua không thưởng** |
| Vùng an toàn | Chỉ **đèn đã thắp**. Bóng Mực (kể cả đang choáng) ở trong vùng lúc đèn vừa thắp bị **đẩy ra mép vùng ngay tick đó**; sau đó không vào được |
| Thứ tự dòng JSONL | Trong một tick: các event trước, snapshot (nếu tới lượt) sau; `end` luôn là dòng cuối; không có snapshot đặc biệt khi kết thúc |
| Rơi khỏi đảo | `fall_enabled: false`: Mây bị chặn ở mép đảo (bán kính 40 m), không có event `fall` |
| Nhảy | Chỉ đổi độ cao Y; khoảng cách gameplay đo trên XZ nên nhảy không né được Bóng Mực |

## Sáng tạo của tôi

_(Phase 1 tập trung phần lõi; chưa có phần sáng tạo ngoài phong cách hiển thị.)_

## Kiểm chứng và tài liệu

| Nội dung | Vị trí |
|---|---|
| Tiêu chí nghiệm thu Phase 1 | [docs/phases/phase-1.md](docs/phases/phase-1.md) |
| Giả định | [docs/assumptions.md](docs/assumptions.md) |
| Bằng chứng | [evidence/README.md](evidence/README.md) |
| Nhật ký AI / token | [docs/ai-log.md](docs/ai-log.md) |
| Tiêu chí nghiệm thu Phase 2 | [docs/phases/phase-2.md](docs/phases/phase-2.md) (ticket: [ticket-02.md](docs/phases/ticket-02.md)) |
| Harness AI | [AGENTS.md](AGENTS.md) (dùng chung), [CLAUDE.md](CLAUDE.md), skill trong [.claude/skills/](.claude/skills/): `add-rule`, `headless-scenario`, `phase-evidence` |
| Scenario mẫu Phase 2 + kỳ vọng | [scenarios/phase2/](scenarios/phase2/) |
| Sinh bằng chứng | `node scripts/evidence.mjs` |

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `src/core/` | Logic game thuần, tất định (dùng chung web + headless); `tuning.js` là nguồn số liệu |
| `src/headless/cli.js` | CLI theo Test Contract |
| `src/web/` | Hiển thị 3D bằng Three.js |
| `tests/` | Test AC-01…AC-25, gọi CLI thật |
| `scenarios/` | Scenario/inputs mẫu |

## Giấy phép

Mã nguồn: [MIT](LICENSE). Nguồn thư viện/công cụ: [CREDITS.md](CREDITS.md).
