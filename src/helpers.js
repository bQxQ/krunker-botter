const rl=require('readline')

function uid(){return Math.random().toString(36).substring(2,13)+Math.random().toString(36).substring(2,13)}
function wait(ms){return new Promise(x=>setTimeout(x,ms))}
function rot(a,b){return (a+b)&255}
function enc(n){return [(n>>4)&15,n&15]}
function q(qs){let r=rl.createInterface({input:process.stdin,output:process.stdout});return new Promise(z=>{r.question(qs,a=>{r.close();z(a)})})}
function validGame(g){return g&&g.indexOf(':')>-1}
function validBots(n){let c=parseInt(n);return (!c||c<=0)?null:c}

module.exports={uid,wait,rot,enc,q,validGame,validBots}
