const MAX_FIELD_LENGTH = 2000;

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;

      if (body.length > 20000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });

const sendJson = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
};

const sanitize = (value) => String(value || "").trim().slice(0, MAX_FIELD_LENGTH);
const formatUtmValue = (value) => sanitize(value) || "не передан";

const formatUtm = (utm = {}) => {
  const labels = [
    ["Источник", "utm_source"],
    ["Канал", "utm_medium"],
    ["Кампания", "utm_campaign"],
    ["Контент", "utm_content"],
  ];

  return labels.map(([label, key]) => `${label}: ${formatUtmValue(utm[key])}`).join("\n");
};

const buildTelegramMessage = ({ interest, name, contact, message, page, utm }) =>
  [
    "🔥 Новая заявка с сайта",
    "",
    "🎯 Тип обращения:",
    sanitize(interest),
    "",
    "👤 Имя:",
    sanitize(name),
    "",
    "📱 Контакт:",
    sanitize(contact),
    "",
    "📦 Проект:",
    sanitize(message),
    "",
    "🌐 Страница:",
    sanitize(page),
    "",
    "📍 Источник:",
    formatUtm(utm),
  ].join("\n");

module.exports = async function telegramHandler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    sendJson(res, 500, { ok: false, error: "Telegram environment variables are not configured" });
    return;
  }

  let payload;

  try {
    payload = await readBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Invalid request body" });
    return;
  }

  const interest = sanitize(payload.interest);
  const name = sanitize(payload.name);
  const contact = sanitize(payload.contact);
  const message = sanitize(payload.message);

  if (!interest || !name || !contact || !message) {
    sendJson(res, 400, { ok: false, error: "Required fields are missing" });
    return;
  }

  try {
    const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: buildTelegramMessage({
          interest,
          name,
          contact,
          message,
          page: payload.page,
          utm: payload.utm,
        }),
        disable_web_page_preview: true,
      }),
    });

    if (!telegramResponse.ok) {
      throw new Error("Telegram request failed");
    }

    sendJson(res, 200, { ok: true });
  } catch {
    sendJson(res, 502, { ok: false, error: "Telegram request failed" });
  }
};
