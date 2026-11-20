// Âm thanh tổng hợp bằng WebAudio (không dùng file ngoài). Chỉ chạy ở web; headless không đụng tới.
const PENTA = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25]; // ngũ cung C

export function createAudio(initialVolume = 0.7) {
  let ctx = null;
  let master = null;
  let musicBus = null;
  let musicTimer = null;
  let volume = initialVolume;
  let step = 0;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = volume;
      master.connect(ctx.destination);
      musicBus = ctx.createGain();
      musicBus.gain.value = 0.22;
      musicBus.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  function tone({ freq, dur = 0.15, type = 'sine', gain = 0.25, slide = 0, delay = 0, dest = null, attack = 0.01 }) {
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(dest || master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  function noise({ dur = 0.3, gain = 0.2, freq = 800, q = 1, delay = 0, sweep = 0 }) {
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1; // chỉ để tạo âm, không ảnh hưởng logic
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(freq, t0);
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(50, freq + sweep), t0 + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.08, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t0);
  }

  const SFX = {
    pick: () => { tone({ freq: 988, dur: 0.08, type: 'triangle', gain: 0.18 }); tone({ freq: 1319, dur: 0.1, type: 'triangle', gain: 0.15, delay: 0.05 }); },
    charm: () => [784, 988, 1175, 1568].forEach((f, i) => tone({ freq: f, dur: 0.18, type: 'triangle', gain: 0.16, delay: i * 0.05 })),
    deposit: () => tone({ freq: 523, dur: 0.12, type: 'sine', gain: 0.16 }),
    lit: () => [392, 523, 659, 784].forEach((f, i) => tone({ freq: f, dur: 0.6, type: 'sine', gain: 0.2, delay: i * 0.07 })),
    pulse: () => { tone({ freq: 300, dur: 0.35, type: 'sine', gain: 0.25, slide: 600 }); noise({ dur: 0.3, gain: 0.08, freq: 2000 }); },
    hit: () => { tone({ freq: 140, dur: 0.35, type: 'sawtooth', gain: 0.22, slide: -80 }); noise({ dur: 0.25, gain: 0.15, freq: 400 }); },
    fall: () => tone({ freq: 600, dur: 0.8, type: 'sine', gain: 0.2, slide: -500 }),
    jump: () => tone({ freq: 420, dur: 0.15, type: 'square', gain: 0.08, slide: 300 }),
    dash: () => noise({ dur: 0.22, gain: 0.2, freq: 600, sweep: 2400, q: 0.7 }),
    steal: () => { noise({ dur: 0.4, gain: 0.15, freq: 1500, sweep: -1200 }); tone({ freq: 660, dur: 0.25, type: 'triangle', gain: 0.12, slide: -330 }); },
    win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ freq: f, dur: 0.7, type: 'triangle', gain: 0.2, delay: i * 0.12 })),
    lose: () => [392, 330, 262, 196].forEach((f, i) => tone({ freq: f, dur: 0.6, type: 'sine', gain: 0.2, delay: i * 0.18 })),
    shade: () => tone({ freq: 110, dur: 0.9, type: 'sawtooth', gain: 0.12, slide: -50, attack: 0.2 }),
    tick: () => tone({ freq: 1200, dur: 0.06, type: 'square', gain: 0.1 }),
    wind: () => noise({ dur: 2.2, gain: 0.18, freq: 500, sweep: 900, q: 0.5 }),
    click: () => tone({ freq: 700, dur: 0.05, type: 'triangle', gain: 0.1 }),
  };

  // Nhạc nền đêm: nốt ngũ cung chậm trên nền âm trầm, lặp theo nhịp.
  function beat() {
    if (!ctx) return;
    const n = PENTA[(step * 3 + (step >> 2)) % PENTA.length];
    tone({ freq: n / 2, dur: 1.6, type: 'sine', gain: 0.3, attack: 0.3, dest: musicBus });
    if (step % 2 === 0) tone({ freq: n, dur: 0.9, type: 'triangle', gain: 0.12, delay: 0.25, dest: musicBus });
    if (step % 8 === 0) tone({ freq: 65.4, dur: 4, type: 'sine', gain: 0.35, attack: 1, dest: musicBus });
    step++;
  }

  return {
    ensure,
    play(name) { if (ensure() && SFX[name]) SFX[name](); },
    setVolume(v) { volume = v; if (master) master.gain.value = v; },
    startMusic() { if (!ensure() || musicTimer) return; beat(); musicTimer = setInterval(beat, 700); },
    stopMusic() { clearInterval(musicTimer); musicTimer = null; },
  };
}
