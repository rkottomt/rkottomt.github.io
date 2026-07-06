/* ============================================================
   hero-backgrounds.js — random hero background per page load.
   Seven effects ported (not copied) from ReactBits (MIT):
   Waves, DotGrid (canvas2D) + Galaxy, FaultyTerminal, LineWaves,
   FloatingLines, Dither (WebGL via OGL). Recolored to the site's
   black + navy/white palette. A shuffle button swaps them live.
   ============================================================ */

const PALETTE = {
  navy: '#2a4a9c',
  navyDark: '#1b2540',
  light: '#8fa6ff',
  white: '#ffffff'
};

const DPR = Math.min(window.devicePixelRatio || 1, 2);
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hoverCapable = window.matchMedia('(hover: hover)').matches;
const MOUSE = hoverCapable && !prefersReduced;

function hexToRgb01(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255
  ];
}

/* ==================== OGL shared helper ==================== */
let OGL = null;

const VERT = 'attribute vec2 uv;attribute vec2 position;varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position,0.0,1.0);}';

function oglEffect(container, cfg) {
  const renderer = new OGL.Renderer({ alpha: !cfg.opaque, premultipliedAlpha: false, dpr: DPR });
  const gl = renderer.gl;
  if (cfg.opaque) {
    gl.clearColor(0, 0, 0, 1);
  } else {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
  }

  const geometry = new OGL.Triangle(gl);
  const program = new OGL.Program(gl, { vertex: VERT, fragment: cfg.fragment, uniforms: cfg.uniforms });
  const mesh = new OGL.Mesh(gl, { geometry, program });

  const target = { x: 0.5, y: 0.5 };
  const smooth = { x: 0.5, y: 0.5 };
  let activeTarget = 0, activeSmooth = 0, raf = null;

  function resize() {
    renderer.setSize(container.offsetWidth || window.innerWidth, container.offsetHeight || window.innerHeight);
    if (cfg.onResize) cfg.onResize(gl, program);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();
  container.appendChild(gl.canvas);

  function onMove(e) {
    const r = container.getBoundingClientRect();
    target.x = (e.clientX - r.left) / r.width;
    target.y = 1 - (e.clientY - r.top) / r.height;
    activeTarget = 1;
  }
  function onLeave() { activeTarget = 0; }
  if (MOUSE) {
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    smooth.x += (target.x - smooth.x) * 0.05;
    smooth.y += (target.y - smooth.y) * 0.05;
    activeSmooth += (activeTarget - activeSmooth) * 0.05;
    cfg.onFrame(now * 0.001, program, smooth, activeSmooth, gl);
    renderer.render({ scene: mesh });
  }

  // Draw one frame immediately; only loop if motion is allowed.
  cfg.onFrame(0, program, smooth, 0, gl);
  renderer.render({ scene: mesh });
  if (!prefersReduced) raf = requestAnimationFrame(frame);

  return {
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      if (MOUSE) {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseleave', onLeave);
      }
      if (gl.canvas.parentElement === container) container.removeChild(gl.canvas);
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    }
  };
}

/* ==================== GALAXY ==================== */
const galaxyFrag = `
precision highp float;
uniform float uTime;
uniform vec3 uResolution;
uniform vec2 uFocal;
uniform vec2 uRotation;
uniform float uStarSpeed;
uniform float uDensity;
uniform float uHueShift;
uniform float uSpeed;
uniform vec2 uMouse;
uniform float uGlowIntensity;
uniform float uSaturation;
uniform bool uMouseRepulsion;
uniform float uTwinkleIntensity;
uniform float uRotationSpeed;
uniform float uRepulsionStrength;
uniform float uMouseActiveFactor;
uniform float uAutoCenterRepulsion;
uniform bool uTransparent;
varying vec2 vUv;
#define NUM_LAYER 4.0
#define STAR_COLOR_CUTOFF 0.2
#define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
#define PERIOD 3.0
float Hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float tri(float x){return abs(fract(x)*2.0-1.0);}
float tris(float x){float t=fract(x);return 1.0-smoothstep(0.0,1.0,abs(2.0*t-1.0));}
float trisn(float x){float t=fract(x);return 2.0*(1.0-smoothstep(0.0,1.0,abs(2.0*t-1.0)))-1.0;}
vec3 hsv2rgb(vec3 c){vec4 K=vec4(1.0,2.0/3.0,1.0/3.0,3.0);vec3 p=abs(fract(c.xxx+K.xyz)*6.0-K.www);return c.z*mix(K.xxx,clamp(p-K.xxx,0.0,1.0),c.y);}
float Star(vec2 uv,float flare){float d=length(uv);float m=(0.05*uGlowIntensity)/d;float rays=smoothstep(0.0,1.0,1.0-abs(uv.x*uv.y*1000.0));m+=rays*flare*uGlowIntensity;uv*=MAT45;rays=smoothstep(0.0,1.0,1.0-abs(uv.x*uv.y*1000.0));m+=rays*0.3*flare*uGlowIntensity;m*=smoothstep(1.0,0.2,d);return m;}
vec3 StarLayer(vec2 uv){vec3 col=vec3(0.0);vec2 gv=fract(uv)-0.5;vec2 id=floor(uv);
for(int y=-1;y<=1;y++){for(int x=-1;x<=1;x++){vec2 offset=vec2(float(x),float(y));vec2 si=id+vec2(float(x),float(y));float seed=Hash21(si);float size=fract(seed*345.32);float glossLocal=tri(uStarSpeed/(PERIOD*seed+1.0));float flareSize=smoothstep(0.9,1.0,size)*glossLocal;
float red=smoothstep(STAR_COLOR_CUTOFF,1.0,Hash21(si+1.0))+STAR_COLOR_CUTOFF;float blu=smoothstep(STAR_COLOR_CUTOFF,1.0,Hash21(si+3.0))+STAR_COLOR_CUTOFF;float grn=min(red,blu)*seed;vec3 base=vec3(red,grn,blu);
float hue=atan(base.g-base.r,base.b-base.r)/(2.0*3.14159)+0.5;hue=fract(hue+uHueShift/360.0);float sat=length(base-vec3(dot(base,vec3(0.299,0.587,0.114))))*uSaturation;float val=max(max(base.r,base.g),base.b);base=hsv2rgb(vec3(hue,sat,val));
vec2 pad=vec2(tris(seed*34.0+uTime*uSpeed/10.0),tris(seed*38.0+uTime*uSpeed/30.0))-0.5;
float star=Star(gv-offset-pad,flareSize);vec3 color=base;float twinkle=trisn(uTime*uSpeed+seed*6.2831)*0.5+1.0;twinkle=mix(1.0,twinkle,uTwinkleIntensity);star*=twinkle;col+=star*size*color;}}return col;}
void main(){vec2 focalPx=uFocal*uResolution.xy;vec2 uv=(vUv*uResolution.xy-focalPx)/uResolution.y;vec2 mouseNorm=uMouse-vec2(0.5);
if(uAutoCenterRepulsion>0.0){vec2 centerUV=vec2(0.0,0.0);float centerDist=length(uv-centerUV);vec2 repulsion=normalize(uv-centerUV)*(uAutoCenterRepulsion/(centerDist+0.1));uv+=repulsion*0.05;}else if(uMouseRepulsion){vec2 mousePosUV=(uMouse*uResolution.xy-focalPx)/uResolution.y;float mouseDist=length(uv-mousePosUV);vec2 repulsion=normalize(uv-mousePosUV)*(uRepulsionStrength/(mouseDist+0.1));uv+=repulsion*0.05*uMouseActiveFactor;}else{vec2 mouseOffset=mouseNorm*0.1*uMouseActiveFactor;uv+=mouseOffset;}
float autoRotAngle=uTime*uRotationSpeed;mat2 autoRot=mat2(cos(autoRotAngle),-sin(autoRotAngle),sin(autoRotAngle),cos(autoRotAngle));uv=autoRot*uv;uv=mat2(uRotation.x,-uRotation.y,uRotation.y,uRotation.x)*uv;
vec3 col=vec3(0.0);for(float i=0.0;i<1.0;i+=1.0/NUM_LAYER){float depth=fract(i+uStarSpeed*uSpeed);float scale=mix(20.0*uDensity,0.5*uDensity,depth);float fade=depth*smoothstep(1.0,0.9,depth);col+=StarLayer(uv*scale+i*453.32)*fade;}
if(uTransparent){float alpha=length(col);alpha=smoothstep(0.0,0.3,alpha);alpha=min(alpha,1.0);gl_FragColor=vec4(col,alpha);}else{gl_FragColor=vec4(col,1.0);}}
`;

