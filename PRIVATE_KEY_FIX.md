# Google Service Account プライベートキー設定ガイド

`error:1E08010C:DECODER routines::unsupported`エラーを解決するためのガイドです。

---

## 🔍 問題の原因

このエラーは、`GOOGLE_PRIVATE_KEY`環境変数の形式が正しくない場合に発生します。Vercelの環境変数で、プライベートキーが正しく設定されていない可能性があります。

---

## ✅ 解決方法

### 1. Google Cloud Consoleからプライベートキーを取得

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを選択
3. **IAMと管理** > **サービスアカウント**を選択
4. サービスアカウントを選択（`intenexpoline@internexpo-line.iam.gserviceaccount.com`）
5. **キー**タブをクリック
6. **キーを追加** > **新しいキーを作成**をクリック
7. **JSON**を選択して**作成**をクリック
8. JSONファイルがダウンロードされます

### 2. JSONファイルからプライベートキーを取得

ダウンロードしたJSONファイルを開き、`private_key`フィールドの値をコピーします。

**重要**: 以下の形式でコピーしてください：

```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
（中略）
...
-----END PRIVATE KEY-----
```

### 3. Vercel Dashboardで環境変数を設定

1. [Vercel Dashboard](https://vercel.com/dashboard)にログイン
2. プロジェクトを選択
3. **Settings**タブをクリック
4. 左サイドバーから**Environment Variables**を選択
5. `GOOGLE_PRIVATE_KEY`を検索または追加
6. **Value**に、JSONファイルからコピーした`private_key`の値を**そのまま貼り付け**
   - 改行文字を含めてそのまま貼り付けてください
   - Vercelの環境変数設定では、改行を含む値をそのまま貼り付けることができます
7. **Environment**を選択（Production, Preview, Development）
8. **Save**をクリック

### 4. 環境変数の確認

設定後、以下を確認してください：

- `GOOGLE_PRIVATE_KEY`の値が正しく設定されているか
- 改行文字が含まれているか（`-----BEGIN PRIVATE KEY-----`と`-----END PRIVATE KEY-----`の間に改行があるか）

### 5. 再デプロイ

環境変数を更新した場合は、**Redeploy**を実行してください。

---

## ⚠️ よくある間違い

### ❌ 間違い1: エスケープ文字を手動で追加

```
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----
```

これは**不要**です。Vercelの環境変数設定では、改行を含む値をそのまま貼り付けることができます。

### ❌ 間違い2: 改行を削除

```
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY----------END PRIVATE KEY-----
```

これも**間違い**です。改行文字を含める必要があります。

### ✅ 正しい設定

```
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
（実際のキー）
...
-----END PRIVATE KEY-----
```

改行を含めてそのまま貼り付けてください。

---

## 🔍 確認方法

デプロイ後、Vercel Dashboard > Deployments > 最新のデプロイメント > Logs で以下を確認：

```
[Sheets] Private key processing: original length: XXX
[Sheets] Private key processing: after replace length: XXX
[Sheets] Private key starts with: -----BEGIN PRIVATE KEY-----
[Sheets] Auth client created successfully
```

エラーが発生しない場合は、正しく設定されています。

---

## 🆘 それでも解決しない場合

1. **新しいキーを作成**
   - Google Cloud Consoleで新しいキーを作成
   - 古いキーを削除
   - 新しいキーをVercelに設定

2. **ログを確認**
   - Vercel Dashboard > Deployments > Logs
   - エラーメッセージの全文を確認

3. **環境変数の値を確認**
   - Vercel Dashboard > Settings > Environment Variables
   - `GOOGLE_PRIVATE_KEY`の値を確認（目のアイコンをクリック）
   - 改行が含まれているか確認

