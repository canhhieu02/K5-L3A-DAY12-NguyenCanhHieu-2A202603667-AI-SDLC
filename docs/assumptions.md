# Giả định

Chỗ PRD-0 / Test Contract / ticket chưa quy định → cách hiểu đã chọn. Khi ticket sau làm rõ, cập nhật cột Trạng thái (giữ lịch sử, không xóa).

## Phase 1 (PRD-0, contract v1.0)

| ID | Chưa quy định | Giả định | Lý do | Kiểm chứng | Trạng thái |
|---|---|---|---|---|---|
| A0-1 | Bước thời gian | 60 tick/s cố định (contract đã quy định) | — | AC-03 | Đã chốt bởi contract |
| A1-1 | "Ánh sáng" mà tỏa sáng tiêu tốn | Tốn `pulse_cost` = 1 đom đóm đang mang; không mang thì không tỏa sáng được | "tỏa sáng tốn ánh sáng"; đom đóm là ánh sáng | AC-16, AC-17 | **Thay bởi TICKET-02**: tốn 3 đom đóm, hồi chiêu 3 s (P2-20, P2-22) |
| A1-2 | "Máu" | Ngọn lửa (`flames`) = 3 | Contract dùng `flames`, sự kiện `no_flames` | AC-13, AC-14 | Khớp TICKET-02 |
| A1-3 | Đom đóm rơi khi bị chạm | `dropped = floor(carried × 0.5)`, đom đóm rơi **mất hẳn** (không sinh lại trên đất) | Đơn giản, tránh nhặt lại ngay tại chỗ | AC-13 | **Thay bởi TICKET-02**: rơi ra vành 1.5–2.5 m, tồn tại 480 tick, nhặt lại được (P2-24) |
| A1-4 | Đèn nào làm Bóng Mực sợ | Chỉ đèn **đã thắp**; Bóng Mực (kể cả đang choáng) bị đẩy ra mép `safe_radius` ngay tick đèn thắp | Đèn chưa thắp chưa có ánh sáng | AC-18, AC-23 | **Thay bởi TICKET-02**: vùng 6 m; bóng bên trong bị đẩy ra trong ≤ 30 tick, không gây sát thương lúc đó (P2-19) |
| A1-5 | Hết thời gian | Bình minh tới mà chưa thắp hết đèn = **thua** (`dawn`) | Contract liệt kê `lost / dawn` | AC-15 | Khớp TICKET-02 |
| A1-6 | Điểm cuối trận | Chỉ khi **thắng**: + `floor(time_left_s) × per_second_left` + `flames × per_flame_left` | Thưởng cho chiến thắng nhanh, an toàn | AC-12 | Khớp TICKET-02 (hệ số 2 và 50) |
| A1-7 | Rơi khỏi đảo | Không rơi: người chơi bị chặn ở mép đảo bán kính 40 m → `fall_enabled: false`, không có sự kiện `fall` | Giảm phạm vi Phase 1 | đọc code | **Thay bởi TICKET-02**: có rơi, `fall_enabled: true` (P2-26) |
| A1-8 | Nhảy | Nhảy chỉ thay đổi Y (v₀ 7 m/s, g 20 m/s²); mọi khoảng cách đo theo XZ nên nhảy **không** né được Bóng Mực | Contract: khoảng cách đo trên mặt phẳng XZ | AC-07 | **Thay bởi TICKET-02**: chạm cần chênh cao ≤ 1.5 m nên nhảy có thể né (P2-24) |
| A1-9 | Vị trí đèn mặc định | L1…L5 trên vòng tròn 20 m, L1 tại (0,0,20), cách nhau 72° | Đảo tròn, đều | snapshot tick 0 | **Thay bởi TICKET-02**: tọa độ chuẩn trên vòng 25 m (P2-50) |
| A1-10 | Sinh đom đóm | Mặc định 25 con ngẫu nhiên (theo seed); cứ 5 s thêm 1 nếu còn < 15 | Đủ thắp 5 đèn (25) + dự phòng | AC-19 | **Thay bởi TICKET-02**: 20 con trên điểm sinh chuẩn, tick 240k thêm 1 nếu < 30 (P2-16) |
| A1-11 | Sinh Bóng Mực | Mặc định 2 con (S1, S2) cách tâm 28–36 m; cứ 30 s thêm 1, tối đa 6 | Áp lực tăng dần | AC-20 | **Thay bởi TICKET-02**: 2 con tại tick 300, rồi mỗi 8/7/6 s (P2-30) |
| A1-12 | Nạp đèn | Nút `interact` nạp tối đa đủ `lantern_cost` vào đèn **chưa thắp gần nhất** trong `interact_radius` | — | AC-10, AC-11 | Khớp TICKET-02; thêm luật bằng nhau → id nhỏ hơn (P2-17) |
| A1-13 | Choáng / bất tử / hồi chiêu đếm thế nào | Đổi giây → tick (`round(s × 60)`). Bóng Mực choáng từ tick k+1 tới k+180; chạm tiếp sớm nhất sau 90 tick; tỏa sáng lại sau 60 tick | Đếm nguyên, tất định | AC-13, AC-16, AC-17 | Cách đếm giữ nguyên (A2-4); số đổi theo TICKET-02 |
| A1-14 | Thứ tự xử lý trong một bước | timer → nút → di chuyển → nhảy → nhặt → nạp → (thắng?) → tỏa sáng → Bóng Mực di chuyển → va chạm → sinh thêm → bình minh | Thắng được xét trước va chạm cùng tick | đọc code | **Thay bởi TICKET-02**: 12 bước bắt buộc, thắng/thua xét cuối tick (P2-31) |
| A1-15 | Sai số số thực | "Trong bán kính r" so với `r + 1e-9` | Cộng dồn 0.05 m/tick lệch ~1e-15, tránh trượt 1 tick | AC-08, AC-13 | Giữ |
| A1-16 | Đèn trong scenario có id lạ | Bỏ qua, cảnh báo ra stderr (vẫn thoát 0) | Contract chỉ nói L1…L5 | — | Giữ (id theo Đêm: L1…L5/L6/L7) |
| A1-17 | Tên trạng thái Bóng Mực | `chase`, `stunned` | Contract chỉ bắt buộc `stunned` | AC-16 | **Thay bởi contract v1.1**: `spawning`, `wander`, `chase`, `recoil`, `stunned` |
| A1-18 | Nhặt tự động hay bấm nút; đầy thì sao | Tự động khi ≤ `pickup_radius`; mang đủ `carry_capacity` thì không nhặt, đom đóm ở lại trên đất | Đơn giản, đúng ràng buộc carried ≤ capacity | AC-09, AC-24 | Khớp TICKET-02 |
| A1-19 | Thứ tự dòng trong cùng tick | Event trước, snapshot (nếu tới lượt) sau, `end` cuối; không snapshot đặc biệt khi kết thúc | GV trả lời đúng như vậy (Q&A CP1) | AC-25 | Đã chốt bởi GV |

