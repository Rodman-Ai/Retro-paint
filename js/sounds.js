/* =========================================================
   Retro Paint — Web Audio synth (Mario Paint notes, Kid Pix SFX)
   ========================================================= */
(function (global) {
  let audioCtx = null;
  function ctx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  // Pentatonic-friendly chromatic scale (C major, two octaves)
  const NOTES = [
    261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88,
    523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77,
    1046.50, 1174.66
  ];

  function envelope(gain, t0, attack, decay, peak) {
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  }

  function tone(freq, dur, type, peak) {
    const a = ctx(); if (!a) return;
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    envelope(gain, a.currentTime, 0.005, dur, peak ?? 0.18);
    osc.connect(gain).connect(a.destination);
    osc.start();
    osc.stop(a.currentTime + dur + 0.05);
  }

  function noiseBurst(dur, peak, filterFreq) {
    const a = ctx(); if (!a) return;
    const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    src.buffer = buf;
    const gain = a.createGain();
    envelope(gain, a.currentTime, 0.005, dur, peak ?? 0.2);
    if (filterFreq) {
      const filt = a.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = filterFreq;
      src.connect(filt).connect(gain).connect(a.destination);
    } else {
      src.connect(gain).connect(a.destination);
    }
    src.start();
    src.stop(a.currentTime + dur);
  }

  function sweep(fromFreq, toFreq, dur, type, peak) {
    const a = ctx(); if (!a) return;
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = type || 'sawtooth';
    osc.frequency.setValueAtTime(fromFreq, a.currentTime);
    osc.frequency.exponentialRampToValueAtTime(toFreq, a.currentTime + dur);
    envelope(gain, a.currentTime, 0.005, dur, peak ?? 0.18);
    osc.connect(gain).connect(a.destination);
    osc.start();
    osc.stop(a.currentTime + dur + 0.05);
  }

  // ---- High-level effect API ----
  const Sounds = {
    enabled: true,
    setEnabled(b) { this.enabled = !!b; },
    init() { ctx(); },

    // Mario Paint: each color maps to a note
    noteForColor(index) {
      if (!this.enabled) return;
      const f = NOTES[index % NOTES.length];
      tone(f, 0.18, 'square', 0.16);
    },
    noteFreq(freq, dur) {
      if (!this.enabled) return;
      tone(freq, dur || 0.12, 'square', 0.14);
    },
    stampPlop() {
      if (!this.enabled) return;
      tone(880, 0.07, 'square', 0.18);
      setTimeout(() => tone(1320, 0.08, 'square', 0.16), 60);
    },
    eraseSwoosh() {
      if (!this.enabled) return;
      sweep(1200, 200, 0.18, 'sawtooth', 0.12);
    },

    // Kid Pix
    wackyBoing() {
      if (!this.enabled) return;
      sweep(200, 1200, 0.15, 'square', 0.16);
      setTimeout(() => sweep(1200, 600, 0.12, 'square', 0.14), 100);
    },
    sprayHiss() {
      if (!this.enabled) return;
      noiseBurst(0.18, 0.12, 4000);
    },
    pop() {
      if (!this.enabled) return;
      tone(660, 0.05, 'square', 0.18);
      setTimeout(() => tone(990, 0.05, 'square', 0.16), 30);
    },
    rainbow() {
      if (!this.enabled) return;
      [523, 587, 659, 783, 880, 987, 1046].forEach((f, i) => {
        setTimeout(() => tone(f, 0.07, 'triangle', 0.12), i * 35);
      });
    },
    explosion() {
      if (!this.enabled) return;
      sweep(800, 60, 0.4, 'sawtooth', 0.25);
      noiseBurst(0.5, 0.3, 2500);
    },
    ohNo() {
      if (!this.enabled) return;
      // descending "oh no" sweep
      sweep(660, 220, 0.4, 'square', 0.18);
    },
    click() {
      if (!this.enabled) return;
      tone(1200, 0.03, 'square', 0.1);
    }
  };

  global.Sounds = Sounds;
})(window);
