import { useMemo, useState } from 'react';
import { Card, CardBody, CardHeader, DataTable, Money, Notice, Stat, Td } from '@/components/ui';
import { BarList } from '@/components/charts/BarList';
import { projectTeam, statedProjection, PROJECTION_STATED, MATCHING } from '@/lib/plan';
import { count, money, percent } from '@/lib/format';

/**
 * The document's four-level illustration, beside a calculator driven by real
 * team shape. Printing the illustration on its own would be misleading; putting
 * an honest model next to it lets a member see what changes when duplication is
 * imperfect.
 */
export function Calculator() {
  const [width, setWidth] = useState(6);
  const [depth, setDepth] = useState(4);
  const [activeRate, setActiveRate] = useState(0.55);
  const [weakLegShare, setWeakLegShare] = useState(0.4);

  const stated = useMemo(() => statedProjection(), []);
  const projection = useMemo(
    () => projectTeam({ width, depth, activeRate, weakLegShare }),
    [width, depth, activeRate, weakLegShare],
  );

  const teamSize = projection.rows.reduce((total, row) => total + row.members, 0);
  const share = projection.monthlyIncome / PROJECTION_STATED.monthlyIncome;

  return (
    <div className="space-y-5">
      <Notice tone="caution" title="The printed illustration is a ceiling, not a forecast">
        Reaching {money(PROJECTION_STATED.monthlyIncome)} a month needs an 11,110-member team in which every
        single member sponsors ten actives across four levels and all of them keep depositing. Use the
        controls below to see what a real team shape pays.
      </Notice>

      <Card>
        <CardHeader title="Your team shape" hint="Move these to match the business you actually have." />
        <CardBody className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Slider
            label="Directs per member"
            value={width}
            min={1}
            max={10}
            step={1}
            display={count(width)}
            onChange={setWidth}
          />
          <Slider
            label="Levels deep"
            value={depth}
            min={1}
            max={4}
            step={1}
            display={count(depth)}
            onChange={setDepth}
          />
          <Slider
            label="Still depositing"
            value={activeRate}
            min={0.1}
            max={1}
            step={0.05}
            display={percent(activeRate)}
            onChange={setActiveRate}
          />
          <Slider
            label="Volume on the weaker leg"
            value={weakLegShare}
            min={0}
            max={0.5}
            step={0.05}
            display={percent(weakLegShare)}
            onChange={setWeakLegShare}
          />
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Team size"
          value={count(teamSize)}
          sub={`Across ${depth} level${depth === 1 ? '' : 's'}`}
        />
        <Stat
          label="Level income"
          value={<Money amount={projection.teamIncome} size="lg" />}
          sub="Paid on the team's monthly deposits"
        />
        <Stat
          label="Binary income"
          value={<Money amount={projection.binaryIncome} size="lg" />}
          sub={`${count(projection.binaryPairs)} pairs at ${money(MATCHING.payoutPerPair)}`}
        />
        <Stat
          label="Monthly total"
          value={<Money amount={projection.monthlyIncome} size="lg" tone="gold" />}
          accent
          sub={`${percent(share, 1)} of the printed illustration`}
        />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Your projection, level by level" />
          <CardBody>
            <BarList
              ariaLabel="Projected income by level"
              items={projection.rows.map((row) => ({
                label: `Level ${row.level}`,
                value: row.total,
                display: money(row.total),
                note: `${count(row.members)} members`,
              }))}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="The document's illustration"
            hint="Reproduced exactly as printed on page 3, for comparison."
          />
          <CardBody className="px-0 py-0">
            <div className="px-3 py-2">
              <DataTable
                caption="Estimated earning for one ID across four levels"
                columns={[
                  { key: 'level', label: 'Level' },
                  { key: 'members', label: 'Team', align: 'right' },
                  { key: 'per', label: 'Per member', align: 'right' },
                  { key: 'total', label: 'Total', align: 'right' },
                ]}
              >
                {stated.rows.map((row) => (
                  <tr key={row.level}>
                    <Td>Level {row.level}</Td>
                    <Td align="right">{count(row.members)}</Td>
                    <Td align="right">{money(row.incomePerMember)}</Td>
                    <Td align="right">{money(row.total)}</Td>
                  </tr>
                ))}
                <tr className="border-t-2 border-line font-medium">
                  <Td>Team income</Td>
                  <Td align="right">{count(11_110)}</Td>
                  <Td align="right">—</Td>
                  <Td align="right">{money(stated.teamIncome)}</Td>
                </tr>
                <tr>
                  <Td>Binary income</Td>
                  <Td align="right">—</Td>
                  <Td align="right">{money(MATCHING.payoutPerPair)}</Td>
                  <Td align="right">{money(stated.binaryIncome)}</Td>
                </tr>
                <tr className="font-semibold">
                  <Td>Monthly total</Td>
                  <Td align="right">—</Td>
                  <Td align="right">—</Td>
                  <Td align="right" className="text-gold">
                    {money(stated.monthlyIncome)}
                  </Td>
                </tr>
              </DataTable>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (next: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-medium uppercase tracking-wider text-faint">{label}</span>
        <span className="tnum text-[13px] font-semibold text-ink">{display}</span>
      </span>
      <input
        type="range"
        className="mt-2 w-full accent-[rgb(var(--c-gold))]"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
