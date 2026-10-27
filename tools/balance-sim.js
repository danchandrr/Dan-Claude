// Zebra Shift balance simulator.
// Loads the real game in a headless browser, switches off drawing and sound, and lets a simulated
// player run whole careers against the actual rules, with the clock fast-forwarded.
//
// Usage: node tools/balance-sim.js [careers] [runsPerCareer]   (needs Playwright)
// Writes tools/balance-report.json.
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');

// How each kind of player behaves. know: chance they would recognise a disease of each rarity
// (Common → Unicorn) once they have the whole picture. need: how much of the chart they want before
// guessing. Other numbers are the chance of getting that step right first time, and speed scales
// how long each click-and-think takes. public: someone with no medical training.
const PROFILES = {
  public:  { know: [.3, .12, .04, .01, 0], need: .85, tx: .5, dispo: .55, read: .3, proc: .55, cprQ: .5, rhythm: .5, em: .35, speed: 1.6 },
  student: { know: [.8, .55, .3, .12, .04], need: .75, tx: .7, dispo: .75, read: .5, proc: .6, cprQ: .55, rhythm: .6, em: .45, speed: 1.4 },
  doctor:  { know: [.95, .8, .55, .3, .12], need: .55, tx: .85, dispo: .88, read: .7, proc: .75, cprQ: .75, rhythm: .8, em: .65, speed: 1 },
  expert:  { know: [.98, .92, .78, .55, .3], need: .4, tx: .95, dispo: .95, read: .88, proc: .88, cprQ: .9, rhythm: .95, em: .82, speed: .7 }
};

