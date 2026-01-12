import { NextRequest, NextResponse } from 'next/server';

/**
 * プロフィール送信APIエンドポイント
 * 
 * v0-jobvit.vercel.appからプロフィール情報を受け取り、
 * おすすめ企業を表示するページにリダイレクトします。
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

    // プロフィール情報を基におすすめ企業を計算
    // 現在はランダムに選択（後でマッチングロジックを追加可能）
    const recommendedCompanies = calculateRecommendedCompanies(profile);
    
    console.log('[ProfileSubmit] Recommended companies:', recommendedCompanies);

    // v0-company-info-cards.vercel.appにリダイレクト
    // プロフィール情報とおすすめ企業IDをクエリパラメータとして渡す
    const companyInfoUrl = new URL('https://v0-company-info-cards.vercel.app');
    companyInfoUrl.searchParams.set('userId', userId);
    
    // プロフィール情報をJSON文字列として渡す（または個別のパラメータとして）
    companyInfoUrl.searchParams.set('profile', JSON.stringify(profile));
    
    // おすすめ企業IDを渡す（カンマ区切り）
    if (recommendedCompanies.length > 0) {
      companyInfoUrl.searchParams.set('recommendedCompanies', recommendedCompanies.join(','));
    }

    console.log('[ProfileSubmit] Redirecting to:', companyInfoUrl.toString());

    // リダイレクトレスポンスを返す
    return NextResponse.redirect(companyInfoUrl.toString());
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
 * プロフィール情報を基におすすめ企業を計算
 * 
 * 現在は簡易実装（ランダムに5社選択）
 * 後でマッチングロジックを追加可能
 */
function calculateRecommendedCompanies(profile: any): string[] {
  // TODO: プロフィール情報を基にマッチングロジックを実装
  // 現在はランダムに5社を選択（実際の実装では、業種や興味に基づいて選択）
  
  // 例: プロフィールの業種に基づいて企業を選択
  // 現在は空配列を返す（v0-company-info-cards.vercel.app側で処理）
  
  return [];
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

