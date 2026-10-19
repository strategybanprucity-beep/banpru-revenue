import { env } from 'cloudflare:workers';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { authDb,currentUser,hashPassword,verifyPassword,makeSession,clearCookie,authLog,limited,digest,equal,SESSION_COOKIE } from '../../user-auth';
export const dynamic='force-dynamic';
const username=z.string().trim().toLowerCase().max(254).refine(v=>/^[a-z0-9_.-]{3,32}$/.test(v)||z.string().email().safeParse(v).success);
const password=z.string().min(6).max(128);
const name=z.string().trim().min(1).max(120);
const failure=(error:string,status=400)=>Response.json({error},{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){const d=authDb();const count=await d.prepare('SELECT COUNT(*) AS n FROM auth_users').first<{n:number}>();const u=await currentUser();const users=u?.role==='super_admin'?(await d.prepare('SELECT id,username,name,role,active,created_at FROM auth_users ORDER BY created_at').all()).results:[];return Response.json({user:u,needsSetup:count?.n===0,users},{headers:{'Cache-Control':'no-store'}})}
export async function POST(req:Request){try{
 if(req.headers.get('origin')!==new URL(req.url).origin)return failure('คำขอไม่ถูกต้อง',403);
 if(Number(req.headers.get('content-length')??0)>10000)return failure('ข้อมูลยาวเกินกำหนด',413);
 const body=z.object({action:z.string(),username:z.unknown().optional(),password:z.unknown().optional(),currentPassword:z.unknown().optional(),newPassword:z.unknown().optional(),name:z.unknown().optional(),id:z.unknown().optional(),active:z.unknown().optional(),setupToken:z.unknown().optional()}).parse(await req.json());
 const d=authDb(),u=await currentUser();
 if(body.action==='logout'){const token=(await cookies()).get(SESSION_COOKIE)?.value;if(token)await d.prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(digest(token)).run();return Response.json({ok:true},{headers:{'Set-Cookie':clearCookie(req)}})}
 if(body.action==='setup'||body.action==='login'){
  const uname=username.parse(body.username),pass=password.parse(body.password);
  const ip=req.headers.get('cf-connecting-ip')??'local';
  if(await limited('ip:'+digest(ip),50)||await limited('user:'+digest(uname),10))return failure('ลองเข้าสู่ระบบมากเกินไป กรุณารอ 15 นาที',429);
  if(body.action==='setup'){
   const local=process.env.NODE_ENV==='development'&&['127.0.0.1','localhost'].includes(new URL(req.url).hostname);
   if(!local&&(!env.BOOTSTRAP_TOKEN||!equal(digest(z.string().parse(body.setupToken)),digest(env.BOOTSTRAP_TOKEN))))return failure('รหัสอนุญาตตั้งค่าระบบไม่ถูกต้อง',403);
   if(await d.prepare('SELECT 1 FROM auth_users LIMIT 1').first())return failure('ตั้งค่า Super admin แล้ว',409);
   const id=crypto.randomUUID(),hash=await hashPassword(pass),display=name.parse(body.name);
   await d.batch([d.prepare("INSERT INTO auth_users (id,username,name,password_hash,role,active,bootstrap,created_at) SELECT ?,?,?,?,'super_admin',1,1,? WHERE NOT EXISTS (SELECT 1 FROM auth_users)").bind(id,uname,display,hash,new Date().toISOString()),authLog(id,'setup_super_admin',id,{username:uname})]);
   if(!await d.prepare('SELECT id FROM auth_users WHERE id=?').bind(id).first())return failure('มีผู้ตั้งค่าระบบแล้ว',409);
   if(local)await d.prepare("UPDATE bookings SET user_id=? WHERE user_id='local_seedy'").bind(id).run();
   return Response.json({ok:true},{headers:{'Set-Cookie':await makeSession(id,req)}});
  }
  const account=await d.prepare('SELECT id,password_hash,active FROM auth_users WHERE username=?').bind(uname).first<{id:string;password_hash:string;active:number}>();
  const fallback='scrypt$16384$16$1$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000';
  const valid=await verifyPassword(pass,account?.password_hash??fallback);
  if(!account||!valid||!account.active)return failure('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',401);
  await d.prepare('DELETE FROM auth_attempts WHERE key=?').bind('user:'+digest(uname)).run();
  return Response.json({ok:true},{headers:{'Set-Cookie':await makeSession(account.id,req)}});
 }
 if(!u)return failure('กรุณาเข้าสู่ระบบ',401);
 if(body.action==='self'){
  const old=z.string().max(128).parse(body.currentPassword);const row=await d.prepare('SELECT password_hash FROM auth_users WHERE id=?').bind(u.id).first<{password_hash:string}>();
  if(await limited('self:'+u.id,10))return failure('ลองมากเกินไป กรุณารอ 15 นาที',429);
  if(!row||!await verifyPassword(old,row.password_hash))return failure('รหัสผ่านปัจจุบันไม่ถูกต้อง',401);
  const uname=username.parse(body.username),display=name.parse(body.name);const next=body.newPassword?await hashPassword(password.parse(body.newPassword)):row.password_hash;
  await d.batch([d.prepare('UPDATE auth_users SET username=?,name=?,password_hash=? WHERE id=?').bind(uname,display,next,u.id),d.prepare('DELETE FROM auth_sessions WHERE user_id=?').bind(u.id),authLog(u.id,'change_own_account',u.id,{username:uname,passwordChanged:!!body.newPassword}),d.prepare('DELETE FROM auth_attempts WHERE key=?').bind('self:'+u.id)]);
  return Response.json({ok:true},{headers:{'Set-Cookie':await makeSession(u.id,req)}});
 }
 if(u.role!=='super_admin')return failure('เฉพาะ Super admin เท่านั้น',403);
 if(body.action==='create'){
  const uname=username.parse(body.username),display=name.parse(body.name),hash=await hashPassword(password.parse(body.password)),id=crypto.randomUUID();
  await d.batch([d.prepare("INSERT INTO auth_users (id,username,name,password_hash,role,active,created_at) VALUES (?,?,?,?,'admin',1,?)").bind(id,uname,display,hash,new Date().toISOString()),authLog(u.id,'create_admin',id,{username:uname})]);return Response.json({ok:true});
 }
 const id=z.string().parse(body.id);const target=await d.prepare('SELECT role FROM auth_users WHERE id=?').bind(id).first<{role:string}>();
 if(!target||target.role!=='admin')return failure('จัดการได้เฉพาะบัญชี Admin',403);
 if(body.action==='update'){
  const uname=username.parse(body.username),display=name.parse(body.name),active=z.number().int().min(0).max(1).parse(body.active);
  await d.batch([d.prepare('UPDATE auth_users SET username=?,name=?,active=? WHERE id=?').bind(uname,display,active,id),d.prepare('DELETE FROM auth_sessions WHERE user_id=?').bind(id),authLog(u.id,'update_admin',id,{username:uname,active})]);return Response.json({ok:true});
 }
 if(body.action==='reset'){
  const hash=await hashPassword(password.parse(body.password));
  await d.batch([d.prepare('UPDATE auth_users SET password_hash=? WHERE id=?').bind(hash,id),d.prepare('DELETE FROM auth_sessions WHERE user_id=?').bind(id),authLog(u.id,'reset_admin_password',id,{})]);return Response.json({ok:true});
 }
 return failure('ไม่พบคำสั่ง');
 }catch(e){if(e instanceof z.ZodError)return failure('กรุณาตรวจข้อมูล: ใช้ชื่อผู้ใช้ 3–32 ตัวอักษรหรืออีเมล และรหัสผ่าน 6–128 ตัวอักษร');if(e instanceof Error&&e.message.includes('UNIQUE'))return failure('ชื่อผู้ใช้นี้มีอยู่แล้ว',409);console.error('auth_operation_failed');return failure('บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง',500)}}
