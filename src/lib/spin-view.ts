/**
 * The read-only view of lucky-spin results that members see.
 *
 * Only an admin can publish a draw. Members read whatever has been published;
 * where nothing has been published yet the seeded demo history is shown instead,
 * clearly marked, so the member dashboard is never an empty shell during review.
 */

import { listDraws } from '@/lib/auth/store';
import type { SpinDraw } from '@/data/generate';

export interface PublicDraw {
  month: number;
  drawnAt: Date;
  winnerId: string;
  winnerName: string;
  benefit: number;
  poolSize: number;
  /** True when an admin actually ran this draw in the console. */
  published: boolean;
}

export function publicDraws(fallback: readonly SpinDraw[]): PublicDraw[] {
  const published = listDraws();

  if (published.length > 0) {
    return published.map((draw) => ({
      month: draw.month,
      drawnAt: new Date(draw.drawnAt),
      winnerId: draw.winnerId,
      winnerName: draw.winnerName,
      benefit: draw.benefit,
      poolSize: draw.poolSize,
      published: true,
    }));
  }

  return fallback.map((draw) => ({
    month: draw.month,
    drawnAt: draw.drawnAt,
    winnerId: draw.winnerId,
    winnerName: draw.winnerName,
    benefit: draw.benefit,
    poolSize: draw.poolSize,
    published: false,
  }));
}
