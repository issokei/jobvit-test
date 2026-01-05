/**
 * テキストをLINEメッセージ用に分割
 */

const CONTINUATION_NOTE = '\n\n（続きがあります。「続き」と送ってください）';

/**
 * テキストをLINEメッセージ用に分割
 */
export function splitForLine(
  text: string,
  maxLen: number = 4900,
  maxMessages: number = 5
): { chunks: string[]; rest: string } {
  const s0 = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const s = s0.trim();

  if (!s) return { chunks: ['（空の返答になりました）'], rest: '' };
  if (s.length <= maxLen) return { chunks: [s], rest: '' };

  const chunks: string[] = [];
  let rest = s;

  while (rest && chunks.length < maxMessages) {
    if (rest.length <= maxLen) {
      chunks.push(rest);
      rest = '';
      break;
    }

    const cut = findBestBreakIndex(rest, maxLen);
    const head = rest.slice(0, cut).trimEnd();
    chunks.push(head || rest.slice(0, maxLen).trimEnd());
    rest = rest.slice(cut).trimStart();
  }

  if (rest && chunks.length > 0) {
    const note = CONTINUATION_NOTE;
    const last = chunks.length - 1;
    if (chunks[last].length + note.length <= maxLen) {
      chunks[last] += note;
    } else {
      chunks[last] =
        safeTruncateByCodePoints(chunks[last], Math.max(0, maxLen - note.length - 1)).trimEnd() +
        '…' +
        note;
    }
  }

  return { chunks: chunks.length ? chunks : ['（空の返答になりました）'], rest: rest };
}

/**
 * 最適な分割位置を見つける
 */
function findBestBreakIndex(text: string, maxLen: number): number {
  const slice = text.slice(0, maxLen + 1);
  const min = Math.floor(maxLen * 0.6);

  const candidates = [
    { token: '\n\n', weight: 30 },
    { token: '。', weight: 20 },
    { token: '\n', weight: 10 },
    { token: '！', weight: 5 },
    { token: '？', weight: 5 },
    { token: '.', weight: 3 },
    { token: '!', weight: 3 },
    { token: '?', weight: 3 },
  ];

  let bestScore = -1;
  let bestIdx = -1;
  let bestLen = 0;

  for (const candidate of candidates) {
    const token = candidate.token;
    const idx = slice.lastIndexOf(token, maxLen);
    if (idx < min) continue;
    const score = candidate.weight * 100000 + idx;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = idx;
      bestLen = token.length;
    }
  }

  return bestIdx >= 0 ? bestIdx + bestLen : maxLen;
}

/**
 * コードポイント単位で安全に切り詰める
 */
function safeTruncateByCodePoints(s: string, maxChars: number): string {
  const str = String(s || '');
  if (str.length <= maxChars) return str;
  const arr = Array.from(str);
  if (arr.length <= maxChars) return str;
  return arr.slice(0, Math.max(0, maxChars - 1)).join('') + '…';
}

