import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Banprucity. | จองพื้นที่เพื่อทุกความเป็นไปได้', description: 'ระบบจองใช้สถานที่ จัดการคำขอ และปฏิทินการใช้งาน', icons: {icon:'/favicon.svg'} };
export default function Layout({children}: {children: React.ReactNode}) { return <html lang="th"><body>{children}</body></html>; }
