import { it, expect } from "vitest";
import {
  supportedRecordingFormats,
  extensionForMime,
} from "../../src/export/formats";
it("orders only formats actually supported by the browser", () => {
  const formats = supportedRecordingFormats({
    isTypeSupported: (mime: string) =>
      mime.includes("vp8") || mime === "video/mp4",
  });
  expect(formats.map((f) => f.mimeType)).toEqual([
    "video/webm;codecs=vp8,opus",
    "video/mp4",
  ]);
  expect(formats.map((f) => f.extension)).toEqual(["webm", "mp4"]);
});
it("returns no formats when recording is unavailable", () => {
  expect(supportedRecordingFormats(null)).toEqual([]);
  expect(supportedRecordingFormats({ isTypeSupported: () => false })).toEqual(
    [],
  );
});
it("derives the extension from the actual recorder mime type", () => {
  expect(extensionForMime("video/mp4;codecs=avc1.42E01E")).toBe("mp4");
  expect(extensionForMime("video/webm;codecs=vp9,opus")).toBe("webm");
  expect(extensionForMime("image/png")).toBeNull();
});
