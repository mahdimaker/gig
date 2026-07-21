/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VehicleProfile, ShiftLog, ExpenseItem } from './types';

/**
 * Calculates fuel cost based on distance unit and vehicle fuel economy profile
 */
export function calculateFuelCost(distance: number, profile: VehicleProfile): number {
  const { fuelConsumption, fuelPrice, fuelUnit, distanceUnit, measurementSystem } = profile;
  
  if (fuelConsumption <= 0 || fuelPrice <= 0 || distance <= 0) {
    return 0;
  }

  // Case 3: UK Hybrid System (Miles, Litres, UK MPG)
  if (measurementSystem === 'uk' || (distanceUnit === 'miles' && fuelUnit === 'liters')) {
    // UK MPG, fuel price per Litre, distance in miles
    return (distance / fuelConsumption) * 4.54609 * fuelPrice;
  }

  // Case 1: Standard Imperial US (Miles, Gallons, MPG)
  if (distanceUnit === 'miles' && fuelUnit === 'gallons') {
    // economy is in MPG
    return (distance / fuelConsumption) * fuelPrice;
  }

  // Case 2: Metric (Kilometers, Liters, L/100km)
  if (distanceUnit === 'km' && fuelUnit === 'liters') {
    // economy is in L/100km
    return (distance / 100) * fuelConsumption * fuelPrice;
  }

  // Cross configurations (e.g. Miles + Liters or Km + Gallons)
  // Let's normalize everything to Miles and Gallons internally for a quick fallback calculation
  let normalizedDistanceInMiles = distance;
  if (distanceUnit === 'km') {
    normalizedDistanceInMiles = distance * 0.621371;
  }

  let normalizedEconomyInMpg = fuelConsumption;
  if (fuelUnit === 'liters') {
    // L/100km to MPG: MPG = 235.215 / (L/100km)
    normalizedEconomyInMpg = fuelConsumption > 0 ? 235.215 / fuelConsumption : 25;
  }

  let normalizedPricePerGallon = fuelPrice;
  if (fuelUnit === 'liters') {
    // price per liter to price per gallon: 1 gallon = 3.78541 liters
    normalizedPricePerGallon = fuelPrice * 3.78541;
  }

  return (normalizedDistanceInMiles / normalizedEconomyInMpg) * normalizedPricePerGallon;
}

/**
 * Calculates depreciation cost based on distance and depreciation rate
 */
export function calculateDepreciationCost(distance: number, profile: VehicleProfile): number {
  return distance * profile.depreciationRate;
}

/**
 * Computes all costs and returns full breakdown
 */
export function computeShiftMetrics(
  grossRevenue: number,
  hoursOnline: number,
  distance: number,
  expenses: ExpenseItem[],
  profile: VehicleProfile
) {
  const fuelCost = calculateFuelCost(distance, profile);
  const depreciationCost = calculateDepreciationCost(distance, profile);
  const loggedExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  
  const totalCost = fuelCost + depreciationCost + loggedExpenses;
  const netProfit = grossRevenue - totalCost;
  const hourlyWage = hoursOnline > 0 ? netProfit / hoursOnline : 0;

  return {
    fuelCost,
    depreciationCost,
    loggedExpenses,
    totalCost,
    netProfit,
    hourlyWage,
  };
}

/**
 * Formats value as currency
 */
export function formatCurrency(value: number, profile?: VehicleProfile): string {
  const system = profile?.measurementSystem || 'us';
  let currency = 'USD';
  let locale = 'en-US';

  if (system === 'uk') {
    currency = 'GBP';
    locale = 'en-GB';
  } else if (system === 'metric') {
    currency = 'EUR';
    locale = 'en-IE'; // English locale with Euro currency format (e.g. €1,234.56)
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Generates initial seed data for drivers to play with
 */
export const getInitialVehicleProfile = (): VehicleProfile => ({
  make: 'Toyota',
  model: 'Prius',
  year: 2021,
  fuelConsumption: 52, // 52 MPG
  fuelPrice: 3.85, // $3.85 per gallon
  depreciationRate: 0.15, // $0.15 per mile (wear, tires, oil, depreciation)
  distanceUnit: 'miles',
  fuelUnit: 'gallons',
  measurementSystem: 'us',
  fuelPriceHistory: [],
  expenseDefaults: {
    tolls: 5.00,
    carWash: 14.00,
    parking: 4.00,
  },
  customQuickButtons: []
});

export const getSampleShiftLogs = (profile: VehicleProfile): ShiftLog[] => {
  // Generates 5 realistic shift logs for last week
  const logs: Omit<ShiftLog, 'fuelCost' | 'depreciationCost' | 'loggedExpenses' | 'netProfit' | 'hourlyWage'>[] = [
    {
      id: 'log-1',
      date: '2026-07-11',
      platform: 'Uber',
      grossRevenue: 284.50,
      hoursOnline: 8.5,
      distance: 142.0,
      expensesList: [
        { id: 'exp-1-1', category: 'Tolls', amount: 8.50, timestamp: '2026-07-11T14:30:00Z' },
        { id: 'exp-1-2', category: 'Car Wash', amount: 12.00, timestamp: '2026-07-11T10:00:00Z' },
      ],
      notes: 'Busy Saturday afternoon shift. High demand around the airport.',
    },
    {
      id: 'log-2',
      date: '2026-07-12',
      platform: 'DoorDash',
      grossRevenue: 145.20,
      hoursOnline: 5.0,
      distance: 68.0,
      expensesList: [
        { id: 'exp-2-1', category: 'Other', amount: 4.50, timestamp: '2026-07-12T18:15:00Z', notes: 'Insulated bag' },
      ],
      notes: 'Sunday dinner rush. Delivery distances were short and tips were good.',
    },
    {
      id: 'log-3',
      date: '2026-07-14',
      platform: 'Lyft',
      grossRevenue: 198.00,
      hoursOnline: 6.5,
      distance: 110.0,
      expensesList: [
        { id: 'exp-3-1', category: 'Tolls', amount: 4.00, timestamp: '2026-07-14T11:20:00Z' },
      ],
      notes: 'Morning commuter flow. Some slow traffic on the highway.',
    },
    {
      id: 'log-4',
      date: '2026-07-15',
      platform: 'UberEats',
      grossRevenue: 98.40,
      hoursOnline: 3.5,
      distance: 42.0,
      expensesList: [],
      notes: 'Quick Wednesday lunch run.',
    },
    {
      id: 'log-5',
      date: '2026-07-16',
      platform: 'Instacart',
      grossRevenue: 220.00,
      hoursOnline: 7.0,
      distance: 55.0,
      expensesList: [
        { id: 'exp-5-1', category: 'Parking', amount: 6.00, timestamp: '2026-07-16T13:40:00Z' },
      ],
      notes: 'Large grocery orders. Less mileage, more walking and heavy lifting.',
    },
  ];

  return logs.map(log => {
    const metrics = computeShiftMetrics(
      log.grossRevenue,
      log.hoursOnline,
      log.distance,
      log.expensesList,
      profile
    );

    return {
      ...log,
      fuelCost: metrics.fuelCost,
      depreciationCost: metrics.depreciationCost,
      loggedExpenses: metrics.loggedExpenses,
      netProfit: metrics.netProfit,
      hourlyWage: metrics.hourlyWage,
    };
  });
};
