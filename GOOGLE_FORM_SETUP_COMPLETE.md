# Googleフォーム採点システム 完全セットアップガイド

## 📋 概要

Googleフォームに回答を提出すると、自動的にAI採点が実行され、LINE Botから採点結果が送信されます。

**重要**: LINE Botにメッセージを送信して採点する機能は無効化されています。Googleフォームからの提出のみが採点対象です。

---

## 🔧 セットアップ手順

### 1. Googleフォームの設定

#### Step 1: LINEユーザーIDの質問を追加

1. Googleフォームを開く
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
- 質問1: 「あなたの強みは何ですか？」
- 質問2: 「志望動機を教えてください」
- など

#### Step 3: フォームURLにLINEユーザーIDを埋め込む

イベントカードのフォームURLに、LINEユーザーIDを自動入力するパラメータを追加します。

**方法: 事前入力URLを使用**

1. Googleフォームを開く
2. 「送信」ボタンの横の「⋮」（三点メニュー）をクリック
3. 「事前入力URLを取得」を選択
4. LINEユーザーIDの質問にチェックを入れる
5. 生成されたURLをコピー

**URLの形式:**
```
https://docs.google.com/forms/d/e/{FORM_ID}/viewform?entry.{ENTRY_ID}=LINE_USER_ID
```

**Next.js側での設定:**
- `lib/config.ts`の`FORM_CONFIGS`に設定を追加
- または環境変数`GOOGLE_FORM_CONFIGS`に設定

**設定例:**
```typescript
// lib/config.ts
export const FORM_CONFIGS: FormConfig[] = [
  {
    baseUrl: 'https://docs.google.com/forms/d/e/{FORM_ID}/viewform',
    entryUserId: 'entry.{ENTRY_ID}', // 実際のエントリーIDに置き換え
  },
];
```

または環境変数:
```json
GOOGLE_FORM_CONFIGS=[{"baseUrl":"https://docs.google.com/forms/d/e/{FORM_ID}/viewform","entryUserId":"entry.{ENTRY_ID}"}]
```

---

### 2. Google Apps Scriptの設定

#### Step 1: スプレッドシートでApps Scriptを開く

1. Googleフォームの回答先スプレッドシートを開く
2. メニューから「拡張機能」→「Apps Script」を選択

#### Step 2: スクリプトを追加

`google-apps-script-helper.gs`の内容をコピーして、Apps Scriptエディタに貼り付けます。

**ファイル名**: `Code.gs`（デフォルトのまま）

#### Step 3: 環境変数を設定

1. 左側の「プロジェクトの設定」（歯車アイコン）をクリック
2. 「スクリプト プロパティ」セクションで「スクリプト プロパティを追加」をクリック
3. 以下のプロパティを追加：

| プロパティ名 | 値 | 説明 |
|------------|-----|------|
| `NEXTJS_WEBHOOK_URL` | `https://your-domain.vercel.app/api/line/form-submit` | Next.js APIのURL（Vercelのドメインに置き換え） |

**例:**
```
プロパティ名: NEXTJS_WEBHOOK_URL
値: https://jobvit-test.vercel.app/api/line/form-submit
```

⚠️ **重要**: 
- `your-domain.vercel.app`を実際のVercelのドメインに置き換えてください
- URLは`https://`で始まる必要があります
- 末尾にスラッシュ（`/`）は不要です

#### Step 4: トリガーを設定

1. 左側の「トリガー」（時計アイコン）をクリック
2. 「トリガーを追加」をクリック
3. 以下の設定を入力：

| 項目 | 設定値 |
|-----|--------|
| 実行する関数 | `onFormSubmit` |
| イベントのソース | `フォームから` |
| イベントの種類 | `フォーム送信時` |

4. 「保存」をクリック
5. 初回実行時に権限の承認が求められる場合があります
   - 「権限を確認」をクリック
   - Googleアカウントを選択
   - 「詳細」→「{プロジェクト名}（安全ではないページ）に移動」をクリック
   - 「許可」をクリック

#### Step 5: テスト実行

1. Apps Scriptエディタで`testFormSubmit`関数を選択
2. 「実行」ボタンをクリック
3. 左側の「実行数」（時計アイコン）でログを確認
4. 以下のログが表示されればOK：
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

Vercelのダッシュボードで以下の環境変数を設定してください：

