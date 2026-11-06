import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { outfits } from '../data/outfits';
import { ownerTime, profile } from '../data/profile';

export type RoomAction = 'desktop' | 'todo' | 'drawer' | 'about' | 'music' | 'wardrobe' | 'curtains' | 'ac' | 'bed' | 'github' | 'twitter' | 'clock';
export type PanelType = 'desktop' | 'todo' | 'music' | 'wardrobe' | 'contact';
type Vec3 = [number, number, number];
type MaterialName = 'wood'|'darkWood'|'floor'|'wall'|'trim'|'cream'|'green'|'darkGreen'|'curtain'|'black'|'metal'|'gold'|'white'|'terracotta'|'soil'|'leaf'|'skin'|'hair'|'pants'|'shirt'|'screen';
interface Tween { start: number; duration: number; update: (t: number) => void; resolve: () => void }

// Hotspot labels rendered by React; the room projects them into place every frame.
export const HOTSPOTS: { action: RoomAction; label: string; point: Vec3; num: string }[] = [
  { action:'desktop', label:'The desktop', point:[-.75,2.85,-2.6], num:'01' },
  { action:'todo', label:'On my list', point:[-3.2,1.95,.19], num:'02' },
  { action:'curtains', label:'Pull the cord', point:[2.84,3.72,-3.3], num:'☼' },
  { action:'music', label:'Good company', point:[2.35,1.45,-2.6], num:'♪' },
  { action:'wardrobe', label:'A different day', point:[-3.05,3.28,-2.3], num:'↻' },
];

// Simple Icons 24×24 marks, drawn onto the wall posters.
const POSTERS: { action: RoomAction; handle: string; color: string; path: string }[] = [
  { action:'github', handle:'@L00p-h0le', color:'#3c5346', path:'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12' },
  { action:'twitter', handle:'@G3ek_God', color:'#333a35', path:'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z' },
];

// Pull cord hanging between the window and the clock, plus where the avatar stands to reach it.
// The arm swings out sideways (rotation.z, like the wave) so the reach stays visible from the camera.
const CORD = { x:2.84, z:-3.3, top:3.45, length:1.66, reach:2.4, pull:2.12, aisle:[3.0,-1.85] as [number,number], stand:[3.39,-3.08] as [number,number] };

const TAU = Math.PI * 2;
const ease = (t: number) => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;

export class Room {
  private container: HTMLElement;
  private onSelect: (action: RoomAction, index?: number) => void;
  private tweens: Tween[] = [];
  private targets: THREE.Object3D[] = [];
  private labels: { el: HTMLElement; point: THREE.Vector3 }[] = [];
  private reduced: boolean;
  private clock = new THREE.Clock();
  private time = 0;
  private walking = false;
  private waving = false;
  private seated = true;
  private night = false;
  private acOn = true;
  private activeDrawer = -1;
  private wardrobeOpen = false;
  private scene = new THREE.Scene();
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private resizeObserver: ResizeObserver;
  private unbindPointer: () => void = () => {};
  private m!: Record<MaterialName, THREE.MeshStandardMaterial>;
  private ambient!: THREE.HemisphereLight;
  private sun!: THREE.DirectionalLight;
  private lampLight!: THREE.PointLight;
  private monitorLight!: THREE.PointLight;
  private moon!: THREE.DirectionalLight;
  private windowMaterial!: THREE.MeshStandardMaterial;
  private curtains: THREE.Group[] = [];
  private chair!: THREE.Group;
  private drawers: THREE.Group[] = [];
  private closetDoors: THREE.Group[] = [];
  private acLed!: THREE.MeshStandardMaterial;
  private acDisplay!: THREE.Mesh;
  private acFlap!: THREE.Group;
  private clockHands!: { hour: THREE.Group; minute: THREE.Group; second: THREE.Group };
  // Pull cord beside the window: the string stretches by cordPull and swings by cordSway.
  private cordPivot!: THREE.Group;
  private cordString!: THREE.Mesh;
  private cordKnob!: THREE.Mesh;
  private cordPull = 0;
  private cordSway = 0;
  // Record player: the platter spins and the arm swings in while music plays.
  private platter!: THREE.Group;
  private tonearm!: THREE.Group;
  private cones: THREE.Mesh[] = [];
  private stereoLed!: THREE.MeshStandardMaterial;
  private musicOn = false;
  private backlight!: THREE.MeshBasicMaterial;
  private rgb!: { glow: THREE.MeshBasicMaterial; fans: THREE.MeshStandardMaterial; light: THREE.PointLight; blades: THREE.Group[] };
  private rgbNight = 0;
  private musicProgress: () => number = () => 0;
  private avatar!: THREE.Group;
  private pelvis!: THREE.Group;
  private torso!: THREE.Group;
  private hood!: THREE.Mesh;
  private head!: THREE.Group;
  private cap!: THREE.Group;
  private legs: THREE.Group[] = [];
  private shins: THREE.Group[] = [];
  private arms: THREE.Group[] = [];
  private sleeves: THREE.Mesh[] = [];

