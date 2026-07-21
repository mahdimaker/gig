/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  Clock, 
  Car, 
  Milestone, 
  AlertCircle,
  HelpCircle,
  PiggyBank,
  Percent,
  Sparkles,
  Calendar,
  ChevronDown,
  ChevronUp,
  Award
} from 'lucide-react';
import { ShiftLog, PLATFORMS, VehicleProfile } from '../types';
import { formatCurrency } from '../utils';
import AdSlot from './AdSlot';

function getWeekdayFromDateStr(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  const dateObj = new Date(year, month - 1, day);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dateObj.getDay()];
}

interface StatsProps {
  logs: ShiftLog[];
  distanceUnit: string;
  profile: VehicleProfile;
}

export default function Stats({ logs, distanceUnit, profile }: StatsProps) {
  
  // Default to current weekday
  const currentDayName = useMemo(() => {
    const dayIndex = new Date().getDay();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[dayIndex];
  }, []);

  const [selectedDay, setSelectedDay] = useState<string>(currentDayName);
  // Aggregate Metrics
  const summary = useMemo(() => {
    if (logs.length === 0) return null;

    const totalGross = logs.reduce((sum, log) => sum + log.grossRevenue, 0);
    const totalNet = logs.reduce((sum, log) => sum + log.netProfit, 0);
    const totalHours = logs.reduce((sum, log) => sum + log.hoursOnline, 0);
    const totalDistance = logs.reduce((sum, log) => sum + log.distance, 0);
    
    const totalFuel = logs.reduce((sum, log) => sum + log.fuelCost, 0);
    const totalDepreciation = logs.reduce((sum, log) => sum + log.depreciationCost, 0);
    const totalLoggedExpenses = logs.reduce((sum, log) => sum + log.loggedExpenses, 0);
    const totalCosts = totalFuel + totalDepreciation + totalLoggedExpenses;

    const averageGrossHourly = totalHours > 0 ? totalGross / totalHours : 0;
    const realNetHourly = totalHours > 0 ? totalNet / totalHours : 0;

    // Estimate active driving hours vs total online (including waiting / dead time)
    const totalActiveHours = logs.reduce((sum, log) => {
      const activeRatio = log.platform === 'Uber' ? 0.70 :
                          log.platform === 'Lyft' ? 0.68 :
                          log.platform === 'DoorDash' ? 0.80 :
                          log.platform === 'UberEats' ? 0.78 :
                          log.platform === 'Instacart' ? 0.85 :
                          log.platform === 'AmazonFlex' ? 0.90 : 0.75;
      return sum + (log.hoursOnline * activeRatio);
    }, 0);

    const realNetHourlyActive = totalActiveHours > 0 ? totalNet / totalActiveHours : 0;
    const averageGrossHourlyActive = totalActiveHours > 0 ? totalGross / totalActiveHours : 0;
    const netPerHourOnline = totalHours > 0 ? totalNet / totalHours : 0;
    const netPerDistance = totalDistance > 0 ? totalNet / totalDistance : 0;
    
    const expenseRatio = totalGross > 0 ? (totalCosts / totalGross) * 100 : 0;
    const profitMargin = totalGross > 0 ? (totalNet / totalGross) * 100 : 0;

    return {
      totalGross,
      totalNet,
      totalHours,
      totalActiveHours,
      totalDistance,
      totalFuel,
      totalDepreciation,
      totalLoggedExpenses,
      totalCosts,
      averageGrossHourly,
      realNetHourly,
      realNetHourlyActive,
      averageGrossHourlyActive,
      netPerHourOnline,
      netPerDistance,
      expenseRatio,
      profitMargin,
    };
  }, [logs]);

  // Platform Efficiency Breakdown (Net profit, hourly, etc.)
  const platformStats = useMemo(() => {
    const statsMap: Record<string, { gross: number; net: number; hours: number; distance: number; shiftsCount: number }> = {};
    
    logs.forEach(log => {
      if (!statsMap[log.platform]) {
        statsMap[log.platform] = { gross: 0, net: 0, hours: 0, distance: 0, shiftsCount: 0 };
      }
      statsMap[log.platform].gross += log.grossRevenue;
      statsMap[log.platform].net += log.netProfit;
      statsMap[log.platform].hours += log.hoursOnline;
      statsMap[log.platform].distance += log.distance;
      statsMap[log.platform].shiftsCount += 1;
    });

    return Object.entries(statsMap).map(([platform, data]) => {
      const config = PLATFORMS.find(p => p.id === platform) || PLATFORMS[6];
      const hourly = data.hours > 0 ? data.net / data.hours : 0;
      const margin = data.gross > 0 ? (data.net / data.gross) * 100 : 0;
      return {
        platform,
        color: config.color,
        gross: data.gross,
        net: data.net,
        hours: data.hours,
        hourly,
        margin,
        shiftsCount: data.shiftsCount,
      };
    }).sort((a, b) => b.hourly - a.hourly); // Sort by highest real hourly wage
  }, [logs]);

  const rankedPlatforms = useMemo(() => {
    return platformStats.filter(plat => plat.shiftsCount >= 3);
  }, [platformStats]);

  const insufficientPlatforms = useMemo(() => {
    return platformStats.filter(plat => plat.shiftsCount < 3);
  }, [platformStats]);

  // Find most profitable gig platform (prioritize ranked platforms with >= 3 shifts first)
  const topPlatform = useMemo(() => {
    if (rankedPlatforms.length > 0) {
      return rankedPlatforms[0];
    }
    return platformStats.length > 0 ? platformStats[0] : null;
  }, [rankedPlatforms, platformStats]);

  // Weekday specific logs filter
  const weekdayLogs = useMemo(() => {
    return logs.filter(log => getWeekdayFromDateStr(log.date) === selectedDay);
  }, [logs, selectedDay]);

  // Weekday specific platform stats
  const weekdayPlatformStats = useMemo(() => {
    const statsMap: Record<string, { net: number; hours: number; gross: number; shiftsCount: number }> = {};
    
    weekdayLogs.forEach(log => {
      if (!statsMap[log.platform]) {
        statsMap[log.platform] = { net: 0, hours: 0, gross: 0, shiftsCount: 0 };
      }
      statsMap[log.platform].net += log.netProfit;
      statsMap[log.platform].hours += log.hoursOnline;
      statsMap[log.platform].gross += log.grossRevenue;
      statsMap[log.platform].shiftsCount += 1;
    });

    return Object.entries(statsMap)
      .map(([platform, data]) => {
        const config = PLATFORMS.find(p => p.id === platform) || PLATFORMS[6];
        const hourly = data.hours > 0 ? data.net / data.hours : 0;
        return {
          platform,
          color: config.color,
          hourly,
          net: data.net,
          hours: data.hours,
          gross: data.gross,
          shiftsCount: data.shiftsCount,
        };
      })
      .sort((a, b) => b.hourly - a.hourly); // strictly ranked from highest to lowest Net per Hour
  }, [weekdayLogs]);

  // Dynamic Strategy Insight Engine based on actual logged data
  const strategyInsight = useMemo(() => {
    if (!topPlatform || logs.length === 0) return null;

    const platformName = topPlatform.platform;
    const activeRatio = platformName === 'Uber' ? 0.70 :
                        platformName === 'Lyft' ? 0.68 :
                        platformName === 'DoorDash' ? 0.80 :
                        platformName === 'UberEats' ? 0.78 :
                        platformName === 'Instacart' ? 0.85 :
                        platformName === 'AmazonFlex' ? 0.90 : 0.75;
    
    const activeHourly = topPlatform.hours > 0 ? topPlatform.net / (topPlatform.hours * activeRatio) : 0;
    const onlineHourly = topPlatform.hours > 0 ? topPlatform.net / topPlatform.hours : 0;
    const diffPct = activeHourly > 0 ? ((activeHourly - onlineHourly) / activeHourly) * 100 : 0;
    
    const totalDist = logs.filter(l => l.platform === platformName).reduce((sum, l) => sum + l.distance, 0);
    const totalNetVal = logs.filter(l => l.platform === platformName).reduce((sum, l) => sum + l.netProfit, 0);
    const netPerDist = totalDist > 0 ? totalNetVal / totalDist : 0;

    // Scenario A: If Uber or Lyft is the top platform, or diff is high (dead-time is high)
    if (diffPct > 25 && (platformName === 'Uber' || platformName === 'Lyft')) {
      return {
        scenario: 'A',
        icon: '⏳',
        title: 'Dead-Time Alert',
        text: `You are spending significant unpaid time waiting for requests on ${platformName}. Your true hourly take-home falls by ${diffPct.toFixed(0)}% when online time is counted.`
      };
    }

    // Scenario B: If the distance is high but net per distance is relatively low (e.g., net per mile < 1.0 or net per km < 0.62)
    const threshold = distanceUnit === 'miles' ? 1.0 : 0.62;
    if (netPerDist < threshold && totalDist > 0) {
      return {
        scenario: 'B',
        icon: '⚠️',
        title: 'Distance Efficiency Warning',
        text: `While ${platformName} shows high gross payout, your Net per ${distanceUnit === 'miles' ? 'Mile' : 'km'} is low (${formatCurrency(netPerDist, profile)}/${distanceUnit === 'miles' ? 'mi' : 'km'}) due to empty return trips. Prioritize tighter radius runs.`
      };
    }

    // Scenario C: Sweet Spot (high efficiency, Instacart / AmazonFlex / DoorDash etc.)
    return {
      scenario: 'C',
      icon: '🎯',
      title: 'Current Sweet Spot',
      text: `${platformName} is currently your most mathematically efficient platform, yielding the highest combined hourly and mileage return of ${formatCurrency(onlineHourly, profile)}/hr.`
    };
  }, [topPlatform, logs, distanceUnit, profile]);

  // Dynamic Weekday Planning Tip
  const weekdayPlanningTip = useMemo(() => {
    if (!selectedDay) {
      return {
        hasData: false,
        text: `Tap any day in the planner below to view specific predictive efficiency tips.`
      };
    }
    if (weekdayPlatformStats.length === 0) {
      return {
        hasData: false,
        text: `Log shifts on ${selectedDay}s to discover your local peak-yield platform.`
      };
    }

    // Find if we have any platform with >= 3 shifts on this weekday
    const rankedWeekdayPlatforms = weekdayPlatformStats.filter(p => p.shiftsCount >= 3);
    
    if (rankedWeekdayPlatforms.length > 0) {
      const bestPlat = rankedWeekdayPlatforms[0];
      const otherPlats = weekdayPlatformStats.filter(p => p.platform !== bestPlat.platform);
      
      if (otherPlats.length > 0) {
        const avgOthers = otherPlats.reduce((sum, p) => sum + p.hourly, 0) / otherPlats.length;
        if (avgOthers > 0 && bestPlat.hourly > avgOthers) {
          const diffPct = ((bestPlat.hourly - avgOthers) / avgOthers) * 100;
          return {
            hasData: true,
            text: `Historically, ${bestPlat.platform} yields a ${diffPct.toFixed(0)}% higher Net/Hour on ${selectedDay}s based on verified data. Target this app first.`
          };
        }
      }
      
      return {
        hasData: true,
        text: `Historically, ${bestPlat.platform} is your best performer on ${selectedDay}s, yielding ${formatCurrency(bestPlat.hourly, profile)}/hr. Target this app first.`
      };
    } else {
      // All platforms have < 3 shifts on this weekday
      const bestUnranked = weekdayPlatformStats[0];
      const shiftsNeeded = 3 - bestUnranked.shiftsCount;
      return {
        hasData: false,
        text: `We see potential with ${bestUnranked.platform} on ${selectedDay}s (${formatCurrency(bestUnranked.hourly, profile)}/hr), but need ${shiftsNeeded} more logged ${shiftsNeeded === 1 ? 'shift' : 'shifts'} to declare it as a verified recommendation.`
      };
    }
  }, [weekdayPlatformStats, selectedDay, profile]);

  const allWeekdaysData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const daysFull: Record<string, string> = {
      Mon: 'Monday',
      Tue: 'Tuesday',
      Wed: 'Wednesday',
      Thu: 'Thursday',
      Fri: 'Friday',
      Sat: 'Saturday',
      Sun: 'Sunday'
    };

    return days.map(day => {
      const dayLogs = logs.filter(log => getWeekdayFromDateStr(log.date) === day);
      
      if (dayLogs.length === 0) {
        return {
          day,
          dayFull: daysFull[day],
          hasData: false,
          topPlatform: null,
          averageHourly: 0,
          rankedPlatformsList: [],
          insufficientPlatformsList: []
        };
      }

      const totalDayNet = dayLogs.reduce((sum, log) => sum + log.netProfit, 0);
      const totalDayHours = dayLogs.reduce((sum, log) => sum + log.hoursOnline, 0);
      const averageHourly = totalDayHours > 0 ? totalDayNet / totalDayHours : 0;

      const statsMap: Record<string, { net: number; hours: number; gross: number; shiftsCount: number }> = {};
      dayLogs.forEach(log => {
        if (!statsMap[log.platform]) {
          statsMap[log.platform] = { net: 0, hours: 0, gross: 0, shiftsCount: 0 };
        }
        statsMap[log.platform].net += log.netProfit;
        statsMap[log.platform].hours += log.hoursOnline;
        statsMap[log.platform].gross += log.grossRevenue;
        statsMap[log.platform].shiftsCount += 1;
      });

      const platformsList = Object.entries(statsMap)
        .map(([platform, data]) => {
          const config = PLATFORMS.find(p => p.id === platform) || PLATFORMS[6];
          const hourly = data.hours > 0 ? data.net / data.hours : 0;
          return {
            platform,
            color: config.color,
            hourly,
            net: data.net,
            hours: data.hours,
            gross: data.gross,
            shiftsCount: data.shiftsCount
          };
        })
        .sort((a, b) => b.hourly - a.hourly);

      const rankedPlatformsList = platformsList.filter(p => p.shiftsCount >= 3);
      const insufficientPlatformsList = platformsList.filter(p => p.shiftsCount < 3);

      const topPlat = rankedPlatformsList.length > 0 ? rankedPlatformsList[0] : null;

      return {
        day,
        dayFull: daysFull[day],
        hasData: true,
        topPlatform: topPlat,
        averageHourly,
        rankedPlatformsList,
        insufficientPlatformsList
      };
    });
  }, [logs]);

  if (!summary || logs.length === 0) {
    return (
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-12 text-center" id="empty-stats-state">
        <div className="bg-zinc-900 p-4 rounded-full w-14 h-14 flex items-center justify-center mx-auto text-zinc-600 border border-zinc-800">
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="font-display font-semibold text-zinc-300 mt-4 text-base">No Analytical Insights Yet</h3>
        <p className="text-xs text-zinc-500 mt-2 max-w-sm mx-auto">
          Log a few driving shifts on the Dashboard to populate custom visual financial charts, cost slices, and hourly wage analytics.
        </p>
      </div>
    );
  }

  // Slices for Cost Breakdown visualization
  const totalCostComponents = summary.totalFuel + summary.totalDepreciation + summary.totalLoggedExpenses;
  const fuelPercentage = totalCostComponents > 0 ? (summary.totalFuel / totalCostComponents) * 100 : 0;
  const depreciationPercentage = totalCostComponents > 0 ? (summary.totalDepreciation / totalCostComponents) * 100 : 0;
  const extraExpensesPercentage = totalCostComponents > 0 ? (summary.totalLoggedExpenses / totalCostComponents) * 100 : 0;

  return (
    <div className="space-y-6" id="stats-tab-container">
      
      {/* Dynamic Key Insights Alert Banner */}
      <section className="bg-gradient-to-r from-emerald-950/25 to-zinc-950 border border-emerald-900/40 rounded-2xl p-5" id="stats-key-insights">
        <div className="flex flex-col gap-3">
          {/* Header Row: Icon + Title */}
          <div className="flex items-center gap-3">
            <div className="bg-emerald-950/80 border border-emerald-800 p-2.5 rounded-xl text-emerald-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-display font-bold text-base text-zinc-100 uppercase tracking-wider">
              Smart Gig Driver Recommendation
            </h3>
          </div>
          
          {/* Body content breakout (Full width) */}
          <div className="pt-1">
            <p className="text-sm text-zinc-350 leading-relaxed">
              {topPlatform && topPlatform.hourly > 0 ? (
                <>
                  Based on your real cost auditing, <span className="font-black text-emerald-400">{topPlatform.platform}</span> is your highest-yielding platform at{' '}
                  <span className="font-black text-emerald-350 font-mono">{formatCurrency(topPlatform.hourly, profile)}/hr</span> net (after depreciation and gas). 
                  Your general business overhead takes up <span className="font-black font-mono text-amber-400">{summary.expenseRatio.toFixed(0)}%</span> of your total gross income. Keep focusing on high-tip, lower-mileage runs to increase this profit margin.
                </>
              ) : (
                "Your logged shifts show an active profit. Continue tracking mileage to construct a perfect cost model for tax deductions."
              )}
            </p>
          </div>
        </div>
      </section>

      {/* 1 + 3 + 3 Grid Strategy */}
      <section className="space-y-4" id="stats-metrics-grid">
        {/* Top Row: Full-Width Premium Card */}
        <div className="bg-zinc-950 border border-emerald-500/30 p-6 rounded-2xl relative overflow-hidden font-mono shadow-lg shadow-emerald-950/10">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/[0.03] rounded-full blur-2xl"></div>
          <span className="text-sm text-emerald-400 uppercase tracking-widest block font-sans font-black">
            Total Real Profit
          </span>
          <span className="text-4xl sm:text-5xl md:text-6xl font-black text-emerald-400 mt-3 block tracking-tight">
            {formatCurrency(summary.totalNet, profile)}
          </span>
          <span className="text-xs sm:text-sm text-zinc-500 mt-3 block font-sans">
            Tax deductible ready • Fully audited gig net earnings
          </span>
        </div>

        {/* Middle Row: 3-Column Horizontal Grid */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          {/* Real Net Hourly */}
          <div className="bg-zinc-950 border border-zinc-900/80 p-3.5 pb-5.5 sm:p-5 sm:pb-7 rounded-2xl relative overflow-hidden font-mono flex flex-col justify-between">
            <div>
              <span className="text-[10px] sm:text-xs text-zinc-400 uppercase tracking-wider block font-sans font-black">
                Real Net Hourly
              </span>
              <span className="text-lg sm:text-xl md:text-3xl font-black text-zinc-100 mt-2 block">
                {formatCurrency(summary.realNetHourlyActive, profile)}<span className="text-xs font-normal text-zinc-500">/hr</span>
              </span>
            </div>
            <span className="text-xs text-zinc-400 mt-2 block font-sans leading-tight">
              Gross Active: {formatCurrency(summary.averageGrossHourlyActive, profile)}/hr
            </span>
          </div>

          {/* Net per Hour */}
          <div className="bg-zinc-950 border border-zinc-900/80 p-3.5 pb-5.5 sm:p-5 sm:pb-7 rounded-2xl relative overflow-hidden font-mono flex flex-col justify-between">
            <div>
              <span className="text-[10px] sm:text-xs text-zinc-400 uppercase tracking-wider block font-sans font-black">
                Net per Hour
              </span>
              <span className="text-lg sm:text-xl md:text-3xl font-black text-zinc-100 mt-2 block">
                {formatCurrency(summary.netPerHourOnline, profile)}<span className="text-xs font-normal text-zinc-500">/hr</span>
              </span>
            </div>
            <span className="text-xs text-zinc-400 mt-2 block font-sans leading-tight">
              True hourly take-home
            </span>
          </div>

          {/* Shift Break-Even */}
          <div className="bg-zinc-950 border border-zinc-900/80 p-3.5 pb-5.5 sm:p-5 sm:pb-7 rounded-2xl relative overflow-hidden font-mono flex flex-col justify-between">
            <div>
              <span className="text-[10px] sm:text-xs text-zinc-400 uppercase tracking-wider block font-sans font-black">
                Shift Break-Even
              </span>
              <span className="text-lg sm:text-xl md:text-3xl font-black text-amber-400 mt-2 block">
                {formatCurrency(summary.totalCosts, profile)}
              </span>
            </div>
            <span className="text-xs text-zinc-400 mt-2 block font-sans leading-tight">
              Gross needed to cover costs
            </span>
          </div>
        </div>

        {/* Bottom Row: 3-Column Horizontal Grid */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          {/* Total Distance */}
          <div className="bg-zinc-950 border border-zinc-900/80 p-3.5 pb-5.5 sm:p-5 sm:pb-7 rounded-2xl relative overflow-hidden font-mono flex flex-col justify-between">
            <div>
              <span className="text-[10px] sm:text-xs text-zinc-400 uppercase tracking-wider block font-sans font-black">
                Total Distance
              </span>
              <span className="text-lg sm:text-xl md:text-3xl font-black text-zinc-100 mt-2 block">
                {summary.totalDistance.toLocaleString()} <span className="text-xs font-normal text-zinc-500">{distanceUnit}</span>
              </span>
            </div>
            <span className="text-xs text-zinc-400 mt-2 block font-sans leading-tight">
              Across {logs.length} logged shifts
            </span>
          </div>

          {/* Net per Mile */}
          <div className="bg-zinc-950 border border-zinc-900/80 p-3.5 pb-5.5 sm:p-5 sm:pb-7 rounded-2xl relative overflow-hidden font-mono flex flex-col justify-between">
            <div>
              <span className="text-[10px] sm:text-xs text-zinc-400 uppercase tracking-wider block font-sans font-black">
                Net per {distanceUnit === 'miles' ? 'Mile' : 'km'}
              </span>
              <span className="text-lg sm:text-xl md:text-3xl font-black text-blue-400 mt-2 block">
                {formatCurrency(summary.netPerDistance, profile)}<span className="text-xs font-normal text-zinc-500">/{distanceUnit === 'miles' ? 'mi' : 'km'}</span>
              </span>
            </div>
            <span className="text-xs text-zinc-400 mt-2 block font-sans leading-tight">
              True asset efficiency
            </span>
          </div>

          {/* Overhead Costs */}
          <div className="bg-zinc-950 border border-zinc-900/80 p-3.5 pb-5.5 sm:p-5 sm:pb-7 rounded-2xl relative overflow-hidden font-mono flex flex-col justify-between">
            <div>
              <span className="text-[10px] sm:text-xs text-rose-400 uppercase tracking-wider block font-sans font-black">
                Overhead Costs
              </span>
              <span className="text-lg sm:text-xl md:text-3xl font-black text-rose-400 mt-2 block">
                {formatCurrency(summary.totalCosts, profile)}
              </span>
            </div>
            <span className="text-xs text-zinc-400 mt-2 block font-sans leading-tight">
              {summary.expenseRatio.toFixed(0)}% of revenue to expenses
            </span>
          </div>
        </div>
      </section>

      {/* Platform Efficiency Rank (Single column layout for clean spacing with ad slot) */}
      <section className="grid grid-cols-1 gap-6" id="stats-rankings-section">

        {/* Chart 2: Platform Efficiency & Net Margins */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4">
          <div>
            <h4 className="font-display font-semibold text-sm text-zinc-200 uppercase tracking-wider">
              Platform Efficiency Rank
            </h4>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Ranked by Real Net Hourly Wage. Which app gets you the best return?
            </p>
          </div>

          <div className="space-y-5 pt-2">
            {/* Ranked Platforms (Minimum 3 shifts required) */}
            {rankedPlatforms.length > 0 ? (
              <div className="space-y-4">
                {rankedPlatforms.map((plat, index) => {
                  const maxHourly = Math.max(...platformStats.map(p => p.hourly), 20);
                  const barWidth = (plat.hourly / maxHourly) * 100;
                  const isUber = plat.color === '#111111';

                  return (
                    <div key={plat.platform} className="space-y-1.5 font-mono">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[10px] font-bold font-mono text-zinc-400 bg-zinc-900 border border-zinc-800/80 px-1.5 py-0.5 rounded-md min-w-[22px] text-center">
                            #{index + 1}
                          </span>
                          <span 
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${isUber ? 'border border-zinc-500 shadow-[0_0_4px_rgba(255,255,255,0.25)]' : ''}`} 
                            style={{ backgroundColor: plat.color }} 
                          />
                          <span className="font-bold text-zinc-300">{plat.platform}</span>
                          <span className="text-[10px] text-zinc-500 font-normal">({plat.shiftsCount} shifts)</span>
                        </div>
                        <div className="text-right">
                          <span className="text-emerald-400 font-extrabold">{formatCurrency(plat.hourly, profile)}/hr</span>
                          <span className="text-[10px] text-zinc-500 block">Margin: {plat.margin.toFixed(0)}%</span>
                        </div>
                      </div>

                      {/* Horizontal wage comparison bar */}
                      <div className="w-full bg-zinc-900/60 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className={`h-2.5 rounded-full transition-all duration-500 ${isUber ? 'border border-zinc-700 shadow-[0_0_8px_rgba(255,255,255,0.15)] bg-zinc-950' : ''}`} 
                          style={{ 
                            width: `${barWidth}%`,
                            backgroundColor: plat.color 
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-5 bg-zinc-900/10 border border-zinc-900/40 border-dashed rounded-xl">
                <span className="text-[11px] text-zinc-500 font-sans">No platforms have reached the 3-shift threshold to rank yet.</span>
              </div>
            )}

            {/* Insufficient Data Platforms */}
            {insufficientPlatforms.length > 0 && (
              <div className="pt-4 border-t border-zinc-900/60 space-y-3">
                <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider block">
                  ⏳ Insufficient Data (Less than 3 shifts)
                </span>
                <div className="space-y-4">
                  {insufficientPlatforms.map((plat) => {
                    const maxHourly = Math.max(...platformStats.map(p => p.hourly), 20);
                    const barWidth = (plat.hourly / maxHourly) * 100;
                    const shiftsNeeded = 3 - plat.shiftsCount;
                    const isUber = plat.color === '#111111';

                    return (
                      <div key={plat.platform} className="space-y-1.5 font-mono opacity-50 transition-opacity hover:opacity-75">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2.5">
                            <span className="text-[11px] font-bold text-amber-500 bg-amber-950/20 border border-amber-900/30 w-6 h-6 flex items-center justify-center rounded-md shrink-0" title="Shift minimum not met">
                              ⏳
                            </span>
                            <span 
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${isUber ? 'border border-zinc-500 shadow-[0_0_4px_rgba(255,255,255,0.25)]' : ''}`} 
                              style={{ backgroundColor: plat.color }} 
                            />
                            <span className="font-bold text-zinc-400">{plat.platform}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-zinc-400 font-bold">{formatCurrency(plat.hourly, profile)}/hr</span>
                            <span className="text-[10px] text-amber-500/80 block font-semibold">
                              Need {shiftsNeeded} more {shiftsNeeded === 1 ? 'shift' : 'shifts'} to rank
                            </span>
                          </div>
                        </div>

                        {/* Horizontal wage comparison bar */}
                        <div className="w-full bg-zinc-900/40 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${isUber ? 'border border-zinc-700 shadow-[0_0_8px_rgba(255,255,255,0.15)] bg-zinc-950' : ''}`} 
                            style={{ 
                              width: `${barWidth}%`,
                              backgroundColor: plat.color 
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {strategyInsight && (
            <div className="bg-zinc-900/10 border border-zinc-900 p-3.5 rounded-xl text-[11px] text-zinc-400 leading-relaxed font-sans mt-3">
              <span className="font-bold text-zinc-300">{strategyInsight.icon} {strategyInsight.title}:</span> {strategyInsight.text}
            </div>
          )}
        </div>

      </section>

      {/* Analytics Tab Placement: Full-width ad slot directly between the "Platform Efficiency Rank" card and the "Weekday Efficiency Planner" card */}
      <AdSlot presetIndex={2} />

      <section className="grid grid-cols-1 gap-6" id="weekday-efficiency-planner-section">

        {/* WEEKDAY EFFICIENCY PLANNER Card */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4 flex flex-col justify-between" id="weekday-efficiency-planner">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <h4 className="font-display font-semibold text-sm text-zinc-200 uppercase tracking-wider">
                  Weekday Efficiency Planner
                </h4>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Tap any day to reveal the absolute ranked efficiency of each platform.
              </p>
            </div>

            {/* Accordion List Structure (7 Rows) */}
            <div className="space-y-2.5" id="weekday-accordion-list">
              {allWeekdaysData.map((item) => {
                const isExpanded = selectedDay === item.day;
                const topPlat = item.topPlatform;
                const hasLogs = item.hasData;

                return (
                  <div 
                    key={item.day} 
                    className={`border rounded-xl overflow-hidden transition-all duration-300 ${
                      isExpanded 
                        ? 'bg-zinc-900/40 border-slate-700' 
                        : 'bg-zinc-950 border-zinc-900/60 hover:border-zinc-800/80'
                    }`}
                  >
                    {/* Collapsed State (Row Header) */}
                    <button
                      onClick={() => setSelectedDay(isExpanded ? '' : item.day)}
                      className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left transition-colors cursor-pointer select-none"
                    >
                      {/* Left: Day Name & Muted Insufficient Data label next to title */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="font-display font-bold text-xs sm:text-sm text-zinc-200 tracking-wide uppercase">
                          {item.dayFull}
                        </span>
                        {hasLogs && !topPlat && (
                          <span className="text-[10px] sm:text-xs text-zinc-500 font-medium flex items-center gap-1 select-none">
                            ⏳ Insufficient Data
                          </span>
                        )}
                      </div>

                      {/* Center: Compact Badge */}
                      <div className="flex-1 px-1.5 flex justify-start sm:justify-center">
                        {hasLogs ? (
                          topPlat ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-900/50 text-[9px] sm:text-xs font-semibold text-emerald-400">
                              🏆 {topPlat.platform}
                            </span>
                          ) : null
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-900/40 border border-zinc-900 text-[9px] sm:text-[10px] font-medium text-zinc-500">
                            No Data
                          </span>
                        )}
                      </div>

                      {/* Right: Avg Net/Hour + Chevron */}
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="font-mono text-xs sm:text-sm font-bold text-zinc-100">
                          {hasLogs ? `${formatCurrency(item.averageHourly, profile)}/hr` : '--'}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-zinc-400 transition-transform" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-zinc-500 transition-transform" />
                        )}
                      </div>
                    </button>

                    {/* Expanded State (Dynamic Content) */}
                    {isExpanded && (
                      <div className="border-t border-zinc-900/80 px-4 pb-4 pt-3.5 space-y-3.5 bg-zinc-950/50">
                        {hasLogs && (item.rankedPlatformsList.length > 0 || item.insufficientPlatformsList.length > 0) ? (
                          (() => {
                            const allPlats = [...item.rankedPlatformsList, ...item.insufficientPlatformsList];
                            const maxHourly = Math.max(...allPlats.map(p => p.hourly), 1);

                            return (
                              <div className="space-y-4">
                                {/* Ranked Platforms */}
                                {item.rankedPlatformsList.length > 0 && (
                                  <div className="space-y-3">
                                    {item.rankedPlatformsList.map((plat, idx) => {
                                      const barWidth = (plat.hourly / maxHourly) * 100;
                                      const isUber = plat.color === '#111111';
                                      return (
                                        <div key={plat.platform} className="space-y-1.5 font-mono">
                                          <div className="flex justify-between items-center text-[11px] sm:text-xs">
                                            <div className="flex items-center gap-2">
                                              <span className="text-[9px] font-bold font-mono text-zinc-400 bg-zinc-900 border border-zinc-800/80 px-1.5 py-0.5 rounded-md min-w-[20px] text-center">
                                                #{idx + 1}
                                              </span>
                                              <span 
                                                className={`w-2 h-2 rounded-full shrink-0 ${isUber ? 'border border-zinc-500 shadow-[0_0_4px_rgba(255,255,255,0.25)]' : ''}`} 
                                                style={{ backgroundColor: plat.color }} 
                                              />
                                              <span className="font-sans font-bold text-zinc-300">{plat.platform}</span>
                                              <span className="text-[9px] text-zinc-500 font-normal">({plat.shiftsCount} shifts)</span>
                                            </div>
                                            <div className="text-right">
                                              <span className="text-emerald-400 font-extrabold">
                                                {formatCurrency(plat.hourly, profile)}/hr
                                              </span>
                                            </div>
                                          </div>

                                          {/* Horizontal relative progress bar */}
                                          <div className="w-full bg-zinc-900/60 rounded-full h-1.5 sm:h-2 overflow-hidden">
                                            <div 
                                              className={`h-1.5 sm:h-2 rounded-full transition-all duration-500 ${isUber ? 'border border-zinc-700 shadow-[0_0_8px_rgba(255,255,255,0.15)] bg-zinc-950' : ''}`} 
                                              style={{ 
                                                width: `${barWidth}%`,
                                                backgroundColor: plat.color 
                                              }}
                                            />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Divider between ranked and unranked if both exist */}
                                {item.rankedPlatformsList.length > 0 && item.insufficientPlatformsList.length > 0 && (
                                  <div className="border-t border-zinc-900/40 my-2"></div>
                                )}

                                {/* Insufficient Platforms */}
                                {item.insufficientPlatformsList.length > 0 && (
                                  <div className="space-y-3">
                                    {item.rankedPlatformsList.length === 0 && (
                                      <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-wider block mb-1">
                                        Insufficient Data (Less than 3 shifts)
                                      </span>
                                    )}
                                    {item.insufficientPlatformsList.map((plat) => {
                                      const barWidth = (plat.hourly / maxHourly) * 100;
                                      const shiftsNeeded = 3 - plat.shiftsCount;
                                      const isUber = plat.color === '#111111';
                                      return (
                                        <div key={plat.platform} className="space-y-1.5 font-mono opacity-60">
                                          <div className="flex justify-between items-center text-[11px] sm:text-xs">
                                            <div className="flex items-center gap-2">
                                              <span 
                                                className={`w-2 h-2 rounded-full shrink-0 ${isUber ? 'border border-zinc-500 shadow-[0_0_4px_rgba(255,255,255,0.25)]' : ''}`} 
                                                style={{ backgroundColor: plat.color }} 
                                              />
                                              <span className="font-sans font-bold text-zinc-400">{plat.platform}</span>
                                            </div>
                                            <div className="text-right">
                                              <span className="text-zinc-400 font-bold">
                                                {formatCurrency(plat.hourly, profile)}/hr
                                              </span>
                                              <span className="text-[9px] text-amber-500/80 block font-semibold font-sans">
                                                Need {shiftsNeeded} more {shiftsNeeded === 1 ? 'shift' : 'shifts'} to rank
                                              </span>
                                            </div>
                                          </div>

                                          {/* Horizontal relative progress bar */}
                                          <div className="w-full bg-zinc-900/40 rounded-full h-1 overflow-hidden">
                                            <div 
                                              className={`h-1 rounded-full transition-all duration-500 ${isUber ? 'border border-zinc-700 shadow-[0_0_8px_rgba(255,255,255,0.15)] bg-zinc-950' : ''}`} 
                                              style={{ 
                                                width: `${barWidth}%`,
                                                backgroundColor: plat.color 
                                              }}
                                            />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        ) : (
                          <div className="text-center py-6 px-4 border border-zinc-900/50 border-dashed rounded-xl">
                            <Calendar className="w-5 h-5 text-zinc-600 mx-auto mb-1.5" />
                            <h5 className="text-[11px] font-bold text-zinc-400">No Shift Logs on {item.dayFull}</h5>
                            <p className="text-[10px] text-zinc-500 mt-1 max-w-[220px] mx-auto leading-relaxed">
                              Log driving sessions on this day of the week to unlock predictive efficiency mapping.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-zinc-900/20 border border-zinc-900/60 p-3 rounded-xl text-[10px] text-zinc-400 leading-tight font-sans mt-2">
            {weekdayPlanningTip.hasData ? '🎯' : '💡'}{' '}
            <span className="font-semibold text-zinc-200">
              {weekdayPlanningTip.hasData ? 'Pro-Tip' : 'Planning tip'}:
            </span>{' '}
            {weekdayPlanningTip.text}
          </div>
        </div>

      </section>

      {/* Slices of Overhead Cost Breakdown */}
      <section className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4" id="stats-cost-breakdown-panel">
        <div>
          <h4 className="font-display font-semibold text-sm text-zinc-200 uppercase tracking-wider">
            Where Does Your Money Go?
          </h4>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Breakdown of every dollar spent operating your gig vehicle.
          </p>
        </div>

        {/* Visual Multi-Segment progress track */}
        <div className="space-y-2.5">
          <div className="w-full bg-zinc-900 h-6 rounded-xl overflow-hidden flex font-mono text-[10px] text-black font-extrabold shadow-inner">
            {summary.totalFuel > 0 && (
              <div 
                className="bg-amber-400 hover:opacity-90 transition-opacity flex items-center justify-center" 
                style={{ width: `${fuelPercentage}%` }}
                title={`Fuel: ${formatCurrency(summary.totalFuel, profile)}`}
              >
                {fuelPercentage > 12 && `Fuel ${fuelPercentage.toFixed(0)}%`}
              </div>
            )}
            {summary.totalDepreciation > 0 && (
              <div 
                className="bg-orange-500 hover:opacity-90 transition-opacity flex items-center justify-center text-zinc-100" 
                style={{ width: `${depreciationPercentage}%` }}
                title={`Depreciation: ${formatCurrency(summary.totalDepreciation, profile)}`}
              >
                {depreciationPercentage > 12 && `Wear ${depreciationPercentage.toFixed(0)}%`}
              </div>
            )}
            {summary.totalLoggedExpenses > 0 && (
              <div 
                className="bg-rose-500 hover:opacity-90 transition-opacity flex items-center justify-center text-zinc-100" 
                style={{ width: `${extraExpensesPercentage}%` }}
                title={`Expenses: ${formatCurrency(summary.totalLoggedExpenses, profile)}`}
              >
                {extraExpensesPercentage > 12 && `Road Exp ${extraExpensesPercentage.toFixed(0)}%`}
              </div>
            )}
          </div>

          {/* Legend Table */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs font-mono">
            <div className="bg-zinc-900/30 border border-zinc-900/50 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-amber-400 rounded-sm"></span>
                <span className="text-zinc-400 font-sans">Gasoline / Fuel</span>
              </div>
              <span className="text-zinc-200 font-bold">{formatCurrency(summary.totalFuel, profile)}</span>
            </div>

            <div className="bg-zinc-900/30 border border-zinc-900/50 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-orange-500 rounded-sm"></span>
                <span className="text-zinc-400 font-sans">Wear & Depreciation</span>
              </div>
              <span className="text-zinc-200 font-bold">{formatCurrency(summary.totalDepreciation, profile)}</span>
            </div>

            <div className="bg-zinc-900/30 border border-zinc-900/50 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-rose-500 rounded-sm"></span>
                <span className="text-zinc-400 font-sans">Extra Road Expenses</span>
              </div>
              <span className="text-zinc-200 font-bold">{formatCurrency(summary.totalLoggedExpenses, profile)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Chart 1: Revenue vs Cost Breakdown bar chart (at the very bottom of the Analytics view) */}
      <section className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4" id="stats-take-home-profit-chart">
        <div>
          <h4 className="font-display font-semibold text-sm text-zinc-200 uppercase tracking-wider">
            Shift-by-Shift Take-Home Profit
          </h4>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Gross Revenue vs. Real Net Profit comparison per logged session.
          </p>
        </div>

        {/* SVG Custom Chart */}
        <div className="h-64 flex items-end justify-between gap-2 pt-6 font-mono text-[9px] text-zinc-500 border-b border-zinc-900 pb-2">
          {logs.slice(-7).map((log, index) => {
            // Find max revenue for scaling
            const maxVal = Math.max(...logs.map(l => l.grossRevenue), 100);
            const grossHeight = (log.grossRevenue / maxVal) * 80; // max 80% height
            const netHeight = (Math.max(log.netProfit, 0) / maxVal) * 80;

            return (
              <div key={log.id} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end relative group">
                
                {/* Tooltip on hover */}
                <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-zinc-900 border border-zinc-800 text-zinc-200 text-[10px] px-2 py-1 rounded shadow-xl z-20 whitespace-nowrap text-center font-sans">
                  <p className="font-bold text-zinc-300">{log.platform} ({log.date})</p>
                  <p className="text-zinc-400 mt-0.5">Gross: {formatCurrency(log.grossRevenue, profile)}</p>
                  <p className="text-emerald-400 font-bold">Net: {formatCurrency(log.netProfit, profile)}</p>
                </div>

                {/* Dual Bar stack */}
                <div className="w-full flex justify-center gap-1 items-end h-full">
                  {/* Gross Bar (Slate) */}
                  <div 
                    className="w-3 sm:w-4 bg-zinc-800 rounded-t-sm transition-all duration-500" 
                    style={{ height: `${grossHeight}%` }}
                  />
                  {/* Net Profit Bar (Mint/Emerald) */}
                  <div 
                    className="w-3 sm:w-4 bg-emerald-500 rounded-t-sm transition-all duration-500 glow-emerald" 
                    style={{ height: `${netHeight}%` }}
                  />
                </div>

                {/* Label (Platform + date short) */}
                <div className="text-center font-semibold text-zinc-400 mt-1 uppercase scale-90">
                  {log.platform.substring(0, 4)}
                </div>
                <div className="text-[8px] text-zinc-600">
                  {log.date.split('-')[2]}
                </div>
              </div>
            );
          })}
        </div>

        {/* Chart Legend */}
        <div className="flex justify-center gap-5 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <span className="w-3 h-3 bg-zinc-800 rounded-sm inline-block"></span>
            <span>Gross Payout</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-3 h-3 bg-emerald-500 rounded-sm inline-block"></span>
            <span>Real Net Profit</span>
          </div>
        </div>
      </section>

      {/* Global Footer Placement: bottom ad slot container at the very end of this tab view */}
      <AdSlot presetIndex={2} className="mt-8" />

    </div>
  );
}
