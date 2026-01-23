import { NextRequest, NextResponse } from 'next/server';
import { Client, validateSignature, WebhookEvent, MessageEvent } from '@line/bot-sdk';
import { track } from '@vercel/analytics/server';
import { QUESTIONS } from '@/lib/questions';
import { generateProfileQuestionText } from '@/lib/ai-profile';
import { getState, saveState, clearState } from '@/lib/kv';
import { saveChatProfileToSheet, createV0FormUrl } from '@/lib/sheets';
import {
  // buildQuestionFlex,
  // createGuideFlex,
  // createSurveyCompletePanel,
  createEventFlexMessage,
} from '@/lib/messages';

const PROFILE_STEP_PREFIX = 'profile:';
const PROFILE_AI_STEP_PREFIX = 'profile_ai:';
const PROFILE_START_COMMANDS = [
  'プロフィール回答開始',
  'プロフィール開始',
  'アンケート開始',
  'プロフィール入力',
  'プロフィールを入力する',
  'プロフィールを回答する',
];
const PROFILE_AI_START_COMMANDS = [
  'AIプロフィール回答開始',
  'AIプロフィール開始',
  'AIアンケート開始',
];

function getLineClient(): Client {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;

  if (!channelAccessToken || !channelSecret) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN and LINE_CHANNEL_SECRET must be set');
  }

  return new Client({
    channelAccessToken,
    channelSecret,
  });
}

function getChannelSecret(): string {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) {
    throw new Error('LINE_CHANNEL_SECRET must be set');
  }
  return channelSecret;
}

// GETリクエスト（ブラウザからのアクセスやヘルスチェック用）
export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      message: 'LINE Bot Webhook Endpoint',
      status: 'active',
      method: 'POST only',
      description: 'This endpoint accepts POST requests from LINE Messaging API',
    },
    { status: 200 }
  );
}

