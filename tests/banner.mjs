import assert from 'node:assert/strict';
import {readPrivateJson} from '../scripts/private-json.mjs';
const input=await readPrivateJson(),base='http://127.0.0.1:5173';
async function request(path,body,cookie='',status=200){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{Origin:base,cookie,...(body&&! (body instanceof FormData)?{'Content-Type':'application/json'}:{})},...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})});assert.equal(r.status,status);return r;}
const login=async credentials=>(await request('/api/auth',{action:'login',...credentials})).headers.get('set-cookie').split(';')[0];
let owner='',admin='',previous=null;
try{owner=await login(input.super);admin=await login(input.admin);previous=(await (await request('/api/data',null,owner)).json()).heroImage;
await request('/api/data',{action:'heroImage',data:null},'',401);
await request('/api/data',{action:'heroImage',data:null},admin,403);
await request('/api/data',{action:'heroImage',data:'booking-docs/invalid'},owner,400);
await request('/api/data',{action:'heroImage',data:'site-images/missing'},owner,404);
const image=()=>{const f=new FormData();f.set('file',new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jrocAAAAASUVORK5CYII=','base64')],'banner-test.png',{type:'image/png'}));return f};
await request('/api/files?kind=banner',image(),admin,403);
const bad=new FormData();bad.set('file',new File(['invalid'],'bad.png',{type:'image/png'}));await request('/api/files?kind=banner',bad,owner,400);
const {key}=await (await request('/api/files?kind=banner',image(),owner)).json();assert(key.startsWith('site-images/'));
await request('/api/data',{action:'heroImage',data:key},owner);
assert.equal((await (await request('/api/data')).json()).heroImage,key);
assert.equal((await request('/api/files?key='+encodeURIComponent(key))).headers.get('content-type'),'image/png');
await request('/api/data',{action:'heroImage',data:null},owner);assert.equal((await (await request('/api/data')).json()).heroImage,null);
console.log('PASS: banner upload, public image display, reset, invalid content and key rejection, Super admin permissions.');
}finally{if(owner){await request('/api/data',{action:'heroImage',data:previous},owner);await request('/api/auth',{action:'logout'},owner)}if(admin)await request('/api/auth',{action:'logout'},admin)}
