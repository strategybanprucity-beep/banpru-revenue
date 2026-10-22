import {env} from 'cloudflare:workers';
import {bookingNoticeText,sendLineMessage,type BookingNotice} from './line-message';
// A notification failure must never turn a committed booking into a failed request.
export async function notifyBooking(id:string){
 if(!env.LINE_CHANNEL_ACCESS_TOKEN||!env.LINE_GROUP_ID||!env.DB)return;
 try{
  const b=await env.DB.prepare('SELECT b.id,b.start_at,b.end_at,b.status,b.purpose,b.department,b.external_department,b.name,v.name AS venue_name,v.location FROM bookings b JOIN venues v ON v.id=b.venue_id WHERE b.id=?').bind(id).first<BookingNotice>();
  if(!b)return;
  const result=await sendLineMessage(env.LINE_CHANNEL_ACCESS_TOKEN,env.LINE_GROUP_ID,bookingNoticeText(b),crypto.randomUUID());
  await env.DB.prepare('INSERT INTO admin_audit_log (id,actor_id,action,target_type,target_id,details,created_at) VALUES (?,?,?,?,?,?,?)').bind(crypto.randomUUID(),'system',result.ok?'line_sent':'line_failed','booking',id,JSON.stringify({status:result.status,bookingStatus:b.status}),new Date().toISOString()).run();
 }catch{console.error('line_notification_failed');}
}
