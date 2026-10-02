import { useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import type { VisualSettings } from "../presets/types";
import { ASPECTS, MODE_NAMES } from "../presets/types";
import type { AudioFeatures } from "../audio/types";
import { Icon } from "./Icons";
export function Stage({
  canvasRef,
  settings,
  features,
  playing,
  error,
  lost,
  onRestore,
  onChange,
  locked = false,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  settings: VisualSettings;
  features: AudioFeatures;
  playing: boolean;
  error: string | null;
  lost: boolean;
  onRestore: () => void;
  onChange: (patch: Partial<VisualSettings>) => void;
  locked?: boolean;
}) {
  const [width, height] = settings.aspect.split(":").map(Number);
  const stage = useRef<HTMLElement>(null),
    [fullscreenError, setFullscreenError] = useState<string | null>(null);
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (stage.current?.requestFullscreen)
        await stage.current.requestFullscreen();
      else throw new Error("unsupported");
      setFullscreenError(null);
    } catch {
      setFullscreenError("Vollbild ist in diesem Browser nicht verfügbar.");
    }
  };
  return (
    <section ref={stage} className="stage-panel" aria-label="Vorschau">
      <div className="stage-heading">
        <div>
          <span className="eyebrow">LIVE CANVAS</span>
          <h2>Musik wird Bewegung.</h2>
        </div>
        <span className="stage-format">
          {settings.aspect} <span>·</span>{" "}
          {settings.quality === "high" ? "1080p" : "720p"}
        </span>
      </div>
      <div className="stage-surround">
        <div
          className="canvas-frame"
          style={
            {
              aspectRatio: `${width}/${height}`,
              "--canvas-ratio": width / height,
            } as CSSProperties
          }
        >
          <canvas ref={canvasRef} aria-label="Musikvisualisierung" />
          {error && (
            <div className="stage-error">
              <p role="alert">{error}</p>
              {lost && (
                <button className="secondary-button" onClick={onRestore}>
                  Grafik wiederherstellen
                </button>
              )}
            </div>
          )}
        </div>
        <span className="canvas-caption">
          <span
            className={`beat-dot ${features.beat > 0.2 && playing ? "beat" : ""}`}
          />{" "}
          {MODE_NAMES[settings.mode].toUpperCase()}{" "}
          <span className="caption-divider">/</span> SEED {settings.seed}
        </span>
      </div>
      <div className="stage-tools">
        <label>
          <span>FORMAT</span>
          <select
            aria-label="Seitenverhältnis"
            value={settings.aspect}
            disabled={locked}
            onChange={(event) =>
              onChange({
                aspect: event.target.value as VisualSettings["aspect"],
              })
            }
          >
            {ASPECTS.map((aspect) => (
              <option key={aspect} value={aspect}>
                {aspect}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>QUALITÄT</span>
          <select
            aria-label="Ausgabequalität"
            value={settings.quality}
            disabled={locked}
            onChange={(event) =>
              onChange({
                quality: event.target.value as VisualSettings["quality"],
              })
            }
          >
            <option value="auto">Auto · 720p</option>
            <option value="standard">Standard · 720p</option>
            <option value="high">Hoch · 1080p</option>
          </select>
        </label>
        <button
          className="icon-button"
          aria-label="Vollbild"
          onClick={() => void fullscreen()}
        >
          <Icon name="expand" size={16} />
        </button>
      </div>
      {fullscreenError && (
        <p className="fullscreen-note" role="status">
          {fullscreenError}
        </p>
      )}
      <div className="stage-footer">
        <p>Ein neuer Blick auf deinen Sound.</p>
        <span>
          <Icon name="spark" size={14} /> AUDIOREACTIVE ART
        </span>
      </div>
    </section>
  );
}
