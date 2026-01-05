/**
 * 企業アドオン定義
 */
import { CompanyAddon } from './es-review-types';

export const COMPANY_ADDONS: Record<string, CompanyAddon> = {
  panasonic: {
    label: 'パナソニック',
    core: 'WEI（Will＝志と挑戦、EQ＝共感・人を動かす力、Integrity＝誠実）',
    emphasis: [6, 7, 2, 3],
    bonusNote: '"自分本位でなく誰かのために" の動機・使命感が見えると加点（ただし美辞麗句のみは加点しない）',
    weights: { 1: 10, 2: 12, 3: 12, 4: 8, 5: 12, 6: 14, 7: 14, 8: 8, 9: 6, 10: 4 },
    checks: [
      'Will：本人の言葉で「何を成し遂げたいか」＋行動があるか',
      'EQ：相手の感情・状況を捉え、合意形成/巻き込みで成果を出したか',
      'Integrity：不都合な状況で正直・公正に振る舞った痕跡があるか',
    ],
    aliases: [
      'panasonic',
      'パナソニック',
      'panasonic holdings',
      'パナソニックホールディングス',
      'パナソニックホールディングス株式会社',
      'panasonic hd',
      'パナソニックhd',
    ],
    fitMax: 20,
    fitBonusMax: 12,
    fitRules: [
      { id: 'WILL', sig: 'WILL', points: 6, gate: { dims: [2, 3], minS: 3, minC: '中' } },
      { id: 'EQ', sig: 'EMPATHY', points: 6, gate: { dims: [6, 5], minS: 3, minC: '中' } },
      { id: 'INTEG', sig: 'INTEGRITY', points: 5, gate: { dims: [7], minS: 3, minC: '中' } },
    ],
    fitCombos: [
      { id: 'WEI', require: { WILL: 1, EMPATHY: 1, INTEGRITY: 1 }, points: 3 },
    ],
    penaltyRules: [
      { id: 'ETHICS', sig: 'ETHICS_RED', penalty: 12 },
    ],
  },
  rohto: {
    label: 'ロート製薬',
    core: '自ら考え自ら動く、自律自走。現状に満足せず殻を破る挑戦。好奇心と変化対応。',
    emphasis: [3, 2, 8, 9, 1],
    bonusNote: '"前例にとらわれない発想→検証→学び" のサイクルがあると強い',
    weights: { 1: 11, 2: 13, 3: 13, 4: 9, 5: 11, 6: 9, 7: 10, 8: 12, 9: 10, 10: 2 },
    checks: [
      'ベンチャーマインド：自分で機会を作った/未整備を整えた経験があるか',
      '変化耐性：未知や混乱を楽しむ/学びに変える描写があるか',
    ],
    aliases: [
      'rohto',
      'rohto pharmaceutical',
      'rohto pharmaceutical co',
      'rohto pharmaceutical co., ltd.',
      'rohto pharma',
      'ロート製薬',
      'ロート',
      'ロート製薬株式会社',
    ],
    fitMax: 20,
    fitBonusMax: 12,
    fitRules: [
      { id: 'INNOV', sig: 'INNOV', points: 5, gate: { dims: [2, 3], minS: 3, minC: '中' } },
      { id: 'ITER', sig: 'ITER', points: 5, gate: { dims: [8], minS: 3, minC: '中' } },
      { id: 'ADAPT', sig: 'ADAPT', points: 4, gate: { dims: [9], minS: 3, minC: '中' } },
      { id: 'TRANSFORM', sig: 'TRANSFORM', points: 4, gate: { dims: [3, 1], minS: 3, minC: '中' } },
    ],
    fitCombos: [
      { id: 'CYCLE', require: { INNOV: 1, ITER: 1 }, points: 2 },
    ],
    penaltyRules: [
      { id: 'ETHICS', sig: 'ETHICS_RED', penalty: 12 },
    ],
  },
  nomura: {
    label: '野村（證券/グループ）',
    core: '高い目標へのコミット、タフさ、学び続ける姿勢、誠実、協働',
    emphasis: [7, 4, 8, 1, 2],
    bonusNote: '"厳しい環境でも学び続け、成果を出す" が見えると強い',
    weights: { 1: 14, 2: 12, 3: 10, 4: 13, 5: 9, 6: 8, 7: 14, 8: 12, 9: 6, 10: 2 },
    checks: [
      'タフさ：逆境時の行動が具体（工夫・継続・再挑戦）か',
      '倫理観：成果のためのルール逸脱を正当化していないか（強い減点対象）',
    ],
    aliases: [
      'nomura',
      'nomura securities',
      'nomura holdings',
      'nomura group',
      'nomura hd',
      '野村',
      '野村證券',
      '野村証券',
      '野村證券株式会社',
      '野村証券株式会社',
      '野村ホールディングス',
      '野村ホールディングス株式会社',
      '野村グループ',
      '野村（證券/グループ）',
      '野村（証券/グループ）',
    ],
    fitMax: 20,
    fitBonusMax: 12,
    fitRules: [
      { id: 'KPI', sig: 'KPI', points: 5, gate: { dims: [4], minS: 3, minC: '中' } },
      { id: 'TOUGH', sig: 'TOUGH', points: 5, gate: { dims: [4], minS: 3, minC: '中' } },
      { id: 'INTEG', sig: 'INTEGRITY', points: 4, gate: { dims: [7], minS: 3, minC: '中' } },
      { id: 'LEARN', dim: 8, points: 4, gate: { minS: 3, minC: '中' } },
    ],
    fitCombos: [
      { id: 'GRIT', require: { KPI: 1, TOUGH: 1 }, points: 2 },
    ],
    penaltyRules: [
      { id: 'ETHICS', sig: 'ETHICS_RED', penalty: 12 },
    ],
  },
  asahiKasei: {
    label: '旭化成',
    core: '未知を恐れず挑戦。周囲を巻き込みチームで前進。意思決定のスピード感（迅速果断）も示唆。',
    emphasis: [2, 1, 3, 5, 9],
    bonusNote: '"不確実な状況で仮説→実行→修正" の描写があると加点',
    weights: { 1: 13, 2: 13, 3: 12, 4: 10, 5: 12, 6: 8, 7: 10, 8: 8, 9: 10, 10: 4 },
    checks: [
      '未知への勇気：前例がない/先が読めない状況で動いたか',
      '巻き込み：関係者を動かすコミュニケーションがあるか',
    ],
    aliases: [
      'asahi kasei',
      'asahikasei',
      'asahi kasei corp',
      '旭化成',
      '旭化成株式会社',
      '旭化成グループ',
    ],
    fitMax: 20,
    fitBonusMax: 12,
    fitRules: [
      { id: 'ITER', sig: 'ITER', points: 6, gate: { dims: [8], minS: 3, minC: '中' } },
      { id: 'ADAPT', sig: 'ADAPT', points: 5, gate: { dims: [9], minS: 3, minC: '中' } },
      { id: 'COORD', sig: 'COORD', points: 5, gate: { dims: [6, 5], minS: 3, minC: '中' } },
      { id: 'TRANSFORM', sig: 'TRANSFORM', points: 2, gate: { dims: [3, 1], minS: 3, minC: '中' } },
    ],
    fitCombos: [
      { id: 'UNCERTAIN', require: { ITER: 1, ADAPT: 1 }, points: 2 },
    ],
    penaltyRules: [
      { id: 'ETHICS', sig: 'ETHICS_RED', penalty: 12 },
    ],
  },
  nttWest: {
    label: 'NTT西日本',
    core: '夢を描き未来を創る。しなやかさ。変化を楽しむ好奇心。イノベーション志向。',
    emphasis: [9, 8, 2, 3, 1],
    bonusNote: '"変化に前向き＋行動に落としているか" を重視（理想論だけは加点しない）',
    weights: { 1: 11, 2: 12, 3: 11, 4: 9, 5: 10, 6: 9, 7: 10, 8: 12, 9: 12, 10: 4 },
    checks: [
      'ビジョン：未来に対する関心（社会課題/地域課題など）と行動の接続があるか',
      '変化耐性：計画変更・環境変化での具体対応があるか',
    ],
    aliases: [
      'ntt西日本',
      'nttwest',
      'ntt west',
      'ntt-west',
      'ntt west japan',
      '西日本電信電話',
      '西日本電信電話株式会社',
    ],
    fitMax: 20,
    fitBonusMax: 12,
    fitRules: [
      { id: 'VISION', sig: 'VISION', points: 6, gate: { dims: [10], minS: 3, minC: '中' } },
      { id: 'ADAPT', sig: 'ADAPT', points: 5, gate: { dims: [9], minS: 3, minC: '中' } },
      { id: 'INNOV', sig: 'INNOV', points: 4, gate: { dims: [2, 3], minS: 3, minC: '中' } },
      { id: 'TRANSFORM', sig: 'TRANSFORM', points: 3, gate: { dims: [3, 1], minS: 3, minC: '中' } },
    ],
    fitCombos: [
      { id: 'FUTURE_ACTION', require: { VISION: 1, TRANSFORM: 1 }, points: 2 },
    ],
    penaltyRules: [
      { id: 'ETHICS', sig: 'ETHICS_RED', penalty: 12 },
    ],
  },
  msAioiLife: {
    label: '三井住友海上あいおい生命',
    core: '関わる方々の「想い」を大事にする共感力。チームワーク。学び続け、失敗を恐れず変革に挑む。',
    emphasis: [6, 5, 7, 8, 10],
    bonusNote: '"相手の感情・背景を理解し、信頼を積み上げる行動" を高評価',
    weights: { 1: 9, 2: 10, 3: 9, 4: 9, 5: 13, 6: 13, 7: 12, 8: 11, 9: 8, 10: 6 },
    checks: [
      '共感：相手の「想い」を理解→行動に反映した描写があるか',
      'サービスマインド：自分の成果より相手の安心・納得を優先した経験があるか',
    ],
    aliases: [
      '三井住友海上あいおい生命',
      '三井住友海上あいおい生命保険',
      '三井住友海上あいおい生命保険株式会社',
      'あいおい生命',
      'あいおい生命保険',
      'ms&adあいおい生命',
      'msadあいおい生命',
      'ms&ad aioi life',
      'msad aioi life',
    ],
    fitMax: 20,
    fitBonusMax: 12,
    fitRules: [
      { id: 'EMPATHY', sig: 'EMPATHY', points: 7, gate: { dims: [6, 5], minS: 3, minC: '中' } },
      { id: 'SERVICE', sig: 'SERVICE', points: 7, gate: { dims: [10], minS: 3, minC: '中' } },
      { id: 'INTEG', sig: 'INTEGRITY', points: 4, gate: { dims: [7], minS: 3, minC: '中' } },
    ],
    fitCombos: [
      { id: 'TRUST', require: { EMPATHY: 1, SERVICE: 1 }, points: 2 },
    ],
    penaltyRules: [
      { id: 'ETHICS', sig: 'ETHICS_RED', penalty: 12 },
    ],
  },
  kddi: {
    label: 'KDDI',
    core: 'あるべき姿に向け具体目標を立ててやり抜く。周囲と真摯に向き合い、思いを一つにして変革する。',
    emphasis: [1, 4, 3, 5, 2],
    bonusNote: '"ゴール設計→実行管理→巻き込み" が揃うと強い',
    weights: { 1: 13, 2: 11, 3: 13, 4: 12, 5: 11, 6: 9, 7: 10, 8: 9, 9: 9, 10: 3 },
    checks: [
      '変革力：現状維持ではなく改善/改革に踏み込んだか',
      '実行力：計画・KPI・期限・役割分担など実務的要素があるか',
    ],
    aliases: [
      'kddi',
      'kddi株式会社',
      'kddi corporation',
      'kddi corp',
      'kddi corp.',
    ],
    fitMax: 20,
    fitBonusMax: 12,
    fitRules: [
      { id: 'KPI', sig: 'KPI', points: 7, gate: { dims: [4], minS: 3, minC: '中' } },
      { id: 'TRANSFORM', sig: 'TRANSFORM', points: 6, gate: { dims: [3, 1], minS: 3, minC: '中' } },
      { id: 'COORD', sig: 'COORD', points: 5, gate: { dims: [6, 5], minS: 3, minC: '中' } },
    ],
    fitCombos: [
      { id: 'EXEC_CHANGE', require: { KPI: 1, TRANSFORM: 1, COORD: 1 }, points: 2 },
    ],
    penaltyRules: [
      { id: 'ETHICS', sig: 'ETHICS_RED', penalty: 12 },
    ],
  },
  hankyuHanshinHd: {
    label: '阪急阪神ホールディングス',
    core: '1) 誠実に向かい合う（多様なステークホルダーに誠実） / 2) 360度、働きかける（主体的調整・巻き込み・推進） / 3) 志をもち、挑み続ける（公共性/社会性のある使命感＋挑戦継続）',
    emphasis: [7, 6, 5, 3, 10],
    bonusNote: '"誠実さ＋調整/巻き込み＋使命感ある挑戦継続" が行動として具体に描かれていると高評価',
    weights: { 1: 10, 2: 10, 3: 12, 4: 9, 5: 12, 6: 12, 7: 14, 8: 8, 9: 8, 10: 5 },
    checks: [
      'ステークホルダー視点：自分以外（利用者/地域/関係者）の利害を整理し誠実に対応したか',
      '調整力：意見の違いをまとめ、プロジェクトを前に進めた描写があるか',
    ],
    aliases: [
      '阪急阪神ホールディングス',
      '阪急阪神ホールディングス株式会社',
      '阪急阪神hd',
      '阪急阪神HD',
      '阪急阪神',
      'hankyu hanshin holdings',
      'hankyu hanshin hd',
      'hankyu hanshin',
    ],
    fitMax: 20,
    fitBonusMax: 12,
    fitRules: [
      { id: 'STAKE', sig: 'STAKE', points: 7, gate: { dims: [10], minS: 3, minC: '中' } },
      { id: 'COORD', sig: 'COORD', points: 6, gate: { dims: [6, 5], minS: 3, minC: '中' } },
      { id: 'INTEG', sig: 'INTEGRITY', points: 5, gate: { dims: [7], minS: 3, minC: '中' } },
    ],
    fitCombos: [
      { id: 'PUBLIC_COORD', require: { STAKE: 1, COORD: 1 }, points: 2 },
    ],
    penaltyRules: [
      { id: 'ETHICS', sig: 'ETHICS_RED', penalty: 12 },
    ],
  },
};

/**
 * 企業名から企業アドオンを取得
 */
export function getCompanyAddon(companyName: string): CompanyAddon | null {
  if (!companyName) return null;
  
  const normalized = normalizeCompanyName(companyName);
  if (!normalized) return null;

  for (const key in COMPANY_ADDONS) {
    const addon = COMPANY_ADDONS[key];
    if (addon.aliases.some(alias => normalizeCompanyName(alias) === normalized)) {
      return addon;
    }
  }

  return null;
}

/**
 * 企業名を正規化
 */
function normalizeCompanyName(name: string): string {
  return String(name || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[株式会社|有限会社|合同会社|合資会社|合名会社]/g, '')
    .trim();
}

