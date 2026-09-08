import { useMemo, useState } from 'react';
import { Badge, Card, CardBody, CardHeader, DataTable, Notice, Stat, Td } from '@/components/ui';
import { SpinWheel } from './SpinWheel';
import { benefitForMonth, SAVINGS } from '@/lib/plan';
import { clearDraws, listDraws, runDraw, type Draw, type DrawCandidate } from '@/lib/auth/store';
import type { Account } from '@/data/generate';
import { count, dateLabel, money } from '@/lib/format';

/**
 * The Spin and Win console. Reachable only by an admin: `App` routes on role,
 * and this component additionally refuses to draw without an admin id, so the
 * control cannot be driven from a member session even if the route is forced.
 */
export function SpinConsole({ account, adminId }: { account: Account; adminId: string }) {
  const [draws, setDraws] = useState<Draw[]>(() => listDraws());
  const [spinningFor, setSpinningFor] = useState<number | null>(null);
  const [result, setResult] = useState<Draw | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Members still paying in and not yet drawn are the eligible pool. */
  const candidates: DrawCandidate[] = useMemo(() => {
    const alreadyWon = new Set(draws.map((draw) => draw.winnerId));
    return account.team
      .filter((member) => member.active && member.spinWonInMonth === null && !alreadyWon.has(member.id))
      .map((member) => ({ id: member.id, name: member.name }));
  }, [account.team, draws]);

  const drawnMonths = new Set(draws.map((draw) => draw.month));
  const nextMonth = useMemo(() => {
    for (let month = 1; month <= SAVINGS.termMonths; month += 1) {
      if (!drawnMonths.has(month)) return month;
    }
    return null;
  }, [drawnMonths]);

  function startSpin() {
    setError(null);
    setResult(null);

    if (nextMonth === null) {
      setError(`All ${SAVINGS.termMonths} monthly draws have been run.`);
      return;
    }
    if (candidates.length === 0) {
      setError('No eligible members are in the pool. Every active member has already won.');
      return;
    }
    setSpinningFor(nextMonth);
  }

  /** Called by the wheel once its animation lands. */
  function settle(month: number) {
    try {
      const draw = runDraw({
        month,
        benefit: benefitForMonth(month),
        candidates,
        drawnBy: adminId,
      });
      setDraws(listDraws());
      setResult(draw);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The draw could not be completed.');
    } finally {
      setSpinningFor(null);
    }
  }

  return (
    <div className="space-y-5">
      <Notice tone="gold" title="Admin-only control">
        Running a draw is restricted to the main admin. Members see published results on their own dashboard and have
        no way to trigger a spin.
      </Notice>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Next draw"
          value={nextMonth === null ? 'Complete' : `Month ${nextMonth}`}
          tone="gold"
          sub={nextMonth === null ? 'Every month of the term has been drawn' : `Awards ${money(benefitForMonth(nextMonth))} in gold`}
        />
        <Stat label="Eligible pool" value={count(candidates.length)} sub="Active members who have not yet won" />
        <Stat label="Draws published" value={count(draws.length)} sub={`Of ${SAVINGS.termMonths} in the term`} />
        <Stat
          label="Gold awarded"
          value={money(draws.reduce((total, draw) => total + draw.benefit, 0))}
          sub="Across every published draw"
        />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader
            title="Run the monthly spin"
            hint="One winner is drawn from the eligible pool. A month can only be drawn once."
          />
          <CardBody>
            <SpinWheel
              candidates={candidates}
              spinningFor={spinningFor}
              onSettled={settle}
            />

            <button
              type="button"
              onClick={startSpin}
              disabled={spinningFor !== null || nextMonth === null || candidates.length === 0}
              className="mt-5 w-full rounded-lg bg-gold px-4 py-2.5 text-[14px] font-semibold text-canvas transition-opacity disabled:opacity-50"
            >
              {spinningFor !== null
                ? `Spinning for month ${spinningFor}…`
                : nextMonth === null
                  ? 'All draws complete'
                  : `Spin for month ${nextMonth}`}
            </button>

            {error ? (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-critical/40 bg-critical/10 px-3 py-2 text-[13px] text-critical"
              >
                {error}
              </p>
            ) : null}

            {result ? (
              <div className="mt-4 rounded-card border border-gold/40 bg-gold/8 p-4">
                <p className="text-[12px] font-medium uppercase tracking-wider text-gold">
                  Month {result.month} winner
                </p>
                <p className="mt-1 text-[20px] font-semibold text-ink">{result.winnerName}</p>
                <p className="tnum mt-0.5 text-[13px] text-muted">{result.winnerId}</p>
                <p className="mt-3 text-[13px] leading-relaxed text-muted">
                  Awarded {money(result.benefit)} in gold, drawn from {count(result.poolSize)} eligible members. Their
                  remaining instalments stop from next month.
                </p>
              </div>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Published results"
            hint="What every member sees. Results are final once drawn."
            actions={
              draws.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    clearDraws();
                    setDraws([]);
                    setResult(null);
                  }}
                  className="rounded-md border border-line px-2.5 py-1 text-[12px] font-medium text-muted hover:text-critical"
                >
                  Clear demo results
                </button>
              ) : undefined
            }
          />
          <CardBody className="px-0 py-0">
            {draws.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-faint">
                No draw has been run yet. Spin for month 1 to publish the first result.
              </p>
            ) : (
              <div className="max-h-[420px] overflow-y-auto px-3 py-2">
                <DataTable
                  caption="Published lucky spin results"
                  columns={[
                    { key: 'month', label: 'Draw' },
                    { key: 'winner', label: 'Winner' },
                    { key: 'benefit', label: 'Gold awarded', align: 'right' },
                    { key: 'when', label: 'Drawn', align: 'right' },
                  ]}
                >
                  {draws.map((draw) => (
                    <tr key={draw.month} className="hover:bg-raised/60">
                      <Td>
                        <Badge tone="gold">M{draw.month}</Badge>
                      </Td>
                      <Td>
                        <span className="text-ink">{draw.winnerName}</span>
                        <span className="tnum ml-2 text-[11px] text-faint">{draw.winnerId}</span>
                      </Td>
                      <Td align="right">{money(draw.benefit)}</Td>
                      <Td align="right" className="text-muted">
                        {dateLabel(new Date(draw.drawnAt))}
                      </Td>
                    </tr>
                  ))}
                </DataTable>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
