export type BookingNotice={id:string;venue_name:string;location?:string;start_at:string;end_at:string;status:string;purpose?:string;department?:string;external_department?:string;name?:string;phone?:string};
export const thaiDateTime=(value:string)=>new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Bangkok'}).format(new Date(value));
export function bookingDetails(b:BookingNotice,includePhone=false){
 const statuses:Record<string,string>={pending:'รออนุมัติ',approved:'อนุมัติแล้ว',rejected:'ไม่อนุมัติ',cancelled:'ยกเลิก'};
 const location=b.location&&!b.venue_name.includes(b.location)?' '+b.location:'';
 const department=b.department==='หน่วยงานภายนอก'?b.external_department:b.department;
 return ['หัวข้อ: '+(b.purpose||'-'),'สถานที่: '+b.venue_name+location,'หน่วยงาน: '+(department||'-'),'ผู้จอง: '+(b.name||'-')+(includePhone&&b.phone?' ('+b.phone+')':''),'เริ่ม: '+thaiDateTime(b.start_at),'สิ้นสุด: '+thaiDateTime(b.end_at),'สถานะ: '+(statuses[b.status]??b.status)].join('\n');
}
export function bookingNoticeText(b:BookingNotice){
 const headings:Record<string,string>={pending:'🔔 มีคำขอจองใช้สถานที่ใหม่',approved:'✅ อนุมัติการจองใช้สถานที่',rejected:'❌ ไม่อนุมัติการจองใช้สถานที่',cancelled:'🚫 ยกเลิกการจองใช้สถานที่'};
 return [headings[b.status]??'แจ้งสถานะการจอง',bookingDetails(b),'รายละเอียดสำหรับผู้ดูแล: https://revenue.banphru.workers.dev/admin'].join('\n');
}
export async function sendLineMessage(token:string,groupId:string,text:string,retryKey:string,request:typeof fetch=fetch){
 for(let attempt=0;attempt<2;attempt++){
  try{
   const response=await request('https://api.line.me/v2/bot/message/push',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','X-Line-Retry-Key':retryKey},body:JSON.stringify({to:groupId,messages:[{type:'text',text}]}),signal:AbortSignal.timeout(5000)});
   // LINE returns 409 when this retry key was already accepted.
   if(response.ok||(response.status===409&&response.headers.has('x-line-accepted-request-id')))return {ok:true,status:response.status};
   if(response.status<500||attempt===1)return {ok:false,status:response.status};
  }catch{if(attempt===1)return {ok:false,status:0};}
 }
 return {ok:false,status:0};
}
