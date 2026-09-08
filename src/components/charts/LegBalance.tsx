import { count } from '@/lib/format';
import { useMeasure } from './chart-utils';

/**
 * The binary legs, mirrored around a shared centre line.
 *
 * A binary plan pays on the weaker leg, so the thing worth seeing is the
 * imbalance rather than the size of either side. Volume that matched into pairs
 * is drawn solid; the overhang that found no partner is drawn pale, which makes
 * wasted volume on the strong leg obvious at a glance.
 */

const HEIGHT = 132;
const BAR_HEIGHT = 22;
/** Room reserved outside the longest bar for its value label. */
const LABEL_GUTTER = 62;

export function LegBalance({
  left,
  right,
  matchedLeft,
  matchedRight,
}: {
  left: number;
  right: number;
  matchedLeft: number;
  matchedRight: number;
}) {
  const [ref, size] = useMeasure<HTMLDivElement>();
  const width = Math.max(size.width, 260);
  const centre = width / 2;
  const half = Math.max(centre - LABEL_GUTTER, 20);
  const max = Math.max(left, right, 1);
  const scale = (value: number) => (value / max) * half;

  const legs = [
    { side: 'Left leg', total: left, matched: matchedLeft, labelY: 14, barY: 22, color: 'rgb(var(--s1))', dir: -1 },
    { side: 'Right leg', total: right, matched: matchedRight, labelY: 68, barY: 76, color: 'rgb(var(--s3))', dir: 1 },
  ] as const;

  return (
    <div ref={ref}>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`Left leg ${left} business volume, right leg ${right}. Matched volume is drawn solid.`}
        className="block"
      >
        <line x1={centre} x2={centre} y1={6} y2={HEIGHT - 18} className="stroke-line" strokeWidth={1} />

        {legs.map((leg) => {
          const total = Math.max(scale(leg.total), 3);
          const matched = Math.max(scale(Math.min(leg.matched, leg.total)), 2);
          const start = leg.dir === -1 ? centre - total : centre;
          const matchedStart = leg.dir === -1 ? centre - matched : centre;

          return (
            <g key={leg.side}>
              <text
                x={centre + leg.dir * 6}
                y={leg.labelY}
                textAnchor={leg.dir === -1 ? 'end' : 'start'}
                className="fill-muted text-[11px] font-medium uppercase tracking-wider"
              >
                {leg.side}
              </text>

              {/* Total volume, pale. */}
              <rect x={start} y={leg.barY} width={total} height={BAR_HEIGHT} rx={4} fill={leg.color} opacity={0.22} />
              {/* Volume that actually matched, solid. */}
              <rect x={matchedStart} y={leg.barY} width={matched} height={BAR_HEIGHT} rx={4} fill={leg.color} />

              <text
                x={centre + leg.dir * (total + 10)}
                y={leg.barY + BAR_HEIGHT / 2}
                dy="0.32em"
                textAnchor={leg.dir === -1 ? 'end' : 'start'}
                className="tnum fill-ink text-[12px] font-semibold"
              >
                {count(leg.total)} BV
              </text>
            </g>
          );
        })}

        <text x={0} y={HEIGHT - 4} className="fill-faint text-[11px]">
          Solid shows volume matched into pairs
        </text>
      </svg>
    </div>
  );
}
