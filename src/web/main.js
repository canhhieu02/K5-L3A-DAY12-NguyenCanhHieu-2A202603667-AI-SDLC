// Lớp hiển thị: chuỗi 3 Đêm, HUD, menu, âm thanh. Mọi luật game nằm trong src/core (chung với headless);
// web chỉ gửi input vào step() với bước cố định TICK_DT và vẽ lại state.
import * as THREE from 'three';
import { createGame, step, timeLeft, TICK_DT, debugWinNight, FUEL_UNIT, isWeak, capacityOf, litNeeded } from '../core/world.js';
import { TUNING, RULES } from '../core/tuning.js';
import { css, paletteFor } from './palette.js';
import { WorldView } from './scene.js';
import { createAudio } from './audio.js';
import { loadSettings, saveSettings } from './settings.js';

const NIGHTS = {
  1: { name: 'Đảo Bến', quote: 'Mây à, sương đen đã nuốt hết đèn của Đảo Bến. Gom đom đóm thắp đèn, rồi nhớ châm dầu cho chúng sáng tới khi trời rạng. Bóng Mực sợ ánh đèn, nhưng đèn cạn dầu thì chúng lại mò tới hút.' },
  2: { name: 'Đảo Cau', quote: 'Hai hòn Cau nối nhau bằng cây cầu tre. Bục đá vàng sẽ đưa cháu bay qua biển mây. Coi chừng Gió Lạc, chúng thích giật đom đóm lắm. Lá bùa đỏ giúp cháu chạy nhanh như gió.' },
  3: { name: 'Đảo Chuông', quote: 'Đảo Chuông có ba tầng và tháp chuông cổ. Gió mạnh thổi từng cơn, thấy lá bay là sắp có gió. Giữ cho năm trong bảy ngọn đèn còn sáng thì bình minh sẽ về.' },
};
const LOSE_TEXT = { no_flames: 'Ngọn Lửa của Mây đã tắt.', dawn: 'Bình minh tới nhưng không đủ đèn còn sáng.' };

// ---------- màu UI từ bảng màu chuẩn (chế độ dễ phân biệt đổi màu cảnh báo + thêm ⚠) ----------
const rootStyle = document.documentElement.style;
let view = null;
function applyPalette(colorblind) {
  const P = paletteFor(colorblind);
  for (const [k, v] of Object.entries({ '--ui-text': P.uiText, '--ui-danger': P.uiDanger, '--gold': P.gold, '--sky': P.sky, '--lantern': P.lanternLit, '--scarf': P.mayScarf })) {
    rootStyle.setProperty(k, css(v));
  }
  document.body.classList.toggle('cb', colorblind);
  view?.setColorblind(colorblind);
}

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
document.body.prepend(renderer.domElement);
view = new WorldView(renderer);
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); view.resize(); });

const settings = loadSettings();
applyPalette(settings.colorblind);
const audio = createAudio(settings.volume);
const $ = (id) => document.getElementById(id);

// ---------- trạng thái chuỗi 3 Đêm ----------
let mode = 'menu'; // menu | intro | play | result | dawn
let night = 1;
let game = null;
let wonScores = {}; // điểm các Đêm đã thắng (A2-29)
let resultTimer = 0;
let settingsFrom = null;
let testWon = false; // Đêm hiện tại thắng bằng nút chế độ thử

function show(id) {
  for (const s of document.querySelectorAll('.screen')) s.classList.toggle('hidden', s.id !== id);
  $('hud').classList.toggle('hidden', !(mode === 'play'));
  // Nút vừa bấm vẫn giữ focus: Space (nhảy) sẽ "bấm" lại nó (vd. Tiếp tục → tạm dừng lại). Bỏ focus khi vào chơi.
  if (mode === 'play' && !id) { document.activeElement?.blur?.(); keys.clear(); }
}

// Chế độ thử (bật trong Cài đặt): chọn Đêm ở menu, "Qua Đêm" trong menu tạm dừng. Chỉ ở web, không tính điểm.
function applyDevMode() {
  for (const el of document.querySelectorAll('.dev-only')) el.classList.toggle('hidden', !settings.devMode);
}

function skipNight() {
  if (night < 3) { startNight(night + 1); return; }
  mode = 'dawn';
  $('dawn-score').textContent = `Tổng điểm: ${Object.values(wonScores).reduce((a, b) => a + b, 0)} (có Đêm qua bằng chế độ thử)`;
  show('scr-dawn');
}

