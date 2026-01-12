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

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Supabase] SUPABASE_URL and SUPABASE_ANON_KEY must be set');
    throw new Error('Supabase credentials are not configured');
  }

  // 動的インポートを使用（パッケージがインストールされていない場合のエラーハンドリング）
  try {
    // @ts-ignore - 動的インポート
    const { createClient } = require('@supabase/supabase-js');
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    console.log('[Supabase] Client created successfully');
    return supabaseClient;
  } catch (error) {
    console.error('[Supabase] Failed to create client:', error);
    throw new Error('Supabase client creation failed. Please install @supabase/supabase-js');
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
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('company-info-test')
      .select('*')
      .order('company_name', { ascending: true });

    if (error) {
      console.error('[Supabase] Error fetching companies:', error);
      throw error;
    }

    console.log('[Supabase] Fetched companies:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('[Supabase] Failed to fetch companies:', error);
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

