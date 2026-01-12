# プロフィール送信後のおすすめ企業表示ガイド

## 📋 概要

プロフィールサイト（v0-jobvit.vercel.app）でユーザーがプロフィールを入力して送信した後、おすすめ企業のカードを表示する機能の実装ガイドです。

## 🔄 フロー

```
1. ユーザーがv0-jobvit.vercel.appでプロフィールを入力
   ↓
2. 送信ボタンをクリック
   ↓
3. POST /api/profile/submit にプロフィール情報を送信
   ↓
4. プロフィール情報を基におすすめ企業を計算
   ↓
5. v0-company-info-cards.vercel.appにリダイレクト
   （プロフィール情報とおすすめ企業IDを含む）
   ↓
6. v0-company-info-cards.vercel.appでおすすめ企業カードを表示
```

## 🔧 実装方法

### 1. プロフィール送信APIエンドポイント

`/app/api/profile/submit/route.ts` が作成されています。

**エンドポイント:** `POST /api/profile/submit`

**リクエストボディ:**
```json
{
  "userId": "LINE_USER_ID",
  "profile": {
    "email": "user@example.com",
    "bunri": "文系",
    "graduationYear": "2026",
    "industry": ["商社", "IT・通信"],
    "careerInterest": ["自分のスキルを活かせる", "グローバルで働く"],
    "prefecture": "東京都",
    "companySize": "大企業",
    "qualifications": ["TOEIC 800点以上"],
    "experience": ["長期インターン", "学生団体"]
  }
}
```

**レスポンス:**
- 成功: `302 Redirect` → `https://v0-company-info-cards.vercel.app?userId=...&profile=...&recommendedCompanies=...`
- エラー: `400 Bad Request` または `500 Internal Server Error`

### 2. v0-jobvit.vercel.app側の実装

プロフィールフォームの送信処理で、以下のようにAPIを呼び出します：

```typescript
async function handleProfileSubmit(formData: FormData) {
  // URLパラメータからLINEユーザーIDを取得
  const params = new URLSearchParams(window.location.search);
  const userId = params.get('lineUserId');
  
  if (!userId) {
    alert('LINEユーザーIDが取得できませんでした。');
    return;
  }

  // プロフィール情報を準備
  const profile = {
    email: formData.get('email'),
    bunri: formData.get('bunri'),
    graduationYear: formData.get('graduationYear'),
    industry: formData.getAll('industry'), // 複数選択
    careerInterest: formData.getAll('careerInterest'), // 複数選択
    prefecture: formData.get('prefecture'),
    companySize: formData.get('companySize'),
    qualifications: formData.getAll('qualifications'),
    experience: formData.getAll('experience'),
    // その他のフィールド
  };

  try {
    // APIに送信
    const response = await fetch('https://jobvit-test.vercel.app/api/profile/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        profile: profile,
      }),
    });

    if (response.ok) {
      // リダイレクトされるので、そのまま処理される
      // または、レスポンスからリダイレクトURLを取得して手動でリダイレクト
      const redirectUrl = response.headers.get('Location');
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    } else {
      const error = await response.json();
      alert(`エラー: ${error.message || 'プロフィールの送信に失敗しました。'}`);
    }
  } catch (error) {
    console.error('Error submitting profile:', error);
    alert('プロフィールの送信に失敗しました。');
  }
}
```

### 3. v0-company-info-cards.vercel.app側の実装

リダイレクト先のページで、URLパラメータからプロフィール情報とおすすめ企業IDを取得します：

```typescript
useEffect(() => {
  // URLパラメータから情報を取得
  const params = new URLSearchParams(window.location.search);
  const userId = params.get('userId');
  const profileJson = params.get('profile');
  const recommendedCompaniesParam = params.get('recommendedCompanies');
  
  if (profileJson) {
    const profile = JSON.parse(profileJson);
    console.log('Profile:', profile);
    
    // プロフィール情報を基におすすめ企業を取得
    if (recommendedCompaniesParam) {
      const recommendedCompanyIds = recommendedCompaniesParam.split(',');
      // おすすめ企業IDを使って企業情報を取得
      fetchRecommendedCompanies(recommendedCompanyIds);
    } else {
      // プロフィール情報を基におすすめ企業を計算
      calculateAndDisplayRecommendedCompanies(profile);
    }
  }
}, []);
```

## 🎯 おすすめ企業の計算ロジック

現在は簡易実装ですが、以下のようなロジックを実装できます：

1. **業種マッチング**: プロフィールの興味のある業種と企業の業種をマッチング
2. **スキルマッチング**: 資格や経験を基に企業の求めるスキルとマッチング
3. **地域マッチング**: 希望勤務地と企業の本社所在地をマッチング
4. **企業規模マッチング**: 希望する企業規模とマッチング

## 📝 実装チェックリスト

### v0-jobvit.vercel.app側
- [ ] プロフィールフォームの送信処理を実装
- [ ] LINEユーザーIDをURLパラメータから取得
- [ ] `/api/profile/submit`にPOSTリクエストを送信
- [ ] エラーハンドリングを実装

### v0-company-info-cards.vercel.app側
- [ ] URLパラメータからプロフィール情報を取得
- [ ] プロフィール情報を基におすすめ企業を計算/取得
- [ ] おすすめ企業のカードを表示
- [ ] エラーハンドリングを実装

### Next.js API側（jobvit-test）
- [x] `/api/profile/submit`エンドポイントを作成
- [ ] プロフィール情報の保存（オプション）
- [ ] おすすめ企業の計算ロジックを実装（現在は簡易実装）

## 🔍 デバッグ方法

1. **ブラウザの開発者ツール**でネットワークリクエストを確認
2. **Vercelのログ**でAPIの実行状況を確認
3. **URLパラメータ**を確認して、正しく渡されているか確認

## 📞 トラブルシューティング

### 問題1: リダイレクトされない

**原因:** APIのレスポンスが正しくない

**解決方法:**
- Vercelのログでエラーを確認
- レスポンスのステータスコードを確認

### 問題2: プロフィール情報が取得できない

**原因:** URLパラメータのエンコード/デコードの問題

**解決方法:**
- `encodeURIComponent`と`decodeURIComponent`を使用
- JSON文字列のエスケープを確認

### 問題3: おすすめ企業が表示されない

**原因:** おすすめ企業の計算ロジックが未実装

**解決方法:**
- `calculateRecommendedCompanies`関数を実装
- v0-company-info-cards.vercel.app側でプロフィール情報を基に計算

