import { env } from "../config/env";

const githubHeaders = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  location: string | null;
  blog: string | null;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: "open" | "closed";
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  user: { login: string };
  repository_url: string;
}

interface GitHubSearchResult {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubPullRequest[];
}

export interface GitHubRepository {
  name: string;
  full_name: string;
  html_url: string;
  owner: { login: string };
  language: string | null;
}

export interface GitHubPullRequestDetails extends GitHubPullRequest {
  merged_at: string | null;
  base: { repo: GitHubRepository };
}

export interface GitHubSyncedPullRequest extends GitHubPullRequestDetails {
  repository: GitHubRepository;
}

export interface GitHubContributionDay {
  date: string;
  contributionCount: number;
}

interface GitHubContributionCalendarResponse {
  data?: {
    user?: {
      contributionsCollection?: {
        contributionCalendar?: {
          weeks?: Array<{
            contributionDays?: Array<{ date: string; contributionCount: number }>;
          }>;
        };
      };
    };
  };
  errors?: Array<{ message?: string }>;
}

const contributionCalendarQuery = `
  query($login: String!, $from: Date!, $to: Date!) {
    user(login: $login) {
      contributionsCollection(login: $login, from: $from, to: $to) {
        contributionCalendar {
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;

async function requestGraphQL(token: string, query: string, variables: Record<string, string>): Promise<GitHubContributionCalendarResponse> {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const remaining = response.headers.get("x-ratelimit-remaining");
  const reset = response.headers.get("x-ratelimit-reset");
  console.info("[github] GraphQL contribution response", { status: response.status, remaining, reset });
  const payload = (await response.json()) as GitHubContributionCalendarResponse;
  if (payload.errors?.length) {
    throw new Error(`GitHub contribution calendar failed: ${payload.errors.map((error) => error.message).filter(Boolean).join("; ")}`);
  }
  return payload;
}

async function fetchContributionCounts(token: string, login: string, from: Date, to: Date): Promise<Map<string, number>> {
  const payload = await requestGraphQL(token, contributionCalendarQuery, { login, from: from.toISOString(), to: to.toISOString() });
  const weeks = payload.data?.user?.contributionsCollection?.contributionCalendar?.weeks ?? [];
  const counts = new Map<string, number>();
  for (const week of weeks) {
    for (const day of week.contributionDays ?? []) {
      counts.set(day.date.slice(0, 10), day.contributionCount ?? 0);
    }
  }
  return counts;
}

export async function getContributionCalendar(token: string, login: string, from: Date, to: Date): Promise<GitHubContributionDay[]> {
  const counts = await fetchContributionCounts(token, login, from, to);
  const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  const dayMs = 24 * 60 * 60 * 1000;
  const contributionDays: GitHubContributionDay[] = [];
  for (let timestamp = start.getTime(); timestamp <= end.getTime(); timestamp += dayMs) {
    const isoDate = new Date(timestamp).toISOString().slice(0, 10);
    contributionDays.push({ date: isoDate, contributionCount: counts.get(isoDate) ?? 0 });
  }
  return contributionDays;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { ...githubHeaders, ...(init?.headers ?? {}) } });
  const parsedUrl = new URL(url);
  console.info("[github] API response", {
    endpoint: `${parsedUrl.pathname}${parsedUrl.search}`,
    status: response.status,
  });
  if (!response.ok) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    const reset = response.headers.get("x-ratelimit-reset");
    throw new Error(`GitHub API request failed (${response.status}); rate limit remaining: ${remaining ?? "unknown"}; reset: ${reset ?? "unknown"}`);
  }
  return response.json() as Promise<T>;
}

export function getGitHubAuthorizationUrl(state: string): string {
  const query = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: `${env.BACKEND_URL}/api/auth/github/callback`,
    scope: "read:user public_repo",
    state,
  });
  return `https://github.com/login/oauth/authorize?${query.toString()}`;
}

export async function exchangeCode(code: string): Promise<string> {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code }),
  });
  if (!response.ok) throw new Error(`GitHub token exchange failed (${response.status})`);
  const data = (await response.json()) as { access_token?: string; error?: string };
  if (!data.access_token) throw new Error(data.error ?? "GitHub did not return an access token");
  return data.access_token;
}

export function getGitHubUser(token: string): Promise<GitHubUser> {
  return request<GitHubUser>("https://api.github.com/user", { headers: { Authorization: `Bearer ${token}` } });
}

function repositoryCoordinates(repositoryUrl: string): { owner: string; name: string } {
  const parsed = new URL(repositoryUrl);
  const segments = parsed.pathname.split("/").filter(Boolean);
  const [owner, name] = segments[0] === "repos" ? segments.slice(1) : segments;
  if (!owner || !name) throw new Error("GitHub returned an invalid repository URL");
  return { owner, name };
}

function getPullRequest(token: string, owner: string, name: string, number: number): Promise<GitHubPullRequestDetails> {
  return request<GitHubPullRequestDetails>(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/pulls/${number}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

function getRepository(token: string, owner: string, name: string): Promise<GitHubRepository> {
  return request<GitHubRepository>(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function normalizePullRequest(pr: GitHubPullRequestDetails, repository: GitHubRepository, login: string): GitHubSyncedPullRequest | null {
  if (pr.user.login.toLowerCase() !== login.toLowerCase()) return null;
  return {
    ...pr,
    repository: {
      name: repository.name,
      full_name: repository.full_name,
      html_url: repository.html_url,
      owner: repository.owner,
      language: repository.language,
    },
  };
}

export async function getAuthoredPullRequests(token: string): Promise<GitHubSyncedPullRequest[]> {
  const profile = await getGitHubUser(token);
  const results: GitHubSyncedPullRequest[] = [];
  const repositories = new Map<string, Promise<GitHubRepository>>();
  let candidates = 0;
  let detailsFetched = 0;
  let rejectedAuthors = 0;

  for (let page = 1; ; page += 1) {
    const query = `is:pr author:${profile.login}`;
    const url = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&per_page=100&page=${page}`;
    const data = await request<GitHubSearchResult>(url, { headers: { Authorization: `Bearer ${token}` } });
    console.info("[github] PR discovery page", {
      login: profile.login,
      page,
      candidates: data.items.length,
      total: data.total_count,
      incomplete: data.incomplete_results,
    });
    if (data.incomplete_results) {
      throw new Error("GitHub returned an incomplete pull request search result");
    }
    if (page === 1 && data.total_count > 1000) {
      throw new Error("GitHub search result limit prevents a complete synchronization of this account");
    }
    candidates += data.items.length;
    for (const item of data.items) {
      const { owner, name } = repositoryCoordinates(item.repository_url);
      const repositoryKey = `${owner}/${name}`;
      const repository = repositories.get(repositoryKey) ?? getRepository(token, owner, name);
      repositories.set(repositoryKey, repository);
      const details = await getPullRequest(token, owner, name, item.number);
      detailsFetched += 1;
      const normalized = normalizePullRequest(details, await repository, profile.login);
      if (normalized) results.push(normalized);
      else rejectedAuthors += 1;
    }
    if (data.items.length < 100 || page * 100 >= Math.min(data.total_count, 1000)) {
      console.info("[github] PR discovery complete", {
        login: profile.login,
        candidates,
        detailsFetched,
        accepted: results.length,
        rejectedAuthors,
        pages: page,
      });
      if (candidates > 0 && results.length === 0 && rejectedAuthors === candidates) {
        throw new Error("GitHub pull request results did not match the authenticated user");
      }
      break;
    }
    if (page === 10) throw new Error("GitHub search result limit reached before all pull requests were synchronized");
  }
  return results;
}
