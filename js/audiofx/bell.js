/**
 * @param {AudioContext} context
 * @param {number} volume - From 0.0 to 1.0 (default 0.5)
 */
export function playFMBell(volume = 0.5, context) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const ctx = context || new AudioContext();
  const t = ctx.currentTime;

  // ... (Carrier, Modulator, and ModulationGain setup stays the same) ...
  const carrier = ctx.createOscillator();
  carrier.type = 'sine';
  carrier.frequency.value = 400;

  const modulator = ctx.createOscillator();
  modulator.type = 'sine';
  modulator.frequency.value = 400 * 2.5; 

  const modulationGain = ctx.createGain();
  modulationGain.gain.setValueAtTime(1000, t); 
  modulationGain.gain.exponentialRampToValueAtTime(1, t + 2); 

  modulator.connect(modulationGain);
  modulationGain.connect(carrier.frequency); 

  // --- CHANGED SECTION ---
  const masterGain = ctx.createGain();
  
  // Start at 0
  masterGain.gain.setValueAtTime(0, t);
  
  // Ramp up to the requested 'volume' parameter
  masterGain.gain.linearRampToValueAtTime(volume, t + 0.01); 
  
  // Decay down to silence
  masterGain.gain.exponentialRampToValueAtTime(0.001, t + 3); 
  // -----------------------

  carrier.connect(masterGain);
  masterGain.connect(ctx.destination);

  carrier.start(t);
  modulator.start(t);
  
  carrier.stop(t + 3);
  modulator.stop(t + 3);
}