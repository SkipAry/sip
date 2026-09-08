import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { NumberTicker } from './number-ticker';
import { toRupees, type Paise } from '@/lib/plan/money';

/* ------------------------------------------------------------------ *
 * Card                                                                *
 * ------------------------------------------------------------------ */

export function Card({
  children,
  className,
  interactive = false,
  as: Tag = 'section',
}: {
  children: ReactNode;
  className?: string;
  /** Adds a hover lift. Only for cards that are actually clickable targets. */
  interactive?: boolean;
  as?: 'section' | 'div' | 'article' | 'aside';
}) {
  // `min-w-0` matters: a card is almost always a grid child, and a grid child's
  // default `min-width: auto` would let wide tables push the page sideways
  // instead of scrolling inside their own container.
  return <Tag className={cn('card min-w-0', interactive && 'card-interactive', className)}>{children}</Tag>;
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
        <h2 className="text-title font-semibold text-ink">{title}</h2>
        {hint ? <p className="mt-1 max-w-[60ch] text-small text-muted">{hint}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-5 py-5', className)}>{children}</div>;
}

/* ------------------------------------------------------------------ *
 * Money                                                               *
 * ------------------------------------------------------------------ */

/**
 * A rupee figure.
 *
 * The symbol is set one step smaller and in a lighter weight than the digits,
 * which is what stops a currency mark from competing with the number it
 * qualifies — the detail that separates a bank statement from a spreadsheet.
 */
export function Money({
  amount,
  size = 'md',
  animate = false,
  className,
  tone,
}: {
  amount: Paise;
  size?: 'hero' | 'display' | 'lg' | 'md' | 'sm';
  /** Count up on first view. Reserve it for the one figure that leads a screen. */
  animate?: boolean;
  className?: string;
  tone?: 'gold' | 'positive' | 'critical' | 'muted';
}) {
  const rupees = toRupees(amount);
  const negative = rupees < 0;
  const magnitude = Math.abs(rupees);

  const sizing: Record<string, { figure: string; symbol: string }> = {
    hero: { figure: 'text-hero', symbol: 'text-[26px] mr-1' },
    display: { figure: 'text-display', symbol: 'text-[19px] mr-0.5' },
    lg: { figure: 'text-[26px] leading-none tracking-[-0.02em]', symbol: 'text-[17px] mr-0.5' },
    md: { figure: 'text-[19px] leading-none tracking-[-0.015em]', symbol: 'text-[14px] mr-0.5' },
    sm: { figure: 'text-small', symbol: 'text-tiny mr-0.5' },
  };

  const tones: Record<string, string> = {
    gold: 'text-gold',
    positive: 'text-positive',
    critical: 'text-critical',
    muted: 'text-muted',
  };

  const step = sizing[size]!;

  return (
    <span
      className={cn(
        'tnum inline-flex items-baseline font-semibold',
        step.figure,
        tone ? tones[tone] : 'text-ink',
        className,
      )}
    >
      {negative ? <span aria-hidden>−</span> : null}
      <span className={cn('font-normal opacity-65', step.symbol)} aria-hidden>
        ₹
      </span>
      {animate ? (
        <NumberTicker value={magnitude} />
      ) : (
        magnitude.toLocaleString('en-IN', { maximumFractionDigits: 0 })
      )}
      <span className="sr-only">
        {negative ? 'minus ' : ''}
        {magnitude.toLocaleString('en-IN')} rupees
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Badge and trend                                                     *
 * ------------------------------------------------------------------ */

type Tone = 'neutral' | 'gold' | 'positive' | 'caution' | 'critical' | 'info';

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-raised text-muted ring-line',
  gold: 'bg-gold/12 text-gold ring-gold/25',
  positive: 'bg-positive/12 text-positive ring-positive/25',
  caution: 'bg-caution/12 text-caution ring-caution/25',
  critical: 'bg-critical/12 text-critical ring-critical/25',
  info: 'bg-info/12 text-info ring-info/25',
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
        'inline-flex items-center gap-1.5 rounded-md px-2 py-[3px] text-[11px] font-medium tracking-[0.02em] ring-1 ring-inset',
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * A directional change chip. Direction is carried by an arrow and by the
 * wording, never by colour alone.
 */
export function Trend({
  value,
  label,
  className,
}: {
  /** Signed change; the sign chooses the direction. */
  value: number;
  /** Pre-formatted magnitude, e.g. "₹15,100". */
  label: string;
  className?: string;
}) {
  if (value === 0) {
    return (
      <span className={cn('inline-flex items-center gap-1 text-tiny text-muted', className)}>No change</span>
    );
  }

  const up = value > 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-tiny font-medium',
        up ? 'text-positive' : 'text-critical',
        className,
      )}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
        <path
          d={up ? 'M5 8.5V1.5M5 1.5 1.8 4.7M5 1.5l3.2 3.2' : 'M5 1.5v7M5 8.5 1.8 5.3M5 8.5l3.2-3.2'}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
      <span className="sr-only">{up ? 'increase' : 'decrease'}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Meter                                                               *
 * ------------------------------------------------------------------ */

export function Meter({
  value,
  tone = 'gold',
  label,
  className,
  thick = false,
}: {
  /** 0..1 */
  value: number;
  tone?: Tone;
  label?: string;
  className?: string;
  thick?: boolean;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const fill: Record<Tone, string> = {
    neutral: 'bg-faint',
    gold: 'bg-gradient-to-r from-gold-deep to-gold',
    positive: 'bg-positive',
    caution: 'bg-caution',
    critical: 'bg-critical',
    info: 'bg-info',
  };

  return (
    <div
      className={cn('w-full overflow-hidden rounded-full bg-line/70', thick ? 'h-2' : 'h-1.5', className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-700 ease-out', fill[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Stat tile                                                           *
 * ------------------------------------------------------------------ */

export function Stat({
  label,
  value,
  sub,
  trend,
  footer,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  trend?: ReactNode;
  footer?: ReactNode;
  /** Marks the one tile in a row that leads. */
  accent?: boolean;
}) {
  return (
    <Card className={cn('flex flex-col justify-between p-5', accent && 'border-gold/30')}>
      {accent ? (
        <span
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent"
          aria-hidden
        />
      ) : null}
      <div>
        <p className="eyebrow">{label}</p>
        <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="figure-lg text-ink">{value}</span>
          {trend}
        </div>
        {sub ? <p className="mt-2 text-small text-muted">{sub}</p> : null}
      </div>
      {footer ? <div className="mt-4">{footer}</div> : null}
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * Controls                                                            *
 * ------------------------------------------------------------------ */

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
      className="inline-flex rounded-lg border border-line bg-sunken p-0.5"
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
              'rounded-[7px] px-2.5 py-1 text-tiny font-medium transition-all duration-200 ease-out active:scale-[0.97]',
              selected ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled,
  className,
  full,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  className?: string;
  full?: boolean;
}) {
  const variants = {
    primary:
      'bg-gradient-to-b from-gold-soft to-gold text-[rgb(20,16,4)] shadow-card hover:brightness-[1.06]',
    secondary: 'border border-line bg-raised text-ink hover:border-line-strong',
    ghost: 'text-muted hover:text-ink',
  } as const;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-small font-semibold',
        'transition-all duration-200 ease-out active:scale-[0.985]',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        variants[variant],
        full && 'w-full',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoComplete,
  required,
  hint,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <input
        className={cn(
          'mt-1.5 w-full rounded-lg border border-line bg-sunken px-3 py-2.5 text-base text-ink',
          'placeholder:text-faint transition-colors duration-200',
          'hover:border-line-strong focus:border-gold/60',
        )}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        autoComplete={autoComplete}
        required={required}
        spellCheck={false}
      />
      {hint ? <span className="mt-1.5 block text-tiny text-faint">{hint}</span> : null}
    </label>
  );
}

/* ------------------------------------------------------------------ *
 * Table                                                               *
 * ------------------------------------------------------------------ */

export function DataTable({
  columns,
  children,
  caption,
  className,
  stickyHeader = false,
}: {
  columns: ReadonlyArray<{ key: string; label: string; align?: 'left' | 'right' }>;
  children: ReactNode;
  caption?: string;
  className?: string;
  /** Keeps the header in place inside a vertically scrolling card. */
  stickyHeader?: boolean;
}) {
  return (
    <div className={cn('scroll-x', className)}>
      {/*
        No fixed min-width: a half-width card is often narrower than any figure
        we could pick, and a hard minimum would clip the last column instead of
        letting the table size itself. Cells refuse to wrap, so the table grows
        to its natural width and only then scrolls inside this container.
      */}
      <table className="w-full border-collapse text-small">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead className={cn(stickyHeader && 'sticky top-0 z-10 bg-surface')}>
          <tr className="border-b border-line">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'eyebrow whitespace-nowrap px-3 py-2.5',
                  column.align === 'right' ? 'text-right' : 'text-left',
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">{children}</tbody>
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
        'whitespace-nowrap px-3 py-2.5 align-middle',
        align === 'right' ? 'tnum text-right' : 'text-left',
        className,
      )}
    >
      {children}
    </td>
  );
}

/* ------------------------------------------------------------------ *
 * Scroll panel                                                        *
 * ------------------------------------------------------------------ */

/**
 * A vertically scrolling region inside a card.
 *
 * The fade at the bottom edge is the point: a hard cut through a table row
 * reads as a broken card, while a fade reads as "there is more below" without
 * spending a row on a label.
 */
export function ScrollPanel({
  children,
  maxHeight = 420,
  className,
}: {
  children: ReactNode;
  maxHeight?: number;
  className?: string;
}) {
  return (
    <div className="relative">
      <div className={cn('overflow-y-auto', className)} style={{ maxHeight }}>
        {children}
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b-card bg-gradient-to-t from-surface to-transparent"
        aria-hidden
      />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Notice                                                              *
 * ------------------------------------------------------------------ */

export function Notice({
  tone = 'info',
  title,
  children,
  action,
}: {
  tone?: Tone;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const ring: Record<Tone, string> = {
    neutral: 'border-line',
    gold: 'border-gold/35',
    positive: 'border-positive/35',
    caution: 'border-caution/35',
    critical: 'border-critical/35',
    info: 'border-info/35',
  };
  const bar: Record<Tone, string> = {
    neutral: 'bg-faint',
    gold: 'bg-gold',
    positive: 'bg-positive',
    caution: 'bg-caution',
    critical: 'bg-critical',
    info: 'bg-info',
  };

  return (
    <div
      className={cn(
        'relative flex flex-wrap items-start gap-x-4 gap-y-2 overflow-hidden rounded-card border bg-surface/60 py-3.5 pl-5 pr-4',
        ring[tone],
      )}
    >
      <span className={cn('absolute inset-y-0 left-0 w-[3px]', bar[tone])} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-small font-semibold text-ink">{title}</p>
        {children ? <div className="mt-1 text-small text-muted">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Page structure                                                      *
 * ------------------------------------------------------------------ */

/** A labelled band of related cards, with air above it. */
export function Section({
  title,
  hint,
  actions,
  children,
  className,
}: {
  title?: string;
  hint?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-4', className)}>
      {title ? (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-head font-semibold text-ink">{title}</h2>
            {hint ? <p className="mt-0.5 text-small text-muted">{hint}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** One figure in a horizontal summary rail, separated by fading rules. */
export function RailItem({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0 flex-1 px-5 py-4 first:pl-0 sm:py-0">
      <p className="eyebrow whitespace-nowrap">{label}</p>
      <div className="mt-2 figure-md text-ink">{value}</div>
      {sub ? <p className="mt-1.5 truncate text-tiny text-muted">{sub}</p> : null}
    </div>
  );
}
