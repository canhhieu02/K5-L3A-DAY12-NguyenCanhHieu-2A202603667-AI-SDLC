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

// Số chuẩn TICKET-02 không nằm trong `tuning` của contract (đơn vị tick khi tên có _ticks).
export const RULES = {
  jump_velocity: 7, // m/s
  gravity: 20, // m/s^2
  pickup_height: 1.5, // chênh cao chân Mây – mặt đất đặt đom đóm/bùa
  mote_initial: 20,
  mote_cap: 30,
  mote_spawn_ticks: 240,
  drop_ttl_ticks: 480,
  drop_ring: [1.5, 2.5],
  pulse_center_h: 0.8,
  pulse_knock_ticks: 15,
  safe_push_ticks: 30,
  shade_detect: 12,
  shade_lose: 18,
  shade_hit_height: 1.5,
  shade_recoil_m: 2,
  shade_recoil_ticks: 60,
  shade_first_spawn_tick: 300,
  shade_first_count: 2,
  shade_spawn_min_dist: 15,
  fall_y: -10,
  respawn_wait_ticks: 60,
  charm_speed: 7.2,
  wind_speed: 2,
  wind_period_ticks: 1800,
  wind_duration_ticks: 300,
  // Gió Lạc
  drifter_speed: 7,
  drifter_idle_speed: 2,
  drifter_max: 2,
  drifter_spawn_ticks: 1200,
  drifter_detect: 15,
  drifter_min_carry: 5,
  drifter_steal_radius: 1.2,
  drifter_steal_max: 3,
  drifter_flee_ticks: 240,
  drifter_vanish_ticks: 120,
  drifter_hover: 1.5, // A2-18
  // Bùa Gió
  charm_ticks: 600,
  charm_respawn_ticks: 2700,
  // Giả định (docs/assumptions.md)
  shade_spawning_ticks: 60, // A2-10
  shade_hover: 1.0, // A2-8: tâm Bóng Mực cao hơn mặt đất 1 m
  shade_wander_speed: 2, // A2-9
  wander_turn_ticks: 120, // A2-9
  step_up: 0.3, // A2-28: dốc 0.5 → lướt 14 m/s lên ~0.12 m/tick; vách cao 3 m
};
