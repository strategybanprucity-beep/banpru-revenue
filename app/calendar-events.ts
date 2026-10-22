export const CALENDAR_SCOPE='https://www.googleapis.com/auth/calendar.events.owned';
export function validCalendarScope(value:string){const scopes=value.split(/\s+/);return scopes.includes(CALENDAR_SCOPE)&&!scopes.some(s=>s.startsWith('https://www.googleapis.com/auth/calendar')&&s!==CALENDAR_SCOPE);}
export type CalendarBooking={id:string;status:string;purpose:string;venue_name:string;location:string;department:string;external_department:string;start_at:string;end_at:string};
export async function calendarEventId(id:string){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id));return 'b'+Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');}
export function calendarEvent(b:CalendarBooking){return {summary:b.purpose,location:[b.venue_name,b.location].filter(Boolean).join(' · '),description:['สถานที่: '+b.venue_name,'หน่วยงาน: '+(b.department==='หน่วยงานภายนอก'?b.external_department:b.department),'สถานะ: อนุมัติแล้ว','รหัสรายการ: '+b.id,'ดูรายละเอียด: https://revenue.banphru.workers.dev/admin'].join('\n'),start:{dateTime:b.start_at,timeZone:'Asia/Bangkok'},end:{dateTime:b.end_at,timeZone:'Asia/Bangkok'},visibility:'default',reminders:{useDefault:false},extendedProperties:{private:{bookingId:b.id}}};}
export async function writeCalendarEvent(token:string,calendarId:string,id:string,b:CalendarBooking|null,request:typeof fetch=fetch){
 const eventId=await calendarEventId(id),base='https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(calendarId)+'/events';
 const call=(url:string,method:string,body?:unknown)=>request(url,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});
 if(!b||b.status!=='approved'){const r=await call(base+'/'+eventId+'?sendUpdates=none','DELETE');if(!r.ok&&r.status!==404&&r.status!==410)throw new Error('Calendar removal failed: '+r.status);return;}
 const body=calendarEvent(b);let r=await call(base+'/'+eventId+'?sendUpdates=none','PUT',body);
 if(r.status===404){r=await call(base+'?sendUpdates=none','POST',{id:eventId,...body});if(r.status===409)r=await call(base+'/'+eventId+'?sendUpdates=none','PUT',body);}
 if(!r.ok)throw new Error('Calendar sync failed: '+r.status);
}
