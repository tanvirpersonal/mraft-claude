/* MRAFT Core 2.0 — single source of truth for builder + test flight */
(function(){
'use strict';

var $ = function(s){ return document.querySelector(s); };
var $$ = function(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); };
var G0 = 9.80665;
var MU = 3.986004418e14;
var EARTH_R = 6371000;
var ATM_H = 110000;
var RHO0 = 1.225;
var SCALE_BUILDER = 46;
var SAVE_KEY = 'mraft-blueprint-v2';

var PARTS = {
  capsule:{id:'capsule',name:'Command Capsule',category:'payload',mass:.90,fuel:0,thrust:0,isp:0,w:1.55,h:1.65,stackTop:true,stackBottom:true,control:true,kind:'capsule',desc:'Control core / crew module'},
  nose:{id:'nose',name:'Nose Cone',category:'payload',mass:.16,fuel:0,thrust:0,isp:0,w:1.55,h:1.0,stackTop:true,stackBottom:false,kind:'nose',desc:'Aerodynamic fairing tip'},
  tankS:{id:'tankS',name:'Fuel Tank S',category:'fuel',mass:.20,fuel:1.80,thrust:0,isp:0,w:1.55,h:1.55,stackTop:true,stackBottom:true,kind:'tank',desc:'Small liquid propellant tank'},
  tankM:{id:'tankM',name:'Fuel Tank M',category:'fuel',mass:.40,fuel:3.60,thrust:0,isp:0,w:1.55,h:3.05,stackTop:true,stackBottom:true,kind:'tank',desc:'Medium liquid propellant tank'},
  tankL:{id:'tankL',name:'Fuel Tank L',category:'fuel',mass:.80,fuel:8.10,thrust:0,isp:0,w:2.15,h:4.55,stackTop:true,stackBottom:true,kind:'tank',desc:'Large liquid propellant tank'},
  engineSea:{id:'engineSea',name:'Sea-Level Engine',category:'engine',mass:.90,fuel:0,thrust:220,isp:290,w:1.55,h:1.50,stackTop:true,stackBottom:false,kind:'engine',desc:'High-thrust first-stage engine'},
  engineVac:{id:'engineVac',name:'Vacuum Engine',category:'engine',mass:.62,fuel:0,thrust:90,isp:380,w:1.35,h:1.65,stackTop:true,stackBottom:false,kind:'vac',desc:'Efficient upper-stage engine'},
  srb:{id:'srb',name:'Solid Booster',category:'engine',mass:.50,fuel:6.0,thrust:300,isp:240,w:1.05,h:4.90,stackTop:true,stackBottom:false,solid:true,kind:'srb',desc:'Fixed high-thrust solid booster'},
  decoupler:{id:'decoupler',name:'Decoupler',category:'structure',mass:.10,fuel:0,thrust:0,isp:0,w:1.62,h:.26,stackTop:true,stackBottom:true,decoupler:true,kind:'dec',desc:'Separates lower stage on activation'},
  adapter:{id:'adapter',name:'Stack Adapter',category:'structure',mass:.16,fuel:0,thrust:0,isp:0,w:1.8,h:.42,stackTop:true,stackBottom:true,kind:'adapter',desc:'Transitions between stack sizes'},
  fin:{id:'fin',name:'Fin',category:'structure',mass:.10,fuel:0,thrust:0,isp:0,w:1.25,h:2.20,stackTop:false,stackBottom:false,kind:'fin',desc:'Aerodynamic stabilizer'},
  leg:{id:'leg',name:'Landing Leg',category:'structure',mass:.15,fuel:0,thrust:0,isp:0,w:1.25,h:2.40,stackTop:false,stackBottom:false,kind:'leg',desc:'Landing support'}
};

var CATEGORIES = [
  {id:'fuel',label:'FUEL'},
  {id:'engine',label:'ENGINES'},
  {id:'structure',label:'STRUCTURE'},
  {id:'payload',label:'PAYLOAD'}
];

var state = {
  parts:[],
  selected:null,
  tool:null,
  category:'fuel',
  symmetry:true,
  grid:true,
  nodes:true,
  com:true,
  cot:true,
  zoom:1,
  panX:0,
  panY:0,
  history:[],
  future:[],
  stageCount:2
};

var builderCanvas = $('#builderCanvas');
var bctx = builderCanvas.getContext('2d');
var flightCanvas = $('#flightCanvas');
var fctx = flightCanvas.getContext('2d');
var BW=0,BH=0,FD=1;
var drag=null;
var pan=null;
var ghost=null;
var toastTimer=0;
var flight=null;
var keys={};

function clone(obj){ return JSON.parse(JSON.stringify(obj)); }
function uid(prefix){ return (prefix||'p') + Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-4); }
function partDef(type){ return PARTS[type]; }
function getPart(id){ for(var i=0;i<state.parts.length;i++) if(state.parts[i].id===id) return state.parts[i]; return null; }
function selectedPart(){ return getPart(state.selected); }

function showToast(msg){
  var el=$('#toast');
  el.textContent=msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){el.classList.remove('show');},1700);
}
function setStatus(msg){ $('#statusText').textContent=msg; }

function snapshot(){ state.history.push(clone(state.parts)); if(state.history.length>30) state.history.shift(); state.future=[]; }

function restoreParts(arr){
  state.parts = arr || [];
  state.selected = state.parts.length ? state.parts[state.parts.length-1].id : null;
  computeStageCount();
  updateAll();
}
function undo(){
  if(!state.history.length) return;
  state.future.push(clone(state.parts));
  state.parts=state.history.pop();
  state.selected=null;
  computeStageCount();
  updateAll();
}
function redo(){
  if(!state.future.length) return;
  state.history.push(clone(state.parts));
  state.parts=state.future.pop();
  state.selected=null;
  computeStageCount();
  updateAll();
}

function defaultPart(type,x,y,stage){
  return {id:uid(),type:type,x:x||0,y:y||0,rotation:0,stage:stage==null?0:stage,symmetryGroup:null};
}