| 環境変数名 | 説明 | 取得方法 | 必須 |
|-----------|------|---------|------|
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Botのチャネルアクセストークン | [LINE Developers Console](https://developers.line.biz/console/) > チャネル設定 > チャネルアクセストークン | ✅ |
| `LINE_CHANNEL_SECRET` | LINE Botのチャネルシークレット | [LINE Developers Console](https://developers.line.biz/console/) > チャネル設定 > チャネルシークレット | ✅ |
| `OPENAI_API_KEY` | OpenAI APIキー | [OpenAI Platform](https://platform.openai.com/api-keys) > API Keys > Create new secret key | ✅ |
| `OPENAI_MODEL` | 使用するモデル（オプション） | デフォルト: `gpt-5.2` | ❌ |
| `REDIS_URL` または `LINE_REDIS_URL` | Redis接続URL | VercelのRedisアドオンで自動生成（例: `jobvitTest_REDIS_URL`） | ✅ |
| `GOOGLE_FORM_CONFIGS` | フォーム設定（JSON形式、オプション） | フォームURLとエントリーIDを設定 | ❌ |

**設定方法:**
1. Vercelダッシュボードにログイン
2. プロジェクトを選択
3. 「Settings」→「Environment Variables」をクリック
4. 各環境変数を追加
5. 「Save」をクリック
6. デプロイを再実行（環境変数の変更を反映）

---

### 4. GoogleフォームURLの設定

#### 方法1: コード内で設定（`lib/config.ts`）

```typescript
export const FORM_CONFIGS: FormConfig[] = [
  {
    baseUrl: 'https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform',
    entryUserId: 'entry.123456789', // 実際のエントリーIDに置き換え
  },
];
```

#### 方法2: 環境変数で設定

```json
GOOGLE_FORM_CONFIGS=[{"baseUrl":"https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform","entryUserId":"entry.123456789"}]
```

**エントリーIDの確認方法:**
1. Googleフォームを開く
2. 「送信」ボタンの横の「⋮」をクリック
3. 「事前入力URLを取得」を選択
4. LINEユーザーIDの質問にチェックを入れる
5. 生成されたURLの`entry.`の後の数字がエントリーIDです

**例:**
```
https://docs.google.com/forms/d/e/FORM_ID/viewform?entry.123456789=test
                                                      ^^^^^^^^^^^^
                                                      これがエントリーID
```

---

## 🔍 動作確認

### 1. フォーム提出のテスト

1. Googleフォームを開く
2. LINEユーザーIDを手動で入力（テスト用）
   - 実際のLINEユーザーIDを使用するか、テスト用のIDを入力
   - 例: `U1234567890abcdefghijklmnopqrstuv`
3. 他の質問に回答
4. フォームを提出

### 2. Apps Scriptのログを確認

1. Apps Scriptエディタを開く
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

### 3. Next.js APIのログを確認

Vercelのダッシュボードでログを確認：

1. Vercelダッシュボードにログイン
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

### 4. LINE Botで採点結果を確認

フォーム提出後、数秒以内にLINE Botから採点結果が自動的に送信されます。

**送信される内容:**
- Flexメッセージ形式の採点結果
- 合計点、正答率、評価（S/A/B/C/D）
- 各質問の詳細（得点、フィードバック）
- 評価に応じた色分け

---

## ⚠️ トラブルシューティング

### 問題1: userIdが見つからない

**症状:** Apps Scriptのログに「WARNING: userId not found in form submission」と表示される

**原因:**
- Googleフォームの質問タイトルが一致していない
- フォームURLにLINEユーザーIDが埋め込まれていない

**解決方法:**
1. Googleフォームの質問タイトルを確認
   - 「LINEユーザーID（自動入力）」と完全に一致しているか確認
2. `LINE_USER_ID_QUESTION_TITLES`配列に質問タイトルを追加
   - `google-apps-script-helper.gs`の14-21行目を編集
3. フォームURLにLINEユーザーIDが正しく埋め込まれているか確認
   - イベントカードのフォームURLを確認
   - `entry.{ENTRY_ID}=`の後にLINEユーザーIDが含まれているか確認

### 問題2: Next.js APIが呼び出されない

**症状:** Apps Scriptのログに「Next.js API response」が表示されない

**原因:**
- トリガーが設定されていない
- `NEXTJS_WEBHOOK_URL`が設定されていない
- URLが間違っている

**解決方法:**
1. トリガーが正しく設定されているか確認
   - 「トリガー」タブで`onFormSubmit`が「フォーム送信時」に設定されているか確認
2. `NEXTJS_WEBHOOK_URL`が正しく設定されているか確認
   - 「プロジェクトの設定」→「スクリプト プロパティ」で確認
   - URLが`https://`で始まっているか確認
   - ドメインが正しいか確認
3. テスト関数を実行して確認
   - `testFormSubmit`関数を実行してログを確認

### 問題3: LINEにメッセージが届かない

**症状:** Next.js APIは成功しているが、LINEにメッセージが届かない

**原因:**
- LINE Botの環境変数が設定されていない
- userIdが正しくない
- LINE Botがユーザーをブロックしている

**解決方法:**
1. `LINE_CHANNEL_ACCESS_TOKEN`と`LINE_CHANNEL_SECRET`が正しく設定されているか確認
   - Vercelの環境変数を確認
   - 値が正しいか確認（コピー&ペーストミスがないか）
2. userIdが正しいLINEユーザーIDか確認
   - Apps Scriptのログで確認
   - LINEユーザーIDの形式: `U`で始まる33文字の文字列
3. LINE Botがユーザーをブロックしていないか確認
   - ユーザーがBotを友だち追加しているか確認
4. Vercelのログで`[FormSubmit] Scoring result sent successfully`が表示されているか確認
   - 表示されていない場合は、LINE APIのエラーを確認

### 問題4: 採点処理が失敗する

**症状:** ログに「Failed to score with AI」と表示される

**原因:**
- OpenAI APIキーが設定されていない
- OpenAI APIのクォータを超過している
- フォームデータの形式が正しくない

**解決方法:**
1. `OPENAI_API_KEY`が正しく設定されているか確認
   - Vercelの環境変数を確認
   - APIキーが有効か確認
2. OpenAI APIのクォータを確認
   - [OpenAI Platform](https://platform.openai.com/usage)で確認
   - クォータを超過している場合は、プランをアップグレード
3. フォームデータの形式が正しいか確認
   - Apps Scriptのログで`formData`を確認
   - 空でないか確認

### 問題5: フォームURLにLINEユーザーIDが自動入力されない

**症状:** フォームを開いてもLINEユーザーIDが自動入力されない

**原因:**
- フォームURLにエントリーIDが含まれていない
- エントリーIDが間違っている

**解決方法:**
1. フォームURLを確認
   - `entry.{ENTRY_ID}=`が含まれているか確認
2. エントリーIDが正しいか確認
   - 「事前入力URLを取得」で確認
3. `GOOGLE_FORM_CONFIGS`または`FORM_CONFIGS`の設定を確認
   - `entryUserId`が正しく設定されているか確認

---

## 📝 チェックリスト

### Googleフォーム
- [ ] 「LINEユーザーID（自動入力）」質問を追加
- [ ] 質問タイトルが正確に一致しているか確認
- [ ] 採点対象の質問を追加
- [ ] フォームURLにLINEユーザーIDを埋め込む設定

### Google Apps Script
- [ ] `google-apps-script-helper.gs`のコードを追加
- [ ] `NEXTJS_WEBHOOK_URL`を設定（Vercelのドメインに置き換え）
- [ ] トリガーを設定（フォーム送信時）
- [ ] 権限を承認
- [ ] `testFormSubmit`関数でテスト実行

### Next.js（Vercel）
- [ ] `LINE_CHANNEL_ACCESS_TOKEN`を設定
- [ ] `LINE_CHANNEL_SECRET`を設定
- [ ] `OPENAI_API_KEY`を設定
- [ ] `OPENAI_MODEL`を設定（オプション、デフォルト: `gpt-5.2`）
- [ ] `REDIS_URL`または`LINE_REDIS_URL`を設定
- [ ] `GOOGLE_FORM_CONFIGS`を設定（フォームURLとエントリーID）

### 動作確認
- [ ] フォーム提出のテスト実行
- [ ] Apps Scriptのログ確認
- [ ] Next.js APIのログ確認
- [ ] LINE Botで採点結果を受信できることを確認

---

## 🔗 関連ファイル

- `google-apps-script-helper.gs` - Google Apps Scriptのコード
- `app/api/line/form-submit/route.ts` - Next.js APIエンドポイント
- `lib/ai-scoring.ts` - AI採点ロジック
- `lib/messages.ts` - LINEメッセージ生成
- `lib/config.ts` - フォーム設定
- `lib/sheets.ts` - フォームURL生成

---

## 📞 サポート

問題が解決しない場合は、以下のログを確認してください：

1. **Google Apps Scriptのログ**
   - Apps Scriptエディタ → 「実行数」→ 最新の実行

2. **Vercelのログ**
   - Vercelダッシュボード → 「Functions」→ `/api/line/form-submit`

3. **LINE Botのログ**
   - LINE Developers Console → 「Messaging API」→ 「Webhook送信状況」
