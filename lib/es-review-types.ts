/**
 * ES評価システムの型定義
 */

export interface CompanyAddon {
  label: string;
  core: string;
  emphasis?: number[];
  bonusNote: string;
  weights: Record<number, number>; // 1-10の観点に対する重み
  checks: string[];
  aliases: string[];
  // Fit計算用（Plan B）
  fitMax?: number;
  fitBonusMax?: number;
  fitRules?: FitRule[];
  fitCombos?: FitCombo[];
  penaltyRules?: PenaltyRule[];
}

export interface FitRule {
  id: string;
  sig?: string; // SIGNAL名
  dim?: number; // 観点番号（1-10）
  points: number;
  gate?: {
    dims: number[];
    minS: number;
    minC: string;
  };
}

export interface FitCombo {
  id: string;
  require: Record<string, number>;
  points: number;
}

export interface PenaltyRule {
  id: string;
  sig: string;
  penalty: number;
}

export interface ESReviewResult {
  summary: {
    situation?: string;
    task?: string;
    action?: string;
    result?: string;
    learning?: string;
  };
  scores: Record<number, number | null>; // 1-10の観点スコア（nullはNA）
  confidences: Record<number, string>; // 1-10の確信度（高/中/低/NA）
  signals: Record<string, string>; // SIGNALS（0/1/NA）
  sigEvid: Record<string, string>; // SIGNALSの根拠
  companyFit: CompanyFitResult[];
  risks: Risk[];
  decision: string; // 通過推奨 / 保留 / 見送り
  baseScore: {
    n: number;
    trust: string;
    quality: number;
    conservative: number;
  };
  top3Companies: string[];
  improveTop3: Array<{ i: number; name: string; reason: string }>;
}

export interface CompanyFitResult {
  label: string;
  quality: number;
  conservative: number;
  final: number;
  cov: number;
  isReference: boolean;
  fitNet: number;
  fitBonus: number;
  fitPenalty: number;
  fitCov: number;
  fitHits: string[];
}

export interface Risk {
  type: 'CRITICAL' | 'CHECK';
  message: string;
}

export interface ESReviewState {
  companyName?: string;
  continuation?: string;
}

// SIGNALSの固定キー順
export const SIGNAL_ORDER = [
  'WILL',
  'KPI',
  'ITER',
  'INNOV',
  'TRANSFORM',
  'ADAPT',
  'EMPATHY',
  'SERVICE',
  'COORD',
  'STAKE',
  'VISION',
  'TOUGH',
  'INTEGRITY',
  'ETHICS_RED',
];

// SIGNALSのデフォルト値
export const SIGNAL_DEFAULTS: Record<string, string> = Object.fromEntries(
  SIGNAL_ORDER.map(k => [k, k === 'ETHICS_RED' ? '0' : 'NA'])
);

// 観点名
export const CRITERIA_NAMES: Record<number, string> = {
  1: '課題発見・問題解決力',
  2: 'チャレンジ精神・向上心',
  3: '主体性・行動力',
  4: 'やり抜く力（粘り強さ）',
  5: '協働性・チームワーク',
  6: 'コミュニケーション・周囲巻き込み力（EQ/影響力含む）',
  7: '誠実性・倫理観（Integrity）',
  8: '学習意欲・自己成長力（Learning Agility）',
  9: '適応力・柔軟性',
  10: '顧客志向・社会貢献マインド（利他・ステークホルダー配慮）',
};

