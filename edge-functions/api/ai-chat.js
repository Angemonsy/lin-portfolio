const DEFAULT_DAILY_MESSAGES = 20;
const DEFAULT_DAILY_INPUT_CHARS = 3000;
const DEFAULT_COOLDOWN_SECONDS = 12;
const DEFAULT_MAX_INPUT_CHARS = 420;
const DEFAULT_MAX_HISTORY_MESSAGES = 6;
const DEFAULT_MAX_OUTPUT_TOKENS = 280;
const DEFAULT_AI_MODEL = 'doubao-seed-2.0-mini';
const DEFAULT_AI_BASE_URL = 'https://ark.cn-beijing.volces.com/api/plan/v3';

const encoder = new TextEncoder();

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow, noarchive'
    }
  });
}

function isOptions(request) {
  return request.method === 'OPTIONS';
}

function optionsResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-methods': 'POST,OPTIONS',
      'access-control-allow-headers': 'content-type',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow, noarchive'
    }
  });
}

function getGlobal(name) {
  try {
    return globalThis[name];
  } catch {
    return undefined;
  }
}

function getEnv(context, key, fallback = '') {
  const env = context?.env || {};
  const processEnv = getGlobal('process')?.env || {};
  return String(env[key] || processEnv[key] || fallback).trim();
}

