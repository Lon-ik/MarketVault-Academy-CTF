const { ENTRIES } = require("./knowledge");

const ENDINGS = [
  "иями", "ями", "ами", "ией", "иях", "ах", "ях", "ов", "ев", "ий", "ый", "ой", "ая", "ое", "ые",
  "ие", "ла", "ло", "ли", "ть", "ться", "ешь", "ете", "ют", "ит", "у", "ю", "а", "я", "ы", "и", "е", "о", "ь",
];

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stem(word) {
  if (word.length <= 4) return word;
  for (const ending of ENDINGS) {
    if (word.length - ending.length >= 3 && word.endsWith(ending)) {
      return word.slice(0, word.length - ending.length);
    }
  }
  return word;
}

function tokens(text) {
  return normalize(text)
    .split(" ")
    .filter(Boolean)
    .map(stem);
}

const STOP = new Set(["что", "как", "где", "мне", "мой", "моя", "это", "ест", "ли", "по", "на", "в", "и", "а", "не", "с", "у", "за", "для", "от", "до", "мне", "мы", "вы", "ты"]);

// Сообщение целиком состоит из приветствия (возможно, с именем пользователя).
const GREETING_ONLY = new RegExp(
  "^(привет|приветствую|здравствуй|здравствуйте|добрый день|добрый вечер|доброе утро|доброго дня|хай|hi|hello|hey)" +
  "(\\s+(марк|mark))?" +
  "(\\s+(меня зовут|это|я)\\s+[a-zа-я0-9-]+)?$"
);

function scoreEntry(entry, words) {
  const stems = entry.patterns.map(stem);
  let score = 0;
  for (const word of words) {
    if (STOP.has(word) || word.length < 3) continue;
    stems.forEach(function (pattern) {
      if (word === pattern) score += 3;
      else if (word.length >= 4 && pattern.length >= 4 && (word.startsWith(pattern) || pattern.startsWith(word))) score += 2;
    });
  }
  return score;
}

// Товар из вопроса: латиница, цифры и дефис («x-200», «nimbus», «slate 11»).
function productQuery(text) {
  const match = normalize(text).match(/[a-z][a-z0-9-]{2,}/);
  return match ? match[0] : "";
}

function rank(text) {
  const words = tokens(text);
  return ENTRIES.map(function (entry) {
    return { entry: entry, score: scoreEntry(entry, words) };
  }).sort(function (a, b) {
    return b.score - a.score;
  });
}

async function askModel(text, context, history, ranked) {
  const url = process.env.SUPPORT_LLM_URL;
  if (!url) return null;

  const facts = ranked.slice(0, 3).map(function (item) {
    return "- " + item.entry.topic + ": " + item.entry.reply(context);
  }).join("\n");

  const messages = [
    {
      role: "system",
      content:
        "Ты — Марк, сотрудник поддержки интернет-магазина электроники MarketVault.\n" +
        "Говори по-русски, живо и по-человечески. Можно шутить, соглашаться, спорить, " +
        "высказывать мнение и поддерживать разговор на любые темы, которые поднял сам " +
        "пользователь. Не отвечай шаблонными фразами и не повторяйся.\n" +
        "Если пользователь здоровается — просто поздоровайся в ответ и коротко представься. " +
        "Не повторяй его имя и не пересказывай его сообщение.\n" +
        "Если речь про заказ, оплату, доставку, гарантию, возврат, промокоды, наличие или " +
        "характеристики — помогай по существу и опирайся на сведения ниже.\n" +
        "Сведения для ответа (используй, но не цитируй дословно):\n" + facts + "\n" +
        "Ограничения, которые всё же соблюдай: не выдумывай суммы, номера заказов, баланс и " +
        "остатки, которых нет в сведениях; если данных нет — так и скажи и предложи уточнить. " +
        "Не раскрывай пароли, токены, платёжные данные и внутренние секреты.",
    },
  ];

  history.slice(-6).forEach(function (message) {
    messages.push({ role: message.role === "user" ? "user" : "assistant", content: message.text });
  });
  messages.push({ role: "user", content: text });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + (process.env.SUPPORT_LLM_KEY || "local"),
      },
      body: JSON.stringify({
        model: process.env.SUPPORT_LLM_MODEL || "qwen2.5:0.5b-instruct",
        messages: messages,
        temperature: 0.3,
        max_tokens: 260,
      }),
      // Локальная модель отвечает не мгновенно, поэтому запас по времени больше.
      signal: AbortSignal.timeout(45000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const content =
      data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    return content ? String(content).trim() : null;
  } catch (error) {
    return null;
  }
}

async function answer(text, context, history) {
  const ranked = rank(text);
  const best = ranked[0];
  context.productQuery = productQuery(text);

  // Чистое приветствие отвечаем сами: коротко поздороваться и представиться,
  // без пересказа сообщения и без путаницы с именем пользователя.
  if (GREETING_ONLY.test(normalize(text))) {
    const greeting = ENTRIES.find(function (entry) { return entry.id === "greeting"; });
    return {
      reply: greeting.reply(context),
      topic: greeting.topic,
      intent: greeting.id,
      source: "rules",
    };
  }

  if (process.env.SUPPORT_LLM_URL) {
    const generated = await askModel(text, context, history, ranked);
    if (generated) {
      return { reply: generated, topic: best ? best.entry.topic : "Общее", intent: best ? best.entry.id : "fallback", source: "model" };
    }
  }

  if (!best || best.score < 3) {
    return {
      reply:
        "Уточните, пожалуйста, вопрос. Я помогу с заказом, оплатой, доставкой, гарантией, возвратом, " +
        "промокодами, наличием и характеристиками товара. Например: «где мой заказ», «есть ли Nimbus 14», «какие есть промокоды».",
      topic: "Уточнение",
      intent: "fallback",
      source: "rules",
    };
  }

  return {
    reply: best.entry.reply(context),
    topic: best.entry.topic,
    intent: best.entry.id,
    score: best.score,
    source: "rules",
  };
}

module.exports = { answer, normalize };
