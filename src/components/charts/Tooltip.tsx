import type { ReactNode } from 'react';

/**
 * A chart tooltip. Positioned by the caller in the chart's own coordinate
 * space and flipped away from the right edge so it never leaves the card.
 */
export function ChartTooltip({
  x,
  y,
  width,
  children,
}: {
  x: number;
  y: number;
  /** Plot width, used to decide which side to open on. */
  width: number;
  children: ReactNode;
}) {
  const flip = x > width * 0.6;

  return (
    <div
      className="pointer-events-none absolute z-20 min-w-[168px] rounded-lg border border-line bg-surface/95 px-3 py-2 shadow-pop backdrop-blur"
      style={{
        left: x,
        top: y,
        transform: `translate(${flip ? 'calc(-100% - 12px)' : '12px'}, -50%)`,
      }}
      role="tooltip"
    >
      {children}
    </div>
  );
}

export function TooltipRow({
  color,
  label,
  value,
  emphasis,
}: {
  color?: string;
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-0.5">
      <span className="flex items-center gap-1.5 text-[12px] text-muted">
        {color ? (
          <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: color }} aria-hidden />
        ) : null}
        {label}
      </span>
      <span className={`tnum text-[12px] ${emphasis ? 'font-semibold text-ink' : 'text-ink'}`}>{value}</span>
    </div>
  );
}
