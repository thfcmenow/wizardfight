/**
 * Generates a low humming "Shield Loss" sound similar to classic 16-bit era games.
 * @param {number} volume - 0.0 to 1.0 (default 1.0)
 * @param {AudioContext} context 
 */
export function playShieldLoss(volume = 1.0, context) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const ctx = context || new AudioContext();
  const t = ctx.currentTime;

  // 1. Create the Oscillator (The "Hum")
  const osc = ctx.createOscillator();
  // Square waves provide that retro, hollow humming texture
  osc.type = 'square'; 

  // 2. Create a Filter (To keep it "Low")
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 600; // Keeps the bass but loses the "buzz"

  // 3. Create the Gain Node
  const gain = ctx.createGain();

  // 4. Signal Chain: Osc -> Filter -> Gain -> Destination
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  // --- SOUND DESIGN ---

  // A. The Rapid Pitch Slide (The "De-powering" effect)
  // Start high enough to be heard (around 200Hz) and drop quickly to a sub-bass hum
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.5);

  // B. Volume Envelope
  // We want a slightly longer tail than a 'thud' to let the hum resonate
  gain.gain.setValueAtTime(volume, t);
  gain.gain.linearRampToValueAtTime(0, t + 0.5);

  // 5. Play
  osc.start(t);
  osc.stop(t + 0.5);
}