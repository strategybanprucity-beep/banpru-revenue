import { env } from 'cloudflare:workers';
import { cookies } from 'next/headers';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex,hexToBytes,randomBytes } from '@noble/hashes/utils.js';
export const SESSION_COOKIE='banphru_session';
export type AuthUser={id:string;username:string;name:string;role:'admin'|'super_admin';active:number};
export function authDb(){if(!env.DB)throw new Error('D1 unavailable');return env.DB}
export function digest(value:string){return bytesToHex(sha256(new TextEncoder().encode(value)))}
export function equal(a:string,b:string){if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0}
export async function hashPassword(password:string){const salt=randomBytes(16);const key=await scryptAsync(password,salt,{N:16384,r:16,p:1,dkLen:32,maxmem:64*1024*1024});return ['scrypt',16384,16,1,bytesToHex(salt),bytesToHex(key)].join('$')}
export async function verifyPassword(password:string,stored:string){const [type,n,r,p,salt,hash]=stored.split('$');if(type!=='scrypt'||n!=='16384'||r!=='16'||p!=='1')return false;const key=await scryptAsync(password,hexToBytes(salt),{N:16384,r:16,p:1,dkLen:32,maxmem:64*1024*1024});return equal(bytesToHex(key),hash)}
export async function currentUser(){const jar=await cookies();const token=jar.get(SESSION_COOKIE)?.value;if(!token||!/^[a-f0-9]{64}$/.test(token))return null;return authDb().prepare('SELECT u.id,u.username,u.name,u.role,u.active FROM auth_users u JOIN auth_sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1').bind(digest(token),Date.now()).first<AuthUser>()}
export async function getAppUser(){const u=await currentUser();return u?{userId:u.id,displayName:u.name,email:u.username.includes('@')?u.username:u.username+'@accounts.invalid',fullName:u.name}:null}
export async function makeSession(id:string,req:Request){const token=bytesToHex(randomBytes(32));await authDb().prepare('INSERT INTO auth_sessions (token_hash,user_id,expires_at) VALUES (?,?,?)').bind(digest(token),id,Date.now()+12*3600000).run();return SESSION_COOKIE+'='+token+'; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200'+(new URL(req.url).protocol==='https:'?'; Secure':'')}
export function clearCookie(req:Request){return SESSION_COOKIE+'=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'+(new URL(req.url).protocol==='https:'?'; Secure':'')}
export function authLog(actor:string,action:string,target:string,details:unknown){return authDb().prepare('INSERT INTO admin_audit_log (id,actor_id,action,target_type,target_id,details,created_at) VALUES (?,?,?,?,?,?,?)').bind(crypto.randomUUID(),actor,action,'user',target,JSON.stringify(details),new Date().toISOString())}
export async function limited(key:string,limit:number){const now=Date.now();const result=await authDb().prepare('INSERT INTO auth_attempts (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<? THEN 1 ELSE count+1 END, expires_at=CASE WHEN expires_at<? THEN excluded.expires_at ELSE expires_at END RETURNING count').bind(key,now+15*60000,now,now).first<{count:number}>();return (result?.count??limit+1)>limit}
