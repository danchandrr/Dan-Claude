// Usage: node tools/balance-compare.js before.json after.json
// Side-by-side summary of two simulation reports
const path=require('path');
const [A,B]=process.argv.slice(2).map(f=>require(path.resolve(f)));
const q=(a,p)=>{const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor(p*s.length))]};
const mean=a=>a.reduce((x,y)=>x+y,0)/Math.max(1,a.length),f=(n,d=0)=>Number(n).toFixed(d);
const sum=(o,k)=>{const cs=o.results[k],R=o.runs,row={};
  const sh=idx=>cs.flatMap(c=>idx.map(i=>c.runs[i]).filter(Boolean)).map(r=>r.capped?26:r.shift);
  const s1=sh([0]),s4=sh([1,2,3]),s12=sh([9,10,11]),all=cs.flatMap(c=>c.runs);
  row['1st run: median shift (p10–p90)']=`${q(s1,.5)} (${q(s1,.1)}–${q(s1,.9)})`;
  row['1st run: lost in shift 1']=f(100*mean(s1.map(s=>s===1)))+'%';
  row['runs 10–12: median shift (p10–p90)']=`${q(s12,.5)} (${q(s12,.1)}–${q(s12,.9)})`;
  row['runs 10–12: endless (25+ shifts)']=f(100*mean(cs.flatMap(c=>[9,10,11].map(i=>c.runs[i]).filter(Boolean)).map(r=>!!r.capped)))+'%';
  const tiers=[0,1,2,3,4].map(t=>all.reduce((a,r)=>a+r.tiers[t],0)),tt=tiers.reduce((a,b)=>a+b,0);
  row['diagnoses that were Zebra/Unicorn']=f(100*(tiers[3]+tiers[4])/tt)+'%';
  row['arrests per patient treated']=f(mean(all.map(r=>r.crashes))/mean(all.map(r=>r.treated)),2);
  row['emergencies per hour of play']=f(mean(all.map(r=>r.ems))/(mean(all.map(r=>r.time))/3600),1);
  row['grant per run (run 1 / median)']=`${Math.round(q(cs.map(c=>c.runs[0].earned),.5))} / ${Math.round(q(all.map(r=>r.earned),.5))}`;
  row['item levels by run '+R+' (max 220)']=f(mean(cs.map(c=>c.runs[R-1].items)));
  row['upgrades by run '+R+' (of 11)']=f(mean(cs.map(c=>c.runs[R-1].upgrades)),1);
  const specs=['im','surg','anaes','id','path','paeds','obgyn','cardio','neuro','tox'];
  row['specialties unlocked by run '+R+' (avg of 10)']=f(mean(cs.map(c=>specs.filter(s=>c.unlockAt[s]).length)),1);
  return row};
for(const k of Object.keys(A.results)){console.log('\n'+k);const a=sum(A,k),b=sum(B,k);for(const r in a)console.log('  '+r.padEnd(44)+String(a[r]).padEnd(18)+' → '+b[r])}
