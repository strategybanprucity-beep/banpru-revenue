import {readPrivateJson} from './private-json.mjs';
const base='http://127.0.0.1:5173';
const sign=await fetch(base+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});
const cookie=sign.headers.get('set-cookie')?.split(';')[0]??'';
async function get(){const r=await fetch(base+'/api/data',{headers:{cookie}});if(!r.ok)throw new Error('โหลดข้อมูลไม่สำเร็จ');return r.json()}
async function post(body){const r=await fetch(base+'/api/data',{method:'POST',headers:{'Content-Type':'application/json',Origin:base,cookie},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw new Error(j.error);return j;}
let d=await get();if(!d.user)throw new Error('กรุณาเข้าสู่ระบบ');
if(d.role!=='super_admin')throw new Error('ต้องใช้ Super admin');
if(d.venues.some(v=>v.description.includes('[SAMPLE]'))){console.log('ข้อมูลตัวอย่างมีอยู่แล้ว ไม่เพิ่มซ้ำ');process.exit(0)}
const venues=[
{name:'ห้องประชุมราชพฤกษ์',location:'อาคารเทศบาล ชั้น 2',capacity:120,description:'[SAMPLE] ข้อมูลตัวอย่าง — ห้องประชุมใหญ่ พร้อมระบบเสียง ไมโครโฟน และจอภาพ สำหรับประชุมและอบรม',active:1},
{name:'ห้องประชุมอินทนิล',location:'อาคารเทศบาล ชั้น 1',capacity:25,description:'[SAMPLE] ข้อมูลตัวอย่าง — ห้องประชุมทีมและเวิร์กช็อป พร้อมจอภาพ โต๊ะประชุม และ Wi-Fi',active:1},
{name:'ลานกิจกรรมชุมชน',location:'พื้นที่อเนกประสงค์ด้านหน้าอาคาร',capacity:200,description:'[SAMPLE] ข้อมูลตัวอย่าง — พื้นที่กลางแจ้งสำหรับกิจกรรมชุมชน ต้องตรวจสอบสภาพอากาศก่อนใช้งาน',active:1}
];
for(const v of venues)await post({action:'venue',data:v});
d=await get();const byName=Object.fromEntries(d.venues.map(v=>[v.name,v.id]));
const day=(plus,hour)=>{const n=new Date(Date.now()+7*3600000+plus*86400000).toISOString().slice(0,10);return new Date(n+'T'+hour+':00:00+07:00').toISOString()};
const rows=[
{venue:'ห้องประชุมราชพฤกษ์',day:1,start:'09',end:'12',purpose:'[SAMPLE] ประชุมวางแผนงานประจำเดือน',attendees:80,status:'approved'},
{venue:'ห้องประชุมอินทนิล',day:2,start:'13',end:'16',purpose:'[SAMPLE] อบรมการใช้งานระบบจองสถานที่',attendees:20,status:'pending'},
{venue:'ลานกิจกรรมชุมชน',day:3,start:'08',end:'12',purpose:'[SAMPLE] กิจกรรมพบปะชุมชน',attendees:150,status:'approved'},
{venue:'ห้องประชุมราชพฤกษ์',day:4,start:'09',end:'11',purpose:'[SAMPLE] เสวนาแลกเปลี่ยนความคิดเห็น',attendees:60,status:'rejected'},
{venue:'ห้องประชุมอินทนิล',day:5,start:'10',end:'12',purpose:'[SAMPLE] ประชุมคณะทำงาน',attendees:12,status:'cancelled'}
];
for(const [i,b] of rows.entries()){
const r=await post({action:'book',data:{venue_id:byName[b.venue],name:'ผู้จองตัวอย่าง '+String(i+1).padStart(2,'0'),phone:'0000000000',purpose:b.purpose,attendees:b.attendees,start_at:day(b.day,b.start),end_at:day(b.day,b.end)}});
if(b.status!=='pending')await post({action:'status',id:r.id,status:b.status,note:b.status==='rejected'?'ข้อมูลตัวอย่าง: ขอปรับรายละเอียดกิจกรรมก่อนยื่นใหม่':b.status==='cancelled'?'ข้อมูลตัวอย่าง: ผู้จองเลื่อนกำหนดกิจกรรม':'ข้อมูลตัวอย่าง: อนุมัติสำหรับการสาธิตระบบ'});
}
d=await get();console.log(JSON.stringify({sampleVenues:d.venues.filter(v=>v.description.includes('[SAMPLE]')).length,sampleBookings:d.bookings.filter(b=>b.purpose.includes('[SAMPLE]')).length,statuses:d.bookings.filter(b=>b.purpose.includes('[SAMPLE]')).map(b=>b.status)},null,2));
