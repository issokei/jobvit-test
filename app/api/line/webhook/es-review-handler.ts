/**
 * ES評価メッセージハンドラー
 */
import { Client } from '@line/bot-sdk';
import { createGuideFlex } from '@/lib/messages';
import { evaluateESWithAI } from '@/lib/es-review-ai';
import { splitESReviewForLine } from '@/lib/es-review-line';
import {
  saveCompanySelection,
  loadCompanySelection,
  clearCompanySelection,
  saveContinuation,
  loadContinuation,
  clearContinuation,
} from '@/lib/es-review-state';
import { getCompanyAddon } from '@/lib/es-review-companies';

const MIN_ES_CHARS = 80;
const MAX_ES_CHARS = 2000;

// コマンドパターン
const HELP_COMMAND_RE = /^(ヘルプ|help|\?|？|使い方)$/i;
const RESET_COMMAND_RE = /^(リセット|reset|初期化)$/i;
const CONTINUATION_COMMAND_RE = /^(続き|つづき|next|more)$/i;
const COMPANY_LINE_RE = /^(企業|会社|応募企業)\s*[:：=]\s*(.+)$/i;

/**
 * ES評価メッセージを処理
 */
export async function handleESReviewMessage(
  text: string,
  userId: string,
  replyToken: string,
  client: Client
): Promise<void> {
  console.log('[ESReview] Handling message:', text.substring(0, 50));

  // コマンド処理
  if (isHelpCommand(text)) {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: buildHelpText(),
    });
    return;
  }

  if (isResetCommand(text)) {
    await clearContinuation(userId);
    await clearCompanySelection(userId);
    await client.replyMessage(replyToken, {
      type: 'text',
      text: '状態をリセットしました。ES本文を送ってください。',
    });
    return;
  }

  if (isContinuationCommand(text)) {
    const restText = await loadContinuation(userId);
    if (!restText) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '（続きはありません。新しいES本文を送ってください）',
      });
      return;
    }

    const split = splitESReviewForLine(restText, 4900, 5);
    await saveContinuation(userId, split.rest);

    for (const chunk of split.chunks) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: chunk,
      });
    }
    return;
  }

  // 企業のみのコマンド
  const companyOnly = parseCompanyOnlyCommand(text);
  if (companyOnly) {
    const safeCompany = sanitizeCompanyName(companyOnly);
    if (!safeCompany) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '企業名の指定に不適切な文字列が含まれているため、保存できませんでした。',
      });
      return;
    }

    await saveCompanySelection(userId, safeCompany);
    const addon = getCompanyAddon(safeCompany);
    await client.replyMessage(replyToken, {
      type: 'text',
      text: [
        '企業設定を保存しました：' + safeCompany,
        addon ? `企業アドオン: ${addon.label}（適用）` : '企業アドオン: なし（ベース評価のみ）',
        '続けてES本文を送ってください。',
      ].join('\n'),
    });
    return;
  }

  // 企業名とES本文を抽出
  const extracted = extractCompanyAndES(text);
  const extractedCompany = sanitizeCompanyName(extracted.companyName || '');
  
  if (extractedCompany) {
    await saveCompanySelection(userId, extractedCompany);
  }

  const cachedCompany = await loadCompanySelection(userId);
  const companyName = extractedCompany || cachedCompany || undefined;
  const esText = String(extracted.esText || '');

  if (esText.length < MIN_ES_CHARS) {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: [
        `ES本文をそのまま貼って送ってください（目安: ${MIN_ES_CHARS}文字以上）。`,
        '※企業アドオンを使う場合は「企業: パナソニック」のように冒頭1行で指定できます。',
        '（困ったら「ヘルプ」と送ってください）',
      ].join('\n'),
    });
    return;
  }

  // ES評価を実行
  try {
    console.log('[ESReview] Evaluating ES with AI...');
    const result = await evaluateESWithAI(esText, companyName, {
      model: process.env.OPENAI_MODEL || 'gpt-5.2',
      maxOutputTokens: 2000,
      temperature: 0.2,
      verbosity: 'low',
      enableStructuredOutputs: true,
    });

    if (!result.ok) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: [
          'すみません、評価に失敗しました。',
          '少し待ってもう一度送ってください（長文は分割して送ると安定します）。',
        ].join('\n'),
      });
      return;
    }

    // テキストを分割
    const split = splitESReviewForLine(result.text, 4900, 5);
    await saveContinuation(userId, split.rest);

    // メッセージを送信
    for (const chunk of split.chunks) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: chunk,
      });
    }

    console.log('[ESReview] ES evaluation completed and sent');
  } catch (error) {
    console.error('[ESReview] Error evaluating ES:', error);
    await client.replyMessage(replyToken, {
      type: 'text',
      text: [
        'すみません、評価処理中にエラーが発生しました。',
        'もう一度送ってください。',
      ].join('\n'),
    });
  }
}

// ヘルパー関数

function isHelpCommand(text: string): boolean {
  return HELP_COMMAND_RE.test(text.trim());
}

function isResetCommand(text: string): boolean {
  return RESET_COMMAND_RE.test(text.trim());
}

function isContinuationCommand(text: string): boolean {
  return CONTINUATION_COMMAND_RE.test(text.trim());
}

function parseCompanyOnlyCommand(text: string): string | null {
  const t = text.trim();
  const m = t.match(COMPANY_LINE_RE);
  if (!m) return null;
  const name = String(m[2] || '').trim();
  if (!name) return null;
  if (t.indexOf('\n') !== -1) return null; // 複数行の場合は企業のみコマンドではない
  return name;
}

function extractCompanyAndES(text: string): { companyName: string; esText: string } {
  const raw = String(text || '');
  const norm = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = norm.split('\n');

  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;

  if (i < lines.length) {
    const m = lines[i].match(COMPANY_LINE_RE);
    if (m) {
      const company = String(m[2] || '').trim();
      const rest = lines.slice(i + 1).join('\n').trim();
      return { companyName: company, esText: rest };
    }
  }

  return { companyName: '', esText: norm.trim() };
}

function sanitizeCompanyName(name: string): string {
  let t = String(name || '');
  t = t.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  t = t.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  t = t.replace(/[\u200B-\u200F\uFEFF]/g, '');
  t = t.replace(/[\n\t]+/g, ' ').trim();
  t = t.replace(/[`<>]/g, '');
  if (t.length > 80) t = t.slice(0, 80).trim();
  return t || '';
}

function buildHelpText(): string {
  return [
    '【使い方】',
    '1) ES本文をそのまま貼り付けて送ってください（個人情報は伏せてOK）。',
    '2) 企業アドオンを使う場合は、本文の冒頭に1行だけ追加します：',
    '   例）企業: パナソニック',
    '',
    '【コマンド】',
    '- ヘルプ：この案内を表示',
    '- リセット：企業設定/続き状態をリセット',
    '- 続き：前回の返答の続き（残り）があれば表示',
  ].join('\n');
}

