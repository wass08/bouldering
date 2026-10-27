import * as THREE from 'three';
import {contains} from './wall-model.js';
// Fixed metric spacing; centred columns retain their identity as the wall grows.
// Small recessed apertures are instanced so a dense wall stays inexpensive.
export function createBoltGrid(sector,width,height){
 if(sector.socketGroup){sector.face.remove(sector.socketGroup);sector.socketGroup.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
 const sockets=[],group=new THREE.Group(),spacing=.20,edge=.12;
 const columns=Math.floor((width/2-edge)/spacing);
 for(let col=-columns;col<=columns;col++)for(let row=1;row*spacing<=height-edge;row++){
  const x=col*spacing,y=row*spacing;if(sector.outline&&!contains(sector.outline,x,y,.035))continue;sockets.push({id:col+':'+row,u:x/width,y});
 }
 const hole=new THREE.InstancedMesh(new THREE.CircleGeometry(.006,12),new THREE.MeshBasicMaterial({color:'#455047'}),sockets.length);
 const rim=new THREE.InstancedMesh(new THREE.RingGeometry(.006,.0075,12),new THREE.MeshStandardMaterial({color:'#8a9481',roughness:.95}),sockets.length);
 const matrix=new THREE.Matrix4();sockets.forEach((s,i)=>{matrix.makeTranslation(s.u*width,s.y,.128);hole.setMatrixAt(i,matrix);matrix.makeTranslation(s.u*width,s.y,.129);rim.setMatrixAt(i,matrix);});
 hole.instanceMatrix.needsUpdate=true;rim.instanceMatrix.needsUpdate=true;group.add(hole,rim);sector.face.add(group);
 sector.sockets=sockets;sector.socketGroup=group;sector.gridWidth=width;sector.gridHeight=height;
}
export function resizeBoltGrid(sector){if(sector.gridWidth!==sector.width)createBoltGrid(sector,sector.width,sector.gridHeight);}
export function nearestSocket(sectors,holds,si,p,ignore=null,nearby=false){
 const sector=sectors[si],occupied=new Set(holds.filter(h=>h!==ignore&&h.userData.si===si).map(h=>h.userData.socket));
 let extents=null;if(ignore){ignore.geometry.computeBoundingBox();const b=ignore.geometry.boundingBox,c=Math.cos(ignore.rotation.z),s=Math.sin(ignore.rotation.z),k=ignore.scale.x;extents={left:Infinity,right:-Infinity,bottom:Infinity,top:-Infinity};for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y]){const xx=(x*c-y*s)*k,yy=(x*s+y*c)*k;extents.left=Math.min(extents.left,xx);extents.right=Math.max(extents.right,xx);extents.bottom=Math.min(extents.bottom,yy);extents.top=Math.max(extents.top,yy);}}
 const covered=b=>holds.some(h=>{if(h===ignore||h.userData.si!==si||!h.userData.type?.startsWith('volume-'))return false;const dx=b.x-h.position.x,dy=b.y-h.position.y,c=Math.cos(h.rotation.z),s=Math.sin(h.rotation.z),x=(dx*c+dy*s)/h.scale.x,y=(-dx*s+dy*c)/h.scale.y;const a=h.geometry.attributes.position;for(let i=0;i<a.count;i+=3){const ax=a.getX(i),ay=a.getY(i),bx=a.getX(i+1),by=a.getY(i+1),cx=a.getX(i+2),cy=a.getY(i+2),den=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);if(Math.abs(den)<1e-8)continue;const u=((by-cy)*(x-cx)+(cx-bx)*(y-cy))/den,v=((cy-ay)*(x-cx)+(ax-cx)*(y-cy))/den;if(u>=0&&v>=0&&u+v<=1)return true;}return false;});
 const valid=b=>!occupied.has(b.id)&&!covered(b)&&(!extents||(b.x+extents.left>=-sector.width/2&&b.x+extents.right<=sector.width/2&&b.y+extents.bottom>=0&&b.y+extents.top<=sector.wall.geometry.parameters.height&&(!sector.outline||[[extents.left,extents.bottom],[extents.right,extents.bottom],[extents.right,extents.top],[extents.left,extents.top]].every(([x,y])=>contains(sector.outline,b.x+x,b.y+y)))));
 const ranked=sector.sockets.map(b=>({...b,x:b.u*sector.width,d:Math.hypot(b.u*sector.width-p.x,b.y-p.y)})).sort((a,b)=>a.d-b.d);const b=nearby?ranked[0]:ranked.find(valid);if(!b||!valid(b))return null;return{position:new THREE.Vector3(b.x,b.y,.132),id:b.id};
}
