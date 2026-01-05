/**
 * ES評価のスコア計算と企業Fit計算
 */
import {
  ESReviewResult,
  CompanyFitResult,
  Risk,
  SIGNAL_ORDER,
  SIGNAL_DEFAULTS,
  CRITERIA_NAMES,
} from './es-review-types';
import { COMPANY_ADDONS, CompanyAddon } from './es-review-companies';

/**
 * ES評価テキストからスコアと確信度をパース
 */
export function parseScoresConfFromReview(text: string): {
  scores: Record<number, number | null>;
  confidences: Record<number, string>;
} {
  const scores: Record<number, number | null> = {};
  const confidences: Record<number, string> = {};
  const bSeen: Record<number, boolean> = {};

  // B行からパース（最優先）
  for (let i = 1; i <= 10; i++) {
    const re = new RegExp(
      `^\\(${i}\\)[^:]*:\\s*S\\s*=\\s*(NA|[0-5])\\s*\\|\\s*C\\s*=\\s*(高|中|低|NA)\\s*(?:\\||$)`,
      'm'
    );
    const m = text.match(re);
    if (m) {
      bSeen[i] = true;
      scores[i] = m[1] === 'NA' ? null : Number(m[1]);
      confidences[i] = m[2];
    }
  }

  // SCORES行から補完
  const scoreLine = findLineStartingWith(text, 'SCORES:');
  if (scoreLine) {
    scoreLine
      .replace('SCORES:', '')
      .split(',')
      .forEach((pair) => {
        const mm = pair.trim().match(/^(\d+)\s*=\s*(NA|[0-5])$/);
        if (!mm) return;
        const idx = Number(mm[1]);
        if (idx < 1 || idx > 10) return;
        if (bSeen[idx]) return; // B優先
        scores[idx] = mm[2] === 'NA' ? null : Number(mm[2]);
      });
  }

  // CONF行から補完
  const confLine = findLineStartingWith(text, 'CONF:');
  if (confLine) {
    confLine
      .replace('CONF:', '')
      .split(',')
      .forEach((pair) => {
        const mm = pair.trim().match(/^(\d+)\s*=\s*(高|中|低|NA)$/);
        if (!mm) return;
        const idx = Number(mm[1]);
        if (idx < 1 || idx > 10) return;
        if (bSeen[idx]) return; // B優先
        confidences[idx] = mm[2];
      });
  }

  // conf補完（scoreがNAでないのにconfがNAのままなら中に）
  for (let i = 1; i <= 10; i++) {
    if (scores[i] !== null && scores[i] !== undefined && confidences[i] === 'NA') {
      confidences[i] = '中';
    }
    if (scores[i] === null || scores[i] === undefined) {
      confidences[i] = 'NA';
    }
  }

  return { scores, confidences };
}

/**
 * SIGNALSとSIG_EVIDをパース
 */
export function parseSignalsSigEvidFromReview(text: string): {
  signals: Record<string, string>;
  sigEvid: Record<string, string>;
} {
  const signals: Record<string, string> = {};
  const sigEvid: Record<string, string> = {};

  // デフォルト値を設定
  for (const key of SIGNAL_ORDER) {
    signals[key] = SIGNAL_DEFAULTS[key];
  }

  // SIGNALS行をパース
  const sigStr = extractPrefixedValueMultiline(text, 'SIGNALS:');
  if (sigStr) {
    const parts = sigStr.split(',');
    for (const part of parts) {
      const mm = part.trim().match(/^([A-Z_]+)\s*=\s*(NA|[01])$/i);
      if (!mm) continue;
      const k = String(mm[1] || '').toUpperCase();
      const v = normalizeSignalValue(mm[2]);
      if (SIGNAL_ORDER.indexOf(k) === -1) continue;
      signals[k] = v;
    }
  }

  // SIG_EVID行をパース
  const evidStr = extractPrefixedValueMultiline(text, 'SIG_EVID:');
  if (evidStr) {
    const segs = evidStr.split('|');
    for (const seg of segs) {
      const s = String(seg || '').trim();
      if (!s) continue;
      let m = s.match(/^([A-Z_]+)\s*=\s*"(.*)"$/);
      if (!m) m = s.match(/^([A-Z_]+)\s*=\s*(.*)$/);
      if (!m) continue;
      const k = String(m[1] || '').toUpperCase();
      if (SIGNAL_ORDER.indexOf(k) === -1) continue;
      const ev = safeShortEvidence(m[2], 25);
      if (!ev) continue;
      sigEvid[k] = ev;
    }
  }

  // evidence enforcement
  for (const k of SIGNAL_ORDER) {
    const v = signals[k];
    if (v === '1' || v === '0') {
      if (!sigEvid[k]) {
        if (k === 'ETHICS_RED') {
          signals[k] = '0';
        } else {
          signals[k] = 'NA';
        }
      }
    }
  }

  return { signals, sigEvid };
}

