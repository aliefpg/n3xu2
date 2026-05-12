/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutGrid, ReceiptText, FileText, ChevronLeft, Apple, Briefcase, Dumbbell, Bike } from 'lucide-react';
import { cn } from './lib/utils';
import { supabase } from './lib/supabase';
import Dashboard from './pages/Dashboard';
import ExpenseTracker from './pages/ExpenseTracker';
import NotesDoc from './pages/NotesDoc';
import NutritionTracker from './pages/NutritionTracker';
import JobTracker from './pages/JobTracker';
import WorkoutTracker from './pages/WorkoutTracker';
import VehicleTracker from './pages/VehicleTracker';
import { INITIAL_EXPENSES, INITIAL_NOTES, INITIAL_NUTRITION, INITIAL_JOBS, INITIAL_BODY_PROFILE, INITIAL_VEHICLE_STATE } from './mockData';
import { Expense, Note, NutritionEntry, JobApplication, FoodLibraryItem, WorkoutEntry, VehicleState } from './types';

const NavItem = ({ to, icon: Icon, label, active }: { to: string; icon: any; label: string; active: boolean }) => (
  <Link
    to={to}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
      active ? "bg-white/10 text-white font-semibold" : "text-slate-400 hover:text-white hover:bg-white/5"
    )}
  >
    <Icon size={18} />
    <span className="text-sm">{label}</span>
  </Link>
);

import { fetchFromSupabase, syncToSupabase } from './lib/supabaseSync';

