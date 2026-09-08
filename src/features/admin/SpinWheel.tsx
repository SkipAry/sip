import { useEffect, useRef, useState } from 'react';
import type { DrawCandidate } from '@/lib/auth/store';

/**
 * The draw wheel.
 *
 * The animation is theatre, not the draw: the winner is chosen inside the store
 * with rejection-sampled randomness when the wheel settles, so a slow frame or
 * a paused tab can never influence who wins. Under `prefers-reduced-motion` the
 * wheel settles immediately instead of spinning.
 */

const SEGMENTS = 12;
const SPIN_MS = 2600;

export function SpinWheel({
  candidates,
  spinningFor,
  onSettled,
}: {
  candidates: readonly DrawCandidate[];
  /** The month currently being drawn, or null when idle. */
  spinningFor: number | null;
  onSettled: (month: number) => void;
}) {
  const [angle, setAngle] = useState(0);
  const timer = useRef<number | null>(null);
  const settle = useRef(onSettled);
  settle.current = onSettled;

  useEffect(() => {
    if (spinningFor === null) return;

    const reduced =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced ? 0 : SPIN_MS;

    // Land on a random segment so repeated spins do not look identical.
    setAngle((previous) => previous + 1440 + Math.floor(Math.random() * 360));

    const month = spinningFor;
    timer.current = window.setTimeout(() => settle.current(month), duration);

    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [spinningFor]);

  const spinning = spinningFor !== null;
  const names = candidates.slice(0, SEGMENTS);

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {/* Pointer */}
        <svg
          width="22"
          height="16"
          viewBox="0 0 22 16"
          className="absolute left-1/2 top-[-6px] z-10 -translate-x-1/2 fill-gold"
          aria-hidden
        >
          <path d="M11 16 0 0h22z" />
        </svg>

        <svg
          width="232"
          height="232"
          viewBox="0 0 200 200"
          role="img"
          aria-label={
            spinning ? 'Drawing a winner' : `Draw wheel showing ${candidates.length} eligible members`
          }
          style={{
            transform: `rotate(${angle}deg)`,
            transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.16, 1, 0.3, 1)` : 'none',
          }}
        >
          {Array.from({ length: SEGMENTS }, (_, index) => {
            const start = (index / SEGMENTS) * 2 * Math.PI - Math.PI / 2;
            const end = ((index + 1) / SEGMENTS) * 2 * Math.PI - Math.PI / 2;
            const large = end - start > Math.PI ? 1 : 0;

            return (
              <path
                key={index}
                d={[
                  `M100,100`,
                  `L${100 + 92 * Math.cos(start)},${100 + 92 * Math.sin(start)}`,
                  `A92,92 0 ${large} 1 ${100 + 92 * Math.cos(end)},${100 + 92 * Math.sin(end)}`,
                  'Z',
                ].join(' ')}
                fill={index % 2 === 0 ? 'rgb(var(--c-gold) / 0.9)' : 'rgb(var(--c-gold) / 0.42)'}
                className="stroke-surface"
                strokeWidth={2}
              />
            );
          })}

          <circle cx="100" cy="100" r="30" className="fill-surface stroke-line" strokeWidth={2} />
          <circle cx="100" cy="100" r="92" fill="none" className="stroke-gold" strokeWidth={2} />
        </svg>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gold">
            {spinning ? '…' : 'Spin'}
          </span>
        </div>
      </div>

      <p className="mt-4 text-center text-[13px] leading-relaxed text-muted">
        {candidates.length === 0
          ? 'The eligible pool is empty.'
          : `${candidates.length.toLocaleString('en-IN')} members are in the pool, including ${names
              .slice(0, 3)
              .map((candidate) => candidate.name)
              .join(', ')}.`}
      </p>
    </div>
  );
}
