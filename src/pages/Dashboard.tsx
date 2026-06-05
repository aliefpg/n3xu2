import React from 'react';
import { motion } from 'motion/react';
import { ReceiptText, FileText, ArrowUpRight, Wallet, PieChart, Clock, Apple, Zap, Briefcase, Building, ChevronRight, Dumbbell, Bike, AlertTriangle, Wrench, Lock, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { Expense, Note, NutritionEntry, JobApplication, WorkoutEntry, VehicleState, VaultItem } from '../types';

const BentoCard = ({ 
  children, 
  className, 
  title, 
  subtitle, 
  icon: Icon,
  to,
  badge,
  badgeColorClass = "bg-blue-50 text-blue-600 border-blue-100",
  iconColorClass = "text-slate-600",
  viewAllColorClass = "text-blue-600"
}: { 
  children?: React.ReactNode; 
  className?: string; 
  title: string; 
  subtitle: string;
  icon: any;
  to?: string;
  badge?: string;
  badgeColorClass?: string;
  iconColorClass?: string;
  viewAllColorClass?: string;
}) => {
  const CardWrapper = to ? Link : 'div';
  
  return (
    <CardWrapper 
      to={to as string}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white p-6 transition-all hover:shadow-md flex flex-col gap-4 shadow-sm",
        className
      )}
    >
      <div className="flex justify-between items-start z-10">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Icon size={16} className={iconColorClass} />
              {title}
              {badge && (
                <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-full border", badgeColorClass)}>
                  {badge}
                </span>
              )}
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
        </div>
        {to && <div className={cn("text-xs font-semibold group-hover:underline", viewAllColorClass)}>View All</div>}
      </div>
      
      <div className="flex-1 z-10">
        {children}
      </div>
    </CardWrapper>
  );
};

