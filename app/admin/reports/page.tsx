import {redirect} from 'next/navigation';
import {authDb,currentUser} from '../../user-auth';
import BookingReport from './report';
export const dynamic='force-dynamic';
export default async function Page(){
 const user=await currentUser();
 if(!user)redirect('/auth');
 if(user.role!=='super_admin')return <main style={{padding:40}}>รายงานนี้สำหรับ Super Admin เท่านั้น <a href="/">กลับหน้าหลัก</a></main>;
 const result=await authDb().prepare('SELECT b.id,b.name,b.department,b.external_department,b.purpose,b.attendees,b.start_at,b.end_at,b.status,v.name AS venue_name FROM bookings b JOIN venues v ON v.id=b.venue_id ORDER BY b.start_at,b.id').all();
 const venues=await authDb().prepare('SELECT name FROM venues ORDER BY name').all<{name:string}>();
 return <BookingReport rows={result.results as any} venueNames={venues.results.map(v=>v.name)}/>;
}
