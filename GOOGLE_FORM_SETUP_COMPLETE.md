# Google フォーム採点システム 完全セットアップガイド

## 📋 概要

Google フォームに回答を提出すると、自動的に AI 採点が実行され、LINE Bot から採点結果が送信されます。

**重要**: LINE Bot にメッセージを送信して採点する機能は無効化されています。Google フォームからの提出のみが採点対象です。

---

## 🔧 セットアップ手順

### 1. Google フォームの設定

#### Step 1: LINE ユーザー ID の質問を追加

1. Google フォームを開く
2. 「質問を追加」をクリック
3. 質問タイプ: **短答形式テキスト**
4. 質問タイトル: **`LINEユーザーID（自動入力）`**
   - ⚠️ **重要**: このタイトルは正確に一致させる必要があります
   - 他の候補タイトルも使用可能:
     - `LINEユーザーID`
     - `LINEユーザID`
     - `ユーザーID`
     - `userId`
5. 説明: 「このフィールドは自動入力されます」
6. 「必須」にチェックを入れる
7. 「送信」をクリック

#### Step 2: 採点対象の質問を追加

通常の質問を追加してください。例：

- 質問 1: 「あなたの強みは何ですか？」
- 質問 2: 「志望動機を教えてください」
- など

#### Step 3: フォーム URL に LINE ユーザー ID を埋め込む

イベントカードのフォーム URL に、LINE ユーザー ID を自動入力するパラメータを追加します。

**方法: 事前入力 URL を使用**

1. Google フォームを開く
2. 「送信」ボタンの横の「⋮」（三点メニュー）をクリック
3. 「事前入力 URL を取得」を選択
4. LINE ユーザー ID の質問にチェックを入れる
5. 生成された URL をコピー

**URL の形式:**

```
https://docs.google.com/forms/d/e/{FORM_ID}/viewform?entry.{ENTRY_ID}=LINE_USER_ID
```

**Next.js 側での設定:**

- `lib/config.ts`の`FORM_CONFIGS`に設定を追加
- または環境変数`GOOGLE_FORM_CONFIGS`に設定

**設定例:**

```typescript
// lib/config.ts
export const FORM_CONFIGS: FormConfig[] = [
  {
    baseUrl: "https://docs.google.com/forms/d/e/{FORM_ID}/viewform",
    entryUserId: "entry.{ENTRY_ID}", // 実際のエントリーIDに置き換え
  },
];
```

または環境変数:

```json
GOOGLE_FORM_CONFIGS=[{"baseUrl":"https://docs.google.com/forms/d/e/{FORM_ID}/viewform","entryUserId":"entry.{ENTRY_ID}"}]
```

---

### 2. Google Apps Script の設定

#### Step 1: スプレッドシートで Apps Script を開く

1. Google フォームの回答先スプレッドシートを開く
2. メニューから「拡張機能」→「Apps Script」を選択

#### Step 2: スクリプトを追加

`google-apps-script-helper.gs`の内容をコピーして、Apps Script エディタに貼り付けます。

**ファイル名**: `Code.gs`（デフォルトのまま）

#### Step 3: 環境変数を設定

1. 左側の「プロジェクトの設定」（歯車アイコン）をクリック
2. 「スクリプト プロパティ」セクションで「スクリプト プロパティを追加」をクリック
3. 以下のプロパティを追加：

| プロパティ名         | 値                                                    | 説明                                              |
| -------------------- | ----------------------------------------------------- | ------------------------------------------------- |
| `NEXTJS_WEBHOOK_URL` | `https://your-domain.vercel.app/api/line/form-submit` | Next.js API の URL（Vercel のドメインに置き換え） |

**例:**

```
プロパティ名: NEXTJS_WEBHOOK_URL
値: https://jobvit-test.vercel.app/api/line/form-submit
```

⚠️ **重要**:

- `your-domain.vercel.app`を実際の Vercel のドメインに置き換えてください
- URL は`https://`で始まる必要があります
- 末尾にスラッシュ（`/`）は不要です

#### Step 4: トリガーを設定

1. 左側の「トリガー」（時計アイコン）をクリック
2. 「トリガーを追加」をクリック
3. 以下の設定を入力：

