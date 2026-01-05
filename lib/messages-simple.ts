import { createPrefilledFormUrl } from './sheets';

/**
 * シンプルな採点結果メッセージを作成（Flexメッセージの構造を簡略化）
 */
export function createSimpleScoringResultMessage(
  totalPoints: number,
  maxPoints: number,
  percentage: number,
  grade: string,
  feedback: string
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
            type: 'text' as const,
            text: gradeMessage,
            size: 'lg' as const,
            weight: 'bold' as const,
            color: '#333333',
            align: 'center' as const,
            margin: 'md' as const,
          },
          {
            type: 'text' as const,
            text: `${totalPoints} / ${maxPoints}点`,
            size: 'md' as const, // 2xlは無効なのでxxlに変更
            weight: 'bold' as const,
            color: gradeColor,
            align: 'center' as const,
            margin: 'md' as const,
          },
          {
            type: 'text' as const,
            text: `正答率: ${percentage.toFixed(1)}%`,
            size: 'md' as const,
            color: '#666666',
            align: 'center' as const,
            margin: 'sm' as const,
          },
          {
            type: 'text' as const,
            text: `評価: ${grade}`,
            size: 'xl' as const,
            weight: 'bold' as const,
            color: gradeColor,
            align: 'center' as const,
            margin: 'md' as const,
          },
          ...(feedback ? [
            {
              type: 'separator' as const,
              margin: 'md' as const,
              color: '#E0E0E0',
            },
            {
              type: 'text' as const,
              text: feedback.substring(0, 500),
              size: 'sm' as const,
              color: '#333333',
              wrap: true,
              margin: 'md' as const,
            },
          ] : []),
        ],
        paddingAll: '20px',
      },
    },
  };
}