  constructor(container: HTMLElement, onSelect: (action: RoomAction, index?: number) => void) {
    this.container = container; this.onSelect = onSelect;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.camera = new THREE.OrthographicCamera(-8, 8, 6, -6, .1, 100);
    this.camera.position.set(11, 9, 13);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-label','A miniature apartment with a desk, avatar, project drawers, window, bed, closet, air conditioner, and stereo. Use the navigation buttons to explore.');
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 1.0, 0); this.controls.enableDamping = true; this.controls.dampingFactor = .07;
    this.controls.enablePan = false; this.controls.minPolarAngle = .65; this.controls.maxPolarAngle = 1.18;
    this.controls.minAzimuthAngle = .12; this.controls.maxAzimuthAngle = 1.35; this.controls.minZoom = .75; this.controls.maxZoom = 2.2;
    this.controls.update();
    this.materials(); this.lights(); this.buildRoom(); this.buildAvatar(); this.bindPointer();
    this.resize(); this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(container);
    this.renderer.setAnimationLoop(() => this.frame());
  }
  dispose() {
    this.renderer.setAnimationLoop(null); this.resizeObserver.disconnect(); this.unbindPointer(); this.controls.dispose();
    this.scene.traverse(o => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        for (const mat of [o.material].flat() as THREE.Material[]) { (mat as THREE.MeshStandardMaterial).map?.dispose(); mat.dispose(); }
      }
    });
    this.renderer.dispose(); this.renderer.domElement.remove();
    this.tweens.forEach(t => t.resolve()); this.tweens = [];
  }
  setLabels(els: HTMLElement[]) { this.labels = els.map((el, i) => ({ el, point: new THREE.Vector3(...HOTSPOTS[i].point) })); }
  private material(color: THREE.ColorRepresentation, extra: THREE.MeshStandardMaterialParameters = {}) { return new THREE.MeshStandardMaterial({ color, roughness:.82, ...extra }); }
  private materials() {
    const woodCanvas = document.createElement('canvas'); woodCanvas.width=256;woodCanvas.height=256;
    const c = woodCanvas.getContext('2d')!; c.fillStyle='#c6a47c';c.fillRect(0,0,256,256);
    let seed=143; const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
    for(let i=0;i<270;i++){c.strokeStyle=`rgba(${random()>.5?'83,55,29':'248,222,180'},${random()*.14})`;c.lineWidth=random()*1.5;c.beginPath();const y=random()*256;c.moveTo(0,y);c.bezierCurveTo(80,y+random()*6,180,y-random()*7,256,y+random()*4);c.stroke();}
    const texture=new THREE.CanvasTexture(woodCanvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
    this.m = { wood:this.material('#e2c19b',{map:texture}), darkWood:this.material('#a77f58',{map:texture}), floor:this.material('#ead3ad',{map:texture}), wall:this.material('#deded0'), trim:this.material('#f3eee0'), cream:this.material('#f0eee1'), green:this.material('#7b8860'), darkGreen:this.material('#3c5346'), curtain:this.material('#c0c5a9'), black:this.material('#333a35'), metal:this.material('#838b7a',{metalness:.45,roughness:.42}), gold:this.material('#a39c76',{metalness:.5}), white:this.material('#f7f5e7'), terracotta:this.material('#b47d60'), soil:this.material('#534b37'), leaf:this.material('#668158'), skin:this.material('#c58b65'), hair:this.material('#39352e'), pants:this.material('#b5ac92'), shirt:this.material(outfits[new Date().getDay()].color), screen:this.material('#243b34',{emissive:'#719d80',emissiveIntensity:.12}) };
  }
  private box(w: number,h: number,d: number,material: THREE.Material,x=0,y=0,z=0,parent: THREE.Object3D=this.scene,r=.025) {
    const mesh=new THREE.Mesh(r ? new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3)) : new THREE.BoxGeometry(w,h,d),material);
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  private cylinder(rt: number,rb: number,h: number,material: THREE.Material,x: number,y: number,z: number,parent: THREE.Object3D=this.scene,segments=24) {
    const o=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,segments),material);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
  }
  private sphere(radius: number,material: THREE.Material,x: number,y: number,z: number,parent: THREE.Object3D=this.scene,scale: Vec3=[1,1,1]) {
    const o=new THREE.Mesh(new THREE.SphereGeometry(radius,20,16),material);o.position.set(x,y,z);o.scale.set(...scale);o.castShadow=true;parent.add(o);return o;
  }
  private group(x=0,y=0,z=0,parent: THREE.Object3D=this.scene){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;}
  private interactive(group: THREE.Object3D, action: RoomAction, index?: number) { group.traverse(o=>{if((o as THREE.Mesh).isMesh){o.userData={action,index};this.targets.push(o);}}); }
  private lights(){
    this.ambient=new THREE.HemisphereLight('#fff7df','#a6a987',2.5);this.scene.add(this.ambient);
    this.sun=new THREE.DirectionalLight('#fff0cc',3.1);this.sun.position.set(-1,8,5);this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.5,far:25});this.sun.shadow.normalBias=.03;this.sun.shadow.bias=-.0003;this.sun.shadow.radius=4;this.scene.add(this.sun);
    this.lampLight=new THREE.PointLight('#ffd295',0,8,1.5);this.lampLight.position.set(-2,2.1,-2.3);this.scene.add(this.lampLight);
    this.monitorLight=new THREE.PointLight('#7f9cff',.2,4,2);this.monitorLight.position.set(-.75,1.95,-3.0);this.scene.add(this.monitorLight);
    this.moon=new THREE.DirectionalLight('#b1cfe7',0);this.moon.position.set(2,5,-4);this.scene.add(this.moon);
  }
  private buildRoom(){
    const m=this.m;
    const shadow=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.1}));shadow.rotation.x=-Math.PI/2;shadow.position.y=-.27;shadow.receiveShadow=true;this.scene.add(shadow);
    this.box(8.2,.3,7.3,m.darkWood,0,-.12,0,this.scene,.08);
    // Individual floorboards preserve the miniature's joinery and soft edges.
    for(let row=0;row<15;row++)for(let col=0;col<4;col++)this.box(2.025,.07,.472,m.floor,-3.045+col*2.03,.06,-3.3+row*.474,this.scene,.009);
    this.box(.17,3.75,7.3,m.wall,-4.02,1.88,0);
    this.box(8.2,3.75,.17,m.wall,0,1.88,-3.57);
    this.box(.08,.16,7.1,m.trim,-3.9,.18,0);this.box(8,.16,.08,m.trim,0,.18,-3.46);
    this.box(.22,.09,7.4,m.trim,-4.02,3.79,0);this.box(8.2,.09,.22,m.trim,0,3.79,-3.57);
    // Woven rug and stitched border.
    this.box(3.65,.027,3.0,this.material('#bcc0a2'),-.1,.12,.55,this.scene,.16);
    for(let i=0;i<34;i++)this.box(3.47,.004,.011,this.material(i%2?'#c9cbb4':'#b2b797'),-.1,.137,-.83+i*.083,this.scene,0);
    for(const z of [-.89,1.99])this.box(3.4,.006,.045,this.material('#e6e4cf'),-.1,.143,z,this.scene,0);
    for(let i=0;i<28;i++)for(const z of [-1,2.1])this.box(.026,.015,.18,m.cream,-1.74+i*.123,.13,z,this.scene,0);
    this.buildWindow();this.buildDesk();this.buildDrawers();this.buildBed();this.buildCloset();this.buildStereo();this.buildAC();this.buildDetails();
  }
  private buildWindow(){
    const m=this.m;const g=this.group(.65,2.4,-3.43);
    this.box(3.15,1.87,.12,m.wood,0,0,0,g);
    this.windowMaterial=this.material('#d8e3d6',{emissive:'#d5e1cf',emissiveIntensity:.35});
    this.box(2.94,1.65,.05,this.windowMaterial,0,0,.08,g);
    // A quiet landscape beyond the window.
    const hills=this.material('#afbd9b');
    for(let i=0;i<7;i++)this.sphere(.28+i%3*.1,hills,-1.32+i*.43,-.58,.12,g,[1.4,.8,.08]);
    this.box(.045,1.65,.07,m.trim,0,0,.16,g);this.box(2.94,.045,.07,m.trim,0,.05,.16,g);
    this.box(3.4,.1,.4,m.wood,0,-.96,.17,g);
    const pole=this.cylinder(.025,.025,3.8,m.darkWood,0,1.09,.26,g);pole.rotation.z=Math.PI/2;
    for(const x of [-1.94,1.94])this.sphere(.06,m.darkWood,x,1.09,.26,g);
    for(const side of [-1,1]){
      const curtain=this.group(side*1.46,0,.26,g);this.curtains.push(curtain);
      for(let i=0;i<11;i++){const fold=this.cylinder(.052,.062,2.06,m.curtain,-.28+i*.056,-.02,Math.sin(i*.8)*.025,curtain,12);fold.scale.z=.7;}
      this.box(.61,.08,.1,m.curtain,0,1,.02,curtain);
    }
    this.interactive(g,'curtains');
    this.buildCord();
  }
  private buildCord(){
    const m=this.m;const g=this.group(CORD.x,CORD.top,CORD.z);
    this.box(.08,.06,.12,m.darkWood,0,.02,-.05,g,.015);
    this.cordPivot=this.group(0,0,0,g);
    const string=new THREE.CylinderGeometry(.008,.008,CORD.length,8);string.translate(0,-CORD.length/2,0);
    this.cordString=new THREE.Mesh(string,this.material('#b9bbb0'));this.cordString.castShadow=true;this.cordPivot.add(this.cordString);
    this.cordKnob=this.sphere(.055,this.material('#fbfaf2',{emissive:'#ffffff',emissiveIntensity:.18,roughness:.4}),0,-CORD.length,0,this.cordPivot);
    // A generous invisible hit area, because the string itself is only a few pixels wide.
    const hit=new THREE.Mesh(new THREE.BoxGeometry(.3,CORD.length+.2,.3),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
    hit.position.y=-CORD.length/2;this.cordPivot.add(hit);
    this.interactive(g,'curtains');
  }
  private applyCord(){
    const length=CORD.length+this.cordPull;
    this.cordString.scale.y=length/CORD.length;this.cordKnob.position.y=-length;
    this.cordPivot.rotation.z=this.cordSway+(this.reduced?0:Math.sin(this.time*1.3)*.012);
  }
  private async pullCord(){
    const arm=this.arms[1];this.waving=true;
    await this.tween(.4,t=>{arm.rotation.z=THREE.MathUtils.lerp(0,CORD.reach,t);arm.rotation.x=-.35*t;});
    await this.tween(.25,t=>{arm.rotation.z=THREE.MathUtils.lerp(CORD.reach,CORD.pull,t);this.cordPull=.1*t;});
    // Let go: the cord springs back with a damped wobble while the arm drops.
    this.tween(1.2,t=>{const d=t*1.2;this.cordPull=t===1?0:.1*Math.exp(-5*d)*Math.cos(12*d);this.cordSway=t===1?0:.2*Math.exp(-4*d)*Math.sin(10*d);});
    await this.tween(.3,t=>{arm.rotation.z=THREE.MathUtils.lerp(CORD.pull,0,t);arm.rotation.x=-.35*(1-t);});
    this.waving=false;
  }
  /** A soft slab: rounded corners in plan and bevelled (bullnosed) top and bottom edges, like a moulded desk top. */
  private slab(w: number,d: number,h: number,material: THREE.Material,x: number,y: number,z: number,parent: THREE.Object3D,radius=.05,bevel=.02){
    const b=Math.min(bevel,h/2-.001,w/4,d/4),sw=w-2*b,sd=d-2*b,r=Math.max(.001,Math.min(radius-b,sw/2-.001,sd/2-.001));
    const s=new THREE.Shape();
    s.moveTo(-sw/2+r,-sd/2);s.lineTo(sw/2-r,-sd/2);s.absarc(sw/2-r,-sd/2+r,r,-Math.PI/2,0,false);
    s.lineTo(sw/2,sd/2-r);s.absarc(sw/2-r,sd/2-r,r,0,Math.PI/2,false);
    s.lineTo(-sw/2+r,sd/2);s.absarc(-sw/2+r,sd/2-r,r,Math.PI/2,Math.PI,false);
    s.lineTo(-sw/2,-sd/2+r);s.absarc(-sw/2+r,-sd/2+r,r,Math.PI,Math.PI*1.5,false);
    const depth=Math.max(.001,h-2*b);
    const geo=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:b>0,bevelThickness:b,bevelSize:b,bevelSegments:4,curveSegments:10});
    geo.translate(0,0,-depth/2);geo.rotateX(-Math.PI/2);
    const mesh=new THREE.Mesh(geo,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  /** A slice of a cylinder wall: bows toward +z (a curved monitor) or toward -z (a chair back hugging the sitter). */
  private arcPanel(R: number,width: number,height: number,material: THREE.Material,parent: THREE.Object3D,towardPlusZ=true){
    const t=width/R;const geo=new THREE.CylinderGeometry(R,R,height,40,1,true,towardPlusZ?Math.PI-t/2:-t/2,t);
    if(towardPlusZ){geo.scale(-1,1,1);geo.translate(0,0,R);}else geo.translate(0,0,-R);
    const mesh=new THREE.Mesh(geo,material);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  private lathe(points: [number,number][],material: THREE.Material,x: number,y: number,z: number,parent: THREE.Object3D,segments=32){
    const mesh=new THREE.Mesh(new THREE.LatheGeometry(points.map(([r,h])=>new THREE.Vector2(r,h)),segments),material);
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  private buildDesk(){
    const m=this.m;const g=this.group(-.9,0,-2.48);
    const walnut=this.material('#8a5a36',{map:m.wood.map,roughness:.55});
    const charcoal=this.material('#2c2f36',{roughness:.75});
    const white=this.material('#f4f4f6',{roughness:.4});
    // Moulded walnut top with a bullnose edge, overhanging a soft charcoal base.
    this.slab(3.3,1.17,.18,walnut,.25,1.17,0,g,.16,.07);
    for(const x of [-1.13,1.63])this.slab(.54,1.02,1.08,charcoal,x,.54,-.03,g,.08,.035);
    this.slab(2.3,.06,.94,charcoal,.25,.6,-.49,g,.02,.015);
    this.slab(2.3,.08,.1,charcoal,.25,1.04,.47,g,.03,.02);
    // Riser shelf on two soft legs.
    for(const x of [-.57,.87])this.slab(.08,.36,.12,charcoal,x,1.32,-.3,g,.03,.012);
    this.slab(1.6,.42,.07,walnut,.15,1.415,-.3,g,.06,.025);
    // Curved ultrawide with a slim bezel, a rounded back and a white stand.
    const mon=this.group(.15,1.86,-.33,g);
    const shell=this.material('#18191e',{roughness:.45,side:THREE.DoubleSide});
    this.arcPanel(2.2,1.34,.6,shell,mon).position.z=-.004;
    this.arcPanel(2.2,1.34,.6,shell,mon).position.z=-.03;
    for(const y of [-.3,.3]){const lip=this.arcPanel(2.2,1.34,.026,shell,mon);lip.position.set(0,y,-.017);lip.scale.z=1;}
    this.box(.56,.32,.1,shell,0,-.02,-.09,mon,.05);
    const tex=this.desktopTexture();
    this.arcPanel(2.2,1.3,.56,new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}),mon).position.z=.004;
    this.box(.07,.2,.05,white,0,-.31,-.13,mon,.022);
    this.slab(.38,.22,.024,white,0,-.402,-.08,mon,.07,.01);
    // Blue backlight: an additive halo behind the screen, brighter at night.
    const glow=document.createElement('canvas');glow.width=glow.height=128;const gc=glow.getContext('2d')!;
    const grad=gc.createRadialGradient(64,64,8,64,64,64);grad.addColorStop(0,'rgba(110,150,255,1)');grad.addColorStop(.55,'rgba(80,110,255,.45)');grad.addColorStop(1,'rgba(60,90,255,0)');
    gc.fillStyle=grad;gc.fillRect(0,0,128,128);
    this.backlight=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(glow),transparent:true,opacity:.12,blending:THREE.AdditiveBlending,depthWrite:false});
    const halo=new THREE.Mesh(new THREE.PlaneGeometry(2.1,1.15),this.backlight);halo.position.set(0,.02,-.2);mon.add(halo);
    // Over-ear headphones hung on the top right corner: padded band, soft cups.
    const purple=this.material('#4a4680',{roughness:.45}),lavender=this.material('#cdc8f2',{roughness:.5}),cushion=this.material('#2e2b4d',{roughness:.9});
    const hp=this.group(.55,.315,-.015,mon);
    const band=new THREE.Mesh(new THREE.TorusGeometry(.105,.02,12,32,Math.PI),purple);band.rotation.y=Math.PI/2;band.castShadow=true;hp.add(band);
    const pad=new THREE.Mesh(new THREE.TorusGeometry(.105,.024,12,24,Math.PI*.5),cushion);pad.rotation.set(0,Math.PI/2,Math.PI/4);hp.add(pad);
    for(const z of [-.105,.105]){
      const cup=this.group(0,-.05,z,hp);
      this.sphere(.062,lavender,0,0,0,cup,[1,1.1,.55]);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.05,.016,10,28),cushion);ring.position.z=-Math.sign(z)*.022;cup.add(ring);
      this.box(.03,.07,.02,purple,0,.06,0,cup,.01);
    }
    // Desk mat, a 65% mechanical keyboard with a coiled cable, mouse, phone and a coffee.
    this.slab(1.3,.52,.01,this.material('#24262d',{roughness:.95}),.2,1.265,.24,g,.05,.004);
    this.slab(.66,.24,.045,this.material('#2b2a3a',{roughness:.5}),.1,1.29,.25,g,.035,.015);
    const keyGeo=new RoundedBoxGeometry(.034,.022,.034,2,.007);
    const keyWhite=this.material('#f3f2f8',{roughness:.45}),keyPurple=this.material('#7366d1',{roughness:.45});
    const keyAt=(x: number,z: number,w=1,purpleKey=false)=>{const k=new THREE.Mesh(keyGeo,purpleKey?keyPurple:keyWhite);k.scale.x=w;k.position.set(x,1.322,z);k.castShadow=true;g.add(k);};
    for(let r=0;r<5;r++){
      const z=.25-.084+r*.042;
      if(r===4){[0,1,2].forEach(i=>keyAt(-.181+i*.04,z,1,true));keyAt(-.181+6*.04,z,7.4,false);[10,11,12,13,14].forEach(i=>keyAt(-.181+i*.04,z,1,true));continue;}
      for(let i=0;i<15;i++)keyAt(-.181+i*.04,z,1,i===0||i===14||(r===2&&i===13));
    }
    const coil: THREE.Vector3[]=[];for(let i=0;i<=160;i++){const t=i/160,a=t*TAU*10;coil.push(new THREE.Vector3(-.12+Math.cos(a)*.011,1.29+Math.sin(a)*.011,.125-t*.26));}
    const cord=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil),400,.0035,6),keyPurple);cord.castShadow=true;g.add(cord);
    this.sphere(.05,white,.64,1.29,.27,g,[.72,.36,1.15]);this.box(.008,.01,.02,keyPurple,.64,1.307,.235,g,.003);
    this.slab(.1,.2,.014,this.material('#86b9e8',{roughness:.3}),-.52,1.274,.33,g,.02,.006).rotation.y=.35;
    this.lathe([[0,0],[.06,0],[.085,.01],[.082,.014],[.055,.006],[0,.006]],white,1.05,1.266,.2,g);
    this.lathe([[0,0],[.038,0],[.044,.008],[.05,.08],[.046,.082],[.041,.012],[0,.012]],white,1.05,1.272,.2,g);
    this.cylinder(.045,.045,.004,this.material('#4a2c1c'),1.05,1.345,.2,g,24);
    const handle=new THREE.Mesh(new THREE.TorusGeometry(.024,.007,8,16),white);handle.position.set(1.105,1.31,.2);g.add(handle);
    // Desk lamp, moved to the far left; its light warms the room at night.
    this.cylinder(.14,.15,.025,m.darkGreen,-1.22,1.275,-.35,g);this.cylinder(.016,.016,.5,m.darkGreen,-1.22,1.52,-.35,g);
    this.cylinder(.09,.24,.23,m.green,-1.22,1.85,-.35,g);this.cylinder(.19,.19,.018,m.cream,-1.22,1.73,-.35,g);
    this.interactive(g,'desktop');
    // Studio monitors: soft-cornered cabinets with a big woofer (surround, cone, dust cap) and a domed tweeter.
    const navy=this.material('#3d3a66',{roughness:.5}),rubber=this.material('#1b1b26',{roughness:.9}),coneMat=this.material('#2a2938',{roughness:.7,side:THREE.DoubleSide});
    for(const [x,z,turn] of [[-.82,-.3,.25],[1.12,-.35,-.25]] as const){
      const sp=this.group(x,1.465,z,g);sp.rotation.y=turn;
      this.slab(.25,.27,.41,navy,0,0,0,sp,.06,.025);
      for(const [y,r] of [[-.07,.072],[.105,.03]] as const){
        const bezel=new THREE.Mesh(new THREE.TorusGeometry(r+.012,.01,10,40),this.material('#2a2848'));bezel.position.set(0,y,.135);sp.add(bezel);
        const surround=new THREE.Mesh(new THREE.TorusGeometry(r,.008,10,40),rubber);surround.position.set(0,y,.133);sp.add(surround);
        if(y<0){
          const cone=this.lathe([[.012,0],[.03,.004],[.06,.017],[r-.004,.022]],coneMat,0,y,.11,sp,40);cone.rotation.x=Math.PI/2;this.cones.push(cone);
          this.sphere(.02,rubber,0,y,.125,sp,[1,1,.55]);
        } else this.sphere(r*.75,this.material('#d9d7e8',{roughness:.3,metalness:.3}),0,y,.128,sp,[1,1,.45]);
      }
      this.sphere(.008,this.material('#ff5a5a',{emissive:'#ff3b3b',emissiveIntensity:1.2}),.085,.17,.134,sp);
      this.interactive(sp,'music');
    }
    // RGB tower: rounded case with glass on the side and top; glowing ring fans behind both, an RGB strip on the front.
    const tw=this.group(1.58,1.585,-.2,g);
    this.slab(.38,.56,.64,this.material('#1d1f2b',{roughness:.4}),0,0,0,tw,.05,.025);
    const fans=this.material('#2a3fff',{emissive:'#4f7dff',emissiveIntensity:1.2});
    const inner=new THREE.MeshBasicMaterial({color:'#3b5bff',transparent:true,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false});
    const hub=this.material('#11131a',{roughness:.6}),bladeMat=this.material('#1a1c26');
    const blades: THREE.Group[]=[];
    const fan=(x: number,y: number,z: number,rot: Vec3,size=.075)=>{
      const f=this.group(x,y,z,tw);f.rotation.set(...rot);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(size,.012,10,40),fans);f.add(ring);
      const disc=this.cylinder(size-.006,size-.006,.004,hub,0,0,-.004,f,32);disc.rotation.x=Math.PI/2;
      const b=this.group(0,0,.002,f);blades.push(b);
      for(let i=0;i<7;i++){const arm=this.group(0,0,0,b);arm.rotation.z=i*TAU/7;const blade=this.box(.024,size*.62,.003,bladeMat,.008,size*.42,0,arm,0);blade.rotation.z=-.45;}
      const cap=this.cylinder(.02,.02,.006,fans,0,0,.004,f,20);cap.rotation.x=Math.PI/2;
    };
    for(const y of [.19,0,-.19])fan(.19,y,0,[0,Math.PI/2,0]);
    for(const z of [-.13,.13])fan(0,.321,z,[-Math.PI/2,0,0],.07);
    this.box(.004,.56,.5,inner,.193,0,0,tw,0);
    const glass=this.material('#9fb0ff',{transparent:true,opacity:.16,roughness:.05,metalness:.2});
    this.box(.008,.58,.5,glass,.205,0,0,tw,0);this.box(.32,.008,.5,glass,0,.33,0,tw,0);
    this.box(.016,.5,.008,fans,.13,0,.281,tw,.004);
    const light=new THREE.PointLight('#5b7cff',.25,2.5,2);light.position.set(.35,0,.2);tw.add(light);
    this.rgb={glow:inner,fans,light,blades};
    // Ergonomic mesh chair: plump waterfall seat, a curved mesh back that hugs the sitter, headrest and lumbar pad.
    this.chair=this.group(-.75,0,-1.35);
    const seat=this.material('#cfd2d4',{roughness:.8}),frame=this.material('#8d9196',{metalness:.3,roughness:.45}),dark=this.material('#3b3e43');
    const mesh=this.material('#55595e',{transparent:true,opacity:.85,roughness:.95,side:THREE.DoubleSide});
    this.slab(.64,.62,.13,seat,0,.66,0,this.chair,.14,.055);
    for(const x of [-.25,.25])this.box(.05,.24,.05,frame,x,.77,.3,this.chair,.015);
    const back=this.group(0,1.18,.34,this.chair);back.rotation.x=.1;
    this.arcPanel(.9,.56,.8,mesh,back,false);
    for(const y of [-.41,.41])this.arcPanel(.9,.6,.045,frame,back,false).position.y=y;
    const edge=.9-.9*Math.cos(.3/.9);
    for(const s of [-1,1])this.box(.045,.86,.045,frame,s*.9*Math.sin(.3/.9),0,-edge,back,.018);
    const lumbar=this.arcPanel(.88,.48,.12,seat,back,false);lumbar.position.set(0,-.18,-.02);
    this.box(.04,.14,.03,frame,0,.5,.01,back,.012);
    const head=this.arcPanel(.7,.4,.15,seat,back,false);head.position.set(0,.62,0);
    const head2=this.arcPanel(.7,.4,.15,seat,back,false);head2.position.set(0,.62,.03);
    this.cylinder(.045,.045,.49,dark,0,.36,0,this.chair);this.cylinder(.06,.05,.06,frame,0,.57,0,this.chair);
    for(let i=0;i<5;i++){const leg=this.group(0,.14,0,this.chair);leg.rotation.y=i*TAU/5;this.box(.05,.045,.47,dark,0,0,.2,leg,.018);this.sphere(.065,m.black,0,-.04,.39,leg);}
    for(const x of [-.38,.38]){this.box(.05,.27,.05,frame,x,.81,0,this.chair,.015);this.slab(.09,.38,.05,dark,x,.96,-.02,this.chair,.04,.018);}
    this.interactive(this.chair,'about');
  }
  private buildDrawers(){
    // Back panel against the left wall, drawers facing into the room.
    const m=this.m;const g=this.group(-3.33,0,.52);g.rotation.y=Math.PI/2;
    for(const x of [-.64,.64])for(const z of [-.4,.4])this.box(.1,.2,.1,m.darkWood,x,.17,z,g);
    this.box(1.55,.1,1.1,m.wood,0,.29,0,g);this.box(1.64,.12,1.14,m.wood,0,1.42,0,g);
    for(const x of [-.73,.73])this.box(.09,1.12,1.08,m.wood,x,.85,0,g);
    this.box(1.4,1.08,.06,m.darkWood,0,.83,-.49,g);
    for(let i=0;i<3;i++){
      const drawer=this.group(0,1.2-i*.36,.0,g);this.drawers.push(drawer);
      this.box(1.4,.32,.08,m.wood,0,0,.55,drawer);
      this.box(1.32,.05,.92,m.darkWood,0,-.13,.02,drawer);
      for(const x of [-.65,.65])this.box(.04,.24,.92,m.darkWood,x,0,.02,drawer);
      this.box(.28,.035,.04,m.gold,0,0,.613,drawer);
      // Empty for now; something new will live in here.
      this.interactive(drawer,'drawer',i);
    }
    this.buildNotepad(g);
  }
  /** The monitor's wallpaper: a tiny desktop hinting at the full one that opens on click. */
  private desktopTexture(){
    const W=840,H=360;const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const c=canvas.getContext('2d')!;
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=this.renderer.capabilities.getMaxAnisotropy();
    const round=(x: number,y: number,w: number,h: number,r: number)=>{c.beginPath();c.roundRect(x,y,w,h,r);};
    const images: { wall?: HTMLImageElement }={};const logos: Record<string,HTMLImageElement>={};
    const draw=()=>{
      const {wall}=images;
      c.fillStyle='#ffffff';c.fillRect(0,0,W,H);
      if(wall){const k=Math.max(W/wall.width,H/wall.height);c.drawImage(wall,(W-wall.width*k)/2,(H-wall.height*k)/2,wall.width*k,wall.height*k);}
      c.fillStyle='#ffffffd9';c.fillRect(0,0,W,24);c.fillStyle='#1c1c1c';c.font='12px sans-serif';c.textBaseline='middle';c.textAlign='right';c.fillText(profile.name||'',W-14,12);c.textAlign='left';
      // Dock: the Projects folder, the apps with their logos, then Stack, Readme and Say hello.
      const dock: { tile: string; icon?: string }[]=[{tile:'#d9b26a'},...profile.apps.map(a=>({tile:a.tile,icon:a.icon})),{tile:'#9ab793'},{tile:'#f3f1e9'},{tile:'#c8693f'}];
      const dw=dock.length*40+16;
      c.fillStyle='#ffffffb3';round(W/2-dw/2,H-52,dw,44,12);c.fill();
      dock.forEach((d,i)=>{
        const x=W/2-dw/2+12+i*40,y=H-46;
        c.fillStyle=d.tile;round(x,y,32,32,8);c.fill();
        const img=d.icon&&logos[d.icon];if(img)c.drawImage(img,x+7,y+7,18,18);
      });
      tex.needsUpdate=true;
    };
    draw();
    const wall=new Image();wall.onload=()=>{images.wall=wall;draw();};wall.src='desktop/wallpaper.jpg';
    profile.apps.forEach(a=>{const img=new Image();img.onload=()=>{logos[a.icon]=img;draw();};img.src=`desktop/icons/${a.icon}`;});
    return tex;
  }
  /** Spiral notepad on top of the drawers listing what's being built right now. */
  private buildNotepad(parent: THREE.Group){
    const m=this.m;const pad=this.group(.3,1.48,.04,parent);pad.rotation.y=-.1;pad.scale.setScalar(1.3);
    this.box(.38,.03,.48,m.cream,0,.015,0,pad,.006);
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=640;const c=canvas.getContext('2d')!;
    c.fillStyle='#f6f1df';c.fillRect(0,0,512,640);
    c.strokeStyle='#8aa3b8';c.lineWidth=3;for(let y=150;y<640;y+=58){c.beginPath();c.moveTo(0,y);c.lineTo(512,y);c.stroke();}
    c.strokeStyle='#d98a7a';c.lineWidth=3;c.beginPath();c.moveTo(72,0);c.lineTo(72,640);c.stroke();
    const hand='"Segoe Print","Bradley Hand","Comic Sans MS",cursive';
    c.fillStyle='#1d3a2d';c.font=`bold 70px ${hand}`;c.fillText('TO DO',96,112);
    profile.todo.slice(0,8).forEach((item,i)=>{
      const y=136+(i+1)*58;c.strokeStyle='#2f4a3e';c.lineWidth=3;c.strokeRect(92,y-34,26,26);
      if(item.done){c.beginPath();c.moveTo(96,y-22);c.lineTo(104,y-12);c.lineTo(118,y-38);c.stroke();}
      c.fillStyle=item.task?'#1d3a2d':'#7d8070';c.font=`bold ${item.task?36:32}px ${hand}`;c.fillText(item.task||'to be added…',134,y-8,360);
    });
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=this.renderer.capabilities.getMaxAnisotropy();
    const sheet=new THREE.Mesh(new THREE.PlaneGeometry(.36,.45),new THREE.MeshStandardMaterial({map:tex,roughness:.95}));
    sheet.rotation.x=-Math.PI/2;sheet.position.y=.032;sheet.receiveShadow=true;pad.add(sheet);
    for(let i=0;i<10;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.016,.003,6,16),m.metal);ring.rotation.y=Math.PI/2;ring.position.set(-.15+i*.033,.035,-.232);pad.add(ring);}
    const pencil=this.group(.25,.012,.02,pad);pencil.rotation.y=.25;
    const body=this.cylinder(.009,.009,.26,this.material('#e3b75a'),0,0,0,pencil,6);body.rotation.x=Math.PI/2;
    const tip=this.cylinder(0,.009,.03,this.material('#e8d3ab'),0,0,.145,pencil,6);tip.rotation.x=Math.PI/2;
    this.interactive(pad,'todo');
  }
  private buildBed(){
    const m=this.m;const g=this.group(2.55,0,.68);
    for(const x of [-.82,.82])for(const z of [-1.36,1.36])this.box(.13,.28,.13,m.darkWood,x,.22,z,g);
    this.box(1.94,.25,3.15,m.wood,0,.42,0,g,.07);
    this.box(1.98,1.15,.14,m.wood,0,.75,-1.53,g,.05);
    this.box(1.87,.28,2.97,m.cream,0,.66,0,g,.12);
    this.box(1.91,.16,2.14,m.green,0,.86,.42,g,.12);
    this.box(1.92,.15,.36,this.material('#919b74'),0,.94,-.49,g,.05);
    for(const x of [-.47,.47])this.box(.76,.2,.53,m.cream,x,.9,-1.04,g,.16).rotation.y=x*.12;
    const blanket=this.material('#c6b599');this.box(1.93,.05,.65,blanket,0,.97,1.06,g,.04);this.box(.04,.35,.65,blanket,.96,.81,1.06,g,.02);
    for(let i=0;i<10;i++)this.box(1.94,.005,.012,m.cream,0,1.0,.8+i*.055,g,0);
    this.interactive(g,'bed');
  }
  private buildCloset(){
    const m=this.m;const g=this.group(-3.07,0,-2.63);
    this.box(1.46,2.7,.85,m.wood,0,1.46,0,g,.045);
    this.box(1.27,2.45,.02,m.darkWood,0,1.46,.44,g);
    for(const side of [-1,1]){
      const pivot=this.group(side*.69,1.47,.47,g);this.closetDoors.push(pivot);
      this.box(.69,2.58,.07,m.wood,-side*.345,0,0,pivot,.015);
      for(let j=0;j<12;j++)this.box(.014,2.42,.009,m.darkWood,-side*(.04+j*.052),0,.04,pivot,.003);
      this.box(.025,.19,.035,m.gold,-side*.59,-.03,.06,pivot);
    }
    const rail=this.cylinder(.018,.018,1.15,m.metal,0,2.37,.27,g);rail.rotation.z=Math.PI/2;
    ['#8d9b74','#b79876','#8297a1','#e5dfc9'].forEach((color,i)=>this.box(.18,.82,.36,this.material(color),-.42+i*.28,1.88,.23,g,.05));
    this.box(1.43,.1,.91,m.darkWood,0,.15,0,g);this.interactive(g,'wardrobe');
    this.box(.66,.3,.52,m.cream,0,2.97,-.05,g,.04);this.box(.68,.05,.54,m.darkWood,0,3.13,-.05,g);
  }
  private buildStereo(){
    const m=this.m;const g=this.group(1.95,0,-2.77);
    this.box(1.28,.09,.68,m.wood,0,.72,0,g);
    for(const x of [-.53,.53])for(const z of [-.23,.23])this.box(.05,.67,.05,m.darkWood,x,.36,z,g);
    // Turntable: walnut plinth, matte top plate, platter with grooves, and a tonearm that swings in while music plays.
    this.box(.7,.11,.52,m.darkWood,0,.825,0,g,.03);
    this.box(.66,.012,.48,this.material('#454b43',{roughness:.6}),0,.884,0,g,.004);
    for(const x of [-.22,.22])this.box(.06,.03,.025,m.gold,x,.895,-.255,g,.006);
    this.platter=this.group(-.07,.9,0,g);
    this.cylinder(.215,.215,.018,m.metal,0,0,0,this.platter,48);
    this.cylinder(.205,.205,.012,this.material('#1f2420',{roughness:.32}),0,.014,0,this.platter,48);
    const groove=this.material('#3b423c',{roughness:.3});
    for(const r of [.19,.165,.14,.112]){const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.0022,4,64),groove);ring.rotation.x=Math.PI/2;ring.position.y=.0205;this.platter.add(ring);}
    this.cylinder(.072,.072,.014,m.terracotta,0,.016,0,this.platter,32);
    this.box(.055,.004,.014,m.cream,.03,.024,0,this.platter,0);
    this.cylinder(.006,.006,.035,m.metal,0,.03,0,this.platter,8);
    // Tonearm pivots at the back right; rotation.y 0.15 is its rest, about -0.45 drops it on the lead-in groove.
    this.tonearm=this.group(.22,.89,-.17,g);
    this.cylinder(.035,.042,.03,m.metal,0,.015,0,this.tonearm);
    this.box(.016,.016,.3,m.gold,0,.05,.15,this.tonearm,.004);
    this.box(.04,.012,.05,m.black,0,.044,.3,this.tonearm,.004);
    const weight=this.cylinder(.022,.022,.04,m.black,0,.05,-.04,this.tonearm,16);weight.rotation.x=Math.PI/2;
    this.tonearm.rotation.y=.15;
    this.cylinder(.008,.008,.05,m.metal,.33,.91,.06,g,8);
    const knob=this.cylinder(.028,.03,.02,m.metal,.25,.895,.18,g,20);knob.rotation.y=.4;
    this.stereoLed=this.material('#5d4733',{emissive:'#e8603c',emissiveIntensity:0});this.sphere(.011,this.stereoLed,.17,.895,.2,g);
    // Bookshelf speakers: walnut cabinets, fabric baffle, ringed woofer and tweeter.
    const cloth=this.material('#545a4f',{roughness:.95});
    for(const x of [-.53,.53]){
      const speaker=this.group(x,.99,0,g);this.box(.25,.46,.28,m.darkWood,0,0,0,speaker,.03);
      this.box(.215,.42,.012,cloth,0,0,.136,speaker,.01);
      for(const [y,r] of [[-.075,.072],[.12,.034]] as const){
        const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.006,8,32),m.metal);ring.position.set(0,y,.145);speaker.add(ring);
        const cone=this.cylinder(r*.92,r*.92,.012,m.black,0,y,.143,speaker,32);cone.rotation.x=Math.PI/2;if(y<0)this.cones.push(cone);
        this.sphere(r*.32,y<0?m.black:m.gold,0,y,.15,speaker,[1,1,.5]);
      }
      this.box(.05,.012,.004,m.gold,0,-.19,.144,speaker,0);
    }
    ['#c8693f','#7b8860','#3c5346','#e0b36a','#8297a1','#b79876','#a85a47','#5c6b4a'].forEach((color,i)=>this.box(.04,.38,.38,this.material(color),-.35+i*.045,.27,0,g));
    this.interactive(g,'music');
  }
  /** Called by App whenever playback starts or stops; progress lets the arm creep toward the label. */
  setMusic(on: boolean,progress: () => number = () => 0){
    this.musicOn=on;this.musicProgress=progress;
    this.stereoLed.emissiveIntensity=on?1.6:0;this.stereoLed.color.set(on?'#e8603c':'#5d4733');
  }
  private animateStereo(dt: number){
    const target=this.musicOn?-.45-.17*this.musicProgress():.15;
    if(this.reduced){this.tonearm.rotation.y=target;return;}
    this.tonearm.rotation.y+=(target-this.tonearm.rotation.y)*Math.min(1,dt*3);
    if(this.musicOn)this.platter.rotation.y-=dt*.9;
    this.cones.forEach((cone,i)=>{const pulse=this.musicOn?Math.abs(Math.sin(this.time*8.5+i*1.3))*.07:0;cone.scale.set(1+pulse,1,1+pulse);});
  }
  private buildAC(){
    const m=this.m;const g=this.group(-3.88,2.98,-.3);g.rotation.y=Math.PI/2;
    this.box(1.48,.45,.27,m.cream,0,0,0,g,.09);
    this.box(1.2,.08,.03,this.material('#a6afa1'),0,-.13,.14,g,.02);
    // Louver flap hinged on the vent's front edge; it swings out while the AC runs.
    this.acFlap=this.group(0,-.17,.15,g);this.box(1.2,.07,.02,m.cream,0,-.035,0,this.acFlap,.008);this.acFlap.rotation.x=-.8;
    this.acLed=this.material('#b8f0a0',{emissive:'#9ee68a',emissiveIntensity:1.4});this.sphere(.02,this.acLed,.6,.06,.14,g);
    // Temperature printed straight onto the front panel, centred.
    const temp=document.createElement('canvas');temp.width=320;temp.height=128;const c=temp.getContext('2d')!;
    c.fillStyle='#4a7340';c.font='bold 104px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('24°',160,68);
    const tex=new THREE.CanvasTexture(temp);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=this.renderer.capabilities.getMaxAnisotropy();
    this.acDisplay=new THREE.Mesh(new THREE.PlaneGeometry(.4,.16),new THREE.MeshBasicMaterial({map:tex,transparent:true}));this.acDisplay.position.set(0,.05,.137);g.add(this.acDisplay);
    this.interactive(g,'ac');
  }
  private plant(x: number,y: number,z: number,s=1){
    const g=this.group(x,y,z);const m=this.m;
    this.cylinder(.17*s,.13*s,.28*s,m.terracotta,0,.14*s,0,g);this.cylinder(.155*s,.155*s,.01,m.soil,0,.283*s,0,g);
    for(let i=0;i<9;i++){
      const angle=i*2.4;const h=(.38+(i%3)*.16)*s;const stem=this.cylinder(.008*s,.008*s,h,m.leaf,Math.sin(angle)*.06*s,.28*s+h/2,Math.cos(angle)*.06*s,g,5);stem.rotation.z=Math.sin(angle)*.3;
      const leaf=this.sphere(.15*s,i%2?m.leaf:m.darkGreen,Math.sin(angle)*.16*s,.3*s+h,Math.cos(angle)*.16*s,g,[.48,1.3,.7]);leaf.rotation.z=-Math.sin(angle)*.7;leaf.rotation.y=angle;
    }return g;
  }
  private buildDetails(){
    const m=this.m;
    this.plant(-3.35,.1,2.05,1.6);
    // GitHub and X posters on the left wall, facing into the room; each links to its profile.
    POSTERS.forEach((poster,i)=>{
      const frame=this.group(-3.9,2.55,1.95+i*1.02);frame.rotation.y=Math.PI/2;
      this.box(.82,1.08,.055,m.darkWood,0,0,0,frame);this.box(.72,.98,.015,m.cream,0,0,.04,frame);
      const art=document.createElement('canvas');art.width=512;art.height=697;const c=art.getContext('2d')!;
      c.fillStyle='#f0eee1';c.fillRect(0,0,512,697);
      c.save();c.translate(136,90);c.scale(10,10);c.fillStyle=poster.color;c.fill(new Path2D(poster.path));c.restore();
      c.fillStyle='#24332a';c.font='bold 66px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(poster.handle,256,450,470);
      c.fillRect(196,520,120,8);
      const tex=new THREE.CanvasTexture(art);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=this.renderer.capabilities.getMaxAnisotropy();
      const face=new THREE.Mesh(new THREE.PlaneGeometry(.72,.98),new THREE.MeshStandardMaterial({map:tex,roughness:.9}));face.position.z=.049;face.receiveShadow=true;frame.add(face);
      this.interactive(frame,poster.action);
    });
    // Books and a mug on a small circular coffee table.
    this.cylinder(.45,.45,.08,m.wood,.35,.48,2.28);
    for(let i=0;i<3;i++){const a=i*TAU/3;this.box(.055,.39,.055,m.darkWood,.35+Math.sin(a)*.29,.27,2.28+Math.cos(a)*.29);}
    this.box(.33,.05,.25,m.terracotta,.27,.55,2.29).rotation.y=.3;this.box(.3,.04,.23,m.cream,.28,.59,2.28).rotation.y=.3;
    this.cylinder(.065,.055,.12,m.cream,.58,.58,2.16);
    // Wall clock beside the window, running on the owner's time; hands are set in frame().
    const clock=this.group(3.3,2.6,-3.42);
    const face=this.cylinder(.23,.23,.045,m.cream,0,0,0,clock);face.rotation.x=Math.PI/2;
    for(let i=0;i<12;i++){const tick=this.group(0,0,.025,clock);tick.rotation.z=i*TAU/12;this.box(.012,i%3?.03:.05,.006,m.darkGreen,0,.19,0,tick,0);}
    const hand=(w: number,l: number,z: number,material: THREE.Material)=>{const pivot=this.group(0,0,z,clock);this.box(w,l,.006,material,0,l/2-.02,0,pivot,0);return pivot;};
    this.clockHands={hour:hand(.024,.13,.03,m.darkGreen),minute:hand(.016,.18,.036,m.darkGreen),second:hand(.007,.2,.042,m.terracotta)};
    const cap=this.cylinder(.018,.018,.012,m.darkGreen,0,0,.046,clock);cap.rotation.x=Math.PI/2;
    this.interactive(clock,'clock');
  }
  private buildAvatar(){
    const m=this.m;this.avatar=this.group(-.75,-.24,-1.35);this.avatar.rotation.y=Math.PI;const a=this.avatar;
    this.pelvis=this.group(0,.91,0,a);
    this.box(.43,.25,.29,m.pants,0,0,0,this.pelvis,.08);
    this.torso=this.group(0,.26,0,this.pelvis);
    this.box(.54,.53,.34,m.shirt,0,.12,0,this.torso,.12);
    this.hood=this.sphere(.19,m.shirt,0,.35,-.05,this.torso,[1.1,.6,.9]);
    this.cylinder(.08,.08,.13,m.skin,0,.49,0,this.torso);
    this.head=this.group(0,.73,0,this.torso);
    this.sphere(.255,m.skin,0,0,0,this.head,[.86,1.1,.88]);
    for(const x of [-.22,.22])this.sphere(.054,m.skin,x,-.025,0,this.head,[.6,1,.8]);
    this.sphere(.25,m.hair,0,.11,-.035,this.head,[.91,.69,.9]);
    for(let i=0;i<6;i++)this.sphere(.075,m.hair,-.17+i*.065,.15,.14,this.head,[1,.7,.8]);
    for(const x of [-.085,.085]){this.sphere(.018,m.black,x,.01,.207,this.head,[1,1.2,.55]);this.box(.063,.018,.018,m.hair,x,.07,.202,this.head,.007);}
    this.sphere(.036,m.skin,0,-.045,.224,this.head,[.8,1,1.1]);this.box(.075,.013,.012,m.hair,0,-.13,.192,this.head,.005);
    this.cap=this.group(0,.1,0,this.head);
    this.sphere(.257,m.shirt,0,.04,-.025,this.cap,[.93,.5,.92]);
    this.box(.34,.035,.25,m.shirt,0,.035,.2,this.cap,.045);
    this.cap.visible=false;
    for(const side of [-1,1]){
      const leg=this.group(side*.135,-.07,0,this.pelvis);this.legs.push(leg);
      this.box(.2,.39,.22,m.pants,0,-.18,0,leg,.06);
      const shin=this.group(0,-.37,0,leg);this.shins.push(shin);
      this.box(.18,.36,.2,m.pants,0,-.17,0,shin,.04);
      this.box(.21,.13,.34,m.cream,0,-.37,.06,shin,.045);this.box(.22,.035,.35,m.white,0,-.43,.06,shin,.01);
      const arm=this.group(side*.31,.29,0,this.torso);this.arms.push(arm);
      this.box(.13,.25,.14,m.skin,0,-.21,0,arm,.04);
      this.sleeves.push(this.box(.18,.36,.2,m.shirt,0,-.13,0,arm,.07));
      this.sphere(.092,m.skin,0,-.36,.01,arm,[.8,1.2,.9]);
    }
    this.setSeat(1);this.interactive(a,'about');
  }
  private setSeat(amount: number){
    this.avatar.position.y=-.24*amount;
    for(let i=0;i<2;i++){this.legs[i].rotation.x=-Math.PI/2*amount;this.shins[i].rotation.x=Math.PI/2*amount;this.arms[i].rotation.x=-.7*amount;}
  }
  private bindPointer(){
    const el=this.renderer.domElement;let down: [number, number] | undefined;
    const hit=(e: PointerEvent)=>{const r=el.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);return this.raycaster.intersectObjects(this.targets,false)[0];};
    const onDown=(e: PointerEvent)=>{down=[e.clientX,e.clientY];};
    const onUp=(e: PointerEvent)=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;const found=hit(e);if(found)this.onSelect(found.object.userData.action,found.object.userData.index);};
    const onMove=(e: PointerEvent)=>{el.style.cursor=hit(e)?'pointer':'grab';};
    el.addEventListener('pointerdown',onDown);el.addEventListener('pointerup',onUp);el.addEventListener('pointermove',onMove);
    this.unbindPointer=()=>{el.removeEventListener('pointerdown',onDown);el.removeEventListener('pointerup',onUp);el.removeEventListener('pointermove',onMove);};
  }
  private resize(){
    const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;
    const aspect=w/h;const size=aspect<1?13.2/aspect:10.2/1.2;const lift=aspect<1?0:.5;
    this.camera.left=-size*aspect/2;this.camera.right=size*aspect/2;this.camera.top=size/2+lift;this.camera.bottom=-size/2+lift;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);
  }
  private tween(duration: number,update: (t: number) => void){return new Promise<void>(resolve=>{if(this.reduced){update(1);resolve();return;}this.tweens.push({start:performance.now(),duration:duration*1000,update,resolve});});}
  private async walkTo(x: number,z: number){
    const start=this.avatar.position.clone();const distance=Math.hypot(x-start.x,z-start.z);if(distance<.03)return;
    this.avatar.rotation.y=Math.atan2(x-start.x,z-start.z);this.walking=true;
    await this.tween(Math.min(1.3,distance*.33),t=>{this.avatar.position.x=THREE.MathUtils.lerp(start.x,x,t);this.avatar.position.z=THREE.MathUtils.lerp(start.z,z,t);});
    this.walking=false;this.setSeat(0);
  }
  private async stand(){if(!this.seated)return;this.seated=false;await this.tween(.35,t=>{this.setSeat(1-t);this.chair.position.z=-1.35+t*.42;});await this.walkTo(-.5,-.65);}
  async openDrawer(index: number){
    if(this.activeDrawer>=0&&this.activeDrawer!==index){const old=this.drawers[this.activeDrawer];const start=old.position.z;await this.tween(.28,t=>old.position.z=start*(1-t));}
    this.activeDrawer=index;const d=this.drawers[index];const start=d.position.z;
    await this.tween(.45,t=>{d.position.z=THREE.MathUtils.lerp(start,.65,t);this.arms[0].rotation.x=-.6*Math.sin(t*Math.PI);});
  }
  async visit(action: RoomAction,index=0){
    if(action==='desktop'){await this.resetCamera();await this.focusCamera(new THREE.Vector3(-.75,1.86,-2.78),2.35);return;}
    if(action==='about'){await this.wave();return;}
    await this.stand();await this.walkTo(-.45,.35);
    if(action==='curtains'){await this.walkTo(...CORD.aisle);await this.walkTo(...CORD.stand);this.avatar.rotation.y=Math.PI;await this.pullCord();return;}
    const dest: Partial<Record<RoomAction,[number,number]>>={drawer:[-1.55,.52],todo:[-1.55,.52],music:[1.3,-1.65],wardrobe:[-2.8,-1.2]};
    const to=dest[action];if(to)await this.walkTo(...to);this.avatar.rotation.y=action==='drawer'||action==='todo'?-Math.PI/2:Math.PI;
    if(action==='drawer')await this.openDrawer(index);
    if(action==='todo')await this.focusCamera(new THREE.Vector3(-3.0,1.5,.22),3.4,new THREE.Vector3(3.6,6.3,8));
    if(action==='wardrobe'){await this.tween(.5,t=>{this.closetDoors[0].rotation.y=-t*1.1;this.closetDoors[1].rotation.y=t*1.1;});this.wardrobeOpen=true;}
  }
  async home(){
    if(this.activeDrawer>=0){const d=this.drawers[this.activeDrawer];const start=d.position.z;await this.tween(.4,t=>d.position.z=start*(1-t));this.activeDrawer=-1;}
    if(this.wardrobeOpen){await this.tween(.4,t=>{this.closetDoors[0].rotation.y=-(1-t)*1.1;this.closetDoors[1].rotation.y=(1-t)*1.1;});this.wardrobeOpen=false;}
    await this.resetCamera();
    if(!this.seated){if(this.avatar.position.x>2.5)await this.walkTo(...CORD.aisle);await this.walkTo(-.45,.35);await this.walkTo(-.75,-1.35);this.avatar.rotation.y=Math.PI;await this.tween(.4,t=>{this.setSeat(t);this.chair.position.z=-.93-t*.42;});this.seated=true;}
  }
  async setNight(night: boolean,instant=false){
    const from=this.night?1:0,to=night?1:0;this.night=night;
    await this.tween(instant?0:1,t=>{
      const v=THREE.MathUtils.lerp(from,to,t);
      this.curtains.forEach((curtain,i)=>{curtain.position.x=(i===0?-1:1)*THREE.MathUtils.lerp(1.46,.75,v);curtain.scale.x=1+v*1.7;});
      this.ambient.intensity=2.5-v*1.8;this.sun.intensity=3.1-v*2.95;this.moon.intensity=v*1.4;this.lampLight.intensity=v*6;this.monitorLight.intensity=.2+v*2;this.backlight.opacity=.12+v*.78;this.rgbNight=v;
      this.windowMaterial.color.set('#d8e3d6').lerp(new THREE.Color('#536e84'),v);this.windowMaterial.emissiveIntensity=.35-v*.2;
    });
  }
  private async focusCamera(focus=new THREE.Vector3(-.7,1.55,-2.1),toZoom=1.75,toPos=new THREE.Vector3(3,5,8)){
    this.controls.enabled=false;const start=this.camera.position.clone(),target=this.controls.target.clone(),zoom=this.camera.zoom;
    await this.tween(.8,t=>{this.camera.position.lerpVectors(start,toPos,t);this.controls.target.lerpVectors(target,focus,t);this.camera.zoom=THREE.MathUtils.lerp(zoom,toZoom,t);this.camera.updateProjectionMatrix();this.camera.lookAt(this.controls.target);});
  }
  private async resetCamera(){
    this.controls.enabled=false;const pos=this.camera.position.clone(),target=this.controls.target.clone(),zoom=this.camera.zoom;
    const unchanged=pos.distanceTo(new THREE.Vector3(11,9,13))<.01&&target.distanceTo(new THREE.Vector3(0,1,0))<.01&&zoom===1;
    if(!unchanged)await this.tween(.6,t=>{this.camera.position.lerpVectors(pos,new THREE.Vector3(11,9,13),t);this.controls.target.lerpVectors(target,new THREE.Vector3(0,1,0),t);this.camera.zoom=THREE.MathUtils.lerp(zoom,1,t);this.camera.updateProjectionMatrix();this.camera.lookAt(this.controls.target);});
    this.controls.enabled=true;this.controls.update();
  }
  async wave(){const prev=this.avatar.rotation.y;this.waving=true;await this.tween(.8,t=>{this.avatar.rotation.y=THREE.MathUtils.lerp(prev,.5,Math.sin(t*Math.PI));this.arms[1].rotation.z=-Math.sin(t*Math.PI)*2.4;this.arms[1].rotation.x=-.4;});this.arms[1].rotation.z=0;this.avatar.rotation.y=prev;this.waving=false;}
  setOutfit(day: number){
    this.m.shirt.color.set(outfits[day].color);
    this.m.pants.color.set(['#c9b99b','#b5ac92','#596a6b','#d1c3a8','#454d48','#77775e','#697677'][day]);
    this.hood.visible=[1,4].includes(day);this.cap.visible=day===6;
    this.sleeves.forEach(sleeve=>{const short=[0,2,3,6].includes(day);sleeve.scale.y=short?.53:1;sleeve.position.y=short?-.05:-.13;});
  }
  toggleAC(){
    this.acOn=!this.acOn;const on=this.acOn;
    const led=this.acLed;led.color.set(on?'#b8f0a0':'#7d847a');led.emissiveIntensity=on?1.4:0;this.acDisplay.visible=on;
    const from=this.acFlap.rotation.x,to=on?-.8:0;this.tween(.6,t=>this.acFlap.rotation.x=THREE.MathUtils.lerp(from,to,t));
    return on;
  }
  private frame(){
    const now=performance.now();const last=this.time;this.time=this.clock.getElapsedTime();const dt=Math.min(.1,this.time-last);
    for(let i=this.tweens.length-1;i>=0;i--){const t=this.tweens[i];const p=t.duration===0?1:Math.min(1,(now-t.start)/t.duration);t.update(ease(p));if(p===1){this.tweens.splice(i,1);t.resolve();}}
    if(!this.reduced){
      if(this.walking){const step=Math.sin(this.time*12);this.legs[0].rotation.x=step*.43;this.legs[1].rotation.x=-step*.43;this.arms[0].rotation.x=-step*.35;this.arms[1].rotation.x=step*.35;this.avatar.position.y=Math.abs(step)*.035;}
      else if(this.seated&&!this.waving){this.arms[0].rotation.x=-.72+Math.sin(this.time*6)*.045;this.arms[1].rotation.x=-.72+Math.cos(this.time*7)*.035;this.head.rotation.x=Math.sin(this.time*.8)*.025;}
      this.torso.scale.y=1+Math.sin(this.time*1.8)*.006;
    }
    this.applyCord();this.animateStereo(dt);
    // The tower's fans spin and its RGB breathes; both glow harder at night.
    const breathe=this.reduced?1:.85+.15*Math.sin(this.time*1.6);
    if(!this.reduced)this.rgb.blades.forEach(b=>b.rotation.z-=dt*7);
    this.rgb.fans.emissiveIntensity=(1+1.6*this.rgbNight)*breathe;this.rgb.glow.opacity=(.3+.35*this.rgbNight)*breathe;this.rgb.light.intensity=.25+1.5*this.rgbNight;
    const owner=Date.now()/1000+ownerTime.offsetMinutes*60;
    this.clockHands.second.rotation.z=-(owner%60)/60*TAU;this.clockHands.minute.rotation.z=-(owner/60%60)/60*TAU;this.clockHands.hour.rotation.z=-(owner/3600%12)/12*TAU;
    if(this.controls.enabled)this.controls.update();
    this.renderer.render(this.scene,this.camera);
    const w=this.container.clientWidth,h=this.container.clientHeight;
    for(const label of this.labels){const p=label.point.clone().project(this.camera);label.el.style.left=`${(p.x*.5+.5)*w}px`;label.el.style.top=`${(-p.y*.5+.5)*h}px`;label.el.style.visibility=(p.z>1||this.camera.zoom>1.35)?'hidden':'visible';}
  }
}
