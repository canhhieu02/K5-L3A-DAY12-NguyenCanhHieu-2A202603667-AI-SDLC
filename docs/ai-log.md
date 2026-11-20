# Nhật ký dùng AI và token

## Tổng quan công cụ
- Agent: Claude Code (Claude Opus 5.5) trong VS Code. Harness: [AGENTS.md](../AGENTS.md) (từ Phase 2), [CLAUDE.md](../CLAUDE.md), skill trong `.claude/skills/`.
- Kiểm tra web tự động: Chrome headless (chụp ảnh + log console) từ Phase 2.

## Nhật ký

| Thời điểm | Phase | Việc giao cho AI | Kết quả / lỗi AI | Cách phát hiện & xử lý | Token/chi phí ước tính |
|---|---|---|---|---|---|
| CP0 | 0 | Đọc tài liệu lab, kiểm tra tiến độ CP0/Phase 1 | Báo đúng hiện trạng | Đối chiếu `git ls-files` | _(ghi theo /cost)_ |
| CP0 | 0 | Dựng khung repo (Node + Three.js + Vite, core/headless/web, test) | Lỗi AI: script `node --test tests/` không chạy trên Node 22 | Chạy thật `npm test` thấy MODULE_NOT_FOUND → đổi sang glob `tests/*.test.js` | |
| CP0 | 0 | Kiểm tra web bằng mắt | Lỗi thiết kế AI: camera bám nhân vật + nền trơn → nhìn như không di chuyển | Người học chơi thử, không thấy chuyển động → thêm lưới mốc + tọa độ trên HUD | |

| Phase 1 | 1 | Đưa nguyên văn PRD-0; AI viết tiêu chí AC-01…22 + giả định, rồi core/CLI/test/web | 20/21 test đạt lần đầu | — | |
| Phase 1 | 1 | Lỗi AI: so sánh `d <= r` trượt 1 tick do sai số cộng dồn (0.05 m/tick → 1.0000000001 m) | Test AC-13 đỏ; in snapshot tick 40/41 thấy nguyên nhân | Thêm dung sai 1e-9 cho mọi phép "trong bán kính" (A1-15), test khẳng định đúng tick 40 | |
| Phase 1 | 1 | Lỗi AI: bản web gán đè hàm `readInput`, gọi trong render làm Q/E xoay camera 2 lần/khung | Tự review diff trước khi chạy | Viết lại: tính hướng mặt trong vòng lặp tick | |

| Phase 1 | 1 | Đối chiếu 7 câu trả lời của GV với code | Phát hiện lệch ở safe_radius với bóng đang choáng | Viết AC-23 tái hiện (đỏ) → sửa `world.js` → 24/24 xanh | |
| Phase 1 | 1 | Lỗi AI: test AC-23 bản đầu đỏ **sai lý do** (đèn đặt ngoài interact_radius nên không thắp) | Đọc lại số liệu trước khi sửa code | Dời đèn, thêm assert trạng thái trước khi thắp để test chỉ đỏ đúng chỗ | |
| Phase 1 | 1 | Lỗi AI: dùng `sed` đánh dấu cả 17 giả định "đã hỏi GV" trong khi chỉ hỏi 7 chủ đề | Tự rà kết quả lệnh | Sửa lại chỉ đánh dấu các dòng thực sự đã hỏi | |