function Login({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = import.meta.env.VITE_APP_PASSWORD || 'admin';
    if (password === correctPassword) {
      localStorage.setItem('nexus_auth', 'true');
      onLogin();
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">N</div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">NexusHub</h1>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Enter access password"
            />
          </div>
          {error && <p className="text-rose-500 text-sm">Incorrect password</p>}
          <button type="submit" className="w-full bg-blue-600 text-white font-semibold p-2.5 rounded-lg hover:bg-blue-700 transition-colors">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-[#0f172a] selection:bg-blue-100">
      <div className="relative flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-[240px] bg-[#1e293b] text-white p-6 hidden lg:flex flex-col gap-10 shrink-0 sticky top-0 h-screen overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-lg bg-[#2563eb] flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">N</div>
            <h1 className="text-xl font-bold tracking-tight text-white">NexusHub</h1>
          </div>

          <nav className="flex flex-col gap-1">
            <NavItem to="/" icon={LayoutGrid} label="Dashboard" active={location.pathname === '/'} />
            <NavItem to="/expenses" icon={ReceiptText} label="Expense Tracker" active={location.pathname === '/expenses'} />
            <NavItem to="/notes" icon={FileText} label="Docs & Workspace" active={location.pathname === '/notes'} />
            <NavItem to="/nutrition" icon={Apple} label="Nutrition" active={location.pathname === '/nutrition'} />
            <NavItem to="/workouts" icon={Dumbbell} label="Gym Tracker" active={location.pathname === '/workouts'} />
            <NavItem to="/vehicle" icon={Bike} label="Vehicle" active={location.pathname === '/vehicle'} />
            <NavItem to="/jobs" icon={Briefcase} label="Job Tracker" active={location.pathname === '/jobs'} />
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 min-h-screen relative">
          <header className={cn(
            "h-16 md:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 z-20 transition-all sticky top-0",
          )}>
            <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
              {!isHome && (
                <Link to="/" className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                  <ChevronLeft size={20} />
                </Link>
              )}
              <div className="truncate">
                <h2 className="text-base md:text-xl font-bold text-slate-900 truncate">
                  {location.pathname === '/' ? `Hi, User!` :
                    location.pathname === '/expenses' ? 'Expenses' :
                      location.pathname === '/notes' ? 'Docs' :
                        location.pathname === '/nutrition' ? 'Nutrition' :
                          location.pathname === '/jobs' ? 'Career' : 'Page'}
                </h2>
                {isHome && <p className="text-slate-500 text-[10px] md:text-xs font-medium truncate">Here's your summary today.</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-slate-900">Workspace</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Private</div>
              </div>
              <button
                onClick={async () => {
                  try {
                    await supabase.auth.signOut();
                  } finally {
                    localStorage.removeItem('nexus_auth');
                    window.location.reload();
                  }
                }}
                className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-rose-100 hover:text-rose-600 border border-slate-200 transition-colors shadow-sm"
                title="Logout"
              >
                <span className="text-xs font-bold leading-none origin-center">Log out</span>
              </button>
            </div>
          </header>

          <div className="flex-1 p-2 md:p-8 pb-32 md:pb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-200 px-6 flex items-center justify-between z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] overflow-x-auto custom-scrollbar gap-6">
            <Link to="/" className={cn("flex flex-col items-center gap-1 shrink-0", location.pathname === '/' ? "text-blue-600" : "text-slate-400")}>
              <LayoutGrid size={22} />
              <span className="text-[10px] font-bold">Home</span>
            </Link>
            <Link to="/expenses" className={cn("flex flex-col items-center gap-1 shrink-0", location.pathname === '/expenses' ? "text-blue-600" : "text-slate-400")}>
              <ReceiptText size={22} />
              <span className="text-[10px] font-bold">Money</span>
            </Link>
            <Link to="/notes" className={cn("flex flex-col items-center gap-1 shrink-0", location.pathname === '/notes' ? "text-blue-600" : "text-slate-400")}>
              <FileText size={22} />
              <span className="text-[10px] font-bold">Docs</span>
            </Link>
            <Link to="/nutrition" className={cn("flex flex-col items-center gap-1 shrink-0", location.pathname === '/nutrition' ? "text-blue-600" : "text-slate-400")}>
              <Apple size={22} />
              <span className="text-[10px] font-bold">Diet</span>
            </Link>
            <Link to="/workouts" className={cn("flex flex-col items-center gap-1 shrink-0", location.pathname === '/workouts' ? "text-blue-600" : "text-slate-400")}>
              <Dumbbell size={22} />
              <span className="text-[10px] font-bold">Gym</span>
            </Link>
            <Link to="/vehicle" className={cn("flex flex-col items-center gap-1 shrink-0", location.pathname === '/vehicle' ? "text-blue-600" : "text-slate-400")}>
              <Bike size={22} />
              <span className="text-[10px] font-bold">Vehicle</span>
            </Link>
            <Link to="/jobs" className={cn("flex flex-col items-center gap-1 shrink-0", location.pathname === '/jobs' ? "text-blue-600" : "text-slate-400")}>
              <Briefcase size={22} />
              <span className="text-[10px] font-bold">Career</span>
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('nexus_auth') === 'true';
  });

  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES);
  const [nutrition, setNutrition] = useState<NutritionEntry[]>(INITIAL_NUTRITION);
  const [jobs, setJobs] = useState<JobApplication[]>(INITIAL_JOBS);
  const [customFoodCatalog, setCustomFoodCatalog] = useState<FoodLibraryItem[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [vehicle, setVehicle] = useState<VehicleState>(INITIAL_VEHICLE_STATE);
  const [bodyProfile, setBodyProfile] = useState(INITIAL_BODY_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedFromDb, setHasLoadedFromDb] = useState(false);

  // Load data from Supabase on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const data = await fetchFromSupabase();
        if (data) {
          if (Array.isArray(data.expenses)) setExpenses(data.expenses);
          if (Array.isArray(data.notes)) setNotes(data.notes);
          if (Array.isArray(data.nutrition)) setNutrition(data.nutrition);
          if (Array.isArray(data.jobs)) setJobs(data.jobs);
          if (Array.isArray(data.customFoodCatalog)) setCustomFoodCatalog(data.customFoodCatalog);
          if (Array.isArray(data.workouts)) setWorkouts(data.workouts);
          if (data.vehicle) setVehicle(data.vehicle as any);
          if (data.bodyProfile) setBodyProfile(data.bodyProfile);
          setHasLoadedFromDb(true);
        }
      } catch (error) {
        console.error("Failed to fetch data from Supabase:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  // Save data to Supabase whenever state changes
  useEffect(() => {
    if (isLoading || !hasLoadedFromDb) return; // Don't save initial state or if fetch failed

    const saveData = async () => {
      try {
        await syncToSupabase({
          expenses,
          notes,
          nutrition,
          jobs,
          customFoodCatalog,
          workouts,
          vehicle,
          bodyProfile
        });
      } catch (error) {
        console.error("Failed to save data to Supabase:", error);
      }
    };

    const timeout = setTimeout(saveData, 1000); // 1s debounce
    return () => clearTimeout(timeout);
  }, [expenses, notes, nutrition, jobs, customFoodCatalog, workouts, vehicle, bodyProfile, isLoading]);

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-10 text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h1 className="text-xl font-bold text-slate-800">Loading your Nexus...</h1>
        <p className="text-slate-500 mt-2">Connecting to your local database.</p>
      </div>
    );
  }

  return (
    <Router>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard expenses={expenses} notes={notes} nutrition={nutrition} jobs={jobs} workouts={workouts} vehicle={vehicle} />} />
          <Route
            path="/expenses"
            element={<ExpenseTracker expenses={expenses} setExpenses={setExpenses} />}
          />
          <Route
            path="/notes"
            element={<NotesDoc notes={notes} setNotes={setNotes} />}
          />
          <Route
            path="/nutrition"
            element={<NutritionTracker
              nutrition={nutrition}
              setNutrition={setNutrition}
              customFoodCatalog={customFoodCatalog}
              setCustomFoodCatalog={setCustomFoodCatalog}
              bodyProfile={bodyProfile}
              setBodyProfile={setBodyProfile}
            />}
          />
          <Route
            path="/workouts"
            element={<WorkoutTracker workouts={workouts} setWorkouts={setWorkouts} />}
          />
          <Route
            path="/vehicle"
            element={<VehicleTracker vehicle={vehicle} setVehicle={setVehicle} setExpenses={setExpenses} />}
          />
          <Route
            path="/jobs"
            element={<JobTracker jobs={jobs} setJobs={setJobs} />}
          />
        </Routes>
      </AppLayout>
    </Router>
  );
}

