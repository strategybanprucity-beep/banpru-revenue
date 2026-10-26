export type ReportRow={id:string;name:string;department:string;external_department:string;purpose:string;attendees:number;start_at:string;end_at:string;status:string;venue_name:string};
export function reportMonth(iso:string){return new Date(Date.parse(iso)+7*3600000).toISOString().slice(0,7)}
export function reportRows(rows:ReportRow[],from:string,to:string){return rows.filter(row=>{const month=reportMonth(row.start_at);return month>=from&&month<=to}).sort((a,b)=>Date.parse(a.start_at)-Date.parse(b.start_at)||a.id.localeCompare(b.id))}