function metrics(){
  var mass=0,fuel=0,thrust=0,flow=0,comX=0,comY=0,cotX=0,cotY=0,cotT=0;
  state.parts.forEach(function(p){
    var d=partDef(p.type),m=(d.mass+d.fuel);
    mass+=m; fuel+=d.fuel; thrust+=d.thrust;
    comX+=p.x*m; comY+=p.y*m;
    if(d.thrust){ var t=d.thrust; cotX+=p.x*t; cotY+=p.y*t; cotT+=t; flow+=d.thrust*1000/(d.isp*G0); }
  });
  if(mass) {comX/=mass;comY/=mass;}
  if(cotT){cotX/=cotT;cotY/=cotT;}
  var twr=mass?thrust*1000/(mass*1000*G0):0;
  var ispEff=flow?thrust*1000/(flow*G0):0;
  var dv=0,burn=0,currentMass=mass;
  var maxStage=state.parts.length?Math.max.apply(null,state.parts.map(function(p){return p.stage;})):0;
  for(var s=0;s<=maxStage;s++){
    var stageFuel=0,stageThrust=0,stageFlow=0;
    state.parts.forEach(function(p){
      if(p.stage!==s)return;
      var d=partDef(p.type); stageFuel+=d.fuel; stageThrust+=d.thrust; if(d.thrust) stageFlow+=d.thrust*1000/(d.isp*G0);
    });
    if(stageFuel>0 && stageThrust>0 && currentMass>currentMass-stageFuel && currentMass>0.01){
      var after=Math.max(.01,currentMass-stageFuel);
      var stageIsp=stageFlow?stageThrust*1000/(stageFlow*G0):0;
      dv+=stageIsp*G0*Math.log(currentMass/after);
      burn+=stageFuel/(stageFlow/1000||1);
      currentMass=after;
    }
  }
  return {mass:mass,fuel:fuel,dry:mass-fuel,thrust:thrust,twr:twr,dv:dv,burn:burn,comX:comX,comY:comY,cotX:cotX,cotY:cotY,cotT:cotT,stages:maxStage+1,isp:ispEff};
}

function computeStageCount(){
  var max=0;
  state.parts.forEach(function(p){if(p.stage>max)max=p.stage;});
  state.stageCount=Math.max(1,max+1);
}

function worldToScreen(x,y){
  return {x:BW/2 + state.panX + x*SCALE_BUILDER*state.zoom, y:BH/2 + state.panY - y*SCALE_BUILDER*state.zoom};
}
function screenToWorld(x,y){
  return {x:(x-BW/2-state.panX)/(SCALE_BUILDER*state.zoom),y:-(y-BH/2-state.panY)/(SCALE_BUILDER*state.zoom)};
}
function localNode(p,side){
  var d=partDef(p.type);
  var ang=(p.rotation||0)*Math.PI/180;
  var ly=side==='top'?d.h/2:-d.h/2;
  return {x:p.x-Math.sin(ang)*ly,y:p.y+Math.cos(ang)*ly};
}
function compatible(a,b){return (a==='top'&&b==='bottom')||(a==='bottom'&&b==='top');}

function nearestSnap(part,x,y){
  var d=partDef(part.type), best=null, bestDist=0.42;
  if(!(d.stackTop||d.stackBottom)) return null;
  var sourceSides=[];
  if(d.stackTop) sourceSides.push('top');
  if(d.stackBottom) sourceSides.push('bottom');
  state.parts.forEach(function(q){
    if(q.id===part.id) return;
    var qd=partDef(q.type), targets=[];
    if(qd.stackTop)targets.push('top');
    if(qd.stackBottom)targets.push('bottom');
    sourceSides.forEach(function(ss){
      targets.forEach(function(ts){
        if(!compatible(ss,ts))return;
        var n=localNode(part,ss), qn=localNode(q,ts);
        var tx=x+(n.x-part.x), ty=y+(n.y-part.y);
        var dd=Math.hypot(tx-qn.x,ty-qn.y);
        if(dd<bestDist){bestDist=dd;best={x:x+(qn.x-n.x),y:y+(qn.y-n.y),parent:q.id};}
      });
    });
  });
  return best;
}

function mirrorGroup(p){
  if(!p.symmetryGroup)return [];
  return state.parts.filter(function(q){return q.symmetryGroup===p.symmetryGroup;});
}

function applySymmetry(p){
  var mates=mirrorGroup(p);
  if(mates.length!==2)return;
  var mate=mates[0].id===p.id?mates[1]:mates[0];
  mate.x=-p.x;
  mate.y=p.y;
  mate.rotation=(360-(p.rotation||0))%360;
}

function addPart(type,x,y,stage){
  snapshot();
  var p=defaultPart(type,x,y,stage==null?0:stage);
  state.parts.push(p);
  state.selected=p.id;
  if(state.symmetry && Math.abs(p.x)>0.06){
    var g=uid('g');
    p.symmetryGroup=g;
    var m=defaultPart(type,-p.x,p.y,p.stage);
    m.symmetryGroup=g;
    m.rotation=(360-p.rotation)%360;
    state.parts.push(m);
  }
  computeStageCount();
  updateAll();
  return p;
}

function deletePart(p){
  if(!p)return;
  snapshot();
  var group=p.symmetryGroup;
  state.parts=state.parts.filter(function(q){return q.id!==p.id && (!group || q.symmetryGroup!==group);});
  state.selected=null;
  computeStageCount(); updateAll();
}

function duplicatePart(p){
  if(!p)return;
  snapshot();
  var n=clone(p); n.id=uid(); n.x+=partDef(p.type).w+0.5; n.symmetryGroup=null;
  state.parts.push(n);
  state.selected=n.id; updateAll();
}

function rotateSelected(){
  var p=selectedPart(); if(!p)return;
  snapshot(); p.rotation=((p.rotation||0)+90)%360;
  applySymmetry(p); updateAll();
}

function placeTool(x,y){
  if(!state.tool)return;
  var p=defaultPart(state.tool,x,y,0);
  var snap=nearestSnap(p,x,y);
  if(snap){p.x=snap.x;p.y=snap.y;}
  snapshot();
  state.parts.push(p); state.selected=p.id;
  if(state.symmetry && Math.abs(p.x)>0.06){
    var g=uid('g'); p.symmetryGroup=g;
    var m=defaultPart(state.tool,-p.x,p.y,p.stage); m.symmetryGroup=g; m.rotation=(360-p.rotation)%360; state.parts.push(m);
  }
  state.tool=null;
  computeStageCount(); updateAll();
}

