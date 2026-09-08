import type { Account } from '@/data/generate';
import { Meter, Money } from '@/components/ui';
import { dateLabel } from '@/lib/format';
import { SAVINGS } from '@/lib/plan';

/**
 * The contextual panel under the sidebar navigation.
 *
 * A member's most time-sensitive fact is what they owe next, so that is what
 * sits in the one piece of persistent chrome that follows them across pages.
 */
export function SidebarSummary({ account }: { account: Account }) {
  const next = account.ledger.find((row) => row.status === 'due' || row.status === 'scheduled');
  if (!next) return null;

  return (
    <div className="well p-3.5">
      <p className="eyebrow">Next instalment</p>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <Money amount={next.payable} size="md" />
        <span className="text-tiny text-faint">Month {next.month}</span>
      </div>
      <p className="mt-1 text-tiny text-muted">Due {dateLabel(next.dueDate)}</p>
      <Meter className="mt-3" value={account.position.progress} label="Term progress" />
      <p className="mt-2 tnum text-[11px] text-faint">
        {account.position.monthsPaid} of {SAVINGS.termMonths} paid
      </p>
    </div>
  );
}
