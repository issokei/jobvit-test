# v0-jobvit.vercel.app フォームへのLINEユーザーID自動入力設定ガイド

## 📋 概要

LINEのリッチメニューからv0-jobvit.vercel.appのフォームを開く際に、LINEユーザーIDを自動入力するための設定方法です。

## 🔧 セットアップ手順

### 1. LINE Bot側の設定（既に実装済み）

以下の機能が実装されています：

1. **v0フォームURL生成関数** (`lib/sheets.ts`)
   - `createV0FormUrl(userId)` 関数で、LINEユーザーIDをクエリパラメータとして追加したURLを生成

2. **Webhook処理** (`app/api/line/webhook/route.ts`)
   - 「フォームを開く」「応募フォーム」「参加登録」というメッセージを受信すると、v0フォームのURLを送信

### 2. リッチメニューの設定

LINE Developers Consoleでリッチメニューを設定します：

1. **リッチメニューのアクションタイプ**: 「メッセージ送信」を選択
2. **送信するメッセージ**: 「フォームを開く」または「応募フォーム」または「参加登録」
3. **リッチメニューのラベル**: 例「参加登録」

これにより、ユーザーがリッチメニューをタップすると、指定したメッセージが送信され、Webhook経由でフォームURLが生成されて送信されます。

### 3. v0-jobvit.vercel.app側の実装

v0-jobvit.vercel.appのフォームページで、URLパラメータからLINEユーザーIDを読み取って自動入力する必要があります。

#### 実装例（React/Next.jsの場合）

```typescript
'use client';

import { useEffect, useState } from 'react';

export default function FormPage() {
  const [lineUserId, setLineUserId] = useState<string>('');

  useEffect(() => {
    // URLパラメータからLINEユーザーIDを取得
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('lineUserId');
    
    if (userId) {
      setLineUserId(userId);
      // フォームフィールドに自動入力
      const userIdInput = document.getElementById('line-user-id') as HTMLInputElement;
      if (userIdInput) {
        userIdInput.value = userId;
        // 読み取り専用にする（変更を防ぐ）
        userIdInput.readOnly = true;
      }
    }
  }, []);

  return (
    <form>
      <div>
        <label htmlFor="line-user-id">LINEユーザーID *</label>
        <input
          id="line-user-id"
          type="text"
          name="lineUserId"
          value={lineUserId}
          readOnly
          required
        />
        <p>※この部分は変更を加えないでください。変更すると参加登録が削除される可能性があります。</p>
      </div>
      {/* 他のフォームフィールド */}
    </form>
  );
}
```

#### 実装例（v0で生成されたコードの場合）

v0で生成されたコードの場合、以下のように実装できます：

```typescript
'use client';

import { useEffect } from 'react';

export default function FormPage() {
  useEffect(() => {
    // URLパラメータからLINEユーザーIDを取得
    const urlParams = new URLSearchParams(window.location.search);
    const lineUserId = urlParams.get('lineUserId');
    
    if (lineUserId) {
      // LINEユーザーIDの入力欄を探して自動入力
      // v0で生成されたコードの場合、フィールドのIDやname属性を確認して使用
      const userIdInput = document.querySelector('input[name="lineUserId"]') as HTMLInputElement;
      if (userIdInput) {
        userIdInput.value = lineUserId;
        userIdInput.setAttribute('readonly', 'true');
      }
      
      // または、特定のIDを持つ要素を探す
      const userIdField = document.getElementById('line-user-id') as HTMLInputElement;
      if (userIdField) {
        userIdField.value = lineUserId;
        userIdField.readOnly = true;
      }
    }
  }, []);

  return (
    // v0で生成されたフォームコンポーネント
  );
}
```

#### 実装例（Vanilla JavaScriptの場合）

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>参加登録フォーム</title>
</head>
<body>
  <form>
    <div>
      <label for="line-user-id">LINEユーザーID *</label>
      <input
        id="line-user-id"
        type="text"
        name="lineUserId"
        readonly
        required
      />
      <p>※この部分は変更を加えないでください。</p>
    </div>
    <!-- 他のフォームフィールド -->
  </form>

  <script>
    // URLパラメータからLINEユーザーIDを取得
    const urlParams = new URLSearchParams(window.location.search);
    const lineUserId = urlParams.get('lineUserId');
    
    if (lineUserId) {
      const userIdInput = document.getElementById('line-user-id');
      if (userIdInput) {
        userIdInput.value = lineUserId;
      }
    }
  </script>
</body>
</html>
```

### 4. 環境変数の設定（オプション）

v0フォームのベースURLを変更したい場合は、環境変数を設定できます：

```bash
V0_FORM_BASE_URL=https://v0-jobvit.vercel.app
```

デフォルトでは `https://v0-jobvit.vercel.app` が使用されます。

## 🔍 動作確認

### 1. リッチメニューのテスト

1. LINEアプリでBotを開く
2. リッチメニューから「参加登録」をタップ
3. 「フォームを開く」というメッセージが送信される
4. BotからフォームURLを含むメッセージが送信される
5. フォームURLを開く
6. URLに `?lineUserId=U...` というパラメータが含まれていることを確認
7. LINEユーザーIDのフィールドに自動入力されていることを確認

### 2. フォーム送信のテスト

1. フォームに必要事項を入力
2. LINEユーザーIDフィールドが自動入力されていることを確認
3. フォームを送信
4. 送信されたデータにLINEユーザーIDが含まれていることを確認

## ⚠️ 注意事項

1. **セキュリティ**: URLパラメータでLINEユーザーIDを渡すため、HTTPSを使用してください
2. **読み取り専用**: LINEユーザーIDフィールドは読み取り専用に設定し、ユーザーが変更できないようにしてください
3. **バリデーション**: フォーム送信時にLINEユーザーIDが正しい形式（33文字の文字列、Uで始まる）であることを確認してください

## 🐛 トラブルシューティング

### 問題1: LINEユーザーIDが自動入力されない

**原因:**
- URLパラメータが正しく渡されていない
- フォームフィールドのIDやname属性が一致していない

**解決方法:**
1. ブラウザの開発者ツールでURLを確認
2. `?lineUserId=U...` というパラメータが含まれているか確認
3. フォームフィールドのIDやname属性を確認
4. JavaScriptのコンソールでエラーがないか確認

### 問題2: リッチメニューからフォームURLが送信されない

**原因:**
- リッチメニューのアクションタイプが「メッセージ送信」になっていない
- 送信するメッセージが「フォームを開く」「応募フォーム」「参加登録」のいずれかになっていない

**解決方法:**
1. LINE Developers Consoleでリッチメニューの設定を確認
2. アクションタイプを「メッセージ送信」に変更
3. 送信するメッセージを「フォームを開く」に設定

### 問題3: フォーム送信時にLINEユーザーIDが含まれていない

**原因:**
- フォームフィールドのname属性が正しく設定されていない
- フォーム送信処理でLINEユーザーIDが取得されていない

**解決方法:**
1. フォームフィールドのname属性を確認
2. フォーム送信処理でLINEユーザーIDが正しく取得されているか確認

## 📝 チェックリスト

- [ ] v0-jobvit.vercel.appのフォームページでURLパラメータからLINEユーザーIDを読み取る実装
- [ ] LINEユーザーIDフィールドを読み取り専用に設定
- [ ] リッチメニューのアクションタイプを「メッセージ送信」に設定
- [ ] 送信するメッセージを「フォームを開く」に設定
- [ ] 動作確認（リッチメニューからフォームを開く）
- [ ] 動作確認（フォーム送信時にLINEユーザーIDが含まれている）

