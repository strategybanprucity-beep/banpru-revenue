import {env} from 'cloudflare:workers';
import {getAppUser,digest} from '../../../user-auth';
import {DRIVE_OWNER,driveCredentials} from '../../../drive-connection';
import {DRIVE_FILE_SCOPE} from '../../../drive-scope';
export const dynamic='force-dynamic';
async function start(req:Request,revoke:boolean){
 const user=await getAppUser();if(!user)return Response.redirect(new URL('/auth',req.url),303);
 if(!await env.DB?.prepare("SELECT 1 FROM auth_users WHERE id=? AND active=1 AND role='super_admin'").bind(user.userId).first())return new Response('Super admin only',{status:403});
 if(!env.GOOGLE_CLIENT_ID||!env.GOOGLE_CLIENT_SECRET||!env.GOOGLE_TOKEN_KEY||!env.GOOGLE_PICKER_KEY)return new Response('Google connection is not configured',{status:503});
 const old=await env.DB!.prepare("SELECT value FROM site_settings WHERE key='google_drive_token'").first();
 const limited=await env.DB!.prepare("SELECT value FROM site_settings WHERE key='google_drive_scope'").first<{value:string}>();
 if(old&&limited?.value!==DRIVE_FILE_SCOPE){
  if(!revoke)return Response.redirect(new URL('/admin/drive',req.url),303);
  const credentials=await driveCredentials();
  const response=await fetch('https://oauth2.googleapis.com/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:credentials.GOOGLE_REFRESH_TOKEN!})});
  if(!response.ok)return new Response('ยังยกเลิกสิทธิ์เดิมไม่สำเร็จ กรุณาลองใหม่',{status:503});
  await env.DB!.batch([env.DB!.prepare("DELETE FROM site_settings WHERE key IN ('google_drive_token','google_drive_scope','google_drive_pending','google_drive_folders')"),env.DB!.prepare("INSERT INTO admin_audit_log (id,actor_id,action,target_type,target_id,details,created_at) VALUES (?,?,'revoke','google_drive','broad_scope','{}',?)").bind(crypto.randomUUID(),user.userId,new Date().toISOString())]);
 }
 const state=crypto.randomUUID(),verifier=crypto.randomUUID()+crypto.randomUUID();
 const challenge=btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 await env.DB!.prepare('INSERT INTO site_settings (key,value) VALUES (?,?)').bind('google_state:'+digest(state),JSON.stringify({actor:user.userId,verifier,expires:Date.now()+600000})).run();
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');url.search=new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,redirect_uri:new URL('/api/google-drive/callback',req.url).href,response_type:'code',scope:'openid email '+DRIVE_FILE_SCOPE,include_granted_scopes:'false',access_type:'offline',prompt:'consent',login_hint:DRIVE_OWNER,state,code_challenge:challenge,code_challenge_method:'S256'}).toString();
 return new Response(null,{status:303,headers:{Location:url.href,'Cache-Control':'no-store','Set-Cookie':'banpru_drive_state='+state+'; Path=/api/google-drive; HttpOnly; Secure; SameSite=Lax; Max-Age=600'}});
}
export async function GET(req:Request){return start(req,false)}
export async function POST(req:Request){if(req.headers.get('origin')!==new URL(req.url).origin)return new Response('Forbidden',{status:403});return start(req,true)}
