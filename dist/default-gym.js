import * as T from 'three';
import {panelFrame} from './wall-model.js';
// Original connected wall composition, in metres. Shared IDs keep the editable seams joined.
export function atelierWalls(){
 const base=[[-7.4,.32,-2.8],[-3.5,.32,-4.7],[-2,.32,-4.7],[2,.32,-4.7],[4.1,.32,-2.8],[6.4,.32,-4.7],[9,.32,-4.7]];
 const top=[[-7.4,4.42,-3.15],[-3.5,4.42,-5.05],[-2,4.82,-3.6],[2,4.82,-3.6],[4.1,4.82,-1.7],[6.4,4.82,-4.0],[9,4.82,-4.0]];
 const p=Object.fromEntries([...base.map((p,i)=>['b'+i,p]),...top.map((p,i)=>['t'+i,p])]);
 return [
 ['The canvas','#e5e1d5',['b2','b3','t3','t2'],'Open movement on a gently overhanging central face.'],
 ['The slab','#cbb494',['b0','b1','t1','t0'],'Quiet feet, small edges and flowing blue crescents.'],
 ['The fold · lower','#a4b8b2',['b1','b2','t1'],'A triangular transition into the central wall.'],
 ['The fold · upper','#d6ded4',['b2','t2','t1'],'A sharp change of plane with room to experiment.'],
 ['The arête','#6c9696',['b3','b4','t4','t3'],'A projecting prow for opposing hands and body tension.'],
 ['The return · lower','#456c70',['b4','b5','t4'],'A shaded corner on the far side of the prow.'],
 ['The return · upper','#84a6a2',['b5','t5','t4'],'A rising facet that leads into the steep wall.'],
 ['The overhang','#31585e',['b5','b6','t6','t5'],'A gentle overhang with spaced positive holds.']
 ].map(([name,color,ids,desc],i)=>{const vertices=ids.map(id=>({id:'atelier-'+id,p:p[id]})),f=panelFrame(vertices.map(v=>v.p));return{id:'atelier-'+i,name,desc,color,vertices,w:f.w,h:f.h,x:f.origin.x,z:f.origin.z,elevation:f.origin.y-.32,rot:0,angle:T.MathUtils.radToDeg(Math.asin(-f.n.y))};});
}
// Design references: CWA, “How to Routeset & Grade Routes In Gyms Far From Outdoor Climbing?”
// https://www.cwapro.org/blog/how-to-routeset-and-grade-routes-in-gyms-far-from-outdoor-climbing
// https://www.rei.com/learn/expert-advice/climbing-techniques.html
// Intended difficulty only: these original virtual routes have not been forerun in a gym.
export const ROUTE_IDEAS={
 '0:#d96b4f':{name:'Meander',grade:'V0-inspired',idea:'Follow the curved jug line. Small weight shifts, generous scoops and a matching finish.'},
 '0:#2487c9':{name:'Blue current',grade:'V1-inspired',idea:'Follow the crescent rails through an S-turn. Move your feet before reaching sideways.'},
 '1:#2487c9':{name:'Quiet feet',grade:'V1-inspired',idea:'Balance on the slab using broad edges and rounded palms. Choose your next foothold deliberately.'},
 '1:#d6b653':{name:'Side street',grade:'V2-inspired',idea:'Positive pinches and angled rails invite small hip turns, with a few deliberate footholds.'},
 '4:#f3f2e9':{name:'Round the bend',grade:'V1-inspired',idea:'Hooked jugs and curved rails lead across the face of the prow, then back towards the finish.'},
 '5:#d6b653':{name:'Launch pad',grade:'Dynamic challenge',dynamicChallenge:true,idea:'Set your feet, launch to the high bucket, then settle and match the finish. A harder showcase line.'},
 '7:#d96b4f':{name:'Pocketful',grade:'V2-inspired',idea:'Wide letterbox grips, deep buckets and a large final jug on a gentle overhang.'}
};
export function dressAtelier(sectors,addHold){
 // Each line is authored separately: x, y, shape, scale, rotation (radians).
 const route=(si,color,hands,feet)=>{
 feet.forEach(([x,y,type='foot-edge',size=1.45])=>addHold(si,x,y,type,color,size,0,true));
 hands.forEach(([x,y,type,size=1,rotation=0],i)=>addHold(si,x,y,type,color,size,rotation,true,i<2?'start':i===hands.length-1?'finish':null));
 };
 route(0,'#d96b4f',[
 [-1.2,1.15,'jug-deep',.85],[-.7,1.35,'jug',.85,.1],[-1.1,1.95,'jug-pebble',1.1,-.1],[-.55,2.5,'jug-horn',1.1,.18],[-1,3.1,'jug',.9,-.15],[-.65,3.75,'rail-bucket',.9]],
 [[-1.15,.3,'foot-wedge',1.2],[-.65,.55,'foot',1.2],[-.85,1.1,'foot-edge',1.1],[-1.3,1.7,'foot',1.1],[-.5,2.2,'foot-edge',1.1]]);
 route(0,'#2487c9',[
 [.55,1.1,'rail-bucket',.75,-.1],[1.1,1.35,'jug-mini',1.2],[.75,2,'rail',.7,.18],[1.3,2.6,'rail-straight',.65,-.2],[.7,3.2,'edge-incut',1.25,.1],[1.15,3.85,'macro-visor',.7]],
 [[.5,.3,'foot-edge',1.2],[1.05,.55,'foot-wedge',1.1],[.65,1.0,'foot',1.1],[1.35,1.8,'foot-edge',1.1],[.9,2.45,'foot',1.1]]);
 route(1,'#2487c9',[
 [-1.3,1.05,'rail-wafer',.6,.08],[-.75,1.25,'edge-incut',1.2],[-1.1,1.9,'sloper-pillow',.85],[-.55,2.5,'edge-wave',.9,-.1],[-1,3.1,'sloper-disc',1],[-.65,3.7,'rail-bucket',.75]],
 [[-1.25,.3,'foot-wedge',1.1],[-.7,.55,'foot-smear',1.2],[-1.0,1.0,'foot-edge',1.1],[-.6,1.65,'foot-smear',1.1],[-1.25,2.45,'foot-edge',1.1]]);
 route(1,'#d6b653',[
 [.5,1.1,'jug',.9,.15],[1.05,1.3,'pinch-jug',1.1,-.2],[.8,1.95,'rail',.7,.4],[1.25,2.55,'pinch-waist',1.15,-.25],[.65,3.15,'pinch-jug',1.2,.2],[1.1,3.7,'rail-bucket',.8]],
 [[.55,.3,'foot',1.2],[1.1,.55,'foot-wedge',1.1],[.6,1.0,'foot-edge',1.1],[1.3,1.65,'foot',1.1],[.65,2.45,'foot-wedge',1.1]]);
 route(4,'#f3f2e9',[
 [-.6,1.15,'jug-horn',1.1,.2],[-.05,1.4,'jug-deep',.8],[-.4,2.05,'rail',.7,.2],[.3,2.6,'jug-horn',1.15,-.25],[-.15,3.2,'rail-bucket',.75,-.1],[.35,3.85,'macro-visor',.75]],
 [[-.55,.3,'foot-wedge',1.2],[0,.55,'foot',1.1],[-.35,1.0,'foot-edge',1.1],[.35,1.85,'foot-wedge',1.1],[-.1,2.5,'foot',1.1]]);
 route(7,'#d96b4f',[
 [-.4,1.15,'jug-deep',.9],[.2,1.4,'pocket-slot',1.3],[-.2,2,'jug-mini',1.3],[.4,2.6,'pocket-slot',1.35,-.1],[-.15,3.2,'rail-bucket',.75,-.12],[.25,3.85,'jug-deep',1.2]],
 [[-.4,.3,'foot-wedge',1.3],[.2,.55,'foot',1.2],[-.25,1.0,'foot-edge',1.1],[.4,1.65,'foot-wedge',1.1],[0,2.5,'foot',1.1]]);
 route(5,'#d6b653',[
 [-.8,1.2,'jug-deep',.9],[-.2,1.4,'jug',.85],[-.8,2,'rail-bucket',.85],[-1.4,3.2,'jug-deep',.8],[-1.6,3.8,'jug-deep',.65]],
 [[-.8,.3,'foot-wedge',1.3],[-.2,.6,'foot',1.3],[-.6,1,'foot-edge',1.2],[-.4,1.6,'foot-edge',1.2],[-1.2,2.4,'foot-wedge',1.2]]);
 // Shared volume feet remain optional, outside the main hand sequences.
 for(const [si,x,y,type,size,r] of [[0,0,2.25,'volume-wedge',.5,0],[1,0,1.9,'volume-fin',.5,.1],[4,-.8,2.2,'volume-wedge',.4,0]])addHold(si,x,y,type,'#687675',size,r,false);
 // Keep decoration within actual wall geometry; rectangular overlays can protrude from angled panels.
}
