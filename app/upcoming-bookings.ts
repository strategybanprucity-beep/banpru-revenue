export function upcomingBookings<T extends {start_at:string;status:string;id:string}>(bookings:T[],now=Date.now()):T[]{
 return bookings.filter(b=>['pending','approved'].includes(b.status)&&Date.parse(b.start_at)>=now).sort((a,b)=>Date.parse(a.start_at)-Date.parse(b.start_at)||a.id.localeCompare(b.id));
}
