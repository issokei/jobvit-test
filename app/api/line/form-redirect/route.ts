import { NextRequest, NextResponse } from 'next/server';
import { createPrefilledFormUrl } from '@/lib/sheets';

/**
 * リッチメニュー用のフォームリダイレクトエンドポイント
 * 
 * 重要: LINEのリッチメニューから直接URLを開いた場合、ユーザーIDを取得できません。
 * そのため、このエンドポイントは動作しません。
 * 
 * 推奨される解決策:
 * 1. リッチメニューのアクションを「メッセージ送信」に設定
 * 2. 特定のメッセージ（例：「フォームを開く」）を送信
 * 3. Webhook経由でフォームURLを含むメッセージを送信
 * 
 * または、LINE Loginを使用してユーザーIDを取得する方法もありますが、
 * より複雑な実装が必要です。
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const formIndex = parseInt(searchParams.get('formIndex') || '0', 10);
    
    // LINEのリッチメニューから直接アクセスした場合、userIdを取得できないため、
    // このエンドポイントは動作しません。
    // 
    // 解決策1: リッチメニューのアクションを「メッセージ送信」に設定
    // 解決策2: LINE Loginを使用（実装が複雑）
    // 解決策3: userIdをクエリパラメータで受け取る（セキュリティ上の懸念あり）
    
    const userId = searchParams.get('userId');
    
    if (!userId) {
      // エラーページを表示（またはLINE Loginページにリダイレクト）
      return new NextResponse(
        `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>エラー</title>
</head>
<body>
  <h1>ユーザーIDが取得できませんでした</h1>
  <p>リッチメニューから直接フォームを開くことはできません。</p>
  <p>代わりに、LINEアプリ内で「イベント情報」と送信して、フォームボタンから開いてください。</p>
</body>
</html>`,
        {
          status: 400,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
          },
        }
      );
    }
    
    const formUrl = createPrefilledFormUrl(userId, formIndex);
    
    // フォームURLにリダイレクト
    return NextResponse.redirect(formUrl);
  } catch (error) {
    console.error('[FormRedirect] Error:', error);
    if (error instanceof Error) {
      console.error('[FormRedirect] Error message:', error.message);
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