function normalizeStages(){
  if(!state.parts.length)return;
  snapshot();
  var used={}; state.parts.forEach(function(p){used[p.stage]=true;});
  var nums=Object.keys(used).map(Number).sort(function(a,b){return a-b;});
  var map={}; nums.forEach(function(n,i){map[n]=i;});
  state.parts.forEach(function(p){p.stage=map[p.stage];});
  computeStageCount(); updateAll();
}

function assignStage(p,delta){
  if(!p)return;
  snapshot();
  p.stage=Math.max(0,p.stage+delta);
  computeStageCount(); updateAll();
}

function saveBlueprint(){
  try{
    var data={version:2,createdAt:new Date().toISOString(),parts:state.parts};
    localStorage.setItem(SAVE_KEY,JSON.stringify(data));
    showToast('Blueprint saved');
    setStatus('SAVED');
  }catch(e){showToast('Save blocked by browser');}
}
function loadBlueprint(){
  var raw=localStorage.getItem(SAVE_KEY);
  if(!raw){showToast('No saved blueprint');return;}
  try{
    var data=JSON.parse(raw);
    state.history=[];state.future=[];
    restoreParts(data.parts||[]);
    showToast('Blueprint loaded');setStatus('LOADED');
  }catch(e){showToast('Save data is invalid');}
}

function clearBlueprint(){
  if(!state.parts.length)return;
  if(!confirm('Clear the current rocket?'))return;
  snapshot(); state.parts=[];state.selected=null;computeStageCount();updateAll();showToast('Rocket cleared');
}

function drawPart(c,p,scale,selected){
  var d=partDef(p.type),w=d.w*scale,h=d.h*scale;
  c.save();
  c.translate(p._sx,p._sy);
  c.rotate(-(p.rotation||0)*Math.PI/180);
  c.lineWidth=selected?2:1;
  c.strokeStyle=selected?'#74d7ff':'#263545';
  c.fillStyle='#1a2633';
  var grad=c.createLinearGradient(-w/2,0,w/2,0);
  grad.addColorStop(0,'#4f5c68');grad.addColorStop(.35,'#cbd4dc');grad.addColorStop(.68,'#e6ebef');grad.addColorStop(1,'#495664');
  if(d.kind==='tank'){
    c.fillStyle=grad;c.fillRect(-w/2,-h/2,w,h);c.strokeRect(-w/2,-h/2,w,h);
    c.fillStyle='#cf5f2e';c.fillRect(-w/2,-h*.38,w,h*.065);c.fillRect(-w/2,h*.32,w,h*.065);
    c.strokeStyle='rgba(25,37,48,.5)';for(var i=-1;i<=1;i++){c.beginPath();c.moveTo(i*w*.28,-h*.32);c.lineTo(i*w*.28,h*.32);c.stroke();}
    c.fillStyle='rgba(255,255,255,.64)';for(i=-1;i<=1;i++){c.beginPath();c.arc(i*w*.33,-h*.40,Math.max(1,scale*.035),0,Math.PI*2);c.fill();}
  } else if(d.kind==='engine'||d.kind==='vac'){
    c.fillStyle='#56636f';c.fillRect(-w*.30,-h/2,w*.60,h*.28);
    c.fillStyle='#1b2229';c.beginPath();c.moveTo(-w*.30,-h*.20);c.lineTo(-w/2,h/2);c.lineTo(w/2,h/2);c.lineTo(w*.30,-h*.20);c.closePath();c.fill();c.stroke();
    c.fillStyle='#0c1219';c.beginPath();c.ellipse(0,h*.44,w*.38,h*.07,0,0,Math.PI*2);c.fill();
    c.strokeStyle='#9aaab8';for(i=0;i<3;i++){c.beginPath();c.moveTo(-w*.28,-h*.12+i*h*.07);c.lineTo(w*.28,-h*.12+i*h*.07);c.stroke();}
  } else if(d.kind==='srb'){
    c.fillStyle='#d2d8de';c.fillRect(-w/2,-h/2,w,h);c.strokeRect(-w/2,-h/2,w,h);
    c.fillStyle='#b73e37';c.fillRect(-w/2,-h*.37,w,h*.06);
    c.strokeStyle='#5d6873';for(i=-1;i<=1;i++){c.beginPath();c.moveTo(i*w*.30,-h*.28);c.lineTo(i*w*.30,h*.25);c.stroke();}
    c.fillStyle='#121920';c.fillRect(-w*.20,h*.37,w*.40,h*.13);
  } else if(d.kind==='capsule'){
    c.fillStyle=grad;c.beginPath();c.moveTo(-w/2,h/2);c.lineTo(-w/2,-h*.05);c.quadraticCurveTo(-w*.35,-h/2,0,-h/2);c.quadraticCurveTo(w*.35,-h/2,w/2,-h*.05);c.lineTo(w/2,h/2);c.closePath();c.fill();c.stroke();
    c.fillStyle='#17334a';c.beginPath();c.arc(0,-h*.10,w*.19,0,Math.PI*2);c.fill();c.stroke();
    c.fillStyle='#67c7ea';c.beginPath();c.arc(-w*.03,-h*.13,w*.10,0,Math.PI*2);c.fill();
  } else if(d.kind==='nose'){
    c.fillStyle=grad;c.beginPath();c.moveTo(-w/2,h/2);c.quadraticCurveTo(-w*.45,-h*.05,0,-h/2);c.quadraticCurveTo(w*.45,-h*.05,w/2,h/2);c.closePath();c.fill();c.stroke();
  } else if(d.kind==='dec'){
    c.fillStyle='#65727d';c.fillRect(-w/2,-h/2,w,h);c.strokeRect(-w/2,-h/2,w,h);
    c.fillStyle='#1d2730';c.fillRect(-w/2,-h*.12,w,h*.24);c.fillStyle='#d4dbe1';
    for(i=-2;i<=2;i++)c.fillRect(i*w*.16-w*.028,-h*.32,w*.056,h*.64);
  } else if(d.kind==='adapter'){
    c.fillStyle='#627280';c.beginPath();c.moveTo(-w/2,h/2);c.lineTo(-w*.36,-h/2);c.lineTo(w*.36,-h/2);c.lineTo(w/2,h/2);c.closePath();c.fill();c.stroke();
  } else if(d.kind==='fin'){
    c.fillStyle='#788896';c.beginPath();c.moveTo(-w/2,-h/2);c.lineTo(w/2,h/2);c.lineTo(-w/2,h/2);c.closePath();c.fill();c.stroke();
  } else if(d.kind==='leg'){
    c.strokeStyle='#8c9aa7';c.lineWidth=Math.max(2,scale*.07);c.beginPath();c.moveTo(-w*.35,-h*.42);c.lineTo(-w*.25,h*.25);c.lineTo(w*.38,h*.45);c.stroke();c.beginPath();c.arc(-w*.35,-h*.42,w*.12,0,Math.PI*2);c.fillStyle='#596670';c.fill();c.stroke();
  }
  c.restore();
}

