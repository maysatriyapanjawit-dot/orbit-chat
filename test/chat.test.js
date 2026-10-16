import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
const data=mkdtempSync(path.join(tmpdir(),'orbit-test-')),port=3137,base=`http://127.0.0.1:${port}`;
let child;
async function start(){child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port),DATA_DIR:data,NODE_ENV:'test'},stdio:'pipe'});await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);child.once('exit',code=>reject(new Error('Server exited '+code)));});}
async function stop(){await new Promise(resolve=>{child.once('exit',resolve);child.kill();});}
async function request(route,data,cookie){const r=await fetch(base+'/api/'+route,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
test('multi-user chat, unique names, authorisation, live events and restart persistence',async()=>{
try{await start();
const pass='fictional-test-password';
const a=await request('register',{name:'TestFox',password:pass}),b=await request('register',{name:'TestOwl',password:pass});assert.equal(a.status,200);assert.equal(b.status,200);
assert.equal((await request('register',{name:'testfox',password:pass})).status,409);
const race=await Promise.all([request('register',{name:'SameName',password:pass}),request('register',{name:'samename',password:pass})]);assert.deepEqual(race.map(x=>x.status).sort(),[200,409]);
assert.equal((await request('messages')).status,401);
assert.equal((await request('login',{name:'TestFox',password:'wrong-password'})).status,401);
const abort=new AbortController();const stream=await fetch(base+'/api/events',{headers:{Cookie:b.cookie},signal:abort.signal});const reader=stream.body.getReader();await reader.read();
const sent=await request('messages',{channel:'general',text:'Hello <script> safely displayed as text'},a.cookie);assert.equal(sent.status,201);
const update=await reader.read();assert.match(new TextDecoder().decode(update.value),/refresh/);abort.abort();
assert.equal((await request('messages',null,b.cookie)).body[0].text,sent.body.text);
assert.equal((await request('delete',{id:sent.body.id},b.cookie)).status,403);
assert.equal((await request('messages',{channel:'missing',text:'bad'},a.cookie)).status,400);
assert.equal((await request('messages',{channel:'general',text:'x'.repeat(2001)},a.cookie)).status,400);
assert.equal((await fetch(base+'/data/chat.json')).status,404);
await stop();await start();const login=await request('login',{name:'TESTFOX',password:pass});assert.equal(login.status,200);
assert.equal((await request('messages',null,login.cookie)).body.length,1);
assert.equal((await request('delete',{id:sent.body.id},login.cookie)).status,200);
assert.equal((await request('messages',null,login.cookie)).body.length,0);
await request('logout',{},login.cookie);assert.equal((await request('messages',null,login.cookie)).status,401);
}finally{if(child?.exitCode===null)await stop();rmSync(data,{recursive:true,force:true});}
});