function startNight(n, intro = true, scenario = null) {
  night = n;
  testWon = false;
  game = createGame({ seed: (Date.now() & 0x7fffffff) >>> 0, night: n, scenario });
  view.build(game.map);
  // camera đặt sau lưng Mây theo hướng quay mặt đầu Đêm (+Z → camera ở phía −Z)
  const [fx, fz] = game.map.startFacing;
  camYaw = (Math.atan2(-fx, -fz) * 180) / Math.PI;
  resetTracking();
  if (intro) {
    mode = 'intro';
    $('intro-night').textContent = `Đêm ${n}`;
    $('intro-name').textContent = NIGHTS[n].name;
    $('intro-quote').textContent = `"${NIGHTS[n].quote}" — Ông Đăng`;
    $('intro-goal').textContent = `Giữ ít nhất ${litNeeded(game)}/${game.lanterns.length} đèn sáng tới bình minh (${Math.round(game.duration)} giây). Đèn cạn dầu sẽ tắt — bấm E ở đèn đang sáng để châm dầu.`;
    show('scr-intro');
  } else {
    mode = 'play';
    show(null);
  }
}

function finishNight() {
  mode = 'result';
  const won = game.state === 'won';
  if (won) wonScores[night] = game.score;
  const total = Object.values(wonScores).reduce((a, b) => a + b, 0);
  if (won && night === 3) {
    mode = 'dawn';
    $('dawn-score').textContent = `Tổng điểm: ${total}${testWon ? ' (có Đêm thắng bằng chế độ thử)' : ''}`;
    show('scr-dawn');
    return;
  }
  $('result-title').textContent = won ? `Đêm ${night} đã sáng!` : 'Ánh sáng đã tắt…';
  $('result-text').textContent = won
    ? `${NIGHTS[night].name}: ${game.score} điểm · Tổng: ${total}${testWon ? ' (thắng bằng chế độ thử)' : ''}`
    : `${LOSE_TEXT[lastReason] || ''} Hãy thử lại ${NIGHTS[night].name}.`;
  const btns = $('result-buttons');
  btns.innerHTML = '';
  const add = (label, act) => { const b = document.createElement('button'); b.textContent = label; b.dataset.act = act; btns.append(b); };
  if (won) add(`Đêm ${night + 1}: ${NIGHTS[night + 1].name}`, 'next');
  else add(`Chơi lại Đêm ${night}`, 'retry');
  add('Về menu', 'menu');
  show('scr-result');
}

// ---------- nút trên các màn hình ----------
document.addEventListener('click', (e) => {
  const btn = e.target.closest?.('button');
  const act = btn?.dataset.act;
  if (!act) return;
  audio.ensure();
  audio.play('click');
  switch (act) {
    case 'start': wonScores = {}; audio.startMusic(); startNight(1); break;
    case 'play': mode = 'play'; audio.startMusic(); show(null); break;
    case 'next': startNight(night + 1); break;
    case 'retry': startNight(night); break;
    case 'resume': pauseQueued = true; break;
    case 'restart': startNight(night, false); break;
    case 'skip': skipNight(); break;
    case 'win': // thắp hết đèn + tua tới bình minh rồi tiếp tục: tick kế tiếp core xét thắng như thường
      if (settings.devMode && game) { debugWinNight(game); testWon = true; pauseQueued = true; }
      break;
    case 'goto': wonScores = {}; audio.startMusic(); startNight(Number(btn.dataset.night)); break;
    case 'menu': mode = 'menu'; game = null; audio.stopMusic(); show('scr-menu'); break;
    case 'settings': settingsFrom = document.querySelector('.screen:not(.hidden)')?.id; openSettings(); break;
    case 'settings-back': show(settingsFrom); settingsFrom = null; break;
  }
});

function openSettings() {
  $('set-volume').value = settings.volume;
  $('set-sens').value = settings.sensitivity;
  $('set-fps').checked = settings.showFps;
  $('set-dev').checked = settings.devMode;
  $('set-cb').checked = settings.colorblind;
  for (const s of document.querySelectorAll('.screen')) s.classList.toggle('hidden', s.id !== 'scr-settings');
}
$('set-volume').addEventListener('input', (e) => { settings.volume = Number(e.target.value); audio.setVolume(settings.volume); saveSettings(settings); });
$('set-sens').addEventListener('input', (e) => { settings.sensitivity = Number(e.target.value); saveSettings(settings); });
$('set-fps').addEventListener('change', (e) => { settings.showFps = e.target.checked; saveSettings(settings); });
$('set-dev').addEventListener('change', (e) => { settings.devMode = e.target.checked; saveSettings(settings); applyDevMode(); });
$('set-cb').addEventListener('change', (e) => { settings.colorblind = e.target.checked; saveSettings(settings); applyPalette(settings.colorblind); });

