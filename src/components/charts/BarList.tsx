/**
 * A horizontal bar list for single-measure magnitude comparisons.
 *
 * Built from HTML rather than SVG on purpose: labels here are arbitrary-length
 * text, and only real text layout can truncate, wrap and stay legible at every
 * width. Every bar is directly labelled with its own value, so the chart reads
 * without a legend, without a tooltip and without colour. Where a bar carries a
 * series identity the colour is passed in; otherwise one brand hue is used,
 * because length alone carries the meaning.
 */

export interface BarListItem {
  label: string;
  value: number;
  /** Pre-formatted value shown at the end of the row. */
  display: string;
  color?: string;
  /** Optional secondary figure, shown under the label. */
  note?: string;
}

export function BarList({ items, ariaLabel }: { items: readonly BarListItem[]; ariaLabel: string }) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <ul className="space-y-2.5" aria-label={ariaLabel}>
      {items.map((item) => {
        const share = item.value > 0 ? Math.max((item.value / max) * 100, 1.5) : 0;

        return (
          <li
            key={item.label}
            className="grid grid-cols-[minmax(84px,1fr)_minmax(0,2.2fr)_auto] items-center gap-3"
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] leading-tight text-ink" title={item.label}>
                {item.label}
              </p>
              {item.note ? (
                <p className="tnum truncate text-[11px] leading-tight text-faint">{item.note}</p>
              ) : null}
            </div>

            <div className="h-3 w-full overflow-hidden rounded bg-line/60">
              <div
                className="h-full rounded-r transition-[width] duration-500"
                style={{ width: `${share}%`, background: item.color ?? 'rgb(var(--c-gold))' }}
              />
            </div>

            <p className="tnum whitespace-nowrap text-right text-[13px] font-medium text-ink">
              {item.display}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
