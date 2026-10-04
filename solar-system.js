// MRAFT 3D Solar-System Map
// Standalone renderer. Loaded by launch-pad.html.
// The rocket state is shared through localStorage key: mraft-solar-flight-state.

(async()=>{
'use strict';
if(window.__MRAFT_SOLAR_3D__)return;
window.__MRAFT_SOLAR_3D__=true;

const SOLAR_STATE_KEY='mraft-solar-flight-state';
const THREE_URL='https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const WORLDS=[
 {name:'Mercury',a:.39,T:.241,r:.24,c:0x9b9690},
 {name:'Venus',a:.72,T:.615,r:.34,c:0xd7ad67},
 {name:'Earth',a:1,T:1,r:.37,c:0x468bd0,moons:[['Moon',.9,.0748,.12,0xb8b8b2]]},
 {name:'Mars',a:1.52,T:1.881,r:.29,c:0xb75f48,moons:[['Phobos',.58,.0037,.07,0x8b7d71],['Deimos',.92,.0096,.055,0xa09282]]},
 {name:'Jupiter',a:5.2,T:11.86,r:.78,c:0xc38e68,moons:[['Io',1.15,.0049,.09,0xdfc866],['Europa',1.5,.0098,.075,0xd6d0ad],['Ganymede',1.9,.0196,.105,0x999182],['Callisto',2.35,.0457,.1,0x6d6358]]},
 {name:'Saturn',a:9.54,T:29.45,r:.69,c:0xd2b77a,rings:true,moons:[['Titan',1.45,.016,.12,0xc78b4d]]},
 {name:'Uranus',a:19.2,T:84,r:.58,c:0x78c5ce,rings:true},
 {name:'Neptune',a:30.1,T:164.8,r:.56,c:0x4a78d0,moons:[['Triton',1.2,.016,.11,0xb9c7d4]]},
 {name:'Pluto',a:39.5,T:248,r:.29,c:0xc4b29e}
];

let THREE;
try{
  THREE=await import(THREE_URL);
}catch(err){
  console.error('MRAFT 3D Solar System failed to load Three.js',err);
  window.__MRAFT_SOLAR_3D_ERROR__='Three.js failed to load';
  return;
}

let overlay,renderer,scene,camera,starField,solarGroup;
let opened=false,target=2,simDays=0,last=performance.now();
let yaw=.55,pitch=.62,distance=25,drag=null,rocketGroup=null,rocketLine=null;
let worldMeshes=[],targetRing=null,targetLight=null;

const ui=()=>{
  overlay=document.createElement('div');
  overlay.id='mraft-3d-solar';
  overlay.style.cssText='position:fixed;inset:0;z-index:20;display:none;background:#01040a;';
  document.body.appendChild(overlay);

  const hud=document.createElement('div');
  hud.id='mraft-3d-solar-hud';
  hud.style.cssText='position:absolute;left:14px;top:14px;z-index:2;min-width:245px;padding:11px 13px;border:1px solid rgba(155,190,215,.2);border-left:2px solid #55d7f2;border-radius:12px;background:rgba(7,17,28,.82);backdrop-filter:blur(14px);color:#dcebf5;font:10px/1.75 ui-monospace,monospace;';
  overlay.appendChild(hud);

  const bar=document.createElement('div');
  bar.style.cssText='position:absolute;right:14px;top:14px;z-index:2;display:flex;gap:6px;align-items:center;padding:7px;border:1px solid rgba(155,190,215,.2);border-radius:12px;background:rgba(7,17,28,.82);backdrop-filter:blur(14px);';
  const make=(txt,title)=>{const b=document.createElement('button');b.textContent=txt;b.title=title||'';b.style.cssText='min-height:34px;padding:7px 11px;border-radius:8px;border:1px solid rgba(155,190,215,.2);background:#112c3d;color:#e7f2fb;font:650 12px system-ui;cursor:pointer;';return b};
  const t=make('Target','Next target (T)'); t.onclick=nextTarget;
  const f=make('Fit','Fit entire system'); f.onclick=fit;
  const close=make('Close','Close 3D map'); close.onclick=()=>setOpen(false);
  bar.append(t,f,close);overlay.appendChild(bar);

  const help=document.createElement('div');
  help.style.cssText='position:absolute;left:14px;bottom:14px;z-index:2;color:#8fa8b8;font:10px ui-monospace,monospace;';
  help.textContent='Drag = rotate · Wheel = zoom · Click planet = target · T = next target · Esc = close';
  overlay.appendChild(help);

  const closeKey=e=>{if(e.code==='Escape'&&opened)setOpen(false);if(e.code==='KeyT'&&!e.repeat&&opened)nextTarget()};
  addEventListener('keydown',closeKey);

  overlay.addEventListener('wheel',e=>{if(!opened)return;e.preventDefault();distance=Math.max(7,Math.min(70,distance*Math.exp(e.deltaY*.001)));updateCamera()},{passive:false});
  overlay.addEventListener('pointerdown',e=>{if(!opened)return;drag={x:e.clientX,y:e.clientY,yaw,pitch};overlay.setPointerCapture(e.pointerId)});
  overlay.addEventListener('pointermove',e=>{if(!drag)return;yaw=drag.yaw-(e.clientX-drag.x)*.006;pitch=Math.max(.12,Math.min(1.45,drag.pitch+(e.clientY-drag.y)*.005));updateCamera()});
  overlay.addEventListener('pointerup',()=>drag=null);
  overlay.addEventListener('pointercancel',()=>drag=null);

  return hud;
};

const hud=ui();

function makeLabel(text){
  const cv=document.createElement('canvas');cv.width=256;cv.height=64;
  const x=cv.getContext('2d');x.clearRect(0,0,cv.width,cv.height);x.font='700 28px system-ui';x.fillStyle='#e7f2fb';x.fillText(text,6,40);
  const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
  const mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false});
  const s=new THREE.Sprite(mat);s.scale.set(2.5,.62,1);return s;
}

