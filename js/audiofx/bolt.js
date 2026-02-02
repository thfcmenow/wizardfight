/**
 * Generates a "Photon Torpedo" style sci-fi sound effect.
 * * @param {AudioContext} [context] - Optional: Pass an existing AudioContext. 
 * If null, one will be created.
 */
export function playBolt(context) {
  // 1. Setup the Audio Context (Singleton pattern recommended for performance)
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const ctx = context || new AudioContext();

  // Resume context if it's suspended (browser autoplay policy)
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const t = ctx.currentTime;
  
  // 2. Create the Oscillator (The source)
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth'; // Sawtooth gives a "buzzy" mechanical energy sound

  // 3. Create the Gain Node (The volume envelope)
  const gain = ctx.createGain();
  
  // 4. Create a Filter (Optional: adds a "whoosh" by cutting high frequencies over time)
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 1; // Resonance

  // 5. Connect the nodes: Oscillator -> Filter -> Gain -> Speakers
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  // --- THE SOUND RECIPE ---

  // A. Pitch Envelope (The "Drop")
  // Start high (1200Hz) and drop to low (100Hz) quickly
  osc.frequency.setValueAtTime(1200, t); 
  osc.frequency.exponentialRampToValueAtTime(100, t + 0.6);

  // B. Volume Envelope (The "Fade")
  // Start silence, instant attack to full volume, then fade out
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.3, t + 0.05); // Attack (prevent clicking)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6); // Decay

  // C. Filter Sweep (The "Texture")
  // Opens the filter up and closes it down to mimic distance
  filter.frequency.setValueAtTime(2000, t);
  filter.frequency.exponentialRampToValueAtTime(100, t + 0.6);

  // 6. Fire!
  osc.start(t);
  osc.stop(t + 0.6);
  
  // Garbage collection helper (optional cleanup logic could go here)
}