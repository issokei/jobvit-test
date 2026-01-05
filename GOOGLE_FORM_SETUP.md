# Googleフォーム設定ガイド

## 🔧 セットアップ手順

### 1. Google Apps Scriptの設定

1. **スプレッドシートを開く**
   - Googleフォームの回答先スプレッドシートを開きます

2. **Apps Scriptエディタを開く**
   - メニューから「拡張機能」→「Apps Script」を選択

3. **スクリプトを追加**
   - `google-apps-script-helper.gs`の内容をコピーして貼り付け

4. **環境変数を設定**
   - 左側の「プロジェクトの設定」（歯車アイコン）をクリック
   - 「スクリプト プロパティ」セクションで「スクリプト プロパティを追加」をクリック
   - プロパティ名: `NEXTJS_WEBHOOK_URL`
   - 値: `https://your-domain.vercel.app/api/line/form-submit`
     - `your-domain.vercel.app`を実際のVercelのドメインに置き換えてください

5. **トリガーを設定**
   - 左側の「トリガー」（時計アイコン）をクリック
   - 「トリガーを追加」をクリック
   - 設定:
     - 実行する関数: `onFormSubmit`
     - イベントのソース: `フォームから`
     - イベントの種類: `フォーム送信時`
   - 「保存」をクリック

### 2. Googleフォームの設定

1. **LINEユーザーIDの質問を追加**
   - フォームに「LINEユーザーID（自動入力）」というタイトルの質問を追加
   - 質問タイプ: 短答形式テキスト
   - 説明: 「このフィールドは自動入力されます」

2. **質問タイトルの確認**
   - LINEユーザーIDを含む質問のタイトルが、以下のいずれかと一致しているか確認:
     - `LINEユーザーID（自動入力）`
     - `LINEユーザーID`
     - `LINEユーザID`
     - `ユーザーID`
     - `userId`

3. **フォームURLにLINEユーザーIDを埋め込む**
   - イベントカードのフォームURLに`entry.XXXXX=LINE_USER_ID`のようなパラメータを追加
   - または、Google Apps ScriptでURLパラメータから取得するように設定

### 3. デバッグ方法

#### Google Apps Scriptのログを確認

1. **Apps Scriptエディタでログを確認**
   - フォームを送信後、Apps Scriptエディタに戻る
   - 左側の「実行数」（時計アイコン）をクリック
   - 最新の実行をクリックしてログを確認

2. **テスト関数を実行**
   - Apps Scriptエディタで`testFormSubmit`関数を選択
   - 「実行」ボタンをクリック
   - ログで設定が正しいか確認

#### Next.js APIのログを確認

1. **Vercelのログを確認**
   - Vercelダッシュボードにログイン
   - プロジェクトを選択
   - 「Functions」タブで`/api/line/form-submit`のログを確認

2. **ログで確認すべきポイント**
   - `[FormSubmit] Received form submission` - リクエストが受信されたか
   - `[FormSubmit] userId:` - userIdが正しく取得できているか
   - `[FormSubmit] formData keys:` - フォームデータが正しく送信されているか
   - `[FormSubmit] Starting AI scoring...` - 採点処理が開始されたか
   - `[FormSubmit] Scoring result sent successfully` - LINEへの送信が成功したか

## ⚠️ よくある問題と解決方法

### 問題1: userIdが見つからない

**症状**: ログに「userId not found in form submission」と表示される

**解決方法**:
1. Googleフォームの質問タイトルを確認
2. `LINE_USER_ID_QUESTION_TITLES`配列に質問タイトルを追加
3. フォームURLにLINEユーザーIDが正しく埋め込まれているか確認

### 問題2: Next.js APIが呼び出されない

**症状**: Apps Scriptのログに「Next.js API response」が表示されない

**解決方法**:
1. トリガーが正しく設定されているか確認
2. `NEXTJS_WEBHOOK_URL`が正しく設定されているか確認
3. VercelのURLが正しいか確認（`https://`で始まっているか）

### 問題3: LINEにメッセージが送信されない

**症状**: Next.js APIは成功しているが、LINEにメッセージが届かない

**解決方法**:
1. `LINE_CHANNEL_ACCESS_TOKEN`と`LINE_CHANNEL_SECRET`が正しく設定されているか確認
2. userIdが正しいLINEユーザーIDか確認
3. LINE Botがユーザーをブロックしていないか確認

### 問題4: 採点処理が失敗する

**症状**: ログに「Failed to score with AI」と表示される

**解決方法**:
1. `OPENAI_API_KEY`が正しく設定されているか確認
2. OpenAI APIのクォータを確認
3. フォームデータの形式が正しいか確認

## 📝 チェックリスト

- [ ] Google Apps Scriptにスクリプトを追加
- [ ] `NEXTJS_WEBHOOK_URL`を設定
- [ ] トリガーを設定（フォーム送信時）
- [ ] GoogleフォームにLINEユーザーIDの質問を追加
- [ ] 質問タイトルが正しいか確認
- [ ] フォームURLにLINEユーザーIDを埋め込む
- [ ] テスト送信を実行してログを確認

