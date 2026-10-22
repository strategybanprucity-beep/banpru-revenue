import {env} from 'cloudflare:workers';
import {openDriveToken} from './drive-connection';
import {validCalendarScope,writeCalendarEvent,type CalendarBooking} from './calendar-events';
export async function calendarConfig(e:Cloudflare.Env=env){const row=await e.DB?.prepare("SELECT value FROM site_settings WHERE key='google_calendar_connection'").first<{value:string}>();return row?JSON.parse(row.value) as {token:string;calendarId:string;owner:string}:null;}
export async function calendarAccessToken(e:Cloudflare.Env,encrypted:string){
 const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:e.GOOGLE_CLIENT_ID!,client_secret:e.GOOGLE_CLIENT_SECRET!,refresh_token:await openDriveToken(encrypted),grant_type:'refresh_token'}),signal:AbortSignal.timeout(10000)});
 const token=await r.json() as {access_token?:string;scope?:string};if(!r.ok||!token.access_token||!validCalendarScope(token.scope??''))throw new Error('Calendar authorization unavailable');return token.access_token;
}
export async function queueCalendarSync(id:string){try{if(!env.DB||!await calendarConfig())return;await env.DB.prepare('INSERT INTO calendar_sync_jobs (booking_id,updated_at) VALUES (?,?) ON CONFLICT(booking_id) DO UPDATE SET revision=revision+1,updated_at=excluded.updated_at').bind(id,new Date().toISOString()).run();await processCalendarSync(env);}catch{console.error('calendar_sync_queued_retry_required');}}
export async function processCalendarSync(e:Cloudflare.Env){
 if(!e.DB)return;const config=await calendarConfig(e);if(!config)return;
 const now=Date.now(),key='calendar_sync_lock';await e.DB.prepare("INSERT OR IGNORE INTO site_settings (key,value) VALUES (?, '0')").bind(key).run();
 const lock=await e.DB.prepare('UPDATE site_settings SET value=? WHERE key=? AND CAST(value AS INTEGER)<? RETURNING key').bind(String(now+120000),key,now).first();if(!lock)return;
 try{
  const jobs=await e.DB.prepare('SELECT booking_id,revision FROM calendar_sync_jobs WHERE revision>synced_revision ORDER BY updated_at LIMIT 25').all<{booking_id:string;revision:number}>();if(!jobs.results.length)return;
  const token=await calendarAccessToken(e,config.token);
  for(const job of jobs.results){try{
   const b=await e.DB.prepare('SELECT b.id,b.status,b.purpose,b.department,b.external_department,b.start_at,b.end_at,v.name AS venue_name,v.location FROM bookings b JOIN venues v ON v.id=b.venue_id WHERE b.id=?').bind(job.booking_id).first<CalendarBooking>();
   await writeCalendarEvent(token,config.calendarId,job.booking_id,b);
   await e.DB.prepare('UPDATE calendar_sync_jobs SET synced_revision=?,last_error=NULL WHERE booking_id=?').bind(job.revision,job.booking_id).run();
  }catch{await e.DB.prepare("UPDATE calendar_sync_jobs SET last_error='Google Calendar sync failed' WHERE booking_id=?").bind(job.booking_id).run();}}
 }finally{await e.DB.prepare("UPDATE site_settings SET value='0' WHERE key=? AND value=?").bind(key,String(now+120000)).run();}
}
