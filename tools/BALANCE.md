# Balance simulation

`tools/balance-sim.js` loads the real game in a headless browser, switches off drawing and sound, and lets a simulated player run whole careers against the actual rules with the clock fast-forwarded. Each career is 12 runs; the bot spends its grant between runs (department upgrades first, then requisitions) and picks perks after each shift.

```
node tools/balance-sim.js 25 12                                  # 25 careers × 12 runs per setup
SIM_SRC=copy.html SIM_OUT=after.json node tools/balance-sim.js   # test a modified copy
node tools/balance-compare.js before.json after.json             # side-by-side summary
python3 tools/balance_patch.py zebra-shift.source.html           # apply the proposed changes
```

## Simulated players

| Player | Recognises a disease once the chart is complete (Common → Unicorn) | Speed |
| --- | --- | --- |
| student (not yet clinical) | 80% · 55% · 30% · 12% · 4% | slow |
| doctor | 95% · 80% · 55% · 30% · 12% | normal |
| expert | 98% · 92% · 78% · 55% · 30% | fast |

They also differ in how much of the chart they want before guessing, and how often they pick the right treatment, destination, picture reading, procedure, CPR rhythm and emergency answer.

## What the current game does

- **No ceiling.** After shift 8 nothing gets harder (14 patients, fastest arrivals), but points keep growing. An expert never loses; a doctor plays endless runs a quarter of the time by run 10.
- **Rarity runs away.** Rarer cases grow without limit each shift, so 58% of everything a doctor diagnoses is a Zebra or Unicorn.
- **The economy explodes.** Long runs pay hundreds of thousands of grant; every item is maxed within 12 runs.
- **Hard first shift for non-clinicians.** The student bot loses on shift 1 in 96% of first runs.

## Proposed changes (`tools/balance_patch.py`)

1. Shift 1 has 5 patients and they deteriorate 60% slower.
2. From shift 4, patients deteriorate 8% faster each shift, up to about three times as fast. Shifts can grow to 20 patients and arrivals keep speeding up.
3. Rarer cases become more common only until shift 7.
4. The later-shift score bonus stops growing at shift 6.
5. Winning an emergency restores reputation at most once per shift, and emergencies come a little less often (every 2–3.5 minutes).

## Before → after (25 careers × 12 runs each)

```

doctor/em/resident
  1st run: median shift (p10–p90)             3 (2–5)            → 3 (1–3)
  1st run: lost in shift 1                    4%                 → 12%
  runs 10–12: median shift (p10–p90)          6 (2–26)           → 4 (2–6)
  runs 10–12: endless (25+ shifts)            25%                → 0%
  diagnoses that were Zebra/Unicorn           58%                → 18%
  arrests per patient treated                 0.41               → 0.63
  emergencies per hour of play                26.1               → 21.0
  grant per run (run 1 / median)              1543 / 5378        → 844 / 1508
  item levels by run 12 (max 140)             140                → 105
  upgrades by run 12 (of 11)                  11.0               → 11.0
  specialties unlocked by run 12 (avg of 10)  9.8                → 8.5

student/em/resident
  1st run: median shift (p10–p90)             1 (1–1)            → 1 (1–2)
  1st run: lost in shift 1                    96%                → 64%
  runs 10–12: median shift (p10–p90)          1 (1–2)            → 1 (1–2)
  runs 10–12: endless (25+ shifts)            0%                 → 0%
  diagnoses that were Zebra/Unicorn           5%                 → 4%
  arrests per patient treated                 2.48               → 2.24
  emergencies per hour of play                21.1               → 18.9
  grant per run (run 1 / median)              42 / 78            → 53 / 68
  item levels by run 12 (max 140)             3                  → 3
  upgrades by run 12 (of 11)                  6.4                → 5.6
  specialties unlocked by run 12 (avg of 10)  0.5                → 0.5

expert/em/resident
  1st run: median shift (p10–p90)             26 (4–26)          → 8 (5–11)
  1st run: lost in shift 1                    0%                 → 0%
  runs 10–12: median shift (p10–p90)          26 (26–26)         → 18 (7–26)
  runs 10–12: endless (25+ shifts)            96%                → 47%
  diagnoses that were Zebra/Unicorn           71%                → 41%
  arrests per patient treated                 0.16               → 0.34
  emergencies per hour of play                26.4               → 21.6
  grant per run (run 1 / median)              552971 / 756256    → 23374 / 102989
  item levels by run 12 (max 140)             140                → 140
  upgrades by run 12 (of 11)                  11.0               → 11.0
  specialties unlocked by run 12 (avg of 10)  10.0               → 10.0

doctor/em/intern
  1st run: median shift (p10–p90)             2 (1–11)           → 3 (2–4)
  1st run: lost in shift 1                    20%                → 8%
  runs 10–12: median shift (p10–p90)          9 (3–26)           → 5 (3–8)
  runs 10–12: endless (25+ shifts)            43%                → 0%
  diagnoses that were Zebra/Unicorn           63%                → 23%
  arrests per patient treated                 0.28               → 0.44
  emergencies per hour of play                26.2               → 21.1
  grant per run (run 1 / median)              652 / 13348        → 1139 / 2791
  item levels by run 12 (max 140)             140                → 122
  upgrades by run 12 (of 11)                  11.0               → 11.0
  specialties unlocked by run 12 (avg of 10)  10.0               → 9.3

doctor/em/attending
  1st run: median shift (p10–p90)             2 (1–4)            → 2 (1–3)
  1st run: lost in shift 1                    28%                → 12%
  runs 10–12: median shift (p10–p90)          4 (2–26)           → 4 (2–7)
  runs 10–12: endless (25+ shifts)            15%                → 0%
  diagnoses that were Zebra/Unicorn           50%                → 18%
  arrests per patient treated                 0.57               → 0.73
  emergencies per hour of play                25.8               → 20.7
  grant per run (run 1 / median)              889 / 3196         → 563 / 1760
  item levels by run 12 (max 140)             130                → 115
  upgrades by run 12 (of 11)                  11.0               → 11.0
  specialties unlocked by run 12 (avg of 10)  9.1                → 8.0

doctor/gp/resident
  1st run: median shift (p10–p90)             3 (1–5)            → 3 (2–5)
  1st run: lost in shift 1                    16%                → 4%
  runs 10–12: median shift (p10–p90)          6 (2–26)           → 4 (2–6)
  runs 10–12: endless (25+ shifts)            21%                → 0%
  diagnoses that were Zebra/Unicorn           54%                → 17%
  arrests per patient treated                 0.36               → 0.56
  emergencies per hour of play                26.0               → 20.8
  grant per run (run 1 / median)              906 / 4712         → 1045 / 1580
  item levels by run 12 (max 140)             139                → 102
  upgrades by run 12 (of 11)                  11.0               → 11.0
  specialties unlocked by run 12 (avg of 10)  10.0               → 8.1
```

Not-yet-clinical players on **Intern** difficulty with the changes: median shift 2, losing on shift 1 in 44% of runs (vs 64% on Resident).

## Still worth watching with real players

- Arrests are common: about 0.6 per patient for an average doctor. CPR may come up more often than is fun.
- Pathology and Cardiology unlock slowly from shift play alone (both need 10 good picture reads); the Reading room speeds them up.
- The bot's decisions are simplified (it never uses consults, items' active effects are passive, and it reads the chart in a fixed order), so absolute numbers matter less than the direction of a change.