function renderPalette(){
  var tabBox=$('#categoryTabs');tabBox.innerHTML='';
  CATEGORIES.forEach(function(cat){
    var b=document.createElement('button');b.textContent=cat.label;b.className=cat.id===state.category?'active':'';
    b.onclick=function(){state.category=cat.id;renderPalette();};
    tabBox.appendChild(b);
  });
  var list=$('#partsList');list.innerHTML='';
  Object.keys(PARTS).forEach(function(id){
    var d=PARTS[id]; if(d.category!==state.category)return;
    var el=document.createElement('div');el.className='part-card'+(state.tool===id?' active':'');
    el.innerHTML='<div class="part-icon"></div><div><div class="part-name">'+d.name+'</div><div class="part-meta">'+d.mass.toFixed(2)+' t dry'+(d.fuel?' · '+d.fuel.toFixed(1)+' t fuel':'')+(d.thrust?' · '+d.thrust+' kN':'')+'</div><div class="part-desc">'+d.desc+'</div></div>';
    var ic=el.querySelector('.part-icon'),ctx2=ic.getContext('2d');ic.width=104;ic.height=84;
    var fake={type:id,rotation:0,_sx:52,_sy:42};drawPart(ctx2,fake,Math.min(34/d.w,55/d.h),false);
    el.onclick=function(){state.tool=id;ghost=null;renderPalette();updateBuilder();};
    list.appendChild(el);
  });
}

function drawBuilder(){
  var r=builderCanvas.getBoundingClientRect(),d=window.devicePixelRatio||1;
  if(r.width!==BW||r.height!==BH||builderCanvas.width!==r.width*d||builderCanvas.height!==r.height*d){
    BW=r.width;BH=r.height;builderCanvas.width=BW*d;builderCanvas.height=BH*d;bctx.setTransform(d,0,0,d,0,0);
  }
  bctx.clearRect(0,0,BW,BH);
  bctx.fillStyle='#070c12';bctx.fillRect(0,0,BW,BH);
  if(state.grid){
    var step=SCALE_BUILDER*state.zoom;
    bctx.strokeStyle='#111b25';bctx.lineWidth=1;
    var ox=(BW/2+state.panX)%step, oy=(BH/2+state.panY)%step;
    for(var x=ox;x<BW;x+=step){bctx.beginPath();bctx.moveTo(x,0);bctx.lineTo(x,BH);bctx.stroke();}
    for(var y=oy;y<BH;y+=step){bctx.beginPath();bctx.moveTo(0,y);bctx.lineTo(BW,y);bctx.stroke();}
  }
  var axis=worldToScreen(0,0);bctx.strokeStyle='#26384b';bctx.beginPath();bctx.moveTo(0,axis.y);bctx.lineTo(BW,axis.y);bctx.stroke();
  bctx.strokeStyle='#1c2b3b';bctx.setLineDash([6,7]);bctx.beginPath();bctx.moveTo(BW/2+state.panX,0);bctx.lineTo(BW/2+state.panX,BH);bctx.stroke();bctx.setLineDash([]);
  var M=metrics();
  state.parts.forEach(function(p){
    var s=worldToScreen(p.x,p.y),d=partDef(p.type);p._sx=s.x;p._sy=s.y;
    drawPart(bctx,p,SCALE_BUILDER*state.zoom,state.selected===p.id);
    if(state.nodes && (d.stackTop||d.stackBottom)){
      ['top','bottom'].forEach(function(side){
        var n=localNode(p,side),ns=worldToScreen(n.x,n.y);
        bctx.beginPath();bctx.arc(ns.x,ns.y,4,0,Math.PI*2);
        bctx.fillStyle=side==='top'?'#74d7ff':'#f0b35f';bctx.fill();
      });
    }
  });
  if(ghost && state.tool){
    var gp={id:'ghost',type:state.tool,x:ghost.x,y:ghost.y,rotation:0,_sx:0,_sy:0};var gs=worldToScreen(ghost.x,ghost.y);gp._sx=gs.x;gp._sy=gs.y;
    bctx.globalAlpha=.45;drawPart(bctx,gp,SCALE_BUILDER*state.zoom,false);bctx.globalAlpha=1;
  }
  if(state.com && M.mass){
    var c=worldToScreen(M.comX,M.comY);bctx.strokeStyle='#f0b35f';bctx.lineWidth=2;bctx.beginPath();bctx.arc(c.x,c.y,7,0,Math.PI*2);bctx.moveTo(c.x-11,c.y);bctx.lineTo(c.x+11,c.y);bctx.moveTo(c.x,c.y-11);bctx.lineTo(c.x,c.y+11);bctx.stroke();bctx.fillStyle='#f0b35f';bctx.font='9px system-ui';bctx.fillText('CoM',c.x+11,c.y-8);
  }
  if(state.cot && M.cotT){
    var t=worldToScreen(M.cotX,M.cotY);bctx.strokeStyle='#71dcff';bctx.lineWidth=2;bctx.beginPath();bctx.moveTo(t.x-8,t.y-8);bctx.lineTo(t.x+8,t.y+8);bctx.moveTo(t.x+8,t.y-8);bctx.lineTo(t.x-8,t.y+8);bctx.stroke();bctx.fillStyle='#71dcff';bctx.font='9px system-ui';bctx.fillText('CoT',t.x+10,t.y+12);
  }
}

