// Lớp hiển thị: chuỗi 3 Đêm, HUD, menu, âm thanh. Mọi luật game nằm trong src/core (chung với headless);
// web chỉ gửi input vào step() với bước cố định TICK_DT và vẽ lại state.
import * as THREE from 'three';
import { createGame, createBenchGame, step, timeLeft, TICK_DT, debugWinNight, FUEL_UNIT, isWeak, capacityOf, litNeeded } from '../core/world.js';
import { benchCamera, BENCH_CAMERA } from '../shared/bench-stats.js';
import { TUNING, RULES } from '../core/tuning.js';
import { css, paletteFor } from './palette.js';
import { WorldView } from './scene.js';
import { createAudio } from './audio.js';
import { loadSettings, saveSettings } from './settings.js';
import { ACTIONS, DEFAULT_KEYS, keyLabel, normalizeCode, rebind, findConflicts } from './keybinds.js';
import { loadBoard, saveEntry } from './board-store.js';
import { isoWithOffset, nameError } from '../shared/leaderboard.js';

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

// ---------- dễ tiếp cận (TICKET-04 mục 4): chữ lớn, giảm chuyển động, nhãn phím theo cài đặt ----------
const K = (action) => keyLabel(settings.keys[action]);
function applyA11y() {
  document.body.classList.toggle('large', settings.largeText);
  document.body.classList.toggle('rm', settings.reducedMotion);
  $('cd-dash-key').textContent = K('dash');
  $('cd-pulse-key').textContent = K('pulse');
  const k = (a) => `<kbd>${K(a)}</kbd>`;
  $('menu-keys').innerHTML = `${k('up')}${k('left')}${k('down')}${k('right')} đi · <kbd>Chuột kéo</kbd> / ${k('camLeft')}${k('camRight')} xoay camera · ` +
    `${k('jump')} nhảy · ${k('dash')} lướt<br />${k('interact')} thắp đèn / châm dầu · ${k('pulse')} Tỏa Sáng (3 đom đóm) · <kbd>Esc</kbd> / ${k('pause')} tạm dừng`;
}
applyA11y();

// ---------- trạng thái chuỗi 3 Đêm ----------
let mode = 'menu'; // menu | intro | play | result | dawn | bench
let night = 1;
let game = null;
let wonScores = {}; // điểm các Đêm đã thắng (A2-29)
let resultTimer = 0;
let settingsFrom = null;
let testWon = false; // Đêm hiện tại thắng bằng nút chế độ thử
let runSeed = 0; // seed Đêm 1 của lượt chơi, ghi vào bảng xếp hạng (A4-9)
let runCheated = false; // lượt có dùng chế độ thử (thắng/qua Đêm) → không lưu bảng xếp hạng
let runSaved = false;

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
  runCheated = true;
  if (night < 3) { startNight(night + 1); return; }
  mode = 'dawn';
  $('dawn-score').textContent = `Tổng điểm: ${Object.values(wonScores).reduce((a, b) => a + b, 0)} (có Đêm qua bằng chế độ thử)`;
  show('scr-dawn');
  offerSave('scr-dawn');
}

function newRun() { wonScores = {}; runCheated = false; runSaved = false; runSeed = 0; }

function startNight(n, intro = true, scenario = null) {
  night = n;
  testWon = false;
  const seed = (Date.now() & 0x7fffffff) >>> 0;
  if (!runSeed) runSeed = seed;
  game = createGame({ seed, night: n, scenario });
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
    offerSave('scr-dawn');
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
  if (won) $('save-form').classList.add('hidden');
  else offerSave('scr-result'); // thua ở bất kỳ Đêm nào: cho lưu điểm
}

