import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {readPrivateJson} from '../scripts/private-json.mjs';
const input=await readPrivateJson(),base='http://127.0.0.1:5173';
let superCookie='',adminCookie='',createdId='',venueId='',bookingId='';
const uname='test_admin_'+randomUUID().slice(0,8),firstPass=randomUUID(),secondPass=randomUUID(),thirdPass=randomUUID();
async function call(path,body,cookie='',expected=200,origin=base){
 const r=await fetch(base+path,{method:body?'POST':'GET',headers:{cookie,Origin:origin,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const raw=await r.text();let d;try{d=JSON.parse(raw)}catch{d={error:raw}}assert.equal(r.status,expected,JSON.stringify(d));return {d,cookie:r.headers.get('set-cookie')?.split(';')[0]??''};
}
try{
 superCookie=(await call('/api/auth',{action:'login',username:input.username,password:input.password})).cookie;
 assert(superCookie.includes('banphru_session'));
 const me=(await call('/api/auth',null,superCookie)).d.user;assert.equal(me.role,'super_admin');
 await call('/api/auth',{action:'setup',username:'another',password:randomUUID(),name:'test'},'',409);
 await call('/api/auth',{action:'create',username:uname,password:firstPass,name:'TEST Admin'},'',401);
 await call('/api/auth',{action:'create',username:uname,password:firstPass,name:'TEST Admin'},superCookie);
 let users=(await call('/api/auth',null,superCookie)).d.users;
 createdId=users.find(u=>u.username===uname).id;
 assert(users.every(u=>!('password_hash' in u)&&!('password' in u)));
 await call('/api/auth',{action:'create',username:uname,password:firstPass,name:'duplicate'},superCookie,409);
 await call('/api/auth',{action:'login',username:uname,password:'wrong-password'},'',401);
 adminCookie=(await call('/api/auth',{action:'login',username:uname.toUpperCase(),password:firstPass})).cookie;
 assert.equal((await call('/api/auth',null,adminCookie)).d.user.role,'admin');
 await call('/api/auth',{action:'create',username:'blocked_admin',password:firstPass,name:'blocked'},adminCookie,403);
 await call('/api/auth',{action:'reset',id:me.id,password:firstPass},adminCookie,403);
 await call('/api/auth',{action:'reset',id:me.id,password:firstPass},superCookie,403);
 await call('/api/data',{action:'venue',data:{name:'TEST AUTH',location:'local only',description:'local test',capacity:20,active:1}},adminCookie,403);
 await call('/api/data',{action:'venue',data:{name:'TEST AUTH',location:'local only',description:'local test',capacity:20,active:1}},superCookie);
 let data=(await call('/api/data',null,superCookie)).d;venueId=data.venues.find(v=>v.name==='TEST AUTH').id;
 const b={venue_id:venueId,name:'TEST',phone:'0000000000',purpose:'TEST AUTH',attendees:10,start_at:new Date(Date.now()+20*86400000).toISOString(),end_at:new Date(Date.now()+20*86400000+3600000).toISOString()};
 await call('/api/data',{action:'book',data:{...b,attendees:21}},superCookie,400);
 const race=await Promise.all([fetch(base+'/api/data',{method:'POST',headers:{Origin:base,cookie:superCookie,'Content-Type':'application/json'},body:JSON.stringify({action:'book',data:b})}),fetch(base+'/api/data',{method:'POST',headers:{Origin:base,cookie:superCookie,'Content-Type':'application/json'},body:JSON.stringify({action:'book',data:b})})]);
 assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);bookingId=(await race.find(r=>r.status===200).json()).id;
 await call('/api/data',{action:'status',id:bookingId,status:'approved'},adminCookie);
 await call('/api/data',{action:'editBooking',id:bookingId,data:{...b,purpose:'TEST AUTH edited'}},adminCookie);
 await call('/api/data',{action:'deleteBooking',id:bookingId},adminCookie,403);
 await call('/api/data',{action:'bootstrap'},adminCookie,403);
 await call('/api/auth',{action:'self',username:uname,name:'TEST',currentPassword:'wrong-password',newPassword:secondPass},adminCookie,401);
 const oldCookie=adminCookie,newUname=uname+'_new';
 adminCookie=(await call('/api/auth',{action:'self',username:newUname,name:'TEST Updated',currentPassword:firstPass,newPassword:secondPass},adminCookie)).cookie;
 assert.equal((await call('/api/auth',null,oldCookie)).d.user,null);
 await call('/api/auth',{action:'login',username:uname,password:firstPass},'',401);
 assert.equal((await call('/api/auth',null,adminCookie)).d.user.username,newUname);
 await call('/api/auth',{action:'reset',id:createdId,password:thirdPass},superCookie);
 assert.equal((await call('/api/auth',null,adminCookie)).d.user,null);
 await call('/api/auth',{action:'login',username:newUname,password:secondPass},'',401);
 adminCookie=(await call('/api/auth',{action:'login',username:newUname,password:thirdPass})).cookie;
 await call('/api/auth',{action:'update',id:createdId,username:newUname,name:'TEST Updated',active:0},superCookie);
 assert.equal((await call('/api/auth',null,adminCookie)).d.user,null);
 await call('/api/auth',{action:'login',username:newUname,password:thirdPass},'',401);
 await call('/api/auth',{action:'update',id:createdId,username:newUname,name:'TEST Updated',active:1},superCookie);
 adminCookie=(await call('/api/auth',{action:'login',username:newUname,password:thirdPass})).cookie;
 await call('/api/auth',{action:'logout'},adminCookie);
 assert.equal((await call('/api/auth',null,adminCookie)).d.user,null);
 await call('/api/auth',{action:'create',username:'blocked_csrf',password:firstPass,name:'blocked'},superCookie,403,'https://other.test');
 const forged=await fetch(base+'/api/data',{headers:{'oai-authenticated-user-id':me.id,'oai-authenticated-user-email':'forged@example.com'}});
 const forgedData=await forged.json();assert.equal(forgedData.user,null);assert.equal(forgedData.bookings.length,0);
 data=(await call('/api/data',null,superCookie)).d;const logs=JSON.stringify(data.logs);assert(!logs.includes(firstPass)&&!logs.includes(secondPass)&&!logs.includes(thirdPass));
 assert(data.logs.some(l=>l.action==='create_admin'));assert(data.logs.some(l=>l.action==='reset_admin_password'));
 console.log('PASS: real sign-in, duplicate protection, Super admin/Admin permissions, booking approval/edit/overlap, own username/password change, old-session revocation, reset, suspend/reactivate, logout, CSRF, forged-header rejection and password-free audit.');
}finally{
 const dir='.wrangler/state/v3/d1/miniflare-D1DatabaseObject';
 const file=readdirSync(dir).find(n=>n.endsWith('.sqlite'));assert(file,'Local test database not found');
 const local=new DatabaseSync(dir+'/'+file);
 try{
  if(createdId){local.prepare('DELETE FROM auth_sessions WHERE user_id=?').run(createdId);local.prepare('DELETE FROM auth_users WHERE id=?').run(createdId);}
  if(bookingId)local.prepare('DELETE FROM bookings WHERE id=?').run(bookingId);
  if(venueId)local.prepare('DELETE FROM venues WHERE id=?').run(venueId);
  if(createdId)local.prepare('DELETE FROM admin_audit_log WHERE target_id=? OR actor_id=?').run(createdId,createdId);
  if(bookingId)local.prepare('DELETE FROM admin_audit_log WHERE target_id=?').run(bookingId);
  if(venueId)local.prepare('DELETE FROM admin_audit_log WHERE target_id=?').run(venueId);
 }finally{local.close()}
}
