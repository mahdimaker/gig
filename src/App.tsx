/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  History as HistoryIcon, 
  TrendingUp, 
  Settings, 
  Flame, 
  HelpCircle,
  EyeOff,
  Sun,
  Moon,
  ShieldCheck,
  Check,
  Gauge
} from 'lucide-react';
import { VehicleProfile, ShiftLog } from './types';
import { getInitialVehicleProfile, getSampleShiftLogs } from './utils';
import Dashboard from './components/Dashboard';
import History from './components/History';
import Stats from './components/Stats';
import VehicleSettings from './components/VehicleSettings';
import { motion, AnimatePresence } from 'motion/react';

const STORAGE_KEYS = {
  PROFILE: 'cartools_vehicle_profile_v1',
  LOGS: 'cartools_shift_logs_v1',
};

type AppTab = 'dashboard' | 'history' | 'stats' | 'settings';

const PROMOTIONS = [
  { sponsor: "PEPBYS", text: "Save 15% on premium performance tires", code: "GIG15" },
  { sponsor: "EVERLANCE", text: "Automate mileage tracking to maximize tax write-offs", code: "TAXFREE" },
  { sponsor: "FUELUP", text: "Earn 8% cashback on premium fuel deposits at partner stations", code: "CASH8" },
  { sponsor: "DRIVEWASH", text: "Maintain passenger comfort with unlimited washes for $19.99/mo", code: "CLEAN1" }
];