function createGalaxy(container) {
  const starSpeed = 0.4;
  const uniforms = {
    uTime: { value: 0 },
    uResolution: { value: [1, 1, 1] },
    uFocal: { value: [0.5, 0.5] },
    uRotation: { value: [1.0, 0.0] },
    uStarSpeed: { value: starSpeed },
    uDensity: { value: 1.1 },
    uHueShift: { value: 0 },
    uSpeed: { value: 0.9 },
    uMouse: { value: [0.5, 0.5] },
    uGlowIntensity: { value: 0.32 },
    uSaturation: { value: 0.0 },
    uMouseRepulsion: { value: true },
    uTwinkleIntensity: { value: 0.35 },
    uRotationSpeed: { value: 0.08 },
    uRepulsionStrength: { value: 2.0 },
    uMouseActiveFactor: { value: 0.0 },
    uAutoCenterRepulsion: { value: 0.0 },
    uTransparent: { value: true }
  };
  return oglEffect(container, {
    fragment: galaxyFrag,
    uniforms,
    opaque: false,
    onResize(gl, program) {
      program.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height];
    },
    onFrame(t, program, smooth, active) {
      program.uniforms.uTime.value = t;
      program.uniforms.uStarSpeed.value = (t * starSpeed) / 10.0;
      program.uniforms.uMouse.value[0] = smooth.x;
      program.uniforms.uMouse.value[1] = smooth.y;
      program.uniforms.uMouseActiveFactor.value = active;
    }
  });
}

