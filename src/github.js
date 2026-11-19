export const ACTIVE_DAYS = 30; // a repo with a push in the last 30 days counts as "Active"

export async function fetchRepos(username, token) {
  const headers = { Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(
    `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=pushed`,
    { headers },
  );
  if (res.status === 401) throw new Error('GitHub token is invalid or expired.');
  if (res.status === 404) throw new Error(`GitHub user "${username}" not found.`);
  if (res.status === 403) throw new Error('GitHub rate limit reached. Add a token in Settings for 5,000 req/hr.');
  if (!res.ok) throw new Error(`GitHub error (${res.status}).`);
  const list = await res.json();
  return list.map((r) => ({
    id: r.id,
    name: r.name,
    url: r.html_url,
    description: r.description,
    language: r.language,
    stars: r.stargazers_count,
    fork: r.fork,
    archived: r.archived,
    pushedAt: r.pushed_at,
  }));
}

const CALENDAR_QUERY = `
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              contributionLevel
            }
          }
        }
      }
    }
  }
`;

/**
 * Fetches the official contribution heatmap from GitHub's GraphQL API.
 * Requires a GitHub Personal Access Token.
 */
export async function fetchContributionCalendar(username, token) {
  if (!token) return null;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: CALENDAR_QUERY,
      variables: { login: username },
    }),
  });

  if (res.status === 401) throw new Error('GitHub token was rejected (401). Check your token in Settings.');
  if (!res.ok) throw new Error(`GitHub GraphQL error (${res.status}).`);

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors[0].message || 'GraphQL error from GitHub.');
  }
  return json.data?.user?.contributionsCollection?.contributionCalendar ?? null;
}

export function isActive(repo) {
  if (!repo?.pushedAt) return false;
  return Date.now() - new Date(repo.pushedAt).getTime() < ACTIVE_DAYS * 86400000;
}
