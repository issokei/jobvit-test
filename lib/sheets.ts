import { google } from 'googleapis';
import { UserAnswers } from './types';
import { FORM_CONFIGS, SHEET_CONFIGS, FormConfig, SheetConfig } from './config';

let authClient: any = null;

function getAuthClient() {
  if (authClient) {
    console.log('[Sheets] Using existing auth client');
    return authClient;
  }

  console.log('[Sheets] Creating new auth client...');
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  
  // プライベートキーの処理
  if (privateKey) {
    // Vercel環境変数では、改行が\nとして保存されている可能性がある
    // また、実際の改行文字として保存されている可能性もある
    privateKey = privateKey.replace(/\\n/g, '\n');
    // 既に改行文字が含まれている場合はそのまま使用
    console.log('[Sheets] Private key processing: original length:', process.env.GOOGLE_PRIVATE_KEY?.length || 0);
    console.log('[Sheets] Private key processing: after replace length:', privateKey.length);
    console.log('[Sheets] Private key starts with:', privateKey.substring(0, 30));
  }

  console.log('[Sheets] Service account email:', serviceAccountEmail ? 'set' : 'NOT SET');
  console.log('[Sheets] Private key:', privateKey ? `set (length: ${privateKey.length})` : 'NOT SET');

  if (!serviceAccountEmail || !privateKey) {
    console.error('[Sheets] Google Service Account credentials are not configured');
    throw new Error('Google Service Account credentials are not configured');
  }

  authClient = new google.auth.JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  console.log('[Sheets] Auth client created successfully');
  return authClient;
}


async function getSheetConfigs(): Promise<SheetConfig[]> {
  console.log('[Sheets] Getting sheet configurations...');
  
  const configs: SheetConfig[] = [];
  
  // 優先順位1: コード内の設定（lib/config.ts）
  if (SHEET_CONFIGS.length > 0) {
    configs.push(...SHEET_CONFIGS);
    console.log('[Sheets] Using code-based sheet configurations:', SHEET_CONFIGS.length);
  }
  
  // 優先順位2: 環境変数（後方互換性）
  // コード内の設定がある場合は、環境変数は無視する（コード内の設定を優先）
  if (SHEET_CONFIGS.length === 0) {
    // 形式1: 複数設定（JSON形式）
    const multipleConfigsJson = process.env.GOOGLE_SHEETS_CONFIGS;
    if (multipleConfigsJson) {
      try {
        const parsed = JSON.parse(multipleConfigsJson) as SheetConfig[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          configs.push(...parsed);
          console.log('[Sheets] Using environment variable multiple sheet configurations:', parsed.length);
        }
      } catch (error) {
        console.error('[Sheets] Failed to parse GOOGLE_SHEETS_CONFIGS:', error);
      }
    }
    
    // 形式2: 単一設定（後方互換性）
    const singleSpreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const singleSheetName = process.env.GOOGLE_SHEETS_PROFILE_SHEET_NAME || 'テストアンケート';
    if (singleSpreadsheetId) {
      configs.push({
        spreadsheetId: singleSpreadsheetId,
        sheetName: singleSheetName,
      });
      console.log('[Sheets] Added single sheet configuration from environment variable');
    }
  } else {
    console.log('[Sheets] Code-based configurations found, skipping environment variables');
  }
  
  if (configs.length === 0) {
    console.error('[Sheets] No sheet configuration found');
    throw new Error('Sheet configuration must be set in lib/config.ts or via environment variables (GOOGLE_SHEETS_SPREADSHEET_ID or GOOGLE_SHEETS_CONFIGS)');
  }
  
  console.log('[Sheets] Total sheet configurations:', configs.length);
  return configs;
}

async function getSheet(spreadsheetId?: string, sheetName?: string) {
  console.log('[Sheets] Getting sheet instance...');
  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });
  
  const targetSpreadsheetId = spreadsheetId || process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const targetSheetName = sheetName || process.env.GOOGLE_SHEETS_PROFILE_SHEET_NAME || 'テストアンケート';

  console.log('[Sheets] Config - Spreadsheet ID:', targetSpreadsheetId ? 'set' : 'NOT SET');
  console.log('[Sheets] Config - Sheet name:', targetSheetName);

  if (!targetSpreadsheetId) {
    console.error('[Sheets] Spreadsheet ID is not configured');
    throw new Error('Spreadsheet ID is not configured');
  }

  return { sheets, spreadsheetId: targetSpreadsheetId, sheetName: targetSheetName };
}

