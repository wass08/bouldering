import * as THREE from 'three';
import {dimensions,LIMBS,transitionPose} from './movement-model.js?v=knee-tracking-1';
const V=a=>new THREE.Vector3(...a),clamp=THREE.MathUtils.clamp;
// Reduced-body dynamics: fixed-step gravity, launch impulse, spring catch and floor impact.
// Limb poses are driven by IK. This is an assisted animation model, not a human strength model.
export function buildDynamicClip(a,b,{body,start,end,gravity,clearance,floor}){
 const kind=b.motion||'dyno',power=b.power||1,d=dimensions(body),dt=1/120,duration=kind==='cut-loose'?3:2.8,launch=.35,flight=kind==='deadpoint'?.42:.7,catchAt=launch+flight;
 const root=start.hips.clone(),goal=end.hips.clone(),origin=root.clone(),g=V(gravity),velocity=goal.clone().sub(origin).addScaledVector(g,-.5*flight*flight).divideScalar(flight).multiplyScalar(power),launchVelocity=velocity.clone();
 let caught=kind==='cut-loose',missed=false,grounded=false;const hand=LIMBS.filter(k=>k.endsWith('h')).sort((x,y)=>V(b.targets[y]).y-V(b.targets[x]).y)[0],anchor=V((kind==='cut-loose'?a:b).targets[hand]),rope=clamp(anchor.distanceTo(root),d.torso*.5,d.torso+d.arm*.95),samples=[];
 if(kind==='cut-loose')velocity.set(.55*power,0,.8*power);
 for(let time=0;time<=duration+dt/2;time+=dt){let stage='',f=transitionPose(a,b,clamp(time/duration,0,1));f.sector=a.sector;f.contacts=structuredClone(f.contacts);f.targets=structuredClone(f.targets);
 const jointOrigin=(key)=>new THREE.Vector3((key[0]==='l'?-1:1)*(key.endsWith('h')?d.shoulders/2:.105*d.s),key.endsWith('h')?d.torso:-.045*d.s,0).applyEuler(new THREE.Euler(THREE.MathUtils.degToRad(f.posture.lean||0),THREE.MathUtils.degToRad(f.posture.twist||0),THREE.MathUtils.degToRad(f.posture.sidebend||0))).add(root);
 if(kind!=='cut-loose'&&time<launch){const u=time/launch;root.copy(origin);root.y-=.10*Math.sin(Math.PI*u);stage='Load the legs';f.targets=structuredClone(a.targets);f.contacts=structuredClone(a.contacts);}
 else{
 if(!grounded){velocity.addScaledVector(g,dt);if(caught){velocity.addScaledVector(g,-dt);const stiffness=time>catchAt+.35?42:18;velocity.addScaledVector(goal.clone().sub(root),stiffness*dt);velocity.multiplyScalar(Math.exp(-7*dt));}root.addScaledVector(velocity,dt);
 const wall=clearance(root,.16);if(root.z<wall){root.z=wall;velocity.z=Math.abs(velocity.z)*.15;}
 // Resolve the world floor in panel coordinates. Floor impact ends the attempt.
 const floorY=floor?floor(root):d.leg*.48;if(root.y<floorY){root.y=floorY;velocity.set(0,0,0);grounded=true;missed=true;}}
 if(!caught&&!missed&&time>=catchAt){const shoulder=jointOrigin(hand);caught=kind!=='miss'&&shoulder.distanceTo(anchor)<=d.arm*1.06&&velocity.length()<7;if(!caught)missed=true;}
 if(caught&&time<catchAt+.35){const delta=root.clone().sub(anchor),length=delta.length();if(length>rope){delta.divideScalar(length);root.copy(anchor).addScaledVector(delta,rope);const outward=velocity.dot(delta);if(outward>0)velocity.addScaledVector(delta,-outward);}}
 const blend=clamp((time-launch)/flight,0,1),reference=origin.clone().lerp(goal,blend),offset=root.clone().sub(reference);for(const k of LIMBS){f.contacts[k].attached=false;const p=V(a.targets[k]).lerp(V(b.targets[k]),blend).add(offset);if(k.endsWith('f')){p.z+=.12*Math.sin(Math.PI*blend);p.y+=.08*Math.sin(Math.PI*blend);}f.targets[k]=p.toArray();}
 if(caught){for(const k of ['lh','rh']){const shoulder=jointOrigin(k);if(shoulder.distanceTo(V(b.targets[k]))<d.arm*1.05){f.targets[k]=[...b.targets[k]];f.contacts[k]={...b.contacts[k]};}}if(time>duration-.45){for(const k of ['lf','rf']){const hip=jointOrigin(k);if(hip.distanceTo(V(b.targets[k]))<d.leg){const u=clamp((time-(duration-.45))/.45,0,1);f.targets[k]=V(f.targets[k]).lerp(V(b.targets[k]),u).toArray();if(u>.98)f.contacts[k]={...b.contacts[k]};}}}}
 stage=grounded?'Landed · attempt stopped':missed?'Missed catch · falling':caught?(time<catchAt+.35?'Catch · absorb momentum':'Recover the feet'):kind==='deadpoint'?'Deadpoint · reach at the apex':'Flight · feet released';}
 f.root=root.toArray();f.posture={...f.posture,autoFit:false};f.stage=stage;samples.push(f);
 }
 const success=caught&&!missed&&root.distanceTo(goal)<.04&&LIMBS.every(k=>samples.at(-1).contacts[k]?.attached);return{samples,duration,success,launchSpeed:launchVelocity.length(),reason:success?'Catch established':'Catch not established — try another beta'};
}
export function sampleDynamic(clip,t){const n=clamp(t,0,1)*(clip.samples.length-1),i=Math.floor(n),a=clip.samples[i],b=clip.samples[Math.min(i+1,clip.samples.length-1)],u=n-i;return{...a,root:a.root.map((v,j)=>THREE.MathUtils.lerp(v,b.root[j],u)),targets:Object.fromEntries(LIMBS.map(k=>[k,a.targets[k].map((v,j)=>THREE.MathUtils.lerp(v,b.targets[k][j],u))]))};}
