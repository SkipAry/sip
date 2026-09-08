import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Meter,
  Money,
  Notice,
  RailItem,
  Section,
  Trend,
} from '@/components/ui';
import { BarList } from '@/components/charts/BarList';
import { StackedIncomeChart, INCOME_SERIES } from '@/components/charts/StackedIncomeChart';
import { LegBalance } from '@/components/charts/LegBalance';
import type { Account } from '@/data/generate';
import { count, money, moneyShort, percent } from '@/lib/format';
import { SAVINGS } from '@/lib/plan';
import { publicDraws } from '@/lib/spin-view';

export function Overview({ account, onNavigate }: { account: Account; onNavigate: (id: string) => void }) {
  const { position, income, standing, rank, dailyRun } = account;
  const draws = publicDraws(account.draws);
  const lastMonth = account.history[account.history.length - 2];
  const thisMonth = account.history[account.history.length - 1]!;
  const delta = lastMonth ? thisMonth.total - lastMonth.total : 0;

  return (
    <>
      {/* ---- The holdings band. One figure leads the screen. ---- */}
      <Card className="overflow-hidden">
        {/* A soft gold light behind the headline figure, not a flat panel. */}
        <span
          className="pointer-events-none absolute -left-24 -top-32 h-72 w-[420px] rounded-full bg-gold/[0.07] blur-3xl"
          aria-hidden
        />
        <div className="relative grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-10 lg:p-7">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <p className="eyebrow">Gold value at maturity</p>
              <Badge tone="gold">Month {SAVINGS.maturityMonth}</Badge>
            </div>

            <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
              <Money amount={position.entitlement} size="hero" animate tone="gold" />
              <Trend
                value={position.netGain}
                label={`${moneyShort(position.netGain)} over what you deposit`}
                className="pb-2"
              />
            </div>

            <div className="mt-6 max-w-lg">
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-small text-muted">
                  <span className="tnum font-medium text-ink">{position.monthsPaid}</span> of{' '}
                  <span className="tnum">{SAVINGS.termMonths}</span> instalments paid
                </p>
                <p className="tnum text-small text-muted">{money(position.outstanding)} to run</p>
              </div>
              <Meter className="mt-2.5" value={position.progress} label="Term progress" thick />
            </div>
          </div>

          {/* The summary rail: supporting figures, separated by fading rules. */}
          <div className="flex flex-col divide-y divide-line sm:flex-row sm:divide-x sm:divide-y-0 lg:border-l lg:border-line lg:pl-2">
            <RailItem
              label="Deposited"
              value={<Money amount={position.paid} size="md" />}
              sub={`${money(SAVINGS.monthlyDeposit)} a month`}
            />
            <RailItem
              label="This month"
              value={<Money amount={income.total} size="md" />}
              sub={lastMonth ? <Trend value={delta} label={moneyShort(Math.abs(delta))} /> : undefined}
            />
            <RailItem
              label="Team"
              value={count(standing.teamSize)}
              sub={`${count(standing.activeMembers)} active`}
            />
          </div>
        </div>
      </Card>

      {dailyRun.result.flushed > 0 ? (
        <Notice
          tone="caution"
          title={`${money(dailyRun.result.flushed)} of matching income was flushed today`}
          action={
            <Button variant="secondary" onClick={() => onNavigate('income')}>
              See the run
            </Button>
          }
        >
          Today’s run matched {count(dailyRun.result.pairs)} pairs worth {money(dailyRun.result.gross)}, but
          the {rank?.label ?? 'unranked'} daily cap of {money(dailyRun.result.capApplied)} paid only{' '}
          {count(dailyRun.result.pairsPaid)} of them.
        </Notice>
      ) : null}

      {/* ---- Earnings ---- */}
      <Section
        title="Earnings"
        hint="What the plan has paid you, and where it came from."
        actions={
          <Button variant="ghost" onClick={() => onNavigate('income')}>
            Full breakdown →
          </Button>
        }
      >
        <div className="grid items-start gap-5 lg:grid-cols-[1.6fr_1fr]">
          <Card>
            <CardHeader
              title="Income over the last twelve months"
              hint="Each bar is one payout month, split by the reward that produced it."
            />
            <CardBody>
              <StackedIncomeChart data={account.history} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="This month by reward" />
            <CardBody className="space-y-5">
              <BarList
                ariaLabel="Income this month by reward type"
                items={income.breakdown.map((entry, index) => ({
                  label: entry.label,
                  value: entry.amount,
                  display: money(entry.amount),
                  color: INCOME_SERIES[index]?.color,
                }))}
              />
              <div className="well p-4">
                <p className="text-small leading-relaxed text-muted">
                  Every reward is a share of{' '}
                  <span className="tnum font-medium text-ink">{money(1_00_000)}</span> per active member each
                  month, which is the 20% of a {money(SAVINGS.monthlyDeposit)} deposit the plan makes
                  commissionable.
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      </Section>

      {/* ---- Network ---- */}
      <Section title="Network" hint="The two legs, the draw and the next rank.">
        <div className="grid items-start gap-5 lg:grid-cols-3">
          <Card>
            <CardHeader
              title="Binary balance"
              hint="Matching pays on pairs, so the weaker leg sets the ceiling."
            />
            <CardBody>
              <LegBalance
                left={account.legs.left.volume}
                right={account.legs.right.volume}
                matchedLeft={income.matching.consumedLeft}
                matchedRight={income.matching.consumedRight}
              />
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4">
                <div>
                  <dt className="eyebrow">Pairs matched</dt>
                  <dd className="mt-1.5 figure-md text-ink">{count(income.matching.pairs)}</dd>
                </div>
                <div>
                  <dt className="eyebrow">Carried forward</dt>
                  <dd className="mt-1.5 figure-md text-ink">
                    {count(income.matching.carryLeft + income.matching.carryRight)}
                    <span className="ml-1 text-tiny font-normal text-faint">BV</span>
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Lucky spin" hint="One winner drawn from the paying pool each month." />
            <CardBody>
              <div className="well flex items-baseline justify-between gap-3 p-4">
                <div>
                  <p className="eyebrow">Your odds this month</p>
                  <p className="mt-1.5 figure-md text-ink">{percent(account.spinChance.thisMonth, 2)}</p>
                </div>
                <p className="text-tiny text-faint">1 in {count(account.spinChance.poolSize)}</p>
              </div>

              <ul className="mt-4 space-y-2.5">
                {draws.slice(0, 3).map((draw) => (
                  <li key={draw.month} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-small text-ink">{draw.winnerName}</span>
                    <span className="tnum shrink-0 text-tiny text-muted">
                      M{draw.month} · {moneyShort(draw.benefit)}
                    </span>
                  </li>
                ))}
              </ul>

              <Button variant="ghost" className="mt-4 px-0" onClick={() => onNavigate('savings')}>
                See every draw →
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Next rank" hint="What stands between you and the next tier." />
            <CardBody>
              {account.nextRank ? (
                <>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-title font-semibold text-ink">{account.nextRank.rank.label}</p>
                    <p className="tnum text-small text-gold">
                      {Math.round(account.nextRank.progress * 100)}%
                    </p>
                  </div>
                  <Meter className="mt-3" value={account.nextRank.progress} label="Rank progress" />
                  <ul className="mt-5 space-y-3.5">
                    {account.nextRank.blockers.map((blocker) => (
                      <li key={blocker.id}>
                        <div className="flex items-baseline justify-between gap-3 text-small">
                          <span className="text-muted">{blocker.label}</span>
                          <span className="tnum text-ink">
                            {count(blocker.current)}
                            <span className="text-faint"> / {count(blocker.required)}</span>
                          </span>
                        </div>
                        <Meter className="mt-1.5" value={blocker.progress} tone="neutral" />
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-small text-muted">Every rank in the plan is held.</p>
              )}
              <Button variant="ghost" className="mt-4 px-0" onClick={() => onNavigate('rank')}>
                Open the rank ladder →
              </Button>
            </CardBody>
          </Card>
        </div>
      </Section>
    </>
  );
}
