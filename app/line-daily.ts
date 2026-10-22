import {bookingDetails,sendLineMessage,type BookingNotice} from './line-message.ts';
export function dailyWindow(time:number){
 const day=new Date(time+7*3600000).toISOString().slice(0,10);
 const start=new Date(day+'T00:00:00+07:00').toISOString();
 return {day,start,end:new Date(Date.parse(start)+86400000).toISOString()};
}
export function dailyMessages(rows:BookingNotice[],day:string){
 if(!rows.length)return [];
 const date=new Intl.DateTimeFormat('th-TH',{dateStyle:'long',timeZone:'Asia/Bangkok'}).format(new Date(day+'T00:00:00+07:00'));
 const heading='📋 สรุปการจองประจำวัน\n'+date+' · '+rows.length+' รายการ\n';
 const messages:string[]=[];let current=heading;
 rows.forEach((b,index)=>{const entry='\n'+(index+1)+'. '+bookingDetails(b,true)+'\n';if((current+entry).length>4500){messages.push(current);current=heading+'(ต่อ)\n';}current+=entry;});
 messages.push(current);return messages;
}
export async function sendDailySummary(env:Cloudflare.Env,scheduledTime:number,request:typeof fetch=fetch){
 if(!env.DB||!env.LINE_CHANNEL_ACCESS_TOKEN||!env.LINE_GROUP_ID)throw new Error('LINE daily summary is not configured');
 const d=env.DB,{day,start,end}=dailyWindow(scheduledTime);
 let record=await d.prepare('SELECT payload,next_part,completed_at FROM line_daily_deliveries WHERE day=?').bind(day).first<{payload:string;next_part:number;completed_at:string|null}>();
 if(record?.completed_at)return {skipped:'already_sent'};
 if(!record){
  const rows=await d.prepare("SELECT b.id,b.start_at,b.end_at,b.status,b.purpose,b.department,b.external_department,b.name,b.phone,v.name AS venue_name,v.location FROM bookings b JOIN venues v ON v.id=b.venue_id WHERE b.status IN ('pending','approved') AND b.start_at<? AND b.end_at>? ORDER BY b.start_at,v.name,b.id").bind(end,start).all<BookingNotice>();
  const messages=dailyMessages(rows.results,day);if(!messages.length)return {skipped:'no_bookings'};
  const payload=JSON.stringify(messages.map(text=>({text,key:crypto.randomUUID()})));
  await d.prepare('INSERT OR IGNORE INTO line_daily_deliveries (day,payload) VALUES (?,?)').bind(day,payload).run();
 }
 const now=Date.now();
 record=await d.prepare('UPDATE line_daily_deliveries SET lease_until=? WHERE day=? AND completed_at IS NULL AND lease_until<? RETURNING payload,next_part,completed_at').bind(now+300000,day,now).first();
 if(!record)return {skipped:'in_progress'};
 const parts=JSON.parse(record.payload) as {text:string;key:string}[];
 for(let i=record.next_part;i<parts.length;i++){
  const result=await sendLineMessage(env.LINE_CHANNEL_ACCESS_TOKEN,env.LINE_GROUP_ID,parts[i].text,parts[i].key,request);
  if(!result.ok){await d.prepare('UPDATE line_daily_deliveries SET lease_until=0,last_status=? WHERE day=?').bind(result.status,day).run();throw new Error('LINE daily delivery failed: '+result.status);}
  await d.prepare('UPDATE line_daily_deliveries SET next_part=?,last_status=? WHERE day=?').bind(i+1,result.status,day).run();
 }
 await d.prepare('UPDATE line_daily_deliveries SET completed_at=?,lease_until=0,payload=? WHERE day=?').bind(new Date().toISOString(),'[]',day).run();
 return {sent:parts.length};
}