function connectionText(){
  var p=selectedPart(); if(!p){$('#connectionStatus').textContent='NO SELECTION';return;}
  var d=partDef(p.type);
  var connected=false;
  state.parts.forEach(function(q){
    if(q.id===p.id)return;
    var dx=Math.abs(p.x-q.x),dy=Math.abs(p.y-q.y),qd=partDef(q.type);
    if(dx<.08 && Math.abs(dy-(d.h+qd.h)/2)<.10)connected=true;
  });
  $('#connectionStatus').textContent=connected?'ATTACHED':'FREE PART';
}

function renderMetrics(){
  var M=metrics(),el=$('#metrics');
  var items=[
    ['MASS',M.mass.toFixed(2)+' t',''],
    ['FUEL',M.fuel.toFixed(2)+' t',''],
    ['THRUST',Math.round(M.thrust)+' kN',''],
    ['TWR',M.twr.toFixed(2),M.twr>=1?'ok':'warn'],
    ['DELTA-V',Math.round(M.dv).toLocaleString()+' m/s',M.dv>3000?'ok':''],
    ['BURN TIME',M.burn?M.burn.toFixed(1)+' s':'—',''],
    ['CoM',M.mass?M.comX.toFixed(2)+', '+M.comY.toFixed(2):'—','wide'],
    ['STAGES',M.stages.toString(),'wide']
  ];
  el.innerHTML=items.map(function(i){return '<div class="metric '+i[2]+'"><span>'+i[0]+'</span><strong>'+i[1]+'</strong></div>';}).join('');
}

function renderStaging(){
  var box=$('#staging');box.innerHTML='';
  computeStageCount();
  for(var s=0;s<state.stageCount;s++){
    var arr=state.parts.filter(function(p){return p.stage===s;});
    var row=document.createElement('div');row.className='stage-row'+(flight&&flight.stage===s?' current':'');
    var names=arr.length?arr.map(function(p){return partDef(p.type).name;}).join(', '):'EMPTY STAGE';
    row.innerHTML='<div class="stage-head"><div class="stage-num">'+(s+1)+'</div><div class="stage-title-text">STAGE '+(s+1)+'</div></div><div class="stage-items">'+names+'</div><div class="stage-controls"><button data-dir="-1">MOVE BACK</button><button data-dir="1">MOVE FORWARD</button></div>';
    row.querySelector('[data-dir="-1"]').onclick=function(){changeStage(s,-1);};
    row.querySelector('[data-dir="1"]').onclick=function(){changeStage(s,1);};
    box.appendChild(row);
  }
}
function changeStage(index,delta){
  var arr=state.parts.filter(function(p){return p.stage===index;});
  if(!arr.length)return;
  snapshot();arr.forEach(function(p){p.stage=Math.max(0,p.stage+delta);});normalizeStageNumbersWithoutSnapshot();updateAll();
}
function normalizeStageNumbersWithoutSnapshot(){
  var used={};state.parts.forEach(function(p){used[p.stage]=true;});
  var nums=Object.keys(used).map(Number).sort(function(a,b){return a-b;}),map={};
  nums.forEach(function(n,i){map[n]=i;});
  state.parts.forEach(function(p){p.stage=map[p.stage];});computeStageCount();
}

function updateInspector(){
  var box=$('#selectedInfo'),p=selectedPart();
  if(!p){box.textContent='Select a part to inspect it.';return;}
  var d=partDef(p.type),M=metrics();
  box.innerHTML='<b>'+d.name+'</b><br>Dry mass: '+d.mass.toFixed(2)+' t<br>Propellant: '+d.fuel.toFixed(2)+' t'+(d.thrust?'<br>Thrust: '+d.thrust+' kN · Isp '+d.isp+' s':'')+'<br>Position: '+p.x.toFixed(2)+', '+p.y.toFixed(2)+'<br>Rotation: '+(p.rotation||0)+'°<br>Assigned stage: <b>'+(p.stage+1)+'</b>';
}

function updateBuilder(){
  renderPalette();renderMetrics();renderStaging();updateInspector();connectionText();drawBuilder();
  $('#placementHint').classList.toggle('hidden',!!state.parts.length||!!state.tool);
  setStatus(state.tool?'PLACE '+partDef(state.tool).name.toUpperCase():'READY');
}

function updateAll(){updateBuilder();}

function pointerPos(ev){
  var r=builderCanvas.getBoundingClientRect();return {x:ev.clientX-r.left,y:ev.clientY-r.top};
}
function hitPart(w){
  for(var i=state.parts.length-1;i>=0;i--){
    var p=state.parts[i],d=partDef(p.type);
    if(Math.abs(w.x-p.x)<=d.w/2 && Math.abs(w.y-p.y)<=d.h/2)return p;
  }
  return null;
}

builderCanvas.addEventListener('pointerdown',function(ev){
  var s=pointerPos(ev),w=screenToWorld(s.x,s.y);
  if(ev.button===1){pan={sx:s.x,sy:s.y,px:state.panX,py:state.panY};builderCanvas.setPointerCapture(ev.pointerId);return;}
  if(ev.button===2){
    var hit=hitPart(w); if(hit){state.selected=hit.id;rotateSelected();} ev.preventDefault();return;
  }
  if(state.tool){placeTool(w.x,w.y);builderCanvas.setPointerCapture(ev.pointerId);return;}
  var hit=hitPart(w);
  if(hit){state.selected=hit.id;drag={part:hit,ox:w.x-hit.x,oy:w.y-hit.y,sx:w.x,sy:w.y};snapshot();builderCanvas.setPointerCapture(ev.pointerId);}
  else{state.selected=null;}
  updateAll();
});

builderCanvas.addEventListener('pointermove',function(ev){
  var s=pointerPos(ev),w=screenToWorld(s.x,s.y);
  if(state.tool){
    var temp=defaultPart(state.tool,w.x,w.y,0),sn=nearestSnap(temp,w.x,w.y);ghost=sn?{x:sn.x,y:sn.y}:{x:w.x,y:w.y};drawBuilder();return;
  }
  if(pan){state.panX=pan.px+s.x-pan.sx;state.panY=pan.py+s.y-pan.sy;drawBuilder();return;}
  if(!drag)return;
  var p=drag.part;var nx=w.x-drag.ox,ny=w.y-drag.oy;
  var sn=nearestSnap(p,nx,ny);if(sn){nx=sn.x;ny=sn.y;}else{nx=Math.round(nx*4)/4;ny=Math.round(ny*4)/4;}
  p.x=nx;p.y=ny;applySymmetry(p);drawBuilder();
});
builderCanvas.addEventListener('pointerup',function(){drag=null;pan=null;});
builderCanvas.addEventListener('pointercancel',function(){drag=null;pan=null;});
builderCanvas.addEventListener('wheel',function(ev){ev.preventDefault();var s=pointerPos(ev),w=screenToWorld(s.x,s.y),factor=Math.exp(-ev.deltaY*.0015);state.zoom=Math.max(.45,Math.min(2.8,state.zoom*factor));var after=worldToScreen(w.x,w.y);state.panX+=s.x-after.x;state.panY+=s.y-after.y;drawBuilder();},{passive:false});
builderCanvas.oncontextmenu=function(e){e.preventDefault();};

