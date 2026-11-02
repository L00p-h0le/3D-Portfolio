import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const TAU = Math.PI * 2;
const ease = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
export const outfits = [
  { day:'Sunday', name:'Slow Sunday', color:'#c3b190' },
  { day:'Monday', name:'Fresh start', color:'#7e8a68' },
  { day:'Tuesday', name:'Blue hour', color:'#6c8b9e' },
  { day:'Wednesday', name:'Midweek warmth', color:'#be8869' },
  { day:'Thursday', name:'Deep focus', color:'#7d7490' },
  { day:'Friday', name:'Off the clock', color:'#ab795e' },
  { day:'Saturday', name:'Weekend uniform', color:'#bca968' },
];

export class Room {
  constructor(container, onSelect) {
    this.container = container; this.onSelect = onSelect; this.tweens = []; this.targets = []; this.labels = [];
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.clock = new THREE.Clock(); this.walking = false; this.seated = true; this.night = false; this.acOn = true; this.activeDrawer = -1; this.wardrobeOpen = false;
    this.scene = new THREE.Scene();
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
    this.raycaster = new THREE.Raycaster(); this.pointer = new THREE.Vector2();
    this.materials(); this.lights(); this.buildRoom(); this.buildAvatar(); this.bindPointer(); this.makeLabels();
    this.resize(); this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(container);
    this.renderer.setAnimationLoop(() => this.frame());
  }
  material(color, extra={}) { return new THREE.MeshStandardMaterial({ color, roughness:.82, ...extra }); }
  materials() {
    const woodCanvas = document.createElement('canvas'); woodCanvas.width=256;woodCanvas.height=256;
    const c = woodCanvas.getContext('2d'); c.fillStyle='#c6a47c';c.fillRect(0,0,256,256);
    let seed=143; const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
    for(let i=0;i<270;i++){c.strokeStyle=`rgba(${random()>.5?'83,55,29':'248,222,180'},${random()*.14})`;c.lineWidth=random()*1.5;c.beginPath();const y=random()*256;c.moveTo(0,y);c.bezierCurveTo(80,y+random()*6,180,y-random()*7,256,y+random()*4);c.stroke();}
    const texture=new THREE.CanvasTexture(woodCanvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
    this.m = { wood:this.material('#e2c19b',{map:texture}), darkWood:this.material('#a77f58',{map:texture}), floor:this.material('#ead3ad',{map:texture}), wall:this.material('#deded0'), trim:this.material('#f3eee0'), cream:this.material('#f0eee1'), green:this.material('#7b8860'), darkGreen:this.material('#3c5346'), curtain:this.material('#c0c5a9'), black:this.material('#333a35'), metal:this.material('#838b7a',{metalness:.45,roughness:.42}), gold:this.material('#a39c76',{metalness:.5}), white:this.material('#f7f5e7'), terracotta:this.material('#b47d60'), soil:this.material('#534b37'), leaf:this.material('#668158'), skin:this.material('#c58b65'), hair:this.material('#39352e'), pants:this.material('#b5ac92'), shirt:this.material(outfits[new Date().getDay()].color), screen:this.material('#243b34',{emissive:'#719d80',emissiveIntensity:.12}) };
  }
  box(w,h,d,material,x=0,y=0,z=0,parent=this.scene,r=.025) {
    const mesh=new THREE.Mesh(r ? new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3)) : new THREE.BoxGeometry(w,h,d),material);
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  cylinder(rt,rb,h,material,x,y,z,parent=this.scene,segments=24) {
    const o=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,segments),material);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
  }
  sphere(radius,material,x,y,z,parent=this.scene,scale=[1,1,1]) {
    const o=new THREE.Mesh(new THREE.SphereGeometry(radius,20,16),material);o.position.set(x,y,z);o.scale.set(...scale);o.castShadow=true;parent.add(o);return o;
  }
  group(x=0,y=0,z=0,parent=this.scene){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;}
  interactive(group, action, index) { group.traverse(o=>{if(o.isMesh){o.userData={action,index};this.targets.push(o);}}); }
  lights(){
    this.ambient=new THREE.HemisphereLight('#fff7df','#a6a987',2.5);this.scene.add(this.ambient);
    this.sun=new THREE.DirectionalLight('#fff0cc',3.1);this.sun.position.set(-1,8,5);this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.5,far:25});this.sun.shadow.normalBias=.03;this.sun.shadow.bias=-.0003;this.sun.shadow.radius=4;this.scene.add(this.sun);
    this.lampLight=new THREE.PointLight('#ffd295',0,8,1.5);this.lampLight.position.set(-2,2.1,-2.3);this.scene.add(this.lampLight);
    this.monitorLight=new THREE.PointLight('#a0cce5',.2,4,2);this.monitorLight.position.set(-.7,1.5,-2);this.scene.add(this.monitorLight);
    this.moon=new THREE.DirectionalLight('#b1cfe7',0);this.moon.position.set(2,5,-4);this.scene.add(this.moon);
  }
  buildRoom(){
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
  buildWindow(){
    const m=this.m;const g=this.group(.65,2.4,-3.43);this.windowGroup=g;
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
    this.curtains=[];
    for(const side of [-1,1]){
      const curtain=this.group(side*1.46,0,.26,g);this.curtains.push(curtain);
      for(let i=0;i<11;i++){const fold=this.cylinder(.052,.062,2.06,m.curtain,-.28+i*.056,-.02,Math.sin(i*.8)*.025,curtain,12);fold.scale.z=.7;}
      this.box(.61,.08,.1,m.curtain,0,1,.02,curtain);
    }
    this.interactive(g,'curtains');
  }
  buildDesk(){
    const m=this.m;const g=this.group(-.9,0,-2.48);this.desk=g;
    this.box(2.8,.13,1.17,m.wood,0,1.19,0,g,.045);
    for(const x of [-1.23,1.23])for(const z of [-.43,.43])this.box(.095,1.13,.095,m.darkWood,x,.6,z,g);
    this.box(2.4,.07,.07,m.darkWood,0,.4,-.43,g);
    this.box(.97,.012,.46,m.darkGreen,.1,1.267,.17,g,.05);
    const mon=this.group(.15,1.82,-.28,g);
    this.box(1.25,.77,.075,m.black,0,0,0,mon,.04);
    this.box(1.14,.65,.012,m.screen,0,.015,.047,mon,.01);
    this.box(.07,.25,.07,m.black,0,-.46,-.02,mon);this.box(.4,.025,.25,m.black,0,-.56,0,mon);
    const screenCanvas=document.createElement('canvas');screenCanvas.width=640;screenCanvas.height=360;const c=screenCanvas.getContext('2d');
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
    const mug=this.cylinder(.09,.073,.17,m.terracotta,-.93,1.34,.3,g);this.cylinder(.073,.073,.008,m.soil,-.93,1.429,.3,g);
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
  buildDrawers(){
    const m=this.m;const g=this.group(-2.92,0,.52);this.drawerCabinet=g;
    for(const x of [-.64,.64])for(const z of [-.4,.4])this.box(.1,.2,.1,m.darkWood,x,.17,z,g);
    this.box(1.55,.1,1.1,m.wood,0,.29,0,g);this.box(1.64,.12,1.14,m.wood,0,1.42,0,g);
    for(const x of [-.73,.73])this.box(.09,1.12,1.08,m.wood,x,.85,0,g);
    this.box(1.4,1.08,.06,m.darkWood,0,.83,-.49,g);
    this.drawers=[];
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
    this.plant(-3.25,1.49,.43,.7);
    const book=this.box(.43,.06,.3,m.darkGreen,.37,1.51,.06,g);book.rotation.y=.12;
    this.box(.4,.045,.28,m.cream,.36,1.56,.06,g);
    this.interactive(g.children[4],'projects',0);
  }
  buildBed(){
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
    this.box(.62,.72,.62,m.wood,2.95,.44,-1.42);
    this.cylinder(.1,.11,.05,m.darkGreen,2.95,.84,-1.42);this.cylinder(.017,.017,.3,m.gold,2.95,1,-1.42);this.cylinder(.14,.23,.27,m.cream,2.95,1.25,-1.42);
  }
  buildCloset(){
    const m=this.m;const g=this.group(-3.07,0,-2.63);this.closet=g;
    this.box(1.46,2.7,.85,m.wood,0,1.46,0,g,.045);
    this.box(1.27,2.45,.02,m.darkWood,0,1.46,.44,g);
    this.closetDoors=[];
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
  buildStereo(){
    const m=this.m;const g=this.group(1.95,0,-2.77);this.stereo=g;
    this.box(1.28,.09,.68,m.wood,0,.72,0,g);
    for(const x of [-.53,.53])for(const z of [-.23,.23])this.box(.05,.67,.05,m.darkWood,x,.36,z,g);
    this.box(.65,.13,.5,m.darkWood,0,.84,0,g);
    this.record=this.cylinder(.21,.21,.025,m.black,-.07,.92,0,g,40);this.cylinder(.065,.065,.03,m.terracotta,-.07,.925,0,g);
    const arm=this.box(.025,.025,.31,m.gold,.22,.95,.03,g);arm.rotation.y=-.55;
    for(const x of [-.5,.5]){
      const speaker=this.group(x,.98,0,g);this.box(.25,.46,.28,m.darkWood,0,0,0,speaker);
      for(const y of [-.08,.12]){const cone=this.cylinder(y<0?.075:.037,y<0?.075:.037,.012,m.black,0,y,.15,speaker);cone.rotation.x=Math.PI/2;}
    }
    for(let i=0;i<8;i++)this.box(.04,.38,.38,i%2?m.green:m.terracotta,-.35+i*.045,.27,0,g);
    this.interactive(g,'music');
  }
  buildAC(){
    const m=this.m;const g=this.group(-3.88,2.98,-.3);g.rotation.y=Math.PI/2;
    this.box(1.48,.45,.27,m.cream,0,0,0,g,.09);
    this.box(1.2,.08,.03,this.material('#a6afa1'),0,-.13,.14,g,.02);
    for(let i=0;i<4;i++)this.box(1.15,.012,.04,m.cream,0,-.105-i*.018,.16,g,.002);
    this.acLed=this.sphere(.018,this.material('#9cac84',{emissive:'#9cac84',emissiveIntensity:.7}),.55,.03,.15,g);
    this.interactive(g,'ac');
    this.air=[];for(let i=0;i<4;i++){
      const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-3.65,2.8,-.72+i*.24),new THREE.Vector3(-3.1,2.55,-.72+i*.24),new THREE.Vector3(-2.8,2.2,-.65+i*.24)]);
      const line=new THREE.Mesh(new THREE.TubeGeometry(curve,16,.008,4,false),new THREE.MeshBasicMaterial({color:'#e8f4e8',transparent:true,opacity:.28}));this.scene.add(line);this.air.push(line);
    }
  }
  plant(x,y,z,s=1){
    const g=this.group(x,y,z);const m=this.m;
    this.cylinder(.17*s,.13*s,.28*s,m.terracotta,0,.14*s,0,g);this.cylinder(.155*s,.155*s,.01,m.soil,0,.283*s,0,g);
    for(let i=0;i<9;i++){
      const angle=i*2.4;const h=(.38+(i%3)*.16)*s;const stem=this.cylinder(.008*s,.008*s,h,m.leaf,Math.sin(angle)*.06*s,.28*s+h/2,Math.cos(angle)*.06*s,g,5);stem.rotation.z=Math.sin(angle)*.3;
      const leaf=this.sphere(.15*s,i%2?m.leaf:m.darkGreen,Math.sin(angle)*.16*s,.3*s+h,Math.cos(angle)*.16*s,g,[.48,1.3,.7]);leaf.rotation.z=-Math.sin(angle)*.7;leaf.rotation.y=angle;
    }return g;
  }
  buildDetails(){
    const m=this.m;
    this.plant(3.35,.1,2.8,1.6);
    // Two prints on the left wall, facing into the room.
    for(let i=0;i<2;i++){
      const frame=this.group(-3.9,2.05,1.25+i*.9);frame.rotation.y=Math.PI/2;
      this.box(.64,.87,.055,m.darkWood,0,0,0,frame);this.box(.54,.77,.015,m.cream,0,0,.04,frame);
      const disk=this.cylinder(.15,.15,.01,i?m.terracotta:m.green,0,.12,.055,frame);disk.rotation.x=Math.PI/2;
      this.box(.3,.03,.01,m.darkGreen,0,-.22,.054,frame);
      if(!i)this.box(.18,.22,.01,m.green,.07,-.09,.055,frame);
    }
    // Peg rail and tote near the front edge.
    this.box(.05,.09,.9,m.wood,-3.88,1.66,2.83);
    for(let i=0;i<3;i++)this.box(.12,.04,.04,m.darkWood,-3.8,1.66,2.54+i*.28);
    this.box(.11,.52,.4,m.cream,-3.69,1.19,2.77,this.scene,.04);
    const toteHandle=new THREE.Mesh(new THREE.TorusGeometry(.13,.018,8,20,Math.PI),m.cream);toteHandle.rotation.y=Math.PI/2;toteHandle.position.set(-3.69,1.48,2.77);this.scene.add(toteHandle);
    // Books and a mug on a small circular coffee table.
    this.cylinder(.45,.45,.08,m.wood,.35,.48,2.28);
    for(let i=0;i<3;i++){const a=i*TAU/3;this.box(.055,.39,.055,m.darkWood,.35+Math.sin(a)*.29,.27,2.28+Math.cos(a)*.29);}
    this.box(.33,.05,.25,m.terracotta,.27,.55,2.29).rotation.y=.3;this.box(.3,.04,.23,m.cream,.28,.59,2.28).rotation.y=.3;
    this.cylinder(.065,.055,.12,m.cream,.58,.58,2.16);
    // Wall clock above the desk.
    const face=this.cylinder(.23,.23,.045,m.cream,-1.4,3.11,-3.42);face.rotation.x=Math.PI/2;
    this.box(.015,.13,.014,m.darkGreen,-1.4,3.16,-3.385).rotation.z=-.3;this.box(.1,.013,.014,m.darkGreen,-1.36,3.11,-3.38);
  }
  buildAvatar(){
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
    this.legs=[];this.shins=[];this.arms=[];this.sleeves=[];
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
  setSeat(amount){
    this.seatAmount=amount;this.avatar.position.y=-.24*amount;
    for(let i=0;i<2;i++){this.legs[i].rotation.x=-Math.PI/2*amount;this.shins[i].rotation.x=Math.PI/2*amount;this.arms[i].rotation.x=-.7*amount;}
  }
  bindPointer(){
    const el=this.renderer.domElement;let down;
    el.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
    const hit=e=>{const r=el.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);return this.raycaster.intersectObjects(this.targets,false)[0];};
    el.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;const found=hit(e);if(found)this.onSelect(found.object.userData.action,found.object.userData.index);});
    el.addEventListener('pointermove',e=>{el.style.cursor=hit(e)?'pointer':'grab';});
  }
  makeLabels(){
    const data=[['projects','The projects',[-2.9,1.9,1.1],'01'],['stack','The workbench',[-.65,2.5,-2.2],'02'],['curtains','Set the mood',[1.15,3.4,-3.2],'☼'],['music','Good company',[2.35,1.45,-2.6],'♪'],['wardrobe','A different day',[-3.05,3.28,-2.3],'↻']];
    const holder=document.querySelector('#hotspots');
    for(const [action,label,pos,num] of data){const b=document.createElement('button');b.className='hotspot';b.innerHTML=`<span class="hotspot-dot">${num}</span><span>${label}</span><span class="hotspot-arrow">↗</span>`;b.setAttribute('aria-label',label);b.addEventListener('click',()=>this.onSelect(action));holder.appendChild(b);this.labels.push({el:b,point:new THREE.Vector3(...pos)});}
  }
  resize(){
    const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;
    const aspect=w/h;const size=aspect<1?13.2/aspect:10.2;
    this.camera.left=-size*aspect/2;this.camera.right=size*aspect/2;this.camera.top=size/2;this.camera.bottom=-size/2;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);
  }
  tween(duration,update){return new Promise(resolve=>{if(this.reduced){update(1);resolve();return;}this.tweens.push({start:performance.now(),duration:duration*1000,update,resolve});});}
  async walkTo(x,z){
    const start=this.avatar.position.clone();const distance=Math.hypot(x-start.x,z-start.z);if(distance<.03)return;
    this.avatar.rotation.y=Math.atan2(x-start.x,z-start.z);this.walking=true;
    await this.tween(Math.min(1.3,distance*.33),t=>{this.avatar.position.x=THREE.MathUtils.lerp(start.x,x,t);this.avatar.position.z=THREE.MathUtils.lerp(start.z,z,t);});
    this.walking=false;this.setSeat(0);
  }
  async stand(){if(!this.seated)return;this.seated=false;await this.tween(.35,t=>{this.setSeat(1-t);this.chair.position.z=-1.35+t*.42;});await this.walkTo(-.5,-.65);}
  async openDrawer(index){
    if(this.activeDrawer>=0&&this.activeDrawer!==index){const old=this.drawers[this.activeDrawer];const start=old.position.z;await this.tween(.28,t=>old.position.z=start*(1-t));}
    this.activeDrawer=index;const d=this.drawers[index];const start=d.position.z;
    await this.tween(.45,t=>{d.position.z=THREE.MathUtils.lerp(start,.65,t);this.arms[0].rotation.x=-.6*Math.sin(t*Math.PI);});
  }
  async visit(action,index=0){
    if(action==='stack'){await this.resetCamera();await this.focusCamera();return;}
    if(action==='about'){await this.wave();return;}
    await this.stand();await this.walkTo(-.45,.35);
    const dest={projects:[-2.7,1.9],curtains:[.55,-1.85],music:[1.3,-1.65],wardrobe:[-2.8,-1.2]};
    if(dest[action])await this.walkTo(...dest[action]);this.avatar.rotation.y=Math.PI;
    if(action==='projects')await this.openDrawer(index);
    if(action==='wardrobe'){await this.tween(.5,t=>{this.closetDoors[0].rotation.y=-t*1.1;this.closetDoors[1].rotation.y=t*1.1;});this.wardrobeOpen=true;}
  }
  async home(){
    if(this.activeDrawer>=0){const d=this.drawers[this.activeDrawer];const start=d.position.z;await this.tween(.4,t=>d.position.z=start*(1-t));this.activeDrawer=-1;}
    if(this.wardrobeOpen){await this.tween(.4,t=>{this.closetDoors[0].rotation.y=-(1-t)*1.1;this.closetDoors[1].rotation.y=(1-t)*1.1;});this.wardrobeOpen=false;}
    await this.resetCamera();
    if(!this.seated){await this.walkTo(-.45,.35);await this.walkTo(-.75,-1.35);this.avatar.rotation.y=Math.PI;await this.tween(.4,t=>{this.setSeat(t);this.chair.position.z=-.93-t*.42;});this.seated=true;}
  }
  async setNight(night,instant=false){
    const from=this.night?1:0,to=night?1:0;this.night=night;
    await this.tween(instant?0:1,t=>{
      const v=THREE.MathUtils.lerp(from,to,t);
      this.curtains.forEach((curtain,i)=>{curtain.position.x=(i===0?-1:1)*THREE.MathUtils.lerp(1.46,.75,v);curtain.scale.x=1+v*1.7;});
      this.ambient.intensity=2.5-v*1.8;this.sun.intensity=3.1-v*2.95;this.moon.intensity=v*1.4;this.lampLight.intensity=v*6;this.monitorLight.intensity=.2+v*2;
      this.windowMaterial.color.set('#d8e3d6').lerp(new THREE.Color('#536e84'),v);this.windowMaterial.emissiveIntensity=.35-v*.2;
    });
  }
  async focusCamera(){
    this.controls.enabled=false;const start=this.camera.position.clone(),target=this.controls.target.clone(),zoom=this.camera.zoom;
    await this.tween(.8,t=>{this.camera.position.lerpVectors(start,new THREE.Vector3(3,5,8),t);this.controls.target.lerpVectors(target,new THREE.Vector3(-.7,1.55,-2.1),t);this.camera.zoom=THREE.MathUtils.lerp(zoom,1.75,t);this.camera.updateProjectionMatrix();this.camera.lookAt(this.controls.target);});
  }
  async resetCamera(){
    this.controls.enabled=false;const pos=this.camera.position.clone(),target=this.controls.target.clone(),zoom=this.camera.zoom;
    const unchanged=pos.distanceTo(new THREE.Vector3(11,9,13))<.01&&target.distanceTo(new THREE.Vector3(0,1,0))<.01&&zoom===1;
    if(!unchanged)await this.tween(.6,t=>{this.camera.position.lerpVectors(pos,new THREE.Vector3(11,9,13),t);this.controls.target.lerpVectors(target,new THREE.Vector3(0,1,0),t);this.camera.zoom=THREE.MathUtils.lerp(zoom,1,t);this.camera.updateProjectionMatrix();this.camera.lookAt(this.controls.target);});
    this.controls.enabled=true;this.controls.update();
  }
  async wave(){const prev=this.avatar.rotation.y;this.waving=true;await this.tween(.8,t=>{this.avatar.rotation.y=THREE.MathUtils.lerp(prev,.5,Math.sin(t*Math.PI));this.arms[1].rotation.z=-Math.sin(t*Math.PI)*2.4;this.arms[1].rotation.x=-.4;});this.arms[1].rotation.z=0;this.avatar.rotation.y=prev;this.waving=false;}
  setOutfit(day){
    this.m.shirt.color.set(outfits[day].color);
    this.m.pants.color.set(['#c9b99b','#b5ac92','#596a6b','#d1c3a8','#454d48','#77775e','#697677'][day]);
    this.hood.visible=[1,4].includes(day);this.cap.visible=day===6;
    this.sleeves.forEach(sleeve=>{const short=[0,2,3,6].includes(day);sleeve.scale.y=short?.53:1;sleeve.position.y=short?-.05:-.13;});
  }
  toggleAC(){this.acOn=!this.acOn;this.acLed.visible=this.acOn;this.air.forEach(o=>o.visible=this.acOn);return this.acOn;}
  frame(){
    const now=performance.now();this.time=this.clock.getElapsedTime();
    for(let i=this.tweens.length-1;i>=0;i--){const t=this.tweens[i];const p=t.duration===0?1:Math.min(1,(now-t.start)/t.duration);t.update(ease(p));if(p===1){this.tweens.splice(i,1);t.resolve();}}
    if(!this.reduced){
      if(this.walking){const step=Math.sin(this.time*12);this.legs[0].rotation.x=step*.43;this.legs[1].rotation.x=-step*.43;this.arms[0].rotation.x=-step*.35;this.arms[1].rotation.x=step*.35;this.avatar.position.y=Math.abs(step)*.035;}
      else if(this.seated&&!this.waving){this.arms[0].rotation.x=-.72+Math.sin(this.time*6)*.045;this.arms[1].rotation.x=-.72+Math.cos(this.time*7)*.035;this.head.rotation.x=Math.sin(this.time*.8)*.025;}
      this.torso.scale.y=1+Math.sin(this.time*1.8)*.006;
      this.air.forEach((o,i)=>o.material.opacity=.1+(Math.sin(this.time*1.5-i*.5)+1)*.09);
    }
    if(this.controls.enabled)this.controls.update();
    this.renderer.render(this.scene,this.camera);
    const w=this.container.clientWidth,h=this.container.clientHeight;
    for(const label of this.labels){const p=label.point.clone().project(this.camera);label.el.style.left=`${(p.x*.5+.5)*w}px`;label.el.style.top=`${(-p.y*.5+.5)*h}px`;label.el.style.visibility=(p.z>1||this.camera.zoom>1.35)?'hidden':'visible';}
  }
}