/**
 * リスクフラグを抽出
 */
export function extractFlagsFromReview(text: string): { critical: number; check: number } {
  const critical = (text.match(/^\[CRITICAL\]/gm) || []).length;
  const check = (text.match(/^\[CHECK\]/gm) || []).length;
  return { critical, check };
}

/**
 * ベーススコアを計算
 */
export function calcBaseScore(scores: Record<number, number | null>): {
  n: number;
  trust: string;
  quality: number;
  conservative: number;
} {
  const vals: number[] = [];
  for (let i = 1; i <= 10; i++) {
    if (scores[i] !== null && scores[i] !== undefined) {
      vals.push(scores[i]!);
    }
  }

  const n = vals.length;
  const avg = n ? vals.reduce((a, b) => a + b, 0) / n : 0;
  const quality = n ? Math.round((avg / 5) * 100) : 0;
  const trust = n >= 7 ? '高' : n >= 4 ? '中' : '低';
  const conservative = Math.round(quality * (0.90 + 0.10 * (n / 10)));

  return { n, trust, quality, conservative };
}

/**
 * 企業別スコアを計算
 */
export function calcCompanyScores(
  scores: Record<number, number | null>,
  confidences: Record<number, string>,
  signals: Record<string, string>,
  sigEvid: Record<string, string>
): CompanyFitResult[] {
  const results: CompanyFitResult[] = [];

  for (const key in COMPANY_ADDONS) {
    const addon = COMPANY_ADDONS[key];
    const w = addon.weights || {};

    let denom = 0;
    let sumWScore = 0;

    for (let i = 1; i <= 10; i++) {
      const s = scores[i];
      if (s === null || s === undefined) continue;
      const wi = Number(w[i] || 0);
      denom += wi;
      sumWScore += wi * s;
    }

    if (denom === 0) {
      results.push({
        label: addon.label,
        quality: 0,
        conservative: 0,
        final: 0,
        cov: 0.0,
        isReference: true,
        fitNet: 0,
        fitBonus: 0,
        fitPenalty: 0,
        fitCov: 0.0,
        fitHits: [],
      });
      continue;
    }

    const cov = denom / 100;
    const quality = Math.round((sumWScore / denom) * 20);
    const conservative = Math.round(quality * (0.90 + 0.10 * cov));
    const isReference = cov < 0.6;

    // Fit計算
    const fit = computeCompanyFit(addon, scores, confidences, signals, sigEvid);
    const final = clamp(conservative + (fit.net || 0), 0, 100);

    results.push({
      label: addon.label,
      quality,
      conservative,
      final,
      cov,
      isReference,
      fitNet: fit.net || 0,
      fitBonus: fit.bonus || 0,
      fitPenalty: fit.penalty || 0,
      fitCov: Number.isFinite(fit.coverage) ? fit.coverage : 0,
      fitHits: Array.isArray(fit.hits) ? fit.hits : [],
    });
  }

  return results;
}

/**
 * 企業Fitを計算
 */
