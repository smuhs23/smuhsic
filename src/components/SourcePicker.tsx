import { useRef, useState } from "react";
import type { MediaState } from "../audio/MediaController";
import { Icon } from "./Icons";
export function SourcePicker({
  state,
  onFile,
  onDemo,
  onClear,
  locked = false,
}: {
  state: MediaState;
  onFile: (file: File) => void;
  onDemo: () => void;
  onClear: () => void;
  locked?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  return (
    <section className="panel source-panel" aria-labelledby="source-title">
      <div className="section-heading">
        <span className="step">01</span>
        <h2 id="source-title">Dein Sound</h2>
        <span className="tiny-tag">LOKAL</span>
      </div>
      <input
        ref={input}
        className="file-input"
        type="file"
        accept="audio/*,video/mp4,video/webm,video/quicktime"
        aria-label="Audio oder Screenrecording"
        disabled={locked}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
      <button
        className={`dropzone ${dragging ? "dragging" : ""}`}
        disabled={locked || state.status === "loading"}
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!locked) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (file && !locked) onFile(file);
        }}
      >
        <span className="upload-icon">
          <Icon name="upload" size={23} />
        </span>
        <strong>
          {state.status === "loading"
            ? "Datei wird geladen …"
            : "Sound hier ablegen"}
        </strong>
        <span>oder Datei auswählen</span>
        <small>MP3 · WAV · M4A · MP4</small>
      </button>
      <button
        className="demo-button"
        onClick={onDemo}
        disabled={locked || state.status === "loading"}
      >
        <Icon name="spark" /> Erst mal mit Demo ausprobieren <span>↗</span>
      </button>
      {state.name && (
        <div className="source-info">
          <span className="source-dot" />
          <span data-testid="source-name" title={state.name}>
            {state.name}
          </span>
          {state.status === "loading" && <span className="spinner" />}
          <button
            className="icon-button clear-source"
            disabled={locked}
            aria-label={
              state.status === "loading"
                ? "Laden abbrechen"
                : "Quelle entfernen"
            }
            onClick={onClear}
          >
            <Icon name="close" size={13} />
          </button>
        </div>
      )}
      <p className="privacy-note">Deine Datei bleibt auf deinem Gerät.</p>
      {state.error && (
        <p className="error-message" role="alert">
          {state.error}
        </p>
      )}
    </section>
  );
}
