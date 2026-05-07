import { Expense, Note, NutritionEntry, JobApplication } from './types';

export const INITIAL_EXPENSES: Expense[] = [
  { id: '1', amount: 50.50, category: 'Food', description: 'Lunch at Cafe', date: new Date().toISOString() },
  { id: '2', amount: 120.00, category: 'Shopping', description: 'New Shoes', date: new Date(Date.now() - 86400000).toISOString() },
  { id: '3', amount: 30.25, category: 'Transport', description: 'Uber ride', date: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: '4', amount: 200.00, category: 'Utilities', description: 'Electricity Bill', date: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: '5', amount: 45.00, category: 'Entertainment', description: 'Movie Night', date: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: '6', amount: 85.20, category: 'Food', description: 'Weekly Groceries', date: new Date(Date.now() - 6 * 86400000).toISOString() },
  { id: '7', amount: 15.00, category: 'Transport', description: 'Train fare', date: new Date(Date.now() - 8 * 86400000).toISOString() },
  { id: '8', amount: 300.00, category: 'Shopping', description: 'Home Office chair', date: new Date(Date.now() - 10 * 86400000).toISOString() },
  { id: '9', amount: 65.40, category: 'Healthcare', description: 'Pharmacy', date: new Date(Date.now() - 12 * 86400000).toISOString() },
  { id: '10', amount: 12.50, category: 'Food', description: 'Quick Coffee', date: new Date(Date.now() - 15 * 86400000).toISOString() },
  { id: '11', amount: 55.00, category: 'Entertainment', description: 'Concert ticket', date: new Date(Date.now() - 18 * 86400000).toISOString() },
  { id: '12', amount: 90.00, category: 'Utilities', description: 'Water Bill', date: new Date(Date.now() - 20 * 86400000).toISOString() },
  { id: '13', amount: 42.10, category: 'Transport', description: 'Fuel Refill', date: new Date(Date.now() - 22 * 86400000).toISOString() },
  { id: '14', amount: 180.00, category: 'Shopping', description: 'Kitchen Appliances', date: new Date(Date.now() - 25 * 86400000).toISOString() },
  { id: '15', amount: 22.00, category: 'Food', description: 'Dinner Takeout', date: new Date(Date.now() - 28 * 86400000).toISOString() },
  { id: '16', amount: 75.00, category: 'Other', description: 'Miscellaneous', date: new Date(Date.now() - 31 * 86400000).toISOString() },
  { id: '17', amount: 33.00, category: 'Healthcare', description: 'Doctor Checkup', date: new Date(Date.now() - 35 * 86400000).toISOString() },
  { id: '18', amount: 120.00, category: 'Other', description: 'Charity Donation', date: new Date(Date.now() - 40 * 86400000).toISOString() },
];

export const INITIAL_NOTES: Note[] = [
  { id: '1', title: 'Shopping List', content: 'Milk, Eggs, Bread, Cheese', lastModified: new Date().toISOString(), type: 'note' },
  { id: '2', title: 'Project Specs', content: 'React, Tailwind, Recharts...', lastModified: new Date(Date.now() - 86400000).toISOString(), type: 'document' },
  { id: '3', title: 'Meeting Notes', content: 'Discussion about dashboard layout.', lastModified: new Date(Date.now() - 2 * 86400000).toISOString(), type: 'note' },
];

export const INITIAL_NUTRITION: NutritionEntry[] = [
  { id: '1', name: 'Oatmeal with Blueberries', calories: 350, sugar: 12, protein: 10, fat: 5, carbs: 65, sodium: 5, type: 'food', date: new Date().toISOString() },
  { id: '2', name: 'Black Coffee', calories: 5, sugar: 0, protein: 0, fat: 0, carbs: 0, sodium: 2, type: 'drink', date: new Date().toISOString() },
  { id: '3', name: 'Chicken Salad', calories: 450, sugar: 4, protein: 35, fat: 12, carbs: 10, sodium: 450, type: 'food', date: new Date(Date.now() - 86400000).toISOString() },
  { id: '4', name: 'Orange Juice', calories: 120, sugar: 24, protein: 2, fat: 0, carbs: 28, sodium: 1, type: 'drink', date: new Date(Date.now() - 86400000).toISOString() },
  { id: '5', name: 'Greek Yogurt', calories: 150, sugar: 6, protein: 15, fat: 2, carbs: 8, sodium: 60, type: 'food', date: new Date(Date.now() - 2 * 86400000).toISOString() },
];

export const INITIAL_JOBS: JobApplication[] = [
  { id: '1', company: 'Google', position: 'Frontend Developer', status: 'Interviewing', dateApplied: new Date(Date.now() - 5 * 86400000).toISOString(), location: 'Remote', salary: '$120k', url: 'https://careers.google.com', notes: 'First round done. Waiting for technical.', platform: 'Company Site', source: 'LinkedIn' },
  { id: '2', company: 'TechNova', position: 'React Engineer', status: 'Applied', dateApplied: new Date(Date.now() - 2 * 86400000).toISOString(), location: 'Hybrid', salary: '$110k', url: 'https://technova.io', notes: 'Referral from Sarah.', platform: 'Email', source: 'Referral' },
  { id: '3', company: 'StartupX', position: 'Fullstack Dev', status: 'Rejected', dateApplied: new Date(Date.now() - 15 * 86400000).toISOString(), location: 'On-site', salary: '$90k', notes: 'Ghosted after screening.', platform: 'Indeed', source: 'Job Board' },
  { id: '4', company: 'Meta', position: 'Product Engineer', status: 'Screening', dateApplied: new Date(Date.now() - 1 * 86400000).toISOString(), location: 'Remote', salary: '$150k', platform: 'LinkedIn', source: 'Social Media' },
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
