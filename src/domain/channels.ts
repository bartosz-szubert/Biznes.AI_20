import type { ChannelId } from './types';

export interface ChannelMeta {
  id: ChannelId;
  name: string;
  description: string;
  /** Zalecane widełki udziału (PRD 5.3) – ostrzeżenie, nie blokada. */
  minPct: number;
  maxPct: number;
}

export const CHANNELS: Record<ChannelId, ChannelMeta> = {
  social: {
    id: 'social',
    name: 'Social media',
    description: 'Płatne kampanie i prowadzenie profili (Meta, Instagram, TikTok, LinkedIn).',
    minPct: 20,
    maxPct: 60,
  },
  www: {
    id: 'www',
    name: 'WWW',
    description: 'Strona i sklep, SEO, content, Google Ads (wyszukiwarka), e-mail marketing przez stronę.',
    minPct: 20,
    maxPct: 65,
  },
  radio: {
    id: 'radio',
    name: 'Radio',
    description: 'Spoty w radiu lokalnym lub ogólnopolskim, sponsoring audycji, radio internetowe.',
    minPct: 0,
    maxPct: 35,
  },
};
