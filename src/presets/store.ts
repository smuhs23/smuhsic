import type { Preset } from "./types";
import { parsePreset } from "./validation";
const KEY = "2317.presets.v1";
type StoreResult = { ok: boolean; error?: string };
export class PresetStore {
  private storage: Storage | null = null;
  error: string | null = null;
  constructor(storage?: Storage) {
    try {
      this.storage = storage ?? window.localStorage;
    } catch {
      this.error =
        "Der lokale Speicher ist nicht verfügbar. Du kannst Presets als JSON sichern.";
    }
  }
  list(): Preset[] {
    if (!this.storage) return [];
    try {
      const text = this.storage.getItem(KEY);
      this.error = null;
      if (!text) return [];
      if (text.length > 2_000_000) throw new Error("size");
      const records: unknown = JSON.parse(text);
      if (!Array.isArray(records)) throw new Error("format");
      const valid: Preset[] = [];
      const ids = new Set<string>();
      for (const record of records) {
        const parsed = parsePreset(JSON.stringify(record));
        if (parsed.ok && !ids.has(parsed.value.id)) {
          valid.push(parsed.value);
          ids.add(parsed.value.id);
        } else
          this.error =
            "Beschädigte Presets wurden übersprungen. Du kannst neue Presets speichern.";
      }
      return valid;
    } catch {
      this.error =
        "Die gespeicherten Presets sind beschädigt oder nicht lesbar. Du kannst neue Presets speichern.";
      return [];
    }
  }
  private write(presets: Preset[]): StoreResult {
    try {
      if (!this.storage) throw new Error("unavailable");
      this.storage.setItem(KEY, JSON.stringify(presets));
      this.error = null;
      return { ok: true };
    } catch {
      const error =
        "Das Preset konnte nicht gespeichert werden. Der lokale Speicher ist voll oder gesperrt. Sichere deinen Look als JSON.";
      this.error = error;
      return { ok: false, error };
    }
  }
  save(preset: Preset): StoreResult {
    const parsed = parsePreset(JSON.stringify(preset));
    if (!parsed.ok) return { ok: false, error: parsed.error };
    const existing = this.list().filter((p) => p.id !== parsed.value.id);
    return this.write([...existing, parsed.value]);
  }
  remove(id: string): StoreResult {
    return this.write(this.list().filter((p) => p.id !== id));
  }
}
