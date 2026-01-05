/**
 * ES評価結果をLINEメッセージに変換
 */
import { splitForLine } from './es-review-text-split';

const CONTINUATION_NOTE = '\n\n（続きがあります。「続き」と送ってください）';

/**
 * ES評価結果テキストをLINEメッセージ用に分割
 */
export function splitESReviewForLine(
  reviewText: string,
  maxChars: number = 4900,
  maxMessages: number = 5
): { chunks: string[]; rest: string } {
  return splitForLine(reviewText, maxChars, maxMessages);
}

