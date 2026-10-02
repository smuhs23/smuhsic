import { MODES, MOODS, MODE_NAMES, MOOD_NAMES } from "../presets/types";
import type { Mood, VisualMode, VisualSettings } from "../presets/types";
import { Icon } from "./Icons";
const descriptions = {
  ink: "Feine Fäden",
  bloom: "Fließende Konturen",
  mandala: "Radiale Harmonie",
  tunnel: "Tiefe & Sog",
  ribbons: "Wellen in Farbe",
};
const glyphs = {
  ink: "∿",
  bloom: "◉",
  mandala: "✳",
  tunnel: "◎",
  ribbons: "≋",
};
export function LookPicker({
  settings,
  onMode,
  onMood,
}: {
  settings: VisualSettings;
  onMode: (mode: VisualMode) => void;
  onMood: (mood: Mood) => void;
}) {
  return (
    <section className="panel look-panel" aria-labelledby="look-title">
      <div className="section-heading">
        <span className="step">02</span>
        <h2 id="look-title">Dein Look</h2>
        <Icon name="spark" />
      </div>
      <div className="look-grid">
        {MODES.map((mode) => (
          <button
            key={mode}
            className={`look-option ${settings.mode === mode ? "selected" : ""}`}
            aria-label={MODE_NAMES[mode]}
            aria-pressed={settings.mode === mode}
            onClick={() => onMode(mode)}
          >
            <span className={`look-glyph glyph-${mode}`}>{glyphs[mode]}</span>
            <span>
              <strong>{MODE_NAMES[mode]}</strong>
              <small>{descriptions[mode]}</small>
            </span>
            <span className="look-check">
              {settings.mode === mode ? "●" : "○"}
            </span>
          </button>
        ))}
      </div>
      <div className="mood-heading">
        <h3>Wie fühlt es sich an?</h3>
        <span>STIMMUNG</span>
      </div>
      <div className="mood-grid">
        {MOODS.map((mood) => (
          <button
            key={mood}
            onClick={() => onMood(mood)}
            aria-pressed={settings.mood === mood}
            className={`mood-option ${settings.mood === mood ? "selected" : ""}`}
          >
            {MOOD_NAMES[mood]}
          </button>
        ))}
      </div>
    </section>
  );
}
