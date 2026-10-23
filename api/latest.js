// 최신 릴리스 정보: { version, date, summary }. 앱은 version만 쓰고(알림을 누르면 여는 주소는 앱에 고정: /#update),
// 사이트 맨 위 "새 소식"이 date·summary를 보여 준다. summary는 릴리스 설명의 "**이번에 바뀐 점**: …" 한 줄.
// 학교처럼 여러 PC가 공인 IP 하나를 쓰면 GitHub API 한도(로그인 없이 IP당 60회/시간)에 걸리므로 여기서 캐시한다.
// 집계·기록은 하지 않는다(앱은 개인정보 없이 버전만 묻는다). 앱은 이 주소만 묻고 GitHub에 직접 붙지 않는다.
const LATEST = "https://api.github.com/repos/akaz01/educonverter/releases/latest";
const VERSION = /^v?\d+(\.\d+){0,3}$/;
const SUMMARY = /\*\*이번에 바뀐 점\*\*\s*[:：]\s*(.+)/;
const MAX_SUMMARY = 120;

function summaryOf(body) {
  const m = SUMMARY.exec(String(body || ""));
  return m ? m[1].replace(/[*`]/g, "").trim().slice(0, MAX_SUMMARY) : "";
}

export default async function handler(req, res) {
  try {
    const gh = await fetch(LATEST, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "edu-converter-site" },
    });
    if (!gh.ok) throw new Error(`GitHub ${gh.status}`);
    const { tag_name: tag, published_at: published, body } = await gh.json();
    if (!VERSION.test(String(tag || ""))) throw new Error(`버전 모양이 아님: ${tag}`);
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).json({
      version: String(tag).replace(/^v/, ""),
      date: String(published || "").slice(0, 10), // "2026-10-24"
      summary: summaryOf(body),
    });
  } catch (err) {
    console.error("최신 버전 읽기 실패", err.message);
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ error: "latest unavailable" });
  }
}