const REQUIRED_HEADERS = [
  'タイムスタンプ',
  'ユーザーID',
  '名前',
  '大学名',
  '文理',
  '学年',
  '性別',
  '卒業年度',
];

async function ensureHeader(
  sheets: any,
  spreadsheetId: string,
  sheetName: string
): Promise<string[]> {
  console.log('[Sheets] Ensuring header for sheet:', sheetName);
  
  try {
    const sheet = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!1:1`,
    });

    const existingHeaders = sheet.data.values?.[0] || [];
    console.log('[Sheets] Existing headers:', existingHeaders);
    
    const existingSet = new Set(existingHeaders.map((h: string) => String(h)));
    const toAdd = REQUIRED_HEADERS.filter((h) => !existingSet.has(h));
    console.log('[Sheets] Headers to add:', toAdd);

    if (toAdd.length > 0) {
      const newHeaders = [...existingHeaders, ...toAdd];
      console.log('[Sheets] Updating headers:', newHeaders);
      
      const updateResponse = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!1:1`,
        valueInputOption: 'RAW',
        requestBody: { values: [newHeaders] },
      });
      
      console.log('[Sheets] Header update response:', JSON.stringify(updateResponse.data));
      return newHeaders.map(String);
    }

    return existingHeaders.map(String);
  } catch (error) {
    console.error('[Sheets] Error ensuring header:', error);
    if (error instanceof Error) {
      console.error('[Sheets] Error message:', error.message);
      // シートが存在しない場合のエラー
      if (error.message.includes('Unable to parse range') || error.message.includes('not found')) {
        throw new Error(`Sheet "${sheetName}" not found in spreadsheet. Please check GOOGLE_SHEETS_PROFILE_SHEET_NAME environment variable.`);
      }
    }
    throw error;
  }
}

async function findRowByUserId(
  sheets: any,
  spreadsheetId: string,
  sheetName: string,
  header: string[],
  userId: string
): Promise<number> {
  console.log('[Sheets] Finding row by userId:', userId);
  
  const range = `${sheetName}!A:Z`;
  console.log('[Sheets] Searching range:', range);
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];
    console.log('[Sheets] Total rows found:', rows.length);
    
    if (rows.length < 2) {
      console.log('[Sheets] No data rows found (only header)');
      return -1;
    }

    // 実際のヘッダー行（1行目）からユーザーID列のインデックスを取得
    const actualHeader = rows[0] || [];
    const userIdColIndex = actualHeader.findIndex((h: string) => String(h).trim() === 'ユーザーID');
    console.log('[Sheets] User ID column index:', userIdColIndex);
    console.log('[Sheets] Actual header:', actualHeader);
    
    if (userIdColIndex < 0) {
      console.warn('[Sheets] User ID column not found in actual header');
      return -1;
    }

    // 最初の5行と最後の5行のユーザーIDをログ出力（デバッグ用）
    const debugRows = Math.min(5, rows.length - 1);
    for (let i = 1; i <= debugRows; i++) {
      const rowUserId = rows[i][userIdColIndex];
      const match = rowUserId && String(rowUserId).trim() === String(userId).trim();
      console.log(`[Sheets] Row ${i + 1} userId:`, rowUserId, 'target:', userId, 'match:', match);
    }
    if (rows.length > 6) {
      for (let i = Math.max(debugRows + 1, rows.length - 5); i < rows.length; i++) {
        const rowUserId = rows[i][userIdColIndex];
        const match = rowUserId && String(rowUserId).trim() === String(userId).trim();
        console.log(`[Sheets] Row ${i + 1} userId:`, rowUserId, 'target:', userId, 'match:', match);
      }
    }

    // 最後から検索（最新のデータを優先）
    for (let i = rows.length - 1; i >= 1; i--) {
      const rowUserId = rows[i][userIdColIndex];
      if (rowUserId && String(rowUserId).trim() === String(userId).trim()) {
        console.log('[Sheets] Found matching userId at row:', i + 1);
        return i + 1; // 1-indexed
      }
    }

    console.log('[Sheets] User ID not found in existing rows');
    return -1;
  } catch (error) {
    console.error('[Sheets] Error finding row by userId:', error);
    if (error instanceof Error) {
      console.error('[Sheets] Error message:', error.message);
    }
    return -1;
  }
}

