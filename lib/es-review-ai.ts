/**
 * OpenAI Responses APIを使ったES評価
 */
import OpenAI from 'openai';
import { buildOpenAIInstructions, wrapUntrustedESInput } from './es-review-prompt';

const OPENAI_RESPONSES_ENDPOINT = 'https://api.openai.com/v1/responses';

/**
 * OpenAIクライアントを取得
 */
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  return new OpenAI({
    apiKey,
  });
}

/**
 * OpenAI Responses APIを使ってESを評価
 */
export async function evaluateESWithAI(
  esText: string,
  companyName?: string,
  options?: {
    model?: string;
    maxOutputTokens?: number;
    temperature?: number;
    verbosity?: 'low' | 'medium' | 'high';
    reasoningEffort?: string;
    enableStructuredOutputs?: boolean;
  }
): Promise<{
  ok: boolean;
  text: string;
  status?: number;
  error?: string;
}> {
  const model = options?.model || process.env.OPENAI_MODEL || 'gpt-5.2';
  const maxOutputTokens = options?.maxOutputTokens || 2000;
  const temperature = options?.temperature ?? 0.2;
  const verbosity = options?.verbosity || 'low';
  const reasoningEffort = options?.reasoningEffort || '';
  const enableStructuredOutputs = options?.enableStructuredOutputs ?? true;

  const instructions = buildOpenAIInstructions(companyName, enableStructuredOutputs);
  const input = wrapUntrustedESInput(esText);

  const body: any = {
    model,
    instructions,
    input: [
      { role: 'user', content: input },
    ],
    max_output_tokens: maxOutputTokens,
    store: false,
    tools: [],
    text: {
      verbosity,
    },
  };

  // Prompt caching
  const cacheKey = process.env.PROMPT_CACHE_KEY || 'es-review-v1';
  if (cacheKey) {
    body.prompt_cache_key = cacheKey;
    body.prompt_cache_retention = process.env.PROMPT_CACHE_RETENTION || 'in_memory';
  }

  // Structured outputs
  if (enableStructuredOutputs) {
    body.text.format = {
      type: 'json_schema',
      name: 'es_review',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          message: {
            type: 'string',
            description: 'LINEに送る最終文章（日本語）。A)〜E) の指定フォーマットで、2000字以内目安。',
          },
        },
        required: ['message'],
      },
    };
  }

  // Reasoning / sampling compatibility
  const modelLower = model.toLowerCase();
  const isReasoningModel = modelLower.indexOf('gpt-5') === 0 || modelLower.indexOf('o') === 0;
  
  if (isReasoningModel) {
    body.reasoning = { effort: reasoningEffort || 'none' };
  }

  const effort = body.reasoning ? String(body.reasoning.effort || '') : '';
  const canUseTemperature = !isReasoningModel || effort === 'none';
  
  if (canUseTemperature && Number.isFinite(temperature)) {
    body.temperature = temperature;
  }

  console.log('[ESReview] Sending request to OpenAI Responses API...');
  console.log('[ESReview] Model:', model);
  console.log('[ESReview] Company:', companyName || 'none');

  try {
    const client = getOpenAIClient();
    
    // OpenAI SDKはResponses APIを直接サポートしていないため、fetchを使用
    const response = await fetch(OPENAI_RESPONSES_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ESReview] OpenAI API error:', response.status, errorText);
      return {
        ok: false,
        text: '',
        status: response.status,
        error: errorText.slice(0, 500),
      };
    }

    const json = await response.json();
    
    // Response stateを確認
    const state = getOpenAIResponseState(json);
    if (state.failed) {
      console.error('[ESReview] OpenAI response failed:', state.status, state.incompleteReason);
      return {
        ok: false,
        text: '',
        status: response.status,
        error: state.incompleteReason || 'Response failed',
      };
    }

    if (state.incomplete) {
      console.warn('[ESReview] OpenAI response incomplete:', state.status, state.incompleteReason);
      // 部分出力があれば返す
      const partial = extractResponseOutput(json);
      if (partial.text) {
        return {
          ok: true,
          text: partial.text + '\n\n（※出力が途中で途切れました）',
          status: response.status,
        };
      }
      return {
        ok: false,
        text: '',
        status: response.status,
        error: 'Response incomplete',
      };
    }

    const output = extractResponseOutput(json);
    
    if (output.refusal && !output.text) {
      console.warn('[ESReview] OpenAI refusal');
      return {
        ok: false,
        text: '',
        status: response.status,
        error: 'Content was refused',
      };
    }

    let messageText = output.text || '';
    
    // Structured outputsの場合はJSONをパース
    if (enableStructuredOutputs && messageText) {
      const parsed = parseModelJsonMessage(messageText);
      if (parsed.ok && parsed.message) {
        messageText = parsed.message;
      }
    }

    console.log('[ESReview] Received response, length:', messageText.length);

    return {
      ok: true,
      text: messageText,
      status: response.status,
    };
  } catch (error) {
    console.error('[ESReview] Error calling OpenAI API:', error);
    if (error instanceof Error) {
      return {
        ok: false,
        text: '',
        error: error.message,
      };
    }
    return {
      ok: false,
      text: '',
      error: 'Unknown error',
    };
  }
}

