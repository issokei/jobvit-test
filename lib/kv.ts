import Redis from 'ioredis';
import { UserState } from './types';

const STATE_KEY_PREFIX = 'line:user_state:';

// Redisクライアントのシングルトンインスタンス
let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (redisClient && (redisClient.status === 'ready' || redisClient.status === 'connecting')) {
    return redisClient;
  }

  // VercelのRedis接続情報を環境変数から取得
  // 優先順位: LINE_REDIS_URL > REDIS_URL > jobvitTest_REDIS_URL > その他の*_REDIS_URL
  const redisUrl = 
    process.env.LINE_REDIS_URL || 
    process.env.REDIS_URL ||
    process.env.jobvitTest_REDIS_URL ||
    // Vercelが自動生成する環境変数名のパターンもチェック
    Object.keys(process.env).find(key => key.endsWith('_REDIS_URL') && process.env[key]) 
      ? process.env[Object.keys(process.env).find(key => key.endsWith('_REDIS_URL'))!]
      : undefined;
  
  if (!redisUrl) {
    console.error('[KV] REDIS_URL or LINE_REDIS_URL environment variable is not set');
    console.error('[KV] Available env vars:', Object.keys(process.env).filter(key => key.includes('REDIS')));
    throw new Error('REDIS_URL or LINE_REDIS_URL environment variable is not set');
  }

  // URLの形式を確認（機密情報は表示しない）- WHATWG URL APIを使用
  try {
    const url = new URL(redisUrl);
    console.log('[KV] Redis URL format:', url.protocol, '//', url.hostname, ':', url.port);
  } catch (error) {
    console.log('[KV] Redis URL format check failed, using as-is');
  }
  console.log('[KV] Creating Redis client, URL length:', redisUrl.length);

  // 既存のクライアントがあれば切断
  if (redisClient) {
    try {
      redisClient.disconnect();
    } catch (error) {
      console.warn('[KV] Error disconnecting existing client:', error);
    }
  }

  // Redis URLから接続情報を解析
  // 別プロジェクトのRedisでも接続可能（環境変数でREDIS_URLを設定）
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    lazyConnect: false, // 明示的に接続を確立する
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 100, 3000);
      console.log('[KV] Redis retry attempt:', times, 'delay:', delay);
      if (times > 10) {
        console.error('[KV] Redis retry limit exceeded');
        return null; // リトライを停止
      }
      return delay;
    },
    connectTimeout: 30000, // 30秒に延長（別プロジェクトの場合は接続に時間がかかる可能性）
    commandTimeout: 10000, // コマンドタイムアウトを10秒に延長
    keepAlive: 30000,
    // TLS接続の場合の設定
    tls: redisUrl.startsWith('rediss://') ? {
      rejectUnauthorized: false, // VercelのRedisは自己署名証明書を使用する可能性がある
    } : undefined,
  });

  // イベントハンドリング
  redisClient.on('connect', () => {
    console.log('[KV] Redis connected');
  });

  redisClient.on('ready', () => {
    console.log('[KV] Redis ready');
  });

  redisClient.on('error', (err: Error) => {
    console.error('[KV] Redis connection error:', err);
    console.error('[KV] Error details:', err.message, err.stack);
  });

  redisClient.on('close', () => {
    console.log('[KV] Redis connection closed');
  });

  return redisClient;
}

async function ensureRedisConnection(redis: Redis): Promise<boolean> {
  try {
    const status = redis.status as string;
    
    if (status === 'ready') {
      return true;
    }
    
    if (status === 'end' || status === 'close' || status === 'wait') {
      console.log('[KV] Redis status:', status, '- attempting to connect...');
      await redis.connect();
      // 接続が確立されるまで少し待つ
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      const newStatus = redis.status as string;
      if (newStatus === 'ready' || newStatus === 'connecting') {
        console.log('[KV] Redis connection established, status:', newStatus);
        return true;
      }
    }
    
    const currentStatus = redis.status as string;
    return currentStatus === 'ready' || currentStatus === 'connecting';
  } catch (error) {
    console.error('[KV] Failed to ensure Redis connection:', error);
    return false;
  }
}

export async function getState(userId: string): Promise<UserState | null> {
  try {
    const redis = getRedisClient();
    const key = `${STATE_KEY_PREFIX}${userId}`;
    console.log('[KV] Getting state for key:', key, 'Redis status:', redis.status);
    
    // 接続を確実にする
    const connected = await ensureRedisConnection(redis);
    if (!connected) {
      console.error('[KV] Redis connection failed, cannot get state');
      return null;
    }
    
    const data = await redis.get(key);
    
    if (!data) {
      console.log('[KV] No state found for userId:', userId);
      return null;
    }
    
    const state = JSON.parse(data) as UserState;
    console.log('[KV] State retrieved:', state);
    return state;
  } catch (error) {
    console.error('[KV] getState error:', error);
    if (error instanceof Error) {
      console.error('[KV] Error details:', error.message);
      console.error('[KV] Error code:', (error as any).code);
      console.error('[KV] Error stack:', error.stack);
    }
    return null;
  }
}

export async function saveState(userId: string, state: UserState): Promise<void> {
  try {
    const redis = getRedisClient();
    const key = `${STATE_KEY_PREFIX}${userId}`;
    const data = JSON.stringify(state);
    
    console.log('[KV] Saving state for key:', key, 'state:', state, 'Redis status:', redis.status);
    
    // 接続を確実にする
    const connected = await ensureRedisConnection(redis);
    if (!connected) {
      console.error('[KV] Redis connection failed, cannot save state');
      throw new Error('Redis connection failed');
    }
    
    // 有効期限を設定（30日）
    await redis.setex(key, 60 * 60 * 24 * 30, data);
    console.log('[KV] State saved successfully');
  } catch (error) {
    console.error('[KV] saveState error:', error);
    if (error instanceof Error) {
      console.error('[KV] Error details:', error.message);
      console.error('[KV] Error code:', (error as any).code);
      console.error('[KV] Error stack:', error.stack);
    }
    throw error;
  }
}

export async function clearState(userId: string): Promise<void> {
  try {
    const redis = getRedisClient();
    const key = `${STATE_KEY_PREFIX}${userId}`;
    console.log('[KV] Clearing state for key:', key, 'Redis status:', redis.status);
    
    // 接続を確実にする
    const connected = await ensureRedisConnection(redis);
    if (!connected) {
      console.warn('[KV] Redis connection failed, cannot clear state (this is OK for new users)');
      return;
    }
    
    await redis.del(key);
    console.log('[KV] State cleared successfully');
  } catch (error) {
    console.error('[KV] clearState error:', error);
    if (error instanceof Error) {
      console.error('[KV] Error details:', error.message);
      console.error('[KV] Error code:', (error as any).code);
    }
    // clearStateのエラーは握りつぶす（新規ユーザーの場合は問題ない）
  }
}