/* ==================== FAULTY TERMINAL ==================== */
const faultyFrag = `
precision mediump float;
varying vec2 vUv;
uniform float iTime;
uniform vec3 iResolution;
uniform float uScale;
uniform vec2 uGridMul;
uniform float uDigitSize;
uniform float uScanlineIntensity;
uniform float uGlitchAmount;
uniform float uFlickerAmount;
uniform float uNoiseAmp;
uniform float uChromaticAberration;
uniform float uDither;
uniform float uCurvature;
uniform vec3 uTint;
uniform vec2 uMouse;
uniform float uMouseStrength;
uniform float uUseMouse;
uniform float uPageLoadProgress;
uniform float uUsePageLoadAnimation;
uniform float uBrightness;
float time;
float hash21(vec2 p){p=fract(p*234.56);p+=dot(p,p+34.56);return fract(p.x*p.y);}
float noise(vec2 p){return sin(p.x*10.0)*sin(p.y*(3.0+sin(time*0.090909)))+0.2;}
mat2 rotate(float angle){float c=cos(angle);float s=sin(angle);return mat2(c,-s,s,c);}
float fbm(vec2 p){p*=1.1;float f=0.0;float amp=0.5*uNoiseAmp;mat2 modify0=rotate(time*0.02);f+=amp*noise(p);p=modify0*p*2.0;amp*=0.454545;mat2 modify1=rotate(time*0.02);f+=amp*noise(p);p=modify1*p*2.0;amp*=0.454545;mat2 modify2=rotate(time*0.08);f+=amp*noise(p);return f;}
float pattern(vec2 p,out vec2 q,out vec2 r){vec2 offset1=vec2(1.0);vec2 offset0=vec2(0.0);mat2 rot01=rotate(0.1*time);mat2 rot1=rotate(0.1);q=vec2(fbm(p+offset1),fbm(rot01*p+offset1));r=vec2(fbm(rot1*q+offset0),fbm(q+offset0));return fbm(p+r);}
float digit(vec2 p){vec2 grid=uGridMul*15.0;vec2 s=floor(p*grid)/grid;p=p*grid;vec2 q,r;float intensity=pattern(s*0.1,q,r)*1.3-0.03;
if(uUseMouse>0.5){vec2 mouseWorld=uMouse*uScale;float distToMouse=distance(s,mouseWorld);float mouseInfluence=exp(-distToMouse*8.0)*uMouseStrength*10.0;intensity+=mouseInfluence;float ripple=sin(distToMouse*20.0-iTime*5.0)*0.1*mouseInfluence;intensity+=ripple;}
if(uUsePageLoadAnimation>0.5){float cellRandom=fract(sin(dot(s,vec2(12.9898,78.233)))*43758.5453);float cellDelay=cellRandom*0.8;float cellProgress=clamp((uPageLoadProgress-cellDelay)/0.2,0.0,1.0);float fadeAlpha=smoothstep(0.0,1.0,cellProgress);intensity*=fadeAlpha;}
p=fract(p);p*=uDigitSize;float px5=p.x*5.0;float py5=(1.0-p.y)*5.0;float x=fract(px5);float y=fract(py5);float i=floor(py5)-2.0;float j=floor(px5)-2.0;float n=i*i+j*j;float f=n*0.0625;float isOn=step(0.1,intensity-f);float brightness=isOn*(0.2+y*0.8)*(0.75+x*0.25);return step(0.0,p.x)*step(p.x,1.0)*step(0.0,p.y)*step(p.y,1.0)*brightness;}
float onOff(float a,float b,float c){return step(c,sin(iTime+a*cos(iTime*b)))*uFlickerAmount;}
float displace(vec2 look){float y=look.y-mod(iTime*0.25,1.0);float window=1.0/(1.0+50.0*y*y);return sin(look.y*20.0+iTime)*0.0125*onOff(4.0,2.0,0.8)*(1.0+cos(iTime*60.0))*window;}
vec3 getColor(vec2 p){float bar=step(mod(p.y+time*20.0,1.0),0.2)*0.4+1.0;bar*=uScanlineIntensity;float displacement=displace(p);p.x+=displacement;if(uGlitchAmount!=1.0){float extra=displacement*(uGlitchAmount-1.0);p.x+=extra;}float middle=digit(p);const float off=0.002;float sum=digit(p+vec2(-off,-off))+digit(p+vec2(0.0,-off))+digit(p+vec2(off,-off))+digit(p+vec2(-off,0.0))+digit(p+vec2(0.0,0.0))+digit(p+vec2(off,0.0))+digit(p+vec2(-off,off))+digit(p+vec2(0.0,off))+digit(p+vec2(off,off));vec3 baseColor=vec3(0.9)*middle+sum*0.1*vec3(1.0)*bar;return baseColor;}
vec2 barrel(vec2 uv){vec2 c=uv*2.0-1.0;float r2=dot(c,c);c*=1.0+uCurvature*r2;return c*0.5+0.5;}
void main(){time=iTime*0.333333;vec2 uv=vUv;if(uCurvature!=0.0){uv=barrel(uv);}vec2 p=uv*uScale;vec3 col=getColor(p);if(uChromaticAberration!=0.0){vec2 ca=vec2(uChromaticAberration)/iResolution.xy;col.r=getColor(p+ca).r;col.b=getColor(p-ca).b;}col*=uTint;col*=uBrightness;if(uDither>0.0){float rnd=hash21(gl_FragCoord.xy);col+=(rnd-0.5)*(uDither*0.003922);}gl_FragColor=vec4(col,1.0);}
`;

function createFaultyTerminal(container) {
  const timeOffset = Math.random() * 100;
  const timeScale = 0.3;
  const tint = hexToRgb01(PALETTE.light);
  const uniforms = {
    iTime: { value: 0 },
    iResolution: { value: [1, 1, 1] },
    uScale: { value: 1.0 },
    uGridMul: { value: [2, 1] },
    uDigitSize: { value: 1.5 },
    uScanlineIntensity: { value: 0.4 },
    uGlitchAmount: { value: 1 },
    uFlickerAmount: { value: 1 },
    uNoiseAmp: { value: 1 },
    uChromaticAberration: { value: 0 },
    uDither: { value: 0 },
    uCurvature: { value: 0.1 },
    uTint: { value: tint },
    uMouse: { value: [0.5, 0.5] },
    uMouseStrength: { value: 0.2 },
    uUseMouse: { value: MOUSE ? 1 : 0 },
    uPageLoadProgress: { value: 1 },
    uUsePageLoadAnimation: { value: 0 },
    uBrightness: { value: 0.9 }
  };
  return oglEffect(container, {
    fragment: faultyFrag,
    uniforms,
    opaque: true,
    onResize(gl, program) {
      program.uniforms.iResolution.value = [gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height];
    },
    onFrame(t, program, smooth) {
      program.uniforms.iTime.value = (t + timeOffset) * timeScale;
      program.uniforms.uMouse.value[0] = smooth.x;
      program.uniforms.uMouse.value[1] = smooth.y;
    }
  });
}