// POSTリクエスト（LINE Webhook）
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-line-signature');

    console.log('[Webhook] Received request');

    if (!signature) {
      console.error('[Webhook] Missing signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // 署名検証
    const channelSecret = getChannelSecret();
    if (!validateSignature(body, channelSecret, signature)) {
      console.error('[Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const client = getLineClient();

    const events: WebhookEvent[] = JSON.parse(body).events;
    console.log('[Webhook] Events received:', events?.length || 0);
    console.log('[Webhook] Event types:', events?.map(e => e.type).join(', ') || 'none');

    if (!events || events.length === 0) {
      console.log('[Webhook] No events to process');
      return NextResponse.json({ message: 'OK' });
    }

    // イベント処理
    await Promise.all(
      events.map(async (event: WebhookEvent) => {
        try {
          console.log('[Webhook] Processing event:', event.type, 'source:', JSON.stringify(event.source));
          await handleEvent(event, client);
          console.log('[Webhook] Event processed successfully:', event.type);
        } catch (error) {
          console.error('[Webhook] Error handling event:', error);
          if (error instanceof Error) {
            console.error('[Webhook] Error message:', error.message);
            console.error('[Webhook] Error stack:', error.stack);
          }
        }
      })
    );

    console.log('[Webhook] All events processed successfully');
    return NextResponse.json({ message: 'OK' });
  } catch (error) {
    console.error('[Webhook] Fatal error:', error);
    if (error instanceof Error) {
      console.error('[Webhook] Error stack:', error.stack);
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleEvent(event: WebhookEvent, client: Client) {
  const userId = (event.source as any)?.userId;
  if (!userId) {
    console.warn('[handleEvent] No userId found in event');
    return;
  }

  console.log('[handleEvent] Event type:', event.type, 'userId:', userId);

  // 友だち追加
  if (event.type === 'follow') {
    console.log('[handleEvent] Follow event detected');
    await handleFollow(userId, client);
    return;
  }

  // メッセージ
  if (event.type === 'message') {
    const messageEvent = event as MessageEvent;
    if (messageEvent.message.type === 'text') {
      const text = (messageEvent.message.text || '').trim();
      const replyToken = event.replyToken;

      console.log('[handleEvent] Text message received:', text, 'replyToken:', replyToken ? 'exists' : 'missing');

      if (!replyToken) {
        console.error('[handleEvent] No replyToken found - cannot reply');
        return;
      }

      const currentState = await getState(userId);

      if (PROFILE_AI_START_COMMANDS.includes(text)) {
        await startProfileChat(userId, replyToken, client, true);
        return;
      }

      if (PROFILE_START_COMMANDS.includes(text)) {
        await startProfileChat(userId, replyToken, client, false);
        return;
      }

      if (currentState && isProfileStep(currentState.step)) {
        await handleProfileAnswer(text, userId, replyToken, client, currentState);
        return;
      }

      // リッチメニューからの次回イベント応募リクエスト
      if (text === '次回イベントに応募する') {
        console.log('[handleEvent] Next event application requested from rich menu');
        try {
          // 5秒待機
          console.log('[handleEvent] Waiting 5 seconds before sending event info...');
          console.log('[handleEvent] 5 seconds elapsed, sending event info...');
          
          const eventMessage = createEventFlexMessage(userId);
          console.log('[handleEvent] Event message created, sending...');
          const response = await client.replyMessage(replyToken, eventMessage);
          console.log('[handleEvent] Event info message sent successfully, response:', response);
          
          // Vercel Analyticsでトラッキング
          try {
            track('event_info_viewed', {
              userId: userId.substring(0, 10) + '...',
            });
            console.log('[handleEvent] Analytics event tracked: event_info_viewed');
          } catch (analyticsError) {
            console.warn('[handleEvent] Failed to track analytics event:', analyticsError);
          }
          
          // stateはdoneのまま保持
          const currentState = await getState(userId);
          await saveState(userId, {
            step: 'done',
            answers: (currentState && currentState.answers) || {},
          });
        } catch (error) {
          console.error('[handleEvent] Error sending event info:', error);
          if (error instanceof Error) {
            console.error('[handleEvent] Error message:', error.message);
            console.error('[handleEvent] Error stack:', error.stack);
          }
        }
        return;
      }

      // v0-jobvit.vercel.appのフォームを開くリクエスト
      if (text === 'フォームを開く' || text === '応募フォーム' || text === '参加登録') {
        console.log('[handleEvent] V0 form requested from rich menu');
        try {
          const formUrl = createV0FormUrl(userId);
          console.log('[handleEvent] V0 form URL created, sending...');
          
          // Flexメッセージでカード形式で表示
          await client.replyMessage(replyToken, {
            type: 'flex',
            altText: '参加登録フォーム',
            contents: {
              type: 'bubble',
              body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'text',
                    text: '参加登録フォーム',
                    weight: 'bold',
                    size: 'xl',
                    color: '#0F172A',
                    wrap: true,
                  },
                  {
                    type: 'text',
                    text: 'プロフィール情報を入力して、おすすめ企業を確認しましょう。',
                    size: 'sm',
                    color: '#64748B',
                    wrap: true,
                    margin: 'md',
                  },
                ],
                paddingAll: '20px',
              },
              footer: {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                contents: [
                  {
                    type: 'button',
                    style: 'primary',
                    height: 'md',
                    action: {
                      type: 'uri',
                      label: 'フォームを開く',
                      uri: formUrl,
                    },
                    color: '#fc9f2a',
                  },
                ],
                paddingAll: '20px',
              },
            },
          });
          
          console.log('[handleEvent] V0 form URL sent successfully');
          
          // Vercel Analyticsでトラッキング
          try {
            track('v0_form_opened', {
              userId: userId.substring(0, 10) + '...',
            });
            console.log('[handleEvent] Analytics event tracked: v0_form_opened');
          } catch (analyticsError) {
            console.warn('[handleEvent] Failed to track analytics event:', analyticsError);
          }
        } catch (error) {
          console.error('[handleEvent] Error sending v0 form URL:', error);
          if (error instanceof Error) {
            console.error('[handleEvent] Error message:', error.message);
            console.error('[handleEvent] Error stack:', error.stack);
          }
        }
        return;
      }

      // 企業情報を見る
      if (text === '企業情報を見る' || text === '企業情報' || text === '企業一覧') {
        console.log('[handleEvent] Company info requested');
        try {
          // v0-company-info-cards.vercel.appへのリンクを生成（ユーザーIDを追加）
          const companyInfoUrl = `https://v0-company-info-cards.vercel.app?userId=${encodeURIComponent(userId)}`;
          console.log('[handleEvent] Company info URL created:', companyInfoUrl);
          
          // Flexメッセージでリンクボタンを表示
          await client.replyMessage(replyToken, {
            type: 'flex',
            altText: '企業情報を見る',
            contents: {
              type: 'bubble',
              body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'text',
                    text: 'あなたにおすすめの企業',
                    weight: 'bold',
                    size: 'xl',
                    color: '#0F172A',
                    wrap: true,
                  },
                  {
                    type: 'text',
                    text: 'あなたのプロフィールにマッチする企業をピックアップしました',
                    size: 'sm',
                    color: '#64748B',
                    wrap: true,
                    margin: 'md',
                  },
                ],
                paddingAll: '20px',
              },
              footer: {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                contents: [
                  {
                    type: 'button',
                    style: 'primary',
                    height: 'md',
                    action: {
                      type: 'uri',
                      label: 'おすすめされた企業を確認する',
                      uri: companyInfoUrl,
                    },
                    color: '#fc9f2a',
                  },
                ],
                paddingAll: '20px',
              },
            },
          });
          
          console.log('[handleEvent] Company info message sent successfully');
          
          // Vercel Analyticsでトラッキング
          try {
            track('company_info_viewed', {
              userId: userId.substring(0, 10) + '...',
            });
            console.log('[handleEvent] Analytics event tracked: company_info_viewed');
          } catch (analyticsError) {
            console.warn('[handleEvent] Failed to track analytics event:', analyticsError);
          }
        } catch (error) {
          console.error('[handleEvent] Error sending company info:', error);
          if (error instanceof Error) {
            console.error('[handleEvent] Error message:', error.message);
            console.error('[handleEvent] Error stack:', error.stack);
          }
          
          // エラー時はエラーメッセージを送信
          await client.replyMessage(replyToken, {
            type: 'text',
            text: '企業情報の表示に失敗しました。しばらくしてから再度お試しください。',
          });
        }
        return;
      }

      // イベント情報
      if (text === 'イベント情報' || text === 'イベント情報を表示する') {
        console.log('[handleEvent] Event info requested');
        try {
          // 5秒待機
          console.log('[handleEvent] Waiting 5 seconds before sending event info...');
          await new Promise(resolve => setTimeout(resolve, 3000));
          console.log('[handleEvent] 5 seconds elapsed, sending event info...');
          
          const eventMessage = createEventFlexMessage(userId);
          console.log('[handleEvent] Event message created, sending...');
          const response = await client.replyMessage(replyToken, eventMessage);
          console.log('[handleEvent] Event info message sent successfully, response:', response);
          
          // Vercel Analyticsでトラッキング
          try {
            track('event_info_viewed', {
              userId: userId.substring(0, 10) + '...',
            });
            console.log('[handleEvent] Analytics event tracked: event_info_viewed');
          } catch (analyticsError) {
            console.warn('[handleEvent] Failed to track analytics event:', analyticsError);
          }
          
          // stateはdoneのまま保持
          const currentState = await getState(userId);
          await saveState(userId, {
            step: 'done',
            answers: (currentState && currentState.answers) || {},
          });
        } catch (error) {
          console.error('[handleEvent] Error sending event info:', error);
          if (error instanceof Error) {
            console.error('[handleEvent] Error message:', error.message);
            console.error('[handleEvent] Error stack:', error.stack);
          }
          // エラーが発生しても例外を再スローしない（LINE APIのエラーはログに記録するだけ）
        }
        return;
      }

      // メッセージ受信時の処理
      // イベント情報・企業情報・プロフィール回答以外のメッセージには案内を返す
      await client.replyMessage(replyToken, {
        type: 'text',
        text: [
          'こんにちは！',
          '以下のコマンドが利用できます：',
          '・「イベント情報」- イベント情報を表示',
          '・「企業情報を見る」- 参加企業一覧を表示',
          '・「プロフィール回答開始」- LINEでプロフィールを回答',
          '・「AIプロフィール回答開始」- AI文面で質問を表示',
        ].join('\n'),
      });
      return;
    }
  }
}

