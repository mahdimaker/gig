/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, BadgePercent, ShieldCheck, Flame } from 'lucide-react';

interface AdSlotProps {
  className?: string;
  presetIndex?: number;
  compact?: boolean;
}

const AD_OFFERS = [
  {
    sponsor: "PEPBYS",
    title: "Premium Tire Offer",
    text: "Save 15% on top-rated performance tires designed for daily gig driving.",
    code: "GIG15",
    icon: BadgePercent,
    badgeColor: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
  },
  {
    sponsor: "EVERLANCE",
    title: "Mileage Tracker & Tax Prep",
    text: "Automate 100% of your mileage tracking to secure thousands in tax write-offs.",
    code: "TAXFREE",
    icon: ShieldCheck,
    badgeColor: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
  },
  {
    sponsor: "FUELUP",
    title: "8% Fuel Cashback",
    text: "Earn premium fuel rebates instantly on your next filling station deposit.",
    code: "CASH8",
    icon: Flame,
    badgeColor: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
  },
  {
    sponsor: "DRIVEWASH",
    title: "Unlimited Washes",
    text: "Keep your rideshare passenger rating high with unlimited washes for $19.99/mo.",
    code: "CLEAN1",
    icon: Sparkles,
    badgeColor: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
  }
];

export default function AdSlot({ className = '', presetIndex, compact = false }: AdSlotProps) {
  const [ad, setAd] = useState(AD_OFFERS[0]);

  useEffect(() => {
    if (presetIndex !== undefined && presetIndex >= 0 && presetIndex < AD_OFFERS.length) {
      setAd(AD_OFFERS[presetIndex]);
    } else {
      // Pick a semi-random ad based on standard index offset or current minute to avoid too much jumpiness on fast re-renders
      const index = Math.floor(Math.random() * AD_OFFERS.length);
      setAd(AD_OFFERS[index]);
    }
  }, [presetIndex]);

  const IconComponent = ad.icon;

  if (compact) {
    return (
      <div 
        className={`bg-zinc-950 border border-zinc-900 hover:border-emerald-500/30 rounded-xl py-2.5 px-3.5 relative overflow-hidden transition-all duration-300 w-full flex items-center justify-between gap-3 ${className}`}
        id="responsive-sponsor-ad-slot-compact"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="p-1.5 bg-zinc-900 border border-zinc-800/80 rounded-lg shrink-0 text-emerald-400">
            <IconComponent className="w-3.5 h-3.5 stroke-[2]" />
          </div>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-[9px] font-mono font-extrabold uppercase text-zinc-500 shrink-0 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
              Ad
            </span>
            <span className="text-xs font-black tracking-tight text-white uppercase font-sans shrink-0">
              {ad.sponsor}
            </span>
            <span className="text-zinc-600 text-xs shrink-0 hidden sm:inline">•</span>
            <span className="text-xs text-zinc-300 font-medium truncate font-sans min-w-0">
              {ad.title}
            </span>
          </div>
        </div>

        {ad.code && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-zinc-500 font-mono hidden md:inline">Code:</span>
            <div className="flex items-center border border-emerald-500/30 bg-emerald-950/30 px-2.5 py-1 rounded-lg text-xs font-bold font-mono text-emerald-400 select-all shadow-sm">
              {ad.code}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`bg-zinc-950 border border-zinc-900 hover:border-emerald-500/30 rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-all duration-300 w-full ${className}`}
      id="responsive-sponsor-ad-slot"
    >
      {/* Sponsored Tag */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-[9px] text-zinc-500 font-mono tracking-wider font-extrabold uppercase">
          Sponsored Partner
        </span>
        <span className="text-[10px] bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800/80 text-zinc-400 font-mono font-semibold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Active Offer
        </span>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-zinc-950 border border-zinc-850 rounded-xl shrink-0 text-emerald-400">
            <IconComponent className="w-5 h-5 stroke-[1.8]" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-tight text-white uppercase font-sans">
                {ad.sponsor}
              </span>
              <span className="text-[10px] text-zinc-400 font-semibold">•</span>
              <span className="text-xs text-zinc-300 font-bold font-sans">
                {ad.title}
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-sans leading-relaxed max-w-2xl">
              {ad.text}
            </p>
          </div>
        </div>

        {/* Promo Action Code Button */}
        {ad.code && (
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <span className="text-[10px] text-zinc-500 font-sans hidden md:inline">Use code:</span>
            <div className="flex items-center border border-emerald-500/30 bg-emerald-950/20 px-3.5 py-2 rounded-xl text-xs font-bold font-mono text-emerald-400 select-all shadow-md">
              {ad.code}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
