import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dumbbell, Plus, LayoutList, Trophy, CheckCircle2, ChevronRight, ChevronLeft, Calendar, Trash2, Activity, TrendingUp, X } from 'lucide-react';
import { format, isToday, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, subMonths, addMonths } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line, Legend } from 'recharts';
import { cn } from '../lib/utils';
import { WorkoutEntry } from '../types';

export default function WorkoutTracker({
  workouts,
  setWorkouts
}: {
  workouts: WorkoutEntry[],
  setWorkouts: React.Dispatch<React.SetStateAction<WorkoutEntry[]>>
}) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [heatmapDate, setHeatmapDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'log' | 'analytics'>('log');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Form State
  const [exerciseName, setExerciseName] = useState('');
  const [activeSets, setActiveSets] = useState<{ weight: string, reps: string }[]>([{ weight: '', reps: '' }]);

  const dayWorkouts = useMemo(() => {
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    return workouts.filter(w => format(new Date(w.date), 'yyyy-MM-dd') === selectedDateStr);
  }, [workouts, selectedDate]);

  const volumeData = useMemo(() => {
    const limit = 14;
    const days = [...Array(limit)].map((_, i) => {
      const d = subDays(new Date(), limit - 1 - i);
      const dateStr = format(d, 'yyyy-MM-dd');

      const dailyWorkouts = workouts.filter(w => format(new Date(w.date), 'yyyy-MM-dd') === dateStr);
      let volume = 0;
      dailyWorkouts.forEach(w => {
        if (w.setsCollection) {
          w.setsCollection.forEach(s => volume += (s.weight * s.reps));
        } else {
          volume += (w.weight * w.reps * w.sets);
        }
      });
      return {
        date: format(d, 'MM/dd'),
        volume: volume,
        workouts: dailyWorkouts.length
      };
    });
    return days;
  }, [workouts]);

  const muscleData = useMemo(() => {
    const categorizeMuscle = (name: string) => {
      const n = name.toLowerCase();
      if (n.includes('rear') || n.includes('shoulder') || n.includes('delt') || n.includes('raise') || n.includes('rise') || n.includes('shurg') || n.includes('shrug') || n.includes('lateral') || n.includes('overhead') || n.includes('military')) return 'Shoulders';
      if (n.includes('curl') || n.includes('arm') || n.includes('tricep') || n.includes('bicep') || n.includes('extension') || n.includes('crusher') || n.includes('wrist')) return 'Arms';
      if (n.includes('bench') || n.includes('chest') || n.includes('push') || n.includes('fly') || n.includes('pec') || n.includes('press')) return 'Chest';
      if (n.includes('pull') || n.includes('row') || n.includes('back') || n.includes('lat') || n.includes('chin')) return 'Back';
      if (n.includes('squat') || n.includes('leg') || n.includes('calf') || n.includes('deadlift') || n.includes('ham') || n.includes('quad')) return 'Legs';
      if (n.includes('core') || n.includes('abs') || n.includes('crunch') || n.includes('plank')) return 'Core';
      return 'Other';
    };

    const map: Record<string, number> = { Chest: 0, Back: 0, Legs: 0, Arms: 0, Shoulders: 0, Core: 0, Other: 0 };
    dayWorkouts.forEach(w => {
      const m = categorizeMuscle(w.exerciseName);
      if (map[m] !== undefined) map[m] += 1;
    });

    return [
      { subject: 'Chest', A: map.Chest || 0, fullMark: Math.max(...Object.values(map)) || 1 },
      { subject: 'Back', A: map.Back || 0, fullMark: Math.max(...Object.values(map)) || 1 },
      { subject: 'Legs', A: map.Legs || 0, fullMark: Math.max(...Object.values(map)) || 1 },
      { subject: 'Arms', A: map.Arms || 0, fullMark: Math.max(...Object.values(map)) || 1 },
      { subject: 'Shoulders', A: map.Shoulders || 0, fullMark: Math.max(...Object.values(map)) || 1 },
      { subject: 'Core', A: map.Core || 0, fullMark: Math.max(...Object.values(map)) || 1 },
    ];
  }, [dayWorkouts]);

  // Compute PRs (Personal Records) based on maximum weight grouped by exercise name
  const prs = useMemo(() => {
    const records: Record<string, { maxW: number, display: string }> = {};
    workouts.forEach(w => {
      const display = w.exerciseName.trim();
      const name = display.toLowerCase();
      let maxW = w.weight || 0;
      if (w.setsCollection && w.setsCollection.length > 0) {
        maxW = Math.max(maxW, ...w.setsCollection.map(s => s.weight));
      }

      if (!records[name] || maxW > records[name].maxW) {
        records[name] = { maxW, display };
      }
    });

    return Object.entries(records)
      .map(([name, data]) => ({ name: data.display, searchName: name, weight: data.maxW }))
      .sort((a, b) => b.weight - a.weight);
  }, [workouts]);

  // Extract unique past exercise names for autocomplete/suggestions
  const pastExercises = useMemo(() => {
    const unique = new Map<string, string>();
    workouts.forEach(w => {
      const display = w.exerciseName.trim();
      const lower = display.toLowerCase();
      if (!unique.has(lower)) {
        unique.set(lower, display);
      }
    });
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b));
  }, [workouts]);

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exerciseName.trim()) return;

    // Filter out empty sets
    const parsedSetsCollection = activeSets
      .map(s => ({
        weight: parseFloat(s.weight) || 0,
        reps: parseInt(s.reps) || 0
      }))
      .filter(s => s.reps > 0);

    if (parsedSetsCollection.length === 0) return; // Prevent empty logs

    const peakWeight = Math.max(...parsedSetsCollection.map(s => s.weight));
    const totalSets = parsedSetsCollection.length;
    const peakReps = parsedSetsCollection[0].reps; // fallback

    const newLog: WorkoutEntry = {
      id: Math.random().toString(36).substr(2, 9),
      exerciseName: exerciseName.trim(),
      weight: peakWeight,
      sets: totalSets,
      reps: peakReps,
      setsCollection: parsedSetsCollection,
      date: selectedDate.toISOString(),
    };

    setWorkouts([newLog, ...workouts]);
    setNotification(`Logged: ${exerciseName}`);
    setTimeout(() => setNotification(null), 3000);

    setExerciseName('');
    setActiveSets([{ weight: '', reps: '' }]);
    setIsAddModalOpen(false);
  };

  const selectedExerciseData = useMemo(() => {
    if (!selectedExercise) return null;
    const lowerSelected = selectedExercise.trim().toLowerCase();
    const filtered = workouts.filter(w => w.exerciseName.trim().toLowerCase() === lowerSelected).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const byDate: Record<string, { weight: number, volume: number }> = {};
    filtered.forEach(w => {
      const dateStr = format(new Date(w.date), 'MMM dd');
      let wVolume = 0;
      let wMax = 0;
      if (w.setsCollection && w.setsCollection.length > 0) {
        w.setsCollection.forEach(s => {
          wVolume += (s.weight || 0) * (s.reps || 0);
          if ((s.weight || 0) > wMax) wMax = s.weight || 0;
        });
      } else {
        wVolume += (w.weight || 0) * (w.reps || 0) * (w.sets || 0);
        wMax = w.weight || 0;
      }

      if (!byDate[dateStr]) {
        byDate[dateStr] = { weight: wMax, volume: wVolume };
      } else {
        byDate[dateStr].volume += wVolume;
        if (wMax > byDate[dateStr].weight) byDate[dateStr].weight = wMax;
      }
    });

    const chartData = Object.keys(byDate).map(date => ({
      date,
      weight: byDate[date].weight,
      volume: byDate[date].volume
    }));

    const history = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { chartData, history };
  }, [selectedExercise, workouts]);

  const removeEntry = (id: string) => {
    setWorkouts(prev => prev.filter(w => w.id !== id));
  };

  const autofillExercise = (name: string) => {
    setExerciseName(name);
    const pr = prs.find(p => p.searchName === name.trim().toLowerCase());
    if (pr) {
      setActiveSets([{ weight: pr.weight.toString(), reps: '' }]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-12 relative flex flex-col">
      <div className="flex border-b border-slate-200 shrink-0 px-2 md:px-0 gap-4">
        <button
          onClick={() => setActiveTab('log')}
          className={cn("py-4 border-b-2 font-bold px-4 flex items-center gap-2 transition-colors", activeTab === 'log' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-900")}
        >
          <Dumbbell size={18} /> Daily Gym Log
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={cn("py-4 border-b-2 font-bold px-4 flex items-center gap-2 transition-colors", activeTab === 'analytics' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-900")}
        >
          <Activity size={18} /> Analytics
        </button>
      </div>

      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2 text-sm"
          >
            <CheckCircle2 size={16} /> {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {activeTab === 'log' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-0 flex-1 px-1 md:px-0">

          {/* Main Logging Area */}
          <div className="lg:col-span-2 flex flex-col gap-6 min-h-0">

            {/* Date Navigation */}
            <div className="flex items-center justify-between bg-white p-2 md:p-3 rounded-2xl border border-slate-200 shadow-sm shrink-0">
              <button onClick={() => setSelectedDate(d => subDays(d, 1))} className="p-2 md:p-3 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors">
                <ChevronLeft size={20} />
              </button>
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-indigo-500" />
                  <span className="font-bold text-slate-900 text-sm md:text-base">
                    {isToday(selectedDate) ? 'Today' : format(selectedDate, 'MMMM dd, yyyy')}
                  </span>
                </div>
                {isToday(selectedDate) && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Session</span>}
              </div>
              <button
                onClick={() => setSelectedDate(d => addDays(d, 1))}
                disabled={isToday(selectedDate)}
                className="p-2 md:p-3 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="flex items-center justify-between px-2 shrink-0">
              <h2 className="text-lg md:text-xl font-bold text-slate-900">Today's Exercises</h2>
              <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 transition-colors text-white rounded-lg font-bold text-xs whitespace-nowrap shadow-sm">
                <Plus size={14} /> Add Log
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {dayWorkouts.map((entry) => (
                <div key={entry.id} onClick={() => setSelectedExercise(entry.exerciseName)} className="p-4 md:p-5 bg-white border border-slate-200 hover:border-indigo-200 rounded-xl flex items-start justify-between shadow-sm transition-all group cursor-pointer">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Dumbbell size={20} />
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="font-bold text-slate-900 text-sm md:text-base">{entry.exerciseName}</div>

                      <div className="flex flex-col gap-1.5">
                        {entry.setsCollection && entry.setsCollection.length > 0 ? (
                          entry.setsCollection.map((s, idx) => (
                            <div key={idx} className="flex items-center gap-3 text-[11px] md:text-xs text-slate-600 font-medium">
                              <span className="w-10 text-slate-400 font-bold uppercase tracking-wider">Set {idx + 1}</span>
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-bold min-w-[50px] text-center">{s.weight} kg</span>
                              <span className="text-slate-300">×</span>
                              <span className="px-2 py-0.5 bg-slate-100 rounded-md min-w-[50px] text-center">{s.reps} reps</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-slate-500 font-medium flex items-center gap-3">
                            <span className="px-2 py-0.5 bg-slate-100 rounded-md">{entry.sets} Sets</span>
                            <span className="px-2 py-0.5 bg-slate-100 rounded-md">{entry.reps} Reps</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0 self-start">
                    {!entry.setsCollection && (
                      <div className="text-lg md:text-2xl font-black text-indigo-600">{entry.weight} <span className="text-xs text-indigo-400">kg</span></div>
                    )}
                    <button
                      onClick={() => removeEntry(entry.id)}
                      className="text-slate-300 hover:text-rose-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {dayWorkouts.length === 0 && (
                <div className="py-12 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center px-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <LayoutList className="text-slate-300" size={24} />
                  </div>
                  <h3 className="font-bold text-slate-700 mb-1">No workout logged</h3>
                  <p className="text-sm text-slate-400 max-w-sm">You haven't added any exercise to this day yet. Click the Add Log button to track a machine or weight.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: PRs / History */}
          <div className="flex flex-col gap-6 shrink-0 lg:w-[320px]">
            {dayWorkouts.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                <h3 className="font-bold text-slate-900 mb-2 text-center text-sm">Muscle Group Target</h3>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={muscleData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} />
                      <PolarRadiusAxis angle={30} tick={false} axisLine={false} />
                      <Radar name="Exercises" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.6} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                        itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                        formatter={(value: number) => [`${value} exercises`, 'Logged']}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="bg-slate-900 p-6 md:p-8 rounded-2xl text-white shadow-xl flex flex-col overflow-hidden max-h-[600px]">
              <div className="flex items-center gap-3 mb-6 shrink-0">
                <Trophy className="text-amber-400" size={24} />
                <h3 className="font-bold text-lg">Personal Records</h3>
              </div>
              <p className="text-sm text-slate-400 mb-6 shrink-0">Your maximum lifted weights per machine/exercise across all times.</p>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                {prs.map((pr, idx) => (
                  <div key={idx} onClick={() => setSelectedExercise(pr.name)} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 cursor-pointer transition-colors">
                    <div className="text-sm font-bold truncate pr-3">{pr.name}</div>
                    <div className="text-amber-400 font-black shrink-0">{pr.weight} <span className="text-[10px] text-amber-400/50">kg</span></div>
                  </div>
                ))}
                {prs.length === 0 && (
                  <div className="text-xs text-center text-slate-500 py-4 italic">No personal records established yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0 flex-1 px-1 md:px-0">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <TrendingUp size={20} className="text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Total Volume (14 Days)</h3>
                <p className="text-xs text-slate-500">Weight × Reps per day</p>
              </div>
            </div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volumeData}>
                  <defs>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dx={-10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                    formatter={(value: number) => [`${value.toLocaleString()} kg`, 'Volume']}
                  />
                  <Area type="monotone" dataKey="volume" stroke="#4f46e5" fillOpacity={1} fill="url(#colorVolume)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Activity size={20} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Workout Frequency</h3>
                <p className="text-xs text-slate-500">Number of exercises per day</p>
              </div>
            </div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dx={-10} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                    formatter={(value: number) => [`${value} exercises`, 'Count']}
                  />
                  <Bar dataKey="workouts" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col items-center">
            <div className="w-full max-w-lg">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <button onClick={() => setHeatmapDate(d => subMonths(d, 1))} className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
                    <ChevronLeft size={16} />
                  </button>
                  <div className="min-w-[120px] text-center">
                    <h3 className="font-bold text-slate-900 leading-tight">Monthly Consistency</h3>
                    <p className="text-xs text-slate-500">{format(heatmapDate, 'MMMM yyyy')}</p>
                  </div>
                  <button
                    onClick={() => setHeatmapDate(d => addMonths(d, 1))}
                    disabled={isSameMonth(heatmapDate, new Date())}
                    className="p-1.5 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Less</span>
                  <div className="flex gap-1">
                    <div className="w-3.5 h-3.5 rounded-sm bg-slate-100 border border-slate-200"></div>
                    <div className="w-3.5 h-3.5 rounded-sm bg-indigo-200"></div>
                    <div className="w-3.5 h-3.5 rounded-sm bg-indigo-400"></div>
                    <div className="w-3.5 h-3.5 rounded-sm bg-indigo-600"></div>
                  </div>
                  <span>More</span>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1.5 md:gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                  <div key={`header-${idx}`} className="text-center text-[10px] font-bold text-slate-400 mb-1">{day}</div>
                ))}

                {Array(getDay(startOfMonth(heatmapDate))).fill(null).map((_, i) => (
                  <div key={`blank-${i}`} className="aspect-square rounded-lg bg-transparent"></div>
                ))}

                {eachDayOfInterval({ start: startOfMonth(heatmapDate), end: endOfMonth(heatmapDate) }).map((d, i) => {
                  const dateStr = format(d, 'yyyy-MM-dd');
                  const workoutCount = workouts.filter(w => format(new Date(w.date), 'yyyy-MM-dd') === dateStr).length;

                  let intensity = 'bg-slate-100 border border-slate-200 text-slate-400';
                  if (workoutCount > 0) intensity = 'bg-indigo-100 border-transparent text-indigo-700';
                  if (workoutCount >= 3) intensity = 'bg-indigo-400 border-transparent text-white shadow-[0_0_10px_rgba(129,140,248,0.3)]';
                  if (workoutCount >= 6) intensity = 'bg-indigo-600 border-transparent text-white shadow-[0_0_12px_rgba(79,70,229,0.4)]';

                  const isTodayFlag = isToday(d);

                  return (
                    <div
                      key={i}
                      className={cn(
                        "aspect-square rounded-lg flex items-center justify-center relative group/heatmap cursor-pointer font-bold text-xs transition-transform hover:scale-105",
                        intensity,
                        isTodayFlag && "ring-2 ring-indigo-600 ring-offset-2"
                      )}
                    >
                      <span>{format(d, 'd')}</span>
                      <div className="absolute -top-11 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1.5 rounded opacity-0 group-hover/heatmap:opacity-100 transition-opacity z-20 whitespace-nowrap pointer-events-none shadow-xl">
                        {format(d, 'MMM dd')} • {workoutCount} exercises
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 mt-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-2 gap-4">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Exercise Directory</h3>
                <p className="text-xs text-slate-500">Click any exercise to view history and analytics</p>
              </div>
              <div className="hidden sm:flex w-10 h-10 bg-indigo-50 rounded-xl items-center justify-center text-indigo-600 shrink-0">
                <LayoutList size={20} />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {prs.map((pr, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedExercise(pr.name)}
                  className="p-4 bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md rounded-2xl flex flex-col gap-2 transition-all text-left outline-none group"
                >
                  <div className="font-bold text-slate-700 group-hover:text-indigo-600 transition-colors text-sm line-clamp-2 leading-tight">{pr.name}</div>
                  <div className="mt-auto pt-2 text-xs font-bold text-slate-400">PR: <span className="text-indigo-600 font-black">{pr.weight} kg</span></div>
                </button>
              ))}
              {prs.length === 0 && (
                <div className="col-span-full py-10 text-center text-slate-400 text-sm italic">No exercises logged yet.</div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Add Workout Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsAddModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <h3 className="text-lg font-bold">Log an Exercise</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200">
                  <Plus size={16} className="rotate-45" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1">
                <form onSubmit={handleAddLog} className="p-6 space-y-6">

                  {/* Common Exercises Suggester */}
                  {pastExercises.length > 0 && (
                    <div className="space-y-3">
                      <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Past Exercises</label>
                      <div className="flex flex-wrap gap-2">
                        {pastExercises.slice(0, 8).map(name => (
                          <button
                            key={name} type="button"
                            onClick={() => autofillExercise(name)}
                            className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors border border-transparent hover:border-indigo-200"
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Exercise / Machine Name</label>
                    <input
                      type="text"
                      required
                      value={exerciseName}
                      onChange={e => setExerciseName(e.target.value)}
                      className="w-full p-4 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none transition-all font-bold"
                      placeholder="e.g. Bench Press, Lat Pulldown"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Sets Details</label>
                    </div>
                    {activeSets.map((set, index) => (
                      <div key={index} className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <div className="w-10 text-center font-bold text-xs text-slate-400 uppercase">#{index + 1}</div>
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="number" step="0.5" min="0" required
                            value={set.weight}
                            onChange={e => {
                              const newSets = [...activeSets];
                              newSets[index].weight = e.target.value;
                              setActiveSets(newSets);
                            }}
                            className="w-full p-3 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none transition-all font-bold text-center"
                            placeholder="kg"
                          />
                          <span className="text-slate-300 font-medium">×</span>
                          <input
                            type="number" min="1" required
                            value={set.reps}
                            onChange={e => {
                              const newSets = [...activeSets];
                              newSets[index].reps = e.target.value;
                              setActiveSets(newSets);
                            }}
                            className="w-full p-3 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none transition-all font-bold text-center"
                            placeholder="reps"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (activeSets.length > 1) {
                              const newSets = activeSets.filter((_, i) => i !== index);
                              setActiveSets(newSets);
                            }
                          }}
                          disabled={activeSets.length === 1}
                          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-rose-500 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => setActiveSets([...activeSets, { weight: activeSets[activeSets.length - 1].weight, reps: activeSets[activeSets.length - 1].reps }])}
                      className="w-full py-3 border-2 border-dashed border-slate-200 hover:border-indigo-300 text-slate-500 hover:text-indigo-600 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                    >
                      <Plus size={16} /> Add Another Set
                    </button>
                  </div>

                  <button type="submit" className="w-full py-4 mt-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg transition-all text-sm">
                    Save Workout Log
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Selected Exercise Analytics Modal */}
      <AnimatePresence>
        {selectedExercise && selectedExerciseData && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setSelectedExercise(null)}
            />
            <motion.div
              initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col h-[85vh] sm:h-auto sm:max-h-[85vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 pb-2 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">{selectedExercise}</h2>
                    <p className="text-xs text-slate-500 font-medium">Exercise progression & history</p>
                  </div>
                </div>
                <button onClick={() => setSelectedExercise(null)} className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full flex items-center justify-center transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

                {selectedExerciseData.chartData.length > 1 ? (
                  <div className="space-y-8">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-sm uppercase tracking-widest text-slate-400">Max Weight Progression</h3>
                      </div>
                      <div className="h-[220px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={selectedExerciseData.chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                              itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                            />
                            <Line type="monotone" dataKey="weight" name="Max Weight (kg)" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-sm uppercase tracking-widest text-slate-400">Total Volume over time</h3>
                      </div>
                      <div className="h-[220px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={selectedExerciseData.chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                              itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                            />
                            <Bar dataKey="volume" name="Volume (kg)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-8 text-center">
                    <Activity className="mx-auto text-slate-300 mb-3" size={32} />
                    <p className="text-sm font-bold text-slate-600 mb-1">Not enough data for charts</p>
                    <p className="text-xs text-slate-400">Log this exercise on multiple days to see progression charts.</p>
                  </div>
                )}

                <div>
                  <h3 className="font-bold text-sm uppercase tracking-widest text-slate-400 mb-4 sticky top-0 bg-white pt-2 pb-2">Log History</h3>
                  <div className="space-y-3">
                    {selectedExerciseData.history.map(entry => (
                      <div key={entry.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="text-xs font-bold text-slate-400 mb-1">{format(new Date(entry.date), 'EEEE, MMM dd, yyyy')}</div>
                          <div className="flex gap-2 items-center text-sm font-bold text-slate-900">
                            {entry.setsCollection && entry.setsCollection.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {entry.setsCollection.map((s, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[11px] text-slate-600">
                                    {s.weight}kg × {s.reps}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="px-3 py-1 bg-white border border-slate-200 rounded-md">
                                {entry.weight} kg × {entry.reps} × {entry.sets} sets
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full whitespace-nowrap self-start sm:self-center">
                          Max: {entry.weight} kg
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