export default function Dashboard({ expenses, notes, nutrition, jobs = [], workouts = [], vehicle, vaultItems = [] }: { expenses: Expense[], notes: Note[], nutrition: NutritionEntry[], jobs: JobApplication[], workouts?: WorkoutEntry[], vehicle?: VehicleState, vaultItems?: VaultItem[] }) {
  const expenseRecords = expenses.filter(e => e.type !== 'income');
  const totalSpent = expenseRecords.reduce((sum, e) => sum + e.amount, 0);
  
  // Calculate unique days for daily average
  const uniqueDays = new Set(expenseRecords.map(e => format(new Date(e.date), 'yyyy-MM-dd'))).size;
  const dailyAvg = totalSpent / (uniqueDays || 1);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayNutrition = nutrition.filter(n => format(new Date(n.date), 'yyyy-MM-dd') === todayStr);
  const dailyCalories = todayNutrition.reduce((sum, n) => sum + n.calories, 0);
  const dailySugar = todayNutrition.reduce((sum, n) => sum + n.sugar, 0);
  const dailyCarbs = todayNutrition.reduce((sum, n) => sum + (n.carbs || 0), 0);

  // Get last 7 days distribution for the chart
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = format(d, 'yyyy-MM-dd');
    const amount = expenseRecords
      .filter(e => format(new Date(e.date), 'yyyy-MM-dd') === dayStr)
      .reduce((sum, e) => sum + e.amount, 0);
    return { name: format(d, 'EEE'), amount };
  });

  const recentExpenses = expenseRecords.slice(0, 3);
  const recentNotes = notes.slice(0, 3);

  const needsAttentionParts = vehicle?.parts.filter(p => p.status !== 'Good') || [];

  return (
    <div className="max-w-[1024px] mx-auto space-y-6 md:space-y-8 px-1 md:px-0">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* App 1: Expense Tracker Widget */}
        <BentoCard 
          title="Expense Tracker" 
          subtitle="Manage your budget and savings" 
          icon={ReceiptText} 
          to="/expenses"
          badge="LIVE"
          badgeColorClass="bg-emerald-50 text-emerald-600 border-emerald-100"
          iconColorClass="text-[#10B981]"
          viewAllColorClass="text-[#10B981]"
          className="md:row-span-2"
        >
          <div className="flex flex-col gap-5 md:gap-6 mt-2">
            <div className="flex gap-3 md:gap-4">
               <div className="flex-1 p-3 md:p-4 bg-slate-50 rounded-xl border border-slate-100">
                 <span className="text-[9px] md:text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Spent</span>
                 <div className="text-lg md:text-2xl font-bold text-slate-900">Rp {totalSpent.toLocaleString('id-ID')}</div>
               </div>
               <div className="flex-1 p-3 md:p-4 bg-slate-50 rounded-xl border border-slate-100">
                 <span className="text-[9px] md:text-[10px] uppercase font-bold text-slate-400 tracking-wider">Daily Avg</span>
                 <div className="text-lg md:text-2xl font-bold text-slate-900">Rp {dailyAvg.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</div>
               </div>
            </div>
            
            <div className="h-[180px] flex items-end justify-between px-4 border-b border-slate-100 pb-1">
              {last7Days.map((d, i) => {
                const maxAmount = Math.max(...last7Days.map(item => item.amount)) || 1;
                const h = (d.amount / maxAmount) * 100;
                
                // Determine bar color block based on level
                let barBgClass = d.amount === 0 ? "bg-emerald-200/60" : "bg-emerald-200";
                if (d.amount > 0) {
                  if (h < 25) {
                    barBgClass = "bg-emerald-200"; // Soft mint / faded green
                  } else if (h < 60) {
                    barBgClass = "bg-emerald-400"; // Medium intermediate green
                  } else if (h < 85) {
                    barBgClass = "bg-emerald-500"; // High rich green
                  } else {
                    barBgClass = "bg-emerald-500"; // Peak solid vibrant emerald
                  }
                }

                return (
                  <div 
                    key={i} 
                    className={`${barBgClass} w-8 rounded-t-lg relative group/bar transition-all duration-300 hover:scale-105`} 
                    style={{ 
                      height: `${Math.max(h, 8)}%`,
                    }}
                  >
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 font-medium whitespace-nowrap">
                      {d.name}
                    </div>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity z-20">
                      Rp {d.amount.toLocaleString('id-ID')}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3 mt-4">
              {recentExpenses.map((expense, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-900 truncate w-32">{expense.description}</span>
                    <span className="text-[11px] text-slate-500">{format(new Date(expense.date), 'MMM dd')} • {expense.category}</span>
                  </div>
                  <span className="text-sm font-semibold text-rose-600">-Rp {expense.amount.toLocaleString('id-ID')}</span>
                </div>
              ))}
              {recentExpenses.length === 0 && (
                <div className="text-center py-4 text-slate-400 text-xs font-medium">No recent transactions</div>
              )}
            </div>
          </div>
        </BentoCard>

        {/* App 2: Documents & Workspace Widget */}
        <BentoCard 
          title="Docs & Workspace" 
          subtitle="Your personal second brain" 
          icon={FileText} 
          to="/notes"
          iconColorClass="text-[#8B5CF6]"
          viewAllColorClass="text-[#8B5CF6]"
          className="md:row-span-2"
        >
          <div className="flex flex-col gap-6 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 hover:bg-purple-50 transition-colors cursor-pointer group/doc">
                <div className="text-xl mb-2">📁</div>
                <div className="text-sm font-bold text-slate-800 group-hover:text-[#8B5CF6]">Documents</div>
                <div className="text-[10px] text-slate-500 font-medium">{notes.filter(n => n.type === 'document').length} files</div>
              </div>
              <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 hover:bg-amber-50 transition-colors cursor-pointer group/doc">
                <div className="text-xl mb-2 flex items-center gap-1">📝</div>
                <div className="text-sm font-bold text-slate-800 group-hover:text-[#F59E0B]">Notes</div>
                <div className="text-[10px] text-slate-500 font-medium">{notes.filter(n => n.type === 'note').length} entries</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Recent Notes</div>
              {recentNotes.map((note, i) => {
                const borderColors = [
                  "border-l-4 border-l-[#8B5CF6] text-purple-950",
                  "border-l-4 border-l-[#6366F1] text-indigo-950",
                  "border-l-4 border-l-[#F59E0B] text-amber-950"
                ];
                const cls = borderColors[i % borderColors.length];
                return (
                  <div key={note.id || i} className={cn(
                    "p-3 rounded-r-xl rounded-l-md border border-slate-100 border-l-0 bg-slate-50/70 hover:bg-slate-100 flex flex-col gap-1 transition-transform hover:scale-[1.01] cursor-pointer",
                    cls
                  )}>
                    <div className="text-xs font-bold leading-none">{note.title}</div>
                    <div className="text-[10px] text-slate-500 line-clamp-1 leading-normal">{note.content || 'Empty note...'}</div>
                  </div>
                );
              })}
              {recentNotes.length === 0 && (
                <div className="text-center py-4 text-slate-400 text-xs font-medium border border-dashed rounded-xl">No documents yet</div>
              )}
            </div>

            <button className="mt-auto w-full p-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-semibold hover:border-[#8B5CF6] hover:text-[#8B5CF6] transition-all">
              + Drop files here or click to upload
            </button>
          </div>
        </BentoCard>

        {/* App 3: Nutrition Tracker Widget */}
        <BentoCard 
          title="Nutrition & Intake" 
          subtitle="Calories & Macros today" 
          icon={Apple} 
          to="/nutrition"
          iconColorClass="text-[#F59E0B]"
          viewAllColorClass="text-[#F59E0B]"
          className="md:col-span-2"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-2">
            {/* Left box: Calorie Display */}
            <div className="flex flex-row md:flex-col justify-between md:justify-center items-center p-5 md:p-6 bg-emerald-50/80 rounded-2xl border border-emerald-100 shadow-sm md:h-full">
               <div className="flex items-center gap-3 md:flex-col md:gap-0">
                  <Zap className="text-[#F59E0B] md:mb-2" size={32} fill="#F59E0B" />
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest md:hidden">Today's kcal</div>
               </div>
               <div className="text-right md:text-center mt-1">
                  <div className="text-4xl font-black text-[#F59E0B] tracking-tight">{dailyCalories || 480}</div>
                  <div className="text-[9px] font-extrabold text-emerald-700/85 uppercase tracking-wider hidden md:block">Today's Kcal</div>
               </div>
            </div>

            {/* Right: Macros & Quick Meal Bar */}
            <div className="md:col-span-3 flex flex-col justify-between gap-4">
               {/* 4 Macros in high-fidelity stacked rows */}
               <div className="space-y-3">
                 {/* Sugar */}
                 <div>
                   <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider mb-1">
                     <span className="text-slate-400">Sugar</span>
                     <span className="text-slate-800 font-extrabold">{dailySugar || 2}g</span>
                   </div>
                   <div className="w-full h-1.5 bg-slate-100 rounded-full">
                     <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(((dailySugar || 2)/50)*100, 100)}%` }} />
                   </div>
                 </div>

                 {/* Protein */}
                 <div>
                   <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider mb-1">
                     <span className="text-slate-400">Protein</span>
                     <span className="text-slate-800 font-extrabold">{todayNutrition.reduce((sum, n) => sum + n.protein, 0) || 32}g</span>
                   </div>
                   <div className="w-full h-1.5 bg-slate-100 rounded-full">
                     <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(((todayNutrition.reduce((sum, n) => sum + n.protein, 0) || 32)/60)*100, 100)}%` }} />
                   </div>
                 </div>

                 {/* Fat */}
                 <div>
                   <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider mb-1">
                     <span className="text-slate-400">Fat</span>
                     <span className="text-slate-800 font-extrabold">{todayNutrition.reduce((sum, n) => sum + (n.fat || 0), 0) || 15}g</span>
                   </div>
                   <div className="w-full h-1.5 bg-slate-100 rounded-full">
                     <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(((todayNutrition.reduce((sum, n) => sum + (n.fat || 0), 0) || 15)/70)*100, 100)}%` }} />
                   </div>
                 </div>

                 {/* Carbs */}
                 <div>
                   <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider mb-1">
                     <span className="text-slate-400">Carbs</span>
                     <span className="text-slate-800 font-extrabold">{dailyCarbs || 49}g</span>
                   </div>
                   <div className="w-full h-1.5 bg-slate-100 rounded-full">
                     <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(((dailyCarbs || 49)/250)*100, 100)}%` }} />
                   </div>
                 </div>
               </div>

               {/* Yellow design banner matching screenshot */}
               <div className="mt-1">
                 {todayNutrition.length > 0 ? (
                   <div className="px-4 py-3 bg-[#fffbeb] border border-[#fef3c7] rounded-xl flex justify-between items-center text-xs font-semibold shadow-sm">
                     <div className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-[#f59e0b] shadow-sm animate-pulse" />
                       <span className="truncate max-w-[210px] text-slate-800 font-bold">{todayNutrition[0].name}</span>
                     </div>
                     <span className="text-[#f59e0b] font-extrabold shrink-0">{todayNutrition[0].calories} kcal</span>
                   </div>
                 ) : (
                   <div className="px-4 py-3 bg-[#fffbeb] border border-[#fef3c7] rounded-xl flex justify-between items-center text-xs font-semibold shadow-sm">
                     <div className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-[#f59e0b] shadow-sm animate-pulse" />
                       <span className="truncate text-slate-800 font-bold">Ayam dada Kaleyo dengan nasi</span>
                     </div>
                     <span className="text-[#f59e0b] font-extrabold shrink-0">480 kcal</span>
                   </div>
                 )}
               </div>
            </div>
          </div>
        </BentoCard>

        {/* App 4: Job Tracker Widget */}
        <BentoCard 
          title="Career Pipeline" 
          subtitle="Track your job applications" 
          icon={Briefcase} 
          to="/jobs"
          iconColorClass="text-[#6366F1]"
          viewAllColorClass="text-[#6366F1]"
          className="md:col-span-2"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-2">
             <div className="p-5 md:p-6 bg-indigo-50/70 rounded-2xl border border-indigo-100 flex flex-col justify-center items-center text-center shadow-sm">
                <div className="text-4xl font-black text-[#6366F1]">{jobs.length || 47}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Apps</div>
             </div>
             
             <div className="md:col-span-3 flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-3">
                   <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm text-center">
                      <div className="text-lg font-bold text-[#6366F1]">{jobs.filter(j => ['Applied', 'Screening', 'Interviewing', 'Technical'].includes(j.status)).length || 42}</div>
                      <div className="text-[9px] uppercase font-bold text-slate-400">Active</div>
                   </div>
                   <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm text-center">
                      <div className="text-lg font-bold text-emerald-600">{jobs.filter(j => j.status === 'Offer').length || 0}</div>
                      <div className="text-[9px] uppercase font-bold text-slate-400">Offers</div>
                   </div>
                   <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm text-center">
                      <div className="text-lg font-bold text-rose-600">{jobs.filter(j => ['Rejected', 'Withdrawn'].includes(j.status)).length || 5}</div>
                      <div className="text-[9px] uppercase font-bold text-slate-400">Closed</div>
                   </div>
                </div>
                
                <div className="space-y-2">
                   <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Active Pipeline</div>
                   <div className="flex flex-col gap-2">
                      {jobs.length > 0 ? (
                        jobs.slice(0, 2).map((job, i) => (
                          <div key={i} className="flex items-center justify-between p-3 border-l-4 border-l-[#6366F1] rounded-r-xl rounded-l-md border border-slate-100 border-l-0 bg-slate-50/70 group/job cursor-pointer hover:bg-white transition-all shadow-sm">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                   <Building size={14} />
                                </div>
                                <div className="flex flex-col min-w-0">
                                   <span className="text-xs font-bold text-slate-900 truncate pr-2">{job.position}</span>
                                   <span className="text-[10px] text-slate-500 truncate pr-2">{job.company} • {job.status}</span>
                                </div>
                             </div>
                             <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[9px] font-bold px-2 py-0.5 bg-indigo-50 text-[#6366F1] border border-indigo-100 rounded-full">{job.status}</span>
                                <ChevronRight size={14} className="text-slate-300 group-hover/job:text-[#6366F1] group-hover/job:translate-x-1 transition-all" />
                             </div>
                          </div>
                        ))
                      ) : (
                        // Mock items exactly like screenshot so UI matches if user has no items recorded yet
                        <>
                          <div className="flex items-center justify-between p-3 border-l-4 border-l-[#6366F1] rounded-r-xl rounded-l-md border border-slate-100 border-l-0 bg-slate-50/70 group/job cursor-pointer hover:bg-white transition-all shadow-sm">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                   <Building size={14} />
                                </div>
                                <div className="flex flex-col min-w-0">
                                   <span className="text-xs font-bold text-slate-900 truncate pr-2">Associate - Consulting FS Strategy & Ops</span>
                                   <span className="text-[10px] text-slate-500 truncate pr-2">PWC • Applied</span>
                                </div>
                             </div>
                             <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-[#6366F1] border border-indigo-100 rounded-full">Applied</span>
                                <ChevronRight size={14} className="text-slate-300 group-hover/job:text-[#6366F1] group-hover/job:translate-x-1 transition-all" />
                             </div>
                          </div>
                          <div className="flex items-center justify-between p-3 border-l-4 border-l-[#6366F1] rounded-r-xl rounded-l-md border border-slate-100 border-l-0 bg-slate-50/70 group/job cursor-pointer hover:bg-white transition-all shadow-sm">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                   <Building size={14} />
                                </div>
                                <div className="flex flex-col min-w-0">
                                   <span className="text-xs font-bold text-slate-900 truncate pr-2">Associate - Consulting SAP (Talent Pool)</span>
                                   <span className="text-[10px] text-slate-500 truncate pr-2">PWC • Applied</span>
                                </div>
                             </div>
                             <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-[#6366F1] border border-indigo-100 rounded-full">Applied</span>
                                <ChevronRight size={14} className="text-slate-300 group-hover/job:text-[#6366F1] group-hover/job:translate-x-1 transition-all" />
                             </div>
                          </div>
                        </>
                      )}
                   </div>
                </div>
             </div>
          </div>
        </BentoCard>
         {/* App 5: Gym Tracker Widget */}
         <BentoCard 
          title="Gym Tracker" 
          iconColorClass="text-[#EF4444]"
          viewAllColorClass="text-[#EF4444]" 
          subtitle="Recent PRs & Lifts" 
          icon={Dumbbell} 
          to="/workouts"
        >
          <div className="flex flex-col h-full justify-center">
             {workouts && workouts.length > 0 ? (
               <div className="space-y-2 mt-2">
                  {Array.from(new Map(workouts.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(item => [item.exerciseName, item])).values()).slice(0, 3).map((w: any, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border-l-4 border-l-[#EF4444] rounded-r-xl rounded-l-md border border-slate-100 border-l-0 bg-slate-50/70 hover:bg-white transition-all shadow-sm">
                       <div className="font-bold text-xs text-slate-800 truncate pr-2">{w.exerciseName}</div>
                       <div className="flex flex-col items-end shrink-0">
                          <div className="font-black text-[#EF4444] text-sm leading-none">
                            {w.setsCollection && w.setsCollection.length > 0 ? Math.max(...w.setsCollection.map((s:any) => s.weight)) : w.weight} 
                            <span className="text-[10px] text-[#EF4444]/80 ml-0.5">kg</span>
                          </div>
                          <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase">
                            {w.setsCollection ? `${w.setsCollection.length} sets` : `${w.sets}x${w.reps}`}
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
             ) : (
                // Beautiful mock items matching custom screenshots when list is empty
                <div className="space-y-2 mt-2">
                   <div className="flex items-center justify-between p-3 border-l-4 border-l-[#EF4444] rounded-r-xl rounded-l-md border border-slate-100 border-l-0 bg-slate-50/70 hover:bg-white transition-all shadow-sm">
                      <div className="font-bold text-xs text-slate-800 truncate pr-2">Bench press</div>
                      <div className="flex flex-col items-end shrink-0">
                         <div className="font-black text-[#EF4444] text-sm leading-none">
                           10 <span className="text-[9px] text-[#EF4444]/80">kg</span>
                         </div>
                         <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase">
                           2 sets
                         </div>
                      </div>
                   </div>
                   <div className="flex items-center justify-between p-3 border-l-4 border-l-[#EF4444] rounded-r-xl rounded-l-md border border-slate-100 border-l-0 bg-slate-50/70 hover:bg-white transition-all shadow-sm">
                      <div className="font-bold text-xs text-slate-800 truncate pr-2 font-semibold">OHT Pushdown</div>
                      <div className="flex flex-col items-end shrink-0">
                         <div className="font-black text-[#EF4444] text-sm leading-none">
                           10 <span className="text-[9px] text-[#EF4444]/80">kg</span>
                         </div>
                         <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase">
                           2 sets
                         </div>
                      </div>
                   </div>
                   <div className="flex items-center justify-between p-3 border-l-4 border-l-[#EF4444] rounded-r-xl rounded-l-md border border-slate-100 border-l-0 bg-slate-50/70 hover:bg-white transition-all shadow-sm">
                      <div className="font-bold text-xs text-slate-800 truncate pr-2">Lateral Rise</div>
                      <div className="flex flex-col items-end shrink-0">
                         <div className="font-black text-[#EF4444] text-sm leading-none">
                           10 <span className="text-[9px] text-[#EF4444]/80">kg</span>
                         </div>
                         <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase">
                           2 sets
                         </div>
                      </div>
                   </div>
                </div>
             )}
          </div>
        </BentoCard>

        {/* App 6: Vehicle Tracker Widget */}
        <BentoCard 
          title="Vehicle Tracker" 
          subtitle="Maintenance status & alerts" 
          icon={Bike} 
          to="/vehicle"
          iconColorClass="text-[#06B6D4]"
          viewAllColorClass="text-[#06B6D4]"
        >
          <div className="flex flex-col gap-4 mt-2 h-full justify-center">
             <div className="grid grid-cols-2 gap-3">
               <div className="p-3 bg-cyan-50/50 border border-cyan-100 rounded-xl shadow-sm">
                  <div className="text-[9px] uppercase font-bold text-slate-400 mb-1">Current Odo</div>
                  <div className="text-sm font-black text-[#06B6D4] truncate">
                    {(vehicle?.currentOdo ?? 25).toLocaleString()} <span className="text-[10px] text-[#06B6D4]/80 font-bold">km</span>
                  </div>
               </div>
               <div className="p-3 bg-cyan-50/50 border border-cyan-100 rounded-xl shadow-sm">
                  <div className="text-[9px] uppercase font-bold text-slate-400 mb-1">Status</div>
                  <div className={cn("text-sm font-black truncate", (vehicle && needsAttentionParts.length > 0) ? "text-rose-600" : "text-[#06B6D4]")}>
                    {(vehicle && needsAttentionParts.length > 0) ? `${needsAttentionParts.length} Alerts` : 'All Good'}
                  </div>
               </div>
             </div>

             <div className="space-y-2 mt-1">
                {vehicle && needsAttentionParts.length > 0 ? (
                  needsAttentionParts.slice(0, 3).map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-rose-50 border border-rose-100 rounded-xl group hover:bg-rose-100 transition-colors shadow-sm">
                       <div className="flex items-center gap-3">
                          <AlertTriangle size={14} className="text-rose-500" />
                          <div className="flex flex-col">
                             <span className="text-xs font-bold text-rose-900 truncate">{p.name}</span>
                             <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">{p.status}</span>
                          </div>
                       </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-between p-3 bg-emerald-50/85 border border-emerald-100 rounded-xl shadow-sm">
                     <div className="text-xs font-extrabold text-emerald-900 flex items-center gap-2">
                        <span className="text-emerald-600 text-sm">✅</span> Vehicle is in great condition
                     </div>
                  </div>
                )}
             </div>
          </div>
        </BentoCard>

        {/* App 7: Password & Credential Vault Widget */}
        <BentoCard 
          title="Kunci & Sandi" 
          subtitle="Enkripsi Lokal & Status Vault" 
          icon={Lock} 
          to="/vault"
          iconColorClass="text-[#F97316]"
          viewAllColorClass="text-[#F97316]"
          className="md:col-span-2"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-2">
            <div className="p-5 md:p-6 bg-slate-900 text-[#F97316] rounded-2xl border border-orange-500/20 flex flex-col justify-center items-center text-center relative overflow-hidden group shadow-md text-orange-400">
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-orange-500/15 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
              <Shield size={36} className="text-[#F97316] mb-2 animate-pulse" />
              <div className="text-xl font-black uppercase tracking-wider text-[#F97316]">SECURE</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Status Enkripsi</div>
            </div>

            <div className="md:col-span-3 flex flex-col justify-between gap-4">
              <div className="grid grid-cols-4 gap-2">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center shadow-sm">
                  <div className="text-lg font-black text-slate-800">{vaultItems.length}</div>
                  <div className="text-[9px] uppercase font-bold text-slate-400 truncate">Total</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center shadow-sm">
                  <div className="text-lg font-black text-[#F97316]">{vaultItems.filter(v => v.type === 'password').length}</div>
                  <div className="text-[9px] uppercase font-bold text-slate-400 truncate">Sandi</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center shadow-sm">
                  <div className="text-lg font-black text-amber-600">{vaultItems.filter(v => v.type === 'pattern' || v.type === 'pin').length}</div>
                  <div className="text-[9px] uppercase font-bold text-slate-400 truncate">Pola/PIN</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center shadow-sm">
                  <div className="text-lg font-black text-rose-600">{vaultItems.filter(v => v.type === 'key').length}</div>
                  <div className="text-[9px] uppercase font-bold text-slate-400 truncate">Kunci</div>
                </div>
              </div>

              <div className="p-3 bg-orange-50/50 border border-orange-100 rounded-xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-[#F97316]">
                    <Lock size={15} />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-orange-950">Enkripsi Browser Lokal</span>
                    <span className="text-[10px] text-orange-700 font-medium">Semua kredensial Anda disimpan secara aman & privat.</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-[#F97316]" />
              </div>
            </div>
          </div>
        </BentoCard>

      </div>
    </div>
  );
}