$('#mirrorBtn').onclick=function(){state.symmetry=!state.symmetry;this.setAttribute('aria-pressed',state.symmetry);};
$('#gridBtn').onclick=function(){state.grid=!state.grid;this.setAttribute('aria-pressed',state.grid);drawBuilder();};
$('#nodesBtn').onclick=function(){state.nodes=!state.nodes;this.setAttribute('aria-pressed',state.nodes);drawBuilder();};
$('#comToggle').onchange=function(){state.com=this.checked;drawBuilder();};
$('#cotToggle').onchange=function(){state.cot=this.checked;drawBuilder();};
$('#zoomInBtn').onclick=function(){state.zoom=Math.min(2.8,state.zoom*1.2);drawBuilder();};
$('#zoomOutBtn').onclick=function(){state.zoom=Math.max(.45,state.zoom*.83);drawBuilder();};
$('#fitBtn').onclick=function(){fitRocket();drawBuilder();};
$('#rotateBtn').onclick=rotateSelected;
$('#duplicateBtn').onclick=function(){duplicatePart(selectedPart());};
$('#deleteBtn').onclick=function(){deletePart(selectedPart());};
$('#addStageBtn').onclick=function(){state.stageCount++;showToast('Stage '+state.stageCount+' added');renderStaging();};
$('#normalizeStagesBtn').onclick=function(){normalizeStages();showToast('Stages normalized');};

function fitRocket(){
  if(!state.parts.length){state.zoom=1;state.panX=0;state.panY=0;return;}
  var xs=[],ys=[];state.parts.forEach(function(p){var d=partDef(p.type);xs.push(p.x-d.w/2,p.x+d.w/2);ys.push(p.y-d.h/2,p.y+d.h/2);});
  var minX=Math.min.apply(null,xs),maxX=Math.max.apply(null,xs),minY=Math.min.apply(null,ys),maxY=Math.max.apply(null,ys);
  var rw=maxX-minX+2,rh=maxY-minY+2;
  state.zoom=Math.max(.45,Math.min(2.5,Math.min((BW-60)/(rw*SCALE_BUILDER),(BH-100)/(rh*SCALE_BUILDER))));
  state.panX=-(minX+maxX)/2*SCALE_BUILDER*state.zoom;
  state.panY=(minY+maxY)/2*SCALE_BUILDER*state.zoom+8;
}

function newRocket(){
  state.history=[];state.future=[];state.parts=[];
  state.parts.push(defaultPart('capsule',0,7.1,2));
  state.parts.push(defaultPart('nose',0,8.4,2));
  state.parts.push(defaultPart('tankM',0,3.95,1));
  state.parts.push(defaultPart('tankM',0,.55,1));
  state.parts.push(defaultPart('decoupler',0,-1.0,1));
  state.parts.push(defaultPart('tankM',0,-3.0,0));
  state.parts.push(defaultPart('engineSea',0,-5.3,0));
  state.parts.push(defaultPart('fin',1.25,-3.6,0));state.parts[state.parts.length-1].symmetryGroup='starter-fin';
  var lf=defaultPart('fin',-1.25,-3.6,0);lf.symmetryGroup='starter-fin';state.parts.push(lf);
  state.selected=null;computeStageCount();fitRocket();updateAll();
}

$('#newBtn').onclick=newRocket;
$('#saveBtn').onclick=saveBlueprint;
$('#loadBtn').onclick=loadBlueprint;
$('#launchBtn').onclick=function(){startFlight();};
$('#abortBtn').onclick=function(){stopFlight();};
$('#stageBtn').onclick=function(){advanceStage();};
$('#cutoffBtn').onclick=function(){if(flight)flight.throttle=0;};
$('#throttle').oninput=function(){if(flight)flight.throttle=Number(this.value);updateThrottleUI();};
$$('.warp-btn').forEach(function(b){b.onclick=function(){$$('.warp-btn').forEach(function(x){x.classList.remove('active');});b.classList.add('active');if(flight)flight.warp=Number(b.dataset.warp);};});

window.addEventListener('keydown',function(ev){
  keys[ev.key.toLowerCase()]=true;
  if(ev.key==='Delete'||ev.key==='Backspace'){if(!flight)deletePart(selectedPart());}
  if(ev.key.toLowerCase()==='r'&&!flight)rotateSelected();
  if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='z'&&!flight){ev.preventDefault();undo();}
  if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='y'&&!flight){ev.preventDefault();redo();}
  if(ev.key==='Escape'&&state.tool&&!flight){state.tool=null;ghost=null;updateBuilder();}
  if(ev.key===' '&&flight){ev.preventDefault();advanceStage();}
  if(ev.key.toLowerCase()==='x'&&flight){flight.throttle=0;updateThrottleUI();}
  if(flight&&ev.key.toLowerCase()==='w'){flight.throttle=Math.min(1,flight.throttle+.02);updateThrottleUI();}
  if(flight&&ev.key.toLowerCase()==='s'){flight.throttle=Math.max(0,flight.throttle-.02);updateThrottleUI();}
});
window.addEventListener('keyup',function(ev){keys[ev.key.toLowerCase()]=false;});

function validateLaunch(){
  if(!state.parts.length){showToast('Build a rocket first');return false;}
  var M=metrics();
  if(!state.parts.some(function(p){return partDef(p.type).control;})){showToast('Add a command capsule');return false;}
  if(!M.thrust){showToast('Add an engine');return false;}
  if(!M.fuel){showToast('Add propellant');return false;}
  if(M.twr<1){showToast('Launch blocked: TWR is below 1.00');return false;}
  if(!state.parts.some(function(p){return partDef(p.type).stage===0&&partDef(p.type).thrust;})){showToast('Stage 1 needs an active engine');return false;}
  return true;
}

