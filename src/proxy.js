const fs = require('fs');

let proxies = [], idx = 0

function parse(l){
    if(!l) return null
    l=l.trim()
    if(!l) return null
    if(l.includes('@')){
        if(l.startsWith('http')) return l
        let a=l.split('@')
        return "http://"+a[0]+"@"+a[1]
    }else{
        if(l.startsWith('http')) return l
        return "http://"+l
    }
}

function load(){
    try{
        let c=fs.readFileSync('proxy.txt','utf8')
        proxies=c.split('\n').map(x=>parse(x)).filter(x=>x)
        return proxies.length
    }catch(e){
        console.log('no proxy.txt or err, ignoring')
        proxies=[]
        return 0
    }
}

function next(){
    if(!proxies.length) return null
    let p=proxies[idx%proxies.length]
    idx++
    return p
}

function byIndex(i){
    if(!proxies.length) return null
    return proxies[i%proxies.length]
}

function count(){return proxies.length}
function has(){return proxies.length>0}

module.exports={load,next,byIndex,count,has}
