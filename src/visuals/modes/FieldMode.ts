import * as THREE from "three";
import type { VisualModeInstance } from "./types";
import type { VisualFrame } from "../types";
import type { VisualSettings } from "../../presets/types";
import { noiseGLSL } from "../shaders/noise";
export class FieldMode implements VisualModeInstance {
  readonly scene = new THREE.Scene();
  private geometry = new THREE.PlaneGeometry(2, 2);
  private material: THREE.ShaderMaterial;
  constructor(pattern: string) {
    this.material = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      transparent: true,
      vertexShader:
        "varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}",
      fragmentShader: `
      varying vec2 vUv;
      uniform float uTime,uScale,uDensity,uSymmetry,uComplexity,uRotation,uTurbulence,uSoftness,uBeat,uBass,uMid,uTreble,uAspect,uMix,uSeed;
      uniform vec3 uColor1,uColor2,uColor3;
      ${noiseGLSL}
      const float PI=3.14159265;
      float line(float distance,float width){return 1.0-smoothstep(width,width*2.0,abs(distance));}
      ${pattern}
      void main(){
        vec2 p=(vUv-0.5)*2.0*vec2(max(1.0,uAspect),max(1.0,1.0/uAspect))/uScale;
        float a=uRotation;p=mat2(cos(a),-sin(a),sin(a),cos(a))*p;
        p/=1.0+uBeat*0.10+uBass*0.05;
        float amount=clamp(pattern(p),0.0,1.0);
        float mixValue=(sin(length(p)*3.0+atan(p.y,p.x)+uTime*0.10)+1.0)*0.5;
        vec3 color=mix(uColor1,mix(uColor2,uColor3,smoothstep(0.4,1.0,mixValue)),mixValue*uMix);
        gl_FragColor=vec4(color,amount*0.58);
      }`,
      uniforms: {
        uTime: { value: 0 },
        uScale: { value: 1 },
        uDensity: { value: 0.65 },
        uSymmetry: { value: 1 },
        uComplexity: { value: 4 },
        uRotation: { value: 0 },
        uTurbulence: { value: 0.8 },
        uSoftness: { value: 0.45 },
        uBeat: { value: 0 },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uTreble: { value: 0 },
        uAspect: { value: 9 / 16 },
        uMix: { value: 0.5 },
        uSeed: { value: 2317 },
        uColor1: { value: new THREE.Color() },
        uColor2: { value: new THREE.Color() },
        uColor3: { value: new THREE.Color() },
      },
    });
    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
  }
  update(frame: VisualFrame, s: VisualSettings) {
    const u = this.material.uniforms,
      f = frame.features;
    const values = {
      uTime: frame.time + (s.seed % 10000) * 0.013,
      uScale: s.scale,
      uDensity: s.density,
      uSymmetry: s.symmetry,
      uComplexity: s.complexity,
      uRotation: (s.rotation * Math.PI) / 180,
      uTurbulence: s.turbulence,
      uSoftness: s.softness,
      uBeat: f.beat * s.beatStrength,
      uBass: f.bass * s.bassWeight,
      uMid: f.mid * s.midWeight,
      uTreble: f.treble * s.trebleWeight,
      uAspect: Number(s.aspect.split(":")[0]) / Number(s.aspect.split(":")[1]),
      uMix: s.monochrome ? 0 : s.colorMix,
      uSeed: s.seed % 10000,
    };
    Object.entries(values).forEach(([name, value]) => {
      u[name].value = value;
    });
    u.uColor1.value.set(s.colors[0]);
    u.uColor2.value.set(s.colors[1]);
    u.uColor3.value.set(s.colors[2]);
  }
  reset() {}
  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.clear();
  }
}
