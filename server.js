import http from 'node:http';
import {readFileSync,writeFileSync,renameSync,mkdirSync,existsSync} from 'node:fs';
import {randomBytes,randomUUID,scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const derive=promisify(scrypt), root=path.dirname(fileURLToPath(import.meta.url));
const dir=process.env.DATA_DIR||path.join(root,'data'); mkdirSync(dir,{recursive:true});
const file=path.join(dir,'chat.json');
let db=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{users:[],messages:[]};
const channels=['general','gaming','creative','random'],sessions=new Map(),streams=new Set(),rates=new Map();
function save(){writeFileSync(file+'.tmp',JSON.stringify(db),{mode:0o600});renameSync(file+'.tmp',file);}
function fail(message,status=400){throw Object.assign(new Error(message),{status});}
function limited(key,max,window=60000){let r=rates.get(key);if(!r||Date.now()>r.until){r={count:0,until:Date.now()+window};rates.set(key,r);}if(++r.count>max)fail('Too many requests. Please wait a minute.',429);}
function token(req){return /(?:^|; )session=([a-f0-9]+)/.exec(req.headers.cookie||'')?.[1];}
function session(req){const s=sessions.get(token(req));if(!s||s.expires<Date.now())fail('Please sign in again.',401);return s;}
function broadcast(){for(const c of streams)c.res.write('data: refresh\n\n');}
async function body(req){if(!req.headers['content-type']?.startsWith('application/json'))fail('JSON required.',415);let raw='';for await(const part of req){raw+=part;if(raw.length>10000)fail('Request too large.',413);}try{return JSON.parse(raw);}catch{fail('Invalid JSON.');}}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));}
const server=http.createServer(async(req,res)=>{
res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');
res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
try{
const url=new URL(req.url,'http://localhost'),p=url.pathname;
if(req.method==='POST'){
if(req.headers['sec-fetch-site']==='cross-site')fail('Cross-site request blocked.',403);
const b=await body(req);
if(p==='/api/register'||p==='/api/login'){
limited('auth:'+req.socket.remoteAddress,20);
const name=typeof b.name==='string'?b.name.trim():'';
if(!/^[A-Za-z0-9_]{3,20}$/.test(name))fail('Use 3–20 letters, numbers or underscores for your username.');
if(typeof b.password!=='string'||b.password.length<10||b.password.length>128)fail('Use a password of 10–128 characters.');
const key=name.toLowerCase();let user=db.users.find(u=>u.key===key);
if(p==='/api/register'){
if(user)fail('That username is taken. Choose another.',409);
if(db.users.length>=2000)fail('This server has reached its account limit.',503);
const salt=randomBytes(16).toString('hex'),hash=(await derive(b.password,salt,64)).toString('hex');
// Recheck after asynchronous hashing: concurrent registrations must not duplicate names.
if(db.users.some(u=>u.key===key))fail('That username is taken. Choose another.',409);
user={id:randomUUID(),name,key,salt,hash};db.users.push(user);save();
}else{
const hash=await derive(b.password,user?.salt||'invalid-user-salt',64);
if(!user||!timingSafeEqual(hash,Buffer.from(user.hash,'hex')))fail('Incorrect username or password.',401);
}
const t=randomBytes(32).toString('hex');sessions.set(t,{id:user.id,name:user.name,expires:Date.now()+86400000});
res.setHeader('Set-Cookie',`session=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${process.env.NODE_ENV==='production'?'; Secure':''}`);
return json(res,200,{id:user.id,name:user.name});
}
const s=session(req);
if(p==='/api/logout'){const t=token(req);sessions.delete(t);for(const c of streams)if(c.token===t)c.res.end();res.setHeader('Set-Cookie','session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true});}
if(p==='/api/messages'){
limited('send:'+s.id,30);
if(!channels.includes(b.channel))fail('Unknown channel.');
if(typeof b.text!=='string'||!b.text.trim()||b.text.length>2000)fail('Messages must contain 1–2000 characters.');
const m={id:randomUUID(),userId:s.id,name:s.name,channel:b.channel,text:b.text.trim(),time:Date.now()};
db.messages.push(m);db.messages=db.messages.slice(-5000);save();broadcast();return json(res,201,m);
}
if(p==='/api/delete'){
const m=db.messages.find(m=>m.id===b.id);if(!m)fail('Message not found.',404);if(m.userId!==s.id)fail('You can only delete your own messages.',403);
db.messages=db.messages.filter(m=>m.id!==b.id);save();broadcast();return json(res,200,{ok:true});
}
fail('Not found.',404);
}
if(req.method!=='GET')fail('Method not allowed.',405);
if(p==='/api/health')return json(res,200,{ok:true,app:'orbit-chat'});
if(p==='/api/me')return json(res,200,session(req));
if(p==='/api/messages'){session(req);return json(res,200,db.messages);}
if(p==='/api/events'){
const s=session(req);if([...streams].filter(c=>c.id===s.id).length>=5)fail('Too many open tabs.',429);
res.writeHead(200,{'Content-Type':'text/event-stream','Connection':'keep-alive','X-Accel-Buffering':'no'});
res.write('data: refresh\n\n');const c={id:s.id,token:token(req),res};streams.add(c);
const tick=setInterval(()=>{if(s.expires<Date.now())return res.end();res.write(': keepalive\n\n');},20000);
res.on('close',()=>{clearInterval(tick);streams.delete(c);});return;
}
const assets={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/style.css':'style.css'};
if(!assets[p])fail('Not found.',404);
res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html');res.end(readFileSync(path.join(root,'docs',assets[p])));
}catch(e){if(!res.headersSent)json(res,e.status||500,{error:e.status?e.message:'Server error. Please try again.'});else res.end();}
});
setInterval(()=>{for(const [k,v]of rates)if(v.until<Date.now())rates.delete(k);for(const[k,v]of sessions)if(v.expires<Date.now())sessions.delete(k);},60000).unref();
server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Orbit Chat is running.'));
