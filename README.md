# インターン EXPO 公式 LINE Bot

Next.js + Vercel + Vercel KV + Google Sheets で構築された LINE Bot アプリケーション

## 機能

- LINE 友だち追加時の自動アンケート開始
- 質問フロー（名前 → 大学 → 文理 → 学年 → 性別 → 卒業年度）
- 回答を Google スプレッドシートに保存
- イベント情報の Flex メッセージ表示
- Google フォームへの応募リンク（userId 自動入力）

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 設定方法

#### 方法 1: コード内で設定（推奨）

`lib/config.ts`ファイルで、Google フォームやスプレッドシートの設定を直接編集できます。

```typescript
// lib/config.ts
export const FORM_CONFIGS: FormConfig[] = [
  {
    baseUrl: "https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform",
    entryUserId: "YOUR_ENTRY_ID",
  },
];

export const SHEET_CONFIGS: SheetConfig[] = [
  {
    spreadsheetId: "YOUR_SPREADSHEET_ID",
    sheetName: "YOUR_SHEET_NAME",
  },
];
```

詳細は[CONFIG_GUIDE.md](./CONFIG_GUIDE.md)を参照してください。

#### 方法 2: 環境変数で設定（後方互換性）

`.env.example`を参考に、`.env.local`ファイルを作成して必要な値を設定してください。

**注意**: `.env.local`ファイルは`.gitignore`に含まれているため、Git にコミットされません。

**優先順位**: コード内の設定（`lib/config.ts`）が環境変数より優先されます。

### 3. Google Service Account の設定

1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクトを作成
2. **Google Sheets API**を有効化
3. **IAM と管理** > **サービスアカウント**から新しいサービスアカウントを作成
4. サービスアカウントの**キー**を JSON 形式でダウンロード
5. スプレッドシートにサービスアカウントのメールアドレスを共有（**編集権限**を付与）
6. `.env.local`に以下を設定：
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: サービスアカウントのメールアドレス
   - `GOOGLE_PRIVATE_KEY`: JSON キー内の`private_key`フィールドの値（改行文字`\n`を含む）

**重要**: `GOOGLE_PRIVATE_KEY`は改行文字を含むため、環境変数に設定する際は`\n`をそのまま含めてください。Vercel の環境変数設定では、改行を含む値をそのまま貼り付けることができます。

### 4. Redis の設定

1. [Vercel Dashboard](https://vercel.com/dashboard)にログイン
2. プロジェクトの**Storage**タブから**Redis**を追加
3. Redis データベースを作成後、プロジェクトに接続
4. Vercel が自動的に`REDIS_URL`環境変数を設定します
5. ローカル開発環境では、`.env.local`に以下を設定：
   - `REDIS_URL`: Redis 接続 URL（例: `redis://default:password@host:port`）

### 5. LINE Bot の設定

1. [LINE Developers Console](https://developers.line.biz/console/)で Bot を作成
2. **Messaging API**チャンネルを作成
3. **チャンネルアクセストークン**を発行
4. **Webhook URL**を設定（デプロイ後）: `https://your-domain.vercel.app/api/line/webhook`
5. **Webhook の利用**を有効化
6. `.env.local`に以下を設定：
   - `LINE_CHANNEL_ACCESS_TOKEN`: チャンネルアクセストークン
   - `LINE_CHANNEL_SECRET`: チャンネルシークレット

### 6. Google フォーム送信の連携（オプション）

Google フォームの送信を検知してスプレッドシートに保存する場合：

1. `google-apps-script-helper.gs`をフォーム回答先のスプレッドシートに追加
2. スクリプトエディタで`NEXTJS_WEBHOOK_URL`を Script Properties に設定
3. トリガーを設定：`onFormSubmit`関数を「フォーム送信時」に実行

### 7. 開発サーバーの起動

```bash
npm run dev
```

開発サーバーは`http://localhost:3000`で起動します。

## デプロイ

### Vercel へのデプロイ

1. [Vercel](https://vercel.com)にログイン
2. プロジェクトをインポート（GitHub リポジトリから）
3. 環境変数を設定（`.env.local`の内容を Vercel Dashboard で設定）
4. デプロイ

または、Vercel CLI を使用：

```bash
npm install -g vercel
vercel
```

### 環境変数の設定（Vercel）

Vercel Dashboard の**Settings** > **Environment Variables**で以下を設定：

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `REDIS_URL`（Vercel が自動設定）
- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SHEETS_PROFILE_SHEET_NAME`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_FORM_BASE_URL`
- `GOOGLE_FORM_ENTRY_USERID`
- `EVENT_SITE_URL`
- `EVENT_HERO_IMAGE_URL`

## アーキテクチャ

- **Webhook**: `/app/api/line/webhook/route.ts` - LINE からの Webhook を受信
- **状態管理**: Redis（`line:user_state:${userId}`） - 会話状態を保存
- **データ保存**: Google Sheets API - アンケート回答をスプレッドシートに保存
- **設定管理**: `/lib/config.ts` - Google フォーム・スプレッドシート設定
- **質問フロー**: `/lib/questions.ts` - 質問の定義
- **Flex メッセージ**: `/lib/messages.ts` - LINE Flex メッセージの生成
- **フォーム送信**: `/app/api/line/form-submit/route.ts` - Google フォーム送信時の Webhook

## パフォーマンス

- **会話状態管理**: Redis を使用することで、Apps Script の ScriptProperties よりも高速
- **レスポンス時間**: Next.js + Vercel Edge Functions により、低レイテンシーを実現
- **スケーラビリティ**: Vercel の自動スケーリングにより、高負荷時も対応可能

## トラブルシューティング

### LINE Bot が応答しない

- Webhook URL が正しく設定されているか確認
- 環境変数が正しく設定されているか確認
- Vercel のログを確認

### スプレッドシートに保存されない

- サービスアカウントにスプレッドシートへの編集権限が付与されているか確認
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`と`GOOGLE_PRIVATE_KEY`が正しく設定されているか確認
- Google Sheets API が有効化されているか確認

### Redis に接続できない

- `REDIS_URL`が正しく設定されているか確認（Vercel では自動設定されます）
- Redis データベースがプロジェクトに接続されているか確認
- ローカル開発環境では`REDIS_URL`を手動で設定する必要があります
