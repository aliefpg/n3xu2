/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutGrid, ReceiptText, FileText, ChevronLeft, Apple, Briefcase, Dumbbell, Bike, Lock, User, LogOut, X, Menu, Settings, Pin, Sparkles } from 'lucide-react';
import UpdatesModal from './components/UpdatesModal';
import { cn } from './lib/utils';
import { supabase } from './lib/supabase';
import Dashboard from './pages/Dashboard';
import ExpenseTracker from './pages/ExpenseTracker';
import NotesDoc from './pages/NotesDoc';
import NutritionTracker from './pages/NutritionTracker';
import JobTracker from './pages/JobTracker';
import WorkoutTracker from './pages/WorkoutTracker';
import VehicleTracker from './pages/VehicleTracker';
import PasswordVault from './pages/PasswordVault';
import { INITIAL_EXPENSES, INITIAL_NOTES, INITIAL_NUTRITION, INITIAL_JOBS, INITIAL_BODY_PROFILE, INITIAL_VEHICLE_STATE, INITIAL_VAULT_ITEMS } from './mockData';
import { Expense, Note, NutritionEntry, JobApplication, FoodLibraryItem, WorkoutEntry, VehicleState, VaultItem } from './types';

const NavItem = ({ to, icon: Icon, label, active }: { to: string; icon: any; label: string; active: boolean; key?: React.Key }) => (
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
  const [isSignUp, setIsSignUp] = useState(false);
  const [workspaceId, setWorkspaceId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        onLogin();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        onLogin();
      }
    });

    return () => subscription.unsubscribe();
  }, [onLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !password) return;
    
    setError(null);
    setLoading(true);

    if (workspaceId.trim().toLowerCase() === 'alief' && password.trim() === 'alief123') {
      localStorage.setItem('is_dummy_user', 'true');
      onLogin();
      setLoading(false);
      return;
    }

    try {
      const sanitized = workspaceId.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (sanitized.length < 3) {
        throw new Error('Workspace ID must contain at least 3 letters/numbers');
      }
      
      const email = `${sanitized}@nexushub.com`;

      if (isSignUp) {
        const { error: signUpError, data: signUpData } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            throw new Error('Workspace ID already exists. Please log in.');
          }
          throw signUpError;
        }
        
        if (signUpData.user && !signUpData.session) {
          throw new Error('Supabase wajibkan matikan "Confirm email": Buka menu kiri Dasbor Supabase > CONFIGURATION > Sign In / Providers > klik Email > matikan toggle "Confirm email" lalu Save. Setelah itu Log In kembali.');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            throw new Error('Incorrect Workspace ID or password.');
          }
          throw signInError;
        }
      }
      
      // Login success handled by supabase.auth.onAuthStateChange
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Workspace ID</label>
            <input 
              type="text" 
              required
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
              placeholder="e.g. myworkspace"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
              placeholder="Enter your password"
              minLength={6}
            />
          </div>
          {error && <p className="text-rose-500 text-sm">{error}</p>}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white font-semibold p-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? 'Processing...' : (isSignUp ? 'Create Workspace' : 'Enter Workspace')}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-slate-500">
          {isSignUp ? 'Already have a Workspace?' : "Don't have a Workspace?"}{' '}
          <button 
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setError(null); }} 
            className="text-blue-600 font-medium hover:underline"
          >
            {isSignUp ? 'Log In' : 'Create One'}
          </button>
        </div>
      </div>
    </div>
  );
}

