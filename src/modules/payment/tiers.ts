/** 가격 티어 정의 */

export interface PricingTier {
  name: string;
  price: string;
  priceMonthly: number;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

export const TIERS: PricingTier[] = [
  {
    name: 'Free',
    price: '$0',
    priceMonthly: 0,
    description: 'Try creative AI sessions',
    features: [
      '5 sessions / month',
      'Basic brainstorming (SCAMPER)',
      'Shared graph (read-only)',
      'Up to 10 ideas per session',
    ],
    cta: 'Start Free',
  },
  {
    name: 'Pro',
    price: '$29',
    priceMonthly: 29,
    description: 'Full creative pipeline',
    features: [
      'Unlimited sessions',
      'Full 4I\'s pipeline',
      'Personal graph namespace',
      'Up to 50 ideas per session',
      'All 7 SCAMPER techniques',
      'Role Storming + Mind Mapping',
      'Export results (JSON/PDF)',
    ],
    cta: 'Go Pro',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: '$99',
    priceMonthly: 99,
    description: 'Heavy sessions + custom agents',
    features: [
      'Everything in Pro',
      'Heavy pipeline (ClawTeam swarm)',
      'Custom agent team templates',
      'Dedicated graph database',
      'API access (1000 calls/mo)',
      'Priority support',
    ],
    cta: 'Contact Us',
  },
];
