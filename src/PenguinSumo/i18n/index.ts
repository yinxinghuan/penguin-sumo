type Locale = 'zh' | 'en';

function detectLocale(): Locale {
  // Default to English. Players can opt into Chinese via localStorage.
  const override = localStorage.getItem('game_locale');
  if (override === 'en' || override === 'zh') return override;
  return 'en';
}

const dict: Record<Locale, Record<string, string>> = {
  zh: {
    title: 'Penguin Sumo',
    subtitle: '南极冰原。一群走失的小企鹅。一只盯着你的贼鸥。',
    tap_to_start: '开始营救',
    rescued: '救出了 {n} 只小企鹅',
    again: '再次挑战',
    score: '得分',
    high: '最高',
    loading: '努力加载中...',
    leaderboard: '排行榜',
    rule_collect: '触碰小企鹅，连成长队',
    rule_dodge:   '贼鸥从天上俯冲，碰到就 game over',
    rule_control: '按住屏幕任意位置拖动 = 摇杆',
  },
  en: {
    title: 'Penguin Sumo',
    subtitle: 'SAVE THE BABIES · DODGE THE SKUA',
    tap_to_start: 'Start rescue',
    rescued: 'Rescued {n} babies',
    again: 'Try again',
    score: 'Score',
    high: 'Best',
    loading: 'Loading…',
    leaderboard: 'Leaderboard',
    rule_collect: 'Touch babies to chain them behind you',
    rule_dodge:   'Skua dives from above — one hit, game over',
    rule_control: 'Hold + drag anywhere = joystick',
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
