import {bookingReminderText,sendLineMessage,type BookingNotice} from './line-message.ts';
// A five-minute recovery window tolerates delayed cron invocations and short outages.
export function reminderWindow(time:number){return {after:new Date(time+55*60000).toISOString(),until:new Date(time+60*60000).toISOString()};}
export async function sendBookingReminders(env:Cloudflare.Env,scheduledTime:number,request:typeof fetch=fetch){
 if(!env.DB||!env.LINE_CHANNEL_ACCESS_TOKEN||!env.LINE_GROUP_ID)throw new Error('LINE reminders are not configured');
 const d=env.DB,{after,until}=reminderWindow(scheduledTime);
 const due=await d.prepare("SELECT b.id,b.start_at FROM bookings b WHERE b.status='approved' AND b.start_at>? AND b.start_at<=? AND NOT EXISTS (SELECT 1 FROM line_booking_reminders r WHERE r.booking_id=b.id AND r.start_at=b.start_at AND r.sent_at IS NOT NULL) ORDER BY b.start_at,b.id LIMIT 50").bind(after,until).all<{id:string;start_at:string}>();
 let sent=0,failed=0;
 for(const item of due.results){
  await d.prepare('INSERT OR IGNORE INTO line_booking_reminders (booking_id,start_at,retry_key) VALUES (?,?,?)').bind(item.id,item.start_at,crypto.randomUUID()).run();
  const now=Date.now();
  const claim=await d.prepare('UPDATE line_booking_reminders SET lease_until=? WHERE booking_id=? AND start_at=? AND sent_at IS NULL AND lease_until<? RETURNING retry_key').bind(now+60000,item.id,item.start_at,now).first<{retry_key:string}>();
  if(!claim)continue;
  // Recheck current approval and start time after claiming, including on retries.
  const b=await d.prepare("SELECT b.id,b.start_at,b.end_at,b.status,b.purpose,b.department,b.external_department,b.name,b.phone,v.name AS venue_name,v.location FROM bookings b JOIN venues v ON v.id=b.venue_id WHERE b.id=? AND b.start_at=? AND b.status='approved'").bind(item.id,item.start_at).first<BookingNotice>();
  if(!b){await d.prepare('UPDATE line_booking_reminders SET lease_until=0 WHERE booking_id=? AND start_at=?').bind(item.id,item.start_at).run();continue;}
  const result=await sendLineMessage(env.LINE_CHANNEL_ACCESS_TOKEN,env.LINE_GROUP_ID,bookingReminderText(b),claim.retry_key,request);
  await d.prepare('UPDATE line_booking_reminders SET sent_at=?,lease_until=0,last_status=? WHERE booking_id=? AND start_at=?').bind(result.ok?new Date().toISOString():null,result.status,item.id,item.start_at).run();
  if(result.ok)sent++;else failed++;
 }
 if(failed)throw new Error('LINE reminder delivery failed: '+failed);
 return {sent};
}
