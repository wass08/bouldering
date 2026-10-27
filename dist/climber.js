import * as THREE from 'three';
import {contactQuaternion} from './movement-model.js?v=knee-tracking-1';
const Y=new THREE.Vector3(0,1,0);
const mat=(color,roughness=.83)=>new THREE.MeshStandardMaterial({color,roughness});
// A reusable articulated figure: poses update transforms, rather than rebuilding meshes.
export function createClimber(parent){
 const skin=mat('#cfa27e'),shirt=mat('#e9dec4'),pants=mat('#496057'),rubber=mat('#263630',.7),ochre=mat('#c5a34f'),hair=mat('#493b31'),chalk=mat('#eeeadd'),seam=mat('#34483f');
 function ellipsoid(p,m,scale,pos=[0,0,0]){const o=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),m);o.scale.set(...scale);o.position.set(...pos);o.castShadow=o.receiveShadow=true;p.add(o);return o}
 function group(p){const g=new THREE.Group();p.add(g);return g}
 function segment(p,m,r1,r2){const profile=[[r1*.86,-.5],[r1*.97,-.43],[r1,-.28],[r1*.94,-.1],[(r1+r2)*.52,.12],[r2*1.08,.33],[r2,.46],[r2*.85,.5]].map(([r,y])=>new THREE.Vector2(r,y));const o=new THREE.Mesh(new THREE.LatheGeometry(profile,24),m);p.add(o);o.castShadow=o.receiveShadow=true;return o}
 function placeBone(m,a,b,scale=1){const d=b.clone().sub(a);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(Y,d.clone().normalize());m.scale.set(scale,d.length(),scale)}
 function tailored(p,m,rings){const pts=[],idx=[];for(let j=0;j<rings.length;j++){const [y,w,d]=rings[j];for(let i=0;i<=32;i++){const a=i/32*Math.PI*2;pts.push(Math.cos(a)*w,y,Math.sin(a)*d);if(j<rings.length-1&&i<32){const k=j*33+i;idx.push(k,k+33,k+1,k+1,k+33,k+34)}}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));g.setIndex(idx);g.computeVertexNormals();const o=new THREE.Mesh(g,m);o.castShadow=o.receiveShadow=true;p.add(o);return o}
 const trunk=group(parent);tailored(trunk,shirt,[[0,.127,.087],[.04,.132,.091],[.13,.128,.088],[.23,.145,.104],[.34,.169,.111],[.40,.176,.103],[.445,.154,.084],[.465,.10,.062],[.48,.051,.047]]);tailored(trunk,pants,[[-.12,.104,.08],[-.075,.155,.103],[.005,.146,.097],[.025,.137,.092]]);tailored(trunk,seam,[[.013,.14,.094],[.034,.14,.094]]);
 const neck=segment(trunk,skin,.046,.043);neck.position.set(0,.49,0);neck.scale.y=.055;
 const head=group(trunk);head.position.set(0,.594,-.012);ellipsoid(head,skin,[.083,.112,.086]);ellipsoid(head,skin,[.066,.057,.066],[0,-.055,-.013]);ellipsoid(head,skin,[.023,.028,.029],[0,-.012,-.081]);for(const s of [-1,1]){ellipsoid(head,skin,[.018,.029,.014],[s*.082,-.002,0]);ellipsoid(head,hair,[.019,.0035,.003],[s*.035,.019,-.083]);ellipsoid(head,rubber,[.005,.004,.004],[s*.035,.009,-.084]);}
 // Sculpted cropped hair, with overlapping locks and a slightly uneven hairline.
 ellipsoid(head,hair,[.084,.064,.083],[0,.056,.006]);for(let i=0;i<4;i++){const lock=ellipsoid(head,hair,[.028,.016,.050],[(i-1.5)*.029,.102-i*.003,-.004]);lock.rotation.z=-.22;}
 const collar=new THREE.Mesh(new THREE.TorusGeometry(.052,.008,8,32),seam);collar.rotation.x=Math.PI/2;collar.position.y=.476;trunk.add(collar);
 // Chalk bag hangs from a waist belt, visible from the gym side of the wall.
 const bag=group(trunk);bag.position.set(.055,-.07,.133);bag.rotation.z=-.12;ellipsoid(bag,ochre,[.062,.081,.043]);const lip=new THREE.Mesh(new THREE.TorusGeometry(.044,.009,8,24),rubber);lip.rotation.x=Math.PI/2;lip.position.y=.066;bag.add(lip);ellipsoid(bag,chalk,[.039,.005,.03],[0,.065,0]);
 const limbs={};for(const key of ['lh','rh','lf','rf']){const hand=key.endsWith('h'),g=group(parent),upper=segment(g,hand?skin:pants,hand?.050:.078,hand?.039:.057),lower=segment(g,hand?skin:pants,hand?.041:.061,hand?.026:.036),joint=ellipsoid(g,hand?skin:pants,hand?[.039,.041,.039]:[.056,.058,.056]);const root=ellipsoid(g,hand?shirt:pants,hand?[.057,.060,.056]:[.078,.072,.074]);const sleeve=hand?segment(g,shirt,.060,.054):null;
  const end=group(g);if(hand){ellipsoid(end,skin,[.037,.052,.022],[0,.023,0]);for(let i=0;i<4;i++){const f=group(end);f.position.set((i-1.5)*.018,.06,-.005);ellipsoid(f,skin,[.009,.024,.01],[0,.007,0]);ellipsoid(f,skin,[.009,.014,.012],[0,.025,-.01]);ellipsoid(f,chalk,[.008,.009,.007],[0,.026,-.019]);}ellipsoid(end,skin,[.014,.027,.016],[key==='lh'?.039:-.039,.028,-.014]);}
  else{ellipsoid(end,rubber,[.051,.047,.111],[0,-.015,-.046]);ellipsoid(end,ochre,[.047,.039,.092],[0,.004,-.046]);ellipsoid(end,rubber,[.046,.025,.065],[0,-.006,-.098]);ellipsoid(end,rubber,[.046,.031,.031],[0,-.005,.035]);for(let i=0;i<2;i++){const strap=ellipsoid(end,shirt,[.05,.006,.014],[0,.032,-.02-i*.038]);strap.rotation.z=.15;}ellipsoid(end,shirt,[.034,.032,.036],[0,.033,.019]);}

  limbs[key]={upper,lower,joint,root,sleeve,end};
 }
 let pelvisPosition=new THREE.Vector3();
 return{contactPositions(){return{...Object.fromEntries(Object.entries(limbs).map(([key,l])=>[key,l.end.position.clone()])),pelvis:pelvisPosition.clone()};},update({solution,contacts}){const {hips,matrix,joints,dimensions:d}=solution,s=d.s;pelvisPosition.copy(hips);trunk.position.copy(hips);trunk.quaternion.setFromRotationMatrix(matrix);trunk.scale.set(d.shoulders/.38,d.torso/.465,s);head.scale.x=s/(d.shoulders/.38);head.rotation.y=-THREE.MathUtils.clamp(new THREE.Euler().setFromRotationMatrix(matrix).y*.35,-.25,.25);
 for(const [key,l] of Object.entries(limbs)){const hand=key.endsWith('h'),r=joints[key],start=r.start;placeBone(l.upper,start,r.mid,s);placeBone(l.lower,r.mid,r.end,s);l.root.position.copy(start);l.joint.position.copy(r.mid);l.end.position.copy(r.end);l.end.scale.setScalar(s);l.end.quaternion.copy(contactQuaternion(contacts[key]));if(hand){const curl=contacts[key]?.kind==='crimp'?-.7:contacts[key]?.kind==='palm'?.45:-.15;for(const child of l.end.children)if(child.isGroup)child.rotation.x=curl;}if(l.sleeve)placeBone(l.sleeve,start,start.clone().lerp(r.mid,.39),s);for(const obj of [l.upper,l.lower,l.joint]){obj.material=hand?skin:pants;}}
 return solution.warnings;}};
}
