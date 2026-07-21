/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DistanceUnit = 'miles' | 'km';
export type FuelUnit = 'gallons' | 'liters';

export interface FuelPriceHistoryEntry {
  date: string;
  price: number;
}

export interface CustomQuickButton {
  id: string;
  label: string;
  amount: number;
  category: 'Tolls' | 'Car Wash' | 'Parking' | 'Fines' | 'Other';
}

export interface VehicleProfile {
  make: string;
  model: string;
  year: number;
  fuelConsumption: number; // in MPG or L/100km
  fuelPrice: number; // price per Gallon or Liter
  depreciationRate: number; // cost per mile or km
  distanceUnit: DistanceUnit;
  fuelUnit: FuelUnit;
  fuelPriceHistory?: FuelPriceHistoryEntry[];
  measurementSystem?: 'us' | 'metric' | 'uk';
  expenseDefaults?: {
    tolls: number;
    carWash: number;
    parking: number;
  };
  customQuickButtons?: CustomQuickButton[];
}

export interface ExpenseItem {
  id: string;
  category: 'Tolls' | 'Car Wash' | 'Parking' | 'Fines' | 'Other';
  amount: number;
  timestamp: string;
  notes?: string;
}

export interface ShiftLog {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  platform: 'Uber' | 'Lyft' | 'DoorDash' | 'Instacart' | 'UberEats' | 'AmazonFlex' | 'Other';
  grossRevenue: number;
  hoursOnline: number;
  distance: number;
  fuelCost: number; // calculated at the time of log
  depreciationCost: number; // calculated at the time of log
  loggedExpenses: number; // sum of expensesList
  expensesList: ExpenseItem[];
  netProfit: number;
  hourlyWage: number; // Real Net Hourly Wage
  notes?: string;
}

export const PLATFORMS = [
  { id: 'Uber', label: 'Uber Rideshare', color: '#111111', textColor: '#FFFFFF' },
  { id: 'Lyft', label: 'Lyft', color: '#FF007F', textColor: '#FFFFFF' },
  { id: 'DoorDash', label: 'DoorDash', color: '#FF3008', textColor: '#FFFFFF' },
  { id: 'UberEats', label: 'Uber Eats', color: '#06C167', textColor: '#FFFFFF' },
  { id: 'Instacart', label: 'Instacart', color: '#43B02A', textColor: '#FFFFFF' },
  { id: 'AmazonFlex', label: 'Amazon Flex', color: '#FF9900', textColor: '#111111' },
  { id: 'Other', label: 'Other Gig / Multi', color: '#4B5563', textColor: '#FFFFFF' },
] as const;

export const EXPENSE_CATEGORIES = [
  { id: 'Tolls', label: 'Tolls', icon: 'Coins' },
  { id: 'Car Wash', label: 'Car Wash', icon: 'Sparkles' },
  { id: 'Parking', label: 'Parking', icon: 'SquarePark' },
  { id: 'Fines', label: 'Fines / Tickets', icon: 'ShieldAlert' },
  { id: 'Other', label: 'Other Expense', icon: 'DollarSign' },
] as const;
