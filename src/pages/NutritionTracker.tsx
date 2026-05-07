import React, { useState, useMemo } from 'react';
import {
  Plus, Search, Trash2, Calendar, Clock,
  ChevronRight, ChevronLeft, Apple, Beef, Coffee, Zap, Info, Ruler, Activity, Users,
  Sparkles, Loader2, Book, CheckCircle2, TrendingUp
} from 'lucide-react';
import { format, isToday, addDays, subDays } from 'date-fns';
import { cn } from '../lib/utils';
import { NutritionEntry, FoodLibraryItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { estimateNutrition } from '../services/nutritionAIService';
import { COMMON_FOODS } from '../data/foodLibrary';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';

export default function NutritionTracker({
  nutrition,
  setNutrition,
  customFoodCatalog,
  setCustomFoodCatalog,
  bodyProfile,
  setBodyProfile
}: {
  nutrition: NutritionEntry[],
  setNutrition: React.Dispatch<React.SetStateAction<NutritionEntry[]>>,
  customFoodCatalog: FoodLibraryItem[],
  setCustomFoodCatalog: React.Dispatch<React.SetStateAction<FoodLibraryItem[]>>,
  bodyProfile: any,
  setBodyProfile: React.Dispatch<React.SetStateAction<any>>
}) {
  const [activeTab, setActiveTab] = useState<'log' | 'body'>('log');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [notification, setNotification] = useState<string | null>(null);
  const [logMode, setLogMode] = useState<'manual' | 'ai' | 'catalog'>('catalog');
  const [aiQuery, setAiQuery] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [newEntry, setNewEntry] = useState({
    name: '',
    calories: '',
    sugar: '',
    protein: '',
    fat: '',
    carbs: '',
    sodium: '',
    type: 'food' as 'food' | 'drink'
  });

  const getMissingFields = () => {
    const fields = [];
    if (!bodyProfile.height) fields.push('Height');
    if (!bodyProfile.weight) fields.push('Weight');
    if (!bodyProfile.neck) fields.push('Neck');
    if (!bodyProfile.waist) fields.push('Waist');
    if (bodyProfile.gender === 'female' && !bodyProfile.hip) fields.push('Hip');
    return fields;
  };

  const bodyFatResult = useMemo(() => {
    const { gender, height, neck, waist, hip } = bodyProfile;
    const h = parseFloat(height);
    const n = parseFloat(neck);
    const w = parseFloat(waist);
    const hp = parseFloat(hip);

    if (isNaN(h) || isNaN(n) || isNaN(w) || (gender === 'female' && isNaN(hp))) return null;

    if (gender === 'male') {
      if (w <= n) return 'waist_error';
      const bfp = 495 / (1.0324 - 0.19077 * Math.log10(w - n) + 0.15456 * Math.log10(h)) - 450;
      return isFinite(bfp) && bfp > 0 ? bfp : 'invalid';
    } else {
      if ((w + hp) <= n) return 'waist_error';
      const bfp = 495 / (1.29579 - 0.35004 * Math.log10(w + hp - n) + 0.22100 * Math.log10(h)) - 450;
      return isFinite(bfp) && bfp > 0 ? bfp : 'invalid';
    }
  }, [bodyProfile]);

  const dayNutrition = useMemo(() => {
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    return nutrition.filter(n => format(new Date(n.date), 'yyyy-MM-dd') === selectedDateStr);
  }, [nutrition, selectedDate]);

  const filteredNutrition = useMemo(() => {
    return dayNutrition.filter(n =>
      n.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [dayNutrition, searchTerm]);

  const dailyTotals = useMemo(() => {
    return {
      calories: dayNutrition.reduce((sum, n) => sum + n.calories, 0),
      sugar: dayNutrition.reduce((sum, n) => sum + n.sugar, 0),
      protein: dayNutrition.reduce((sum, n) => sum + n.protein, 0),
      fat: dayNutrition.reduce((sum, n) => sum + (n.fat || 0), 0),
      carbs: dayNutrition.reduce((sum, n) => sum + (n.carbs || 0), 0),
      sodium: dayNutrition.reduce((sum, n) => sum + (n.sodium || 0), 0),
    };
  }, [dayNutrition]);

  const chartData = useMemo(() => {
    return [
      { name: 'Sugar', value: dailyTotals.sugar, color: '#ec4899', goal: 50 },
      { name: 'Protein', value: dailyTotals.protein, color: '#3b82f6', goal: 60 },
      { name: 'Fat', value: dailyTotals.fat, color: '#f59e0b', goal: 70 },
      { name: 'Carbs', value: dailyTotals.carbs, color: '#10b981', goal: 250 },
    ];
  }, [dailyTotals]);

  const [activeTrend, setActiveTrend] = useState<string | null>(null);
  const [trendRange, setTrendRange] = useState<number>(7);

  const trendData = useMemo(() => {
    // Optimization for large datasets (e.g. 365 days)
    const map = new Map<string, NutritionEntry[]>();
    nutrition.forEach(n => {
      const dStr = format(new Date(n.date), 'yyyy-MM-dd');
      if (!map.has(dStr)) map.set(dStr, []);
      map.get(dStr)!.push(n);
    });

    return [...Array(trendRange)].map((_, i) => {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - (trendRange - 1 - i));
      const dayStr = format(d, 'yyyy-MM-dd');

      const dayNutrients = map.get(dayStr) || [];

      return {
        name: format(d, trendRange <= 7 ? 'EEE' : 'MMM d'),
        calories: dayNutrients.reduce((sum, n) => sum + n.calories, 0),
        sodium: dayNutrients.reduce((sum, n) => sum + (n.sodium || 0), 0),
        protein: dayNutrients.reduce((sum, n) => sum + (n.protein || 0), 0),
        sugar: dayNutrients.reduce((sum, n) => sum + (n.sugar || 0), 0),
        fat: dayNutrients.reduce((sum, n) => sum + (n.fat || 0), 0),
        carbs: dayNutrients.reduce((sum, n) => sum + (n.carbs || 0), 0),
      };
    });
  }, [nutrition, selectedDate, trendRange]);

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.name || !newEntry.calories) return;

    const entry: NutritionEntry = {
      id: Math.random().toString(36).substr(2, 9),
      name: newEntry.name,
      calories: parseFloat(newEntry.calories),
      sugar: parseFloat(newEntry.sugar || '0'),
      protein: parseFloat(newEntry.protein || '0'),
      fat: parseFloat(newEntry.fat || '0'),
      carbs: parseFloat(newEntry.carbs || '0'),
      sodium: parseFloat(newEntry.sodium || '0'),
      type: newEntry.type,
      date: selectedDate.toISOString()
    };

    setNutrition([entry, ...nutrition]);
    setIsAddModalOpen(false);
    setNewEntry({ name: '', calories: '', sugar: '', protein: '', fat: '', carbs: '', sodium: '', type: 'food' });
    setAiQuery('');
    setLogMode('manual');
  };

  const handleAiEstimate = async () => {
    if (!aiQuery.trim()) return;
    setIsAiLoading(true);
    try {
      const result = await estimateNutrition(aiQuery);
      setNewEntry({
        name: result.name,
        calories: result.calories.toString(),
        sugar: result.sugar.toString(),
        protein: result.protein.toString(),
        fat: result.fat.toString(),
        carbs: result.carbs.toString(),
        sodium: result.sodium.toString(),
        type: result.type
      });
      setLogMode('manual');
    } catch (error: any) {
      console.error("AI estimation failed:", error);
      if (error.message === 'MISSING_API_KEY') {
        alert("Konfigurasi Error: GEMINI_API_KEY belum terbaca.\n\nPASTIKAN:\n1. Anda sudah membuat file bernama '.env' (titik env)\n2. Isinya: GEMINI_API_KEY=\"kunci_anda\"\n3. ANDA WAJIB RESTART SERVER (Ctrl+C lalu npm run dev lagi).");
      } else if (error.message === 'INVALID_AI_RESPONSE') {
        alert("Gagal memproses data dari AI. Silakan coba lagi.");
      } else {
        alert("Gagal memperkirakan nutrisi. Jika Anda menjalankan secara lokal, pastikan GEMINI_API_KEY di file .env sudah benar.");
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  const filteredCatalog = useMemo(() => {
    const combined = [...customFoodCatalog, ...COMMON_FOODS];
    if (!catalogSearch.trim()) return combined.slice(0, 12);
    return combined.filter(item =>
      item.name.toLowerCase().includes(catalogSearch.toLowerCase())
    );
  }, [catalogSearch, customFoodCatalog]);

  const saveToCatalog = () => {
    if (!newEntry.name || !newEntry.calories) return;

    const item: FoodLibraryItem = {
      name: newEntry.name,
      calories: parseFloat(newEntry.calories),
      sugar: parseFloat(newEntry.sugar || '0'),
      protein: parseFloat(newEntry.protein || '0'),
      fat: parseFloat(newEntry.fat || '0'),
      carbs: parseFloat(newEntry.carbs || '0'),
      sodium: parseFloat(newEntry.sodium || '0'),
      type: newEntry.type
    };

    setCustomFoodCatalog([item, ...customFoodCatalog]);
    setNotification(`"${item.name}" berhasil disimpan ke katalog!`);
    setTimeout(() => setNotification(null), 3000);
  };

  const selectFromCatalog = (item: FoodLibraryItem) => {
    setNewEntry({
      name: item.name,
      calories: item.calories.toString(),
      sugar: item.sugar.toString(),
      protein: item.protein.toString(),
      fat: item.fat.toString(),
      carbs: item.carbs.toString(),
      sodium: item.sodium.toString(),
      type: item.type
    });
    setLogMode('manual');
  };

  const removeFromCatalog = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    setCustomFoodCatalog(prev => prev.filter(item => item.name !== name));
    setNotification(`"${name}" dihapus dari katalog.`);
    setTimeout(() => setNotification(null), 3000);
  };

  const removeEntry = (id: string) => {
    setNutrition(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-12 relative flex flex-col">
      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-2xl w-full md:w-fit border border-slate-200 shadow-sm shrink-0">
        <button
          onClick={() => setActiveTab('log')}
          className={cn(
            "flex-1 md:px-8 py-3 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2",
            activeTab === 'log' ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <Activity size={16} />
          Intake Tracker
        </button>
        <button
          onClick={() => setActiveTab('body')}
          className={cn(
            "flex-1 md:px-8 py-3 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2",
            activeTab === 'body' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <Ruler size={16} />
          Body Fat Calc
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'log' ? (
          <motion.div
            key="log"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            {/* Add Modal */}
            <AnimatePresence>
              {notification && (
                <motion.div
                  key="notification-toast"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-xl shadow-emerald-600/20 font-bold text-sm flex items-center gap-3"
                >
                  <CheckCircle2 size={18} className="text-emerald-100" />
                  {notification}
                </motion.div>
              )}
              {isAddModalOpen && (
                <div key="add-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                  >
                    <div className="p-5 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <div>
                        <h3 className="text-lg md:text-xl font-bold text-slate-900">Log Nutrition</h3>
                        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Add entry to your daily intake</p>
                      </div>
                      <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <Plus size={24} className="rotate-45" />
                      </button>
                    </div>

                    <div className="px-5 md:px-8 pt-4 md:pt-6 pb-2">
                      <div className="flex p-1 bg-slate-100 rounded-xl">
                        <button onClick={() => setLogMode('catalog')} className={cn("flex-1 py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5", logMode === 'catalog' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}>
                          <Book size={12} /> Catalog
                        </button>
                        <button onClick={() => setLogMode('manual')} className={cn("flex-1 py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all", logMode === 'manual' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}>Manual</button>
                        <button onClick={() => setLogMode('ai')} className={cn("flex-1 py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5", logMode === 'ai' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400")}>
                          <Sparkles size={12} /> AI Magic
                        </button>
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      {logMode === 'catalog' ? (
                        <motion.div
                          key="catalog-mode"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="p-5 md:p-8 space-y-4 md:space-y-5"
                        >
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                              type="text"
                              value={catalogSearch}
                              onChange={e => setCatalogSearch(e.target.value)}
                              placeholder="Search common foods (Nasi, Chicken, Apple...)"
                              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all text-sm"
                            />
                          </div>
                          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {filteredCatalog.map((item, idx) => {
                              const isCustom = customFoodCatalog.some(c => c.name === item.name);
                              return (
                                <div
                                  key={`catalog-item-${idx}-${item.name}`}
                                  className="w-full bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 rounded-xl flex items-center justify-between transition-all group relative"
                                >
                                  <button
                                    onClick={() => selectFromCatalog(item)}
                                    className="flex-1 p-4 flex items-center gap-3 text-left"
                                  >
                                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0", item.type === 'food' ? "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white" : "bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white")}>
                                      {item.type === 'food' ? <Apple size={14} /> : <Coffee size={14} />}
                                    </div>
                                    <div>
                                      <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        {item.name}
                                        {isCustom && (
                                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-600 text-[8px] font-black uppercase rounded shrink-0">Favorite</span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-bold uppercase">{item.calories} kcal • {item.protein}g P • {item.carbs}g C</div>
                                    </div>
                                  </button>

                                  <div className="flex items-center pr-4 gap-2 shrink-0">
                                    {isCustom && (
                                      <button
                                        onClick={(e) => removeFromCatalog(e, item.name)}
                                        className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                        title="Delete from Catalog"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                    <button onClick={() => selectFromCatalog(item)} className="text-slate-300 group-hover:text-slate-600">
                                      <ChevronRight size={16} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                            {filteredCatalog.length === 0 && (
                              <div className="py-8 text-center space-y-3">
                                <p className="text-sm text-slate-400 italic">Not found in catalog...</p>
                                <button onClick={() => setLogMode('ai')} className="text-emerald-600 text-xs font-bold underline flex items-center justify-center gap-1 mx-auto">
                                  <Sparkles size={12} /> Try AI Magic instead?
                                </button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ) : logMode === 'ai' ? (
                        <motion.div
                          key="ai-mode"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="p-5 md:p-8 space-y-4 md:space-y-5"
                        >
                          <div className="space-y-3">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Describe your meal</label>
                            <textarea
                              value={aiQuery}
                              onChange={e => setAiQuery(e.target.value)}
                              placeholder="E.g. One plate of chicken fried rice with fried egg and iced tea..."
                              className="w-full px-4 py-4 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none transition-all h-32 text-sm resize-none"
                            />
                            <p className="text-[9px] text-slate-400 italic">Gemini will estimate calories, macros, and sodium for you.</p>
                          </div>
                          <button
                            onClick={handleAiEstimate}
                            disabled={isAiLoading || !aiQuery.trim()}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2"
                          >
                            {isAiLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                            {isAiLoading ? 'Analyzing...' : 'Estimate Nutrition'}
                          </button>
                        </motion.div>
                      ) : (
                        <motion.form
                          key="manual-mode"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          onSubmit={handleAddEntry}
                          className="p-5 md:p-8 space-y-4 md:space-y-5"
                        >
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Item Name</label>
                            <input
                              type="text"
                              required
                              placeholder="E.g. Apple, Protein Shake..."
                              value={newEntry.name}
                              onChange={e => setNewEntry({ ...newEntry, name: e.target.value })}
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Calories</label>
                              <input type="number" required placeholder="0" value={newEntry.calories} onChange={e => setNewEntry({ ...newEntry, calories: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sugar (g)</label>
                              <input type="number" placeholder="0" value={newEntry.sugar} onChange={e => setNewEntry({ ...newEntry, sugar: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Protein (g)</label>
                              <input type="number" placeholder="0" value={newEntry.protein} onChange={e => setNewEntry({ ...newEntry, protein: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Fat (g)</label>
                              <input type="number" placeholder="0" value={newEntry.fat} onChange={e => setNewEntry({ ...newEntry, fat: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Carbs (g)</label>
                              <input type="number" placeholder="0" value={newEntry.carbs} onChange={e => setNewEntry({ ...newEntry, carbs: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sodium (mg)</label>
                              <input type="number" placeholder="0" value={newEntry.sodium} onChange={e => setNewEntry({ ...newEntry, sodium: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" />
                            </div>
                          </div>
                          <div className="flex gap-4 p-1 bg-slate-100 rounded-xl">
                            <button type="button" onClick={() => setNewEntry({ ...newEntry, type: 'food' })}
                              className={cn("flex-1 py-2 rounded-lg text-xs font-bold transition-all", newEntry.type === 'food' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}>FOOD</button>
                            <button type="button" onClick={() => setNewEntry({ ...newEntry, type: 'drink' })}
                              className={cn("flex-1 py-2 rounded-lg text-xs font-bold transition-all", newEntry.type === 'drink' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}>DRINK</button>
                          </div>
                          <div className="flex gap-3">
                            <button type="submit" className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg transition-all">Log Intake</button>
                            <button
                              type="button"
                              onClick={saveToCatalog}
                              className="px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                              title="Save to Favorites"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </motion.form>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Date Navigation */}
            <div className="flex items-center justify-between bg-white p-2 md:p-3 rounded-2xl border border-slate-200 shadow-sm shrink-0">
              <button onClick={() => setSelectedDate(d => subDays(d, 1))} className="p-2 md:p-3 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors">
                <ChevronLeft size={20} />
              </button>
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-emerald-500" />
                  <span className="font-bold text-slate-900 text-sm md:text-base">
                    {isToday(selectedDate) ? 'Today' : format(selectedDate, 'MMMM dd, yyyy')}
                  </span>
                </div>
                {isToday(selectedDate) && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Log</span>}
              </div>
              <button
                onClick={() => setSelectedDate(d => addDays(d, 1))}
                disabled={isToday(selectedDate)}
                className="p-2 md:p-3 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 shrink-0 px-1 md:px-0">
              <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={14} className="text-emerald-500" />
                  <span className="text-slate-500 uppercase tracking-widest text-[8px] md:text-[9px] font-black">Calories</span>
                </div>
                <div className="text-lg md:text-2xl font-bold text-slate-900">{dailyTotals.calories} <span className="text-[10px] text-slate-400">kcal</span></div>
              </div>
              <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <span className="text-rose-500 uppercase tracking-widest text-[8px] md:text-[9px] font-black block mb-2">Sugar</span>
                <div className="text-lg md:text-2xl font-bold text-slate-900">{dailyTotals.sugar} <span className="text-[10px] text-slate-400">g</span></div>
              </div>
              <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <span className="text-blue-500 uppercase tracking-widest text-[8px] md:text-[9px] font-black block mb-2">Protein</span>
                <div className="text-lg md:text-2xl font-bold text-slate-900">{dailyTotals.protein} <span className="text-[10px] text-slate-400">g</span></div>
              </div>
              <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <span className="text-emerald-500 uppercase tracking-widest text-[8px] md:text-[9px] font-black block mb-2">Carbs</span>
                <div className="text-lg md:text-2xl font-bold text-slate-900">{dailyTotals.carbs} <span className="text-[10px] text-slate-400">g</span></div>
              </div>
              <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm col-span-2 md:col-span-1">
                <span className="text-orange-500 uppercase tracking-widest text-[8px] md:text-[9px] font-black block mb-2">Sodium</span>
                <div className="text-lg md:text-2xl font-bold text-slate-900">{dailyTotals.sodium} <span className="text-[10px] text-slate-400">mg</span></div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-0">
              <div className="lg:col-span-2 flex flex-col gap-6 min-h-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2 shrink-0">
                  <h2 className="text-lg md:text-xl font-bold text-slate-900">Intake Log</h2>
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg bg-white border border-slate-200 focus:border-blue-500 outline-none text-xs shadow-sm" />
                    </div>
                    <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs whitespace-nowrap">
                      <Plus size={14} /> Log New
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                  {filteredNutrition.map((entry) => (
                    <div key={entry.id} className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", entry.type === 'food' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600")}>
                          {entry.type === 'food' ? <Apple size={18} /> : <Coffee size={18} />}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{entry.name}</h4>
                          <p className="text-[10px] text-slate-400 font-bold">{format(new Date(entry.date), 'HH:mm • MMM dd')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-sm font-black text-slate-900">{entry.calories} kcal</div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase">S: {entry.sugar}g • P: {entry.protein}g • C: {entry.carbs}g</div>
                        </div>
                        <button onClick={() => removeEntry(entry.id)} className="text-slate-200 hover:text-rose-500 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-6">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Zap size={14} className="text-emerald-500" /> Daily Macros</h3>
                  <div className="space-y-4">
                    {chartData.map((item, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                          <span>{item.name}</span>
                          <span>{item.value}g / {item.goal}g</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                          <div className="h-full transition-all duration-1000" style={{ width: `${Math.min((item.value / item.goal) * 100, 100)}%`, backgroundColor: item.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trends Chart */}
                <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-6">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><TrendingUp size={14} className="text-blue-500" /> Trends Tracker</h3>
                    <select
                      value={trendRange}
                      onChange={(e) => setTrendRange(Number(e.target.value))}
                      className="text-[11px] border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 text-slate-700 font-bold outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value={7}>1 Week</option>
                      <option value={30}>1 Month</option>
                      <option value={90}>3 Months</option>
                      <option value={180}>6 Months</option>
                      <option value={365}>12 Months</option>
                    </select>
                  </div>
                  <div className="h-[250px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} minTickGap={20} />
                        <YAxis yAxisId="macro" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} width={30} />
                        <YAxis yAxisId="cal" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} width={35} />
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                          cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
                        />
                        <Legend
                          onClick={(e) => setActiveTrend(activeTrend === e.dataKey ? null : String(e.dataKey))}
                          wrapperStyle={{ cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }}
                        />
                        <Line yAxisId="macro" type="monotone" dataKey="protein" stroke="#3b82f6" strokeOpacity={activeTrend && activeTrend !== 'protein' ? 0.1 : 1} strokeWidth={activeTrend === 'protein' ? 4 : 2} dot={trendRange <= 30 ? (activeTrend === 'protein' ? { r: 5 } : { r: 3 }) : false} activeDot={{ r: 6 }} name="Protein (g)" />
                        <Line yAxisId="macro" type="monotone" dataKey="sodium" stroke="#f97316" strokeOpacity={activeTrend && activeTrend !== 'sodium' ? 0.1 : 1} strokeWidth={activeTrend === 'sodium' ? 4 : 2} dot={trendRange <= 30 ? (activeTrend === 'sodium' ? { r: 5 } : { r: 3 }) : false} activeDot={{ r: 6 }} name="Sodium (mg)" />
                        <Line yAxisId="macro" type="monotone" dataKey="sugar" stroke="#ec4899" strokeOpacity={activeTrend && activeTrend !== 'sugar' ? 0.1 : 1} strokeWidth={activeTrend === 'sugar' ? 4 : 2} dot={trendRange <= 30 ? (activeTrend === 'sugar' ? { r: 5 } : { r: 3 }) : false} activeDot={{ r: 6 }} name="Sugar (g)" />
                        <Line yAxisId="macro" type="monotone" dataKey="fat" stroke="#f59e0b" strokeOpacity={activeTrend && activeTrend !== 'fat' ? 0.1 : 1} strokeWidth={activeTrend === 'fat' ? 4 : 2} dot={trendRange <= 30 ? (activeTrend === 'fat' ? { r: 5 } : { r: 3 }) : false} activeDot={{ r: 6 }} name="Fat (g)" />
                        <Line yAxisId="macro" type="monotone" dataKey="carbs" stroke="#10b981" strokeOpacity={activeTrend && activeTrend !== 'carbs' ? 0.1 : 1} strokeWidth={activeTrend === 'carbs' ? 4 : 2} dot={trendRange <= 30 ? (activeTrend === 'carbs' ? { r: 5 } : { r: 3 }) : false} activeDot={{ r: 6 }} name="Carbs (g)" />
                        <Line yAxisId="cal" type="monotone" dataKey="calories" stroke="#64748b" strokeOpacity={activeTrend && activeTrend !== 'calories' ? 0.1 : 1} strokeWidth={activeTrend === 'calories' ? 4 : 2} dot={trendRange <= 30 ? (activeTrend === 'calories' ? { r: 5 } : { r: 3 }) : false} activeDot={{ r: 6 }} name="Calories (kcal)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium text-center leading-relaxed mt-4">
                    Menampilkan tren selama <strong>{trendRange === 7 ? '1 Minggu' : trendRange === 30 ? '1 Bulan' : trendRange === 90 ? '3 Bulan' : trendRange === 180 ? '6 Bulan' : '12 Bulan'}</strong> terakhir.<br />Klik pada nama nutrisi di atas (Legend) untuk <strong>menyorot (highlight)</strong> garis grafiknya masing-masing.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="body"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 md:space-y-8">
              <div>
                <h3 className="text-lg md:text-xl font-bold text-slate-900">Body Fat Calculator</h3>
                <p className="text-xs md:text-sm text-slate-500 mt-1">Estimate your body fat percentage using the U.S. Navy Method. Results update automatically.</p>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4 p-1 bg-slate-100 rounded-xl">
                  <button onClick={() => setBodyProfile({ ...bodyProfile, gender: 'male' })}
                    className={cn("flex-1 py-3 rounded-lg text-sm font-bold transition-all", bodyProfile.gender === 'male' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400")}>MALE</button>
                  <button onClick={() => setBodyProfile({ ...bodyProfile, gender: 'female' })}
                    className={cn("flex-1 py-3 rounded-lg text-sm font-bold transition-all", bodyProfile.gender === 'female' ? "bg-white text-rose-600 shadow-sm" : "text-slate-400")}>FEMALE</button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Height (cm)</label>
                    <input type="number" value={bodyProfile.height} onChange={(e) => setBodyProfile({ ...bodyProfile, height: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none" placeholder="175" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Weight (kg)</label>
                    <input type="number" value={bodyProfile.weight} onChange={(e) => setBodyProfile({ ...bodyProfile, weight: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none" placeholder="70" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Neck (cm)</label>
                    <input type="number" value={bodyProfile.neck} onChange={(e) => setBodyProfile({ ...bodyProfile, neck: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none" placeholder="38" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Waist (cm)</label>
                    <input type="number" value={bodyProfile.waist} onChange={(e) => setBodyProfile({ ...bodyProfile, waist: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none" placeholder="85" />
                  </div>
                </div>

                {bodyProfile.gender === 'female' && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Hip (cm)</label>
                    <input type="number" value={bodyProfile.hip} onChange={(e) => setBodyProfile({ ...bodyProfile, hip: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none" placeholder="95" />
                  </motion.div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="bg-indigo-600 p-8 rounded-2xl text-white shadow-xl shadow-indigo-200 min-h-[240px] flex flex-col justify-center">
                <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4">Estimated Body Fat</h3>
                {typeof bodyFatResult === 'number' ? (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                    <div className="text-6xl font-black">{bodyFatResult.toFixed(1)}%</div>

                    {(() => {
                      const gender = bodyProfile.gender as 'male' | 'female';
                      const maxBf = gender === 'male' ? 35 : 45;
                      const markerPosition = Math.min(Math.max((bodyFatResult / maxBf) * 100, 0), 100);

                      let category = { label: 'Obese / Gemuk', color: 'bg-rose-400', textColor: 'text-rose-600' };
                      if (gender === 'male') {
                        if (bodyFatResult < 6) category = { label: 'Essential / Esensial', color: 'bg-blue-400', textColor: 'text-blue-600' };
                        else if (bodyFatResult < 14) category = { label: 'Athletes / Atletis', color: 'bg-cyan-400', textColor: 'text-cyan-600' };
                        else if (bodyFatResult < 18) category = { label: 'Fit / Bugar', color: 'bg-emerald-400', textColor: 'text-emerald-600' };
                        else if (bodyFatResult < 25) category = { label: 'Average / Normal', color: 'bg-amber-400', textColor: 'text-amber-600' };
                      } else {
                        if (bodyFatResult < 14) category = { label: 'Essential / Esensial', color: 'bg-blue-400', textColor: 'text-blue-600' };
                        else if (bodyFatResult < 21) category = { label: 'Athletes / Atletis', color: 'bg-cyan-400', textColor: 'text-cyan-600' };
                        else if (bodyFatResult < 25) category = { label: 'Fit / Bugar', color: 'bg-emerald-400', textColor: 'text-emerald-600' };
                        else if (bodyFatResult < 32) category = { label: 'Average / Normal', color: 'bg-amber-400', textColor: 'text-amber-600' };
                      }

                      return (
                        <div className="space-y-4">
                          <div className="p-4 bg-white/10 rounded-xl border border-white/10 flex items-center justify-between">
                            <div className="text-sm font-bold">Category:</div>
                            <div className={`px-3 py-1 bg-white ${category.textColor} rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm`}>
                              {category.label}
                            </div>
                          </div>

                          {/* Visual Barometer */}
                          <div className="pt-2 text-white/90">
                            <div className="relative w-full h-3 rounded-full flex overflow-hidden opacity-90">
                              {gender === 'male' ? (
                                <>
                                  <div className="h-full bg-blue-400 w-[17%]" title="Essential (0-6%)" />
                                  <div className="h-full bg-cyan-400 w-[23%]" title="Athletes (6-14%)" />
                                  <div className="h-full bg-emerald-400 w-[11%]" title="Fit (14-18%)" />
                                  <div className="h-full bg-amber-400 w-[20%]" title="Average (18-25%)" />
                                  <div className="h-full bg-rose-400 w-[29%]" title="Obese (25%+)" />
                                </>
                              ) : (
                                <>
                                  <div className="h-full bg-blue-400 w-[31%]" title="Essential (0-14%)" />
                                  <div className="h-full bg-cyan-400 w-[15%]" title="Athletes (14-21%)" />
                                  <div className="h-full bg-emerald-400 w-[9%]" title="Fit (21-25%)" />
                                  <div className="h-full bg-amber-400 w-[15%]" title="Average (25-32%)" />
                                  <div className="h-full bg-rose-400 w-[30%]" title="Obese (32%+)" />
                                </>
                              )}

                            </div>
                            <div className="relative w-full h-8 mt-1">
                              {/* Indicator Marker */}
                              <motion.div
                                className="absolute top-0 -ml-1.5 flex flex-col items-center"
                                initial={{ left: 0 }}
                                animate={{ left: `${markerPosition}%` }}
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.8 }}
                              >
                                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-transparent border-b-white" />
                                <span className="text-[10px] font-bold mt-1 text-white">{bodyFatResult.toFixed(1)}</span>
                              </motion.div>
                            </div>
                            <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest text-white/50 px-1 -mt-2">
                              <span>Low</span>
                              <span>High</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </motion.div>
                ) : bodyFatResult === 'waist_error' ? (
                  <div className="text-white bg-red-500/20 p-4 rounded-xl border border-red-500/30 text-sm">
                    <p className="font-bold mb-1 flex items-center gap-2"><Info size={14} /> Measurement Error</p>
                    <p className="opacity-80">Waist must be larger than neck measurement for calculation to work.</p>
                  </div>
                ) : bodyFatResult === 'invalid' ? (
                  <div className="text-white bg-amber-500/20 p-4 rounded-xl border border-amber-500/30 text-sm">
                    <p className="font-bold mb-1 flex items-center gap-2"><Info size={14} /> Invalid Data</p>
                    <p className="opacity-80">Please check your measurements. The resulting percentage is impossible with these inputs.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-white/40 italic text-sm">Waiting for complete measurements...</div>
                    <div className="flex flex-wrap gap-2">
                      {getMissingFields().map(field => (
                        <span key={field} className="px-2 py-1 bg-white/10 rounded text-[9px] font-bold uppercase tracking-wider">Missing: {field}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 bg-white border border-slate-200 rounded-2xl space-y-4">
                <h4 className="font-bold text-slate-900 flex items-center gap-2"><Info size={16} className="text-indigo-500" /> Measurement Tips</h4>
                <ul className="text-xs text-slate-500 space-y-3">
                  <li className="flex gap-2"><span>•</span> Waist: Measure at the navel for men, and at the narrowest point for women.</li>
                  <li className="flex gap-2"><span>•</span> Neck: Measure below the larynx, with the tape sloping slightly downward to the front.</li>
                  <li className="flex gap-2"><span>•</span> Hip (Women): Measure at the widest part of the buttocks.</li>
                  <li className="flex gap-2 font-bold text-indigo-600"><span>•</span> Accuracy ensures better progress tracking!</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
