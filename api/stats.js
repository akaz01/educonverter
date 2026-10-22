// 메인 페이지 집계: 사이트 버튼 클릭 수(Redis) + GitHub 릴리스 실제 다운로드 수(GitHub API)
import { KEYS, redis } from "./_redis.js";

const RELEASES = "https://api.github.com/repos/akaz01/educonverter/releases?per_page=100";

async function githubDownloads() {
  const res = await fetch(RELEASES, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "edu-converter-site" },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const releases = await res.json();
  return releases
    .flatMap((r) => r.assets || [])
    .filter((a) => a.name.endsWith(".zip"))
    .reduce((sum, a) => sum + (a.download_count || 0), 0);
}

export default async function handler(req, res) {
  const [clicks, releaseDownloads] = await Promise.allSettled([
    redis(["MGET", KEYS.download, KEYS.github]),
    githubDownloads(),
  ]);
  if (clicks.status === "rejected") console.error("Redis 읽기 실패", clicks.reason.message);
  if (releaseDownloads.status === "rejected") console.error("GitHub 읽기 실패", releaseDownloads.reason.message);

  const [dl, gh] = clicks.status === "fulfilled" ? clicks.value : [null, null];
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  res.status(200).json({
    downloadClicks: clicks.status === "fulfilled" ? Number(dl || 0) : null,
    githubClicks: clicks.status === "fulfilled" ? Number(gh || 0) : null,
    releaseDownloads: releaseDownloads.status === "fulfilled" ? releaseDownloads.value : null,
  });
}
