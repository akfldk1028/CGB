import { TIERS } from '@/modules/payment/tiers';
import { Check } from 'lucide-react';

export default function PricingPage() {
  return (
    <main className="pt-24 pb-16 px-6 max-w-5xl mx-auto">
      <h1 className="text-4xl font-bold text-center mb-3">Pricing</h1>
      <p className="text-white/50 text-center mb-16 max-w-lg mx-auto">
        Start free. Scale as your creative graph grows.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className={`glass rounded-2xl p-7 flex flex-col ${
              tier.highlighted
                ? 'border-amber-500/40 ring-1 ring-amber-500/20'
                : ''
            }`}
          >
            {tier.highlighted && (
              <div className="text-xs font-semibold text-amber-400 mb-2 uppercase tracking-wider">
                Most Popular
              </div>
            )}
            <h2 className="text-xl font-bold">{tier.name}</h2>
            <div className="mt-3 mb-1">
              <span className="text-4xl font-bold">{tier.price}</span>
              {tier.priceMonthly > 0 && <span className="text-white/40 text-sm">/month</span>}
            </div>
            <p className="text-white/50 text-sm mb-6">{tier.description}</p>

            <ul className="space-y-3 flex-1 mb-8">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-white/70">
                  <Check className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              className={`w-full py-3 rounded-xl font-medium text-sm transition ${
                tier.highlighted
                  ? 'bg-gradient-to-r from-amber-500 to-purple-500 text-white hover:opacity-90'
                  : 'border border-white/20 text-white/80 hover:border-white/40'
              }`}
            >
              {tier.cta}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
