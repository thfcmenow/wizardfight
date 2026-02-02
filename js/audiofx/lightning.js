/**
 * Lightning and Electricity Sound Synthesizer
 * Generates a procedural "zap" sound using white noise and low-frequency oscillators.
 */

export const playLightningSound = (volume = 0.5) => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    console.error("Web Audio API is not supported in this browser.");
    return;
  }

  const audioCtx = new AudioContext();
  const sampleRate = audioCtx.sampleRate;
  
  // 1. Create White Noise for the "crackling" static
  const bufferSize = 2 * sampleRate;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;

  // 2. Create the Power Hum (Low frequency buzz)
  const humOsc = audioCtx.createOscillator();
  humOsc.type = 'sawtooth';
  humOsc.frequency.setValueAtTime(60, audioCtx.currentTime); // 60Hz hum
  
  // 3. Filters to shape the sound
  const bandpass = audioCtx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.setValueAtTime(1500, audioCtx.currentTime);
  bandpass.Q.setValueAtTime(1, audioCtx.currentTime);

  // 4. Main Gain (Volume Envelope)
  const mainGain = audioCtx.createGain();
  const now = audioCtx.currentTime;
  
  // Immediate strike attack
  mainGain.gain.setValueAtTime(0, now);
  mainGain.gain.linearRampToValueAtTime(volume, now + 0.01);
  
  // Add some "jitter" to the volume to simulate electrical arcing
  for (let i = 0; i < 10; i++) {
    const jitterTime = now + 0.01 + (i * 0.05);
    const jitterVol = volume * (0.3 + Math.random() * 0.7);
    mainGain.gain.exponentialRampToValueAtTime(jitterVol, jitterTime);
  }
  
    // Fade out
    mainGain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    // mainGain.gain.stop(now + 1.0);

    mainGain.gain.setValueAtTime(mainGain.gain.value, now);
    mainGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);

  // 5. Connections
  noiseSource.connect(bandpass);
  humOsc.connect(bandpass);
  bandpass.connect(mainGain);
  mainGain.connect(audioCtx.destination);

  // Start sounds
  noiseSource.start(now);
  humOsc.start(now);

  // Cleanup
  noiseSource.stop(now + 1.0);
  humOsc.stop(now + 1.0);
  
  // Close context after sound finishes to save memory
  setTimeout(() => {
    audioCtx.close();
  }, 1500);
};

export default playLightningSound;