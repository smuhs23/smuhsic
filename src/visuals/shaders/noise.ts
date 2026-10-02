// Smooth, seeded value noise and its curl. Curl keeps the flow gently circulating.
export const noiseGLSL = `
float hash31(vec3 p){p=fract(p*0.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise3(vec3 p){
  vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x),mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x),mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),f.z);
}
vec2 curl(vec3 p){
  float e=0.03;
  return vec2(noise3(p+vec3(0,e,0))-noise3(p-vec3(0,e,0)),noise3(p-vec3(e,0,0))-noise3(p+vec3(e,0,0)))/(2.0*e);
}
`;