/* ==================== LINE WAVES ==================== */
const lineWavesFrag = `
precision highp float;
uniform float uTime;
uniform vec3 uResolution;
uniform float uSpeed;
uniform float uInnerLines;
uniform float uOuterLines;
uniform float uWarpIntensity;
uniform float uRotation;
uniform float uEdgeFadeWidth;
uniform float uColorCycleSpeed;
uniform float uBrightness;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec2 uMouse;
uniform float uMouseInfluence;
uniform bool uEnableMouse;
#define HALF_PI 1.5707963
float hashF(float n){return fract(sin(n*127.1)*43758.5453123);}
float smoothNoise(float x){float i=floor(x);float f=fract(x);float u=f*f*(3.0-2.0*f);return mix(hashF(i),hashF(i+1.0),u);}
float displaceA(float coord,float t){float result=sin(coord*2.123)*0.2;result+=sin(coord*3.234+t*4.345)*0.1;result+=sin(coord*0.589+t*0.934)*0.5;return result;}
float displaceB(float coord,float t){float result=sin(coord*1.345)*0.3;result+=sin(coord*2.734+t*3.345)*0.2;result+=sin(coord*0.189+t*0.934)*0.3;return result;}
vec2 rotate2D(vec2 p,float angle){float c=cos(angle);float s=sin(angle);return vec2(p.x*c-p.y*s,p.x*s+p.y*c);}
void main(){vec2 coords=gl_FragCoord.xy/uResolution.xy;coords=coords*2.0-1.0;coords=rotate2D(coords,uRotation);float halfT=uTime*uSpeed*0.5;float fullT=uTime*uSpeed;float mouseWarp=0.0;if(uEnableMouse){vec2 mPos=rotate2D(uMouse*2.0-1.0,uRotation);float mDist=length(coords-mPos);mouseWarp=uMouseInfluence*exp(-mDist*mDist*4.0);}
float warpAx=coords.x+displaceA(coords.y,halfT)*uWarpIntensity+mouseWarp;float warpAy=coords.y-displaceA(coords.x*cos(fullT)*1.235,halfT)*uWarpIntensity;float warpBx=coords.x+displaceB(coords.y,halfT)*uWarpIntensity+mouseWarp;float warpBy=coords.y-displaceB(coords.x*sin(fullT)*1.235,halfT)*uWarpIntensity;
vec2 fieldA=vec2(warpAx,warpAy);vec2 fieldB=vec2(warpBx,warpBy);vec2 blended=mix(fieldA,fieldB,mix(fieldA,fieldB,0.5));
float fadeTop=smoothstep(uEdgeFadeWidth,uEdgeFadeWidth+0.4,blended.y);float fadeBottom=smoothstep(-uEdgeFadeWidth,-(uEdgeFadeWidth+0.4),blended.y);float vMask=1.0-max(fadeTop,fadeBottom);
float tileCount=mix(uOuterLines,uInnerLines,vMask);float scaledY=blended.y*tileCount;float nY=smoothNoise(abs(scaledY));
float ridge=pow(step(abs(nY-blended.x)*2.0,HALF_PI)*cos(2.0*(nY-blended.x)),5.0);
float lines=0.0;for(float i=1.0;i<3.0;i+=1.0){lines+=pow(max(fract(scaledY),fract(-scaledY)),i*2.0);}
float pattern=vMask*lines;float cycleT=fullT*uColorCycleSpeed;float rChannel=(pattern+lines*ridge)*(cos(blended.y+cycleT*0.234)*0.5+1.0);float gChannel=(pattern+vMask*ridge)*(sin(blended.x+cycleT*1.745)*0.5+1.0);float bChannel=(pattern+lines*ridge)*(cos(blended.x+cycleT*0.534)*0.5+1.0);
vec3 col=(rChannel*uColor1+gChannel*uColor2+bChannel*uColor3)*uBrightness;float alpha=clamp(length(col),0.0,1.0);gl_FragColor=vec4(col,alpha);}
`;

function createLineWaves(container) {
  const uniforms = {
    uTime: { value: 0 },
    uResolution: { value: [1, 1, 1] },
    uSpeed: { value: 0.3 },
    uInnerLines: { value: 32.0 },
    uOuterLines: { value: 36.0 },
    uWarpIntensity: { value: 1.0 },
    uRotation: { value: (-45 * Math.PI) / 180 },
    uEdgeFadeWidth: { value: 0.0 },
    uColorCycleSpeed: { value: 0.6 },
    uBrightness: { value: 0.28 },
    uColor1: { value: hexToRgb01(PALETTE.white) },
    uColor2: { value: hexToRgb01(PALETTE.navy) },
    uColor3: { value: hexToRgb01(PALETTE.light) },
    uMouse: { value: [0.5, 0.5] },
    uMouseInfluence: { value: 2.0 },
    uEnableMouse: { value: MOUSE }
  };
  return oglEffect(container, {
    fragment: lineWavesFrag,
    uniforms,
    opaque: false,
    onResize(gl, program) {
      program.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height];
    },
    onFrame(t, program, smooth) {
      program.uniforms.uTime.value = t;
      program.uniforms.uMouse.value[0] = smooth.x;
      program.uniforms.uMouse.value[1] = smooth.y;
    }
  });
}

