/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Settings, 
  Car, 
  Coins, 
  Trash2, 
  Database, 
  Check, 
  Info,
  Scale,
  RefreshCw,
  Leaf,
  Crown,
  Plus,
  Sparkles,
  SquareParking,
  X,
  ShieldAlert,
  DollarSign,
  Download,
  Upload,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';
import { VehicleProfile, DistanceUnit, FuelUnit, CustomQuickButton, ShiftLog } from '../types';
import { formatCurrency } from '../utils';
import AdSlot from './AdSlot';

interface VehicleSettingsProps {
  profile: VehicleProfile;
  logs?: ShiftLog[];
  isFirstTimeUser?: boolean;
  onUpdateProfile: (newProfile: VehicleProfile) => void;
  onClearAllLogs: () => void;
  onLoadSampleLogs: () => void;
  onRestoreData?: (logs: ShiftLog[], newProfile?: VehicleProfile) => void;
  onCalibrationComplete?: () => void;
}

export default function VehicleSettings({ 
  profile, 
  logs = [],
  isFirstTimeUser = false,
  onUpdateProfile, 
  onClearAllLogs, 
  onLoadSampleLogs,
  onRestoreData,
  onCalibrationComplete
}: VehicleSettingsProps) {
  // Form states initialized with current profile
  const [make, setMake] = useState(profile.make);
  const [model, setModel] = useState(profile.model);
  const [year, setYear] = useState(profile.year.toString());
  const [fuelConsumption, setFuelConsumption] = useState(profile.fuelConsumption.toString());
  const [fuelPrice, setFuelPrice] = useState(profile.fuelPrice.toString());
  const [depreciationRate, setDepreciationRate] = useState(profile.depreciationRate.toString());
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>(profile.distanceUnit);
  const [fuelUnit, setFuelUnit] = useState<FuelUnit>(profile.fuelUnit);
  const [measurementSystem, setMeasurementSystem] = useState<'us' | 'metric' | 'uk'>(profile.measurementSystem || (profile.distanceUnit === 'miles' && profile.fuelUnit === 'liters' ? 'uk' : profile.distanceUnit === 'km' ? 'metric' : 'us'));

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  // Quick Expense Defaults states
  const [tollsDefault, setTollsDefault] = useState((profile.expenseDefaults?.tolls ?? 5.00).toString());
  const [carWashDefault, setCarWashDefault] = useState((profile.expenseDefaults?.carWash ?? 14.00).toString());
  const [parkingDefault, setParkingDefault] = useState((profile.expenseDefaults?.parking ?? 4.00).toString());
  const [customButtons, setCustomButtons] = useState<CustomQuickButton[]>(profile.customQuickButtons ?? []);

  const [showAddCustomForm, setShowAddCustomForm] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [customCategory, setCustomCategory] = useState<'Tolls' | 'Car Wash' | 'Parking' | 'Fines' | 'Other'>('Other');
  const [expenseSaveSuccess, setExpenseSaveSuccess] = useState(false);

  // Backup & Restore states
  const [pendingImport, setPendingImport] = useState<{
    logs: ShiftLog[];
    profile?: VehicleProfile;
    fileName: string;
    logCount: number;
  } | null>(null);

  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Backup Export function (CSV)
  const exportDataCSV = () => {
    const currentLogs = logs || [];
    
    // Embed calibration settings as header metadata comment
    const profileComment = `# CALIBRATION: ${JSON.stringify(profile)}`;
    
    const headers = [
      'ID',
      'Date',
      'Platform',
      'Gross Revenue',
      'Hours Online',
      'Distance',
      'Fuel Cost',
      'Depreciation Cost',
      'Logged Expenses',
      'Net Profit',
      'Hourly Wage',
      'Notes'
    ];

    const escapeCSV = (val: any) => {
      if (val === undefined || val === null) return '""';
      const str = String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const formatNum = (val: any) => {
      const num = typeof val === 'number' && !isNaN(val) ? val : parseFloat(val);
      return isNaN(num) ? '0.00' : num.toFixed(2);
    };

    const rows = currentLogs.map(log => [
      escapeCSV(log.id),
      escapeCSV(log.date),
      escapeCSV(log.platform),
      formatNum(log.grossRevenue),
      formatNum(log.hoursOnline),
      formatNum(log.distance),
      formatNum(log.fuelCost),
      formatNum(log.depreciationCost),
      formatNum(log.loggedExpenses),
      formatNum(log.netProfit),
      formatNum(log.hourlyWage),
      escapeCSV(log.notes)
    ]);

    const csvContent = [profileComment, headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `gigdriver_backup_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Restore Import Handler (CSV)
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (!content) return;

        // Extract metadata & split CSV lines
        const rawLines = content.split(/\r?\n/);
        let importedProfile: VehicleProfile | undefined = undefined;
        const csvLines: string[] = [];

        for (const line of rawLines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith('# CALIBRATION:') || trimmed.startsWith('# PROFILE:')) {
            try {
              const jsonStr = trimmed.substring(trimmed.indexOf(':') + 1).trim();
              importedProfile = JSON.parse(jsonStr);
            } catch (pErr) {
              console.warn('Failed to parse embedded profile calibration metadata from CSV:', pErr);
            }
          } else if (!trimmed.startsWith('#')) {
            csvLines.push(line);
          }
        }

        // Fallback check if user uploaded a raw JSON backup
        if (csvLines.length === 0 && (content.trim().startsWith('{') || content.trim().startsWith('['))) {
          const parsed = JSON.parse(content);
          let importedLogs: ShiftLog[] = [];
          if (Array.isArray(parsed)) {
            importedLogs = parsed;
          } else if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.logs)) importedLogs = parsed.logs;
            if (parsed.profile) importedProfile = parsed.profile;
          }
          if (importedLogs.length > 0 || importedProfile) {
            setPendingImport({
              logs: importedLogs,
              profile: importedProfile,
              fileName: file.name,
              logCount: importedLogs.length
            });
            return;
          }
        }

        if (csvLines.length < 2) {
          setImportError('CSV backup must contain a header row and at least one data row.');
          return;
        }

        const headerLine = csvLines[0];
        const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const dateIdx = headers.findIndex(h => /date/i.test(h));
        const platformIdx = headers.findIndex(h => /platform/i.test(h));
        const grossIdx = headers.findIndex(h => /gross/i.test(h));
        const hoursIdx = headers.findIndex(h => /hours/i.test(h));
        const distanceIdx = headers.findIndex(h => /distance|miles|km/i.test(h));
        const fuelIdx = headers.findIndex(h => /fuel/i.test(h));
        const depIdx = headers.findIndex(h => /depreciation|wear/i.test(h));
        const expIdx = headers.findIndex(h => /expenses/i.test(h));
        const netIdx = headers.findIndex(h => /net/i.test(h));
        const notesIdx = headers.findIndex(h => /notes/i.test(h));
        const idIdx = headers.findIndex(h => /id/i.test(h));

        const importedLogs: ShiftLog[] = [];

        // Helper to parse CSV row respecting quotes
        const parseCSVLine = (textLine: string) => {
          const result: string[] = [];
          let cur = '';
          let inQuotes = false;
          for (let i = 0; i < textLine.length; i++) {
            const char = textLine[i];
            if (char === '"') {
              if (inQuotes && textLine[i + 1] === '"') {
                cur += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              result.push(cur.trim());
              cur = '';
            } else {
              cur += char;
            }
          }
          result.push(cur.trim());
          return result.map(v => v.replace(/^"|"$/g, ''));
        };

        for (let i = 1; i < csvLines.length; i++) {
          const cleanRow = parseCSVLine(csvLines[i]);
          if (cleanRow.length < 2) continue;

          const date = dateIdx >= 0 && cleanRow[dateIdx] ? cleanRow[dateIdx] : new Date().toISOString().split('T')[0];
          const platformRaw = platformIdx >= 0 ? cleanRow[platformIdx] : 'Other';
          const validPlatforms = ['Uber', 'Lyft', 'DoorDash', 'Instacart', 'UberEats', 'AmazonFlex', 'Other'];
          const platform = validPlatforms.includes(platformRaw) ? platformRaw : 'Other';

          const grossRevenue = grossIdx >= 0 ? parseFloat(cleanRow[grossIdx]) || 0 : 0;
          const hoursOnline = hoursIdx >= 0 ? parseFloat(cleanRow[hoursIdx]) || 0 : 0;
          const distance = distanceIdx >= 0 ? parseFloat(cleanRow[distanceIdx]) || 0 : 0;
          const fuelCost = fuelIdx >= 0 ? parseFloat(cleanRow[fuelIdx]) || 0 : 0;
          const depreciationCost = depIdx >= 0 ? parseFloat(cleanRow[depIdx]) || 0 : 0;
          const loggedExpenses = expIdx >= 0 ? parseFloat(cleanRow[expIdx]) || 0 : 0;
          const netProfit = netIdx >= 0 && cleanRow[netIdx] !== '' ? parseFloat(cleanRow[netIdx]) || 0 : grossRevenue - (fuelCost + depreciationCost + loggedExpenses);
          const hourlyWage = hoursOnline > 0 ? netProfit / hoursOnline : 0;
          const notes = notesIdx >= 0 ? cleanRow[notesIdx] : '';
          const logId = idIdx >= 0 && cleanRow[idIdx] ? cleanRow[idIdx] : `imported-${Date.now()}-${i}`;

          importedLogs.push({
            id: logId,
            date,
            platform: platform as any,
            grossRevenue,
            hoursOnline,
            distance,
            fuelCost,
            depreciationCost,
            loggedExpenses,
            expensesList: [],
            netProfit,
            hourlyWage,
            notes
          });
        }

        if (importedLogs.length === 0 && !importedProfile) {
          setImportError('Could not parse any shift logs from the uploaded CSV backup.');
          return;
        }

        setPendingImport({
          logs: importedLogs,
          profile: importedProfile,
          fileName: file.name,
          logCount: importedLogs.length
        });
      } catch (err) {
        console.error('File import error:', err);
        setImportError('Failed to parse CSV backup file. Please ensure it is a valid CSV file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const confirmRestore = () => {
    if (!pendingImport) return;

    if (onRestoreData) {
      onRestoreData(pendingImport.logs, pendingImport.profile);
    }
    if (pendingImport.profile && onUpdateProfile) {
      onUpdateProfile(pendingImport.profile);
    }

    setImportSuccess(`Successfully restored ${pendingImport.logCount} shift log(s)${pendingImport.profile ? ' & calibration settings' : ''}.`);
    setPendingImport(null);
    setImportError(null);

    setTimeout(() => {
      setImportSuccess(null);
    }, 6000);
  };

  // Sync state if profile is updated from outside (e.g. loaded sample logs or initialized)
  React.useEffect(() => {
    setMake(profile.make);
    setModel(profile.model);
    setYear(profile.year.toString());
    setFuelConsumption(profile.fuelConsumption.toString());
    setFuelPrice(profile.fuelPrice.toString());
    setDepreciationRate(profile.depreciationRate.toString());
    setDistanceUnit(profile.distanceUnit);
    setFuelUnit(profile.fuelUnit);
    setMeasurementSystem(profile.measurementSystem || (profile.distanceUnit === 'miles' && profile.fuelUnit === 'liters' ? 'uk' : profile.distanceUnit === 'km' ? 'metric' : 'us'));
    setTollsDefault((profile.expenseDefaults?.tolls ?? 5.00).toString());
    setCarWashDefault((profile.expenseDefaults?.carWash ?? 14.00).toString());
    setParkingDefault((profile.expenseDefaults?.parking ?? 4.00).toString());
    setCustomButtons(profile.customQuickButtons ?? []);
  }, [profile]);

  // Unit changes can smart-adjust defaults to prevent weird calculations
  const handleUnitPresetChange = (dist: DistanceUnit, fuel: FuelUnit, system: 'us' | 'metric' | 'uk') => {
    setDistanceUnit(dist);
    setFuelUnit(fuel);
    setMeasurementSystem(system);

    // Provide sensible starting defaults for each measurement system if user changes system
    if (system === 'uk') {
      setFuelConsumption('45'); // 45 UK MPG
      setFuelPrice('1.42'); // £1.42 per Litre
      setDepreciationRate('0.20'); // £0.20 per mile (Standard)
    } else if (system === 'metric') {
      setFuelConsumption('6.0'); // 6.0 L/100km
      setFuelPrice('1.45'); // €1.45 per Litre
      setDepreciationRate('0.15'); // €0.15 per kilometer (Standard)
    } else {
      setFuelConsumption('35'); // 35 MPG
      setFuelPrice('3.85'); // $3.85 per gallon
      setDepreciationRate('0.18'); // $0.18 per mile (Standard)
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newFuelPrice = parseFloat(fuelPrice) || 3.85;
    const isPriceChanged = !profile.fuelPriceHistory || Math.abs(newFuelPrice - profile.fuelPrice) > 0.001;

    let updatedHistory = profile.fuelPriceHistory ? [...profile.fuelPriceHistory] : [];
    if (isPriceChanged) {
      updatedHistory.push({
        date: new Date().toISOString(),
        price: newFuelPrice,
      });
    }

    const parsedProfile: VehicleProfile = {
      make: make.trim() || 'Toyota',
      model: model.trim() || 'Prius',
      year: parseInt(year) || 2021,
      fuelConsumption: parseFloat(fuelConsumption) || 35,
      fuelPrice: newFuelPrice,
      depreciationRate: parseFloat(depreciationRate) || 0.15,
      distanceUnit,
      fuelUnit,
      measurementSystem,
      fuelPriceHistory: updatedHistory,
      expenseDefaults: {
        tolls: parseFloat(tollsDefault) || 5.00,
        carWash: parseFloat(carWashDefault) || 14.00,
        parking: parseFloat(parkingDefault) || 4.00,
      },
      customQuickButtons: customButtons,
    };

    onUpdateProfile(parsedProfile);
    setSaveSuccess(true);
    if (onCalibrationComplete) {
      onCalibrationComplete();
    } else {
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleSaveExpenseDefaults = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedProfile: VehicleProfile = {
      ...profile,
      expenseDefaults: {
        tolls: parseFloat(tollsDefault) || 5.00,
        carWash: parseFloat(carWashDefault) || 14.00,
        parking: parseFloat(parkingDefault) || 4.00,
      },
      customQuickButtons: customButtons,
    };
    onUpdateProfile(updatedProfile);
    setExpenseSaveSuccess(true);
    setTimeout(() => setExpenseSaveSuccess(false), 3000);
  };

  const handleDeleteCustomButton = (id: string) => {
    const updated = customButtons.filter(b => b.id !== id);
    setCustomButtons(updated);
    onUpdateProfile({
      ...profile,
      customQuickButtons: updated,
    });
  };

  const handleAddCustomButtonSubmit = () => {
    if (!customLabel.trim()) return;
    const amount = parseFloat(customAmount) || 0;
    const newButton: CustomQuickButton = {
      id: `custom-btn-${Date.now()}`,
      label: customLabel.trim(),
      amount,
      category: customCategory,
    };
    const updated = [...customButtons, newButton];
    setCustomButtons(updated);
    onUpdateProfile({
      ...profile,
      customQuickButtons: updated,
    });
    setCustomLabel('');
    setCustomAmount('');
    setShowAddCustomForm(false);
  };

  const handleClear = () => {
    let confirmed = true;
    try {
      confirmed = window.confirm('Are you absolutely sure you want to delete all historical driving shift logs? This cannot be undone.');
    } catch (e) {
      // If modal or confirm is restricted in sandbox, proceed directly with clear
      confirmed = true;
    }

    if (confirmed) {
      onClearAllLogs();
      setClearSuccess(true);
      setTimeout(() => setClearSuccess(false), 3000);
    }
  };

  const handleSeed = () => {
    let confirmed = true;
    try {
      confirmed = window.confirm('This will append 5 realistic mock shifts to your logs. Continue?');
    } catch (e) {
      confirmed = true;
    }

    if (confirmed) {
      onLoadSampleLogs();
      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 3000);
    }
  };

  const economyRate = measurementSystem === 'uk' ? 0.14 : measurementSystem === 'metric' ? 0.11 : 0.15;
  const standardRate = measurementSystem === 'uk' ? 0.20 : measurementSystem === 'metric' ? 0.15 : 0.18;
  const luxuryRate = measurementSystem === 'uk' ? 0.30 : measurementSystem === 'metric' ? 0.24 : 0.28;

  const currentRate = parseFloat(depreciationRate) || 0;
  const isEconomy = Math.abs(currentRate - economyRate) < 0.001;
  const isStandard = Math.abs(currentRate - standardRate) < 0.001;
  const isLuxury = Math.abs(currentRate - luxuryRate) < 0.001;

  const currencySymbol = measurementSystem === 'uk' ? '£' : measurementSystem === 'metric' ? '€' : '$';

  return (
    <div className="space-y-6" id="settings-tab-container">
      
      {/* First-Time User Onboarding Welcome Banner */}
      {isFirstTimeUser && (
        <div className="bg-gradient-to-r from-emerald-950/90 via-zinc-950 to-emerald-950/90 border-2 border-emerald-500/60 rounded-2xl p-5 sm:p-6 shadow-xl shadow-emerald-950/40 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300" id="onboarding-welcome-banner">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-start gap-3.5 sm:gap-4 relative z-10">
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400 shrink-0 mt-0.5 shadow-sm">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500 text-black text-[10px] uppercase font-mono font-black px-2 py-0.5 rounded-md tracking-wider shadow-sm">
                  First-Time Setup
                </span>
                <span className="text-xs text-emerald-400 font-bold">Initial Calibration</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white font-display">
                Welcome to Gig Driver!
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 font-medium leading-relaxed">
                Welcome! Set up your vehicle metrics first to enable accurate earnings tracking.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Section: Vehicle Settings Form (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6" id="vehicle-settings-form-panel">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-xl sm:text-2xl text-zinc-100 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-emerald-400 animate-spin-slow" /> Vehicle Expense Tuning
                </h2>
                <p className="text-xs sm:text-sm text-zinc-300 mt-1 font-medium">
                  Calibrate your fuel consumption and true depreciation rate per unit driven.
                </p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              
              {/* Distance & Fuel Unit Selection */}
              <div>
                <label className="block text-sm sm:text-base font-bold text-zinc-200 uppercase tracking-wider mb-2.5">
                  Unit Measurement System
                </label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => handleUnitPresetChange('miles', 'gallons', 'us')}
                    className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer relative overflow-hidden group ${
                      measurementSystem === 'us'
                        ? 'bg-emerald-950/15 border-emerald-500 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/20 text-emerald-300'
                        : 'bg-zinc-900/30 border-zinc-900 text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900/50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full overflow-hidden border border-zinc-800 flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${
                      measurementSystem === 'us' ? 'opacity-100 scale-105 shadow-sm shadow-emerald-500/30' : 'opacity-60 grayscale-[15%]'
                    }`}>
                      <svg viewBox="0 0 32 32" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        <rect width="32" height="32" fill="#FFFFFF"/>
                        <path d="M0 2.46h32M0 7.38h32M0 12.3h32M0 17.22h32M0 22.14h32M0 27.06h32" stroke="#B22234" strokeWidth="2.46"/>
                        <rect width="16" height="17.22" fill="#3C3B6E"/>
                        <g fill="#FFFFFF">
                          <circle cx="3" cy="3" r="0.65"/>
                          <circle cx="7" cy="3" r="0.65"/>
                          <circle cx="11" cy="3" r="0.65"/>
                          <circle cx="15" cy="3" r="0.65"/>
                          <circle cx="5" cy="6" r="0.65"/>
                          <circle cx="9" cy="6" r="0.65"/>
                          <circle cx="13" cy="6" r="0.65"/>
                          <circle cx="3" cy="9" r="0.65"/>
                          <circle cx="7" cy="9" r="0.65"/>
                          <circle cx="11" cy="9" r="0.65"/>
                          <circle cx="15" cy="9" r="0.65"/>
                          <circle cx="5" cy="12" r="0.65"/>
                          <circle cx="9" cy="12" r="0.65"/>
                          <circle cx="13" cy="12" r="0.65"/>
                          <circle cx="3" cy="15" r="0.65"/>
                          <circle cx="7" cy="15" r="0.65"/>
                          <circle cx="11" cy="15" r="0.65"/>
                          <circle cx="15" cy="15" r="0.65"/>
                        </g>
                      </svg>
                    </div>
                    <span className="font-sans font-bold text-sm sm:text-base text-zinc-100 mt-1">US Imperial</span>
                    <span className="text-xs sm:text-sm font-mono text-zinc-300 font-semibold leading-tight">mi, gal, MPG</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUnitPresetChange('km', 'liters', 'metric')}
                    className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer relative overflow-hidden group ${
                      measurementSystem === 'metric'
                        ? 'bg-emerald-950/15 border-emerald-500 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/20 text-emerald-300'
                        : 'bg-zinc-900/30 border-zinc-900 text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900/50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full overflow-hidden border border-zinc-800 flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${
                      measurementSystem === 'metric' ? 'opacity-100 scale-105 shadow-sm shadow-emerald-500/30' : 'opacity-60 grayscale-[15%]'
                    }`}>
                      <svg viewBox="0 0 32 32" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        <rect width="32" height="32" fill="#003399"/>
                        <g fill="#FFCC00">
                          <circle cx="16" cy="7" r="0.95"/>
                          <circle cx="20.5" cy="8.2" r="0.95"/>
                          <circle cx="23.8" cy="11.5" r="0.95"/>
                          <circle cx="25" cy="16" r="0.95"/>
                          <circle cx="23.8" cy="20.5" r="0.95"/>
                          <circle cx="20.5" cy="23.8" r="0.95"/>
                          <circle cx="16" cy="25" r="0.95"/>
                          <circle cx="11.5" cy="23.8" r="0.95"/>
                          <circle cx="8.2" cy="20.5" r="0.95"/>
                          <circle cx="7" cy="16" r="0.95"/>
                          <circle cx="8.2" cy="11.5" r="0.95"/>
                          <circle cx="11.5" cy="8.2" r="0.95"/>
                        </g>
                      </svg>
                    </div>
                    <span className="font-sans font-bold text-sm sm:text-base text-zinc-100 mt-1">Metric</span>
                    <span className="text-xs sm:text-sm font-mono text-zinc-300 font-semibold leading-tight">km, L, L/100km</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUnitPresetChange('miles', 'liters', 'uk')}
                    className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer relative overflow-hidden group ${
                      measurementSystem === 'uk'
                        ? 'bg-emerald-950/15 border-emerald-500 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/20 text-emerald-300'
                        : 'bg-zinc-900/30 border-zinc-900 text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900/50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full overflow-hidden border border-zinc-800 flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${
                      measurementSystem === 'uk' ? 'opacity-100 scale-105 shadow-sm shadow-emerald-500/30' : 'opacity-60 grayscale-[15%]'
                    }`}>
                      <svg viewBox="0 0 32 32" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        <rect width="32" height="32" fill="#012169"/>
                        <path d="M0 0 L32 32 M32 0 L0 32" stroke="#FFFFFF" strokeWidth="3.5"/>
                        <path d="M0 0 L16 16 M32 0 L16 16 M0 32 L16 16 M32 32 L16 16" stroke="#C8102E" strokeWidth="1.3"/>
                        <path d="M16 0 V32 M0 16 H32" stroke="#FFFFFF" strokeWidth="5.5"/>
                        <path d="M16 0 V32 M0 16 H32" stroke="#C8102E" strokeWidth="3.2"/>
                      </svg>
                    </div>
                    <span className="font-sans font-bold text-sm sm:text-base text-zinc-100 mt-1">UK System</span>
                    <span className="text-xs sm:text-sm font-mono text-zinc-300 font-semibold leading-tight">mi, L, UK MPG</span>
                  </button>
                </div>
              </div>

              {/* Car Make Model and Year fields */}
              <div className="space-y-4 pt-4 border-t border-zinc-900">
                <h3 className="text-sm sm:text-base font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-emerald-400" /> Vehicle Information
                </h3>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-sm font-bold text-zinc-200 mb-1.5">Year</label>
                    <input
                      type="number"
                      required
                      placeholder="2021"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full bg-zinc-900/80 border border-zinc-800 text-zinc-100 px-3 py-2.5 rounded-xl text-sm sm:text-base focus:outline-none focus:border-emerald-500 font-mono font-bold"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-bold text-zinc-200 mb-1.5">Make</label>
                    <input
                      type="text"
                      required
                      placeholder="Toyota"
                      value={make}
                      onChange={(e) => setMake(e.target.value)}
                      className="w-full bg-zinc-900/80 border border-zinc-800 text-zinc-100 px-3 py-2.5 rounded-xl text-sm sm:text-base focus:outline-none focus:border-emerald-500 font-bold"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-bold text-zinc-200 mb-1.5">Model</label>
                    <input
                      type="text"
                      required
                      placeholder="Prius"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full bg-zinc-900/80 border border-zinc-800 text-zinc-100 px-3 py-2.5 rounded-xl text-sm sm:text-base focus:outline-none focus:border-emerald-500 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Rates Calibration and Tuning */}
              <div className="space-y-4 pt-4 border-t border-zinc-900">
                <h3 className="text-sm sm:text-base font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-emerald-400" /> Expense Calibration Rates
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Fuel consumption */}
                  <div>
                    <label className="block text-sm font-bold text-zinc-200 mb-1.5">
                      Fuel Consumption
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={fuelConsumption}
                        onChange={(e) => setFuelConsumption(e.target.value)}
                        required
                        className="w-full bg-zinc-900/80 border border-zinc-800 text-zinc-100 pl-3 pr-24 py-2.5 rounded-xl text-sm sm:text-base focus:outline-none focus:border-emerald-500 font-mono font-bold"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm font-bold text-zinc-300">
                        {distanceUnit === 'miles' ? (measurementSystem === 'uk' ? 'UK MPG' : 'MPG') : 'L/100km'}
                      </span>
                    </div>
                    <span className="text-xs sm:text-sm text-zinc-300 font-medium mt-1.5 block">
                      {measurementSystem === 'metric' ? 'Lower values consume less fuel' : 'Higher values consume less fuel'}
                    </span>
                  </div>

                  {/* Fuel Price */}
                  <div>
                    <label className="block text-sm font-bold text-zinc-200 mb-1.5">
                      Fuel Price ({measurementSystem === 'uk' ? 'GBP' : measurementSystem === 'metric' ? 'EUR' : 'USD'})
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-300 font-mono font-bold text-sm sm:text-base">
                        {measurementSystem === 'uk' ? '£' : measurementSystem === 'metric' ? '€' : '$'}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={fuelPrice}
                        onChange={(e) => setFuelPrice(e.target.value)}
                        required
                        className="w-full bg-zinc-900/80 border border-zinc-800 text-zinc-100 pl-7 pr-14 py-2.5 rounded-xl text-sm sm:text-base focus:outline-none focus:border-emerald-500 font-mono font-bold"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm font-bold text-zinc-300">
                        /{measurementSystem === 'uk' ? 'Litre' : measurementSystem === 'metric' ? 'L' : 'gal'}
                      </span>
                    </div>
                    <span className="text-xs sm:text-sm text-zinc-300 font-medium mt-1.5 block">Price of gas in your region</span>
                  </div>

                  {/* Depreciation Rate */}
                  <div>
                    <label className="block text-sm font-bold text-zinc-200 mb-1.5">
                      Depreciation / Unit ({measurementSystem === 'uk' ? '£/mi' : measurementSystem === 'metric' ? '€/km' : '$/mi'})
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-300 font-mono font-bold text-sm sm:text-base">
                        {measurementSystem === 'uk' ? '£' : measurementSystem === 'metric' ? '€' : '$'}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={depreciationRate}
                        onChange={(e) => setDepreciationRate(e.target.value)}
                        required
                        className="w-full bg-zinc-900/80 border border-zinc-800 text-zinc-100 pl-7 pr-12 py-2.5 rounded-xl text-sm sm:text-base focus:outline-none focus:border-emerald-500 font-mono font-bold"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm font-bold text-zinc-300">
                        /{distanceUnit === 'miles' ? 'mi' : 'km'}
                      </span>
                    </div>
                    <span className="text-xs sm:text-sm text-zinc-300 font-medium mt-1.5 block">Wear, oil, tires, insurance</span>
                    
                    {/* Depreciation smart presets */}
                    <div className="mt-4 space-y-2">
                      <label className="block text-xs sm:text-sm font-bold text-zinc-200 uppercase tracking-wider">
                        Quick Vehicle Depreciation Tiers
                      </label>
                      <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        <button
                          type="button"
                          onClick={() => setDepreciationRate(measurementSystem === 'uk' ? '0.14' : measurementSystem === 'metric' ? '0.11' : '0.15')}
                          className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all text-center cursor-pointer relative overflow-hidden group ${
                            isEconomy
                              ? 'bg-emerald-950/15 border-emerald-500 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/20'
                              : 'bg-zinc-900/30 border-zinc-900 text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900/50'
                          }`}
                        >
                          <Leaf className={`w-5 h-5 group-hover:scale-110 transition-transform ${isEconomy ? 'text-blue-400' : 'text-blue-500/70'}`} />
                          <span className="text-sm font-bold font-sans text-zinc-200 mt-1">Economy</span>
                          <span className="text-xs sm:text-sm font-mono font-bold mt-0.5 text-blue-400">
                            {measurementSystem === 'uk' ? '£0.14' : measurementSystem === 'metric' ? '€0.11' : '$0.15'}/{distanceUnit === 'miles' ? 'mi' : 'km'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDepreciationRate(measurementSystem === 'uk' ? '0.20' : measurementSystem === 'metric' ? '0.15' : '0.18')}
                          className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all text-center cursor-pointer relative overflow-hidden group ${
                            isStandard
                              ? 'bg-emerald-950/15 border-emerald-500 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/20'
                              : 'bg-zinc-900/30 border-zinc-900 text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900/50'
                          }`}
                        >
                          <Car className={`w-5 h-5 group-hover:scale-110 transition-transform ${isStandard ? 'text-rose-400' : 'text-rose-500/70'}`} />
                          <span className="text-sm font-bold font-sans text-zinc-200 mt-1">Standard</span>
                          <span className="text-xs sm:text-sm font-mono font-bold mt-0.5 text-rose-400">
                            {measurementSystem === 'uk' ? '£0.20' : measurementSystem === 'metric' ? '€0.15' : '$0.18'}/{distanceUnit === 'miles' ? 'mi' : 'km'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDepreciationRate(measurementSystem === 'uk' ? '0.30' : measurementSystem === 'metric' ? '0.24' : '0.28')}
                          className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all text-center cursor-pointer relative overflow-hidden group ${
                            isLuxury
                              ? 'bg-emerald-950/15 border-emerald-500 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/20'
                              : 'bg-zinc-900/30 border-zinc-900 text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900/50'
                          }`}
                        >
                          <Crown className={`w-5 h-5 group-hover:scale-110 transition-transform ${isLuxury ? 'text-amber-400' : 'text-amber-500/70'}`} />
                          <span className="text-sm font-bold font-sans text-zinc-200 mt-1">Luxury</span>
                          <span className="text-xs sm:text-sm font-mono font-bold mt-0.5 text-amber-400">
                            {measurementSystem === 'uk' ? '£0.30' : measurementSystem === 'metric' ? '€0.24' : '$0.28'}/{distanceUnit === 'miles' ? 'mi' : 'km'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Save profile actions */}
              <div className="pt-5 border-t border-zinc-900 flex flex-col items-center gap-3">
                {saveSuccess && (
                  <span className="text-sm sm:text-base text-emerald-400 font-bold flex items-center gap-1.5 animate-pulse">
                    <Check className="w-4 h-4" /> Vehicle rates successfully saved!
                  </span>
                )}
                
                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black text-base sm:text-lg font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg hover:shadow-emerald-950/20 active:scale-[0.98] cursor-pointer text-center flex items-center justify-center gap-2"
                  id="save-vehicle-settings-button"
                >
                  <span>{isFirstTimeUser ? 'Save & Continue to Dashboard' : 'Save Active Configurations'}</span>
                </button>
              </div>

            </form>
          </section>

          {/* QUICK EXPENSE DEFAULTS Section */}
          <section className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6" id="quick-expense-defaults-panel">
            <div className="mb-5">
              <h2 className="font-display font-bold text-xl sm:text-2xl text-zinc-100 flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-400 animate-pulse" /> QUICK EXPENSE DEFAULTS
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 mt-1 font-medium">
                Set your standard on-the-road costs. These values will instantly load when tapping expense buttons during shift logging.
              </p>
            </div>

            <form onSubmit={handleSaveExpenseDefaults} className="space-y-3">
              <div className="space-y-2">
                
                {/* Toll Rate Row */}
                <div className="bg-zinc-900/30 py-2 px-3 rounded-xl flex items-center justify-between gap-3 border border-zinc-900/60">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="p-1.5 bg-amber-950/20 border border-amber-900/30 rounded-lg text-amber-500 shrink-0">
                      <Coins className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex items-center gap-2 min-w-0 truncate">
                      <span className="text-xs sm:text-sm font-bold text-zinc-100 shrink-0">Toll Rate</span>
                      <span className="text-[11px] text-zinc-400 font-medium truncate hidden sm:inline">• Bridge or highway tolls</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 bg-zinc-950/50 px-2.5 py-1 rounded-lg border border-zinc-900 focus-within:border-emerald-500/40 transition-all shrink-0">
                    <span className="text-zinc-400 font-mono font-black text-xs select-none">{currencySymbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tollsDefault}
                      onChange={(e) => setTollsDefault(e.target.value)}
                      className="bg-transparent border-none text-emerald-400 font-mono font-black text-right text-xs sm:text-sm focus:outline-none focus:ring-0 p-0 w-14 sm:w-16"
                    />
                  </div>
                </div>

                {/* Car Wash Row */}
                <div className="bg-zinc-900/30 py-2 px-3 rounded-xl flex items-center justify-between gap-3 border border-zinc-900/60">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="p-1.5 bg-sky-950/20 border border-sky-900/30 rounded-lg text-sky-400 shrink-0">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex items-center gap-2 min-w-0 truncate">
                      <span className="text-xs sm:text-sm font-bold text-zinc-100 shrink-0">Car Wash</span>
                      <span className="text-[11px] text-zinc-400 font-medium truncate hidden sm:inline">• Routine shift wash</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 bg-zinc-950/50 px-2.5 py-1 rounded-lg border border-zinc-900 focus-within:border-emerald-500/40 transition-all shrink-0">
                    <span className="text-zinc-400 font-mono font-black text-xs select-none">{currencySymbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={carWashDefault}
                      onChange={(e) => setCarWashDefault(e.target.value)}
                      className="bg-transparent border-none text-emerald-400 font-mono font-black text-right text-xs sm:text-sm focus:outline-none focus:ring-0 p-0 w-14 sm:w-16"
                    />
                  </div>
                </div>

                {/* Standard Parking Row */}
                <div className="bg-zinc-900/30 py-2 px-3 rounded-xl flex items-center justify-between gap-3 border border-zinc-900/60">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="p-1.5 bg-emerald-950/20 border border-emerald-900/30 rounded-lg text-emerald-400 shrink-0">
                      <SquareParking className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex items-center gap-2 min-w-0 truncate">
                      <span className="text-xs sm:text-sm font-bold text-zinc-100 shrink-0">Standard Parking</span>
                      <span className="text-[11px] text-zinc-400 font-medium truncate hidden sm:inline">• Metered space/garage fee</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 bg-zinc-950/50 px-2.5 py-1 rounded-lg border border-zinc-900 focus-within:border-emerald-500/40 transition-all shrink-0">
                    <span className="text-zinc-400 font-mono font-black text-xs select-none">{currencySymbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={parkingDefault}
                      onChange={(e) => setParkingDefault(e.target.value)}
                      className="bg-transparent border-none text-emerald-400 font-mono font-black text-right text-xs sm:text-sm focus:outline-none focus:ring-0 p-0 w-14 sm:w-16"
                    />
                  </div>
                </div>

                {/* Custom Quick Buttons List */}
                {customButtons.map((btn) => (
                  <div key={btn.id} className="bg-zinc-900/30 py-2 px-3 rounded-xl flex items-center justify-between gap-3 border border-dashed border-zinc-800/60">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="p-1.5 bg-purple-950/20 border border-purple-900/30 rounded-lg text-purple-400 shrink-0">
                        <Coins className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex items-center gap-2 min-w-0 truncate">
                        <span className="text-xs sm:text-sm font-bold text-zinc-100 shrink-0">{btn.label}</span>
                        <span className="text-[11px] text-zinc-400 font-medium truncate hidden sm:inline">• Custom ({btn.category})</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 bg-zinc-950/50 px-2.5 py-1 rounded-lg border border-zinc-900 focus-within:border-emerald-500/40 transition-all">
                        <span className="text-zinc-400 font-mono font-black text-xs select-none">{currencySymbol}</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={btn.amount}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setCustomButtons(prev => prev.map(b => b.id === btn.id ? { ...b, amount: val } : b));
                          }}
                          className="bg-transparent border-none text-emerald-400 font-mono font-black text-right text-xs sm:text-sm focus:outline-none focus:ring-0 p-0 w-14 sm:w-16"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomButton(btn.id)}
                        className="text-zinc-400 hover:text-rose-400 p-1 rounded-lg hover:bg-zinc-900 transition-all cursor-pointer"
                        title="Delete custom button"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

              </div>

              {/* + Add Custom Quick Button secondary controller */}
              {!showAddCustomForm ? (
                <button
                  type="button"
                  onClick={() => setShowAddCustomForm(true)}
                  className="w-full py-3 px-4 rounded-xl border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950/40 hover:bg-zinc-900/30 text-zinc-300 hover:text-zinc-100 text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Add Custom Quick Button</span>
                </button>
              ) : (
                <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl space-y-3.5">
                  <div className="flex justify-between items-center pb-1 border-b border-zinc-800/40">
                    <span className="text-sm font-bold text-zinc-200 uppercase tracking-wider">New Custom Quick Button</span>
                    <button
                      type="button"
                      onClick={() => setShowAddCustomForm(false)}
                      className="text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-zinc-300 mb-1">Button Label</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Snack, Coffee, Wipes"
                        value={customLabel}
                        onChange={(e) => setCustomLabel(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 px-3 py-2 rounded-lg text-sm font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-zinc-300 mb-1">Default Cost</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 font-mono font-bold text-sm select-none">
                          {currencySymbol}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          placeholder="0.00"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 pl-6 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:border-emerald-500 font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-zinc-300 mb-1">Accounting Category Link</label>
                    <select
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value as any)}
                      className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 px-2.5 py-2 rounded-lg text-sm font-bold focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Other">Other Expense (Recommended)</option>
                      <option value="Tolls">Tolls Category</option>
                      <option value="Car Wash">Car Wash Category</option>
                      <option value="Parking">Parking Category</option>
                      <option value="Fines">Fines & Tickets Category</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddCustomButtonSubmit}
                    disabled={!customLabel.trim()}
                    className={`w-full py-2.5 px-4 rounded-lg text-sm font-bold transition-all text-center cursor-pointer ${
                      customLabel.trim()
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-md active:scale-[0.98]'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    }`}
                  >
                    Create Custom Quick Button
                  </button>
                </div>
              )}

              {/* Submit / Save defaults actions */}
              <div className="pt-3 border-t border-zinc-900 flex flex-col items-center gap-2">
                {expenseSaveSuccess && (
                  <span className="text-xs sm:text-sm text-emerald-400 font-bold flex items-center gap-1.5 animate-pulse">
                    <Check className="w-4 h-4" /> Quick expense defaults successfully saved!
                  </span>
                )}
                
                <button
                  type="submit"
                  className="w-full bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-zinc-800 py-3.5 px-6 rounded-xl text-sm font-bold transition-all shadow active:scale-[0.98] cursor-pointer text-center uppercase tracking-wider"
                >
                  Save Expense Defaults
                </button>
              </div>

            </form>
          </section>
        </div>

        {/* Right Section: System Maintenance / Reset Controls (1 Col) */}
        <div className="lg:col-span-1 space-y-6">
          
          <section className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-5" id="maintenance-settings-panel">
            <div>
              <h3 className="font-display font-bold text-sm sm:text-base text-zinc-200 uppercase tracking-wider">
                System Calculations
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 font-medium">
                Overview of formulas used for calculating true driving costs.
              </p>
            </div>

            {/* Helper explanation of the vehicle formula */}
            <div className="bg-zinc-900/25 border border-zinc-900 p-4 rounded-xl space-y-2 text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
              <h4 className="font-bold text-zinc-200 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-400" /> Formulas Used:
              </h4>
              <p className="font-mono text-xs sm:text-sm">
                <span className="font-mono text-xs sm:text-sm block text-amber-400 font-bold">Fuel Cost = </span>
                {distanceUnit === 'miles' 
                  ? '(Miles Driven / MPG) * Fuel Price' 
                  : '(Km Driven / 100) * L/100km * Fuel Price'
                }
              </p>
              <p className="border-t border-zinc-900 pt-2 font-mono text-xs sm:text-sm">
                <span className="font-mono text-xs sm:text-sm block text-orange-400 font-bold">Wear/Depreciation Cost = </span>
                Distance * Wear rate
              </p>
            </div>

          </section>

          {/* Historical Calibration Log */}
          <section className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4" id="calibration-history-panel">
            <div>
              <h3 className="font-display font-bold text-sm sm:text-base text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin-slow" /> Price Calibration History
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 font-medium">
                Audit trail of gas price adjustments logged over time.
              </p>
            </div>

            <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
              {!profile.fuelPriceHistory || profile.fuelPriceHistory.length === 0 ? (
                <div className="text-center py-6 text-zinc-400 text-xs sm:text-sm font-medium border border-dashed border-zinc-900 rounded-xl">
                  No price calibrations logged yet
                </div>
              ) : (
                [...profile.fuelPriceHistory].reverse().map((entry, index) => {
                  let formattedDate = entry.date;
                  try {
                    const d = new Date(entry.date);
                    formattedDate = d.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                  } catch (e) {
                    // Fail gracefully
                  }
                  return (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-2.5 bg-zinc-900/40 border border-zinc-900/50 rounded-xl text-xs sm:text-sm"
                    >
                      <div className="flex flex-col">
                        <span className="font-mono text-xs text-zinc-400 font-medium">{formattedDate}</span>
                        <span className="text-zinc-200 font-bold">Fuel price adjustment</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-400 text-sm sm:text-base">
                        {formatCurrency(entry.price, profile)}<span className="text-xs font-medium text-zinc-400">/{profile.fuelUnit === 'gallons' ? 'gal' : 'L'}</span>
                      </span>
                    </div>
                  );
                })
              )}
            </div>
            
            <p className="text-xs text-zinc-400 leading-relaxed font-medium">
              *Adjusting price in the shift log or settings automatically logs a timestamped calibration entry.
            </p>
          </section>

          {/* Data Backup & Restore Panel */}
          <section className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4" id="data-backup-restore-panel">
            <div>
              <h3 className="font-display font-bold text-sm sm:text-base text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" /> Data Backup & Restore
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 font-medium">
                Save your logs and vehicle calibrations or restore from a backup file.
              </p>
            </div>

            {importSuccess && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{importSuccess}</span>
              </div>
            )}

            {importError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Export Action */}
                <button
                  type="button"
                  onClick={exportDataCSV}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/50 py-3 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] shadow-md shadow-emerald-950/30"
                  id="export-backup-csv-button"
                >
                  <Download className="w-4 h-4 text-emerald-100" />
                  <span>Export Backup (CSV)</span>
                </button>

                {/* Import Action */}
                <div>
                  <label
                    htmlFor="backup-file-upload"
                    className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/50 hover:border-amber-500/80 py-3 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] text-center shadow-sm"
                    id="import-backup-csv-button"
                  >
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>Import Backup (CSV)</span>
                  </label>
                  <input
                    type="file"
                    id="backup-file-upload"
                    accept=".csv,.json"
                    onChange={handleFileImport}
                    className="hidden"
                  />
                </div>
              </div>
              <p className="text-[11px] text-zinc-500 font-medium leading-tight">
                Exports or restores shift logs and vehicle calibration settings as a clean CSV file.
              </p>
            </div>
          </section>
        </div>

      </div>

      {/* Destructive Reset Area */}
      <div className="pt-6 border-t border-zinc-900 flex flex-col items-center justify-center gap-3" id="destructive-reset-section">
        <div className="max-w-md w-full text-center space-y-2.5">
          <p className="text-[11px] text-zinc-500">
            Need to reset your logs? This action completely wipes all historical records from local storage.
          </p>
          <button
            type="button"
            onClick={handleClear}
            className="w-full sm:w-auto px-6 py-3 bg-rose-950/10 hover:bg-rose-950/30 text-rose-400 border border-rose-900/30 hover:border-rose-900/80 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
            id="clear-all-data-button"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Driving Records
          </button>
          {clearSuccess && (
            <p className="text-[10px] text-rose-400 font-mono animate-pulse mt-1">
              ✓ Database wiped successfully!
            </p>
          )}
        </div>
      </div>

      {/* Global Footer Placement: bottom ad slot container at the very end of this tab view */}
      <AdSlot presetIndex={3} className="mt-8" />

      {/* Confirmation Prompt Modal for Data Restore */}
      {pendingImport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100">Restore Data Backup?</h3>
                  <p className="text-xs text-zinc-400">Confirmation required before overwrite</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingImport(null)}
                className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 space-y-3 text-xs text-zinc-300">
              <p className="font-medium leading-relaxed">
                You are about to restore data from <span className="font-mono font-bold text-amber-400">{pendingImport.fileName}</span>.
              </p>
              <p className="text-rose-400 font-semibold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                Warning: This will overwrite existing shift logs and calibration settings in localStorage!
              </p>
              <div className="pt-2 border-t border-zinc-800/60 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Shift Logs to Restore:</span>
                  <span className="text-emerald-400 font-bold">{pendingImport.logCount} records</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Calibration Profile Settings:</span>
                  <span className="text-emerald-400 font-bold">{pendingImport.profile ? 'Included' : 'Keep Current'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setPendingImport(null)}
                className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRestore}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-950/20 active:scale-[0.98] cursor-pointer"
                id="confirm-restore-button"
              >
                Confirm & Overwrite
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