// ---------- bảng xếp hạng (TICKET-04 mục 3) ----------
function offerSave(screenId) {
  const form = $('save-form');
  document.querySelector(`#${screenId} .save-slot`).append(form);
  const score = Object.values(wonScores).reduce((a, b) => a + b, 0);
  const nightsWon = Object.keys(wonScores).length;
  form.dataset.score = score;
  form.dataset.nights = nightsWon;
  $('save-summary').textContent = `Lưu vào Bảng xếp hạng: ${score} điểm · ${nightsWon}/3 Đêm thắng`;
  $('save-err').textContent = runCheated ? 'Lượt này dùng chế độ thử nên không được lưu điểm.' : runSaved ? 'Đã lưu điểm của lượt này.' : '';
  $('save-btn').disabled = runCheated || runSaved;
  $('save-name').disabled = runCheated || runSaved;
  form.classList.remove('hidden');
  if (!runCheated && !runSaved) setTimeout(() => $('save-name').focus(), 50);
}
$('save-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = $('save-form');
  const name = $('save-name').value.normalize('NFC').trim();
  const err = nameError(name);
  if (err) { $('save-err').textContent = err; return; }
  const entry = { name, score: Number(form.dataset.score), nights_won: Number(form.dataset.nights), achieved_at: isoWithOffset(), seed: runSeed };
  try {
    $('save-btn').disabled = true;
    const res = await saveEntry(entry);
    runSaved = true;
    audio.play('lit');
    showBoard(res.entries, res.rank, res.where);
  } catch (ex) {
    $('save-err').textContent = ex.message;
    $('save-btn').disabled = false;
  }
});
function renderBoard(entries, rank, where) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const date = (iso) => iso.replace('T', ' ').replace(/:\d{2}(\.\d+)?(?=(Z|[+-]\d{2}:\d{2})$)/, ' ');
  $('board').innerHTML = '<tr><th>#</th><th>Tên</th><th>Điểm</th><th>Đêm thắng</th><th>Thời điểm</th><th>Seed</th></tr>' +
    (entries.length ? entries.map((e, i) => `<tr class="${i === rank ? 'me' : ''}"><td>${i + 1}</td><td>${esc(e.name)}</td><td>${e.score}</td>` +
      `<td>${e.nights_won}/3</td><td>${esc(date(e.achieved_at))}</td><td>${e.seed}</td></tr>`).join('')
      : '<tr><td colspan="6">Chưa có ai — hãy là người đầu tiên!</td></tr>');
  $('board-where').textContent = (rank === -1 ? 'Điểm vừa rồi chưa lọt top 10. ' : '') +
    (where === 'disk' ? 'Lưu trên đĩa: save/leaderboard.json (xuất: node server.mjs --export-leaderboard out.json).'
      : 'Đang mở bản web tĩnh: lưu trong trình duyệt này. Chạy `node server.mjs` để lưu ra đĩa.');
}
async function showBoard(entries, rank = null, where = null) {
  mode = 'board';
  if (!entries) ({ entries, where } = await loadBoard());
  renderBoard(entries, rank, where);
  show('scr-board');
}

