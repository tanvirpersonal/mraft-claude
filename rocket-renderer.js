// MRAFT shared rocket renderer. Builder and Flight use the same visual code.
window.MRAFT_ROCKET_RENDERER = (() => {
  const COL={pod:['#eef2f6','#aeb8c3'],nose:['#e9edf1','#a9b4bf'],tank:['#e6e9ed','#9aa6b2'],eng:['#8d98a4','#4c5662'],vac:['#c9a36a','#7a5a2e'],srb:['#f0f2f4','#aab3bd'],dec:['#6f7a86','#3d4650'],fin:['#c9d1d9','#7f8c99'],leg:['#9aa6b2','#59646f'],para:['#e4e8ed','#8593a0'],dock:['#c2ccd5','#647585'],solar:['#4c8fbd','#183b65']};
  function draw(c,u,x,y,s,fl,deployed=false){
 const W=u.w*s,H=u.h*s,k=u.k,[a,b]=COL[k],m=(...r)=>c.moveTo(...r),l=(...r)=>c.lineTo(...r),q=(...r)=>c.quadraticCurveTo(...r);
 c.save();c.translate(x,y);if(fl)c.scale(-1,1);
 const g=c.createLinearGradient(-W/2,0,W/2,0);g.addColorStop(0,b);g.addColorStop(.28,a);g.addColorStop(.72,a);g.addColorStop(1,b);
 c.fillStyle=g;c.strokeStyle='rgba(8,14,22,.85)';c.lineWidth=Math.max(.15,s*.004);c.lineJoin='round';c.beginPath();
 if(k=='pod'){m(-W/2,H/2);l(-W/2,0);c.bezierCurveTo(-W/2,-H*.45,-W*.22,-H/2,0,-H/2);c.bezierCurveTo(W*.22,-H/2,W/2,-H*.45,W/2,0);l(W/2,H/2)}
 else if(k=='nose'){m(-W/2,H/2);q(-W/2,-H*.1,0,-H/2);q(W/2,-H*.1,W/2,H/2)}
 else if(k=='eng'){m(-W*.3,-H/2);l(W*.3,-H/2);l(W*.3,-H*.25);l(W/2,H/2);l(-W/2,H/2);l(-W*.3,-H*.25)}
 else if(k=='vac'){m(-W*.25,-H/2);l(W*.25,-H/2);l(W*.25,-H*.3);q(W*.3,H*.2,W/2,H/2);l(-W/2,H/2);q(-W*.3,H*.2,-W*.25,-H*.3)}
 else if(k=='srb'){m(-W/2,-H/2+W);q(-W/2,-H/2,0,-H/2);q(W/2,-H/2,W/2,-H/2+W);l(W/2,H/2-W*.6);l(W*.3,H/2-W*.6);l(W*.45,H/2);l(-W*.45,H/2);l(-W*.3,H/2-W*.6);l(-W/2,H/2-W*.6)}
 else if(k=='fin'){m(-W/2,-H/2);l(W/2,H/2);l(-W/2,H/2)}
 else if(k=='leg'){m(-W/2,-H/2);l(-W/2,-H*.32);l(W*.3,H*.42);l(W*.12,H*.42);c.closePath();c.rect(0,H*.42,W/2,H*.08)}
 else if(k=='para'){m(-W*.42,-H/2);l(W*.42,-H/2);q(W/2,-H/2,W/2,-H*.3);l(W/2,H*.32);q(W/2,H/2,W*.3,H/2);l(-W*.3,H/2);q(-W/2,H/2,-W/2,H*.32);l(-W/2,-H*.3);q(-W/2,-H/2,-W*.42,-H/2)}
 else if(k=='dock'){m(-W*.34,-H/2);l(W*.34,-H/2);l(W*.34,-H*.27);l(W/2,-H*.1);l(W/2,H*.1);l(W*.34,H*.27);l(W*.34,H/2);l(-W*.34,H/2);l(-W*.34,H*.27);l(-W/2,H*.1);l(-W/2,-H*.1);l(-W*.34,-H*.27)}
 else if(k=='solar'){m(-W*.12,-H/2);l(W*.12,-H/2);l(W*.12,H/2);l(-W*.12,H/2)}
 else c.rect(-W/2,-H/2,W,H);
 c.closePath();c.fill();c.stroke();
 c.save();c.lineWidth=Math.max(1,s*.035);c.strokeStyle='rgba(255,255,255,.48)';c.fillStyle='rgba(255,255,255,.55)';
 if(k=='pod'){
  c.beginPath();c.arc(0,-H*.05,W*.19,0,Math.PI*2);c.fillStyle='#152f48';c.fill();c.strokeStyle='#dce8f2';c.lineWidth=Math.max(1,s*.07);c.stroke();
  c.beginPath();c.arc(-W*.025,-H*.075,W*.105,0,Math.PI*2);c.fillStyle='#6bc3e6';c.fill();
  c.beginPath();c.moveTo(-W*.11,H*.24);c.lineTo(W*.11,H*.24);c.strokeStyle='rgba(32,48,62,.65)';c.stroke();
 }else if(k=='nose'){
  c.beginPath();c.moveTo(-W*.28,H*.24);c.quadraticCurveTo(0,-H*.28,W*.28,H*.24);c.stroke();
  c.beginPath();c.moveTo(0,-H*.3);c.lineTo(0,H*.28);c.strokeStyle='rgba(255,255,255,.24)';c.stroke();
 }else if(k=='tank'){
  c.fillStyle='#d9622b';c.fillRect(-W/2,-H/2+H*.1,W,H*.07);c.fillRect(-W/2,H/2-H*.17,W,H*.07);
  c.strokeStyle='rgba(255,255,255,.38)';c.beginPath();c.moveTo(-W*.28,-H*.32);c.lineTo(-W*.28,H*.32);c.moveTo(W*.28,-H*.32);c.lineTo(W*.28,H*.32);c.stroke();
  c.fillStyle='rgba(255,255,255,.7)';for(let i=0;i<3;i++){c.beginPath();c.arc(-W*.34+i*W*.34,-H*.38,s*.035,0,Math.PI*2);c.fill()}
 }else if(k=='eng'||k=='vac'){
  const bell=c.createLinearGradient(0,-H*.25,0,H/2);bell.addColorStop(0,'#56616b');bell.addColorStop(.45,'#252e37');bell.addColorStop(1,'#080d12');
  c.beginPath();if(k=='eng'){m(-W*.3,-H*.25);l(-W/2,H/2);l(W/2,H/2);l(W*.3,-H*.25)}else{m(-W*.25,-H*.3);q(-W*.3,H*.2,-W/2,H/2);l(W/2,H/2);q(W*.3,H*.2,W*.25,-H*.3)}
  c.closePath();c.fillStyle=bell;c.fill();c.strokeStyle='#111820';c.stroke();
  c.beginPath();c.ellipse(0,H/2-1,W*.4,H*.055,0,0,Math.PI*2);c.fillStyle='#0b1118';c.fill();
  c.beginPath();c.ellipse(0,H/2-1,W*.25,H*.028,0,0,Math.PI*2);c.strokeStyle='#71818e';c.stroke();
 }else if(k=='srb'){
  c.fillStyle='#c93a32';c.fillRect(-W/2,-H/2+W*1.4,W,H*.06);
  c.strokeStyle='rgba(70,80,90,.65)';c.beginPath();c.moveTo(-W*.3,-H*.25);c.lineTo(-W*.3,H*.22);c.moveTo(W*.3,-H*.25);c.lineTo(W*.3,H*.22);c.stroke();
 }else if(k=='dec'){
  c.fillStyle='#18222c';c.fillRect(-W/2,-H*.12,W,H*.24);
  c.fillStyle='#c7d0d8';for(let i=0;i<4;i++)c.fillRect(-W*.38+i*W*.24,-H*.2,W*.08,H*.4);
 }else if(k=='fin'){
  c.beginPath();c.moveTo(-W*.34,-H*.27);c.lineTo(W*.28,H*.34);c.stroke();
  c.fillStyle='#687784';c.fillRect(-W*.48,-H*.47,W*.18,H*.16);
 }else if(k=='leg'){
  c.fillStyle='#5c6873';c.beginPath();c.arc(-W*.31,-H*.3,W*.13,0,Math.PI*2);c.fill();c.stroke();
  c.strokeStyle='#d5dde4';c.beginPath();c.moveTo(-W*.25,-H*.28);c.lineTo(W*.24,H*.38);c.stroke();
 }else if(k=='para'){
  c.fillStyle='#263746';c.fillRect(-W*.34,-H*.34,W*.68,H*.68);
  c.strokeStyle='#e7edf2';c.lineWidth=Math.max(1,s*.045);
  c.beginPath();c.moveTo(-W*.3,-H*.3);c.lineTo(W*.3,H*.3);c.moveTo(W*.3,-H*.3);c.lineTo(-W*.3,H*.3);c.stroke();
  c.fillStyle='#d84d43';c.fillRect(-W*.29,-H*.28,W*.58,H*.12);c.fillRect(-W*.29,H*.16,W*.58,H*.12);
 }else if(k=='dock'){
  c.fillStyle='#263746';c.fillRect(-W*.3,-H*.29,W*.6,H*.58);
  c.fillStyle='#d8e0e7';c.fillRect(-W*.23,-H*.18,W*.46,H*.36);
  c.fillStyle='#304252';c.fillRect(-W*.15,-H*.11,W*.3,H*.22);
  c.strokeStyle='#f2f6f8';c.lineWidth=Math.max(1,s*.055);c.beginPath();c.arc(0,0,Math.min(W,H)*.11,0,Math.PI*2);c.stroke();
 }else if(k=='solar'){
  c.fillStyle='#263746';c.strokeStyle='#c4d0d9';c.lineWidth=Math.max(1,s*.05);
  // The left edge mounts to the rocket; the array unfolds outward to the right.
  c.fillRect(-W*.5,-H*.12,W*.38,H*.24);c.strokeRect(-W*.5,-H*.12,W*.38,H*.24);
  c.fillStyle='#d9e1e8';c.fillRect(-W*.16,-H*.3,W*.12,H*.6);
  c.fillStyle='#12365e';c.strokeStyle='#78b8e4';c.lineWidth=Math.max(1,s*.035);
  const x0=deployed?-W*.12:-W*.02,x1=deployed?W*2.25:W*.43,top=deployed?-W*.36:-H*.36,bottom=deployed?W*.36:H*.36;
  c.fillRect(x0,top,x1-x0,bottom-top);c.strokeRect(x0,top,x1-x0,bottom-top);
  const cols=deployed?10:2;
  for(let col=1;col<cols;col++){const xx=x0+(x1-x0)*col/cols;c.beginPath();c.moveTo(xx,top);c.lineTo(xx,bottom);c.stroke()}
  for(let row=1;row<4;row++){const yy=top+(bottom-top)*row/4;c.beginPath();c.moveTo(x0,yy);c.lineTo(x1,yy);c.stroke()}
  c.strokeStyle='#d3e0e9';c.lineWidth=Math.max(1,s*.06);
  for(const px of [-W*.5,x1]){c.fillStyle='#8b9aa6';c.fillRect(px-s*.09,-s*.14,s*.18,s*.28);c.strokeRect(px-s*.09,-s*.14,s*.18,s*.28);c.beginPath();c.arc(px,0,s*.08,0,Math.PI*2);c.fillStyle='#dce5eb';c.fill();c.stroke()}
  if(deployed){c.strokeStyle='#c4d0d9';c.lineWidth=Math.max(1,s*.055);c.beginPath();c.moveTo(-W*.12,0);c.lineTo(x1,0);c.stroke()}
 }
 // Fine seams, fasteners and hardware add scale without obscuring the silhouettes.
 c.save();c.lineWidth=s*.025;c.strokeStyle='rgba(27,39,50,.42)';c.fillStyle='rgba(255,255,255,.72)';
 const rivet=s*.028,dot=(px,py)=>{c.beginPath();c.arc(px,py,rivet,0,Math.PI*2);c.fill();c.stroke()};
 if(k=='tank'){
  c.beginPath();c.moveTo(-W*.39,-H*.28);c.lineTo(W*.39,-H*.28);c.moveTo(-W*.39,H*.28);c.lineTo(W*.39,H*.28);c.stroke();
  for(const px of [-W*.38,W*.38])for(const py of [-H*.28,0,H*.28])dot(px,py);
 }else if(k=='pod'){
  c.beginPath();c.moveTo(-W*.38,H*.34);c.lineTo(W*.38,H*.34);c.moveTo(-W*.34,-H*.25);c.lineTo(-W*.25,-H*.34);c.moveTo(W*.34,-H*.25);c.lineTo(W*.25,-H*.34);c.stroke();
  dot(-W*.36,H*.28);dot(W*.36,H*.28);
 }else if(k=='nose'){
  c.beginPath();c.moveTo(-W*.31,H*.31);c.quadraticCurveTo(0,H*.39,W*.31,H*.31);c.stroke();
  dot(-W*.3,H*.31);dot(W*.3,H*.31);
 }else if(k=='eng'||k=='vac'){
  c.strokeStyle='rgba(220,230,238,.52)';
  for(let j=0;j<3;j++){const yy=-H*.22+j*H*.07;c.beginPath();c.moveTo(-W*.29,yy);c.lineTo(W*.29,yy);c.stroke()}
  dot(-W*.24,-H*.36);dot(W*.24,-H*.36);
 }else if(k=='srb'){
  c.beginPath();c.moveTo(-W*.38,-H*.12);c.lineTo(W*.38,-H*.12);c.moveTo(-W*.38,H*.2);c.lineTo(W*.38,H*.2);c.stroke();
  for(const px of [-W*.34,W*.34])for(const py of [-H*.28,0,H*.28])dot(px,py);
 }else if(k=='dec'){
  for(let j=0;j<5;j++)dot(-W*.34+j*W*.17,-H*.28);
  c.strokeStyle='rgba(255,255,255,.45)';c.beginPath();c.moveTo(-W*.42,H*.3);c.lineTo(W*.42,H*.3);c.stroke();
 }else if(k=='fin'){
  c.beginPath();c.moveTo(-W*.32,-H*.29);c.lineTo(W*.25,H*.28);c.stroke();
  dot(-W*.34,-H*.34);dot(-W*.19,-H*.19);
 }else if(k=='leg'){
  c.strokeStyle='rgba(32,43,54,.6)';c.beginPath();c.moveTo(-W*.12,-H*.18);c.lineTo(W*.32,H*.25);c.stroke();
  dot(-W*.31,-H*.3);dot(W*.19,H*.46);
 }else if(k=='para'){
  c.strokeStyle='rgba(34,49,63,.7)';c.beginPath();c.moveTo(-W*.38,-H*.35);c.lineTo(W*.38,-H*.35);c.moveTo(-W*.38,H*.35);c.lineTo(W*.38,H*.35);c.stroke();
  for(const px of [-W*.34,W*.34])for(const py of [-H*.34,H*.34])dot(px,py);
 }
 c.restore();c.restore();c.restore()}
  return { COL, draw };
})();