/* ==================== FLOATING LINES ==================== */
const floatingFrag = `
precision highp float;
uniform float iTime;
uniform vec3 iResolution;
uniform float animationSpeed;
uniform bool enableTop;
uniform bool enableMiddle;
uniform bool enableBottom;
uniform int topLineCount;
uniform int middleLineCount;
uniform int bottomLineCount;
uniform float topLineDistance;
uniform float middleLineDistance;
uniform float bottomLineDistance;
uniform vec3 topWavePosition;
uniform vec3 middleWavePosition;
uniform vec3 bottomWavePosition;
uniform vec2 iMouse;
uniform bool interactive;
uniform float bendRadius;
uniform float bendStrength;
uniform float bendInfluence;
uniform bool parallax;
uniform float parallaxStrength;
uniform vec2 parallaxOffset;
uniform vec3 lineGradient[8];
uniform int lineGradientCount;
const vec3 BLACK=vec3(0.0);
const vec3 PINK=vec3(233.0,71.0,245.0)/255.0;
const vec3 BLUE=vec3(47.0,75.0,162.0)/255.0;
mat2 rotate(float r){return mat2(cos(r),sin(r),-sin(r),cos(r));}
vec3 background_color(vec2 uv){vec3 col=vec3(0.0);float y=sin(uv.x-0.2)*0.3-0.1;float m=uv.y-y;col+=mix(BLUE,BLACK,smoothstep(0.0,1.0,abs(m)));col+=mix(PINK,BLACK,smoothstep(0.0,1.0,abs(m-0.8)));return col*0.5;}
/* Three fixed stops, interpolated with constant indices only (no dynamic
   uniform-array indexing) so it compiles under GLSL ES 1.00. */
vec3 getLineColor(float t,vec3 baseColor){if(lineGradientCount<=0){return baseColor;}if(lineGradientCount==1){return lineGradient[0]*0.5;}vec3 c0=lineGradient[0];vec3 c1=lineGradient[1];vec3 c2=lineGradient[2];float ct=clamp(t,0.0,1.0);vec3 grad=ct<0.5?mix(c0,c1,ct*2.0):mix(c1,c2,(ct-0.5)*2.0);return grad*0.5;}
float wave(vec2 uv,float offset,vec2 screenUv,vec2 mouseUv,bool shouldBend){float time=iTime*animationSpeed;float x_offset=offset;float x_movement=time*0.1;float amp=sin(offset+time*0.2)*0.3;float y=sin(uv.x+x_offset+x_movement)*amp;if(shouldBend){vec2 d=screenUv-mouseUv;float influence=exp(-dot(d,d)*bendRadius);float bendOffset=(mouseUv.y-screenUv.y)*influence*bendStrength*bendInfluence;y+=bendOffset;}float m=uv.y-y;return 0.0175/max(abs(m)+0.01,1e-3)+0.01;}
void mainImage(out vec4 fragColor,in vec2 fragCoord){vec2 baseUv=(2.0*fragCoord-iResolution.xy)/iResolution.y;baseUv.y*=-1.0;if(parallax){baseUv+=parallaxOffset;}vec3 col=vec3(0.0);vec3 b=lineGradientCount>0?vec3(0.0):background_color(baseUv);vec2 mouseUv=vec2(0.0);if(interactive){mouseUv=(2.0*iMouse-iResolution.xy)/iResolution.y;mouseUv.y*=-1.0;}
if(enableBottom){for(int i=0;i<32;i++){if(i>=bottomLineCount)break;float fi=float(i);float t=fi/max(float(bottomLineCount-1),1.0);vec3 lineCol=getLineColor(t,b);float angle=bottomWavePosition.z*log(length(baseUv)+1.0);vec2 ruv=baseUv*rotate(angle);col+=lineCol*wave(ruv+vec2(bottomLineDistance*fi+bottomWavePosition.x,bottomWavePosition.y),1.5+0.2*fi,baseUv,mouseUv,interactive)*0.2;}}
if(enableMiddle){for(int i=0;i<32;i++){if(i>=middleLineCount)break;float fi=float(i);float t=fi/max(float(middleLineCount-1),1.0);vec3 lineCol=getLineColor(t,b);float angle=middleWavePosition.z*log(length(baseUv)+1.0);vec2 ruv=baseUv*rotate(angle);col+=lineCol*wave(ruv+vec2(middleLineDistance*fi+middleWavePosition.x,middleWavePosition.y),2.0+0.15*fi,baseUv,mouseUv,interactive);}}
if(enableTop){for(int i=0;i<32;i++){if(i>=topLineCount)break;float fi=float(i);float t=fi/max(float(topLineCount-1),1.0);vec3 lineCol=getLineColor(t,b);float angle=topWavePosition.z*log(length(baseUv)+1.0);vec2 ruv=baseUv*rotate(angle);ruv.x*=-1.0;col+=lineCol*wave(ruv+vec2(topLineDistance*fi+topWavePosition.x,topWavePosition.y),1.0+0.2*fi,baseUv,mouseUv,interactive)*0.1;}}
fragColor=vec4(col,1.0);}
void main(){vec4 color=vec4(0.0);mainImage(color,gl_FragCoord.xy);gl_FragColor=color;}
`;

function createFloatingLines(container) {
  // Plain Array (not Float32Array): OGL checks Array.isArray for array uniforms.
  const grad = new Array(24).fill(0);
  const stops = [PALETTE.navy, PALETTE.light, PALETTE.white].map(hexToRgb01);
  stops.forEach((c, i) => { grad[i * 3] = c[0]; grad[i * 3 + 1] = c[1]; grad[i * 3 + 2] = c[2]; });
  const uniforms = {
    iTime: { value: 0 },
    iResolution: { value: [1, 1, 1] },
    animationSpeed: { value: 1 },
    enableTop: { value: true },
    enableMiddle: { value: true },
    enableBottom: { value: true },
    topLineCount: { value: 6 },
    middleLineCount: { value: 6 },
    bottomLineCount: { value: 6 },
    topLineDistance: { value: 0.05 },
    middleLineDistance: { value: 0.05 },
    bottomLineDistance: { value: 0.05 },
    topWavePosition: { value: [10.0, 0.5, -0.4] },
    middleWavePosition: { value: [5.0, 0.0, 0.2] },
    bottomWavePosition: { value: [2.0, -0.7, -1.0] },
    iMouse: { value: [-1000, -1000] },
    interactive: { value: MOUSE },
    bendRadius: { value: 5.0 },
    bendStrength: { value: -0.5 },
    bendInfluence: { value: 0 },
    parallax: { value: true },
    parallaxStrength: { value: 0.2 },
    parallaxOffset: { value: [0, 0] },
    lineGradient: { value: grad },
    lineGradientCount: { value: 3 }
  };
  return oglEffect(container, {
    fragment: floatingFrag,
    uniforms,
    opaque: true,
    onResize(gl, program) {
      program.uniforms.iResolution.value = [gl.canvas.width, gl.canvas.height, 1];
    },
    onFrame(t, program, smooth, active, gl) {
      program.uniforms.iTime.value = t;
      program.uniforms.iMouse.value[0] = smooth.x * gl.canvas.width;
      program.uniforms.iMouse.value[1] = smooth.y * gl.canvas.height;
      program.uniforms.bendInfluence.value = active;
      program.uniforms.parallaxOffset.value[0] = (smooth.x - 0.5) * 0.2;
      program.uniforms.parallaxOffset.value[1] = (smooth.y - 0.5) * 0.2;
    }
  });
}

