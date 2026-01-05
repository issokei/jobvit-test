# Vercel Analytics トラッキング設定

このドキュメントでは、LINE Bot の以下のイベントをトラッキングする方法を説明します：

- 友だち追加時の挨拶メッセージ送信回数
- アンケートの進捗状況（どの質問まで回答したか）
- イベント情報ボタンのクリック回数

---

## 📊 概要

`@vercel/analytics`を使用して、LINE Bot の様々なイベントをトラッキングできます。これにより、Vercel Dashboard でユーザーの行動を分析できます。

---

## 🔧 実装内容

### 1. パッケージのインストール

```bash
npm install @vercel/analytics
```

### 2. Analytics コンポーネントの追加

`app/layout.tsx`に`Analytics`コンポーネントを追加しています：

```typescript
import { Analytics } from "@vercel/analytics/react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### 3. カスタムイベントのトラッキング

`app/api/line/webhook/route.ts`の`handleFollow`関数で、友だち追加時にイベントをトラッキングしています：

```typescript
import { track } from "@vercel/analytics/server";

// 友だち追加時にトラッキング
track("line_friend_added", {
  userId: userId.substring(0, 10) + "...", // プライバシー保護のため一部のみ
});
```

---

## 📈 トラッキングされるイベント

### 1. `line_friend_added`

LINE Bot に友だち追加されたときに送信されるイベントです。

**イベント名**: `line_friend_added`

**プロパティ**:

- `userId`: LINE ユーザー ID の一部（プライバシー保護のため最初の 10 文字のみ）

**発生タイミング**:

- LINE Bot に友だち追加されたとき
- 挨拶メッセージ（最初の質問）が正常に送信されたとき

---

### 2. `survey_progress`

アンケートの各質問に回答したときに送信されるイベントです。

**イベント名**: `survey_progress`

**プロパティ**:

- `step`: 質問のステップ（`name_input`, `university`, `bunri`, `grade`, `gender`, `graduation`）
- `questionKey`: 質問のキー（`name`, `university`, `bunri`, `grade`, `gender`, `graduation`）
- `questionTitle`: 質問のタイトル
- `progress`: 進捗状況（例: `1/6`, `2/6`）
- `userId`: LINE ユーザー ID の一部（プライバシー保護のため最初の 10 文字のみ）

**発生タイミング**:

- 各アンケート質問に回答したとき
- 次の質問に進む前

**確認できる情報**:

- どの質問まで回答したか
- 各質問の回答率
- アンケートの離脱ポイント

---

### 3. `survey_completed`

アンケートの全質問が完了したときに送信されるイベントです。

**イベント名**: `survey_completed`

**プロパティ**:

- `totalQuestions`: 総質問数（6）
- `answeredQuestions`: 回答した質問数
- `userId`: LINE ユーザー ID の一部（プライバシー保護のため最初の 10 文字のみ）

**発生タイミング**:

- 最後の質問（卒業年度）に回答したとき
- スプレッドシートに保存する前

**確認できる情報**:

- アンケート完了率
- 完了したユーザー数

---

### 4. `event_info_viewed`

イベント情報ボタンがクリックされたときに送信されるイベントです。

**イベント名**: `event_info_viewed`

**プロパティ**:

- `userId`: LINE ユーザー ID の一部（プライバシー保護のため最初の 10 文字のみ）

**発生タイミング**:

- ユーザーが「イベント情報」と送信したとき
- イベント情報の Flex メッセージが送信されたとき

**確認できる情報**:

- イベント情報の表示回数
- イベント情報のクリック率

---

## 📊 データの確認方法

### Vercel Dashboard で確認

1. [Vercel Dashboard](https://vercel.com/dashboard)にログイン
2. プロジェクトを選択
3. **Analytics**タブをクリック
4. **Custom Events**セクションで各イベントを確認

### 確認できる情報

#### `line_friend_added`

- **イベント数**: 友だち追加の総回数
- **時間別の推移**: 日別・時間別の友だち追加数
- **ユニークユーザー数**: 友だち追加したユニークユーザー数（概算）

#### `survey_progress`

- **各質問の回答数**: どの質問まで回答したか
- **進捗状況**: 各ステップでの回答率
- **離脱ポイント**: どの質問で離脱したか

#### `survey_completed`

- **完了数**: アンケートを完了したユーザー数
- **完了率**: 友だち追加数に対する完了率
- **時間別の完了数**: 日別・時間別の完了数

#### `event_info_viewed`

- **クリック数**: イベント情報ボタンのクリック回数
- **クリック率**: アンケート完了者に対するクリック率
- **時間別のクリック数**: 日別・時間別のクリック数

---

## ⚙️ 設定

### 環境変数

Vercel Analytics は自動的に有効化されます。追加の設定は不要です。

### トラッキングの無効化

トラッキングを無効化する場合は、`app/api/line/webhook/route.ts`の以下の部分をコメントアウトしてください：

```typescript
// Vercel Analyticsでトラッキング
try {
  track("line_friend_added", {
    userId: userId.substring(0, 10) + "...",
  });
  console.log("[handleFollow] Analytics event tracked: line_friend_added");
} catch (analyticsError) {
  // トラッキングエラーは無視（メイン処理には影響しない）
  console.warn(
    "[handleFollow] Failed to track analytics event:",
    analyticsError
  );
}
```

---

## 🔍 トラブルシューティング

### イベントが記録されない

1. **Vercel Analytics が有効化されているか確認**

   - Vercel Dashboard > Settings > Analytics で確認
   - Vercel Pro プラン以上が必要な場合があります

2. **ビルドが成功しているか確認**

   - `npm run build`でエラーがないか確認

3. **ログを確認**
   - Vercel Dashboard > Deployments > Functions > `/api/line/webhook` > Logs
   - `Analytics event tracked: line_friend_added`というログが出力されているか確認

### トラッキングエラーが発生する

トラッキングエラーは無視されるため、メイン処理（挨拶メッセージの送信）には影響しません。エラーログは以下のように出力されます：

```
[handleFollow] Failed to track analytics event: [エラー内容]
```

---

## 📚 参考資料

- [Vercel Analytics ドキュメント](https://vercel.com/docs/analytics)
- [Vercel Analytics カスタムイベント](https://vercel.com/docs/analytics/custom-events)

---

## ⚠️ 注意事項

1. **プライバシー保護**: ユーザー ID は一部のみを記録しています（最初の 10 文字）
2. **エラーハンドリング**: トラッキングエラーは無視され、メイン処理には影響しません
3. **Vercel Pro プラン**: Vercel Analytics の一部機能は Pro プラン以上が必要な場合があります

---

## 📊 データ分析の例

### アンケートの進捗分析

`survey_progress`イベントの`step`プロパティを使用して、どの質問で離脱したかを分析できます：

- `name_input`: 名前入力で離脱
- `university`: 大学名入力で離脱
- `bunri`: 文理区分で離脱
- `grade`: 学年で離脱
- `gender`: 性別で離脱
- `graduation`: 卒業年度で離脱

### コンバージョン率の計算

1. **友だち追加 → アンケート完了率**: `survey_completed` / `line_friend_added`
2. **アンケート完了 → イベント情報表示率**: `event_info_viewed` / `survey_completed`

### 離脱ポイントの特定

各`step`での`survey_progress`イベント数を比較して、最も離脱が多い質問を特定できます。

---

## 🔄 今後の拡張

他のイベントもトラッキングできます：

- **フォーム応募**: `form_submitted`（Google フォーム送信時）
- **特定の質問への回答**: 各質問ごとの詳細な分析

必要に応じて、`app/api/line/webhook/route.ts`に追加のトラッキングコードを追加してください。
