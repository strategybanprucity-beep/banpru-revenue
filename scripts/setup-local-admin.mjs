import {readPrivateJson} from './private-json.mjs';
const input=await readPrivateJson();
const base='http://127.0.0.1:5173';
const state=await (await fetch(base+'/api/auth')).json();
const r=await fetch(base+'/api/auth',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({action:state.needsSetup?'setup':'login',username:input.username,password:input.password,name:input.name??input.username})});
const d=await r.json();if(!r.ok)throw new Error(d.error);
console.log(state.needsSetup?'Super admin created and sign-in verified.':'Existing Super admin sign-in verified.');