function isProfileStep(step?: string): boolean {
  return !!step && (step.startsWith(PROFILE_STEP_PREFIX) || step.startsWith(PROFILE_AI_STEP_PREFIX));
}

function getProfileIndex(step: string): number {
  const raw = step.replace(PROFILE_AI_STEP_PREFIX, '').replace(PROFILE_STEP_PREFIX, '');
  const index = parseInt(raw, 10);
  return Number.isNaN(index) ? 0 : index;
}

function isAiProfileStep(step: string): boolean {
  return step.startsWith(PROFILE_AI_STEP_PREFIX);
}

async function startProfileChat(userId: string, replyToken: string, client: Client, useAi: boolean) {
  console.log('[ProfileChat] Starting profile chat for user:', userId);

  const stepPrefix = useAi ? PROFILE_AI_STEP_PREFIX : PROFILE_STEP_PREFIX;
  await saveState(userId, { step: `${stepPrefix}0`, answers: {} });

  const firstQuestion = QUESTIONS[0];
  if (!firstQuestion) {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: '質問が設定されていません。管理者にお問い合わせください。',
    });
    return;
  }

  const questionText = await buildQuestionTextWithMode(firstQuestion, 0, {}, useAi);

  await client.replyMessage(replyToken, {
    type: 'text',
    text: questionText,
  });
}

