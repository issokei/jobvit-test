/**
 * 設定ファイル
 * 
 * このファイルで、Googleフォーム、スプレッドシートなどの設定を直接編集できます。
 * 環境変数が設定されている場合は、環境変数が優先されます。
 */

// ============================================
// Google フォーム設定
// ============================================

export interface FormConfig {
  baseUrl: string;
  entryUserId: string;
}

/**
 * Googleフォーム設定
 * 各イベントごとに異なるフォームURLとEntry IDを設定できます。
 * 
 * 設定例:
 * [
 *   {
 *     baseUrl: "https://docs.google.com/forms/d/e/イベント1のフォームID/viewform",
 *     entryUserId: "2064951943"  // イベント1のEntry ID
 *   },
 *   {
 *     baseUrl: "https://docs.google.com/forms/d/e/イベント2のフォームID/viewform",
 *     entryUserId: "9876543210"  // イベント2のEntry ID（イベント1とは異なります）
 *   }
 * ]
 */

export const FORM_CONFIGS: FormConfig[] = [
  // ここにフォーム設定を追加してください
  // {
  //   baseUrl: "https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform",
  //   entryUserId: "YOUR_ENTRY_ID"
  // },
    {
      baseUrl: "https://docs.google.com/forms/d/e/1FAIpQLScE8ZUsI2-n4T_JTLHKqwamgNCZm_BkG56VtTzuPwiY9xk1QA/viewform",
      entryUserId: "784163745"  // イベント1のEntry ID
    }
];

// ============================================
// Google スプレッドシート設定
// ============================================

export interface SheetConfig {
  spreadsheetId: string;
  sheetName: string;
}

/**
 * Googleスプレッドシート設定
 * 複数のスプレッドシートに並列で保存できます。
 * 
 * 設定例:
 * [
 *   {
 *     spreadsheetId: "1boON8DixNmUKDwqI5wAwTMgoSe_jWwO7lT0FFsOlkXo",
 *     sheetName: "テストアンケート"
 *   },
 *   {
 *     spreadsheetId: "2ABC123def456ghi789jkl012mno345pqr678stu901vwx234yz",
 *     sheetName: "統合シート"
 *   }
 * ]
 */
export const SHEET_CONFIGS: SheetConfig[] = [
  {
    spreadsheetId: "1r6gIqF_mKlmZ6WhcyOBQ0ktCd86IwSPSm5cVuAUr6qg",
    sheetName: "フォームの回答１"
  }
];