/* ==================== DITHER (wave + bayer, single pass) ==================== */
const ditherFrag = `
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution;
uniform float uTime;
uniform float uWaveSpeed;
uniform float uWaveFrequency;
uniform float uWaveAmplitude;
uniform vec3 uWaveColor;
uniform vec2 uMouse;
uniform int uEnableMouse;
uniform float uMouseRadius;
uniform float uColorNum;
uniform float uPixelSize;
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
vec2 fade(vec2 t){return t*t*t*(t*(t*6.0-15.0)+10.0);}
float cnoise(vec2 P){vec4 Pi=floor(P.xyxy)+vec4(0.0,0.0,1.0,1.0);vec4 Pf=fract(P.xyxy)-vec4(0.0,0.0,1.0,1.0);Pi=mod289(Pi);vec4 ix=Pi.xzxz;vec4 iy=Pi.yyww;vec4 fx=Pf.xzxz;vec4 fy=Pf.yyww;vec4 i=permute(permute(ix)+iy);vec4 gx=fract(i*(1.0/41.0))*2.0-1.0;vec4 gy=abs(gx)-0.5;vec4 tx=floor(gx+0.5);gx=gx-tx;vec2 g00=vec2(gx.x,gy.x);vec2 g10=vec2(gx.y,gy.y);vec2 g01=vec2(gx.z,gy.z);vec2 g11=vec2(gx.w,gy.w);vec4 norm=taylorInvSqrt(vec4(dot(g00,g00),dot(g01,g01),dot(g10,g10),dot(g11,g11)));g00*=norm.x;g01*=norm.y;g10*=norm.z;g11*=norm.w;float n00=dot(g00,vec2(fx.x,fy.x));float n10=dot(g10,vec2(fx.y,fy.y));float n01=dot(g01,vec2(fx.z,fy.z));float n11=dot(g11,vec2(fx.w,fy.w));vec2 fade_xy=fade(Pf.xy);vec2 n_x=mix(vec2(n00,n01),vec2(n10,n11),fade_xy.x);return 2.3*mix(n_x.x,n_x.y,fade_xy.y);}
float fbm(vec2 p){float value=0.0;float amp=1.0;float freq=uWaveFrequency;for(int i=0;i<4;i++){value+=amp*abs(cnoise(p));p*=freq;amp*=uWaveAmplitude;}return value;}
float pattern(vec2 p){vec2 p2=p-uTime*uWaveSpeed;return fbm(p+fbm(p2));}
/* Analytic 8x8 ordered (Bayer) dither — avoids dynamic array indexing so it
   compiles reliably under GLSL ES 1.00. Returns a threshold in [0,1). */
float bayer2(vec2 a){a=floor(a);return fract(a.x*0.5+a.y*a.y*0.75);}
float bayer4(vec2 a){return bayer2(0.5*a)*0.25+bayer2(a);}
float bayer8(vec2 a){return bayer4(0.5*a)*0.25+bayer2(a);}
vec3 dither(vec2 uv,vec3 color){vec2 scaledCoord=floor(uv*uResolution/uPixelSize);float threshold=bayer8(scaledCoord)-0.5;float stepv=1.0/(uColorNum-1.0);color+=threshold*stepv;float bias=0.1;color=clamp(color-bias,0.0,1.0);return floor(color*(uColorNum-1.0)+0.5)/(uColorNum-1.0);}
void main(){vec2 normalizedPixelSize=uPixelSize/uResolution;vec2 uvPixel=normalizedPixelSize*floor(vUv/normalizedPixelSize);vec2 uv=uvPixel;uv-=0.5;uv.x*=uResolution.x/uResolution.y;float f=pattern(uv);if(uEnableMouse==1){vec2 mouseNDC=(uMouse/uResolution-0.5)*vec2(1.0,-1.0);mouseNDC.x*=uResolution.x/uResolution.y;float dist=length(uv-mouseNDC);float effect=1.0-smoothstep(0.0,uMouseRadius,dist);f-=0.5*effect;}vec3 col=mix(vec3(0.0),uWaveColor,f);col=dither(vUv,col);gl_FragColor=vec4(col,1.0);}
`;

function createDither(container) {
  const uniforms = {
    uResolution: { value: [1, 1] },
    uTime: { value: 0 },
    uWaveSpeed: { value: 0.05 },
    uWaveFrequency: { value: 3 },
    uWaveAmplitude: { value: 0.3 },
    uWaveColor: { value: hexToRgb01(PALETTE.navy) },
    uMouse: { value: [0, 0] },
    uEnableMouse: { value: MOUSE ? 1 : 0 },
    uMouseRadius: { value: 0.6 },
    uColorNum: { value: 4 },
    uPixelSize: { value: 2 }
  };
  return oglEffect(container, {
    fragment: ditherFrag,
    uniforms,
    opaque: true,
    onResize(gl, program) {
      program.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height];
    },
    onFrame(t, program, smooth, active, gl) {
      program.uniforms.uTime.value = t;
      program.uniforms.uMouse.value[0] = smooth.x * gl.canvas.width;
      program.uniforms.uMouse.value[1] = (1 - smooth.y) * gl.canvas.height;
    }
  });
}

/* ==================== WAVES (canvas2D + Perlin) ==================== */
class Grad {
  constructor(x, y, z) { this.x = x; this.y = y; this.z = z; }
  dot2(x, y) { return this.x * x + this.y * y; }
}
class Noise {
  constructor(seed = 0) {
    this.grad3 = [new Grad(1, 1, 0), new Grad(-1, 1, 0), new Grad(1, -1, 0), new Grad(-1, -1, 0), new Grad(1, 0, 1), new Grad(-1, 0, 1), new Grad(1, 0, -1), new Grad(-1, 0, -1), new Grad(0, 1, 1), new Grad(0, -1, 1), new Grad(0, 1, -1), new Grad(0, -1, -1)];
    this.p = [151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180];
    this.perm = new Array(512);
    this.gradP = new Array(512);
    this.seed(seed);
  }
  seed(seed) {
    if (seed > 0 && seed < 1) seed *= 65536;
    seed = Math.floor(seed);
    if (seed < 256) seed |= seed << 8;
    for (let i = 0; i < 256; i++) {
      const v = i & 1 ? this.p[i] ^ (seed & 255) : this.p[i] ^ ((seed >> 8) & 255);
      this.perm[i] = this.perm[i + 256] = v;
      this.gradP[i] = this.gradP[i + 256] = this.grad3[v % 12];
    }
  }
  fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  lerp(a, b, t) { return (1 - t) * a + t * b; }
  perlin2(x, y) {
    let X = Math.floor(x), Y = Math.floor(y);
    x -= X; y -= Y; X &= 255; Y &= 255;
    const n00 = this.gradP[X + this.perm[Y]].dot2(x, y);
    const n01 = this.gradP[X + this.perm[Y + 1]].dot2(x, y - 1);
    const n10 = this.gradP[X + 1 + this.perm[Y]].dot2(x - 1, y);
    const n11 = this.gradP[X + 1 + this.perm[Y + 1]].dot2(x - 1, y - 1);
    const u = this.fade(x);
    return this.lerp(this.lerp(n00, n10, u), this.lerp(n01, n11, u), this.fade(y));
  }
}

