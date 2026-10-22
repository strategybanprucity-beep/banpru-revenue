import {env} from 'cloudflare:workers';
import {getAppUser} from '../../../user-auth';
import {processCalendarSync} from '../../../calendar-sync';
export async function POST(req:Request){if(req.headers.get('origin')!==new URL(req.url).origin)return new Response('Forbidden',{status:403});const u=await getAppUser();if(!u||!await env.DB?.prepare("SELECT 1 FROM auth_users WHERE id=? AND active=1 AND role='super_admin'").bind(u.userId).first())return new Response('Forbidden',{status:403});try{await processCalendarSync(env);return Response.redirect(new URL('/admin/calendar',req.url),303);}catch{return new Response('ยังซิงก์ไม่ได้ กรุณาตรวจการเชื่อม Google แล้วลองใหม่',{status:503});}}
