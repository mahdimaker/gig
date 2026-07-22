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
  ChevronDown,
  X,
  SlidersHorizontal,
  RotateCcw,
  Edit3
} from 'lucide-react';
import { ShiftLog, PLATFORMS, VehicleProfile } from '../types';
import { formatCurrency, formatDuration } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import AdSlot from './AdSlot';
import EditShiftModal from './EditShiftModal';

interface HistoryProps {
  logs: ShiftLog[];
  onDeleteLog: (id: string) => void;
  onUpdateLog?: (updatedLog: ShiftLog) => void;
  distanceUnit: string;
  profile: VehicleProfile;
}

type SortField = 'date' | 'netProfit' | 'grossRevenue' | 'hourlyWage';
type SortOrder = 'asc' | 'desc';
type DateRangePreset = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

export default function History({ logs, onDeleteLog, onUpdateLog, distanceUnit, profile }: HistoryProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<string>('All');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(false);
  
  // Date Range Filtering state
  const [datePreset, setDatePreset] = useState<DateRangePreset>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Shift Edit state
  const [editingLog, setEditingLog] = useState<ShiftLog | null>(null);

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

  const hasActiveFilters = useMemo(() => {
    return (
      selectedPlatformFilter !== 'All' || 
      sortField !== 'date' || 
      sortOrder !== 'desc' || 
      searchTerm.trim() !== '' ||
      datePreset !== 'all' ||
      customStartDate !== '' ||
      customEndDate !== ''
    );
  }, [selectedPlatformFilter, sortField, sortOrder, searchTerm, datePreset, customStartDate, customEndDate]);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedPlatformFilter('All');
    setSortField('date');
    setSortOrder('desc');
    setDatePreset('all');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  // Filter & Search & Sort logs
  const processedLogs = useMemo(() => {
    let result = [...logs];

    // Date range filter
    if (datePreset !== 'all') {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      if (datePreset === 'today') {
        result = result.filter(log => log.date === todayStr);
      } else if (datePreset === 'week') {
        const dayOfWeek = now.getDay();
        const diffToMon = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMon);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const fmt = (d: Date) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const dy = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${dy}`;
        };
        const monStr = fmt(monday);
        const sunStr = fmt(sunday);

        result = result.filter(log => log.date >= monStr && log.date <= sunStr);
      } else if (datePreset === 'month') {
        const monthStr = `${year}-${month}`;
        result = result.filter(log => log.date.startsWith(monthStr));
      } else if (datePreset === 'year') {
        result = result.filter(log => log.date.startsWith(year.toString()));
      } else if (datePreset === 'custom') {
        if (customStartDate) {
          result = result.filter(log => log.date >= customStartDate);
        }
        if (customEndDate) {
          result = result.filter(log => log.date <= customEndDate);
        }
      }
    }

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
  }, [logs, datePreset, customStartDate, customEndDate, selectedPlatformFilter, searchTerm, sortField, sortOrder]);

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
    <div className="space-y-4" id="history-tab-container">
      
      {/* Search & Filter Header Bar */}
      <section className="bg-zinc-950 border border-zinc-900 rounded-2xl p-3 sm:p-4 space-y-3 w-full" id="history-filters-bar">
        
        {/* Top Row: Search Input + Filter Toggle Button */}
        <div className="flex items-center gap-2 w-full">
          {/* Search Box */}
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search shifts by note, platform, date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900/90 border border-zinc-800 text-zinc-200 pl-9 pr-8 py-2 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-sans"
              id="history-search-input"
            />
            {searchTerm && (
              <button 
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5 rounded-full"
                title="Clear Search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter & Sort Toggle Button */}
          <button
            type="button"
            onClick={() => setIsFilterPanelOpen(prev => !prev)}
            className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              isFilterPanelOpen || hasActiveFilters
                ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-400 shadow-sm'
                : 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:border-zinc-700'
            }`}
            id="toggle-filter-panel-button"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filter & Sort</span>
            <span className="sm:hidden">Filters</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isFilterPanelOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Collapsible Extended Controls (Timeframe, Platform & Sorting) */}
        <AnimatePresence>
          {isFilterPanelOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-zinc-900 pt-3 space-y-3"
              id="history-collapsible-filter-panel"
            >
              {/* Date Range Selector Bar (TIMEFRAME) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-1.5 bg-zinc-900/80 border border-zinc-800/80 rounded-xl" id="date-range-preset-bar">
                <div className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold text-zinc-400 uppercase tracking-wider shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Timeframe:
                </div>
                
                <div className="flex flex-wrap items-center gap-1 flex-1">
                  {[
                    { id: 'all', label: 'All Time' },
                    { id: 'today', label: 'Today' },
                    { id: 'week', label: 'This Week' },
                    { id: 'month', label: 'This Month' },
                    { id: 'year', label: 'This Year' },
                    { id: 'custom', label: 'Custom Range' },
                  ].map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setDatePreset(preset.id as DateRangePreset)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        datePreset === preset.id
                          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950/50'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Date Range Pickers (if Custom is selected) */}
              {datePreset === 'custom' && (
                <div className="flex flex-col sm:flex-row items-center gap-2.5 bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-800/80 text-xs text-zinc-300">
                  <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                    <span className="text-zinc-400 font-bold shrink-0">Start Date:</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 text-zinc-100 px-2.5 py-1.5 rounded-lg font-mono text-xs focus:outline-none focus:border-emerald-500 w-full cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                    <span className="text-zinc-400 font-bold shrink-0">End Date:</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 text-zinc-100 px-2.5 py-1.5 rounded-lg font-mono text-xs focus:outline-none focus:border-emerald-500 w-full cursor-pointer"
                    />
                  </div>
                  {(customStartDate || customEndDate) && (
                    <button
                      type="button"
                      onClick={() => { setCustomStartDate(''); setCustomEndDate(''); }}
                      className="text-zinc-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-zinc-800 transition-all shrink-0 cursor-pointer"
                      title="Clear date inputs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                
                {/* Platform selector */}
                <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs text-zinc-400">
                  <Filter className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="font-semibold text-zinc-400">Platform:</span>
                  <select
                    value={selectedPlatformFilter}
                    onChange={(e) => setSelectedPlatformFilter(e.target.value)}
                    className="bg-transparent border-none text-zinc-200 focus:outline-none focus:ring-0 font-bold cursor-pointer text-xs ml-auto sm:ml-0"
                    id="platform-filter-select"
                  >
                    <option value="All" className="bg-zinc-950">All Platforms</option>
                    {PLATFORMS.map(p => (
                      <option key={p.id} value={p.id} className="bg-zinc-950">{p.id}</option>
                    ))}
                  </select>
                </div>

                {/* Sort options */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-zinc-500 font-bold hidden sm:inline mr-1">Sort:</span>
                  <button
                    type="button"
                    onClick={() => handleSort('date')}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all flex items-center justify-center gap-1 flex-1 sm:flex-initial cursor-pointer ${
                      sortField === 'date' 
                        ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400' 
                        : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    Date {sortField === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSort('netProfit')}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all flex items-center justify-center gap-1 flex-1 sm:flex-initial cursor-pointer ${
                      sortField === 'netProfit' 
                        ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400' 
                        : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    Profit {sortField === 'netProfit' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSort('hourlyWage')}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all flex items-center justify-center gap-1 flex-1 sm:flex-initial cursor-pointer ${
                      sortField === 'hourlyWage' 
                        ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400' 
                        : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    Wage {sortField === 'hourlyWage' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </button>
                </div>

              </div>

              {/* Reset button if active */}
              {hasActiveFilters && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-xs text-zinc-400 hover:text-emerald-400 flex items-center gap-1 transition-colors font-medium cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset all filters
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compact Summary Strip */}
        {processedLogs.length > 0 && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-zinc-900/50 border border-zinc-800/80 rounded-xl text-xs font-mono text-zinc-300">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 font-bold">Shifts:</span>
              <span className="font-bold text-white">{totals.count}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 font-bold">Net:</span>
              <span className="font-bold text-emerald-400">{formatCurrency(totals.profit, profile)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 font-bold">Avg:</span>
              <span className="font-bold text-zinc-200">{formatCurrency(totals.avgHourly, profile)}/hr</span>
            </div>
          </div>
        )}

      </section>

      {/* Shifts List */}
      <div className="space-y-3" id="shifts-history-list">
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
                No shift entries matched your selected timeframe or filters. Try adjusting your timeframe preset or clear filters.
              </p>
            </motion.div>
          ) : (
            processedLogs.map((log, index) => {
              const isExpanded = expandedLogId === log.id;
              const totalExpenses = log.fuelCost + log.depreciationCost + log.loggedExpenses;
              const platformConfig = PLATFORMS.find(p => p.id === log.platform) || PLATFORMS[6];
              const showInFeedAd = (index === 0) || (index > 0 && (index + 1) % 5 === 0);
              const adPreset = (Math.floor(index / 2) + 1) % 4;
              
              return (
                <motion.div
                  key={log.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div
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
                            <span className="font-semibold text-zinc-100 text-sm md:text-base">
                              {log.platform} Shift
                            </span>
                            <span className="text-xs text-zinc-300 border border-zinc-800 bg-zinc-900 px-2.5 py-0.5 rounded font-mono font-medium">
                              {log.date}
                            </span>
                          </div>
                          {log.notes && log.notes.trim() ? (
                            <p className="text-sm text-zinc-400 line-clamp-1 mt-0.5 max-w-md">
                              {log.notes}
                            </p>
                          ) : log.loggedExpenses > 0 ? (
                            <p className="text-sm text-zinc-400 mt-0.5 font-mono font-medium">
                              +{formatCurrency(log.loggedExpenses, profile)} Extra Expenses
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {/* Mobile Chevron + Quick Edit */}
                      <div className="flex items-center gap-1.5 md:hidden shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingLog(log);
                          }}
                          className="text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 p-1.5 rounded-lg border border-emerald-800/50"
                          title="Edit shift"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <div className="text-zinc-400 bg-zinc-900/50 p-1.5 rounded-lg border border-zinc-800">
                          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-emerald-400' : ''}`} />
                        </div>
                      </div>
                    </div>

                    {/* Numeric breakdown quick view */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-sm w-full md:w-auto justify-between md:justify-end">
                      
                      <div className="text-right">
                        <span className="text-xs text-zinc-400 uppercase tracking-wider block font-sans font-bold">Gross Income</span>
                        <span className="font-bold text-zinc-200">{formatCurrency(log.grossRevenue, profile)}</span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-zinc-400 uppercase tracking-wider block font-sans font-bold">Duration</span>
                        <span className="font-bold text-zinc-200">{formatDuration(log.hoursOnline)}</span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-emerald-400 uppercase tracking-wider block font-bold font-sans">Real Net Profit</span>
                        <span className="font-bold text-emerald-400">{formatCurrency(log.netProfit, profile)}</span>
                      </div>

                      <div className="text-right border-l border-zinc-900/60 pl-4">
                        <span className="text-xs text-emerald-400 uppercase tracking-wider block font-bold font-sans">Hourly Rate</span>
                        <span className="font-extrabold text-emerald-400">{formatCurrency(log.hourlyWage, profile)}/hr</span>
                      </div>

                      {/* Expand Chevron / Indicators */}
                      <div className="hidden md:flex items-center gap-2 pl-4 border-l border-zinc-900/60">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingLog(log);
                          }}
                          className="p-1.5 rounded-lg border border-emerald-800/60 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/60 transition-all cursor-pointer mr-1"
                          title="Quick Edit Shift"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <span className="text-sm text-zinc-300 font-sans font-semibold transition-colors hover:text-zinc-100">
                          {isExpanded ? 'Collapse' : 'Details'}
                        </span>
                        <div className={`p-1.5 rounded-lg border transition-all duration-300 ${isExpanded ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400'}`}>
                          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
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
                              <h4 className="text-sm font-bold text-zinc-300 uppercase tracking-wider font-sans">
                                Realistic Cost Audit Report
                              </h4>

                              <div className="space-y-3.5">
                                
                                {/* Fuel Cost line */}
                                <div className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-zinc-400 flex items-center gap-1.5 font-medium">
                                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                      Fuel cost for shift distance ({Number(log.distance).toFixed(1)} {distanceUnit})
                                    </span>
                                    <span className="text-amber-400 font-bold">-{formatCurrency(log.fuelCost, profile)}</span>
                                  </div>
                                  <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                                    <div 
                                      className="bg-amber-500 h-1.5 rounded-full" 
                                      style={{ width: `${log.grossRevenue > 0 ? (log.fuelCost / log.grossRevenue) * 100 : 0}%` }}
                                    ></div>
                                  </div>
                                </div>

                                {/* Depreciation cost line */}
                                <div className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-zinc-400 flex items-center gap-1.5 font-medium">
                                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                      Depreciation & wear (tires, oil, parts)
                                    </span>
                                    <span className="text-orange-400 font-bold">-{formatCurrency(log.depreciationCost, profile)}</span>
                                  </div>
                                  <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                                    <div 
                                      className="bg-orange-500 h-1.5 rounded-full" 
                                      style={{ width: `${log.grossRevenue > 0 ? (log.depreciationCost / log.grossRevenue) * 100 : 0}%` }}
                                    ></div>
                                  </div>
                                </div>

                                {/* Logged Expenses list */}
                                <div className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-zinc-400 flex items-center gap-1.5 font-medium">
                                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                      Extra road expenses logged
                                    </span>
                                    <span className="text-rose-400 font-bold">-{formatCurrency(log.loggedExpenses, profile)}</span>
                                  </div>
                                  <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                                    <div 
                                      className="bg-rose-500 h-1.5 rounded-full" 
                                      style={{ width: `${log.grossRevenue > 0 ? (log.loggedExpenses / log.grossRevenue) * 100 : 0}%` }}
                                    ></div>
                                  </div>
                                </div>

                              </div>

                              {/* Shift notes */}
                              {log.notes && (
                                <div className="mt-4 bg-zinc-900/30 border border-zinc-900/80 p-3.5 rounded-xl font-sans">
                                  <p className="text-xs text-zinc-400 uppercase tracking-wider font-bold">Driver Log Notes</p>
                                  <p className="text-sm text-zinc-200 mt-1 leading-relaxed">
                                    {log.notes}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Right: Detailed Cost Summary and Actions */}
                            <div className="md:col-span-4 flex flex-col justify-between border-t md:border-t-0 md:border-l border-zinc-900 pt-4 md:pt-0 md:pl-5">
                              
                              <div className="space-y-3">
                                <h4 className="text-sm font-bold text-zinc-300 uppercase tracking-wider font-sans">
                                  Cost Slices
                                </h4>
                                
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-zinc-400">Gross Income:</span>
                                    <span className="text-zinc-100 font-bold">{formatCurrency(log.grossRevenue, profile)}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-zinc-900 pb-2">
                                    <span className="text-zinc-400">Total Costs:</span>
                                    <span className="text-rose-400 font-bold">-{formatCurrency(totalExpenses, profile)}</span>
                                  </div>
                                  <div className="flex justify-between pt-1 font-bold text-sm">
                                    <span className="text-emerald-400 font-sans">Real Net Profit:</span>
                                    <span className="text-emerald-400">{formatCurrency(log.netProfit, profile)}</span>
                                  </div>
                                </div>

                                {/* Attached expenses details list */}
                                {log.expensesList && log.expensesList.length > 0 && (
                                  <div className="pt-2">
                                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-1">Receipt Log:</p>
                                    <div className="space-y-1">
                                      {log.expensesList.map(item => (
                                        <div key={item.id} className="text-sm text-zinc-300 flex justify-between">
                                          <span>• {item.category}</span>
                                          <span className="text-rose-400 font-bold">{formatCurrency(item.amount, profile)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="pt-5 flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingLog(log)}
                                  className="flex-1 bg-emerald-950/40 hover:bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 hover:border-emerald-600 py-2.5 px-3 rounded-xl text-sm font-bold font-sans flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
                                  id={`edit-shift-button-${log.id}`}
                                >
                                  <Edit3 className="w-4 h-4" />
                                  Edit Shift
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onDeleteLog(log.id)}
                                  className="flex-1 bg-rose-950/20 hover:bg-rose-950/50 text-rose-400 border border-rose-900/50 hover:border-rose-900 py-2.5 px-3 rounded-xl text-sm font-bold font-sans flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                                  id={`delete-shift-button-${log.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              </div>

                            </div>

                          </div>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  </div>

                  {/* In-Feed Native Ad Placement (inserted after 1st shift and periodically) */}
                  {showInFeedAd && (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="py-0.5"
                      id={`in-feed-ad-item-${log.id}`}
                    >
                      <AdSlot presetIndex={adPreset} compact={true} />
                    </motion.div>
                  )}
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Edit Shift Modal */}
      <EditShiftModal
        log={editingLog}
        profile={profile}
        isOpen={!!editingLog}
        onClose={() => setEditingLog(null)}
        onSave={(updatedLog) => {
          if (onUpdateLog) {
            onUpdateLog(updatedLog);
          }
          setEditingLog(null);
        }}
      />

      {/* Global Footer Placement: bottom ad slot container at the very end of this tab view */}
      <AdSlot presetIndex={1} className="mt-8" />

    </div>
  );
}

