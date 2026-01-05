# トラブルシューティングガイド

## 🔍 フォーム送信後、採点結果がLINEに返ってこない

### 症状

- フォーム送信は成功している
- ログに「[FormSubmit] Starting AI scoring immediately...」は表示される
- しかし、その後のログ（AI採点完了、LINE送信など）が表示されない
- LINE Botから採点結果が届かない

### 考えられる原因と解決方法

#### 1. OpenAI APIのモデル名が間違っている

**症状:**
- `gpt-5.2`というモデル名を使用している
- OpenAI APIからエラーが返ってくる

**解決方法:**

環境変数`OPENAI_MODEL`を正しいモデル名に設定してください。

**利用可能なモデル名:**
- `gpt-4o` - 最新の高性能モデル
- `gpt-4o-mini` - 高速で低コスト（推奨）
- `gpt-4-turbo` - GPT-4 Turbo
- `gpt-4` - GPT-4

**設定方法:**

Vercelの環境変数で設定：
```
OPENAI_MODEL=gpt-4o-mini
```

または、`VERCEL_ENV_VARIABLES.md`を参照してください。

---

#### 2. OpenAI APIキーが設定されていない、または無効

**症状:**
- `OPENAI_API_KEY`が設定されていない
- APIキーが無効または期限切れ

**確認方法:**

Vercelのログで以下を確認：
```
[AIScoring] API Key exists: false
```

**解決方法:**

1. [OpenAI Platform](https://platform.openai.com/api-keys)でAPIキーを確認
2. Vercelの環境変数に`OPENAI_API_KEY`を設定
3. デプロイを再実行

---

#### 3. OpenAI APIの呼び出しでタイムアウトが発生

**症状:**
- API呼び出しが長時間かかる
- タイムアウトエラーが発生する

**解決方法:**

- プロンプトの長さを確認（長すぎる場合は短縮）
- モデルを`gpt-4o-mini`に変更（高速）
- Vercelのタイムアウト設定を確認（デフォルト: 10秒、Hobbyプラン）

---

#### 4. LINE APIの呼び出しでエラーが発生

**症状:**
- AI採点は完了している
- LINE送信でエラーが発生する

**確認方法:**

Vercelのログで以下を確認：
```
[FormSubmit] Failed to send scoring result: ...
```

**考えられる原因:**

- `LINE_CHANNEL_ACCESS_TOKEN`が無効
- `LINE_CHANNEL_SECRET`が無効
- LINE Platformのサーバーエラー
- ユーザーIDが無効

**解決方法:**

1. LINE Developers Consoleでチャネルアクセストークンを確認
2. Vercelの環境変数を確認
3. ユーザーIDが正しいか確認

---

#### 5. レスポンスの処理でエラーが発生

**症状:**
- OpenAI APIからレスポンスは返ってくる
- JSONパースでエラーが発生する

**確認方法:**

Vercelのログで以下を確認：
```
[AIScoring] Failed to parse JSON response: ...
```

**解決方法:**

- OpenAI APIのレスポンス形式を確認
- プロンプトでJSON形式を明確に指定（既に実装済み）

---

## 🔧 デバッグ方法

### 1. Vercelのログを確認

1. Vercelダッシュボードにログイン
2. プロジェクトを選択
3. 「Logs」タブを開く
4. フォーム送信時のログを確認

**確認すべきログ:**

```
[FormSubmit] Received form submission
[FormSubmit] Starting AI scoring immediately...
[AIScoring] Sending request to ChatGPT API...
[AIScoring] Model: gpt-4o-mini
[AIScoring] API Key exists: true
[AIScoring] Calling OpenAI API...
[AIScoring] OpenAI API call completed in XXX ms
[AIScoring] Received response from ChatGPT API
[AIScoring] Scoring completed: ...
[FormSubmit] AI scoring completed: ...
[FormSubmit] Preparing LINE message...
[FormSubmit] Sending scoring result to LINE...
[FormSubmit] Scoring result sent successfully
```

### 2. エラーログを確認

エラーが発生している場合、以下のログが表示されます：

```
[AIScoring] Error calling ChatGPT API: ...
[FormSubmit] Failed to score with AI: ...
[FormSubmit] Failed to send scoring result: ...
```

### 3. Google Apps Scriptのログを確認

1. Apps Scriptエディタを開く
2. 「実行数」タブを開く
3. 最新の実行を確認
4. ログを確認

**確認すべきログ:**

```
=== onFormSubmit START ===
Calling Next.js API: https://...
Response Time: XXXms
Status Code: 200
SUCCESS: Next.js API call completed
採点完了: A評価 (85%)
=== onFormSubmit END ===
```

---

## 📋 チェックリスト

フォーム送信後、採点結果が返ってこない場合：

- [ ] `OPENAI_API_KEY`が設定されているか
- [ ] `OPENAI_MODEL`が正しいモデル名か（`gpt-4o-mini`推奨）
- [ ] `LINE_CHANNEL_ACCESS_TOKEN`が設定されているか
- [ ] `LINE_CHANNEL_SECRET`が設定されているか
- [ ] Vercelのログでエラーを確認
- [ ] Google Apps Scriptのログでエラーを確認
- [ ] フォームのLINEユーザーIDが正しく取得できているか

---

## 🆘 それでも解決しない場合

1. **Vercelのログを完全に確認**
   - エラーメッセージをコピー
   - スタックトレースを確認

2. **Google Apps Scriptのログを確認**
   - エラーメッセージをコピー
   - 実行時間を確認

3. **テスト送信を実行**
   - `testFormSubmit`関数を手動実行
   - モックデータでテスト

4. **環境変数を再確認**
   - Vercelの環境変数が正しく設定されているか
   - 値に余分なスペースや改行がないか
