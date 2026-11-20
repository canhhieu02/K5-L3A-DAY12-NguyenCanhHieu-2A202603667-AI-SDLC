# Credits

## Nhân vật và bối cảnh
- Mây, Ông Đăng, Đảo Đèn Lồng, Bóng Mực, Gió Lạc, Bùa Gió: bản gốc của đề bài lab Day 12 (PRD-0, TICKET-02…04).
- Lời thoại Ông Đăng, tên đảo (Đảo Bến, Đảo Cau, Đảo Chuông): viết cho game này (người học + Claude Code).

## Thư viện và công cụ
| Tên | Phiên bản | Giấy phép | Dùng cho |
|---|---|---|---|
| [three.js](https://threejs.org) | 0.170.0 | MIT | Render 3D (đóng gói trong `dist/`) |
| [Vite](https://vitejs.dev) | 5.4.11 | MIT | Dev server / build web (chỉ lúc phát triển) |
| [Node.js](https://nodejs.org) | ≥ 22 | MIT | Headless, test, server, bench, soak |
| Google Chrome / Microsoft Edge | bản cài sẵn trên máy | độc quyền (không phân phối) | Trình duyệt để chạy bench |

## Asset
| Loại | Nguồn |
|---|---|
| Mô hình 3D | Không có file ngoài: mọi hình (Mây, đèn, Bóng Mực, đảo, tháp chuông…) dựng bằng hình khối có sẵn của three.js trong `src/web/scene.js` |
| Âm thanh, nhạc | Không có file ngoài: tổng hợp lúc chạy bằng WebAudio (oscillator) trong `src/web/audio.js` |
| Phông chữ | Phông hệ thống (Segoe UI / system-ui, monospace) |
| Biểu tượng | Emoji Unicode của hệ điều hành (🔥 🏮 🍃 👁 ⏳…) |
| Ảnh trong README/evidence | Chụp màn hình game (Chrome headless hoặc người học chơi) |

## Công cụ AI tạo nội dung
| Công cụ | Dùng cho | Nội dung do AI tạo |
|---|---|---|
| Claude Code (Claude Opus 5.5, Anthropic) trong VS Code | Toàn bộ 4 phase: lập kế hoạch, mã nguồn, test, scenario, tài liệu, script bằng chứng; người học review, duyệt từng bước, chơi thử | Mã nguồn `src/`, `tests/`, `scripts/`, `server.mjs`; tài liệu `docs/`, README, CHANGELOG; hình khối 3D và âm thanh tổng hợp bằng code; lời thoại Ông Đăng. **Không** có ảnh, nhạc hay mô hình do AI tạo ảnh/âm thanh sinh ra |
| Trợ giảng lab board (claude.ai) | Hỏi đáp về đề bài | Không đưa nội dung vào game |

Nhật ký dùng AI và token: [docs/ai-log.md](docs/ai-log.md).