// ---------- nút trên các màn hình ----------
document.addEventListener('click', (e) => {
  const btn = e.target.closest?.('button');
  const act = btn?.dataset.act;
  if (!act) return;
  audio.ensure();
  audio.play('click');
  switch (act) {
    case 'start': newRun(); audio.startMusic(); startNight(1); break;
    case 'board': showBoard(); break;
    case 'board-back': mode = 'menu'; game = null; audio.stopMusic(); show('scr-menu'); break;
    case 'keys-reset': settings.keys = { ...DEFAULT_KEYS }; listening = null; saveSettings(settings); renderKeybinds(); applyA11y(); break;
    case 'play': mode = 'play'; audio.startMusic(); show(null); break;
    case 'next': startNight(night + 1); break;
    case 'retry': startNight(night); break;
    case 'resume': pauseQueued = true; break;
    case 'restart': startNight(night, false); break;
    case 'skip': skipNight(); break;
    case 'win': // thắp hết đèn + tua tới bình minh rồi tiếp tục: tick kế tiếp core xét thắng như thường
      if (settings.devMode && game) { debugWinNight(game); testWon = true; runCheated = true; pauseQueued = true; }
      break;
    case 'goto': newRun(); runCheated = true; audio.startMusic(); startNight(Number(btn.dataset.night)); break;
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
  $('set-captions').checked = settings.captions;
  $('set-rm').checked = settings.reducedMotion;
  $('set-large').checked = settings.largeText;
  listening = null;
  renderKeybinds();
  for (const s of document.querySelectorAll('.screen')) s.classList.toggle('hidden', s.id !== 'scr-settings');
}
$('set-captions').addEventListener('change', (e) => { settings.captions = e.target.checked; saveSettings(settings); });
$('set-rm').addEventListener('change', (e) => { settings.reducedMotion = e.target.checked; saveSettings(settings); applyA11y(); });
$('set-large').addEventListener('change', (e) => { settings.largeText = e.target.checked; saveSettings(settings); applyA11y(); });

// ---------- đổi phím: bấm ô phím → nhấn phím mới; trùng phím được báo, Esc hủy ----------
let listening = null; // hành động đang chờ phím mới
function renderKeybinds(msg = '') {
  const conflicts = findConflicts(settings.keys);
  const bad = new Set(conflicts.flatMap((c) => c.actions));
  $('keybinds').innerHTML = ACTIONS.map(([a, label]) =>
    `<tr class="${bad.has(a) ? 'conflict' : ''}${listening === a ? ' listening' : ''}"><td>${label}</td>` +
    `<td><button type="button" data-rebind="${a}">${listening === a ? 'Nhấn phím…' : K(a)}</button></td></tr>`).join('');
  const names = Object.fromEntries(ACTIONS);
  $('keys-err').textContent = msg || conflicts.map((c) => `Phím ${keyLabel(c.code)} đang trùng: ${c.actions.map((a) => names[a]).join(' + ')}`).join(' · ');
}
$('keybinds').addEventListener('click', (e) => {
  const a = e.target.closest('button')?.dataset.rebind;
  if (!a) return;
  listening = listening === a ? null : a;
  renderKeybinds();
});
function captureRebind(e) {
  e.preventDefault();
  e.stopPropagation();
  const action = listening;
  listening = null;
  if (e.code === 'Escape') { renderKeybinds(); return; }
  const r = rebind(settings.keys, action, keyCode(e));
  if (!r.error) { settings.keys = r.keys; saveSettings(settings); applyA11y(); }
  renderKeybinds(r.error || '');
  if (!r.error && r.conflicts.length) audio.play('hit'); // báo trùng phím bằng cả âm thanh
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
  if (/^(Key[A-Z]|Arrow|Shift|Control|Alt|Space|Escape|Enter|Digit|Numpad|Tab|Backspace|Caps)/.test(e.code)) return normalizeCode(e.code);
  const k = (e.key || '').toLowerCase();
  if (/^[a-z]$/.test(k)) return `Key${k.toUpperCase()}`;
  if (/^[0-9]$/.test(k)) return `Digit${k}`;
  if (k === ' ') return 'Space';
  return normalizeCode(e.code || e.key);
}
addEventListener('keydown', (e) => {
  if (listening) { captureRebind(e); return; }
  if (e.target?.tagName === 'INPUT' && e.target.type === 'text') return; // đang gõ tên
  const code = keyCode(e);
  const bound = new Set(Object.values(settings.keys));
  // Khi đang chơi: không để phím đã gán (Space/Enter/mũi tên…) kích hoạt nút đang focus hoặc cuộn trang
  if (mode === 'play' && (bound.has(code) || ['Space', 'Enter', 'ArrowUp', 'ArrowDown'].includes(code))) e.preventDefault();
  if ((code === 'Escape' || code === settings.keys.pause) && mode === 'play' && !settingsFrom && !e.repeat) pauseQueued = true;
  keys.add(code);
}, { capture: true });
addEventListener('keyup', (e) => { keys.delete(keyCode(e)); }, { capture: true });
addEventListener('blur', () => { keys.clear(); if (mode === 'play' && game?.state === 'playing') pauseQueued = true; });
document.addEventListener('visibilitychange', () => { if (document.hidden) keys.clear(); });
let dragging = false;
renderer.domElement.addEventListener('mousedown', () => { dragging = true; });
addEventListener('mouseup', () => { dragging = false; });
addEventListener('mousemove', (e) => { if (dragging && mode === 'play') camYaw -= e.movementX * 0.3 * settings.sensitivity; });

function readInput() {
  const k = (action) => keys.has(settings.keys[action]); // phím theo cài đặt (đổi được)
  if (k('camLeft')) camYaw += 2 * settings.sensitivity;
  if (k('camRight')) camYaw -= 2 * settings.sensitivity;
  // Contract: move [x, z], z dương = +Z khi yaw 0. Camera ở phía +Z nên "đi tới" (ra xa camera) = z âm.
  const x = (k('right') ? 1 : 0) - (k('left') ? 1 : 0);
  const z = (k('down') ? 1 : 0) - (k('up') ? 1 : 0);
  const pause = pauseQueued;
  pauseQueued = false;
  return {
    move: [x, z], cam_yaw_deg: camYaw,
    jump: k('jump'), interact: k('interact'), pulse: k('pulse'), dash: k('dash'),
    pause,
  };
}

// ---------- âm thanh theo sự kiện ----------
let lastReason = null;
let lastCountdown = null;
let prevGrounded = true;
let windWarned = false;
function resetTracking() {
  lastReason = null; lastCountdown = null; prevGrounded = true; windWarned = false; resultTimer = 0; fpsAcc = { frames: 0, time: 0, total: 0, totalTime: 0 };
  weakSeen = new Set(); shadeAlert = null; shakeT = 0; flashT = 0; $('hud-captions').innerHTML = '';
}
const SOUND = { mote_picked: 'pick', charm_picked: 'charm', deposit: 'deposit', lantern_lit: 'lit', pulse: 'pulse', dash: 'dash',
  drifter_steal: 'steal', drifter_drop: 'pick', shade_spawned: 'shade', refuel: 'refuel', lantern_out: 'out', fuel_drain: 'drain' };

// ---------- phụ đề / chỉ báo hình ảnh (TICKET-04 mục 4) ----------
let weakSeen = new Set(); // đèn đã báo "sắp cạn dầu" (báo lại khi đèn hồi ≥ 30 rồi yếu lại)
let shadeAlert = null; // { id, until } — mũi tên tới Bóng Mực vừa xuất hiện
let shakeT = 0; // rung camera còn lại (s)
let flashT = 0; // chớp màn hình còn lại (s)
function caption(text, kind = '', secs = 3) {
  if (!settings.captions) return;
  const box = $('hud-captions');
  const el = document.createElement('div');
  el.className = `panel ${kind}`;
  el.textContent = text;
  box.append(el);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => el.remove(), secs * 1000);
}
function onEvents(events) {
  const nowS = performance.now() / 1000;
  for (const e of events) {
    if (SOUND[e.name]) audio.play(SOUND[e.name]);
    if (e.name === 'player_hit') {
      audio.play(e.data.by === 'fall' ? 'fall' : 'hit');
      caption(e.data.by === 'fall' ? '💨 Mây rơi khỏi đảo — mất 1 Ngọn Lửa' : '💥 Bóng Mực chạm Mây — mất 1 Ngọn Lửa', 'danger');
      if (!settings.reducedMotion) { shakeT = 0.35; flashT = 0.25; } // Giảm chuyển động: không rung, không chớp
    }
    if (e.name === 'shade_spawned') { caption('👁 Bóng Mực xuất hiện!', 'shade'); shadeAlert = { id: e.data.id, until: nowS + 4 }; }
    if (e.name === 'lantern_out') caption(`🏮 Đèn ${e.data.lantern_id} đã tắt`, 'danger');
    if (e.name === 'drifter_steal') caption(`🌀 Gió Lạc cướp ${e.data.amount} đom đóm`, 'danger');
    if (e.name === 'pulse') view.pulseAnim = 1;
    if (e.name === 'game_over') { lastReason = e.data.reason; audio.play(e.data.result === 'won' ? 'win' : 'lose'); }
  }
  const p = game.player;
  if (prevGrounded && !p.grounded && p.vel[1] > 0) audio.play('jump');
  prevGrounded = p.grounded;
  const tl = timeLeft(game);
  if (tl <= 10 && game.state === 'playing') {
    const s = Math.ceil(tl);
    if (s !== lastCountdown) {
      if (lastCountdown == null || lastCountdown > 10) caption('⏳ 10 giây cuối!', 'danger');
      lastCountdown = s;
      audio.play('tick');
    }
  }
  // đèn vừa xuống dưới 30 dầu
  for (const L of game.lanterns) {
    const weak = isWeak(game, L);
    if (weak && !weakSeen.has(L.id)) caption(`🏮 Đèn ${L.id} sắp cạn dầu (< ${TUNING.low_fuel_threshold})`, 'danger');
    if (weak) weakSeen.add(L.id); else weakSeen.delete(L.id);
  }
}

// ---------- HUD ----------
const hud = {
  flames: $('hud-flames'), timer: $('hud-timer'), lanterns: $('hud-lanterns'), score: $('hud-score'), night: $('hud-night'),
  bar: $('hud-bar'), prompt: $('hud-prompt'), arrow: $('hud-arrow'), shadeArrow: $('hud-shade-arrow'), count: $('hud-count'), fps: $('hud-fps'),
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
  // 10 s cuối: số đếm ngược lớn giữa màn hình
  const tlExact = timeLeft(game);
  hud.count.classList.toggle('hidden', !(tlExact <= 10 && game.state === 'playing'));
  if (tlExact <= 10) setText(hud.count, String(Math.max(0, Math.ceil(tlExact - 1e-9))));

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
    const kE = `<kbd>${K('interact')}</kbd>`;
    hud.prompt.innerHTML = target.lit
      ? `${kE} — Châm dầu (${Math.floor(fuelOf(target))}/${TUNING.fuel_max})`
      : `${kE} — ${target.everLit ? 'Thắp lại' : 'Nạp ánh sáng'} (${target.deposited}/${cost})`;
  }
  // Mũi tên: đèn cần chú ý gần nhất (đèn tắt hoặc sắp cạn dầu) khi nó ở ngoài màn hình
  let best = null;
  let bd = Infinity;
  for (const L of game.lanterns) {
    if (L.lit && !isWeak(game, L)) continue;
    const d = dist(L);
    if (d < bd) { bd = d; best = L; }
  }
  hud.arrow.classList.toggle('hidden', !(best && edgeArrow(hud.arrow, [best.pos[0], best.pos[1] + 2.9, best.pos[2]], false)));
  // Bóng Mực vừa xuất hiện: mũi tên ở mép màn hình (ngoài màn hình) hoặc dấu ▼ trên đầu nó (trong màn hình), 4 s
  const s = shadeAlert && performance.now() / 1000 < shadeAlert.until ? game.shades.find((x) => x.id === shadeAlert.id) : null;
  hud.shadeArrow.classList.toggle('hidden', !(s && edgeArrow(hud.shadeArrow, [s.pos[0], s.pos[1] + 1.4, s.pos[2]], true)));
}

