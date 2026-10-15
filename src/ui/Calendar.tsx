import { dayKey } from '../db/db';

/** Dezenter Wochenkalender: 7 Tage, gefüllt = geübt. Wochenziel statt Tageszwang. */
export function Calendar(props: { activity: Record<string, number>; goal: number }) {
  const days: { key: string; on: boolean; today: boolean }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const k = dayKey(d);
    days.push({ key: k, on: (props.activity[k] ?? 0) > 0, today: i === 0 });
  }
  const active = days.filter((d) => d.on).length;
  return (
    <div class="calendar" title={`${active} von ${props.goal} Tagen diese Woche`} aria-label={`${active} von ${props.goal} Übungstagen in den letzten 7 Tagen`}>
      {days.map((d) => (
        <i key={d.key} class={`${d.on ? 'on' : ''} ${d.today ? 'today' : ''}`} />
      ))}
    </div>
  );
}
