/* ARBOR: medial-axis deformation, tapered growth and layered procedural materials.
 * Source outlines remain exact at growth=0. Geometry and random fields are seeded.
 * Texture masks use paths; bark relief additionally uses self-contained SVG filters.
 */
window.ArborEngine = (() => {
  const TAU = Math.PI * 2;
  const defaults = {
    growth: 84, stretch: 22, bend: 48, angular: 8, rough: 35, weight: 28,
    anatomy: 80, contrast: 68, swell: 48, pinch: 42, twist: 38, flow: 55,
    density: 32, length: 65, spread: 70, curl: 64, forks: 22, taper: 85,
    thorns: 8, loops: 42, webbing: 30, erosion: 45, grain: 40,
    poreSize: 48, clustering: 68, crumble: 25, bark: 0, cracks: 0,
    relief: 55, fibers: 0, fuzz: 0, asymmetry: 46, tracking: -12,
    lineArc: 0, slant: 0, rhythm: 30, rotationNoise: 12, wave: 0, waveFreq: 35, zigzag: 0, waist: 0, perspective: 0, split: 0, breaks: 0, drops: 0, spines: 0, links: 0, tension: 35, cascade: 0
  };
  const presets = [
    {id:'seed',name:'Исходник',note:'Чистый контур',values:{growth:0}},
    {id:'wood',name:'Древесина',note:'Кора · волокна · узлы',values:{growth:85,anatomy:76,weight:32,contrast:35,swell:45,pinch:20,bend:46,twist:22,flow:35,rough:45,angular:27,density:43,length:73,spread:90,curl:28,forks:62,taper:40,loops:20,webbing:15,thorns:0,erosion:9,grain:24,poreSize:22,crumble:22,bark:95,cracks:77,relief:88,fibers:82,fuzz:0,tracking:-25,rhythm:36,rotationNoise:20}},
    {id:'lichen',name:'Лишайник',note:'Поры · эрозия · крошение',values:{growth:90,anatomy:90,weight:32,contrast:34,swell:42,pinch:18,bend:36,twist:12,rough:72,angular:12,density:34,length:62,curl:76,forks:48,taper:22,loops:80,webbing:30,thorns:0,erosion:72,grain:70,poreSize:44,clustering:88,crumble:66,bark:0,cracks:15,relief:50,fibers:0,fuzz:0,tracking:-17,rhythm:42,rotationNoise:22}},
    {id:'liquid',name:'Пластика',note:'Петли · наплывы · острия',values:{growth:96,anatomy:98,weight:28,contrast:85,swell:64,pinch:68,bend:54,twist:56,flow:85,rough:8,angular:4,density:19,length:100,curl:90,spread:96,forks:10,taper:100,loops:94,webbing:48,thorns:32,erosion:0,grain:0,crumble:0,bark:0,cracks:0,fibers:0,fuzz:0,tracking:-30,rhythm:52,rotationNoise:32}},
    {id:'dust',name:'Пыль',note:'Рваный штрих · распыление',values:{growth:78,anatomy:83,weight:38,contrast:55,swell:78,pinch:45,bend:30,twist:15,flow:30,rough:40,angular:48,density:20,length:90,curl:8,forks:12,taper:12,loops:15,webbing:20,thorns:0,erosion:22,grain:70,poreSize:22,crumble:35,bark:0,cracks:0,fibers:0,fuzz:90,tracking:-22,rhythm:62,rotationNoise:35}},
    {id:'hybrid',name:'Гибрид',note:'Смешать все характеры',values:{...defaults,bark:44,cracks:48,fibers:30,erosion:58,grain:52,loops:62,webbing:48,contrast:76,swell:64,fuzz:18}}
  ];
  function rand(seed) { let n=seed|0; return () => { n+=0x6D2B79F5;let t=Math.imul(n^n>>>15,1|n);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296; }; }
  const mix=(a,b,t)=>a+(b-a)*t, clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const smooth=t=>t*t*(3-2*t);
  function hash(x,y,s){let n=Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(s|0,1442695041);n=Math.imul(n^n>>>13,1274126177);return ((n^n>>>16)>>>0)/4294967295;}
  function noise(x,y,s){const ix=Math.floor(x),iy=Math.floor(y),u=smooth(x-ix),v=smooth(y-iy);return mix(mix(hash(ix,iy,s),hash(ix+1,iy,s),u),mix(hash(ix,iy+1,s),hash(ix+1,iy+1,s),u),v)*2-1;}
  function fbm(x,y,s){return noise(x,y,s)*.58+noise(x*2.13,y*2.13,s+9)*.28+noise(x*4.7,y*4.7,s+23)*.14;}
  const number=n=>Math.round(n*100)/100;
  const xy=p=>number(p.x)+','+number(p.y);
  const polygon=pts=>pts.length?'M'+pts.map(xy).join('L')+'Z':'';
  function smoothPath(pts,closed=false){if(pts.length<3)return polygon(pts);let d=closed?'M'+xy({x:(pts.at(-1).x+pts[0].x)/2,y:(pts.at(-1).y+pts[0].y)/2}):'M'+xy(pts[0]);for(let i=closed?0:1;i<pts.length-1;i++)d+='Q'+xy(pts[i])+' '+xy({x:(pts[i].x+pts[i+1].x)/2,y:(pts[i].y+pts[i+1].y)/2});if(closed)d+='Q'+xy(pts.at(-1))+' '+xy({x:(pts.at(-1).x+pts[0].x)/2,y:(pts.at(-1).y+pts[0].y)/2})+'Z';else d+='L'+xy(pts.at(-1));return d;}
  function samplePath(commands){let contours=[],pts=[],prev={x:0,y:0},start=prev;const add=p=>{pts.push(p);prev=p;};for(const c of commands){if(c.type==='M'){if(pts.length)contours.push(pts);pts=[];start={x:c.x,y:c.y};add(start);}else if(c.type==='Z'){if(pts.length){contours.push(pts);pts=[];}prev=start;}else{const p0=prev;let dist=Math.hypot(c.x-p0.x,c.y-p0.y);if(c.type==='C')dist=Math.hypot(c.x1-p0.x,c.y1-p0.y)+Math.hypot(c.x2-c.x1,c.y2-c.y1)+Math.hypot(c.x-c.x2,c.y-c.y2);if(c.type==='Q')dist=Math.hypot(c.x1-p0.x,c.y1-p0.y)+Math.hypot(c.x-c.x1,c.y-c.y1);const steps=Math.max(2,Math.ceil(dist/1.5));for(let j=1;j<=steps;j++){const t=j/steps,u=1-t;let p;if(c.type==='C')p={x:u*u*u*p0.x+3*u*u*t*c.x1+3*u*t*t*c.x2+t*t*t*c.x,y:u*u*u*p0.y+3*u*u*t*c.y1+3*u*t*t*c.y2+t*t*t*c.y};else if(c.type==='Q')p={x:u*u*p0.x+2*u*t*c.x1+t*t*c.x,y:u*u*p0.y+2*u*t*c.y1+t*t*c.y};else p={x:mix(p0.x,c.x,t),y:mix(p0.y,c.y,t)};add(p);}}}if(pts.length)contours.push(pts);return contours;}

  // Rasterize the outline at a fixed design resolution, then recover its medial axis.
  // This works with uploaded fonts as well as Cyrillic; no hand-coded alphabet.
  function skeletonize(contours,box){
    if(!contours.length)return {nodes:[],lines:[],tips:[]};
    const unit=1.25,ox=Math.floor(box.x1)-5,oy=Math.floor(box.y1)-5;
    const w=Math.ceil((box.x2-ox+6)/unit),h=Math.ceil((box.y2-oy+6)/unit),size=w*h;
    const bitmap=new Uint8Array(size),distance=new Float32Array(size);
    for(let y=1;y<h-1;y++){const yy=oy+y*unit,cross=[];for(const c of contours)for(let i=0,j=c.length-1;i<c.length;j=i++){const a=c[j],b=c[i];if((a.y<=yy&&b.y>yy)||(b.y<=yy&&a.y>yy))cross.push(a.x+(yy-a.y)*(b.x-a.x)/(b.y-a.y));}cross.sort((a,b)=>a-b);for(let k=0;k<cross.length-1;k+=2){const left=Math.max(1,Math.ceil((cross[k]-ox)/unit)),right=Math.min(w-2,Math.floor((cross[k+1]-ox)/unit));for(let x=left;x<=right;x++)bitmap[y*w+x]=1;}}
    for(let i=0;i<size;i++)distance[i]=bitmap[i]?1e5:0;
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(bitmap[i])distance[i]=Math.min(distance[i],distance[i-1]+1,distance[i-w]+1,distance[i-w-1]+1.414,distance[i-w+1]+1.414);}
    for(let y=h-2;y>0;y--)for(let x=w-2;x>0;x--){const i=y*w+x;if(bitmap[i])distance[i]=Math.min(distance[i],distance[i+1]+1,distance[i+w]+1,distance[i+w+1]+1.414,distance[i+w-1]+1.414);}
    const pixels=bitmap.slice(),offsets=[-w,-w+1,1,w+1,w,w-1,-1,-w-1];
    for(let iter=0;iter<70;iter++){let changes=0;for(let pass=0;pass<2;pass++){const remove=[];for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(!pixels[i])continue;const n=offsets.map(o=>pixels[i+o]),count=n.reduce((a,b)=>a+b,0);if(count<2||count>6)continue;let transitions=0;for(let k=0;k<8;k++)if(!n[k]&&n[(k+1)%8])transitions++;if(transitions!==1)continue;if(pass===0?(n[0]*n[2]*n[4]||n[2]*n[4]*n[6]):(n[0]*n[2]*n[6]||n[0]*n[4]*n[6]))continue;remove.push(i);}for(const i of remove)pixels[i]=0;changes+=remove.length;}if(!changes)break;}
    const nodes=[],map=new Map();for(let i=0;i<size;i++)if(pixels[i]){const n={x:ox+(i%w)*unit,y:oy+Math.floor(i/w)*unit,r:distance[i]*unit,idx:i,links:[]};map.set(i,n);nodes.push(n);}
    for(const n of nodes)for(let k=0;k<8;k++){const v=map.get(n.idx+offsets[k]);if(!v)continue;if(k%2===1&&(pixels[n.idx+offsets[(k+7)%8]]||pixels[n.idx+offsets[(k+1)%8]]))continue;n.links.push(v);}
    const visited=new Set(),lines=[];function walk(start,next){const line=[start];let prev=start,current=next;for(let j=0;j<size;j++){visited.add(Math.min(prev.idx,current.idx)+':'+Math.max(prev.idx,current.idx));line.push(current);if(current.links.length!==2)break;const after=current.links.find(n=>n!==prev);if(!after||visited.has(Math.min(current.idx,after.idx)+':'+Math.max(current.idx,after.idx)))break;prev=current;current=after;}if(line.length>=3)lines.push(line);}
    for(const n of nodes)if(n.links.length!==2)for(const next of n.links)if(!visited.has(Math.min(n.idx,next.idx)+':'+Math.max(n.idx,next.idx)))walk(n,next);
    for(const n of nodes)for(const next of n.links)if(!visited.has(Math.min(n.idx,next.idx)+':'+Math.max(n.idx,next.idx)))walk(n,next);
    // Blur medial curves without crossing separate strokes; retain local thickness.
    const curved=lines.map(line=>line.map((p,i)=>{let x=0,y=0,r=0,n=0;for(let j=Math.max(0,i-3);j<=Math.min(line.length-1,i+3);j++){x+=line[j].x;y+=line[j].y;r+=line[j].r;n++;}return{x:x/n,y:y/n,r:r/n};}));
    const tips=[];for(let i=0;i<lines.length;i++){const original=lines[i],line=curved[i];if(line.length<8)continue;for(const end of [0,line.length-1])if(original[end].links.length===1){const tip=line[end],inside=line[end===0?Math.min(9,line.length-1):Math.max(0,end-9)];tips.push({...tip,angle:Math.atan2(tip.y-inside.y,tip.x-inside.x),length:line.length});}}
    const field=curved.flat();
    // Cache nearest-axis correspondences: contour points can change radius independently.
    for(const c of contours)for(const p of c){let nearest=null,min=Infinity;for(const n of field){const d=(p.x-n.x)**2+(p.y-n.y)**2;if(d<min){min=d;nearest=n;}}p.axis=nearest;p.dist=Math.sqrt(min);}
    return{nodes:field,lines:curved,tips};
  }
  const cache=new WeakMap();
  function glyphData(font,ch){let map=cache.get(font);if(!map){map=new Map();cache.set(font,map);}if(map.has(ch))return map.get(ch);const path=font.getPath(ch,0,0,300),contours=samplePath(path.commands),box=path.getBoundingBox();const data={contours,box,advance:font.getAdvanceWidth(ch,300),base:path.toPathData(3)};data.skeleton=skeletonize(contours,box);map.set(ch,data);return data;}

  function makeRibbon(points,radii,rough,seed){const left=[],right=[];for(let i=0;i<points.length;i++){const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],p=points[i],angle=Math.atan2(b.y-a.y,b.x-a.x)+Math.PI/2;const fuzz=fbm(i*.64,4,seed)*rough*.035;const r=Math.max(.08,radii[i]+fuzz);left.push({x:p.x+Math.cos(angle)*r,y:p.y+Math.sin(angle)*r});right.push({x:p.x-Math.cos(angle)*r,y:p.y-Math.sin(angle)*r});}return smoothPath(left.concat(right.reverse()),true);}
  function organicHole(x,y,r,seed,aspect=1){const random=rand(seed),pts=[];for(let i=0;i<9;i++){const a=i/9*TAU,rr=r*(.66+random()*.7);pts.push({x:x+Math.cos(a)*rr*aspect,y:y+Math.sin(a)*rr});}return smoothPath(pts,true);}

  // Local edits deform the finished geometry, including texture cutouts. SVG
  // control points are transformed directly so exports remain self-contained.
  function deformPoint(point,pins){let q={...point};for(const pin of pins){const d=(q.x-pin.x)**2+(q.y-pin.y)**2,w=Math.exp(-3*d/(pin.radius*pin.radius));q.x+=pin.dx*w;q.y+=pin.dy*w;}return q;}
  function deformPath(d,pins){if(!d||!pins?.length)return d;const tokens=d.match(/[a-zA-Z]|[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?/g)||[],arity={M:2,L:2,Q:4,C:6,A:7,Z:0};let out='',i=0,command='',x=0,y=0,startX=0,startY=0;while(i<tokens.length){if(/^[a-zA-Z]$/.test(tokens[i]))command=tokens[i++];const upper=command.toUpperCase(),relative=command!==upper;if(upper==='Z'){out+='Z';x=startX;y=startY;command='';continue;}const n=arity[upper];if(!n||i+n>tokens.length)break;const v=tokens.slice(i,i+n).map(Number);i+=n;if(upper==='A'){const ex=v[5]+(relative?x:0),ey=v[6]+(relative?y:0),q=deformPoint({x:ex,y:ey},pins);out+='A'+v.slice(0,5).join(',')+','+xy(q);x=ex;y=ey;}else{const points=[];for(let k=0;k<n;k+=2)points.push({x:v[k]+(relative?x:0),y:v[k+1]+(relative?y:0)});out+=upper+points.map(q=>xy(deformPoint(q,pins))).join(' ');x=points.at(-1).x;y=points.at(-1).y;if(upper==='M'){startX=x;startY=y;command=relative?'l':'L';}}}return out;}
  function applyPins(shape,pins){if(!pins?.length)return shape;for(const key of ['body','pores','flecks','dust','fibers','cracks','highlights'])shape[key]=deformPath(shape[key],pins);shape.branches=shape.branches.map(d=>deformPath(d,pins));for(const channel of shape.channels)channel.points=channel.points.map(p=>deformPoint(p,pins));return shape;}

  function buildGlyph(font,ch,params,seed){
    const p={...defaults,...params},data=glyphData(font,ch),g=p.growth/100,random=rand(seed),b=data.box,cx=(b.x1+b.x2)/2,cy=(b.y1+b.y2)/2;
    const shape={body:data.base,branches:[],channels:[],pores:'',flecks:'',dust:'',fibers:'',cracks:'',highlights:'',advance:data.advance,weight:0,bounds:b,material:p,growth:g,seed};
    if(!g||!data.contours.length)return applyPins(shape,p._pins);
    const phase=random()*TAU,sign=random()<.5?-1:1;
    const vortex={x:cx+(random()-.5)*(b.x2-b.x1)*.65,y:cy+(random()-.5)*(b.y2-b.y1)*.6};
    function warp(v){let x=v.x,y=v.y;const dx=x-vortex.x,dy=y-vortex.y;const angle=g*p.twist*.014*Math.exp(-(dx*dx+dy*dy)/19000)*sign;
      x=vortex.x+dx*Math.cos(angle)-dy*Math.sin(angle);y=vortex.y+dx*Math.sin(angle)+dy*Math.cos(angle);
      const n=fbm(x*.01,y*.01,seed),m=fbm(x*.011+71,y*.011+29,seed+113);
      x+=g*(n*p.bend*1.28+Math.sin(y*.018+phase)*p.asymmetry*.45+Math.sin((y-cy)*.022+phase)*p.flow*.3+Math.sin(y*.055+phase)*p.angular*.18)-(y-cy)*g*p.slant/150;
      y=cy+(y-cy)*(1+g*p.stretch*.01)+g*(m*p.bend*.85+Math.sin(x*.042+phase)*p.angular*.2);
      const ny=clamp((y-cy)/Math.max(30,(b.y2-b.y1)/2),-1.5,1.5);
      x=cx+(x-cx)*clamp(1-g*p.waist*.0085*Math.exp(-ny*ny*3)+g*p.perspective*.006*ny,.12,2.8);
      x+=Math.sin((y-cy)*(.008+p.waveFreq*.0009)+phase)*p.wave*1.15*g;
      x+=(2/Math.PI)*Math.asin(Math.sin((y-cy)*.06+phase))*p.zigzag*.72*g;
      return{x,y};
    }
    function radius(v){const field=fbm(v.x*.032,v.y*.032,seed+100),bulge=Math.pow(Math.max(0,fbm(v.x*.012,v.y*.025,seed+70)),1.4);const pinch=Math.pow(Math.max(0,Math.sin(v.x*.044+v.y*.055+phase)),6);
      const uniform=3.2+p.weight*.14;let target=mix(v.r||3,uniform,p.anatomy/100*.88);
      target*=Math.exp(field*p.contrast*.019)*(1+bulge*p.swell*.065)*(1-pinch*p.pinch*.0095);
      return clamp(mix(v.r||3,target,g),.24,35);
    }
    const deformed=data.contours.map(contour=>contour.map(v=>{
      let local={x:v.x,y:v.y};if(v.axis&&v.dist>.001){const a=v.axis,r=radius(a);const target=Math.min(v.dist,Math.max(a.r,.4))*r/Math.max(a.r,.4);const d=mix(v.dist,target,g*p.anatomy/100);local={x:a.x+(v.x-a.x)/v.dist*d,y:a.y+(v.y-a.y)/v.dist*d};}
      const q=warp(local),r=g*p.rough*.035;const nx=local.x-(v.axis?.x??cx),ny=local.y-(v.axis?.y??cy),len=Math.hypot(nx,ny)||1;const jitter=fbm(local.x*.23,local.y*.23,seed+119)*r;
      return{x:q.x+nx/len*jitter,y:q.y+ny/len*jitter};
    }));
    shape.body=deformed.map(c=>smoothPath(c,true)).join('');
    for(const line of data.skeleton.lines){if(line.length<4)continue;const points=line.filter((_,i)=>i%2===0).map(warp),radii=line.filter((_,i)=>i%2===0).map(radius);if(points.length>1){shape.channels.push({points,radii,root:true});shape.branches.push(makeRibbon(points,radii.map(r=>r*g*p.anatomy/100*.88),p.rough*.25,seed+points.length));}}

    // Endings follow real stroke tangents. They can curl back into the letter, fan
    // into membranes, develop knots or break into recursive woody side shoots.
    function grow(start,angle,len,width,localSeed,depth=0,forceLoop=false){const rr=rand(localSeed),points=[],radii=[],steps=clamp(Math.ceil(len/2.5),28,110);let pos={...start},dir=angle;const spiral=forceLoop||rr()<p.loops/160,hand=rr()<.5?-1:1;const turn=hand*(spiral?mix(2.6,5.6,p.curl/100):mix(.05,2.7,p.curl/100))*(.65+rr()*.55);const kinkPhase=rr()*20;
      for(let i=0;i<=steps;i++){const t=i/steps;points.push({...pos});const tipProfile=p.taper<35?Math.pow(1-t,.28):Math.pow(1-t,.45+p.taper*.012);const pulse=1+Math.sin(t*TAU*1.5+kinkPhase)*p.swell*.006;const blade=1+Math.pow(Math.sin(t*Math.PI),4)*p.webbing*.027;const r=width*tipProfile*pulse*blade; radii.push(i===steps?.04:Math.max(.1,r));
        dir+=turn/steps*(spiral?(.28+2.4*t*t):1)+fbm(t*7,kinkPhase,localSeed)*p.angular*.0017+Math.sin(t*12+kinkPhase)*p.bend*.0002;
        const speed=len/steps*(spiral?1-t*.24:1);pos={x:pos.x+Math.cos(dir)*speed,y:pos.y+Math.sin(dir)*speed};
      }
      shape.branches.push(makeRibbon(points,radii,p.rough,localSeed));shape.channels.push({points,radii});
      if(depth<2&&rr()<p.forks/100){const count=depth===0&&p.forks>55?2:1;for(let j=0;j<count;j++){const at=Math.floor(steps*(.3+rr()*.4)),q=points[at],next=points[at+1],heading=Math.atan2(next.y-q.y,next.x-q.x)+(rr()<.5?-1:1)*(.38+p.spread*.012);grow(q,heading,len*(.3+rr()*.3),radii[at]*.62,localSeed+37+j*71,depth+1,false);}}
      if(p.thorns>0&&depth===0){for(let i=0;i<3;i++){if(rr()>p.thorns/100)continue;const at=Math.floor(steps*(.15+rr()*.65)),q=points[at],next=points[at+1],heading=Math.atan2(next.y-q.y,next.x-q.x)+(rr()<.5?-1:1)*(.5+rr()*.9);grow(q,heading,len*(.15+rr()*.25),radii[at]*1.1,localSeed+321+i,3,false);}}
    }
    const ends=data.skeleton.tips.filter(t=>t.length>9).sort((a,b)=>b.length-a.length);
    // Spatially separated tips prevent the repeated comb/antenna pattern.
    const anchors=[];for(const tip of ends){if(anchors.every(a=>Math.hypot(tip.x-a.x,tip.y-a.y)>23))anchors.push(tip);}
    const count=Math.min(anchors.length,Math.ceil(p.density/13));
    for(let i=0;i<count;i++){const a=anchors[i],start=warp(a),inside=warp({x:a.x-Math.cos(a.angle)*5,y:a.y-Math.sin(a.angle)*5});const angle=Math.atan2(start.y-inside.y,start.x-inside.x)+(random()-.5)*p.spread*.014;const length=g*(22+p.length*2.5)*(.55+random()*.95);grow(start,angle,length,Math.max(1.6,radius(a))*(.7+random()*.5)*g,seed+733+i*829,0,i===0&&p.loops>60);}
    // A few side roots grow from the skeleton, not from arbitrary contour pixels.
    if(p.density>50&&shape.channels.length){for(let i=0;i<Math.floor((p.density-50)/17)+1;i++){const line=data.skeleton.lines[Math.floor(random()*data.skeleton.lines.length)];if(!line?.length)continue;const k=Math.floor(line.length*(.25+random()*.5)),a=line[k],next=line[Math.min(k+3,line.length-1)],start=warp(a),n=warp(next);grow(start,Math.atan2(n.y-start.y,n.x-start.x)+(random()<.5?-1:1)*.9,g*(20+p.length)*(.4+random()*.6),radius(a)*.55,seed+4500+i*91,1,false);}}

    // Structural cuts are independent of surface grain. Slots follow strokes;
    // transverse breaks remove whole cross-sections, and body spines add geometry.
    const structuralRng=rand(seed+9217);
    const roots=shape.channels.filter(c=>c.root&&c.points.length>9);
    for(let ci=0;ci<roots.length;ci++){
      const c=roots[ci],pts=c.points,rs=c.radii;
      if(p.split>0&&pts.length>14){const slots=p.split>60?2:1;for(let slot=0;slot<slots;slot++){
        const points=[],radii=[];for(let i=3;i<pts.length-3;i++){
          const a=pts[i-1],b=pts[i+1],angle=Math.atan2(b.y-a.y,b.x-a.x)+Math.PI/2,t=(i-3)/Math.max(1,pts.length-7),off=slots===1?0:(slot===0?-.38:.38)*rs[i];
          points.push({x:pts[i].x+Math.cos(angle)*off,y:pts[i].y+Math.sin(angle)*off});radii.push(Math.sin(t*Math.PI)*rs[i]*(slots===1?.5:.24)*p.split/100*g);
        }shape.pores+=makeRibbon(points,radii,0,seed+ci);
      }}
      for(let i=6;i<pts.length-4;i+=13){const q=pts[i],a=pts[i-1],b=pts[i+1],angle=Math.atan2(b.y-a.y,b.x-a.x),normal=angle+Math.PI/2;
        if(structuralRng()<p.breaks/150&&p.breaks>0){const across=rs[i]*2.1+4,w=(1+p.breaks*.09)*g;shape.pores+=polygon([{x:q.x+Math.cos(normal)*across+Math.cos(angle)*w,y:q.y+Math.sin(normal)*across+Math.sin(angle)*w},{x:q.x-Math.cos(normal)*across+Math.cos(angle)*w,y:q.y-Math.sin(normal)*across+Math.sin(angle)*w},{x:q.x-Math.cos(normal)*across-Math.cos(angle)*w,y:q.y-Math.sin(normal)*across-Math.sin(angle)*w},{x:q.x+Math.cos(normal)*across-Math.cos(angle)*w,y:q.y+Math.sin(normal)*across-Math.sin(angle)*w}]);}
        if(structuralRng()<p.spines/170&&p.spines>0){const direction=normal+(structuralRng()<.5?0:Math.PI),len=(12+structuralRng()*p.spines*.8)*g;shape.branches.push(makeRibbon([q,{x:q.x+Math.cos(direction+.3)*len*.45,y:q.y+Math.sin(direction+.3)*len*.45},{x:q.x+Math.cos(direction)*len,y:q.y+Math.sin(direction)*len}],[rs[i]*.9,rs[i]*.6,.05],p.rough,seed+ci+i));}
      }
    }
    if(p.drops>0)for(let i=0;i<Math.min(8,anchors.length);i++){const q=warp(anchors[i]),r=(2+p.drops*.2)*g;shape.branches.push(organicHole(q.x,q.y,r,seed+590+i,.7+random()*.6));}

    // Surface detail follows the medial channels (including every generated root).
    // Large cellular cutouts, fine holes, bark fissures and loose particles are separate.
    const surfaceRng=rand(seed+77417);let poreBudget=0,fleckBudget=0;const detail=p._preview?.12:1;
    let surfaceArea=0;for(const c of shape.channels)for(let i=1;i<c.points.length;i++)surfaceArea+=Math.hypot(c.points[i].x-c.points[i-1].x,c.points[i].y-c.points[i-1].y)*(c.radii[i]+c.radii[i-1])/2;
    const baseDensity=(p.erosion*.005+p.grain*.003)*g;
    const densityScale=Math.min(1,1200/Math.max(1,surfaceArea*baseDensity));
    for(let ci=0;ci<shape.channels.length;ci++){
      const channel=shape.channels[ci],pts=channel.points,rs=channel.radii;
      for(let i=1;i<pts.length;i++){
        const a=pts[i-1],v=pts[i],segment=Math.hypot(v.x-a.x,v.y-a.y);if(segment<.2)continue;const tangent=Math.atan2(v.y-a.y,v.x-a.x),normal=tangent+Math.PI/2,rad=(rs[i-1]+rs[i])/2;
        const clump=mix(1,.15+Math.pow((fbm(v.x*.05,v.y*.05,seed+777)+1)/2,1.3)*2.2,p.clustering/100);
        const amount=Math.min(16,segment*rad*baseDensity*densityScale*clump*detail);
        for(let j=0;j<Math.floor(amount)+(surfaceRng()<amount%1?1:0);j++){
          poreBudget++;const t=surfaceRng(),side=(surfaceRng()-.5)*2,xx=mix(a.x,v.x,t)+Math.cos(normal)*side*rad,yy=mix(a.y,v.y,t)+Math.sin(normal)*side*rad;
          const cellular=surfaceRng()<p.erosion/Math.max(1,p.erosion+p.grain);let r=cellular?(.55+Math.pow(surfaceRng(),1.7)*(1+p.poreSize*.055))*g:(.13+surfaceRng()*.55)*g;
          r=Math.min(r,rad*(cellular?.75:.38));shape.pores+=r<.6?'M'+number(xx-r)+','+number(yy)+'a'+number(r)+','+number(r)+' 0 1 0 '+number(2*r)+',0a'+number(r)+','+number(r)+' 0 1 0 '+number(-2*r)+',0Z':organicHole(xx,yy,r,seed+poreBudget*79,.6+surfaceRng()*.9);
        }
        if(p.cracks>0&&i%5===0&&surfaceRng()<p.cracks/100*g){const side=(surfaceRng()-.5)*1.3,off=rad*side,length=3+surfaceRng()*9;const x=v.x+Math.cos(normal)*off,y=v.y+Math.sin(normal)*off;shape.cracks+='M'+number(x)+','+number(y)+'q'+number(Math.cos(tangent)*length*.4+1)+','+number(Math.sin(tangent)*length*.4)+' '+number(Math.cos(tangent)*length)+','+number(Math.sin(tangent)*length);}
        if((p.crumble||p.fuzz)&&surfaceRng()<.5&&fleckBudget<1200){const count=Math.ceil((p.crumble+p.fuzz)*.055*g*detail);for(let j=0;j<count;j++){fleckBudget++;const side=surfaceRng()<.5?-1:1,halo=rad+Math.pow(surfaceRng(),2)*(2+p.fuzz*.17),x=v.x+Math.cos(normal)*side*halo+(surfaceRng()-.5)*4,y=v.y+Math.sin(normal)*side*halo+(surfaceRng()-.5)*4,r=(.15+surfaceRng()*(p.crumble*.026+.35))*g;
          if(p.crumble>0&&surfaceRng()<p.crumble/140)shape.flecks+=organicHole(x,y,r,seed+fleckBudget*17);else if(p.fuzz>0)shape.dust+=organicHole(x,y,.13+surfaceRng()*.48,seed+fleckBudget*17);
        }}
      }
      if(p.bark||p.fibers){for(let strand=-2;strand<=2;strand++){const trace=[],shine=[];for(let i=0;i<pts.length;i++){const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],n=Math.atan2(b.y-a.y,b.x-a.x)+Math.PI/2;const wiggle=fbm(i*.22,strand+4,seed+ci)*rs[i]*.15;const off=rs[i]*(strand*.29-.12)+wiggle;trace.push({x:pts[i].x+Math.cos(n)*off,y:pts[i].y+Math.sin(n)*off});shine.push({x:pts[i].x+Math.cos(n)*(off-.7),y:pts[i].y+Math.sin(n)*(off-.7)});}if(strand%2===0)shape.fibers+=smoothPath(trace);shape.highlights+=smoothPath(shine);}}
    }
    return applyPins(shape,p._pins);
  }

  const shapeCache=new WeakMap();
  function cachedGlyph(font,ch,p,seed){let m=shapeCache.get(font);if(!m){m=new Map();shapeCache.set(font,m);}const key=ch+'|'+seed+'|'+JSON.stringify(p);if(m.has(key))return m.get(key);const shape=buildGlyph(font,ch,p,seed);if(m.size>80)m.delete(m.keys().next().value);m.set(key,shape);return shape;}
  function layout(font,state,override,preview=false){const chars=[...state.text],params={...defaults,...(override||state.params)},widths=chars.map(c=>glyphData(font,c).advance),gap=params.tracking,rawW=widths.reduce((a,b)=>a+b,0)+Math.max(0,chars.length-1)*gap,scale=Math.min(1.85,state.width*.74/Math.max(150,rawW));let x=-rawW/2;
    const items=chars.map((ch,i)=>{const o=state.letters[i]||{},p={...params,...(!override?o.params:{}),_preview:preview,_pins:override?[]:(o.pins||[])},shape=cachedGlyph(font,ch,p,state.seed+i*173+(o.seed||0)),rel=(i-(chars.length-1)/2)/Math.max(1,chars.length-1),r=rand(state.seed+i*57),g=p.growth/100;const item={ch,i,shape,p,x:x+widths[i]/2+(o.x||0),y:(o.y||0)+params.lineArc*rel*rel*2+params.cascade*rel*2*g+(r()-.5)*p.rhythm*1.5*g,rotation:(o.rotation||0)+(r()-.5)*p.rotationNoise*.8*g,sx:o.sx??1,sy:(o.sy??1)*(1+(r()-.5)*p.rhythm*.006*g),cx:widths[i]/2,locked:o.locked||false};x+=widths[i]+gap;return item;});return{items,scale,rawW,connections:makeConnections(items,params,state.seed),baseline:state.height*.52+70*scale};
  }
  function makeConnections(items,params,seed){if(!params.links||!params.growth)return '';const rng=rand(seed+77889),paths=[];const transform=(v,it)=>{const x=(v.x-it.cx)*it.sx,y=v.y*it.sy,a=it.rotation*Math.PI/180;return{x:it.x+x*Math.cos(a)-y*Math.sin(a),y:it.y+x*Math.sin(a)+y*Math.cos(a)};};for(let i=0;i<items.length-1;i++){const a=items[i],b=items[i+1];if(!a.ch.trim()||!b.ch.trim())continue;const ac=a.shape.channels.filter(c=>c.root),bc=b.shape.channels.filter(c=>c.root);if(!ac.length||!bc.length)continue;const count=Math.ceil(params.links/36);for(let k=0;k<count;k++){const ca=ac[Math.floor(rng()*ac.length)],cb=bc[Math.floor(rng()*bc.length)];const from=transform(ca.points[Math.floor(ca.points.length*(.25+rng()*.5))],a),to=transform(cb.points[Math.floor(cb.points.length*(.25+rng()*.5))],b);const sag=params.tension*1.8*(k%2===0?1:-1),pts=[],radii=[];for(let j=0;j<=36;j++){const t=j/36;pts.push({x:mix(from.x,to.x,t),y:mix(from.y,to.y,t)+Math.sin(t*Math.PI)*sag});radii.push((1.4+Math.sin(t*Math.PI)*(params.links*.035))*params.growth/100);}paths.push(makeRibbon(pts,radii,params.rough*.2,seed+i*31+k));}}return paths.map(d=>'<path d="'+d+'"/>').join('');}
  function mixColor(a,b,t){const c=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));const aa=c(a),bb=c(b);return '#'+aa.map((v,i)=>Math.round(mix(v,bb[i],t)).toString(16).padStart(2,'0')).join('');}
  function shapeMarkup(shape,ink,id){
    const p=shape.material,g=shape.growth,wood=p.bark/100*g,base=wood?mixColor(ink,'#968775',wood*.86):ink;
    const geo='<path d="'+shape.body+'"/>'+shape.branches.map(d=>'<path d="'+d+'"/>').join('');let defs='<defs>',mask='';
    if(shape.pores){defs+='<mask id="'+id+'-pores" maskUnits="userSpaceOnUse" x="-1500" y="-1500" width="3000" height="3000"><rect x="-1500" y="-1500" width="3000" height="3000" fill="white"/><path d="'+shape.pores+'" fill="black"/></mask>';mask=' mask="url(#'+id+'-pores)"';}
    if(wood||p.fibers||shape.cracks){defs+='<clipPath id="'+id+'-clip">'+geo+'</clipPath>';}
    let filter='';if(wood){defs+='<filter id="'+id+'-bark" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".09 .32" numOctaves="3" seed="'+(shape.seed%900)+'" result="noise"/><feDiffuseLighting in="noise" surfaceScale="'+number(2+p.relief*.065)+'" diffuseConstant="1.15" lighting-color="#fff4d8" result="light"><feDistantLight azimuth="225" elevation="48"/></feDiffuseLighting><feComposite in="light" in2="SourceAlpha" operator="in" result="lit"/><feBlend in="SourceGraphic" in2="lit" mode="multiply"/></filter>';filter=' filter="url(#'+id+'-bark)"';}
    defs+='</defs>';
    let result=defs+'<g'+mask+'><g fill="'+base+'"'+filter+'>'+geo+'</g>';
    if(shape.fibers||shape.cracks||shape.highlights){result+='<g clip-path="url(#'+id+'-clip)" fill="none" stroke-linecap="round">';if(shape.fibers)result+='<path d="'+shape.fibers+'" stroke="#191812" stroke-width="'+number(.25+p.fibers*.013)+'" opacity="'+number(Math.max(wood*.72,p.fibers*.008*g))+'"/>';if(shape.highlights&&wood)result+='<path d="'+shape.highlights+'" stroke="#fff6dc" stroke-width="'+number(.25+p.relief*.008)+'" opacity="'+number(wood*.7)+'"/>';if(shape.cracks)result+='<path d="'+shape.cracks+'" stroke="'+(wood?'#17140f':'#080a07')+'" stroke-width="'+number(.25+p.cracks*.012*g)+'" opacity="'+number(.55+wood*.4)+'"/>';result+='</g>';}
    result+='</g>';if(shape.flecks)result+='<path d="'+shape.flecks+'" fill="'+base+'"/>';if(shape.dust)result+='<path d="'+shape.dust+'" fill="'+ink+'" opacity=".42"/>';
    return result;
  }
  return{defaults,presets,rand,buildGlyph,layout,shapeMarkup,number};
})();
