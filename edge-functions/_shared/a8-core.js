const DEFAULT_SESSION_DAYS = 365;
const DEFAULT_LOCK_MINUTES = 10;
const MAX_LOGIN_ATTEMPTS = 5;
const MAX_KNOWLEDGE_SNAPSHOT_BYTES = 100 * 1024;
const KNOWLEDGE_SNAPSHOT_KEY = 'a8_knowledge_snapshot_private';
const KNOWLEDGE_PREVIOUS_KEY = 'a8_knowledge_snapshot_previous';

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

function getKv(context) {
  const env = context?.env || {};
  return env.A8_KV
    || env.alphakk
    || getGlobal('A8_KV')
    || getGlobal('alphakk')
    || getGlobal('a8_kv')
    || getGlobal('my_kv')
    || getGlobal('kv');
}

function requireKv(context) {
  const kv = getKv(context);
  if (!kv) {
    throw new Error('KV namespace is not bound. Bind it as A8_KV in EdgeOne.');
  }
  return kv;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function readLimitedJson(request, maxBytes = MAX_KNOWLEDGE_SNAPSHOT_BYTES) {
  const text = await request.text();
  if (encoder.encode(text).byteLength > maxBytes) {
    const error = new Error('安全快照超过 100 KB 限制');
    error.status = 413;
    throw error;
  }
  try {
    return JSON.parse(text);
  } catch {
    const error = new Error('安全快照不是有效 JSON');
    error.status = 400;
    throw error;
  }
}

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(String(value)));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function randomHex(bytes = 32) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return [...data].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function cleanId(value) {
  return String(value || 'private').replace(/[^A-Za-z0-9_]/g, '_').slice(0, 64) || 'private';
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

function publicUser(user) {
  return { id: user.id, loginId: user.loginId || 'private' };
}

async function getAttemptKey(loginId) {
  return `a8_attempt_${(await sha256(loginId)).slice(0, 32)}`;
}

async function requireUser(context) {
  const request = context.request;
  const token = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1] || '';
  if (!token) return { response: json({ error: '需要登录' }, 401) };

  const kv = requireKv(context);
  const sessionKey = `a8_session_${cleanId(token)}`;
  const session = await kvGet(kv, sessionKey);
  if (!session || session.expiresAt < Date.now()) {
    if (session) await kv.delete(sessionKey);
    return { response: json({ error: '登录已过期' }, 401) };
  }

  const user = { id: session.userId, loginId: session.loginId };
  return { kv, sessionKey, token, session, user };
}

function isOptions(request) {
  return request.method === 'OPTIONS';
}

function optionsResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-methods': 'GET,POST,PUT,OPTIONS',
      'access-control-allow-headers': 'content-type, authorization',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow, noarchive'
    }
  });
}

function findForbiddenKnowledgeField(value, trail = []) {
  if (!value || typeof value !== 'object') return null;
  const forbidden = new Set([
    'path',
    'homePath',
    'folderPath',
    'content',
    'excerpt',
    'resolvedLinks',
    'backlinks',
    'wikilinks',
    'searchText',
    'prompt',
    'token'
  ]);
  for (const [key, child] of Object.entries(value)) {
    if (forbidden.has(key)) return [...trail, key].join('.');
    if (typeof child === 'string' && (
      child.includes('/Users/')
      || child.includes('file://')
      || /^[A-Za-z]:\\/.test(child)
    )) {
      return [...trail, key].join('.');
    }
    const nested = findForbiddenKnowledgeField(child, [...trail, key]);
    if (nested) return nested;
  }
  return null;
}

async function validateKnowledgePackage(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { error: '安全快照格式不正确' };
  }
  if (value.meta?.schema !== 'alpha-rebirth-cloud-package/v1'
    || value.data?.schema !== 'alpha-rebirth-cloud-package/v1'
    || value.data?.knowledge?.schema !== 'alpha-knowledge-cloud-snapshot/v1') {
    return { error: '安全快照 Schema 不受支持' };
  }
  const privacy = value.data?.privacy || {};
  const knowledgePrivacy = value.data?.knowledge?.privacy || {};
  if (
    privacy.containsNoteBodies !== false
    || privacy.containsFilePaths !== false
    || privacy.containsAttachments !== false
    || privacy.containsPromptsOrTokens !== false
    || knowledgePrivacy.containsNoteBodies !== false
    || knowledgePrivacy.containsFilePaths !== false
    || knowledgePrivacy.containsAttachments !== false
    || knowledgePrivacy.containsTokens !== false
  ) {
    return { error: '安全快照隐私声明不完整' };
  }
  const forbiddenField = findForbiddenKnowledgeField(value.data);
  if (forbiddenField) return { error: `安全快照包含禁用字段：${forbiddenField}` };

  const serializedData = JSON.stringify(value.data);
  const byteSize = encoder.encode(serializedData).byteLength;
  if (byteSize > MAX_KNOWLEDGE_SNAPSHOT_BYTES) return { error: '安全快照超过 100 KB 限制', status: 413 };
  if (Number(value.meta?.byteSize) !== byteSize) return { error: '安全快照体积校验失败' };
  const digest = await sha256(serializedData);
  if (String(value.meta?.digestSha256 || '') !== digest) return { error: '安全快照摘要校验失败' };
  return { value, digest, byteSize };
}

async function authorizeKnowledgeWrite(context) {
  const token = (context.request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1] || '';
  const syncTokenHash = getEnv(context, 'ALPHA_CLOUD_SYNC_TOKEN_HASH');
  if (token && syncTokenHash && (await sha256(token)) === syncTokenHash) {
    return { kv: requireKv(context), mode: 'sync-token' };
  }
  const auth = await requireUser(context);
  if (auth.response) return auth;
  return { ...auth, mode: 'user-session' };
}

