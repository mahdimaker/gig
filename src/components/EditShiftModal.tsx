/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Edit3, 
  Calendar, 
  Clock, 
  Coins, 
  Milestone, 
  Plus, 
  Trash2, 
  Sparkles, 
  SquareParking, 
  ShieldAlert, 
  DollarSign,
  Tag,
  Car
} from 'lucide-react';
import { ShiftLog, VehicleProfile, PLATFORMS, EXPENSE_CATEGORIES, ExpenseItem } from '../types';
import { computeShiftMetrics, formatCurrency } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

interface EditShiftModalProps {
  log: ShiftLog | null;
  profile: VehicleProfile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedLog: ShiftLog) => void;
}

export default function EditShiftModal({ log, profile, isOpen, onClose, onSave }: EditShiftModalProps) {
  const currencySymbol = profile.measurementSystem === 'uk' ? '£' : profile.measurementSystem === 'metric' ? '€' : '$';
  const distanceLabel = profile.distanceUnit === 'km' ? 'Kilometers' : 'Miles';

  // Form State
  const [platform, setPlatform] = useState<ShiftLog['platform']>('Uber');
  const [date, setDate] = useState<string>('');
  const [grossRevenue, setGrossRevenue] = useState<string>('');
  const [hours, setHours] = useState<string>('');
  const [minutes, setMinutes] = useState<string>('');
  const [distance, setDistance] = useState<string>('');
  const [expensesList, setExpensesList] = useState<ExpenseItem[]>([]);
  const [notes, setNotes] = useState<string>('');

  // Quick expense adder state inside edit modal
  const [newExpCategory, setNewExpCategory] = useState<ExpenseItem['category']>('Tolls');
  const [newExpAmount, setNewExpAmount] = useState<string>('');
  const [newExpNotes, setNewExpNotes] = useState<string>('');

  // Pre-fill state when a log is selected
  useEffect(() => {
    if (log) {
      setPlatform(log.platform);
      setDate(log.date);
      setGrossRevenue(log.grossRevenue.toString());
      
      const totalHours = log.hoursOnline || 0;
      const h = Math.floor(totalHours);
      const m = Math.round((totalHours - h) * 60);
      setHours(h.toString());
      setMinutes(m.toString());
      
      setDistance(log.distance.toString());
      setExpensesList(log.expensesList ? [...log.expensesList] : []);
      setNotes(log.notes || '');
      setNewExpCategory('Tolls');
      setNewExpAmount('');
      setNewExpNotes('');
    }
  }, [log]);

  if (!isOpen || !log) return null;

  // Add new itemized expense
  const handleAddExpense = () => {
    const amt = parseFloat(newExpAmount);
    if (isNaN(amt) || amt <= 0) return;

    const newItem: ExpenseItem = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      category: newExpCategory,
      amount: amt,
      timestamp: new Date().toISOString(),
      notes: newExpNotes.trim() || undefined
    };

    setExpensesList(prev => [...prev, newItem]);
    setNewExpAmount('');
    setNewExpNotes('');
  };

  // Remove itemized expense
  const handleRemoveExpense = (id: string) => {
    setExpensesList(prev => prev.filter(e => e.id !== id));
  };

  // Save handler with dynamic recalculation of metrics
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const gross = Math.max(0, parseFloat(grossRevenue) || 0);
    const h = Math.max(0, parseInt(hours) || 0);
    const m = Math.max(0, Math.min(59, parseInt(minutes) || 0));
    const hoursOnline = h + (m / 60);
    const dist = Math.max(0, parseFloat(distance) || 0);

    // Dynamic Recalculation using computeShiftMetrics
    const metrics = computeShiftMetrics(gross, hoursOnline, dist, expensesList, profile);

    const updatedLog: ShiftLog = {
      ...log,
      date: date || log.date,
      platform,
      grossRevenue: gross,
      hoursOnline,
      distance: dist,
      fuelCost: metrics.fuelCost,
      depreciationCost: metrics.depreciationCost,
      loggedExpenses: metrics.loggedExpenses,
      expensesList,
      netProfit: metrics.netProfit,
      hourlyWage: metrics.hourlyWage,
      notes: notes.trim() || undefined,
    };

    onSave(updatedLog);
    onClose();
  };

  // Calculate live preview metrics
  const previewGross = Math.max(0, parseFloat(grossRevenue) || 0);
  const previewH = Math.max(0, parseInt(hours) || 0);
  const previewM = Math.max(0, Math.min(59, parseInt(minutes) || 0));
  const previewHoursOnline = previewH + (previewM / 60);
  const previewDist = Math.max(0, parseFloat(distance) || 0);
  const previewMetrics = computeShiftMetrics(previewGross, previewHoursOnline, previewDist, expensesList, profile);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-black/80 backdrop-blur-md" id="edit-shift-modal-overlay">
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl my-auto overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          id="edit-shift-modal-card"
        >
          {/* Modal Header */}
          <div className="p-4 sm:p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-emerald-400">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base sm:text-lg text-zinc-100">Edit Shift Record</h3>
                <p className="text-xs text-zinc-400 font-medium">Update shift details and automatically recalculate net profits</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-100 p-2 rounded-xl hover:bg-zinc-900 transition-all cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content Scrollable Body */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 font-sans">
            
            {/* Live Financial Recalculation Preview Banner */}
            <div className="bg-zinc-900/80 border border-zinc-800/80 p-3.5 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
              <div className="bg-zinc-950/60 p-2 rounded-lg border border-zinc-900">
                <span className="block text-[10px] text-zinc-400 uppercase font-bold font-sans">Gross Revenue</span>
                <span className="text-sm sm:text-base font-bold text-zinc-200">{formatCurrency(previewGross, profile)}</span>
              </div>
              <div className="bg-zinc-950/60 p-2 rounded-lg border border-zinc-900">
                <span className="block text-[10px] text-zinc-400 uppercase font-bold font-sans">Total Expenses</span>
                <span className="text-sm sm:text-base font-bold text-rose-400">-{formatCurrency(previewMetrics.totalCost, profile)}</span>
              </div>
              <div className="bg-zinc-950/60 p-2 rounded-lg border border-zinc-900">
                <span className="block text-[10px] text-emerald-400 uppercase font-bold font-sans">Real Net Profit</span>
                <span className="text-sm sm:text-base font-black text-emerald-400">{formatCurrency(previewMetrics.netProfit, profile)}</span>
              </div>
              <div className="bg-zinc-950/60 p-2 rounded-lg border border-zinc-900">
                <span className="block text-[10px] text-emerald-400 uppercase font-bold font-sans">Hourly Rate</span>
                <span className="text-sm sm:text-base font-black text-emerald-400">{formatCurrency(previewMetrics.hourlyWage, profile)}/hr</span>
              </div>
            </div>

            {/* Platform & Date Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Platform Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-emerald-400" /> Platform / Service
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as ShiftLog['platform'])}
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 py-2.5 px-3 rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-500 transition-all cursor-pointer"
                  required
                >
                  {PLATFORMS.map(p => (
                    <option key={p.id} value={p.id} className="bg-zinc-950">{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Date Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Shift Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 py-2.5 px-3 rounded-xl text-sm font-mono font-bold focus:outline-none focus:border-emerald-500 transition-all cursor-pointer"
                  required
                />
              </div>

            </div>

            {/* Gross Revenue, Distance, Hours */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Gross Income */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-emerald-400" /> Gross Income ({currencySymbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-mono font-bold">{currencySymbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={grossRevenue}
                    onChange={(e) => setGrossRevenue(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 pl-7 pr-3 py-2.5 rounded-xl text-sm font-mono font-bold focus:outline-none focus:border-emerald-500 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Shift Distance */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Milestone className="w-3.5 h-3.5 text-emerald-400" /> Distance ({distanceLabel})
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 px-3 py-2.5 rounded-xl text-sm font-mono font-bold focus:outline-none focus:border-emerald-500 transition-all"
                  required
                />
              </div>

              {/* Shift Duration (Hours + Minutes) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" /> Duration (Hours & Mins)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="24"
                      placeholder="0"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 px-2.5 py-2.5 rounded-xl text-sm font-mono font-bold focus:outline-none focus:border-emerald-500 transition-all pr-7"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-mono font-bold pointer-events-none">h</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="0"
                      value={minutes}
                      onChange={(e) => setMinutes(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 px-2.5 py-2.5 rounded-xl text-sm font-mono font-bold focus:outline-none focus:border-emerald-500 transition-all pr-7"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-mono font-bold pointer-events-none">m</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Itemized Extra Expenses Section */}
            <div className="space-y-3 pt-2 border-t border-zinc-900">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-rose-400" /> Extra Road Expenses ({expensesList.length})
                </label>
                <span className="text-xs font-mono font-bold text-rose-400">
                  Total: -{formatCurrency(expensesList.reduce((s, e) => s + e.amount, 0), profile)}
                </span>
              </div>

              {/* Existing Expenses List */}
              {expensesList.length > 0 && (
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {expensesList.map(exp => (
                    <div key={exp.id} className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800 px-3 py-2 rounded-xl text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-200">{exp.category}</span>
                        {exp.notes && <span className="text-zinc-500 italic">({exp.notes})</span>}
                      </div>
                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-rose-400 font-bold">-{formatCurrency(exp.amount, profile)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveExpense(exp.id)}
                          className="text-zinc-500 hover:text-rose-400 transition-colors p-1"
                          title="Remove expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Expense Row */}
              <div className="bg-zinc-900/30 border border-zinc-800/60 p-2.5 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <div className="sm:col-span-4">
                  <select
                    value={newExpCategory}
                    onChange={(e) => setNewExpCategory(e.target.value as ExpenseItem['category'])}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs py-2 px-2.5 rounded-lg focus:outline-none focus:border-emerald-500"
                  >
                    {EXPENSE_CATEGORIES.map(c => (
                      <option key={c.id} value={c.id} className="bg-zinc-950">{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-mono">{currencySymbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newExpAmount}
                      onChange={(e) => setNewExpAmount(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs pl-6 pr-2 py-2 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <input
                    type="text"
                    placeholder="Note (optional)"
                    value={newExpNotes}
                    onChange={(e) => setNewExpNotes(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs px-2.5 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddExpense}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border border-zinc-700 py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              </div>
            </div>

            {/* Driver Log Notes */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-900">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-400" /> Driver Log Notes
              </label>
              <textarea
                rows={3}
                placeholder="Add shift notes (traffic conditions, airport surge, weather, bonus payouts...)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 p-3 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-all font-sans"
              />
            </div>

            {/* Modal Actions Footer */}
            <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 text-sm font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4" /> Save Changes
              </button>
            </div>

          </form>
        </motion.div>

      </div>
    </AnimatePresence>
  );
}
