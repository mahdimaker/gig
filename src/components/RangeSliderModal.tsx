import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Minus, Check, Sliders, DollarSign, Milestone, Clock } from 'lucide-react';

export type SliderModalType = 'income' | 'distance' | 'time' | null;

interface RangeSliderModalProps {
  isOpen: boolean;
  type: SliderModalType;
  onClose: () => void;
  currencySymbol: string;
  distanceUnit: string;
  initialIncome: number;
  initialDistance: number;
  initialHours: number;
  initialMinutes: number;
  onConfirmIncome: (value: number) => void;
  onConfirmDistance: (value: number) => void;
  onConfirmTime: (hours: number, minutes: number) => void;
}

export default function RangeSliderModal({
  isOpen,
  type,
  onClose,
  currencySymbol,
  distanceUnit,
  initialIncome,
  initialDistance,
  initialHours,
  initialMinutes,
  onConfirmIncome,
  onConfirmDistance,
  onConfirmTime,
}: RangeSliderModalProps) {
  // Local states for real-time slider manipulation
  const [incomeVal, setIncomeVal] = useState<number>(initialIncome || 0);
  const [distanceVal, setDistanceVal] = useState<number>(initialDistance || 0);
  const [hoursVal, setHoursVal] = useState<number>(initialHours || 0);
  const [minutesVal, setMinutesVal] = useState<number>(initialMinutes || 0);

  // Maximum slider limits (auto-expanding if initial values exceed default bounds)
  const [incomeMax, setIncomeMax] = useState<number>(Math.max(300, Math.ceil((initialIncome || 0) * 1.5)));
  const [distanceMax, setDistanceMax] = useState<number>(Math.max(200, Math.ceil((initialDistance || 0) * 1.5)));

  useEffect(() => {
    if (isOpen) {
      setIncomeVal(initialIncome || 0);
      setDistanceVal(initialDistance || 0);
      setHoursVal(initialHours || 0);
      setMinutesVal(initialMinutes || 0);

      if (initialIncome > 300) setIncomeMax(Math.max(1000, Math.ceil(initialIncome * 1.25)));
      else setIncomeMax(300);

      if (initialDistance > 200) setDistanceMax(Math.max(500, Math.ceil(initialDistance * 1.25)));
      else setDistanceMax(200);
    }
  }, [isOpen, type, initialIncome, initialDistance, initialHours, initialMinutes]);

  if (!isOpen || !type) return null;

  const handleConfirm = () => {
    if (type === 'income') {
      onConfirmIncome(incomeVal);
    } else if (type === 'distance') {
      onConfirmDistance(distanceVal);
    } else if (type === 'time') {
      onConfirmTime(hoursVal, minutesVal);
    }
    onClose();
  };

  // Quick adjusters for Income
  const adjustIncome = (delta: number) => {
    setIncomeVal((prev) => {
      const next = Math.max(0, parseFloat((prev + delta).toFixed(2)));
      if (next > incomeMax) setIncomeMax(next + 100);
      return next;
    });
  };

  // Quick adjusters for Distance
  const adjustDistance = (delta: number) => {
    setDistanceVal((prev) => {
      const next = Math.max(0, parseFloat((prev + delta).toFixed(1)));
      if (next > distanceMax) setDistanceMax(next + 50);
      return next;
    });
  };

  // Quick adjusters for Time
  const adjustTimeMinutes = (delta: number) => {
    const totalMinutes = hoursVal * 60 + minutesVal + delta;
    if (totalMinutes < 0) {
      setHoursVal(0);
      setMinutesVal(0);
      return;
    }
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    setHoursVal(Math.min(24, newHours));
    setMinutesVal(newMins);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        />

        {/* Modal Sheet Container */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl z-10 overflow-hidden"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-400">
                {type === 'income' && <DollarSign className="w-5 h-5 stroke-[2.5]" />}
                {type === 'distance' && <Milestone className="w-5 h-5 stroke-[2.5]" />}
                {type === 'time' && <Clock className="w-5 h-5 stroke-[2.5]" />}
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-zinc-100 flex items-center gap-1.5">
                  {type === 'income' && 'Set Gross Income'}
                  {type === 'distance' && 'Set Shift Distance'}
                  {type === 'time' && 'Set Time Online'}
                </h3>
                <p className="text-sm text-zinc-400">Drag range slider or tap buttons for precision adjustment</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content based on Type */}
          <div className="py-6 space-y-6">
            
            {/* 1. GROSS INCOME MODE */}
            {type === 'income' && (
              <>
                {/* Large Bold Value Display */}
                <div className="text-center py-3 bg-zinc-900/60 rounded-2xl border border-zinc-800/80">
                  <span className="text-sm uppercase font-bold tracking-wider text-emerald-400/80 block mb-1">
                    Selected Income
                  </span>
                  <div className="text-4xl sm:text-5xl font-black font-mono text-emerald-400 tracking-tight">
                    {currencySymbol}{incomeVal.toFixed(2)}
                  </div>
                </div>

                {/* Range Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-mono text-zinc-400 font-semibold">
                    <span>{currencySymbol}0</span>
                    <span>{currencySymbol}{incomeMax / 2}</span>
                    <span>{currencySymbol}{incomeMax}+</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={incomeMax}
                    step="1"
                    value={incomeVal}
                    onChange={(e) => setIncomeVal(parseFloat(e.target.value))}
                    className="w-full h-3 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#00e676] focus:outline-none"
                  />
                </div>

                {/* Fine-Tuning Controls (- / + Buttons) */}
                <div className="space-y-3">
                  <span className="text-sm font-bold uppercase tracking-wider text-zinc-300 block text-center">
                    Fine Adjustments
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => adjustIncome(-5)}
                      className="py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-300 font-mono font-bold text-sm flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <Minus className="w-3.5 h-3.5 text-rose-400" /> {currencySymbol}5
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustIncome(-1)}
                      className="py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-300 font-mono font-bold text-sm flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <Minus className="w-3.5 h-3.5 text-rose-400" /> {currencySymbol}1
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustIncome(1)}
                      className="py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-300 font-mono font-bold text-sm flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" /> {currencySymbol}1
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustIncome(5)}
                      className="py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-300 font-mono font-bold text-sm flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" /> {currencySymbol}5
                    </button>
                  </div>
                </div>

                {/* Quick Add Chips */}
                <div className="flex gap-2">
                  {[10, 25, 50, 100].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => adjustIncome(amt)}
                      className="flex-1 py-2.5 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-300 rounded-xl font-mono text-sm font-bold active:scale-95 transition-all"
                    >
                      +{currencySymbol}{amt}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* 2. DISTANCE MODE */}
            {type === 'distance' && (
              <>
                {/* Large Bold Value Display */}
                <div className="text-center py-3 bg-zinc-900/60 rounded-2xl border border-zinc-800/80">
                  <span className="text-sm uppercase font-bold tracking-wider text-amber-400/80 block mb-1">
                    Selected Distance
                  </span>
                  <div className="text-4xl sm:text-5xl font-black font-mono text-amber-400 tracking-tight">
                    {distanceVal.toFixed(1)} <span className="text-xl font-bold text-zinc-400">{distanceUnit}</span>
                  </div>
                </div>

                {/* Range Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-mono text-zinc-400 font-semibold">
                    <span>0 {distanceUnit}</span>
                    <span>{distanceMax / 2} {distanceUnit}</span>
                    <span>{distanceMax}+ {distanceUnit}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={distanceMax}
                    step="0.1"
                    value={distanceVal}
                    onChange={(e) => setDistanceVal(parseFloat(e.target.value))}
                    className="w-full h-3 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#00e676] focus:outline-none"
                  />
                </div>

                {/* Fine-Tuning Controls */}
                <div className="space-y-3">
                  <span className="text-sm font-bold uppercase tracking-wider text-zinc-300 block text-center">
                    Fine Adjustments
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => adjustDistance(-1.0)}
                      className="py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-300 font-mono font-bold text-sm flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <Minus className="w-3.5 h-3.5 text-rose-400" /> 1.0
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustDistance(-0.1)}
                      className="py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-300 font-mono font-bold text-sm flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <Minus className="w-3.5 h-3.5 text-rose-400" /> 0.1
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustDistance(0.1)}
                      className="py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-300 font-mono font-bold text-sm flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" /> 0.1
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustDistance(1.0)}
                      className="py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-300 font-mono font-bold text-sm flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" /> 1.0
                    </button>
                  </div>
                </div>

                {/* Quick Add Chips */}
                <div className="flex gap-2">
                  {[5, 10, 25, 50].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => adjustDistance(amt)}
                      className="flex-1 py-2.5 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 text-amber-300 rounded-xl font-mono text-sm font-bold active:scale-95 transition-all"
                    >
                      +{amt} {distanceUnit}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* 3. TIME ONLINE MODE */}
            {type === 'time' && (
              <>
                {/* Large Bold Value Display */}
                <div className="text-center py-3 bg-zinc-900/60 rounded-2xl border border-zinc-800/80">
                  <span className="text-sm uppercase font-bold tracking-wider text-blue-400/80 block mb-1">
                    Selected Duration
                  </span>
                  <div className="text-4xl sm:text-5xl font-black font-mono text-blue-400 tracking-tight">
                    {hoursVal} <span className="text-xl font-bold text-zinc-400">hrs</span> {minutesVal}{' '}
                    <span className="text-xl font-bold text-zinc-400">min</span>
                  </div>
                </div>

                {/* Dual Range Sliders: Hours & Minutes */}
                <div className="space-y-4">
                  {/* Hours Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm font-mono text-zinc-300 font-semibold">
                      <span>Hours</span>
                      <span className="text-blue-400 font-bold">{hoursVal} hrs</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="24"
                      step="1"
                      value={hoursVal}
                      onChange={(e) => setHoursVal(parseInt(e.target.value, 10))}
                      className="w-full h-3 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#00e676] focus:outline-none"
                    />
                  </div>

                  {/* Minutes Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm font-mono text-zinc-300 font-semibold">
                      <span>Minutes</span>
                      <span className="text-blue-400 font-bold">{minutesVal} min</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="59"
                      step="1"
                      value={minutesVal}
                      onChange={(e) => setMinutesVal(parseInt(e.target.value, 10))}
                      className="w-full h-3 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#00e676] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Fine Tuning Controls */}
                <div className="space-y-3">
                  <span className="text-sm font-bold uppercase tracking-wider text-zinc-300 block text-center">
                    Quick Time Adjustments
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => adjustTimeMinutes(-30)}
                      className="py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-300 font-mono font-bold text-sm flex items-center justify-center gap-0.5 active:scale-95 transition-all"
                    >
                      <Minus className="w-3.5 h-3.5 text-rose-400" /> 30m
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustTimeMinutes(-15)}
                      className="py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-300 font-mono font-bold text-sm flex items-center justify-center gap-0.5 active:scale-95 transition-all"
                    >
                      <Minus className="w-3.5 h-3.5 text-rose-400" /> 15m
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustTimeMinutes(15)}
                      className="py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-300 font-mono font-bold text-sm flex items-center justify-center gap-0.5 active:scale-95 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" /> 15m
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustTimeMinutes(30)}
                      className="py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-300 font-mono font-bold text-sm flex items-center justify-center gap-0.5 active:scale-95 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" /> 30m
                    </button>
                  </div>
                </div>

                {/* Hours Adjuster Chips */}
                <div className="flex gap-2">
                  {[1, 2, 4, 8].map((hrs) => (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => setHoursVal((prev) => Math.min(24, prev + hrs))}
                      className="flex-1 py-2.5 bg-blue-950/40 hover:bg-blue-900/60 border border-blue-800/60 text-blue-300 rounded-xl font-mono text-sm font-bold active:scale-95 transition-all"
                    >
                      +{hrs} hr{hrs > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
              </>
            )}

          </div>

          {/* Footer Confirm Action */}
          <div className="pt-3 border-t border-zinc-900">
            <button
              type="button"
              onClick={handleConfirm}
              className="w-full py-4 px-6 bg-[#00e676] hover:bg-[#00c853] active:bg-[#00a142] text-zinc-950 font-black font-display text-base rounded-2xl shadow-[0_0_20px_rgba(0,230,118,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <Check className="w-5 h-5 stroke-[3]" />
              <span>Confirm Selection</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
