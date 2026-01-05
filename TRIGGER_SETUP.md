# Google フォーム送信時の即時採点 設定ガイド

## 🎯 目標

Google フォームを送信した**瞬間**にイベントが発火し、AI 採点が実行されて LINE Bot から採点結果が送信されるように設定します。

---

## ⚡ 即時実行のための設定

### 1. Google Apps Script のトリガー設定（最重要）

#### Step 1: トリガーの確認・設定

1. Google フォームの回答先スプレッドシートを開く
2. 「拡張機能」→「Apps Script」を選択
3. 左側の「トリガー」（時計アイコン）をクリック
4. 既存のトリガーを確認、または「トリガーを追加」をクリック

#### Step 2: トリガーの設定値

| 項目                 | 設定値                 | 説明                                                           |
| -------------------- | ---------------------- | -------------------------------------------------------------- |
| **実行する関数**     | `onFormSubmit`         | フォーム送信時に実行される関数                                 |
| **イベントのソース** | `スプレッドシートから` | スプレッドシートに紐づいたスクリプトの場合はこれが表示されます |
| **イベントの種類**   | `フォーム送信時`       | ⚠️ **最重要**: これを選択すれば即座に実行されます              |

⚠️ **重要**:

- 「イベントのソース」が「スプレッドシートから」でも問題ありません
- **「イベントの種類」が「フォーム送信時」であれば、フォーム送信の瞬間に即座に実行されます**
- 「スプレッドシートの変更時」を選択すると遅延が発生するため、必ず「フォーム送信時」を選択してください

#### Step 3: トリガーの確認

トリガーが正しく設定されている場合、以下のように表示されます：

```
実行する関数: onFormSubmit
イベントのソース: スプレッドシートから
イベントの種類: フォーム送信時  ← これが最重要！
```

**重要**: 「イベントのソース」が「スプレッドシートから」でも、「イベントの種類」が「フォーム送信時」であれば即座に実行されます。

---

### 2. Google Apps Script コードの最適化

`google-apps-script-helper.gs`のコードは既に最適化されています：

- ✅ 即座に Next.js API を呼び出し
- ✅ エラーハンドリングが適切
- ✅ ログで処理時間を記録

**処理フロー:**

```
フォーム送信
    ↓（即座に実行）
onFormSubmit関数が実行
    ↓（数ミリ秒）
LINEユーザーIDを抽出
    ↓（数ミリ秒）
Next.js APIを呼び出し
    ↓（数秒）
採点結果をLINEに送信
```

---

### 3. Next.js API の最適化

`/api/line/form-submit`エンドポイントは以下のように最適化されています：

1. **即座にレスポンスを返す**

   - LINE 送信はバックグラウンドで実行
   - Google Apps Script のタイムアウトを回避

2. **並列処理**

   - スプレッドシートへの保存は非同期で実行
   - 採点処理をブロックしない

3. **エラーハンドリング**
   - 各処理でエラーが発生しても、可能な限り続行

---

## 🔍 動作確認方法

### 1. トリガーが正しく設定されているか確認

1. Apps Script エディタを開く
2. 「トリガー」タブを確認
3. 以下の設定になっているか確認：
   - イベントのソース: **フォームから**（重要！）
   - イベントの種類: **フォーム送信時**

### 2. テスト送信で確認

1. Google フォームを開く
2. LINE ユーザー ID を入力（テスト用）
3. 質問に回答
4. **フォームを送信**
5. すぐに Apps Script エディタに戻る

### 3. ログで処理時間を確認

Apps Script のログで以下を確認：

```
=== onFormSubmit START ===
Form submission received
Found userId from question title: LINEユーザーID（自動入力） userId: ...
Calling Next.js API: https://...
Response Time: 2500ms  ← これが短いほど良い
Status Code: 200
SUCCESS: Next.js API call completed
採点完了: A評価 (85%)
=== onFormSubmit END ===
```

**理想的な処理時間:**

- Apps Script の処理: 100ms 以下
- Next.js API の応答: 2-5 秒（AI 採点を含む）
- LINE 送信: 1-2 秒

**合計: 約 3-7 秒で採点結果が LINE に届く**

---

## ⚠️ よくある問題と解決方法

### 問題 1: 「イベントの種類」が「スプレッドシートの変更時」になっている