/** Đặt mũi tên chỉ tới điểm 3D: ngoài màn hình → ở mép, quay về phía điểm; trong màn hình → chỉ xuống điểm nếu onScreen. */
function edgeArrow(el, pos, onScreen) {
  v3.set(pos[0], pos[1], pos[2]).project(view.camera);
  const behind = v3.z > 1;
  let x = v3.x;
  let y = v3.y;
  if (behind) { x = -x; y = -y; }
  if (behind || Math.abs(x) > 0.95 || Math.abs(y) > 0.95) {
    const ang = Math.atan2(y, x);
    const m = 0.85 / Math.max(Math.abs(Math.cos(ang)), Math.abs(Math.sin(ang)));
    const sx = (Math.cos(ang) * m * 0.5 + 0.5) * innerWidth;
    const sy = Math.min(innerHeight - 110, Math.max(110, (-Math.sin(ang) * m * 0.5 + 0.5) * innerHeight)); // tránh HUD trên/dưới
    el.style.left = `${sx - 14}px`;
    el.style.top = `${sy - 15}px`;
    el.style.transform = `rotate(${90 - (ang * 180) / Math.PI}deg)`;
    return true;
  }
  if (!onScreen) return false;
  el.style.left = `${(x * 0.5 + 0.5) * innerWidth - 14}px`;
  el.style.top = `${(-y * 0.5 + 0.5) * innerHeight - 40}px`;
  el.style.transform = 'rotate(180deg)';
  return true;
}

