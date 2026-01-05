/**
 * Googleフォーム採点メッセージハンドラー
 */
import { Client } from '@line/bot-sdk';
import { scoreFormAnswersWithAI } from '@/lib/ai-scoring';
import { createScoringResultMessage } from '@/lib/messages';

// コマンドパターン
const HELP_COMMAND_RE = /^(ヘルプ|help|\?|？|使い方)$/i;

/**
 * Googleフォーム形式の回答を採点
 */
export async function handleFormScoringMessage(
  text: string,
  userId: string,
  replyToken: string,
  client: Client
): Promise<void> {
  console.log('[FormScoring] Handling message:', text.substring(0, 50));

  // コマンド処理
  if (isHelpCommand(text)) {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: buildHelpText(),
    });
    return;
  }

  // テキストをGoogleフォーム形式のデータに変換
  const formData = parseTextToFormData(text);

  if (Object.keys(formData).length === 0) {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: [
        'フォーム回答を送信してください。',
        '形式：',
        'Q1. 質問1',
        '回答: 回答内容',
        '',
        'Q2. 質問2',
        '回答: 回答内容',
        '',
        '（困ったら「ヘルプ」と送ってください）',
      ].join('\n'),
    });
    return;
  }

  // 採点を実行
  try {
    console.log('[FormScoring] Starting AI scoring...');
    const scoringResult = await scoreFormAnswersWithAI(formData);
    console.log('[FormScoring] AI scoring completed:', {
      totalPoints: scoringResult.totalPoints,
      maxPoints: scoringResult.maxPoints,
      percentage: scoringResult.percentage,
      grade: scoringResult.grade,
    });

    // 採点結果をLINEに送信
    const scoringMessage = createScoringResultMessage(
      scoringResult.totalPoints,
      scoringResult.maxPoints,
      scoringResult.percentage,
      scoringResult.grade,
      scoringResult.feedback || '',
      scoringResult.details
    );

    await client.replyMessage(replyToken, scoringMessage);
    console.log('[FormScoring] Scoring result sent successfully');
  } catch (error) {
    console.error('[FormScoring] Error scoring form:', error);
    await client.replyMessage(replyToken, {
      type: 'text',
      text: [
        'すみません、採点処理中にエラーが発生しました。',
        'もう一度送ってください。',
      ].join('\n'),
    });
  }
}

/**
 * テキストをGoogleフォーム形式のデータに変換
 * 
 * 形式例：
 * Q1. 質問1
 * 回答: 回答内容
 * 
 * Q2. 質問2
 * 回答: 回答内容
 */
function parseTextToFormData(text: string): Record<string, string[]> {
  const formData: Record<string, string[]> = {};
  const lines = text.split('\n');
  
  let currentQuestion = '';
  let currentAnswer: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 質問行を検出（Q1., Q2. など）
    const questionMatch = line.match(/^Q\d+\.\s*(.+)$/i);
    if (questionMatch) {
      // 前の質問を保存
      if (currentQuestion && currentAnswer.length > 0) {
        formData[currentQuestion] = currentAnswer;
      }
      // 新しい質問を開始
      currentQuestion = questionMatch[1].trim();
      currentAnswer = [];
      continue;
    }
    
    // 回答行を検出（回答:, A: など）
    const answerMatch = line.match(/^(回答|A|Answer)[:：]\s*(.+)$/i);
    if (answerMatch) {
      currentAnswer.push(answerMatch[2].trim());
      continue;
    }
    
    // 質問が設定されている場合、回答の続きとして扱う
    if (currentQuestion && line) {
      if (currentAnswer.length === 0) {
        currentAnswer.push(line);
      } else {
        // 複数行の回答を結合
        currentAnswer[currentAnswer.length - 1] += '\n' + line;
      }
    }
  }
  
  // 最後の質問を保存
  if (currentQuestion && currentAnswer.length > 0) {
    formData[currentQuestion] = currentAnswer;
  }
  
  return formData;
}

// ヘルパー関数

function isHelpCommand(text: string): boolean {
  return HELP_COMMAND_RE.test(text.trim());
}

function buildHelpText(): string {
  return [
    '【使い方】',
    'Googleフォーム形式で回答を送信してください。',
    '',
    '【形式例】',
    'Q1. あなたの強みは何ですか？',
    '回答: コミュニケーション能力です。',
    '',
    'Q2. 志望動機を教えてください',
    '回答: 貴社の理念に共感したためです。',
    '',
    '【コマンド】',
    '- ヘルプ：この案内を表示',
  ].join('\n');
}

