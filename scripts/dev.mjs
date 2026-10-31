import http from 'node:http';import fs from 'node:fs';
import worker from '../worker/index.js';
const env={...process.env,LOCAL_PREVIEW:'1'};
if(fs.existsSync('.env.local'))for(const line of fs.readFileSync('.env.local','utf8').split('\n')){const m=line.match(/^([A-Z_]+)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^['"]|['"]$/g,'');}
const server=http.createServer(async(req,res)=>{try{const chunks=[];for await(const chunk of req){chunks.push(chunk);if(chunks.reduce((n,x)=>n+x.length,0)>30000){res.writeHead(413);res.end();return;}}const body=Buffer.concat(chunks);const request=new Request('http://'+req.headers.host+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{} )});const response=await worker.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500);res.end('Server error');}});
server.listen(Number(env.PORT||4173),'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+(env.PORT||4173)));
