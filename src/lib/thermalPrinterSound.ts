// Synthesizes a thermal printer sound using Web Audio API
export function playThermalPrinterSound(durationMs = 1800, volume = 50) {
  try {
    const ctx = new AudioContext();
    const duration = durationMs / 1000;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);

    // Rhythmic micro-bursts simulating stepper motor + print head
    const burstFreq = 32;
    const burstSamples = Math.floor(ctx.sampleRate / burstFreq);

    for (let i = 0; i < bufferSize; i++) {
      const phase = (i % burstSamples) / burstSamples;
      const inBurst = phase < 0.35;
      data[i] = inBurst
        ? (Math.random() * 2 - 1) * 0.08
        : (Math.random() * 2 - 1) * 0.01;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    // Narrower bandpass for a softer, more realistic tone
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 3000;
    bandpass.Q.value = 1.2;

    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 1200;

    const vol = Math.max(0, Math.min(100, volume)) / 100;
    const peak = 0.15 * vol;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(peak, ctx.currentTime + 0.03);
    gainNode.gain.setValueAtTime(peak, ctx.currentTime + duration - 0.08);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

    noiseSource.connect(bandpass);
    bandpass.connect(highpass);
    highpass.connect(gainNode);
    gainNode.connect(ctx.destination);

    noiseSource.start(ctx.currentTime);
    noiseSource.stop(ctx.currentTime + duration);

    noiseSource.onended = () => ctx.close();
  } catch {
    // Audio not supported
  }
}
