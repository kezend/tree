importScripts('photo-engine.js');
onmessage=({data:{id,pixels,width,height,params}})=>{try{const result=ArborPhoto.process(pixels,width,height,params);postMessage({id,pixels:result,width,height},[result.buffer]);}catch(error){postMessage({id,error:error.message});}};