| Phase 2 | 2 | Bắt đầu phiên mới bằng `/clear`; dán nguyên văn TICKET-02 (chữ + 4 ảnh); AI lưu `ticket-02.md`, lập kế hoạch 8 bước, mỗi bước chờ người học duyệt | Đúng | Người học duyệt từng bước ("ok làm bước N") | |
| Phase 2 | 2 | Bước 1–2: spec AC P2-01…P2-132, giả định A2-1…A2-35, đưa số chuẩn vào `tuning.js` + contract v1.1 | 6 test Phase 1 đỏ vì gắn cứng số cũ (đã đoán trước) | Tham số hóa theo `T.x`, không đổi ý nghĩa; thêm P2-01 khóa số chuẩn | |
| Phase 2 | 2 | Bước 3: viết lại lõi theo 12 bước/tick | Lỗi AI: tích phân Euler bán ẩn làm nhảy chỉ cao 1.167 m (chuẩn 1.225 m) | Test P2-11 đỏ → đổi sang vận tốc trung bình trong tick (A2-31), đỉnh đúng tick 21, đáp tick 42 | |
| Phase 2 | 2 | Bước 3: test tự viết | Lỗi AI trong test: kỳ vọng recoil lệch 1 tick; scenario hết Ngọn Lửa nên thiếu snapshot cần kiểm; dựng một tình huống không thể xảy ra (bóng chạm cùng tick thắp đèn cuối, trong khi vùng an toàn luôn chặn) | Đọc lại luật trước khi sửa: sửa test, không sửa core; ghi lý do tình huống bất khả thi vào chính test | |
| Phase 2 | 2 | Bước 4: bản đồ 3 Đêm | Lỗi AI: mép cầu so `z <= 2` trượt do 0.1 m/tick cộng ra 2.0000000000000004 | Test P2-52 đỏ → dung sai 1e-9 cho mép đất (như A1-15) | |
| Phase 2 | 2 | Bước 5: Gió Lạc, Bùa Gió | Lỗi AI trong test: hiểu sai thời điểm hết lướt (nhấn lại khi đang lướt); Bùa Gió mặc định đặt giữa cầu làm hỏng test bản đồ cũ | Đọc output thật → sửa test; test bản đồ tắt bùa/Gió Lạc; ghi bẫy này vào skill `add-rule` | |
| Phase 2 | 2 | Bước 6: web 3 Đêm, menu, âm thanh, HUD | Lỗi AI: camera đặt sai phía, cảnh quá tối, mũi tên đè đồng hồ | AI tự chụp bằng Chrome headless và xem ảnh → sửa trước khi giao người học | |
| Phase 2 | 2 | Bước 8: scenario có kỳ vọng **ghi trước** + script bằng chứng | Kỳ vọng `fall-respawn` lệch 1 tick → phát hiện lỗi core thật: Y = −10.000000000000004 sau 60 tick bị tính là "< −10" | Sửa core (dung sai), **không** chép output vào kỳ vọng; 7/7 scenario khớp | |
| Phase 2 | 2 | Script bằng chứng | Lỗi AI: lấy đường dẫn từ `URL.pathname` (bị mã hóa %) và chạy `git clone` qua shell làm hỏng đường dẫn có dấu cách/tiếng Việt; message commit có dấu `"` bị PowerShell 5.1 cắt | Chạy thật thấy lỗi → `fileURLToPath`, bỏ shell cho git/node, commit bằng `git commit -F` | |
| Phase 2 | 2 | Người học chơi thử: "phím di chuyển đôi khi không làm được" | Nguyên nhân khả dĩ: nút vừa bấm giữ focus (Space bấm lại "Tiếp tục" → tạm dừng), bộ gõ Unikey làm thiếu `e.code` | Bỏ focus khi vào chơi, suy mã phím từ `e.key`, hướng dẫn tắt Unikey; người học không báo lỗi lại (chưa tái hiện được chắc chắn nguyên nhân) | |
| Phase 2 | 2 | Người học yêu cầu "chế độ thử": chọn Đêm, qua Đêm, thắng Đêm | Làm đúng; nút thắng chỉ thắp đèn, core tự xét thắng nên luồng thật được kiểm | Test riêng: headless không gọi hàm debug | |
| Phase 2 | 2 | Bước 7–8: AGENTS.md, 3 skill, bằng chứng tự động + 7 ảnh người học chơi | 79/79 test, 6/6 phần bằng chứng tự động ĐẠT; FPS TB 81–98 | Phần chỉ quan sát (âm thanh, cài đặt) ghi rõ "Đạt (quan sát)"; mục chưa có ảnh để "Chưa có ảnh" | |
| Phase 3 | 3 | `/clear` rồi dán nguyên văn TICKET-03 (change request); AI lưu `ticket-03.md`, đọc toàn bộ core/test/docs để xác định luật bị [THAY THẾ] | Đúng | — | |
| Phase 3 | 3 | Core: dầu đèn bằng số nguyên 1/60, `drain`, thắng ở bình minh, sức chứa, điểm, contract v1.2 | 11 test cũ đỏ đúng dự đoán (luật bị thay); P2-17 đỏ ngoài dự đoán | Đọc lại thứ tự tick: dầu hao ở bước 2 trước tương tác bước 5 nên đèn "100" không còn đầy → hệ quả đúng của ticket; cập nhật test + ghi A3-5 và câu hỏi mở thay vì sửa core | |
| Phase 3 | 3 | Test mới P3-xx (kỳ vọng tính tay) | Lỗi AI trong test: `invuln_ticks: 59` (hết ở tick 59, không phải 60); kịch bản thắp lại bị đèn sáng gần hơn "cướp" lượt E | Test đỏ → đọc luật/giả định (A2-4, A3-5) → sửa test, không sửa core; ghi bẫy vào skill `add-rule` | |
| Phase 3 | 3 | Web: thanh dầu, nhấp nháy, đèn tắt xẹp + rách, chế độ mù màu | Vết rách lần đầu quá mờ trên nền đêm | AI tự chụp Chrome headless (`?demo=fuel`), xem ảnh → phóng to + màu đen | |
| Phase 3 | 3 | Scenario Phase 3 (kỳ vọng ghi trước) + bằng chứng | 6/6 khớp lần đầu; scenario Phase 2 `pause` lệch do Đêm 1 còn 240 s | Chạy lại scenario Phase 2 vào thư mục tạm (`EVIDENCE_OUT`) để không ghi đè bằng chứng cũ; cập nhật kỳ vọng có ghi lý do | |

