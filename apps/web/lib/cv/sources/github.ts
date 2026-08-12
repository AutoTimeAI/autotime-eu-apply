import type { CVEnrichment } from "../types";

type GitHubRepo = {
  name: string;
  description: string | null;
  html_url: string;
  fork: boolean;
  pushed_at: string | null;
  stargazers_count: number;
  language: string | null;
};

type GitHubCommit = { commit?: { author?: { date?: string }; message?: string } };

const githubHeaders = (token?: string) => ({
  Accept: "application/vnd.github+json",
  "User-Agent": "AutoTime-EU-Apply",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

async function githubJson<T>(url: string, token?: string): Promise<T> {
  const response = await fetch(url, { headers: githubHeaders(token) });
  if (!response.ok) throw new Error(`GitHub returned ${response.status}. Check the username or token.`);
  return response.json() as Promise<T>;
}

export async function enrichCvFromGitHub(username: string, token?: string): Promise<CVEnrichment> {
  const repos = (await githubJson<GitHubRepo[]>(
    `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=pushed&per_page=30&type=owner`,
    token,
  )).filter((repo) => !repo.fork);
  let featured = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 5);
  if (token) {
    try {
      const response = await fetch("https://api.github.com/graphql", { method: "POST", headers: { ...githubHeaders(token), "Content-Type": "application/json" }, body: JSON.stringify({ query: "query($login:String!){user(login:$login){pinnedItems(first:6,types:[REPOSITORY]){nodes{... on Repository{name}}}}}", variables: { login: username } }) });
      if (response.ok) {
        const payload = await response.json() as { data?: { user?: { pinnedItems?: { nodes?: Array<{ name: string }> } } } };
        const names = payload.data?.user?.pinnedItems?.nodes?.map((node) => node.name) ?? [];
        const pinned = names.map((name) => repos.find((repo) => repo.name === name)).filter((repo): repo is GitHubRepo => Boolean(repo));
        if (pinned.length) featured = pinned;
      }
    } catch { /* Pinned repositories are optional when GraphQL access is unavailable. */ }
  }
  const evidence = await Promise.all(featured.map(async (repo) => {
    const base = `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo.name)}`;
    const [languagesResult, readmeResult, commitsResult] = await Promise.allSettled([
      githubJson<Record<string, number>>(`${base}/languages`, token),
      githubJson<{ content?: string; encoding?: string }>(`${base}/readme`, token),
      githubJson<GitHubCommit[]>(`${base}/commits?per_page=5&author=${encodeURIComponent(username)}`, token),
    ]);
    const languages = languagesResult.status === "fulfilled" ? Object.keys(languagesResult.value) : [];
    const readme = readmeResult.status === "fulfilled" && readmeResult.value.encoding === "base64" && readmeResult.value.content
      ? Buffer.from(readmeResult.value.content, "base64").toString("utf8").replace(/[#_*`<>\[\]()]/g, " ").replace(/\s+/g, " ").slice(0, 240)
      : "";
    const commits = commitsResult.status === "fulfilled" ? commitsResult.value : [];
    const recentDate = commits.map((commit) => commit.commit?.author?.date).filter(Boolean).sort().at(-1)?.slice(0, 10) ?? repo.pushed_at?.slice(0, 10);
    return { repo, languages, readme, recentDate };
  }));
  const languages = new Set(evidence.flatMap((item) => item.languages.length ? item.languages : item.repo.language ? [item.repo.language] : []));
  const bullets = evidence.map(({ repo, readme, recentDate }) => `${repo.name}: ${repo.description || readme || "Public software project"}.${recentDate ? ` Recent public activity: ${recentDate}.` : ""} ${repo.html_url}`);
  return {
    sourceLabel: `GitHub @${username}`,
    skills: [...languages],
    experience: bullets.length ? [{ title: "Selected public projects", company: "GitHub", dates: "", bullets }] : [],
    notes: [
      `Reviewed ${repos.length} public, non-fork repositories and inspected featured repository languages, README content, and recent commits through GitHub's API.`,
      token ? "Pinned repositories were preferred when GitHub GraphQL access was available." : "Add an optional token to include pinned repositories and improve API rate limits.",
      "Repository language is a suggestion, not proof of professional proficiency.",
    ],
  };
}
