# Vercel環境変数設定ガイド

現在のコードでVercelに設定しなければいけない環境変数の一覧です。

---

## ✅ 必須環境変数

以下の環境変数は**必須**です。設定しないとアプリケーションが動作しません。

### 1. LINE Bot設定

| 環境変数名 | 説明 | 取得方法 |
|-----------|------|---------|
| `LINE_CHANNEL_ACCESS_TOKEN` | LINEチャネルアクセストークン | [LINE Developers Console](https://developers.line.biz/console/) > チャネル > Messaging API > チャネルアクセストークン |
| `LINE_CHANNEL_SECRET` | LINEチャネルシークレット | [LINE Developers Console](https://developers.line.biz/console/) > チャネル > 基本設定 > チャネルシークレット |

### 2. Redis設定

| 環境変数名 | 説明 | 取得方法 |
|-----------|------|---------|
| `REDIS_URL` または `LINE_REDIS_URL` | Redis接続URL | Vercel Dashboard > Storage > Redis > 接続URL |

**注意**: どちらか一方を設定すればOKです。両方設定されている場合は`LINE_REDIS_URL`が優先されます。

### 3. Google Service Account設定

| 環境変数名 | 説明 | 取得方法 |
|-----------|------|---------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | サービスアカウントのメールアドレス | Google Cloud Console > IAMと管理 > サービスアカウント > メールアドレス |
| `GOOGLE_PRIVATE_KEY` | サービスアカウントのプライベートキー | Google Cloud Console > IAMと管理 > サービスアカウント > キー > JSONキーから`private_key`を取得 |

**重要**: `GOOGLE_PRIVATE_KEY`は改行文字`\n`を含む必要があります。JSONファイルからそのままコピーしてください。

---

## ⚠️ コード内で設定済み（環境変数不要）

以下の設定は`lib/config.ts`で設定されているため、**環境変数を設定する必要はありません**。

### フォーム設定

- `FORM_CONFIGS` - `lib/config.ts`で設定済み
- 環境変数 `GOOGLE_FORM_BASE_URL`、`GOOGLE_FORM_ENTRY_USERID`、`GOOGLE_FORM_CONFIGS`は不要

### スプレッドシート設定

- `SHEET_CONFIGS` - `lib/config.ts`で設定済み
- 環境変数 `GOOGLE_SHEETS_SPREADSHEET_ID`、`GOOGLE_SHEETS_PROFILE_SHEET_NAME`、`GOOGLE_SHEETS_CONFIGS`は不要

**注意**: 環境変数が設定されている場合、コード内の設定と環境変数の設定の両方が使用される可能性があります。コード内の設定のみを使用したい場合は、これらの環境変数を削除してください。

---

## 🔧 オプション環境変数

以下の環境変数は**オプション**です。設定しなくても動作しますが、設定すると機能が有効になります。

| 環境変数名 | 説明 | デフォルト値 |
|-----------|------|------------|
| `EVENT_SITE_URL` | イベントサイトURL | `https://www.intern-expo.com` |
| `EVENT_HERO_IMAGE_URL` | イベントヒーロー画像URL | なし |

---

## 📋 Vercel Dashboardでの設定手順

1. [Vercel Dashboard](https://vercel.com/dashboard)にログイン
2. プロジェクトを選択
3. **Settings**タブをクリック
4. 左サイドバーから**Environment Variables**を選択
5. **Add New**をクリック
6. 以下の環境変数を追加：

### 必須環境変数

```
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret
REDIS_URL=redis://default:password@host:port
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

### オプション環境変数（必要に応じて）

```
EVENT_SITE_URL=https://www.intern-expo.com
EVENT_HERO_IMAGE_URL=https://example.com/image.jpg
```

7. **Environment**を選択（Production, Preview, Development）
8. **Save**をクリック
9. 環境変数を更新した場合は、**Redeploy**を実行

---

## ✅ 設定確認チェックリスト

以下のチェックリストを使用して、環境変数が正しく設定されているか確認してください：

### 必須環境変数

- [ ] `LINE_CHANNEL_ACCESS_TOKEN`が設定されている
- [ ] `LINE_CHANNEL_SECRET`が設定されている
- [ ] `REDIS_URL`または`LINE_REDIS_URL`が設定されている
- [ ] `GOOGLE_SERVICE_ACCOUNT_EMAIL`が設定されている
- [ ] `GOOGLE_PRIVATE_KEY`が設定されている（改行文字`\n`を含む）

### オプション環境変数（必要に応じて）

- [ ] `EVENT_SITE_URL`が設定されている（デフォルト値を使用する場合は不要）
- [ ] `EVENT_HERO_IMAGE_URL`が設定されている（画像を使用する場合のみ）

### 環境変数の削除（コード内で設定済みのため不要）

- [ ] `GOOGLE_SHEETS_SPREADSHEET_ID`を削除（`lib/config.ts`で設定済み）
- [ ] `GOOGLE_SHEETS_PROFILE_SHEET_NAME`を削除（`lib/config.ts`で設定済み）
- [ ] `GOOGLE_SHEETS_CONFIGS`を削除（`lib/config.ts`で設定済み）
- [ ] `GOOGLE_FORM_BASE_URL`を削除（`lib/config.ts`で設定済み）
- [ ] `GOOGLE_FORM_ENTRY_USERID`を削除（`lib/config.ts`で設定済み）
- [ ] `GOOGLE_FORM_CONFIGS`を削除（`lib/config.ts`で設定済み）

---

## 🔍 動作確認

デプロイ後、Vercel Dashboard > Deployments > Functions > `/api/line/webhook` > Logs で以下を確認：

```
[Webhook] Received request
[KV] Redis URL format: redis // host:port
[Sheets] Service account email: set
[Sheets] Private key: set (length: XXX)
[Sheets] Using code-based sheet configurations: 1
```

すべてのログが正常に表示されていれば、環境変数は正しく設定されています。

---

## 📚 関連ドキュメント

- [CONFIG_GUIDE.md](./CONFIG_GUIDE.md) - コード内での設定方法
- [ENV_VARIABLES.md](./ENV_VARIABLES.md) - 環境変数の詳細説明
- [GOOGLE_SETUP.md](./GOOGLE_SETUP.md) - Google Service Accountの設定方法

