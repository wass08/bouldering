import * as THREE from 'three';
export const VOLUMES=[
 {id:'volume-pyramid',name:'Summit',family:'Volumes',size:'XL',w:.67,h:.69,d:.43,shape:'triangle',dual:false,bolt:[0,0],description:'A three-sided pyramid with a broad triangular footprint and crisp textured planes.'},
 {id:'volume-wedge',name:'Traverse',family:'Volumes',size:'XL',w:.80,h:.39,d:.34,shape:'wedge',dual:true,bolt:[0,0],description:'A long wedge with a sloping grip face and a contrasting smooth side.'},
 {id:'volume-diamond',name:'Prism',family:'Volumes',size:'XL',w:.48,h:.78,d:.40,shape:'diamond',dual:false,bolt:[0,0],description:'An asymmetric diamond with four sloping planes for compression and footwork.'},
 {id:'volume-fin',name:'Keel',family:'Volumes',size:'XL',w:.34,h:.86,d:.46,shape:'fin',dual:true,bolt:[0,0],description:'A tall angular fin with an offset ridge, textured grip face and smooth side.'},
 {id:'volume-pentagon',name:'Pentagon',family:'Volumes',size:'XL',w:.64,h:.58,d:.27,shape:'pentagon',dual:false,bolt:[0,0],description:'A low pentagonal volume with an offset peak and five distinct sloping faces, inspired by the Blocz Pentagon.',reference:'https://www.blocz.de/en/category/produktklassen/volumen/fuenfeck/'},
 {id:'volume-beam',name:'Beam',family:'Volumes',size:'XL',w:.88,h:.30,d:.22,shape:'beam',dual:false,bolt:[0,0],description:'An elongated rectangular volume with a broad flat top, four bevelled sides and inset end faces. Inspired by the long grey volumes in the route reference.',reference:'https://www.setascent.com/set/2809046b-db56-43dc-af97-2ed666c6f5a7',referenceLabel:'Route reference ↗'}
];
export function createVolume(d,color,size,grain){
 let outline,top;
 if(d.shape==='beam'){outline=[[-1,-1],[1,-1],[1,1],[-1,1]];top=[[-.81,-.58,1],[.81,-.58,1],[.81,.58,1],[-.81,.58,1]];}
 else if(d.shape==='triangle'){outline=[[-1,-.72],[1,-.72],[.18,1]];top=[[.05,.02,1]];}
 else if(d.shape==='diamond'){outline=[[0,-1],[1,0],[0,1],[-1,0]];top=[[.23,.12,1]];}
 else if(d.shape==='pentagon'){outline=Array.from({length:5},(_,i)=>{let a=i*Math.PI*2/5+Math.PI/2;return[Math.cos(a),Math.sin(a)]});top=[[.16,.32,1]];}
 else {outline=[[-1,-1],[1,-1],[1,1],[-1,1]];top=d.shape==='fin'?[[-.25,-.72,1],[-.25,.7,.85]]:[[-.85,.55,1],[.85,.55,1]];}
 const v=outline.map(([x,y])=>new THREE.Vector3(x*d.w,y*d.h,.008));const t=top.map(([x,y,z])=>new THREE.Vector3(x*d.w,y*d.h,z*d.d));const triangles=[];
 const tri=(a,b,c,side=0)=>triangles.push({p:[a,b,c],side});
 if(t.length===1)for(let i=0;i<v.length;i++)tri(v[i],v[(i+1)%v.length],t[0],i);
 else if(t.length===v.length){for(let i=0;i<v.length;i++){let j=(i+1)%v.length;tri(v[i],v[j],t[j],i);tri(v[i],t[j],t[i],i);}for(let i=1;i<t.length-1;i++)tri(t[0],t[i],t[i+1],5);}
 else if(d.shape==='fin'){tri(v[0],v[1],t[0],0);tri(v[1],v[2],t[1],1);tri(v[1],t[1],t[0],1);tri(v[2],v[3],t[1],2);tri(v[3],v[0],t[0],3);tri(v[3],t[0],t[1],3);}
 else{tri(v[0],v[1],t[1],0);tri(v[0],t[1],t[0],0);tri(v[1],v[2],t[1],1);tri(v[2],v[3],t[0],2);tri(v[2],t[0],t[1],2);tri(v[3],v[0],t[0],3);}
 const positions=[],uv=[];const g=new THREE.BufferGeometry();for(const f of triangles){const start=positions.length/3;for(const p of f.p){positions.push(...p.toArray());uv.push(p.x*2,p.y*2);}g.addGroup(start,3,d.dual&&f.side===1?1:0);}g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();
 const materials=[new THREE.MeshPhysicalMaterial({color,roughness:.92,bumpMap:grain,bumpScale:.0025}),new THREE.MeshPhysicalMaterial({color,roughness:.26,clearcoat:.4})];const root=new THREE.Mesh(g,materials);root.scale.setScalar(size);root.castShadow=root.receiveShadow=true;
 // Small mounting screws along each edge sit on the actual sloped panel.
 const ray=new THREE.Raycaster(),screwMat=new THREE.MeshStandardMaterial({color:'#323c37',metalness:.45,roughness:.5});root.updateMatrixWorld(true);
 for(let i=0;i<v.length;i++)for(const f of [.22,.77]){const p=v[i].clone().lerp(v[(i+1)%v.length],f).multiplyScalar(.91);ray.set(new THREE.Vector3(p.x*size,p.y*size,3),new THREE.Vector3(0,0,-1));const hit=ray.intersectObject(root,false)[0];if(!hit)continue;const screw=new THREE.Mesh(new THREE.CircleGeometry(.009,8),screwMat);screw.position.copy(root.worldToLocal(hit.point.clone())).addScaledVector(hit.face.normal,.002);screw.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),hit.face.normal);root.add(screw);}
 return root;
}