const BOT = () => {
  // ---- quiet the game: no drawing, sound, toasts or saving during the simulation
  window.render = () => {}; window.softRender = () => {}; window.renderCPR = () => {}; window.renderMini = () => {};
  window.sfx = () => {}; window.toast = () => {}; window.save = () => {}; window.writeStore = () => {};
  window.saveAch = () => {}; window.saveTut = () => {}; window.renderEmer = () => {};
  TUT = { done: true, tips: {} };
  const rand = Math.random;
  const SIM = window.SIM = {};

  SIM.newCareer = (spec, diff) => {
    ACH = { u: {}, c: {}, r: {}, hq: null };
    S.slot = 0; S.doctor = normDoc({ first: 'Sim', last: 'Bot', spec, diff });
    S.meta = freshMeta(); S.meta.intro = false; S.staff = freshStaff(); S.screen = 'sim'; S.tab = 'shift';
  };

  // ---- one simulated run; returns what happened
  SIM.run = (P) => {
    startRun(); fixRun(S.run);
    const r = S.run, stat = { causes: { death: 0, unsafe: 0, em: 0 }, reads: 0, readsOk: 0, imaging: 0, clues: 0, wrong: 0, perShift: [], tiers: [0, 0, 0, 0, 0], cpr: 0, rosc: 0, ems: 0, emWins: 0, time: 0 };
    const mind = new Map(); // what the bot "knows" about each patient
    let lastShift = 1, shiftT = 0, shiftDeaths = 0;
    const tick = sec => { // advance the world one second at a time, emergencies included
      for (let i = 0; i < sec; i++) {
        if (r.phase !== 'floor' || r.em) return;
        worldTick(1); stat.time++; shiftT++;
        if (r.phase === 'floor' && (r.arrived >= 3 || r.shift > 1)) { r.emClock += 1; if (r.emClock >= r.emNext) { r.emClock = 0; r.emNext = typeof emGap === 'function' ? emGap() : 90 + rand() * 90; triggerEmergency(); } }
      }
    };
    const know = p => { if (!mind.has(p.id)) { const d = D[p.d]; mind.set(p.id, { knows: rand() < P.know[d.t] * (p.masked ? .8 : 1), need: Math.min(1, P.need + (rand() - .5) * .3), seen: false }); } return mind.get(p.id); };
    const revealed = p => { const d = D[p.d], tot = d.h.length + d.e.length + d.l.length + d.i.length; return (p.rev.h + p.rev.e + p.rev.l + p.rev.i) / tot; };
    const wrongName = d => { const same = D.filter(x => x !== d && x.s === d.s); return (same.length && rand() < .6 ? pick(same) : pick(D.filter(x => x !== d))).n; };
    const urgency = p => p.phase === 'arrest' ? -100 : p.phase === 'done' || p.phase === 'dead' ? 100 : p.stab / p.max + (p.phase === 'dispo' ? -.2 : 0);
    let guard = 0;
    while (r.phase !== 'over' && guard++ < 60000) {
      if (r.shift > 25) { stat.capped = true; break; } // a run this long is effectively endless
      if (r.shift !== lastShift) { stat.perShift.push({ shift: lastShift, time: shiftT, deaths: shiftDeaths }); lastShift = r.shift; shiftT = 0; shiftDeaths = 0; }
      if (r.phase === 'break') { // pick a perk: reputation when low, otherwise stability
        const order = r.rep <= 1 ? ['wind', 'scrubs', 'adren'] : ['adren', 'scrubs', 'student', 'hunch', 'praise'];
        takePerk(order.find(id => r.draft.includes(id)) || r.draft[0]); continue;
      }
      if (r.em) { // emergencies: a timed multiple-choice case; more time helps a little
        stat.ems++; const e = r.em, ok = rand() < Math.min(.97, P.em + (e.dur - 45) * .006);
        if (ok) stat.emWins++; else stat.causes.em++;
        emFinish(ok, ok ? 'tx' : 'wrong'); closeEmer(); continue;
      }
      // the sickest patient first; clear finished bays straight away
      const beds = r.beds.map((p, i) => [p, i]).filter(([p]) => p);
      const done = beds.find(([p]) => p.phase === 'done' || p.phase === 'dead');
      if (done) { clearBed(done[1]); tick(Math.ceil(P.speed)); continue; }
      const live = beds.filter(([p]) => ['case', 'treat', 'proc', 'dispo', 'arrest'].includes(p.phase)).sort((a, b) => urgency(a[0]) - urgency(b[0]));
      if (!live.length) { tick(2); continue; }
      const [p, i] = live[0];
      if (S.sel !== i) { S.sel = i; tick(Math.ceil(2 * P.speed)); if (r.beds[i] !== p) continue; }
      const d = D[p.d], m = know(p);
      if (p.phase === 'arrest') {
        stat.cpr++; const q = Math.min(1, P.cprQ + (up('lucas') ? .1 : 0)), correct = rand() < P.rhythm;
        const prob = Math.max(.05, Math.min(.95, .1 + .55 * q + (correct ? .3 : -.1) + mods().rosc));
        S.cpr = { bed: i, rosc: rand() < prob }; if (S.cpr.rosc) stat.rosc++;
        const before = r.deaths; cprDone(); if (r.deaths > before) { stat.causes.death++; shiftDeaths++; }
        continue;
      }
      if (p.phase === 'case') {
        // read any picture that is waiting (the floor pauses while reading)
        const pend = (READ_AT[d.n] || []).find(([c, k]) => p.rev[c] > k && !(p.rd && p.rd[c + k]));
        if (pend) { const ok = rand() < P.read; stat.reads++; achEvent('read', { ok, kind: READS[pend[2]].k, key: pend[2], where: 'bed' }); if (ok) stat.readsOk++; p.rd = p.rd || {}; p.rd[pend[0] + pend[1]] = ok ? 'ok' : 'bad'; if (ok) p.stab = Math.min(p.max, p.stab + (isDiag() ? 2 : 1)); else p.stab--; if (p.stab <= 0) arrest(i); continue; }
        const f = revealed(p), left = ['h', 'e', 'l', 'i'].filter(c => p.rev[c] < d[c].length);
        const ready = left.length === 0 || (m.knows && f >= m.need) || (!m.knows && f >= .9);
        if (!ready) { // cheapest useful clue first, imaging when the rest is used up
          const c = left.sort((a, b) => cost(a, p) - cost(b, p) || 'heli'.indexOf(a) - 'heli'.indexOf(b))[0];
          stat.clues++; if (c === 'i') stat.imaging++; tick(Math.ceil(5 * P.speed)); if (r.beds[i] !== p || p.phase !== 'case') continue; order(c); continue;
        }
        tick(Math.ceil(7 * P.speed)); if (r.beds[i] !== p || p.phase !== 'case') continue;
        // knows it: right; does not: a differential that sometimes lands, better with more of the chart
        // with four choices on screen (Medical Student) a guess is among what is left, helped by the chart
        const opts = p.opts && mods().choices ? p.opts.filter(n => !p.guesses.some(g => g.n === n)) : null;
        const hit = m.knows ? rand() < .9 : opts ? rand() < 1 / opts.length + .3 * f : rand() < .15 + .2 * f;
        if (hit) { stat.tiers[d.t]++; guess(d.n); }
        else if (opts) { stat.wrong++; guess(pick(opts.filter(n => n !== d.n))); }
        else { stat.wrong++; let n = wrongName(d), k = 0; while (p.guesses.some(g => g.n === n) && k++ < 20) n = wrongName(d); guess(n); }
        continue;
      }
      if (p.phase === 'treat') { tick(Math.ceil(5 * P.speed)); if (r.beds[i] !== p || p.phase !== 'treat') continue;
        const opts = p.tx.filter(o => !p.txWrong.includes(o)); treat(rand() < P.tx ? d.tx : pick(opts.filter(o => o !== d.tx).concat(d.tx))); continue; }
      if (p.phase === 'proc') { const id = p.procs.find(x => !p.procDone.includes(x)); S.mini = { id, ctx: { kind: 'bed', bed: i } }; miniDone(rand() < Math.min(.97, P.proc + mods().proc * .05)); continue; }
      if (p.phase === 'dispo') { tick(Math.ceil(3 * P.speed)); if (r.beds[i] !== p || p.phase !== 'dispo') continue;
        // a highlighted destination is followed almost every time
        const before = r.rep, code = rand() < (mods().bedHint ? .95 : P.dispo) ? d.dispo || 'ward' : pick(DISPO_OPTS.map(o => o[0]).filter(c => c !== d.dispo));
        dispo(code); if (r.rep < before) stat.causes.unsafe++; continue; }
    }
    if (r.phase !== 'over') endRun();
    stat.perShift.push({ shift: lastShift, time: shiftT, deaths: shiftDeaths });
    return { shift: r.shift, score: r.score, treated: r.treated, deaths: r.deaths, crashes: r.crashes, lwbs: r.lwbs, earned: r.earned, ...stat };
  };

  // ---- spend grant between runs: department first, then requisitions
  SIM.shop = () => {
    for (const id of ['bed4', 'monitor', 'oxygen', 'triage', 'bed5', 'resus', 'us', 'vl', 'suction', 'lucas', 'bed6']) buyUpg(id);
    let pulls = 0; while (S.meta.grant >= PULL10 + 200) { pull(10); pulls += 10; } while (S.meta.grant >= PULL + 100) { pull(1); pulls++; }
    return pulls;
  };
  SIM.unlocked = () => Object.keys(SPECS).filter(roleOpen);
  SIM.counters = () => ({ ...ACH.c });
};