function makeFlight(){
  var built=state.parts.map(function(p){
    var d=partDef(p.type);
    return {id:p.id,type:p.type,stage:p.stage,mass:d.mass*1000,fuel:d.fuel*1000,fuelMax:d.fuel*1000,thrust:d.thrust*1000,isp:d.isp||0,solid:!!d.solid,decoupler:!!d.decoupler,x:p.x,y:p.y,rotation:p.rotation||0};
  });
  var M=metrics();
  return {parts:built,stage:0,stageCount:M.stages,throttle:1,warp:1,time:0,last:performance.now(),x:0,y:EARTH_R+2, vx:0,vy:0,angle:Math.PI/2,omega:0,trajectory:[],active:true,separated:false};
}

function activeStageParts(){
  if(!flight)return [];
  return flight.parts.filter(function(p){return p.stage===flight.stage;});
}
function stageFuel(s){return flight?flight.parts.filter(function(p){return p.stage===s;}).reduce(function(a,p){return a+p.fuel;},0):0;}
function stageHasEngine(s){return flight&&flight.parts.some(function(p){return p.stage===s&&p.thrust>0;});}
function totalMass(){return flight?flight.parts.reduce(function(a,p){return a+p.mass+p.fuel;},0):0;}
function totalFuel(){return flight?flight.parts.reduce(function(a,p){return a+p.fuel;},0):0;}

function advanceStage(){
  if(!flight)return;
  var old=flight.stage;
  if(old>=flight.stageCount-1){showToast('Final stage');return;}
  var hadDecoupler=flight.parts.some(function(p){return p.stage===old&&p.decoupler;});
  if(hadDecoupler){
    flight.parts=flight.parts.filter(function(p){return p.stage!==old;});
    flight.separated=true;
  }
  flight.stage++;
  $('#flightStageLabel').textContent='STAGE '+(flight.stage+1)+' / '+flight.stageCount;
  showToast('Stage '+(flight.stage+1)+' active');
  renderStaging();
}

function stopFlight(){
  flight=null;
  $('#flight').classList.add('hidden');
  $('#builderApp').classList.remove('hidden');
  $('#modeBadge').textContent='BUILDER';setStatus('READY');
  updateAll();
}

function startFlight(){
  if(!validateLaunch())return;
  flight=makeFlight();
  $('#builderApp').classList.add('hidden');$('#flight').classList.remove('hidden');
  $('#modeBadge').textContent='FLIGHT';setStatus('IN FLIGHT');
  $('#throttle').value=flight.throttle;updateThrottleUI();
  $('#flightStageLabel').textContent='STAGE 1 / '+flight.stageCount;
  resizeFlight();
  requestAnimationFrame(flightFrame);
}

function resizeFlight(){
  var r=flightCanvas.getBoundingClientRect(),d=window.devicePixelRatio||1;
  flightCanvas.width=r.width*d;flightCanvas.height=r.height*d;FD=d;
  fctx.setTransform(d,0,0,d,0,0);
}

function updateThrottleUI(){
  if(!flight)return;
  $('#throttle').value=flight.throttle;
  $('#throttleValue').textContent=Math.round(flight.throttle*100)+'%';
}

function atmosphereDensity(alt){
  if(alt>=ATM_H)return 0;
  return RHO0*Math.exp(-Math.max(0,alt)/8500);
}

function stepFlight(dt){
  if(!flight||!flight.active)return;
  var r=Math.hypot(flight.x,flight.y);
  var alt=r-EARTH_R;
  var mass=totalMass();
  var ux=flight.x/r,uy=flight.y/r;
  var vx=flight.vx,vy=flight.vy;
  var v=Math.hypot(vx,vy);
  var current=activeStageParts();
  var engine=current.filter(function(p){return p.thrust>0;});
  var totalThrust=engine.reduce(function(a,p){return a+p.thrust;},0)*flight.throttle;
  if(totalThrust>0 && stageFuel(flight.stage)>0){
    var totalFlow=engine.reduce(function(a,p){return a+p.thrust/(p.isp*G0);},0)*flight.throttle;
    var need=totalFlow*dt;
    var available=stageFuel(flight.stage);
    var burned=Math.min(available,need);
    engine.forEach(function(p){
      var share=totalFlow?(p.thrust/(p.isp*G0))/totalFlow:0;
      p.fuel=Math.max(0,p.fuel-burned*share);
    });
    totalThrust*=burned>0?1:0;
  }else{
    totalThrust=0;
  }

  var g=MU/(r*r);
  var gravX=-ux*g,gravY=-uy*g;
  var rho=atmosphereDensity(alt);
  var dragX=0,dragY=0;
  if(rho>0 && v>1){
    var CdA=5.5;
    var drag=.5*rho*CdA*v*v/(mass);
    dragX=-(vx/v)*drag;dragY=-(vy/v)*drag;
  }

  var turn=0;
  if(keys.a)turn+=1;
  if(keys.d)turn-=1;
  flight.omega+=turn*0.020;
  flight.omega*=Math.pow(.18,dt);
  flight.angle+=flight.omega*dt;

  var tx=Math.cos(flight.angle)*totalThrust/mass;
  var ty=Math.sin(flight.angle)*totalThrust/mass;
  flight.vx+=(gravX+dragX+tx)*dt;
  flight.vy+=(gravY+dragY+ty)*dt;
  flight.x+=flight.vx*dt;
  flight.y+=flight.vy*dt;
  flight.time+=dt;

  if(flight.y<0 && Math.hypot(flight.x,flight.y)<EARTH_R){
    flight.y=EARTH_R;flight.x=0;
  }
  if(flight.y<0 && alt<0){
    var rr=Math.hypot(flight.x,flight.y);
    if(rr<EARTH_R){flight.x=0;flight.y=EARTH_R;flight.vx*=.15;flight.vy=Math.max(0,flight.vy)*.15;}
  }

  if(!flight.trajectory.length || flight.time-flight.trajectory[flight.trajectory.length-1].t>.12){
    flight.trajectory.push({x:flight.x,y:flight.y,t:flight.time});
    if(flight.trajectory.length>900)flight.trajectory.shift();
  }

  var groundImpact=(Math.hypot(flight.x,flight.y)<=EARTH_R+1 && flight.time>1 && Math.hypot(flight.vx,flight.vy)<25);
  if(groundImpact && flight.time>2){
    $('#flightWarnings').textContent='LANDED / STOPPED';
  }else{
    var warnings=[];
    if(stageFuel(flight.stage)<=1 && stageHasEngine(flight.stage))warnings.push('STAGE FUEL LOW');
    if(alt<30000 && v>1600)warnings.push('HIGH DRAG');
    if(Math.abs(flight.angle-Math.PI/2)>1.25)warnings.push('ATTITUDE');
    $('#flightWarnings').textContent=warnings.join(' · ');
  }
}

