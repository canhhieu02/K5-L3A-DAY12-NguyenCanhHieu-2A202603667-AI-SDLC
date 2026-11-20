---
name: headless-scenario
description: Viết và chạy scenario/inputs headless theo Test Contract v1.2 của Đảo Đèn Lồng, kèm file kỳ vọng ghi trước, rồi đọc output JSONL. Dùng khi cần tái hiện một tình huống, chứng minh một tính năng, hoặc điều tra hành vi lạ.
---

# Scenario headless (contract v1.2)

## Cấu trúc
Đặt trong `scenarios/phase3/<tên>.{scenario,inputs,expect}.json`. `node scripts/evidence.mjs scenarios` tự chạy mọi `*.expect.json` và ghi ĐẠT/KHÔNG ĐẠT vào `evidence/phase-3/scenarios.txt` (`PHASE=2` cho thư mục Phase 2; `EVIDENCE_OUT=<thư mục tạm>` để thử mà không ghi đè bằng chứng).

**Ghi `expect.json` trước khi chạy**, tính bằng tay từ số chuẩn. Nếu lệch: tìm nguyên nhân (core sai hay kỳ vọng sai) rồi mới sửa — không chép output thật vào kỳ vọng.

```json
// <tên>.expect.json
{ "night": 2, "ticks": 200, "about": "mô tả + phép tính kỳ vọng",
  "events": [ { "tick": 76, "name": "drifter_steal", "data": { "drifter_id": "D1", "amount": 3, "carried": 5 } } ],
  "no_events": ["player_hit"],
  "checks": [ { "tick": 76, "path": "drifters.0.state", "equals": "flee" },
              { "tick": 84, "path": "player.pos", "near": [51.613, 0, 6.619], "tol": 0.01 } ] }
```

## Scenario (mục D v1.0 + v1.1 + v1.2)
- `player`: `pos`, `carried`, `flames`, `invuln_ticks`, `dash_cd_ticks`, `pulse_cd_ticks`, `charm_ticks`, `successful_lights` (v1.2, sức chứa = min(20, 10 + 2n)).
- Cờ: `random_motes`, `random_shades`, `random_drifters`, `wind_enabled` (mặc định theo Đêm).
- `motes: [[x,y,z]]`, `shades: [{id?, pos, state?, state_ticks_left?, target_lantern_id?}]` (`state: "drain"` + `target_lantern_id`, A3-8), `drifters: [{id?, pos, state?, stolen?, state_ticks_left?}]`, `charms: [{id, pos?, available?, respawn_ticks?}]` — mảng có mặt thì **thay** danh sách mặc định.
- `lanterns: [{id, pos?, deposited?, lit?, fuel?, ever_lit?, relit_count?}]` cập nhật theo id của Đêm (L1…L5/L6/L7); `lit: true` không `fuel` → 100; `ever_lit` mặc định = `lit` (A3-7). `time_left_s` (thắng/thua chỉ xét khi hết giờ — dùng `time_left_s: 1` để thử bình minh ở tick 60).
- Bắt đầu "yên tĩnh": `random_*: false`, `wind_enabled: false`, `motes/shades/drifters/charms: []`.

## Inputs
`{ "frames": [ { "tick": 0, "move": [x, z], "cam_yaw_deg": 0, "jump|interact|pulse|dash|pause": bool } ] }` — tick tăng nghiêm ngặt, trường vắng giữ giá trị cũ, nút kích hoạt khi false → true (muốn nhấn lại phải có frame `false` ở giữa).

## Chạy và đọc
```bash
node src/headless/cli.js --seed 1 --night 2 --ticks 200 --snapshot-every 1 \
  --scenario scenarios/phase3/x.scenario.json --inputs scenarios/phase3/x.inputs.json --out o.jsonl
node scripts/evidence.mjs scenarios
```
- Input tick k → event tick k+1. Snapshot tick 0 = sau dựng scenario. `end` là dòng cuối; tạm dừng thì `end.state` = `playing`.
- Tọa độ làm tròn 3 chữ số; khi so sánh biên (Y < −10, mép đất) nhớ giá trị đã làm tròn.
- Số nhanh (v1.2): dầu −1/60 mỗi tick (−6/60 khi 1 Bóng Mực hút); Bóng Mực wander 2 m/s = 1/30 m/tick; drain khi ≤ 2 m; `fuel_drain` ở tick hút thứ 60, 120…
- Số nhanh: chạy 6 m/s = 0.1 m/tick; Bóng Mực 4 m/s = 1/15 m/tick; Gió Lạc 7 m/s; lướt 14 m/s × 12 tick = 2.8 m; nhảy đáp ở tick 42; rơi tới Y < −10 sau 61 tick trên không; bục Đêm 2 đáp sau 84 tick.