async function saveProfileToSingleSheet(
  sheets: any,
  spreadsheetId: string,
  sheetName: string,
  userId: string,
  answers: UserAnswers
): Promise<void> {
  console.log('[Sheets] Saving to single sheet:', spreadsheetId, sheetName);
  
  const header = await ensureHeader(sheets, spreadsheetId, sheetName);
  console.log('[Sheets] Header:', header);
  
  const rowIndex = await findRowByUserId(sheets, spreadsheetId, sheetName, header, userId);
  console.log('[Sheets] Row index:', rowIndex > 0 ? `Found at row ${rowIndex}` : 'Not found (will append)');

  const now = new Date().toISOString();
  const rowData: Record<string, any> = {
    タイムスタンプ: now,
    ユーザーID: userId,
    名前: answers.name || '',
    大学名: answers.university || '',
    文理: answers.bunri || '',
    学年: answers.grade || '',
    性別: answers.gender || '',
    卒業年度: answers.graduation || '',
  };

  if (rowIndex > 0) {
    // Update existing row - 既存の行を新しいデータで上書き
    console.log('[Sheets] Updating existing row at index:', rowIndex);
    
    // 既存の行データを取得（応募フォーム関連のデータを保持するため）
    const existingRowResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!${rowIndex}:${rowIndex}`,
    });
    
    const existingRow = existingRowResponse.data.values?.[0] || [];
    console.log('[Sheets] Existing row data:', existingRow);
    
    // 新しい行データを作成（アンケート回答は上書き）
    const row = new Array(header.length).fill('');
    header.forEach((h, idx) => {
      // 新しいデータで上書き
      if (rowData[h] !== undefined) {
        row[idx] = rowData[h];
      }
    });
    
    // タイムスタンプとユーザーIDは常に更新
    const timestampIndex = header.indexOf('タイムスタンプ');
    const userIdIndex = header.indexOf('ユーザーID');
    if (timestampIndex >= 0) row[timestampIndex] = now;
    if (userIdIndex >= 0) row[userIdIndex] = userId;

    console.log('[Sheets] Updated row data:', row);
    console.log('[Sheets] Row length:', row.length, 'Header length:', header.length);
    
    const updateResponse = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!${rowIndex}:${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: { values: [row] },
    });
    
    console.log('[Sheets] Update API response:', JSON.stringify(updateResponse.data));
    console.log('[Sheets] Row updated successfully at row:', rowIndex);
  } else {
    // Append new row
    console.log('[Sheets] Appending new row');
    // headerの順序に合わせて行データを作成
    const row = new Array(header.length).fill('');
    header.forEach((h, idx) => {
      if (rowData[h] !== undefined) {
        row[idx] = rowData[h];
      }
    });
    
    // タイムスタンプとユーザーIDは必ず設定
    const timestampIndex = header.indexOf('タイムスタンプ');
    const userIdIndex = header.indexOf('ユーザーID');
    if (timestampIndex >= 0) row[timestampIndex] = now;
    if (userIdIndex >= 0) row[userIdIndex] = userId;
    
    console.log('[Sheets] New row data:', row);
    console.log('[Sheets] Row length:', row.length, 'Header length:', header.length);
    console.log('[Sheets] Header:', header);
    console.log('[Sheets] RowData keys:', Object.keys(rowData));
    
    const appendResponse = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:A`,
      valueInputOption: 'RAW',
      requestBody: { values: [row] },
    });
    
    console.log('[Sheets] Append API response:', JSON.stringify(appendResponse.data));
    console.log('[Sheets] Row appended successfully');
  }
}

// アンケート機能を無効化したためコメントアウト
/*
export async function saveProfileToSheet(
  userId: string,
  answers: UserAnswers
): Promise<void> {
  try {
    console.log('[Sheets] ===== START saveProfileToSheet =====');
    console.log('[Sheets] userId:', userId);
    console.log('[Sheets] answers:', JSON.stringify(answers));
    
    // 複数のスプレッドシート設定を取得
    const configs = await getSheetConfigs();
    console.log('[Sheets] Saving to', configs.length, 'sheet(s)');
    
    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    // すべてのスプレッドシートに並列で保存
    const savePromises = configs.map(async (config, index) => {
      try {
        console.log(`[Sheets] Saving to sheet ${index + 1}/${configs.length}:`, config.spreadsheetId, config.sheetName);
        await saveProfileToSingleSheet(sheets, config.spreadsheetId, config.sheetName, userId, answers);
        console.log(`[Sheets] ✅ Successfully saved to sheet ${index + 1}/${configs.length}`);
      } catch (error) {
        console.error(`[Sheets] ❌ Failed to save to sheet ${index + 1}/${configs.length}:`, error);
        if (error instanceof Error) {
          console.error(`[Sheets] Error message:`, error.message);
        }
        // 1つのシートへの保存が失敗しても、他のシートへの保存は続行
        throw error;
      }
    });
    
    // すべての保存処理を実行（1つでも失敗した場合はエラーをスロー）
    await Promise.all(savePromises);
    
    console.log('[Sheets] ===== SUCCESS saveProfileToSheet (all sheets) =====');
  } catch (error) {
    console.error('[Sheets] ===== ERROR saveProfileToSheet =====');
    console.error('[Sheets] Error:', error);
    if (error instanceof Error) {
      console.error('[Sheets] Error message:', error.message);
      console.error('[Sheets] Error stack:', error.stack);
    }
    throw error;
  }
}
*/

