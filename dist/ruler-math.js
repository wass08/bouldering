export function rulerMetrics(a,b){const dx=b[0]-a[0],dy=b[1]-a[1];return{distance:Math.hypot(dx,dy),angle:Math.atan2(Math.abs(dy),Math.abs(dx))*180/Math.PI,dx,dy}}
