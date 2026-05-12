import { supabase } from './supabase';
import { Expense, Note, NutritionEntry, JobApplication, FoodLibraryItem, WorkoutEntry, VehicleState, BodyProfile, VehicleLog, VehiclePart } from '../types';

export const fetchFromSupabase = async () => {
  if (!supabase) {
    console.error("Supabase client is not initialized.");
    return null;
  }

  const results = await Promise.all([
    supabase.from('expenses').select('*'),
    supabase.from('notes').select('*'),
    supabase.from('nutrition').select('*'),
    supabase.from('jobs').select('*'),
    supabase.from('custom_food_catalog').select('*'),
    supabase.from('workouts').select('*'),
    supabase.from('vehicle_logs').select('*'),
    supabase.from('vehicle_parts').select('*'),
    supabase.from('vehicle_state').select('*').limit(1).maybeSingle(),
    supabase.from('body_profile').select('*').limit(1).maybeSingle(),
  ]);

  const errors = results.filter(r => r.error).map(r => r.error);
  if (errors.length > 0) {
    if (errors[0]?.message !== 'Not configured') {
      console.error("Errors fetching from Supabase:", errors.map(e => e?.message || e));
    }
    // If there's an error (e.g. permission denied), return null so the app doesn't overwrite data with empty arrays
    return null;
  }

  const [
    { data: expenses },
    { data: notes },
    { data: nutrition },
    { data: jobs },
    { data: customFoodCatalog },
    { data: workouts },
    { data: vehicleLogs },
    { data: vehicleParts },
    { data: vehicleState },
    { data: bodyProfile }
  ] = results;

  return {
    expenses: (expenses || []).map(row => ({
      id: row.id, amount: row.amount, category: row.category, description: row.description, date: row.date, type: row.type || 'expense'
    })),
    notes: (notes || []).map(row => ({
      id: row.id, title: row.title, content: row.content, lastModified: row.last_modified, type: row.type, attachments: row.attachments || []
    })),
    nutrition: (nutrition || []).map(row => ({
      id: row.id, name: row.name, calories: row.calories, sugar: row.sugar, protein: row.protein, fat: row.fat, carbs: row.carbs, sodium: row.sodium, type: row.type, date: row.date
    })),
    jobs: (jobs || []).map(row => ({
      id: row.id, company: row.company, position: row.position, status: row.status, dateApplied: row.date_applied, location: row.location, salary: row.salary || '', url: row.url || '', notes: row.notes || '', platform: row.platform || '', source: row.source || ''
    })),
    customFoodCatalog: (customFoodCatalog || []).map(row => ({
      name: row.name, calories: row.calories, sugar: row.sugar, protein: row.protein, fat: row.fat, carbs: row.carbs, sodium: row.sodium, type: row.type
    })),
    workouts: (workouts || []).map(row => ({
      id: row.id, exerciseName: row.exercise_name, weight: row.weight, sets: row.sets, reps: row.reps, setsCollection: row.sets_collection || [], date: row.date
    })),
    vehicle: {
      currentOdo: vehicleState?.current_odo || 0,
      logs: (vehicleLogs || []).map(row => ({
        id: row.id, date: row.date, distanceAdded: row.distance_added, title: row.title || '', note: row.note || '', cost: row.cost || 0, type: row.type
      })),
      parts: (vehicleParts || []).map(row => ({
        id: row.id, name: row.name, lastServiceDate: row.last_service_date, lastServiceOdo: row.last_service_odo, intervalKm: row.interval_km, intervalMonths: row.interval_months, status: row.status
      }))
    },
    bodyProfile: bodyProfile ? {
      weight: bodyProfile.weight, height: bodyProfile.height, age: bodyProfile.age, gender: bodyProfile.gender, neck: bodyProfile.neck, waist: bodyProfile.waist, hip: bodyProfile.hip
    } : null
  };
};

export const syncToSupabase = async (data: any) => {
  if (!data) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const userId = user.id;

  const handleSync = async (table: string, stateArray: any[], mapFn: (item: any) => any, idField = 'id') => {
    if (!stateArray) return;
    const { data: existing } = await supabase.from(table).select(idField);
    const existingIds = (existing || []).map(r => r[idField]);
    const newStateIds = stateArray.map(r => r[idField]);
    const toDelete = existingIds.filter(id => !newStateIds.includes(id));

    if (toDelete.length > 0) {
      await supabase.from(table).delete().in(idField, toDelete);
    }
    if (stateArray.length > 0) {
      await supabase.from(table).upsert(stateArray.map(item => ({ ...mapFn(item), user_id: userId })));
    }
  };

  try {
    await Promise.all([
      handleSync('expenses', data.expenses, (e: Expense) => ({ id: e.id, amount: e.amount, category: e.category, description: e.description, date: e.date, type: e.type })),
      handleSync('notes', data.notes, (n: Note) => ({ id: n.id, title: n.title, content: n.content, last_modified: n.lastModified, type: n.type, attachments: n.attachments })),
      handleSync('nutrition', data.nutrition, (n: NutritionEntry) => ({ id: n.id, name: n.name, calories: n.calories, sugar: n.sugar, protein: n.protein, fat: n.fat, carbs: n.carbs, sodium: n.sodium, type: n.type, date: n.date })),
      handleSync('jobs', data.jobs, (j: JobApplication) => ({ id: j.id, company: j.company, position: j.position, status: j.status, date_applied: j.dateApplied, location: j.location, salary: j.salary, url: j.url, notes: j.notes, platform: j.platform, source: j.source })),
      handleSync('custom_food_catalog', data.customFoodCatalog, (c: FoodLibraryItem) => ({ name: c.name, calories: c.calories, sugar: c.sugar, protein: c.protein, fat: c.fat, carbs: c.carbs, sodium: c.sodium, type: c.type }), 'name'),
      handleSync('workouts', data.workouts, (w: WorkoutEntry) => ({ id: w.id, exercise_name: w.exerciseName, weight: w.weight, sets: w.sets, reps: w.reps, sets_collection: w.setsCollection, date: w.date })),
      handleSync('vehicle_logs', data.vehicle?.logs, (l: VehicleLog) => ({ id: l.id, date: l.date, distance_added: l.distanceAdded, title: l.title, note: l.note, cost: l.cost, type: l.type })),
      handleSync('vehicle_parts', data.vehicle?.parts, (p: VehiclePart) => ({ id: p.id, name: p.name, last_service_date: p.lastServiceDate, last_service_odo: p.lastServiceOdo, interval_km: p.intervalKm, interval_months: p.intervalMonths, status: p.status }))
    ]);

    if (data.vehicle) {
      await supabase.from('vehicle_state').upsert({ id: 1, current_odo: data.vehicle.currentOdo, user_id: userId });
    }
    if (data.bodyProfile) {
      await supabase.from('body_profile').upsert({ id: 1, weight: data.bodyProfile.weight, height: data.bodyProfile.height, age: data.bodyProfile.age, gender: data.bodyProfile.gender, neck: data.bodyProfile.neck, waist: data.bodyProfile.waist, hip: data.bodyProfile.hip, user_id: userId });
    }
  } catch (err) {
    console.error('Failed to sync data to Supabase:', err);
  }
};
