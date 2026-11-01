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
  merged_at: string | null;
  user: { login: string };
  repository_url: string;
  repository?: { name: string; full_name: string; html_url: string; owner: { login: string }; language: string | null };
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { ...githubHeaders, ...(init?.headers ?? {}) } });
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

export async function getAuthoredPullRequests(token: string): Promise<GitHubPullRequest[]> {
  const results: GitHubPullRequest[] = [];
  for (let page = 1; page <= 10; page += 1) {
    const url = `https://api.github.com/search/issues?q=${encodeURIComponent("is:pr+is:public+author:@me")}&per_page=100&page=${page}`;
    const data = await request<{ items: Array<GitHubPullRequest & { repository_url: string }> }>(url, { headers: { Authorization: `Bearer ${token}` } });
    results.push(...data.items.map((item) => {
      const repositoryUrl = item.repository_url;
      const [, owner, name] = repositoryUrl.split("/").slice(-2);
      return {
        ...item,
        repository: {
          name,
          full_name: `${owner}/${name}`,
          html_url: `https://github.com/${owner}/${name}`,
          owner: { login: owner },
          language: null,
        },
      };
    }));
    if (data.items.length < 100) break;
  }
  return results;
}
