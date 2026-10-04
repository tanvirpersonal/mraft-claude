(()=>{"use strict";if(window.__MRAFT_SOLAR__)return;window.__MRAFT_SOLAR__=1;
const P=[
["Mercury",.39,.241,3,"#9b9690"],["Venus",.72,.615,4,"#d3a45e"],["Earth",1,1,5,"#438bd0"],
["Mars",1.52,1.881,4,"#b75e47"],["Jupiter",5.20,11.86,10,"#c38d68"],["Saturn",9.54,29.45,9,"#d2b77a"],
["Uranus",19.2,84,7,"#75c4cd"],["Neptune",30.1,164.8,7,"#4a77d0"],["Pluto",39.5,248,3,"#c2b09b"]];
const moons={
2:[["Moon",.06,.0748,2,"#b8b8b4"]],3:[["Phobos",.015,.0037,1.2,"#8c7d71"],["Deimos",.04,.0096,1,"#a09282"]],
4:[["Io",.14,.0049,1.8,"#dfc965"],["Europa",.20,.0098,1.5,"#d6d0af"],["Ganymede",.28,.0196,2,"#999182"],["Callisto",.34,.0457,2,"#6b6258"]],
5:[["Titan",.35,.016,2.3,"#c88d4c"]],7:[["Triton",.22,.016,2,"#b9c6d3"]]};
let wrap,can,cx,opened=false,target=2,start=performance.now(),toast="",toastUntil=0;
function init(){
 if(wrap)return;
 wrap=document.createElement("div");wrap.style.cssText="position:fixed;inset:0;z-index:9999;display:none;background:#02050a;color:#eaf6ff";
 can=document.createElement("canvas");can.style.cssText="width:100%;height:100%;position:absolute;inset:0";cx=can.getContext("2d");wrap.appendChild(can);
 const top=document.createElement("div");top.style.cssText="position:absolute;left:16px;right:16px;top:14px;display:flex;align-items:center;gap:12px";
 const h=document.createElement("b");h.textContent="SOLAR SYSTEM";h.style.letterSpacing=".12em";top.appendChild(h);
 const sub=document.createElement("span");sub.textContent="LIVE ORBIT VIEW";sub.style.cssText="opacity:.5;font:11px monospace";top.appendChild(sub);
 const close=document.createElement("button");close.textContent="Close";close.style.cssText="margin-left:auto;padding:7px 12px;background:#102638;color:#eaf6ff;border:1px solid #406072;border-radius:8px;cursor:pointer";close.onclick=()=>open(false);top.appendChild(close);wrap.appendChild(top);
 const info=document.createElement("div");info.id="solar-info";info.style.cssText="position:absolute;left:16px;bottom:14px;font:11px monospace;color:#9db5c5";wrap.appendChild(info);
 document.body.appendChild(wrap);
 addEventListener("resize",resize);addEventListener("keydown",e=>{if(e.code==="Escape"&&opened)open(false);if(e.code==="KeyT"&&!e.repeat&&opened){target=(target+1)%P.length;toastMsg("Target: "+P[target][0])}});
 can.addEventListener("click",e=>{if(!opened)return;let k=pick(e.clientX,e.clientY);if(k>=0){target=k;toastMsg("Target: "+P[k][0])}});
 resize();
}
function resize(){if(!can)return;const d=Math.min(2,devicePixelRatio||1);can.width=innerWidth*d;can.height=innerHeight*d;cx.setTransform(d,0,0,d,0,0)}
function open(v){init();opened=v;wrap.style.display=v?"block":"none";if(v){start=performance.now();requestAnimationFrame(draw)}}
function toastMsg(s){toast=s;toastUntil=performance.now()+1800}
function pos(q,i,now,W,H){
 const R=Math.min(W*.41,H*.39),rr=Math.max(18,Math.log1p(q[1])/Math.log1p(39.5)*R),a=i*.73+(now-start)/86400000/q[2]*Math.PI*2;
 return [W*.5+Math.cos(a)*rr,H*.53+Math.sin(a)*rr*.64,rr];
}
function pick(x,y){
 const now=performance.now();let best=-1,bd=28;
 for(let i=0;i<P.length;i++){const q=pos(P[i],i,now,innerWidth,innerHeight),d=Math.hypot(x-q[0],y-q[1]);if(d<bd){bd=d;best=i}}return best;
}
function planet(x,y,r,col,name,sel){
 const g=cx.createRadialGradient(x-r*.35,y-r*.4,1,x,y,r);g.addColorStop(0,"#fff");g.addColorStop(.16,col);g.addColorStop(1,"#03070c");
 cx.fillStyle=g;cx.beginPath();cx.arc(x,y,r,0,Math.PI*2);cx.fill();
 if(name==="Saturn"){cx.strokeStyle="#ead09a";cx.lineWidth=Math.max(2,r*.25);cx.beginPath();cx.ellipse(x,y,r*1.95,r*.62,-.25,0,Math.PI*2);cx.stroke()}
 if(sel){cx.strokeStyle="#ffb15c";cx.lineWidth=2;cx.setLineDash([6,4]);cx.beginPath();cx.arc(x,y,r+9,0,Math.PI*2);cx.stroke();cx.setLineDash([])}
}
function draw(now){
 if(!opened)return;
 const W=innerWidth,H=innerHeight,R=Math.min(W*.41,H*.39),mx=W*.5,my=H*.53;cx.clearRect(0,0,W,H);
 cx.fillStyle="rgba(255,255,255,.7)";for(let i=0;i<180;i++)cx.fillRect((i*97.1)%W,(i*53.7)%H,1,1);
 for(const q of P){const rr=Math.max(18,Math.log1p(q[1])/Math.log1p(39.5)*R);cx.strokeStyle="rgba(112,145,170,.22)";cx.beginPath();cx.ellipse(mx,my,rr,rr*.64,0,0,Math.PI*2);cx.stroke()}
 const sg=cx.createRadialGradient(mx,my,1,mx,my,60);sg.addColorStop(0,"#fff5b5");sg.addColorStop(.18,"#ffc35b");sg.addColorStop(1,"rgba(255,120,30,0)");cx.fillStyle=sg;cx.beginPath();cx.arc(mx,my,60,0,Math.PI*2);cx.fill();cx.fillStyle="#ffe28a";cx.beginPath();cx.arc(mx,my,12,0,Math.PI*2);cx.fill();
 cx.fillStyle="#d8e7f0";cx.font="10px system-ui";cx.fillText("Sun",mx+18,my+4);
 for(let i=0;i<P.length;i++){const q=P[i],p=pos(q,i,now,W,H),r=Math.max(3.5,Math.min(11,q[3])),sel=i===target;planet(p[0],p[1],r,q[4],q[0],sel);cx.fillStyle=sel?"#ffbf7a":"#c4d4de";cx.fillText(q[0],p[0]+r+6,p[1]+3);
   if(moons[i])for(let j=0;j<moons[i].length;j++){const m=moons[i][j],mr=7+m[1]/.05*8,ma=(now-start)/86400000/m[2]*Math.PI*2+j,ox=p[0]+Math.cos(ma)*mr,oy=p[1]+Math.sin(ma)*mr*.7;cx.fillStyle=m[4];cx.beginPath();cx.arc(ox,oy,Math.max(2,m[3]),0,Math.PI*2);cx.fill();cx.fillStyle="#aebfca";cx.fillText(m[0],ox+5,oy+3)}}
 cx.fillStyle="#9db5c5";cx.font="11px monospace";cx.fillText("9 planets + Pluto · major moons · Target: "+P[target][0],18,H-36);cx.fillText("Click planet · T next target · Esc close",18,H-18);
 if(toastUntil>now){cx.fillStyle="rgba(8,18,29,.9)";cx.strokeStyle="#765d44";cx.beginPath();cx.roundRect(W/2-110,H-78,220,38,10);cx.fill();cx.stroke();cx.fillStyle="#ffd09c";cx.font="700 12px system-ui";cx.textAlign="center";cx.fillText(toast,W/2,H-54);cx.textAlign="left"}
 requestAnimationFrame(draw);
}
init();
const btn=document.createElement("button");btn.textContent="Solar System";btn.title="Open solar system";btn.style.cssText="position:fixed;top:14px;right:14px;z-index:8;padding:8px 13px;border:1px solid rgba(155,190,215,.28);border-radius:8px;background:rgba(12,31,45,.95);color:#e7f2fb;font:700 13px system-ui;cursor:pointer";btn.onclick=()=>open(true);document.body.appendChild(btn);
window.MRAFT_SOLAR={open:()=>open(true),close:()=>open(false)};
})();