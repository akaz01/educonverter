// 최신 릴리스 정보: { version, latest, date, summary }.
// - version: 앱이 "새 버전" 알림을 띄울 버전. **알림을 켠 릴리스**(설명에 <!-- notify --> 표식)만 해당하고, 없으면 null.
//   앱(0.3.3~)은 이 값만 보므로, 릴리스를 올려도 알림을 켜기 전에는 선생님 PC에 알림이 가지 않는다.
// - latest·date·summary: 사이트 맨 위 "새 소식"과 버전 표시용(알림과 상관없이 가장 최근 릴리스).
//   summary는 릴리스 설명의 "**이번에 바뀐 점**: …" 한 줄.
// 학교처럼 여러 PC가 공인 IP 하나를 쓰면 GitHub API 한도(로그인 없이 IP당 60회/시간)에 걸리므로 여기서 캐시한다.
// 집계·기록은 하지 않는다(앱은 개인정보 없이 버전만 묻는다). 앱은 이 주소만 묻고 GitHub에 직접 붙지 않는다.
const RELEASES = "https://api.github.com/repos/akaz01/educonverter/releases?per_page=30";
const VERSION = /^v?\d+(\.\d+){0,3}$/;
const NOTIFY = /<!--\s*notify\s*-->/i; // scripts/announce_update.py가 넣고 뺀다
const SUMMARY = /\*\*이번에 바뀐 점\*\*\s*[:：]\s*(.+)/;
const MAX_SUMMARY = 120;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function summaryOf(body) {
  const m = SUMMARY.exec(String(body || ""));
  return m ? m[1].replace(/[*`]/g, "").trim().slice(0, MAX_SUMMARY) : "";
}

function koreanDate(iso) {
  const t = Date.parse(String(iso || ""));
  return Number.isNaN(t) ? "" : new Date(t + KST_OFFSET_MS).toISOString().slice(0, 10);
}

const versionOf = (r) => String(r.tag_name).replace(/^v/, "");

/** 정식 릴리스(초안·미리보기 제외) 중 가장 최근 것과, 알림을 켠 것 중 가장 최근 것. GitHub는 최신순으로 준다. */
export function pick(releases) {
  const usable = (Array.isArray(releases) ? releases : [])
    .filter((r) => r && !r.draft && !r.prerelease && VERSION.test(String(r.tag_name || "")));
  return { latest: usable[0] || null, announced: usable.find((r) => NOTIFY.test(String(r.body || ""))) || null };
}

export default async function handler(req, res) {
  try {
    const gh = await fetch(RELEASES, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "edu-converter-site" },
    });
    if (!gh.ok) throw new Error(`GitHub ${gh.status}`);
    const { latest, announced } = pick(await gh.json());
    if (!latest) throw new Error("정식 릴리스가 없음");
    // 알림을 켜고 끄면 10분 안에 반영되게 캐시를 짧게 둔다(GitHub 호출은 10분에 한 번 정도)
    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=3600");
    res.status(200).json({
      version: announced ? versionOf(announced) : null,
      latest: versionOf(latest),
      date: koreanDate(latest.published_at), // "2026-10-24" (한국 시간: GitHub는 UTC라 새벽에 올리면 하루 전 날짜가 된다)
      summary: summaryOf(latest.body),
    });
  } catch (err) {
    console.error("최신 버전 읽기 실패", err.message);
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ error: "latest unavailable" });
  }
}
