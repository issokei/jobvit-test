# v0-jobvit.vercel.app フォームへの LINE ユーザー ID 自動入力設定ガイド

## 📋 概要

LINE のリッチメニューから v0-jobvit.vercel.app のフォームを開く際に、LINE ユーザー ID を自動入力するための設定方法です。

## 🔧 セットアップ手順

### 1. LINE Bot 側の設定（既に実装済み）

以下の機能が実装されています：

1. **v0 フォーム URL 生成関数** (`lib/sheets.ts`)

   - `createV0FormUrl(userId)` 関数で、LINE ユーザー ID をクエリパラメータとして追加した URL を生成

2. **Webhook 処理** (`app/api/line/webhook/route.ts`)
   - 「フォームを開く」「応募フォーム」「参加登録」というメッセージを受信すると、v0 フォームの URL を送信

### 2. リッチメニューの設定

LINE Developers Console でリッチメニューを設定します：

1. **リッチメニューのアクションタイプ**: 「メッセージ送信」を選択
2. **送信するメッセージ**: 「フォームを開く」または「応募フォーム」または「参加登録」
3. **リッチメニューのラベル**: 例「参加登録」

これにより、ユーザーがリッチメニューをタップすると、指定したメッセージが送信され、Webhook 経由でフォーム URL が生成されて送信されます。

### 3. v0-jobvit.vercel.app 側の実装

v0-jobvit.vercel.app のフォームページで、URL パラメータから LINE ユーザー ID を読み取って自動入力する必要があります。

#### 実装例（React/Next.js の場合）

```typescript
"use client";

import { useEffect, useState } from "react";

export default function FormPage() {
  const [lineUserId, setLineUserId] = useState<string>("");

  useEffect(() => {
    // URLパラメータからLINEユーザーIDを取得
    const params = new URLSearchParams(window.location.search);
    const userId = params.get("lineUserId");

    if (userId) {
      setLineUserId(userId);
      // フォームフィールドに自動入力
      const userIdInput = document.getElementById(
        "line-user-id"
      ) as HTMLInputElement;
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
        <p>
          ※この部分は変更を加えないでください。変更すると参加登録が削除される可能性があります。
        </p>
      </div>
      {/* 他のフォームフィールド */}
    </form>
  );
}
```

#### 実装例（v0 で生成されたコードの場合）

v0 で生成されたコードの場合、以下のように実装できます：

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

#### 実装例（Vanilla JavaScript の場合）

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
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
      const lineUserId = urlParams.get("lineUserId");

      if (lineUserId) {
        const userIdInput = document.getElementById("line-user-id");
        if (userIdInput) {
          userIdInput.value = lineUserId;
        }
      }
    </script>
  </body>
</html>
```

### 4. 環境変数の設定（オプション）

v0 フォームのベース URL を変更したい場合は、環境変数を設定できます：

```bash
V0_FORM_BASE_URL=https://v0-jobvit.vercel.app
```

デフォルトでは `https://v0-jobvit.vercel.app` が使用されます。

## 🔍 動作確認

### 1. リッチメニューのテスト

1. LINE アプリで Bot を開く
2. リッチメニューから「参加登録」をタップ
3. 「フォームを開く」というメッセージが送信される
4. Bot からフォーム URL を含むメッセージが送信される
5. フォーム URL を開く
6. URL に `?lineUserId=U...` というパラメータが含まれていることを確認
7. LINE ユーザー ID のフィールドに自動入力されていることを確認

### 2. フォーム送信のテスト

1. フォームに必要事項を入力
2. LINE ユーザー ID フィールドが自動入力されていることを確認
3. フォームを送信
4. 送信されたデータに LINE ユーザー ID が含まれていることを確認

## ⚠️ 注意事項

1. **セキュリティ**: URL パラメータで LINE ユーザー ID を渡すため、HTTPS を使用してください
2. **読み取り専用**: LINE ユーザー ID フィールドは読み取り専用に設定し、ユーザーが変更できないようにしてください
3. **バリデーション**: フォーム送信時に LINE ユーザー ID が正しい形式（33 文字の文字列、U で始まる）であることを確認してください

## 🐛 トラブルシューティング

### 問題 1: LINE ユーザー ID が自動入力されない

**原因:**

- URL パラメータが正しく渡されていない
- フォームフィールドの ID や name 属性が一致していない

**解決方法:**

1. ブラウザの開発者ツールで URL を確認
2. `?lineUserId=U...` というパラメータが含まれているか確認
3. フォームフィールドの ID や name 属性を確認
4. JavaScript のコンソールでエラーがないか確認

### 問題 2: リッチメニューからフォーム URL が送信されない

**原因:**

- リッチメニューのアクションタイプが「メッセージ送信」になっていない
- 送信するメッセージが「フォームを開く」「応募フォーム」「参加登録」のいずれかになっていない

**解決方法:**

1. LINE Developers Console でリッチメニューの設定を確認
2. アクションタイプを「メッセージ送信」に変更
3. 送信するメッセージを「フォームを開く」に設定

### 問題 3: フォーム送信時に LINE ユーザー ID が含まれていない

**原因:**

- フォームフィールドの name 属性が正しく設定されていない
- フォーム送信処理で LINE ユーザー ID が取得されていない

**解決方法:**

1. フォームフィールドの name 属性を確認
2. フォーム送信処理で LINE ユーザー ID が正しく取得されているか確認

## 📝 チェックリスト

- [ ] v0-jobvit.vercel.app のフォームページで URL パラメータから LINE ユーザー ID を読み取る実装
- [ ] LINE ユーザー ID フィールドを読み取り専用に設定
- [ ] リッチメニューのアクションタイプを「メッセージ送信」に設定
- [ ] 送信するメッセージを「フォームを開く」に設定
- [ ] 動作確認（リッチメニューからフォームを開く）
- [ ] 動作確認（フォーム送信時に LINE ユーザー ID が含まれている）
