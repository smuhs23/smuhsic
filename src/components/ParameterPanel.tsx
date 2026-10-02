import { useEffect, useState } from "react";
import type { NumericSetting, VisualSettings } from "../presets/types";
import { RANGES } from "../presets/types";
const labels: Record<Exclude<NumericSetting, "seed">, string> = {
  colorMix: "Farbmischung",
  scale: "Größe",
  density: "Dichte",
  symmetry: "Symmetrie",
  complexity: "Komplexität",
  rotation: "Rotation",
  speed: "Geschwindigkeit",
  turbulence: "Turbulenz",
  trails: "Nachbilder",
  softness: "Weichheit",
  sensitivity: "Empfindlichkeit",
  beatStrength: "Beat-Stärke",
  smoothing: "Glättung",
  bassWeight: "Bass-Gewichtung",
  midWeight: "Mitten-Gewichtung",
  trebleWeight: "Höhen-Gewichtung",
  manualBpm: "Manuelle BPM",
};
function display(key: NumericSetting, value: number) {
  if (["symmetry", "complexity", "manualBpm"].includes(key))
    return String(value);
  if (key === "rotation") return `${value}°`;
  if (key === "scale" || key === "sensitivity") return `${value.toFixed(2)}×`;
  return `${Math.round(value * 100)}%`;
}
function BpmInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <input
      type="number"
      aria-label="Manuelle BPM"
      min="40"
      max="240"
      step="1"
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value);
        const next = Number(event.target.value);
        if (next >= 40 && next <= 240) onChange(Math.round(next));
      }}
      onBlur={() => {
        const next = draft.trim()
          ? Math.min(240, Math.max(40, Number(draft)))
          : value;
        onChange(Number.isFinite(next) ? Math.round(next) : value);
        setDraft(String(Number.isFinite(next) ? Math.round(next) : value));
      }}
    />
  );
}
export function ParameterPanel({
  settings,
  onChange,
  onVariation,
  onReset,
}: {
  settings: VisualSettings;
  onChange: (patch: Partial<VisualSettings>) => void;
  onVariation: () => void;
  onReset: () => void;
}) {
  const slider = (key: Exclude<NumericSetting, "seed">) => (
    <label className="parameter" key={key}>
      <span>
        {labels[key]}
        <output>{display(key, settings[key])}</output>
      </span>
      <input
        aria-label={labels[key]}
        type="range"
        min={RANGES[key][0]}
        max={RANGES[key][1]}
        step={RANGES[key][2]}
        value={settings[key]}
        onChange={(event) => onChange({ [key]: Number(event.target.value) })}
      />
    </label>
  );
  return (
    <section
      className="panel parameter-panel"
      aria-labelledby="parameters-title"
    >
      <div className="section-heading">
        <span className="step">03</span>
        <h2 id="parameters-title">Ganz dein Gefühl</h2>
        <span className="tiny-tag">CUSTOM</span>
      </div>
      <details className="control-group" open>
        <summary>
          Farben <span>01</span>
        </summary>
        <div className="color-grid">
          {(["Hintergrund", "Farbe 1", "Farbe 2", "Farbe 3"] as const).map(
            (label, i) => (
              <label className="color-swatch" key={label}>
                <input
                  type="color"
                  aria-label={label}
                  value={i === 0 ? settings.background : settings.colors[i - 1]}
                  onChange={(event) => {
                    if (i === 0) onChange({ background: event.target.value });
                    else {
                      const colors: [string, string, string] = [
                        ...settings.colors,
                      ];
                      colors[i - 1] = event.target.value;
                      onChange({ colors });
                    }
                  }}
                />
                <span>{i === 0 ? "Grund" : `0${i}`}</span>
              </label>
            ),
          )}
        </div>
        <label className="select-parameter">
          <span>Farbmodus</span>
          <select
            aria-label="Farbmodus"
            value={settings.monochrome ? "mono" : "gradient"}
            onChange={(event) =>
              onChange({ monochrome: event.target.value === "mono" })
            }
          >
            <option value="mono">Monochrom</option>
            <option value="gradient">Farbverlauf</option>
          </select>
        </label>
        {slider("colorMix")}
      </details>
      <details className="control-group" open>
        <summary>
          Form <span>02</span>
        </summary>
        {(
          ["scale", "density", "symmetry", "complexity", "rotation"] as const
        ).map(slider)}
      </details>
      <details className="control-group" open>
        <summary>
          Fluss <span>03</span>
        </summary>
        {(["speed", "turbulence", "trails", "softness"] as const).map(slider)}
      </details>
      <details className="control-group" open>
        <summary>
          Musik <span>04</span>
        </summary>
        <label className="select-parameter">
          <span>Beatmodus</span>
          <select
            aria-label="Beatmodus"
            value={settings.beatMode}
            onChange={(event) =>
              onChange({
                beatMode: event.target.value as VisualSettings["beatMode"],
              })
            }
          >
            <option value="auto">Automatisch</option>
            <option value="manual">Manueller Takt</option>
          </select>
        </label>
        {settings.beatMode === "manual" && (
          <label className="select-parameter">
            <span>BPM</span>
            <BpmInput
              value={settings.manualBpm}
              onChange={(manualBpm) => onChange({ manualBpm })}
            />
          </label>
        )}
        {(
          [
            "sensitivity",
            "beatStrength",
            "smoothing",
            "bassWeight",
            "midWeight",
            "trebleWeight",
          ] as const
        ).map(slider)}
        <p className="group-hint">
          Bass gibt Größe. Mitten geben Fluss. Höhen geben Details.
        </p>
      </details>
      <div className="variation-row">
        <span>
          SEED <b data-testid="seed-value">{settings.seed}</b>
        </span>
        <button className="secondary-button" onClick={onVariation}>
          Neue Variation
        </button>
      </div>
      <button className="reset-button" onClick={onReset}>
        Look zurücksetzen <span aria-hidden="true">↺</span>
      </button>
    </section>
  );
}
