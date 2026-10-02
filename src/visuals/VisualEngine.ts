import * as THREE from "three";
import type { VisualSettings } from "../presets/types";
import { defaultSettings } from "../presets/defaults";
import type { EngineEvent, VisualFrame } from "./types";
import { AdaptiveQuality, outputSize } from "./quality";
import { createMode } from "./modes";
import type { VisualModeInstance } from "./modes/types";
const screenVertex = `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`;
export class VisualEngine {
  private renderer: THREE.WebGLRenderer;
  private restoreExtension: WEBGL_lose_context | null;
  private camera = new THREE.Camera();
  private screen = new THREE.Scene();
  private quad: THREE.Mesh;
  private feedback: THREE.ShaderMaterial;
  private copy: THREE.ShaderMaterial;
  private targets: THREE.WebGLRenderTarget[] = [];
  private mode: VisualModeInstance;
  private settings = defaultSettings();
  private quality = new AdaptiveQuality();
  private dirty = true;
  private clear = true;
  private lost = false;
  private disposed = false;
  private index = 0;
  private visualTime = 0;
  constructor(
    private canvas: HTMLCanvasElement,
    private notify: (event: EngineEvent) => void,
  ) {
    const context = canvas.getContext("webgl2", {
      alpha: false,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    if (!context)
      throw new Error(
        "WebGL 2 ist nicht verfügbar. Öffne 2317 in einem aktuellen Browser mit aktivierter Grafikbeschleunigung.",
      );
    this.restoreExtension = context.getExtension("WEBGL_lose_context");
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      context,
      alpha: false,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(1);
    this.renderer.autoClear = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.mode = createMode(this.settings.mode, this.renderer);
    this.feedback = new THREE.ShaderMaterial({
      vertexShader: screenVertex,
      fragmentShader: `varying vec2 vUv;uniform sampler2D previous;uniform vec3 background;uniform float persistence;void main(){gl_FragColor=vec4(mix(background,texture2D(previous,vUv).rgb,persistence),1.0);}`,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        previous: { value: null },
        background: { value: new THREE.Color("#ffffff") },
        persistence: { value: 0.84 },
      },
    });
    this.copy = new THREE.ShaderMaterial({
      vertexShader: screenVertex,
      fragmentShader: `varying vec2 vUv;uniform sampler2D image;void main(){gl_FragColor=texture2D(image,vUv);#include <colorspace_fragment>\n}`,
      depthTest: false,
      depthWrite: false,
      uniforms: { image: { value: null } },
    });
    // Shader chunks require a separate line for preprocessing.
    this.copy.fragmentShader = this.copy.fragmentShader.replace(
      ";#include",
      ";\n#include",
    );
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.copy);
    this.quad.frustumCulled = false;
    this.screen.add(this.quad);
    canvas.addEventListener("webglcontextlost", this.onLost);
    canvas.addEventListener("webglcontextrestored", this.onRestored);
    this.resize();
  }
  private onLost = (event: Event) => {
    event.preventDefault();
    this.lost = true;
    this.notify({
      type: "context-lost",
      message: "Die Grafik wurde unterbrochen. Du kannst sie wiederherstellen.",
    });
  };
  private onRestored = () => {
    if (this.disposed) return;
    this.lost = false;
    this.restoreExtension = this.renderer.getContext().getExtension("WEBGL_lose_context");
    this.mode.dispose();
    this.mode = createMode(this.settings.mode, this.renderer);
    this.resize();
    this.reset();
    this.notify({ type: "restored" });
  };
  private resize() {
    const { width, height } = this.getOutputSize();
    this.renderer.setSize(width, height, false);
    this.targets.forEach((target) => target.dispose());
    const scale = this.settings.quality === "auto" ? this.quality.scale : 1;
    this.targets = [0, 1].map(
      () =>
        new THREE.WebGLRenderTarget(
          Math.round(width * scale),
          Math.round(height * scale),
          { depthBuffer: false, stencilBuffer: false },
        ),
    );
    this.index = 0;
    this.clear = true;
    this.dirty = true;
  }
  getOutputSize() {
    return outputSize(this.settings.aspect, this.settings.quality);
  }
  setSettings(settings: VisualSettings) {
    const resize =
      settings.aspect !== this.settings.aspect ||
      settings.quality !== this.settings.quality;
    const reset =
      settings.seed !== this.settings.seed ||
      settings.background !== this.settings.background;
    if (settings.mode !== this.settings.mode) {
      this.mode.dispose();
      this.mode = createMode(settings.mode, this.renderer);
      this.reset();
    }
    this.settings = { ...settings, colors: [...settings.colors] };
    this.dirty = true;
    if (resize) {
      this.quality.reset();
      this.resize();
    }
    if (reset) this.reset();
  }
  render(frame: VisualFrame) {
    if (this.disposed || this.lost || (!frame.playing && !this.dirty)) return;
    if (frame.playing) {
      this.visualTime += Math.min(frame.delta, 0.1) * this.settings.speed;
      if (this.settings.quality === "auto" && this.quality.sample(frame.delta))
        this.resize();
    }
    if (this.clear) {
      this.renderer.setClearColor(this.settings.background, 1);
      this.targets.forEach((target) => {
        this.renderer.setRenderTarget(target);
        this.renderer.clear(true, false, false);
      });
      this.clear = false;
    }
    const next = 1 - this.index;
    this.feedback.uniforms.previous.value = this.targets[this.index].texture;
    this.feedback.uniforms.background.value.set(this.settings.background);
    this.feedback.uniforms.persistence.value = frame.playing
      ? Math.pow(this.settings.trails, Math.max(0.1, frame.delta * 60))
      : 0;
    this.quad.material = this.feedback;
    this.renderer.setRenderTarget(this.targets[next]);
    this.renderer.render(this.screen, this.camera);
    this.mode.update(
      {
        ...frame,
        time: this.visualTime,
        detail: this.settings.quality === "auto" ? this.quality.scale : 1,
      },
      this.settings,
    );
    this.renderer.render(this.mode.scene, this.camera);
    this.copy.uniforms.image.value = this.targets[next].texture;
    this.quad.material = this.copy;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.screen, this.camera);
    this.index = next;
    this.dirty = false;
  }
  reset() {
    this.visualTime = 0;
    this.clear = true;
    this.dirty = true;
    this.mode.reset();
  }
  restore() {
    if (!this.disposed && this.lost) this.restoreExtension?.restoreContext();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.canvas.removeEventListener("webglcontextlost", this.onLost);
    this.canvas.removeEventListener("webglcontextrestored", this.onRestored);
    this.mode.dispose();
    this.targets.forEach((target) => target.dispose());
    this.quad.geometry.dispose();
    this.feedback.dispose();
    this.copy.dispose();
    this.renderer.dispose();
  }
}
