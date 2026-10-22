export type BookingNotice={id:string;venue_name:string;start_at:string;end_at:string;status:string};
export function bookingNoticeText(b:BookingNotice){
 const statuses:Record<string,string>={pending:'มีรายการจองใหม่ — รออนุมัติ',approved:'อนุมัติแล้ว',rejected:'ไม่อนุมัติ',cancelled:'ยกเลิกแล้ว'};
 const format=(value:string)=>new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Bangkok'}).format(new Date(value));
 return ['เทศบาลเมืองบ้านพรุ Venue Booking',statuses[b.status]??b.status,'สถานที่: '+b.venue_name,'เริ่ม: '+format(b.start_at),'สิ้นสุด: '+format(b.end_at),'รหัสรายการ: '+b.id,'รายละเอียดสำหรับผู้ดูแล: https://revenue.banphru.workers.dev/admin'].join('\n');
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
