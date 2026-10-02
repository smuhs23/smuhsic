export async function buildWaveform(
  file: File,
  context: BaseAudioContext,
  signal: AbortSignal,
): Promise<Float32Array | null> {
  if (file.size > 32 * 1024 * 1024 || signal.aborted) return null;
  try {
    const bytes = await file.arrayBuffer();
    if (signal.aborted) return null;
    const buffer = await context.decodeAudioData(bytes);
    if (signal.aborted || !buffer.length) return null;
    const peaks = new Float32Array(256);
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const samples = buffer.getChannelData(channel);
      for (let i = 0; i < samples.length; i++) {
        const bin = Math.min(255, Math.floor((i / samples.length) * 256));
        peaks[bin] = Math.max(peaks[bin], Math.min(1, Math.abs(samples[i])));
      }
    }
    return peaks;
  } catch {
    return null;
  }
}