function createWaves(container) {
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const cfg = { lineColor: 'rgba(140,160,220,0.42)', waveSpeedX: 0.0125, waveSpeedY: 0.005, waveAmpX: 32, waveAmpY: 16, xGap: 10, yGap: 32, friction: 0.925, tension: 0.005, maxCursorMove: 100 };
  const noise = new Noise(Math.random());
  let lines = [], bounding = { width: 0, height: 0, left: 0, top: 0 }, raf = null;
  const mouse = { x: -10, y: 0, lx: 0, ly: 0, sx: 0, sy: 0, v: 0, vs: 0, a: 0, set: false };

  function setSize() {
    bounding = container.getBoundingClientRect();
    canvas.width = bounding.width;
    canvas.height = bounding.height;
  }
  function setLines() {
    const { width, height } = bounding;
    lines = [];
    const oWidth = width + 200, oHeight = height + 30;
    const totalLines = Math.ceil(oWidth / cfg.xGap);
    const totalPoints = Math.ceil(oHeight / cfg.yGap);
    const xStart = (width - cfg.xGap * totalLines) / 2;
    const yStart = (height - cfg.yGap * totalPoints) / 2;
    for (let i = 0; i <= totalLines; i++) {
      const pts = [];
      for (let j = 0; j <= totalPoints; j++) {
        pts.push({ x: xStart + cfg.xGap * i, y: yStart + cfg.yGap * j, wave: { x: 0, y: 0 }, cursor: { x: 0, y: 0, vx: 0, vy: 0 } });
      }
      lines.push(pts);
    }
  }
  function movePoints(time) {
    lines.forEach(pts => {
      pts.forEach(p => {
        const move = noise.perlin2((p.x + time * cfg.waveSpeedX) * 0.002, (p.y + time * cfg.waveSpeedY) * 0.0015) * 12;
        p.wave.x = Math.cos(move) * cfg.waveAmpX;
        p.wave.y = Math.sin(move) * cfg.waveAmpY;
        const dx = p.x - mouse.sx, dy = p.y - mouse.sy;
        const dist = Math.hypot(dx, dy), l = Math.max(175, mouse.vs);
        if (dist < l) {
          const s = 1 - dist / l;
          const f = Math.cos(dist * 0.001) * s;
          p.cursor.vx += Math.cos(mouse.a) * f * l * mouse.vs * 0.00065;
          p.cursor.vy += Math.sin(mouse.a) * f * l * mouse.vs * 0.00065;
        }
        p.cursor.vx += (0 - p.cursor.x) * cfg.tension;
        p.cursor.vy += (0 - p.cursor.y) * cfg.tension;
        p.cursor.vx *= cfg.friction;
        p.cursor.vy *= cfg.friction;
        p.cursor.x += p.cursor.vx * 2;
        p.cursor.y += p.cursor.vy * 2;
        p.cursor.x = Math.min(cfg.maxCursorMove, Math.max(-cfg.maxCursorMove, p.cursor.x));
        p.cursor.y = Math.min(cfg.maxCursorMove, Math.max(-cfg.maxCursorMove, p.cursor.y));
      });
    });
  }
  function moved(point, withCursor = true) {
    const x = point.x + point.wave.x + (withCursor ? point.cursor.x : 0);
    const y = point.y + point.wave.y + (withCursor ? point.cursor.y : 0);
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  }
  function drawLines() {
    const { width, height } = bounding;
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.strokeStyle = cfg.lineColor;
    lines.forEach(points => {
      let p1 = moved(points[0], false);
      ctx.moveTo(p1.x, p1.y);
      points.forEach((p, idx) => {
        const isLast = idx === points.length - 1;
        p1 = moved(p, !isLast);
        const p2 = moved(points[idx + 1] || points[points.length - 1], !isLast);
        ctx.lineTo(p1.x, p1.y);
        if (isLast) ctx.moveTo(p2.x, p2.y);
      });
    });
    ctx.stroke();
  }
  function tick(t) {
    mouse.sx += (mouse.x - mouse.sx) * 0.1;
    mouse.sy += (mouse.y - mouse.sy) * 0.1;
    const dx = mouse.x - mouse.lx, dy = mouse.y - mouse.ly;
    const d = Math.hypot(dx, dy);
    mouse.v = d;
    mouse.vs += (d - mouse.vs) * 0.1;
    mouse.vs = Math.min(100, mouse.vs);
    mouse.lx = mouse.x;
    mouse.ly = mouse.y;
    mouse.a = Math.atan2(dy, dx);
    movePoints(t);
    drawLines();
    raf = requestAnimationFrame(tick);
  }
  function onResize() { setSize(); setLines(); }
  function updateMouse(x, y) {
    mouse.x = x - bounding.left;
    mouse.y = y - bounding.top;
    if (!mouse.set) { mouse.sx = mouse.x; mouse.sy = mouse.y; mouse.lx = mouse.x; mouse.ly = mouse.y; mouse.set = true; }
  }
  function onMouseMove(e) { updateMouse(e.clientX, e.clientY); }

  setSize();
  setLines();
  movePoints(0);
  drawLines();
  window.addEventListener('resize', onResize);
  if (MOUSE) window.addEventListener('mousemove', onMouseMove);
  if (!prefersReduced) raf = requestAnimationFrame(tick);

  return {
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
      if (canvas.parentElement === container) container.removeChild(canvas);
    }
  };
}

