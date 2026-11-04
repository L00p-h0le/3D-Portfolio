import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { outfits } from '../data/outfits';
import { ownerTime } from '../data/profile';

export type RoomAction = 'projects' | 'stack' | 'about' | 'music' | 'wardrobe' | 'curtains' | 'ac' | 'bed' | 'github' | 'twitter' | 'clock';
export type PanelType = 'projects' | 'stack' | 'about' | 'music' | 'wardrobe' | 'contact';
type Vec3 = [number, number, number];
type MaterialName = 'wood'|'darkWood'|'floor'|'wall'|'trim'|'cream'|'green'|'darkGreen'|'curtain'|'black'|'metal'|'gold'|'white'|'terracotta'|'soil'|'leaf'|'skin'|'hair'|'pants'|'shirt'|'screen';
interface Tween { start: number; duration: number; update: (t: number) => void; resolve: () => void }

// Hotspot labels rendered by React; the room projects them into place every frame.
export const HOTSPOTS: { action: RoomAction; label: string; point: Vec3; num: string }[] = [
  { action:'projects', label:'The projects', point:[-2.8,1.9,.52], num:'01' },
  { action:'stack', label:'The workbench', point:[-.65,2.5,-2.2], num:'02' },
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
    this.monitorLight=new THREE.PointLight('#a0cce5',.2,4,2);this.monitorLight.position.set(-.7,1.5,-2);this.scene.add(this.monitorLight);
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
  private buildDesk(){
    const m=this.m;const g=this.group(-.9,0,-2.48);
    this.box(2.8,.13,1.17,m.wood,0,1.19,0,g,.045);
    for(const x of [-1.23,1.23])for(const z of [-.43,.43])this.box(.095,1.13,.095,m.darkWood,x,.6,z,g);
    this.box(2.4,.07,.07,m.darkWood,0,.4,-.43,g);
    this.box(.97,.012,.46,m.darkGreen,.1,1.267,.17,g,.05);
    const mon=this.group(.15,1.82,-.28,g);
    this.box(1.25,.77,.075,m.black,0,0,0,mon,.04);
    this.box(1.14,.65,.012,m.screen,0,.015,.047,mon,.01);
    this.box(.07,.25,.07,m.black,0,-.46,-.02,mon);this.box(.4,.025,.25,m.black,0,-.56,0,mon);
    const screenCanvas=document.createElement('canvas');screenCanvas.width=640;screenCanvas.height=360;const c=screenCanvas.getContext('2d')!;
    c.fillStyle='#233b35';c.fillRect(0,0,640,360);c.fillStyle='#344b40';c.fillRect(0,0,640,32);
    for(let i=0;i<3;i++){c.fillStyle=['#d7997a','#d4c487','#9ab793'][i];c.beginPath();c.arc(18+i*18,16,4,0,TAU);c.fill();}
    c.fillStyle='#dce7c9';c.font='20px monospace';c.fillText('a little curiosity,',40,100);c.fillText('a lot of possibilities.',40,132);
    const lines=['const life = {','  build: somethingMeaningful,','  learn: everyDay,','  coffee: true','};'];
    lines.forEach((line,i)=>{c.fillStyle=i===0||i===4?'#9cc2a5':'#d3c694';c.font='15px monospace';c.fillText(line,40,190+i*25);});
    const tex=new THREE.CanvasTexture(screenCanvas);tex.colorSpace=THREE.SRGBColorSpace;
    const display=new THREE.Mesh(new THREE.PlaneGeometry(1.14,.65),new THREE.MeshBasicMaterial({map:tex}));display.position.set(0,.015,.055);mon.add(display);
    this.box(.7,.035,.25,m.cream,.02,1.29,.25,g);
    for(let r=0;r<4;r++)for(let i=0;i<11;i++)this.box(.045,.008,.04,i===0?m.green:m.white,-.28+i*.055,1.313,.16+r*.055,g,.004);
    this.sphere(.055,m.cream,.56,1.3,.29,g,[.8,.3,1.3]);
    this.cylinder(.09,.073,.17,m.terracotta,-.93,1.34,.3,g);this.cylinder(.073,.073,.008,m.soil,-.93,1.429,.3,g);
    const handle=new THREE.Mesh(new THREE.TorusGeometry(.065,.016,8,16),m.terracotta);handle.position.set(-.82,1.36,.3);g.add(handle);
    this.cylinder(.14,.15,.025,m.darkGreen,-1.03,1.28,-.32,g);this.cylinder(.016,.016,.5,m.darkGreen,-1.03,1.52,-.32,g);
    this.cylinder(.09,.24,.23,m.green,-1.03,1.85,-.32,g);this.cylinder(.19,.19,.018,m.cream,-1.03,1.73,-.32,g);
    this.interactive(g,'stack');
    // Swivel chair, upholstered with a five-point base.
    this.chair=this.group(-.75,0,-1.35);
    this.box(.65,.13,.64,m.darkGreen,0,.66,0,this.chair,.09);
    this.box(.65,.68,.12,m.darkGreen,0,1.02,.29,this.chair,.09);
    this.cylinder(.048,.048,.49,m.metal,0,.36,0,this.chair);
    for(let i=0;i<5;i++){const leg=this.group(0,.14,0,this.chair);leg.rotation.y=i*TAU/5;this.box(.045,.045,.47,m.metal,0,0,.2,leg);this.sphere(.065,m.black,0,-.04,.39,leg);}
    for(const x of [-.39,.39]){this.box(.055,.27,.055,m.metal,x,.81,0,this.chair);this.box(.075,.06,.4,m.darkGreen,x,.96,-.02,this.chair);}
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
      // Blank folios awaiting the owner's projects.
      this.box(.76,.04,.57,m.cream,.06,-.08,.05,drawer);
      this.interactive(drawer,'projects',i);
    }
    const book=this.box(.43,.06,.3,m.darkGreen,.37,1.51,.06,g);book.rotation.y=.12;
    this.box(.4,.045,.28,m.cream,.36,1.56,.06,g);
    this.interactive(g.children[4],'projects',0);
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
    if(action==='stack'){await this.resetCamera();await this.focusCamera();return;}
    if(action==='about'){await this.wave();return;}
    await this.stand();await this.walkTo(-.45,.35);
    if(action==='curtains'){await this.walkTo(...CORD.aisle);await this.walkTo(...CORD.stand);this.avatar.rotation.y=Math.PI;await this.pullCord();return;}
    const dest: Partial<Record<RoomAction,[number,number]>>={projects:[-1.55,.52],music:[1.3,-1.65],wardrobe:[-2.8,-1.2]};
    const to=dest[action];if(to)await this.walkTo(...to);this.avatar.rotation.y=action==='projects'?-Math.PI/2:Math.PI;
    if(action==='projects')await this.openDrawer(index);
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
      this.ambient.intensity=2.5-v*1.8;this.sun.intensity=3.1-v*2.95;this.moon.intensity=v*1.4;this.lampLight.intensity=v*6;this.monitorLight.intensity=.2+v*2;
      this.windowMaterial.color.set('#d8e3d6').lerp(new THREE.Color('#536e84'),v);this.windowMaterial.emissiveIntensity=.35-v*.2;
    });
  }
  private async focusCamera(){
    this.controls.enabled=false;const start=this.camera.position.clone(),target=this.controls.target.clone(),zoom=this.camera.zoom;
    await this.tween(.8,t=>{this.camera.position.lerpVectors(start,new THREE.Vector3(3,5,8),t);this.controls.target.lerpVectors(target,new THREE.Vector3(-.7,1.55,-2.1),t);this.camera.zoom=THREE.MathUtils.lerp(zoom,1.75,t);this.camera.updateProjectionMatrix();this.camera.lookAt(this.controls.target);});
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
    const owner=Date.now()/1000+ownerTime.offsetMinutes*60;
    this.clockHands.second.rotation.z=-(owner%60)/60*TAU;this.clockHands.minute.rotation.z=-(owner/60%60)/60*TAU;this.clockHands.hour.rotation.z=-(owner/3600%12)/12*TAU;
    if(this.controls.enabled)this.controls.update();
    this.renderer.render(this.scene,this.camera);
    const w=this.container.clientWidth,h=this.container.clientHeight;
    for(const label of this.labels){const p=label.point.clone().project(this.camera);label.el.style.left=`${(p.x*.5+.5)*w}px`;label.el.style.top=`${(-p.y*.5+.5)*h}px`;label.el.style.visibility=(p.z>1||this.camera.zoom>1.35)?'hidden':'visible';}
  }
}
