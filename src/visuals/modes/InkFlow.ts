import * as THREE from "three";
import type { VisualFrame } from "../types";
import type { VisualSettings } from "../../presets/types";
import { noiseGLSL } from "../shaders/noise";
const THREADS = 1200,
  SEGMENTS = 52;
const vertex = `
attribute float aAlong;attribute vec3 aSeed;
uniform float uTime,uScale,uDensity,uSymmetry,uComplexity,uRotation,uTurbulence,uBeat,uBass,uMid,uTreble,uAspect;
varying float vAlpha,vColor;
${noiseGLSL}
void main(){
  float s=aAlong, u=(s+1.0)*0.5;
  float envelope=pow(max(0.0,sin(u*3.14159)),0.75);
  float theta=aSeed.x*6.28318+s*(1.7+aSeed.y*2.8)+uTime*0.06;
  float radius=pow(aSeed.y,1.5)*0.50*envelope;
  vec2 p=vec2(cos(theta)*radius,s*1.20+sin(theta)*radius*0.55);
  p.x+=sin(s*2.9+aSeed.z*4.0+uTime*0.10)*0.18*envelope;
  vec3 field=vec3(p*(1.8+uComplexity*0.22)+aSeed.z*0.25,uTime*0.16+aSeed.x*0.4);
  p+=curl(field)*(0.12+0.11*uTurbulence)*(0.35+envelope);
  p+=curl(field*2.1+7.0)*0.03*uComplexity*envelope;
  p*=uScale*(1.0+uBass*0.12+uBeat*0.14);
  p.x+=sin(s*8.0+aSeed.x*15.0+uTime)*uTreble*0.025;
  float r=uRotation+sin(uTime*0.05)*0.06+floor(aSeed.x*uSymmetry)*6.28318/uSymmetry;
  p=mat2(cos(r),-sin(r),sin(r),cos(r))*p;
  gl_Position=vec4(p.x/max(1.0,uAspect),p.y*min(1.0,uAspect),0.0,1.0);
  float visible=step(aSeed.x,0.12+uDensity*0.88);
  vAlpha=visible*(0.015+0.05*envelope)*(0.5+0.5*aSeed.z)*(1.0+uMid*0.4);
  vColor=aSeed.y;
}`;
const fragment = `
uniform vec3 uColor1,uColor2,uColor3;uniform float uMix,uSoftness;
varying float vAlpha,vColor;
void main(){
  vec3 c=mix(uColor1,mix(uColor2,uColor3,smoothstep(0.45,1.0,vColor)),vColor*uMix);
  gl_FragColor=vec4(c,vAlpha*(1.1-uSoftness*0.45));
}`;
export class InkFlow {
  readonly scene = new THREE.Scene();
  private geometry = new THREE.BufferGeometry();
  private material = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: 1 },
      uDensity: { value: 0.65 },
      uSymmetry: { value: 1 },
      uComplexity: { value: 4 },
      uRotation: { value: 0 },
      uTurbulence: { value: 0.8 },
      uBeat: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uTreble: { value: 0 },
      uAspect: { value: 9 / 16 },
      uColor1: { value: new THREE.Color() },
      uColor2: { value: new THREE.Color() },
      uColor3: { value: new THREE.Color() },
      uMix: { value: 0 },
      uSoftness: { value: 0.45 },
    },
  });
  private seed = -1;
  constructor() {
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(THREADS * SEGMENTS * 6), 3),
    );
    const along = new Float32Array(THREADS * SEGMENTS * 2);
    for (let i = 0; i < THREADS; i++)
      for (let j = 0; j < SEGMENTS; j++) {
        const n = (i * SEGMENTS + j) * 2;
        along[n] = -1 + (2 * j) / SEGMENTS;
        along[n + 1] = -1 + (2 * (j + 1)) / SEGMENTS;
      }
    this.geometry.setAttribute("aAlong", new THREE.BufferAttribute(along, 1));
    this.geometry.setAttribute(
      "aSeed",
      new THREE.BufferAttribute(
        new Float32Array(THREADS * SEGMENTS * 6),
        3,
      ).setUsage(THREE.DynamicDrawUsage),
    );
    const lines = new THREE.LineSegments(this.geometry, this.material);
    lines.frustumCulled = false;
    this.scene.add(lines);
  }
  private reseed(seed: number) {
    let state = seed >>> 0;
    const random = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
    const attribute = this.geometry.getAttribute(
      "aSeed",
    ) as THREE.BufferAttribute;
    const seeds = attribute.array;
    for (let i = 0; i < THREADS; i++) {
      const a = [random(), random(), random()];
      for (let j = 0; j < SEGMENTS * 2; j++)
        seeds.set(a, (i * SEGMENTS * 2 + j) * 3);
    }
    attribute.needsUpdate = true;
    this.seed = seed;
  }
  update(frame: VisualFrame, settings: VisualSettings) {
    const detail = Math.max(0.5, Math.min(1, frame.detail ?? 1));
    this.geometry.setDrawRange(
      0,
      Math.floor(THREADS * detail * detail) * SEGMENTS * 2,
    );
    if (this.seed !== settings.seed) this.reseed(settings.seed);
    const u = this.material.uniforms,
      f = frame.features;
    u.uTime.value = frame.time;
    u.uScale.value = settings.scale;
    u.uDensity.value = settings.density;
    u.uSymmetry.value = settings.symmetry;
    u.uComplexity.value = settings.complexity;
    u.uRotation.value = (settings.rotation * Math.PI) / 180;
    u.uTurbulence.value = settings.turbulence;
    u.uBeat.value = f.beat * settings.beatStrength;
    u.uBass.value = f.bass * settings.bassWeight;
    u.uMid.value = f.mid * settings.midWeight;
    u.uTreble.value = f.treble * settings.trebleWeight;
    u.uAspect.value =
      Number(settings.aspect.split(":")[0]) /
      Number(settings.aspect.split(":")[1]);
    u.uColor1.value.set(settings.colors[0]);
    u.uColor2.value.set(settings.colors[1]);
    u.uColor3.value.set(settings.colors[2]);
    u.uMix.value = settings.monochrome ? 0 : settings.colorMix;
    u.uSoftness.value = settings.softness;
  }
  reset() {}
  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.clear();
  }
}
