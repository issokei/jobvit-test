import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@line/bot-sdk';
import { saveFormSubmission } from '@/lib/sheets';
import { scoreFormAnswersWithAI } from '@/lib/ai-scoring';
import { createScoringResultMessage } from '@/lib/messages';

/**
 * Googleフォーム送信時のWebhookエンドポイント
 * 
 * 使用方法：
 * 1. Googleフォームの設定で、送信時にこのエンドポイントを呼び出すように設定
 * 2. または、Google Apps Scriptのトリガーからこのエンドポイントを呼び出す
 * 
 * リクエストボディ形式：
 * {
 *   "userId": "LINEユーザーID",
 *   "formData": {
 *     "質問1": ["回答1"],
 *     "質問2": ["回答2"],
 *     ...
 *   }
 * }
 */
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, formData, error, message, availableQuestions } = body;

    console.log('[FormSubmit] Received form submission');
    console.log('[FormSubmit] Request body keys:', Object.keys(body || {}));

    // エラー情報が含まれている場合（userIdが見つからない場合など）
    if (error) {
      console.error('[FormSubmit] Error from Google Apps Script:', error);
      console.error('[FormSubmit] Message:', message);
      console.error('[FormSubmit] Available questions:', availableQuestions);
      return NextResponse.json({ 
        error: error,
        message: message || 'Google Apps Scriptからエラーが報告されました',
        availableQuestions: availableQuestions,
      }, { status: 400 });
    }

    if (!userId) {
      console.error('[FormSubmit] userId is required');
      console.error('[FormSubmit] Received body:', JSON.stringify(body, null, 2));
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    console.log('[FormSubmit] userId:', userId);
    console.log('[FormSubmit] formData keys:', Object.keys(formData || {}));
    console.log('[FormSubmit] formData sample:', JSON.stringify(formData).substring(0, 500));

    if (!formData || typeof formData !== 'object') {
      console.error('[FormSubmit] formData is required');
      return NextResponse.json({ error: 'formData is required' }, { status: 400 });
    }

    // スプレッドシートへの保存は非同期で実行（採点をブロックしない）
    const savePromise = saveFormSubmission(userId, formData).catch((error) => {
      console.error('[FormSubmit] Failed to save form data:', error);
      // 保存エラーは無視（採点と送信は実行する）
    });

    // ChatGPT APIを使って採点を実行（即座に開始）
    console.log('[FormSubmit] Starting AI scoring immediately...');
    let scoringResult;
    try {
      scoringResult = await scoreFormAnswersWithAI(formData);
      console.log('[FormSubmit] AI scoring completed:', {
        totalPoints: scoringResult.totalPoints,
        maxPoints: scoringResult.maxPoints,
        percentage: scoringResult.percentage,
        grade: scoringResult.grade,
      });
    } catch (error) {
      console.error('[FormSubmit] Failed to score with AI:', error);
      if (error instanceof Error) {
        console.error('[FormSubmit] Error message:', error.message);
        console.error('[FormSubmit] Error stack:', error.stack);
      }
      
      // AI採点に失敗した場合、エラーメッセージを返す
      return NextResponse.json({ 
        error: 'Scoring failed',
        message: '採点処理中にエラーが発生しました。しばらくしてから再度お試しください。'
      }, { status: 500 });
    }

    // LINE Botに採点結果を送信
    console.log('[FormSubmit] Preparing LINE message...');
    console.log('[FormSubmit] Scoring result details:', {
      totalPoints: scoringResult.totalPoints,
      maxPoints: scoringResult.maxPoints,
      percentage: scoringResult.percentage,
      grade: scoringResult.grade,
      detailsCount: scoringResult.details?.length || 0,
      hasFeedback: !!scoringResult.feedback,
    });

    try {
      console.log('[FormSubmit] Getting LINE client...');
      const client = getLineClient();
      console.log('[FormSubmit] LINE client created successfully');
      
      console.log('[FormSubmit] Creating scoring message...');
      const scoringMessage = createScoringResultMessage(
        scoringResult.totalPoints,
        scoringResult.maxPoints,
        scoringResult.percentage,
        scoringResult.grade,
        scoringResult.feedback || '',
        scoringResult.details || []
      );
      console.log('[FormSubmit] Scoring message created successfully');
      console.log('[FormSubmit] Message type:', scoringMessage.type);
      console.log('[FormSubmit] Message altText:', scoringMessage.altText);

      console.log('[FormSubmit] Sending scoring result to LINE...');
      console.log('[FormSubmit] UserId:', userId);
      console.log('[FormSubmit] UserId length:', userId.length);
      
      const sendStartTime = Date.now();
      const pushResult = await Promise.race([
        client.pushMessage(userId, scoringMessage),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('LINE API timeout after 30 seconds')), 30000)
        )
      ]) as any;
      const sendEndTime = Date.now();
      
      console.log('[FormSubmit] Scoring result sent successfully');
      console.log('[FormSubmit] Send time:', sendEndTime - sendStartTime, 'ms');
      console.log('[FormSubmit] Push message result:', JSON.stringify(pushResult, null, 2));
    } catch (error) {
      console.error('[FormSubmit] ========== LINE SEND ERROR ==========');
      console.error('[FormSubmit] Failed to send scoring result:', error);
      
      if (error instanceof Error) {
        console.error('[FormSubmit] Error name:', error.name);
        console.error('[FormSubmit] Error message:', error.message);
        console.error('[FormSubmit] Error stack:', error.stack);
      }
      
      // LINE SDKのエラーオブジェクトの詳細を確認
      const errorObj = error as any;
      if (errorObj.statusCode) {
        console.error('[FormSubmit] Error statusCode:', errorObj.statusCode);
      }
      if (errorObj.originalError) {
        console.error('[FormSubmit] Original error:', errorObj.originalError);
      }
      if (errorObj.response) {
        console.error('[FormSubmit] Error response status:', errorObj.response.status);
        console.error('[FormSubmit] Error response headers:', JSON.stringify(errorObj.response.headers, null, 2));
        if (errorObj.response.data) {
          console.error('[FormSubmit] Error response data:', JSON.stringify(errorObj.response.data, null, 2));
          if (errorObj.response.data.details && Array.isArray(errorObj.response.data.details)) {
            console.error('[FormSubmit] Error details count:', errorObj.response.data.details.length);
            // エラーの詳細を解析
            errorObj.response.data.details.forEach((detail: any, index: number) => {
              console.error(`[FormSubmit] Error detail ${index}:`, JSON.stringify(detail, null, 2));
            });
          } else {
            console.error('[FormSubmit] No details array found in error response');
          }
        } else {
          console.error('[FormSubmit] No data in error response');
        }
      } else {
        console.error('[FormSubmit] No response object in error');
      }
      if (errorObj.config) {
        console.error('[FormSubmit] Error config:', JSON.stringify(errorObj.config, null, 2));
      }
      
      console.error('[FormSubmit] ======================================');
      // LINE送信エラーは続行（レスポンスは成功を返す）
    }

    // レスポンスを返す
    console.log('[FormSubmit] Returning response...');
    return NextResponse.json({ 
      message: 'OK',
      scoring: {
        totalPoints: scoringResult.totalPoints,
        maxPoints: scoringResult.maxPoints,
        percentage: scoringResult.percentage,
        grade: scoringResult.grade,
      }
    });
  } catch (error) {
    console.error('[FormSubmit] Fatal error:', error);
    if (error instanceof Error) {
      console.error('[FormSubmit] Error message:', error.message);
      console.error('[FormSubmit] Error stack:', error.stack);
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

