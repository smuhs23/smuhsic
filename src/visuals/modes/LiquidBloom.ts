import { FieldMode } from "./FieldMode";
export class LiquidBloom extends FieldMode {
  constructor() {
    super(`
    float pattern(vec2 p){
      float angle=atan(p.y,p.x);
      if(uSymmetry>1.0){float sector=2.0*PI/uSymmetry;angle=abs(mod(angle+sector*0.5,sector)-sector*0.5);p=vec2(cos(angle),sin(angle))*length(p);}
      p+=curl(vec3(p*(1.3+uComplexity*.18),uTime*.15))*uTurbulence*.18;
      float r=length(p),a=atan(p.y,p.x),result=0.0;
      for(int i=0;i<14;i++){
        float n=float(i);if(n>2.0+uDensity*11.0)break;
        float radius=.13+n*.053+sin(a*(2.0+floor(uComplexity*.5))+uTime*.4+n*.5)*(.04+.02*uMid);
        radius+=sin(a*3.0-uTime*.24+n*.23)*.05;
        float edge=r-radius;
        result+=line(edge,.003+uSoftness*.008)*(.28+.2*sin(n*.4+uTime*.2));
        result+=exp(-edge*edge/(.001+uSoftness*.003))*.035;
      }
      return result*(.8+uTreble*.3);
    }`);
  }
}