## Token / chi phí

Dùng gói **Claude Pro** (thuê bao, không trả theo token), nên Claude Code không hiện số token hay số tiền chính xác. Số đo lấy từ bảng *Account & Usage* của tiện ích VS Code.

| Mốc | Phạm vi | Hạn mức phiên (5 giờ) | Hạn mức tuần | Ghi chú |
|---|---|---|---|---|
| Sau khi tag `phase-1` | CP0 + Phase 1, 1 phiên Claude Code (Opus) | 32% | 11% | Chi phí tiền thêm: 0 (nằm trong gói) |
| Sau khi tag `phase-2` | Phase 2: 1 cuộc hội thoại (bắt đầu bằng `/clear`), 8 bước + sửa theo phản hồi | _(người học điền)_ | _(người học điền)_ | Chi phí tiền thêm: 0 (nằm trong gói) |
| Sau khi tag `phase-3` | Phase 3: 1 cuộc hội thoại (bắt đầu bằng `/clear`), dán TICKET-03 một lần; làm liền core → test → web → tài liệu → bằng chứng, rồi 2 lượt ảnh chơi tay | _(người học điền)_ | _(người học điền)_ | Chi phí tiền thêm: 0 (nằm trong gói) |

Bảng *"What's contributing to your limits usage"* (24 giờ qua, ước tính):
- 77%: *"Start fresh when you switch tasks"*. Cả CP0 và Phase 1 chạy trong **một** cuộc hội thoại dài, nên mỗi lượt gửi lại toàn bộ ngữ cảnh cũ.
- 17%: ngữ cảnh lớn (file dài như PRD-0, test, world.js được đọc hoặc viết nhiều lần).
- 11%: chưa compact trước khi tạm nghỉ.

**Bài học cho Phase 2 trở đi:** chạy `/clear` khi sang phase mới (ngữ cảnh cần thiết đã nằm trong repo: CLAUDE.md, docs/phases, docs/assumptions.md); dùng `/compact` khi hội thoại dài; chỉ đưa ticket mới vào ngữ cảnh, không dán lại PRD cũ.

