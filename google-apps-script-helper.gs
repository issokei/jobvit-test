/**
 * Googleフォーム送信時にNext.js APIを呼び出すためのApps Scriptヘルパー
 *
 * 使用方法：
 * 1. フォーム回答先のスプレッドシートで、このスクリプトを追加
 * 2. トリガーを設定：onFormSubmit 関数を「フォーム送信時」に実行
 * 3. 環境変数を設定：Script Properties に NEXTJS_WEBHOOK_URL を設定
 * 4. LINEユーザーIDの質問タイトルを確認：デフォルトは「LINEユーザーID（自動入力）」
 */

const NEXTJS_WEBHOOK_URL =
  "https://your-domain.vercel.app/api/line/form-submit";

// LINEユーザーIDを含む質問のタイトル（フォームの質問タイトルと一致させる）
const LINE_USER_ID_QUESTION_TITLES = [
  "LINEユーザーID（自動入力）",
  "LINEユーザーID",
  "LINEユーザID",
  "ユーザーID",
  "userId",
];

function onFormSubmit(e) {
  try {
    Logger.log("=== onFormSubmit START ===");

    const named = e && e.namedValues ? e.namedValues : {};
    Logger.log("Form submission received");
    Logger.log("Available question titles:", Object.keys(named));

    // userIdを抽出（複数の質問タイトルパターンを試す）
    let userId = "";
    for (const title of LINE_USER_ID_QUESTION_TITLES) {
      if (named[title] && named[title][0]) {
        userId = String(named[title][0]).trim();
        Logger.log(
          "Found userId from question title:",
          title,
          "userId:",
          userId
        );
        break;
      }
    }

    // 見つからない場合、すべての質問をログに出力してデバッグ
    if (!userId) {
      Logger.log("WARNING: userId not found in form submission");
      Logger.log("All question titles and values:");
      for (const key in named) {
        Logger.log("  - " + key + ": " + JSON.stringify(named[key]));
      }

      // エラーを通知するために、Next.js APIにエラー情報を送信
      const url =
        PropertiesService.getScriptProperties().getProperty(
          "NEXTJS_WEBHOOK_URL"
        ) || NEXTJS_WEBHOOK_URL;
      const errorPayload = {
        error: "userId_not_found",
        message: "LINEユーザーIDが見つかりませんでした",
        availableQuestions: Object.keys(named),
      };

      try {
        const errorResponse = UrlFetchApp.fetch(url, {
          method: "post",
          contentType: "application/json",
          payload: JSON.stringify(errorPayload),
          muteHttpExceptions: true,
        });
        Logger.log("Error notification sent:", errorResponse.getResponseCode());
      } catch (err) {
        Logger.log("Failed to send error notification:", err);
      }

      return;
    }

    // Next.js APIを呼び出し
    const url =
      PropertiesService.getScriptProperties().getProperty(
        "NEXTJS_WEBHOOK_URL"
      ) || NEXTJS_WEBHOOK_URL;

    Logger.log("Calling Next.js API:", url);

    const payload = {
      userId: userId,
      formData: named,
    };

    Logger.log("Payload prepared, userId:", userId);
    Logger.log("FormData keys count:", Object.keys(named).length);

    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      // タイムアウト設定（30秒）
      // フォーム送信時に即座に処理を開始するため、タイムアウトを長めに設定
    };

    // 即座にAPIを呼び出し（フォーム送信と同時に処理開始）
    const startTime = new Date().getTime();
    const response = UrlFetchApp.fetch(url, options);
    const endTime = new Date().getTime();
    const responseTime = endTime - startTime;

    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    Logger.log("=== Next.js API Response ===");
    Logger.log("Response Time:", responseTime + "ms");
    Logger.log("Status Code:", responseCode);
    Logger.log("Response:", responseText);

    if (responseCode !== 200) {
      Logger.log("ERROR: Next.js API returned non-200 status");
      Logger.log("Response body:", responseText);
    } else {
      Logger.log("SUCCESS: Next.js API call completed");
      try {
        const responseJson = JSON.parse(responseText);
        Logger.log("Response JSON:", JSON.stringify(responseJson));

        // 採点結果が含まれているか確認
        if (responseJson.scoring) {
          Logger.log("Scoring result:", JSON.stringify(responseJson.scoring));
          Logger.log(
            "採点完了: " +
              responseJson.scoring.grade +
              "評価 (" +
              responseJson.scoring.percentage +
              "%)"
          );
        }
      } catch (parseError) {
        Logger.log("Failed to parse response as JSON:", parseError);
      }
    }

    Logger.log("=== onFormSubmit END ===");
  } catch (err) {
    Logger.log("ERROR in onFormSubmit:", err);
    Logger.log("Error details:", err.toString());
    if (err.stack) {
      Logger.log("Stack trace:", err.stack);
    }
  }
}

/**
 * テスト用関数：手動で実行して設定を確認
 */
function testFormSubmit() {
  Logger.log("=== Test Form Submit ===");
  Logger.log(
    "NEXTJS_WEBHOOK_URL:",
    PropertiesService.getScriptProperties().getProperty("NEXTJS_WEBHOOK_URL") ||
      NEXTJS_WEBHOOK_URL
  );
  Logger.log("LINE_USER_ID_QUESTION_TITLES:", LINE_USER_ID_QUESTION_TITLES);

  // モックデータでテスト
  const mockEvent = {
    namedValues: {
      "LINEユーザーID（自動入力）": ["test-user-id-123"],
      質問1: ["回答1"],
      質問2: ["回答2"],
    },
  };

  Logger.log("Testing with mock data...");
  onFormSubmit(mockEvent);
}