// Gió: báo trước 2 s (lá bay + âm thanh) trước mỗi cơn ở tick 1800k
function windWarning() {
  if (!game.windEnabled || game.wind.active) { windWarned = false; return false; }
  const warn = game.simTick % RULES.wind_period_ticks >= RULES.wind_period_ticks - 120;
  if (warn && !windWarned) { windWarned = true; audio.play('wind'); caption('🍃 Gió sắp thổi! (2 giây)', 'wind'); }
  return warn;
}

// ---------- vòng lặp: logic bước cố định TICK_DT, vẽ theo khung hình ----------
let acc = 0;
let last = performance.now();
let fpsAcc = { frames: 0, time: 0, total: 0, totalTime: 0 };
window.__ddl = { fps: () => (fpsAcc.totalTime > 0 ? fpsAcc.total / fpsAcc.totalTime : 0) }; // đo FPS trung bình cho evidence

// ---------- benchmark (TICKET-04 mục 1): ?bench=1&seed=42&duration=30 — scripts/bench.mjs mở trang này ----------
let bench = null;
function startBench(seed, duration) {
  game = createBenchGame(seed);
  view.build(game.map);
  mode = 'bench';
  for (const s of document.querySelectorAll('.screen')) s.classList.add('hidden');
  $('hud').classList.add('hidden');
  bench = { seed, warm: BENCH_CAMERA.warmup_s * 1000, dur: duration * 1000, t0: null, prev: null, dts: [], done: false };
}
function benchFrame(now) {
  const b = bench;
  if (b.t0 == null) { b.t0 = now; b.firstFrameEpoch = performance.timeOrigin + now; }
  else if (now > b.t0 + b.warm && now <= b.t0 + b.warm + b.dur) b.dts.push(now - b.prev);
  b.prev = now;
  if (!b.done && now > b.t0 + b.warm + b.dur) {
    b.done = true;
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const result = {
      seed: b.seed, first_frame_epoch_ms: b.firstFrameEpoch, dts: b.dts, viewport: [innerWidth, innerHeight], dpr: devicePixelRatio,
      gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), three: THREE.REVISION, ua: navigator.userAgent,
      shades: game.shades.length, motes: game.motes.length, lit: game.lanterns.filter((L) => L.lit).map((L) => L.id),
    };
    window.__benchResult = result;
    fetch('/__bench/result', { method: 'POST', body: JSON.stringify(result) }).catch(() => {});
    const avg = (1000 * b.dts.length) / b.dts.reduce((a, x) => a + x, 0);
    hud.fps.textContent = `BENCH xong: ${b.dts.length} khung, TB ${avg.toFixed(1)} FPS`;
    $('hud').classList.remove('hidden');
  }
  // logic bước cố định như lúc chơi, không input
  acc += Math.min(0.25, (now - (b.lastSim ?? now)) / 1000);
  b.lastSim = now;
  while (acc >= TICK_DT) { step(game, {}); acc -= TICK_DT; }
  view.render(game, { camYaw: 0, time: now / 1000, windWarn: false, cam: benchCamera((now - b.t0) / 1000) });
}

