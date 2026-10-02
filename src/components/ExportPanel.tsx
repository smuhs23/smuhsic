import type { RecordingState } from "../export/Recorder";
import type { RecordingFormat } from "../export/formats";
import { formatTime } from "./Transport";
import { Icon } from "./Icons";
export function ExportPanel({
  state,
  message,
  format,
  capable,
  ready,
  elapsed,
  success,
  onStart,
  onStop,
  onAbort,
}: {
  state: RecordingState;
  message: string | null;
  format: RecordingFormat | undefined;
  capable: boolean;
  ready: boolean;
  elapsed: number;
  success: boolean;
  onStart: () => void;
  onStop: () => void;
  onAbort: () => void;
}) {
  const busy = ["starting", "recording", "stopping"].includes(state);
  return (
    <section
      className={`export-panel ${busy ? "is-recording" : ""}`}
      aria-label="Videoexport"
    >
      <div className="export-row">
        <div className="export-copy">
          <span className="eyebrow">
            {busy ? "AUFNAHME LÄUFT" : "DEIN VIDEO"}
          </span>
          <p>
            {busy ? (
              <>
                <span className="record-dot" /> {formatTime(elapsed)}{" "}
                <span>/ 5:00</span>
              </>
            ) : (
              "Nimm den Moment mit."
            )}
          </p>
        </div>
        <div className="export-buttons">
          {busy ? (
            <>
              <button
                className="record-stop"
                onClick={onStop}
                disabled={state !== "recording"}
                aria-label="Aufnahme stoppen"
              >
                <span /> Stop
              </button>
              <button
                className="icon-button"
                onClick={onAbort}
                aria-label="Aufnahme abbrechen"
              >
                <Icon name="close" size={16} />
              </button>
            </>
          ) : (
            <button
              className="record-button"
              onClick={onStart}
              disabled={!capable || !ready}
              aria-label="Video aufnehmen"
            >
              <Icon name="download" size={16} /> Video aufnehmen{" "}
              <small>{format?.extension.toUpperCase()}</small>
            </button>
          )}
        </div>
      </div>
      {!capable ? (
        <p className="export-note">
          Dieser Browser unterstützt keine Videoaufnahme mit Ton. Nutze einen
          aktuellen Browser mit Canvas-Aufnahme.
        </p>
      ) : (
        <p className="export-note">
          {state === "stopping"
            ? "Video wird abgeschlossen …"
            : state === "starting"
              ? "Bild und Ton werden vorbereitet …"
              : "Echtzeit · ab aktueller Position · 30 FPS · nach 5 Minuten automatisch fertig"}
        </p>
      )}
      {message && (
        <p
          className={state === "error" ? "error-message" : "export-note"}
          role={state === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      )}
      {success && (
        <p className="export-success" role="status">
          Video ist bereit.
        </p>
      )}
    </section>
  );
}
