import {hasOnlyFileDriveScope} from '../../../drive-scope';
import {env} from 'cloudflare:workers';
import {cookies} from 'next/headers';
import {getAppUser,digest} from '../../../user-auth';
import {DRIVE_OWNER,sealDriveToken} from '../../../drive-connection';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const headers={'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Set-Cookie':'banpru_drive_state=; Path=/api/google-drive; HttpOnly; Secure; SameSite=Lax; Max-Age=0'};
 const fail=(text:string,status=400)=>new Response(text,{status,headers});
 try{
 const url=new URL(req.url),state=url.searchParams.get('state')??'',user=await getAppUser();
 if(!user||!state||state!==(await cookies()).get('banpru_drive_state')?.value)return fail('การยืนยันไม่ถูกต้อง กรุณาเริ่มเชื่อมต่อใหม่');
 if(!await env.DB?.prepare("SELECT 1 FROM auth_users WHERE id=? AND active=1 AND role='super_admin'").bind(user.userId).first())return fail('เฉพาะ Super admin',403);
 const key='google_state:'+digest(state);const saved=await env.DB!.prepare('DELETE FROM site_settings WHERE key=? RETURNING value').bind(key).first<{value:string}>();
 if(!saved)return fail('คำขอหมดอายุ กรุณาเริ่มใหม่');const expected=JSON.parse(saved.value) as {actor:string;expires:number;verifier:string};
 if(expected.actor!==user.userId||expected.expires<Date.now())return fail('คำขอหมดอายุ');
 const code=url.searchParams.get('code');if(!code)return fail('ยังไม่ได้อนุญาต Google Drive');
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID!,client_secret:env.GOOGLE_CLIENT_SECRET!,grant_type:'authorization_code',redirect_uri:new URL('/api/google-drive/callback',req.url).href,code,code_verifier:expected.verifier})});
 const token=await response.json() as {access_token?:string;refresh_token?:string;scope?:string;refresh_token_expires_in?:number};if(!response.ok||!token.refresh_token||!token.access_token)return fail('เชื่อมต่อไม่สำเร็จ กรุณาเริ่มใหม่');
 const profileResponse=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:'Bearer '+token.access_token}});const profile=await profileResponse.json() as {email?:string;email_verified?:boolean};
 if(!profileResponse.ok||!profile.email_verified||profile.email?.toLowerCase()!==DRIVE_OWNER)return fail('กรุณาใช้บัญชี '+DRIVE_OWNER);
 if(!hasOnlyFileDriveScope(token.scope??''))return fail('Google ยังให้สิทธิ์แบบกว้าง กรุณายกเลิกการเชื่อมต่อเดิมแล้วเริ่มใหม่');
 await env.DB!.prepare("INSERT INTO site_settings (key,value) VALUES ('google_drive_pending',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify({token:await sealDriveToken(token.refresh_token),scope:token.scope,expires:Date.now()+3600000,refreshExpiresIn:token.refresh_token_expires_in??null,actor:user.userId})).run();
 return new Response(null,{status:303,headers:{...headers,Location:new URL('/admin/drive',req.url).href}});
 }catch{return fail('เชื่อม Google Drive ไม่สำเร็จ กรุณาลองใหม่',503)}
}
