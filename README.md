# Đảo Đèn Lồng

> Video demo: _(sẽ cập nhật ở Phase 4)_
> Lab: Day 12 — AI SDLC · Tài liệu đề bài: [docs/lab/](docs/lab/README.md)

Game 3D góc nhìn thứ ba: Mây, người giữ đèn nhỏ tuổi, gom đom đóm để thắp lại các Đèn Lồng Lớn và né Bóng Mực trong sương đen.

## Chạy nhanh (Node.js >= 20, macOS/Linux)

```bash
npm install
npm test
npm run dev        # mở http://localhost:5173
```

## Headless (Test Contract)

```bash
npm run headless -- --seed 1 --ticks 60 --dx 1 --dz 0
```

_CP0: lệnh trên là khung thử; định dạng thật sẽ theo Test Contract của PRD-0._

## Điều khiển

| Phím | Hành động |
|---|---|
| WASD / mũi tên | Di chuyển |

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `src/core/` | Logic game thuần, tất định (dùng chung web + headless) |
| `src/headless/` | CLI chế độ headless |
| `src/web/` | Hiển thị 3D bằng Three.js |
| `tests/` | Test tự động (`node --test`) |
| `scenarios/` | Kịch bản headless đầu vào/kỳ vọng |
| `evidence/` | Bằng chứng kiểm chứng theo phase |
| `docs/` | Giả định, nhật ký AI/token, ghi chú phase, retro |
| `CLAUDE.md` | Harness cho agent |

## Sáng tạo của tôi

_(sẽ cập nhật)_

## Giấy phép

Mã nguồn: [MIT](LICENSE). Nguồn asset/công cụ: [CREDITS.md](CREDITS.md).