(async () => {
  const careers = +process.argv[2] || 30, runs = +process.argv[3] || 20;
  // SIM_SRC lets a modified copy of the game be tested before the real one changes
  const src = 'file://' + path.resolve(process.env.SIM_SRC || path.join(__dirname, '..', 'zebra-shift.source.html'));
  const outFile = process.env.SIM_OUT || path.join(__dirname, 'balance-report.json');
  const b = await chromium.launch(), page = await b.newPage();
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto(src); await page.waitForTimeout(500);
  await page.evaluate(BOT);
  const out = { when: new Date().toISOString(), careers, runs, results: {} };
  // SIM_CONFIGS picks setups, e.g. "public/em/student,public/em/intern"
  const configs = process.env.SIM_CONFIGS ? process.env.SIM_CONFIGS.split(',').map(c => c.split('/'))
    : [['doctor', 'em', 'resident'], ['student', 'em', 'resident'], ['expert', 'em', 'resident'], ['doctor', 'em', 'intern'], ['doctor', 'em', 'attending'], ['doctor', 'gp', 'resident'], ['student', 'em', 'intern'], ['student', 'em', 'student'], ['public', 'em', 'intern'], ['public', 'em', 'student']];
  for (const [prof, spec, diff] of configs) {
    const key = `${prof}/${spec}/${diff}`, res = [];
    for (let c = 0; c < careers; c++) {
      const career = await page.evaluate(({ P, spec, diff, runs }) => {
        SIM.newCareer(spec, diff); const list = [], unlockAt = {};
        for (let n = 1; n <= runs; n++) {
          const r = SIM.run(P); r.pulls = SIM.shop(); r.grantLeft = S.meta.grant; r.upgrades = Object.keys(S.meta.up).length;
          r.items = Object.values(S.meta.owned).reduce((a, o) => a + o.lv, 0);
          for (const k of SIM.unlocked()) if (!unlockAt[k]) unlockAt[k] = n;
          list.push(r);
        }
        return { runs: list, unlockAt, counters: SIM.counters() };
      }, { P: PROFILES[prof], spec, diff, runs });
      res.push(career);
    }
    out.results[key] = res;
    process.stdout.write(key + ' done\n');
  }
  fs.writeFileSync(outFile, JSON.stringify(out));
  await b.close();
})();
