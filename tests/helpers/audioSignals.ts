import FFT from "fft.js";
export function signalFrame(
  time: number,
  sampleRate: number,
  fftSize: number,
  sample: (time: number) => number,
) {
  const waveform = new Float32Array(fftSize);
  const windowed = new Float64Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    waveform[i] = sample(time - (fftSize - 1 - i) / sampleRate);
    windowed[i] =
      waveform[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (fftSize - 1)));
  }
  const fft = new FFT(fftSize),
    out = fft.createComplexArray();
  fft.realTransform(out, windowed);
  const spectrumDb = new Float32Array(fftSize / 2);
  for (let i = 0; i < spectrumDb.length; i++)
    spectrumDb[i] =
      20 *
      Math.log10(
        Math.max(1e-8, Math.hypot(out[2 * i], out[2 * i + 1]) / (fftSize / 2)),
      );
  return { waveform, spectrumDb };
}
export const kick = (time: number) => {
  if (time < 1.25) return 0;
  const age = (time - 1.25) % 0.5;
  return age < 0.13
    ? 0.8 * Math.sin(2 * Math.PI * 95 * age) * Math.exp(-age / 0.025)
    : 0;
};
