import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/* ------------------------------- Card ------------------------------- */

export function Card({
  children,
  className,
  as: Tag = 'section',
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article';
}) {
  // `min-w-0` matters: a card is almost always a grid child, and a grid child's
  // default `min-width: auto` would let wide tables push the page sideways
  // instead of scrolling inside their own container.
  return <Tag className={cn('card min-w-0', className)}>{children}</Tag>;
}

export function CardHeader({
  title,
  hint,
  actions,
  className,
}: {
  title: ReactNode;
  hint?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold leading-snug text-ink">{title}</h2>
        {hint ? <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-muted">{hint}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-5 py-5', className)}>{children}</div>;
}

/* ------------------------------ Badge ------------------------------- */

type Tone = 'neutral' | 'gold' | 'positive' | 'caution' | 'critical' | 'info';

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-raised text-muted ring-line',
  gold: 'bg-gold/12 text-gold ring-gold/30',
  positive: 'bg-positive/12 text-positive ring-positive/30',
  caution: 'bg-caution/12 text-caution ring-caution/30',
  critical: 'bg-critical/12 text-critical ring-critical/30',
  info: 'bg-info/12 text-info ring-info/30',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ring-1 ring-inset',
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------ Meter ------------------------------- */

export function Meter({
  value,
  tone = 'gold',
  label,
  className,
}: {
  /** 0..1 */
  value: number;
  tone?: Tone;
  label?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const fill: Record<Tone, string> = {
    neutral: 'bg-faint',
    gold: 'bg-gold',
    positive: 'bg-positive',
    caution: 'bg-caution',
    critical: 'bg-critical',
    info: 'bg-info',
  };

  return (
    <div
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-line/70', className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', fill[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ------------------------------- Stat ------------------------------- */

export function Stat({
  label,
  value,
  sub,
  tone,
  footer,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  footer?: ReactNode;
}) {
  return (
    <Card className="flex flex-col justify-between p-5">
      <div>
        <p className="text-[12px] font-medium uppercase tracking-wider text-faint">{label}</p>
        <p
          className={cn(
            'tnum mt-2 text-[26px] font-semibold leading-none tracking-tight',
            tone === 'gold' ? 'text-gold' : 'text-ink',
          )}
        >
          {value}
        </p>
        {sub ? <p className="mt-2 text-[13px] leading-relaxed text-muted">{sub}</p> : null}
      </div>
      {footer ? <div className="mt-4">{footer}</div> : null}
    </Card>
  );
}

/* ------------------------------ Toggle ------------------------------ */

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex rounded-lg border border-line bg-raised p-0.5"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-[7px] px-2.5 py-1 text-[12px] font-medium transition-colors',
              selected ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------ Table ------------------------------- */

export function DataTable({
  columns,
  children,
  caption,
  className,
}: {
  columns: ReadonlyArray<{ key: string; label: string; align?: 'left' | 'right' }>;
  children: ReactNode;
  caption?: string;
  className?: string;
}) {
  return (
    <div className={cn('scroll-x', className)}>
      {/*
        No fixed min-width: a half-width card is often narrower than any figure
        we could pick, and a hard minimum would clip the last column instead of
        letting the table size itself. Cells refuse to wrap, so the table grows
        to its natural width and only then scrolls inside this container.
      */}
      <table className="w-full border-collapse text-[13px]">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-line">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'whitespace-nowrap px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-faint',
                  column.align === 'right' ? 'text-right' : 'text-left',
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/70">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({
  children,
  align = 'left',
  className,
}: {
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  return (
    <td
      className={cn(
        'whitespace-nowrap px-3 py-2 align-middle',
        align === 'right' ? 'tnum text-right' : 'text-left',
        className,
      )}
    >
      {children}
    </td>
  );
}

/* ------------------------------ Notice ------------------------------ */

export function Notice({
  tone = 'info',
  title,
  children,
}: {
  tone?: Tone;
  title: string;
  children?: ReactNode;
}) {
  const ring: Record<Tone, string> = {
    neutral: 'border-line',
    gold: 'border-gold/40',
    positive: 'border-positive/40',
    caution: 'border-caution/40',
    critical: 'border-critical/40',
    info: 'border-info/40',
  };
  const dot: Record<Tone, string> = {
    neutral: 'bg-faint',
    gold: 'bg-gold',
    positive: 'bg-positive',
    caution: 'bg-caution',
    critical: 'bg-critical',
    info: 'bg-info',
  };

  return (
    <div className={cn('rounded-card border bg-raised/60 px-4 py-3', ring[tone])}>
      <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dot[tone])} aria-hidden />
        {title}
      </p>
      {children ? <div className="mt-1.5 pl-3.5 text-[13px] leading-relaxed text-muted">{children}</div> : null}
    </div>
  );
}
