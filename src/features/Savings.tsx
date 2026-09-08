import { useState } from 'react';
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  Meter,
  Money,
  Notice,
  ScrollPanel,
  SegmentedControl,
  Stat,
  Td,
} from '@/components/ui';
import { LadderChart } from '@/components/charts/LadderChart';
import type { Account } from '@/data/generate';
import { buildBenefitChart, SAVINGS, type InstalmentStatus } from '@/lib/plan';
import { count, dateLabel, money, percent } from '@/lib/format';
import { publicDraws } from '@/lib/spin-view';

const STATUS_TONE: Record<InstalmentStatus, 'positive' | 'gold' | 'neutral' | 'critical' | 'info'> = {
  paid: 'positive',
  due: 'gold',
  scheduled: 'neutral',
  missed: 'critical',
  settled: 'info',
};

const STATUS_LABEL: Record<InstalmentStatus, string> = {
  paid: 'Paid',
  due: 'Due now',
  scheduled: 'Scheduled',
  missed: 'Missed',
  settled: 'Settled by spin',
};

export function Savings({ account }: { account: Account }) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const chart = buildBenefitChart();
  const { position } = account;
  // The row for the month the member has actually paid up to, so the headline
  // benefit is always measured against the deposits behind it.
  const currentRow = chart[Math.min(Math.max(position.monthsPaid, 1), chart.length) - 1]!;
  // Members read results; only the admin console can publish a draw.
  const draws = publicDraws(account.draws);
  const isPublished = draws.some((draw) => draw.published);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Paid to date"
          value={<Money amount={position.paid} size="lg" />}
          sub={`${position.monthsPaid} instalments of ${money(SAVINGS.monthlyDeposit)}`}
          footer={<Meter value={position.progress} label="Term progress" />}
        />
        <Stat
          label="Still to pay"
          value={<Money amount={position.outstanding} size="lg" />}
          sub={`${position.monthsRemaining} months left`}
        />
        <Stat
          label="Gold at maturity"
          value={<Money amount={SAVINGS.maturityValue} size="lg" tone="gold" animate />}
          accent
          sub={`Paid in month ${SAVINGS.maturityMonth}, on ${dateLabel(position.maturityDate)}`}
        />
        <Stat
          label="If the spin lands now"
          value={<Money amount={currentRow.benefit} size="lg" />}
          sub={`${money(currentRow.upside)} above everything you have deposited, and the deposits stop`}
        />
      </div>

      <Notice tone="info" title="How the two outcomes differ">
        Winning the spin ends the plan early: you take that month’s gold and stop paying. Holding to the end
        pays {money(SAVINGS.maturityValue)} in month {SAVINGS.maturityMonth} after all {SAVINGS.termMonths}{' '}
        instalments. The document states that between {SAVINGS.maturityCohort.min} and{' '}
        {SAVINGS.maturityCohort.max} people receive the maturity amount.
      </Notice>

      <Card>
        <CardHeader
          title="The 30-month ladder"
          hint="What you have put in against what a spin win pays in the same month."
          actions={
            <SegmentedControl
              label="Ladder view"
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
            <LadderChart rows={chart} markerMonth={Math.max(position.monthsPaid, 1)} />
          ) : (
            <DataTable
              caption="Lucky winner benefit chart"
              columns={[
                { key: 'month', label: 'Month' },
                { key: 'deposit', label: 'Deposited', align: 'right' },
                { key: 'benefit', label: 'Benefit if you win', align: 'right' },
                { key: 'upside', label: 'Upside', align: 'right' },
              ]}
            >
              {chart.map((row) => (
                <tr key={row.month} className="hover:bg-raised/60">
                  <Td>Month {row.month}</Td>
                  <Td align="right">{money(row.cumulativeDeposit)}</Td>
                  <Td align="right">{money(row.benefit)}</Td>
                  <Td align="right" className="text-positive">
                    {money(row.upside)}
                  </Td>
                </tr>
              ))}
            </DataTable>
          )}
        </CardBody>
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Your instalments" hint="Every month of the term, and where each one stands." />
          <CardBody className="px-0 py-0">
            <ScrollPanel maxHeight={420}>
              <DataTable
                stickyHeader
                caption="Instalment ledger"
                columns={[
                  { key: 'month', label: 'Month' },
                  { key: 'due', label: 'Due date' },
                  { key: 'amount', label: 'Amount', align: 'right' },
                  { key: 'status', label: 'Status', align: 'right' },
                ]}
                className="px-2"
              >
                {account.ledger.map((row) => (
                  <tr key={row.month} className="hover:bg-raised/60">
                    <Td>Month {row.month}</Td>
                    <Td>{dateLabel(row.dueDate)}</Td>
                    <Td align="right">{row.payable > 0 ? money(row.payable) : '—'}</Td>
                    <Td align="right">
                      <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge>
                    </Td>
                  </tr>
                ))}
              </DataTable>
            </ScrollPanel>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Spin results"
            hint="One winner is drawn from the paying pool each month. Draws are run by the main admin."
            actions={
              isPublished ? (
                <Badge tone="positive">Published</Badge>
              ) : (
                <Badge tone="neutral">Sample history</Badge>
              )
            }
          />
          <CardBody className="px-0 py-0">
            <ScrollPanel maxHeight={420} className="px-2">
              <DataTable
                stickyHeader
                caption="Monthly lucky spin draws"
                columns={[
                  { key: 'month', label: 'Draw' },
                  { key: 'winner', label: 'Winner' },
                  { key: 'benefit', label: 'Gold awarded', align: 'right' },
                ]}
              >
                {draws.map((draw) => (
                  <tr key={draw.month} className="hover:bg-raised/60">
                    <Td>
                      <span className="text-muted">M{draw.month}</span>
                    </Td>
                    <Td>
                      <span className="text-ink">{draw.winnerName}</span>
                      <span className="tnum ml-2 text-[11px] text-faint">1 in {count(draw.poolSize)}</span>
                    </Td>
                    <Td align="right">{money(draw.benefit)}</Td>
                  </tr>
                ))}
              </DataTable>
            </ScrollPanel>
            <div className="border-t border-line px-5 py-4 text-[13px] leading-relaxed text-muted">
              Your number has not come up yet. Across the {SAVINGS.termMonths - account.position.monthsPaid}{' '}
              draws left in your term the chance of winning at least once is{' '}
              <strong className="tnum text-ink">{percent(account.spinChance.remainingTerm, 1)}</strong>.
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