function computeCompanyFit(
  addon: CompanyAddon,
  scores: Record<number, number | null>,
  confidences: Record<number, string>,
  signals: Record<string, string>,
  sigEvid: Record<string, string>
): {
  net: number;
  bonus: number;
  penalty: number;
  coverage: number;
  hits: string[];
} {
  const fitRules = addon.fitRules || [];
  const fitCombos = addon.fitCombos || [];
  const penaltyRules = addon.penaltyRules || [];

  let ruleMax = 0;
  for (const r of fitRules) {
    const p = Number(r.points);
    if (Number.isFinite(p) && p > 0) ruleMax += p;
  }

  let comboMax = 0;
  for (const c of fitCombos) {
    const p = Number(c.points);
    if (Number.isFinite(p) && p > 0) comboMax += p;
  }

  const fitMaxRaw = addon.fitMax != null ? Number(addon.fitMax) : ruleMax + comboMax;
  const fitMax = Number.isFinite(fitMaxRaw) && fitMaxRaw > 0 ? fitMaxRaw : 20;
  const bonusMaxRaw = addon.fitBonusMax != null ? Number(addon.fitBonusMax) : 12;
  const bonusMax = Number.isFinite(bonusMaxRaw) && bonusMaxRaw >= 0 ? bonusMaxRaw : 12;

  let observed = 0;
  let hitPoints = 0;
  const hits: string[] = [];

  // rules
  for (const r of fitRules) {
    const points = Number(r.points);
    if (!Number.isFinite(points) || points <= 0) continue;

    // dim-based rule
    if (r.dim != null) {
      const d = Number(r.dim);
      if (!(d >= 1 && d <= 10)) continue;
      const s = scores[d];
      if (s == null) continue;
      observed += points;
      const minS = (r.gate && Number.isFinite(Number(r.gate.minS))) ? Number(r.gate.minS) : 3;
      const minC = (r.gate && r.gate.minC) ? String(r.gate.minC) : '中';
      const c = confidences[d] || 'NA';
      // dimベースのルールでは、gateがなくても常にチェック
      if (!r.gate || (s >= minS && confRank(c) >= confRank(minC))) {
        hitPoints += points;
        if (r.id) hits.push(String(r.id));
      }
      continue;
    }

    // signal-based rule
    const key = String(r.sig || '').toUpperCase();
    if (!key) continue;
    const v = normalizeSignalValue(signals[key] || 'NA');
    if ((v === '1' || v === '0') && !sigEvid[key]) continue;
    if (v === 'NA') continue;
    if (!passesGateAnyDim(r.gate, scores, confidences)) continue;

    observed += points;
    if (v === '1') {
      hitPoints += points;
      if (r.id) hits.push(String(r.id));
    }
  }

  // combos
  let comboPoints = 0;
  for (const c of fitCombos) {
    const points = Number(c.points);
    if (!Number.isFinite(points) || points <= 0) continue;
    const req = c.require || {};
    const keys = Object.keys(req);
    let ok = true;
    for (const k of keys) {
      const key = k.toUpperCase();
      if (normalizeSignalValue(signals[key] || 'NA') !== '1') {
        ok = false;
        break;
      }
      if (!sigEvid[key]) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    comboPoints += points;
    if (c.id) hits.push(String(c.id));
  }

  // penalty
  let penalty = 0;
  for (const p of penaltyRules) {
    const k = String(p.sig || '').toUpperCase();
    if (!k) continue;
    const v = normalizeSignalValue(signals[k] || 'NA');
    if (v !== '1') continue;
    if (!sigEvid[k]) continue;
    const pn = Number(p.penalty);
    if (Number.isFinite(pn) && pn > 0) penalty += pn;
  }

  const coverage = ruleMax > 0 ? observed / ruleMax : 0;
  const hitCapped = Math.min(fitMax, Math.max(0, hitPoints + comboPoints));
  const hitNorm = fitMax > 0 ? hitCapped / fitMax : 0;
  const bonus = Math.round(hitNorm * Math.sqrt(Math.max(0, Math.min(1, coverage))) * bonusMax);
  const net = bonus - penalty;

  return {
    net,
    bonus,
    penalty,
    coverage: Math.max(0, Math.min(1, coverage)),
    hits: hits.slice(0, 6),
  };
}

/**
 * 判定を計算
 */
export function calcDecision(
  base: { conservative: number; trust: string },
  flags: { critical: number; check: number },
  scores: Record<number, number | null>
): string {
  // 1) [CRITICAL] or (7)=0
  if (flags.critical >= 1) return '見送り';
  if (scores[7] !== null && scores[7] === 0) return '見送り';

  // 2)
  if (base.conservative >= 70 && (base.trust === '高' || base.trust === '中')) return '通過推奨';

  // 3)
  if ((base.conservative >= 55 && base.conservative <= 69) || base.trust === '低') return '保留';

  // 4)
  return '見送り';
}

/**
 * 改善優先3観点を選択
 */
export function pickImproveTop3(
  scores: Record<number, number | null>,
  confidences: Record<number, string>
): Array<{ i: number; name: string; reason: string }> {
  const confRank: Record<string, number> = { '高': 3, '中': 2, '低': 1, 'NA': 0 };
  const items: Array<{
    i: number;
    isNA: boolean;
    score: number;
    conf: string;
    confR: number;
  }> = [];

  for (let i = 1; i <= 10; i++) {
    const s = scores[i];
    const c = confidences[i] || 'NA';
    items.push({
      i,
      isNA: s === null || s === undefined,
      score: s === null || s === undefined ? -1 : s,
      conf: c,
      confR: confRank[c] ?? 0,
    });
  }

  items.sort((a, b) => {
    if (a.isNA !== b.isNA) return a.isNA ? -1 : 1;
    if (a.score !== b.score) return a.score - b.score;
    return a.confR - b.confR;
  });

  return items.slice(0, 3).map((x) => {
    const name = CRITERIA_NAMES[x.i] || `観点${x.i}`;
    const reason = x.isNA
      ? '未言及（面接で確認）'
      : `スコア${x.score}で改善余地${x.conf === '低' ? '（根拠薄）' : ''}`;
    return { i: x.i, name, reason };
  });
}

/**
 * 上位3企業を選択
 */
export function pickTop3Companies(companyRows: CompanyFitResult[]): string[] {
  const eligible = companyRows.filter((c) => !c.isReference);
  eligible.sort((a, b) => {
    const af = a.final != null ? a.final : a.conservative;
    const bf = b.final != null ? b.final : b.conservative;
    if (bf !== af) return bf - af;
    if (b.conservative !== a.conservative) return b.conservative - a.conservative;
    if (b.quality !== a.quality) return b.quality - a.quality;
    return b.cov - a.cov;
  });
  return eligible.slice(0, 3).map((x) => x.label);
}

// ヘルパー関数

function findLineStartingWith(text: string, prefix: string): string {
  const lines = String(text || '').split(/\r?\n/);
  const p = String(prefix || '');
  if (!p) return '';
  for (const line of lines) {
    if (line == null) continue;
    const trimmed = String(line).trimStart();
    if (trimmed.startsWith(p)) return trimmed;
  }
  return '';
}

function extractPrefixedValueMultiline(text: string, prefix: string): string {
  const lines = String(text || '').split(/\r?\n/);
  const p = String(prefix || '');
  if (!p) return '';

  for (let i = 0; i < lines.length; i++) {
    const line = String(lines[i] || '');
    const trimmed = line.trimStart();
    if (!trimmed.startsWith(p)) continue;

    let v = trimmed.slice(p.length).trim();
    // continuation lines
    for (let j = i + 1; j < lines.length; j++) {
      const t2 = String(lines[j] || '').trim();
      if (!t2) break;
      if (/^[A-F]\)\s*/.test(t2)) break;
      if (/^[A-Z_]+\s*:\s*/.test(t2)) break;
      if (/^\(\d+\)/.test(t2)) break;
      if (/^#/.test(t2)) break;
      if (t2.indexOf('=') !== -1) {
        v += t2.replace(/\s+/g, '');
        continue;
      }
      break;
    }
    return v;
  }
  return '';
}

function normalizeSignalValue(v: string | null | undefined): string {
  const s = String(v == null ? '' : v).trim().toUpperCase();
  if (s === '1' || s === '0' || s === 'NA') return s;
  return 'NA';
}

function safeShortEvidence(s: string | null | undefined, maxLen: number): string {
  const t = String(s == null ? '' : s)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[\u200B-\u200F\uFEFF]/g, '')
    .trim();
  const m = Math.max(5, Math.min(60, Number(maxLen || 25)));
  if (t.length <= m) return t;
  return t.slice(0, m - 1) + '…';
}

function confRank(c: string): number {
  const s = String(c || 'NA');
  if (s === '高') return 3;
  if (s === '中') return 2;
  if (s === '低') return 1;
  return 0;
}

function passesGateAnyDim(
  gate: { dims?: number[]; minS: number; minC: string } | undefined,
  scores: Record<number, number | null>,
  confidences: Record<number, string>
): boolean {
  if (!gate || typeof gate !== 'object') return true;
  const minS = Number.isFinite(Number(gate.minS)) ? Number(gate.minS) : 3;
  const minC = gate.minC ? String(gate.minC) : '中';
  const minCR = confRank(minC);
  const dims = Array.isArray(gate.dims) ? gate.dims : [];
  if (!dims.length) return true;

  for (const d of dims) {
    if (!(d >= 1 && d <= 10)) continue;
    const s = scores[d];
    if (s == null) continue;
    const c = confidences[d] || 'NA';
    if (s >= minS && confRank(c) >= minCR) return true;
  }
  return false;
}

function clamp(x: number, lo: number, hi: number): number {
  const n = Number(x);
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

