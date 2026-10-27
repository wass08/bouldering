import * as THREE from './vendor/three.module.js';
import {solveBody,defaultPosture,wallClearance} from './movement-model.js?v=knee-tracking-1';
// Bounded beam search runs off the rendering thread. No network or model service.
const keys=['lh','rh','lf','rf'],dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
// Retained only within one suggestion job; cancellation destroys the worker.
let fitCache=new Map();
self.onmessage=({data:{holds,body,start,finish,variant=0,angle=0,blocked=[],blockedEdges=[],allowDynamic=false,dynamicChallenge=false,obstacles=[],reuseFit=false}})=>{
 try{
 if(!reuseFit)fitCache=new Map();
 const face=new THREE.Group(),meshes=obstacles.map(o=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(o.positions,3));if(o.index)g.setIndex(o.index);const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial());m.applyMatrix4(new THREE.Matrix4().fromArray(o.matrix));m.userData.si=0;face.add(m);return m;});face.updateMatrixWorld(true);const clearance=meshes.length?wallClearance(meshes,0):(p,r)=>.132+r;
 const arm=(body.span-body.shoulders)/200,leg=body.inseam/100,torso=body.torso/100,shoulder=body.shoulders/200,s=body.height/172;
 function reachFit(ids){const pts=ids.map((id,k)=>holds[id].points[keys[k]]),centres=pts.map((p,k)=>[p[0]-(k%2?1:-1)*(k<2?shoulder:.105*s),p[1]-(k<2?torso:-.045*s),p[2]]);let best=null;
 for(const depth of [.34,.46,.60]){let root=[(pts[2][0]+pts[3][0])/2,(pts[2][1]+pts[3][1])/2+leg*.78,depth];for(let it=0;it<24;it++){for(let k=0;k<4;k++){const c=centres[k],d=dist(root,c),max=(k<2?arm:leg)*.97;if(d>max)for(let j=0;j<3;j++)root[j]+=(c[j]-root[j])*(d-max)/d*.65;}root[1]=Math.max(root[1],Math.max(pts[2][1],pts[3][1])+leg*.22);root[2]=Math.max(.30,Math.min(.85,root[2]));}const gaps=centres.map((c,k)=>Math.max(0,dist(root,c)-(k<2?arm:leg)*.985));const gap=Math.max(...gaps);if(!best||gap<best.gap)best={root,gap};}return best;}
 // Search with the same limb geometry used by the avatar. The limits below
 // define a conservative easy-beta style, not universal human joint limits.
 function fit(ids){const key=ids.join(',');if(!fitCache.has(key))fitCache.set(key,fitPose(ids));return fitCache.get(key);}
 function fitPose(ids,twist=0,sidebend=0,refine=true){
 const rotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,THREE.MathUtils.degToRad(twist),THREE.MathUtils.degToRad(sidebend))),offsets=keys.map((k,i)=>new THREE.Vector3((i%2?1:-1)*(i<2?shoulder:.105*s),i<2?torso:-.045*s,0).applyQuaternion(rotation));
 const targets=Object.fromEntries(keys.map((k,i)=>[k,holds[ids[i]].points[k]])),contacts=Object.fromEntries(keys.map(k=>[k,{attached:true}]));
 const baseX=(targets.lf[0]+targets.rf[0])/2,baseY=(targets.lf[1]+targets.rf[1])/2+leg*.72;let best=null;
 const low=Math.max(targets.lf[1],targets.rf[1])+leg*.05+.003,high=Math.min(targets.lf[1],targets.rf[1])+leg;
 for(const shift of [-.30,-.225,-.15,-.075,0,.075,.15,.225,.30])for(const depth of [.34,.38,.42,.46,.50,.54,.58,.62,.66,.70,.74])for(let y=low;y<=high+.001;y+=.025){
 const x=baseX+shift;
 let reachable=true;for(let i=0;i<4;i++){const p=targets[keys[i]],o=offsets[i],dx=x+o.x-p[0],dy=y+o.y-p[1],dz=depth+o.z-p[2],limit=(i<2?arm:leg)+.025;if(dx*dx+dy*dy+dz*dz>limit*limit){reachable=false;break;}}if(!reachable)continue;
 const q=solveBody({body,targets,contacts,posture:{...defaultPosture(),twist,sidebend,autoFit:false,depth,rise:y-baseY},hipOffset:shift*100,clearance});
 const js=Object.values(q.joints),valid=js.every(j=>j.gap<=.03&&j.collision<=.06&&(j.selfCollision||0)<=.005)&&['lf','rf'].every(k=>targets[k][1]<=q.hips.y-leg*.05&&q.joints[k].flexion<=120&&q.joints[k].mid.y<=q.hips.y+leg*.22);
 if(!valid)continue;const cost=js.reduce((n,j)=>n+j.gap*8+j.collision+(j.selfCollision||0)*3,0)+['lf','rf'].reduce((n,k)=>n+Math.max(0,q.joints[k].flexion-85)**2*.00025,0);
 if(!best||cost<best.cost)best={root:q.hips.toArray(),gap:Math.max(...js.map(j=>j.gap)),cost,posture:{twist,sidebend}};
 // Costs are nonnegative: a zero-cost valid stance cannot be improved.
 if(best.cost===0)return best;
 }
 // Try a turned pelvis and shoulders when the square stance cannot fit.
 // Keep the chosen orientation so validation and replay use the same pose.
 const estimate=best?null:reachFit(ids);
 if(!best&&refine&&estimate.gap<.07){for(const [turn,bend]of [[-20,0],[20,0],[0,-12],[0,12],[-35,-10],[35,10],[-35,10],[35,-10]]){const candidate=fitPose(ids,turn,bend,false);if(candidate.gap<=.03&&(!best||candidate.cost<best.cost))best=candidate;}}
 return best||{...estimate,gap:1};
 }
 // Reach alone is not a movement preference. Prefer an open stance and use
 // height-scaled compression costs rather than rewarding feet for being higher.
 function comfort(ids,f){const pts=ids.map((id,k)=>holds[id].points[keys[k]]),root=f.root;
 const highFeet=pts.slice(2).reduce((n,p)=>n+Math.max(0,(p[1]-root[1]+leg*.4)/leg)**2,0);
 const lowHands=pts.slice(0,2).reduce((n,p)=>n+Math.max(0,(root[1]+torso*.45-p[1])/arm)**2,0);
 const crowd=Math.max(0,.35*leg-Math.min(...[2,3].flatMap(f=>[0,1].map(h=>dist(pts[f],pts[h])))))/leg;
 const cross=Math.max(0,pts[2][0]-pts[3][0])/leg;
 return highFeet*3+lowHands*2+crowd*3+cross*2;
 }
 function score(ids,depth,f,cost=0){const h=ids.map(i=>holds[i]),grip=h.slice(0,2).reduce((v,p)=>v+p.difficulty,0);return (h[0].y+h[1].y)*2-depth*.10-comfort(ids,f)-cost*.18-grip*(.12+Math.abs(angle)*.003)+(variant%2?(h[0].x-h[1].x)*.08:0);}

 function search(start){const initial={ids:start,fit:fit(start),path:[{ids:start,root:fit(start).root,posture:fit(start).posture}],cost:0,score:score(start,0,fit(start))};let beam=[initial],best=initial,visited=new Set([start.join(',')]),done=null,launches=[initial];
 for(let depth=0;depth<70&&beam.length;depth++){
 const next=[];for(const node of beam){const nodeCandidates=[];if(node.ids[0]===finish&&node.ids[1]===finish){done=node;break;}
 for(let k=0;k<4;k++){const from=holds[node.ids[k]],hand=k<2;const options=holds.map((h,i)=>({h,i})).filter(({h,i})=>i!==node.ids[k]&&(!hand||h.hand)&&h.y>=from.y-.60&&h.y<=from.y+(hand?arm*2.2:leg*1.5+.001)&&dist(h.points[keys[k]],from.points[keys[k]])< (hand?arm*2.5:leg*1.8)&& (hand||h.y<Math.max(holds[node.ids[0]].y,holds[node.ids[1]].y)-.15)).sort((a,b)=>b.h.y-a.h.y||((variant%2?1:-1)*(a.h.x-b.h.x))).slice(0,14);
 for(const {h,i}of options){const ids=[...node.ids];ids[k]=i;
 // Hand/foot matches require a deliberate technique, not the default easy beta.
 if([2,3].some(f=>ids[f]===ids[0]||ids[f]===ids[1]))continue;
 if(ids[0]===ids[1]&&(!holds[ids[0]].matchHands||holds[ids[0]].width<.09*s)||ids[2]===ids[3]&&holds[ids[2]].width<.3)continue;const pts=ids.map((id,j)=>holds[id].points[keys[j]]);
 if(Math.abs(pts[2][0]-pts[3][0])>leg*1.3||Math.abs(pts[2][1]-pts[3][1])>leg*1.1||pts[2][0]>pts[3][0]+.035*s)continue;
 if([2,3].some(f=>[0,1].some(h=>dist(pts[f],pts[h])<.14)))continue;
 const sig=ids.join(',');if(blocked.includes(sig)||blockedEdges.includes(node.ids.join(',')+'>'+sig)||visited.has(sig))continue;visited.add(sig);const f=fit(ids);if(f.gap>.07||pts.slice(2).some(p=>p[1]>f.root[1]-leg*.05))continue;const cost=node.cost+comfort(ids,f)+(hand?.08:.18)+Math.max(0,h.y-from.y)/(hand?arm:leg)*.12;const candidate={ids,fit:f,cost,path:[...node.path,{ids,root:f.root,posture:f.posture,moved:keys[k]}],score:score(ids,depth+1,f,cost)};nodeCandidates.push(candidate);}}
 // Keep a slight preference for hands, while retaining preparatory foot moves.
 const handAvailable=nodeCandidates.some(c=>c.path.at(-1).moved.endsWith('h')&&c.ids.slice(0,2).reduce((n,id)=>n+holds[id].y,0)>node.ids.slice(0,2).reduce((n,id)=>n+holds[id].y,0)+.08);
 for(const c of nodeCandidates){if(handAvailable&&c.path.at(-1).moved.endsWith('f')){c.cost+=.15;c.score-=.15;}next.push(c);launches.push(c);if(c.score>best.score&&c.fit.gap<=.045)best=c;}
 }if(done)break;beam=next.sort((a,b)=>b.score-a.score).slice(0,180);self.postMessage({progress:depth+1});}
 if(!done)done=beam.find(n=>n.ids[0]===finish&&n.ids[1]===finish);const result=done||best;return{path:result.path,complete:!!done,launches:launches.sort((a,b)=>(holds[b.ids[0]].y+holds[b.ids[1]].y)*2+b.fit.root[1]*1.5-((holds[a.ids[0]].y+holds[a.ids[1]].y)*2+a.fit.root[1]*1.5)).slice(0,6)};}
 let result=search(start);
 for(let jumpRound=0;allowDynamic&&!result.complete&&jumpRound<3;jumpRound++){
 self.postMessage({stage:"Checking a dynamic reach and catch…"});
 const jumps=[];for(const launch of result.launches){const before=launch.path.at(-1),level=Math.min(...before.ids.slice(0,2).map(i=>holds[i].y));
 // The authored dynamic challenge may search a larger flight envelope;
 // the same contact, collision and ballistic catch checks still apply.
 // A dynamic move may catch with one hand and match later, or catch with both.
 // Every landing still needs a fitted stance and full transition validation.
 for(let hi=0;hi<holds.length;hi++){const h=holds[hi];if(!h.hand||h.y<=level+.12||h.y>level+arm*(dynamicChallenge?2.1:1.6))continue;
 // A failed static search alone does not justify a jump: the new catch
 // must lie beyond the current shoulders' reach, not merely need a new arc.
 const beyondReach=[0,1].some(k=>dist(h.points[keys[k]],[before.root[0]+(k?1:-1)*shoulder,before.root[1]+torso,before.root[2]])>arm*1.03);
 if(!beyondReach)continue;
 const feet=holds.map((f,i)=>({f,i})).filter(({f,i})=>i!==hi&&f.y<h.y-torso*.8&&f.y>h.y-torso-leg*1.8).sort((a,b)=>Math.abs(a.f.x-h.x)-Math.abs(b.f.x-h.x)).slice(0,6);
 for(const handIds of [[hi,hi],[hi,before.ids[1]],[before.ids[0],hi]]){
 if(handIds[0]===handIds[1]&&(!h.matchHands||h.width<.09*s))continue;
 const movingHands=[0,1].filter(k=>handIds[k]!==before.ids[k]);
 if(!movingHands.length||!movingHands.some(k=>dist(holds[handIds[k]].points[keys[k]],[before.root[0]+(k?1:-1)*shoulder,before.root[1]+torso,before.root[2]])>arm*1.03))continue;
 for(const l of feet)for(const r of feet){if(l.i===r.i&&l.f.width<.3||l.f.x>r.f.x+.035*s||Math.abs(l.f.x-r.f.x)>leg*1.3||handIds.includes(l.i)||handIds.includes(r.i))continue;const ids=[...handIds,l.i,r.i];if(blocked.includes(ids.join(','))||blockedEdges.includes(before.ids.join(',')+'>'+ids.join(',')))continue;const f=fit(ids);if(f.gap>.03||f.root[1]-before.root[1]>(dynamicChallenge?1.05:.85)*s||f.root[1]<before.root[1]||dist(f.root,before.root)>(dynamicChallenge?1.15:.95)*s)continue;jumps.push({ids,root:f.root,posture:f.posture,moved:ids[1]!==before.ids[1]?'rh':'lh',motion:'dyno',prefix:launch.path,cost:dist(f.root,before.root)});}
 }
 }
 }
 jumps.sort((a,b)=>Number(b.ids[0]===finish)-Number(a.ids[0]===finish)||holds[b.ids[0]].y-holds[a.ids[0]].y||a.cost-b.cost);
 const diverseJumps=jumps.filter((j,i,all)=>all.findIndex(a=>a.ids.join(',')===j.ids.join(','))===i);
 let improved=null;for(const jump of diverseJumps.slice(0,12)){const tail=search(jump.ids),candidate={path:[...jump.prefix,{ids:jump.ids,root:jump.root,posture:jump.posture,moved:jump.moved,motion:jump.motion},...tail.path.slice(1)],complete:tail.complete};if(candidate.complete){improved=candidate;break;}if(candidate.path.at(-1).root[1]>(improved||result).path.at(-1).root[1]+.1)improved=candidate;}
 if(!improved)break;result=improved;result.launches=result.path.slice(-6).map((p,i)=>({ids:p.ids,fit:fit(p.ids),path:result.path.slice(0,result.path.length-Math.min(6,result.path.length)+i+1)}));
 }
 self.postMessage({result:{path:result.path,complete:result.complete,reason:result.complete?'Both hands reach the finish.':'No further controlled move found.'}});
 }catch(error){self.postMessage({error:String(error.message||error)});}
};