function orbitLine(radius){
  const pts=[];
  for(let i=0;i<=128;i++){const a=i/128*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*radius,0,Math.sin(a)*radius))}
  const g=new THREE.BufferGeometry().setFromPoints(pts);
  const m=new THREE.LineBasicMaterial({color:0x385166,transparent:true,opacity:.48});
  return new THREE.LineLoop(g,m);
}

function sphere(r,color){
  const g=new THREE.SphereGeometry(r,32,20);
  const m=new THREE.MeshStandardMaterial({color,roughness:.8,metalness:.02});
  return new THREE.Mesh(g,m);
}

function buildScene(){
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x01040a);
  scene.fog=new THREE.FogExp2(0x01040a,.0045);

  camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,.05,500);
  updateCamera();

  renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));
  renderer.setSize(innerWidth,innerHeight);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  overlay.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0x6c7f95,.42));
  const key=new THREE.PointLight(0xffe4ad,6,90,2);key.position.set(0,0,0);scene.add(key);

  solarGroup=new THREE.Group();scene.add(solarGroup);

  const sun=sphere(1.15,0xffd978);solarGroup.add(sun);
  const glow=sphere(1.55,0xffa63b);glow.material.transparent=true;glow.material.opacity=.08;solarGroup.add(glow);
  const sunLabel=makeLabel('Sun');sunLabel.position.set(1.2,.45,0);solarGroup.add(sunLabel);

  worldMeshes=[];
  WORLDS.forEach((w,i)=>{
    const radius=orbitRadius(w.a);
    solarGroup.add(orbitLine(radius));
    const mesh=sphere(w.r,w.c);mesh.position.set(radius,0,0);mesh.userData.world=i;worldMeshes.push(mesh);solarGroup.add(mesh);
    const label=makeLabel(w.name);label.position.set(radius+w.r+.2,.24,0);solarGroup.add(label);

    if(w.rings){
      const rg=new THREE.RingGeometry(w.r*1.25,w.r*2.05,64);
      const rm=new THREE.MeshBasicMaterial({color:0xcdb789,side:THREE.DoubleSide,transparent:true,opacity:.55});
      const rr=new THREE.Mesh(rg,rm);rr.rotation.x=Math.PI/2;mesh.add(rr);
    }

    if(w.moons)w.moons.forEach(m=>{
      const mr=0.45+m[1]*.42;
      const mg=orbitLine(mr);mg.position.copy(mesh.position);solarGroup.add(mg);
      const mm=sphere(m[3],m[4]);mm.userData={parent:i,moon:m};solarGroup.add(mm);
      const ml=makeLabel(m[0]);ml.scale.set(1.35,.34,1);solarGroup.add(ml);mm.userData.label=ml;
    });
  });

  const stars=[];
  for(let i=0;i<4500;i++){
    const rr=80+Math.random()*120,theta=Math.random()*Math.PI*2,phi=Math.acos(2*Math.random()-1);
    stars.push(rr*Math.sin(phi)*Math.cos(theta),rr*Math.cos(phi),rr*Math.sin(phi)*Math.sin(theta));
  }
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(stars,3));
  const sm=new THREE.PointsMaterial({color:0xffffff,size:.15,sizeAttenuation:true,transparent:true,opacity:.72});
  starField=new THREE.Points(sg,sm);scene.add(starField);

  targetRing=new THREE.Mesh(
    new THREE.RingGeometry(.72,.8,48),
    new THREE.MeshBasicMaterial({color:0xffb15c,side:THREE.DoubleSide,transparent:true,opacity:.9})
  );
  targetRing.rotation.x=Math.PI/2;scene.add(targetRing);

  targetLight=new THREE.PointLight(0xffb15c,1.7,6,2);scene.add(targetLight);

  createRocket();
  fit();
  addEventListener('resize',resize);
  renderer.domElement.addEventListener('click',pickWorld);
}