| 項目             | 設定値           |
| ---------------- | ---------------- |
| 実行する関数     | `onFormSubmit`   |
| イベントのソース | `フォームから`   |
| イベントの種類   | `フォーム送信時` |

4. 「保存」をクリック
5. 初回実行時に権限の承認が求められる場合があります
   - 「権限を確認」をクリック
   - Google アカウントを選択
   - 「詳細」→「{プロジェクト名}（安全ではないページ）に移動」をクリック
   - 「許可」をクリック

#### Step 5: テスト実行

1. Apps Script エディタで`testFormSubmit`関数を選択
2. 「実行」ボタンをクリック
3. 左側の「実行数」（時計アイコン）でログを確認
4. 以下のログが表示されれば OK：
   ```
   === Test Form Submit ===
   NEXTJS_WEBHOOK_URL: https://...
   Testing with mock data...
   === onFormSubmit START ===
   Form submission received
   Available question titles: [...]
   Found userId from question title: LINEユーザーID（自動入力） userId: test-user-id-123
   Calling Next.js API: https://...
   === Next.js API Response ===
   Status Code: 200
   SUCCESS: Next.js API call completed
   ```

---

### 3. Next.js（Vercel）の設定

#### 必要な環境変数

Vercel のダッシュボードで以下の環境変数を設定してください：

