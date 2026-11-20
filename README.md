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
| W A S D / mũi tên | Di chuyển (theo hướng camera) |
| Kéo chuột trái, Q / E | Xoay camera |
| Space | Nhảy |
| F | Nạp đom đóm vào đèn gần nhất (trong 2.5 m) |
| Shift / J | Tỏa sáng: tốn 1 đom đóm, làm choáng + đẩy Bóng Mực trong 5 m |
| R | Chơi lại (bất cứ lúc nào, kể cả sau thắng/thua) |

## Luật và cách tính điểm

- Mang tối đa **5** đom đóm. Mỗi đèn cần **5** đom đóm để thắp. Thắp đủ **5** đèn → **thắng**.
- Bóng Mực đuổi theo (3 m/s, chậm hơn Mây 6 m/s). Bị chạm: mất **1 ngọn lửa**, rơi mất **một nửa** số đom đóm đang mang (làm tròn xuống), bất tử 1.5 s. Hết **3** ngọn lửa → **thua**.
- Bóng Mực không vào được vòng **4 m** quanh đèn **đã thắp**.
- Đêm dài **300 s**; trời sáng mà chưa thắp hết đèn → **thua**.

| Sự kiện | Điểm |
|---|---|
| Nhặt 1 đom đóm | +10 |
| Thắp 1 đèn | +100 |
| Làm choáng 1 Bóng Mực | +20 |
| Khi thắng: mỗi giây còn lại (làm tròn xuống) | +1 |
| Khi thắng: mỗi ngọn lửa còn lại | +50 |

Các giả định đầy đủ: [docs/assumptions.md](docs/assumptions.md). `fall_enabled: false`: Mây bị chặn ở mép đảo nên không thể rơi.

## Sáng tạo của tôi

_(Phase 1 tập trung phần lõi; chưa có phần sáng tạo ngoài phong cách hiển thị.)_

## Kiểm chứng và tài liệu

| Nội dung | Vị trí |
|---|---|
| Tiêu chí nghiệm thu Phase 1 | [docs/phases/phase-1.md](docs/phases/phase-1.md) |
| Giả định | [docs/assumptions.md](docs/assumptions.md) |
| Bằng chứng | [evidence/README.md](evidence/README.md) |
| Nhật ký AI / token | [docs/ai-log.md](docs/ai-log.md) |
| Harness AI | [CLAUDE.md](CLAUDE.md) |

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `src/core/` | Logic game thuần, tất định (dùng chung web + headless); `tuning.js` là nguồn số liệu |
| `src/headless/cli.js` | CLI theo Test Contract |
| `src/web/` | Hiển thị 3D bằng Three.js |
| `tests/` | Test AC-01…AC-21, gọi CLI thật |
| `scenarios/` | Scenario/inputs mẫu |

## Giấy phép

Mã nguồn: [MIT](LICENSE). Nguồn thư viện/công cụ: [CREDITS.md](CREDITS.md).
