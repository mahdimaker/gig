/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Car, 
  Plus, 
  Coins, 
  Sparkles, 
  SquareParking, 
  ShieldAlert, 
  DollarSign, 
  Clock, 
  Milestone, 
  TrendingUp, 
  AlertCircle,
  X,
  Check,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  FileText,
  Activity,
  Loader2,
  Sliders
} from 'lucide-react';
import { VehicleProfile, ShiftLog, ExpenseItem, PLATFORMS } from '../types';
import { computeShiftMetrics, formatCurrency } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import AdSlot from './AdSlot';
import RangeSliderModal, { SliderModalType } from './RangeSliderModal';

interface DashboardProps {
  profile: VehicleProfile;
  onLogShift: (shift: ShiftLog) => void;
  onNavigateToSettings: () => void;
  onUpdateProfile: (newProfile: VehicleProfile) => void;
}

const getPlatformActiveClasses = (platformId: string) => {
  switch (platformId) {
    case 'Uber':
      return 'bg-zinc-950 border-zinc-600 text-zinc-100 hover:bg-zinc-900 shadow-[0_0_12px_rgba(255,255,255,0.05)] font-bold';
    case 'Lyft':
      return 'bg-pink-950/60 border-pink-500/80 text-pink-300 hover:bg-pink-900/40 shadow-[0_0_12px_rgba(236,72,153,0.15)] font-bold';
    case 'DoorDash':
      return 'bg-red-950/60 border-red-500/80 text-red-300 hover:bg-red-900/40 shadow-[0_0_12px_rgba(239,68,68,0.15)] font-bold';
    case 'UberEats':
      return 'bg-emerald-950/60 border-emerald-500/80 text-emerald-300 hover:bg-emerald-900/40 shadow-[0_0_12px_rgba(16,185,129,0.15)] font-bold';
    case 'Instacart':
      return 'bg-green-950/60 border-green-500/80 text-green-300 hover:bg-green-900/40 shadow-[0_0_12px_rgba(34,197,94,0.15)] font-bold';
    case 'AmazonFlex':
      return 'bg-amber-950/60 border-amber-500 text-amber-300 hover:bg-amber-900/40 shadow-[0_0_12px_rgba(245,158,11,0.15)] font-bold';
    default:
      return 'bg-zinc-800 border-zinc-600 text-zinc-200 hover:bg-zinc-700 shadow-[0_0_12px_rgba(156,163,175,0.1)] font-bold';
  }
};

