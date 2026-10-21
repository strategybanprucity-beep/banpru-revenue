/** Google credentials are supplied as Worker secrets; never expose them to the client. */
export type DriveCredentials={GOOGLE_CLIENT_ID?:string;GOOGLE_CLIENT_SECRET?:string;GOOGLE_REFRESH_TOKEN?:string};
export const driveConfigured=(credentials:DriveCredentials)=>Boolean(credentials.GOOGLE_CLIENT_ID&&credentials.GOOGLE_CLIENT_SECRET&&credentials.GOOGLE_REFRESH_TOKEN);
export async function driveAccessToken(credentials:DriveCredentials,request:typeof fetch=fetch){
 if(!driveConfigured(credentials))throw new Error('Google Drive is not connected');
 const response=await request('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:credentials.GOOGLE_CLIENT_ID!,client_secret:credentials.GOOGLE_CLIENT_SECRET!,refresh_token:credentials.GOOGLE_REFRESH_TOKEN!,grant_type:'refresh_token'})});
 const data=await response.json() as {access_token?:string};
 if(!response.ok||!data.access_token)throw new Error('Google Drive authorization failed');
 return data.access_token;
}
export async function uploadDrivePdf(credentials:DriveCredentials,folderId:string,file:File,request:typeof fetch=fetch){
 if(!/^[\w-]+$/.test(folderId))throw new Error('Invalid folder');
 if(file.type!=='application/pdf'||!file.size||file.size>10*1024*1024)throw new Error('Only PDF up to 10 MB is accepted');
 if(new TextDecoder().decode(await file.slice(0,5).arrayBuffer())!=='%PDF-')throw new Error('Invalid PDF content');
 const token=await driveAccessToken(credentials,request);
 const name=new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID()+'.pdf';
 const start=await request('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,parents&supportsAllDrives=true',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','X-Upload-Content-Type':'application/pdf','X-Upload-Content-Length':String(file.size)},body:JSON.stringify({name,mimeType:'application/pdf',parents:[folderId]})});
 const location=start.headers.get('location');
 if(!start.ok||!location)throw new Error('Google Drive upload initialization failed');
 const target=new URL(location);
 if(target.origin!=='https://www.googleapis.com'||!target.pathname.startsWith('/upload/drive/'))throw new Error('Unexpected upload destination');
 const response=await request(location,{method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':'application/pdf'},body:file});
 const result=await response.json() as {id?:string;parents?:string[]};
 if(!response.ok||!result.id||!result.parents?.includes(folderId))throw new Error('Google Drive upload failed');
 return result.id;
}
export async function downloadDrivePdf(credentials:DriveCredentials,fileId:string,request:typeof fetch=fetch){
 if(!/^[\w-]+$/.test(fileId))throw new Error('Invalid file');
 const token=await driveAccessToken(credentials,request);
 const response=await request('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(fileId)+'?alt=media',{headers:{Authorization:'Bearer '+token}});
 if(!response.ok)throw new Error('Google Drive download failed');
 return response;
}
