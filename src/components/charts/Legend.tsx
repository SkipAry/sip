/**
 * A legend is present whenever a chart carries two or more series, so identity
 * is never signalled by colour alone.
 */
export function Legend({
  items,
  className,
}: {
  items: ReadonlyArray<{ label: string; color: string; note?: string }>;
  className?: string;
}) {
  return (
    <ul className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 ${className ?? ''}`}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-[12px] text-muted">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
            style={{ background: item.color }}
            aria-hidden
          />
          <span className="text-ink">{item.label}</span>
          {item.note ? <span className="text-faint">{item.note}</span> : null}
        </li>
      ))}
    </ul>
  );
}
