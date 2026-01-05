/**
 * ES評価の状態管理（Redis）
 */
import Redis from 'ioredis';

const COMPANY_KEY_PREFIX = 'es:company:';
const CONTINUATION_KEY_PREFIX = 'es:continuation:';
const CACHE_MAX_TTL_SEC = 21600; // 6時間

/**
 * Redisクライアントを取得
 */
function getRedisClient(): Redis {
  const redisUrl = process.env.LINE_REDIS_URL || process.env.REDIS_URL || process.env.jobvitTest_REDIS_URL;
  
  if (!redisUrl) {
    throw new Error('REDIS_URL or LINE_REDIS_URL environment variable is not set');
  }

  return new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    lazyConnect: false,
  });
}

/**
 * 企業選択を保存
 */
export async function saveCompanySelection(userId: string, companyName: string): Promise<void> {
  const redis = getRedisClient();
  const key = `${COMPANY_KEY_PREFIX}${userId}`;
  await redis.setex(key, CACHE_MAX_TTL_SEC, companyName);
}

/**
 * 企業選択を取得
 */
export async function loadCompanySelection(userId: string): Promise<string | null> {
  try {
    const redis = getRedisClient();
    const key = `${COMPANY_KEY_PREFIX}${userId}`;
    const value = await redis.get(key);
    return value || null;
  } catch (error) {
    console.error('[ESReviewState] Error loading company selection:', error);
    return null;
  }
}

/**
 * 企業選択をクリア
 */
export async function clearCompanySelection(userId: string): Promise<void> {
  try {
    const redis = getRedisClient();
    const key = `${COMPANY_KEY_PREFIX}${userId}`;
    await redis.del(key);
  } catch (error) {
    console.error('[ESReviewState] Error clearing company selection:', error);
  }
}

/**
 * 続きテキストを保存
 */
export async function saveContinuation(userId: string, restText: string): Promise<void> {
  if (!restText) {
    await clearContinuation(userId);
    return;
  }

  try {
    const redis = getRedisClient();
    const key = `${CONTINUATION_KEY_PREFIX}${userId}`;
    const safe = restText.length > 50000 ? restText.slice(0, 50000) : restText;
    await redis.setex(key, CACHE_MAX_TTL_SEC, safe);
  } catch (error) {
    console.error('[ESReviewState] Error saving continuation:', error);
  }
}

/**
 * 続きテキストを取得
 */
export async function loadContinuation(userId: string): Promise<string | null> {
  try {
    const redis = getRedisClient();
    const key = `${CONTINUATION_KEY_PREFIX}${userId}`;
    const value = await redis.get(key);
    return value || null;
  } catch (error) {
    console.error('[ESReviewState] Error loading continuation:', error);
    return null;
  }
}

/**
 * 続きテキストをクリア
 */
export async function clearContinuation(userId: string): Promise<void> {
  try {
    const redis = getRedisClient();
    const key = `${CONTINUATION_KEY_PREFIX}${userId}`;
    await redis.del(key);
  } catch (error) {
    console.error('[ESReviewState] Error clearing continuation:', error);
  }
}
