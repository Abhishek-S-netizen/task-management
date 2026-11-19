const pad = (n) => String(n).padStart(2, '0');

export function toDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const todayStr = () => toDateStr(new Date());

function parse(due, time) {
  const [y, m, d] = due.split('-').map(Number);
  if (time) {
    const [hh, mm] = time.split(':').map(Number);
    return new Date(y, m - 1, d, hh, mm);
  }
  return new Date(y, m - 1, d, 23, 59, 59); // no time = due by end of day
}

/** Friendly label + flags for a task's due date. */
export function dueInfo(task) {
  if (!task.due) return null;
  const today = todayStr();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const when = parse(task.due, task.time);

  let label;
  if (task.due === today) label = 'Today';
  else if (task.due === toDateStr(tomorrow)) label = 'Tomorrow';
  else if (task.due === toDateStr(yesterday)) label = 'Yesterday';
  else {
    const opts = { weekday: 'short', month: 'short', day: 'numeric' };
    if (when.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
    label = when.toLocaleDateString(undefined, opts);
  }
  if (task.time) label += `, ${when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;

  return { label, overdue: !task.done && when < new Date(), isToday: task.due === today };
}

/** Sort key: tasks with a due date first (soonest first), then by creation. */
export function sortKey(task) {
  return `${task.due || '9999-99-99'}T${task.time || '99:99'}|${String(task.createdAt).padStart(15, '0')}`;
}

export function timeAgo(value) {
  if (!value) return 'never';
  const s = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (s < 60) return 'just now';
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [name, secs] of units) {
    const n = Math.floor(s / secs);
    if (n >= 1) return `${n} ${name}${n > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}