/**
 * OpenAIレスポンスの状態を取得
 */
function getOpenAIResponseState(json: any): {
  status: string;
  failed: boolean;
  incomplete: boolean;
  incompleteReason: string;
} {
  const status = String(json?.status || '');
  const hasError = !!(json?.error);
  const incompleteDetails = json?.incomplete_details;
  let incompleteReason = '';
  
  if (incompleteDetails && typeof incompleteDetails.reason === 'string') {
    incompleteReason = incompleteDetails.reason;
  }

  const output = json?.output;
  let hasNonCompletedItem = false;
  
  if (Array.isArray(output)) {
    for (const item of output) {
      if (item?.status && String(item.status) !== 'completed') {
        hasNonCompletedItem = true;
        break;
      }
    }
  }

  const failed = hasError || status === 'failed';
  const incomplete = (status && status !== 'completed' && status !== 'failed') || !!incompleteDetails || hasNonCompletedItem;

  return { status, failed, incomplete, incompleteReason };
}

/**
 * レスポンスから出力テキストを抽出
 */
function extractResponseOutput(json: any): { text: string; refusal: string } {
  const out = { text: '', refusal: '' };
  const output = json?.output;

  if (Array.isArray(output)) {
    let textAcc = '';
    let refusalAcc = '';

    for (const item of output) {
      if (item?.type === 'message' && Array.isArray(item.content)) {
        for (const c of item.content) {
          if (!c) continue;
          if (c.type === 'output_text' && typeof c.text === 'string') {
            textAcc += c.text;
          } else if (c.type === 'refusal') {
            if (typeof c.refusal === 'string') refusalAcc += c.refusal;
            else if (typeof c.text === 'string') refusalAcc += c.text;
          }
        }
      }
    }

    out.text = textAcc;
    out.refusal = refusalAcc;
    return out;
  }

  // Fallback
  if (json?.output_text) out.text = json.output_text;
  if (json?.refusal) out.refusal = json.refusal;

  return out;
}

/**
 * JSONメッセージをパース
 */
function parseModelJsonMessage(text: string): { ok: boolean; message: string } {
  const cleaned = stripCodeFences(text);
  let j: any = null;

  try {
    j = JSON.parse(cleaned);
  } catch {
    const sub = extractLikelyJsonObject(cleaned);
    if (sub) {
      try {
        j = JSON.parse(sub);
      } catch {
        // ignore
      }
    }
  }

  if (j && typeof j === 'object') {
    const msg = j.message != null ? String(j.message) : '';
    if (msg.trim()) {
      return { ok: true, message: msg.trim() };
    }
  }

  return { ok: false, message: '' };
}

/**
 * コードフェンスを削除
 */
function stripCodeFences(text: string): string {
  const t = String(text || '').trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return m ? String(m[1] || '').trim() : t;
}

/**
 * JSONオブジェクトを抽出
 */
function extractLikelyJsonObject(text: string): string {
  const t = String(text || '');
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  
  if (start >= 0 && end > start) {
    const sub = t.slice(start, end + 1).trim();
    if (sub.indexOf('"message"') !== -1) return sub;
  }
  
  return '';
}

