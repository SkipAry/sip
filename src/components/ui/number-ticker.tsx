/**
 * Number ticker — Magic UI registry component (`@magicui/number-ticker`),
 * adapted for this app in three ways, each of which the original would have
 * broken:
 *
 *  1. `locale` prop. The registry version hardcodes `en-US`, which groups
 *     170000 as "170,000". Indian grouping is "1,70,000", and every figure in
 *     this dashboard is rupees.
 *  2. Renders its starting value as real text. The original leaves the span
 *     empty until the spring first fires, so a figure flashes blank on mount
 *     and is invisible to a screen reader.
 *  3. Honours `prefers-reduced-motion` by settling on the value immediately.
 *  4. A snappier default spring. The registry's damping 60 / stiffness 100
 *     takes about three seconds, which on a headline balance means the reader
 *     waits to learn their own number.
 *
 * Colour is left to the caller rather than the original's hardcoded
 * black/white, so the ticker inherits whatever type style it sits in.
 */

import { useEffect, useRef, type ComponentPropsWithoutRef } from 'react';
import { useInView, useMotionValue, useSpring } from 'motion/react';
import { cn } from '@/lib/utils';

interface NumberTickerProps extends ComponentPropsWithoutRef<'span'> {
  value: number;
  startValue?: number;
  direction?: 'up' | 'down';
  delay?: number;
  decimalPlaces?: number;
  locale?: string;
  /** Spring tuning. The default settles in roughly 700ms. */
  damping?: number;
  stiffness?: number;
}

export function NumberTicker({
  value,
  startValue = 0,
  direction = 'up',
  delay = 0,
  className,
  decimalPlaces = 0,
  locale = 'en-IN',
  damping = 34,
  stiffness = 190,
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(direction === 'down' ? value : startValue);
  const springValue = useSpring(motionValue, { damping, stiffness });
  const isInView = useInView(ref, { once: true, margin: '0px' });

  const format = (input: number) =>
    Intl.NumberFormat(locale, {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(Number(input.toFixed(decimalPlaces)));

  useEffect(() => {
    if (!isInView) return undefined;

    const reduced =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const target = direction === 'down' ? startValue : value;

    if (reduced) {
      motionValue.jump(target);
      if (ref.current) ref.current.textContent = format(target);
      return undefined;
    }

    const timer = setTimeout(() => motionValue.set(target), delay * 1000);
    return () => clearTimeout(timer);
    // `format` is derived from locale and decimalPlaces, both listed below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motionValue, isInView, delay, value, direction, startValue, locale, decimalPlaces]);

  useEffect(
    () =>
      springValue.on('change', (latest) => {
        if (ref.current) ref.current.textContent = format(latest);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [springValue, decimalPlaces, locale],
  );

  return (
    <span ref={ref} className={cn('inline-block tabular-nums', className)} {...props}>
      {format(direction === 'down' ? value : startValue)}
    </span>
  );
}
