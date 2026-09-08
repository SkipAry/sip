import { useState } from 'react';
import { moneyShort, money } from '@/lib/format';
import type { IncomeMonth } from '@/data/generate';
import { bandIndexAt, barPath, linearScale, niceTicks, useMeasure } from './chart-utils';
import { ChartTooltip, TooltipRow } from './Tooltip';
import { Legend } from './Legend';

/**
 * Monthly income, split by the four reward buckets.
 *
 * A stacked bar is the right form here: the reader needs both the monthly total
 * (the stack height) and the mix inside it. Segments carry a 2px surface gap so
 * adjacent colours never touch, and every value is also available in the table
 * view beside the chart.
 */

export const INCOME_SERIES = [
  { key: 'referral', label: 'Referral', color: 'rgb(var(--s1))' },
  { key: 'level', label: 'Level', color: 'rgb(var(--s2))' },
  { key: 'matching', label: 'Matching', color: 'rgb(var(--s3))' },
  { key: 'leadership', label: 'Leadership', color: 'rgb(var(--s4))' },
] as const;

type SeriesKey = (typeof INCOME_SERIES)[number]['key'];

const MARGIN = { top: 12, right: 8, bottom: 26, left: 46 };
const HEIGHT = 240;
const SEGMENT_GAP = 2;

export function StackedIncomeChart({ data }: { data: readonly IncomeMonth[] }) {
  const [ref, size] = useMeasure<HTMLDivElement>();
  const [hovered, setHovered] = useState<number | null>(null);

  const width = Math.max(size.width, 280);
  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 10);
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  const peak = Math.max(...data.map((row) => row.total), 1);
  const { ticks, max } = niceTicks(peak / 100);
  const y = linearScale([0, max], [MARGIN.top + plotHeight, MARGIN.top]);

  const bandWidth = plotWidth / Math.max(data.length, 1);
  const barWidth = Math.min(bandWidth * 0.62, 34);

  const active = hovered === null ? null : data[hovered];

  return (
    <div className="relative" ref={ref}>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label="Monthly income by reward type over the last twelve months"
        className="block touch-none"
        onPointerMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          setHovered(bandIndexAt(event.clientX - bounds.left, MARGIN.left, plotWidth, data.length));
        }}
        onPointerLeave={() => setHovered(null)}
      >
        {/* Recessive gridlines and value axis. */}
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

        {data.map((row, index) => {
          const bandLeft = MARGIN.left + index * bandWidth;
          const x = bandLeft + (bandWidth - barWidth) / 2;
          const dim = hovered !== null && hovered !== index;

          let cursor = 0;
          return (
            <g key={row.label} opacity={dim ? 0.4 : 1} style={{ transition: 'opacity 120ms' }}>
              {INCOME_SERIES.map((series, seriesIndex) => {
                const value = row[series.key as SeriesKey] / 100;
                if (value <= 0) return null;

                const top = y(cursor + value);
                const bottom = y(cursor);
                cursor += value;

                const isTop = seriesIndex === lastVisibleIndex(row);
                const gap = seriesIndex === 0 ? 0 : SEGMENT_GAP;
                const height = Math.max(bottom - top - gap, 0.5);

                return (
                  <path
                    key={series.key}
                    d={
                      isTop
                        ? barPath(x, top, barWidth, height, 4)
                        : barPath(x, top, barWidth, height, 0)
                    }
                    fill={series.color}
                  />
                );
              })}
              <text
                x={bandLeft + bandWidth / 2}
                y={HEIGHT - 8}
                textAnchor="middle"
                className="fill-faint text-[10px]"
              >
                {row.label}
              </text>
            </g>
          );
        })}
      </svg>

      {active ? (
        <ChartTooltip
          x={MARGIN.left + (hovered! + 0.5) * bandWidth}
          y={HEIGHT / 2}
          width={width}
        >
          <p className="mb-1 text-[12px] font-semibold text-ink">
            {new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(active.date)}
          </p>
          {INCOME_SERIES.map((series) => (
            <TooltipRow
              key={series.key}
              color={series.color}
              label={series.label}
              value={money(active[series.key as SeriesKey])}
            />
          ))}
          <div className="mt-1 border-t border-line pt-1">
            <TooltipRow label="Total" value={money(active.total)} emphasis />
          </div>
        </ChartTooltip>
      ) : null}

      <Legend className="mt-3 pl-11" items={INCOME_SERIES.map((s) => ({ label: s.label, color: s.color }))} />
    </div>
  );
}

function lastVisibleIndex(row: IncomeMonth): number {
  for (let index = INCOME_SERIES.length - 1; index >= 0; index -= 1) {
    if (row[INCOME_SERIES[index]!.key as SeriesKey] > 0) return index;
  }
  return 0;
}
