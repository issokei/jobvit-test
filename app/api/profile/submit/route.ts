import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@line/bot-sdk';

/**
 * プロフィール送信APIエンドポイント
 * 
 * v0-jobvit.vercel.appからプロフィール情報を受け取り、
 * LINE Botにおすすめ企業カードを送信します。
 * 
 * リクエストボディ形式：
 * {
 *   "userId": "LINEユーザーID",
 *   "profile": {
 *     "email": "user@example.com",
 *     "bunri": "文系",
 *     "graduationYear": "2026",
 *     "industry": ["商社", "IT・通信"],
 *     "careerInterest": ["自分のスキルを活かせる", "グローバルで働く"],
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
    const { userId, profile } = body;

    console.log('[ProfileSubmit] Received profile submission');
    console.log('[ProfileSubmit] userId:', userId);
    console.log('[ProfileSubmit] profile keys:', Object.keys(profile || {}));

    if (!userId) {
      console.error('[ProfileSubmit] userId is required');
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (!profile || typeof profile !== 'object') {
      console.error('[ProfileSubmit] profile is required');
      return NextResponse.json({ error: 'profile is required' }, { status: 400 });
    }

    // LINE Botにカードを送信
    const client = getLineClient();
    
    // v0-company-info-cards.vercel.appへのリンクを生成
    const companyInfoUrl = `https://v0-company-info-cards.vercel.app?userId=${encodeURIComponent(userId)}`;
    
    // Flexメッセージでおすすめ企業カードを送信
    const flexMessage = {
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

    console.log('[ProfileSubmit] Sending Flex message to LINE Bot...');
    await client.pushMessage(userId, flexMessage);
    console.log('[ProfileSubmit] Flex message sent successfully');

    // 成功レスポンスを返す
    return NextResponse.json({
      success: true,
      message: 'プロフィールを送信しました。おすすめ企業のカードをLINE Botに送信しました。',
    });
  } catch (error) {
    console.error('[ProfileSubmit] Error:', error);
    if (error instanceof Error) {
      console.error('[ProfileSubmit] Error message:', error.message);
      console.error('[ProfileSubmit] Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Internal server error', message: 'プロフィールの送信に失敗しました。' },
      { status: 500 }
    );
  }
}

/**
 * GETリクエスト（ブラウザからの直接アクセス用）
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      message: 'Profile Submit API',
      description: 'POSTリクエストでプロフィール情報を送信してください。',
      example: {
        method: 'POST',
        body: {
          userId: 'LINE_USER_ID',
          profile: {
            email: 'user@example.com',
            bunri: '文系',
            graduationYear: '2026',
            industry: ['商社', 'IT・通信'],
            careerInterest: ['自分のスキルを活かせる'],
          },
        },
      },
    },
    { status: 200 }
  );
}

