# LINE Bot システム動作フロー詳細

## 📱 ユーザーがLINE Botを友だち追加した時

### 1. イベント受信（`/api/line/webhook`）

```
ユーザーがLINE Botを友だち追加
    ↓
LINE Platform が Webhook イベントを送信
    ↓
POST /api/line/webhook
```

**処理内容:**
- LINE Platformから`follow`イベントを受信
- リクエストの署名を検証（`validateSignature`）
- イベントタイプを判定

### 2. 友だち追加処理（`handleFollow`関数）

#### Step 1: 状態のクリア
```typescript
await clearState(userId);
```
- Redisから既存のユーザー状態を削除
- エラーが発生しても続行（ログに警告を記録）

#### Step 2: 完了状態の設定
```typescript
await saveState(userId, { step: 'done', answers: {} });
```
- Redisにユーザー状態を保存
- `step: 'done'` - アンケート完了状態
- `answers: {}` - 空の回答オブジェクト
- エラーが発生しても続行（Redis接続エラーの場合でもイベントカードは送信）

#### Step 3: イベントカード（Flexメッセージ）の作成
```typescript
const eventMessage = createEventFlexMessage(userId);
```

**作成される内容:**
- **タイプ**: Flexメッセージ（カルーセル形式）
- **内容**:
  - イベントタイトル: 「【28卒限定】関西インターンEXPO 2026 vol.1」
  - 会場: グランフロント大阪
  - 日時: 2026年1月11日（土）10:00-17:00
  - 応募ボタン: Googleフォームへのリンク（LINEユーザーID自動入力）

**フォームURL生成:**
```typescript
const applyUrl = createPrefilledFormUrl(userId, 0);
```
- `userId`をGoogleフォームのURLパラメータに埋め込み
- フォームを開くと、LINEユーザーIDが自動入力される

#### Step 4: プッシュメッセージの送信
```typescript
await client.pushMessage(userId, eventMessage);
```
- LINE Messaging APIを使用してプッシュメッセージを送信
- ユーザーにイベントカードが表示される

#### Step 5: アナリティクスのトラッキング
```typescript
track('line_friend_added', { userId: ... });
track('event_info_viewed', { userId: ... });
```
- Vercel Analyticsでイベントを記録
- エラーが発生しても続行（メイン処理には影響しない）

---

## 📝 ユーザーがメッセージを送信した時

### 1. メッセージイベント受信

```
ユーザーがテキストメッセージを送信
    ↓
LINE Platform が Webhook イベントを送信
    ↓
POST /api/line/webhook
    ↓
handleEvent(event, client)
```

### 2. メッセージタイプの判定

**テキストメッセージの場合:**
- `event.type === 'message'`
- `message.type === 'text'`

### 3. コマンド処理

#### パターンA: 「次回イベントに応募する」
```
text === '次回イベントに応募する'
    ↓
イベントカードを送信（replyMessage）
    ↓
状態を'done'に設定
```

#### パターンB: 「イベント情報」または「イベント情報を表示する」
```
text === 'イベント情報' || text === 'イベント情報を表示する'
    ↓
3秒待機
    ↓
イベントカードを送信（replyMessage）
    ↓
状態を'done'に設定
```

#### パターンC: その他のテキスト
```
Googleフォーム採点機能を呼び出し
    ↓
handleFormScoringMessage(text, userId, replyToken, client)
```

---

## 📊 Googleフォーム採点機能（`handleFormScoringMessage`）

### 1. コマンドチェック

**「ヘルプ」コマンド:**
```
text === 'ヘルプ' || 'help' || '?' || '？' || '使い方'
    ↓
使い方メッセージを返信
```

### 2. テキストをフォーム形式に変換

```typescript
const formData = parseTextToFormData(text);
```

**変換ルール:**
- `Q1. 質問1` → 質問タイトル: "質問1"
- `回答: 回答内容` → 回答: ["回答内容"]
- 複数行の回答は結合される

**例:**
```
入力:
Q1. あなたの強みは何ですか？
回答: コミュニケーション能力です。

Q2. 志望動機を教えてください
回答: 貴社の理念に共感したためです。

出力:
{
  "あなたの強みは何ですか？": ["コミュニケーション能力です。"],
  "志望動機を教えてください": ["貴社の理念に共感したためです。"]
}
```

### 3. フォームデータの検証

**空の場合:**
```
formData が空
    ↓
フォーム形式の説明メッセージを返信
```

### 4. AI採点の実行

```typescript
const scoringResult = await scoreFormAnswersWithAI(formData);
```

**処理内容:**
1. OpenAI API（gpt-5.2）を呼び出し
2. フォーム回答をプロンプトに変換
3. 採点指示を送信
4. JSON形式で採点結果を受信

**採点結果の構造:**
```typescript
{
  totalPoints: 85,        // 合計点
  maxPoints: 100,         // 満点
  percentage: 85,         // 正答率（%）
  grade: "A",            // 評価（S/A/B/C/D）
  feedback: "総合的なフィードバック",
  details: [
    {
      questionTitle: "質問1",
      userAnswer: "回答1",
      points: 8,
      maxPoints: 10,
      feedback: "質問ごとのフィードバック"
    },
    ...
  ]
}
```

### 5. 採点結果をLINEに送信

```typescript
const scoringMessage = createScoringResultMessage(...);
await client.replyMessage(replyToken, scoringMessage);
```

