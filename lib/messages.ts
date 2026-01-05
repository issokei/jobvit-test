// アンケート機能を無効化したためコメントアウト
// import { Question } from './types';
import { createPrefilledFormUrl } from './sheets';

// export function buildQuestionFlex(q: Question) {
//   return {
//     type: 'flex' as const,
//     altText: q.title,
//     contents: createOrangeBubble(q.title, q.subtitle, q.options),
//   };
// }

export function createGuideFlex(title: string, subtitle: string) {
  return {
    type: 'flex' as const,
    altText: title,
    contents: createOrangeBubble(title, subtitle, []),
  };
}

function createOrangeBubble(title: string, subtitle: string, options: string[]) {
  const bodyContents: any[] = [
    {
      type: 'box',
      layout: 'vertical',
      spacing: '8px',
      contents: [
        {
          type: 'box',
          layout: 'vertical',
          height: '4px',
          backgroundColor: '#fc9f2a',
          cornerRadius: '99px',
          contents: [],
        },
        {
          type: 'text',
          text: title,
          weight: 'bold',
          size: 'lg',
          color: '#0F172A',
          wrap: true,
        },
        ...(subtitle
          ? [
              {
                type: 'text',
                text: subtitle,
                size: 'sm',
                color: '#64748B',
                wrap: true,
              },
            ]
          : []),
      ],
    },
  ];

  if (options && options.length > 0) {
    const buttons = options.map((opt) => ({
      type: 'button' as const,
      style: 'primary' as const,
      color: '#fc9f2a',
      height: 'md' as const,
      action: {
        type: 'message' as const,
        label: opt,
        text: opt,
      },
    }));

    bodyContents.push({
      type: 'box',
      layout: 'vertical',
      spacing: '10px',
      contents: buttons,
    });
  }

  return {
    type: 'bubble' as const,
    size: 'kilo' as const,
    body: {
      type: 'box' as const,
      layout: 'vertical' as const,
      paddingAll: '20px',
      spacing: '14px',
      contents: bodyContents,
    },
    styles: {
      body: {
        backgroundColor: '#FFFFFF',
      },
    },
  };
}

// アンケート機能を無効化したためコメントアウト
/*
export function createSurveyCompletePanel() {
  return {
    type: 'flex' as const,
    altText: '仮登録が完了しました🔥',
    contents: {
      type: 'bubble' as const,
      header: {
        type: 'box' as const,
        layout: 'vertical' as const,
        contents: [
          {
            type: 'text' as const,
            text: ' 仮登録が完了しました！',
            weight: 'bold' as const,
            size: 'md' as const,
            color: '#FFFFFF',
            align: 'center' as const,
          },
        ],
        backgroundColor: '#fc9f2a',
        paddingAll: '20px',
      },
      body: {
        type: 'box' as const,
        layout: 'vertical' as const,
        contents: [
          {
            type: 'text' as const,
            text: 'アンケートにご回答いただき',
            wrap: true,
            color: '#333333',
            size: 'md' as const,
            align: 'center' as const,
            margin: 'md' as const,
          },
          {
            type: 'text' as const,
            text: 'ありがとうございます！',
            wrap: true,
            color: '#333333',
            size: 'md' as const,
            align: 'center' as const,
            margin: 'xs' as const,
          },
          {
            type: 'separator' as const,
            margin: 'xl' as const,
            color: '#E0E0E0',
          },
          {
            type: 'text' as const,
            text: '次回イベントの本登録は',
            wrap: true,
            color: '#666666',
            size: 'sm' as const,
            align: 'center' as const,
            margin: 'xl' as const,
          },
          {
            type: 'text' as const,
            text: '「イベント情報」から',
            wrap: true,
            color: '#666666',
            size: 'sm' as const,
            align: 'center' as const,
            margin: 'xs' as const,
          },
          {
            type: 'text' as const,
            text: '応募ボタンを押してください',
            wrap: true,
            color: '#666666',
            size: 'sm' as const,
            align: 'center' as const,
            margin: 'xs' as const,
          },
        ],
        paddingAll: '20px',
      },
      footer: {
        type: 'box' as const,
        layout: 'vertical' as const,
        contents: [
          {
            type: 'button' as const,
            action: {
              type: 'message' as const,
              label: 'イベント情報を表示する',
              text: 'イベント情報',
            },
            style: 'primary' as const,
            color: '#fc9f2a',
            height: 'md' as const,
          },
        ],
        spacing: 'sm' as const,
        paddingAll: '20px',
      },
    },
  };
}
*/

