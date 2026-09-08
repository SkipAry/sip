import { useState } from 'react';
import { money, moneyShort } from '@/lib/format';
import type { BenefitRow } from '@/lib/plan';
import { areaPath, bandIndexAt, linePath, linearScale, niceTicks, useMeasure } from './chart-utils';
import { ChartTooltip, TooltipRow } from './Tooltip';
import { Legend } from './Legend';

/**
 * The 30-month ladder: what the member has put in against what a spin win would
 * pay out in the same month. Two series on one shared rupee axis — never two
 * scales — so the constant Rs 15,000 gap between them is legible as a gap.
 */

const MARGIN = { top: 14, right: 14, bottom: 26, left: 46 };
const HEIGHT = 250;

const DEPOSIT_COLOR = 'rgb(var(--s1))';
const BENEFIT_COLOR = 'rgb(var(--s3))';

export function LadderChart({
  rows,
  markerMonth,
}: {
  rows: readonly BenefitRow[];
  /** The member's current month, drawn as a reference line. */
  markerMonth?: number;
}) {
  const [ref, size] = useMeasure<HTMLDivElement>();
  const [hovered, setHovered] = useState<number | null>(null);

  const width = Math.max(size.width, 280);
  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 10);
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  const peak = Math.max(...rows.map((row) => row.benefit), 1) / 100;
  const { ticks, max } = niceTicks(peak);
  const y = linearScale([0, max], [MARGIN.top + plotHeight, MARGIN.top]);
  const x = linearScale([1, rows.length], [MARGIN.left, MARGIN.left + plotWidth]);

  const depositPoints = rows.map((row) => ({ x: x(row.month), y: y(row.cumulativeDeposit / 100) }));
  const benefitPoints = rows.map((row) => ({ x: x(row.month), y: y(row.benefit / 100) }));
  const active = hovered === null ? null : rows[hovered];

  return (
    <div className="relative" ref={ref}>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label="Cumulative deposits against the lucky-spin benefit across the 30-month term"
        className="block touch-none"
        onPointerMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          setHovered(bandIndexAt(event.clientX - bounds.left, MARGIN.left, plotWidth, rows.length));
        }}
        onPointerLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id="benefit-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BENEFIT_COLOR} stopOpacity="0.18" />
            <stop offset="100%" stopColor={BENEFIT_COLOR} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={MARGIN.left}
              x2={MARGIN.left + plotWidth}
              y1={y(tick)}
              y2={y(tick)}
              className="stroke-line"
              strokeWidth={1}
              strokeDasharray={tick === 0 ? undefined : '2 4'}
            />
            <text
              x={MARGIN.left - 8}
              y={y(tick)}
              dy="0.32em"
              textAnchor="end"
              className="tnum fill-faint text-[10px]"
            >
              {tick === 0 ? '0' : moneyShort(tick * 100)}
            </text>
          </g>
        ))}

        <path d={areaPath(benefitPoints, MARGIN.top + plotHeight)} fill="url(#benefit-fill)" />
        <path d={linePath(benefitPoints)} fill="none" stroke={BENEFIT_COLOR} strokeWidth={2} strokeLinecap="round" />
        <path
          d={linePath(depositPoints)}
          fill="none"
          stroke={DEPOSIT_COLOR}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray="5 4"
        />

        {markerMonth ? (
          <g>
            <line
              x1={x(markerMonth)}
              x2={x(markerMonth)}
              y1={MARGIN.top}
              y2={MARGIN.top + plotHeight}
              className="stroke-gold"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
            <text
              x={x(markerMonth) + 5}
              y={MARGIN.top + 10}
              className="fill-gold text-[10px] font-medium"
            >
              You are here
            </text>
          </g>
        ) : null}

        {active ? (
          <g>
            <line
              x1={x(active.month)}
              x2={x(active.month)}
              y1={MARGIN.top}
              y2={MARGIN.top + plotHeight}
              className="stroke-faint"
              strokeWidth={1}
            />
            <circle
              cx={x(active.month)}
              cy={y(active.benefit / 100)}
              r={4.5}
              fill={BENEFIT_COLOR}
              className="stroke-surface"
              strokeWidth={2}
            />
            <circle
              cx={x(active.month)}
              cy={y(active.cumulativeDeposit / 100)}
              r={4.5}
              fill={DEPOSIT_COLOR}
              className="stroke-surface"
              strokeWidth={2}
            />
          </g>
        ) : null}

        {[1, 6, 12, 18, 24, 30].map((month) => (
          <text
            key={month}
            x={x(month)}
            y={HEIGHT - 8}
            textAnchor="middle"
            className="fill-faint text-[10px]"
          >
            {`M${month}`}
          </text>
        ))}
      </svg>

      {active ? (
        <ChartTooltip x={x(active.month)} y={HEIGHT / 2} width={width}>
          <p className="mb-1 text-[12px] font-semibold text-ink">Month {active.month}</p>
          <TooltipRow color={DEPOSIT_COLOR} label="Deposited" value={money(active.cumulativeDeposit)} />
          <TooltipRow color={BENEFIT_COLOR} label="If you win" value={money(active.benefit)} />
          <div className="mt-1 border-t border-line pt-1">
            <TooltipRow label="Upside" value={money(active.upside)} emphasis />
          </div>
        </ChartTooltip>
      ) : null}

      <Legend
        className="mt-3 pl-11"
        items={[
          { label: 'Deposited to date', color: DEPOSIT_COLOR },
          { label: 'Gold if the spin lands', color: BENEFIT_COLOR },
        ]}
      />
    </div>
  );
}
