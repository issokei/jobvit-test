# Supabase 企業情報取得 トラブルシューティングガイド

## エラー: 「企業情報の取得に失敗しました」

このエラーが発生する場合、以下の原因が考えられます。

## 🔍 確認事項

### 1. 環境変数の設定確認

Vercel の環境変数に以下が設定されているか確認してください：

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

**確認方法:**

1. Vercel Dashboard にログイン
2. プロジェクトを選択
3. **Settings** → **Environment Variables**を開く
4. `SUPABASE_URL`と`SUPABASE_ANON_KEY`が設定されているか確認

**注意:**

- `SUPABASE_URL`は`https://`で始まる必要があります
- `SUPABASE_ANON_KEY`は`anon`または`public`キーを使用してください（`service_role`キーは使用しないでください）

### 2. Supabase パッケージのインストール確認

`@supabase/supabase-js`パッケージがインストールされているか確認：

```bash
npm list @supabase/supabase-js
```

インストールされていない場合：

```bash
npm install @supabase/supabase-js
```

### 3. Supabase テーブルの存在確認

Supabase ダッシュボードで以下を確認：

1. **Table Editor**を開く
2. `company-info-test`テーブルが存在するか確認
3. テーブルにデータが入っているか確認

### 4. RLS（Row Level Security）ポリシーの確認

Supabase の RLS が有効になっている場合、適切なポリシーを設定する必要があります。

**確認方法:**

1. Supabase ダッシュボードで`company-info-test`テーブルを開く
2. **Authentication** → **Policies**を確認
3. RLS が有効になっている場合、以下のポリシーを追加：

```sql
-- 全ユーザーが読み取り可能にする
CREATE POLICY "Allow public read access" ON "company-info-test"
FOR SELECT
USING (true);
```

または、RLS を無効にする（開発環境のみ推奨）：

```sql
ALTER TABLE "company-info-test" DISABLE ROW LEVEL SECURITY;
```

### 5. テーブル名の確認

テーブル名が正確か確認してください。ハイフンが含まれる場合、Supabase では引用符で囲む必要がある場合があります。

現在のコードでは`company-info-test`を使用していますが、実際のテーブル名が異なる場合は修正が必要です。

### 6. カラム名の確認

テーブルのカラム名が以下の通りか確認：

- `company_name`
- `company_name_kana`
- `industry_large`
- `industry_middle`
- `industry_small`
- `is_listed`
- `headquarters_prefecture`
- `website_url`

## 🐛 よくあるエラーと解決方法

### エラー 1: "Supabase credentials are not configured"

**原因:** 環境変数が設定されていない

**解決方法:**

1. Vercel の環境変数を確認
2. 環境変数を設定後、再デプロイ

### エラー 2: "relation \"company-info-test\" does not exist"

**原因:** テーブルが存在しない、またはテーブル名が間違っている

**解決方法:**

1. Supabase ダッシュボードでテーブル名を確認
2. テーブルが存在しない場合は作成
3. テーブル名が異なる場合は、コード内のテーブル名を修正

### エラー 3: "new row violates row-level security policy"

**原因:** RLS ポリシーでアクセスが拒否されている

**解決方法:**

1. RLS ポリシーを確認
2. 上記の「RLS（Row Level Security）ポリシーの確認」を参照してポリシーを設定

### エラー 4: "permission denied for table company-info-test"

**原因:** データベースへのアクセス権限がない

**解決方法:**

1. Supabase の`anon`キーが正しく設定されているか確認
2. RLS ポリシーを確認

## 📝 デバッグ方法

### ログの確認

Vercel のログで以下の情報を確認：

1. `[Supabase] Checking environment variables...` - 環境変数の確認
2. `[Supabase] Client created successfully` - クライアント作成成功
3. `[Supabase] Getting companies from company-info-test table...` - データ取得開始
4. `[Supabase] Fetched companies successfully:` - データ取得成功

エラーが発生している場合は、エラーメッセージとスタックトレースを確認してください。

### 手動テスト

Supabase ダッシュボードの SQL エディタで以下を実行して、テーブルにアクセスできるか確認：

```sql
SELECT * FROM "company-info-test" ORDER BY company_name LIMIT 10;
```

このクエリが成功する場合、テーブルとデータは正しく設定されています。

## ✅ チェックリスト

- [ ] `SUPABASE_URL`環境変数が設定されている
- [ ] `SUPABASE_ANON_KEY`環境変数が設定されている
- [ ] `@supabase/supabase-js`パッケージがインストールされている
- [ ] `company-info-test`テーブルが存在する
- [ ] テーブルにデータが入っている
- [ ] RLS ポリシーが適切に設定されている（または RLS が無効）
- [ ] テーブル名とカラム名がコードと一致している
- [ ] Vercel に再デプロイ済み

## 📞 サポート

上記を確認しても解決しない場合、Vercel のログに出力されているエラーメッセージを確認して、具体的なエラー内容を共有してください。