Hỏi đáp với giảng viên ở CP1 (7 câu: nhặt, nạp, pulse, bị chạm, thứ tự dòng, thưởng thắng, vùng an toàn): tóm tắt trong [phases/phase-1.md](phases/phase-1.md).

## Phase 2 (TICKET-02, contract v1.1)

Góc: θ đo từ +X; điểm ở góc θ bán kính r là `(r·cosθ, y, r·sinθ)`. Suy ra từ ticket: tầng 1 Đêm 3 "ở nửa z > 0" chứa 2 dốc ở 30° và 150°, nên sin θ phải ứng với z.

| ID | Chưa quy định | Giả định | Lý do | Kiểm chứng | Trạng thái |
|---|---|---|---|---|---|
| A2-1 | "Tăng tốc/dừng trong ≤ 0.1 s" | Vận tốc ngang đạt ngay giá trị đích trong 1 tick (0 s ≤ 0.1 s), trên đất và trên không | Test Phase 1 (AC-04/05/06) đòi đi đúng 6 m trong 60 tick | P2-10 | Phase 2 |
| A2-2 | Hướng lướt | Hướng `move` (đã xoay theo camera) của tick nhấn; `move` = 0 thì hướng quay mặt = hướng `move` khác 0 gần nhất, đầu Đêm +Z | "Hướng đang di chuyển; đứng yên thì hướng đang quay mặt" | P2-12, P2-13 | Phase 2 |
| A2-3 | Lướt và trục Y | Lướt trên không: giữ nguyên Y trong 12 tick (snapshot `vel[1]` = 0); vận tốc dọc lúc bắt đầu lướt được cất lại và trả về khi hết lướt (nên lướt khi đang bay từ bục vẫn đáp đúng đảo). Lướt trên đất: vẫn bám đất (đi ra khỏi mép thì giữ độ cao tới hết lướt rồi rơi). Nhấn nhảy khi đang lướt bị bỏ qua. Hồi chiêu 90 tick tính từ tick bắt đầu lướt | "Lướt trên không giữ nguyên độ cao"; "vận tốc phóng giữ nguyên tới khi chạm đất … vẫn được lướt" | P2-12, P2-14, P2-53 | Phase 2 (sửa ở bước 4) |
| A2-4 | Đếm bộ đếm | Đặt N tick ở tick k ⇒ hết hiệu lực ở tick k+N (giảm ở bước 2 của mỗi tick sau). Snapshot `*_s` = tick còn lại / 60 | Giữ cách đếm A1-13 | P2-14, P2-22 | Phase 2 |
| A2-5 | Đom đóm "ở mặt đất nơi đặt" | `pos.y` của đom đóm = độ cao mặt đất tại điểm đó; luật nhặt so `|chân Mây.y − pos.y| ≤ 1.5` | Đảo nhiều tầng | P2-15 | Phase 2 |
| A2-6 | Trần 30 và "điểm trống" | Trần đếm mọi đom đóm trên đất (`random` + `dropped`). Điểm sinh trống = không có đom đóm `random` nào đang chiếm điểm đó; chọn điểm trống bằng `rng` | Đơn giản, tất định | P2-16 | Phase 2 |
| A2-7 | Vị trí đom đóm rơi | Góc đầu ngẫu nhiên (`rng`), các con cách đều 360°/n, bán kính ngẫu nhiên trong [1.5, 2.5]. Điểm không có mặt đất (hoặc ở tầng cao hơn chân Mây) → thay bằng điểm đối xứng qua Mây; vẫn không được → đặt tại chân Mây; chân Mây cũng không có đất (đang trên biển mây) → con đó mất | Không để đom đóm rơi xuống biển mây | P2-24 | Phase 2 |
| A2-8 | Độ cao Bóng Mực | `pos.y` = mặt đất dưới nó + 1.0. Bóng Mực lướt theo bề mặt, **không** bị vách tầng chặn; bị tháp chuông và mép đảo (chỗ không có đất) chặn; qua Đêm 2 bằng cầu | Bóng Mực là sinh vật sương; chạm cần chênh cao ≤ 1.5 m nên vẫn công bằng | P2-23, P2-54 | Phase 2 |
| A2-9 | `wander` | Đi 2 m/s theo hướng `rng` đổi mỗi 120 tick, quay đầu khi sắp ra khỏi đảo | Ticket không nói | P2-23 | Phase 2 |
| A2-10 | Thời gian `spawning` | 60 tick: đứng yên, không gây hit, có thể bị Tỏa Sáng | Cho người chơi thấy trước | P2-30 | Hỏi GV |
| A2-11 | Bóng Mực trong scenario không có `state` | Như Phase 1: hoạt động ngay; ≤ 12 m thì `chase`, ngược lại `wander` | Contract v1.0 mục D | P2-41 | Phase 2 |
| A2-12 | Hướng `recoil` | 2 m trong 60 tick (2/60 m/tick) theo hướng Mây → Bóng Mực lúc chạm (trùng vị trí → +X); hết `recoil` → `chase`/`wander` theo khoảng cách | Đối xứng với đẩy lùi của Tỏa Sáng | P2-24 | Phase 2 |
| A2-13 | Tốc độ đẩy ra khỏi vùng an toàn | Đi thẳng ra xa đèn với tốc độ `(6 − d₀)/30` m/tick (d₀ lúc đèn vừa sáng) nên tới mép đúng tick 30; trạng thái giữ nguyên (choáng vẫn đếm) | "Tối đa 30 tick" | P2-19 | Phase 2 |
| A2-14 | Đẩy lùi của Tỏa Sáng | 4/15 m mỗi tick trong 15 tick theo hướng ngang tâm Tỏa Sáng → Bóng Mực lúc kích hoạt; "vật cản" = tháp chuông, chỗ không có đất, vùng an toàn của đèn đã sáng | Ticket nói "dừng nếu gặp vật cản" | P2-20 | Phase 2 |
| A2-15 | Lịch sinh ở Đêm 2/3 | 2 con tại tick 300 rồi mỗi 420 / 360 tick; điểm hợp lệ = cách Mây ≥ 15 m (mọi Đêm) và ngoài vùng an toàn đèn đã sáng; chọn bằng `rng` | Ticket chỉ nêu "cách ≥ 15 m" ở Đêm 1 | P2-30 | Phase 2 |
| A2-16 | Điểm xuất phát Đêm 2/3 | Đêm 2: (0,0,0) trên đảo A. Đêm 3: (0,0,−12) trên tầng 0, quay mặt +Z (vì (0,0,0) nằm trong tháp chuông/tầng 2). Hồi sinh sau khi rơi về điểm này | Ticket chỉ nêu Đêm 1 | P2-26 | Hỏi GV |
| A2-17 | Trong 60 tick chờ sau khi rơi | Mây đứng yên ở chỗ rơi (vận tốc 0), `player_hit` có `dropped: 0` và `lost` = số đom đóm mất; input di chuyển/nút bị bỏ qua | Ticket không nói | P2-26 | Phase 2 |
| A2-18 | Gió Lạc: "điểm sương" | Điểm sinh Bóng Mực của Đêm đó; chọn bằng `rng`; Gió Lạc bay ở mặt đất + 1.5 m, không bị vách chặn | Ticket không định nghĩa | P2-60 | Hỏi GV |
| A2-19 | Gió Lạc `idle` | Lượn 2 m/s theo hướng `rng` đổi mỗi 120 tick, trong đảo | "lượn chậm" | P2-61 | Phase 2 |
| A2-20 | Gió Lạc đã biến mất | Vẫn liệt kê trong `drifters` với `state:"removed"` (vị trí cuối); không tính vào giới hạn 2 con | Contract liệt kê trạng thái `removed` | P2-62 | Phase 2 |
| A2-21 | Gió Lạc cướp | Chỉ con `chase` chưa từng cướp; `amount = min(3, carried)` > 0 mới phát `drifter_steal`; không cướp khi Mây đang chờ hồi sinh; nhiều con có thể cướp trong cùng tick (theo id). Đom đóm thả lại (P2-64) đặt đúng XZ của Gió Lạc trên mặt đất ("tại chỗ"); Gió Lạc đang ở trên biển mây thì số đó mất (event vẫn ghi `amount`) | Ticket không nói | P2-62, P2-64 | Phase 2 |
| A2-34 | Gió Lạc: các trường hợp còn lại | Tỏa Sáng trúng con `idle` hoặc `flee` không mang gì: không có tác dụng. Con `flee` bay thẳng ra xa Mây, được bay ra ngoài đảo; con `idle` chỉ lượn trên đảo. Con đã bị Tỏa Sáng xua (flee không cướp) cũng biến mất sau 240 tick | Ticket chỉ nêu chase và flee có mang | P2-63, P2-64 | Phase 2 |
| A2-35 | Scenario `drifters[]`, `charms[]` | `drifters[]`: `pos` bắt buộc; `id`, `state` (idle/chase/flee/removed, mặc định idle), `stolen`, `state_ticks_left` (tick còn lại của flee). `charms[]`: `id` bắt buộc; `pos` (bỏ trống thì lấy vị trí mặc định cùng id của Đêm, không có thì mã 2), `available`, `respawn_ticks` | Contract v1.1 chỉ nêu tên mảng | P2-41 | Hỏi GV |
| A2-22 | Tỏa Sáng và Gió Lạc | Cùng luật khoảng cách 3D ≤ 5 m; không cộng điểm; `pulse.stunned_ids` chỉ chứa Bóng Mực | Điểm chỉ nêu Bóng Mực | P2-63 | Phase 2 |
| A2-23 | Kiểu trường snapshot mới | `invuln`: boolean; `vel`: [x,y,z] m/s; `ttl_s`: số giây với `dropped`, `null` với `random`; `wind.dir_deg`: hướng cơn gió hiện tại, 0 khi không có gió; `respawn_s`: 0 khi bùa đang có | Ticket chỉ nêu tên trường | P2-40 | Hỏi GV |
| A2-24 | Gió Đêm 3 | Cơn gió bắt đầu ở tick 1800k (k ≥ 1), kéo dài 300 tick; hướng = số nguyên 0–359° từ `rng`; cộng 2 m/s vào vận tốc ngang (cả trên không, cả khi bay từ bục). Báo trước 120 tick chỉ ở web | "Mỗi 30 s" | P2-56 | Phase 2 |
| A2-25 | Sự kiện `night_start` | Phát ở tick 1 của mỗi lần chạy headless (sự kiện trong bước k ghi tick k+1) | Contract v1.0 mục B | P2-84 | Phase 2 |
| A2-26 | Nút khi tạm dừng | Trong lúc dừng vẫn ghi lại trạng thái nút (giữ nút qua lúc dừng không kích hoạt khi tiếp tục). Tick nhận `pause` để tiếp tục: phát `resumed` rồi chạy tiếp các bước còn lại ngay trong tick đó | "Nếu vừa tạm dừng thì dừng bước ở đây" chỉ nói chiều dừng | P2-90, P2-91 | Phase 2 |
| A2-27 | Bục nhảy | Kích hoạt khi Mây chạm đất và XZ ≤ 1 m tới tâm bục. Lướt khi đang bay: 12 tick theo hướng lướt, xong trở lại vận tốc phóng | "Vẫn được lướt" | P2-53, P2-55 | Phase 2 |
| A2-28 | Đi lên địa hình | Bước sang chỗ có mặt đất cao hơn chân Mây > 0.3 m (vách 3 m, tháp) bị chặn theo phương ngang (trượt theo trục còn đi được); dốc liên tục nên đi được (lướt 14 m/s lên dốc 0.5 chỉ ~0.12 m/tick). Đang chạm đất mà mặt đất thấp hơn ≤ 0.3 m thì bám xuống, thấp hơn nữa thì thành rơi. Dốc: rộng 3 m quanh tia góc 30°/150°, r 24→30, Y = 3·(30 − r)/6 | "Vách đứng không đi lên được" | P2-54 | Phase 2 |
| A2-30 | Dòng `end` khi đang tạm dừng | `state: "playing"` (contract v1.0 chỉ cho playing/won/lost ở `end`); snapshot vẫn ghi `paused` | Ticket chỉ nói snapshot | P2-90 | Phase 2 |
| A2-31 | Tích phân trọng lực | Dùng vận tốc trung bình trong tick (chính xác với gia tốc hằng): nhảy đạt đỉnh 1.225 m ở tick 21, tiếp đất tick 42; rơi từ mép tới Y < −10 sau ~60 tick | Khớp công thức vật lý của số chuẩn | P2-11, P2-26 | Phase 2 |
| A2-32 | Bóng Mực khi Mây đang chờ hồi sinh | Mây "không có mặt": Bóng Mực đang `chase` chuyển `wander`, không phát hiện được Mây | "Không bị chạm" trong lúc chờ | P2-26 | Phase 2 |
| A2-33 | Bóng Mực vừa bị đẩy khỏi vùng đèn trong lúc đang bị Tỏa Sáng đẩy lùi | Hủy phần đẩy lùi còn dở; vẫn giữ choáng | Tránh hai lực đẩy chồng nhau | AC-23 | Phase 2 |
| A2-29 | Tổng điểm | Headless: điểm của Đêm đang chạy. Web: tổng điểm các Đêm đã thắng (chơi lại Đêm thua không cộng lần thua) | Ticket | P2-29, P2-82 | Phase 2 |