export function createEventFlexMessage(userId: string) {
  return {
    type: 'flex' as const,
    altText: 'イベント情報',
    contents: {
      type: 'carousel' as const,
      contents: [
        createEventFlexBubble(userId),
        // createSecondEventFlexBubble(userId),
      ],
    },
  };
}

function createEventFlexBubble(userId: string) {
  // 1つ目のイベント用のフォームURL（インデックス0）
  console.log('[Messages] Creating first event bubble (formIndex: 0)');
  const applyUrl = createPrefilledFormUrl(userId, 0);
  console.log('[Messages] First event form URL:', applyUrl.substring(0, 100) + '...');
  const eventSiteUrl = process.env.EVENT_SITE_URL || 'https://www.intern-expo.com';
  const heroImageUrl =
    process.env.EVENT_HERO_IMAGE_URL ||
    'https://yj85fth3dcofc0v0.public.blob.vercel-storage.com/2026-1';

  return {
    type: 'bubble' as const,
    header: {
      type: 'box' as const,
      layout: 'vertical' as const,
      contents: [
        {
          type: 'text' as const,
          text: '28卒限定',
          weight: 'bold' as const,
          decoration: 'underline' as const,
          color: '#F05A00',
        },
      ],
    },
    hero: {
      type: 'image' as const,
      url: heroImageUrl,
      size: 'full' as const,
      aspectRatio: '16:9' as const,
      aspectMode: 'cover' as const,
    },
    body: {
      type: 'box' as const,
      layout: 'vertical' as const,
      contents: [
        {
          type: 'text' as const,
          text: '【28卒限定】関西インターンEXPO 2026 vol.1',
          weight: 'bold' as const,
          size: 'xl' as const,
          wrap: true,
        },
        {
          type: 'box' as const,
          layout: 'vertical' as const,
          margin: 'lg' as const,
          spacing: 'sm' as const,
          contents: [
            {
              type: 'box' as const,
              layout: 'baseline' as const,
              spacing: 'sm' as const,
              contents: [
                {
                  type: 'text' as const,
                  text: '会場',
                  color: '#aaaaaa',
                  size: 'sm' as const,
                  flex: 1,
                },
                {
                  type: 'text' as const,
                  text: 'グランフロント大阪',
                  wrap: true,
                  color: '#666666',
                  size: 'sm' as const,
                  flex: 5,
                },
              ],
            },
            {
              type: 'box' as const,
              layout: 'baseline' as const,
              spacing: 'sm' as const,
              contents: [
                {
                  type: 'text' as const,
                  text: '日時',
                  color: '#aaaaaa',
                  size: 'sm' as const,
                  flex: 1,
                },
                {
                  type: 'text' as const,
                  text: '3/26(水) 14:30 - 19:30',
                  wrap: true,
                  color: '#666666',
                  size: 'sm' as const,
                  flex: 5,
                },
              ],
            },
          ],
        },
      ],
    },
    footer: {
      type: 'box' as const,
      layout: 'vertical' as const,
      spacing: 'sm' as const,
      contents: [
        {
          type: 'button' as const,
          style: 'link' as const,
          height: 'sm' as const,
          action: {
            type: 'uri' as const,
            label: 'イベントサイトはこちら',
            uri: eventSiteUrl,
          },
        },
        {
          type: 'button' as const,
          style: 'link' as const,
          height: 'sm' as const,
          action: {
            type: 'uri' as const,
            label: 'イベントに応募する',
            uri: applyUrl,
          },
        },
        {
          type: 'box' as const,
          layout: 'vertical' as const,
          contents: [],
          margin: 'sm' as const,
        },
      ],
      flex: 0,
    },
  };
}

// function createSecondEventFlexBubble(userId: string) {
//   // 2つ目のイベント用のフォームURL（インデックス1、存在しない場合は0を使用）
//   console.log('[Messages] Creating second event bubble (formIndex: 1)');
//   const applyUrl = createPrefilledFormUrl(userId, 1);
//   console.log('[Messages] Second event form URL:', applyUrl.substring(0, 100) + '...');
//   const eventSiteUrl = process.env.EVENT_SITE_URL || 'https://www.intern-expo.com';
//   const heroImageUrl =
//     process.env.EVENT_HERO_IMAGE_URL ||
//     'https://yj85fth3dcofc0v0.public.blob.vercel-storage.com/2026-1';