export async function handleLogin(context) {
  try {
    const { request } = context;
    if (isOptions(request)) return optionsResponse();
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const kv = requireKv(context);
    const loginId = getEnv(context, 'LOGIN_ID');
    const passwordHash = getEnv(context, 'LOGIN_PASSWORD_HASH');
    if (!loginId || !passwordHash) return json({ error: '登录口令尚未配置' }, 500);

    const body = await readJson(request);
    const normalizedId = String(body.loginId || '').trim();
    const attemptKey = await getAttemptKey(normalizedId);
    const attempt = await kvGet(kv, attemptKey, { count: 0, lockedUntil: 0 });
    if (attempt.lockedUntil > Date.now()) return json({ error: '尝试次数过多，稍后再试' }, 429);

    const ok = normalizedId === loginId && (await sha256(body.password || '')) === passwordHash;
    if (!ok) {
      const nextCount = Number(attempt.count || 0) + 1;
      await kvPutJson(kv, attemptKey, {
        count: nextCount,
        lockedUntil: nextCount >= MAX_LOGIN_ATTEMPTS
          ? Date.now() + Number(getEnv(context, 'LOCK_MINUTES', DEFAULT_LOCK_MINUTES)) * 60 * 1000
          : 0
      });
      return json({ error: 'ID 或密码不正确' }, 401);
    }

    await kv.delete(attemptKey);
    const user = { id: `private_${cleanId(normalizedId)}`, loginId: normalizedId };
    const token = randomHex();
    const sessionDays = Number(getEnv(context, 'SESSION_DAYS', DEFAULT_SESSION_DAYS)) || DEFAULT_SESSION_DAYS;
    await kvPutJson(kv, `a8_session_${token}`, {
      userId: user.id,
      loginId: user.loginId,
      createdAt: Date.now(),
      expiresAt: Date.now() + sessionDays * 24 * 60 * 60 * 1000
    });

    return json({ ok: true, token, user: publicUser(user) });
  } catch (error) {
    return json({ error: error.message || '服务异常' }, 500);
  }
}

export async function handleMe(context) {
  try {
    if (isOptions(context.request)) return optionsResponse();
    if (context.request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
    const auth = await requireUser(context);
    if (auth.response) return auth.response;
    return json({ user: publicUser(auth.user) });
  } catch (error) {
    return json({ error: error.message || '服务异常' }, 500);
  }
}

export async function handleLogout(context) {
  try {
    if (isOptions(context.request)) return optionsResponse();
    if (context.request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    const auth = await requireUser(context);
    if (auth.response) return auth.response;
    await auth.kv.delete(auth.sessionKey);
    return json({ ok: true });
  } catch (error) {
    return json({ error: error.message || '服务异常' }, 500);
  }
}

export async function handleSnapshot(context) {
  try {
    const { request } = context;
    if (isOptions(request)) return optionsResponse();
    const auth = await requireUser(context);
    if (auth.response) return auth.response;
    const snapshotKey = `a8_snapshot_${cleanId(auth.user.id)}`;

    if (request.method === 'GET') {
      return json(await kvGet(auth.kv, snapshotKey, { data: {}, updatedAt: null }));
    }

    if (request.method === 'PUT') {
      const body = await readJson(request);
      if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
        return json({ error: '数据格式不正确' }, 400);
      }
      const snapshot = { data: body.data, updatedAt: new Date().toISOString() };
      await kvPutJson(auth.kv, snapshotKey, snapshot);
      return json({ ok: true, updatedAt: snapshot.updatedAt });
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (error) {
    return json({ error: error.message || '服务异常' }, 500);
  }
}

export async function handleKnowledgeSnapshot(context) {
  try {
    const { request } = context;
    if (isOptions(request)) return optionsResponse();

    if (request.method === 'GET') {
      const auth = await requireUser(context);
      if (auth.response) return auth.response;
      return json(await kvGet(auth.kv, KNOWLEDGE_SNAPSHOT_KEY, {
        snapshot: null,
        updatedAt: null,
        receivedAt: null
      }));
    }

    if (request.method === 'PUT') {
      const auth = await authorizeKnowledgeWrite(context);
      if (auth.response) return auth.response;
      const body = await readLimitedJson(request);
      const validated = await validateKnowledgePackage(body);
      if (validated.error) return json({ error: validated.error }, validated.status || 400);

      const current = await kvGet(auth.kv, KNOWLEDGE_SNAPSHOT_KEY, null);
      if (current?.digestSha256 === validated.digest) {
        return json({
          ok: true,
          unchanged: true,
          updatedAt: current.updatedAt,
          receivedAt: current.receivedAt
        });
      }

      if (current?.snapshot) await kvPutJson(auth.kv, KNOWLEDGE_PREVIOUS_KEY, current);
      const now = new Date().toISOString();
      const record = {
        snapshot: validated.value,
        digestSha256: validated.digest,
        byteSize: validated.byteSize,
        updatedAt: validated.value.meta?.generatedAt || now,
        receivedAt: now,
        source: auth.mode
      };
      await kvPutJson(auth.kv, KNOWLEDGE_SNAPSHOT_KEY, record);
      return json({ ok: true, unchanged: false, updatedAt: record.updatedAt, receivedAt: record.receivedAt });
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (error) {
    return json({ error: error.message || '服务异常' }, error.status || 500);
  }
}
