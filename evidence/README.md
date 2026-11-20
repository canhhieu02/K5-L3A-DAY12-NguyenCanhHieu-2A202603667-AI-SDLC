# Bằng chứng kiểm chứng

Bằng chứng chỉ sinh từ lệnh chạy thật, không sửa tay. Mỗi phase một thư mục `evidence/phase-N/`. File này (bảng tóm tắt) là phần duy nhất viết tay.
Môi trường: Windows 11 (Git Bash), Node v22.16.0. Headless thuần Node, không phụ thuộc OS.

## Phase 3 (TICKET-03, Test Contract v1.2)

Sinh bằng `node scripts/evidence.mjs` tại commit ghi ở dòng đầu mỗi file. Kỳ vọng scenario ghi trước trong `scenarios/phase3/*.expect.json`. Spec + bảng test cũ thay đổi: [docs/phases/phase-3.md](../docs/phases/phase-3.md).

| Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| Dầu đèn, châm/thắp lại, `drain`, luật thắng bình minh, sức chứa, điểm, contract v1.2 (P3-01…P3-43) | `npm test`: 101 test (headless qua CLI thật), trong đó 19 test mới ở `tests/phase3-fuel.test.js` | [phase-3/test.txt](phase-3/test.txt) | Đạt 101/101 |
| Test Phase 1–2 không bị thay vẫn đạt; test bị thay đã cập nhật có lý do, không skip | Cùng `npm test`; bảng "Test cũ thay đổi" trong `phase-3.md` | [phase-3/test.txt](phase-3/test.txt) | Đạt |
| Kịch bản đầu-cuối: tắt → thắp lại → châm; Bóng Mực tìm tới đèn yếu và hút tới tắt; Tỏa Sáng trúng con đang hút + châm lên ≥ 30; thắng/thua bình minh Đêm 2/3; sức chứa 20 | 6 scenario, đối chiếu từng event/trường với kỳ vọng ghi trước | [phase-3/scenarios.txt](phase-3/scenarios.txt), `phase-3/<tên>.jsonl` | Đạt 6/6 (lần chạy đầu, không sửa kỳ vọng) |
| Tất định 3 Đêm với luật mới (Bóng Mực wander có đích) | Seed 2026 × 2 so sha256, seed 2027 phải khác; chạy tới hết Đêm v1.2 hoặc khi kết thúc | [phase-3/determinism.txt](phase-3/determinism.txt) | Đạt |
| 21 600 tick mỗi Đêm ≤ 30 s | Đo thời gian thật | [phase-3/perf.txt](phase-3/perf.txt) | Đạt (0.6–1.0 s) |
| Web: thanh dầu, đèn yếu (thanh đỏ, nhấp nháy), đèn tắt xẹp + rách, Bóng Mực đang hút, HUD `6/14`, "Đèn 2/5 · cần 3", cảnh báo sắp cạn dầu | Chrome headless 1280×720, `?night=1&demo=fuel` (cảnh dựng sẵn, chỉ web) | [phase-3/web-fuel-demo.png](phase-3/web-fuel-demo.png), [phase-3/web.txt](phase-3/web.txt) | Đạt (ảnh tĩnh; nhấp nháy cần xem khi chơi) |
| Bảng màu dễ phân biệt: viền/mắt Bóng Mực `#00B3FF`, cảnh báo trắng kèm ⚠ | Chrome headless `?…&cb=1`; test P3-60 so mã màu | [phase-3/web-fuel-demo-colorblind.png](phase-3/web-fuel-demo-colorblind.png) | Đạt |
| Build + khởi động 3 Đêm không lỗi console | `npm run build`, Chrome headless menu + `?night=1/2/3` | [menu](phase-3/web-menu.png), [Đêm 1](phase-3/web-night1.png), [Đêm 2](phase-3/web-night2.png), [Đêm 3](phase-3/web-night3.png) | Đạt |
| Clone sạch | clone HEAD → `npm ci` → `npm test` → headless 3 Đêm → build | [phase-3/clean-clone.txt](phase-3/clean-clone.txt) | Đạt |
| Chơi tay: đèn tắt khi cạn dầu rồi thắp lại, châm dầu, Bóng Mực hút đèn, thắng + thua ở bình minh, cài đặt mù màu còn sau khi mở lại, FPS ≥ 30 | Người học chơi `npm run dev` | — | **Chưa kiểm chứng** (chờ người học) |