//   return {
//     type: 'bubble' as const,
//     header: {
//       type: 'box' as const,
//       layout: 'vertical' as const,
//       contents: [
//         {
//           type: 'text' as const,
//           text: '27卒限定',
//           weight: 'bold' as const,
//           decoration: 'underline' as const,
//           color: '#F05A00',
//         },
//       ],
//     },
//     hero: {
//       type: 'image' as const,
//       url: heroImageUrl,
//       size: 'full' as const,
//       aspectRatio: '16:9' as const,
//       aspectMode: 'cover' as const,
//     },
//     body: {
//       type: 'box' as const,
//       layout: 'vertical' as const,
//       contents: [
//         {
//           type: 'text' as const,
//           text: '関西インターンEXPO 2025 vol.2',
//           weight: 'bold' as const,
//           size: 'xl' as const,
//           wrap: true,
//         },
//         {
//           type: 'box' as const,
//           layout: 'vertical' as const,
//           margin: 'lg' as const,
//           spacing: 'sm' as const,
//           contents: [
//             {
//               type: 'box' as const,
//               layout: 'baseline' as const,
//               spacing: 'sm' as const,
//               contents: [
//                 {
//                   type: 'text' as const,
//                   text: '会場',
//                   color: '#aaaaaa',
//                   size: 'sm' as const,
//                   flex: 1,
//                 },
//                 {
//                   type: 'text' as const,
//                   text: '梅田スカイビル',
//                   wrap: true,
//                   color: '#666666',
//                   size: 'sm' as const,
//                   flex: 5,
//                 },
//               ],
//             },
//             {
//               type: 'box' as const,
//               layout: 'baseline' as const,
//               spacing: 'sm' as const,
//               contents: [
//                 {
//                   type: 'text' as const,
//                   text: '開催日時',
//                   color: '#aaaaaa',
//                   size: 'sm' as const,
//                   flex: 1,
//                 },
//                 {
//                   type: 'text' as const,
//                   text: '4/12(土) 10:00 - 18:00',
//                   wrap: true,
//                   color: '#666666',
//                   size: 'sm' as const,
//                   flex: 5,
//                 },
//               ],
//             },
//           ],
//         },
//       ],
//     },
//     footer: {
//       type: 'box' as const,
//       layout: 'vertical' as const,
//       spacing: 'sm' as const,
//       contents: [
//         {
//           type: 'button' as const,
//           style: 'link' as const,
//           height: 'sm' as const,
//           action: {
//             type: 'uri' as const,
//             label: 'イベントサイトはこちら',
//             uri: eventSiteUrl,
//           },
//         },
//         {
//           type: 'button' as const,
//           style: 'link' as const,
//           height: 'sm' as const,
//           action: {
//             type: 'uri' as const,
//             label: 'イベントに応募する',
//             uri: applyUrl,
//           },
//         },
//       ],
//     },
//   };
// }

/**
 * 採点結果を表示するFlexメッセージを作成
 */
