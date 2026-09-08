import { Badge, Card, CardBody, CardHeader, DataTable, Meter, Notice, Stat, Td } from '@/components/ui';
import { BarList } from '@/components/charts/BarList';
import type { Account } from '@/data/generate';
import { evaluateAllRanks, RANKS } from '@/lib/plan';
import { bpsLabel, count, money } from '@/lib/format';

export function Rank({ account }: { account: Account }) {
  const ladder = evaluateAllRanks(account.standing);
  const held = account.rank;
  const leadership = account.leadership;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Rank held"
          value={held?.label ?? 'None yet'}
          tone={held ? 'gold' : undefined}
          sub={held ? `Tier ${held.tier} of ${RANKS.length}` : 'Ten directs unlock the first rank'}
        />
        <Stat
          label="Daily matching cap"
          value={held?.dailyMatchingCap !== null && held ? money(held.dailyMatchingCap!) : '—'}
          sub={
            account.income.matching.capIsFallback
              ? 'Inherited from the next lower rank; the plan omits this one'
              : 'The most matching income a single day can pay'
          }
        />
        <Stat
          label="Leadership pool"
          value={money(leadership.pool)}
          sub={`${count(leadership.contributors)} contributions of ${money(10_000)} this month`}
        />
        <Stat
          label="Your pool share"
          value={money(account.income.leadership.earned)}
          sub={held ? `${bpsLabel(held.leadershipPoolShare)} slice, split between its qualifiers` : 'Rank first'}
        />
      </div>

      <Card>
        <CardHeader
          title="The rank ladder"
          hint="Every rank needs ten directs, a team size, business volume, active members and at least one matched pair."
        />
        <CardBody className="space-y-4">
          {ladder.map((entry) => {
            const isHeld = entry.qualified;
            return (
              <div
                key={entry.rank.id}
                className={`rounded-card border p-4 ${
                  isHeld ? 'border-gold/40 bg-gold/5' : 'border-line'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[14px] font-semibold text-ink">{entry.rank.label}</span>
                    {isHeld ? <Badge tone="gold">Achieved</Badge> : null}
                  </div>
                  <span className="tnum text-[12px] text-muted">
                    {Math.round(entry.progress * 100)}% of the way
                  </span>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {entry.criteria.map((criterion) => (
                    <div key={criterion.id}>
                      <div className="flex items-baseline justify-between gap-2 text-[12px]">
                        <span className="text-faint">{criterion.label}</span>
                        <span className={`tnum ${criterion.met ? 'text-positive' : 'text-ink'}`}>
                          {criterion.unspecified
                            ? 'Not stated'
                            : `${count(criterion.current)} / ${count(criterion.required)}`}
                        </span>
                      </div>
                      <Meter
                        className="mt-1.5"
                        value={criterion.progress}
                        tone={criterion.met ? 'positive' : 'neutral'}
                        label={`${entry.rank.label} ${criterion.label}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Leadership pool this month"
            hint="Each rank takes a fixed share of the pool, divided between everyone holding it."
          />
          <CardBody className="px-0 py-0">
            <div className="px-3 py-2">
              <DataTable
                caption="Leadership pool distribution"
                columns={[
                  { key: 'rank', label: 'Rank' },
                  { key: 'share', label: 'Share', align: 'right' },
                  { key: 'slice', label: 'Slice', align: 'right' },
                  { key: 'qualifiers', label: 'Qualifiers', align: 'right' },
                  { key: 'each', label: 'Each', align: 'right' },
                ]}
              >
                {leadership.slices.map((slice) => (
                  <tr
                    key={slice.rank}
                    className={slice.rank === held?.id ? 'bg-gold/8' : 'hover:bg-raised/60'}
                  >
                    <Td>{slice.label}</Td>
                    <Td align="right">{bpsLabel(slice.share)}</Td>
                    <Td align="right">{money(slice.slice)}</Td>
                    <Td align="right">{count(slice.qualifiers)}</Td>
                    <Td align="right" className="font-medium">
                      {slice.qualifiers > 0 ? money(slice.perQualifier) : '—'}
                    </Td>
                  </tr>
                ))}
              </DataTable>
            </div>
            {leadership.undistributed > 0 ? (
              <div className="border-t border-line px-5 py-4">
                <Notice tone="info" title={`${money(leadership.undistributed)} of the pool has no claimant`}>
                  No member holds those ranks this month, so those slices pay out to nobody.
                </Notice>
              </div>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Daily matching caps by rank"
            hint="The cap is what makes rank worth chasing: it sets the ceiling on a single day of matching."
          />
          <CardBody>
            <BarList
              ariaLabel="Daily matching cap by rank"
              items={RANKS.map((rank) => ({
                label: rank.label.replace(' Leader', '').replace('Suvarna ', ''),
                value: rank.dailyMatchingCap ?? 0,
                display: rank.dailyMatchingCap === null ? 'Not stated' : money(rank.dailyMatchingCap),
                color: rank.id === held?.id ? 'rgb(var(--c-gold))' : 'rgb(var(--s-other))',
              }))}
            />
            <Notice tone="caution" title="Ruby Leader has no stated cap">
              The plan lists caps for Associate, Silver, Gold, Diamond and Crown. A Ruby Leader inherits the Gold cap
              here until the company decides one.
            </Notice>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
