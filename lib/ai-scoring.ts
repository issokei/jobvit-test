import OpenAI from 'openai';

/**
 * ChatGPT APIを使った採点ロジック
 */

export interface ScoringResult {
  totalPoints: number;
  maxPoints: number;
  percentage: number;
  grade: string;
  feedback: string;
  details: QuestionScore[];
}

export interface QuestionScore {
  questionTitle: string;
  userAnswer: string;
  points: number;
  maxPoints: number;
  feedback: string;
}

/**
 * OpenAIクライアントを取得
 */
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  return new OpenAI({
    apiKey,
  });
}

/**
 * フォーム回答をChatGPTに送信して採点を依頼
 * 
 * @param formData Googleフォームの回答データ
 * @param scoringInstructions 採点の指示（オプション）
 * @returns 採点結果
 */
export async function scoreFormAnswersWithAI(
  formData: Record<string, string[]>,
  scoringInstructions?: string
): Promise<ScoringResult> {
  const client = getOpenAIClient();

  // フォーム回答をテキスト形式に変換
  const formAnswersText = Object.entries(formData)
    .filter(([key]) => !key.includes('LINEユーザーID') && !key.includes('タイムスタンプ'))
    .map(([question, answers], index) => {
      const answer = Array.isArray(answers) ? answers.join(', ') : answers;
      return `Q${index + 1}. ${question}\n回答: ${answer || '（未回答）'}`;
    })
    .join('\n\n');

  // デフォルトの採点指示
  const defaultInstructions = `
以下のフォーム回答を採点してください。

採点基準：
- 各質問に対して0点から満点までの点数を付けてください
- 満点は各質問10点とします
- 合計点と正答率（%）を計算してください
- 正答率に基づいて評価（S: 90%以上、A: 80%以上、B: 70%以上、C: 60%以上、D: 60%未満）を付けてください
- 各質問に対するフィードバックを簡潔に提供してください

出力形式（JSON）：
{
  "totalPoints": 合計点（数値）,
  "maxPoints": 満点（数値）,
  "percentage": 正答率（数値）,
  "grade": "評価（S/A/B/C/D）",
  "feedback": "総合的なフィードバック（200文字以内）",
  "details": [
    {
      "questionTitle": "質問タイトル",
      "userAnswer": "ユーザーの回答",
      "points": 得点（数値）,
      "maxPoints": 満点（数値）,
      "feedback": "質問ごとのフィードバック（100文字以内）"
    }
  ]
}

必ずJSON形式で返答してください。JSON以外のテキストは含めないでください。
`;

  const instructions = scoringInstructions || defaultInstructions;

  const prompt = `${instructions}

フォーム回答：
${formAnswersText}`;

  // モデル名を取得（gpt-5.2は存在しない可能性があるため、gpt-4o-miniをデフォルトに）
  const modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  console.log('[AIScoring] Sending request to ChatGPT API...');
  console.log('[AIScoring] Model:', modelName);
  console.log('[AIScoring] Prompt length:', prompt.length);
  console.log('[AIScoring] API Key exists:', !!process.env.OPENAI_API_KEY);

  try {
    console.log('[AIScoring] Calling OpenAI API...');
    const startTime = Date.now();
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: 'system',
          content: 'あなたは教育評価の専門家です。フォーム回答を正確に採点し、建設的なフィードバックを提供してください。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // より一貫性のある回答のため低めに設定
      response_format: { type: 'json_object' }, // JSON形式で返答を強制
    });
    const endTime = Date.now();
    console.log('[AIScoring] OpenAI API call completed in', endTime - startTime, 'ms');

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from ChatGPT API');
    }

    console.log('[AIScoring] Received response from ChatGPT API');
    console.log('[AIScoring] Response length:', content.length);

    // JSONをパース
    let scoringResult: ScoringResult;
    try {
      scoringResult = JSON.parse(content);
    } catch (parseError) {
      console.error('[AIScoring] Failed to parse JSON response:', parseError);
      console.error('[AIScoring] Response content:', content);
      
      // JSONパースに失敗した場合、テキストからJSONを抽出を試みる
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        scoringResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse ChatGPT response as JSON');
      }
    }

    // バリデーション
    if (!scoringResult.totalPoints || !scoringResult.maxPoints) {
      throw new Error('Invalid scoring result: missing totalPoints or maxPoints');
    }

    // percentageが設定されていない場合は計算
    if (!scoringResult.percentage && scoringResult.maxPoints > 0) {
      scoringResult.percentage = Math.round((scoringResult.totalPoints / scoringResult.maxPoints) * 100);
    }

    // gradeが設定されていない場合は計算
    if (!scoringResult.grade) {
      scoringResult.grade = calculateGrade(scoringResult.percentage);
    }

    console.log('[AIScoring] Scoring completed:', {
      totalPoints: scoringResult.totalPoints,
      maxPoints: scoringResult.maxPoints,
      percentage: scoringResult.percentage,
      grade: scoringResult.grade,
    });

    return scoringResult;
  } catch (error) {
    console.error('[AIScoring] Error calling ChatGPT API:', error);
    if (error instanceof Error) {
      console.error('[AIScoring] Error name:', error.name);
      console.error('[AIScoring] Error message:', error.message);
      console.error('[AIScoring] Error stack:', error.stack);
      
      // OpenAI APIのエラーの詳細を確認
      if ('status' in error) {
        console.error('[AIScoring] Error status:', (error as any).status);
      }
      if ('code' in error) {
        console.error('[AIScoring] Error code:', (error as any).code);
      }
      if ('response' in error) {
        console.error('[AIScoring] Error response:', JSON.stringify((error as any).response, null, 2));
      }
    }
    throw error;
  }
}

/**
 * 正答率から評価を計算
 */
function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'S';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  return 'D';
}

