import { useCallback, useEffect, useRef, useState } from 'react';

/** Measure a container so charts lay out against real pixels, not a guess. */
export function useMeasure<T extends HTMLElement>(): [
  (node: T | null) => void,
  { width: number; height: number },
] {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const observer = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: T | null) => {
    observer.current?.disconnect();
    if (!node) return;

    observer.current = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize((previous) =>
        Math.abs(previous.width - width) < 0.5 && Math.abs(previous.height - height) < 0.5
          ? previous
          : { width, height },
      );
    });
    observer.current.observe(node);
    setSize({ width: node.clientWidth, height: node.clientHeight });
  }, []);

  useEffect(() => () => observer.current?.disconnect(), []);

  return [ref, size];
}

export interface Scale {
  (value: number): number;
  domain: [number, number];
  range: [number, number];
}

export function linearScale(domain: [number, number], range: [number, number]): Scale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;

  const scale = ((value: number) => r0 + ((value - d0) / span) * (r1 - r0)) as Scale;
  scale.domain = domain;
  scale.range = range;
  return scale;
}

/**
 * Round a maximum up to a readable tick step and return evenly spaced ticks.
 * Keeps axes on 1/2/2.5/5 x 10^n boundaries rather than arbitrary numbers.
 */
export function niceTicks(max: number, target = 4): { ticks: number[]; max: number } {
  if (max <= 0) return { ticks: [0], max: 1 };

  const rough = max / target;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalised = rough / magnitude;
  const step = (normalised >= 5 ? 10 : normalised >= 2.5 ? 5 : normalised >= 2 ? 2.5 : normalised >= 1 ? 2 : 1) * magnitude;

  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= top + step / 2; value += step) ticks.push(Math.round(value));
  return { ticks, max: top };
}

/** A rounded-top bar path: square where it meets the baseline, rounded at the data end. */
export function barPath(x: number, y: number, width: number, height: number, radius = 4): string {
  if (height <= 0) return '';
  const r = Math.min(radius, width / 2, height);
  return [
    `M${x},${y + height}`,
    `L${x},${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `L${x + width - r},${y}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `L${x + width},${y + height}`,
    'Z',
  ].join(' ');
}

/** A horizontal bar rounded only at the data end. */
export function hBarPath(x: number, y: number, width: number, height: number, radius = 4): string {
  if (width <= 0) return '';
  const r = Math.min(radius, height / 2, width);
  return [
    `M${x},${y}`,
    `L${x + width - r},${y}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `L${x + width},${y + height - r}`,
    `Q${x + width},${y + height} ${x + width - r},${y + height}`,
    `L${x},${y + height}`,
    'Z',
  ].join(' ');
}

/** A polyline through points, as an SVG path. */
export function linePath(points: ReadonlyArray<{ x: number; y: number }>): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ');
}

/** The same line closed down to a baseline, for an area fill. */
export function areaPath(points: ReadonlyArray<{ x: number; y: number }>, baseline: number): string {
  if (points.length === 0) return '';
  const first = points[0]!;
  const last = points[points.length - 1]!;
  return `${linePath(points)} L${last.x},${baseline} L${first.x},${baseline} Z`;
}

/** Index of the band under a pointer, or null when outside the plot. */
export function bandIndexAt(
  offsetX: number,
  plotLeft: number,
  plotWidth: number,
  bands: number,
): number | null {
  if (bands <= 0) return null;
  const position = offsetX - plotLeft;
  if (position < 0 || position > plotWidth) return null;
  return Math.min(bands - 1, Math.max(0, Math.floor((position / plotWidth) * bands)));
}
