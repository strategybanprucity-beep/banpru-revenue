export const bangkokDay=(now=Date.now())=>new Date(now+7*3600000).toISOString().slice(0,10);
export function calendarToday(now=Date.now()){const [year,month,day]=bangkokDay(now).split('-').map(Number);return new Date(year,month-1,day)}
export function bookingTimeError(start:string,end:string,now=Date.now()){
 const from=Date.parse(start),to=Date.parse(end);
 if(!Number.isFinite(from)||!Number.isFinite(to))return 'กรุณาเลือกวันและเวลาให้ครบถ้วน';
 if(from<now)return 'ไม่สามารถจองวันหรือเวลาย้อนหลังได้ กรุณาเลือกเวลาเริ่มในอนาคต';
 if(to<=from)return 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มจอง';
 return null;
}
