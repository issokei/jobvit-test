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
    
    // まずテーブル一覧を確認（デバッグ用）
    console.log('[Supabase] Attempting to query company-info-test table...');
    
    // テーブル名にハイフンが含まれる場合の対応
    // SupabaseのJavaScriptクライアントでは通常そのまま使用可能だが、
    // 念のため複数のパターンを試す
    let data: any[] | null = null;
    let error: any = null;
    
    // パターン1: 通常のテーブル名
    try {
      console.log('[Supabase] Trying table name: company-info-test');
      const result = await client
        .from('company-info-test')
        .select('*')
        .order('company_name', { ascending: true });
      
      data = result.data;
      error = result.error;
      
      if (error) {
        console.warn('[Supabase] Error with company-info-test:', error.message);
      }
    } catch (e) {
      console.warn('[Supabase] Exception with company-info-test:', e);
    }
    
    // パターン2: 引用符付きテーブル名（SQLでは必要だが、JSクライアントでは通常不要）
    // ただし、念のため試す
    if (error || !data || data.length === 0) {
      console.log('[Supabase] Trying alternative table name patterns...');
      // 他の可能性のあるテーブル名を試す（実際のテーブル名に合わせて調整）
    }

    if (error) {
      console.error('[Supabase] Error fetching companies:', error);
      console.error('[Supabase] Error code:', error.code);
      console.error('[Supabase] Error message:', error.message);
      console.error('[Supabase] Error details:', error.details);
      console.error('[Supabase] Error hint:', error.hint);
      
      // RLSエラーの場合の特別な処理
      if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('RLS')) {
        console.error('[Supabase] RLS (Row Level Security) policy may be blocking access.');
        console.error('[Supabase] Please check RLS policies in Supabase dashboard.');
      }
      
      throw error;
    }

    console.log('[Supabase] Query result - data length:', data?.length || 0);
    console.log('[Supabase] Query result - error:', error ? 'exists' : 'none');
    
    if (data && data.length > 0) {
      console.log('[Supabase] Fetched companies successfully:', data.length);
      console.log('[Supabase] First company sample:', JSON.stringify(data[0], null, 2));
      console.log('[Supabase] Sample company_name:', data[0]?.company_name);
    } else {
      console.warn('[Supabase] No companies found in table');
      console.warn('[Supabase] This could mean:');
      console.warn('[Supabase] 1. Table is empty');
      console.warn('[Supabase] 2. Table name is incorrect');
      console.warn('[Supabase] 3. RLS policy is blocking access');
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
      console.error('[Supabase] Error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
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