async function handleProfileAnswer(
  text: string,
  userId: string,
  replyToken: string,
  client: Client,
  state: { step: string; answers: Record<string, string> }
) {
  const index = getProfileIndex(state.step);
  const question = QUESTIONS[index];
  const useAi = isAiProfileStep(state.step);

  if (!question) {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: '質問が見つかりませんでした。最初からやり直してください。',
    });
    return;
  }

  const normalized = normalizeAnswer(text, question);
  if (!normalized) {
    const retryText = await buildQuestionTextWithMode(question, index, state.answers || {}, useAi);
    await client.replyMessage(replyToken, {
      type: 'text',
      text: `入力内容を確認してください。\n\n${retryText}`,
    });
    return;
  }

  const answers = state.answers || {};
  answers[question.title] = normalized;

  const nextIndex = index + 1;
  const nextQuestion = QUESTIONS[nextIndex];

  if (nextQuestion) {
    const stepPrefix = useAi ? PROFILE_AI_STEP_PREFIX : PROFILE_STEP_PREFIX;
    await saveState(userId, { step: `${stepPrefix}${nextIndex}`, answers });
    const nextText = await buildQuestionTextWithMode(nextQuestion, nextIndex, answers, useAi);
    await client.replyMessage(replyToken, {
      type: 'text',
      text: nextText,
    });
    return;
  }

  await saveState(userId, { step: 'done', answers });

  let sheetSaveError = false;
  try {
    await saveChatProfileToSheet(userId, answers, QUESTIONS.map((q) => q.title));
    console.log('[ProfileChat] Saved profile answers to sheet');
  } catch (error) {
    sheetSaveError = true;
    console.error('[ProfileChat] Failed to save to sheet:', error);
  }

  const companyInfoUrl = `https://v0-company-info-cards.vercel.app?userId=${encodeURIComponent(userId)}`;
  const flexMessage = buildRecommendationFlexMessage(companyInfoUrl);

  const messages = [
    {
      type: 'text' as const,
      text: sheetSaveError
        ? '回答は受け取りましたが、スプレッドシートへの保存に失敗しました。管理者にご連絡ください。'
        : '回答ありがとうございました。おすすめ企業のカードをお送りします。',
    },
    flexMessage,
  ];

  await client.replyMessage(replyToken, messages);
}

function buildQuestionText(question: { title: string; subtitle: string; options: string[]; multiple?: boolean; maxSelections?: number }) {
  const lines = [question.title, question.subtitle];

  if (question.options && question.options.length > 0) {
    lines.push('');
    lines.push('選択肢：');
    question.options.forEach((opt, idx) => {
      lines.push(`${idx + 1}. ${opt}`);
    });
    lines.push('');
    if (question.multiple) {
      const maxInfo = question.maxSelections ? `（最大${question.maxSelections}つ）` : '';
      lines.push(`回答方法: 番号または内容をカンマ区切りで入力してください ${maxInfo}`);
    } else {
      lines.push('回答方法: 番号または内容で入力してください');
    }
  }

  return lines.join('\n');
}

