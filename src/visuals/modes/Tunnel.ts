import { FieldMode } from "./FieldMode";
export class Tunnel extends FieldMode {
  constructor() {
    super(`
    float pattern(vec2 p){
      vec2 center=vec2(sin(uTime*.19),cos(uTime*.13))*uTurbulence*.14;
      float result=0.0;
      for(int i=0;i<24;i++){
        float n=float(i);if(n>5.0+uDensity*18.0)break;
        float z=fract(n/(6.0+uDensity*18.0)-uTime*.09);
        float radius=.07+pow(z,2.0)*2.8;
        vec2 q=p-center*(1.0-z);float a=atan(q.y,q.x);
        float twist=sin(a*max(1.0,uSymmetry)+uTime*.12+z*uComplexity)*uTurbulence*.012;
        result+=line(length(q)-radius-twist,.003+z*.006+uSoftness*.006)*(1.0-z)*.7;
      }
      return result*(.85+uMid*.3+uTreble*.25);
    }`);
  }
}
