import { FieldMode } from "./FieldMode";
export class SpectralRibbons extends FieldMode {
  constructor() {
    super(`
    float pattern(vec2 p){
      float amount=3.0+floor(uDensity*9.0),result=0.0;
      if(uSymmetry>1.0)p.x=abs(p.x);
      for(int i=0;i<12;i++){
        float n=float(i);if(n>=amount)break;
        float base=(n/(amount-1.0)-.5)*1.85;
        float band=mix(uBass,uTreble,n/(amount-1.0))+.3*uMid;
        float curve=sin(p.x*(2.0+uComplexity*.35)+uTime*.6+n*.45)*(.12+band*.22);
        curve+=sin(p.x*4.0-uTime*.28+n*.6)*uTurbulence*.05;
        curve+=curl(vec3(p*1.4,uTime*.16+n*.1)).x*uTurbulence*.04;
        float dy=p.y-base-curve,width=.006+uSoftness*.012+band*.01;
        result+=line(dy,width)*.6+exp(-dy*dy/(width*.08))*.06;
      }
      return result;
    }`);
  }
}
