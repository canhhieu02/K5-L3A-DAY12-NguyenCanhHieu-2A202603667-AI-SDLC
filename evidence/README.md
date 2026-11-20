# Bằng chứng kiểm chứng

Bằng chứng chỉ sinh từ lệnh chạy thật, không sửa tay. Mỗi phase một thư mục `evidence/phase-N/`.

| Phase | Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|---|
| CP0 | Môi trường chạy được, test chạy được | `npm test` | [phase-0/test.txt](phase-0/test.txt) | Đạt (3/3) |
| CP0 | Headless chạy không cần cửa sổ, tất định | Chạy CLI 2 lần, so sánh | [phase-0/headless.txt](phase-0/headless.txt) | Đạt (2 lần giống nhau) |
| CP0 | Bản web build được | `npm run build` | [phase-0/build.txt](phase-0/build.txt) | Đạt |
| CP0 | Cảnh 3D hiển thị, di chuyển được | `npm run dev`, chơi bằng WASD, quan sát lưới + HUD | [phase-0/web-move.png](phase-0/web-move.png) (HUD: tick 2567, x -3.18, z 6.79 ≠ gốc 0,0) | Đạt |

Môi trường: Windows 11 (Git Bash), Node v22.16.0. Chưa thử trên macOS/Linux.
