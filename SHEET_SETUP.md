# スプレッドシート設定ガイド

このドキュメントでは、テストアンケートの結果を保存するスプレッドシートの設定方法を説明します。

---

## 📋 スプレッドシートIDの取得方法

### 1. Googleスプレッドシートを開く

新しいテストアンケート用のスプレッドシートを開きます。

### 2. スプレッドシートIDを取得

ブラウザのアドレスバーからスプレッドシートIDを取得します。

**URL形式**: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`

**例**:
```
URL: https://docs.google.com/spreadsheets/d/1ABC123def456ghi789jkl012mno345pqr678stu901vwx234yz/edit
スプレッドシートID: 1ABC123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

### 3. シート名を確認

スプレッドシート下部のタブ名を確認します。

**例**: `テストアンケート`、`シート1`など

---

## 🔧 設定方法

### `lib/config.ts`を開く

```bash
code lib/config.ts
```

### `SHEET_CONFIGS`配列に追加

`SHEET_CONFIGS`配列に、新しいスプレッドシートの設定を追加します：

```typescript
export const SHEET_CONFIGS: SheetConfig[] = [
  {
    spreadsheetId: "新しいスプレッドシートID",
    sheetName: "シート名"
  },
  // 既存の設定も残す場合は、そのまま残します
  {
    spreadsheetId: "1W66Xwa6BNU8HKIvkniljjvut9G11qbmiQnta7eI5dkw",
    sheetName: "テストアンケート"
  },
];
```

---

## 📝 設定例

### 例1: 新しいテストアンケート用スプレッドシートのみに保存する場合

既存の設定を削除して、新しいスプレッドシートのみを設定します：

```typescript
export const SHEET_CONFIGS: SheetConfig[] = [
  {
    spreadsheetId: "新しいスプレッドシートID",
    sheetName: "テストアンケート"
  },
];
```

### 例2: 複数のスプレッドシートに並列で保存する場合

新しいスプレッドシートと既存のスプレッドシートの両方に保存します：

```typescript
export const SHEET_CONFIGS: SheetConfig[] = [
  {
    spreadsheetId: "新しいテストアンケート用スプレッドシートID",
    sheetName: "テストアンケート"
  },
  {
    spreadsheetId: "1W66Xwa6BNU8HKIvkniljjvut9G11qbmiQnta7eI5dkw",
    sheetName: "vol2_アンケート"
  },
];
```

---

## ⚠️ 重要な注意事項

### 1. サービスアカウントの権限設定

新しいスプレッドシートに、Google Service Accountのメールアドレスを共有する必要があります。

1. スプレッドシートを開く
2. **共有**ボタンをクリック
3. Google Service Accountのメールアドレスを追加
4. **編集権限**を付与

**Service Accountのメールアドレス**: `GOOGLE_SERVICE_ACCOUNT_EMAIL`環境変数で確認できます。

### 2. シート名の確認

シート名は、スプレッドシート下部のタブ名と完全に一致させる必要があります。

- 大文字小文字を区別します
- スペースも含めて正確に入力してください

### 3. 複数のスプレッドシートへの保存

`SHEET_CONFIGS`配列に複数の設定を追加すると、すべてのスプレッドシートに並列で保存されます。

---

## ✅ 動作確認

設定を変更した後：

1. ファイルを保存
2. 開発サーバーを再起動（`npm run dev`）
3. LINE Botでアンケートを回答
4. 新しいスプレッドシートに回答が保存されることを確認

---

## 🔍 トラブルシューティング

### スプレッドシートに保存されない

1. **サービスアカウントの権限を確認**
   - スプレッドシートにサービスアカウントのメールアドレスが追加されているか確認
   - **編集権限**が付与されているか確認

2. **シート名を確認**
   - シート名が正確に入力されているか確認
   - 大文字小文字、スペースが正確か確認

3. **スプレッドシートIDを確認**
   - URLから正しくコピーできているか確認
   - 余分な文字が含まれていないか確認

4. **ログを確認**
   - Vercel Dashboard > Deployments > Functions > `/api/line/webhook` > Logs
   - `[Sheets] Saving to sheet`というログを確認

---

## 📚 関連ドキュメント

- [CONFIG_GUIDE.md](./CONFIG_GUIDE.md) - 設定ファイルの詳細ガイド
- [GOOGLE_SETUP.md](./GOOGLE_SETUP.md) - Google Service Accountの設定方法

