export type ReportRow={id:string;name:string;department:string;external_department:string;purpose:string;attendees:number;start_at:string;end_at:string;status:string;venue_name:string};
export function reportMonth(iso:string){return new Date(Date.parse(iso)+7*3600000).toISOString().slice(0,7)}
export function reportRows(rows:ReportRow[],from:string,to:string){return rows.filter(row=>{const month=reportMonth(row.start_at);return month>=from&&month<=to}).sort((a,b)=>Date.parse(a.start_at)-Date.parse(b.start_at)||a.id.localeCompare(b.id))}
export function reportSummary(rows:ReportRow[],venueNames:string[],from:string,to:string){
 const selected=reportRows(rows,from,to);
 const months:string[]=[];
 for(let d=new Date(from+'-01T00:00:00Z');d.toISOString().slice(0,7)<=to;d.setUTCMonth(d.getUTCMonth()+1))months.push(d.toISOString().slice(0,7));
 const names=Array.from(new Set([...venueNames,...selected.map(r=>r.venue_name)])).sort((a,b)=>a.localeCompare(b,'th'));
 const venues=names.map(name=>({name,counts:months.map(month=>selected.filter(r=>r.venue_name===name&&reportMonth(r.start_at)===month).length),total:selected.filter(r=>r.venue_name===name).length}));
 return {selected,months,venues,totals:months.map((_,i)=>venues.reduce((sum,v)=>sum+v.counts[i],0)),total:selected.length};
}