export default function Dashboard({ profile, onLogShift, onNavigateToSettings, onUpdateProfile }: DashboardProps) {
  // Local state for the log form
  const [grossRevenueInput, setGrossRevenueInput] = useState<string>('');
  const [hoursPart, setHoursPart] = useState<string>('');
  const [minutesPart, setMinutesPart] = useState<string>('');
  const [distanceInput, setDistanceInput] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<typeof PLATFORMS[number]['id']>('Uber');
  const [shiftNotes, setShiftNotes] = useState<string>('');
  const [shiftDate, setShiftDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activeFuelPrice, setActiveFuelPrice] = useState<string>(profile.fuelPrice.toString());

  // Update active fuel price input when global profile changes
  useEffect(() => {
    setActiveFuelPrice(profile.fuelPrice.toString());
  }, [profile.fuelPrice]);

  // Running expense items attached to the unsaved shift
  const [shiftExpenses, setShiftExpenses] = useState<ExpenseItem[]>([]);
  const [customExpenseCategory, setCustomExpenseCategory] = useState<string>('Other');
  const [customExpenseAmount, setCustomExpenseAmount] = useState<string>('');
  const [showCustomExpenseModal, setShowCustomExpenseModal] = useState<boolean>(false);

  // Success message after logging a shift
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);

  // Submit button visual states: 'idle' | 'loading' | 'success'
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  // Active form tab on mobile ('entry' | 'simulator')
  const [activeFormTab, setActiveFormTab] = useState<'entry' | 'simulator'>('entry');

  // Interactive Range Slider Modal state ('income' | 'distance' | 'time' | null)
  const [sliderModalType, setSliderModalType] = useState<SliderModalType>(null);

  const handleConfirmIncome = (val: number) => {
    setGrossRevenueInput(val > 0 ? val.toFixed(2) : '');
  };

  const handleConfirmDistance = (val: number) => {
    setDistanceInput(val > 0 ? val.toFixed(1) : '');
  };

  const handleConfirmTime = (hrs: number, mins: number) => {
    setHoursPart(hrs > 0 ? hrs.toString() : '');
    setMinutesPart(mins > 0 ? mins.toString() : '');
  };

  // Collapsible accordions state for layout density
  const [isExpensesExpanded, setIsExpensesExpanded] = useState<boolean>(false);
  const [isNotesExpanded, setIsNotesExpanded] = useState<boolean>(false);

  // Parsed values
  const grossRevenue = parseFloat(grossRevenueInput) || 0;
  const hoursOnline = (parseFloat(hoursPart) || 0) + ((parseFloat(minutesPart) || 0) / 60);
  const distance = parseFloat(distanceInput) || 0;
  const parsedActiveFuelPrice = parseFloat(activeFuelPrice) || 0;

  // Custom vehicle profile overrides with active fuel price
  const activeProfileForCalculation = useMemo(() => {
    return {
      ...profile,
      fuelPrice: parsedActiveFuelPrice,
    };
  }, [profile, parsedActiveFuelPrice]);

  // Real-time calculation based on profile and inputs
  const liveMetrics = useMemo(() => {
    return computeShiftMetrics(
      grossRevenue,
      hoursOnline,
      distance,
      shiftExpenses,
      activeProfileForCalculation
    );
  }, [grossRevenue, hoursOnline, distance, shiftExpenses, activeProfileForCalculation]);

  // Form validations & helper alerts
  const canSubmit = grossRevenue > 0 && hoursOnline > 0 && distance > 0 && parsedActiveFuelPrice > 0;
  const showWearWarning = distance > 0 && profile.depreciationRate > 0;

  // Helper styles and content for Submit/Log Button (Desktop and Sticky Mobile)
  const getButtonStyles = (isMobile: boolean) => {
    const displayClass = isMobile ? 'flex md:hidden w-full max-w-md' : 'hidden md:flex w-full';
    const baseClass = `${displayClass} py-3.5 px-4 rounded-xl font-bold text-base transition-all duration-300 items-center justify-center gap-2 shadow-2xl border`;

    if (!canSubmit) {
      return `${baseClass} bg-zinc-800/40 text-zinc-500 border-zinc-900/60 cursor-not-allowed`;
    }

    if (submitStatus === 'loading') {
      return `${baseClass} bg-zinc-900 border-emerald-500/50 text-zinc-300 cursor-wait animate-pulse max-w-[200px] rounded-full mx-auto`;
    }

    if (submitStatus === 'success') {
      return `${baseClass} bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold scale-100 shadow-[0_0_20px_rgba(16,185,129,0.3)]`;
    }

    // Active state: depends on profit or loss
    const isPositive = liveMetrics.netProfit >= 0;
    if (isPositive) {
      return `${baseClass} bg-zinc-900 hover:bg-zinc-900/80 border-emerald-500/40 hover:border-emerald-500 text-zinc-300 cursor-pointer active:scale-[0.98] shadow-[0_4px_20px_rgba(16,185,129,0.05)]`;
    } else {
      return `${baseClass} bg-zinc-900 hover:bg-zinc-900/80 border-rose-500/40 hover:border-rose-500 text-zinc-300 cursor-pointer active:scale-[0.98] shadow-[0_4px_20px_rgba(244,63,94,0.05)]`;
    }
  };

  const renderButtonContent = () => {
    if (submitStatus === 'loading') {
      return (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400 stroke-[3]" />
          <span>Logging...</span>
        </>
      );
    }
    if (submitStatus === 'success') {
      return (
        <>
          <Check className="w-4 h-4 text-emerald-400 stroke-[3] scale-110 animate-bounce" />
          <span>Saved!</span>
        </>
      );
    }

    const hasInputs = grossRevenue > 0 || distance > 0 || hoursOnline > 0;
    if (!hasInputs) {
      return (
        <>
          <Plus className="w-4 h-4 stroke-[3] text-zinc-400" />
          <span>Log Active Shift</span>
        </>
      );
    }

    const isPositive = liveMetrics.netProfit >= 0;
    return (
      <>
        <Plus className={`w-4 h-4 stroke-[3] ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`} />
        <span>Log Shift ({isPositive ? 'Net' : 'Loss'}:&nbsp;</span>
        <span className={isPositive ? 'text-[#00e676] font-extrabold font-mono' : 'text-[#ff5252] font-extrabold font-mono'}>
          {formatCurrency(liveMetrics.netProfit, profile)}
        </span>
        <span>)</span>
      </>
    );
  };

  // Quick expense logging triggers
  const handleQuickAddExpense = (category: 'Tolls' | 'Car Wash' | 'Parking' | 'Fines' | 'Other', defaultAmount?: number, notes?: string) => {
    if (defaultAmount !== undefined) {
      const newExpense: ExpenseItem = {
        id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        category,
        amount: defaultAmount,
        timestamp: new Date().toISOString(),
        notes: notes || undefined,
      };
      setShiftExpenses(prev => [...prev, newExpense]);
    } else {
      setCustomExpenseCategory(category);
      setCustomExpenseAmount('');
      setShowCustomExpenseModal(true);
    }
  };

  const handleCustomExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(customExpenseAmount);
    if (amount > 0) {
      const newExpense: ExpenseItem = {
        id: `exp-${Date.now()}`,
        category: customExpenseCategory as any,
        amount,
        timestamp: new Date().toISOString(),
      };
      setShiftExpenses(prev => [...prev, newExpense]);
      setShowCustomExpenseModal(false);
    }
  };

  const handleRemoveExpense = (id: string) => {
    setShiftExpenses(prev => prev.filter(e => e.id !== id));
  };

  const handleAddGross = (amount: number) => {
    const currentVal = parseFloat(grossRevenueInput) || 0;
    const newVal = currentVal + amount;
    setGrossRevenueInput(Number(newVal.toFixed(2)).toString());
  };

  const toggleNoteTag = (tag: string) => {
    setShiftNotes((prev) => {
      const trimPrev = prev.trim();
      if (!trimPrev) return tag;
      if (trimPrev.includes(tag)) {
        const regex = new RegExp(`(^|\\s*,?\\s*)${tag}(\\s*,?\\s*|$)`, 'g');
        const cleaned = trimPrev.replace(regex, ' ').replace(/\s+/g, ' ').trim();
        return cleaned.endsWith(',') ? cleaned.slice(0, -1).trim() : cleaned;
      } else {
        return `${trimPrev}, ${tag}`;
      }
    });
  };

  const handleSubmitShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitStatus !== 'idle') return;

    setSubmitStatus('loading');

    setTimeout(() => {
      // Check if the price was overridden
      const isPriceChanged = Math.abs(parsedActiveFuelPrice - profile.fuelPrice) > 0.001;

      // If overridden, update global profile and calibration history log
      if (isPriceChanged) {
        const updatedHistory = [
          ...(profile.fuelPriceHistory || []),
          { date: new Date().toISOString(), price: parsedActiveFuelPrice }
        ];
        onUpdateProfile({
          ...profile,
          fuelPrice: parsedActiveFuelPrice,
          fuelPriceHistory: updatedHistory,
        });
      }

      const newLog: ShiftLog = {
        id: `shift-${Date.now()}`,
        date: shiftDate,
        platform: selectedPlatform,
        grossRevenue,
        hoursOnline,
        distance,
        fuelCost: liveMetrics.fuelCost,
        depreciationCost: liveMetrics.depreciationCost,
        loggedExpenses: liveMetrics.loggedExpenses,
        expensesList: [...shiftExpenses],
        netProfit: liveMetrics.netProfit,
        hourlyWage: liveMetrics.hourlyWage,
        notes: shiftNotes.trim() || undefined,
      };

      onLogShift(newLog);
      setSubmitStatus('success');

      setTimeout(() => {
        // Reset Form
        setGrossRevenueInput('');
        setHoursPart('');
        setMinutesPart('');
        setDistanceInput('');
        setShiftNotes('');
        setShiftExpenses([]);
        setShiftDate(new Date().toISOString().split('T')[0]);
        setSubmitStatus('idle');
      }, 1500);

    }, 1000);
  };

  return (
    <div className="space-y-6 pb-28 md:pb-6" id="dashboard-tab-container">
      
      {/* Toast Alert removed as per user instruction */}

      {/* Compact Horizontal Tabs for Mobile */}
      <div className="flex md:hidden bg-zinc-950 border border-zinc-900 p-1.5 rounded-2xl mb-2" id="dashboard-mobile-tabs">
        <button
          type="button"
          onClick={() => setActiveFormTab('entry')}
          className={`flex-1 py-3 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-all duration-200 ${
            activeFormTab === 'entry'
              ? 'bg-zinc-900 border border-zinc-800 text-emerald-400 font-bold shadow'
              : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Log Entry</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveFormTab('simulator')}
          className={`flex-1 py-3 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-all duration-200 ${
            activeFormTab === 'simulator'
              ? 'bg-zinc-900 border border-zinc-800 text-emerald-400 font-bold shadow'
              : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Live Simulator</span>
        </button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Input Forms & Actions (7 Cols) */}
        <div className={`lg:col-span-7 space-y-6 ${activeFormTab === 'entry' ? 'block' : 'hidden md:block'}`}>

          {/* VEHICLE PROFILE CARD (Dashboard Exclusive) */}
          <section 
            id="vehicle-profile-card"
            className="hidden md:block bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-950/80 border border-emerald-800 p-3 rounded-xl text-emerald-400">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display font-semibold text-zinc-100 text-lg">
                      {profile.year} {profile.make} {profile.model}
                    </h2>
                    <span className="text-xs bg-zinc-800 text-zinc-300 uppercase tracking-wider px-2.5 py-0.5 rounded-full font-mono font-semibold">
                      Active
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300 mt-0.5">
                    Continuous real-time cost calculation engine configured
                  </p>
                </div>
              </div>
              <button 
                onClick={onNavigateToSettings}
                className="text-sm text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors bg-emerald-950/40 border border-emerald-900/50 hover:border-emerald-800/60 px-3 py-1.5 rounded-lg"
                id="edit-vehicle-button"
              >
                Change Rates
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Configured rates breakdown */}
            <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-zinc-900 font-mono">
              <div className="bg-zinc-900/30 border border-zinc-900/50 p-2.5 rounded-xl">
                <p className="text-xs uppercase font-semibold text-zinc-400 tracking-wider">Avg Consumption</p>
                <p className="text-base font-semibold text-zinc-200 mt-1">
                  {profile.fuelConsumption} <span className="text-sm text-zinc-400">{profile.distanceUnit === 'miles' ? (profile.measurementSystem === 'uk' ? 'UK MPG' : 'MPG') : 'L/100km'}</span>
                </p>
              </div>
              <div className="bg-zinc-900/30 border border-zinc-900/50 p-2.5 rounded-xl">
                <p className="text-xs uppercase font-semibold text-zinc-400 tracking-wider">Fuel Cost rate</p>
                <p className="text-base font-semibold text-zinc-200 mt-1">
                  {formatCurrency(profile.fuelPrice, profile)} <span className="text-sm text-zinc-400">/{profile.fuelUnit === 'gallons' ? 'gal' : 'L'}</span>
                </p>
              </div>
              <div className="bg-zinc-900/30 border border-zinc-900/50 p-2.5 rounded-xl">
                <p className="text-xs uppercase font-semibold text-zinc-400 tracking-wider">Depreciation</p>
                <p className="text-base font-semibold text-zinc-200 mt-1">
                  {formatCurrency(profile.depreciationRate, profile)} <span className="text-sm text-zinc-400">/{profile.distanceUnit === 'miles' ? 'mi' : 'km'}</span>
                </p>
              </div>
            </div>
          </section>

          {/* LOG NEW SHIFT CARD */}
          <section 
            id="log-shift-card"
            className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6"
          >
            <form id="log-shift-form" onSubmit={handleSubmitShift} className="space-y-5">
              
              {/* Quick Platform Badges with brand identity colors */}
              <div className="space-y-1.5">
                <span className="block text-sm font-bold text-zinc-300 uppercase tracking-wider select-none">
                  Quick Select Platform
                </span>
                <div className="grid grid-cols-6 gap-2">
                  {PLATFORMS.map((p, index) => {
                    const isSelected = selectedPlatform === p.id;
                    const activeClasses = getPlatformActiveClasses(p.id);
                    // First 4 items (indices 0, 1, 2, 3) get col-span-3 (2 per row in a 6-col grid)
                    // Remaining 3 items (indices 4, 5, 6) get col-span-2 (3 per row in a 6-col grid)
                    const colSpanClass = index < 4 ? 'col-span-3' : 'col-span-2';
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => setSelectedPlatform(p.id)}
                        className={`${colSpanClass} text-xs sm:text-sm px-1.5 sm:px-3 py-2.5 rounded-lg border font-medium transition-all duration-200 cursor-pointer active:scale-95 select-none text-center flex items-center justify-center truncate ${
                          isSelected
                            ? activeClasses
                            : 'bg-zinc-900/30 border-zinc-800/80 text-zinc-300 hover:border-zinc-750 hover:text-zinc-100'
                        }`}
                      >
                        {p.id}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Core Metrics Group (Gross Income, Distance, Hours Online) - Single Column, High Density */}
              <div className="grid grid-cols-1 gap-4">
                
                {/* 1. Gross Revenue with Dedicated Row for Touch-Friendly Quick Add buttons */}
                <div 
                  onClick={() => setSliderModalType('income')}
                  className="bg-zinc-900/40 border border-zinc-900/90 hover:border-emerald-500/50 py-4 px-4.5 rounded-xl relative transition-all cursor-pointer group select-none"
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-sm font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
                      <DollarSign className="w-4 h-4 text-emerald-400" /> Gross Income
                    </label>
                    <div className="flex items-center gap-1 text-sm font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-900/60 px-2.5 py-0.5 rounded-md group-hover:bg-emerald-900/40 transition-colors">
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Slider</span>
                    </div>
                  </div>
                  
                  <div className="relative mt-1 flex items-center">
                    <span className="text-3xl font-black text-zinc-500 font-mono select-none mr-1">
                      {profile.measurementSystem === 'uk' ? '£' : profile.measurementSystem === 'metric' ? '€' : '$'}
                    </span>
                    <input
                      type="text"
                      readOnly
                      placeholder="0.00"
                      value={grossRevenueInput}
                      className="w-full bg-transparent border-none text-zinc-100 text-3xl font-black font-mono focus:outline-none cursor-pointer py-2.5"
                    />
                  </div>

                  {/* Quick Add Buttons on a dedicated row beneath the large value input */}
                  <div className="flex gap-2.5 mt-2 pt-1 border-t border-zinc-900/40" onClick={(e) => e.stopPropagation()}>
                    {[5, 10, 20].map((amt) => (
                      <button
                        type="button"
                        key={amt}
                        onClick={() => handleAddGross(amt)}
                        className="flex-1 text-center text-sm font-mono font-bold bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-750 text-emerald-400 hover:text-emerald-300 py-2.5 px-3 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer active:scale-95 select-none"
                      >
                        +{profile.measurementSystem === 'uk' ? '£' : profile.measurementSystem === 'metric' ? '€' : '$'}{amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Shift Distance */}
                <div 
                  onClick={() => setSliderModalType('distance')}
                  className="bg-zinc-900/40 border border-zinc-900/90 hover:border-amber-500/50 py-4 px-4.5 rounded-xl relative transition-all cursor-pointer group select-none"
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-sm font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
                      <Milestone className="w-4 h-4 text-amber-500" /> Distance
                    </label>
                    <div className="flex items-center gap-1 text-sm font-bold text-amber-400 bg-amber-950/60 border border-amber-900/60 px-2.5 py-0.5 rounded-md group-hover:bg-amber-900/40 transition-colors">
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Slider</span>
                    </div>
                  </div>
                  <div className="relative mt-1 flex items-center justify-between">
                    <input
                      type="text"
                      readOnly
                      placeholder="0.0"
                      value={distanceInput}
                      className="w-full bg-transparent border-none text-zinc-100 text-3xl font-black font-mono focus:outline-none cursor-pointer py-2.5"
                    />
                    <span className="text-base font-bold text-zinc-500 font-mono shrink-0 ml-2">
                      {profile.distanceUnit}
                    </span>
                  </div>
                </div>

                {/* 3. Hours Online */}
                <div 
                  onClick={() => setSliderModalType('time')}
                  className="bg-zinc-900/40 border border-zinc-900/90 hover:border-blue-500/50 py-4 px-4.5 rounded-xl relative transition-all cursor-pointer group select-none"
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-sm font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
                      <Clock className="w-4 h-4 text-blue-400" /> Time Online
                    </label>
                    <div className="flex items-center gap-1 text-sm font-bold text-blue-400 bg-blue-950/60 border border-blue-900/60 px-2.5 py-0.5 rounded-md group-hover:bg-blue-900/40 transition-colors">
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Slider</span>
                    </div>
                  </div>
                  
                  {/* Dual Input Slot: Hours & Minutes */}
                  <div className="flex items-center gap-2 mt-1">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        readOnly
                        placeholder="0"
                        value={hoursPart}
                        className="w-full bg-transparent border-none text-zinc-100 pr-8 text-3xl font-black font-mono focus:outline-none cursor-pointer py-2.5"
                      />
                      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-500 font-mono">hrs</span>
                    </div>
                    
                    <span className="text-zinc-600 font-bold font-mono text-xl select-none">:</span>
                    
                    <div className="relative flex-1">
                      <input
                        type="text"
                        readOnly
                        placeholder="00"
                        value={minutesPart}
                        className="w-full bg-transparent border-none text-zinc-100 pr-8 text-3xl font-black font-mono focus:outline-none cursor-pointer py-2.5"
                      />
                      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-500 font-mono">min</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Collapsible Accordion: Quick-Log Road Expenses */}
              <div className="border border-zinc-900 rounded-xl overflow-hidden transition-all duration-200 bg-zinc-900/10 hover:bg-zinc-900/20" id="quick-expenses-accordion">
                <button
                  type="button"
                  onClick={() => setIsExpensesExpanded(!isExpensesExpanded)}
                  className="w-full flex items-center justify-between p-3.5 text-left select-none cursor-pointer hover:bg-zinc-900/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Coins className="w-4.5 h-4.5 text-amber-500" />
                    <div>
                      <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
                        Quick-Log Road Expenses
                      </h3>
                      <p className="text-sm text-zinc-400">
                        Tap to instantly attach tolls, wash, or parking
                        {shiftExpenses.length > 0 && ` | ${shiftExpenses.length} ${shiftExpenses.length === 1 ? 'item' : 'items'} logged`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    {shiftExpenses.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse" />
                    )}
                    {isExpensesExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>
                
                {isExpensesExpanded && (
                  <div className="p-3 pt-1 border-t border-zinc-900/80 bg-zinc-950/30 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuickAddExpense('Tolls', profile.expenseDefaults?.tolls ?? 5.00)}
                        className="bg-zinc-900/30 hover:bg-zinc-900/70 p-2.5 rounded-xl flex flex-col items-center gap-1 text-center group transition-all cursor-pointer active:scale-95 border-none"
                      >
                        <Coins className="w-4.5 h-4.5 text-amber-500 group-hover:scale-110 transition-transform" />
                        <span className="text-sm text-zinc-200 font-medium mt-1">
                          Tolls ({formatCurrency(profile.expenseDefaults?.tolls ?? 5.00, profile)})
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickAddExpense('Car Wash', profile.expenseDefaults?.carWash ?? 14.00)}
                        className="bg-zinc-900/30 hover:bg-zinc-900/70 p-2.5 rounded-xl flex flex-col items-center gap-1 text-center group transition-all cursor-pointer active:scale-95 border-none"
                      >
                        <Sparkles className="w-4.5 h-4.5 text-sky-400 group-hover:scale-110 transition-transform" />
                        <span className="text-sm text-zinc-200 font-medium mt-1">
                          Wash ({formatCurrency(profile.expenseDefaults?.carWash ?? 14.00, profile)})
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickAddExpense('Parking', profile.expenseDefaults?.parking ?? 4.00)}
                        className="bg-zinc-900/30 hover:bg-zinc-900/70 p-2.5 rounded-xl flex flex-col items-center gap-1 text-center group transition-all cursor-pointer active:scale-95 border-none"
                      >
                        <SquareParking className="w-4.5 h-4.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span className="text-sm text-zinc-200 font-medium mt-1">
                          Parking ({formatCurrency(profile.expenseDefaults?.parking ?? 4.00, profile)})
                        </span>
                      </button>

                      {/* Custom Quick Buttons */}
                      {(profile.customQuickButtons || []).map((btn) => {
                        const IconComponent = btn.category === 'Tolls' ? Coins :
                                             btn.category === 'Car Wash' ? Sparkles :
                                             btn.category === 'Parking' ? SquareParking :
                                             btn.category === 'Fines' ? ShieldAlert : DollarSign;
                        return (
                          <button
                            type="button"
                            key={btn.id}
                            onClick={() => handleQuickAddExpense(btn.category, btn.amount, btn.label)}
                            className="bg-zinc-900/30 hover:bg-zinc-900/70 p-2.5 rounded-xl flex flex-col items-center gap-1 text-center group transition-all cursor-pointer active:scale-95 border-none"
                          >
                            <IconComponent className="w-4.5 h-4.5 text-purple-400 group-hover:scale-110 transition-transform" />
                            <span className="text-sm text-zinc-200 font-medium mt-1">
                              {btn.label} ({formatCurrency(btn.amount, profile)})
                            </span>
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => handleQuickAddExpense('Fines')}
                        className="bg-zinc-900/30 hover:bg-zinc-900/70 p-2.5 rounded-xl flex flex-col items-center gap-1 text-center group transition-all cursor-pointer active:scale-95 border-none"
                      >
                        <ShieldAlert className="w-4.5 h-4.5 text-rose-500 group-hover:scale-110 transition-transform" />
                        <span className="text-sm text-zinc-200 font-medium mt-1">Fine/Ticket</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickAddExpense('Other')}
                        className="bg-zinc-900/30 hover:bg-zinc-900/70 p-2.5 rounded-xl flex flex-col items-center gap-1 text-center group transition-all cursor-pointer active:scale-95 border-none"
                      >
                        <DollarSign className="w-4.5 h-4.5 text-[#8b5cf6] group-hover:scale-110 transition-transform" />
                        <span className="text-sm text-zinc-200 font-medium mt-1">Custom Exp</span>
                      </button>
                    </div>

                    {shiftExpenses.length > 0 && (
                      <div className="bg-zinc-900/20 border border-zinc-900/80 p-3 rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                            Expenses Added ({shiftExpenses.length})
                          </span>
                          <span className="text-sm font-bold text-rose-400">
                            Total: {formatCurrency(liveMetrics.loggedExpenses, profile)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1">
                          {shiftExpenses.map((expense) => (
                            <div 
                              key={expense.id}
                              className="bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 pl-2.5 pr-1.5 py-1 rounded-md flex items-center gap-1.5"
                            >
                              <span className="font-medium text-zinc-300">{expense.category}:</span>
                              <span className="font-mono font-semibold text-rose-300">{formatCurrency(expense.amount, profile)}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveExpense(expense.id)}
                                className="text-zinc-400 hover:text-zinc-200 p-0.5 rounded-full hover:bg-zinc-800 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Collapsible Accordion: Smart Shift Notes & Quick Tags */}
              <div className="border border-zinc-900 rounded-xl overflow-hidden transition-all duration-200 bg-zinc-900/10 hover:bg-zinc-900/20" id="smart-notes-accordion">
                <button
                  type="button"
                  onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                  className="w-full flex items-center justify-between p-3.5 text-left select-none cursor-pointer hover:bg-zinc-900/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4.5 h-4.5 text-blue-400" />
                    <div>
                      <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
                        Smart Shift Notes
                      </h3>
                      <p className="text-sm text-zinc-400">
                        {shiftNotes ? 'Custom reminders and context attached' : 'Add context tags or write reminders'}
                      </p>
                    </div>
                  </div>
                  <div className="text-zinc-400">
                    {isNotesExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>
                
                {isNotesExpanded && (
                  <div className="p-3 pt-1.5 border-t border-zinc-900/80 bg-zinc-950/30 space-y-3">
                    <div className="space-y-1.5">
                      <span className="block text-sm font-bold text-zinc-300 uppercase tracking-wider select-none">
                        Quick-Tap Context Tags
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { label: '🌧️ Rainy', value: '🌧️ Rainy' },
                          { label: '🏟️ Event', value: '🏟️ Event' },
                          { label: '✈️ Airport', value: '✈️ Airport' },
                          { label: '🍔 Lunch Rush', value: '🍔 Lunch Rush' },
                          { label: '🌙 Late Night', value: '🌙 Late Night' },
                          { label: '🚗 Traffic', value: '🚗 Heavy Traffic' }
                        ].map((tag) => {
                          const isSelected = shiftNotes.includes(tag.value);
                          return (
                            <button
                              type="button"
                              key={tag.value}
                              onClick={() => toggleNoteTag(tag.value)}
                              className={`text-sm py-2.5 px-3 rounded-xl border font-medium transition-all cursor-pointer active:scale-95 select-none text-center flex items-center justify-center ${
                                isSelected
                                  ? 'bg-blue-950/40 border-blue-500 text-blue-300 font-bold shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                                  : 'bg-zinc-900/40 border-transparent text-zinc-300 hover:text-zinc-100'
                              }`}
                            >
                              {tag.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <span className="block text-sm font-bold text-zinc-300 uppercase tracking-wider">Custom Notes</span>
                      <textarea
                        value={shiftNotes}
                        onChange={(e) => setShiftNotes(e.target.value)}
                        placeholder="Flight surges, weather details, downtown traffic reminders..."
                        rows={2}
                        className="w-full bg-zinc-900/80 border border-zinc-800 text-zinc-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-zinc-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Warning Alert about actual costs if distance high */}
              {showWearWarning && (
                <div className="bg-amber-950/20 border border-amber-900/50 p-4 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Vehicle Wear Alert</h4>
                    <p className="text-sm text-amber-300/95 mt-1 leading-relaxed">
                      At {distance} {profile.distanceUnit} driven, your vehicle is absorbing an estimated{' '}
                      <span className="font-bold text-amber-200">{formatCurrency(liveMetrics.depreciationCost, profile)}</span> in wear & tear, oil depletion, tire friction, and depreciation. This will be deducted automatically.
                    </p>
                  </div>
                </div>
              )}

              {/* Date & Fuel Price side-by-side inside high-density horizontal layout */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-sm font-bold text-zinc-300 mb-1.5 uppercase tracking-wider select-none">
                    Shift Date
                  </label>
                  <input
                    type="date"
                    value={shiftDate}
                    onChange={(e) => setShiftDate(e.target.value)}
                    required
                    className="w-full bg-zinc-900/80 border border-zinc-800 text-zinc-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-300 mb-1.5 uppercase tracking-wider flex items-center justify-between select-none">
                    <span>Fuel Override</span>
                    {Math.abs((parseFloat(activeFuelPrice) || 0) - profile.fuelPrice) > 0.001 && (
                      <button 
                        type="button" 
                        onClick={() => setActiveFuelPrice(profile.fuelPrice.toString())}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-mono underline font-bold"
                        title="Reset Default"
                      >
                        Reset
                      </button>
                    )}
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 font-mono font-semibold text-sm">
                      {profile.measurementSystem === 'uk' ? '£' : profile.measurementSystem === 'metric' ? '€' : '$'}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={activeFuelPrice}
                      onChange={(e) => setActiveFuelPrice(e.target.value)}
                      required
                      className="w-full bg-zinc-900/80 border border-zinc-800 text-zinc-200 pl-6 pr-8 py-2 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono font-medium"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                      /{profile.fuelUnit === 'gallons' ? 'gal' : 'L'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Log Shift Submit Button */}
              <button
                type="submit"
                disabled={!canSubmit}
                className={getButtonStyles(false)}
                id="log-shift-submit-button"
              >
                {renderButtonContent()}
              </button>

            </form>
          </section>

        </div>

        {/* Right Column: Dynamic Calculation & Net Profit (5 Cols) */}
        <div className={`lg:col-span-5 space-y-6 ${activeFormTab === 'simulator' ? 'block' : 'hidden md:block'}`}>
          
          {/* REAL NET PROFIT CARD */}
          <section 
            id="real-net-profit-card"
            className="bg-zinc-950 border border-emerald-950/80 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between h-full min-h-[500px]"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/[0.03] rounded-full blur-3xl pointer-events-none"></div>
            
            {/* Upper Portion: Header and Revenue to Profit Comparison */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-bold text-emerald-400/90 uppercase tracking-widest bg-emerald-950/60 border border-emerald-900/60 px-3 py-1 rounded-full font-mono">
                  Real-time Cost Simulator
                </span>
                <span className="text-sm text-zinc-400 flex items-center gap-1 font-semibold">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active
                </span>
              </div>

              {/* Gig Profit Indicator Header */}
              <div className="text-center py-4 border-b border-zinc-900/80">
                <p className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Calculated Real Net Profit</p>
                <h3 className={`text-4xl md:text-5xl font-display font-extrabold mt-2 tracking-tight transition-all duration-300 ${
                   liveMetrics.netProfit > 0 
                     ? 'text-emerald-400' 
                     : liveMetrics.netProfit < 0 
                       ? 'text-rose-500' 
                       : 'text-zinc-500'
                 }`}>
                  {formatCurrency(liveMetrics.netProfit, profile)}
                </h3>
                <p className="text-sm text-zinc-300 mt-2 font-mono flex items-center justify-center gap-1.5">
                  Gross: <span className="text-zinc-100 font-semibold">{formatCurrency(grossRevenue, profile)}</span> 
                  <span className="text-zinc-600">|</span> 
                  Real Net: <span className={liveMetrics.netProfit > 0 ? 'text-emerald-400 font-bold' : ''}>
                    {grossRevenue > 0 ? ((liveMetrics.netProfit / grossRevenue) * 100).toFixed(0) : 0}%
                  </span>
                </p>
              </div>

              {/* Real Hourly Wage breakdown */}
              <div className="grid grid-cols-2 gap-4 py-5 font-mono">
                
                <div className="bg-zinc-900/20 border border-zinc-900 p-3.5 rounded-2xl">
                  <p className="text-xs text-zinc-400 uppercase font-semibold tracking-wider">Gross Hourly</p>
                  <p className="text-base font-bold text-zinc-200 mt-1">
                    {formatCurrency(hoursOnline > 0 ? grossRevenue / hoursOnline : 0, profile)}<span className="text-sm font-medium text-zinc-400">/hr</span>
                  </p>
                </div>

                <div className="bg-emerald-950/10 border border-emerald-900/30 p-3.5 rounded-2xl relative">
                  <div className="absolute top-2 right-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-xs text-emerald-400 uppercase tracking-wider font-bold">Real Net Hourly</p>
                  <p className="text-lg font-extrabold text-emerald-400 mt-0.5">
                    {formatCurrency(liveMetrics.hourlyWage, profile)}<span className="text-sm font-semibold text-emerald-400">/hr</span>
                  </p>
                </div>

              </div>

              {/* Deductions Breakdown */}
              <div className="space-y-4 pt-3">
                <h4 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Cost Deductions Breakdown</h4>
                
                <div className="space-y-3 font-mono">
                  
                  {/* Fuel Deduction */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400 font-medium">Fuel Surcharge Cost</span>
                      <span className="text-amber-400 font-bold">{formatCurrency(liveMetrics.fuelCost, profile)}</span>
                    </div>
                    <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-amber-500 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${grossRevenue > 0 ? Math.min((liveMetrics.fuelCost / grossRevenue) * 100, 100) : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Wear and Tear Deduction */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400 font-medium">Wear, Tires & Depreciation</span>
                      <span className="text-orange-400 font-bold">{formatCurrency(liveMetrics.depreciationCost, profile)}</span>
                    </div>
                    <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-orange-500 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${grossRevenue > 0 ? Math.min((liveMetrics.depreciationCost / grossRevenue) * 100, 100) : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Manual Logged Expenses */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400 font-medium">Extra Quick-Logged Expenses</span>
                      <span className="text-rose-400 font-bold">{formatCurrency(liveMetrics.loggedExpenses, profile)}</span>
                    </div>
                    <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-rose-500 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${grossRevenue > 0 ? Math.min((liveMetrics.loggedExpenses / grossRevenue) * 100, 100) : 0}%` }}
                      ></div>
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* Bottom Section: Net Profit Explanation */}
            <div className="mt-8 pt-5 border-t border-zinc-900/60 bg-zinc-900/10 p-4 rounded-2xl border border-zinc-900">
              <h5 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-emerald-400" /> Driver Truth
              </h5>
              <p className="text-sm text-zinc-300 mt-2 leading-relaxed">
                Rideshare platforms advertise high gross payouts, but driving a vehicle consumes real equity. After gas expense ({formatCurrency(liveMetrics.fuelCost, profile)}) and car depreciation ({formatCurrency(liveMetrics.depreciationCost, profile)}), your real earning rate is <span className="text-emerald-400 font-bold">{formatCurrency(liveMetrics.hourlyWage, profile)}/hr</span> instead of {formatCurrency(hoursOnline > 0 ? grossRevenue / hoursOnline : 0, profile)}/hr.
              </p>
            </div>

          </section>

        </div>

      </div>

      {/* CUSTOM EXPENSE MODAL */}
      <AnimatePresence>
        {showCustomExpenseModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950 border border-zinc-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setShowCustomExpenseModal(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 p-1 rounded-full hover:bg-zinc-900 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="font-display font-semibold text-lg text-zinc-100 flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-purple-400" /> 
                Add Custom {customExpenseCategory}
              </h3>

              <form onSubmit={handleCustomExpenseSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Amount ({profile.measurementSystem === 'uk' ? 'GBP' : profile.measurementSystem === 'metric' ? 'EUR' : 'USD'})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono font-semibold">
                      {profile.measurementSystem === 'uk' ? '£' : profile.measurementSystem === 'metric' ? '€' : '$'}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={customExpenseAmount}
                      onChange={(e) => setCustomExpenseAmount(e.target.value)}
                      required
                      autoFocus
                      className="w-full bg-zinc-900/80 border border-zinc-800 text-zinc-100 pl-8 pr-3 py-2.5 rounded-xl text-sm font-semibold font-mono focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomExpenseModal(false)}
                    className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-sm font-bold border border-zinc-800/80 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-purple-900/30 transition-colors cursor-pointer"
                  >
                    Add Expense
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Footer Placement: bottom ad slot container at the very end of this tab view */}
      <AdSlot presetIndex={0} className="mt-8 mb-24 md:mb-0" />

      {/* Sticky/Fixed Bottom Submit Bar for Mobile */}
      <div 
        className="fixed bottom-0 left-0 right-0 p-4 border-t border-zinc-900/60 z-40 md:hidden flex justify-center pb-6 shadow-[0_-10px_25px_rgba(0,0,0,0.5)]"
        style={{ 
          background: 'rgba(19, 26, 38, 0.7)', 
          backdropFilter: 'blur(12px)', 
          WebkitBackdropFilter: 'blur(12px)' 
        }}
      >
        <button
          type="submit"
          form="log-shift-form"
          disabled={!canSubmit}
          className={getButtonStyles(true)}
          id="mobile-sticky-log-shift-button"
        >
          {renderButtonContent()}
        </button>
      </div>

      {/* Interactive Range Slider Modal Sheet */}
      <RangeSliderModal
        isOpen={sliderModalType !== null}
        type={sliderModalType}
        onClose={() => setSliderModalType(null)}
        currencySymbol={profile.measurementSystem === 'uk' ? '£' : profile.measurementSystem === 'metric' ? '€' : '$'}
        distanceUnit={profile.distanceUnit}
        initialIncome={parseFloat(grossRevenueInput) || 0}
        initialDistance={parseFloat(distanceInput) || 0}
        initialHours={parseInt(hoursPart, 10) || 0}
        initialMinutes={parseInt(minutesPart, 10) || 0}
        onConfirmIncome={handleConfirmIncome}
        onConfirmDistance={handleConfirmDistance}
        onConfirmTime={handleConfirmTime}
      />

    </div>
  );
}
