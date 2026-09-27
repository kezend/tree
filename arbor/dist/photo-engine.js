/* Local, deterministic photo treatment. Shared by worker and regression tests. */
(function(root){
'use strict';
const defaults={amount:100,threshold:145,softness:24,contrast:20,edges:22,detail:55,bend:18,wavelength:45,stretch:0,zigzag:0,flow:20,branching:22,length:40,forks:30,porosity:42,poreSize:26,grain:28,ragged:24,bark:0,relief:55,fibers:0,dust:12,tones:0,color:0,seed:2741,source:'dark',ink:'#e8e8df',paper:'#090a08',transparent:false};
const presets={lichen:{...defaults},wood:{...defaults,amount:100,porosity:12,grain:18,ragged:30,bark:92,relief:80,fibers:85,bend:12,branching:40,length:64,ink:'#514335',paper:'#eeece4'},liquid:{...defaults,amount:100,softness:10,edges:35,bend:55,flow:80,branching:15,length:85,porosity:0,grain:0,ragged:0,dust:0},dust:{...defaults,softness:38,porosity:25,grain:82,ragged:60,dust:85,branching:7,bend:5},print:{...defaults,amount:100,edges:60,branching:0,bend:0,porosity:12,grain:42,tones:75}};
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function hash(x,y,s){let n=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(s|0,1442695041);n=Math.imul(n^n>>>13,1274126177);return((n^n>>>16)>>>0)/4294967295;}
function noise(x,y,s){const ix=Math.floor(x),iy=Math.floor(y),tx=x-ix,ty=y-iy,u=tx*tx*(3-2*tx),v=ty*ty*(3-2*ty);return (hash(ix,iy,s)*(1-u)+hash(ix+1,iy,s)*u)*(1-v)+(hash(ix,iy+1,s)*(1-u)+hash(ix+1,iy+1,s)*u)*v;}
function smooth(a,b,v){const t=clamp((v-a)/Math.max(.001,b-a));return t*t*(3-2*t);}
function process(data,w,h,settings){
 const p={...defaults,...settings};if(p.amount===0)return new Uint8ClampedArray(data);const n=w*h,g=p.amount/100,unit=Math.max(w,h)/900,lum=new Float32Array(n),edge=new Float32Array(n),mask=new Float32Array(n),warped=new Float32Array(n),sampleIndices=new Int32Array(n),alpha=new Float32Array(n);
 for(let i=0;i<n;i++){const k=i*4;lum[i]=clamp(((data[k]*.2126+data[k+1]*.7152+data[k+2]*.0722)/255-.5)*(1+p.contrast/40)+.5);alpha[i]=data[k+3]/255;}
 const sample=(a,x,y)=>{x=clamp(x,0,w-1);y=clamp(y,0,h-1);const ix=x|0,iy=y|0,tx=x-ix,ty=y-iy,j=iy*w+ix,jx=iy*w+Math.min(w-1,ix+1),jy=Math.min(h-1,iy+1)*w;return(a[j]*(1-tx)+a[jx]*tx)*(1-ty)+(a[jy+ix]*(1-tx)+a[jy+Math.min(w-1,ix+1)]*tx)*ty;};
 const step=Math.max(.5,unit*(1+(100-p.detail)/10));
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;edge[i]=clamp(Math.hypot(sample(lum,x+step,y)-sample(lum,x-step,y),sample(lum,x,y+step)-sample(lum,x,y-step))*2.2);const l=lum[i],t=p.threshold/255,soft=.005+p.softness/240;let m=p.source==='edges'?smooth(.12,.55,edge[i]):p.source==='light'?smooth(t-soft,t+soft,l):1-smooth(t-soft,t+soft,l);if(p.source==='tones')m=1-l;mask[i]=clamp(m+(1-m)*edge[i]*p.edges/100)*alpha[i];}
 const freq=.005+(100-p.wavelength)*.00035,stretch=1+p.stretch/140*g;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const xx=x/unit,yy=y/unit,i=y*w+x,field=noise(xx*.009,yy*.009,p.seed),angle=field*Math.PI*4;
  const dx=(Math.sin(yy*freq+field*3)*p.bend*.45+Math.cos(angle)*p.flow*.34+Math.asin(Math.sin(yy*freq*2))*p.zigzag*.36)*unit*g;
  const dy=(Math.cos(xx*freq*.7+field*2)*p.bend*.17+Math.sin(angle)*p.flow*.2)*unit*g;
  const sx=(x-w/2)/stretch+w/2+dx,sy=y+dy;
  warped[i]=sample(mask,sx,sy);sampleIndices[i]=(clamp(Math.round(sy),0,h-1)*w+clamp(Math.round(sx),0,w-1))*4;
 }
 // Rootlets begin at actual image contours and follow a smoothly changing field.
 if(p.branching&&g){const candidates=[];for(let yn=3;yn<h/unit-3;yn+=3)for(let xn=3;xn<w/unit-3;xn+=3){const x=xn*unit,y=yn*unit;if(sample(warped,x,y)>.55&&(sample(warped,x-2*unit,y)<.2||sample(warped,x+2*unit,y)<.2||sample(warped,x,y-2*unit)<.2||sample(warped,x,y+2*unit)<.2))candidates.push({x,y});}
  const stroke=(ax,ay,bx,by,r)=>{const dx=bx-ax,dy=by-ay,len=dx*dx+dy*dy;for(let y=Math.max(0,Math.floor(Math.min(ay,by)-r-1));y<=Math.min(h-1,Math.ceil(Math.max(ay,by)+r+1));y++)for(let x=Math.max(0,Math.floor(Math.min(ax,bx)-r-1));x<=Math.min(w-1,Math.ceil(Math.max(ax,bx)+r+1));x++){const t=clamp(((x-ax)*dx+(y-ay)*dy)/Math.max(.01,len)),d=Math.hypot(x-ax-t*dx,y-ay-t*dy);warped[y*w+x]=Math.max(warped[y*w+x],clamp(r+.5-d));}};
  const grow=(x,y,angle,len,radius,s,fork)=>{const steps=24;for(let j=0;j<steps;j++){const t=j/steps;angle+=(noise(x/unit*.017,y/unit*.017,s)-.5)*(.3+p.flow*.009)+Math.sin(t*5+s)*p.bend*.0008;const nx=x+Math.cos(angle)*len/steps,ny=y+Math.sin(angle)*len/steps;stroke(x,y,nx,ny,Math.max(.25*unit,radius*(1-t)**1.4));x=nx;y=ny;if(fork&&j===11&&hash(s,12,p.seed)<p.forks/100)grow(x,y,angle+(hash(s,14,p.seed)>.5?1:-1),len*.45,radius*.6,s+37,false);}};
  const count=Math.round(p.branching*2*g);for(let k=0;k<count&&candidates.length;k++){const {x,y}=candidates[Math.floor(hash(k,8,p.seed)*candidates.length)],gx=sample(warped,x+2*unit,y)-sample(warped,x-2*unit,y),gy=sample(warped,x,y+2*unit)-sample(warped,x,y-2*unit);grow(x,y,Math.atan2(-gy,-gx),(8+p.length*1.6)*unit*(.4+hash(k,5,p.seed)*.6)*g,(1+hash(k,3,p.seed)*3)*unit,p.seed+k,true);}
 }
 const ink=[1,3,5].map(i=>parseInt(p.ink.slice(i,i+2),16)),paper=[1,3,5].map(i=>parseInt(p.paper.slice(i,i+2),16)),out=new Uint8ClampedArray(n*4);
 const scale=unit*(1+p.poreSize*.12);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x,j=i*4,xx=x/unit,yy=y/unit,src=sampleIndices[i];let m=warped[i];
  const coarse=noise(x/scale,y/scale,p.seed+93),fine=hash(Math.floor(xx),Math.floor(yy),p.seed+611),tear=noise(xx*.17,yy*.17,p.seed+11);
  if(m>.005)m=clamp(m-(tear-.42)*p.ragged*.022*g);
  const pores=1-smooth(.76-p.porosity*.0028,.84-p.porosity*.0028,coarse);
  m*=1-g*(p.porosity?1-pores:0);m*=1-g*p.grain/100*(fine<.37?1:.1);
  if(p.dust&&m<.1){const nearby=(sample(warped,x+unit*7,y)+sample(warped,x-unit*7,y)+sample(warped,x,y+unit*7)+sample(warped,x,y-unit*7))/4;if(fine>1-p.dust*.0025*g)m=Math.max(m,nearby*(.2+hash(x,y,p.seed+1)*.6));}
  const tone=(1-lum[src/4])*.85+.1;m=m*(1-p.tones/100)+m*tone*p.tones/100;
  const bark=noise(xx*.06+noise(xx*.011,yy*.02,p.seed)*7,yy*.4,p.seed+81),fiber=Math.pow(Math.abs(Math.sin(xx*.85+noise(xx*.016,yy*.03,p.seed+2)*20)),12);
  const shade=clamp(1+(bark-.5)*p.bark*.025*g-p.fibers*.007*fiber*g,.12,1.65),light=(bark-.5)*p.relief*.9*p.bark/100*g;
  for(let c=0;c<3;c++){const solid=clamp(ink[c]*shade+light,0,255),color=solid*(1-p.color/100)+data[src+c]*p.color/100,treated=p.transparent?color:paper[c]*(1-m)+color*m;out[j+c]=data[j+c]*(1-g)+treated*g;}
  out[j+3]=p.transparent?(alpha[i]*(1-g)+m*g)*255:(alpha[i]*(1-g)+g)*255;
 }
 return out;
}
root.ArborPhoto={defaults,presets,process};
})(typeof self!=='undefined'?self:globalThis);
