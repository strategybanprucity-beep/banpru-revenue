import {env} from 'cloudflare:workers';
import {getAppUser} from '../../user-auth';
import {calendarConfig} from '../../calendar-sync';
export const dynamic='force-dynamic';
export default async function Page(){
 const u=await getAppUser();if(!u||!await env.DB?.prepare("SELECT 1 FROM auth_users WHERE id=? AND active=1 AND role='super_admin'").bind(u.userId).first())return <main className="booking-preview"><section className="panel preview-form"><h1>เฉพาะ Super admin</h1><a href="/auth">เข้าสู่ระบบผู้ดูแล</a></section></main>;
 const c=await calendarConfig();const pending=c?await env.DB!.prepare('SELECT COUNT(*) AS n FROM calendar_sync_jobs WHERE revision>synced_revision').first<{n:number}>():null;
 return <main className="booking-preview"><section className="panel preview-form"><div className="eyebrow">GOOGLE CALENDAR</div><h1>ปฏิทินการจองที่อนุมัติแล้ว</h1><p>บัญชี strategybanpru@gmail.com · ปฏิทินแยกสำหรับระบบจอง · เวลาไทย</p><p>เมื่ออนุมัติ แก้ไขเวลา ยกเลิก หรือลบรายการในเว็บ กิจกรรมใน Calendar จะปรับตาม ไม่ส่งอีเมลเชิญผู้จอง ไม่เผยแพร่ปฏิทินสู่สาธารณะ</p>{c?<><p role="status">เชื่อมต่อแล้ว · รอซิงก์ {pending?.n??0} รายการ</p><p><a className="primary" href={'https://calendar.google.com/calendar/u/0/r?cid='+encodeURIComponent(c.calendarId)} target="_blank" rel="noopener noreferrer">เปิด Google Calendar</a></p><form action="/api/google-calendar/sync" method="post"><button className="secondary">ซิงก์รายการที่รออีกครั้ง</button></form></>:<p>ขอสิทธิ์เฉพาะปฏิทินใหม่ที่แอปสร้าง โดยไม่เข้าถึงปฏิทินส่วนตัวเดิม</p>}<form action="/api/google-calendar/connect" method="post"><button className="primary">{c?'เชื่อมสิทธิ์ Google ใหม่':'เชื่อม Google Calendar'}</button></form><p><a href="/admin">กลับหน้าผู้ดูแล</a></p></section></main>;
}
