export interface RecordingFormat {
  mimeType: string;
  extension: "webm" | "mp4";
}
const MIME_TYPES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/webm",
  "video/mp4",
];
export function extensionForMime(mime: string): "webm" | "mp4" | null {
  const base = mime.split(";")[0].trim().toLowerCase();
  return base === "video/webm" ? "webm" : base === "video/mp4" ? "mp4" : null;
}
export function supportedRecordingFormats(
  recorder: Pick<
    typeof MediaRecorder,
    "isTypeSupported"
  > | null = typeof MediaRecorder === "undefined" ? null : MediaRecorder,
): RecordingFormat[] {
  if (!recorder) return [];
  return MIME_TYPES.filter((mime) => {
    try {
      return recorder.isTypeSupported(mime);
    } catch {
      return false;
    }
  }).map((mimeType) => ({ mimeType, extension: extensionForMime(mimeType)! }));
}
