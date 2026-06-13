export type ExpenseCategory = 'Food' | 'Transport' | 'Entertainment' | 'Healthcare' | 'Utilities' | 'Shopping' | 'Salary' | 'Bonus' | 'Investment' | 'Other';

export interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  date: string;
  type?: 'expense' | 'income';
}

export interface Note {
  id: string;
  title: string;
  content: string;
  lastModified: string;
  type: 'note' | 'document';
  attachments?: {
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
}

export interface NutritionEntry {
  id: string;
  name: string;
  calories: number;
  sugar: number;
  protein: number;
  fat: number;
  carbs: number;
  sodium: number; // mg
  type: 'food' | 'drink';
  date: string;
}

export interface BodyProfile {
  weight: number; // kg
  height: number; // cm
  age: number;
  gender: 'male' | 'female';
  neck: number; // cm
  waist: number; // cm
  hip?: number; // cm (required for females)
}

export type ApplicationStatus = 'Wishlist' | 'Applied' | 'Screening' | 'Interviewing' | 'Technical' | 'Offer' | 'Rejected' | 'Withdrawn';

export interface JobApplication {
  id: string;
  company: string;
  position: string;
  status: ApplicationStatus;
  dateApplied: string;
  closingDate?: string;
  location: string;
  salary?: string;
  url?: string;
  notes?: string;
  platform?: string;
  source?: string;
}

export interface FoodLibraryItem {
  name: string;
  calories: number;
  sugar: number;
  protein: number;
  fat: number;
  carbs: number;
  sodium: number;
  type: 'food' | 'drink';
}

export interface WorkoutSet {
  weight: number;
  reps: number;
}

export interface WorkoutEntry {
  id: string;
  exerciseName: string;
  weight: number; // in kg
  sets: number;
  reps: number;
  setsCollection?: WorkoutSet[];
  date: string;
}

export interface VehicleLog {
  id: string;
  date: string;
  distanceAdded: number; // in km
  title?: string;
  note?: string;
  cost?: number;
  type: 'Distance' | 'Maintenance';
}

export interface VehiclePart {
  id: string;
  name: string;
  lastServiceDate: string;
  lastServiceOdo: number;
  intervalKm: number;
  intervalMonths?: number;
  status: 'Good' | 'Warning' | 'Overdue';
}

export interface VehicleState {
  currentOdo: number;
  logs: VehicleLog[];
  parts: VehiclePart[];
}

export type VaultItemType = 'password' | 'pattern' | 'pin' | 'key';

export interface VaultItem {
  id: string;
  title: string;
  type: VaultItemType;
  username?: string;
  value: string; // contains password, PIN, key string, or pattern path like "0,1,2,5,8" (coordinates)
  url?: string;
  notes?: string;
  category?: string;
  lastModified: string;
}


