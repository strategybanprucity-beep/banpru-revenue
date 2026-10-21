import {env} from 'cloudflare:workers';
import {getAppUser} from '../../user-auth';
import DriveSetup from './setup';
export const dynamic='force-dynamic';
export default async function Page(){const u=await getAppUser();if(!u||!await env.DB?.prepare("SELECT 1 FROM auth_users WHERE id=? AND active=1 AND role='super_admin'").bind(u.userId).first())return <main className="booking-preview"><section className="panel preview-form"><h1>เฉพาะ Super admin</h1><a href="/auth">เข้าสู่ระบบผู้ดูแล</a></section></main>;return <DriveSetup/>}