**送信される内容:**
- Flexメッセージ形式の採点結果
- 合計点、正答率、評価（S/A/B/C/D）
- 各質問の詳細（得点、フィードバック）
- 評価に応じた色分け（S: 金色、A: 緑、B: 青、C: オレンジ、D: 赤）

---

## 📋 Googleフォームから提出された時

### 1. Google Apps Scriptのトリガー

```
ユーザーがGoogleフォームを提出
    ↓
Google Apps Script の onFormSubmit 関数が実行
```

**処理内容:**
1. フォーム回答を取得（`e.namedValues`）
2. LINEユーザーIDを抽出
   - 質問タイトル: "LINEユーザーID（自動入力）"
   - または他のパターン（"LINEユーザーID", "ユーザーID"など）
3. Next.js APIを呼び出し

### 2. Next.js API呼び出し（`/api/line/form-submit`）

```typescript
POST /api/line/form-submit
{
  "userId": "LINEユーザーID",
  "formData": {
    "質問1": ["回答1"],
    "質問2": ["回答2"],
    ...
  }
}
```

### 3. フォームデータの保存（オプション）

```typescript
await saveFormSubmission(userId, formData);
```
- 現在は何もしない（コメントアウトされた機能）

### 4. AI採点の実行

```typescript
const scoringResult = await scoreFormAnswersWithAI(formData);
```
- LINE Botに直接送信した場合と同じ採点ロジック

### 5. LINE Botに採点結果を送信

```typescript
const client = getLineClient();
const scoringMessage = createScoringResultMessage(...);
await client.pushMessage(userId, scoringMessage);
```
- プッシュメッセージとして送信（ユーザーがメッセージを送信しなくても自動的に送信される）

---

## 🔄 データフロー図

```
┌─────────────┐
│ LINE Platform│
└──────┬──────┘
       │ Webhook Event
       ↓
┌─────────────────────┐
│ /api/line/webhook   │
│ - 署名検証           │
│ - イベント処理       │
└──────┬──────────────┘
       │
       ├─ follow イベント
       │   ↓
       │ ┌─────────────────┐
       │ │ handleFollow    │
       │ │ 1. 状態クリア    │
       │ │ 2. done状態設定  │
       │ │ 3. イベントカード│
       │ │ 4. プッシュ送信  │
       │ └─────────────────┘
       │
       └─ message イベント
           ↓
       ┌─────────────────────┐
       │ handleEvent         │
       │ - コマンド判定      │
       │ - フォーム採点      │
       └──────┬──────────────┘
              │
              ↓
       ┌─────────────────────┐
       │ handleFormScoring    │
       │ 1. テキスト解析      │
       │ 2. AI採点実行        │
       │ 3. 結果送信          │
       └──────┬──────────────┘
              │
              ↓
       ┌─────────────────────┐
       │ OpenAI API          │
       │ (gpt-5.2)           │
       └─────────────────────┘

┌─────────────┐
│ Google Form │
└──────┬──────┘
       │ フォーム提出
       ↓
┌─────────────────────┐
│ Google Apps Script  │
│ onFormSubmit        │
└──────┬──────────────┘
       │ HTTP POST
       ↓
┌─────────────────────┐
│ /api/line/form-submit│
│ 1. データ受信       │
│ 2. AI採点実行       │
│ 3. LINE送信         │
└──────┬──────────────┘
       │
       ↓
┌─────────────────────┐
│ OpenAI API          │
│ (gpt-5.2)           │
└─────────────────────┘
```

---

## 💾 データストレージ

### Redis（ユーザー状態管理）

**キー形式:**
- `line:user_state:{userId}` - ユーザーの状態

**保存されるデータ:**
```typescript
{
  step: 'done',
  answers: {}
}
```

**用途:**
- ユーザーの状態を追跡
- アンケートの進捗管理（現在は使用されていない）
- セッション管理

---

## 🔍 エラーハンドリング

### 1. Redis接続エラー
- ログに警告を記録
- メイン処理は続行（イベントカードは送信される）

### 2. LINE APIエラー
- エラーログを記録
- エラーメッセージをユーザーに返信

### 3. OpenAI APIエラー
- エラーログを記録
- ユーザーにエラーメッセージを返信
- リトライは実装されていない（必要に応じて追加可能）

### 4. Google Apps Scriptエラー
- Apps Scriptのログに記録
- Next.js APIにエラー情報を送信
- ユーザーには通知されない（Apps Script側で処理）

---

## 📈 アナリティクス

### Vercel Analyticsで追跡されるイベント

1. **`line_friend_added`**
   - ユーザーがBotを友だち追加した時
   - データ: `{ userId: "..." }`

2. **`event_info_viewed`**
   - イベント情報が表示された時
   - データ: `{ userId: "..." }`

---

## 🔐 セキュリティ

### 1. Webhook署名検証
```typescript
validateSignature(body, channelSecret, signature)
```
- LINE Platformからのリクエストか検証
- 不正なリクエストを拒否

### 2. 環境変数
- 機密情報は環境変数で管理
- Vercelの環境変数設定を使用

### 3. ユーザーIDの保護
- ログには一部のみ表示（`userId.substring(0, 10) + '...'`）
- 完全なユーザーIDはログに記録されない

---

## 🎯 まとめ

1. **友だち追加時**: イベントカードを自動送信、LINEユーザーIDを自動取得
2. **メッセージ送信時**: Googleフォーム形式の回答を採点して結果を返信
3. **フォーム提出時**: Google Apps Script経由で自動採点、LINEに結果を送信
4. **状態管理**: Redisでユーザー状態を管理
5. **エラーハンドリング**: 各段階でエラーを適切に処理

