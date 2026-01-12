/**
 * Supabaseクライアント設定
 */

// Supabaseクライアントを作成する関数
// 注意: @supabase/supabase-jsパッケージをインストールする必要があります
// npm install @supabase/supabase-js

let supabaseClient: any = null;

export function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  console.log('[Supabase] Checking environment variables...');
  console.log('[Supabase] SUPABASE_URL:', supabaseUrl ? 'set' : 'NOT SET');
  console.log('[Supabase] SUPABASE_ANON_KEY:', supabaseAnonKey ? 'set' : 'NOT SET');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Supabase] SUPABASE_URL and SUPABASE_ANON_KEY must be set');
    throw new Error('Supabase credentials are not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
  }

  // 動的インポートを使用（パッケージがインストールされていない場合のエラーハンドリング）
  try {
    console.log('[Supabase] Attempting to import @supabase/supabase-js...');
    // @ts-ignore - 動的インポート
    const { createClient } = require('@supabase/supabase-js');
    console.log('[Supabase] Package imported successfully');
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    console.log('[Supabase] Client created successfully');
    return supabaseClient;
  } catch (error) {
    console.error('[Supabase] Failed to create client:', error);
    if (error instanceof Error) {
      console.error('[Supabase] Error message:', error.message);
      console.error('[Supabase] Error stack:', error.stack);
    }
    throw new Error(`Supabase client creation failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please install @supabase/supabase-js: npm install @supabase/supabase-js`);
  }
}

/**
 * 企業情報の型定義（company-info-testテーブルの構造に合わせる）
 * CSVファイルの構造に基づく
 */
export interface CompanyInfo {
  id?: string;
  company_name: string;
  company_name_kana?: string;
  industry_large?: string;
  industry_middle?: string;
  industry_small?: string;
  is_listed?: boolean | string;
  headquarters_prefecture?: string;
  website_url?: string;
}

/**
 * Supabaseから企業情報一覧を取得（全て取得）
 */
export async function getCompanies(): Promise<CompanyInfo[]> {
  try {
    console.log('[Supabase] Getting companies from company-info-test table...');
    const client = getSupabaseClient();
    
    // テーブル名にハイフンが含まれる場合、引用符で囲む必要がある場合がある
    // まず通常のテーブル名で試し、失敗した場合は引用符付きで試す
    let query = client.from('company-info-test');
    
    const { data, error } = await query
      .select('*')
      .order('company_name', { ascending: true });

    if (error) {
      console.error('[Supabase] Error fetching companies:', error);
      console.error('[Supabase] Error code:', error.code);
      console.error('[Supabase] Error message:', error.message);
      console.error('[Supabase] Error details:', error.details);
      console.error('[Supabase] Error hint:', error.hint);
      throw error;
    }

    console.log('[Supabase] Fetched companies successfully:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('[Supabase] First company sample:', JSON.stringify(data[0], null, 2));
    }
    return data || [];
  } catch (error) {
    console.error('[Supabase] Failed to fetch companies:', error);
    if (error instanceof Error) {
      console.error('[Supabase] Error message:', error.message);
      console.error('[Supabase] Error stack:', error.stack);
    }
    // エラーオブジェクトの詳細をログ出力
    if (typeof error === 'object' && error !== null) {
      console.error('[Supabase] Error object:', JSON.stringify(error, null, 2));
    }
    throw error;
  }
}

/**
 * 企業名で企業情報を検索
 */
export async function getCompanyByName(name: string): Promise<CompanyInfo | null> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('company-info-test')
      .select('*')
      .ilike('company_name', `%${name}%`)
      .limit(1)
      .single();

    if (error) {
      console.error('[Supabase] Error fetching company by name:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[Supabase] Failed to fetch company by name:', error);
    return null;
  }
}

