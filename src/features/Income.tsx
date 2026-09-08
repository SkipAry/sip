import { useState, type ReactNode } from 'react';
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  Meter,
  Money,
  Notice,
  SegmentedControl,
  Stat,
  Td,
} from '@/components/ui';
import { BarList } from '@/components/charts/BarList';
import { StackedIncomeChart, INCOME_SERIES } from '@/components/charts/StackedIncomeChart';
import type { Account } from '@/data/generate';
import { COMMISSIONABLE_BASE, MATCHING, REWARD_BUCKETS } from '@/lib/plan';
import { bpsLabel, count, money, moneyShort } from '@/lib/format';

export function Income({ account }: { account: Account }) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const { income, dailyRun, rank } = account;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {income.breakdown.map((entry, index) => (
          <Stat
            key={entry.id}
            label={`${entry.label} reward`}
            value={<Money amount={entry.amount} size="lg" />}
            sub={
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-[2px]"
                  style={{ background: INCOME_SERIES[index]?.color }}
                  aria-hidden
                />
                {bpsLabel(REWARD_BUCKETS[index]!.share)} of the base
              </span>
            }
          />
        ))}
      </div>

      <Card>
        <CardHeader
          title="Income history"
          hint="Twelve months of payouts, split by the reward that produced each rupee."
          actions={
            <SegmentedControl
              label="History view"
              value={view}
              onChange={setView}
              options={[
                { value: 'chart', label: 'Chart' },
                { value: 'table', label: 'Table' },
              ]}
            />
          }
        />
        <CardBody>
          {view === 'chart' ? (
            <StackedIncomeChart data={account.history} />
          ) : (
            <DataTable
              caption="Monthly income by reward type"
              columns={[
                { key: 'month', label: 'Month' },
                { key: 'referral', label: 'Referral', align: 'right' },
                { key: 'level', label: 'Level', align: 'right' },
                { key: 'matching', label: 'Matching', align: 'right' },
                { key: 'leadership', label: 'Leadership', align: 'right' },
                { key: 'total', label: 'Total', align: 'right' },
              ]}
            >
              {[...account.history].reverse().map((row) => (
                <tr key={row.date.toISOString()} className="hover:bg-raised/60">
                  <Td>
                    {new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(row.date)}
                  </Td>
                  <Td align="right">{money(row.referral)}</Td>
                  <Td align="right">{money(row.level)}</Td>
                  <Td align="right">{money(row.matching)}</Td>
                  <Td align="right">{row.leadership > 0 ? money(row.leadership) : '—'}</Td>
                  <Td align="right" className="font-semibold">
                    {money(row.total)}
                  </Td>
                </tr>
              ))}
            </DataTable>
          )}
        </CardBody>
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Today’s matching run"
              hint="Matching is capped per day, so a strong day can leave money on the table."
            />
            <CardBody>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Figure label="Pairs formed" value={count(dailyRun.result.pairs)} />
                <Figure label="Pairs paid" value={count(dailyRun.result.pairsPaid)} />
                <Figure label="Gross" value={<Money amount={dailyRun.result.gross} size="md" />} />
                <Figure
                  label="Flushed"
                  value={<Money amount={dailyRun.result.flushed} size="md" />}
                  tone={dailyRun.result.flushed > 0 ? 'critical' : undefined}
                />
              </div>

              <div className="mt-5">
                <div className="flex items-baseline justify-between text-[13px]">
                  <span className="text-muted">Against the {rank?.label ?? 'unranked'} daily cap</span>
                  <span className="tnum text-ink">
                    {money(dailyRun.result.payable)} / {money(dailyRun.result.capApplied)}
                  </span>
                </div>
                <Meter
                  className="mt-2"
                  value={
                    dailyRun.result.capApplied === 0
                      ? 0
                      : dailyRun.result.payable / dailyRun.result.capApplied
                  }
                  tone={dailyRun.result.flushed > 0 ? 'caution' : 'gold'}
                  label="Daily cap usage"
                />
              </div>

              {dailyRun.result.capIsFallback ? (
                <Notice tone="caution" title="This cap is inherited, not stated">
                  The plan document lists daily caps for every rank except this one, so the nearest lower
                  rank’s cap is applied until a policy decision is made.
                </Notice>
              ) : null}

              <p className="mt-4 border-t border-line pt-3 text-[13px] leading-relaxed text-muted">
                {count(dailyRun.freshLeft)} BV arrived on the left and {count(dailyRun.freshRight)} on the
                right today, joining {count(dailyRun.carryLeft + dailyRun.carryRight)} BV carried over. Pairs
                settle at {money(MATCHING.payoutPerPair)} on a {MATCHING.ratio.weak}:{MATCHING.ratio.strong}{' '}
                or {MATCHING.ratio.strong}:{MATCHING.ratio.weak} ratio, and{' '}
                {count(dailyRun.result.carryLeft + dailyRun.result.carryRight)} BV carries into tomorrow.
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader
              title="Where every rupee of the base goes"
              hint={`Each active member makes ${money(COMMISSIONABLE_BASE)} commissionable every month. This is how the plan divides it.`}
            />
            <CardBody>
              <BarList
                ariaLabel="Share of the commissionable base by reward bucket"
                items={[
                  ...REWARD_BUCKETS.map((bucket, index) => ({
                    label: bucket.label.replace('Suvarna ', ''),
                    value: bucket.share,
                    display: bpsLabel(bucket.share),
                    color: INCOME_SERIES[index]?.color,
                    note: moneyShort((COMMISSIONABLE_BASE * bucket.share) / 10_000),
                  })),
                  {
                    label: 'Unallocated',
                    value: 10_000 - REWARD_BUCKETS.reduce((total, bucket) => total + bucket.share, 0),
                    display: bpsLabel(
                      10_000 - REWARD_BUCKETS.reduce((total, bucket) => total + bucket.share, 0),
                    ),
                    color: 'rgb(var(--s-other))',
                    note: 'company',
                  },
                ]}
              />
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader
            title="Level reward, level by level"
            hint="Each level opens with one more direct referral."
          />
          <CardBody className="px-0 py-0">
            <div className="px-3 py-2">
              <DataTable
                caption="Level reward breakdown"
                columns={[
                  { key: 'level', label: 'Level' },
                  { key: 'rate', label: 'Rate', align: 'right' },
                  { key: 'members', label: 'Active', align: 'right' },
                  { key: 'earned', label: 'Earned', align: 'right' },
                ]}
              >
                {income.level.rows.map((row) => (
                  <tr key={row.level} className="hover:bg-raised/60">
                    <Td>
                      <span className="text-ink">Level {row.level}</span>
                      {row.unlocked ? null : (
                        <Badge tone="neutral" className="ml-2">
                          {row.directsRequired} directs
                        </Badge>
                      )}
                    </Td>
                    <Td align="right">{bpsLabel(row.rate)}</Td>
                    <Td align="right">{count(row.activeMembers)}</Td>
                    <Td align="right" className={row.unlocked ? '' : 'text-faint line-through'}>
                      {money(row.unlocked ? row.earned : row.potential)}
                    </Td>
                  </tr>
                ))}
              </DataTable>
            </div>
            <div className="border-t border-line px-5 py-4 text-[13px] leading-relaxed text-muted">
              {income.level.unlockedLevels} of 10 levels are open, paying {money(income.level.total)} this
              month.
              {income.level.forfeited > 0
                ? ` A further ${money(income.level.forfeited)} sits behind locked levels.`
                : ' Nothing is locked.'}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Figure({ label, value, tone }: { label: string; value: ReactNode; tone?: 'critical' }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className={`figure-md mt-1.5 ${tone === 'critical' ? 'text-critical' : 'text-ink'}`}>{value}</p>
    </div>
  );
}
