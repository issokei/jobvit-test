import { NextRequest, NextResponse } from 'next/server';
import { saveFormSubmission } from '@/lib/sheets';

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
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, formData } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (!formData || typeof formData !== 'object') {
      return NextResponse.json({ error: 'formData is required' }, { status: 400 });
    }

    // スプレッドシートに保存
    await saveFormSubmission(userId, formData);

    return NextResponse.json({ message: 'OK' });
  } catch (error) {
    console.error('Form submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

