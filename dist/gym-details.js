import * as THREE from 'three';
const material=(color,roughness=.8)=>new THREE.MeshStandardMaterial({color,roughness});
function mesh(geometry,mat,parent,pos=[0,0,0]){const m=new THREE.Mesh(geometry,mat);m.position.set(...pos);m.castShadow=m.receiveShadow=true;parent.add(m);return m}
function rounded(w,h,d,r,mat,parent,pos){const s=new THREE.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);const g=new THREE.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelSize:r,bevelThickness:r,bevelSegments:3,steps:1,curveSegments:5});g.translate(0,0,-(d-2*r)/2);return mesh(g,mat,parent,pos)}
function tube(points,r,mat,parent){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),20,r,6,false),mat,parent)}
export function addGymDetails(scene){
 // A continuous architectural floor supports the lounge independently of editable mats.
 const stone=material('#c4c4b7'),plaster=material('#dddcd0'),frame=material('#536a60');
 const block=(w,h,d,mat,x,y,z)=>mesh(new THREE.BoxGeometry(w,h,d),mat,scene,[x,y,z]);
 block(26,.74,22,stone,.8,-.17,-1);
 const joints=[];
 for(let x=-12.2;x<=13.8;x+=2)joints.push(new THREE.Vector3(x,.202,-12),new THREE.Vector3(x,.202,10));
 for(let z=-12;z<=10;z+=2)joints.push(new THREE.Vector3(-12.2,.202,z),new THREE.Vector3(13.8,.202,z));
 scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(joints),new THREE.LineBasicMaterial({color:'#9da79c',transparent:true,opacity:.24})));
 // Clerestory windows leave the climbing faces unobstructed.
 block(25,7,.22,plaster,.8,3.7,-6.7);
 const glass=new THREE.MeshStandardMaterial({color:'#c7ddd9',roughness:.35,emissive:'#c1d3ca',emissiveIntensity:.18});
 for(let x=-10.5;x<12;x+=2.7){
  block(2.45,1.55,.04,glass,x,5.8,-6.56);
  block(.045,1.65,.07,frame,x,5.8,-6.50);
  for(const y of [5,6.6])block(2.55,.055,.1,frame,x,y,-6.50);
 }
 for(const x of [-11.6,12.6]){
  block(.24,7,.28,frame,x,3.7,-6.35);
  block(.24,7,.28,frame,x,3.7,3.8);
  block(.28,.24,10.5,frame,x,7.08,-1.2);
 }
 block(24.4,.18,.2,frame,.5,7.08,-1.7);
 const light=new THREE.MeshStandardMaterial({color:'#fff4d9',emissive:'#fff0ca',emissiveIntensity:1.2});
 for(const x of [-7.2,.8,8.8]){
  for(const dx of [-1.2,1.2])block(.012,.28,.012,frame,x+dx,6.95,-1.7);
  block(3.2,.065,.15,frame,x,6.8,-1.7);
  block(3.05,.018,.1,light,x,6.76,-1.7);
 }
 const oak=material('#bd9065',.62),steel=material('#334840',.5),screw=material('#626b63',.33);
 const grain=document.createElement('canvas');grain.width=512;grain.height=128;const ctx=grain.getContext('2d');ctx.fillStyle='#c5a27c';ctx.fillRect(0,0,512,128);for(let i=0;i<100;i++){const y=i*1.4;ctx.strokeStyle=`rgba(86,52,24,${.05+(i%6)*.012})`;ctx.lineWidth=.3+(i%3)*.3;ctx.beginPath();for(let x=0;x<=512;x+=8){const v=y+Math.sin(x*.014+i*2)*1.1; x?ctx.lineTo(x,v):ctx.moveTo(x,v)}ctx.stroke()}const tex=new THREE.CanvasTexture(grain);tex.colorSpace=THREE.SRGBColorSpace;oak.map=tex;
 function bench(x,z,length){const g=new THREE.Group();g.position.set(x,.205,z);scene.add(g);
  for(let i=0;i<4;i++){rounded(length,.075,.105,.014,oak,g,[0,.48,(i-1.5)*.127]);for(const side of [-1,1]){const m=mesh(new THREE.CylinderGeometry(.009,.009,.003,12),screw,g,[side*(length/2-.19),.522,(i-1.5)*.127]);}}
  for(const side of [-1,1]){for(const depth of [-.19,.19])rounded(.052,.42,.055,.009,steel,g,[side*(length/2-.19),.22,depth]);rounded(.055,.052,.44,.009,steel,g,[side*(length/2-.19),.43,0]);rounded(.062,.018,.071,.006,material('#273932'),g,[side*(length/2-.19),.012,-.19]);rounded(.062,.018,.071,.006,steel,g,[side*(length/2-.19),.012,.19]);}
  rounded(length-.35,.045,.045,.008,steel,g,[0,.15,0]);return g;
 }
 // Timber border marks the rest area beyond the padded climbing zone.
 block(19,.025,.055,oak,.8,.216,3.05);
 const benchA=bench(-5.5,4.1,2.3),benchB=bench(6.3,4.1,1.8);
 const fabric=material('#c6bba1');for(let i=0;i<3;i++)rounded(.43,.028,.32,.012,fabric,benchA,[.52,.54+i*.027,0]);for(let i=0;i<7;i++)tube([[.7,.612,-.11+i*.035],[.74,.611,-.11+i*.035],[.77,.59,-.11+i*.035]],.0025,fabric,benchA);
 const bottle=material('#768f86',.45);mesh(new THREE.CylinderGeometry(.065,.066,.26,24),bottle,benchB,[-.3,.67,0]);mesh(new THREE.CylinderGeometry(.042,.06,.045,24),bottle,benchB,[-.3,.817,0]);mesh(new THREE.CylinderGeometry(.043,.043,.04,24),steel,benchB,[-.3,.851,0]);
 const soil=material('#433c2b'),stemMat=material('#61764c'),leafMats=['#476b45','#5b7c50','#72905a'].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.63,side:THREE.DoubleSide}));
 function plant(x,z,seed){const g=new THREE.Group();g.position.set(x,.205,z);scene.add(g);const clay=material(seed?'#c49273':'#d4bba0',.93);const profile=[[.21,0],[.23,.025],[.25,.08],[.30,.51],[.305,.55],[.294,.568],[.278,.55],[.275,.51]].map(p=>new THREE.Vector2(...p));mesh(new THREE.LatheGeometry(profile,48),clay,g);mesh(new THREE.CylinderGeometry(.275,.275,.025,40),soil,g,[0,.506,0]);for(let i=0;i<14;i++){const a=i*2.399+seed,top=.96+(i%5)*.155,spread=.32+(i%3)*.11;const base=[Math.sin(a)*.07,.5,Math.cos(a)*.07],end=[Math.sin(a)*spread,top,Math.cos(a)*spread];tube([base,[Math.sin(a)*spread*.32,top*.82,Math.cos(a)*spread*.32],end],.009,stemMat,g);
   const verts=[],uv=[],indices=[],L=.44+(i%3)*.1,W=.13+(i%4)*.025;
   for(let row=0;row<=16;row++){const t=row/16;for(let col=0;col<=8;col++){const s=col/4-1,w=Math.pow(Math.sin(Math.PI*t),.8)*W;verts.push(s*w,L*t,.07*Math.sin(t*Math.PI)-.18*t*t+.065*s*s*Math.sin(t*Math.PI));uv.push(col/8,t);if(row<16&&col<8){let k=row*9+col;indices.push(k,k+1,k+9,k+1,k+10,k+9)}}}
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();const leaf=new THREE.Group();leaf.position.set(...end);leaf.rotation.set(.65+(i%4)*.15,a,Math.sin(a)*.23);g.add(leaf);mesh(geo,leafMats[i%3],leaf);tube([[0,0,0],[0,L*.45,.055],[0,L,-.18]],.003,stemMat,leaf);for(let j=1;j<5;j++)for(const side of [-1,1]){const t=j/6;tube([[0,L*t,.07*Math.sin(t*Math.PI)-.18*t*t],[side*W*.62,L*(t+.08),.07*Math.sin(t*Math.PI)-.18*t*t+.024]],.0011,stemMat,leaf)}
  }
 }
 plant(-7.2,3.9,0);plant(7.8,3.9,1);
 // Compact open cubbies give the rest area a practical, lived-in edge.
 const storage=new THREE.Group();storage.position.set(10.6,.205,3.7);scene.add(storage);
 for(const y of [.05,.48,.91])rounded(1.7,.06,.4,.012,oak,storage,[0,y,0]);
 for(const x of [-.82,0,.82])rounded(.045,.9,.4,.01,oak,storage,[x,.48,0]);
 for(const x of [-.4,.4]){rounded(.55,.24,.31,.025,fabric,storage,[x,.2,.025]);rounded(.24,.025,.025,.008,steel,storage,[x,.24,.19]);}
 const bucket=new THREE.Group();bucket.position.set(-3.95,.205,4.1);scene.add(bucket);const canvas=material('#ab8c69');mesh(new THREE.CylinderGeometry(.155,.13,.25,32),canvas,bucket,[0,.135,0]);const rim=mesh(new THREE.TorusGeometry(.148,.014,8,36),steel,bucket,[0,.26,0]);rim.rotation.x=Math.PI/2;mesh(new THREE.CylinderGeometry(.135,.135,.007,32),material('#efeee0'),bucket,[0,.248,0]);tube([[-.14,.22,0],[-.2,.4,0],[.19,.4,0],[.14,.22,0]],.012,steel,bucket);
}