function getNumberEnv(context, key, fallback) {
  const value = Number(getEnv(context, key, fallback));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getKv(context) {
  const env = context?.env || {};
  return env.AI_KV
    || env.KUNKI_AI_KV
    || env.kunki_ai_kv
    || getGlobal('AI_KV')
    || getGlobal('KUNKI_AI_KV')
    || getGlobal('kunki_ai_kv');
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(String(value)));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function kvGet(kv, key, fallback = null) {
  const raw = await kv.get(key, { type: 'json' }).catch(() => null);
  if (raw !== null && raw !== undefined) {
    if (typeof raw !== 'string') return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  const text = await kv.get(key).catch(() => null);
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

async function kvPutJson(kv, key, value) {
  await kv.put(key, JSON.stringify(value));
}

function getClientIp(request) {
  return String(
    request.headers.get('cf-connecting-ip')
    || request.headers.get('x-real-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]
    || 'unknown'
  ).trim();
}

function getDayKey() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeText(value, maxLength) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function hasPrivateIntent(text) {
  return /身份证|手机号|电话|住址|地址|密码|口令|api\s*key|密钥|token|cookie|后台|收入|银行卡|家庭|父母|女友|对象|恋爱|隐私|私密|未公开|内部数据/i.test(text);
}

function tokenize(text) {
  const source = String(text || '').toLowerCase();
  const parts = source.match(/[a-z0-9]+|[\u4e00-\u9fa5]{2,}/g) || [];
  const tokens = [];
  parts.forEach((part) => {
    if (/^[\u4e00-\u9fa5]+$/.test(part)) {
      if (part.length <= 8) tokens.push(part);
      for (let index = 0; index < part.length - 1; index += 1) {
        tokens.push(part.slice(index, index + 2));
      }
      return;
    }
    tokens.push(part);
  });
  return [...new Set(tokens)].filter((token) => token.length > 1);
}

function flattenKnowledge(data) {
  const docs = [];
  const addDoc = (item, group = '') => {
    if (!item || typeof item !== 'object') return;
    const title = normalizeText(item.title || item.name || '', 120);
    const description = normalizeText(item.description || item.summary || item.excerpt || '', 360);
    const url = normalizeText(item.url || item.page || item.href || '', 180);
    if (!title && !description) return;
    docs.push({
      title,
      description,
      url,
      group: normalizeText(group || item.category || item.type || '', 80)
    });
  };

  (Array.isArray(data) ? data : []).forEach((entry) => {
    addDoc(entry);
    (entry.items || []).forEach((item) => addDoc(item, entry.title));
  });
  return docs;
}

async function fetchPublicJson(origin, pathname) {
  const response = await fetch(new URL(pathname, origin).toString(), { cache: 'no-store' });
  if (!response.ok) return [];
  return response.json();
}

async function getPublicContext(request, message) {
  const origin = new URL(request.url).origin;
  const datasets = await Promise.allSettled([
    fetchPublicJson(origin, '/data/knowledge.json'),
    fetchPublicJson(origin, '/data/articles.json'),
    fetchPublicJson(origin, '/data/portfolio.json')
  ]);
  const docs = datasets.flatMap((result) => (
    result.status === 'fulfilled' ? flattenKnowledge(result.value) : []
  ));
  const queryTokens = tokenize(message);
  if (!queryTokens.length) return docs.slice(0, 4);

  return docs
    .map((doc) => {
      const body = `${doc.title} ${doc.description} ${doc.group}`;
      const docTokens = tokenize(body);
      const score = queryTokens.reduce((total, token) => {
        const titleHit = doc.title.toLowerCase().includes(token) ? 3 : 0;
        const bodyHit = docTokens.includes(token) ? 1 : 0;
        return total + titleHit + bodyHit;
      }, 0);
      return { ...doc, score };
    })
    .filter((doc) => doc.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

function buildContextBlock(docs) {
  if (!docs.length) return '暂无匹配的公开知识库片段。';
  return docs.map((doc, index) => (
    `${index + 1}. ${doc.group ? `【${doc.group}】` : ''}${doc.title}\n${doc.description}${doc.url ? `\n链接：${doc.url}` : ''}`
  )).join('\n\n');
}

function cleanHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((item) => item && (item.role === 'user' || item.role === 'assistant'))
    .slice(-DEFAULT_MAX_HISTORY_MESSAGES)
    .map((item) => ({
      role: item.role,
      content: normalizeText(item.content, 520)
    }))
    .filter((item) => item.content);
}

async function enforceLimit(context, request, message) {
  const kv = getKv(context);
  if (!kv) {
    return { error: 'AI 限额存储还没配置好，请绑定 AI_KV 后再开放对话。', status: 503 };
  }

  const dailyMessages = getNumberEnv(context, 'AI_DAILY_MESSAGES', DEFAULT_DAILY_MESSAGES);
  const dailyInputChars = getNumberEnv(context, 'AI_DAILY_INPUT_CHARS', DEFAULT_DAILY_INPUT_CHARS);
  const cooldownMs = getNumberEnv(context, 'AI_COOLDOWN_SECONDS', DEFAULT_COOLDOWN_SECONDS) * 1000;
  const ipHash = (await sha256(getClientIp(request))).slice(0, 24);
  const key = `ai_chat_usage_${getDayKey()}_${ipHash}`;
  const usage = await kvGet(kv, key, { count: 0, inputChars: 0, lastAt: 0 });
  const now = Date.now();

  if (usage.lastAt && now - usage.lastAt < cooldownMs) {
    return { error: '你问得太快了，等几秒再发。', status: 429 };
  }
  if (usage.count >= dailyMessages) {
    return { error: '今天的 AI 对话额度已经用完了，明天再来问我。', status: 429 };
  }
  if (usage.inputChars + message.length > dailyInputChars) {
    return { error: '今天的输入额度已经用完了，明天再来问我。', status: 429 };
  }

  const nextUsage = {
    count: Number(usage.count || 0) + 1,
    inputChars: Number(usage.inputChars || 0) + message.length,
    lastAt: now
  };
  await kvPutJson(kv, key, nextUsage);
  return {
    remaining: Math.max(dailyMessages - nextUsage.count, 0)
  };
}

function buildChatCompletionsUrl(context) {
  const directUrl = getEnv(context, 'AI_API_URL');
  if (directUrl) return directUrl;

  const baseUrl = getEnv(context, 'AI_BASE_URL', DEFAULT_AI_BASE_URL).replace(/\/+$/, '');
  return `${baseUrl}/chat/completions`;
}

async function callModel(context, messages) {
  const apiKey = getEnv(context, 'AI_API_KEY');
  const model = getEnv(context, 'AI_MODEL', DEFAULT_AI_MODEL);
  const apiUrl = buildChatCompletionsUrl(context);
  if (!apiKey) {
    return 'AI 接口还没配置好。你可以先浏览作品集、知识库，或者到页面底部联系我。';
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.35,
      max_tokens: getNumberEnv(context, 'AI_MAX_OUTPUT_TOKENS', DEFAULT_MAX_OUTPUT_TOKENS)
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || 'AI 服务暂时不可用。');
  }
  return normalizeText(
    data.choices?.[0]?.message?.content
    || data.output_text
    || '我暂时不知道怎么回答这个问题。',
    1200
  );
}

export async function onRequest(context) {
  try {
    const { request } = context;
    if (isOptions(request)) return optionsResponse();
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const maxInputChars = getNumberEnv(context, 'AI_MAX_INPUT_CHARS', DEFAULT_MAX_INPUT_CHARS);
    const body = await readJson(request);
    const message = normalizeText(body.message, maxInputChars + 1);
    if (!message) return json({ error: '先输入一个问题。' }, 400);
    if (message.length > maxInputChars) return json({ error: '这一条太长了，先拆成短一点的问题。' }, 400);

    const limit = await enforceLimit(context, request, message);
    if (limit.error) return json({ error: limit.error }, limit.status);

    if (hasPrivateIntent(message)) {
      return json({
        reply: '这个问题涉及隐私或未公开信息，我不能回答。你可以问我公开作品、大学经验、AI 工具使用、内容方法论这些方向。',
        remaining: limit.remaining
      });
    }

    const publicDocs = await getPublicContext(request, message);
    const system = [
      '你是林kunki个人网站里的 AI 分身，只能基于公开网站知识库回答。',
      '不要声称你能访问私有仓库、后台、聊天记录、账号、真实联系方式或未公开经历。',
      '如果问题涉及隐私、密钥、住址、手机号、家庭、收入、账号、后台数据、未公开商业信息，直接拒绝并引导到公开内容。',
      '如果公开知识库没有答案，就坦诚说明不知道，不要编造。',
      '回答用中文，简洁、有个人表达感，最多 4 段。'
    ].join('\n');
    const contextBlock = buildContextBlock(publicDocs);
    const messages = [
      { role: 'system', content: system },
      { role: 'system', content: `公开知识库片段：\n${contextBlock}` },
      ...cleanHistory(body.history),
      { role: 'user', content: message }
    ];
    const reply = await callModel(context, messages);
    return json({ reply, remaining: limit.remaining });
  } catch (error) {
    return json({ error: error.message || 'AI 服务暂时不可用。' }, 500);
  }
}

export default onRequest;