**Phase 2 — đã áp dụng / chưa áp dụng bài học:**
- Đã: `/clear` trước khi dán TICKET-02; ngữ cảnh lấy từ repo (CLAUDE.md, phase-1.md, assumptions.md) thay vì dán lại PRD.
- Chưa: cả 8 bước vẫn trong **một** cuộc hội thoại dài, không `/compact` giữa các bước; mỗi lượt gửi lại toàn bộ lịch sử (lõi `world.js` được viết lại nguyên file một lần, đọc nhiều lần).
- Tốn nhiều: đọc ảnh chụp màn hình (mỗi ảnh là một khối ngữ cảnh lớn), viết nguyên file lớn (`world.js`, `scene.js`, `main.js`, test).

**Bài học cho Phase 3:** `/compact` (hoặc `/clear` + nhắc đọc `docs/phases/phase-N.md`) sau mỗi bước đã commit; chỉ xem ảnh khi thật cần; sửa bằng Edit nhỏ thay vì viết lại nguyên file.

**Phase 3 — đã áp dụng / chưa áp dụng bài học:**
- Đã: `/clear` trước khi dán TICKET-03; ngữ cảnh lấy từ repo (CLAUDE.md → AGENTS.md, phase-2.md, assumptions.md, skill `add-rule`). Lõi `world.js` sửa bằng **Edit nhỏ theo từng bước tick** (không viết lại nguyên file như Phase 2); test cũ sửa bằng thay thế chuỗi có kiểm tra, không chép lại file. Output lệnh lọc chỉ lấy `not ok` / tổng kết. Chỉ 3 lần AI tự xem ảnh (2 ảnh kiểm hiển thị dầu đèn + 1 ảnh sau khi sửa vết rách).
- Chưa: vẫn **một** cuộc hội thoại dài từ ticket tới tag, không `/compact` giữa các commit (4 commit core/web/docs/bằng chứng là 4 điểm dừng tự nhiên).
- Tốn nhiều: đọc trọn ~15 file lúc đầu để hiểu ảnh hưởng của change request (world.js, 6 file test, main.js, scene.js, docs Phase 2) — cần thiết vì ticket thay luật ở nhiều chỗ; 8 ảnh chơi tay người học dán vào (mỗi ảnh là một khối ngữ cảnh lớn); viết mới các tài liệu dài (ADR, CHANGELOG, phase-3.md).
- Tiết kiệm được nhờ harness: skill `add-rule` có sẵn bẫy Phase 2 (Bùa Gió giữa cầu, dung sai, bộ đếm); `scripts/evidence.mjs` sinh toàn bộ bằng chứng bằng 1 lệnh; cảnh dựng sẵn `?demo=` giúp chụp ảnh chơi tay trong vài phút thay vì chơi trọn Đêm 4 phút.

**Bài học cho Phase 4:** `/compact` ngay sau mỗi commit lớn; với change request, đọc `CHANGELOG.md` + ADR trước thay vì đọc lại toàn bộ test; người học gửi ảnh theo lô sau khi đã tự lọc ảnh đúng cảnh (đợt 2 có 2/4 ảnh chưa đúng cảnh phải giải thích lại).

## Cách tiết kiệm token đã áp dụng
- CLAUDE.md ngắn (nay import AGENTS.md); chỉ đưa ticket của phase hiện tại vào ngữ cảnh.
- Lọc output lệnh: chỉ lấy dòng `not ok` / tổng kết của `npm test`, không in toàn bộ.
- Đọc file theo đoạn cần thiết; tiến độ và quyết định ghi vào `docs/phases/phase-2.md` để phiên sau không phải dựng lại.
- `scripts/evidence.mjs` gom mọi lệnh sinh bằng chứng thành một lệnh, không phải chạy và dán tay từng lệnh.
- Skill `add-rule`, `headless-scenario`, `phase-evidence` ghi sẵn quy trình và bẫy đã gặp, đỡ phải giải thích lại.
