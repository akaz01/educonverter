// /download, /github → 횟수 1 올리고 실제 주소로 보낸다. 집계가 실패해도 이동은 항상 한다.
import { KEYS, redis } from "./_redis.js";

const TARGETS = {
  download: "https://github.com/akaz01/educonverter/releases/latest/download/EDU_Converter_win.zip",
  github: "https://github.com/akaz01/educonverter",
};
// 링크 미리보기·검색 봇은 세지 않는다
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|kakaotalk-scrap|whatsapp|discord|curl|wget|python-requests/i;

export default async function handler(req, res) {
  const to = String(req.query.to || "");
  const target = TARGETS[to];
  if (!target) {
    res.status(404).send("Not found");
    return;
  }
  const ua = req.headers["user-agent"] || "";
  if (req.method === "GET" && ua && !BOT.test(ua)) {
    try {
      await redis(["INCR", KEYS[to]]);
    } catch (err) {
      console.error("집계 실패", to, err.message);
    }
  }
  res.setHeader("Cache-Control", "no-store");
  res.redirect(302, target);
}
