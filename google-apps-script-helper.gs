/**
 * Googleフォーム送信時にNext.js APIを呼び出すためのApps Scriptヘルパー
 *
 * 使用方法：
 * 1. フォーム回答先のスプレッドシートで、このスクリプトを追加
 * 2. トリガーを設定：onFormSubmit 関数を「フォーム送信時」に実行
 * 3. 環境変数を設定：Script Properties に NEXTJS_WEBHOOK_URL を設定
 */

const NEXTJS_WEBHOOK_URL =
  "https://your-domain.vercel.app/api/line/form-submit";

function onFormSubmit(e) {
  try {
    const named = e && e.namedValues ? e.namedValues : {};

    // userIdを抽出（質問タイトルから）
    const userIdQuestionTitle = "LINEユーザーID（自動入力）";
    const userId =
      named[userIdQuestionTitle] && named[userIdQuestionTitle][0]
        ? String(named[userIdQuestionTitle][0]).trim()
        : "";

    if (!userId) {
      console.log("userId not found in form submission");
      return;
    }

    // Next.js APIを呼び出し
    const url =
      PropertiesService.getScriptProperties().getProperty(
        "NEXTJS_WEBHOOK_URL"
      ) || NEXTJS_WEBHOOK_URL;

    const payload = {
      userId: userId,
      formData: named,
    };

    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    };

    const response = UrlFetchApp.fetch(url, options);
    console.log(
      "Next.js API response:",
      response.getResponseCode(),
      response.getContentText()
    );
  } catch (err) {
    console.log("onFormSubmit error:", err);
  }
}