function orbitRadius(a){return 3.0+Math.log1p(a)/Math.log1p(39.5)*17.0}

function createRocket(){
  rocketGroup=new THREE.Group();
  const body=new THREE.Mesh(
    new THREE.CylinderGeometry(.11,.15,.62,12),
    new THREE.MeshStandardMaterial({color:0xf1f4f7,roughness:.5})
  );
  body.rotation.z=Math.PI/2;rocketGroup.add(body);
  const nose=new THREE.Mesh(
    new THREE.ConeGeometry(.15,.26,12),
    new THREE.MeshStandardMaterial({color:0xff6f3d,roughness:.45})
  );nose.position.x=.43;nose.rotation.z=-Math.PI/2;rocketGroup.add(nose);
  const flame=new THREE.Mesh(
    new THREE.ConeGeometry(.09,.35,10),
    new THREE.MeshBasicMaterial({color:0xffb34e,transparent:true,opacity:.9})
  );flame.position.x=-.42;flame.rotation.z=Math.PI/2;rocketGroup.add(flame);
  solarGroup.add(rocketGroup);
  rocketLine=new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,.01,0)]),
    new THREE.LineBasicMaterial({color:0x55d7f2,transparent:true,opacity:.55})
  );solarGroup.add(rocketLine);
}

function readRocket(){
  try{return JSON.parse(localStorage.getItem(SOLAR_STATE_KEY)||'null')}catch(_){return null}
}

function bodyIndexByName(name){
  const n=(name||'').toLowerCase();
  const i=WORLDS.findIndex(w=>w.name.toLowerCase()===n);
  if(i>=0)return i;
  if(n==='moon'||n==='phobos'||n==='deimos'||n==='io'||n==='europa'||n==='ganymede'||n==='callisto'||n==='titan'||n==='triton'){
    if(n==='moon')return 2;if(n==='phobos'||n==='deimos')return 3;if(n==='io'||n==='europa'||n==='ganymede'||n==='callisto')return 4;if(n==='titan')return 5;if(n==='triton')return 7;
  }
  return 2;
}

function animateWorlds(){
  const now=performance.now();
  WORLDS.forEach((w,i)=>{
    const mesh=worldMeshes[i],a=now/86400000/w.T+ i*.37;
    const r=orbitRadius(w.a);
    mesh.position.x=Math.cos(a)*r;mesh.position.z=Math.sin(a)*r;
    const labels=mesh.parent?.children;
    // matching label is updated by searching the nearest label sprite created beside each mesh.
    const labelObj=solarGroup.children.find(o=>o.isSprite&&o.position.distanceTo(mesh.position.clone().setY(.24))<3);
    if(labelObj)labelObj.position.set(mesh.position.x+w.r+.2,.24,mesh.position.z);
  });

  for(const o of solarGroup.children){
    if(!o.userData?.parent)continue;
    const p=worldMeshes[o.userData.parent],m=o.userData.moon,idx=o.userData.parent;
    const rr=.45+m[1]*.42,a=now/86400000/m[2]+idx;
    o.position.set(p.position.x+Math.cos(a)*rr,0,p.position.z+Math.sin(a)*rr);
    if(o.userData.label)o.userData.label.position.set(o.position.x+.1,.18,o.position.z);
  }

  if(target>=0){
    const p=worldMeshes[target].position;
    targetRing.position.set(p.x,.025,p.z);targetRing.scale.setScalar(1+Math.sin(now*.004)*.08);
    targetLight.position.set(p.x,1.4,p.z);
  }
}

