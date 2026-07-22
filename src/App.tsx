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
  CALIBRATED: 'cartools_has_calibrated_v1',
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
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!parsed.fuelPriceHistory) {
          parsed.fuelPriceHistory = [];
        }
        return parsed;
      }
    } catch (e) {
      console.warn('LocalStorage profile access unavailable:', e);
    }
    return getInitialVehicleProfile();
  });

  const [logs, setLogs] = useState<ShiftLog[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LOGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Clear any pre-populated dummy shift logs or past metrics from existing storage
          return parsed.filter((log: any) => log && log.id && !log.id.startsWith('log-'));
        }
      }
    } catch (e) {
      console.warn('LocalStorage logs access unavailable:', e);
    }
    return [];
  });

  const [hasCalibrated, setHasCalibrated] = useState<boolean>(() => {
    try {
      const storedCal = localStorage.getItem(STORAGE_KEYS.CALIBRATED);
      if (storedCal === 'true') return true;
      const storedProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (storedProfile) return true;
    } catch (e) {
      console.warn('LocalStorage calibration state access check failed:', e);
    }
    return false;
  });

  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    try {
      const storedCal = localStorage.getItem(STORAGE_KEYS.CALIBRATED);
      const storedProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (storedCal === 'true' || storedProfile) {
        return 'dashboard';
      }
    } catch (e) {
      console.warn('LocalStorage tab state access check failed:', e);
    }
    return 'settings';
  });

  const [dashboardResetKey, setDashboardResetKey] = useState(0);

  const handleCalibrationComplete = () => {
    setHasCalibrated(true);
    try {
      localStorage.setItem(STORAGE_KEYS.CALIBRATED, 'true');
    } catch (e) {
      console.warn('LocalStorage calibration save failed:', e);
    }
    setActiveTab('dashboard');
  };

  // Persistence triggers safely guarded against iframe sandbox storage errors
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    } catch (e) {
      console.warn('LocalStorage profile save failed:', e);
    }
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
    } catch (e) {
      console.warn('LocalStorage logs save failed:', e);
    }
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
    // 1. Explicitly update React in-memory state FIRST
    const resetProfile = getInitialVehicleProfile();
    setLogs([]);
    setProfile(resetProfile);
    setHasCalibrated(false);
    setDashboardResetKey(prev => prev + 1);

    // 2. Safely perform localStorage operations in try...catch
    try {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(resetProfile));
      localStorage.removeItem(STORAGE_KEYS.LOGS);
      localStorage.removeItem(STORAGE_KEYS.PROFILE);
      localStorage.removeItem(STORAGE_KEYS.CALIBRATED);
    } catch (e) {
      console.warn('LocalStorage clear bypassed due to iframe restriction:', e);
    }
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
    handleCalibrationComplete();
  };

  // Restore imported logs and profile
  const handleRestoreData = (newLogs: ShiftLog[], newProfile?: VehicleProfile) => {
    if (newLogs) setLogs(newLogs);
    if (newProfile) setProfile(newProfile);
    handleCalibrationComplete();
    try {
      if (newLogs) localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(newLogs));
      if (newProfile) localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(newProfile));
    } catch (e) {
      console.warn('LocalStorage restore write failed:', e);
    }
  };

  return (
    <div className="min-h-screen bg-[#131a26] text-zinc-100 flex flex-col antialiased selection:bg-emerald-500/30 selection:text-emerald-100" id="cartools-app-root">
      
      {/* Main Header strip - Non-sticky so it scrolls naturally */}
      <header className="bg-zinc-950/60 border-b border-zinc-900">
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4 pb-2 sm:pb-6">
        
        {/* Floating Sticky Navigation Pill Container */}
        <div className="sticky top-2 z-30 mb-5 transition-all" id="sticky-navigation-wrapper">
          <nav className="grid grid-cols-4 gap-1.5 sm:gap-2 bg-zinc-950/90 border border-zinc-800/90 p-1 sm:p-1.5 rounded-2xl max-w-7xl mx-auto backdrop-blur-xl shadow-xl shadow-black/50 ring-1 ring-white/5" id="navigation-bar">
            
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-all duration-200 ${
                activeTab === 'dashboard'
                  ? 'bg-zinc-900 border border-zinc-700/80 text-emerald-400 font-bold shadow-md shadow-black/20'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent hover:bg-zinc-900/50'
              }`}
              id="tab-dashboard"
            >
              <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-all duration-200 ${
                activeTab === 'history'
                  ? 'bg-zinc-900 border border-zinc-700/80 text-emerald-400 font-bold shadow-md shadow-black/20'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent hover:bg-zinc-900/50'
              }`}
              id="tab-history"
            >
              <HistoryIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Shift Logs</span>
              {logs.length > 0 && (
                <span className="hidden sm:inline-block text-[10px] sm:text-xs bg-zinc-800/80 text-zinc-400 px-1.5 py-0.5 rounded-full font-mono">
                  {logs.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('stats')}
              className={`py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-all duration-200 ${
                activeTab === 'stats'
                  ? 'bg-zinc-900 border border-zinc-700/80 text-emerald-400 font-bold shadow-md shadow-black/20'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent hover:bg-zinc-900/50'
              }`}
              id="tab-stats"
            >
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-all duration-200 ${
                activeTab === 'settings'
                  ? 'bg-zinc-900 border border-zinc-700/80 text-emerald-400 font-bold shadow-md shadow-black/20'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent hover:bg-zinc-900/50'
              }`}
              id="tab-settings"
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Calibration</span>
            </button>

          </nav>
        </div>

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
                  logs={logs}
                  isFirstTimeUser={!hasCalibrated}
                  onUpdateProfile={setProfile}
                  onClearAllLogs={handleClearAllLogs}
                  onLoadSampleLogs={handleLoadSampleLogs}
                  onRestoreData={handleRestoreData}
                  onCalibrationComplete={handleCalibrationComplete}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

      </main>

      {/* Driver Centric Footer */}
      <footer className="bg-zinc-950/40 border-t border-zinc-900 mt-6 sm:mt-12 py-6 sm:py-8 text-center text-xs text-zinc-500 font-sans pb-24 md:pb-8">
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