function frame(now) {
  if (mode === 'bench') { benchFrame(now); requestAnimationFrame(frame); return; }
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
    // rung camera + chớp màn hình khi bị đánh (không có khi bật Giảm chuyển động: shakeT/flashT luôn 0)
    let shake = null;
    if (shakeT > 0) { shakeT = Math.max(0, shakeT - dt); const a = shakeT * 1.2; shake = [(Math.random() - 0.5) * a, (Math.random() - 0.5) * a]; }
    if (flashT > 0) flashT = Math.max(0, flashT - dt);
    $('flash').style.opacity = settings.reducedMotion ? 0 : (flashT * 1.4).toFixed(3);
    const lit = view.render(game, { camYaw, time: now / 1000, windWarn: mode === 'play' && windWarning(), shake });
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

const query = new URLSearchParams(location.search);
// ?demo=fuel (chỉ web, để chụp bằng chứng TICKET-03): đèn đầy / đèn yếu bị Bóng Mực hút / đèn đã tắt
const DEMO = {
  fuel: {
    random_shades: false, random_drifters: false, wind_enabled: false,
    player: { pos: [0, 0, 11], carried: 6, successful_lights: 2 },
    lanterns: [{ id: 'L1', pos: [0, 0, 20], lit: true, fuel: 80 }, { id: 'L2', pos: [-6, 0, 18], lit: true, fuel: 22 },
      { id: 'L5', pos: [6, 0, 18], ever_lit: true }],
    shades: [{ id: 'S1', pos: [-7.2, 1, 17], state: 'drain', target_lantern_id: 'L2' }],
  },
  // L1 còn 4 dầu cạnh Mây: ~4 s sau tắt → bấm E thắp lại (5) → bấm E lần nữa để châm dầu
  out: {
    random_shades: false, random_drifters: false, wind_enabled: false,
    player: { pos: [0, 0, 23.5], carried: 9 },
    lanterns: [{ id: 'L1', lit: true, fuel: 4 }],
  },
  // Đêm rút còn 12 s: 3/5 đèn sáng → thắng bình minh / 2/5 → thua bình minh
  win: { random_shades: false, time_left_s: 12, lanterns: [{ id: 'L1', lit: true, fuel: 60 }, { id: 'L2', lit: true }, { id: 'L5', lit: true, fuel: 35 }] },
  lose: { random_shades: false, time_left_s: 12, lanterns: [{ id: 'L1', lit: true }, { id: 'L2', lit: true }] },
  // TICKET-04 mục 4: Bóng Mực xuất hiện ở giây 5 (phụ đề + mũi tên), 10 s cuối, đèn L1 dầu < 30
  a11y: { random_motes: false, random_drifters: false, wind_enabled: false, time_left_s: 10.5, player: { pos: [0, 0, 20], carried: 4 },
    lanterns: [{ id: 'L1', lit: true, fuel: 26 }, { id: 'L2', lit: true }, { id: 'L3', lit: true }] },
};
if (query.get('bench') === '1') {
  startBench(Number(query.get('seed') ?? 42) | 0, Number(query.get('duration') ?? 30)); // không dựng menu
} else {
  view.build(createGame({ seed: 1, night: 1 }).map); // cảnh nền cho menu
  applyDevMode();
  show('scr-menu');
  // ?night=N: vào thẳng Đêm N (dùng khi quay/chụp bằng chứng)
  const qNight = Number(query.get('night'));
  if ([1, 2, 3].includes(qNight)) startNight(qNight, false, DEMO[query.get('demo')] ?? null);
  if (query.get('cb') === '1') applyPalette(true); // xem nhanh bảng màu dễ phân biệt (không lưu)
  if (query.get('large') === '1') document.body.classList.add('large'); // xem nhanh chữ lớn (không lưu)
  if (query.get('screen') === 'settings') openSettings(); // chụp bằng chứng màn Cài đặt / Bảng xếp hạng
  if (query.get('screen') === 'board') showBoard();
}
requestAnimationFrame(frame);