**症状:** フォーム送信後、数秒〜数十秒経ってから処理が開始される

**解決方法:**

1. トリガーを削除
2. 新しいトリガーを追加
3. **「イベントの種類」を「フォーム送信時」に変更** ← これが最重要！
4. 「イベントのソース」は「スプレッドシートから」のままで OK

**注意**: 「イベントのソース」が「スプレッドシートから」でも、「イベントの種類」が「フォーム送信時」であれば即座に実行されます。

### 問題 2: トリガーが実行されない

**症状:** フォームを送信してもログに何も表示されない

**解決方法:**

1. トリガーが正しく設定されているか確認
2. 権限が承認されているか確認
3. `testFormSubmit`関数を手動実行してテスト
4. Apps Script のエラーを確認

### 問題 3: 処理が遅い

**症状:** フォーム送信から採点結果が届くまで時間がかかる

**原因と解決方法:**

1. **Next.js API の応答が遅い**

   - Vercel のログで処理時間を確認
   - OpenAI API の応答時間を確認
   - ネットワークの遅延を確認

2. **Google Apps Script のタイムアウト**

   - デフォルトの実行時間制限: 6 分
   - 通常は問題ないが、長時間かかる場合は最適化が必要

3. **LINE API の遅延**
   - LINE Platform のサーバー負荷による遅延の可能性
   - 通常は 1-2 秒以内

---

## 📊 パフォーマンス最適化のポイント

### 1. Google Apps Script 側

- ✅ 即座に Next.js API を呼び出し（既に実装済み）
- ✅ エラーハンドリングを最適化（既に実装済み）
- ✅ ログで処理時間を記録（既に実装済み）

### 2. Next.js API 側

- ✅ レスポンスを即座に返す（LINE 送信はバックグラウンド）
- ✅ スプレッドシート保存を非同期化（既に実装済み）
- ✅ エラーハンドリングを最適化（既に実装済み）

### 3. OpenAI API 側

- ✅ モデルを`gpt-5.2`に設定（高速な応答）
- ✅ プロンプトを最適化（既に実装済み）
- ✅ タイムアウト設定を確認

---

## 🎯 期待される動作

### 正常な動作フロー

```
ユーザーがフォームを送信
    ↓（0秒）
Google Apps Scriptのトリガーが発火
    ↓（0.1秒）
Next.js APIを呼び出し
    ↓（2-5秒）
AI採点が完了
    ↓（0.1秒）
LINE Botに採点結果を送信
    ↓（1-2秒）
ユーザーがLINEで採点結果を受信

合計: 約3-7秒
```

### 実際のログ例

**Google Apps Script:**

```
=== onFormSubmit START ===
Form submission received
Found userId from question title: LINEユーザーID（自動入力） userId: U1234...
Calling Next.js API: https://jobvit-test.vercel.app/api/line/form-submit
Response Time: 3200ms
Status Code: 200
SUCCESS: Next.js API call completed
採点完了: A評価 (85%)
=== onFormSubmit END ===
```

**Next.js API:**

```
[FormSubmit] Received form submission
[FormSubmit] userId: U1234...
[FormSubmit] Starting AI scoring immediately...
[AIScoring] Sending request to ChatGPT API...
[AIScoring] Received response from ChatGPT API
[FormSubmit] AI scoring completed: { totalPoints: 85, maxPoints: 100, percentage: 85, grade: 'A' }
[FormSubmit] Sending scoring result to LINE...
[FormSubmit] Scoring result sent successfully
```

---

## 📝 チェックリスト

- [ ] Google Apps Script にコードを追加
- [ ] `NEXTJS_WEBHOOK_URL`を設定
- [ ] **トリガーの「イベントの種類」を「フォーム送信時」に設定**（最重要！）
- [ ] トリガーのイベント種類を「フォーム送信時」に設定
- [ ] 権限を承認
- [ ] テスト送信を実行
- [ ] Apps Script のログで処理時間を確認
- [ ] Next.js API のログで処理時間を確認
- [ ] LINE Bot で採点結果を受信できることを確認

---

## 🔗 関連ファイル

- `google-apps-script-helper.gs` - Google Apps Script のコード
- `app/api/line/form-submit/route.ts` - Next.js API エンドポイント
- `lib/ai-scoring.ts` - AI 採点ロジック
