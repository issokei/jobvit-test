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
    const { userId, formData } = body;

    console.log('[FormSubmit] Received form submission');
    console.log('[FormSubmit] userId:', userId);
    console.log('[FormSubmit] formData keys:', Object.keys(formData || {}));

    if (!userId) {
      console.error('[FormSubmit] userId is required');
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (!formData || typeof formData !== 'object') {
      console.error('[FormSubmit] formData is required');
      return NextResponse.json({ error: 'formData is required' }, { status: 400 });
    }

    // スプレッドシートに保存
    try {
      await saveFormSubmission(userId, formData);
      console.log('[FormSubmit] Form data saved to sheet');
    } catch (error) {
      console.error('[FormSubmit] Failed to save form data:', error);
      // 保存エラーは続行（採点と送信は実行する）
    }

    // ChatGPT APIを使って採点を実行
    console.log('[FormSubmit] Starting AI scoring...');
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
    try {
      const client = getLineClient();
      const scoringMessage = createScoringResultMessage(
        scoringResult.totalPoints,
        scoringResult.maxPoints,
        scoringResult.percentage,
        scoringResult.grade,
        scoringResult.feedback || '',
        scoringResult.details
      );

      console.log('[FormSubmit] Sending scoring result to LINE...');
      await client.pushMessage(userId, scoringMessage);
      console.log('[FormSubmit] Scoring result sent successfully');
    } catch (error) {
      console.error('[FormSubmit] Failed to send scoring result:', error);
      if (error instanceof Error) {
        console.error('[FormSubmit] Error message:', error.message);
        console.error('[FormSubmit] Error stack:', error.stack);
      }
      // LINE送信エラーは続行（レスポンスは成功を返す）
    }

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

