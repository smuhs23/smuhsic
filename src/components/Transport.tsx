import type { MediaState } from "../audio/MediaController";
import type { AudioFeatures } from "../audio/types";
import { Icon } from "./Icons";
export function formatTime(time: number) {
  const t = Math.max(0, Math.floor(time));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}
export function Transport({
  state,
  features,
  onToggle,
  onSeek,
  onVolume,
  onLoop,
  waveform,
  noSignal,
  locked = false,
}: {
  state: MediaState;
  features: AudioFeatures;
  onToggle: () => void;
  onSeek: (time: number) => void;
  onVolume: (volume: number) => void;
  onLoop: () => void;
  waveform: Float32Array | null;
  noSignal: boolean;
  locked?: boolean;
}) {
  const playable = ["ready", "playing", "paused"].includes(state.status),
    playing = state.status === "playing";
  return (
    <section className="transport" aria-label="Wiedergabe">
      <div className="transport-main">
        <button
          className="play-button"
          onClick={onToggle}
          disabled={!playable || locked}
          aria-label={playing ? "Pause" : "Wiedergeben"}
        >
          <Icon name={playing ? "pause" : "play"} size={23} />
        </button>
        <div className="track-timeline">
          <div className="track-label">
            <span>{state.name ? "DEIN TRACK" : "BEREIT FÜR DEINEN SOUND"}</span>
            <span data-testid="track-time">
              {formatTime(state.currentTime)} <i>/</i>{" "}
              {formatTime(state.duration)}
            </span>
          </div>
          <div className={`timeline-line ${waveform ? "has-waveform" : ""}`}>
            {waveform && (
              <svg
                className="waveform"
                viewBox="0 0 512 40"
                preserveAspectRatio="none"
                role="img"
                aria-label="Wellenform"
              >
                {Array.from(waveform, (value, i) => (
                  <rect
                    key={i}
                    x={i * 2}
                    y={20 - Math.max(1, value * 18)}
                    width="1"
                    height={Math.max(2, value * 36)}
                  />
                ))}
              </svg>
            )}
            <div
              className="timeline-fill"
              style={{
                width: `${state.duration ? (state.currentTime / state.duration) * 100 : 0}%`,
              }}
            />
            <input
              aria-label="Trackposition"
              type="range"
              min="0"
              max={state.duration || 1}
              step="0.01"
              value={state.currentTime}
              disabled={!state.duration || locked}
              onChange={(event) => onSeek(Number(event.target.value))}
            />
          </div>
        </div>
        <button
          className={`icon-button loop-button ${state.loop ? "active" : ""}`}
          onClick={onLoop}
          aria-label="Wiederholung"
          aria-pressed={state.loop}
          disabled={locked}
        >
          <Icon name="loop" />
        </button>
      </div>
      {noSignal && (
        <p className="signal-note" role="status">
          Kein Audiosignal erkannt. Prüfe die Datei oder nutze einen manuellen
          Takt.
        </p>
      )}
      <div className="transport-bottom">
        <div
          className="signal-meter"
          data-testid="signal-rms"
          data-value={features.rms}
        >
          <span className={`live-dot ${playing ? "playing" : ""}`} />
          <span>{playing ? "SIGNAL AKTIV" : "PAUSIERT"}</span>
          <div className="meter-bars">
            {Array.from({ length: 12 }, (_, i) => (
              <i key={i} className={features.rms * 40 > i ? "lit" : ""} />
            ))}
          </div>
        </div>
        <label className="volume-control">
          <Icon name="volume" size={16} />
          <input
            aria-label="Lautstärke"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={state.volume}
            onChange={(event) => onVolume(Number(event.target.value))}
          />
        </label>
      </div>
    </section>
  );
}
