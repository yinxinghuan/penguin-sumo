type Locale = 'zh' | 'en';

function detectLocale(): Locale {
  const override = localStorage.getItem('game_locale');
  if (override === 'en' || override === 'zh') return override;
  return 'en';
}

const dict: Record<Locale, Record<string, string>> = {
  zh: {
    title: 'Penguin Sumo',
    subtitle: 'AlterU 全明星冰上擂台',
    tap_to_start: '入场',
    again: '再来一回',
    score: '得分',
    high: '最高',
    loading: '加载中…',
    leaderboard: '排行榜',
    rule_charge: '向后拉蓄力（弹弓式）→ 松手向前弹',
    rule_push:   '撞掉 3 个对手，或撑到时间结束',
    rule_avoid:  '别冲出冰圈',
    howto_drag:  '向后拉',
    howto_dash:  '弹射',
  },
  en: {
    title: 'Penguin Sumo',
    subtitle: 'ALTERU ALL-STAR ICE BRAWL',
    tap_to_start: 'Step onto the ring',
    again: 'Rematch',
    score: 'Score',
    high: 'Best',
    loading: 'Loading…',
    leaderboard: 'Leaderboard',
    rule_charge: 'Pull back like a slingshot · release to dash forward',
    rule_push:   'KO all 3 rivals — or survive the bout',
    rule_avoid:  "Don't dash off the rink",
    howto_drag:  'DRAG BACK',
    howto_dash:  'DASH',
  },
};

let cur: Locale = detectLocale();

export function setLocale(l: Locale) {
  cur = l;
  localStorage.setItem('game_locale', l);
}

export function t(key: string, vars?: { n?: number | string }): string {
  const raw = dict[cur][key] ?? dict.en[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) => String((vars as any)[k] ?? ''));
}

export function getLocale(): Locale { return cur; }
