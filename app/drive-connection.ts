import {DRIVE_FILE_SCOPE} from './drive-scope';
import {env} from 'cloudflare:workers';
import {cookies} from 'next/headers';
import {digest} from './user-auth';
import {type DriveCredentials} from './drive-storage';
export const DRIVE_OWNER='strategybanpru@gmail.com';
const encode=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes));
const decode=(value:string)=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
async function encryptionKey(){if(!env.GOOGLE_TOKEN_KEY)throw new Error('Drive token encryption is not configured');return crypto.subtle.importKey('raw',decode(env.GOOGLE_TOKEN_KEY),{name:'AES-GCM'},false,['encrypt','decrypt'])}
export async function sealDriveToken(value:string){const iv=crypto.getRandomValues(new Uint8Array(12));const sealed=await crypto.subtle.encrypt({name:'AES-GCM',iv},await encryptionKey(),new TextEncoder().encode(value));return encode(iv)+'.'+encode(new Uint8Array(sealed))}
export async function openDriveToken(value:string){const [iv,sealed]=value.split('.');return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(iv)},await encryptionKey(),decode(sealed)))}
export async function driveReady(){if(!env.DB||!env.GOOGLE_CLIENT_ID||!env.GOOGLE_CLIENT_SECRET||!env.GOOGLE_TOKEN_KEY)return false;return !!await env.DB.prepare("SELECT 1 FROM site_settings WHERE key='google_drive_token'").first()}
export async function driveCredentials():Promise<DriveCredentials>{const row=await env.DB!.prepare("SELECT value FROM site_settings WHERE key='google_drive_token'").first<{value:string}>();if(!row)throw new Error('Google Drive is not connected');return {GOOGLE_CLIENT_ID:env.GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET:env.GOOGLE_CLIENT_SECRET,GOOGLE_REFRESH_TOKEN:await openDriveToken(row.value),LIMITED:!!await env.DB!.prepare("SELECT 1 FROM site_settings WHERE key='google_drive_scope' AND value=?").bind(DRIVE_FILE_SCOPE).first()}}
export async function uploadOwner(){const jar=await cookies();let value=jar.get('banpru_upload')?.value;if(!value||!/^[-a-f0-9]{36}$/.test(value))value=crypto.randomUUID();return {hash:digest(value),cookie:'banpru_upload='+value+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600'}}
export async function validDriveUpload(key:string,venueId:string){if(!env.DB)return false;const owner=await uploadOwner();return !!await env.DB.prepare('SELECT 1 FROM drive_uploads WHERE key=? AND venue_id=? AND owner_hash=? AND expires_at>? AND NOT EXISTS (SELECT 1 FROM bookings WHERE document=?)').bind(key,venueId,owner.hash,Date.now(),key).first()}
