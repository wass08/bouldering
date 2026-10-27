import * as THREE from './vendor/three.module.js';
export const LIMBS=['lh','rh','lf','rf'];
export const defaultPosture=()=>({rise:0,depth:.5,twist:0,lean:0,sidebend:0,autoFit:true});
export const defaultContacts=()=>Object.fromEntries(LIMBS.map(k=>[k,{attached:true,kind:k.endsWith('h')?'jug':'toe',angle:0,normal:[0,0,1]}]));
const V=a=>new THREE.Vector3(...a),rad=THREE.MathUtils.degToRad,clamp=THREE.MathUtils.clamp;
export function contactQuaternion(c={}){if(c.orientation)return new THREE.Quaternion().fromArray(c.orientation);const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),V(c.normal||[0,0,1]).normalize());const type=c.kind||'jug',z=(type==='sidepull'?90:type==='undercling'?180:type==='inside-edge'?35:type==='outside-edge'?-35:0)+(c.angle||0);return q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(type==='palm'?-.18:0,type==='heel'?Math.PI:0,rad(z))));}
export function dimensions(body){const h=body.height/100,shoulders=(body.shoulders||38)/100,leg=body.inseam/100,arm=(body.span/100-shoulders)/2;return{h,s:h/1.72,shoulders,leg,arm,torso:(body.torso||Math.round(body.height*.29))/100,armRatio:(body.upperArm||51)/100,legRatio:(body.thigh||51)/100};}
// Conservative collision envelopes for wall panels and mounted shapes, in wall coordinates.
const clearanceBanks=new WeakMap();
export function wallClearance(holds,si){
 // Keep wall-local collision samples until the actual hold layout changes.
 let bank=clearanceBanks.get(holds);if(!bank){bank=new Map();clearanceBanks.set(holds,bank);}
 const shapes=holds.filter(h=>h.userData.si===si),signature=shapes.map(h=>[h.uuid,h.parent?.uuid,h.geometry.uuid,h.geometry.attributes.position.version,...h.position.toArray(),...h.quaternion.toArray(),...h.scale.toArray()].join(',')).join(';');
 const saved=bank.get(si);if(saved?.signature===signature)return saved.sample;
 const cache=new Map(),columns=new Map(),ray=new THREE.Raycaster(),dir=new THREE.Vector3(0,0,-1),boxes=new Map();
 for(const h of shapes){h.updateWorldMatrix(true,false);if(!h.geometry.boundingBox)h.geometry.computeBoundingBox();boxes.set(h,h.geometry.boundingBox.clone().applyMatrix4(h.matrix));}
 function surface(x,y){const key=x.toFixed(5)+':'+y.toFixed(5);if(columns.has(key))return columns.get(key);let z=.132;
 for(const h of shapes){const b=boxes.get(h);if(x<b.min.x||x>b.max.x||y<b.min.y||y>b.max.y)continue;const face=h.parent;face.updateWorldMatrix(true,false);ray.set(face.localToWorld(new THREE.Vector3(x,y,4)),dir.clone().transformDirection(face.matrixWorld));const hit=ray.intersectObject(h,false)[0];if(hit)z=Math.max(z,face.worldToLocal(hit.point.clone()).z);}
 if(columns.size>=16000)columns.clear();columns.set(key,z);return z;}
 const sample=(p,r=.04)=>{const key=[Math.round(p.x/.025),Math.round(p.y/.025),Math.round(r/.01)].join(':');if(cache.has(key))return cache.get(key);let z=.132+r;for(const [dx,dy]of [[0,0],[r,0],[-r,0],[0,r],[0,-r]])z=Math.max(z,surface(p.x+dx,p.y+dy)+r);if(cache.size>=12000)cache.clear();cache.set(key,z);return z;};
 bank.set(si,{signature,sample});return sample;
}
function frame(hips,d,p){return new THREE.Matrix4().compose(hips,new THREE.Quaternion().setFromEuler(new THREE.Euler(rad(clamp(p.lean,-30,30)),rad(clamp(p.twist,-65,65)),rad(clamp(p.sidebend,-25,25)))),new THREE.Vector3(1,1,1));}
function origin(key,m,d){return new THREE.Vector3((key[0]==='l'?-1:1)*(key[1]==='h'?d.shoulders/2:.105*d.s),key[1]==='h'?d.torso: -.045*d.s,0).applyMatrix4(m);}
// Capsule-to-ellipsoid distance in body space. Both arm segments must clear
// the head; the forearm must also clear the central torso.
function bodyObstacles(matrix,d){const inverse=matrix.clone().invert();
 const head=new THREE.Vector3(0,.594*d.torso/.465,-.012*d.s),headSize=new THREE.Vector3(.10*d.s,.14*d.torso/.465,.105*d.s);
 const chest=new THREE.Vector3(0,d.torso*.55,0),chestSize=new THREE.Vector3(d.shoulders*.34,d.torso*.39,.105*d.s);
 function penetration(a,b,c,size,r){const q=a.clone().applyMatrix4(inverse).sub(c),v=b.clone().applyMatrix4(inverse).sub(c);const ext=size.clone().addScalar(r);q.divide(ext);v.divide(ext);const delta=v.sub(q),t=clamp(-q.dot(delta)/Math.max(delta.lengthSq(),1e-9),0,1);return Math.max(0,1-q.addScaledVector(delta,t).length())*Math.min(ext.x,ext.y,ext.z);}
 return(a,mid,end,r)=>penetration(a,mid,head,headSize,r)+penetration(mid,end,head,headSize,r)+penetration(mid,end,chest,chestSize,r);
}
// Two-bone IK with explicit flexion limits and a preferred anatomical bend plane.
export function limitedJoint(a,target,l1,l2,bend,hand,clearance,radius,previous,selfClearance=null){const delta=target.clone().sub(a),dist=delta.length(),axis=dist>1e-6?delta.clone().divideScalar(dist):new THREE.Vector3(0,-1,0);const minFlex=rad(hand?4:3),maxFlex=rad(hand?145:135);const maxD=Math.sqrt(l1*l1+l2*l2+2*l1*l2*Math.cos(minFlex)),minD=Math.sqrt(l1*l1+l2*l2+2*l1*l2*Math.cos(maxFlex)),d=clamp(dist,minD,maxD),end=a.clone().addScaledVector(axis,d);let perp=bend.clone().addScaledVector(axis,-bend.dot(axis));if(perp.lengthSq()<1e-5)perp=new THREE.Vector3(1,0,0).addScaledVector(axis,-axis.x);perp.normalize();const along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along));let best=null;
 const candidates=[];
 for(const degrees of (hand?[0,-15,15,-30,30,-50,50,-75,75,-100,100,-130,130,180]:[0,-10,10,-20,20]))candidates.push({p:perp.clone().applyAxisAngle(axis,rad(degrees)),preference:Math.abs(degrees)*.0006});
 let prior=null;if(previous&&previous.end.distanceTo(target)<.25&&previous.start.distanceTo(a)<.25){prior=previous.mid.clone().sub(a).addScaledVector(axis,-previous.mid.clone().sub(a).dot(axis));if(prior.lengthSq()>1e-8){prior.normalize();for(const degrees of [0,-5,5,-10,10,-20,20])candidates.push({p:prior.clone().applyAxisAngle(axis,rad(degrees)),preference:.001,continuous:degrees===0});}else prior=null;}
 candidates.sort((a,b)=>Number(!!b.continuous)-Number(!!a.continuous));
 // Continuity must never accumulate knee swivel outside the pelvis-relative
 // forward bend cone. Otherwise a succession of tiny rotations can invert it.
 for(const {p,preference,continuous} of candidates){if(!hand&&p.dot(perp)<Math.cos(rad(20))-1e-7)continue;const mid=a.clone().addScaledVector(axis,along).addScaledVector(p,height);let collision=0;for(const [u,v] of [[a,mid],[mid,end]])for(const t of [.18,.38,.6,.82]){const sample=u.clone().lerp(v,t);collision+=Math.max(0,clearance(sample,radius)-sample.z);}const selfCollision=selfClearance?selfClearance(a,mid,end,radius):0;const score=collision*50+selfCollision*150+preference+(prior?(1-clamp(p.dot(prior),-1,1))*.12:0);if(!best||score<best.score)best={mid,end,score,collision,selfCollision};if(continuous&&collision<.0001&&selfCollision<.0001)break;}

 best.gap=end.distanceTo(target);best.flexion=THREE.MathUtils.radToDeg(Math.acos(clamp((d*d-l1*l1-l2*l2)/(2*l1*l2),-1,1)));return best;}
