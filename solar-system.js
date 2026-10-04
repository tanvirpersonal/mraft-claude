// Standalone Solar System renderer for MRAFT Launch Control.
// It augments the existing flight simulation without replacing the rocket/physics code.
(()=>{
  'use strict';
  try{
    if(window.__solarSystemInstalled)return;
    window.__solarSystemInstalled=true;

    const baseCount=B.length;
    const extra=[
      ['Phobos',4,3e4,1.2e8,1.5e6,'#8a7b6c'],
      ['Deimos',4,2.5e4,7e7,4.5e6,'#a39482'],
      ['Io',5,1.4e5,3.4e10,8e6,'#d9c25a'],
      ['Ganymede',5,1.6e5,4.6e10,3.5e7,'#8d8678'],
      ['Callisto',5,1.5e5,3.9e10,6e7,'#6e6459'],
      ['Triton',11,1.3e5,2.8e10,3e7,'#b7c6d4'],
      ['Pluto',0,1.2e5,1.2e10,2.2e10,'#c8b49a']
    ];

    for(const [nm,par,R,mu,a,col] of extra){
      if(!B.some(x=>x.nm===nm))B.push({nm,par,R,mu,a,col});
    }
    for(let i=baseCount;i<B.length;i++){
      const b=B[i],p=B[b.par];
      b.om=Math.sqrt(p.mu/b.a**3);
      b.th0=i*1.7;
      b.soi=b.a*Math.pow(b.mu/p.mu,.4);
      if(!VISITABLE.includes(i))VISITABLE.push(i);
    }

    try{
      const saved=JSON.parse(localStorage.getItem(VISITED_KEY)||'[]');
      if(Array.isArray(saved))for(const i of saved)if(VISITABLE.includes(i))visited.add(i);
    }catch(_){}

    const fmtDist=m=>m>=1e9?(m/1e9).toFixed(2)+' Gm':m>=1e6?(m/1e6).toFixed(1)+' Mm':Math.max(1,Math.round(m/1e3))+' km';

    const worldPos=(index,k=0)=>{
      let x=0,y=0;
      for(let i=index;i>0;i=B[i].par){
        const q=bp(i,UT);
        x+=q[k];
        y+=q[k+1];
      }
      return [x,y];
    };

    const rootPlanets=()=>B.map((b,i)=>b.par===0&&i!==0?i:null).filter(i=>i!==null);
    const directChildren=parent=>B.map((b,i)=>b.par===parent?i:null).filter(i=>i!==null);

    let target=-1;
    let systemView=false;

    const targetButton=document.createElement('button');
    targetButton.id='solar-target';
    targetButton.textContent='Target';
    targetButton.title='Cycle solar-system target (T)';
    $('#mp').after(targetButton);

    const systemButton=document.createElement('button');
    systemButton.id='solar-system';
    systemButton.textContent='System';
    systemButton.title='Open full solar-system view';
    targetButton.after(systemButton);

    function setSystemView(v){
      systemView=!!v;
      systemButton.setAttribute('aria-pressed',systemView?'true':'false');
      document.body.classList.toggle('solar-system-view',systemView);
      msg(systemView?'Solar system: full map':'Solar system map closed.',1600);
    }

    const cycleTarget=()=>{
      const all=B.map((_,i)=>i).filter(i=>i!==0&&i!==S.cb);
      if(!all.length)return;
      let at=all.indexOf(target);
      target=all[(at+1+all.length)%all.length];
      msg('Target: '+B[target].nm,2200);
    };

    targetButton.onclick=cycleTarget;
    systemButton.onclick=()=>setSystemView(!systemView);
    addEventListener('keydown',e=>{
      if(e.code==='KeyT'&&!e.repeat)cycleTarget();
      if(e.code==='Escape'&&systemView)setSystemView(false);
    });
    $('#hint').textContent+=' · T target · System = solar map';

    function drawBody(x,y,r,body,active=false,selected=false){
      const grad=cx.createRadialGradient(x-r*.3,y-r*.35,r*.08,x,y,r);
      grad.addColorStop(0,'#ffffff');
      grad.addColorStop(.14,body.col);
      grad.addColorStop(1,'rgba(0,0,0,.82)');
      cx.fillStyle=grad;
      cx.beginPath();cx.arc(x,y,r,0,TAU);cx.fill();
      if(body.nm==='Saturn'){
        cx.save();
        cx.strokeStyle='rgba(235,210,155,.8)';
        cx.lineWidth=Math.max(1,r*.28);
        cx.beginPath();cx.ellipse(x,y,r*2.25,r*.72,-.25,0,TAU);cx.stroke();
        cx.restore();
      }
      if(active||selected){
        cx.save();
        cx.strokeStyle=selected?'#ffb15c':'#8fe1ad';
        cx.lineWidth=selected?2:1.4;
        cx.setLineDash(selected?[6,4]:[]);
        cx.beginPath();cx.arc(x,y,r+(selected?9:5),0,TAU);cx.stroke();
        cx.restore();
      }
    }

    function drawSkyPlanets(){
      const W=innerWidth,H=innerHeight;
      const body=B[S.cb];
      const sunFrame=worldPos(0),here=[sunFrame[0]+S.x,sunFrame[1]+S.y];
      const phi=Math.atan2(S.y,S.x);
      const A=Math.PI/2-phi,ca=Math.cos(A),sa=Math.sin(A);
      const horizonY=H*.6,reach=Math.min(W,H)*.43;
      const candidates=[0,...rootPlanets(),...directChildren(S.cb)];
      const seen=new Set();

      for(const i of candidates){
        if(i===S.cb||seen.has(i)||i<0||i>=B.length)continue;
        seen.add(i);
        const q=B[i],p=worldPos(i),dx=p[0]-here[0],dy=p[1]-here[1],d=Math.hypot(dx,dy)||1;
        const ex=(dx*ca-dy*sa)/d,ey=(dx*sa+dy*ca)/d;
        if(ey<-.20)continue;

        const x=W/2+ex*reach;
        const y=horizonY-ey*reach*.88;
        const radius=i===0?Math.min(34,Math.max(12,24*Math.pow(1e7/d,.06))):Math.min(18,Math.max(4,8*Math.pow(1e8/d,.08)));
        drawBody(x,y,radius,q,i===S.cb,i===target);

        if(radius>=4){
          cx.fillStyle='#d7e5ef';
          cx.font='10px system-ui,sans-serif';
          cx.fillText(q.nm,x+radius+5,y+3);
        }
      }

      const panelW=Math.min(300,W*.32);
      cx.save();
      cx.fillStyle='rgba(3,8,14,.66)';
      cx.strokeStyle='rgba(155,190,215,.22)';
      cx.lineWidth=1;
      cx.beginPath();cx.roundRect(14,H-132,panelW,110,12);cx.fill();cx.stroke();
      cx.fillStyle='#e7f2fb';
      cx.font='700 11px system-ui,sans-serif';
      cx.fillText('SOLAR SYSTEM / SKY',28,H-109);
      cx.fillStyle='#9fb7c9';
      cx.font='10px ui-monospace,monospace';
      cx.fillText('Current body: '+body.nm,28,H-90);
      cx.fillText('Visible worlds: '+seen.size,28,H-73);
      cx.fillText(target>=0?'Target: '+B[target].nm:'Target: none',28,H-56);
      cx.fillText('T = next target   ·   System = orbital map',28,H-39);
      cx.restore();
    }

    function drawFullSystem(){
      const W=innerWidth,H=innerHeight;
      cx.save();
      cx.fillStyle='#02050a';
      cx.fillRect(0,0,W,H);

      const px=W*.43,py=H*.53;
      const maxA=Math.max(...rootPlanets().map(i=>B[i].a),B[B.length-1].a);
      const R=Math.min(W*.36,H*.40);
      const scaleA=Math.log1p(maxA/1e9);

      // Stars.
      cx.fillStyle='rgba(255,255,255,.65)';
      for(let i=0;i<150;i++){
        const x=(i*83.17)%W,y=(i*47.31)%H;
        cx.fillRect(x,y,1,1);
      }

      // Title.
      cx.fillStyle='#edf7ff';
      cx.font='800 18px system-ui,sans-serif';
      cx.fillText('SOLAR SYSTEM',24,34);
      cx.fillStyle='#8da7ba';
      cx.font='11px ui-monospace,monospace';
      cx.fillText('LIVE ORBITAL VIEW · '+B.length+' CELESTIAL BODIES',24,52);

      // Root-system orbit rings and planets.
      for(const i of rootPlanets()){
        const q=B[i],rr=Math.max(24,Math.log1p(q.a/1e9)/scaleA*R);
        cx.strokeStyle='rgba(108,141,167,.22)';
        cx.lineWidth=1;
        cx.beginPath();cx.arc(px,py,rr,0,TAU);cx.stroke();

        const [wx,wy]=worldPos(i);
        const ang=Math.atan2(wy,wx);
        const x=px+Math.cos(ang)*rr,y=py+Math.sin(ang)*rr;
        const r=Math.min(11,Math.max(4,5+Math.log10(Math.max(1,q.R))/2));
        drawBody(x,y,r,q,i===S.cb,i===target);

        cx.fillStyle=i===S.cb?'#8fe1ad':i===target?'#ffb15c':'#c7d6e0';
        cx.font='10px system-ui,sans-serif';
        cx.fillText(q.nm,x+r+6,y+3);
      }

      // Sun.
      const sunR=12;
      const sunGrad=cx.createRadialGradient(px,py,1,px,py,sunR*4);
      sunGrad.addColorStop(0,'rgba(255,238,150,1)');
      sunGrad.addColorStop(.18,'rgba(255,195,80,.8)');
      sunGrad.addColorStop(1,'rgba(255,150,40,0)');
      cx.fillStyle=sunGrad;cx.beginPath();cx.arc(px,py,sunR*4,0,TAU);cx.fill();
      cx.fillStyle='#ffe38a';cx.beginPath();cx.arc(px,py,sunR,0,TAU);cx.fill();
      cx.fillStyle='#c7d6e0';cx.font='10px system-ui,sans-serif';cx.fillText('Sun',px+18,py+3);

      // Nearby moon systems as inset cards.
      const cards=[
        {parent:2,x:W-258,y:88,w:232,h:112,title:'EARTH SYSTEM'},
        {parent:5,x:W-258,y:212,w:232,h:128,title:'JUPITER SYSTEM'},
        {parent:7,x:W-258,y:350,w:232,h:112,title:'SATURN SYSTEM'}
      ];
      for(const card of cards){
        cx.fillStyle='rgba(10,20,32,.88)';
        cx.strokeStyle='rgba(155,190,215,.22)';
        cx.beginPath();cx.roundRect(card.x,card.y,card.w,card.h,12);cx.fill();cx.stroke();
        cx.fillStyle='#dbe9f3';cx.font='700 10px system-ui,sans-serif';cx.fillText(card.title,card.x+12,card.y+18);
        const kids=directChildren(card.parent);
        const ccx=card.x+52,ccy=card.y+62;
        cx.strokeStyle='rgba(110,145,170,.18)';
        cx.beginPath();cx.arc(ccx,ccy,28,0,TAU);cx.stroke();
        drawBody(ccx,ccy,7,B[card.parent],card.parent===S.cb,card.parent===target);
        cx.fillStyle='#8da7ba';cx.font='9px system-ui,sans-serif';cx.fillText(B[card.parent].nm,ccx-14,ccy+25);
        kids.slice(0,5).forEach((i,n)=>{
          const a=B[i].th0+B[i].om*UT,x=ccx+Math.cos(a)*28,y=ccy+Math.sin(a)*28;
          drawBody(x,y,3.2,B[i],i===S.cb,i===target);
          cx.fillStyle='#aebfcb';cx.fillText(B[i].nm,x+5,y+3);
        });
      }

      // Planet index.
      const listX=22,listY=82;
      cx.fillStyle='rgba(6,13,21,.82)';
      cx.strokeStyle='rgba(155,190,215,.2)';
      cx.beginPath();cx.roundRect(listX,listY,195,rootPlanets().length*24+42,12);cx.fill();cx.stroke();
      cx.fillStyle='#dceaf4';cx.font='700 10px system-ui,sans-serif';cx.fillText('PLANETS',listX+12,listY+18);
      rootPlanets().forEach((i,n)=>{
        const y=listY+37+n*24;
        cx.fillStyle=B[i].col;cx.beginPath();cx.arc(listX+18,y-3,4,0,TAU);cx.fill();
        cx.fillStyle=i===S.cb?'#8fe1ad':i===target?'#ffb15c':'#c4d3dd';
        cx.font='10px system-ui,sans-serif';cx.fillText(B[i].nm,listX+30,y);
        cx.fillStyle='#7891a2';cx.font='9px ui-monospace,monospace';cx.fillText(fmtDist(B[i].a),listX+90,y);
      });

      cx.fillStyle='#8da7ba';
      cx.font='10px ui-monospace,monospace';
      cx.fillText('Esc / System: close   ·   T: next target   ·   Current body: '+B[S.cb].nm,24,H-22);
      cx.restore();
    }

    function transferInfo(){
      if(target<0||target===S.cb)return '';
      const from=worldPos(S.cb),to=worldPos(target);
      const dvx=to[0]-from[0]-S.x,dvy=to[1]-from[1]-S.y;
      const dist=Math.hypot(dvx,dvy);
      return 'TARGET '+B[target].nm.toUpperCase()+' · DIST '+fmtDist(dist);
    }

    window.__solarBeforeTerrain=drawSkyPlanets;
    window.__solarHud=()=>{
      const info=transferInfo();
      if(info)hudEl.textContent+='\n'+info;
    };
    window.__solarAfterMap=()=>{
      if(target<0||target===S.cb)return;
      const p=worldPos(target),m=worldPos(S.cb);
      const x=innerWidth/2+(p[0]-m[0]-mapX)*zm;
      const y=innerHeight/2-(p[1]-m[1]-mapY)*zm;
      cx.save();
      cx.strokeStyle='#ffb15c';cx.lineWidth=2;cx.setLineDash([5,4]);
      cx.beginPath();cx.arc(x,y,12,0,TAU);cx.stroke();
      cx.setLineDash([]);
      cx.fillStyle='#ffcc8c';cx.font='11px system-ui,sans-serif';cx.fillText(B[target].nm,x+16,y+4);
      cx.restore();
    };
    window.__solarFrame=()=>{
      if(systemView){
        drawFullSystem();
        return;
      }
      // Persistent small status indicator so the addon is visibly alive.
      cx.save();
      cx.fillStyle='rgba(4,10,17,.72)';
      cx.strokeStyle='rgba(155,190,215,.18)';
      cx.beginPath();cx.roundRect(innerWidth-178,74,164,30,9);cx.fill();cx.stroke();
      cx.fillStyle='#9eb9ca';cx.font='10px ui-monospace,monospace';
      cx.fillText('SOLAR SYSTEM  '+B.length+' BODIES',innerWidth-166,93);
      cx.restore();
    };
    window.__solarSystemReady=true;
    msg('Solar system loaded · '+B.length+' celestial bodies',2600);
  }catch(err){
    console.error('Solar system addon failed:',err);
    window.__solarSystemReady=false;
    window.__solarSystemError=String(err&&err.message||err);
  }
})();