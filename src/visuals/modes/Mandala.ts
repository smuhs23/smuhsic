import { FieldMode } from "./FieldMode";
export class Mandala extends FieldMode {
  constructor() {
    super(`
    float pattern(vec2 p){
      float r=length(p),a=atan(p.y,p.x)+uTime*.05;
      float petals=cos(a*uSymmetry),inner=sin(a*uSymmetry*.5);
      float warp=sin(r*(5.0+uComplexity)+uTime*.25)*uTurbulence*.045;
      float result=0.0;
      for(int i=0;i<12;i++){
        float n=float(i);if(n>2.0+uDensity*9.0)break;
        float radius=.09+n*.066+petals*(.015+n*.004)+inner*.018+warp;
        radius+=sin(uTime*.25+n*.3)*.015;
        result+=line(r-radius,.0025+uSoftness*.005)*.45;
      }
      float spokes=line(sin(a*uSymmetry),.02+uTreble*.06)*smoothstep(.12,.25,r)*(1.0-smoothstep(.55,.85,r))*.18;
      float core=exp(-r*r*80.0)*(.2+uMid*.2);
      return result+spokes+core;
    }`);
  }
}
