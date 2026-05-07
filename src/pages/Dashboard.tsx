import React from 'react';
import { motion } from 'motion/react';
import { ReceiptText, FileText, ArrowUpRight, Wallet, PieChart, Clock, Apple, Zap, Briefcase, Building, ChevronRight, Dumbbell, Bike, AlertTriangle, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { Expense, Note, NutritionEntry, JobApplication, WorkoutEntry, VehicleState } from '../types';

const BentoCard = ({
  children,
  className,
  title,
  subtitle,
  icon: Icon,
  to,
  badge
}: {
  children?: React.ReactNode;
  className?: string;
  title: string;
  subtitle: string;
  icon: any;
  to?: string;
  badge?: string;
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
              <Icon size={16} className="text-slate-600" />
              {title}
              {badge && (
                <span className="px-2 py-0.5 bg-blue-50 text-[10px] font-bold text-blue-600 rounded-full border border-blue-100">
                  {badge}
                </span>
              )}
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
        </div>
        {to && <div className="text-blue-600 text-xs font-semibold group-hover:underline">View All</div>}
      </div>

      <div className="flex-1 z-10">
        {children}
      </div>
    </CardWrapper>
  );
};

export default function Dashboard({ expenses, notes, nutrition, jobs = [], workouts = [], vehicle }: { expenses: Expense[], notes: Note[], nutrition: NutritionEntry[], jobs: JobApplication[], workouts?: WorkoutEntry[], vehicle?: VehicleState }) {
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
                return (
                  <div key={i} className="w-8 bg-blue-600 rounded-t-lg relative group/bar" style={{ height: `${Math.max(h, 5)}%` }}>
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
          className="md:row-span-2"
        >
          <div className="flex flex-col gap-6 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer group/doc">
                <div className="text-xl mb-2">📄</div>
                <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600">Documents</div>
                <div className="text-[10px] text-slate-500 font-medium">{notes.filter(n => n.type === 'document').length} files</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer group/doc">
                <div className="text-xl mb-2">📝</div>
                <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600">Notes</div>
                <div className="text-[10px] text-slate-500 font-medium">{notes.filter(n => n.type === 'note').length} entries</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Recent Notes</div>
              {recentNotes.map((note, i) => (
                <div key={i} className={cn(
                  "p-4 rounded-xl border flex flex-col gap-1 transition-transform hover:scale-[1.01] cursor-pointer",
                  note.type === 'document' ? "bg-blue-50 border-blue-100 text-blue-900" : "bg-amber-50 border-amber-100 text-amber-900"
                )}>
                  <div className="text-sm font-bold">{note.title}</div>
                  <div className="text-[11px] opacity-80 line-clamp-2 leading-relaxed">{note.content || 'Empty note...'}</div>
                </div>
              ))}
              {recentNotes.length === 0 && (
                <div className="text-center py-4 text-slate-400 text-xs font-medium border border-dashed rounded-xl">No documents yet</div>
              )}
            </div>

            <button className="mt-auto w-full p-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-semibold hover:border-blue-400 hover:text-blue-600 transition-all">
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
          className="md:col-span-2"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-2">
            <div className="flex flex-row md:flex-col justify-between md:justify-center items-center p-5 md:p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
              <div className="flex items-center gap-3 md:flex-col md:gap-0">
                <Zap className="text-emerald-500 md:mb-2" size={24} />
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest md:hidden">Today's kcal</div>
              </div>
              <div className="text-right md:text-center">
                <div className="text-3xl font-black text-slate-900">{dailyCalories}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:block">Today's kcal</div>
              </div>
            </div>

            <div className="md:col-span-3 grid grid-cols-2 gap-3">
              <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                <div className="text-[9px] uppercase font-bold text-slate-400 mb-1">Sugar</div>
                <div className="text-sm font-bold text-slate-900">{dailySugar}g</div>
                <div className="w-full h-1 bg-slate-100 rounded-full mt-2">
                  <div className="h-full bg-rose-400 rounded-full" style={{ width: `${Math.min((dailySugar / 50) * 100, 100)}%` }} />
                </div>
              </div>
              <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                <div className="text-[9px] uppercase font-bold text-slate-400 mb-1">Prot.</div>
                <div className="text-sm font-bold text-slate-900">{todayNutrition.reduce((sum, n) => sum + n.protein, 0)}g</div>
                <div className="w-full h-1 bg-slate-100 rounded-full mt-2">
                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min((todayNutrition.reduce((sum, n) => sum + n.protein, 0) / 60) * 100, 100)}%` }} />
                </div>
              </div>
              <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                <div className="text-[9px] uppercase font-bold text-slate-400 mb-1">Fat</div>
                <div className="text-sm font-bold text-slate-900">{todayNutrition.reduce((sum, n) => sum + (n.fat || 0), 0)}g</div>
                <div className="w-full h-1 bg-slate-100 rounded-full mt-2">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min((todayNutrition.reduce((sum, n) => sum + (n.fat || 0), 0) / 70) * 100, 100)}%` }} />
                </div>
              </div>
              <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                <div className="text-[9px] uppercase font-bold text-slate-400 mb-1">Carbs</div>
                <div className="text-sm font-bold text-slate-900">{dailyCarbs}g</div>
                <div className="w-full h-1 bg-slate-100 rounded-full mt-2">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.min((dailyCarbs / 250) * 100, 100)}%` }} />
                </div>
              </div>

              <div className="col-span-2 mt-2">
                <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider mb-3">Recent Meals</div>
                <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                  {todayNutrition.slice(0, 4).map((entry, i) => (
                    <div key={i} className="shrink-0 px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg flex items-center gap-3">
                      <div className={cn("w-2 h-2 rounded-full", entry.type === 'food' ? "bg-emerald-500" : "bg-blue-500")} />
                      <span className="text-xs font-bold text-slate-700">{entry.name}</span>
                      <span className="text-xs font-medium text-slate-400">{entry.calories} kcal</span>
                    </div>
                  ))}
                  {todayNutrition.length === 0 && (
                    <div className="text-[11px] text-slate-400 font-medium italic">No entries logged yet for today.</div>
                  )}
                </div>
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
          className="md:col-span-2"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-2">
            <div className="p-5 md:p-6 bg-blue-50 rounded-2xl border border-blue-100 flex flex-col justify-center items-center text-center">
              <div className="text-3xl font-black text-blue-600">{jobs.length}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Apps</div>
            </div>

            <div className="md:col-span-3 flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm text-center">
                  <div className="text-lg font-bold text-blue-600">{jobs.filter(j => ['Applied', 'Screening', 'Interviewing', 'Technical'].includes(j.status)).length}</div>
                  <div className="text-[9px] uppercase font-bold text-slate-400">Active</div>
                </div>
                <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm text-center">
                  <div className="text-lg font-bold text-emerald-600">{jobs.filter(j => j.status === 'Offer').length}</div>
                  <div className="text-[9px] uppercase font-bold text-slate-400">Offers</div>
                </div>
                <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm text-center">
                  <div className="text-lg font-bold text-rose-600">{jobs.filter(j => ['Rejected', 'Withdrawn'].includes(j.status)).length}</div>
                  <div className="text-[9px] uppercase font-bold text-slate-400">Closed</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Active Pipeline</div>
                <div className="flex flex-col gap-2">
                  {jobs.slice(0, 2).map((job, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl group/job cursor-pointer hover:bg-white transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400">
                          <Building size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-900">{job.position}</span>
                          <span className="text-[10px] text-slate-500">{job.company} • {job.status}</span>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 group-hover/job:text-blue-500 group-hover/job:translate-x-1 transition-all" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </BentoCard>
        {/* App 5: Gym Tracker Widget */}
        <BentoCard
          title="Gym Tracker"
          subtitle="Recent PRs & Lifts"
          icon={Dumbbell}
          to="/workouts"
        >
          <div className="flex flex-col h-full justify-center">
            {workouts && workouts.length > 0 ? (
              <div className="space-y-2 mt-2">
                {Array.from(new Map(workouts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(item => [item.exerciseName, item])).values()).slice(0, 3).map((w: any, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="font-bold text-sm text-slate-700 truncate pr-2">{w.exerciseName}</div>
                    <div className="flex flex-col items-end shrink-0">
                      <div className="font-black text-indigo-600">
                        {w.setsCollection && w.setsCollection.length > 0 ? Math.max(...w.setsCollection.map((s: any) => s.weight)) : w.weight}
                        <span className="text-[10px] text-indigo-400">kg</span>
                      </div>
                      <div className="text-[10px] font-bold text-slate-400">
                        {w.setsCollection ? `${w.setsCollection.length} sets` : `${w.sets}x${w.reps}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-4">
                <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                  <Dumbbell className="text-slate-300" size={16} />
                </div>
                <div className="text-xs font-bold text-slate-500 mb-1">No Workouts</div>
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
        >
          <div className="flex flex-col gap-4 mt-2 h-full justify-center">
            {vehicle ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                    <div className="text-[9px] uppercase font-bold text-slate-400 mb-1">Current Odo</div>
                    <div className="text-[13px] md:text-sm font-bold text-slate-900 truncate">
                      {vehicle.currentOdo.toLocaleString()} <span className="text-[10px] text-slate-500 font-medium">km</span>
                    </div>
                  </div>
                  <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                    <div className="text-[9px] uppercase font-bold text-slate-400 mb-1">Status</div>
                    <div className={cn("text-[13px] md:text-sm font-bold truncate", needsAttentionParts.length > 0 ? "text-rose-600" : "text-emerald-600")}>
                      {needsAttentionParts.length > 0 ? `${needsAttentionParts.length} Alerts` : 'All Good'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mt-1">
                  {needsAttentionParts.slice(0, 3).map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-rose-50 border border-rose-100 rounded-xl group hover:bg-rose-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <AlertTriangle size={14} className="text-rose-500" />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-rose-900 truncate">{p.name}</span>
                          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">{p.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {needsAttentionParts.length === 0 && (
                    <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                      <div className="text-sm font-bold text-emerald-900">Vehicle is in great condition</div>
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Wrench size={14} className="text-emerald-600" />
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-4 text-center">
                <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                  <Bike className="text-slate-300" size={16} />
                </div>
                <div className="text-xs font-bold text-slate-500 mb-1">No Vehicle Data</div>
                <div className="text-[10px] text-slate-400">Add distance to start tracking</div>
              </div>
            )}
          </div>
        </BentoCard>

      </div>
    </div>
  );
}

