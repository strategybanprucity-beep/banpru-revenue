import {env} from 'cloudflare:workers';
import {getAppUser,digest} from '../../../user-auth';
import {CALENDAR_SCOPE} from '../../../calendar-events';
import {DRIVE_OWNER} from '../../../drive-connection';
export const dynamic='force-dynamic';
export async function POST(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin)return new Response('Forbidden',{status:403});
 const u=await getAppUser();if(!u||!await env.DB?.prepare("SELECT 1 FROM auth_users WHERE id=? AND active=1 AND role='super_admin'").bind(u.userId).first())return new Response('Super admin only',{status:403});
 if(!env.GOOGLE_CLIENT_ID||!env.GOOGLE_CLIENT_SECRET||!env.GOOGLE_TOKEN_KEY)return new Response('Google is not configured',{status:503});
 const state=crypto.randomUUID(),verifier=crypto.randomUUID()+crypto.randomUUID();
 const challenge=btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 await env.DB!.prepare('INSERT INTO site_settings (key,value) VALUES (?,?)').bind('calendar_state:'+digest(state),JSON.stringify({actor:u.userId,verifier,expires:Date.now()+600000})).run();
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');url.search=new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,redirect_uri:new URL('/api/google-calendar/callback',req.url).href,response_type:'code',scope:'openid email '+CALENDAR_SCOPE,include_granted_scopes:'false',access_type:'offline',prompt:'consent',login_hint:DRIVE_OWNER,state,code_challenge:challenge,code_challenge_method:'S256'}).toString();
 return new Response(null,{status:303,headers:{Location:url.href,'Cache-Control':'no-store','Set-Cookie':'banpru_calendar_state='+state+'; Path=/api/google-calendar; HttpOnly; Secure; SameSite=Lax; Max-Age=600'}});
}
