import { Room, outfits } from './room.js';
import { MusicPlayer, tracks } from './music.js';
import { profile } from './profile.js';

const $=selector=>document.querySelector(selector);
const icons={
 drawer:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M10 6h4M10 12h4M10 18h4"/>',
 monitor:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4M8 8l-2 2 2 2m8-4 2 2-2 2m-5 1 2-6"/>',
 person:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
 music:'<path d="M9 18V5l12-2v13M9 9l12-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="18" cy="16" rx="3" ry="3"/>',
 shirt:'<path d="m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4a4 4 0 0 1-8 0Z"/>',
 folder:'<path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M8 13h8M12 9v8"/>',
};
const svg=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.folder}</svg>`;
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=svg(el.dataset.icon));
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function safeURL(value){try{const url=new URL(value,location.href);return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}}
const storage={get(key){try{return localStorage.getItem(key);}catch{return null;}},set(key,value){try{localStorage.setItem(key,value);}catch{}}};
let room,busy=false,panel=null,returnFocus=null,toastTimer;
let outfitDay=new Date().getDay(),night=storage.get('inside-theme')==='night';
const dialog=$('#detail-dialog');
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3200);}
function status(text){$('#room-status').textContent=text;}
const player=new MusicPlayer(updateMusic);player.onError=toast;
const savedVolume=Number(storage.get('inside-volume')??.35);player.setVolume(Number.isFinite(savedVolume)?Math.max(0,Math.min(1,savedVolume)):.35);
let audioBusy=false;
async function audioAction(fn){if(audioBusy)return;audioBusy=true;try{await fn();}catch(error){player.pause();toast(error.message||'Audio could not play in this browser.');}finally{audioBusy=false;}}
function updateMusic(){
  document.body.classList.toggle('playing',player.playing);
  $('#mini-play').setAttribute('aria-label',player.playing?'Pause music':'Play music');
  $('#track-info').innerHTML=`${escape(player.title)} <span>↗</span>`;
  $('#music-subtitle').textContent=player.index===3?`Your audio · ${player.playing?'playing':'paused'}`:`Original ambient loop · ${player.playing?'playing':'sound off'}`;
  if(panel==='music'){
    const focusId=document.activeElement?.id, track=document.activeElement?.dataset.track;
    renderMusic();
    if(focusId)document.getElementById(focusId)?.focus();
    else if(track!==undefined)document.querySelector(`[data-track="${track}"]`)?.focus();
  }
}
function updateOutfit(){
  $('#outfit-day').textContent=outfits[outfitDay].day.toUpperCase();$('.outfit-swatch').style.background=outfits[outfitDay].color;
  room?.setOutfit(outfitDay);
}
function updateTime(){
  $('#local-time').textContent=new Intl.DateTimeFormat('en',{hour:'2-digit',minute:'2-digit'}).format(new Date()).toUpperCase()+' LOCAL';
  const currentDay=new Date().getDay();
  if(!window.outfitPreview&&currentDay!==outfitDay){outfitDay=currentDay;updateOutfit();}
}
updateTime();setInterval(updateTime,30000);updateOutfit();
function themeUI(){
  document.body.classList.toggle('night',night);$('#theme-label').textContent=night?'After hours':'Daylight';$('#theme-icon').textContent=night?'☾':'☼';
  $('#theme-button').setAttribute('aria-label',night?'Open curtains and switch to day mode':'Close curtains and switch to night mode');
  document.querySelector('meta[name="theme-color"]').content=night?'#202a28':'#f3f1e9';
}
themeUI();

function showPanel(type,location){
  returnFocus=document.activeElement;panel=type;$('#panel-location').textContent=location;
  document.querySelectorAll('.room-dock button').forEach(b=>b.classList.toggle('active',b.dataset.action===type));
  if(!dialog.open)dialog.showModal();
  $('#close-panel').focus();
}
function renderProject(index=0){
  const item=profile.projects[index];const ready=Boolean(item.title);const url=safeURL(item.url);
  $('#panel-content').innerHTML=`<h2 id="panel-title">Good things,<br>in the making.</h2><p class="panel-text">A little collection of things built with care.<br>Pick a drawer and see what’s inside.</p><div class="project-tabs">${profile.projects.map((_,i)=>`<button class="${i===index?'selected':''}" data-drawer="${i}" aria-pressed="${i===index}">Drawer 0${i+1}</button>`).join('')}</div><div class="project-art">${item.image&&safeURL(item.image)?`<img src="${escape(safeURL(item.image))}" alt="${escape(item.title)}">`:svg('folder')+'<span>'+ (ready?'PROJECT 0'+(index+1):'A BLANK CANVAS')+'</span>'}</div><span class="pill">${ready?'PROJECT 0'+(index+1):'EMPTY PROJECT TEMPLATE'}</span><h3>${escape(item.title||'Your next great project')}</h3><p class="panel-text">${escape(item.description||'A space for a project you’re proud of. The story, the process, and the finished thing will live here.')}</p>${ready?`<div class="template-fields"><div><span>Made with</span><span>${item.tags.map(escape).join(' · ')||'—'}</span></div></div>${url?`<p><a class="panel-button" href="${escape(url)}" target="_blank" rel="noopener noreferrer">Explore project ↗</a></p>`:''}`:'<div class="template-fields"><div><span>Project name</span><span>To be added</span></div><div><span>Tools & technologies</span><span>To be added</span></div><div><span>Live link / repository</span><span>To be added</span></div></div>'}`;
  document.querySelectorAll('[data-drawer]').forEach(button=>button.onclick=async()=>{
    if(busy)return;busy=true;const i=Number(button.dataset.drawer);status(`Opening drawer 0${i+1}…`);
    try{await room?.openDrawer(i);renderProject(i);document.querySelector(`[data-drawer="${i}"]`)?.focus();status(`Drawer 0${i+1} · ${profile.projects[i].title||'room for something good'}.`);}finally{busy=false;}
  });
}
function renderStack(){
  $('#panel-content').innerHTML=`<span class="pill">AT THE WORKBENCH</span><h2 id="panel-title">The tools behind<br>the things.</h2><p class="panel-text">A closer look at what’s on the desk.</p>${profile.stack.length?`<div class="stack-grid">${profile.stack.map(item=>`<div class="stack-item">${escape(item.name)}<span>${escape(item.category)}</span></div>`).join('')}</div>`:'<div class="project-art">'+svg('monitor')+'<span>YOUR TOOLKIT GOES HERE</span></div><h3>A stack to make your own.</h3><p class="panel-text">Add your languages, frameworks, design tools, and infrastructure to fill this desk with your own toolkit.</p><div class="template-fields"><div><span>Languages</span><span>To be added</span></div><div><span>Frameworks</span><span>To be added</span></div><div><span>Design & tools</span><span>To be added</span></div></div>'}`;
}
function renderAbout(){
  $('#panel-content').innerHTML=`<div class="avatar-badge">${svg('person')}</div><span class="pill">THE PERSON IN THE CHAIR</span><h2 id="panel-title">${escape(profile.name?'Hey, I’m '+profile.name+'.':'A person, not just a portfolio.')}</h2>${profile.role?`<h3>${escape(profile.role)}</h3>`:''}<p class="panel-text">${escape(profile.bio||'This little room is a place to share what I make, what I’m learning, and the things that make a workday feel like mine.')}</p>${!profile.name?'<div class="template-fields"><div><span>Your name</span><span>To be added</span></div><div><span>Your story</span><span>To be added</span></div></div>':''}<div class="about-actions"><button id="wave-button">Say hi 👋</button><button id="return-desk">Back to work ↗</button></div><p class="template-note">Today’s outfit: ${outfits[outfitDay].name}. A new color for each day of the week.</p>`;
  $('#wave-button').onclick=async()=>{const b=$('#wave-button');b.disabled=true;await room?.wave();b.disabled=false;toast('Hey there. Make yourself at home.');};
  $('#return-desk').onclick=()=>dialog.close();
}
function renderWardrobe(){
  $('#panel-content').innerHTML=`<span class="pill">THE EVERYDAY UNIFORM</span><h2 id="panel-title">A different day.<br>A different fit.</h2><p class="panel-text">Seven days, seven little moods. The outfit changes with your local day. Try one on.</p><div class="outfits">${[1,2,3,4,5,6,0].map(i=>`<button class="outfit ${i===outfitDay?'selected':''}" data-outfit="${i}" aria-label="${outfits[i].day}: ${outfits[i].name}" aria-pressed="${i===outfitDay}"><span style="color:${outfits[i].color}">${svg('shirt')}</span>${outfits[i].day.slice(0,3)}</button>`).join('')}</div><h3>${outfits[outfitDay].name}</h3><p class="panel-text">${outfits[outfitDay].day}’s color, made for a day in the studio.</p><button class="panel-button" id="today-outfit">Wear today’s outfit ↗</button>`;
  document.querySelectorAll('[data-outfit]').forEach(b=>b.onclick=()=>{outfitDay=Number(b.dataset.outfit);window.outfitPreview=true;updateOutfit();renderWardrobe();document.querySelector(`[data-outfit="${outfitDay}"]`)?.focus();});
  $('#today-outfit').onclick=()=>{outfitDay=new Date().getDay();window.outfitPreview=false;updateOutfit();renderWardrobe();};
}
function renderMusic(){
  $('#panel-content').innerHTML=`<span class="pill">GOOD COMPANY</span><h2 id="panel-title">Put something on.<br>Stay a little.</h2><p class="panel-text">Original ambient loops for a slower kind of browsing. Or bring a song of your own.</p><div class="playlist">${tracks.map((track,i)=>`<button class="song ${i===player.index?'selected':''}" data-track="${i}"><span>0${i+1}</span><span>${track.title}<small>${track.subtitle}</small></span><span>${i===player.index&&player.playing?'Ⅱ':'▷'}</span></button>`).join('')}${player.audio?`<button class="song ${player.index===3?'selected':''}" data-track="3"><span>04</span><span>${escape(player.customTitle)}<small>From your device · stays on your device</small></span><span>▷</span></button>`:''}</div><div class="music-controls"><button id="previous-track" aria-label="Previous track">⏮</button><button class="big-play" id="panel-play" aria-label="${player.playing?'Pause':'Play'} music">${player.playing?'Ⅱ':'▶'}</button><button id="next-track" aria-label="Next track">⏭</button></div><label class="volume">Volume <input type="range" id="volume" min="0" max="1" step="0.01" value="${player.volume}" aria-label="Music volume"></label><button class="upload-track" id="upload-track">＋ Choose an audio file</button><p class="template-note">Your file plays locally and is never uploaded. MP3, WAV, or another audio format supported by your browser.</p>`;
  document.querySelectorAll('[data-track]').forEach(b=>b.onclick=()=>audioAction(()=>Number(b.dataset.track)===player.index?player.toggle():player.select(Number(b.dataset.track))));
  $('#panel-play').onclick=()=>audioAction(()=>player.toggle());$('#previous-track').onclick=()=>audioAction(()=>player.next(-1));$('#next-track').onclick=()=>audioAction(()=>player.next());
  $('#volume').oninput=e=>{player.setVolume(Number(e.target.value));storage.set('inside-volume',player.volume);};
  $('#upload-track').onclick=()=>$('#audio-file').click();
}
function renderContact(){
  const email=profile.email&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)?profile.email:'';
  $('#panel-content').innerHTML=`<span class="pill">THE DOOR IS OPEN</span><h2 id="panel-title">Good things start<br>with a hello.</h2><p class="panel-text">${email?'Have a project in mind, an interesting idea, or just a good song? Let’s talk.':'A place for future conversations. Contact details and social links will be added here.'}</p>${email?`<a class="panel-button" href="mailto:${escape(email)}">${escape(email)} ↗</a>`:'<div class="template-fields"><div><span>Email</span><span>To be added</span></div><div><span>Social links</span><span>To be added</span></div></div>'}${profile.links.filter(l=>safeURL(l.url)).map(l=>`<p><a href="${escape(safeURL(l.url))}" target="_blank" rel="noopener noreferrer">${escape(l.label)} ↗</a></p>`).join('')}`;
}
const locations={projects:'THE PROJECT DRAWERS',stack:'THE DESKTOP',about:'THE PERSON',music:'THE MUSIC CORNER',wardrobe:'THE CLOSET',contact:'SAY HELLO'};
const descriptions={projects:'Getting a project from the drawers…',stack:'Taking a closer look at the desk…',about:'A little hello from the desk.',music:'Heading over to the record player…',wardrobe:'Finding something to wear…',curtains:night?'Letting the daylight in…':'Closing the curtains…'};
async function action(type,index=0){
  if(busy){toast('One moment — just getting there.');return;}
  if(type==='ac'){const on=room?.toggleAC();toast(on?'A little breeze. AC is on.':'Quiet room. AC is off.');return;}
  if(type==='bed'){toast('A reminder to rest. Good ideas need a little sleep, too.');return;}
  busy=true;
  try {
    if(type==='curtains'){
      status(night?'Opening the curtains…':'Closing the curtains…');await room?.visit('curtains');night=!night;themeUI();storage.set('inside-theme',night?'night':'day');await room?.setNight(night);await room?.home();status(night?'Lights low. Ideas still on.':'At the desk, making things.');return;
    }
    if(type!=='contact'){status(descriptions[type]);await room?.visit(type,index);}
    if(type==='projects')renderProject(index);else if(type==='stack')renderStack();else if(type==='about')renderAbout();else if(type==='wardrobe')renderWardrobe();else if(type==='music')renderMusic();else renderContact();
    showPanel(type,locations[type]);
    status(type==='projects'?`Drawer 0${index+1} · room for something good.`:type==='stack'?'A closer look at the workbench.':'Make yourself at home.');
  } catch(error){console.error(error);toast('That interaction couldn’t finish. Try resetting the view.');}
  finally{busy=false;}
}
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action));
$('#theme-button').onclick=()=>action('curtains');
$('#mini-play').onclick=()=>audioAction(()=>player.toggle());
$('#audio-file').onchange=e=>{audioAction(()=>player.upload(e.target.files[0]));e.target.value='';};
$('#close-panel').onclick=()=>{if(busy){toast('Just finishing the animation…');return;}dialog.close();};
dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
dialog.addEventListener('click',e=>{if(e.target===dialog&&!busy){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
dialog.addEventListener('close',async()=>{
  panel=null;busy=true;document.querySelectorAll('.room-dock button').forEach(b=>b.classList.remove('active'));
  status('Back to the workbench…');
  try{await room?.home();}finally{busy=false;status(night?'Lights low. Ideas still on.':'At the desk, making things.');returnFocus?.focus();}
});
$('#reset-view').onclick=async()=>{if(busy)return;busy=true;try{await room?.home();status('A fresh perspective.');}finally{busy=false;}};
$('#toggle-labels').onclick=()=>{const hidden=$('#hotspots').classList.toggle('labels-hidden');$('#toggle-labels').setAttribute('aria-pressed',String(!hidden));};
$('.brand').onclick=e=>{e.preventDefault();if(dialog.open&&!busy)dialog.close();else $('#reset-view').click();};
document.addEventListener('keydown',e=>{if(dialog.open||e.ctrlKey||e.altKey||e.metaKey||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;const actions={'1':'projects','2':'stack','3':'about','4':'music','5':'wardrobe'};if(actions[e.key]){e.preventDefault();action(actions[e.key]);}});

try{
  room=new Room($('#canvas-container'),action);updateOutfit();if(night)room.setNight(true,true);
  requestAnimationFrame(()=>$('#loading').classList.add('hidden'));
}catch(error){
  console.error('3D room unavailable:',error);
  $('#loading').innerHTML='<span class="loading-house">⌂</span><span>The 3D room needs WebGL.</span><span>Use the navigation below to explore the portfolio.</span>';
  $('#room-status').textContent='The portfolio is still open. Choose a section below.';
}
updateMusic();
