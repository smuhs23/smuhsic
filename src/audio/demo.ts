export function createDemoFile(): File {
  const rate = 22050,
    duration = 16,
    count = rate * duration,
    buffer = new ArrayBuffer(44 + count * 2),
    view = new DataView(buffer);
  const text = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++)
      view.setUint8(offset + i, str.charCodeAt(i));
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + count * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, count * 2, true);
  for (let i = 0; i < count; i++) {
    const t = i / rate,
      k = t % 0.5,
      h = t % 0.25;
    const kick =
      0.65 *
      Math.sin(
        2 * Math.PI * (65 * k + 55 * 0.018 * (1 - Math.exp(-k / 0.018))),
      ) *
      Math.exp(-k / 0.055);
    const hat =
      0.045 *
      (Math.sin(2 * Math.PI * 5701 * t) + Math.sin(2 * Math.PI * 7423 * t)) *
      Math.exp(-h / 0.015);
    const chord =
      0.035 *
      (Math.sin(2 * Math.PI * 220 * t) +
        Math.sin(2 * Math.PI * 261.63 * t) +
        Math.sin(2 * Math.PI * 329.63 * t)) *
      (0.6 + 0.4 * Math.sin(t * 0.5));
    const fade = Math.min(1, t / 0.025, (duration - t) / 0.08);
    view.setInt16(
      44 + i * 2,
      Math.max(-1, Math.min(1, (kick + hat + chord) * fade)) * 32767,
      true,
    );
  }
  return new File([buffer], "2317 · Demo / 120 BPM.wav", { type: "audio/wav" });
}
