import { NextRequest, NextResponse } from 'next/server';
import { getCompanies } from '@/lib/supabase';

/**
 * Supabaseの企業情報を確認するAPIエンドポイント（読み取り専用）
 * 
 * GET /api/supabase/companies
 * 
 * クエリパラメータ:
 * - limit: 取得件数（デフォルト: 10、最大: 100）
 * - offset: オフセット（デフォルト: 0）
 * - format: レスポンス形式（'json' | 'table'、デフォルト: 'json'）
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const format = searchParams.get('format') || 'json';

    console.log('[SupabaseAPI] Fetching companies...');
    console.log('[SupabaseAPI] Limit:', limit, 'Offset:', offset, 'Format:', format);

    // Supabaseから企業情報を取得
    const allCompanies = await getCompanies();
    
    // ページネーション処理
    const paginatedCompanies = allCompanies.slice(offset, offset + limit);
    
    console.log('[SupabaseAPI] Total companies:', allCompanies.length);
    console.log('[SupabaseAPI] Returned companies:', paginatedCompanies.length);

    // フォーマットに応じてレスポンスを返す
    if (format === 'table') {
      // テーブル形式で返す（HTML）
      return new NextResponse(
        generateTableHTML(allCompanies.length, paginatedCompanies),
        {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
          },
        }
      );
    }

    // JSON形式で返す（デフォルト）
    return NextResponse.json({
      success: true,
      total: allCompanies.length,
      limit: limit,
      offset: offset,
      count: paginatedCompanies.length,
      companies: paginatedCompanies,
    });
  } catch (error) {
    console.error('[SupabaseAPI] Error:', error);
    if (error instanceof Error) {
      console.error('[SupabaseAPI] Error message:', error.message);
      console.error('[SupabaseAPI] Error stack:', error.stack);
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch companies',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * HTMLテーブル形式で企業情報を表示
 */
function generateTableHTML(total: number, companies: any[]): string {
  const tableRows = companies.map((company, index) => {
    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(company.company_name || '')}</td>
        <td>${escapeHtml(company.company_name_kana || '')}</td>
        <td>${escapeHtml(company.industry_large || '')}</td>
        <td>${escapeHtml(company.industry_middle || '')}</td>
        <td>${escapeHtml(company.industry_small || '')}</td>
        <td>${company.is_listed ? '上場' : '非上場'}</td>
        <td>${escapeHtml(company.headquarters_prefecture || '')}</td>
        <td>${escapeHtml(company.website_url || '')}</td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Supabase 企業情報一覧</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background-color: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
    }
    .info {
      color: #666;
      margin-bottom: 20px;
      padding: 10px;
      background-color: #f9f9f9;
      border-radius: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #fc9f2a;
      color: white;
      font-weight: bold;
      position: sticky;
      top: 0;
    }
    tr:hover {
      background-color: #f5f5f5;
    }
    .pagination {
      margin-top: 20px;
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .pagination a {
      padding: 8px 16px;
      background-color: #fc9f2a;
      color: white;
      text-decoration: none;
      border-radius: 4px;
    }
    .pagination a:hover {
      background-color: #e6891a;
    }
    .pagination span {
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Supabase 企業情報一覧</h1>
    <div class="info">
      <strong>総件数:</strong> ${total}件 | 
      <strong>表示中:</strong> ${companies.length}件
    </div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>企業名</th>
          <th>企業名カナ</th>
          <th>大業種</th>
          <th>中業種</th>
          <th>小業種</th>
          <th>上場</th>
          <th>本社</th>
          <th>ウェブサイト</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  </div>
</body>
</html>
  `;
}

/**
 * HTMLエスケープ
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}