## Phase 2 (TICKET-02, Test Contract v1.1)

Sinh bằng `node scripts/evidence.mjs` tại commit ghi ở dòng đầu mỗi file (skill `phase-evidence`). Kỳ vọng của scenario ghi trước trong `scenarios/phase2/*.expect.json`.

| Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| Số chuẩn + contract v1.1, luật lõi, bản đồ 3 Đêm, Gió Lạc, Bùa Gió, tạm dừng, trường snapshot/scenario/sự kiện mới (P2-01…P2-91) | `npm test`: 79 test (headless qua CLI thật + chế độ thử web) | [phase-2/test.txt](phase-2/test.txt) | Đạt 79/79 |
| Hồi quy Phase 1 với số chuẩn | AC-01…AC-25 trong cùng `npm test` (test gắn số cũ đã tham số hóa theo tuning; test của luật bị ticket đổi đã cập nhật, liệt kê trong `docs/phases/phase-2.md`) | [phase-2/test.txt](phase-2/test.txt) | Đạt |
| ≥ 1 scenario headless mỗi tính năng mới: lướt, rơi + hồi sinh, bục nhảy (Đêm 2), gió (Đêm 3), Gió Lạc cướp + bị Tỏa Sáng thả lại, Bùa Gió, tạm dừng | 7 scenario, đối chiếu từng event/trường với kỳ vọng ghi trước | [phase-2/scenarios.txt](phase-2/scenarios.txt), `phase-2/<tên>.jsonl` | Đạt 7/7 (kỳ vọng `fall-respawn` phát hiện lỗi số thực ở Y < −10, đã sửa core — commit 939fb9c) |
| Tất định 3 Đêm (game mặc định, có sinh ngẫu nhiên) | Seed 2026 chạy 2 lần so sha256; seed 2027 phải khác | [phase-2/determinism.txt](phase-2/determinism.txt), [phase-2/default-night1-seed2026.jsonl](phase-2/default-night1-seed2026.jsonl) | Đạt |
| Một Đêm đầy đủ 21 600 tick ≤ 30 s | Đo thời gian thật mỗi Đêm | [phase-2/perf.txt](phase-2/perf.txt) | Đạt (0.3–0.4 s) |
| Bản web build và khởi động 3 Đêm không lỗi | `npm run build`, Chrome headless 1280×720 chụp menu + `?night=1/2/3`, kiểm console | [phase-2/web.txt](phase-2/web.txt), [menu](phase-2/web-menu.png), [Đêm 1](phase-2/web-night1.png), [Đêm 2](phase-2/web-night2.png), [Đêm 3](phase-2/web-night3.png) | Đạt (chỉ kiểm khởi động + HUD, không phải chơi) |
| Clone sạch chạy được theo README | clone HEAD → `npm ci` → `npm test` → headless 3 Đêm → build | [phase-2/clean-clone.txt](phase-2/clean-clone.txt) | Đạt |
| Chơi 3 Đêm trên máy thật: Đêm 1, Đêm 2 (cầu tre, Bùa Gió đỏ viền vàng), Đêm 3 (tầng, tháp chuông); HUD đủ vị trí | Người học chơi tay, `npm run dev` | [Đêm 1](phase-2/play-night1-start-fps.png), [Đêm 2](phase-2/play-night2-bridge-charm-fps.png), [Đêm 3](phase-2/play-night3-tiers-fps.png) | Đạt |
| Chuỗi Đêm: thắng → kết quả + nút Đêm kế; thua (hết Ngọn Lửa) → "Chơi lại Đêm 1"; thắng Đêm 3 → Bình Minh với tổng điểm (P2-81…83) | Người học chơi tay; thắng bằng nút chế độ thử (thắp hết đèn, core tự xét thắng) | [thắng Đêm 1](phase-2/play-night1-won.png) (742 điểm), [thua](phase-2/play-night1-lost.png), [Bình Minh](phase-2/play-dawn.png) (tổng 2410) | Đạt (thắng bằng chế độ thử, ghi rõ trên màn hình) |
| Menu tạm dừng: Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu; logic dừng (P2-92) | Người học nhấn Esc | [tạm dừng](phase-2/play-pause-menu.png): đồng hồ đứng 04:59, có thêm 2 nút chế độ thử; thấy mũi tên chỉ đèn ở mép trái dưới (P2-122) | Đạt |
| ≥ 30 FPS trung bình (P2-132) | Đọc "FPS · TB" góc dưới trái khi chơi | Ảnh 3 Đêm ở trên: TB 97.7 (Đêm 1), 95.0 (Đêm 2), 81.4 (Đêm 3) | Đạt — đo ở cửa sổ **2133×1012**, lớn hơn 1280×720 (nhiều điểm ảnh hơn ~2.3 lần) |
| Menu chính, giới thiệu Đêm (P2-80) | Chrome headless | [menu](phase-2/web-menu.png) | Đạt (menu); màn giới thiệu chưa có ảnh |
| Cài đặt lưu sau khi mở lại; âm thanh (P2-100, P2-110) | Người học chơi tay, tắt/mở lại trình duyệt | Xác nhận của người học: "âm thanh ok, cài đặt ok" (không có ảnh/clip) | Đạt (quan sát) |
| Đồng hồ đỏ nhấp nháy ≤ 30 s, nhắc "E — Nạp ánh sáng" (P2-120 phần ≤ 30 s, P2-121) | Chơi tay | — | **Chưa có ảnh** |
| Chạy trên macOS/Linux | — | — | Chưa thử trực tiếp; script và headless chỉ dùng Node chuẩn, clone sạch chạy trên Windows |

