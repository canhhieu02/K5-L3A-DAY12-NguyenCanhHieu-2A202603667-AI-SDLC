// Nguồn sự thật duy nhất cho các con số gameplay.
// game.contract.json PHẢI khớp object này (có test kiểm tra: tests/contract.test.js).
// Giá trị = số chuẩn TICKET-02 Phần 1 (docs/phases/ticket-02.md), contract v1.1.
export const TUNING = {
  player_speed: 6,
  carry_capacity: 10,
  lantern_cost: 10,
  lantern_count_night1: 5,
  pickup_radius: 1.0,
  interact_radius: 2.0,
  pulse_cost: 3,
  pulse_radius: 5,
  night1_duration_s: 300,
  flames: 3,
  invuln_s: 1.5,
  hit_drop_ratio: 0.5,
  pulse_stun_s: 2,
  pulse_push_m: 4,
  pulse_cooldown_s: 3,
  safe_radius: 6,
  shade_speed: 4,
  shade_hit_radius: 1.0,
  fall_enabled: true,
  dash_speed: 14,
  dash_duration_s: 0.2,
  dash_cooldown_s: 1.5,
  night2_duration_s: 330,
  night3_duration_s: 360,
  score: { per_mote: 10, per_lantern: 100, per_stun: 5, per_second_left: 2, per_flame_left: 50 },
};

// Hằng số thế giới không có trong contract (giả định, xem docs/assumptions.md).
export const WORLD = {
  island_radius: 40, // người chơi bị chặn ở mép đảo, không rơi
  lantern_ring_radius: 20, // 5 đèn mặc định trên vòng tròn bán kính 20 m
  jump_velocity: 7, // m/s
  gravity: 20, // m/s^2
  initial_motes: 25,
  mote_min_active: 15, // nếu random_motes: cứ 5 s bổ sung 1 con khi còn < 15
  mote_respawn_ticks: 300,
  initial_shades: 2,
  shade_max: 6, // nếu random_shades: cứ 30 s sinh thêm 1 con, tối đa 6
  shade_spawn_ticks: 1800,
  shade_spawn_y: 1.0,
};
