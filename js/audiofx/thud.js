/**
 * Generates a dull "Body Hit" or "Thud" sound.
 * @param {AudioContext} context 
 * @param {number} volume - 0.0 to 1.0 (default 1.0)
 */
export function playThud(volume = 1.0,context) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const ctx = context || new AudioContext();
  const t = ctx.currentTime;

  // 1. Create the Oscillator (The Source)
  const osc = ctx.createOscillator();
  osc.type = 'triangle'; // Triangle is "punchy" but not "buzzy"

  // 2. Create a Lowpass Filter (The Muffle)
  // This removes the "zing" from the sound, making it dull.
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800; // Cut off anything above 800Hz

  // 3. Create the Gain Node (The Volume & Envelope)
  const gain = ctx.createGain();

  // 4. Connect: Oscillator -> Filter -> Gain -> Speakers
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  // --- THE SOUND DESIGN ---

  // A. Pitch Drop (The "Impact")
  // Start at 150Hz (Low-mid) and drop instantly to 50Hz (Sub-bass)
  // This rapid drop creates the feeling of a heavy impact.
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);

  // B. Volume Envelope (Short and Peries)
  // Attack: Instant (0s)
  gain.gain.setValueAtTime(volume, t);
  // Decay: Fast fade out (0.15s) to simulate a dead thud with no resonance
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

  // 5. Play
  osc.start(t);
  osc.stop(t + 0.15);
}