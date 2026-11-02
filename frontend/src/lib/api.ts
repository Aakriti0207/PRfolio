const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/$/, "");

export type ApiUser = {
  id: string;
  githubUsername: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  profileSlug: string;
  isPublished: boolean;
};

export type ApiPullRequest = {
  id: string;
  title: string;
  body: string | null;
  htmlUrl: string;
  repositoryName: string;
  repositoryFullName: string;
  ownerName: string;
  language: string | null;
  state: "OPEN" | "CLOSED" | "MERGED";
  number: number;
  createdAtGitHub: string;
  updatedAtGitHub: string;
  mergedAt: string | null;
  closedAt: string | null;
  featured: boolean;
  hidden: boolean;
  displayOrder: number;
};

export type ApiStats = {
  total: number;
  featured: number;
  hidden: number;
  merged: number;
  open: number;
  closed: number;
};

export type ApiContributionDay = {
  date: string;
  contributionCount: number;
};

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error: { code: string; message: string; details?: unknown } };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: init?.credentials ?? "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  let payload: ApiSuccess<T> | ApiFailure;
  try {
    payload = (await response.json()) as ApiSuccess<T> | ApiFailure;
  } catch {
    throw new Error(`Backend returned an invalid response (${response.status})`);
  }
  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? `Request failed (${response.status})` : payload.error.message);
  }
  return payload.data;
}

export function getLoginUrl() {
  return `${API_BASE_URL}/auth/github`;
}

export function getCurrentUser() {
  return request<ApiUser>("/auth/me");
}

export function logout() {
  return request<null>("/auth/logout", { method: "POST" });
}

export function syncPullRequests() {
  return request<{ fetched: number; created: number; updated: number; complete: boolean }>("/github/sync", { method: "POST" });
}

export function getStats() {
  return request<ApiStats>("/prs/stats");
}

export function updatePullRequest(id: string, changes: { featured?: boolean; hidden?: boolean; displayOrder?: number }) {
  return request<ApiPullRequest>(`/prs/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(changes) });
}

export function updatePublication(isPublished: boolean) {
  return request<{ isPublished: boolean; profileSlug: string }>("/profile/publication", {
    method: "PATCH",
    body: JSON.stringify({ isPublished }),
  });
}

export type ApiPublicProfile = {
  githubUsername: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  contributionGraphVisible: boolean;
  pullRequests: Array<{
    title: string;
    repositoryFullName: string;
    state: "OPEN" | "CLOSED" | "MERGED";
    language: string | null;
    number: number;
    htmlUrl: string;
    createdAtGitHub: string;
    mergedAt: string | null;
    closedAt: string | null;
  }>;
  contributions: ApiContributionDay[];
};

export function getPublicProfile(slug: string) {
  return request<ApiPublicProfile>(`/profile/${encodeURIComponent(slug)}`, { credentials: "omit" });
}

async function getPullRequestPage(page: number) {
  return request<{ items: ApiPullRequest[]; page: number; limit: number; total: number; pages: number }>(`/prs?page=${page}&limit=100&sort=updatedAtGitHub&order=desc`);
}

export async function getAllPullRequests() {
  const firstPage = await getPullRequestPage(1);
  const remaining = await Promise.all(Array.from({ length: Math.max(0, firstPage.pages - 1) }, (_, index) => getPullRequestPage(index + 2)));
  return [firstPage, ...remaining].flatMap((page) => page.items);
}
