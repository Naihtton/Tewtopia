import { formatSchedule, TEACHING_MODES, type ScheduleSlot } from '@/lib/requests';
import { TEACHING_LEVELS } from '@/lib/tutor-visibility';
import { ui } from '@/lib/ui';

type RequestSummaryProps = {
  request: {
    subjects: string[];
    teachingLevels: string[];
    teachingModes: string[];
    scheduleSlots: ScheduleSlot[];
    // Shown on the public board; omitted on the student's own page.
    studentName?: string;
    details: string;
    createdAt: string;
  };
  full?: boolean;
};

const levelLabel = (value: string) => TEACHING_LEVELS.find((level) => level.value === value)?.label ?? value;
const modeLabel = (value: string) => TEACHING_MODES.find((mode) => mode.value === value)?.label ?? value;

export function postedAgo(iso: string, now = Date.now()) {
  const minutes = Math.round((new Date(iso).getTime() - now) / 60000);
  const format = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (Math.abs(minutes) < 60) return format.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return format.format(hours, 'hour');
  return format.format(Math.round(hours / 24), 'day');
}

/** What a student is looking for. Shared by the public board and the "my" pages. Never shows contacts. */
export function RequestSummary({ request, full = false }: RequestSummaryProps) {
  return (
    <>
      {request.studentName && (
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-extrabold uppercase text-primary-deep">
            {request.studentName.slice(0, 1)}
          </span>
          <span className="text-sm font-extrabold text-ink">{request.studentName}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {request.subjects.map((subject) => (
          <span key={subject} className={ui.chipAccent}>
            {subject}
          </span>
        ))}
        {request.teachingLevels.map((level) => (
          <span key={level} className={ui.chip}>
            {levelLabel(level)}
          </span>
        ))}
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">When</dt>
          <dd className="font-semibold text-ink">{formatSchedule(request.scheduleSlots) || 'Flexible'}</dd>
        </div>
        <div>
          <dt className="text-muted">How</dt>
          <dd className="font-semibold text-ink">{request.teachingModes.map(modeLabel).join(', ')}</dd>
        </div>
        {request.details && (
          <div className="sm:col-span-2">
            <dt className="text-muted">Details</dt>
            <dd className={`leading-6 text-ink-soft ${full ? 'whitespace-pre-line' : 'line-clamp-2'}`}>{request.details}</dd>
          </div>
        )}
      </dl>
      <p className="mt-3 text-xs text-muted">Posted {postedAgo(request.createdAt)}</p>
    </>
  );
}
