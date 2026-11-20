# Retro — Đảo Đèn Lồng (Lab Day 12, AI SDLC)

Người học: NguyenCanhHieu (2A202603667) · Công cụ: Claude Code (Claude Opus 5.5) trong VS Code · 4 phase, 4 ticket (PRD-0 → TICKET-04), Test Contract v1.0 → v1.3.

## 1. Tổng hợp Evaluation 4 phase

| Phase | Ticket | Kết quả có bằng chứng | Chưa đạt / rủi ro còn lại | Chi tiết |
|---|---|---|---|---|
| 1 | PRD-0: Đêm 1 chơi được + headless v1.0 | 24 test AC, tất định, chơi web | Nhiều con số tự chọn (A1-xx), sau đó bị TICKET-02 thay | [phase-1.md](phases/phase-1.md) |
| 2 | TICKET-02: số chuẩn, 3 Đêm, lướt/rơi/gió, Gió Lạc, Bùa Gió, tạm dừng | 79/79 test, 7/7 scenario kỳ vọng ghi trước, FPS TB 81–98 khi chơi | Lỗi phím "lúc ăn lúc không" chưa tái hiện chắc nguyên nhân (nghi Unikey) | [phase-2.md](phases/phase-2.md) |
| 3 | TICKET-03 (change request): dầu đèn, `drain`, thắng ở bình minh | 101/101 test, 11 test cũ cập nhật có lý do, 6/6 scenario khớp lần đầu, 8 ảnh chơi tay | Cách hiểu A3-1/A3-2/A3-5/A3-6 có thể lệch test ẩn | [phase-3.md](phases/phase-3.md) |
| 4 | TICKET-04: bench, soak, bảng xếp hạng, tiếp cận, phát hành | 115/115 test, bench 99.7–107.9 FPS TB (1% low 28–79) trên GPU tích hợp, soak 0 crash ×1.08 RAM, clone sạch 2 lệnh | 1 lần 1% low 28 < 30 (không lặp lại); phần chơi tay a11y chưa kiểm hết; máy chấm khác máy mình | [phase-4.md](phases/phase-4.md) |

Toàn bộ bằng chứng: [evidence/README.md](../evidence/README.md). Giả định: [assumptions.md](assumptions.md).

## 2. Điều hiệu quả khi làm với AI

- **Tách core thuần ngay từ Phase 1.** Web, headless, soak và cảnh bench đều gọi cùng `step()`; Phase 4 thêm bench chỉ cần một cờ trong core, và chứng minh "đầu ra headless không đổi" bằng sha256 tất định.
- **Lưu ticket nguyên văn vào repo + spec AC có mã (AC-xx, P2-xx…).** Mỗi phiên mới chỉ cần `/clear` rồi đọc `AGENTS.md` → `phase-N.md`; AI không phải nhớ hội thoại cũ.
- **Test gọi CLI thật** (không gọi hàm nội bộ) giống cách máy chấm chạy, nên lỗi định dạng/mã thoát lộ ra sớm.
- **Kỳ vọng scenario ghi trước khi chạy.** Lần lệch 1 tick ở `fall-respawn` (Phase 2) là lỗi thật trong core, không phải lỗi kỳ vọng — nếu chép output vào kỳ vọng thì đã bỏ sót.
- **Một lệnh sinh toàn bộ bằng chứng** (`scripts/evidence.mjs`): chạy lại sau mỗi sửa đổi, bằng chứng luôn khớp commit.
- **Làm rủi ro lớn nhất trước** (Phase 4: bench cho bản web) và đo thật trước khi tối ưu.

## 3. Điều không hiệu quả

- Hội thoại quá dài trong một phiên (CP0 + Phase 1 chung một hội thoại chiếm 77% hạn mức theo bảng Usage); chưa dùng `/compact` giữa các commit ở cả 4 phase.
- AI viết nguyên file lớn ở Phase 2 (`world.js`, `main.js`) tốn ngữ cảnh; từ Phase 3 chuyển sang Edit nhỏ.
- Phần chỉ kiểm được bằng mắt (âm thanh, cảm giác điều khiển, phím Unikey) AI không tự kiểm được; phải có người chơi thử.

