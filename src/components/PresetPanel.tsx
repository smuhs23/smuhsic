import { useRef, useState } from "react";
import type { Preset, VisualSettings } from "../presets/types";
import { PresetStore } from "../presets/store";
import { parsePreset } from "../presets/validation";
import { Icon } from "./Icons";
import { downloadBlob } from "../export/download";
export function PresetPanel({
  settings,
  onApply,
  locked = false,
}: {
  settings: VisualSettings;
  onApply: (settings: VisualSettings) => void;
  locked?: boolean;
}) {
  const [store] = useState(() => new PresetStore()),
    [presets, setPresets] = useState(() => store.list()),
    [name, setName] = useState("");
  const [message, setMessage] = useState<{
    text: string;
    error: boolean;
  } | null>(store.error ? { text: store.error, error: true } : null);
  const input = useRef<HTMLInputElement>(null);
  const current = (): Preset => ({
    schemaVersion: 1,
    id: crypto.randomUUID(),
    name: name.trim() || "Mein 2317 Look",
    settings: { ...settings, colors: [...settings.colors] },
  });
  const save = () => {
    const result = store.save(current());
    if (result.ok) {
      setPresets(store.list());
      setMessage({ text: "Dein Look ist gespeichert.", error: false });
      setName("");
    } else setMessage({ text: result.error!, error: true });
  };
  const exportPreset = () => {
    const parsed = parsePreset(JSON.stringify(current()));
    if (!parsed.ok) {
      setMessage({ text: parsed.error, error: true });
      return;
    }
    downloadBlob(
      new Blob([JSON.stringify(parsed.value, null, 2)], {
        type: "application/json",
      }),
      `2317-${parsed.value.name.replace(/[^a-zA-Z0-9_-]/g, "-")}.json`,
    );
  };
  const importPreset = async (file: File) => {
    if (file.size > 100_000) {
      setMessage({ text: "Die Preset-Datei ist zu groß.", error: true });
      return;
    }
    try {
      const result = parsePreset(await file.text());
      if (!result.ok) {
        setMessage({ text: result.error, error: true });
        return;
      }
      onApply(result.value.settings);
      setName(result.value.name);
      setMessage({
        text: "Preset geladen. Du kannst den Look jetzt bearbeiten oder speichern.",
        error: false,
      });
    } catch {
      setMessage({
        text: "Die Preset-Datei konnte nicht gelesen werden.",
        error: true,
      });
    }
  };
  return (
    <section className="panel preset-panel" aria-labelledby="presets-title">
      <div className="section-heading">
        <span className="step">04</span>
        <h2 id="presets-title">Deine Sammlung</h2>
        <Icon name="download" size={16} />
      </div>
      <label className="preset-name">
        <span>Preset-Name</span>
        <input
          aria-label="Preset-Name"
          maxLength={80}
          value={name}
          placeholder="Gib deinem Look einen Namen"
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <button className="save-preset-button" onClick={save}>
        Preset speichern <span aria-hidden="true">＋</span>
      </button>
      {presets.length > 0 && (
        <div className="saved-presets">
          {presets.map((preset) => (
            <div className="saved-preset" key={preset.id}>
              <button
                disabled={locked}
                onClick={() => {
                  onApply(preset.settings);
                  setName(preset.name);
                  setMessage(null);
                }}
              >
                {preset.name}
              </button>
              <button
                aria-label={`${preset.name} löschen`}
                className="icon-button"
                onClick={() => {
                  const result = store.remove(preset.id);
                  if (result.ok) setPresets(store.list());
                  else setMessage({ text: result.error!, error: true });
                }}
              >
                <Icon name="close" size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="preset-actions">
        <button onClick={exportPreset}>
          JSON sichern <Icon name="download" size={12} />
        </button>
        <button disabled={locked} onClick={() => input.current?.click()}>
          JSON laden <Icon name="upload" size={12} />
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        className="file-input"
        aria-label="Preset importieren"
        disabled={locked}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importPreset(file);
          event.target.value = "";
        }}
      />
      {message && (
        <p
          className={message.error ? "error-message" : "preset-status"}
          role={message.error ? "alert" : "status"}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}
