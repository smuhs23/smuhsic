import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
const directory = new URL("../tests/fixtures/", import.meta.url);
await mkdir(directory, { recursive: true });
const path = (name) => new URL(name, directory).pathname;
const ffmpeg = (...args) =>
  execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: "inherit" });
ffmpeg(
  "-f",
  "lavfi",
  "-i",
  "aevalsrc=0.7*sin(2*PI*90*t)*exp(-mod(t\\,0.5)*35)+0.05*sin(2*PI*5000*t)*exp(-mod(t\\,0.25)*70):s=44100:d=8",
  "-c:a",
  "pcm_s16le",
  path("beat.wav"),
);
ffmpeg(
  "-i",
  path("beat.wav"),
  "-c:a",
  "libmp3lame",
  "-q:a",
  "6",
  path("beat.mp3"),
);
ffmpeg("-i", path("beat.wav"), "-c:a", "aac", path("beat.m4a"));
ffmpeg(
  "-f",
  "lavfi",
  "-i",
  "color=c=gray:s=320x180:r=30:d=8",
  "-i",
  path("beat.wav"),
  "-c:v",
  "libx264",
  "-threads",
  "2",
  "-pix_fmt",
  "yuv420p",
  "-c:a",
  "aac",
  "-movflags",
  "+faststart",
  "-shortest",
  path("screenrecording.mp4"),
);
ffmpeg(
  "-f",
  "lavfi",
  "-i",
  "anullsrc=r=44100:cl=mono",
  "-t",
  "4",
  "-c:a",
  "pcm_s16le",
  path("silent.wav"),
);
await writeFile(
  path("invalid.wav"),
  "This is deliberately not a valid audio file.",
);
for (const name of ["beat.wav", "beat.mp3", "beat.m4a", "screenrecording.mp4", "silent.wav"]) {
  const metadata = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", path(name)], {encoding:"utf8"}));
  if (!(Number(metadata.format.duration)>0) || !metadata.streams.some(stream=>stream.codec_type==='audio') || (name.endsWith('.mp4')&&!metadata.streams.some(stream=>stream.codec_type==='video'))) throw new Error(`Invalid generated fixture: ${name}`);
}
console.log("Created and verified original WAV/MP3/M4A/MP4 and silence fixtures.");