function orbitalElements(){
  if(!flight)return null;
  var rx=flight.x,ry=flight.y,vx=flight.vx,vy=flight.vy,r=Math.hypot(rx,ry),v2=vx*vx+vy*vy;
  var energy=v2/2-MU/r;
  var h=rx*vy-ry*vx;
  if(energy>=0)return {peri:-1,apo:Infinity};
  var a=-MU/(2*energy);
  var e=Math.sqrt(Math.max(0,1+(2*energy*h*h)/(MU*MU)));
  return {peri:a*(1-e)-EARTH_R,apo:a*(1+e)-EARTH_R};
}

function formatDistance(m){
  if(!isFinite(m))return 'ESCAPE';
  if(m<1000)return Math.round(m)+' m';
  return (m/1000).toFixed(m<100000?1:0)+' km';
}

function renderFlight(){
  var r=flightCanvas.getBoundingClientRect(),W=r.width,H=r.height;
  fctx.clearRect(0,0,W,H);fctx.fillStyle='#02050a';fctx.fillRect(0,0,W,H);
  var cx=W/2,cy=H*.63;
  var alt=Math.hypot(flight.x,flight.y)-EARTH_R;
  var zoom=Math.max(.000035,Math.min(.0015,260/(Math.max(250000,alt+EARTH_R*.20))));
  var ex=cx+flight.x*zoom,ey=cy-flight.y*zoom;
  var earthPx=Math.max(55,EARTH_R*zoom);
  var ag=fctx.createRadialGradient(ex-earthPx*.25,ey-earthPx*.35,earthPx*.05,ex,ey,earthPx);
  ag.addColorStop(0,'#2b628b');ag.addColorStop(.55,'#17384f');ag.addColorStop(1,'#08121d');
  fctx.fillStyle=ag;fctx.beginPath();fctx.arc(ex,ey,earthPx,0,Math.PI*2);fctx.fill();
  if(ATM_H*zoom>2){fctx.fillStyle='rgba(92,185,232,.11)';fctx.beginPath();fctx.arc(ex,ey,earthPx+ATM_H*zoom,0,Math.PI*2);fctx.fill();}

  if(flight.trajectory.length>1){
    fctx.strokeStyle='rgba(111,216,255,.46)';fctx.lineWidth=1.3;fctx.beginPath();
    flight.trajectory.forEach(function(pt,i){var px=cx+pt.x*zoom,py=cy-pt.y*zoom;if(i===0)fctx.moveTo(px,py);else fctx.lineTo(px,py);});
    fctx.stroke();
  }

  var ox=ex,oy=ey;
  fctx.strokeStyle='rgba(239,196,110,.35)';fctx.setLineDash([3,6]);fctx.beginPath();fctx.arc(ox,oy,Math.max(earthPx+15,earthPx+50000*zoom),0,Math.PI*2);fctx.stroke();fctx.setLineDash([]);

  var rocketScale=Math.max(0.75,Math.min(2.3,1.2/(zoom*1000)));
  var px=cx+flight.x*zoom,py=cy-flight.y*zoom;
  fctx.save();fctx.translate(px,py);fctx.rotate(-flight.angle+Math.PI/2);
  fctx.fillStyle='#ccd6de';fctx.strokeStyle='#667988';fctx.lineWidth=2;
  fctx.beginPath();fctx.roundRect(-10*rocketScale,-23*rocketScale,20*rocketScale,40*rocketScale,4*rocketScale);fctx.fill();fctx.stroke();
  fctx.fillStyle='#5ec7e9';fctx.beginPath();fctx.arc(0,-12*rocketScale,5*rocketScale,0,Math.PI*2);fctx.fill();
  var burn=activeStageParts().some(function(p){return p.thrust>0&&p.fuel>0&&flight.throttle>0;});
  if(burn){fctx.fillStyle='#f5c36b';fctx.beginPath();fctx.moveTo(-4*rocketScale,18*rocketScale);fctx.quadraticCurveTo(0,(34+Math.random()*12)*rocketScale,4*rocketScale,18*rocketScale);fctx.closePath();fctx.fill();}
  fctx.restore();

  var speed=Math.hypot(flight.vx,flight.vy);
  var M=totalMass(),th=activeStageParts().reduce(function(a,p){return a+p.thrust;},0)*flight.throttle;
  var rr=Math.hypot(flight.x,flight.y),localG=MU/(rr*rr);
  var twr=M?th/(M*localG):0,orb=orbitalElements();
  $('#altReadout').textContent=formatDistance(alt);
  $('#velReadout').textContent=Math.round(speed)+' m/s';
  $('#apoReadout').textContent=orb?formatDistance(orb.apo):'—';
  $('#periReadout').textContent=orb?formatDistance(orb.peri):'—';
  $('#twrReadout').textContent=twr.toFixed(2);
  $('#fuelReadout').textContent=(totalFuel()/1000).toFixed(2)+' t';
  $('#timeReadout').textContent=flight.time.toFixed(1)+' s';
}

function flightFrame(now){
  if(!flight)return;
  var realDt=Math.min(.05,(now-flight.last)/1000);flight.last=now;
  var simDt=realDt*flight.warp;
  var steps=Math.max(1,Math.ceil(simDt/.025)),dt=simDt/steps;
  for(var i=0;i<steps;i++)stepFlight(dt);
  renderFlight();
  if(flight.active)requestAnimationFrame(flightFrame);
}

window.addEventListener('resize',function(){if(flight)resizeFlight();drawBuilder();});

var catRenderInterval=null;
renderPalette();
newRocket();

})();