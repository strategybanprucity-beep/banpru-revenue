import {env} from 'cloudflare:workers';
import {cookies} from 'next/headers';
import {getAppUser,digest} from '../../../user-auth';
import {DRIVE_OWNER,sealDriveToken} from '../../../drive-connection';
import {validCalendarScope} from '../../../calendar-events';
import {TARGET_CALENDAR_ID} from '../../../calendar-target';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const headers={'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Set-Cookie':'banpru_calendar_state=; Path=/api/google-calendar; HttpOnly; Secure; SameSite=Lax; Max-Age=0'};
 const fail=(text:string)=>new Response(text,{status:400,headers});
 try{
  const url=new URL(req.url),u=await getAppUser(),state=url.searchParams.get('state')??'';
  if(!u||!state||state!==(await cookies()).get('banpru_calendar_state')?.value)return fail('การยืนยันไม่ถูกต้อง กรุณาเริ่มใหม่');
  if(!await env.DB?.prepare("SELECT 1 FROM auth_users WHERE id=? AND active=1 AND role='super_admin'").bind(u.userId).first())return fail('เฉพาะ Super admin');
  const saved=await env.DB!.prepare('DELETE FROM site_settings WHERE key=? RETURNING value').bind('calendar_state:'+digest(state)).first<{value:string}>();if(!saved)return fail('คำขอหมดอายุ');
  const expected=JSON.parse(saved.value);if(expected.actor!==u.userId||expected.expires<Date.now())return fail('คำขอหมดอายุ');
  const code=url.searchParams.get('code');if(!code)return fail('ยังไม่ได้อนุญาต Google Calendar');
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID!,client_secret:env.GOOGLE_CLIENT_SECRET!,grant_type:'authorization_code',redirect_uri:new URL('/api/google-calendar/callback',req.url).href,code,code_verifier:expected.verifier})});
  const token=await r.json() as {access_token?:string;refresh_token?:string;scope?:string};if(!r.ok||!token.access_token||!token.refresh_token||!validCalendarScope(token.scope??''))return fail('เชื่อมต่อไม่สำเร็จหรือสิทธิ์ไม่ตรงที่กำหนด');
  const profile=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:'Bearer '+token.access_token}});const p=await profile.json() as {email?:string;email_verified?:boolean};if(!profile.ok||!p.email_verified||p.email?.toLowerCase()!==DRIVE_OWNER)return fail('กรุณาใช้บัญชี '+DRIVE_OWNER);
  const calendarId=TARGET_CALENDAR_ID;
  const cr=await fetch('https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(calendarId)+'/events?maxResults=1&fields=accessRole,summary,timeZone',{headers:{Authorization:'Bearer '+token.access_token}});
  const c=await cr.json() as {accessRole?:string;summary?:string};if(!cr.ok||c.accessRole!=='owner')return fail('บัญชีนี้ไม่ได้เป็นเจ้าของปฏิทินที่กำหนด หรือยังไม่ได้ให้สิทธิ์ Calendar');
  await env.DB!.prepare("INSERT INTO site_settings (key,value) VALUES ('google_calendar_connection',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify({calendarId,owner:DRIVE_OWNER,token:await sealDriveToken(token.refresh_token)})).run();
  await env.DB!.prepare("INSERT INTO calendar_sync_jobs (booking_id,updated_at) SELECT id,? FROM bookings WHERE status='approved' AND end_at>? ON CONFLICT(booking_id) DO UPDATE SET revision=revision+1").bind(new Date().toISOString(),new Date().toISOString()).run();
  return new Response(null,{status:303,headers:{...headers,Location:new URL('/admin/calendar',req.url).href}});
 }catch{return fail('เชื่อม Calendar ไม่สำเร็จ กรุณาลองใหม่');}
}
