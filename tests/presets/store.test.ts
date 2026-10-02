import { describe, it, expect } from "vitest";
import { PresetStore } from "../../src/presets/store";
import { defaultSettings } from "../../src/presets/defaults";
import type { Preset } from "../../src/presets/types";
class MemoryStorage implements Storage {
  data = new Map<string, string>();
  fail = false;
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    if (this.fail) throw new DOMException("Full", "QuotaExceededError");
    this.data.set(key, value);
  }
}
const preset = (): Preset => ({
  schemaVersion: 1,
  id: "test-2317",
  name: "Mein Fluss",
  settings: {
    ...defaultSettings("mandala"),
    seed: 417,
    aspect: "4:5",
    quality: "high",
  },
});
describe("PresetStore", () => {
  it("roundtrip_preserves_seed_and_output", () => {
    const storage = new MemoryStorage(),
      store = new PresetStore(storage),
      p = preset();
    expect(store.save(p)).toEqual({ ok: true });
    expect(new PresetStore(storage).list()).toEqual([p]);
  });
  it("storage_failure_preserves_active_settings", () => {
    const storage = new MemoryStorage(),
      store = new PresetStore(storage),
      active = preset();
    storage.fail = true;
    const result = store.save(active);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/speicher/i);
    expect(active).toEqual(preset());
    expect(store.list()).toEqual([]);
  });
  it("corrupt_storage_is_recoverable", () => {
    const storage = new MemoryStorage();
    storage.data.set("2317.presets.v1", "{broken");
    const store = new PresetStore(storage);
    expect(store.list()).toEqual([]);
    expect(store.error).toBeTruthy();
    expect(store.save(preset()).ok).toBe(true);
    expect(store.list()).toHaveLength(1);
  });
  it("normalizes stored records and strips source urls", () => {
    const storage = new MemoryStorage(),
      p = preset();
    storage.data.set(
      "2317.presets.v1",
      JSON.stringify([
        {
          ...p,
          source: "blob:private",
          settings: { ...p.settings, mediaUrl: "private.mp4" },
        },
        { bad: true },
      ]),
    );
    const store = new PresetStore(storage);
    expect(store.list()).toEqual([p]);
    expect(store.error).toMatch(/beschädig/i);
  });
  it("updates an existing id, deletes only that id, and rejects invalid saves", () => {
    const storage = new MemoryStorage(),
      store = new PresetStore(storage),
      p = preset();
    store.save(p);
    store.save({ ...p, name: "Neu" });
    expect(store.list()).toHaveLength(1);
    expect(store.list()[0].name).toBe("Neu");
    expect(
      store.save({ ...p, settings: { ...p.settings, symmetry: 0 } }).ok,
    ).toBe(false);
    expect(store.remove(p.id).ok).toBe(true);
    expect(store.list()).toEqual([]);
  });
});
