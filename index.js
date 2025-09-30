const B = require('./src/bot');
const pm = require('./src/proxy');
const c = require('./src/constants');
const { q, validGame, validBots, wait } = require('./src/helpers');
// if u like it , Star the repo on github, dev @cleanest.
function KBM(){this.b=[]}
KBM.prototype.cfg=async function(){
 let g=await q('Game ID: ')
 if(!validGame(g))throw Error('Bad game ID')
 let bc=validBots(await q('Bot count: '))
 if(!bc)throw Error('Bad bot count')
 return {g,bc}
}

KBM.prototype.startBots=async function(g,bc){
 let pc=pm.load();if(!pc)console.log('No proxies, direct\n')
 let ps=[]
 for(let i=0;i<bc;i++){
  let pr=pm.byIndex(i)
  let b=new B(g,i+1,bc,pr)
  this.b.push(b)
  ps.push(b.start())
  if(i<bc-1)await wait(1e3)
 }
 await Promise.all(ps)
}

KBM.prototype.run=async function(){
 try{
  let {g,bc}=await this.cfg()
  await this.startBots(g,bc)
 }catch(e){console.error('Err:',e.message);process.exit(1)}
}

if(require.main===module){let m=new KBM();m.run()}

module.exports=KBM