// ---------- input ----------
const keys = new Set();
let camYaw = 180; // độ; 0 = camera ở phía +Z nhìn về −Z, 180 = ở phía −Z nhìn về +Z
let pauseQueued = false;
// Mã phím ổn định: dùng e.code; nếu bộ gõ (IME/Unikey) làm e.code rỗng hoặc lạ thì suy từ e.key.
function keyCode(e) {
  if (/^(Key[A-Z]|Arrow|Shift|Space|Escape|Enter)/.test(e.code)) return e.code;
  const k = (e.key || '').toLowerCase();
  if (/^[a-z]$/.test(k)) return `Key${k.toUpperCase()}`;
  if (k === ' ') return 'Space';
  return e.code || e.key;
}
addEventListener('keydown', (e) => {
  const code = keyCode(e);
  // Khi đang chơi: không để Space/Enter/phím mũi tên kích hoạt nút đang focus hoặc cuộn trang
  if (mode === 'play' && ['Space', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(code)) e.preventDefault();
  if ((code === 'Escape' || code === 'KeyP') && mode === 'play' && !settingsFrom && !e.repeat) pauseQueued = true;
  keys.add(code);
}, { capture: true });
addEventListener('keyup', (e) => { keys.delete(keyCode(e)); if (e.key === 'Shift') { keys.delete('ShiftLeft'); keys.delete('ShiftRight'); } }, { capture: true });
addEventListener('blur', () => { keys.clear(); if (mode === 'play' && game?.state === 'playing') pauseQueued = true; });
document.addEventListener('visibilitychange', () => { if (document.hidden) keys.clear(); });
let dragging = false;
renderer.domElement.addEventListener('mousedown', () => { dragging = true; });
addEventListener('mouseup', () => { dragging = false; });
addEventListener('mousemove', (e) => { if (dragging && mode === 'play') camYaw -= e.movementX * 0.3 * settings.sensitivity; });

function readInput() {
  const k = (...c) => c.some((x) => keys.has(x));
  if (k('ArrowLeft')) camYaw += 2 * settings.sensitivity;
  if (k('ArrowRight')) camYaw -= 2 * settings.sensitivity;
  // Contract: move [x, z], z dương = +Z khi yaw 0. Camera ở phía +Z nên W (đi ra xa camera) = z âm.
  const x = (k('KeyD') ? 1 : 0) - (k('KeyA') ? 1 : 0);
  const z = (k('KeyS') ? 1 : 0) - (k('KeyW') ? 1 : 0);
  const pause = pauseQueued;
  pauseQueued = false;
  return {
    move: [x, z], cam_yaw_deg: camYaw,
    jump: k('Space'), interact: k('KeyE'), pulse: k('KeyF', 'KeyJ'), dash: k('ShiftLeft', 'ShiftRight'),
    pause,
  };
}

// ---------- âm thanh theo sự kiện ----------
let lastReason = null;
let lastCountdown = null;
let prevGrounded = true;
let windWarned = false;
function resetTracking() { lastReason = null; lastCountdown = null; prevGrounded = true; windWarned = false; resultTimer = 0; fpsAcc = { frames: 0, time: 0, total: 0, totalTime: 0 }; }
const SOUND = { mote_picked: 'pick', charm_picked: 'charm', deposit: 'deposit', lantern_lit: 'lit', pulse: 'pulse', dash: 'dash',
  drifter_steal: 'steal', drifter_drop: 'pick', shade_spawned: 'shade', refuel: 'refuel', lantern_out: 'out', fuel_drain: 'drain' };
function onEvents(events) {
  for (const e of events) {
    if (SOUND[e.name]) audio.play(SOUND[e.name]);
    if (e.name === 'player_hit') audio.play(e.data.by === 'fall' ? 'fall' : 'hit');
    if (e.name === 'pulse') view.pulseAnim = 1;
    if (e.name === 'game_over') { lastReason = e.data.reason; audio.play(e.data.result === 'won' ? 'win' : 'lose'); }
  }
  const p = game.player;
  if (prevGrounded && !p.grounded && p.vel[1] > 0) audio.play('jump');
  prevGrounded = p.grounded;
  const tl = timeLeft(game);
  if (tl <= 10 && game.state === 'playing') {
    const s = Math.ceil(tl);
    if (s !== lastCountdown) { lastCountdown = s; audio.play('tick'); }
  }
}

// ---------- HUD ----------
const hud = {
  flames: $('hud-flames'), timer: $('hud-timer'), lanterns: $('hud-lanterns'), score: $('hud-score'), night: $('hud-night'),
  bar: $('hud-bar'), prompt: $('hud-prompt'), wind: $('hud-wind'), arrow: $('hud-arrow'), fps: $('hud-fps'),
  cdDash: $('cd-dash'), cdPulse: $('cd-pulse'), carry: $('hud-carry'), warn: $('hud-warn'),
};
const setText = (el, t) => { if (el.textContent !== t) el.textContent = t; };
const v3 = new THREE.Vector3();

function updateHud(lit) {
  const p = game.player;
  const flames = Array.from({ length: TUNING.flames }, (_, i) => `<span class="${i < p.flames ? '' : 'off'}">🔥</span>`).join('');
  if (hud.flames.innerHTML !== flames) hud.flames.innerHTML = flames;
  const tl = Math.max(0, Math.ceil(timeLeft(game) - 1e-9));
  setText(hud.timer, `${String(Math.floor(tl / 60)).padStart(2, '0')}:${String(tl % 60).padStart(2, '0')}`);
  hud.timer.classList.toggle('danger', tl <= 30);
  setText(hud.night, `Đêm ${night} · ${NIGHTS[night].name}`);
  const need = litNeeded(game);
  setText(hud.lanterns, `Đèn ${lit}/${game.lanterns.length} · cần ${need}`);
  hud.lanterns.classList.toggle('danger', lit < need);
  setText(hud.score, `Điểm ${game.score}`);
  // thanh đom đóm: số ô = sức chứa hiện tại (10 + 2 × lần thắp, tối đa 20)
  const cap = capacityOf(game);
  while (hud.bar.children.length < cap) hud.bar.append(document.createElement('span'));
  while (hud.bar.children.length > cap) hud.bar.lastChild.remove();
  [...hud.bar.children].forEach((s, i) => s.classList.toggle('on', i < p.carried));
  setText(hud.carry, `${p.carried}/${cap}`);
  // cảnh báo đèn sắp cạn dầu (fuel < 30)
  const weak = game.lanterns.filter((L) => isWeak(game, L)).map((L) => L.id);
  hud.warn.classList.toggle('hidden', weak.length === 0);
  if (weak.length) setText(hud.warn, `Đèn ${weak.join(', ')} sắp cạn dầu!`);
  const charm = p.charmTicks > 0;
  hud.cdDash.querySelector('.shade').style.height = `${charm ? 0 : (p.dashCdTicks / (TUNING.dash_cooldown_s * 60)) * 100}%`;
  hud.cdDash.classList.toggle('charm', charm);
  hud.cdPulse.querySelector('.shade').style.height = `${(p.pulseCdTicks / (TUNING.pulse_cooldown_s * 60)) * 100}%`;
  hud.cdPulse.style.opacity = p.carried >= TUNING.pulse_cost ? 1 : 0.5;

  // Nhắc E: đèn nhận được gần nhất trong 2 m (như core chọn: chưa sáng hoặc chưa đầy dầu; bằng nhau id nhỏ)
  const fuelOf = (L) => L.fuelU / FUEL_UNIT;
  const dist = (L) => Math.hypot(L.pos[0] - p.pos[0], L.pos[2] - p.pos[2]);
  const byId = [...game.lanterns].sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
  let target = null;
  for (const L of byId) {
    if ((L.lit && fuelOf(L) >= TUNING.fuel_max) || dist(L) > TUNING.interact_radius + 1e-9) continue;
    if (!target || dist(L) < dist(target) - 1e-9) target = L;
  }
  hud.prompt.classList.toggle('hidden', !target);
  if (target) {
    const cost = target.everLit ? TUNING.relight_cost : TUNING.lantern_cost;
    hud.prompt.innerHTML = target.lit
      ? `<kbd>E</kbd> — Châm dầu (${Math.floor(fuelOf(target))}/${TUNING.fuel_max})`
      : `<kbd>E</kbd> — ${target.everLit ? 'Thắp lại' : 'Nạp ánh sáng'} (${target.deposited}/${cost})`;
  }
  // Mũi tên: đèn cần chú ý gần nhất (đèn tắt hoặc sắp cạn dầu) khi nó ở ngoài màn hình
  let best = null;
  let bd = Infinity;
  for (const L of game.lanterns) {
    if (L.lit && !isWeak(game, L)) continue;
    const d = dist(L);
    if (d < bd) { bd = d; best = L; }
  }
  let arrow = false;
  if (best) {
    v3.set(best.pos[0], best.pos[1] + 2.9, best.pos[2]).project(view.camera);
    const behind = v3.z > 1;
    let x = v3.x;
    let y = v3.y;
    if (behind) { x = -x; y = -y; }
    if (behind || Math.abs(x) > 0.95 || Math.abs(y) > 0.95) {
      arrow = true;
      const ang = Math.atan2(y, x);
      const m = 0.85 / Math.max(Math.abs(Math.cos(ang)), Math.abs(Math.sin(ang)));
      const sx = (Math.cos(ang) * m * 0.5 + 0.5) * innerWidth;
      const sy = Math.min(innerHeight - 110, Math.max(110, (-Math.sin(ang) * m * 0.5 + 0.5) * innerHeight)); // tránh HUD trên/dưới
      hud.arrow.style.left = `${sx - 14}px`;
      hud.arrow.style.top = `${sy - 15}px`;
      hud.arrow.style.transform = `rotate(${90 - (ang * 180) / Math.PI}deg)`;
    }
  }
  hud.arrow.classList.toggle('hidden', !arrow);
}

// Gió: báo trước 2 s (lá bay + âm thanh) trước mỗi cơn ở tick 1800k
function windWarning() {
  if (!game.windEnabled || game.wind.active) { windWarned = false; return false; }
  const warn = game.simTick % RULES.wind_period_ticks >= RULES.wind_period_ticks - 120;
  if (warn && !windWarned) { windWarned = true; audio.play('wind'); }
  return warn;
}

// ---------- vòng lặp: logic bước cố định TICK_DT, vẽ theo khung hình ----------
let acc = 0;
let last = performance.now();
let fpsAcc = { frames: 0, time: 0, total: 0, totalTime: 0 };
window.__ddl = { fps: () => (fpsAcc.totalTime > 0 ? fpsAcc.total / fpsAcc.totalTime : 0) }; // đo FPS trung bình cho evidence

function frame(now) {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  if (mode === 'play' && game) {
    acc += dt;
    while (acc >= TICK_DT) {
      const before = game.state;
      const events = step(game, readInput());
      onEvents(events);
      acc -= TICK_DT;
      if (before !== game.state && (game.state === 'won' || game.state === 'lost')) resultTimer = 1.5;
    }
    const paused = game.state === 'paused';
    if (!settingsFrom) $('scr-pause').classList.toggle('hidden', !paused);
    if (resultTimer > 0 && (resultTimer -= dt) <= 0) finishNight();
  } else acc = 0;

  if (game) {
    const lit = view.render(game, { camYaw, time: now / 1000, windWarn: mode === 'play' && windWarning() });
    if (mode === 'play') updateHud(lit);
  } else {
    view.camera.position.set(Math.sin(now / 8000) * 60, 30, Math.cos(now / 8000) * 60);
    view.camera.lookAt(0, 0, 0);
    renderer.render(view.scene, view.camera);
  }

  fpsAcc.frames++;
  fpsAcc.time += dt;
  if (mode === 'play') { fpsAcc.total++; fpsAcc.totalTime += dt; }
  if (fpsAcc.time >= 0.5) {
    hud.fps.textContent = settings.showFps ? `FPS ${Math.round(fpsAcc.frames / fpsAcc.time)} · TB ${window.__ddl.fps().toFixed(1)} · ${innerWidth}×${innerHeight}` : '';
    fpsAcc.frames = 0;
    fpsAcc.time = 0;
  }
  requestAnimationFrame(frame);
}

view.build(createGame({ seed: 1, night: 1 }).map); // cảnh nền cho menu
applyDevMode();
show('scr-menu');
// ?night=N: vào thẳng Đêm N (dùng khi quay/chụp bằng chứng)
const query = new URLSearchParams(location.search);
const qNight = Number(query.get('night'));
// ?demo=fuel (chỉ web, để chụp bằng chứng TICKET-03): đèn đầy / đèn yếu bị Bóng Mực hút / đèn đã tắt
const DEMO = {
  fuel: {
    random_shades: false, random_drifters: false, wind_enabled: false,
    player: { pos: [0, 0, 11], carried: 6, successful_lights: 2 },
    lanterns: [{ id: 'L1', pos: [0, 0, 20], lit: true, fuel: 80 }, { id: 'L2', pos: [-6, 0, 18], lit: true, fuel: 22 },
      { id: 'L5', pos: [6, 0, 18], ever_lit: true }],
    shades: [{ id: 'S1', pos: [-7.2, 1, 17], state: 'drain', target_lantern_id: 'L2' }],
  },
};
if ([1, 2, 3].includes(qNight)) startNight(qNight, false, DEMO[query.get('demo')] ?? null);
if (query.get('cb') === '1') applyPalette(true); // xem nhanh bảng màu dễ phân biệt (không lưu)
requestAnimationFrame(frame);
