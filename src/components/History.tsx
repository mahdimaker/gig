/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Calendar, 
  Trash2, 
  Filter, 
  Info, 
  FileSpreadsheet, 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  Car, 
  Clock, 
  Milestone,
  ArrowUpDown,
  ChevronDown
} from 'lucide-react';
import { ShiftLog, PLATFORMS, VehicleProfile } from '../types';
import { formatCurrency } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import AdSlot from './AdSlot';

interface HistoryProps {
  logs: ShiftLog[];
  onDeleteLog: (id: string) => void;
  distanceUnit: string;
  profile: VehicleProfile;
}

type SortField = 'date' | 'netProfit' | 'grossRevenue' | 'hourlyWage';
type SortOrder = 'asc' | 'desc';

export default function History({ logs, onDeleteLog, distanceUnit, profile }: HistoryProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<string>('All');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Toggle sorting field or order
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Filter & Search & Sort logs
  const processedLogs = useMemo(() => {
    let result = [...logs];

    // Filter by platform
    if (selectedPlatformFilter !== 'All') {
      result = result.filter(log => log.platform === selectedPlatformFilter);
    }

    // Search term match (notes, platform, etc.)
    if (searchTerm.trim() !== '') {
      const lower = searchTerm.toLowerCase();
      result = result.filter(log => 
        log.platform.toLowerCase().includes(lower) || 
        (log.notes && log.notes.toLowerCase().includes(lower)) ||
        log.date.includes(lower)
      );
    }

    // Sorting
    result.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      // Safe date comparison
      if (sortField === 'date') {
        valA = new Date(a.date).getTime();
        valB = new Date(b.date).getTime();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [logs, selectedPlatformFilter, searchTerm, sortField, sortOrder]);

  const toggleExpand = (id: string) => {
    setExpandedLogId(prev => prev === id ? null : id);
  };

  // Simple statistics for the current filtered list
  const totals = useMemo(() => {
    const count = processedLogs.length;
    const gross = processedLogs.reduce((sum, l) => sum + l.grossRevenue, 0);
    const profit = processedLogs.reduce((sum, l) => sum + l.netProfit, 0);
    const hours = processedLogs.reduce((sum, l) => sum + l.hoursOnline, 0);
    const distance = processedLogs.reduce((sum, l) => sum + l.distance, 0);
    const avgHourly = hours > 0 ? profit / hours : 0;

    return { count, gross, profit, hours, distance, avgHourly };
  }, [processedLogs]);

  return (
    <div className="space-y-6" id="history-tab-container">
      
      {/* Search & Filter Header bar */}
      <section className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4 w-full" id="history-filters-bar">
        
        {/* Row 1: Search box (Full-Width) */}
        <div className="relative w-full">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search shifts (e.g. airport surge, rain, Lyft...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900/80 border border-zinc-800 text-zinc-200 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs font-semibold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Row 2: Controls Row (Platform dropdown & Sort buttons) */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center w-full gap-4" id="history-controls-row">
          
          {/* Platform filter */}
          <div className="flex items-center justify-between sm:justify-start gap-2 bg-zinc-900/60 border border-zinc-800 px-3.5 py-2.5 rounded-xl text-xs text-zinc-400 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-emerald-400" />
              <span>Platform:</span>
            </div>
            <select
              value={selectedPlatformFilter}
              onChange={(e) => setSelectedPlatformFilter(e.target.value)}
              className="bg-transparent border-none text-zinc-200 focus:outline-none focus:ring-0 font-semibold cursor-pointer text-right sm:text-left"
            >
              <option value="All" className="bg-zinc-950">All Platforms</option>
              {PLATFORMS.map(p => (
                <option key={p.id} value={p.id} className="bg-zinc-950">{p.id}</option>
              ))}
            </select>
          </div>

          {/* Sort Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleSort('date')}
              className={`px-3 sm:px-4 py-2.5 rounded-xl border text-xs font-mono font-medium transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-initial ${
                sortField === 'date' 
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400 font-bold' 
                  : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              Date {sortField === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => handleSort('netProfit')}
              className={`px-3 sm:px-4 py-2.5 rounded-xl border text-xs font-mono font-medium transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-initial ${
                sortField === 'netProfit' 
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400 font-bold' 
                  : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              Profit {sortField === 'netProfit' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => handleSort('hourlyWage')}
              className={`px-3 sm:px-4 py-2.5 rounded-xl border text-xs font-mono font-medium transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-initial ${
                sortField === 'hourlyWage' 
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400 font-bold' 
                  : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              Wage {sortField === 'hourlyWage' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>

        </div>
      </section>

      {/* Shift Logs Tab Placement: Full-width ad slot directly between the Search/Filter card and the 2x2 grid summary cards */}
      <AdSlot presetIndex={1} />

      {/* Filtered Summary stats */}
      {processedLogs.length > 0 && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3.5" id="filtered-history-mini-dashboard">
          <div className="bg-zinc-950 border border-zinc-900/80 p-4 rounded-xl font-mono">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Filtered Shifts</span>
            <span className="text-xl font-bold text-zinc-200 mt-1 block">{totals.count} entries</span>
          </div>
          <div className="bg-zinc-950 border border-zinc-900/80 p-4 rounded-xl font-mono">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Filtered Gross</span>
            <span className="text-xl font-bold text-zinc-200 mt-1 block">{formatCurrency(totals.gross, profile)}</span>
          </div>
          <div className="bg-zinc-950 border border-emerald-950 p-4 rounded-xl font-mono relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/[0.02] rounded-full blur-xl"></div>
            <span className="text-[10px] text-emerald-500 uppercase tracking-wider block font-semibold">Filtered Net Profit</span>
            <span className="text-xl font-bold text-emerald-400 mt-1 block">{formatCurrency(totals.profit, profile)}</span>
          </div>
          <div className="bg-zinc-950 border border-zinc-900/80 p-4 rounded-xl font-mono">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Avg Net Wage</span>
            <span className="text-xl font-bold text-zinc-200 mt-1 block">{formatCurrency(totals.avgHourly, profile)}/hr</span>
          </div>
        </section>
      )}

      {/* Shifts List */}
      <div className="space-y-4" id="shifts-history-list">
        <AnimatePresence mode="popLayout">
          {processedLogs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-zinc-950 border border-zinc-900 rounded-2xl p-12 text-center"
              id="empty-history-state"
            >
              <div className="bg-zinc-900/60 p-4 rounded-full w-14 h-14 flex items-center justify-center mx-auto text-zinc-600 border border-zinc-800">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-display font-semibold text-zinc-300 mt-4 text-base">No Matching Driving Shifts</h3>
              <p className="text-xs text-zinc-500 mt-2 max-w-sm mx-auto">
                No shift entries matched your filters. Clear your search or add a new shift log on the Dashboard.
              </p>
            </motion.div>
          ) : (
            processedLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const totalExpenses = log.fuelCost + log.depreciationCost + log.loggedExpenses;
              const platformConfig = PLATFORMS.find(p => p.id === log.platform) || PLATFORMS[6];
              
              return (
                <motion.div
                  layout
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className={`bg-zinc-950 border rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer ${
                    isExpanded 
                      ? 'border-emerald-500/40 ring-1 ring-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.03)] bg-zinc-900/10' 
                      : 'border-zinc-900 hover:border-emerald-500/30 hover:bg-zinc-900/10 hover:shadow-[0_0_15px_rgba(16,185,129,0.02)]'
                  }`}
                  id={`shift-item-${log.id}`}
                >
                  
                  {/* Item Main Bar (Collapsed Header) */}
                  <div 
                    onClick={() => toggleExpand(log.id)}
                    className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    
                    {/* Platform + Date */}
                    <div className="flex items-center justify-between md:justify-start gap-3 w-full md:w-auto">
                      <div className="flex items-center gap-3">
                        <div 
                          className={`w-2.5 h-10 rounded-full shrink-0 ${platformConfig.color === '#111111' ? 'border border-zinc-700 shadow-[0_0_8px_rgba(255,255,255,0.12)]' : ''}`} 
                          style={{ backgroundColor: platformConfig.color }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-zinc-200 text-sm md:text-base">
                              {log.platform} Shift
                            </span>
                            <span className="text-[10px] text-zinc-500 border border-zinc-800 px-2 py-0.5 rounded font-mono">
                              {log.date}
                            </span>
                          </div>
                          {log.notes ? (
                            <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5 max-w-md">
                              {log.notes}
                            </p>
                          ) : (
                            <p className="text-xs text-zinc-600 mt-0.5">
                              Logged with {log.expensesList.length} external expense item(s)
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Mobile Chevron */}
                      <div className="md:hidden text-zinc-500 bg-zinc-900/50 p-1.5 rounded-lg border border-zinc-800 shrink-0">
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-emerald-400' : ''}`} />
                      </div>
                    </div>

                    {/* Numeric breakdown quick view */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs md:text-sm w-full md:w-auto justify-between md:justify-end">
                      
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-sans">Gross Income</span>
                        <span className="font-bold text-zinc-300">{formatCurrency(log.grossRevenue, profile)}</span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-sans">Duration</span>
                        <span className="font-bold text-zinc-300">{log.hoursOnline} hrs</span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-emerald-500 uppercase tracking-wider block font-semibold font-sans">Real Net Profit</span>
                        <span className="font-bold text-emerald-400">{formatCurrency(log.netProfit, profile)}</span>
                      </div>

                      <div className="text-right border-l border-zinc-900/60 pl-4">
                        <span className="text-[10px] text-emerald-500 uppercase tracking-wider block font-semibold font-sans">Hourly Rate</span>
                        <span className="font-extrabold text-emerald-400">{formatCurrency(log.hourlyWage, profile)}/hr</span>
                      </div>

                      {/* Expand Chevron / Indicators */}
                      <div className="hidden md:flex items-center gap-2 pl-4 border-l border-zinc-900/60">
                        <span className="text-xs text-zinc-400 font-sans font-medium transition-colors hover:text-zinc-200">
                          {isExpanded ? 'Collapse' : 'Details'}
                        </span>
                        <div className={`p-1.5 rounded-lg border transition-all duration-300 ${isExpanded ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-500'}`}>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>

                    </div>

                  </div>

                  {/* Expanded Cost detail analysis */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden border-t border-zinc-900 bg-zinc-900/10 font-mono"
                      >
                        <div className="p-5 space-y-5">
                          
                          {/* Financial Slicing layout */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                            
                            {/* Left: Progress/Metrics Breakdown */}
                            <div className="md:col-span-8 space-y-4">
                              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-sans">
                                Realistic Cost Audit Report
                              </h4>

                              <div className="space-y-3.5">
                                
                                {/* Fuel Cost line */}
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-zinc-500 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                      Fuel cost for shift distance ({log.distance} {distanceUnit})
                                    </span>
                                    <span className="text-amber-400 font-bold">-{formatCurrency(log.fuelCost, profile)}</span>
                                  </div>
                                  <div className="w-full bg-zinc-900 rounded-full h-1 overflow-hidden">
                                    <div 
                                      className="bg-amber-500 h-1 rounded-full" 
                                      style={{ width: `${(log.fuelCost / log.grossRevenue) * 100}%` }}
                                    ></div>
                                  </div>
                                </div>

                                {/* Depreciation cost line */}
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-zinc-500 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                      Depreciation & wear (tires, oil, parts)
                                    </span>
                                    <span className="text-orange-400 font-bold">-{formatCurrency(log.depreciationCost, profile)}</span>
                                  </div>
                                  <div className="w-full bg-zinc-900 rounded-full h-1 overflow-hidden">
                                    <div 
                                      className="bg-orange-500 h-1 rounded-full" 
                                      style={{ width: `${(log.depreciationCost / log.grossRevenue) * 100}%` }}
                                    ></div>
                                  </div>
                                </div>

                                {/* Logged Expenses list */}
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-zinc-500 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                      Extra road expenses logged
                                    </span>
                                    <span className="text-rose-400 font-bold">-{formatCurrency(log.loggedExpenses, profile)}</span>
                                  </div>
                                  <div className="w-full bg-zinc-900 rounded-full h-1 overflow-hidden">
                                    <div 
                                      className="bg-rose-500 h-1 rounded-full" 
                                      style={{ width: `${(log.loggedExpenses / log.grossRevenue) * 100}%` }}
                                    ></div>
                                  </div>
                                </div>

                              </div>

                              {/* Shift notes */}
                              {log.notes && (
                                <div className="mt-4 bg-zinc-900/30 border border-zinc-900/80 p-3.5 rounded-xl font-sans">
                                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Driver Log Notes</p>
                                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                                    {log.notes}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Right: Detailed Cost Summary and Actions */}
                            <div className="md:col-span-4 flex flex-col justify-between border-t md:border-t-0 md:border-l border-zinc-900 pt-4 md:pt-0 md:pl-5">
                              
                              <div className="space-y-3">
                                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-sans">
                                  Cost Slices
                                </h4>
                                
                                <div className="space-y-2 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-zinc-500">Gross Income:</span>
                                    <span className="text-zinc-200 font-bold">{formatCurrency(log.grossRevenue, profile)}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-zinc-900 pb-2">
                                    <span className="text-zinc-500">Total Costs:</span>
                                    <span className="text-rose-400 font-bold">-{formatCurrency(totalExpenses, profile)}</span>
                                  </div>
                                  <div className="flex justify-between pt-1 font-semibold text-sm">
                                    <span className="text-emerald-500 font-sans">Real Net Profit:</span>
                                    <span className="text-emerald-400">{formatCurrency(log.netProfit, profile)}</span>
                                  </div>
                                </div>

                                {/* Attached expenses details list */}
                                {log.expensesList.length > 0 && (
                                  <div className="pt-2">
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Receipt Log:</p>
                                    <div className="space-y-1">
                                      {log.expensesList.map(item => (
                                        <div key={item.id} className="text-[11px] text-zinc-400 flex justify-between">
                                          <span>• {item.category}</span>
                                          <span className="text-rose-400">{formatCurrency(item.amount, profile)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="pt-5 flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => onDeleteLog(log.id)}
                                  className="w-full bg-rose-950/20 hover:bg-rose-950/50 text-rose-400 border border-rose-900/50 hover:border-rose-900 py-2 px-3 rounded-xl text-xs font-semibold font-sans flex items-center justify-center gap-1.5 transition-colors"
                                  id={`delete-shift-button-${log.id}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete Log Entry
                                </button>
                              </div>

                            </div>

                          </div>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Global Footer Placement: bottom ad slot container at the very end of this tab view */}
      <AdSlot presetIndex={1} className="mt-8" />

    </div>
  );
}
