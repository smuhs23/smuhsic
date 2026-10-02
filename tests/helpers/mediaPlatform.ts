export class FakeElement extends EventTarget {
  src = "";
  currentTime = 0;
  duration = 10;
  readyState = 0;
  paused = true;
  ended = false;
  volume = 1;
  loop = false;
  preload = "";
  playsInline = true;
  rejectPlay = false;
  removed = false;
  load() {}
  pause() {
    this.paused = true;
    this.dispatchEvent(new Event("pause"));
  }
  async play() {
    if (this.rejectPlay) throw new Error("blocked");
    this.paused = false;
    this.dispatchEvent(new Event("play"));
  }
  remove() {
    this.removed = true;
  }
  removeAttribute() {
    this.src = "";
  }
  ready(duration = 10) {
    this.duration = duration;
    this.readyState = 2;
    this.dispatchEvent(new Event("loadedmetadata"));
  }
}
class GraphNode {
  input: GraphNode | null = null;
  gain = { value: 1 };
  source = false;
  connect(next: GraphNode) {
    next.input = this;
    return next;
  }
  disconnect() {}
  signal(): number {
    return this.source ? 0.5 : (this.input?.signal() ?? 0) * this.gain.value;
  }
}
class FakeContext extends EventTarget {
  state = "suspended";
  sampleRate = 44100;
  destination = new GraphNode();
  async resume() {
    this.state = "running";
    this.dispatchEvent(new Event("statechange"));
  }
  async close() {
    this.state = "closed";
  }
  createMediaElementSource() {
    const node = new GraphNode();
    node.source = true;
    return node;
  }
  createGain() {
    return new GraphNode();
  }
  createMediaStreamDestination() {
    return Object.assign(new GraphNode(), {
      stream: { getAudioTracks: () => [], getTracks: () => [] },
    });
  }
  createAnalyser() {
    return Object.assign(new GraphNode(), {
      fftSize: 2048,
      frequencyBinCount: 1024,
      smoothingTimeConstant: 0,
      minDecibels: -100,
      maxDecibels: -10,
      getFloatFrequencyData(this: GraphNode, out: Float32Array) {
        out.fill(20 * Math.log10(Math.max(1e-8, this.signal())));
      },
      getFloatTimeDomainData(this: GraphNode, out: Float32Array) {
        out.fill(this.signal());
      },
    });
  }
}
export function mediaPlatform() {
  const elements: FakeElement[] = [],
    revoked: string[] = [];
  let urls = 0;
  const context = new FakeContext();
  const platform = {
    createElement: () => {
      const e = new FakeElement();
      elements.push(e);
      return e as unknown as HTMLMediaElement;
    },
    createContext: () => context as unknown as AudioContext,
    createUrl: () => `blob:${++urls}`,
    revokeUrl: (url: string) => revoked.push(url),
  };
  return { platform, elements, revoked, context };
}
