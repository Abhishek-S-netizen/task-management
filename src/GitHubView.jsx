import { useState } from 'react';
import { isActive, ACTIVE_DAYS } from './github';
import { timeAgo } from './dates';

export function RepoStatus({ repo }) {
  const active = isActive(repo);
  return (
    <span className={`status ${active ? 'active' : 'quiet'}`} title={active ? `Pushed in the last ${ACTIVE_DAYS} days` : `No pushes in ${ACTIVE_DAYS}+ days`}>
      <span className="dot" />
      {active ? 'Active' : 'Quiet'}
    </span>
  );
}

const LEVEL_MAP = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

function ContributionHeatmap({ calendar, hasToken, onSaveToken }) {
  const [tokenInput, setTokenInput] = useState('');
  const [hoveredDay, setHoveredDay] = useState(null);

  if (!hasToken) {
    const submit = (e) => {
      e.preventDefault();
      const t = tokenInput.trim();
      if (!t) return;
      onSaveToken(t);
      setTokenInput('');
    };

    return (
      <div className="chart-card">
        <div className="chart-header">
          <div>
            <div className="chart-title">Contribution heatmap</div>
            <div className="chart-sub">Official GitHub GraphQL API</div>
          </div>
        </div>
        <form className="token-setup" onSubmit={submit}>
          <p className="subtle small">
            GitHub’s GraphQL API requires a Personal Access Token (fine-grained or classic with no scopes needed for public data). Paste yours below or in Settings.
          </p>
          <div className="add-row">
            <input
              type="password"
              className="grow"
              placeholder="ghp_… or github_pat_…"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              aria-label="GitHub Personal Access Token"
            />
            <button type="submit" className="btn primary" disabled={!tokenInput.trim()}>
              Connect
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (!calendar || !calendar.weeks) {
    return (
      <div className="chart-card">
        <div className="chart-header">
          <div>
            <div className="chart-title">Contribution heatmap</div>
            <div className="chart-sub">Click Refresh to load your contribution graph</div>
          </div>
        </div>
      </div>
    );
  }

  // Build month labels along the top of the 52-week grid
  const monthLabels = [];
  let lastMonth = -1;
  calendar.weeks.forEach((w, idx) => {
    const firstDay = w.contributionDays[0];
    if (!firstDay) return;
    const m = new Date(firstDay.date).getMonth();
    if (m !== lastMonth) {
      if (idx - (monthLabels.at(-1)?.idx ?? -4) >= 3) {
        monthLabels.push({
          idx,
          name: new Date(firstDay.date).toLocaleDateString(undefined, { month: 'short' }),
        });
      }
      lastMonth = m;
    }
  });

  const formatDay = (d) => {
    const dt = new Date(d.date + 'T00:00:00');
    const dateLabel = dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    return `${d.contributionCount} ${d.contributionCount === 1 ? 'contribution' : 'contributions'} on ${dateLabel}`;
  };

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <div className="chart-title">Contributions</div>
          <div className="chart-sub">
            {hoveredDay
              ? formatDay(hoveredDay)
              : `${calendar.totalContributions.toLocaleString()} contributions in the last year`}
          </div>
        </div>
      </div>

      <div className="heatmap-scroll">
        <div
          className="heatmap-months"
          style={{ gridTemplateColumns: `repeat(${calendar.weeks.length}, minmax(0, 1fr))` }}
        >
          {calendar.weeks.map((_, idx) => {
            const label = monthLabels.find((m) => m.idx === idx);
            return <span key={idx}>{label ? label.name : ''}</span>;
          })}
        </div>

        <div
          className="heatmap-grid"
          style={{ gridTemplateColumns: `repeat(${calendar.weeks.length}, minmax(0, 1fr))` }}
          onMouseLeave={() => setHoveredDay(null)}
        >
          {calendar.weeks.map((week, wIdx) => (
            <div key={wIdx} className="heatmap-week">
              {week.contributionDays.map((day) => {
                const lvl = LEVEL_MAP[day.contributionLevel] ?? 0;
                return (
                  <span
                    key={day.date}
                    className={`heat-cell lvl-${lvl}`}
                    onMouseEnter={() => setHoveredDay(day)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="heatmap-legend">
        <span>Less</span>
        <span className="heat-cell lvl-0" />
        <span className="heat-cell lvl-1" />
        <span className="heat-cell lvl-2" />
        <span className="heat-cell lvl-3" />
        <span className="heat-cell lvl-4" />
        <span>More</span>
      </div>
    </div>
  );
}

export function GitHubStatsPanel({ data, sync }) {
  const { settings, github } = data;
  const activeCount = github.repos.filter(isActive).length;
  const quietCount = github.repos.length - activeCount;

  // Compute top languages across repos
  const langCounts = {};
  for (const r of github.repos) {
    if (r.language) langCounts[r.language] = (langCounts[r.language] || 0) + 1;
  }
  const topLangs = Object.entries(langCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const saveToken = (token) => {
    sync.updateToken(token);
    sync.refresh(settings.githubUsername, token);
  };

  return (
    <aside className="stats-panel github-stats-panel" aria-label="GitHub statistics">
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-kicker">REPOSITORIES</div>
          <div className="stat-value">{github.repos.length}</div>
          <div className="stat-sub">Public repos</div>
        </div>

        <div className="stat-card">
          <div className="stat-kicker">ACTIVE</div>
          <div className="stat-value">{activeCount}</div>
          <div className="stat-sub">Last {ACTIVE_DAYS} days</div>
        </div>

        <div className="stat-card">
          <div className="stat-kicker">QUIET</div>
          <div className="stat-value">{quietCount}</div>
          <div className="stat-sub">{ACTIVE_DAYS}+ days idle</div>
        </div>
      </div>

      <ContributionHeatmap
        calendar={github.calendar}
        hasToken={Boolean(sync.token)}
        onSaveToken={saveToken}
      />

      {topLangs.length > 0 && (
        <div className="chart-card">
          <div className="chart-title">Top languages</div>
          <div className="lang-pills">
            {topLangs.map(([lang, count]) => (
              <span key={lang} className="lang-pill">
                <strong>{lang}</strong> · {count}
              </span>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

export default function GitHubView({ data, update, sync, onOpenProject }) {
  const { settings, github, projects } = data;
  const [filter, setFilter] = useState('all');
  const [username, setUsername] = useState('');

  if (!settings.githubUsername) {
    const save = (e) => {
      e.preventDefault();
      const u = username.trim();
      if (!u) return;
      update((d) => ({ ...d, settings: { ...d.settings, githubUsername: u } }));
      sync.refresh(u);
    };
    return (
      <div className="view">
        <header className="view-header">
          <h1>GitHub</h1>
        </header>
        <form className="card setup" onSubmit={save}>
          <p>Enter your GitHub username to see your repositories here.</p>
          <div className="add-row">
            <input placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} aria-label="GitHub username" />
            <button className="btn primary" type="submit" disabled={!username.trim()}>
              Save
            </button>
          </div>
        </form>
      </div>
    );
  }

  const repos = github.repos.filter((r) => (filter === 'all' ? true : filter === 'active' ? isActive(r) : !isActive(r)));
  const activeCount = github.repos.filter(isActive).length;
  const projectForRepo = (repo) => projects.find((p) => p.repo === repo.name);

  const createFolder = (repo) => {
    const project = { id: crypto.randomUUID(), name: repo.name, repo: repo.name, createdAt: Date.now() };
    update((d) => ({ ...d, projects: [...d.projects, project] }));
    onOpenProject(project.id);
  };

  return (
    <div className="view github-view">
      <div className="github-top">
        <header className="view-header">
          <div>
            <h1>GitHub</h1>
            <p className="subtle">
              @{settings.githubUsername} · {github.repos.length} repos · {activeCount} active · updated {timeAgo(github.fetchedAt)}
              {!sync.online && ' · offline'}
            </p>
          </div>
          <button className="btn" onClick={() => sync.refresh()} disabled={sync.loading || !sync.online}>
            {sync.loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </header>

        {sync.error && <div className="banner error">{sync.error}</div>}

        <div className="tabs">
          {[
            ['all', 'All'],
            ['active', 'Active'],
            ['quiet', 'Quiet'],
          ].map(([key, label]) => (
            <button key={key} className={`tab ${filter === key ? 'selected' : ''}`} onClick={() => setFilter(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {repos.length === 0 ? (
        <p className="empty">{github.fetchedAt ? 'No repositories here.' : sync.online ? 'Loading…' : 'Connect to the internet to load your repositories.'}</p>
      ) : (
        <ul className="repo-list">
          {repos.map((repo) => {
            const project = projectForRepo(repo);
            return (
              <li key={repo.id} className="repo">
                <div className="repo-main">
                  <div className="repo-title">
                    <a href={repo.url} target="_blank" rel="noreferrer">
                      {repo.name}
                    </a>
                    {repo.fork && <span className="tag">fork</span>}
                    {repo.archived && <span className="tag">archived</span>}
                  </div>
                  {repo.description && <div className="repo-desc">{repo.description}</div>}
                  <div className="task-meta">
                    <RepoStatus repo={repo} />
                    {repo.language && <span>{repo.language}</span>}
                    <span>updated {timeAgo(repo.pushedAt)}</span>
                  </div>
                </div>
                {project ? (
                  <button className="btn" onClick={() => onOpenProject(project.id)}>
                    Open folder
                  </button>
                ) : (
                  <button className="btn" onClick={() => createFolder(repo)} title="Create a task folder for this repo">
                    + Folder
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
