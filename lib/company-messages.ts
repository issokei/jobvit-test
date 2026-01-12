/**
 * 企業情報をFlexメッセージで表示する関数
 */

import { CompanyInfo } from './supabase';

/**
 * 企業情報一覧をFlexメッセージ（カルーセル）で作成
 * LINEのカルーセルは最大12件までなので、複数のメッセージに分割
 */
export function createCompanyListFlexMessages(companies: CompanyInfo[]) {
  if (companies.length === 0) {
    return [
      {
        type: 'text' as const,
        text: '企業情報が見つかりませんでした。',
      },
    ];
  }

  const messages: any[] = [];
  const MAX_ITEMS_PER_CAROUSEL = 12; // LINEのカルーセル制限

  // 企業を12件ずつに分割
  for (let i = 0; i < companies.length; i += MAX_ITEMS_PER_CAROUSEL) {
    const chunk = companies.slice(i, i + MAX_ITEMS_PER_CAROUSEL);
    const bubbles = chunk.map((company) => createCompanyBubble(company));

    messages.push({
      type: 'flex' as const,
      altText: `企業情報一覧 (${i + 1}-${Math.min(i + MAX_ITEMS_PER_CAROUSEL, companies.length)}件目 / 全${companies.length}件)`,
      contents: {
        type: 'carousel' as const,
        contents: bubbles,
      },
    });
  }

  return messages;
}

/**
 * 単一企業の情報をFlexメッセージ（バブル）で作成
 */
function createCompanyBubble(company: CompanyInfo) {
  const bodyContents: any[] = [
    {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents: [
        {
          type: 'text',
          text: company.company_name,
          weight: 'bold',
          size: 'xl',
          color: '#0F172A',
          wrap: true,
        },
        ...(company.company_name_kana
          ? [
              {
                type: 'text',
                text: `（${company.company_name_kana}）`,
                size: 'sm',
                color: '#64748B',
                wrap: true,
                margin: 'xs',
              },
            ]
          : []),
      ],
    },
  ];

  // 大業種情報
  if (company.industry_large) {
    bodyContents.push({
      type: 'box',
      layout: 'baseline',
      spacing: 'sm',
      margin: 'md',
      contents: [
        {
          type: 'text',
          text: '大業種',
          color: '#aaaaaa',
          size: 'sm',
          flex: 1,
        },
        {
          type: 'text',
          text: company.industry_large,
          wrap: true,
          color: '#666666',
          size: 'sm',
          flex: 5,
        },
      ],
    });
  }

  // 中業種情報
  if (company.industry_middle) {
    bodyContents.push({
      type: 'box',
      layout: 'baseline',
      spacing: 'sm',
      margin: 'sm',
      contents: [
        {
          type: 'text',
          text: '中業種',
          color: '#aaaaaa',
          size: 'sm',
          flex: 1,
        },
        {
          type: 'text',
          text: company.industry_middle,
          wrap: true,
          color: '#666666',
          size: 'sm',
          flex: 5,
        },
      ],
    });
  }

  // 小業種情報
  if (company.industry_small) {
    bodyContents.push({
      type: 'box',
      layout: 'baseline',
      spacing: 'sm',
      margin: 'sm',
      contents: [
        {
          type: 'text',
          text: '小業種',
          color: '#aaaaaa',
          size: 'sm',
          flex: 1,
        },
        {
          type: 'text',
          text: company.industry_small,
          wrap: true,
          color: '#666666',
          size: 'sm',
          flex: 5,
        },
      ],
    });
  }

  // 本社所在地
  if (company.headquarters_prefecture) {
    bodyContents.push({
      type: 'box',
      layout: 'baseline',
      spacing: 'sm',
      margin: 'sm',
      contents: [
        {
          type: 'text',
          text: '本社',
          color: '#aaaaaa',
          size: 'sm',
          flex: 1,
        },
        {
          type: 'text',
          text: company.headquarters_prefecture,
          wrap: true,
          color: '#666666',
          size: 'sm',
          flex: 5,
        },
      ],
    });
  }

  // 上場情報
  if (company.is_listed !== undefined && company.is_listed !== null) {
    const isListed = company.is_listed === true || company.is_listed === 'True' || company.is_listed === 'true';
    bodyContents.push({
      type: 'box',
      layout: 'baseline',
      spacing: 'sm',
      margin: 'sm',
      contents: [
        {
          type: 'text',
          text: '上場',
          color: '#aaaaaa',
          size: 'sm',
          flex: 1,
        },
        {
          type: 'text',
          text: isListed ? '上場企業' : '非上場企業',
          wrap: true,
          color: '#666666',
          size: 'sm',
          flex: 5,
        },
      ],
    });
  }

  const footerContents: any[] = [];

  // ウェブサイトリンク
  if (company.website_url) {
    footerContents.push({
      type: 'button',
      style: 'link',
      height: 'sm',
      action: {
        type: 'uri',
        label: 'ウェブサイトを見る',
        uri: company.website_url.startsWith('http') ? company.website_url : `https://${company.website_url}`,
      },
    });
  }

  return {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      contents: bodyContents,
      paddingAll: '20px',
    },
    ...(footerContents.length > 0
      ? {
          footer: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: footerContents,
            flex: 0,
            paddingAll: '20px',
          },
        }
      : {}),
  };
}

/**
 * 企業情報が見つからない場合のメッセージ
 */
export function createCompanyNotFoundMessage() {
  return {
    type: 'text' as const,
    text: '企業情報が見つかりませんでした。',
  };
}

