const ax=require('axios'),WS=require('ws'),mp=require('msgpack-lite'),{URLSearchParams}=require('url')
const {HttpsProxyAgent}=require('https-proxy-agent'),{HttpProxyAgent}=require('http-proxy-agent')
const c=require('./constants'),{uid:gen,wait,rot,enc}=require('./helpers')

function Bot(gid,n,tot,prx=null){
 this.gid=gid;this.n=n;this.tot=tot;this.p=prx;this.uid=gen()
 this.re=0;this.dead=0;this.iv=null;this.ws=null;this.ah=0;this.last=Date.now()
 this.tr=0;this.r=0;this.ing=0;this.pid=null
}
Bot.prototype.log=function(m){console.log(`[Bot ${this.n}/${this.tot}] ${m}`)}

Bot.prototype.send=function(d){
 if(!this.ws||this.ws.readyState!==WS.OPEN)return
 try{
  this.ah=rot(this.ah,c.AH_KEY)
  let e=mp.encode(d),pkt=new Uint8Array(e.length+2)
  pkt.set(e,0);pkt.set(enc(this.ah),pkt.length-2)
  this.ws.send(pkt)
 }catch(e){console.error(`[Bot ${this.n}] send err:`,e.message)}
}

Bot.prototype.msg=async function(d){
 try{
  let dec=mp.decode(d)
  if(Array.isArray(dec)&&dec[0]==='pi'){this.send(['po']);this.last=Date.now();return}
  if(Array.isArray(dec)&&dec[0]==='io-init'){this.pid=dec[1];return}
  if(Array.isArray(dec)&&dec[0]==='load'){await wait(100);this.send(['load']);return}
  if(Array.isArray(dec)&&dec[0]==='0'&&!this.ing){
    this.ing=1;let name='Unknown'
    try{
      if(dec[1]&&Array.isArray(dec[1])){
        let pl=dec[1]
        if(this.pid){
          for(let i=0;i<pl.length;i++){
            if(pl[i]===this.pid&&pl[i+5]&&typeof pl[i+5]==='string'){name=pl[i+5];break}
          }
        }
        if(name==='Unknown'){
          let gs=[];for(let i=0;i<pl.length;i++){if(typeof pl[i]==='string'&&pl[i].startsWith('Guest_'))gs.push(pl[i])}
          if(gs.length){name=gs[(this.n-1)%gs.length]}
        }
      }
    }catch(e){console.log(`[Bot ${this.n}] spawn parse err:`,e.message)}
    this.log(`Spawned ${name}`);return
  }
  if(Array.isArray(dec)&&dec[0]==='l'&&dec[1]===0&&this.ing){
    this.ing=0;if(!this.r){this.r=1;this.log('died')
      setTimeout(()=>{if(this.ws&&this.ws.readyState===WS.OPEN){this.send(c.BOT_SPAWN_DATA);this.r=0}},c.RESPAWN_DELAY)};return}
  if(Array.isArray(dec)&&dec[0]==='end'){this.ing=0;this.log('game ended')
    setTimeout(()=>{if(this.ws&&this.ws.readyState===WS.OPEN)this.send(c.BOT_SPAWN_DATA)},c.REJOIN_DELAY);return}
  if(!this.tr){await wait(500);this.send(c.BOT_SPAWN_DATA);this.tr=1;this.log('Joined')}
 }catch(e){console.error(`[Bot ${this.n}] msg err:`,e.message)}
}

Bot.prototype.handlers=function(){
 this.ws.on('open',()=>{
  this.log('connected');this.re=0
  this.iv&&clearInterval(this.iv)
  this.iv=setInterval(()=>{
    if(this.ws&&this.ws.readyState===WS.OPEN){
      let now=Date.now()
      if(now-this.last>c.PING_INTERVAL){this.send(['pi']);this.last=now}
    }
  },c.PING_INTERVAL)
 })
 this.ws.on('message',d=>this.msg(d))
 this.ws.on('close',(cd)=>{
  this.log('closed '+cd)
  this.iv&&(clearInterval(this.iv),this.iv=null)
  if(!this.dead&&this.re<c.MAX_RECONNECT_ATTEMPTS){
    this.re++;let del=Math.min(c.RECONNECT_BASE_DELAY*this.re,c.MAX_RECONNECT_DELAY)
    this.log(`reconnect in ${del/1e3}s (${this.re}/${c.MAX_RECONNECT_ATTEMPTS})`)
    setTimeout(()=>this.connect(),del)
  }else if(this.re>=c.MAX_RECONNECT_ATTEMPTS){this.log('max retries')}
 })
 this.ws.on('error',e=>{console.error(`[Bot ${this.n}] ws err:`,e.message)})
}

Bot.prototype.connect=async function(){
 if(this.dead)return
 try{
  let axc={timeout:c.TIMEOUT,headers:{'User-Agent':c.USER_AGENT}}
  if(this.p){axc.httpsAgent=new HttpsProxyAgent(this.p);axc.httpAgent=new HttpProxyAgent(this.p)}
  this.log('getting token');let tr=await ax.post(c.TOKEN_URL,{},{headers:{'Content-Type':'application/json'},...axc});let tok=tr.data?.validation_token||tr.data?.data?.validation_token
  if(!tok)throw Error('no token');this.log('got token')
  let params=new URLSearchParams({hostname:'krunker.io',region:'me-bhn',autoChangeGame:'false',validationToken:tok,game:this.gid,dataQuery:JSON.stringify(c.DATA_QUERY)})
  this.log('getting server');let r=await ax.get(`${c.MATCHMAKER_URL}?${params.toString()}`,axc),{host,clientId}=r.data
  let url=`wss://${host}/ws?gameId=${this.gid}&clientKey=${clientId}&clientUID=${this.uid}`
  this.log('url '+url)
  let wso={headers:{Origin:c.ORIGIN,'User-Agent':c.USER_AGENT}}
  if(this.p)wso.agent=new HttpsProxyAgent(this.p)
  this.ws=new WS(url,wso);this.tr=0;this.ah=0;this.last=Date.now();this.r=0;this.ing=0;this.pid=null
  this.handlers()
 }catch(e){
  console.error(`[Bot ${this.n}] conn err`)
  if(!this.dead&&this.re<c.MAX_RECONNECT_ATTEMPTS){
    this.re++;let del=Math.min(c.RECONNECT_BASE_DELAY*this.re,c.MAX_RECONNECT_DELAY)
    this.log(`retry in ${del/1e3}s (${this.re}/${c.MAX_RECONNECT_ATTEMPTS})`)
    setTimeout(()=>this.connect(),del)
  }
 }
}

Bot.prototype.start=async function(){
 await this.connect()
 return new Promise(res=>{
  process.on('SIGINT',()=>{this.log('shut');this.dead=1;this.iv&&clearInterval(this.iv);this.ws&&this.ws.close();res()})
 })
}

module.exports=Bot
