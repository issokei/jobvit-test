# トラブルシューティングガイド

スプレッドシートに保存されない問題を解決するためのガイドです。

---

## 🔍 確認手順

### 1. Vercel のログを確認

まず、Vercel Dashboard でログを確認して、エラーが発生しているか確認してください。

#### 方法 1: Deployment Details の Logs タブから確認（推奨）

1. [Vercel Dashboard](https://vercel.com/dashboard)にログイン
2. プロジェクトを選択
3. **Deployments**タブをクリック
4. 最新のデプロイメントを選択
5. 上部のタブから**Logs**をクリック
6. ログを確認（必要に応じてフィルターで`/api/line/webhook`を検索）

#### 方法 2: Runtime Logs カードから確認

1. [Vercel Dashboard](https://vercel.com/dashboard)にログイン
2. プロジェクトを選択
3. **Deployments**タブをクリック
4. 最新のデプロイメントを選択
5. ページ下部の**Runtime Logs**カードをクリック
6. ログを確認（必要に応じてフィルターで`/api/line/webhook`を検索）

#### 方法 3: プロジェクトの Logs から確認

1. [Vercel Dashboard](https://vercel.com/dashboard)にログイン
2. プロジェクトを選択
3. 左サイドバーから**Logs**を選択
4. 最新のログを確認

#### 確認すべきログ

**正常な場合:**

```
[handleMessage] Attempting to save to sheet...
[Sheets] ===== START saveProfileToSheet =====
[Sheets] userId: U...
[Sheets] answers: {...}
[Sheets] Saving to 1 sheet(s)
[Sheets] Saving to sheet 1/1: 1edatXCNj9UJX8iD35qhT8L8DecT64TbGyTObutWyrp0 シート1
[Sheets] ✅ Successfully saved to sheet 1/1
[Sheets] ===== SUCCESS saveProfileToSheet (all sheets) =====
[handleMessage] ✅ Profile saved to sheet successfully
```

**エラーが発生している場合:**

```
[Sheets] ❌ Failed to save to sheet 1/1: [エラー内容]
[Sheets] Error message: [エラーメッセージ]
[handleMessage] ❌ saveProfileToSheet failed: [エラー内容]
```

---

## ⚠️ よくある原因と解決方法

### 0. Google Sheets API が有効化されていない

**症状**: ログに`Google Sheets API has not been used in project XXX before or it is disabled`というエラーが表示される

**解決方法**:

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクト ID を確認（エラーメッセージに表示されているプロジェクト ID）
3. 以下のリンクから直接 Google Sheets API を有効化：
   - プロジェクト ID が`126305308570`の場合: https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=126305308570
4. **有効にする**ボタンをクリック
5. API が有効化されるまで数分待機
6. 再デプロイして動作確認

**詳細**: [GOOGLE_SHEETS_API_SETUP.md](./GOOGLE_SHEETS_API_SETUP.md)を参照してください。

---

### 1. Google Service Account の権限設定が不足している

**症状**: ログに`Permission denied`や`The caller does not have permission`というエラーが表示される

**解決方法**:

1. スプレッドシートを開く: https://docs.google.com/spreadsheets/d/1edatXCNj9UJX8iD35qhT8L8DecT64TbGyTObutWyrp0/edit
2. **共有**ボタンをクリック
3. Google Service Account のメールアドレスを追加
   - メールアドレス: `intenexpoline@internexpo-line.iam.gserviceaccount.com`
   - （`.env.local`の`GOOGLE_SERVICE_ACCOUNT_EMAIL`の値）
4. **編集権限**を付与
5. **送信**をクリック

**確認方法**: Vercel Dashboard > Settings > Environment Variables で`GOOGLE_SERVICE_ACCOUNT_EMAIL`の値を確認

---

### 2. シート名が間違っている

**症状**: ログに`Unable to parse range`や`not found`というエラーが表示される

**解決方法**:

1. スプレッドシートを開く
2. 下部のタブ名を確認（例: `シート1`、`Sheet1`など）
3. `lib/config.ts`の`sheetName`が正確に一致しているか確認

**現在の設定**:

```typescript
export const SHEET_CONFIGS: SheetConfig[] = [
  {
    spreadsheetId: "1edatXCNj9UJX8iD35qhT8L8DecT64TbGyTObutWyrp0",
    sheetName: "シート1", // ← この値がスプレッドシートのタブ名と一致しているか確認
  },
];
```

**注意**:

- 大文字小文字を区別します
- スペースも含めて正確に入力してください
- 日本語のシート名の場合は、全角・半角も確認してください

---

### 3. スプレッドシート ID が間違っている

**症状**: ログに`Unable to parse range`や`not found`というエラーが表示される

**解決方法**:

1. スプレッドシートの URL を確認
2. URL 形式: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`
3. `lib/config.ts`の`spreadsheetId`が正確か確認

**現在の設定**:

```typescript
spreadsheetId: "1edatXCNj9UJX8iD35qhT8L8DecT64TbGyTObutWyrp0";
```

---

### 4. Google Service Account の認証情報が間違っている

**症状**: ログに`Invalid credentials`や`Authentication failed`というエラーが表示される

**解決方法**:

1. Vercel Dashboard > Settings > Environment Variables で以下を確認：
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`が正しく設定されているか
   - `GOOGLE_PRIVATE_KEY`が正しく設定されているか（改行文字`\n`を含む必要があります）

**確認方法**: ログで以下を確認

```
[Sheets] Service account email: set  ← 設定されている
[Sheets] Private key: set (length: XXX)  ← 設定されている
```

---

### 5. 環境変数が設定されていない

**症状**: ログに`NOT SET`と表示される

**解決方法**:

1. Vercel Dashboard > Settings > Environment Variables で以下を確認：
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
2. 設定されていない場合は追加
3. 環境変数を更新した場合は、**Redeploy**を実行

---

### 6. スプレッドシートが削除されている、またはアクセスできない

**症状**: ログに`not found`というエラーが表示される

**解決方法**:

1. スプレッドシートが存在するか確認
2. スプレッドシートの URL にアクセスできるか確認
3. スプレッドシート ID が正しいか確認

---

## 🔧 デバッグ方法

### ログの確認ポイント

1. **アンケート完了時のログ**

   ```
   [handleMessage] ===== ALL QUESTIONS COMPLETED =====
   [handleMessage] Attempting to save to sheet...
   ```

2. **スプレッドシート保存開始のログ**

   ```
   [Sheets] ===== START saveProfileToSheet =====
   [Sheets] Saving to 1 sheet(s)
   ```

3. **エラーログ**
   ```
   [Sheets] ❌ Failed to save to sheet 1/1: [エラー内容]
   [handleMessage] ❌ saveProfileToSheet failed: [エラー内容]
   ```

### テスト方法

1. LINE Bot でアンケートを完了
2. Vercel Dashboard でログを確認
3. エラーメッセージを確認
4. 上記の解決方法を試す

---

## 📋 チェックリスト

以下のチェックリストを使用して、問題を特定してください：

- [ ] Google Service Account のメールアドレスがスプレッドシートに共有されている
- [ ] Google Service Account に**編集権限**が付与されている
- [ ] `lib/config.ts`の`spreadsheetId`が正しい
- [ ] `lib/config.ts`の`sheetName`がスプレッドシートのタブ名と完全に一致している
- [ ] Vercel Dashboard で`GOOGLE_SERVICE_ACCOUNT_EMAIL`が設定されている
- [ ] Vercel Dashboard で`GOOGLE_PRIVATE_KEY`が設定されている（改行文字`\n`を含む）
- [ ] 環境変数を更新した場合は、**Redeploy**を実行した
- [ ] Vercel Dashboard のログでエラーメッセージを確認した

---

## 🆘 それでも解決しない場合

1. **ログの全文を確認**

   - Vercel Dashboard > Deployments > 最新のデプロイメント > Logs
   - または Vercel Dashboard > Logs > Runtime Logs
   - エラーメッセージの全文をコピー

2. **設定を確認**

   - `lib/config.ts`の内容を確認
   - Vercel Dashboard の環境変数を確認

3. **スプレッドシートの状態を確認**
   - スプレッドシートが存在するか
   - スプレッドシートにアクセスできるか
   - シート名が正しいか

---

## 📚 関連ドキュメント

- [VERCEL_ENV_VARIABLES.md](./VERCEL_ENV_VARIABLES.md) - 環境変数の設定方法
- [SHEET_SETUP.md](./SHEET_SETUP.md) - スプレッドシートの設定方法
