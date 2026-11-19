import { useState } from 'react';
import { toDateStr, todayStr } from './dates';

const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getMonday(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * Combines live completed tasks + saved daily history (from cleared tasks)
 * into a date -> count lookup so clearing completed tasks doesn't wipe the graph.
 */
function buildCountByDate(tasks, history = {}) {
  const counts = { ...history };
  for (const t of tasks) {
    if (t.done && t.doneAt) {
      const ds = toDateStr(new Date(t.doneAt));
      counts[ds] = (counts[ds] || 0) + 1;
    }
  }
  return counts;
}

export default function StatsPanel({ tasks, history }) {
  const [range, setRange] = useState('weekly'); // 'weekly' | 'monthly'
  const [hoverIdx, setHoverIdx] = useState(null);

  const counts = buildCountByDate(tasks, history);
  const today = todayStr();
  const now = new Date();
  const monday = getMonday(now);

  // 1. ON DECK: Pending tasks
  const onDeck = tasks.filter((t) => !t.done).length;

  // 2. TODAY: Completed today
  const completedToday = counts[today] || 0;

  // 3. THIS WEEK: Mon – Sun
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const ds = toDateStr(d);
    return {
      key: ds,
      label: SHORT_DAYS[i],
      sub: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count: counts[ds] || 0,
      isCurrent: ds === today,
    };
  });
  const completedThisWeek = weekDays.reduce((sum, d) => sum + d.count, 0);

  // Monthly buckets: last 6 weeks (Mon–Sun) or last 30 days grouped into 6 5-day bars,
  // or 4 weeks of current month. Let's show the last 14 days OR last 6 weeks?
  // Wait: "between monthly and weekly" — let's show 30 days in Monthly mode (each day as a slim bar, with date labels every 5 days) or 12 months?
  // Let's check: a 30-day daily bar chart (or 4 weeks) is super informative and clean! Let's do last 30 days in Monthly view.
  const monthDays = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (29 - i));
    const ds = toDateStr(d);
    const showTick = i === 0 || i === 29 || i % 6 === 0;
    return {
      key: ds,
      label: showTick ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '',
      sub: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      count: counts[ds] || 0,
      isCurrent: ds === today,
    };
  });
  const completedLast30 = monthDays.reduce((sum, d) => sum + d.count, 0);

  const bars = range === 'weekly' ? weekDays : monthDays;
  const maxVal = Math.max(4, ...bars.map((b) => b.count));
  const yTicks = [maxVal, Math.round(maxVal / 2), 0];

  const hovered = hoverIdx !== null ? bars[hoverIdx] : null;

  return (
    <aside className="stats-panel" aria-label="Task statistics">
      {/* Three stat cards matching user's reference image */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-kicker">ON DECK</div>
          <div className="stat-value">{onDeck}</div>
          <div className="stat-sub">Pending tasks</div>
        </div>

        <div className="stat-card">
          <div className="stat-kicker">TODAY</div>
          <div className="stat-value">{completedToday}</div>
          <div className="stat-sub">Completed today</div>
        </div>

        <div className="stat-card">
          <div className="stat-kicker">THIS WEEK</div>
          <div className="stat-value">{completedThisWeek}</div>
          <div className="stat-sub">Mon – Sun</div>
        </div>
      </div>

      {/* Weekly / Monthly completion graph card */}
      <div className="chart-card">
        <div className="chart-header">
          <div>
            <div className="chart-title">Tasks completed</div>
            <div className="chart-sub">
              {hovered
                ? `${hovered.sub}: ${hovered.count} completed`
                : range === 'weekly'
                  ? `${completedThisWeek} completed this week`
                  : `${completedLast30} completed in the last 30 days`}
            </div>
          </div>

          <div className="segmented" role="tablist" aria-label="Graph period">
            <button
              type="button"
              role="tab"
              aria-selected={range === 'weekly'}
              className={`seg-btn ${range === 'weekly' ? 'active' : ''}`}
              onClick={() => setRange('weekly')}
            >
              Weekly
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={range === 'monthly'}
              className={`seg-btn ${range === 'monthly' ? 'active' : ''}`}
              onClick={() => setRange('monthly')}
            >
              Monthly
            </button>
          </div>
        </div>

        <div className="chart-body">
          <div className="chart-y">
            {yTicks.map((t, i) => (
              <span key={i}>{t}</span>
            ))}
          </div>

          <div className="chart-plot">
            <div className="chart-gridlines" aria-hidden>
              <div />
              <div />
              <div />
            </div>

            <div
              className={`chart-bars ${range}`}
              onMouseLeave={() => setHoverIdx(null)}
            >
              {bars.map((b, i) => {
                const pct = b.count === 0 ? 0 : Math.max(8, Math.round((b.count / maxVal) * 100));
                return (
                  <div
                    key={b.key}
                    className={`bar-col ${b.isCurrent ? 'today' : ''} ${hoverIdx === i ? 'hovered' : ''}`}
                    onMouseEnter={() => setHoverIdx(i)}
                  >
                    <div className="bar-track">
                      {b.count > 0 && range === 'weekly' && (
                        <span className="bar-num">{b.count}</span>
                      )}
                      <div
                        className={`bar-fill ${b.count === 0 ? 'zero' : ''}`}
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                    <span className="bar-label">{b.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
