import { Badge, Card, CardBody, CardHeader, Meter, Notice, Stat } from '@/components/ui';
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
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Earned this month"
          value={money(income.total)}
          tone="gold"
          sub={
            lastMonth ? (
              <span className={delta >= 0 ? 'text-positive' : 'text-critical'}>
                {delta >= 0 ? '▲' : '▼'} {moneyShort(Math.abs(delta))} against last month
              </span>
            ) : undefined
          }
        />
        <Stat
          label="Deposited so far"
          value={money(position.paid)}
          sub={`${position.monthsPaid} of ${SAVINGS.termMonths} instalments, ${money(position.outstanding)} still to run`}
          footer={<Meter value={position.progress} label="Term progress" />}
        />
        <Stat
          label="Gold at maturity"
          value={money(position.entitlement)}
          sub={`A gain of ${money(position.netGain)} on the full ${money(SAVINGS.statedTotalDeposit)} you deposit`}
        />
        <Stat
          label="Team"
          value={count(standing.teamSize)}
          sub={`${count(standing.activeMembers)} depositing this month across ${count(standing.directs)} directs`}
          footer={
            rank ? (
              <Badge tone="gold">{rank.label}</Badge>
            ) : (
              <Badge tone="neutral">No rank yet</Badge>
            )
          }
        />
      </div>

      {dailyRun.result.flushed > 0 ? (
        <Notice tone="caution" title={`${money(dailyRun.result.flushed)} of matching income was flushed today`}>
          Today’s run matched {count(dailyRun.result.pairs)} pairs worth {money(dailyRun.result.gross)}, but the{' '}
          {rank?.label ?? 'unranked'} daily cap of {money(dailyRun.result.capApplied)} paid only{' '}
          {count(dailyRun.result.pairsPaid)} of them.{' '}
          <button
            type="button"
            className="font-medium text-gold underline underline-offset-2"
            onClick={() => onNavigate('income')}
          >
            See the matching run
          </button>
        </Notice>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Income over the last twelve months"
            hint="Each bar is one payout month, split by the reward that produced it."
          />
          <CardBody>
            <StackedIncomeChart data={account.history} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="This month by reward" hint="Where the money came from." />
          <CardBody>
            <BarList
              ariaLabel="Income this month by reward type"
              items={income.breakdown.map((entry, index) => ({
                label: entry.label,
                value: entry.amount,
                display: money(entry.amount),
                color: INCOME_SERIES[index]?.color,
              }))}
            />
            <p className="mt-4 border-t border-line pt-3 text-[13px] text-muted">
              Every reward is a share of {money(1_00_000)} per active member each month, which is the 20% of a{' '}
              {money(SAVINGS.monthlyDeposit)} deposit the plan makes commissionable.
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Binary balance" hint="Matching pays on pairs, so the weaker leg sets the ceiling." />
          <CardBody>
            <LegBalance
              left={account.legs.left.volume}
              right={account.legs.right.volume}
              matchedLeft={income.matching.consumedLeft}
              matchedRight={income.matching.consumedRight}
            />
            <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3 text-[13px]">
              <div>
                <dt className="text-faint">Pairs matched</dt>
                <dd className="tnum font-medium text-ink">{count(income.matching.pairs)}</dd>
              </div>
              <div>
                <dt className="text-faint">Carried forward</dt>
                <dd className="tnum font-medium text-ink">
                  {count(income.matching.carryLeft + income.matching.carryRight)} BV
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Lucky spin" hint="One winner is drawn from the paying pool each month." />
          <CardBody>
            <p className="text-[13px] leading-relaxed text-muted">
              {count(account.spinChance.poolSize)} members are still paying in. Your chance of being drawn this
              month is <strong className="tnum text-ink">{percent(account.spinChance.thisMonth, 2)}</strong>, and{' '}
              <strong className="tnum text-ink">{percent(account.spinChance.remainingTerm, 1)}</strong> across the{' '}
              {SAVINGS.termMonths - position.monthsPaid} months you have left.
            </p>
            <div className="mt-4 space-y-2">
              {draws.slice(0, 3).map((draw) => (
                <div key={draw.month} className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="min-w-0 truncate text-ink">{draw.winnerName}</span>
                  <span className="tnum shrink-0 text-muted">
                    M{draw.month} · {moneyShort(draw.benefit)}
                  </span>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="mt-4 text-[13px] font-medium text-gold underline underline-offset-2"
              onClick={() => onNavigate('savings')}
            >
              See every draw
            </button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Next rank" hint="What stands between you and the next tier." />
          <CardBody>
            {account.nextRank ? (
              <>
                <p className="text-[15px] font-semibold text-ink">{account.nextRank.rank.label}</p>
                <Meter className="mt-3" value={account.nextRank.progress} label="Rank progress" />
                <ul className="mt-4 space-y-2.5">
                  {account.nextRank.blockers.map((blocker) => (
                    <li key={blocker.id} className="text-[13px]">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-muted">{blocker.label}</span>
                        <span className="tnum text-ink">
                          {count(blocker.current)} / {count(blocker.required)}
                        </span>
                      </div>
                      <Meter className="mt-1.5" value={blocker.progress} tone="neutral" />
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-[13px] text-muted">Every rank in the plan is held.</p>
            )}
            <button
              type="button"
              className="mt-4 text-[13px] font-medium text-gold underline underline-offset-2"
              onClick={() => onNavigate('rank')}
            >
              Open the rank ladder
            </button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