export async function saveFormSubmission(
  userId: string,
  formData: Record<string, string[]>
): Promise<void> {
  // 応募フォーム関連の列を削除したため、この関数は何もしません
  console.log('[Sheets] saveFormSubmission called but form columns are removed');
  return;
}

function getFormConfigs(): FormConfig[] {
  const configs: FormConfig[] = [];
  
  // 優先順位1: コード内の設定（lib/config.ts）
  if (FORM_CONFIGS.length > 0) {
    configs.push(...FORM_CONFIGS);
    console.log('[Sheets] Using code-based form configurations:', FORM_CONFIGS.length);
  }
  
  // 優先順位2: 環境変数（後方互換性）
  // 形式1: JSON形式で複数設定
  const multipleConfigsJson = process.env.GOOGLE_FORM_CONFIGS;
  if (multipleConfigsJson) {
    try {
      const parsed = JSON.parse(multipleConfigsJson) as FormConfig[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        configs.push(...parsed);
        console.log('[Sheets] Using environment variable multiple form configurations:', parsed.length);
      }
    } catch (error) {
      console.error('[Sheets] Failed to parse GOOGLE_FORM_CONFIGS:', error);
    }
  }
  
  // 形式2: 単一設定（後方互換性）
  const singleFormBaseUrl = process.env.GOOGLE_FORM_BASE_URL;
  const singleEntryUserId = process.env.GOOGLE_FORM_ENTRY_USERID?.replace(/^entry\./, '') || '2064951943';
  
  if (singleFormBaseUrl) {
    configs.push({
      baseUrl: singleFormBaseUrl,
      entryUserId: singleEntryUserId,
    });
    console.log('[Sheets] Added single form configuration from environment variable');
  }
  
  return configs;
}

export function createPrefilledFormUrl(userId: string, formIndex: number = 0): string {
  const configs = getFormConfigs();
  
  console.log('[Sheets] Creating prefilled form URL for formIndex:', formIndex, 'total configs:', configs.length);
  
  if (configs.length === 0) {
    throw new Error('GOOGLE_FORM_BASE_URL or GOOGLE_FORM_CONFIGS must be configured');
  }
  
  // 指定されたインデックスのフォーム設定を使用（存在しない場合は0を使用）
  const config = configs[formIndex] || configs[0];
  
  console.log('[Sheets] Using form config:', {
    index: formIndex,
    baseUrl: config.baseUrl ? 'set' : 'not set',
    entryUserId: config.entryUserId,
  });
  
  if (!config.baseUrl) {
    throw new Error('Form base URL is not configured');
  }
  
  if (!config.entryUserId) {
    throw new Error('Form entryUserId is not configured');
  }
  
  const entryId = config.entryUserId.replace(/^entry\./, '');
  const prefilledUrl = `${config.baseUrl}?entry.${entryId}=${encodeURIComponent(userId)}`;
  
  console.log('[Sheets] Generated prefilled URL:', prefilledUrl.substring(0, 100) + '...');
  
  return prefilledUrl;
}

/**
 * v0-jobvit.vercel.appのフォームURLを生成
 * LINEユーザーIDをクエリパラメータとして追加
 */
export function createV0FormUrl(userId: string): string {
  const v0FormBaseUrl = process.env.V0_FORM_BASE_URL || 'https://v0-jobvit.vercel.app';
  const userIdParam = encodeURIComponent(userId);
  const formUrl = `${v0FormBaseUrl}?lineUserId=${userIdParam}`;
  
  console.log('[Sheets] Generated v0 form URL:', formUrl.substring(0, 100) + '...');
  
  return formUrl;
}