export default function App() {
  // Global States
  const [adIndex, setAdIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setAdIndex((prev) => (prev + 1) % PROMOTIONS.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const [profile, setProfile] = useState<VehicleProfile>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (!parsed.fuelPriceHistory) {
          parsed.fuelPriceHistory = [];
        }
        return parsed;
      } catch (e) {
        // Fallback to default
      }
    }
    return getInitialVehicleProfile();
  });

  const [logs, setLogs] = useState<ShiftLog[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Clear any pre-populated dummy shift logs or past metrics from existing storage
          return parsed.filter((log: any) => log && log.id && !log.id.startsWith('log-'));
        }
      } catch (e) {
        // Fallback
      }
    }
    return [];
  });

  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [dashboardResetKey, setDashboardResetKey] = useState(0);

  // Persistence triggers
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  }, [logs]);

  // Handle shift deletion
  const handleDeleteLog = (id: string) => {
    setLogs(prev => prev.filter(log => log.id !== id));
  };

  // Handle adding a new shift log
  const handleLogShift = (newLog: ShiftLog) => {
    setLogs(prev => [newLog, ...prev]);
  };

  // Reset data wipes
  const handleClearAllLogs = () => {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([]));
    setLogs([]);
    
    const resetProfile = getInitialVehicleProfile();
    setProfile(resetProfile);
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(resetProfile));
    
    setDashboardResetKey(prev => prev + 1);
  };

  // Seeding logs manually
  const handleLoadSampleLogs = () => {
    const samples = getSampleShiftLogs(profile);
    setLogs(prev => {
      // Avoid duplicating ids
      const existingIds = new Set(prev.map(l => l.id));
      const filteredSamples = samples.filter(s => !existingIds.has(s.id));
      return [...filteredSamples, ...prev];
    });
  };

  return (
    <div className="min-h-screen bg-[#131a26] text-zinc-100 flex flex-col antialiased selection:bg-emerald-500/30 selection:text-emerald-100" id="cartools-app-root">
      
      {/* Night Vision Anti-Glare Header strip */}
      <header className="bg-zinc-950/60 border-b border-zinc-900 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-start gap-3">
          
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-black p-2 rounded-xl shadow-lg shadow-emerald-950/20">
            <Gauge className="w-5 h-5 stroke-[2.5]" />
          </div>

          <span className="font-display font-black tracking-tight text-white uppercase text-base sm:text-lg">
            GIG DRIVER
          </span>

        </div>
      </header>

      {/* Main Content Layout container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Navigation Tabs (Big, tactical, high-contrast, finger-friendly) */}
        <nav className="grid grid-cols-4 gap-2 mb-8 bg-zinc-950 border border-zinc-900 p-1.5 rounded-2xl" id="navigation-bar">
          
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-3 rounded-xl font-semibold text-sm sm:text-base flex flex-col sm:flex-row items-center justify-center gap-2 transition-all duration-200 ${
              activeTab === 'dashboard'
                ? 'bg-zinc-900 border border-zinc-800 text-emerald-400 font-bold shadow'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent hover:bg-zinc-900/40'
            }`}
            id="tab-dashboard"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 rounded-xl font-semibold text-sm sm:text-base flex flex-col sm:flex-row items-center justify-center gap-2 transition-all duration-200 ${
              activeTab === 'history'
                ? 'bg-zinc-900 border border-zinc-800 text-emerald-400 font-bold shadow'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent hover:bg-zinc-900/40'
            }`}
            id="tab-history"
          >
            <HistoryIcon className="w-4 h-4" />
            <span>Shift Logs</span>
            {logs.length > 0 && (
              <span className="hidden sm:inline-block text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full font-mono">
                {logs.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`py-3 rounded-xl font-semibold text-sm sm:text-base flex flex-col sm:flex-row items-center justify-center gap-2 transition-all duration-200 ${
              activeTab === 'stats'
                ? 'bg-zinc-900 border border-zinc-800 text-emerald-400 font-bold shadow'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent hover:bg-zinc-900/40'
            }`}
            id="tab-stats"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 rounded-xl font-semibold text-sm sm:text-base flex flex-col sm:flex-row items-center justify-center gap-2 transition-all duration-200 ${
              activeTab === 'settings'
                ? 'bg-zinc-900 border border-zinc-800 text-emerald-400 font-bold shadow'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent hover:bg-zinc-900/40'
            }`}
            id="tab-settings"
          >
            <Settings className="w-4 h-4" />
            <span>Calibration</span>
          </button>

        </nav>

        {/* Tab Routing Container with animations */}
        <div id="tab-content-container">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18 }}
            >
              {activeTab === 'dashboard' && (
                <div key={dashboardResetKey}>
                  <Dashboard 
                    profile={profile} 
                    onLogShift={handleLogShift}
                    onNavigateToSettings={() => setActiveTab('settings')}
                    onUpdateProfile={setProfile}
                  />
                </div>
              )}

              {activeTab === 'history' && (
                <History 
                  logs={logs} 
                  onDeleteLog={handleDeleteLog}
                  distanceUnit={profile.distanceUnit}
                  profile={profile}
                />
              )}

              {activeTab === 'stats' && (
                <Stats 
                  logs={logs}
                  distanceUnit={profile.distanceUnit}
                  profile={profile}
                />
              )}

              {activeTab === 'settings' && (
                <VehicleSettings 
                  profile={profile} 
                  onUpdateProfile={setProfile}
                  onClearAllLogs={handleClearAllLogs}
                  onLoadSampleLogs={handleLoadSampleLogs}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

      </main>

      {/* Driver Centric Footer */}
      <footer className="bg-zinc-950/40 border-t border-zinc-900 mt-12 py-8 text-center text-xs text-zinc-500 font-sans">
        <div className="max-w-7xl mx-auto px-4 space-y-3">
          <p className="leading-relaxed max-w-lg mx-auto">
            CarTools respects driver confidentiality. Your vehicle stats, driving logs, and financial models remain completely private and stored locally on this physical device. No telemetry data is sent over the network.
          </p>
          <div className="flex items-center justify-center gap-4 text-[10px] text-zinc-600 font-mono">
            <span>Client Version: 1.1.0</span>
            <span>•</span>
            <span>Local Time Check: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span>•</span>
            <span>Safe Driving Mode: Engaged</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