export function solveBody({body,targets,contacts,posture,hipOffset,clearance,previous=null,root=null,_collisionPass=0}){const d=dimensions(body),feet=V(targets.lf).add(V(targets.rf)).multiplyScalar(.5),base=feet.clone();base.y+=d.leg*.72;
 // Low handholds require a crouch: place shoulders near the grips rather than
 // forcing the feet up behind an upright pelvis. Manual pelvis edits remain relative.
 const handHeight=(targets.lh[1]+targets.rh[1])*.5;
 const crouch=Math.max(0,base.y-(handHeight-d.torso+.05));
 if(posture.autoFit&&!root)base.y-=Math.min(crouch,d.leg*.35);
 base.z=0;const hips=new THREE.Vector3(base.x+hipOffset/100,base.y+posture.rise,posture.depth);if(posture.autoFit&&!root)hips.z+=Math.min(crouch*.7,.22);if(root)hips.fromArray(root);const p={...defaultPosture(),...posture};
 function protectTorso(){const m=frame(hips,d,p);let push=0;for(const [y,r] of [[0,.145*d.s],[d.torso*.5,.17*d.s],[d.torso,.12*d.s],[d.torso+.17*d.s,.11*d.s]]){const v=new THREE.Vector3(0,y,0).applyMatrix4(m);push=Math.max(push,clearance(v,r)-v.z);}hips.z+=Math.max(0,push);hips.z=clamp(hips.z,.24,1.35);}
 if(p.autoFit&&!root)for(let i=0;i<28;i++){const before=hips.clone();const m=frame(hips,d,p);let delta=new THREE.Vector3(),weights=0;for(const key of LIMBS){if(contacts[key]?.attached===false)continue;const start=origin(key,m,d),target=V(targets[key]),v=target.clone().sub(start),max=(key.endsWith('h')?d.arm:d.leg)*.985,len=v.length();if(len>max){const w=key.endsWith('f')?2:1;delta.addScaledVector(v,(len-max)/Math.max(len,.001)*w);weights+=w;}}if(weights)hips.addScaledVector(delta, .72/weights);protectTorso();if(hips.distanceToSquared(before)<1e-10)break;}
 protectTorso();const m=frame(hips,d,p),selfClearance=bodyObstacles(m,d),joints={},warnings=[];for(const key of LIMBS){const hand=key.endsWith('h'),sign=key.startsWith('l')?-1:1,start=origin(key,m,d),target=V(targets[key]),length=hand?d.arm:d.leg,ratio=hand?d.armRatio:d.legRatio;// Local +Z points away from the wall. Knees flex forward (-Z), elbows backward (+Z).
 const bend=new THREE.Vector3(sign*(hand?.65:.12),hand?-.45:.15,hand?1:-1).transformDirection(m);const joint=limitedJoint(start,target,length*ratio,length*(1-ratio),bend,hand,clearance,(hand?.046:.067)*d.s,previous?.joints[key],hand?selfClearance:null);joint.start=start;joint.target=target;joints[key]=joint;
 // Broad shoulder/hip swing limits complement the hinge constraints.
 const local=joint.mid.clone().sub(start).applyQuaternion(new THREE.Quaternion().setFromRotationMatrix(m).invert()).normalize();const excursion=THREE.MathUtils.radToDeg(Math.acos(clamp(-local.y,-1,1)));if(excursion>(hand?175:130)){const max=rad(hand?175:130),horizontal=new THREE.Vector3(local.x,0,local.z).normalize();const limited=horizontal.multiplyScalar(Math.sin(max)).add(new THREE.Vector3(0,-Math.cos(max),0)).transformDirection(m),original=joint.mid.clone().sub(start).normalize(),q=new THREE.Quaternion().setFromUnitVectors(original,limited);joint.mid.sub(start).applyQuaternion(q).add(start);joint.end.sub(start).applyQuaternion(q).add(start);joint.gap=joint.end.distanceTo(target);warnings.push(key.toUpperCase()+' at '+(hand?'shoulder':'hip')+' swing limit');}joint.collision=0;for(const [u,v] of [[joint.start,joint.mid],[joint.mid,joint.end]])for(const t of [.18,.38,.6,.82]){const sample=u.clone().lerp(v,t);joint.collision+=Math.max(0,clearance(sample,(hand?.046:.067)*d.s)-sample.z);}joint.selfCollision=hand?selfClearance(joint.start,joint.mid,joint.end,.046*d.s):0;if(joint.selfCollision>.005)warnings.push(key.toUpperCase()+' needs body clearance');if(joint.gap>.015)warnings.push(key.toUpperCase()+' '+Math.round(joint.gap*100)+' cm from contact in this pose');if(joint.collision>.02)warnings.push(key.toUpperCase()+' needs more wall clearance');}
 if(!root&&Object.values(joints).some(j=>j.collision>.015)&&_collisionPass<12&&hips.z<1.30){const candidate=solveBody({body,targets,contacts,posture:{...p,rise:hips.y-base.y,depth:hips.z+.035,autoFit:p.autoFit},hipOffset:(hips.x-base.x)*100,clearance,previous,_collisionPass:12});const cost=js=>Object.values(js).reduce((n,j)=>n+j.gap*8+j.collision+(j.selfCollision||0)*3,0);if(cost(candidate.joints)<cost(joints))return candidate;}
 const com=hips.clone().lerp(new THREE.Vector3(0,d.torso*.55,0).applyMatrix4(m),.55);const planted=LIMBS.filter(k=>contacts[k]?.attached!==false);let balance='No supporting contacts';if(planted.length){const xs=planted.map(k=>targets[k][0]),margin=Math.min(com.x-Math.min(...xs),Math.max(...xs)-com.x);balance=margin<-.04?'Body centre is outside the contact span — check counterpressure':'Body centre is within the contact span';}return{hips,base,matrix:m,joints,warnings,dimensions:d,balance,com};}
