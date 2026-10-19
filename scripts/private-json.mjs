export async function readPrivateJson(){
 process.stdout.write('Ready for private JSON on stdin (input hidden).\n');
 return new Promise((resolve,reject)=>{
  let input='';
  const raw=process.stdin.isTTY;if(raw)process.stdin.setRawMode(true);
  process.stdin.resume();
  const handler=chunk=>{input+=chunk.toString();if(input.includes('\u0003')){cleanup();reject(new Error('Cancelled'));return}if(input.includes('\n')||input.includes('\r')){cleanup();try{resolve(JSON.parse(input.trim()))}catch{reject(new Error('Invalid input'))}}};
  const cleanup=()=>{process.stdin.off('data',handler);if(raw)process.stdin.setRawMode(false);process.stdin.pause()};
  process.stdin.on('data',handler);
 });
}
