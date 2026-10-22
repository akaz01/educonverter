// Upstash Redis REST 호출 (의존성 없이 fetch). Vercel 연동이 넣어 주는 환경 변수 이름 두 가지를 모두 받는다.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const KEYS = { download: "stats:download", github: "stats:github" };

export async function redis(command) {
  if (!URL_ || !TOKEN) throw new Error("Redis 환경 변수가 없습니다");
  const res = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  const { result, error } = await res.json();
  if (error) throw new Error(error);
  return result;
}
