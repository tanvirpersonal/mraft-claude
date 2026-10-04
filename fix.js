// Final interaction corrections layered over the core simulator.
const _oldSnap=snapPosition;
snapPosition=function(o,x,y){let best=null,bd=24/state.zoom;for(const q of state.parts){if(q.id===o.id)continue;for(const side of ['top','bottom']){const n=node(q,side),d=Math.hypot(n.x-x,n.y-y);if(d<bd){const h=parts[o.type].h;best={x:n.x,y:n.y+(side==='top'?h/2:-h/2),q};bd=d}}}return best||{x,y,q:null}};
$('launchBtn').onclick=()=>startFlight(0);
window.addEventListener('load',()=>{resize();recalc()});