const AppLayout = ({ children, onLogout, userName }: { children: React.ReactNode, onLogout: () => Promise<void>, userName: string }) => {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [hasNewUpdate, setHasNewUpdate] = useState(() => {
    return localStorage.getItem('nexus_seen_update_v3.2') !== 'true';
  });

  const handleOpenUpdates = () => {
    setUpdatesOpen(true);
    setHasNewUpdate(false);
    localStorage.setItem('nexus_seen_update_v3.2', 'true');
  };

  // Load modules configuration from localStorage, default is true for all
  const [visibleModules, setVisibleModules] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('visible_modules');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          expenses: parsed.expenses !== false,
          notes: parsed.notes !== false,
          nutrition: parsed.nutrition !== false,
          workouts: parsed.workouts !== false,
          vehicle: parsed.vehicle !== false,
          jobs: parsed.jobs !== false,
          vault: parsed.vault !== false,
        };
      } catch (e) {}
    }
    return {
      expenses: true,
      notes: true,
      nutrition: true,
      workouts: true,
      vehicle: true,
      jobs: true,
      vault: true,
    };
  });

  // Load pinned modules configuration from localStorage, defaults are expenses, notes, vault
  const [pinnedModules, setPinnedModules] = useState<string[]>(() => {
    const saved = localStorage.getItem('pinned_modules');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {}
    }
    return ['expenses', 'notes', 'vault'];
  });

  const toggleModuleVisible = (id: string) => {
    setVisibleModules(prev => {
      const updated = { ...prev, [id]: !prev[id] };
      localStorage.setItem('visible_modules', JSON.stringify(updated));
      return updated;
    });
  };

  const togglePinModule = (id: string) => {
    setPinnedModules(prev => {
      let updated: string[];
      if (prev.includes(id)) {
        updated = prev.filter(x => x !== id);
      } else {
        // Limit to maximum of 3 items in bottom shortcuts. If full, automatically unpin oldest one.
        if (prev.length >= 3) {
          updated = [...prev.slice(1), id];
        } else {
          updated = [...prev, id];
        }
      }
      localStorage.setItem('pinned_modules', JSON.stringify(updated));
      return updated;
    });
  };

  const ALL_MODULES = [
    { id: 'expenses', label: 'Uang', fullLabel: 'Money Tracker (Uang)', path: '/expenses', icon: ReceiptText, desc: 'Catat pengeluaran & pemasukan harian', color: 'emerald', bg: 'bg-emerald-100', text: 'text-emerald-600' },
    { id: 'notes', label: 'Docs', fullLabel: 'Docs Workspace (Catatan)', path: '/notes', icon: FileText, desc: 'Tulis draf catatan & pekerjaan', color: 'purple', bg: 'bg-purple-100', text: 'text-purple-600' },
    { id: 'vault', label: 'Sandi', fullLabel: 'Brankas Sandi (Vault)', path: '/vault', icon: Lock, desc: 'Simpan akun kunci & sandi aman', color: 'amber', bg: 'bg-amber-100', text: 'text-amber-600' },
    { id: 'nutrition', label: 'Diet', fullLabel: 'Nutrisi & Diet (Makan)', path: '/nutrition', icon: Apple, desc: 'Catatan makan & target harian', color: 'red', bg: 'bg-red-100', text: 'text-red-600' },
    { id: 'workouts', label: 'Gym', fullLabel: 'Latihan Gym (Olahraga)', path: '/workouts', icon: Dumbbell, desc: 'Agenda latihan angkat beban', color: 'orange', bg: 'bg-orange-100', text: 'text-orange-600' },
    { id: 'vehicle', label: 'Vehicle', fullLabel: 'Kendaraan Status', path: '/vehicle', icon: Bike, desc: 'Pantau servis & bensin kendaraan', color: 'teal', bg: 'bg-teal-100', text: 'text-teal-600' },
    { id: 'jobs', label: 'Career', fullLabel: 'Job Tracker (Karir/Kerja)', path: '/jobs', icon: Briefcase, desc: 'Pantau lamaran kerja & progress', color: 'indigo', bg: 'bg-indigo-100', text: 'text-indigo-600' }
  ];

  // List of modules that are enabled
  const enabledModules = ALL_MODULES.filter(m => visibleModules[m.id]);

  // Find active pinned modules
  const activePins = ALL_MODULES.filter(m => visibleModules[m.id] && pinnedModules.includes(m.id))
    .sort((a, b) => pinnedModules.indexOf(a.id) - pinnedModules.indexOf(b.id));

  // Determine remaining unpinned active modules to pad with
  const remainingActiveModules = ALL_MODULES.filter(m => visibleModules[m.id] && !pinnedModules.includes(m.id));

  const bottomBarShortcuts = [...activePins, ...remainingActiveModules].slice(0, 3);

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-[#0f172a] selection:bg-blue-100">
      <div className="relative flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-[240px] bg-[#1e293b] text-white p-6 hidden lg:flex flex-col gap-6 shrink-0 sticky top-0 h-screen overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-lg bg-[#2563eb] flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">N</div>
            <h1 className="text-xl font-bold tracking-tight text-white font-sans">NexusHub</h1>
          </div>

          <nav className="flex flex-col gap-1 flex-1">
            <NavItem to="/" icon={LayoutGrid} label="Dashboard" active={location.pathname === '/'} />
            {ALL_MODULES.map(m => {
              if (!visibleModules[m.id]) return null;
              return (
                <NavItem key={m.id} to={m.path} icon={m.icon} label={m.label} active={location.pathname === m.path} />
              );
            })}
          </nav>

          {/* Quick Settings Shortcut Gear in Sidebar */}
          <div className="border-t border-slate-700 pt-3">
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-200 font-medium cursor-pointer"
            >
              <Settings size={18} />
              <span className="text-sm font-sans">Menu Settings</span>
            </button>
          </div>

          {/* Sidebar Left Bottom Logout */}
          <div className="pt-1">
            <button
              onClick={onLogout}
              className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200 font-medium cursor-pointer"
            >
              <LogOut size={18} />
              <span className="text-sm font-sans">Log out</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 min-h-screen relative font-sans">
          <header className={cn(
            "h-16 md:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 z-20 transition-all sticky top-0",
          )}>
            <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
              {!isHome && (
                <Link to="/" onClick={() => setMenuOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                  <ChevronLeft size={20} />
                </Link>
              )}
              <div className="truncate">
                <h2 className="text-base md:text-xl font-bold text-slate-900 truncate font-sans">
                  {location.pathname === '/' ? `Hi, ${userName || 'User'}!` : 
                   location.pathname === '/expenses' ? 'Expenses' :
                   location.pathname === '/notes' ? 'Docs' :
                   location.pathname === '/nutrition' ? 'Nutrition' :
                   location.pathname === '/workouts' ? 'Gym Tracker' :
                   location.pathname === '/vehicle' ? 'Vehicle Status' :
                   location.pathname === '/jobs' ? 'Career' : 
                   location.pathname === '/vault' ? 'Kunci & Sandi' : 'Page'}
                </h2>
                {isHome && <p className="text-slate-500 text-[10px] md:text-xs font-medium truncate">Here's your summary today.</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleOpenUpdates}
                className="relative w-10 h-10 flex items-center justify-center rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-650 hover:text-amber-750 transition-all shadow-sm cursor-pointer"
                title="Catatan Update Baru"
              >
                <Sparkles size={18} className="animate-pulse" />
                {hasNewUpdate && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                )}
              </button>

              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-slate-900">{userName || 'Workspace'}</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Private</div>
              </div>
              
              {/* Profile Avatar / Wajah - Click for Workspace & Navigation Settings */}
              <div className="relative group">
                <button 
                  onClick={() => setSettingsOpen(true)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-100 hover:bg-blue-200 border border-blue-200 text-blue-600 transition-all shadow-sm cursor-pointer group relative"
                  title="Workspace settings / atur sidebar"
                >
                  <User size={20} className="group-hover:scale-110 transition-transform text-blue-600" />
                  <span className="absolute -bottom-1 -right-1 bg-[#2563eb] text-white p-0.5 rounded-full border border-white shrink-0 shadow-sm shadow-blue-500/30">
                    <Settings size={10} className="animate-spin-slow text-white" />
                  </span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-2 text-xs text-slate-600 hidden group-hover:block transition-all z-50">
                  <div className="px-2 py-1.5 border-b border-slate-100 font-bold text-slate-800">
                    {userName}
                  </div>
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="w-full text-left px-2 py-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors font-semibold mt-1 flex items-center gap-1.5 font-sans cursor-pointer"
                  >
                    <Settings size={12} />
                    Kustomisasi Sidebar
                  </button>
                  <button
                    onClick={onLogout}
                    className="w-full text-left px-2 py-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors font-medium flex items-center gap-1.5 font-sans cursor-pointer"
                  >
                    <LogOut size={12} />
                    Logout Akun
                  </button>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 p-4 md:p-8 pb-32 md:pb-8">
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

          <div className="lg:hidden fixed bottom-4 left-4 right-4 h-16 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl flex items-center justify-around z-50 shadow-[0_8px_32px_rgba(0,0,0,0.08)] px-2">
             {/* Slot 1: Home */}
             <Link 
               to="/" 
               onClick={() => setMenuOpen(false)}
               className={cn(
                 "flex flex-col items-center gap-0.5 justify-center h-full px-2 py-1 rounded-xl transition-all duration-200", 
                 location.pathname === '/' ? "text-blue-600 font-semibold" : "text-slate-400 hover:text-slate-600"
               )}
             >
                <LayoutGrid size={20} />
                <span className="text-[10px] font-sans font-medium">Home</span>
             </Link>

             {bottomBarShortcuts.length > 0 ? (
               <Link 
                 to={bottomBarShortcuts[0].path} 
                 onClick={() => setMenuOpen(false)}
                 className={cn(
                   "flex flex-col items-center gap-0.5 justify-center h-full px-2 py-1 rounded-xl transition-all duration-200", 
                   location.pathname === bottomBarShortcuts[0].path ? "text-blue-600 font-semibold" : "text-slate-400 hover:text-slate-600"
                 )}
               >
                  {React.createElement(bottomBarShortcuts[0].icon, { size: 18 })}
                  <span className="text-[10px] font-sans font-medium">{bottomBarShortcuts[0].label}</span>
               </Link>
             ) : (
               <button 
                 onClick={() => setSettingsOpen(true)}
                 className={cn(
                   "flex flex-col items-center gap-0.5 justify-center h-full px-2 py-1 rounded-xl transition-all duration-200 text-slate-400 hover:text-slate-600 cursor-pointer", 
                   settingsOpen ? "text-blue-600 font-semibold" : ""
                 )}
               >
                  <Settings size={18} />
                  <span className="text-[10px] font-sans font-medium">Atur</span>
               </button>
             )}

             <div className="relative -top-3 shrink-0">
               <button
                 onClick={() => setMenuOpen(!menuOpen)}
                 className={cn(
                   "w-12 h-12 rounded-2xl flex items-center justify-center text-white transition-all duration-300 shadow-lg transform active:scale-95 cursor-pointer",
                   menuOpen 
                     ? "bg-rose-500 shadow-rose-500/30 rotate-90" 
                     : "bg-[#2563eb] shadow-blue-500/30 hover:bg-blue-700"
                 )}
                 title="Semua Layanan"
               >
                 {menuOpen ? <X size={20} /> : <Menu size={20} />}
               </button>
             </div>


             {bottomBarShortcuts.length > 1 ? (
               <Link 
                 to={bottomBarShortcuts[1].path} 
                 onClick={() => setMenuOpen(false)}
                 className={cn(
                   "flex flex-col items-center gap-0.5 justify-center h-full px-2 py-1 rounded-xl transition-all duration-200", 
                   location.pathname === bottomBarShortcuts[1].path ? "text-blue-600 font-semibold" : "text-slate-400 hover:text-slate-600"
                 )}
               >
                  {React.createElement(bottomBarShortcuts[1].icon, { size: 18 })}
                  <span className="text-[10px] font-sans font-medium">{bottomBarShortcuts[1].label}</span>
               </Link>
             ) : bottomBarShortcuts.length === 1 ? (
               <button 
                 onClick={() => setSettingsOpen(true)}
                 className={cn(
                   "flex flex-col items-center gap-0.5 justify-center h-full px-2 py-1 rounded-xl transition-all duration-200 text-slate-400 hover:text-slate-600 cursor-pointer", 
                   settingsOpen ? "text-blue-600 font-semibold" : ""
                 )}
               >
                  <Settings size={18} />
                  <span className="text-[10px] font-sans font-medium">Atur</span>
               </button>
             ) : (
               <button 
                 onClick={() => { if (window.confirm("Logout dari akun?")) onLogout(); }}
                 className="flex flex-col items-center gap-0.5 justify-center h-full px-2 py-1 rounded-xl transition-all duration-200 text-slate-400 hover:text-rose-600 cursor-pointer"
               >
                  <LogOut size={18} />
                  <span className="text-[10px] font-sans font-medium">Keluar</span>
               </button>
             )}

             {bottomBarShortcuts.length > 2 ? (
               <Link 
                 to={bottomBarShortcuts[2].path} 
                 onClick={() => setMenuOpen(false)}
                 className={cn(
                   "flex flex-col items-center gap-0.5 justify-center h-full px-2 py-1 rounded-xl transition-all duration-200", 
                   location.pathname === bottomBarShortcuts[2].path ? "text-blue-600 font-semibold" : "text-slate-400 hover:text-slate-600"
                 )}
               >
                  {React.createElement(bottomBarShortcuts[2].icon, { size: 18 })}
                  <span className="text-[10px] font-sans font-medium">{bottomBarShortcuts[2].label}</span>
               </Link>
             ) : bottomBarShortcuts.length === 2 ? (
               <button 
                 onClick={() => setSettingsOpen(true)}
                 className={cn(
                   "flex flex-col items-center gap-0.5 justify-center h-full px-2 py-1 rounded-xl transition-all duration-200 text-slate-400 hover:text-slate-600 cursor-pointer", 
                   settingsOpen ? "text-blue-600 font-semibold" : ""
                 )}
               >
                  <Settings size={18} />
                  <span className="text-[10px] font-sans font-medium">Atur</span>
               </button>
             ) : (
               <button 
                 onClick={() => { if (window.confirm("Logout dari akun?")) onLogout(); }}
                 className="flex flex-col items-center gap-0.5 justify-center h-full px-2 py-1 rounded-xl transition-all duration-200 text-slate-400 hover:text-rose-600 cursor-pointer"
               >
                  <LogOut size={18} />
                  <span className="text-[10px] font-sans font-medium">Keluar</span>
               </button>
             )}
          </div>

          {/* Immersive Bottom-Sheet Menu Drawer Overlay */}
          <AnimatePresence>
            {menuOpen && (
              <>
                {/* Backdrop Layer */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMenuOpen(false)}
                  className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
                />

                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 220 }}
                  className="lg:hidden fixed bottom-4 left-4 right-4 bg-white rounded-3xl shadow-2xl z-50 flex flex-col pb-6 overflow-hidden border border-slate-100 max-h-[80vh]"
                >
                  <div className="flex flex-col items-center py-3 border-b border-slate-100 shrink-0">
                    <div className="w-10 h-1 bg-slate-300 rounded-full mb-1" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans">Menu Navigasi Hub</span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Dashboard */}
                      <Link
                        to="/"
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          "p-2.5 rounded-xl border flex items-center gap-2.5 transition-all text-left",
                          location.pathname === '/' ? "border-blue-500 bg-blue-50/50 font-bold" : "border-slate-100 bg-slate-50/50 hover:bg-slate-50"
                        )}
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                          <LayoutGrid size={16} />
                        </div>
                        <div className="truncate">
                          <div className="text-[11px] font-bold text-slate-800 font-sans">Dashboard</div>
                          <div className="text-[9px] text-slate-400 truncate">Ringkasan Utama</div>
                        </div>
                      </Link>

                      {ALL_MODULES.map(m => {
                        if (!visibleModules[m.id]) return null;
                        const isCurrentActive = location.pathname === m.path;
                        return (
                          <Link
                            key={m.id}
                            to={m.path}
                            onClick={() => setMenuOpen(false)}
                            className={cn(
                              "p-2.5 rounded-xl border flex items-center gap-2.5 transition-all text-left",
                              isCurrentActive ? "border-blue-500 bg-blue-50/50 font-bold" : "border-slate-100 bg-slate-50/50 hover:bg-slate-50"
                            )}
                          >
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", m.bg, m.text)}>
                              {React.createElement(m.icon, { size: 16 })}
                            </div>
                            <div className="truncate">
                              <div className="text-[11px] font-bold text-slate-800 font-sans">{m.label}</div>
                              <div className="text-[9px] text-slate-400 truncate">{m.desc}</div>
                            </div>
                          </Link>
                        );
                      })}

                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          setSettingsOpen(true);
                        }}
                        className="p-2.5 rounded-xl border border-dashed border-blue-200 bg-blue-50/10 hover:bg-blue-50/40 flex items-center gap-2.5 transition-all text-left cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 bg-blue-50">
                          <Settings size={16} className="animate-spin-slow" />
                        </div>
                        <div className="truncate">
                          <div className="text-[11px] font-bold text-blue-700 font-sans">Atur Menu</div>
                          <div className="text-[9px] text-blue-500 truncate">Pilih Modul Aktif</div>
                        </div>
                      </button>
                    </div>

                    {/* Quick user profile and action */}
                    <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 flex flex-col gap-2.5 mt-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-bold font-sans">
                          {userName.charAt(0)}
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-black text-slate-800 font-sans truncate">{userName}</div>
                          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-sans">Private Session Access</div>
                        </div>
                      </div>
                      
                      <div className="h-px bg-slate-200/60" />

                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                      >
                        <LogOut size={12} />
                        Keluar dari Akun
                      </button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Settings & Modules Setup Modal Overlay */}
          <AnimatePresence>
            {settingsOpen && (
              <>
                {/* Backdrop overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSettingsOpen(false)}
                  className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50"
                />

                {/* Settings Panel Card Center */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed inset-x-4 top-[10%] max-w-lg mx-auto bg-white rounded-3xl shadow-2xl z-[60] overflow-hidden border border-slate-100 flex flex-col max-h-[80vh]"
                >
                  {/* Header */}
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                        <Settings size={18} className="animate-spin-slow" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-950 font-sans">Kustomisasi Menu</h3>
                        <p className="text-[10px] text-slate-500 font-medium font-sans">Atur modul aktif & shortcut bar bawah handphone</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSettingsOpen(false)}
                      className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Modules toggles scrollable */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                    <div className="bg-blue-50/50 rounded-2xl p-4.5 border border-blue-100 space-y-2">
                      <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                        <Pin size={13} className="rotate-45 fill-blue-600 text-blue-600" />
                        Atur Shortcut Bar Bawah Handphone
                      </h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Aktifkan modul dengan saklar kanan. Lalu klik tombol <strong className="text-blue-700">Pin 📌</strong> untuk menyematkannya sebagai akses cepat di bar bawah handphone Anda (Maksimal 3 item).
                      </p>
                    </div>

                    <div className="space-y-2.5 font-sans">
                      {ALL_MODULES.map(m => {
                        const isEnabled = visibleModules[m.id];
                        const isPinned = pinnedModules.includes(m.id);
                        return (
                          <div 
                            key={m.id}
                            className={cn(
                              "p-3 rounded-2xl border flex items-center justify-between transition-all duration-200",
                              isEnabled ? "bg-slate-50/80 border-slate-200" : "bg-white border-slate-100 opacity-60"
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm", m.bg, m.text)}>
                                {React.createElement(m.icon, { size: 18 })}
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-slate-900 block font-sans">{m.fullLabel}</span>
                                <span className="text-[10px] text-slate-400 block truncate font-sans">{m.desc}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 md:gap-3 shrink-0">
                              {/* Pin Button */}
                              {isEnabled && (
                                <button
                                  onClick={() => togglePinModule(m.id)}
                                  className={cn(
                                    "p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 shrink-0",
                                    isPinned
                                      ? "bg-blue-50 border-blue-200 text-blue-600"
                                      : "bg-transparent border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                  )}
                                  title={isPinned ? "Batal Sematkan dari Bar Bawah" : "Sematkan ke Bar Bawah (Maks 3)"}
                                >
                                  <Pin size={12} className={cn("transition-transform duration-200", isPinned ? "rotate-45 fill-blue-600" : "rotate-0")} />
                                  <span className="text-[9px] font-bold hidden sm:inline-block">
                                    {isPinned ? "Pinned" : "Pin"}
                                  </span>
                                </button>
                              )}

                              {/* Switch input element wrapper */}
                              <button
                                onClick={() => toggleModuleVisible(m.id)}
                                className={cn(
                                  "w-11 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none relative inline-flex items-center cursor-pointer shrink-0",
                                  isEnabled ? "bg-blue-600" : "bg-slate-200"
                                )}
                                title={isEnabled ? "Matikan modul" : "Aktifkan modul"}
                              >
                                <span
                                  className={cn(
                                    "w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-out inline-block",
                                    isEnabled ? "translate-x-5" : "translate-x-0"
                                  )}
                                />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Reset & Quick settings controls */}
                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        onClick={() => {
                          const allOn = {
                            expenses: true,
                            notes: true,
                            nutrition: true,
                            workouts: true,
                            vehicle: true,
                            jobs: true,
                            vault: true,
                          };
                          setVisibleModules(allOn);
                          localStorage.setItem('visible_modules', JSON.stringify(allOn));
                        }}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer font-sans"
                      >
                        Reset: Aktifkan Semua
                      </button>
                    </div>

                    {/* User profile with logout inside settings */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col gap-3 mt-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-sm">
                          {userName.charAt(0)}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block font-sans">{userName}</span>
                          <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-bold">Workspace Private Owner</span>
                        </div>
                      </div>

                      <div className="h-px bg-slate-200/60" />

                      <button
                        onClick={() => {
                          setSettingsOpen(false);
                          onLogout();
                        }}
                        className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-xl transition-all font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                      >
                        <LogOut size={12} />
                        Logout dari NexusHub
                      </button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Separated What's New / Log Update Modal */}
          <UpdatesModal isOpen={updatesOpen} onClose={() => setUpdatesOpen(false)} />
        </main>
      </div>
    </div>
  );
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [userName, setUserName] = useState<string>('User');

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [nutrition, setNutrition] = useState<NutritionEntry[]>([]);
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [customFoodCatalog, setCustomFoodCatalog] = useState<FoodLibraryItem[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [vehicle, setVehicle] = useState<VehicleState>(INITIAL_VEHICLE_STATE);
  const [bodyProfile, setBodyProfile] = useState(INITIAL_BODY_PROFILE);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedFromDb, setHasLoadedFromDb] = useState(false);

  const handleLogout = async () => {
    try {
      if (localStorage.getItem('is_dummy_user') === 'true') {
        localStorage.removeItem('is_dummy_user');
      } else {
        await supabase.auth.signOut();
      }
    } finally {
      setExpenses([]);
      setNotes([]);
      setNutrition([]);
      setJobs([]);
      setCustomFoodCatalog([]);
      setWorkouts([]);
      setVehicle(INITIAL_VEHICLE_STATE);
      setBodyProfile(INITIAL_BODY_PROFILE);
      setVaultItems([]);
      setIsAuthenticated(false);
      setHasLoadedFromDb(false);
      window.location.reload();
    }
  };

  useEffect(() => {
    if (localStorage.getItem('is_dummy_user') === 'true') {
      setIsAuthenticated(true);
      setUserName('Alief');
      setSessionLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
        const email = session.user?.email || '';
        const workspace = email.includes('@nexushub.com') ? email.split('@')[0] : (email ? email.split('@')[0] : 'User');
        const capitalized = workspace.charAt(0).toUpperCase() + workspace.slice(1);
        setUserName(capitalized);
      }
      setSessionLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAuthenticated(true);
        const email = session.user?.email || '';
        const workspace = email.includes('@nexushub.com') ? email.split('@')[0] : (email ? email.split('@')[0] : 'User');
        const capitalized = workspace.charAt(0).toUpperCase() + workspace.slice(1);
        setUserName(capitalized);
      } else {
        if (localStorage.getItem('is_dummy_user') !== 'true') {
          setIsAuthenticated(false);
          setUserName('User');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load data from Supabase or localStorage only after authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    async function fetchData() {
      try {
        if (localStorage.getItem('is_dummy_user') === 'true') {
          const localDataRaw = localStorage.getItem('nexus_dummy_data');
          if (localDataRaw) {
            const data = JSON.parse(localDataRaw);
            if (Array.isArray(data.expenses)) setExpenses(data.expenses);
            if (Array.isArray(data.notes)) setNotes(data.notes);
            if (Array.isArray(data.nutrition)) setNutrition(data.nutrition);
            if (Array.isArray(data.jobs)) setJobs(data.jobs);
            if (Array.isArray(data.customFoodCatalog)) setCustomFoodCatalog(data.customFoodCatalog);
            if (Array.isArray(data.workouts)) setWorkouts(data.workouts);
            if (data.vehicle) setVehicle(data.vehicle as any);
            if (data.bodyProfile) setBodyProfile(data.bodyProfile);
            if (Array.isArray(data.vaultItems)) setVaultItems(data.vaultItems);
            else setVaultItems(INITIAL_VAULT_ITEMS);
          } else {
            setExpenses(INITIAL_EXPENSES);
            setNotes(INITIAL_NOTES);
            setNutrition(INITIAL_NUTRITION);
            setJobs(INITIAL_JOBS);
            setCustomFoodCatalog([]);
            setWorkouts([]);
            setVehicle(INITIAL_VEHICLE_STATE);
            setBodyProfile(INITIAL_BODY_PROFILE);
            setVaultItems(INITIAL_VAULT_ITEMS);
          }
          setHasLoadedFromDb(true);
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const email = user.email || '';
            const workspace = email.includes('@nexushub.com') ? email.split('@')[0] : (email ? email.split('@')[0] : 'User');
            const capitalized = workspace.charAt(0).toUpperCase() + workspace.slice(1);
            setUserName(capitalized);
          }
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
            
            const userSecuredKey = user ? `nexus_vault_items_${user.id}` : 'nexus_vault_items';
            if (Array.isArray(data.vaultItems) && data.vaultItems.length > 0) {
              setVaultItems(data.vaultItems);
            } else {
              const realVaultRaw = localStorage.getItem(userSecuredKey);
              if (realVaultRaw) {
                setVaultItems(JSON.parse(realVaultRaw));
              } else {
                setVaultItems(INITIAL_VAULT_ITEMS);
              }
            }
            
            setHasLoadedFromDb(true);
          }
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [isAuthenticated]);

  useEffect(() => {
    if (isLoading || !hasLoadedFromDb) return; // Don't save initial state or if fetch failed

    const saveData = async () => {
      try {
        if (localStorage.getItem('is_dummy_user') === 'true') {
          const dummyData = {
            expenses,
            notes,
            nutrition,
            jobs,
            customFoodCatalog,
            workouts,
            vehicle,
            bodyProfile,
            vaultItems
          };
          localStorage.setItem('nexus_dummy_data', JSON.stringify(dummyData));
        } else {
          await syncToSupabase({
            expenses,
            notes,
            nutrition,
            jobs,
            customFoodCatalog,
            workouts,
            vehicle,
            bodyProfile,
            vaultItems
          });
          const { data: { user } } = await supabase.auth.getUser();
          const userSecuredKey = user ? `nexus_vault_items_${user.id}` : 'nexus_vault_items';
          localStorage.setItem(userSecuredKey, JSON.stringify(vaultItems));
        }
      } catch (error) {
        console.error("Failed to save data:", error);
      }
    };

    const timeout = setTimeout(saveData, 1000); // 1s debounce
    return () => clearTimeout(timeout);
  }, [expenses, notes, nutrition, jobs, customFoodCatalog, workouts, vehicle, bodyProfile, vaultItems, isLoading, hasLoadedFromDb]);

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-10 text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h1 className="text-xl font-bold text-slate-800">Booting NexusHub...</h1>
      </div>
    );
  }

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
      <AppLayout onLogout={handleLogout} userName={userName}>
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
          <Route 
            path="/vault" 
            element={<PasswordVault items={vaultItems} setItems={setVaultItems} />} 
          />
        </Routes>
      </AppLayout>
    </Router>
  );
}

