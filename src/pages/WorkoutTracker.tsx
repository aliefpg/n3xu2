import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dumbbell, Plus, LayoutList, Trophy, CheckCircle2, ChevronRight, ChevronLeft, Calendar, Trash2, Activity, TrendingUp, X, Flame, Sparkles, Award } from 'lucide-react';
import { format, isToday, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, subMonths, addMonths } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line, Legend } from 'recharts';
import { cn } from '../lib/utils';
import { WorkoutEntry } from '../types';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

const prContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
    }
  }
};

const prItemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      type: "spring", 
      stiffness: 120, 
      damping: 14 
    } 
  }
};

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
  const [workoutToDelete, setWorkoutToDelete] = useState<WorkoutEntry | null>(null);
  
  // Custom states for Personal Records and Streak
  const [activePrSlideIdx, setActivePrSlideIdx] = useState(0);
  const [prCelebration, setPrCelebration] = useState<{
    exerciseName: string;
    oldWeight: number;
    newWeight: number;
    isFirstRecord: boolean;
  } | null>(null);

  // Form State
  const [exerciseName, setExerciseName] = useState('');
  const [activeSets, setActiveSets] = useState<{weight: string, reps: string}[]>([{weight: '', reps: ''}]);

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

  // Indonesian date formatter for PR records and status
  const formatIndonesianDate = (date: Date) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Compute active continuous streak of consecutive workout days
  const currentStreak = useMemo(() => {
    if (workouts.length === 0) return 5;

    const uniqueDates = Array.from(new Set(
      workouts.map(w => format(new Date(w.date), 'yyyy-MM-dd'))
    )).sort((a, b) => b.localeCompare(a));

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    if (!uniqueDates.includes(todayStr) && !uniqueDates.includes(yesterdayStr)) {
      return 0;
    }

    let streak = 0;
    let currentDate = uniqueDates.includes(todayStr) ? new Date() : subDays(new Date(), 1);

    while (true) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      if (uniqueDates.includes(dateStr)) {
        streak++;
        currentDate = subDays(currentDate, 1);
      } else {
        break;
      }
    }

    return streak;
  }, [workouts]);

  // Weekly workout status tracker showing general Sun to Sat or Mon to Sun calendar days
  const currentWeekStatus = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const startOfWeek = addDays(today, mondayOffset);

    const dayAbbreviations = ['S', 'S', 'R', 'K', 'J', 'S', 'M']; // Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu
    
    return [...Array(7)].map((_, i) => {
      const date = addDays(startOfWeek, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const hasWorkout = workouts.some(w => format(new Date(w.date), 'yyyy-MM-dd') === dateStr);

      return {
        label: dayAbbreviations[i],
        isToday: isToday(date),
        hasWorkout,
        date
      };
    });
  }, [workouts]);

  // Track each personal record milestone event chronologically to calculate the latest breakthrough
  const prEvents = useMemo(() => {
    const grouped: Record<string, typeof workouts> = {};
    workouts.forEach(w => {
      const key = w.exerciseName.trim().toLowerCase();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(w);
    });

    const events: Array<{
      id: string;
      exerciseName: string;
      weight: number;
      reps: number;
      sets: number;
      date: Date;
      oldWeight: number;
      oldDate: Date | null;
      diff: number;
    }> = [];

    Object.entries(grouped).forEach(([key, list]) => {
      const sorted = [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      let maxWeightSoFar = 0;
      let lastPrDate: Date | null = null;

      sorted.forEach(w => {
        let peakWeight = w.weight || 0;
        let repsAtPeak = w.reps || 0;
        let totalSets = w.sets || 1;
        if (w.setsCollection && w.setsCollection.length > 0) {
          totalSets = w.setsCollection.length;
          peakWeight = Math.max(...w.setsCollection.map(s => s.weight || 0));
          const setWithPeak = w.setsCollection.find(s => (s.weight || 0) === peakWeight);
          if (setWithPeak) {
            repsAtPeak = setWithPeak.reps || 0;
          }
        }

        if (peakWeight > maxWeightSoFar) {
          events.push({
            id: w.id,
            exerciseName: w.exerciseName,
            weight: peakWeight,
            reps: repsAtPeak,
            sets: totalSets,
            date: new Date(w.date),
            oldWeight: maxWeightSoFar,
            oldDate: lastPrDate,
            diff: maxWeightSoFar > 0 ? (peakWeight - maxWeightSoFar) : 0
          });
          maxWeightSoFar = peakWeight;
          lastPrDate = new Date(w.date);
        }
      });
    });

    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [workouts]);

  // Group all personal record achievements into a visual sliding showcase list
  const prSlides = useMemo(() => {
    if (prEvents.length > 0) {
      return prEvents.map(ev => ({
        id: ev.id,
        exerciseName: ev.exerciseName,
        weight: ev.weight,
        reps: ev.reps,
        sets: ev.sets,
        dateText: formatIndonesianDate(ev.date),
        isFirstRecord: ev.oldWeight === 0,
        oldWeight: ev.oldWeight,
        diff: ev.diff,
        oldDateText: ev.oldDate ? formatIndonesianDate(ev.oldDate).split(',')[1]?.trim() : null,
        isDemo: false,
        isToday: isToday(ev.date)
      }));
    } else {
      return [];
    }
  }, [prEvents]);

  // Compute records specifically for quick references
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

  // Group all personal records matching photo highlights with ribbon medals
  const allPrList = useMemo(() => {
    const grouped: Record<string, typeof workouts> = {};
    workouts.forEach(w => {
      const key = w.exerciseName.trim().toLowerCase();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(w);
    });

    const list = Object.entries(grouped).map(([key, logs]) => {
      const sorted = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      const firstEntry = sorted[0];
      let initialWeight = firstEntry.weight || 0;
      if (firstEntry.setsCollection && firstEntry.setsCollection.length > 0) {
        initialWeight = firstEntry.setsCollection[0].weight || 0;
      }

      let peakWeight = 0;
      let peakDate = new Date();
      sorted.forEach(w => {
        let maxOfLog = w.weight || 0;
        if (w.setsCollection && w.setsCollection.length > 0) {
          maxOfLog = Math.max(...w.setsCollection.map(s => s.weight || 0));
        }
        if (maxOfLog > peakWeight) {
          peakWeight = maxOfLog;
          peakDate = new Date(w.date);
        }
      });

      const diff = peakWeight - initialWeight;

      return {
        name: firstEntry.exerciseName,
        searchName: key,
        weight: peakWeight,
        date: peakDate,
        dateText: formatIndonesianDate(peakDate),
        diff: diff,
        isToday: isToday(peakDate),
        isDemo: false
      };
    }).sort((a, b) => b.weight - a.weight);

    return list;
  }, [workouts]);

  // Slide carousel controls
  useEffect(() => {
    if (activePrSlideIdx >= prSlides.length) {
      setActivePrSlideIdx(0);
    }
  }, [prSlides, activePrSlideIdx]);

  useEffect(() => {
    if (prSlides.length <= 1) return;
    const interval = setInterval(() => {
      setActivePrSlideIdx(prev => (prev + 1) % prSlides.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [prSlides.length]);

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
    const peakReps = parsedSetsCollection[0].reps;

    const newLog: WorkoutEntry = {
      id: Math.random().toString(36).substr(2, 9),
      exerciseName: exerciseName.trim(),
      weight: peakWeight,
      sets: totalSets,
      reps: peakReps,
      setsCollection: parsedSetsCollection,
      date: selectedDate.toISOString(),
    };

    // Store context metrics about previous PRs BEFORE modifying workouts
    const lowerName = exerciseName.trim().toLowerCase();
    const existingPr = prs.find(p => p.searchName === lowerName);
    const hasPreviousRecord = !!existingPr;
    const previousWeight = existingPr ? existingPr.weight : 0;

    // Insert new workout log
    setWorkouts([newLog, ...workouts]);

    // Check if we hit a breakthrough PR (exceeded previous PR or established a first one > 0)
    if (!hasPreviousRecord && peakWeight > 0) {
      setPrCelebration({
        exerciseName: exerciseName.trim(),
        oldWeight: 0,
        newWeight: peakWeight,
        isFirstRecord: true
      });
    } else if (hasPreviousRecord && peakWeight > previousWeight) {
      setPrCelebration({
        exerciseName: exerciseName.trim(),
        oldWeight: previousWeight,
        newWeight: peakWeight,
        isFirstRecord: false
      });
    } else {
      setNotification(`Logged: ${exerciseName}`);
      setTimeout(() => setNotification(null), 3000);
    }

    setExerciseName('');
    setActiveSets([{weight: '', reps: ''}]);
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
    setWorkoutToDelete(null);
  };

  const autofillExercise = (name: string) => {
    setExerciseName(name);
    const pr = prs.find(p => p.searchName === name.trim().toLowerCase());
    if (pr) {
      setActiveSets([{ weight: pr.weight.toString(), reps: '' }]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-5 pb-8 relative flex flex-col">
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

      <ConfirmDeleteModal
        isOpen={!!workoutToDelete}
        title="Hapus Catatan Latihan?"
        description={
          workoutToDelete ? (
            <>
              Apakah Anda yakin ingin menghapus catatan latihan <strong className="font-bold text-stone-900">"{workoutToDelete.name}"</strong>?<br />Tindakan ini tidak dapat dibatalkan.
            </>
          ) : ""
        }
        onConfirm={() => removeEntry(workoutToDelete?.id || '')}
        onCancel={() => setWorkoutToDelete(null)}
      />      {activeTab === 'log' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-0 flex-1 px-1 md:px-0">
          
          {/* Main Logging Area */}
          <div className="lg:col-span-2 flex flex-col gap-5 min-h-0">
            
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
                       <div className="w-12 h-12 rounded-xl bg-indigo-55 text-indigo-600 flex items-center justify-center shrink-0">
                          <Dumbbell size={20} />
                       </div>
                       <div className="flex flex-col gap-3">
                          <div className="font-bold text-slate-900 text-sm md:text-base">{entry.exerciseName}</div>
                          
                          <div className="flex flex-col gap-1.5">
                            {entry.setsCollection && entry.setsCollection.length > 0 ? (
                                entry.setsCollection.map((s, idx) => (
                                  <div key={idx} className="flex items-center gap-3 text-[11px] md:text-xs text-slate-600 font-medium font-sans">
                                    <span className="w-10 text-slate-400 font-bold uppercase tracking-wider">Set {idx + 1}</span>
                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-bold min-w-[50px] text-center">{s.weight} kg</span>
                                    <span className="text-slate-300">×</span>
                                    <span className="px-2 py-0.5 bg-slate-100 rounded-md min-w-[50px] text-center">{s.reps} reps</span>
                                  </div>
                                ))
                            ) : (
                                <div className="text-xs text-slate-500 font-medium flex items-center gap-3 font-sans">
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
                         onClick={(e) => {
                           e.stopPropagation();
                           setWorkoutToDelete(entry);
                         }} 
                         className="text-slate-300 hover:text-rose-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
                       >
                         <Trash2 size={14} />
                       </button>
                    </div>
                 </div>
               ))}

               {dayWorkouts.length === 0 && (
                 <div className="py-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center px-4">
                   <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <LayoutList className="text-slate-300" size={20} />
                   </div>
                   <h3 className="font-bold text-slate-700 mb-1">No workout logged</h3>
                   <p className="text-xs text-slate-400 max-w-sm">You haven't added any exercise to this day yet. Click the Add Log button to track a machine or weight.</p>
                 </div>
               )}
            </div>
          </div>

          {/* Sidebar: PRs / Muscle Targets */}
          <div className="flex flex-col gap-5 shrink-0 lg:w-[320px]">
            {dayWorkouts.length > 0 && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
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

            {/* Premium Medals Personal Records List Widget */}
            <div className="bg-[#13112a] rounded-[24px] p-5 text-white border-[1.5px] border-white/5 shadow-xl relative overflow-hidden flex flex-col">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-550/5 blur-[60px] rounded-full pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-28 h-28 bg-[#fbbf24]/5 blur-[50px] rounded-full pointer-events-none" />
              
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">🏆</span>
                <div className="flex flex-col">
                  <h2 className="font-extrabold text-white text-sm tracking-tight leading-none">All Personal Records</h2>
                  <p className="text-[9px] text-slate-400 mt-1 font-medium select-none">Max weight per exercise — all time</p>
                </div>
              </div>

              <div className="divide-y divide-white/[0.04] space-y-1.5 flex-1 max-h-[300px] overflow-y-auto pr-1">
                {allPrList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400 select-none">
                    <span className="text-2xl mb-2">🏆</span>
                    <p className="text-xs font-semibold leading-relaxed">Belum ada rekor terdaftar.</p>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">Catat latihan pertamamu untuk melihat medali rekor di sini!</p>
                  </div>
                ) : (
                  allPrList.map((item, index) => {
                    const getCustomBadge = (idx: number) => {
                      if (idx === 0) {
                        return (
                          <div className="relative w-7 h-8 flex items-center justify-center shrink-0">
                            <div className="absolute bottom-[2px] w-3.5 h-4 flex justify-between z-0">
                              <div className="w-[5px] h-full bg-blue-650 rotate-12 origin-top rounded-b-sm" />
                              <div className="w-[5px] h-full bg-blue-550 -rotate-12 origin-top rounded-b-sm" />
                            </div>
                            <div className="relative w-5.5 h-5.5 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 border border-amber-200/50 flex items-center justify-center shadow-md z-10">
                              <span className="text-[8px]">🥇</span>
                            </div>
                          </div>
                        );
                      } else if (idx === 1) {
                        return (
                          <div className="relative w-7 h-8 flex items-center justify-center shrink-0">
                            <div className="absolute bottom-[2px] w-3.5 h-4 flex justify-between z-0">
                              <div className="w-[5px] h-full bg-blue-650 rotate-12 origin-top rounded-b-sm" />
                              <div className="w-[5px] h-full bg-blue-550 -rotate-12 origin-top rounded-b-sm" />
                            </div>
                            <div className="relative w-5.5 h-5.5 rounded-full bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 border border-slate-100/40 flex items-center justify-center shadow-md z-10">
                              <span className="text-[8px]">🥈</span>
                            </div>
                          </div>
                        );
                      } else if (idx === 2) {
                        return (
                          <div className="relative w-7 h-8 flex items-center justify-center shrink-0">
                            <div className="absolute bottom-[2px] w-3.5 h-4 flex justify-between z-0">
                              <div className="w-[5px] h-full bg-blue-650 rotate-12 origin-top rounded-b-sm" />
                              <div className="w-[5px] h-full bg-blue-550 -rotate-12 origin-top rounded-b-sm" />
                            </div>
                            <div className="relative w-5.5 h-5.5 rounded-full bg-gradient-to-br from-orange-400 to-amber-800 border border-orange-750/40 flex items-center justify-center shadow-md z-10">
                              <span className="text-[8px]">🥉</span>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="relative w-7 h-8 flex items-center justify-center shrink-0">
                            <div className="w-5.5 h-5.5 rounded-md bg-[#222c4a] border border-[#2d3a61] text-[#93c5fd] font-extrabold text-[9px] flex items-center justify-center shadow-inner font-sans">
                              {idx + 1}
                            </div>
                          </div>
                        );
                      }
                    };

                    return (
                      <div 
                        key={item.searchName}
                        onClick={() => setSelectedExercise(item.name)}
                        className="flex items-center justify-between py-2 px-1 hover:bg-white/[0.03] group/row rounded-lg cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {getCustomBadge(index)}
                          <div className="flex flex-col min-w-0">
                            <span className="font-extrabold text-white text-[13px] tracking-tight group-hover/row:text-[#fbbf24] transition-colors truncate">{item.name}</span>
                            <span className="text-[9px] text-slate-400 mt-0.5">{item.dateText}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0 pl-2">
                          <div className="text-sm font-black text-[#fbbf24] tracking-tight flex items-baseline gap-0.5 font-sans">
                            {item.weight} <span className="text-[9px] font-normal uppercase select-none">kg</span>
                          </div>
                          <div className="mt-0.5 font-sans">
                            {item.isToday ? (
                              <span className="text-[7px] font-black text-[#fbbf24] flex items-center gap-0.5 uppercase tracking-widest animate-pulse">
                                NEW TODAY
                              </span>
                            ) : (
                              <span className="text-[8px] font-bold text-[#4ade80] tracking-tight">
                                +{item.diff}kg dari awal
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-0 flex-1 px-1 md:px-0">
           
           {/* Left side: charts & consistency */}
           <div className="lg:col-span-2 flex flex-col gap-6 min-h-0">
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
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
                              cursor={{fill: 'rgba(59, 130, 246, 0.05)'}}
                              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                              itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                              formatter={(value: number) => [`${value} exercises`, 'Count']}
                            />
                            <Bar dataKey="workouts" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                         </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>
             </div>

             <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col items-center">
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

             <div className="mt-2 space-y-4">
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

           {/* Right side: Streak and PR widgets */}
           <div className="flex flex-col gap-6 shrink-0 lg:w-[320px]">
             
             {/* GYM STREAK widget */}
             <div className="bg-gradient-to-r from-[#7a64fa] to-[#8c74fc] rounded-[24px] py-4 px-5 text-white shadow-md flex flex-col gap-3 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-[25px] rounded-full pointer-events-none" />
               <div>
                 <div className="flex items-center gap-1 text-indigo-100 select-none">
                   <Flame size={14} className="text-[#fbbf24]" />
                   <span className="text-[9px] font-black uppercase tracking-widest text-[#ebdfff] font-sans">GYM STREAK</span>
                 </div>
                 <div className="flex items-baseline gap-2 mt-1">
                   <h2 className="text-3xl font-black text-white tracking-tight leading-none">{currentStreak} Hari</h2>
                   <p className="text-[10px] text-indigo-100 font-semibold">Keep it going! 💪</p>
                 </div>
               </div>

               {/* Weekdays indicator tracker from screenshot */}
               <div className="grid grid-cols-7 gap-1.5 select-none w-full">
                 {currentWeekStatus.map((day, dIdx) => (
                   <div key={dIdx} className="flex flex-col items-center gap-1">
                      <span className="text-[8px] font-bold text-indigo-100/70 uppercase leading-none">{day.label}</span>
                      <div 
                        className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center text-xs transition-all duration-300 border-2",
                          day.hasWorkout
                             ? "bg-white border-transparent text-[#7a64fa] font-black scale-105 shadow-md"
                             : day.isToday
                               ? "bg-white/10 border-white/60 text-white font-extrabold"
                               : "bg-[#9c8eff]/20 border-transparent text-indigo-200/70 font-bold"
                        )}
                      >
                        {day.label}
                      </div>
                   </div>
                 ))}
               </div>
             </div>

             {/* PR Spotlight showcase card */}
             {(() => {
               const currentSlideIdx = activePrSlideIdx >= prSlides.length ? 0 : activePrSlideIdx;
               const showPr = prSlides[currentSlideIdx];

               if (!showPr) {
                  return (
                    <div className="bg-[#13112a] rounded-[24px] p-5 text-white border-[1.5px] border-white/5 shadow-xl relative overflow-hidden flex flex-col justify-center items-center text-center py-10 select-none">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-550/5 blur-[50px] rounded-full pointer-events-none" />
                      <div className="w-12 h-12 bg-[#1e1a42] rounded-full flex items-center justify-center text-2xl mb-3 shadow-inner border border-[#fbbf24]/10 select-none">
                        🏆
                      </div>
                      <h3 className="text-sm font-extrabold text-[#fbbf24] tracking-wider uppercase">Spotlight Rekor Utama</h3>
                      <p className="text-xs text-white/95 mt-1 font-bold">Belum Ada Rekor Latihan</p>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-[220px] leading-relaxed">Personal Record Anda akan tersorot di bagian ini setelah mencatatkan hasil latihan baru!</p>
                    </div>
                  );
                }

               return (
                 <div className="bg-[#13112a] rounded-[24px] p-5 text-white border-[1.5px] border-[#fbbf24]/10 shadow-xl relative overflow-hidden group select-none flex flex-col justify-between">
                   <div className="absolute top-0 right-0 w-36 h-36 bg-[#fbbf24]/5 blur-[60px] rounded-full pointer-events-none" />
                   <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-indigo-500/5 blur-[50px] rounded-full pointer-events-none" />

                   {showPr.isDemo && (
                     <div className="absolute top-4 right-4 bg-indigo-950/70 text-indigo-300 text-[8px] font-bold px-2 py-0.5 rounded-md border border-indigo-500/20 uppercase tracking-widest font-mono z-10">
                       Tutorial Preview
                     </div>
                   )}

                   <AnimatePresence mode="wait">
                      <motion.div
                        key={showPr.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.4}
                        onDragEnd={(_, info) => {
                          const swipeThreshold = 50;
                          if (info.offset.x < -swipeThreshold) {
                            // Swiped left -> next
                            setActivePrSlideIdx(prev => (prev + 1) % prSlides.length);
                          } else if (info.offset.x > swipeThreshold) {
                            // Swiped right -> prev
                            setActivePrSlideIdx(prev => (prev - 1 + prSlides.length) % prSlides.length);
                          }
                        }}
                        className="flex-1 flex flex-col justify-between h-full cursor-grab active:cursor-grabbing select-none"
                      >
                        <div>
                          {/* Header Row */}
                          <div className={cn("flex items-center gap-2.5 pb-1", showPr.isDemo ? "pr-24" : "pr-2")}>
                            <div className="w-10 h-10 bg-[#1e1a42] rounded-full flex items-center justify-center text-xl shrink-0 shadow-inner border border-[#fbbf24]/10">
                              🏆
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1 text-[#fbbf24] text-[8px] sm:text-[9px] font-black uppercase tracking-widest font-sans overflow-hidden text-ellipsis whitespace-nowrap">
                                <span className="w-1 h-1 rounded-full bg-[#fbbf24] animate-pulse inline-block" />
                                <span>{showPr.isToday ? 'NEW PERSONAL RECORD TODAY' : 'LATEST PERSONAL RECORD'}</span>
                              </div>
                              <h2 className="text-lg font-extrabold text-white tracking-tight leading-none mt-1 truncate">{showPr.exerciseName}</h2>
                              <p className="text-[9px] text-slate-400 font-medium mt-1">{showPr.dateText}</p>
                            </div>
                          </div>

                          {/* Metrics Grid */}
                          <div className="grid grid-cols-3 gap-1.5 my-3">
                            <div className="bg-[#1b193d]/80 rounded-[12px] py-2 flex flex-col items-center justify-center hover:bg-[#1b193d] transition-colors">
                              <span className="text-lg font-black text-[#fbbf24] tracking-tight">{showPr.weight}</span>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">kg</span>
                            </div>
                            <div className="bg-[#1b193d]/80 rounded-[12px] py-2 flex flex-col items-center justify-center hover:bg-[#1b193d] transition-colors">
                              <span className="text-lg font-black text-[#fbbf24] tracking-tight">{showPr.reps}</span>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">reps</span>
                            </div>
                            <div className="bg-[#1b193d]/80 rounded-[12px] py-2 flex flex-col items-center justify-center hover:bg-[#1b193d] transition-colors">
                              <span className="text-lg font-black text-[#fbbf24] tracking-tight">{showPr.sets}</span>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">sets</span>
                            </div>
                          </div>
                        </div>

                        {/* Progress banner */}
                        <div className="bg-[#102d23]/80 border border-[#1b5c46]/30 text-[#4ade80] rounded-[12px] p-2.5 flex items-center gap-2 mt-auto">
                           <div className="w-7 h-7 bg-white rounded flex items-center justify-center shrink-0">
                              <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                 <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                                 <polyline points="16 7 22 7 22 13" />
                              </svg>
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="text-xs font-black tracking-tight text-[#4ade80] leading-none">
                                 {showPr.isFirstRecord ? 'Rekor Perdana Terdaftar!' : `+${showPr.diff}kg dari PR sebelumnya!`}
                              </p>
                              <p className="text-[9px] text-emerald-400/60 font-semibold truncate mt-0.5">
                                 {showPr.isFirstRecord ? 'Mulai latih kekuatan beban latihan Anda! 🔥' : `PR lama: ${showPr.oldWeight}kg • ${showPr.oldDateText || 'Sesi Sebelumnya'}`}
                              </p>
                           </div>
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    {/* Slide indicators under a pure slider layout */}
                    {prSlides.length > 1 && (
                      <div className="flex justify-center gap-1.5 mt-3 pt-2.5 border-t border-white/[0.04] shrink-0">
                        {prSlides.map((_, sIdx) => (
                          <button
                            key={sIdx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePrSlideIdx(sIdx);
                            }}
                            className={cn(
                              "w-1.5 h-1.5 rounded-full transition-all cursor-pointer outline-none",
                              sIdx === currentSlideIdx ? "bg-[#fbbf24] w-3.5" : "bg-white/20 hover:bg-white/40"
                            )}
                            aria-label={`Lihat slide ${sIdx + 1}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
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

      {/* PR Celebration Breakthrough Modal */}
      <AnimatePresence>
        {prCelebration && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              onClick={() => setPrCelebration(null)}
            />

            {/* Confetti Particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(25)].map((_, i) => {
                const randomX = Math.random() * 100;
                const randomDelay = Math.random() * 1.5;
                const randomDuration = 2 + Math.random() * 2;
                const colors = ['#fbbf24', '#60a5fa', '#34d399', '#f472b6', '#a78bfa'];
                const randomColor = colors[Math.floor(Math.random() * colors.length)];
                
                return (
                  <motion.div
                    key={i}
                    initial={{ y: -20, x: `${randomX}%`, opacity: 1, scale: 0.5 + Math.random() * 0.8 }}
                    animate={{ y: '110vh', rotate: 360 }}
                    transition={{
                      duration: randomDuration,
                      delay: randomDelay,
                      repeat: Infinity,
                      ease: 'linear'
                    }}
                    style={{ backgroundColor: randomColor }}
                    className="absolute w-2 h-4 rounded-sm"
                  />
                );
              })}
            </div>

            <motion.div
              initial={{ scale: 0.85, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.85, y: 50, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 18 }}
              className="relative w-full max-w-md bg-[#13112a] text-white rounded-[32px] p-8 border border-[#fbbf24]/20 shadow-2xl overflow-hidden flex flex-col items-center justify-center text-center font-sans"
            >
              {/* Soft purple glow circles */}
              <div className="absolute top-0 w-48 h-48 bg-[#fbbf24]/10 blur-[50px] rounded-full pointer-events-none" />
              <div className="absolute bottom-0 w-48 h-48 bg-indigo-500/10 blur-[50px] rounded-full pointer-events-none" />

              <div className="w-20 h-20 bg-[#252055] rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner border border-[#fbbf24]/20 animate-bounce">
                🎉
              </div>

              <div className="flex items-center gap-1.5 text-[#fbbf24] font-black text-[10px] tracking-widest uppercase mb-2">
                <Sparkles size={12} className="animate-spin" />
                <span>BREAKTHROUGH PERSONAL RECORD!</span>
                <Sparkles size={12} className="animate-spin" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white px-2 tracking-tight leading-tight">
                {prCelebration.exerciseName}
              </h2>

              {/* Stats showcase comparison */}
              <div className="w-full bg-[#1b193d]/90 border border-white/5 rounded-2xl p-4 my-6 flex items-center justify-around gap-2 shadow-inner relative">
                {prCelebration.isFirstRecord ? (
                  <div className="flex flex-col items-center">
                    <span className="text-3xl font-black text-[#fbbf24] tracking-tight">{prCelebration.newWeight} kg</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">REKOR PERDANA!</span>
                  </div>
                ) : (
                  <>
                    <div className="text-center">
                      <span className="text-xl font-bold text-slate-400 tracking-tight line-through block">{prCelebration.oldWeight} kg</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5 block">PR Lama</span>
                    </div>
                    
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xs shrink-0 select-none">
                      →
                    </div>
                    
                    <div className="text-center">
                      <span className="text-3xl font-black text-[#4ade80] tracking-tight block">{prCelebration.newWeight} kg</span>
                      <span className="text-[9px] text-emerald-400/80 font-black uppercase tracking-widest mt-0.5 block">PR BARU!</span>
                    </div>
                  </>
                )}
              </div>

              <p className="text-xs text-slate-400 max-w-sm px-2 leading-relaxed">
                {prCelebration.isFirstRecord 
                  ? 'Selamat! Anda menetapkan standar ketahanan kekuatan baru untuk olahraga ini.' 
                  : `Waspada latihan maksimal! Anda baru saja menambahkan +${prCelebration.newWeight - prCelebration.oldWeight}kg ke batas rekor terdahulu Anda.`
                }
              </p>

              <button
                onClick={() => setPrCelebration(null)}
                className="w-full mt-8 bg-gradient-to-r from-[#7a64fa] to-[#8c74fc] hover:from-[#8c74fc] hover:to-[#7a64fa] hover:brightness-110 active:scale-[0.98] text-white py-4 rounded-xl font-extrabold text-sm transition-all shadow-lg shadow-[#7a64fa]/20 outline-none"
              >
                HEBAT, JALANKAN TERUS!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
