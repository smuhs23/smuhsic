import { ASPECTS, MODES, MOODS, RANGES } from "./types";
import type { NumericSetting, Preset, VisualSettings } from "./types";
type Result = { ok: true; value: Preset } | { ok: false; error: string };
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const hex = (v: unknown): v is string =>
  typeof v === "string" && /^#[a-f\d]{6}$/i.test(v);
const has = (values: readonly string[], value: unknown) =>
  typeof value === "string" && values.includes(value);

export function parsePreset(text: string): Result {
  try {
    if (text.length > 100_000)
      return { ok: false, error: "Die Preset-Datei ist zu groß." };
    const data: unknown = JSON.parse(text);
    if (!object(data) || data.schemaVersion !== 1 || !object(data.settings))
      throw new Error("Dieses Preset-Format wird nicht unterstützt.");
    if (
      typeof data.id !== "string" ||
      !data.id.trim() ||
      data.id.length > 100 ||
      typeof data.name !== "string" ||
      !data.name.trim() ||
      data.name.length > 80
    )
      throw new Error("Das Preset braucht einen gültigen Namen.");
    const s = data.settings;
    if (
      !has(MODES, s.mode) ||
      !has(ASPECTS, s.aspect) ||
      !has(["auto", "standard", "high"], s.quality) ||
      !has(["auto", "manual"], s.beatMode) ||
      (s.mood !== null && !has(MOODS, s.mood))
    )
      throw new Error("Look, Stimmung oder Ausgabeformat ist ungültig.");
    if (
      !hex(s.background) ||
      !Array.isArray(s.colors) ||
      s.colors.length !== 3 ||
      !s.colors.every(hex) ||
      typeof s.monochrome !== "boolean"
    )
      throw new Error("Die Farbwerte sind ungültig.");
    const numbers: Partial<Record<NumericSetting, number>> = {};
    for (const key of Object.keys(RANGES) as NumericSetting[]) {
      const value = s[key],
        [min, max, step] = RANGES[key];
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < min ||
        value > max ||
        (step === 1 && !Number.isInteger(value))
      )
        throw new Error(
          `Der Wert für „${key}“ liegt außerhalb des gültigen Bereichs.`,
        );
      numbers[key] = value;
    }
    const settings = {
      ...numbers,
      mode: s.mode,
      mood: s.mood,
      aspect: s.aspect,
      quality: s.quality,
      beatMode: s.beatMode,
      background: s.background.toLowerCase(),
      colors: s.colors.map((v: string) => v.toLowerCase()),
      monochrome: s.monochrome,
    } as VisualSettings;
    return {
      ok: true,
      value: {
        schemaVersion: 1,
        id: data.id.trim(),
        name: data.name.trim(),
        settings,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof SyntaxError
          ? "Die Datei enthält kein gültiges JSON."
          : error instanceof Error
            ? error.message
            : "Das Preset ist ungültig.",
    };
  }
}
