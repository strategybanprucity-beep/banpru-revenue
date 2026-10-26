'use client';
import {useState} from 'react';
import {reportMonth,reportRows,type ReportRow} from './model';
import './report.css';
const months=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const statuses:Record<string,string>={approved:'อนุมัติแล้ว',pending:'รออนุมัติ',rejected:'ไม่อนุมัติ',cancelled:'ยกเลิก'};
const fmt=(s:string)=>new Date(s).toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Bangkok'});
const label=(m:string)=>months[Number(m.slice(5))-1]+' '+(Number(m.slice(0,4))+543);
export default function BookingReport({rows}:{rows:ReportRow[]}){
 const current=reportMonth(new Date().toISOString());
 const [from,setFrom]=useState(current.slice(0,4)+'-01'),[to,setTo]=useState(current);
 const invalid=from>to,selected=invalid?[]:reportRows(rows,from,to);
 const years=Array.from(new Set([Number(current.slice(0,4)),Number(current.slice(0,4))+1,...rows.map(r=>Number(reportMonth(r.start_at).slice(0,4)))])).sort((a,b)=>a-b);
 const monthTotals=new Map<string,number>();
 if(!invalid){let d=new Date(from+'-01T00:00:00Z');while(d.toISOString().slice(0,7)<=to){monthTotals.set(d.toISOString().slice(0,7),0);d.setUTCMonth(d.getUTCMonth()+1)}}
 const venues=new Map<string,number>();selected.forEach(r=>{const m=reportMonth(r.start_at);monthTotals.set(m,(monthTotals.get(m)??0)+1);venues.set(r.venue_name,(venues.get(r.venue_name)??0)+1)});
 function monthSelect(value:string,onChange:(s:string)=>void,title:string){return <fieldset><legend>{title}</legend><select aria-label={title+' เดือน'} value={value.slice(5)} onChange={e=>onChange(value.slice(0,5)+e.target.value)}>{months.map((m,i)=><option key={m} value={String(i+1).padStart(2,'0')}>{m}</option>)}</select><select aria-label={title+' ปี'} value={value.slice(0,4)} onChange={e=>onChange(e.target.value+value.slice(4))}>{years.map(y=><option key={y} value={y}>{y+543}</option>)}</select></fieldset>}
 return <main className="report-page"><header className="report-header"><div><p>เทศบาลเมืองบ้านพรุ · SUPER ADMIN</p><h1>รายงานสรุปการจองใช้สถานที่</h1><p>ช่วงเดือน {label(from)} – {label(to)}</p></div><div className="report-controls"><a href="/admin">กลับหน้าผู้ดูแล</a><button disabled={invalid} onClick={()=>window.print()}>Print report to PDF</button></div></header>
 <section className="report-filters">{monthSelect(from,setFrom,'ตั้งแต่')}{monthSelect(to,setTo,'ถึง')}<p>นับตามเดือนของวันเริ่มใช้งาน (เวลาประเทศไทย) รวมทุกสถานะ</p></section>
 {invalid&&<p role="alert">กรุณาเลือกเดือนสิ้นสุดตั้งแต่เดือนเริ่มต้นเป็นต้นไป</p>}
 <section className="report-stats" aria-label="Dashboard สรุป"><article><span>รายการทั้งหมด</span><strong>{selected.length}</strong></article>{Object.entries(statuses).map(([status,text])=><article key={status}><span>{text}</span><strong>{selected.filter(r=>r.status===status).length}</strong></article>)}</section>
 <div className="report-charts"><section><h2>สรุปรายเดือน</h2><table><thead><tr><th>เดือน</th><th>จำนวนการจอง</th></tr></thead><tbody>{[...monthTotals].map(([m,n])=><tr key={m}><td>{label(m)}</td><td><div className="report-bar" style={{width:(n/Math.max(1,...monthTotals.values())*100)+'%'}}/>{n} รายการ</td></tr>)}</tbody></table></section><section><h2>สรุปตามสถานที่</h2><table><thead><tr><th>สถานที่</th><th>จำนวนการจอง</th></tr></thead><tbody>{[...venues].sort((a,b)=>b[1]-a[1]).map(([v,n])=><tr key={v}><td>{v}</td><td>{n} รายการ</td></tr>)}</tbody></table>{!venues.size&&<p>ไม่มีรายการในช่วงเดือนที่เลือก</p>}</section></div>
 <section className="report-detail"><h2>ตารางรายงานการจอง · {selected.length} รายการ</h2><div className="report-table-scroll"><table><thead><tr><th>ลำดับ</th><th>สถานที่ / หัวข้อ</th><th>เริ่ม / สิ้นสุด</th><th>ผู้จอง / หน่วยงาน</th><th>ผู้เข้าร่วม</th><th>สถานะ</th></tr></thead><tbody>{selected.map((r,i)=><tr key={r.id}><td>{i+1}</td><td><b>{r.venue_name}</b><small>{r.purpose}</small></td><td>{fmt(r.start_at)}<small>{fmt(r.end_at)}</small></td><td>{r.name}<small>{r.department==='หน่วยงานภายนอก'?r.external_department:r.department||'—'}</small></td><td>{r.attendees} คน</td><td>{statuses[r.status]??r.status}</td></tr>)}</tbody></table></div>{!selected.length&&<p>ไม่พบรายการจองในช่วงเดือนที่เลือก</p>}</section><footer>พิมพ์จากระบบจองใช้สถานที่/ห้องประชุม เทศบาลเมืองบ้านพรุ · ข้อมูล ณ {fmt(new Date().toISOString())}</footer></main>
}
