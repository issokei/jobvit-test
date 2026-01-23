import OpenAI from 'openai';
import type { Question } from './types';

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({ apiKey });
}

export async function generateProfileQuestionText(
  question: Question,
  index: number,
  total: number,
  answers: Record<string, string>
): Promise<string> {
  const client = getOpenAIClient();
  const modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const answeredSummary = Object.entries(answers)
    .slice(0, 5)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' / ');

  const system = [
    'あなたは就活プロフィールを丁寧に聞き取るアシスタントです。',
    '次の質問をLINEのチャット形式で短く、分かりやすく提示してください。',
    '余計な前置きは不要です。',
  ].join('\n');

  const user = [
    `質問番号: ${index + 1}/${total}`,
    `質問タイトル: ${question.title}`,
    `補足: ${question.subtitle || ''}`,
    `選択肢: ${question.options?.join(' / ') || '自由回答'}`,
    `複数選択: ${question.multiple ? 'はい' : 'いいえ'}`,
    `最大選択数: ${question.maxSelections || '制限なし'}`,
    `既に回答済み: ${answeredSummary || 'なし'}`,
    '',
    '出力ルール:',
    '- 1〜4行で返す',
    '- 選択肢がある場合は番号付きで簡潔に列挙',
    '- 複数選択の場合は「カンマ区切りで回答」と明記',
  ].join('\n');

  const response = await client.chat.completions.create({
    model: modelName,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  return content.trim();
}