/* ==================== DOT GRID (canvas2D + gsap) ==================== */
function createDotGrid(container) {
  const gsap = window.gsap;
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const cfg = { dotSize: 5, gap: 30, baseColor: PALETTE.navyDark, activeColor: PALETTE.light, proximity: 140, speedTrigger: 100, shockRadius: 240, shockStrength: 5, maxSpeed: 5000, returnDuration: 1.5 };
  const baseRgb = hexToRgb255(cfg.baseColor);
  const activeRgb = hexToRgb255(cfg.activeColor);
  let dots = [], raf = null;
  const pointer = { x: -9999, y: -9999, lastX: 0, lastY: 0, lastTime: 0, vx: 0, vy: 0, speed: 0 };
  const circle = window.Path2D ? new Path2D() : null;
  if (circle) circle.arc(0, 0, cfg.dotSize / 2, 0, Math.PI * 2);

  function hexToRgb255(hex) {
    const c = hexToRgb01(hex);
    return { r: Math.round(c[0] * 255), g: Math.round(c[1] * 255), b: Math.round(c[2] * 255) };
  }

  function buildGrid() {
    const rect = container.getBoundingClientRect();
    const width = rect.width, height = rect.height;
    canvas.width = width * DPR;
    canvas.height = height * DPR;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const cell = cfg.dotSize + cfg.gap;
    const cols = Math.floor((width + cfg.gap) / cell);
    const rows = Math.floor((height + cfg.gap) / cell);
    const gridW = cell * cols - cfg.gap;
    const gridH = cell * rows - cfg.gap;
    const startX = (width - gridW) / 2 + cfg.dotSize / 2;
    const startY = (height - gridH) / 2 + cfg.dotSize / 2;
    dots = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        dots.push({ cx: startX + x * cell, cy: startY + y * cell, xOffset: 0, yOffset: 0, _act: false });
      }
    }
  }
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const proxSq = cfg.proximity * cfg.proximity;
    const px = pointer.x, py = pointer.y;
    for (const dot of dots) {
      const ox = dot.cx + dot.xOffset, oy = dot.cy + dot.yOffset;
      const dx = dot.cx - px, dy = dot.cy - py, dsq = dx * dx + dy * dy;
      let style = cfg.baseColor;
      if (dsq <= proxSq) {
        const t = 1 - Math.sqrt(dsq) / cfg.proximity;
        const r = Math.round(baseRgb.r + (activeRgb.r - baseRgb.r) * t);
        const g = Math.round(baseRgb.g + (activeRgb.g - baseRgb.g) * t);
        const b = Math.round(baseRgb.b + (activeRgb.b - baseRgb.b) * t);
        style = 'rgb(' + r + ',' + g + ',' + b + ')';
      }
      ctx.save();
      ctx.translate(ox, oy);
      ctx.fillStyle = style;
      if (circle) ctx.fill(circle);
      else { ctx.beginPath(); ctx.arc(0, 0, cfg.dotSize / 2, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
  }
  function loop() {
    draw();
    raf = requestAnimationFrame(loop);
  }
  function pushDot(dot, pushX, pushY) {
    if (!gsap) return;
    dot._act = true;
    gsap.killTweensOf(dot);
    gsap.to(dot, {
      xOffset: pushX, yOffset: pushY, duration: 0.25, ease: 'power2.out',
      onComplete() {
        gsap.to(dot, { xOffset: 0, yOffset: 0, duration: cfg.returnDuration, ease: 'elastic.out(1,0.75)', onComplete() { dot._act = false; } });
      }
    });
  }
  function onMove(e) {
    const rect = canvas.getBoundingClientRect();
    const now = performance.now();
    const dt = pointer.lastTime ? now - pointer.lastTime : 16;
    const dx = e.clientX - pointer.lastX, dy = e.clientY - pointer.lastY;
    let vx = (dx / dt) * 1000, vy = (dy / dt) * 1000;
    let speed = Math.hypot(vx, vy);
    if (speed > cfg.maxSpeed) { const s = cfg.maxSpeed / speed; vx *= s; vy *= s; speed = cfg.maxSpeed; }
    pointer.lastTime = now; pointer.lastX = e.clientX; pointer.lastY = e.clientY;
    pointer.speed = speed;
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
    if (!gsap) return;
    for (const dot of dots) {
      const dist = Math.hypot(dot.cx - pointer.x, dot.cy - pointer.y);
      if (speed > cfg.speedTrigger && dist < cfg.proximity && !dot._act) {
        pushDot(dot, dot.cx - pointer.x + vx * 0.005, dot.cy - pointer.y + vy * 0.005);
      }
    }
  }
  function onClick(e) {
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    for (const dot of dots) {
      const dist = Math.hypot(dot.cx - cx, dot.cy - cy);
      if (dist < cfg.shockRadius && !dot._act) {
        const falloff = Math.max(0, 1 - dist / cfg.shockRadius);
        pushDot(dot, (dot.cx - cx) * cfg.shockStrength * falloff, (dot.cy - cy) * cfg.shockStrength * falloff);
      }
    }
  }
  function onResize() { buildGrid(); }

  buildGrid();
  draw();
  window.addEventListener('resize', onResize);
  if (MOUSE) { window.addEventListener('mousemove', onMove, { passive: true }); window.addEventListener('click', onClick); }
  if (!prefersReduced) raf = requestAnimationFrame(loop);

  return {
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('click', onClick);
      if (window.gsap) dots.forEach(d => window.gsap.killTweensOf(d));
      if (canvas.parentElement === container) container.removeChild(canvas);
    }
  };
}

/* ==================== CONTROLLER ==================== */
async function main() {
  const container = document.getElementById('heroBg');
  if (!container) return;

  const CANVAS_KEYS = ['waves', 'dotGrid'];
  const REGISTRY = {
    waves: createWaves,
    dotGrid: createDotGrid,
    galaxy: createGalaxy,
    faultyTerminal: createFaultyTerminal,
    lineWaves: createLineWaves,
    floatingLines: createFloatingLines,
    dither: createDither
  };

  try {
    OGL = await import('https://esm.sh/ogl@1.0.11');
  } catch (e) {
    OGL = null;
  }

  const keys = OGL ? Object.keys(REGISTRY) : CANVAS_KEYS;

  let instance = null, currentKey = null;

  function mount(key) {
    if (instance) { try { instance.destroy(); } catch (e) { /* ignore */ } instance = null; }
    while (container.firstChild) container.removeChild(container.firstChild);
    currentKey = key;
    try {
      instance = REGISTRY[key](container);
    } catch (e) {
      console.error('hero background failed:', key, e);
    }
  }
  function randomKey(exclude) {
    let k;
    do { k = keys[Math.floor(Math.random() * keys.length)]; } while (exclude && k === exclude && keys.length > 1);
    return k;
  }

  // Optional deep-link: ?bg=galaxy forces a specific background (else random).
  let forced = null;
  try { forced = new URLSearchParams(window.location.search).get('bg'); } catch (e) { forced = null; }
  mount(forced && keys.indexOf(forced) !== -1 ? forced : randomKey());

  const shuffleBtn = document.getElementById('heroShuffle');
  if (shuffleBtn) shuffleBtn.addEventListener('click', () => mount(randomKey(currentKey)));
}

main();