## 4. Những lần AI sai và cách phát hiện

| Lỗi | Phát hiện bằng |
|---|---|
| So sánh `d <= r` trượt 1 tick vì sai số số thực (Phase 1, lặp lại ở mép cầu Phase 2 và rơi Y = −10 Phase 2) | Test đỏ → in snapshot quanh tick lỗi → dung sai 1e-9 thành quy tắc trong AGENTS.md |
| Tích phân nhảy sai (đỉnh 1.167 m thay vì 1.225 m) | Test số chuẩn P2-11 |
| Test tự viết sai lý do / dựng tình huống không thể xảy ra (AC-23, recoil lệch tick, `invuln_ticks`) | Đọc lại luật trước khi sửa: sửa test chứ không sửa core |
| Đường dẫn có dấu cách/tiếng Việt: `URL.pathname`, shell `git clone`, `tar` (Phase 2, 4) | Chạy thật trên chính thư mục "Bài Lab thực chiến" |
| Bộ đo RAM bench dính PID tái sử dụng (5 499 MB) | Số nhảy vọt giữa hai lần chạy giống nhau |
| Camera sai phía, cảnh quá tối, mũi tên đè đồng hồ, màn Cài đặt tràn | AI tự chụp Chrome headless và xem ảnh trước khi giao |

Mẫu chung: **chạy thật sớm** (build, test, lệnh contract) và **không tin số đẹp một lần** (bench chạy lại 6 lần, ghi cả dải).

## 5. Harness giúp nhiều nhất

1. **`AGENTS.md` (qua `CLAUDE.md`)**: kiến trúc cấm/được phép, thứ tự 12 bước tick, quy tắc "không sửa tay evidence", "không push trước khi duyệt" — AI không lặp lại các lỗi đã ghi.
2. **Skill `add-rule`**: ghi sẵn các bẫy (Bùa Gió giữa cầu, bộ đếm hết ở tick k+N, dung sai) → test Phase 3–4 ít đỏ sai lý do hơn.
3. **Skill `phase-evidence` + `scripts/evidence.mjs`**: biến DoD thành một lệnh; header ghi commit nên biết bằng chứng khớp tag.
4. Bộ nhớ người dùng "chỉ commit local, chờ duyệt mới push/tag".

Chưa dùng hook; nếu làm lại sẽ thêm hook chạy `npm test` trước mỗi commit.

## 6. Token / chi phí

- Gói Claude Pro (thuê bao): **chi phí tiền thêm = 0**; Claude Code không hiện số token chính xác nên đo bằng % hạn mức trong bảng Usage của VS Code ([ai-log.md](ai-log.md#token--chi-phí)): sau Phase 1: 32% phiên / 11% tuần; sau Phase 3: 43% phiên / 21% tuần; Phase 4: _(người học điền sau khi tag)_.
- Cách tiết kiệm đã dùng: `/clear` mỗi phase; ngữ cảnh lấy từ repo (ticket, spec, giả định) thay vì dán lại; Edit nhỏ thay vì viết lại file; lọc output test chỉ còn dòng lỗi/tổng kết; hạn chế đọc ảnh; skill ghi sẵn quy trình.

## 7. Nếu làm lại

- `/compact` sau mỗi commit; tách mỗi bước lớn thành phiên riêng bắt đầu bằng "đọc phase-N.md mục Kế hoạch".
- Viết `docs/phases/phase-N.md` mục "Kế hoạch kiểm chứng" và giả định **trước** khi cho AI code (đã làm từ Phase 2, nên làm ngay từ Phase 1).
- Thêm hook pre-commit `npm test` và một test kiến trúc cho mọi file mới.
- Chọn sớm cách đóng gói + đo hiệu năng (Phase 1) để Phase 4 không phải dựng launcher trình duyệt dưới áp lực thời gian.
- Ghi số % Usage ngay sau mỗi tag (Phase 2 còn trống).
