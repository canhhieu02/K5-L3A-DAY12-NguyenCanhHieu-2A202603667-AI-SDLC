# Đảo Đèn Lồng

> Video demo: _(sẽ cập nhật ở Phase 4)_
> Lab: Day 12 — AI SDLC · Đề bài: [docs/lab/](docs/lab/README.md) · PRD-0: [docs/phases/prd-0.md](docs/phases/prd-0.md)

Game 3D góc nhìn thứ ba: Mây, người giữ đèn nhỏ tuổi đội nón lá, gom đom đóm để thắp Đèn Lồng trên ba hòn đảo, châm dầu giữ cho đèn sáng tới bình minh và xua Bóng Mực hút dầu trong sương đen.

## Cài đặt và chạy (Node.js >= 20, macOS/Linux/Windows)

```bash
npm ci
npm run dev        # mở http://localhost:5173
```

Test tự động: `npm test`

## Headless (Test Contract v1.2)

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
| E | Đèn gần nhất trong 2 m: nạp đom đóm để thắp (10, thắp lại 5) hoặc châm dầu đèn đang sáng |
| F / J | Tỏa Sáng: tốn 3 đom đóm, làm choáng + đẩy Bóng Mực trong 5 m, hồi chiêu 3 s |
| Esc / P | Tạm dừng: Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu |

Mở `http://localhost:5173/?night=2` (hoặc 3) để vào thẳng một Đêm, bỏ qua menu. **Chế độ thử** (Cài đặt → bật): menu chính có nút chọn Đêm 1/2/3, menu tạm dừng có nút "Thắng Đêm này" (thắp hết đèn và tua tới bình minh, game tự xét thắng như thường) và "Qua Đêm" (không tính điểm) — chỉ ở bản web, không ảnh hưởng headless. Nếu phím di chuyển lúc ăn lúc không, hãy tắt bộ gõ tiếng Việt (Unikey) khi chơi. Góc dưới trái hiện FPS hiện tại và trung bình (tắt trong Cài đặt). Cài đặt **Bảng màu dễ phân biệt**: viền/mắt Bóng Mực xanh `#00B3FF`, cảnh báo trắng kèm ⚠ (được lưu). `?night=1&demo=fuel` dựng sẵn cảnh đèn đầy / đèn yếu bị hút / đèn đã tắt (`&cb=1` xem bảng màu dễ phân biệt).

## Luật và cách tính điểm (Phase 3, TICKET-03, contract v1.2)

> Phase 3 đổi mục tiêu: không còn "thắp hết là thắng", mà **giữ đủ đèn sáng tới bình minh**. Thay đổi phá vỡ tương thích: [CHANGELOG.md](CHANGELOG.md). Lý do thiết kế: [ADR 0001](docs/adr/0001-lantern-fuel-and-dawn-win.md).

- Đêm 1/2/3 dài **240/270/300 s**. Hết giờ (bình minh) mà còn sống và số đèn **đang sáng** ≥ ceil(60% tổng đèn) — Đêm 1: 3/5, Đêm 2: 4/6, Đêm 3: 5/7 → **thắng**; thiếu → **thua**. Hết **3** Ngọn Lửa → thua ngay (kể cả đúng lúc bình minh).
- Thắp đèn lần đầu cần **10** đom đóm; đèn sáng có **100** dầu, mất **1/giây**. Đứng cạnh đèn đang sáng bấm E để **châm dầu**: mỗi đom đóm +10 dầu (không vượt 100). Hết dầu → đèn tắt; **thắp lại** chỉ cần **5** đom đóm.
- Đèn còn ≥ 30 dầu có vùng an toàn 6 m (Bóng Mực không vào được). Dưới 30: đèn nhấp nháy, **mất vùng an toàn**, Bóng Mực đang lang thang sẽ tìm tới và **hút dầu** 5/giây (con đang hút đuổi Mây nếu Mây vào trong 6 m). Châm lên ≥ 30 thì chúng bị đẩy ra.
- Sức chứa đom đóm = 10 + 2 × số lần thắp thành công trong Đêm (tối đa 20).
- Bóng Mực xuất hiện từ giây thứ 5, đuổi khi Mây trong 12 m (4 m/s). Bị chạm: mất 1 Ngọn Lửa, rơi một nửa số đom đóm (nhặt lại được trong 8 s), bất tử 1.5 s. Rơi khỏi đảo: mất 1 Ngọn Lửa và toàn bộ đom đóm, 1 s sau hồi sinh.

| Sự kiện | Điểm |
|---|---|
| Mỗi đom đóm nạp vào đèn (thắp, thắp lại, châm dầu) | +5 |
| Thắp đèn lần đầu / thắp lại | +100 / +40 |
| Tỏa Sáng trúng 1 Bóng Mực (đang hút dầu) | +5 (+15) |
| Bình minh, chỉ khi thắng: mỗi đèn đang sáng | +50 + phần nguyên dầu còn lại |
| Bình minh, chỉ khi thắng: mỗi Ngọn Lửa còn lại | +50 |

## Giả định

Chỗ ticket chưa nói và cách game xử lý, kèm test kiểm chứng: [docs/assumptions.md](docs/assumptions.md) (A1-xx Phase 1, A2-xx Phase 2, A3-xx Phase 3). Câu hỏi mở cho giảng viên: cuối [phase-3.md](docs/phases/phase-3.md).

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
| Tiêu chí nghiệm thu Phase 3 + test cũ thay đổi | [docs/phases/phase-3.md](docs/phases/phase-3.md) (ticket: [ticket-03.md](docs/phases/ticket-03.md)) |
| Quyết định thiết kế (ADR) | [docs/adr/](docs/adr/) |
| Changelog / breaking changes | [CHANGELOG.md](CHANGELOG.md) |
| Scenario mẫu + kỳ vọng ghi trước | [scenarios/phase2/](scenarios/phase2/), [scenarios/phase3/](scenarios/phase3/) |
| Sinh bằng chứng | `node scripts/evidence.mjs` |

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `src/core/` | Logic game thuần, tất định (dùng chung web + headless); `tuning.js` là nguồn số liệu |
| `src/headless/cli.js` | CLI theo Test Contract |
| `src/web/` | Hiển thị 3D bằng Three.js |
| `tests/` | Test AC (Phase 1), P2-xx, P3-xx — gọi CLI headless thật |
| `scenarios/` | Scenario/inputs mẫu |

## Giấy phép

Mã nguồn: [MIT](LICENSE). Nguồn thư viện/công cụ: [CREDITS.md](CREDITS.md).