const ease=t=>t*t*(3-2*t);
// Moving contacts are released one at a time. Stationary contacts remain fixed.
// Short arcs preserve usable reach; validated pelvis timing is replayed unchanged.
export function transitionPose(a,b,t,body=null){const ac={...defaultContacts(),...a.contacts},bc={...defaultContacts(),...b.contacts},moving=LIMBS.filter(k=>V(a.targets[k]).distanceTo(V(b.targets[k]))>.015||ac[k].attached!==bc[k].attached||ac[k].kind!==bc[k].kind||ac[k].angle!==bc[k].angle);const ordered=(b.order||LIMBS).filter(k=>moving.includes(k));for(const k of moving)if(!ordered.includes(k))ordered.push(k);const targets={},contacts={};let stage='Shift body';const span=.76/Math.max(1,ordered.length);for(const key of LIMBS){const index=ordered.indexOf(key);if(index<0){targets[key]=[...a.targets[key]];contacts[key]={...ac[key]};continue;}const start=.12+index*span,u=clamp((t-start)/span,0,1);targets[key]=a.targets[key].map((v,j)=>THREE.MathUtils.lerp(v,b.targets[key][j],ease(u)));if(u>0&&u<1){targets[key][2]+=(b.transition?.arc??(key.endsWith('h')?.07:.10))*Math.sin(Math.PI*u);contacts[key]={...(u<.5?ac[key]:bc[key]),attached:false,orientation:contactQuaternion(ac[key]).slerp(contactQuaternion(bc[key]),ease(u)).toArray()};stage=(u<.18?'Release ':u>.82?'Establish ':'Move ')+key.toUpperCase();}else contacts[key]={...(u===0?ac[key]:bc[key])};}const pa={...defaultPosture(),...a.posture},pb={...defaultPosture(),...b.posture},posture={autoFit:true};for(const k of ['rise','depth','twist','lean','sidebend'])posture[k]=THREE.MathUtils.lerp(pa[k],pb[k],ease(t));let hip=THREE.MathUtils.lerp(a.hip||0,b.hip||0,ease(t));
 if(body&&a.posture?.autoFit===false&&b.posture?.autoFit===false){
 const leg=body.inseam/100;
 // Shift the pelvis in wall space; moving a foot must not move its reference frame.
 const u=ease(clamp(t+(b.transition?.lead||0)*Math.sin(Math.PI*t),0,1));posture.autoFit=false;
 const rootOf=(p,q)=>[(p.targets.lf[0]+p.targets.rf[0])/2+(p.hip||0)/100,(p.targets.lf[1]+p.targets.rf[1])/2+leg*.72+q.rise,q.depth];
 const ra=rootOf(a,pa),rb=rootOf(b,pb),root=ra.map((v,i)=>THREE.MathUtils.lerp(v,rb[i],u));
 hip=(root[0]-(targets.lf[0]+targets.rf[0])/2)*100;
 posture.rise=root[1]-(targets.lf[1]+targets.rf[1])/2-leg*.72;posture.depth=root[2];
 }
 return{targets,contacts,posture,hip,stage};}
