"""Balance changes tested with tools/balance-sim.js. Usage: python3 tools/balance_patch.py <game.html>"""
import sys
p=sys.argv[1];s=open(p).read()
def rep(a,b):
    global s
    if s.count(a)!=1: sys.exit('Not found exactly once: '+a[:80])
    s=s.replace(a,b)
# More patients and faster arrivals keep later shifts getting harder
rep("const shiftSize=s=>Math.min(14,6+2*(s-1));","const shiftSize=s=>s===1?5:Math.min(20,6+2*(s-1));")
rep("const spawnGap=s=>Math.max(16,36-2.5*(s-1))+Math.random()*12;","const spawnGap=s=>Math.max(8,36-2.5*(s-1))+Math.random()*12;\n// Shift 1 is forgiving; from shift 4 patients deteriorate 8% faster each shift, up to about three times as fast\nconst shiftPace=s=>s===1?1.6:Math.max(.3,1-.08*Math.max(0,s-3));\nconst emGap=()=>120+Math.random()*90;")
rep("  const base={1:14,2:24,3:45}[acuity(p)];if(!base)return 0;\n  let iv=base;","  const base={1:14,2:24,3:45}[acuity(p)];if(!base)return 0;\n  let iv=base*shiftPace(S.run?S.run.shift:1);")
# Rarer cases grow more common until shift 7, then the mix holds steady
rep("const base=[50,30,14,5,1],f=1+.4*(shift-1);","const base=[50,30,14,5,1],f=1+.3*(Math.min(shift,7)-1);")
# The later-shift score bonus stops growing at shift 6
rep("const sm=1+.2*(r.shift-1);","const sm=1+.2*(Math.min(r.shift,6)-1);")
rep("*(1+.2*(r.shift-1))*(1+Math.max(-.5,m.score))","*(1+.2*(Math.min(r.shift,6)-1))*(1+Math.max(-.5,m.score))")
# An emergency win restores reputation at most once per shift, and emergencies come a little less often
rep("r.rep=Math.min(maxRep(),r.rep+1);r.streak++;r.emWins++;","if(!r.emRep){r.rep=Math.min(maxRep(),r.rep+1);r.emRep=true}r.streak++;r.emWins++;")
rep("r.shift++;r.shieldUsed=0;","r.shift++;r.emRep=false;r.shieldUsed=0;")
rep("r.emNext=90+Math.random()*90;triggerEmergency();","r.emNext=emGap();triggerEmergency();")
open(p,'w').write(s);print('patched',p)
