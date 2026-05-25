import { Expense, Note, NutritionEntry, JobApplication, VaultItem } from './types';

export const INITIAL_EXPENSES: Expense[] = [
  { id: '1', amount: 50.50, category: 'Food', description: 'Lunch at Cafe', date: new Date().toISOString() },
  { id: '2', amount: 30.25, category: 'Transport', description: 'Uber ride', date: new Date(Date.now() - 86400000).toISOString() },
];

export const INITIAL_NOTES: Note[] = [
  { id: '1', title: 'Getting Started', content: 'Welcome to NexusHub! Your all-in-one productivity suite.', lastModified: new Date().toISOString(), type: 'note' },
];

export const INITIAL_NUTRITION: NutritionEntry[] = [
  { id: '1', name: 'Oatmeal', calories: 350, sugar: 12, protein: 10, fat: 5, carbs: 65, sodium: 5, type: 'food', date: new Date().toISOString() },
];

export const INITIAL_JOBS: JobApplication[] = [
  { id: '1', company: 'NexusHub', position: 'Software Engineer', status: 'Applied', dateApplied: new Date().toISOString(), location: 'Remote', salary: '', url: '', notes: 'Welcome!', platform: 'Company Site', source: 'Direct' },
];

export const INITIAL_VAULT_ITEMS: VaultItem[] = [
  {
    id: '1',
    title: 'Gmail Pribadi Alief',
    type: 'password',
    username: 'alief@nexushub.com',
    value: 'A1i3F_SeCuRe2026',
    url: 'https://accounts.google.com',
    notes: 'Primary Gmail used for accounts and work registration.',
    category: 'Personal',
    lastModified: '2026-05-25T05:00:00Z'
  },
  {
    id: '2',
    title: 'Pattern Lock HP Utama',
    type: 'pattern',
    value: '0,1,2,4,6,7,8',
    notes: 'Z-shape gesture slide pattern for main testing Android smartphone screen.',
    category: 'Devices',
    lastModified: '2026-05-24T12:00:00Z'
  },
  {
    id: '3',
    title: 'ATM Mandiri PIN',
    type: 'pin',
    value: '250526',
    notes: 'Mandiri Gold card PIN number',
    category: 'Finance',
    lastModified: '2026-05-25T01:30:00Z'
  },
  {
    id: '4',
    title: 'Github SSH Private Key',
    type: 'key',
    value: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC+BqELm5zD/1E...',
    notes: 'SSH secret deploy key for development VPS containers.',
    category: 'Work',
    lastModified: '2026-05-23T09:15:00Z'
  }
];

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
  parts: [
    { id: 'p1', name: 'Oli Mesin', lastServiceDate: new Date().toISOString(), lastServiceOdo: 0, intervalKm: 2500, intervalMonths: 2, status: 'Good' },
    { id: 'p2', name: 'Oli Gardan / Transmisi', lastServiceDate: new Date().toISOString(), lastServiceOdo: 0, intervalKm: 8000, intervalMonths: 8, status: 'Good' },
    { id: 'p3', name: 'Servis Karburator & Setel Klep', lastServiceDate: new Date().toISOString(), lastServiceOdo: 0, intervalKm: 4000, status: 'Good' },
    { id: 'p4', name: 'Servis & Bersihkan CVT', lastServiceDate: new Date().toISOString(), lastServiceOdo: 0, intervalKm: 8000, status: 'Good' },
    { id: 'p5', name: 'Busi', lastServiceDate: new Date().toISOString(), lastServiceOdo: 0, intervalKm: 10000, status: 'Good' },
    { id: 'p6', name: 'Kampas Rem Depan', lastServiceDate: new Date().toISOString(), lastServiceOdo: 0, intervalKm: 12500, status: 'Good' },
    { id: 'p7', name: 'Kampas Rem Belakang', lastServiceDate: new Date().toISOString(), lastServiceOdo: 0, intervalKm: 12500, status: 'Good' },
    { id: 'p8', name: 'Filter Udara', lastServiceDate: new Date().toISOString(), lastServiceOdo: 0, intervalKm: 16000, status: 'Good' },
    { id: 'p9', name: 'Oli Shock Depan', lastServiceDate: new Date().toISOString(), lastServiceOdo: 0, intervalKm: 17500, status: 'Good' },
    { id: 'p10', name: 'V-Belt & Roller', lastServiceDate: new Date().toISOString(), lastServiceOdo: 0, intervalKm: 24000, status: 'Good' },
    { id: 'p11', name: 'Air Radiator (Coolant)', lastServiceDate: new Date().toISOString(), lastServiceOdo: 0, intervalKm: 12000, status: 'Good' }
  ]
};
