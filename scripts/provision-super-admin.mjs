import { scrypt as scryptCallback, randomBytes, randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
const scrypt=promisify(scryptCallback);
const inputSchema=z.object({username:z.string().trim().toLowerCase().max(254).refine(v=>/^[a-z0-9_.-]{3,32}$/.test(v)||z.string().email().safeParse(v).success),password:z.string().min(6).max(128),name:z.string().trim().min(1).max(120)});
async function hashPassword(password){const salt=randomBytes(16);const key=await scrypt(password,salt,32,{N:16384,r:16,p:1,maxmem:64*1024*1024});return ['scrypt',16384,16,1,salt.toString('hex'),key.toString('hex')].join('$')}
function audit(actor,action,target,username,now){return {sql:"INSERT INTO admin_audit_log (id,actor_id,action,target_type,target_id,details,created_at) SELECT ?,?,?,'user',?,?,? WHERE changes()>0",params:[randomUUID(),actor,action,target,JSON.stringify({username}),now]}}
export async function provisionSuperAdmin({execute,username,password,name=username}){
 const input=inputSchema.parse({username,password,name});
 const [current]=await execute([{sql:'SELECT COUNT(*) AS n FROM auth_users',params:[]}]);
 if(Number(current.results[0]?.n)>0)return {created:false};
 const id=randomUUID(),now=new Date().toISOString(),hash=await hashPassword(input.password);
 const [result]=await execute([{sql:"INSERT INTO auth_users (id,username,name,password_hash,role,active,bootstrap,created_at) SELECT ?,?,?,?,'super_admin',1,1,? WHERE NOT EXISTS (SELECT 1 FROM auth_users)",params:[id,input.username,input.name,hash,now]},audit(id,'setup_super_admin',id,input.username,now)]);
 return {created:Number(result.meta?.changes??0)>0};
}
export async function provisionInitialAdmin({execute,username,password,name=username}){
 const input=inputSchema.parse({username,password,name});
 const [existing]=await execute([{sql:"SELECT COUNT(*) AS n FROM auth_users WHERE role='admin' OR bootstrap=2",params:[]}]);
 if(Number(existing.results[0]?.n)>0)return {created:false};
 const [owners]=await execute([{sql:"SELECT id FROM auth_users WHERE role='super_admin' AND active=1 LIMIT 1",params:[]}]);
 if(!owners.results[0]?.id)throw new Error('Create Super admin first.');
 const id=randomUUID(),now=new Date().toISOString(),hash=await hashPassword(input.password);
 const [result]=await execute([{sql:"INSERT INTO auth_users (id,username,name,password_hash,role,active,bootstrap,created_at) SELECT ?,?,?,?,'admin',1,2,? WHERE NOT EXISTS (SELECT 1 FROM auth_users WHERE role='admin' OR bootstrap=2) AND EXISTS (SELECT 1 FROM auth_users WHERE role='super_admin' AND active=1)",params:[id,input.username,input.name,hash,now]},audit(owners.results[0].id,'setup_initial_admin',id,input.username,now)]);
 return {created:Number(result.meta?.changes??0)>0};
}
export async function runFromEnvironment(env=process.env){
 for(const key of ['CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_DATABASE_ID','CLOUDFLARE_API_TOKEN','SUPER_ADMIN_USERNAME','SUPER_ADMIN_PASSWORD','INITIAL_ADMIN_USERNAME','INITIAL_ADMIN_PASSWORD'])if(!env[key])throw new Error('Missing required secret: '+key);
 const endpoint='https://api.cloudflare.com/client/v4/accounts/'+encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID)+'/d1/database/'+encodeURIComponent(env.CLOUDFLARE_DATABASE_ID)+'/query';
 const execute=async batch=>{const response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+env.CLOUDFLARE_API_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({batch})});const data=await response.json();if(!response.ok||!data.success||!Array.isArray(data.result)||data.result.some(r=>r.success===false))throw new Error('Cloudflare D1 request failed.');return data.result};
 const owner=await provisionSuperAdmin({execute,username:env.SUPER_ADMIN_USERNAME,password:env.SUPER_ADMIN_PASSWORD,name:env.SUPER_ADMIN_NAME||env.SUPER_ADMIN_USERNAME});
 const admin=await provisionInitialAdmin({execute,username:env.INITIAL_ADMIN_USERNAME,password:env.INITIAL_ADMIN_PASSWORD,name:env.INITIAL_ADMIN_NAME||env.INITIAL_ADMIN_USERNAME});
 console.log(owner.created?'Initial Super admin created.':'Existing Super admin preserved.');console.log(admin.created?'Initial Admin created.':'Existing Admin preserved.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)runFromEnvironment().catch(()=>{console.error('Initial account setup failed. Check required secrets, D1 permissions and migrations.');process.exitCode=1});
