import { Expense, Note, NutritionEntry, JobApplication, VaultItem } from './types';

export const INITIAL_EXPENSES: Expense[] = [];

export const INITIAL_NOTES: Note[] = [];

export const INITIAL_NUTRITION: NutritionEntry[] = [];

export const INITIAL_JOBS: JobApplication[] = [];

export const INITIAL_VAULT_ITEMS: VaultItem[] = [];

export const INITIAL_BODY_PROFILE = {
  gender: 'male' as 'male' | 'female',
  height: '',
  weight: '',
  neck: '',
  waist: '',
  hip: ''
};

import { VehicleState } from './types';

export const INITIAL_VEHICLE_STATE: VehicleState = {
  currentOdo: 0,
  logs: [],
  parts: []
};