| 環境変数名                          | 説明                                  | 取得方法                                                                                                  | 必須 |
| ----------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---- |
| `LINE_CHANNEL_ACCESS_TOKEN`         | LINE Bot のチャネルアクセストークン   | [LINE Developers Console](https://developers.line.biz/console/) > チャネル設定 > チャネルアクセストークン | ✅   |
| `LINE_CHANNEL_SECRET`               | LINE Bot のチャネルシークレット       | [LINE Developers Console](https://developers.line.biz/console/) > チャネル設定 > チャネルシークレット     | ✅   |
| `OPENAI_API_KEY`                    | OpenAI API キー                       | [OpenAI Platform](https://platform.openai.com/api-keys) > API Keys > Create new secret key                | ✅   |
| `OPENAI_MODEL`                      | 使用するモデル（オプション）          | デフォルト: `gpt-5.2`                                                                                     | ❌   |
| `REDIS_URL` または `LINE_REDIS_URL` | Redis 接続 URL                        | Vercel の Redis アドオンで自動生成（例: `jobvitTest_REDIS_URL`）                                          | ✅   |
| `GOOGLE_FORM_CONFIGS`               | フォーム設定（JSON 形式、オプション） | フォーム URL とエントリー ID を設定                                                                       | ❌   |

**設定方法:**

1. Vercel ダッシュボードにログイン
2. プロジェクトを選択
3. 「Settings」→「Environment Variables」をクリック
4. 各環境変数を追加
5. 「Save」をクリック
6. デプロイを再実行（環境変数の変更を反映）

---

### 4. Google フォーム URL の設定

#### 方法 1: コード内で設定（`lib/config.ts`）

```typescript
export const FORM_CONFIGS: FormConfig[] = [
  {
    baseUrl: "https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform",
    entryUserId: "entry.123456789", // 実際のエントリーIDに置き換え
  },
];
```

#### 方法 2: 環境変数で設定

```json
GOOGLE_FORM_CONFIGS=[{"baseUrl":"https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform","entryUserId":"entry.123456789"}]
```

**エントリー ID の確認方法:**

1. Google フォームを開く
2. 「送信」ボタンの横の「⋮」をクリック
3. 「事前入力 URL を取得」を選択
4. LINE ユーザー ID の質問にチェックを入れる
5. 生成された URL の`entry.`の後の数字がエントリー ID です

**例:**

```
https://docs.google.com/forms/d/e/FORM_ID/viewform?entry.123456789=test
                                                      ^^^^^^^^^^^^
                                                      これがエントリーID
```

---

## 🔍 動作確認

### 1. フォーム提出のテスト

1. Google フォームを開く
2. LINE ユーザー ID を手動で入力（テスト用）
   - 実際の LINE ユーザー ID を使用するか、テスト用の ID を入力
   - 例: `U1234567890abcdefghijklmnopqrstuv`
3. 他の質問に回答
4. フォームを提出

### 2. Apps Script のログを確認

1. Apps Script エディタを開く
2. 左側の「実行数」（時計アイコン）をクリック
3. 最新の実行をクリック
4. 以下のログを確認：

**成功時のログ:**

```
=== onFormSubmit START ===
Form submission received
Available question titles: [質問1, 質問2, LINEユーザーID（自動入力）, ...]
Found userId from question title: LINEユーザーID（自動入力） userId: U1234567890...
Calling Next.js API: https://jobvit-test.vercel.app/api/line/form-submit
Payload prepared, userId: U1234567890...
FormData keys count: 3
=== Next.js API Response ===
Status Code: 200
Response: {"message":"OK","scoring":{"totalPoints":85,"maxPoints":100,"percentage":85,"grade":"A"}}
SUCCESS: Next.js API call completed
=== onFormSubmit END ===
```

**エラー時のログ:**

```
WARNING: userId not found in form submission
All question titles and values:
  - 質問1: ["回答1"]
  - 質問2: ["回答2"]
Error notification sent: 400
```

### 3. Next.js API のログを確認

Vercel のダッシュボードでログを確認：

1. Vercel ダッシュボードにログイン
2. プロジェクトを選択
3. 「Functions」タブをクリック
4. `/api/line/form-submit`のログを確認

**成功時のログ:**

```
[FormSubmit] Received form submission
[FormSubmit] Request body keys: [userId, formData]
[FormSubmit] userId: U1234567890abcdefghijklmnopqrstuv
[FormSubmit] formData keys: [質問1, 質問2, LINEユーザーID（自動入力）]
[FormSubmit] Starting AI scoring...
[AIScoring] Sending request to ChatGPT API...
[AIScoring] Received response from ChatGPT API
[FormSubmit] AI scoring completed: { totalPoints: 85, maxPoints: 100, percentage: 85, grade: 'A' }
[FormSubmit] Sending scoring result to LINE...
[FormSubmit] Scoring result sent successfully
```

### 4. LINE Bot で採点結果を確認

フォーム提出後、数秒以内に LINE Bot から採点結果が自動的に送信されます。

**送信される内容:**

- Flex メッセージ形式の採点結果
- 合計点、正答率、評価（S/A/B/C/D）
- 各質問の詳細（得点、フィードバック）
- 評価に応じた色分け

---

## ⚠️ トラブルシューティング

### 問題 1: userId が見つからない

**症状:** Apps Script のログに「WARNING: userId not found in form submission」と表示される

**原因:**

- Google フォームの質問タイトルが一致していない
- フォーム URL に LINE ユーザー ID が埋め込まれていない

**解決方法:**

1. Google フォームの質問タイトルを確認
   - 「LINE ユーザー ID（自動入力）」と完全に一致しているか確認
2. `LINE_USER_ID_QUESTION_TITLES`配列に質問タイトルを追加
   - `google-apps-script-helper.gs`の 14-21 行目を編集
3. フォーム URL に LINE ユーザー ID が正しく埋め込まれているか確認
   - イベントカードのフォーム URL を確認
   - `entry.{ENTRY_ID}=`の後に LINE ユーザー ID が含まれているか確認

### 問題 2: Next.js API が呼び出されない

**症状:** Apps Script のログに「Next.js API response」が表示されない

**原因:**

- トリガーが設定されていない
- `NEXTJS_WEBHOOK_URL`が設定されていない
- URL が間違っている

**解決方法:**

1. トリガーが正しく設定されているか確認
   - 「トリガー」タブで`onFormSubmit`が「フォーム送信時」に設定されているか確認
2. `NEXTJS_WEBHOOK_URL`が正しく設定されているか確認
   - 「プロジェクトの設定」→「スクリプト プロパティ」で確認
   - URL が`https://`で始まっているか確認
   - ドメインが正しいか確認
3. テスト関数を実行して確認
   - `testFormSubmit`関数を実行してログを確認

### 問題 3: LINE にメッセージが届かない

**症状:** Next.js API は成功しているが、LINE にメッセージが届かない

**原因:**

- LINE Bot の環境変数が設定されていない
- userId が正しくない
- LINE Bot がユーザーをブロックしている

**解決方法:**

1. `LINE_CHANNEL_ACCESS_TOKEN`と`LINE_CHANNEL_SECRET`が正しく設定されているか確認
   - Vercel の環境変数を確認
   - 値が正しいか確認（コピー&ペーストミスがないか）
2. userId が正しい LINE ユーザー ID か確認
   - Apps Script のログで確認
   - LINE ユーザー ID の形式: `U`で始まる 33 文字の文字列
3. LINE Bot がユーザーをブロックしていないか確認
   - ユーザーが Bot を友だち追加しているか確認
4. Vercel のログで`[FormSubmit] Scoring result sent successfully`が表示されているか確認
   - 表示されていない場合は、LINE API のエラーを確認

### 問題 4: 採点処理が失敗する

**症状:** ログに「Failed to score with AI」と表示される

**原因:**

- OpenAI API キーが設定されていない
- OpenAI API のクォータを超過している
- フォームデータの形式が正しくない

**解決方法:**

1. `OPENAI_API_KEY`が正しく設定されているか確認
   - Vercel の環境変数を確認
   - API キーが有効か確認
2. OpenAI API のクォータを確認
   - [OpenAI Platform](https://platform.openai.com/usage)で確認
   - クォータを超過している場合は、プランをアップグレード
3. フォームデータの形式が正しいか確認
   - Apps Script のログで`formData`を確認
   - 空でないか確認

### 問題 5: フォーム URL に LINE ユーザー ID が自動入力されない

**症状:** フォームを開いても LINE ユーザー ID が自動入力されない

**原因:**

- フォーム URL にエントリー ID が含まれていない
- エントリー ID が間違っている

**解決方法:**

1. フォーム URL を確認
   - `entry.{ENTRY_ID}=`が含まれているか確認
2. エントリー ID が正しいか確認
   - 「事前入力 URL を取得」で確認
3. `GOOGLE_FORM_CONFIGS`または`FORM_CONFIGS`の設定を確認
   - `entryUserId`が正しく設定されているか確認

---

## 📝 チェックリスト

### Google フォーム

- [ ] 「LINE ユーザー ID（自動入力）」質問を追加
- [ ] 質問タイトルが正確に一致しているか確認
- [ ] 採点対象の質問を追加
- [ ] フォーム URL に LINE ユーザー ID を埋め込む設定

### Google Apps Script

- [ ] `google-apps-script-helper.gs`のコードを追加
- [ ] `NEXTJS_WEBHOOK_URL`を設定（Vercel のドメインに置き換え）
- [ ] トリガーを設定（フォーム送信時）
- [ ] 権限を承認
- [ ] `testFormSubmit`関数でテスト実行

### Next.js（Vercel）

- [ ] `LINE_CHANNEL_ACCESS_TOKEN`を設定
- [ ] `LINE_CHANNEL_SECRET`を設定
- [ ] `OPENAI_API_KEY`を設定
- [ ] `OPENAI_MODEL`を設定（オプション、デフォルト: `gpt-5.2`）
- [ ] `REDIS_URL`または`LINE_REDIS_URL`を設定
- [ ] `GOOGLE_FORM_CONFIGS`を設定（フォーム URL とエントリー ID）

### 動作確認

- [ ] フォーム提出のテスト実行
- [ ] Apps Script のログ確認
- [ ] Next.js API のログ確認
- [ ] LINE Bot で採点結果を受信できることを確認

---

## 🔗 関連ファイル

- `google-apps-script-helper.gs` - Google Apps Script のコード
- `app/api/line/form-submit/route.ts` - Next.js API エンドポイント
- `lib/ai-scoring.ts` - AI 採点ロジック
- `lib/messages.ts` - LINE メッセージ生成
- `lib/config.ts` - フォーム設定
- `lib/sheets.ts` - フォーム URL 生成

---

## 📞 サポート

問題が解決しない場合は、以下のログを確認してください：

1. **Google Apps Script のログ**

   - Apps Script エディタ → 「実行数」→ 最新の実行

2. **Vercel のログ**

   - Vercel ダッシュボード → 「Functions」→ `/api/line/form-submit`

3. **LINE Bot のログ**
   - LINE Developers Console → 「Messaging API」→ 「Webhook 送信状況」
