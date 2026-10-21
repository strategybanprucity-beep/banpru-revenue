import {receiveDriveDocument,serveDriveDocument} from '../../drive-documents';
import { env } from 'cloudflare:workers';
import { getAppUser } from '../../user-auth';
export const dynamic='force-dynamic';
export async function POST(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'คำขอไม่ถูกต้อง'},{status:403});
 if(new URL(req.url).searchParams.get('kind')==='document')return receiveDriveDocument(req);
 const u=await getAppUser();if(!u)return Response.json({error:'กรุณาเข้าสู่ระบบ'},{status:401});
 if(!env.BUCKET||!env.DB)return Response.json({error:'พื้นที่เก็บไฟล์ไม่พร้อม'},{status:503});
 const requested=new URL(req.url).searchParams.get('kind');const kind=requested==='banner'?'site-images':requested==='image'?'venue-images':'booking-docs';const isImage=kind!=='booking-docs';
 if(isImage&&!await env.DB.prepare("SELECT 1 FROM auth_users WHERE id=? AND active=1 AND role='super_admin'").bind(u.userId).first())return Response.json({error:'ไม่มีสิทธิ์'},{status:403});
 const max=10*1024*1024;
 const declared=Number(req.headers.get('content-length')??0);if(declared>max+65536)return Response.json({error:'ไฟล์ต้องไม่เกิน 10 MB'},{status:413});
 const reader=req.body?.getReader();if(!reader)return Response.json({error:'ไม่พบไฟล์'},{status:400});
 const chunks:Uint8Array[]=[];let total=0;
 while(true){const r=await reader.read();if(r.done)break;total+=r.value.length;if(total>max+65536){await reader.cancel();return Response.json({error:'ไฟล์ต้องไม่เกิน 10 MB'},{status:413});}chunks.push(r.value);}
 const bytes=new Uint8Array(total);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 const form=await new Request(req.url,{method:'POST',headers:{'Content-Type':req.headers.get('content-type')??''},body:bytes}).formData();
 const file=form.get('file');if(!(file instanceof File)||!file.size||file.size>max)return Response.json({error:'กรุณาเลือกไฟล์ขนาดไม่เกิน 10 MB'},{status:400});
 const allowed=isImage?['image/jpeg','image/png','image/webp']:['application/pdf'];
 if(!allowed.includes(file.type))return Response.json({error:isImage?'รองรับ JPEG, PNG และ WebP':'รองรับเอกสาร PDF เท่านั้น'},{status:400});
 const data=new Uint8Array(await file.arrayBuffer());const ok=file.type==='application/pdf'?new TextDecoder().decode(data.slice(0,5))==='%PDF-':file.type==='image/jpeg'?data[0]===255&&data[1]===216:file.type==='image/png'?data[0]===137&&data[1]===80&&data[2]===78&&data[3]===71:new TextDecoder().decode(data.slice(0,4))==='RIFF'&&new TextDecoder().decode(data.slice(8,12))==='WEBP';
 if(!ok)return Response.json({error:'ชนิดไฟล์ไม่ตรงกับเนื้อหา'},{status:400});
 const key=kind+'/'+u.userId+'/'+crypto.randomUUID();const id=crypto.randomUUID(),now=new Date().toISOString();
 await env.BUCKET.put(key,data,{httpMetadata:{contentType:file.type}});
 try {await env.DB.prepare('INSERT INTO admin_audit_log (id,actor_id,action,target_type,target_id,details,created_at) VALUES (?,?,?,?,?,?,?)').bind(id,u.userId,'upload',kind,key,JSON.stringify({name:file.name,size:file.size}),now).run();}catch{await env.BUCKET.delete(key);return Response.json({error:'บันทึกประวัติไม่สำเร็จ'},{status:500});}
 return Response.json({key});
}
export async function GET(req:Request){
 const key=new URL(req.url).searchParams.get('key')??'';if(key.startsWith('drive/'))return serveDriveDocument(key);if(!env.BUCKET||!env.DB)return new Response('Unavailable',{status:503});
 const u=await getAppUser();
 if(key.startsWith('booking-docs/')){
 if(!u)return new Response('Unauthorized',{status:401});
 const admin=await env.DB.prepare('SELECT 1 FROM auth_users WHERE id=? AND active=1').bind(u.userId).first();
 if(!admin&&!key.startsWith('booking-docs/'+u.userId+'/'))return new Response('Forbidden',{status:403});
 }else if(!key.startsWith('venue-images/')&&!key.startsWith('site-images/'))return new Response('Not found',{status:404});
 const file=await env.BUCKET.get(key);if(!file)return new Response('Not found',{status:404});
 return new Response(file.body,{headers:{'Content-Type':file.httpMetadata?.contentType??'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store',...(key.startsWith('booking-docs/')?{'Content-Disposition':'attachment; filename="booking-document.pdf"'}:{})}});
}
