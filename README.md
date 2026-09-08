# Suvarna Sparsh — digital gold SIP dashboard

A member and admin dashboard for the Suvarna Sparsh gold saving plan: a 30-month
₹5,000 monthly deposit with a monthly lucky-spin draw, sitting on top of a
referral, level, binary-matching and leadership compensation plan.

Everything on screen is computed by a plan engine that encodes the scheme
document directly. No headline figure is typed in by hand.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 123 unit tests
npm run build      # typecheck + production bundle
```

## Signing in

Both dashboards are behind a sign-in. The ID decides which one you get.

| Role | ID | Password |
| --- | --- | --- |
| Main admin | `ADMIN-001` | `SUVARNA-ADMIN-2026` |
| Member | `SS-100244` | `SUVARNA-MEMBER-2026` |

**On security, plainly:** this build has no server, so sign-in is enforced in the
browser against records in local storage. Passwords are never stored — each
account keeps a random salt and a PBKDF2-SHA-256 derivation at 210,000
iterations, verified in constant time. That is enough to keep the two dashboards
apart and to model the access rules, but anyone with the device can read local
storage. It is a working prototype of the access model, not production security.
Moving to a real backend means replacing the four functions in
`src/lib/auth/store.ts` with API calls; no other file changes.

## What each role sees

**Member** — Overview, Savings, Income, Team, Rank, Projection, Plan rules.
Spin outcomes are read-only: the member sees published results and has no
control that can trigger a draw.

**Main admin** — Spin & Win, Members, Projection, Plan rules.

Sections declare the roles allowed to see them, and both the navigation and the
router read that one list. A member who types `#spin` lands on their own first
section instead.

### Spin & Win (admin only)

The admin runs one draw per month. A winner is picked from the eligible pool
(active members who have not already won) using rejection-sampled randomness
from `crypto.getRandomValues`, so the distribution is uniform. The wheel
animation is theatre — the winner is chosen when the wheel settles, so a slow
frame or a backgrounded tab cannot influence the result. A month can only be
drawn once, and results are final and visible to every member.

### Member provisioning (admin only)

Creating a member allocates a unique ID (`SS-` plus six digits, checked against
every ID in use) and a generated password: four groups of four from a 32-symbol
alphabet with the I/1 and O/0 look-alikes removed, which is 80 bits of entropy
and still readable over a phone call. The password is shown exactly once. Only
its hash is stored, so it cannot be displayed again — the admin re-issues.

## The plan engine

`src/lib/plan/` is pure TypeScript with no React import. Money is an integer
count of paise and every rate is an integer count of basis points, so the whole
compensation engine runs on integer arithmetic and no payout can drift by a
fraction of a paisa.

| Module | What it owns |
| --- | --- |
| `config.ts` | Every constant transcribed from the document, with page references |
| `savings.ts` | The 30-month ladder, benefit chart, instalment ledger, spin odds |
| `income.ts` | Referral, level, binary matching and the leadership pool |
| `ranks.ts` | Qualification across all five criteria |
| `projection.ts` | The printed illustration plus a live team calculator |
| `integrity.ts` | The self-audit described below |

### Binary matching

A pair is 1 unit on one leg against 2 on the other. Maximising pairs under both
leg constraints gives a closed form:

```
pairs = min(left, right, floor((left + right) / 3))
```

`matchPairs` returns that along with the volume consumed and carried forward on
each leg. A brute-force test checks the result against every feasible split of
1:2 and 2:1 pairs for all leg sizes up to 24.

Pairs settle at ₹400 and are capped daily by rank, so the console shows the
day's run against the cap and names the value flushed above it.

## Where the document does not reconcile

The scheme document has places where a stated headline disagrees with the table
under it, and places where a column is simply missing. Those gaps change what a
member is paid, so the engine recomputes each one and reports what it finds
rather than quietly picking a value. The **Plan rules** page shows all nine
checks with the source page and the resolution applied.

The ones that need a company decision:

- **The level table sums to 21%, not the 20% in its heading.** The ten rates
  (5, 3.5, 2.5, 2, 2, 1.5, 1.5, 1, 1, 1) total 21% of the base. The engine pays
  the per-level rates as tabulated and treats the heading as a label.
- **Ruby Leader has no daily matching cap.** The capping list runs Associate,
  Silver, Gold, Diamond, Crown, skipping Ruby. A rank with no stated cap
  inherits the nearest lower one, and every payout computed that way is flagged
  in the interface as a fallback.
- **BV is never defined.** Ranks list a BV threshold beside a team size of the
  same number, but no rule says whether BV counts registrations, current-month
  deposits, or deposits since joining. The engine counts one unit per ₹5,000
  instalment received anywhere in the team, and counts active members separately.
- **The four reward buckets allocate 80% of the base.** The remaining 20% of the
  ₹1,000 is not assigned to any member reward and is treated as company retention.
- **Associate has no BV threshold.** Shown as "not specified"; it cannot block
  qualification.
- **The four-level illustration is a ceiling, not a forecast.** ₹16,24,200 a
  month needs an 11,110-member team in which everyone sponsors ten actives who
  all keep depositing. The Projection page prints it as published and puts a
  calculator driven by real width, depth, activity and leg balance beside it.

## Demo data

There is no backend, so the dashboard runs on a seeded generator that builds a
real 890-member sponsor tree and then derives every headline from it with the
same engine a payout run would use. Change the seed and every total, rank and
chart moves together. Swap `generateAccount()` for an API call and the UI is
unchanged.

## Charts

Charts are hand-built SVG and HTML with no charting dependency. The categorical
palette was validated with the six-check colour validator under the strictest
all-pairs comparison, in both themes:

| Mode | Worst CVD ΔE | Worst normal-vision ΔE | Contrast |
| --- | --- | --- | --- |
| Light | 9.7 | 19.7 | all ≥ 3:1 |
| Dark | 8.2 | 17.4 | all ≥ 3:1 |

Both modes are deliberately stepped for their own surface rather than flipped.
Every chart with two or more series carries a legend, every stacked segment is
separated by a 2px surface gap, and each history chart has a table view beside
it so no value is available only as a colour.

## Testing

```bash
npm test                            # 123 unit tests
npm run build && npm run preview &  # serve on :4173
npm run test:e2e                    # 16 browser checks of the access model
```

Set `CHROMIUM_PATH` if you want the end-to-end run to use a browser you
already have rather than Playwright's own.

The unit suite asserts the engine against the document: all 30 benefit-chart
rows, all ten level rates, every rank threshold, every stated daily cap, the six
leadership rewards, and the illustration totals. The browser suite covers what
unit tests cannot — the sign-in gate, a member being unable to reach the admin
console by typing its route, a draw publishing exactly once, and generated
credentials actually signing in.

## Note on the plan itself

The compensation side is a recruitment-driven binary MLM combined with a
prize-draw savings scheme. Schemes of this shape are regulated in India under
the Prize Chits and Money Circulation Schemes (Banning) Act 1978 and the Direct
Selling Rules 2021. That is a matter for the operator's counsel, not for this
repository, but the dashboard is built to be honest about the plan's mechanics
rather than to flatter them: it shows income flushed to the daily cap, income
lost to locked levels, pool slices that pay out to nobody, and the printed
earnings illustration next to a calculator that shows what an ordinary team
actually earns.