function updateRocket(){
  const s=readRocket();
  if(!s||!rocketGroup)return;
  const i=bodyIndexByName(s.body),p=worldMeshes[i].position.clone();
  const angle=Math.atan2(Number(s.y)||0,Number(s.x)||1);
  const alt=Math.max(0,Number(s.altitude)||0);
  const offset=Math.min(2.0,.72+Math.log10(alt+10)*.14);
  rocketGroup.position.set(p.x+Math.cos(angle)*offset,.28,p.z+Math.sin(angle)*offset);
  rocketGroup.rotation.y=-angle;
  rocketGroup.visible=true;

  const a=new THREE.Vector3(p.x,.06,p.z),b=rocketGroup.position.clone();rocketLine.geometry.setFromPoints([a,b]);
  hud.innerHTML=[
    'SOLAR SYSTEM / 3D MAP',
    'ROCKET     '+(s.dead?'DESTROYED':s.launched?'IN FLIGHT':'ON PAD'),
    'BODY       '+(s.body||'Unknown'),
    'ALTITUDE   '+Math.round(Number(s.altitude)||0)+' m',
    'SPEED      '+Math.round(Number(s.speed)||0)+' m/s',
    'TARGET     '+WORLDS[target].name,
    'CAMERA     '+distance.toFixed(1)+' u'
  ].join('\n');
}

function updateCamera(){
  if(!camera)return;
  camera.position.set(
    Math.cos(yaw)*Math.cos(pitch)*distance,
    Math.sin(pitch)*distance,
    Math.sin(yaw)*Math.cos(pitch)*distance
  );
  camera.lookAt(0,0,0);
}

function fit(){distance=27;pitch=.72;yaw=.65;updateCamera()}

function nextTarget(){target=(target+1)%WORLDS.length}

function pickWorld(ev){
  const rect=renderer.domElement.getBoundingClientRect();
  const ndc=new THREE.Vector2((ev.clientX-rect.left)/rect.width*2-1,-(ev.clientY-rect.top)/rect.height*2+1);
  const ray=new THREE.Raycaster();ray.setFromCamera(ndc,camera);
  const hit=ray.intersectObjects(worldMeshes,false)[0];
  if(hit)target=hit.object.userData.world;
}

function setOpen(v){
  if(v===opened)return;
  opened=v;
  overlay.style.display=opened?'block':'none';
  if(opened){
    if(!renderer)buildScene();
    last=performance.now();
    requestAnimationFrame(loop);
  }
}

function loop(now){
  if(!opened)return;
  const dt=Math.min(.05,(now-last)/1000);last=now;
  simDays+=dt*3;
  animateWorlds();
  updateRocket();
  if(starField)starField.rotation.y+=dt*.004;
  renderer.render(scene,camera);
  requestAnimationFrame(loop);
}

window.MRAFT_SOLAR_3D={
 open:()=>setOpen(true),
 close:()=>setOpen(false),
 targetNext:nextTarget
};

// Create launch-page control. This file remains the only Solar System code file.
const button=document.createElement('button');
button.id='open-solar-3d';
button.textContent='3D System';
button.title='Open 3D Solar System master map';
button.style.cssText='position:fixed;right:14px;bottom:82px;z-index:8;min-height:38px;padding:8px 13px;border-radius:9px;border:1px solid rgba(155,190,215,.25);background:linear-gradient(180deg,#18394f,#112b3d);color:#e7f2fb;font:700 12px system-ui;cursor:pointer;box-shadow:0 12px 30px rgba(0,0,0,.28);';
button.onclick=()=>setOpen(true);
document.body.appendChild(button);

window.addEventListener('beforeunload',()=>{});
})();