async function buildQuestionTextWithMode(
  question: { title: string; subtitle: string; options: string[]; multiple?: boolean; maxSelections?: number },
  index: number,
  answers: Record<string, string>,
  useAi: boolean
): Promise<string> {
  if (!useAi) {
    return buildQuestionText(question);
  }

  try {
    return await generateProfileQuestionText(question, index, QUESTIONS.length, answers);
  } catch (error) {
    console.error('[ProfileChat] AI question generation failed, fallback to static text:', error);
    return buildQuestionText(question);
  }
}

function normalizeAnswer(
  input: string,
  question: { options: string[]; multiple?: boolean; maxSelections?: number }
): string | null {
  const raw = String(input || '').trim();
  if (!raw) return null;

  if (!question.options || question.options.length === 0) {
    return raw;
  }

  if (!question.multiple) {
    const single = mapToOption(raw, question.options);
    return single || null;
  }

  const tokens = raw.split(/[、,]/).map((t) => t.trim()).filter(Boolean);
  if (tokens.length === 0) return null;

  const selections: string[] = [];
  for (const token of tokens) {
    const mapped = mapToOption(token, question.options);
    if (mapped) {
      selections.push(mapped);
      continue;
    }
    if (question.options.includes('その他') && token.startsWith('その他')) {
      selections.push(token);
      continue;
    }
    return null;
  }

  if (question.maxSelections && selections.length > question.maxSelections) {
    return null;
  }

  return selections.join(' / ');
}

function mapToOption(input: string, options: string[]): string | null {
  const trimmed = input.trim();
  const num = parseInt(trimmed, 10);
  if (!Number.isNaN(num) && num >= 1 && num <= options.length) {
    return options[num - 1];
  }
  const match = options.find((opt) => opt === trimmed);
  return match || null;
}

function buildRecommendationFlexMessage(companyInfoUrl: string) {
  return {
    type: 'flex' as const,
    altText: 'あなたにおすすめの企業',
    contents: {
      type: 'bubble' as const,
      body: {
        type: 'box' as const,
        layout: 'vertical' as const,
        contents: [
          {
            type: 'text' as const,
            text: 'あなたにおすすめの企業',
            weight: 'bold' as const,
            size: 'xl' as const,
            color: '#0F172A',
            wrap: true,
          },
          {
            type: 'text' as const,
            text: 'あなたのプロフィールにマッチする企業をピックアップしました',
            size: 'sm' as const,
            color: '#64748B',
            wrap: true,
            margin: 'md' as const,
          },
        ],
        paddingAll: '20px',
      },
      footer: {
        type: 'box' as const,
        layout: 'vertical' as const,
        spacing: 'sm' as const,
        contents: [
          {
            type: 'button' as const,
            style: 'primary' as const,
            height: 'md' as const,
            action: {
              type: 'uri' as const,
              label: 'おすすめされた企業を確認する',
              uri: companyInfoUrl,
            },
            color: '#fc9f2a',
          },
        ],
        paddingAll: '20px',
      },
    },
  };
}

async function handleFollow(userId: string, client: Client) {
  console.log('[handleFollow] ===== START =====');
  console.log('[handleFollow] userId:', userId);
  
  try {
    // 状態をクリア（エラーが発生しても続行）
    try {
      console.log('[handleFollow] Step 1: Clearing state...');
      await clearState(userId);
      console.log('[handleFollow] Step 1: State cleared successfully');
    } catch (error) {
      console.warn('[handleFollow] Step 1: Failed to clear state (continuing anyway):', error);
    }
    
    // 完了状態を設定
    try {
      console.log('[handleFollow] Step 2: Saving done state...');
      await saveState(userId, { step: 'done', answers: {} });
      console.log('[handleFollow] Step 2: Done state saved successfully');
    } catch (error) {
      console.warn('[handleFollow] Step 2: Failed to save state (continuing anyway):', error);
    }
    
    // イベントカードの送信を無効化
    // 友達追加時にイベントカードを送信しないように変更
    console.log('[handleFollow] Event card sending is disabled');
    
    // Vercel Analyticsでトラッキング（友達追加のみ）
    try {
      track('line_friend_added', {
        userId: userId.substring(0, 10) + '...', // プライバシー保護のため一部のみ
      });
      console.log('[handleFollow] Analytics event tracked: line_friend_added');
    } catch (analyticsError) {
      // トラッキングエラーは無視（メイン処理には影響しない）
      console.warn('[handleFollow] Failed to track analytics event:', analyticsError);
    }
    
    console.log('[handleFollow] ===== SUCCESS =====');
  } catch (error) {
    console.error('[handleFollow] ===== FATAL ERROR =====');
    console.error('[handleFollow] Fatal error:', error);
    if (error instanceof Error) {
      console.error('[handleFollow] Error message:', error.message);
      console.error('[handleFollow] Error stack:', error.stack);
    }
    // エラーを再スローして、上位で処理されるようにする
    throw error;
  }
}