## Phase 1 (PRD-0, Test Contract v1.0)

| Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| AC-01…AC-25 (trừ AC-22): contract, tick, di chuyển, nhặt, nạp/thắp, thắng, va chạm, thua (no_flames, dawn), tỏa sáng, safe_radius, tất định, sinh thêm, mã thoát 2 | `npm test` (24 test gọi CLI headless thật) | [phase-1/test.txt](phase-1/test.txt) | Đạt 24/24 |
| Luồng nhặt 5 đom đóm → nạp → thắp L1 | `node src/headless/cli.js … --scenario scenarios/pickup-deposit.scenario.json --inputs scenarios/pickup-deposit.inputs.json` | [phase-1/pickup-deposit.jsonl](phase-1/pickup-deposit.jsonl) | Đạt: nhặt ở tick 10/20/30/40/50, `deposit` + `lantern_lit` tick 81, điểm 150 (đúng kỳ vọng ghi trước trong `scenarios/README.md`) |
| Tất định trên game mặc định (random motes/shades) | Chạy 2 lần seed 2026, 18000 tick, so `cmp` | [phase-1/determinism.txt](phase-1/determinism.txt), [phase-1/default-run1.jsonl](phase-1/default-run1.jsonl) | Đạt (sha256 trùng) |
| Clone sạch chạy được theo README | `git clone` → `npm ci` → `npm test` → headless → build | [phase-1/clean-clone.txt](phase-1/clean-clone.txt) | Đạt |
| AC-22 chơi bản web tới **thắng** | `npm run dev`, người học chơi tay | [phase-1/web-won.png](phase-1/web-won.png): HUD "Đèn đã thắp 5/5", 2 ngọn lửa, còn 02:21, banner "Đảo đã sáng lại!", điểm 1031; thấy vòng an toàn cam quanh đèn đã thắp, đảo sáng hơn | Đạt |
| AC-22 chơi bản web tới **thua** (hết ngọn lửa) | `npm run dev`, người học chơi tay | [phase-1/web-lost.png](phase-1/web-lost.png): HUD "Ngọn lửa: ···" (0/3), Bóng Mực tím cạnh Mây, banner "Ánh sáng đã tắt…", điểm 70 (7 đom đóm × 10) | Đạt |
| AC-22 chơi lại sau thắng/thua (R) | Quan sát khi chơi | Banner hiển thị "Nhấn R để chơi lại" (2 ảnh trên); người học đã chơi nhiều ván | Đạt (quan sát, không có ảnh riêng) |
| Chạy trên macOS/Linux | — | — | Chưa thử trực tiếp; headless chỉ dùng Node chuẩn, web là bản tĩnh |

## CP0

| Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| Môi trường chạy được, test chạy được | `npm test` | [phase-0/test.txt](phase-0/test.txt) | Đạt (3/3, test CP0 đã thay bằng AC Phase 1) |
| Headless khung tất định | Chạy CLI 2 lần | [phase-0/headless.txt](phase-0/headless.txt) | Đạt |
| Bản web build được | `npm run build` | [phase-0/build.txt](phase-0/build.txt) | Đạt |
| Cảnh 3D hiển thị, di chuyển được | `npm run dev`, quan sát | [phase-0/web-move.png](phase-0/web-move.png) | Đạt |