export function createScoringResultMessage(
  totalPoints: number,
  maxPoints: number,
  percentage: number,
  grade: string,
  feedback: string,
  details: Array<{ questionTitle: string; userAnswer: string; points: number; maxPoints: number; feedback: string }>
) {
  // 評価に応じた色とメッセージを設定
  let gradeColor = '#666666';
  let gradeMessage = '';
  
  switch (grade) {
    case 'S':
      gradeColor = '#FFD700';
      gradeMessage = '素晴らしい！完璧です！';
      break;
    case 'A':
      gradeColor = '#4CAF50';
      gradeMessage = '優秀です！';
      break;
    case 'B':
      gradeColor = '#2196F3';
      gradeMessage = '良好です！';
      break;
    case 'C':
      gradeColor = '#FF9800';
      gradeMessage = 'もう少し頑張りましょう！';
      break;
    case 'D':
      gradeColor = '#F44336';
      gradeMessage = '復習が必要です';
      break;
    default:
      gradeMessage = '採点が完了しました';
  }

  // 詳細を表示するためのコンテンツを作成（最大3件まで表示して簡略化）
  const detailContents: any[] = [];
  const maxDetails = Math.min(details.length, 3);
  
  for (let index = 0; index < maxDetails; index++) {
    const detail = details[index];
    if (index > 0) {
      detailContents.push({
        type: 'separator' as const,
        margin: 'sm' as const,
        color: '#E0E0E0',
      });
    }
    
    const isCorrect = detail.points === detail.maxPoints;
    
    // テキストの長さを制限（LINEの制限に合わせて短く）
    const questionTitle = detail.questionTitle.substring(0, 30);
    const userAnswer = (detail.userAnswer || '（未回答）').substring(0, 50);
    
    detailContents.push({
      type: 'box' as const,
      layout: 'horizontal' as const,
      spacing: 'sm' as const,
      contents: [
        {
          type: 'text' as const,
          text: `Q${index + 1}: ${questionTitle}${detail.questionTitle.length > 30 ? '...' : ''}`,
          size: 'xs' as const,
          color: '#666666',
          flex: 1,
          // horizontalレイアウトではwrapプロパティを削除（LINEの仕様）
        },
        {
          type: 'text' as const,
          text: `${detail.points}/${detail.maxPoints}点`,
          size: 'xs' as const,
          color: isCorrect ? '#4CAF50' : '#F44336',
          align: 'end' as const,
          flex: 0,
        },
      ],
      margin: 'xs' as const,
    });
  }
  
  // 詳細が3件を超える場合は、残りの件数を表示
  if (details.length > maxDetails) {
    detailContents.push({
      type: 'separator' as const,
      margin: 'sm' as const,
      color: '#E0E0E0',
    });
    detailContents.push({
      type: 'text' as const,
      text: `他${details.length - maxDetails}件の質問があります`,
      size: 'xs' as const,
      color: '#999999',
      align: 'center' as const,
      margin: 'sm' as const,
    });
  }

  // altTextの長さを制限（LINEの制限: 400文字）
  const altText = `採点結果: ${totalPoints}/${maxPoints}点 (${percentage.toFixed(1)}%)`.substring(0, 400);
  
  return {
    type: 'flex' as const,
    altText: altText,
    contents: {
      type: 'bubble' as const,
      header: {
        type: 'box' as const,
        layout: 'vertical' as const,
        contents: [
          {
            type: 'text' as const,
            text: '採点結果',
            weight: 'bold' as const,
            size: 'xl' as const,
            color: '#FFFFFF',
            align: 'center' as const,
          },
        ],
        backgroundColor: gradeColor,
        paddingAll: '20px',
      },
      body: {
        type: 'box' as const,
        layout: 'vertical' as const,
        contents: [
          {
            type: 'box' as const,
            layout: 'vertical' as const,
            spacing: 'md' as const,
            contents: [
              {
                type: 'text' as const,
                text: gradeMessage,
                size: 'lg' as const,
                weight: 'bold' as const,
                color: '#333333',
                align: 'center' as const,
              },
              {
                type: 'box' as const,
                layout: 'horizontal' as const,
                contents: [
                  {
                    type: 'text' as const,
                    text: `${totalPoints}`,
                    size: '3xl' as const,
                    weight: 'bold' as const,
                    color: gradeColor,
                    flex: 0,
                  },
                  {
                    type: 'text' as const,
                    text: ` / ${maxPoints}点`,
                    size: 'xl' as const,
                    color: '#666666',
                    flex: 0,
                  },
                ],
                justifyContent: 'center' as const,
              },
              {
                type: 'text' as const,
                text: `正答率: ${percentage.toFixed(1)}%`,
                size: 'md' as const,
                color: '#666666',
                align: 'center' as const,
              },
              {
                type: 'box' as const,
                layout: 'horizontal' as const,
                contents: [
                  {
                    type: 'text' as const,
                    text: `評価: `,
                    size: 'md' as const,
                    color: '#666666',
                    flex: 0,
                  },
                  {
                    type: 'text' as const,
                    text: grade,
                    size: '2xl' as const,
                    weight: 'bold' as const,
                    color: gradeColor,
                    flex: 0,
                  },
                ],
                justifyContent: 'center' as const,
              },
              ...(feedback ? [
                {
                  type: 'separator' as const,
                  margin: 'md' as const,
                  color: '#E0E0E0',
                },
              {
                type: 'text' as const,
                text: feedback.substring(0, 500), // フィードバックの長さを制限
                size: 'sm' as const,
                color: '#333333',
                wrap: true,
                margin: 'md' as const,
              },
              ] : []),
            ],
            paddingAll: '20px',
          },
          ...(details.length > 0 ? [
            {
              type: 'separator' as const,
              margin: 'md' as const,
              color: '#E0E0E0',
            },
            {
              type: 'text' as const,
              text: '詳細',
              size: 'md' as const,
              weight: 'bold' as const,
              color: '#333333',
              margin: 'md' as const,
            },
            ...detailContents,
          ] : []),
        ],
        paddingAll: '20px',
      },
    },
  };
}

