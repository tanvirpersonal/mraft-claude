// Solar-system add-on for launch-pad.html: more moons, sky bodies, navigation target + transfer planner.
(()=>{
// 1. More worlds, appended so existing indices (and saved progress) stay valid
const n0=B.length;
[['Phobos',4,3e4,1.2e8,1.5e6,'#8a7b6c'],['Deimos',4,2.5e4,7e7,4.5e6,'#a39482'],['Io',5,1.4e5,3.4e10,8e6,'#d9c25a'],['Ganymede',5,1.6e5,4.6e10,3.5e7,'#8d8678'],['Callisto',5,1.5e5,3.9e10,6e7,'#6e6459'],['Triton',11,1.3e5,2.8e10,3e7,'#b7c6d4'],['Pluto',0,1.2e5,1.2e10,2.2e10,'#c8b49a']]
 .forEach(([nm,par,R,mu,a,col])=>B.push({nm,par,R,mu,a,col}));
for(let i=n0;i<B.length;i++){const b=B[i],p=B[b.par];b.om=Math.sqrt(p.mu/b.a**3);b.th0=i*1.7;b.soi=b.a*Math.pow(b.mu/p.mu,.4);VISITABLE.push(i)}
try{JSON.parse(localStorage.getItem(VISITED_KEY)).forEach(i=>{if(VISITABLE.includes(i))visited.add(i)})}catch(e){}

// 2. Helpers: absolute position (k=0) / velocity (k=2) of a body in the Sun frame
const ap=(i,k=0)=>{let x=0,y=0;for(;i>0;i=B[i].par){const q=bp(i,UT);x+=q[k];y+=q[k+1]}return[x,y]},
 chain=i=>{const c=[];for(;i>=0;i=B[i].par)c.push(i);return c},
 fd=m=>m>=1e9?(m/1e9).toFixed(2)+' Gm':m>=1e6?(m/1e6).toFixed(1)+' Mm':(m/1e3).toFixed(0)+' km',
 ft=s=>{const d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60);return(d?d+'d ':'')+h+'h '+m+'m'},
 dg=x=>Math.round(x*180/Math.PI)+'°';
let tg=-1;
const cyc=()=>{do{tg=tg>=B.length-1?-1:tg+1}while(tg===0||tg===S.cb);msg(tg<0?'Target cleared.':'Target: '+B[tg].nm,2500)};
const bt=document.createElement('button');bt.id='tg';bt.textContent='Target';bt.title='Cycle navigation target (T)';bt.onclick=cyc;$('#mp').after(bt);
$('#hint').textContent+=' · T target';
addEventListener('keydown',e=>{if(e.code=='KeyT'&&!e.repeat)cyc()});
let systemOverview=false;
const sysBtn=document.createElement('button');
sysBtn.id='sys';
sysBtn.textContent='System';
sysBtn.title='Show the full solar system';
sysBtn.setAttribute('aria-pressed','false');
bt.after(sysBtn);
sysBtn.onclick=()=>{systemOverview=!systemOverview;sysBtn.setAttribute('aria-pressed',systemOverview);msg(systemOverview?'Full solar system overview':'Solar system overview closed.',1800)};
function drawSystemOverview(){
 const W=innerWidth,H=innerHeight,root=B.map((q,i)=>q.par===0&&i!==0?i:null).filter(i=>i!==null);
 const panelW=Math.min(360,Math.max(290,W*.30)),panelH=Math.min(240,Math.max(190,H*.28)),x0=W-panelW-16,y0=16,cx0=x0+panelW*.52,cy0=y0+panelH*.57,R=panelW*.39;
 const maxA=Math.max(...root.map(i=>B[i].a)),maxL=Math.log1p(maxA/1e9);
 cx.save();cx.fillStyle='rgba(5,10,18,.9)';cx.strokeStyle='rgba(155,190,215,.28)';cx.lineWidth=1;
 cx.beginPath();cx.roundRect(x0,y0,panelW,panelH,14);cx.fill();cx.stroke();
 cx.fillStyle='#e7f2fb';cx.font='700 12px system-ui,sans-serif';cx.fillText('SOLAR SYSTEM',x0+14,y0+20);
 cx.fillStyle='#8da7ba';cx.font='10px ui-monospace,monospace';cx.fillText('ALL PLANETS · LIVE ORBIT POSITIONS',x0+14,y0+35);
 for(const i of root){
  const a=B[i].a,rr=Math.log1p(a/1e9)/maxL*R,ang=Math.atan2(ap(i)[1],ap(i)[0]),ox=cx0+Math.cos(ang)*rr,oy=cy0+Math.sin(ang)*rr;
  cx.strokeStyle='rgba(120,150,175,.16)';cx.beginPath();cx.arc(cx0,cy0,rr,0,TAU);cx.stroke();
  cx.fillStyle=i===tg?'#ffb15c':B[i].col;cx.beginPath();cx.arc(ox,oy,Math.max(2.5,Math.min(7,B[i].R/2e5)),0,TAU);cx.fill();
  cx.fillStyle=i===S.cb?'#8fe1ad':'#b7c7d3';cx.font='9px system-ui,sans-serif';cx.fillText(B[i].nm,ox+7,oy+3);
 }
 cx.fillStyle=B[0].col;cx.beginPath();cx.arc(cx0,cy0,5.5,0,TAU);cx.fill();
 cx.fillStyle='#d9e8f2';cx.font='9px system-ui,sans-serif';cx.fillText('Sun',cx0+8,cy0+3);
 cx.restore();
}


// 3. Sky: Sun, parent, siblings and moons drawn behind the terrain, lit from the Sun
function sky(){
 const W=innerWidth,H=innerHeight,b=B[S.cb],A=Math.PI/2-Math.atan2(S.y,S.x),ca=Math.cos(A),sa=Math.sin(A),top=b.atm?b.atm[2]:1,
  k=b.atm?Math.min(1,Math.max(0,(Math.hypot(S.x,S.y)-b.R)/(.8*top))):1,m=ap(S.cb),ox=m[0]+S.x,oy=m[1]+S.y,K=H*.5,sun=ap(0),ids=new Set([0,b.par]);
 B.forEach((q,i)=>{if(q.par===S.cb||q.par===b.par)ids.add(i)});ids.delete(S.cb);ids.delete(-1);
 for(const i of ids){
  const q=B[i],p=ap(i),dx=p[0]-ox,dy=p[1]-oy,d=Math.hypot(dx,dy)||1,ex=(dx*ca-dy*sa)/d,ey=(dx*sa+dy*ca)/d;
  if(ey<-.03)continue;
  const x=W/2+ex*K,y=H*.6-ey*K,rp=Math.max(i?2.2:5,Math.min(80,q.R/d*K*6)),sx=(sun[0]-p[0])*ca-(sun[1]-p[1])*sa,sy=(sun[0]-p[0])*sa+(sun[1]-p[1])*ca,l=Math.hypot(sx,sy)||1;
  cx.save();cx.globalAlpha=i?.3+.7*k:1;
  if(!i){const g=cx.createRadialGradient(x,y,0,x,y,rp*6);g.addColorStop(0,'rgba(255,244,200,.95)');g.addColorStop(.15,'rgba(255,205,120,.4)');g.addColorStop(1,'rgba(255,170,60,0)');cx.fillStyle=g;cx.beginPath();cx.arc(x,y,rp*6,0,TAU);cx.fill()}
  cx.fillStyle=q.col;cx.beginPath();cx.arc(x,y,rp,0,TAU);cx.fill();
  if(i){const gx=x+sx/l*rp*.45,gy=y-sy/l*rp*.45,g=cx.createRadialGradient(gx,gy,rp*.05,gx,gy,rp*1.5);g.addColorStop(0,'rgba(255,255,255,.28)');g.addColorStop(.5,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,10,.78)');cx.fillStyle=g;cx.beginPath();cx.arc(x,y,rp,0,TAU);cx.fill()}
  if(i===tg){cx.strokeStyle='#ffb15c';cx.lineWidth=1.5;cx.beginPath();cx.arc(x,y,rp+7,0,TAU);cx.stroke()}
  cx.restore()}}
window.__solarBeforeTerrain=sky;

// 4. Transfer planner (Hohmann): phase angle now vs ideal, time to window, departure burn
function plan(){
 if(tg<0)return'';
 if(tg===S.cb){msg('Arrived at '+B[tg].nm+'.',4000);tg=-1;return''}
 const a=ap(tg),m=ap(S.cb),va=ap(tg,2),vm=ap(S.cb,2),
  s='TARGET     '+B[tg].nm.toUpperCase()+'   |   DIST '+fd(Math.hypot(a[0]-m[0]-S.x,a[1]-m[1]-S.y))+'   |   REL '+Math.round(Math.hypot(va[0]-vm[0]-S.vx,va[1]-vm[1]-S.vy))+' m/s',
  cc=chain(S.cb),tc=chain(tg),P=cc.find(i=>tc.includes(i));
 if(P===tg)return s;
 const ci=cc.indexOf(P),c1=ci?cc[ci-1]:-1,t1=B[tc[tc.indexOf(P)-1]],mu=B[P].mu,rp=Math.hypot(S.x,S.y),
  r1=c1<0?rp:B[c1].a,w1=c1<0?Math.sqrt(mu/rp**3):B[c1].om,th1=c1<0?Math.atan2(S.y,S.x):B[c1].th0+w1*UT,
  r2=t1.a,th2=t1.th0+t1.om*UT,vi=Math.sqrt(mu/r1)*(Math.sqrt(2*r2/(r1+r2))-1),
  ideal=wr(Math.PI-t1.om*Math.PI*Math.sqrt((r1+r2)**3/(8*mu))),cur=wr(th2-th1),dw=t1.om-w1||1e-9;
 let d=((ideal-cur)*Math.sign(dw))%TAU;d=(d+TAU)%TAU;
 const bd=c1<0?Math.abs(vi):c1===S.cb?Math.sqrt(vi*vi+2*B[c1].mu/rp)-Math.sqrt(B[c1].mu/rp):null;
 return s+'\nTRANSFER   PHASE '+dg(cur)+' / IDEAL '+dg(ideal)+'   |   WINDOW '+ft(d/Math.abs(dw))+(bd==null?'':'   |   BURN ~'+Math.round(bd)+' m/s')}
window.__solarHud=()=>{const s=plan();if(s)hudEl.textContent+='\n'+s;if(systemOverview)drawSystemOverview()};

// 5. Map: mark the target even when it is not one of the drawn bodies
window.__solarAfterMap=()=>{if(tg<0||tg===S.cb)return;const a=ap(tg),m=ap(S.cb),x=innerWidth/2+(a[0]-m[0]-mapX)*zm,y=innerHeight/2-(a[1]-m[1]-mapY)*zm;
 cx.save();cx.strokeStyle=cx.fillStyle='#ffb15c';cx.lineWidth=1.5;cx.setLineDash([4,3]);cx.beginPath();cx.arc(x,y,12,0,TAU);cx.stroke();cx.setLineDash([]);cx.font='12px system-ui,sans-serif';cx.fillText('TARGET '+B[tg].nm,x+16,y+4);cx.restore()};window.__solarSystemLoaded=true;
})();
