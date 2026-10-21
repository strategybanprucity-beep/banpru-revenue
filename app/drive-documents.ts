import {env} from 'cloudflare:workers';
import folders from '../config/google-drive-uploads.json';
import {driveCredentials,driveReady,uploadOwner} from './drive-connection';
import {uploadDrivePdf,downloadDrivePdf} from './drive-storage';
import {getAppUser,limited,digest} from './user-auth';
const error=(text:string,status=400)=>Response.json({error:text},{status});
export async function receiveDriveDocument(req:Request){
 try{
 if(!await driveReady())return error('ยังไม่ได้เชื่อม Google Drive',503);
 if(await limited('drive-upload:'+digest(req.headers.get('CF-Connecting-IP')??'local'),5)||await limited('drive-upload-global',100))return error('อัปโหลดมากเกินไป กรุณารอ 15 นาที',429);
 const max=10*1024*1024,declared=Number(req.headers.get('content-length')??0);if(declared>max+65536)return error('ไฟล์ต้องไม่เกิน 10 MB',413);
 const reader=req.body?.getReader();if(!reader)return error('ไม่พบไฟล์');const parts:Uint8Array[]=[];let size=0;
 while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>max+65536){await reader.cancel();return error('ไฟล์ต้องไม่เกิน 10 MB',413)}parts.push(r.value)}
 const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length}
 const form=await new Request(req.url,{method:'POST',headers:{'Content-Type':req.headers.get('content-type')??''},body:bytes}).formData();
 const venueId=String(form.get('venue_id')??'');const venue=await env.DB!.prepare('SELECT name FROM venues WHERE id=? AND active=1').bind(venueId).first<{name:string}>();if(!venue)return error('ไม่พบสถานที่ที่เปิดรับจอง');
 const normalize=(s:string)=>s.replace(/\s+/g,'').toLowerCase();const folder=folders.venues.find(v=>normalize(v.name)===normalize(venue.name));if(!folder?.folderId)return error('สถานที่นี้ยังไม่มีโฟลเดอร์รับไฟล์',503);
 const file=form.get('file');if(!(file instanceof File)||file.type!=='application/pdf'||!file.size||file.size>max)return error('รองรับ PDF ขนาดไม่เกิน 10 MB');
 if(new TextDecoder().decode(await file.slice(0,5).arrayBuffer())!=='%PDF-')return error('เนื้อหาไฟล์ไม่ใช่ PDF');
 const owner=await uploadOwner(),key='drive/'+crypto.randomUUID();const id=await uploadDrivePdf(await driveCredentials(),folder.folderId,file);
 await env.DB!.batch([env.DB!.prepare('INSERT INTO drive_uploads (key,venue_id,file_id,owner_hash,expires_at,created_at) VALUES (?,?,?,?,?,?)').bind(key,venueId,id,owner.hash,Date.now()+30*60000,new Date().toISOString()),env.DB!.prepare("INSERT INTO admin_audit_log (id,actor_id,action,target_type,target_id,details,created_at) VALUES (?,'guest','upload','booking-docs',?,?,?)").bind(crypto.randomUUID(),key,JSON.stringify({venue_id:venueId,size:file.size}),new Date().toISOString())]);
 return Response.json({key},{headers:{'Set-Cookie':owner.cookie,'Cache-Control':'no-store'}});
 }catch{return error('อัปโหลดไม่สำเร็จ กรุณาลองอีกครั้ง หรือติดต่อผู้ดูแล',503)}
}
export async function serveDriveDocument(key:string){
 const user=await getAppUser();if(!user)return new Response('Unauthorized',{status:401});
 if(!await env.DB?.prepare('SELECT 1 FROM auth_users WHERE id=? AND active=1').bind(user.userId).first())return new Response('Forbidden',{status:403});
 const upload=await env.DB!.prepare('SELECT u.file_id FROM drive_uploads u JOIN bookings b ON b.document=u.key WHERE u.key=?').bind(key).first<{file_id:string}>();if(!upload)return new Response('Not found',{status:404});
 try{const file=await downloadDrivePdf(await driveCredentials(),upload.file_id);return new Response(file.body,{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="booking-document.pdf"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})}catch{return new Response('File unavailable',{status:503})}
}
