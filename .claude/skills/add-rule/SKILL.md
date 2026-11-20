---
name: add-rule
description: Thêm hoặc sửa một luật/tính năng gameplay của Đảo Đèn Lồng theo ticket (core + headless + test). Dùng khi ticket yêu cầu luật mới, đổi số liệu, hoặc sửa lỗi hành vi trong src/core.
---

# Thêm / sửa luật game

Làm đúng thứ tự, mỗi bước có bằng chứng. Không bỏ bước 2–3 kể cả khi thay đổi "nhỏ".

1. **Đọc nguồn**: đoạn liên quan trong ticket hiện hành (`docs/phases/ticket-03.md`, phần không bị thay của `ticket-02.md`) và AC trong `docs/phases/phase-3.md`. Ghi ra con số, thứ tự tick, sự kiện, trường snapshot bị ảnh hưởng.
2. **Chỗ mơ hồ** → thêm dòng `A3-xx` vào `docs/assumptions.md` (Chưa quy định | Giả định | Lý do | Kiểm chứng | Trạng thái). Nếu ảnh hưởng chấm tự động, thêm vào "Câu hỏi mở cho giảng viên" trong `phase-3.md`. Không tự thêm luật ngoài ticket.
3. **AC**: thêm/sửa dòng `P3-xx` trong `phase-3.md` (Khi … | Thì … | Kiểm chứng).
4. **Test đỏ trước**: viết test headless trong `tests/phase3-*.test.js` (hoặc file Phase 2 nếu sửa luật Phase 2) dùng `runHeadless`, `empty()`, `snapAt`, `ev` từ `tests/helpers.js`. Tính kỳ vọng bằng tay từ số chuẩn (`T.x`, `RULES`), ví dụ 4 m/s = 1/15 m/tick → từ 3 m tới 1 m mất 30 tick. Chạy `npm test` → thấy đỏ đúng lý do.
5. **Sửa core**:
   - Số liệu thuộc `tuning` của contract → `TUNING` **và** `game.contract.json`; số chuẩn khác → `RULES` (`src/core/tuning.js`); bản đồ → `src/core/maps.js`.
   - Hành vi → `src/core/world.js`, đặt đúng **bước** trong 12 bước của `step()` (comment đánh số sẵn).
   - Scenario/inputs mới → `src/core/validate.js` (sai kiểu → mã 2).
   - Không `Math.random`/`Date.now`/`three`/DOM trong core; ngẫu nhiên qua `g.rng()` và để ý thứ tự gọi rng (đổi thứ tự = đổi output tất định).
   - So sánh khoảng cách/độ cao có dung sai `EPS` (A1-15).
6. **Xanh + hồi quy**: `npm test` toàn bộ (gồm AC Phase 1 trong `contract.test.js`). Test cũ đỏ vì ticket đổi luật ([THAY THẾ]) → sửa test theo luật mới, ghi lý do trong comment test **và** bảng "Test cũ thay đổi" của `phase-3.md`, thêm dòng breaking change vào `CHANGELOG.md` nếu đầu ra headless đổi; **không skip**. Đỏ vì lý do khác → sửa core.
7. **Web** chỉ cần cập nhật nếu có hiển thị/âm thanh mới (`src/web/`), không đặt luật ở đó.
8. **Tài liệu**: README (luật, điều khiển) nếu người chơi thấy khác; tiến độ trong `phase-3.md`; quyết định mô hình lớn → ADR trong `docs/adr/`.
9. Commit local (không push), message nêu AC và giả định liên quan. Dán output `npm test` thật khi báo cáo.

## Bẫy đã gặp
- Bùa Gió mặc định Đêm 2 ở (35,0,0) giữa cầu, Gió Lạc mặc định Đêm 2/3, gió Đêm 3 → test không kiểm chúng phải tắt (`charms: []`, `random_drifters: false`, `wind_enabled: false`).
- Cộng dồn 0.1 m/tick lệch ~1e-15: mép đất, bán kính, Y < −10 đều cần dung sai.
- Trọng lực dùng vận tốc trung bình trong tick (A2-31): nhảy đỉnh 1.225 m ở tick 21, tiếp đất tick 42.
- Bộ đếm đặt ở tick k hết ở tick k+N; chuyển động "trong N tick" (recoil, đẩy lùi) diễn ra ở các tick k+1…k+N. `invuln_ticks: 59` trong scenario hết ở tick 59, không phải 60.
- Dầu đèn hao ở bước 2 **trước** tương tác bước 5: đèn `lit: true` (fuel 100) cạnh Mây sẽ nhận `refuel` 1 đom đóm thay vì bị bỏ qua; đèn sáng gần hơn luôn "cướp" lượt E của đèn tắt ở xa hơn. Muốn nạp đèn tắt thì để Mây gần nó hơn.
- Dầu tính bằng đơn vị nguyên 1/60: kỳ vọng `fuel` = (đơn vị)/60 làm tròn 1 chữ số; ví dụ fuel 20 bị 1 con hút: −6 đơn vị/tick → 1200/6 = tắt sau 200 tick.
- Đêm 1/2/3 dài 240/270/300 s (v1.2); `empty()` để L2…L5 mặc định **tắt** — Bóng Mực `wander` sẽ đi về đèn tắt gần nhất (A3-2).
