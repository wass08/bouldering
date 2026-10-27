// Local colour segmentation: suggestions only, not a trained recognition model.
export function hsv(r,g,b){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0;if(d){if(max===r)h=((g-b)/d+6)%6;else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h/=6;}return[h,max?d/max:0,max];}
export function detectHolds(image,width,height,rgb,tolerance,minArea){const target=hsv(...rgb),n=width*height,mask=new Uint8Array(n),seen=new Uint8Array(n),queue=new Int32Array(n),out=[];
 for(let i=0;i<n;i++){const c=hsv(image[i*4],image[i*4+1],image[i*4+2]);let dh=Math.abs(c[0]-target[0]);dh=Math.min(dh,1-dh);mask[i]=target[1]<.18?(Math.abs(c[2]-target[2])<tolerance*.7&&c[1]<.20?1:0):(dh<tolerance&&c[1]>Math.max(.15,target[1]*.4)&&c[2]>.12?1:0);}
 // Join a one-pixel crack without expanding the outside boundary of every hold.
 const closed=mask.slice();for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){const i=y*width+x;if(!mask[i]&&((mask[i-1]&&mask[i+1])||(mask[i-width]&&mask[i+width])))closed[i]=1;}
 for(let start=0;start<n;start++){if(!closed[start]||seen[start])continue;let head=0,tail=1,count=0,sx=0,sy=0,minX=width,minY=height,maxX=0,maxY=0;queue[0]=start;seen[start]=1;while(head<tail){const i=queue[head++],x=i%width,y=Math.floor(i/width);count++;sx+=x;sy+=y;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=width||yy<0||yy>=height)continue;const j=yy*width+xx;if(closed[j]&&!seen[j]){seen[j]=1;queue[tail++]=j;}}}
 if(count>=minArea&&count<n*.035&&(maxX-minX)<width*.35&&(maxY-minY)<height*.35)out.push({u:sx/count/width,v:sy/count/height,w:(maxX-minX+1)/width,h:(maxY-minY+1)/height,area:count});}
 return out.sort((a,b)=>b.v-a.v).slice(0,80);
}