// アンケート機能を無効化したためコメントアウト
// async function resetToFirstQuestion(userId: string, replyToken: string, client: Client) {
//   await clearState(userId);
//   const firstQuestion = QUESTIONS[0];
//   if (!firstQuestion) {
//     throw new Error('No questions defined');
//   }
//   const init = { step: firstQuestion.step, answers: {} };
//   await saveState(userId, init);

//   await client.replyMessage(replyToken, buildQuestionFlex(firstQuestion));
// }

// アンケート機能を無効化したためコメントアウト
/*
async function handleMessage(
  text: string,
  userId: string,
  replyToken: string,
  state: any,
  client: Client
) {
  console.log('[handleMessage] ===== START =====');
  console.log('[handleMessage] text:', text);
  console.log('[handleMessage] userId:', userId);
  console.log('[handleMessage] replyToken:', replyToken ? 'exists' : 'missing');
  console.log('[handleMessage] state:', JSON.stringify(state));

  if (!replyToken) {
    console.error('[handleMessage] No replyToken - cannot reply');
    return;
  }

  // stateが無い/壊れている場合は初期化
  if (!state || !state.step) {
    console.log('[handleMessage] No state found, initializing');
    const firstQuestion = QUESTIONS[0];
    if (!firstQuestion) {
      console.error('[handleMessage] No questions defined');
      return;
    }
    const init = { step: firstQuestion.step, answers: {} };
    try {
      await saveState(userId, init);
      await client.replyMessage(replyToken, buildQuestionFlex(firstQuestion));
      console.log('[handleMessage] First question sent');
    } catch (error) {
      console.error('[handleMessage] Error sending first question:', error);
    }
    return;
  }

  // done状態
  if (state.step === 'done') {
    console.log('[handleMessage] State is done, sending guide message');
    await client.replyMessage(
      replyToken,
      createGuideFlex(
        'ありがとうございます。',
        'イベント情報を見るには「イベント情報」と送信してください。'
      )
    );
    return;
  }

  // 現在の質問を取得
  console.log('[handleMessage] Finding current question, step:', state.step);
  const idx = QUESTIONS.findIndex((q) => q.step === state.step);
  console.log('[handleMessage] Current question index:', idx);
  
  if (idx === -1) {
    console.log('[handleMessage] Question not found, resetting to first question');
    const firstQuestion = QUESTIONS[0];
    if (!firstQuestion) {
      console.error('[handleMessage] No questions defined');
      return;
    }
    const init = { step: firstQuestion.step, answers: {} };
    await saveState(userId, init);
    await client.replyMessage(replyToken, buildQuestionFlex(firstQuestion));
    return;
  }

  const q = QUESTIONS[idx];
  console.log('[handleMessage] Current question:', q.title, 'key:', q.key);

  // 選択肢チェック（ボタン質問）
  if (q.options && q.options.length > 0) {
    console.log('[handleMessage] Checking options:', q.options, 'against text:', text);
    if (!q.options.includes(text)) {
      console.log('[handleMessage] Invalid option, resending same question');
      // 想定外の入力は同じ質問を再表示
      await client.replyMessage(replyToken, buildQuestionFlex(q));
      return;
    }
  }

  // 回答保存
  console.log('[handleMessage] Saving answer:', q.key, '=', text);
  state.answers = state.answers || {};
  state.answers[q.key] = text;
  console.log('[handleMessage] Updated answers:', state.answers);

  // Vercel Analyticsでアンケート進捗をトラッキング
  try {
    track('survey_progress', {
      step: q.step,
      questionKey: q.key,
      questionTitle: q.title,
      progress: `${idx + 1}/${QUESTIONS.length}`,
      userId: userId.substring(0, 10) + '...',
    });
    console.log('[handleMessage] Analytics event tracked: survey_progress', q.step);
  } catch (analyticsError) {
    console.warn('[handleMessage] Failed to track analytics event:', analyticsError);
  }

  // 次の質問へ
  const next = QUESTIONS[idx + 1];
  console.log('[handleMessage] Next question index:', idx + 1, 'next:', next ? next.title : 'none');
  
  if (next) {
    console.log('[handleMessage] Moving to next question:', next.title);
    state.step = next.step;
    try {
      await saveState(userId, state);
      console.log('[handleMessage] State saved, sending next question');
      await client.replyMessage(replyToken, buildQuestionFlex(next));
      console.log('[handleMessage] Next question sent successfully');
    } catch (error) {
      console.error('[handleMessage] Error saving state or sending next question:', error);
      if (error instanceof Error) {
        console.error('[handleMessage] Error message:', error.message);
        console.error('[handleMessage] Error stack:', error.stack);
      }
    }
    return;
  }

  // 全質問完了 → 完了パネルを先に送信（ユーザー体験を優先）
  console.log('[handleMessage] ===== ALL QUESTIONS COMPLETED =====');
  console.log('[handleMessage] Total questions:', QUESTIONS.length);
  console.log('[handleMessage] Current question index:', idx);
  console.log('[handleMessage] Answers collected:', Object.keys(state.answers).length);
  console.log('[handleMessage] Answers to save:', JSON.stringify(state.answers));
  
  // Vercel Analyticsでアンケート完了をトラッキング
  try {
    track('survey_completed', {
      totalQuestions: QUESTIONS.length,
      answeredQuestions: Object.keys(state.answers).length,
      userId: userId.substring(0, 10) + '...',
    });
    console.log('[handleMessage] Analytics event tracked: survey_completed');
  } catch (analyticsError) {
    console.warn('[handleMessage] Failed to track analytics event:', analyticsError);
  }
  
  // すべての回答が揃っているか確認
  const requiredKeys = QUESTIONS.map(q => q.key);
  const missingAnswers = requiredKeys.filter(key => !state.answers[key]);
  if (missingAnswers.length > 0) {
    console.warn('[handleMessage] Missing answers for keys:', missingAnswers);
  }

  // 完了パネルを先に送信（ユーザー体験を優先）
  console.log('[handleMessage] Sending completion panel...');
  const completionPanel = createSurveyCompletePanel();
  console.log('[handleMessage] Completion panel message:', JSON.stringify(completionPanel, null, 2));
  try {
    await client.replyMessage(replyToken, completionPanel);
    console.log('[handleMessage] Completion panel sent successfully');
  } catch (err: any) {
    console.error('[handleMessage] Failed to send completion panel:', err);
    if (err instanceof Error) {
      console.error('[handleMessage] Error message:', err.message);
      console.error('[handleMessage] Error stack:', err.stack);
    }
    // LINE APIのエラーレスポンスを詳細にログ出力
    if (err?.response?.data) {
      console.error('[handleMessage] LINE API error response:', JSON.stringify(err.response.data, null, 2));
    }
    if (err?.originalError?.response?.data) {
      console.error('[handleMessage] LINE API original error response:', JSON.stringify(err.originalError.response.data, null, 2));
    }
  }

  // スプレッドシートへの保存（完了パネル送信後に実行）
  console.log('[handleMessage] Attempting to save to sheet...');
  try {
    await saveProfileToSheet(userId, state.answers);
    console.log('[handleMessage] ✅ Profile saved to sheet successfully');
  } catch (err) {
    console.error('[handleMessage] ❌ saveProfileToSheet failed:', err);
    if (err instanceof Error) {
      console.error('[handleMessage] Error name:', err.name);
      console.error('[handleMessage] Error message:', err.message);
      console.error('[handleMessage] Error stack:', err.stack);
    }
    // エラーが発生しても続行（完了パネルは既に送信済み）
  }

  // doneへ（状態を保存）
  console.log('[handleMessage] Saving final state...');
  try {
    await saveState(userId, { step: 'done', answers: state.answers });
    console.log('[handleMessage] Final state saved');
  } catch (err) {
    console.error('[handleMessage] Failed to save final state:', err);
  }
  
  console.log('[handleMessage] ===== END =====');
}
*/

