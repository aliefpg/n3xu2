import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, AreaChart, Area 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Search, Filter, ArrowDown, ArrowUp, DollarSign, 
  TrendingUp, Calendar, Tag, Trash2, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { format, isToday, addDays, subDays } from 'date-fns';
import { cn } from '../lib/utils';
import { INITIAL_EXPENSES } from '../mockData';
import { Expense, ExpenseCategory } from '../types';
import MetricCard from '../components/MetricCard';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Food: '#3b82f6',
  Transport: '#8b5cf6',
  Entertainment: '#ec4899',
  Healthcare: '#10b981',
  Utilities: '#f59e0b',
  Shopping: '#f43f5e',
  Salary: '#10b981',
  Bonus: '#3b82f6',
  Investment: '#8b5cf6',
  Other: '#64748b'
};

const EXPENSE_CATEGORIES: ExpenseCategory[] = ['Food', 'Transport', 'Entertainment', 'Healthcare', 'Utilities', 'Shopping', 'Other'];
const INCOME_CATEGORIES: ExpenseCategory[] = ['Salary', 'Bonus', 'Investment', 'Other'];

export default function ExpenseTracker({ expenses, setExpenses }: { expenses: Expense[], setExpenses: React.Dispatch<React.SetStateAction<Expense[]>> }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'All'>('All');
  const [viewInterval, setViewInterval] = useState<'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  
  // New Expense State
  const [newExpense, setNewExpense] = useState<{
    description: string;
    amount: string;
    category: ExpenseCategory;
    type: 'expense' | 'income';
  }>({
    description: '',
    amount: '',
    category: 'Food',
    type: 'expense'
  });

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.description || !newExpense.amount) return;

    const expense: Expense = {
      id: Math.random().toString(36).substr(2, 9),
      description: newExpense.description,
      amount: parseFloat(newExpense.amount.replace(/\./g, '')),
      category: newExpense.category,
      date: selectedDate.toISOString(),
      type: newExpense.type
    };

    setExpenses([expense, ...expenses]);
    setIsAddModalOpen(false);
    setNewExpense({ description: '', amount: '', category: 'Food', type: 'expense' });
  };

  // Stats
  const dailyTransactions = useMemo(() => {
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    return expenses.filter(e => format(new Date(e.date), 'yyyy-MM-dd') === selectedDateStr);
  }, [expenses, selectedDate]);

  const stats = useMemo(() => {
    let dailyIncome = 0;
    let dailyExpense = 0;
    let totalIncome = 0;
    let totalExpense = 0;
    
    dailyTransactions.forEach(e => {
      if (e.type === 'income') {
        dailyIncome += e.amount;
      } else {
        dailyExpense += e.amount;
      }
    });

    expenses.forEach(e => {
      if (e.type === 'income') {
        totalIncome += e.amount;
      } else {
        totalExpense += e.amount;
      }
    });

    return { totalIncome, totalExpense, dailyIncome, dailyExpense, netBalance: totalIncome - totalExpense };
  }, [dailyTransactions, expenses]);
  
  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    expenses.filter(e => e.type !== 'income').forEach(e => {
      data[e.category] = (data[e.category] || 0) + e.amount;
    });
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const trendsData = useMemo(() => {
    const limit = viewInterval === 'WEEKLY' ? 7 : 30;
    const days = [...Array(limit)].map((_, i) => {
      const d = subDays(selectedDate, limit - 1 - i);
      const dateStr = format(d, 'yyyy-MM-dd');
      
      const dayExpense = expenses
        .filter(e => e.type !== 'income' && format(new Date(e.date), 'yyyy-MM-dd') === dateStr)
        .reduce((sum, e) => sum + e.amount, 0);

      const dayIncome = expenses
        .filter(e => e.type === 'income' && format(new Date(e.date), 'yyyy-MM-dd') === dateStr)
        .reduce((sum, e) => sum + e.amount, 0);

      return {
        date: format(d, 'MM/dd'),
        expense: dayExpense,
        income: dayIncome
      };
    });
    return days;
  }, [expenses, viewInterval, selectedDate]);

  const filteredExpenses = useMemo(() => {
    return dailyTransactions.filter(e => {
      const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || e.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [dailyTransactions, searchTerm, categoryFilter]);

  const removeExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    setExpenseToDelete(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-12 relative px-1 md:px-0">
      {/* Date Navigation */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-2 border border-slate-200 shadow-sm shrink-0">
         <button 
           onClick={() => setSelectedDate(d => subDays(d, 1))} 
           className="p-2 md:p-3 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
         >
            <ChevronLeft size={20} />
         </button>
         <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
               <Calendar size={16} className="text-blue-500" />
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

      {/* Add Expense Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-5 md:p-8 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg md:text-xl font-bold text-slate-900">New Transaction</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>
              <form onSubmit={handleAddExpense} className="p-5 md:p-8 space-y-5 md:space-y-6">
                <div className="flex gap-4 p-1 bg-slate-100 rounded-xl">
                  <button 
                    type="button"
                    onClick={() => setNewExpense({...newExpense, type: 'expense', category: 'Food'})}
                    className={cn("flex-1 py-3 rounded-lg text-sm font-bold transition-all", newExpense.type === 'expense' ? "bg-white text-rose-600 shadow-sm" : "text-slate-400")}
                  >EXPENSE</button>
                  <button 
                    type="button"
                    onClick={() => setNewExpense({...newExpense, type: 'income', category: 'Salary'})}
                    className={cn("flex-1 py-3 rounded-lg text-sm font-bold transition-all", newExpense.type === 'income' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400")}
                  >INCOME</button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Description</label>
                  <input 
                    type="text" 
                    required
                    placeholder={newExpense.type === 'expense' ? "E.g. Groceries, Netflix..." : "E.g. Salary, Freelance..."}
                    value={newExpense.description}
                    onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</span>
                      <input 
                        type="text" 
                        required
                        placeholder="0"
                        value={newExpense.amount}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '');
                          setNewExpense({...newExpense, amount: val ? Number(val).toLocaleString('id-ID') : ''});
                        }}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Category</label>
                    <select 
                      value={newExpense.category}
                      onChange={e => setNewExpense({...newExpense, category: e.target.value as ExpenseCategory})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all text-slate-600 bg-white"
                    >
                      {(newExpense.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button 
                  type="submit"
                  className={cn("w-full py-4 text-white rounded-xl font-bold shadow-lg transition-all mt-4 flex justify-between px-6 items-center", newExpense.type === 'income' ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25" : "bg-rose-600 hover:bg-rose-700 shadow-rose-500/25")}
                >
                  <span>Create {newExpense.type === 'income' ? 'Income' : 'Expense'}</span>
                  {newExpense.amount && (
                    <span className="opacity-90 font-medium">Rp {newExpense.amount}</span>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <MetricCard
          title="Total Income"
          value={`Rp ${stats.totalIncome.toLocaleString('id-ID')}`}
          icon={ArrowDown}
          iconClassName="text-emerald-500"
        />
        <MetricCard
          title="Total Expense"
          value={`Rp ${stats.totalExpense.toLocaleString('id-ID')}`}
          icon={ArrowUp}
          iconClassName="text-rose-500"
        />
        <MetricCard
          title="Total Balance"
          value={`${stats.netBalance >= 0 ? '+' : '-'}Rp ${Math.abs(stats.netBalance).toLocaleString('id-ID')}`}
          icon={DollarSign}
          iconClassName="text-blue-500"
          dark
        />
      </div>

      <div className="grid grid-cols-2 gap-4 md:gap-6">
        <MetricCard
          title="Daily Income"
          value={`Rp ${stats.dailyIncome.toLocaleString('id-ID')}`}
          className="bg-emerald-50/50 border-emerald-100"
        />
        <MetricCard
          title="Daily Expense"
          value={`Rp ${stats.dailyExpense.toLocaleString('id-ID')}`}
          className="bg-rose-50/50 border-rose-100"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Spending Trends */}
        <div className="p-6 md:p-8 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col gap-6">
           <div className="flex justify-between items-center">
              <h4 className="text-base md:text-lg font-bold text-slate-900">Spending Trend</h4>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                 <button 
                  onClick={() => setViewInterval('WEEKLY')}
                  className={cn("px-3 py-1 rounded-md text-[10px] font-bold transition-all", viewInterval === 'WEEKLY' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400")}
                 >WEEKLY</button>
                 <button 
                  onClick={() => setViewInterval('MONTHLY')}
                  className={cn("px-3 py-1 rounded-md text-[10px] font-bold transition-all", viewInterval === 'MONTHLY' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400")}
                 >MONTHLY</button>
              </div>
           </div>
           <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={trendsData}>
                    <defs>
                       <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#e11d48" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#e11d48" stopOpacity={0}/>
                       </linearGradient>
                       <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dx={-10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontWeight: 'bold' }}
                      formatter={(value: number, name: string) => [`Rp ${value.toLocaleString('id-ID')}`, name === 'expense' ? 'Pengeluaran' : 'Pemasukan']}
                    />
                    <Area type="monotone" dataKey="income" stroke="#059669" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} name="income" />
                    <Area type="monotone" dataKey="expense" stroke="#e11d48" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} name="expense" />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Categories Distribution */}
        <div className="p-8 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col gap-6">
           <h4 className="text-lg font-semibold text-slate-900">Categories Distribution</h4>
           <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-12">
              <div className="h-[250px] w-[250px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                       <Pie
                          data={categoryData}
                          innerRadius={65}
                          outerRadius={95}
                          paddingAngle={5}
                          dataKey="value"
                       >
                          {categoryData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name as ExpenseCategory] || '#f1f5f9'} />
                          ))}
                       </Pie>
                       <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                          itemStyle={{ fontWeight: 'bold' }}
                          formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, 'Total']}
                       />
                    </PieChart>
                 </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-4">
                 {categoryData.map((item, i) => (
                    <div key={i} className="flex items-center gap-4">
                       <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[item.name as ExpenseCategory] }} />
                       <span className="text-xs font-medium text-slate-500 w-24">{item.name}</span>
                       <span className="text-xs font-bold text-slate-900">Rp {item.value.toLocaleString('id-ID')}</span>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={!!expenseToDelete}
        title="Hapus Transaksi?"
        description={
          expenseToDelete ? (
            <>
              Apakah Anda yakin ingin menghapus transaksi <strong className="font-bold text-stone-900">"{expenseToDelete.description}"</strong> senilai <strong className="font-bold text-stone-900">Rp {expenseToDelete.amount.toLocaleString('id-ID')}</strong>?<br />Tindakan ini permanen.
            </>
          ) : ""
        }
        onConfirm={() => removeExpense(expenseToDelete?.id || '')}
        onCancel={() => setExpenseToDelete(null)}
      />

      {/* Transactions Table Section */}
      <div className="space-y-6">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2 md:px-4">
            <h4 className="text-lg md:text-xl font-bold text-slate-900">Transaction History</h4>
            <div className="flex items-center gap-2 md:gap-3">
               <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                  <input 
                    type="text" 
                    placeholder="Filter records..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 rounded-lg bg-white border border-slate-200 focus:border-blue-500 outline-none transition-all w-full md:w-64 text-xs shadow-sm"
                  />
               </div>
               <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 md:px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-500/20 transition-all font-bold text-xs whitespace-nowrap"
               >
                  <Plus size={16} />
                  <span>Add New</span>
               </button>
            </div>
         </div>

         {/* Desktop Table View */}
         <div className="hidden md:block rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Description</th>
                        <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Category</th>
                        <th className="px-8 py-4 text-[10px) font-bold uppercase tracking-widest text-slate-400">Date</th>
                        <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Amount</th>
                        <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400"></th>
                     </tr>
                  </thead>
                  <tbody>
                     {filteredExpenses.map((expense) => (
                        <tr key={expense.id} className="group hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                           <td className="px-8 py-5">
                              <span className="text-sm font-semibold text-slate-700">{expense.description}</span>
                           </td>
                           <td className="px-8 py-5">
                              <div className="flex items-center gap-2">
                                 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[expense.category] }} />
                                 <span className="text-xs font-medium text-slate-500">{expense.category}</span>
                              </div>
                           </td>
                           <td className="px-8 py-5">
                              <span className="text-xs text-slate-400 font-medium">{format(new Date(expense.date), 'MMM dd, yyyy')}</span>
                           </td>
                           <td className="px-8 py-5 text-right">
                              <span className={cn("text-sm font-bold", expense.type === 'income' ? "text-emerald-600" : "text-slate-900")}>
                                {expense.type === 'income' ? '+' : '-'}Rp {expense.amount.toLocaleString('id-ID')}
                              </span>
                           </td>
                           <td className="px-8 py-5 text-right">
                              <button 
                                onClick={() => setExpenseToDelete(expense)}
                                className="p-2 text-slate-200 hover:text-rose-500 transition-colors"
                              >
                                 <Trash2 size={16} />
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>

         {/* Mobile List View */}
         <div className="md:hidden space-y-3 px-1">
            {filteredExpenses.map((expense) => (
               <div key={expense.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", expense.type === 'income' ? "bg-emerald-50 text-emerald-500" : "bg-slate-50 text-slate-400")}>
                        {expense.type === 'income' ? <ArrowDown size={18} /> : <DollarSign size={18} />}
                     </div>
                     <div>
                        <div className="text-sm font-bold text-slate-800">{expense.description}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                           <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[expense.category] }} />
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{expense.category} • {format(new Date(expense.date), 'MMM dd')}</span>
                        </div>
                     </div>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className={cn("text-sm font-black", expense.type === 'income' ? "text-emerald-600" : "text-rose-500")}>
                       {expense.type === 'income' ? '+' : '-'}Rp {expense.amount.toLocaleString('id-ID')}
                     </div>
                     <button onClick={() => setExpenseToDelete(expense)} className="text-slate-200 hover:text-rose-500 transition-colors">
                        <Trash2 size={16} />
                     </button>
                  </div>
               </div>
            ))}
         </div>
      </div>
    </div>
  );
}

