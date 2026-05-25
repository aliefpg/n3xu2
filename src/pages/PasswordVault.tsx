import React, { useState, useEffect } from 'react';
import { 
  Key, Grid3x3, Hash, Lock, Unlock, Copy, Check, Eye, EyeOff, 
  Trash2, Edit2, Plus, Search, Folder, Globe, Shield, RefreshCw,
  Database, ExternalLink, X
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { VaultItem, VaultItemType } from '../types';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import PasswordGenerator from '../components/PasswordGenerator';

interface PasswordVaultProps {
  items: VaultItem[];
  setItems: React.Dispatch<React.SetStateAction<VaultItem[]>>;
}

export default function PasswordVault({ items, setItems }: PasswordVaultProps) {
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    const checkError = () => {
      const err = localStorage.getItem('nexus_vault_sync_error');
      setSyncError(err);
    };
    checkError();
    const interval = setInterval(checkError, 2500);
    return () => clearInterval(interval);
  }, []);

  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(items[0] || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTypeFilter, setActiveTypeFilter] = useState<VaultItemType | 'all'>('all');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  
  // Custom states for Bulk Mode, Safety dialogues without window blocking APIs
  const [checkedItemIds, setCheckedItemIds] = useState<string[]>([]);
  const [itemToDelete, setItemToDelete] = useState<VaultItem | null>(null);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sqlCopied, setSqlCopied] = useState(false);

  // Clipboard copied indicator state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Password Generator State
  const [showGen, setShowGen] = useState(false);
  const [genConfig, setGenConfig] = useState({
    length: 12,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true
  });
  const [generatedPass, setGeneratedPass] = useState('');

  // Form State
  const [formType, setFormType] = useState<VaultItemType>('password');
  const [formTitle, setFormTitle] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formCategory, setFormCategory] = useState(() => {
    try {
      const saved = localStorage.getItem('vault_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!parsed.includes('Tanpa Kategori')) {
            return 'Tanpa Kategori';
          }
          return parsed[0];
        }
      }
    } catch (e) {}
    return 'Tanpa Kategori';
  });

  // Interactive pattern drawing state (nodes clicked of 3x3)
  const [drawnPattern, setDrawnPattern] = useState<number[]>([]);

  // Show/Hide secrets toggle map
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});

  const toggleSecretVisibility = (id: string) => {
    setVisibleSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generateSecurePassword = () => {
    const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
    const numberChars = '0123456789';
    const symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let allowed = '';
    if (genConfig.uppercase) allowed += uppercaseChars;
    if (genConfig.lowercase) allowed += lowercaseChars;
    if (genConfig.numbers) allowed += numberChars;
    if (genConfig.symbols) allowed += symbolChars;

    if (!allowed) return;

    let res = '';
    for (let i = 0; i < genConfig.length; i++) {
      const idx = Math.floor(Math.random() * allowed.length);
      res += allowed[idx];
    }
    setGeneratedPass(res);
    setFormValue(res);
  };

  // Categories helper state and functions
  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('vault_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!parsed.includes('Tanpa Kategori')) {
            const updated = ['Tanpa Kategori', ...parsed];
            localStorage.setItem('vault_categories', JSON.stringify(updated));
            return updated;
          }
          return parsed;
        }
      }
    } catch (e) {}
    const initial = ['Tanpa Kategori', 'Personal', 'Work', 'Finance', 'Social', 'Devices'];
    try {
      localStorage.setItem('vault_categories', JSON.stringify(initial));
    } catch (e) {}
    return initial;
  });
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCatIndex, setEditingCatIndex] = useState<number | null>(null);
  const [editingCatValue, setEditingCatValue] = useState('');

  // Built-in state dialogs for security inside iframe environments
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [categoryToReset, setCategoryToReset] = useState(false);

  const filterCategories = ['All', ...categories];

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError(null);
    const name = newCatName.trim();
    if (!name) return;
    if (categories.some(c => c.toLowerCase() === name.toLowerCase())) {
      setCategoryError('Kategori ini sudah ada!');
      return;
    }
    const updated = [...categories, name];
    setCategories(updated);
    localStorage.setItem('vault_categories', JSON.stringify(updated));
    setNewCatName('');
  };

  const handleDeleteCategory = (catName: string) => {
    setCategoryError(null);
    if (catName === 'Tanpa Kategori') {
      setCategoryError('Kategori "Tanpa Kategori" adalah kategori bawaan sistem dan tidak dapat dihapus.');
      return;
    }
    if (categories.length <= 1) {
      setCategoryError('Kategori tidak boleh kosong! Minimal harus ada satu kategori.');
      return;
    }
    // Set for custom dynamic dialog prompt
    setCategoryToDelete(catName);
  };

  const executeDeleteCategory = () => {
    if (!categoryToDelete) return;
    const catName = categoryToDelete;
    const updated = categories.filter(c => c !== catName);
    setCategories(updated);
    localStorage.setItem('vault_categories', JSON.stringify(updated));
    
    // Update items category fallback - shift deleted items automatically to 'Tanpa Kategori'
    const fallbackCategory = 'Tanpa Kategori';
    const updatedItems = items.map(item => {
      if (item.category === catName || !item.category) {
        return { ...item, category: fallbackCategory };
      }
      return item;
    });
    setItems(updatedItems);

    if (selectedItem && (selectedItem.category === catName || !selectedItem.category)) {
      setSelectedItem(prev => prev ? { ...prev, category: fallbackCategory } : null);
    }

    if (activeCategoryFilter === catName) {
      setActiveCategoryFilter('All');
    }
    setCategoryToDelete(null);
  };

  const handleStartEditCategory = (index: number, val: string) => {
    setCategoryError(null);
    if (val === 'Tanpa Kategori') {
      setCategoryError('Kategori "Tanpa Kategori" adalah kategori bawaan sistem dan tidak dapat diubah namanya.');
      return;
    }
    setEditingCatIndex(index);
    setEditingCatValue(val);
  };

  const handleSaveEditCategory = (index: number) => {
    setCategoryError(null);
    const val = editingCatValue.trim();
    if (!val) return;
    if (val === 'Tanpa Kategori') {
      setCategoryError('Tidak diperbolehkan mengubah nama kategori menjadi "Tanpa Kategori".');
      return;
    }
    const oldName = categories[index];
    if (categories.some((c, idx) => idx !== index && c.toLowerCase() === val.toLowerCase())) {
      setCategoryError('Kategori dengan nama tersebut sudah ada!');
      return;
    }
    const updated = [...categories];
    updated[index] = val;
    setCategories(updated);
    localStorage.setItem('vault_categories', JSON.stringify(updated));
    
    // update password category references
    const updatedItems = items.map(item => {
      if (item.category === oldName) {
        return { ...item, category: val };
      }
      return item;
    });
    setItems(updatedItems);
    
    if (activeCategoryFilter === oldName) {
      setActiveCategoryFilter(val);
    }
    setEditingCatIndex(null);
  };

  const handleResetCategories = () => {
    setCategoryError(null);
    setCategoryToReset(true);
  };

  const executeResetCategories = () => {
    const defaults = ['Tanpa Kategori', 'Personal', 'Work', 'Finance', 'Social', 'Devices'];
    setCategories(defaults);
    localStorage.setItem('vault_categories', JSON.stringify(defaults));

    // Update items to fallback to 'Tanpa Kategori' if their category is no longer available
    const updatedItems = items.map(item => {
      if (!defaults.includes(item.category || '')) {
        return { ...item, category: 'Tanpa Kategori' };
      }
      return item;
    });
    setItems(updatedItems);

    if (selectedItem && !defaults.includes(selectedItem.category || '')) {
      setSelectedItem(prev => prev ? { ...prev, category: 'Tanpa Kategori' } : null);
    }

    if (!defaults.includes(activeCategoryFilter) && activeCategoryFilter !== 'All') {
      setActiveCategoryFilter('All');
    }

    setCategoryToReset(false);
  };

  // Handler adding or editing a credential
  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formTitle.trim()) {
      setFormError('Nama/Judul Kredensial tidak boleh kosong!');
      return;
    }

    let finalValue = formValue;
    if (formType === 'pattern') {
      if (drawnPattern.length < 2) {
        setFormError('Silakan buat pola minimal 2 titik terhubung.');
        return;
      }
      finalValue = drawnPattern.join(',');
    } else {
      if (!formValue.trim()) {
        setFormError('Nilai rahasia/sandi tidak boleh kosong!');
        return;
      }
    }

    if (editingItemId) {
      const updated = items.map(item => item.id === editingItemId ? {
        ...item,
        title: formTitle,
        type: formType,
        username: formType === 'password' ? formUsername : '',
        value: finalValue,
        url: formType === 'password' || formType === 'key' ? formUrl : '',
        notes: formNotes,
        category: formCategory,
        lastModified: new Date().toISOString()
      } : item);
      setItems(updated);
      const isSelectedEdited = selectedItem?.id === editingItemId;
      if (isSelectedEdited) {
        setSelectedItem(updated.find(i => i.id === editingItemId) || null);
      }
    } else {
      const newItem: VaultItem = {
        id: Math.random().toString(36).substr(2, 9),
        title: formTitle,
        type: formType,
        username: formType === 'password' ? formUsername : '',
        value: finalValue,
        url: formType === 'password' || formType === 'key' ? formUrl : '',
        notes: formNotes,
        category: formCategory,
        lastModified: new Date().toISOString()
      };
      setItems([newItem, ...items]);
      setSelectedItem(newItem);
    }

    handleCloseModal();
  };

  const startEditItem = (item: VaultItem) => {
    setFormError(null);
    setEditingItemId(item.id);
    setFormType(item.type);
    setFormTitle(item.title);
    setFormUsername(item.username || '');
    setFormValue(item.value);
    setFormUrl(item.url || '');
    setFormNotes(item.notes || '');
    setFormCategory(item.category || categories[0] || 'Tanpa Kategori');
    
    if (item.type === 'pattern') {
      const parsed = item.value.split(',').map(Number).filter(v => !isNaN(v));
      setDrawnPattern(parsed);
    } else {
      setDrawnPattern([]);
    }

    setIsAddModalOpen(true);
  };

  const handleDeleteItem = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetItem = items.find(item => item.id === id);
    if (targetItem) {
      setItemToDelete(targetItem);
    }
  };

  const executeDeleteItem = () => {
    if (!itemToDelete) return;
    const remaining = items.filter(item => item.id !== itemToDelete.id);
    setItems(remaining);
    
    // Clean selection and checked states
    setCheckedItemIds(prev => prev.filter(id => id !== itemToDelete.id));
    if (selectedItem?.id === itemToDelete.id) {
      setSelectedItem(remaining[0] || null);
    }
    setItemToDelete(null);
  };

  // Bulk / Batch Operations
  const handleToggleCheckItem = (id: string) => {
    setCheckedItemIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkMove = (targetCategory: string) => {
    if (checkedItemIds.length === 0) return;
    const updated = items.map(item => {
      if (checkedItemIds.includes(item.id)) {
        return {
          ...item,
          category: targetCategory,
          lastModified: new Date().toISOString()
        };
      }
      return item;
    });
    setItems(updated);

    // Synchronize current single selected viewer reference
    if (selectedItem && checkedItemIds.includes(selectedItem.id)) {
      setSelectedItem(prev => prev ? {
        ...prev,
        category: targetCategory,
        lastModified: new Date().toISOString()
      } : null);
    }

    setCheckedItemIds([]);
  };

  const executeBulkDelete = () => {
    if (checkedItemIds.length === 0) return;
    const remaining = items.filter(item => !checkedItemIds.includes(item.id));
    setItems(remaining);

    // Reset selection if current selection is part of deleted set
    if (selectedItem && checkedItemIds.includes(selectedItem.id)) {
      setSelectedItem(remaining[0] || null);
    }

    setCheckedItemIds([]);
    setIsBulkDeleteConfirmOpen(false);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingItemId(null);
    setFormTitle('');
    setFormUsername('');
    setFormValue('');
    setFormUrl('');
    setFormNotes('');
    setFormCategory(categories[0] || 'Tanpa Kategori');
    setDrawnPattern([]);
    setGeneratedPass('');
    setShowGen(false);
    setFormError(null);
  };

  const handleOpenAddModal = (type: VaultItemType = 'password') => {
    setFormType(type);
    setFormTitle('');
    setFormUsername('');
    setFormValue('');
    setFormUrl('');
    setFormNotes('');
    setFormCategory(categories[0] || 'Personal');
    setDrawnPattern([]);
    setGeneratedPass('');
    setShowGen(false);
    setIsAddModalOpen(true);
  };

  // Pattern click recording
  const handlePatternDotClick = (nodeIndex: number) => {
    if (drawnPattern.includes(nodeIndex)) {
      // Remove node from clicked list if clicked again to redraw/undo
      const foundIdx = drawnPattern.indexOf(nodeIndex);
      setDrawnPattern(drawnPattern.slice(0, foundIdx));
    } else {
      setDrawnPattern([...drawnPattern, nodeIndex]);
    }
  };

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.username && item.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = activeTypeFilter === 'all' || item.type === activeTypeFilter;
    const matchesCategory = activeCategoryFilter === 'All' || item.category === activeCategoryFilter;

    return matchesSearch && matchesType && matchesCategory;
  });

  // Coordinates helper for drawing pattern SVG lines
  const getDotX = (idx: number) => (idx % 3) * 60 + 30;
  const getDotY = (idx: number) => Math.floor(idx / 3) * 60 + 30;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Banner / Header */}
      <div className="bg-stone-50 border border-stone-200 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden shadow-sm">
        <div className="absolute right-0 top-0 w-32 h-32 bg-amber-200/20 rounded-full blur-2xl -z-10" />
        <div className="absolute right-12 bottom-0 w-24 h-24 bg-orange-200/20 rounded-full blur-2xl -z-10" />
        
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100/60 border border-amber-200 rounded-full text-amber-800 text-[10px] font-black uppercase tracking-wider">
            <Lock size={10} className="text-amber-700" />
            Security Shield Active
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-stone-900 tracking-tight">Kunci & Sandi</h1>
          <p className="text-stone-500 text-sm max-w-lg font-medium leading-relaxed">
            Vault digital lokal untuk mengamankan berbagai jenis sandi, pola geser (pattern lock), PIN, dan kode rahasia. Semua data disimpan secara privat.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => handleOpenAddModal('password')}
            className="flex items-center gap-2 px-5 py-3 bg-stone-900 border border-stone-900 hover:bg-stone-800 text-stone-50 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-stone-900/15"
          >
            <Plus size={14} />
            Tambah Baru
          </button>
        </div>
      </div>

      {syncError && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-start justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-800 mt-0.5 shrink-0">
              <Database size={16} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-amber-900 uppercase tracking-tight font-sans">
                {syncError.toLowerCase().includes('permission') 
                  ? 'Hak Akses Supabase Ditolak (Permission Denied)' 
                  : syncError.toLowerCase().includes('relation')
                    ? 'Tabel Vault Belum Tersedia di Supabase'
                    : 'Koneksi Supabase Belum Lengkap'}
              </h3>
              <p className="text-xs text-amber-700 font-medium leading-relaxed max-w-2xl font-sans">
                {syncError.toLowerCase().includes('permission') ? (
                  <>
                    Tabel <code className="bg-amber-100/80 px-1.5 py-0.5 rounded text-amber-950 font-bold font-mono text-[10px]">vault_items</code> sudah ada di Supabase, namun aturan <strong>Row Level Security (RLS)</strong> atau hak akses keamanan belum diatur. Hal ini menyebabkan server Supabase menolak (<em>permission denied</em>) semua upaya penyimpanan sandi.
                  </>
                ) : (
                  <>
                    Tabel <code className="bg-amber-100/80 px-1.5 py-0.5 rounded text-amber-950 font-bold font-mono text-[10px]">vault_items</code> Anda di Supabase belum sepenuhnya diselaraskan (mungkin belum terbuat atau kekurangan beberapa kolom seperti: <code className="font-mono text-amber-950 font-bold text-[10px]">value, url, notes, category, last_modified</code>).
                  </>
                )}
                {" "}Silakan salin query SQL perbaikan di bawah dan jalankan di SQL Editor dashboard Supabase Anda untuk mengaktifkan sinkronisasi otomatis secara aman.
              </p>
              <p className="text-[11px] text-amber-800 font-bold">
                Detail Error: <span className="font-mono bg-white/70 px-1 py-0.5 rounded text-[10px] break-all">{syncError}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row md:flex-col gap-2 w-full md:w-auto shrink-0">
            <button
              onClick={() => {
                const sql = `-- 1. Buat Tabel vault_items (jika belum ada) dengan kolom lengkap
CREATE TABLE IF NOT EXISTS public.vault_items (
    id text NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL,
    title text NOT NULL,
    type text NOT NULL,
    username text DEFAULT '',
    value text NOT NULL DEFAULT '',
    url text DEFAULT '',
    notes text DEFAULT '',
    category text DEFAULT '',
    last_modified timestamp with time zone DEFAULT now(),
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Tambahkan kolom secara aman jika tabelnya sudah ada tapi kolomnya tertinggal
ALTER TABLE public.vault_items ADD COLUMN IF NOT EXISTS value text DEFAULT '';
ALTER TABLE public.vault_items ADD COLUMN IF NOT EXISTS url text DEFAULT '';
ALTER TABLE public.vault_items ADD COLUMN IF NOT EXISTS notes text DEFAULT '';
ALTER TABLE public.vault_items ADD COLUMN IF NOT EXISTS category text DEFAULT '';
ALTER TABLE public.vault_items ADD COLUMN IF NOT EXISTS last_modified timestamp with time zone DEFAULT now();

-- 3. Atifkan Row Level Security (RLS)
ALTER TABLE public.vault_items ENABLE ROW LEVEL SECURITY;

-- 4. Berikan Hak Akses Penuh ke Role Authenticated User & Service Role
GRANT ALL ON public.vault_items TO authenticated;
GRANT ALL ON public.vault_items TO service_role;

-- 5. Hapus Policy Lama (jika ada) untuk Menghindari Konflik Duplikasi
DROP POLICY IF EXISTS "Users can manage their own vault items" ON public.vault_items;
DROP POLICY IF EXISTS "Users can do everything in their own row" ON public.vault_items;

-- 6. Buat Policy Baru: Pengguna hanya boleh CRUD baris milik mereka sendiri
CREATE POLICY "Users can manage their own vault items" 
ON public.vault_items
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);`;
                navigator.clipboard.writeText(sql);
                setSqlCopied(true);
                setTimeout(() => setSqlCopied(false), 8000);
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-[10px] uppercase tracking-wider rounded-lg transition-all shadow-md shadow-amber-600/15 inline-flex items-center justify-center gap-1.5 cursor-pointer font-sans"
            >
              {sqlCopied ? <Check size={12} className="text-white" /> : <Copy size={12} />}
              {sqlCopied ? "Berhasil Disalin!" : "Salin SQL Perbaikan"}
            </button>
            {sqlCopied && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-stone-900 text-stone-100 p-4 rounded-xl border border-stone-850 shadow-xl z-20 text-[11px] font-sans leading-relaxed animate-fadeIn">
                <span className="font-bold text-amber-400 block mb-1">📋 Kode SQL Berhasil Disalin!</span>
                Ikuti langkah mudah ini:<br />
                1. Buka dashboard <strong className="text-white">Supabase</strong> di tab baru.<br />
                2. Masuk ke menu <strong className="text-white">SQL Editor</strong> (ikon terminal/petir).<br />
                3. Buat query baru, tempel (paste) kode SQL, lalu klik <strong className="text-white">RUN</strong>.<br />
                4. Refresh halaman aplikasi ini setelah selesai.
              </div>
            )}
            <a 
              href="https://supabase.com" 
              target="_blank" 
              rel="noreferrer" 
              className="px-4 py-2 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 font-black text-[10px] uppercase tracking-wider rounded-lg text-center transition-all inline-flex items-center justify-center gap-1 font-sans"
            >
              Buka Supabase Dashboard
              <ExternalLink size={10} />
            </a>
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Filter and List View */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Quick Stats & Controls */}
          <div className="bg-white rounded-2xl border border-stone-200/80 p-4 space-y-4 shadow-sm">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
              <input 
                type="text" 
                placeholder="Cari sandi, memo, atau perangkat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-stone-50 text-stone-950 border border-stone-200 rounded-xl focus:border-stone-400 focus:bg-white outline-none text-xs transition-all"
              />
            </div>

            {/* Type Filters tabs */}
            <div className="grid grid-cols-5 gap-1 bg-stone-100 p-1 rounded-xl">
              {(['all', 'password', 'pattern', 'pin', 'key'] as const).map((type) => {
                const isActive = activeTypeFilter === type;
                return (
                  <button
                    key={type}
                    onClick={() => setActiveTypeFilter(type)}
                    className={cn(
                      "py-2 px-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all truncate text-center",
                      isActive 
                        ? "bg-white text-stone-900 shadow-sm border border-stone-200/50" 
                        : "text-stone-500 hover:text-stone-800 hover:bg-white/40"
                    )}
                    title={type}
                  >
                    {type === 'all' ? 'All' : type}
                  </button>
                );
              })}
            </div>

            {/* Category Pill tags */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {filterCategories.map((cat) => {
                const isActive = activeCategoryFilter === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategoryFilter(cat)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border cursor-pointer",
                      isActive
                        ? "bg-stone-900 border-stone-900 text-stone-50 shadow-sm"
                        : "bg-stone-50 border-stone-250 text-stone-600 hover:bg-stone-100 hover:border-stone-300"
                    )}
                  >
                    {cat}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setIsManageCategoriesOpen(true)}
                className="px-2 py-1 rounded-lg text-[9px] font-bold bg-stone-100 border border-stone-200 text-stone-700 hover:bg-stone-200 transition-all flex items-center gap-1 cursor-pointer ml-auto"
                title="Kelola Kategori"
              >
                <Folder size={10} />
                Atur
              </button>
            </div>
          </div>

          {/* List display */}
          <div className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-sm">
            {checkedItemIds.length > 0 ? (
              <div className="p-4 bg-amber-50/60 border-b border-amber-250/50 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-amber-900 flex items-center gap-1.5">
                    ⚡ MASSA EDIT • {checkedItemIds.length} Terpilih
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCheckedItemIds([])}
                      className="px-2.5 py-1 text-[9px] font-black bg-white hover:bg-stone-50 border border-stone-250 text-stone-600 rounded-lg transition-colors cursor-pointer uppercase"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsBulkDeleteConfirmOpen(true)}
                      className="px-2.5 py-1 text-[9px] font-black bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer uppercase shadow-xs"
                    >
                      <Trash2 size={10} />
                      Hapus
                    </button>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black uppercase text-amber-800 tracking-wider block">Pindahkan Cepat ke Kategori:</span>
                  <div className="flex flex-wrap gap-1">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleBulkMove(cat)}
                        className="px-2 py-1 text-[9.5px] font-black bg-white hover:bg-amber-100/60 text-stone-850 hover:text-amber-950 border border-amber-200 hover:border-amber-300 rounded-lg shadow-2xs transition-all cursor-pointer"
                      >
                        📁 {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 bg-stone-50/70 border-b border-stone-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filteredItems.length > 0 && filteredItems.every(i => checkedItemIds.includes(i.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCheckedItemIds(filteredItems.map(i => i.id));
                      } else {
                        setCheckedItemIds([]);
                      }
                    }}
                    className="w-3.5 h-3.5 rounded border-stone-300 text-amber-600 focus:ring-amber-500/10 cursor-pointer accent-amber-500 shrink-0"
                    title="Pilih Semua yang Tampil"
                  />
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">
                    LIST CREDENTIALS ({filteredItems.length})
                  </span>
                </div>
                <span className="text-[10px] bg-stone-200/60 text-stone-700 px-2 py-0.5 rounded-full font-bold">
                  Total: {items.length}
                </span>
              </div>
            )}

            <div className="divide-y divide-stone-100 max-h-[500px] overflow-y-auto custom-scrollbar">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  const isChecked = checkedItemIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={cn(
                        "p-4 cursor-pointer transition-all flex items-center justify-between gap-3 text-left border-l-4",
                        isSelected 
                          ? "bg-stone-50/80 border-l-stone-900" 
                          : "border-l-transparent hover:bg-stone-50/40"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Bullet checklist block for bulk features */}
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleCheckItem(item.id)}
                          onClick={(e) => e.stopPropagation()} // prevent triggering selectedItem display view
                          className="w-3.5 h-3.5 rounded border-stone-350 text-amber-600 focus:ring-amber-500/10 cursor-pointer accent-amber-600 shrink-0"
                        />

                        {/* Icon Wrapper based on type */}
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border",
                          item.type === 'password' ? "bg-amber-50 border-amber-100 text-amber-700" :
                          item.type === 'pattern' ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
                          item.type === 'pin' ? "bg-purple-50 border-purple-100 text-purple-700" :
                          "bg-sky-50 border-sky-100 text-sky-700"
                        )}>
                          {item.type === 'password' && <Key size={16} />}
                          {item.type === 'pattern' && <Grid3x3 size={16} />}
                          {item.type === 'pin' && <Hash size={16} />}
                          {item.type === 'key' && <Shield size={16} />}
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-stone-900 truncate">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[8px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                              {item.category || 'General'}
                            </span>
                            {item.username && (
                              <span className="text-[9px] text-stone-400 truncate max-w-[120px]">
                                • {item.username}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleCopy(item.value, item.id)}
                          className="p-1 px-1.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 transition-all text-[9px] font-bold flex items-center gap-1"
                          title="Copy Password/Value"
                        >
                          {copiedId === item.id ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                          {item.type === 'pattern' ? 'Coords' : 'Copy'}
                        </button>
                        <button
                          onClick={(e) => handleDeleteItem(item.id, e)}
                          className="p-1 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center text-stone-400 space-y-2">
                  <Unlock size={24} className="mx-auto text-stone-300" />
                  <p className="text-xs font-bold">No credentials matching filters</p>
                  <p className="text-[10px]">Create a new password entry to start securing your accounts.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Selected Item Details Pane */}
        <div className="lg:col-span-7">
          {selectedItem ? (
            <div className="bg-white rounded-2xl border border-stone-200/85 overflow-hidden shadow-sm flex flex-col min-h-[480px]">
              
              {/* Details Header */}
              <div className="p-6 bg-stone-50/60 border-b border-stone-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border",
                    selectedItem.type === 'password' ? "bg-amber-100 border-amber-250 text-amber-800" :
                    selectedItem.type === 'pattern' ? "bg-emerald-100 border-emerald-250 text-emerald-800" :
                    selectedItem.type === 'pin' ? "bg-purple-100 border-purple-250 text-purple-800" :
                    "bg-sky-100 border-sky-250 text-sky-800"
                  )}>
                    {selectedItem.type === 'password' && <Key size={18} />}
                    {selectedItem.type === 'pattern' && <Grid3x3 size={18} />}
                    {selectedItem.type === 'pin' && <Hash size={18} />}
                    {selectedItem.type === 'key' && <Shield size={18} />}
                  </div>
                  <div>
                    <h2 className="text-base font-black text-stone-900 tracking-tight">{selectedItem.title}</h2>
                    <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mt-0.5">
                      Last Updated: {format(new Date(selectedItem.lastModified), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEditItem(selectedItem)}
                    className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl border border-stone-200 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <Edit2 size={13} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteItem(selectedItem.id)}
                    className="p-2 hover:bg-red-50 text-red-600 hover:text-red-700 rounded-xl border border-transparent hover:border-red-105 text-xs font-bold transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Detail Content */}
              <div className="p-6 md:p-8 flex-1 space-y-6">
                                {/* Meta details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-stone-50/70 p-3.5 rounded-xl border border-stone-200/50 flex flex-col justify-between group hover:border-amber-200 hover:bg-amber-50/10 transition-all">
                    <span className="text-[9px] font-black uppercase text-stone-400 group-hover:text-amber-800 tracking-wider flex items-center gap-1.5 transition-colors">
                      <Folder size={10} className="text-stone-400 group-hover:text-amber-600 transition-colors" /> Category / Pindah Lipat
                    </span>
                    <div className="relative mt-1">
                      <select
                        value={selectedItem.category || 'Tanpa Kategori'}
                        onChange={(e) => {
                          const targetCategory = e.target.value;
                          const updated = items.map(item => item.id === selectedItem.id ? {
                            ...item,
                            category: targetCategory,
                            lastModified: new Date().toISOString()
                          } : item);
                          setItems(updated);
                          setSelectedItem({
                            ...selectedItem,
                            category: targetCategory,
                            lastModified: new Date().toISOString()
                          });
                        }}
                        className="w-full bg-transparent text-xs font-bold text-stone-800 hover:text-amber-700 outline-none cursor-pointer appearance-none pr-6 focus:text-amber-700"
                      >
                        {categories.map((c) => (
                          <option key={c} value={c} className="text-stone-850 bg-white font-sans font-bold text-xs">
                            📁 {c}
                          </option>
                        ))}
                      </select>
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[9px] text-stone-400 pointer-events-none group-hover:text-amber-600 transition-colors">▼</span>
                    </div>
                  </div>

                  <div className="bg-stone-50/70 p-3.5 rounded-xl border border-stone-200/50">
                    <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider flex items-center gap-1.5">
                      <Globe size={10} /> Credential Type
                    </span>
                    <p className="text-xs font-black capitalize text-stone-800 mt-1">{selectedItem.type}</p>
                  </div>
                </div>

                {/* Main secret viewer area */}
                <div className="bg-stone-900 text-stone-50 rounded-2xl p-6 relative overflow-hidden shadow-md">
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                    <button
                      onClick={() => toggleSecretVisibility(selectedItem.id)}
                      className="p-2 bg-white/10 hover:bg-white/20 text-stone-350 rounded-lg transition-all"
                      title={visibleSecrets[selectedItem.id] ? "Hide Secret" : "Reveal Secret"}
                    >
                      {visibleSecrets[selectedItem.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      onClick={() => handleCopy(selectedItem.value, selectedItem.id)}
                      className="p-2 bg-white/10 hover:bg-white/20 text-stone-350 rounded-lg transition-all flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                      title="Copy value"
                    >
                      {copiedId === selectedItem.id ? (
                        <>
                          <Check size={14} className="text-emerald-400 animate-pulse" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          Copy
                        </>
                      )}
                    </button>
                  </div>

                  {/* Vault secret details display */}
                  <div className="space-y-4">
                    {selectedItem.username && (
                      <div>
                        <span className="text-[9px] font-black uppercase text-stone-500 tracking-wider">Username / Login ID</span>
                        <p className="text-sm font-semibold select-all text-amber-200 mt-0.5">{selectedItem.username}</p>
                      </div>
                    )}

                    <div>
                      <span className="text-[9px] font-black uppercase text-stone-500 tracking-wider">
                        {selectedItem.type === 'pattern' ? 'SWIPE PATTERN DRAWING' : 'SECURE SECRETVIEW'}
                      </span>
                      
                      <div className="mt-2">
                        {/* Types branches */}
                        {selectedItem.type === 'pattern' ? (
                          // RENDER PATTERN LAYOUT VISUALLY
                          <div className="flex flex-col md:flex-row items-center gap-6 py-2">
                            {/* SVG Interactive Pattern Visualizer */}
                            <div className="bg-stone-950 p-4 rounded-xl border border-white/5 shadow-inner relative">
                              <svg width="180" height="180" className="mx-auto overflow-visible">
                                {/* Connect Lines */}
                                {visibleSecrets[selectedItem.id] && (() => {
                                  const coords = selectedItem.value.split(',').map(Number).filter(v => !isNaN(v));
                                  return coords.map((node, index) => {
                                    if (index === 0) return null;
                                    const prevNode = coords[index - 1];
                                    const x1 = getDotX(prevNode);
                                    const y1 = getDotY(prevNode);
                                    const x2 = getDotX(node);
                                    const y2 = getDotY(node);
                                    return (
                                      <line 
                                        key={index} 
                                        x1={x1} y1={y1} x2={x2} y2={y2} 
                                        stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"
                                      />
                                    );
                                  });
                                })()}

                                {/* Interactive Dots */}
                                {Array.from({ length: 9 }).map((_, i) => {
                                  const x = getDotX(i);
                                  const y = getDotY(i);
                                  const coords = selectedItem.value.split(',').map(Number).filter(v => !isNaN(v));
                                  const isPart = visibleSecrets[selectedItem.id] && coords.includes(i);
                                  const seqIndex = coords.indexOf(i);

                                  return (
                                    <g key={i}>
                                      {/* Clean ring for connected path */}
                                      {isPart && (
                                        <circle cx={x} cy={y} r="13" fill="none" stroke="#f59e0b" strokeWidth="1" strokeOpacity="0.4" />
                                      )}
                                      
                                      <circle 
                                        cx={x} cy={y} r="7" 
                                        fill={isPart ? "#f59e0b" : "#44403c"} 
                                        stroke={isPart ? "#ffffff" : "transparent"} 
                                        strokeWidth="1.5"
                                      />

                                      {/* Show sequence order numbers to guide the user */}
                                      {isPart && (
                                        <text 
                                          x={x} y={y + 2.5} 
                                          fill="#ffffff" 
                                          fontSize="8" 
                                          fontFamily="sans-serif" 
                                          fontWeight="black" 
                                          textAnchor="middle"
                                        >
                                          {seqIndex + 1}
                                        </text>
                                      )}
                                    </g>
                                  );
                                })}
                              </svg>
                            </div>

                            <div className="space-y-2 text-left flex-1">
                              {visibleSecrets[selectedItem.id] ? (
                                <>
                                  <p className="text-xs text-stone-350 font-medium leading-relaxed">
                                    Pola geser tersimpan. Ikuti rute urutan angka <span className="text-amber-400 font-bold">1 s/d {selectedItem.value.split(',').length}</span> pada visualizer di samping.
                                  </p>
                                  <div className="inline-flex gap-1 bg-white/5 border border-white/5 p-1.5 rounded-lg text-xs font-mono">
                                    <span className="text-stone-400 mr-1 font-sans">Sequence:</span>
                                    <span className="text-amber-400 font-bold select-all">
                                      {selectedItem.value.split(',').map(Number).map(v => v + 1).join(' → ')}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <p className="text-xs text-stone-400 font-medium leading-relaxed">
                                    Pola geser tersimpan aman. Klik tombol mata <Eye size={12} className="inline mx-1 text-stone-300" /> di atas untuk membuka visualisasi rute kunci.
                                  </p>
                                  <div className="inline-flex gap-1 bg-white/5 border border-white/5 p-1.5 rounded-lg text-xs font-mono select-none opacity-60">
                                    <span className="text-stone-500 mr-1 font-sans">Sequence:</span>
                                    <span className="text-stone-500 font-bold">
                                      ••••••••••••
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                        ) : (
                          // TEXT VAULT DISPLAY (password, keys, pins)
                          <div className="relative flex items-center min-h-[50px] bg-stone-950 px-4 py-3 rounded-xl border border-white/5">
                            {visibleSecrets[selectedItem.id] ? (
                              <p className="text-sm font-mono tracking-tight break-all whitespace-pre-wrap text-stone-200 pr-12 select-all select-text">
                                {selectedItem.value}
                              </p>
                            ) : (
                              <p className="text-lg font-black tracking-[0.4em] text-amber-500/40 select-none pb-1 pointer-events-none">
                                ••••••••••••
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional URL Link */}
                {(selectedItem.type === 'password' || selectedItem.type === 'key') && selectedItem.url && (
                  <div className="pt-2">
                    <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider block mb-1">
                      Target App / Website URL
                    </span>
                    <a
                      href={selectedItem.url.startsWith('http') ? selectedItem.url : `https://${selectedItem.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100/60 border border-amber-100 rounded-lg py-2 px-3 transition-colors"
                    >
                      <Globe size={13} />
                      Go to Website
                    </a>
                  </div>
                )}

                {/* Notes Memo */}
                {selectedItem.notes && (
                  <div className="bg-stone-50/50 p-4 rounded-xl border border-stone-200/60 space-y-1.5">
                    <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider block">
                      Catatan / Notes Memo
                    </span>
                    <p className="text-xs text-stone-700 font-medium leading-relaxed whitespace-pre-wrap">
                      {selectedItem.notes}
                    </p>
                  </div>
                )}

              </div>

              {/* Detail Footer warning tip */}
              <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 flex items-center gap-2 text-stone-400 text-[10px] font-semibold leading-normal">
                <Shield size={14} className="text-amber-600 animate-pulse shrink-0" />
                <span>
                  NexusHub Security Tip: Never share your master screen patterns or critical PIN key combinations with third-party software.
                </span>
              </div>

            </div>
          ) : (
            <div className="bg-stone-105 border-2 border-dashed border-stone-200 rounded-2xl h-[480px] flex flex-col items-center justify-center p-10 text-center text-stone-400">
              <Lock size={32} className="text-stone-300 stroke-[1.2] mb-3" />
              <p className="text-sm font-bold">No credential selected</p>
              <p className="text-xs mt-1 max-w-xs">Select or add a credential from the list to view secure information, generate safe passwords, or look up patterns.</p>
            </div>
          )}
        </div>

      </div>

      {/* RETAIN FULL ACTIONABLE DIALOG: Add & Edit Credential Overlay Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          
          <div className="bg-white rounded-2xl border border-stone-200 w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
              <div>
                <h3 className="text-lg font-black text-stone-900 tracking-tight">
                  {editingItemId ? 'Edit Credential Details' : 'Tambah Kunci / Sandi'}
                </h3>
                <p className="text-[10px] font-bold text-stone-450 uppercase tracking-widest mt-0.5">
                  Secure password vault repository manager
                </p>
              </div>
              <button 
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-full border border-stone-200 bg-white hover:bg-stone-50 text-stone-500 hover:text-stone-900 transition-colors flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body Form wrapper */}
            <form onSubmit={handleSaveItem} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
              
              {formError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-600 flex items-start justify-between gap-1 animate-fadeIn">
                  <span>{formError}</span>
                  <button 
                    type="button" 
                    onClick={() => setFormError(null)} 
                    className="text-rose-450 hover:text-rose-850 font-bold ml-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Select Vault Credential Type */}
              <div className="space-y-1.5Packed">
                <label className="text-[10px] font-black uppercase text-stone-500 tracking-wider">Credential Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'password', label: 'Password', icon: Key },
                    { id: 'pattern', label: 'Pattern', icon: Grid3x3 },
                    { id: 'pin', label: 'PIN Code', icon: Hash },
                    { id: 'key', label: 'Secret Key', icon: Shield }
                  ].map((type) => {
                    const isSelected = formType === type.id;
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => {
                          setFormType(type.id as VaultItemType);
                          setFormValue('');
                        }}
                        disabled={!!editingItemId}
                        className={cn(
                          "py-3 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 text-[10px] font-black tracking-wide uppercase transition-all shadow-sm",
                          isSelected 
                            ? "bg-stone-900 border-stone-900 text-stone-50 scale-102" 
                            : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100/80 hover:border-stone-300 disabled:opacity-50"
                        )}
                      >
                        <Icon size={14} className={isSelected ? 'text-amber-400' : 'text-stone-500'} />
                        {type.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title label field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-stone-500 tracking-wider">
                  Credential Name / Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gmail Alief, PIN Brankas, Swipe HP"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:border-stone-400 focus:bg-white outline-none text-xs text-stone-900 font-bold transition-all"
                />
              </div>

              {/* Dynamic Credential value parameters input field based on type selected */}
              
              {/* Branch 1: PASSWORD input info */}
              {formType === 'password' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-stone-500 tracking-wider">Username or Email ID</label>
                    <input
                      type="text"
                      placeholder="e.g. alief123, cadangankloning@gmail.com"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:border-stone-400 focus:bg-white outline-none text-xs text-stone-900 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase text-stone-500 tracking-wider">
                        Secure Password Value <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowGen(!showGen);
                          if (!showGen) generateSecurePassword();
                        }}
                        className="text-[10px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 bg-amber-50 hover:bg-amber-100 pr-2 pl-1 py-0.5 rounded border border-amber-150 transition-colors"
                      >
                        <RefreshCw size={10} className="text-amber-700" />
                        {showGen ? 'Close Generator' : 'Generate Secure'}
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={showGen ? "text" : "password"}
                        required
                        placeholder="Type safe password or use random generator below"
                        value={formValue}
                        onChange={(e) => setFormValue(e.target.value)}
                        className="w-full pl-3 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:border-stone-400 focus:bg-white outline-none text-xs text-stone-900 font-mono tracking-wide transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowGen(!showGen)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                      >
                        {showGen ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Password Generator controls drawer */}
                  {showGen && (
                    <PasswordGenerator onApplyPassword={(pw) => setFormValue(pw)} />
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-stone-500 tracking-wider">Website URL / Target Link</label>
                    <input
                      type="text"
                      placeholder="e.g. gmail.com, https://github.com"
                      value={formUrl}
                      onChange={(e) => setFormUrl(e.target.value)}
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:border-stone-400 focus:bg-white outline-none text-xs text-stone-900 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Branch 2: PATTERN drawing slate input */}
              {formType === 'pattern' && (
                <div className="space-y-4">
                  <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 text-center flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase text-stone-500 tracking-wider block mb-1">
                      GAMBAR POLA KUNCI / DRAWING PATTERN LOCK
                    </span>
                    <p className="text-stone-400 text-[10px] max-w-sm font-semibold leading-relaxed mb-4">
                      Klik bulatan secara berurutan sesuai arah geser kunci yang Anda gunakan. Klik kembali bulatan di urutan paling akhir untuk menghapus jika ada kesalahan.
                    </p>

                    {/* 3x3 interactive recording grid */}
                    <div className="bg-stone-950 p-6 rounded-xl border border-white/5 shadow-inner">
                      <svg width="220" height="220" className="mx-auto overflow-visible select-none">
                        
                        {/* Drag indicator/Sequence wire connection */}
                        {drawnPattern.length > 0 && drawnPattern.map((node, index) => {
                          if (index === 0) return null;
                          const prev = drawnPattern[index - 1];
                          const x1 = (prev % 3) * 70 + 40;
                          const y1 = Math.floor(prev / 3) * 70 + 40;
                          const x2 = (node % 3) * 70 + 40;
                          const y2 = Math.floor(node / 3) * 70 + 40;
                          return (
                            <line 
                              key={index} 
                              x1={x1} y1={y1} x2={x2} y2={y2} 
                              stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"
                            />
                          );
                        })}

                        {/* Interactive dots overlay */}
                        {Array.from({ length: 9 }).map((_, i) => {
                          const col = i % 3;
                          const row = Math.floor(i / 3);
                          const x = col * 70 + 40;
                          const y = row * 70 + 40;

                          const isPart = drawnPattern.includes(i);
                          const seqOrder = drawnPattern.indexOf(i);

                          return (
                            <g 
                              key={i} 
                              onClick={() => handlePatternDotClick(i)} 
                              className="cursor-pointer group"
                            >
                              {/* Touch Target Hover Area circle */}
                              <circle cx={x} cy={y} r="24" fill="transparent" />

                              {/* Selected Subtle Outlying Halo */}
                              {isPart && (
                                <circle cx={x} cy={y} r="14" fill="none" stroke="#f59e0b" strokeWidth="1" strokeOpacity="0.4" />
                              )}

                              {/* Base dot element */}
                              <circle 
                                cx={x} cy={y} r="7.5" 
                                fill={isPart ? "#f59e0b" : "#44403c"} 
                                stroke={isPart ? "#ffffff" : "transparent"} 
                                strokeWidth="1.5"
                                className="transition-all duration-200"
                              />

                              {/* Seq Order text ID */}
                              {isPart ? (
                                <text 
                                  x={x} y={y + 2.5} 
                                  fill="#ffffff" 
                                  fontSize="8" 
                                  fontWeight="black" 
                                  fontFamily="sans-serif" 
                                  textAnchor="middle"
                                >
                                  {seqOrder + 1}
                                </text>
                              ) : (
                                <text 
                                  x={x} y={y + 3} 
                                  fill="#a8a29e" 
                                  fontSize="8" 
                                  fontFamily="sans-serif" 
                                  textAnchor="middle"
                                  className="opacity-0 group-hover:opacity-40 transition-opacity duration-200"
                                >
                                  {i + 1}
                                </text>
                              )}
                            </g>
                          );
                        })}
                      </svg>
                    </div>

                    {/* Reset custom drawing button */}
                    <div className="flex items-center gap-3 mt-4">
                      <button
                        type="button"
                        onClick={() => setDrawnPattern([])}
                        className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-100 text-red-650 hover:text-red-700 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors"
                      >
                        Reset / Clear Draw
                      </button>
                      <span className="text-[11px] font-mono bg-stone-200/60 font-bold px-2.5 py-1 rounded-lg text-stone-700">
                        {drawnPattern.length ? `Connected: ${drawnPattern.map(v => v+1).join(' → ')}` : 'Empty Draw'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Branch 3: PIN (numeric values input) */}
              {formType === 'pin' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-stone-500 tracking-wider">
                      PIN Code Numeric passcode <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 1928, 938201 (Hanya Angka)"
                      value={formValue}
                      onChange={(e) => setFormValue(e.target.value.replace(/\D/g, ''))} // regex filter purely numbers
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:border-stone-400 focus:bg-white outline-none text-base text-stone-950 font-black tracking-widest text-center transition-all"
                      maxLength={12}
                    />
                  </div>

                  {/* Visual keypad calculator style tactile UI for screen taps */}
                  <div className="bg-stone-50 border border-stone-200/70 p-4 rounded-xl max-w-[280px] mx-auto">
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            if (formValue.length < 12) setFormValue(prev => prev + num);
                          }}
                          className="py-2.5 bg-white hover:bg-stone-100/80 active:bg-stone-200 border border-stone-200 text-stone-800 font-black text-center rounded-xl transition-all shadow-sm active:scale-95"
                        >
                          {num}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setFormValue('')}
                        className="py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-center text-xs rounded-xl transition-all shadow-sm active:scale-95 border border-red-100"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (formValue.length < 12) setFormValue(prev => prev + '0');
                        }}
                        className="py-2.5 bg-white hover:bg-stone-100/80 active:bg-stone-200 border border-stone-200 text-stone-800 font-black text-center rounded-xl transition-all shadow-sm"
                      >
                        0
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormValue(prev => prev.slice(0, -1))}
                        className="py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-750 font-black text-center rounded-xl transition-all shadow-sm text-xs"
                      >
                        DEL
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Branch 4: SECRET RECOVERY KEY / TOKEN */}
              {formType === 'key' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-stone-500 tracking-wider">
                      Secret Key / Recovery Phrase / SSH / API Token <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      placeholder="Paste secret phrase, 12-words mnemonics, or RSA keys here..."
                      value={formValue}
                      onChange={(e) => setFormValue(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:border-stone-400 focus:bg-white outline-none text-xs text-stone-900 font-mono tracking-wide leading-relaxed transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-stone-500 tracking-wider">Target API Server / Provider</label>
                    <input
                      type="text"
                      placeholder="e.g. AWS Console, Github Enterprise, Metamask Wallet"
                      value={formUrl}
                      onChange={(e) => setFormUrl(e.target.value)}
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:border-stone-400 focus:bg-white outline-none text-xs text-stone-900 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Folder Category Select */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-stone-500 tracking-wider">Folder Category Group</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:border-stone-400 focus:bg-white outline-none text-xs font-bold text-stone-800 transition-all cursor-pointer"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Memo / Notes */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-stone-500 tracking-wider">Catatan Tambahan (Memo)</label>
                <textarea
                  placeholder="Ketik memo tentang sandi ini (misal: dirubah berkala, digunakan untuk akun cadangan, dll)"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:border-stone-400 focus:bg-white outline-none text-xs text-stone-900 transition-all leading-relaxed"
                />
              </div>

              {/* Submittable Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 sticky bottom-0 bg-white border-t border-stone-100 py-4 mt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-5 py-3 border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-stone-900 hover:bg-stone-850 text-stone-50 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-95"
                >
                  {editingItemId ? 'Update Credential' : 'Simpan Credential'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {isManageCategoriesOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn animate-duration-200">
          <div className="bg-white rounded-2xl border border-stone-200 w-full max-w-md shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            
            {/* Header */}
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
              <div>
                <h3 className="text-sm font-black text-stone-900 tracking-tight">Atur Kategori Sandi</h3>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">
                  Tambahkan, edit, atau hapus folder kategori
                </p>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setIsManageCategoriesOpen(false);
                  setEditingCatIndex(null);
                }}
                className="w-7 h-7 rounded-full border border-stone-200 bg-white hover:bg-stone-50 text-stone-500 hover:text-stone-900 transition-colors flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* List and Actions form */}
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              
              {/* Error notification banner */}
              {categoryError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] font-bold text-rose-600 flex items-start justify-between gap-1 animate-fadeIn">
                  <span>{categoryError}</span>
                  <button 
                    type="button" 
                    onClick={() => setCategoryError(null)} 
                    className="text-rose-450 hover:text-rose-850 font-bold ml-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Delete action confirmation prompt */}
              {categoryToDelete && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3 animate-fadeIn">
                  <h4 className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                    ⚠️ Hapus Kategori?
                  </h4>
                  <p className="text-[11px] text-amber-805 leading-relaxed font-sans font-medium">
                    Apakah Anda yakin ingin menghapus kategori <strong className="font-bold">"{categoryToDelete}"</strong>? Sandi yang sudah diletakkan di kategori ini akan tetap aman disimpan di akun Anda.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={executeDeleteCategory}
                      className="flex-1 py-2 bg-red-600 hover:bg-red-750 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95 text-center"
                    >
                      Ya, Hapus
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryToDelete(null)}
                      className="flex-1 py-2 bg-white border border-stone-250 text-stone-700 font-bold rounded-lg text-[10px] uppercase tracking-wider hover:bg-stone-50 transition-all cursor-pointer text-center"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}

              {/* Reset to defaults confirmation prompt */}
              {categoryToReset && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3 animate-fadeIn">
                  <h4 className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                    🔄 Atur Ulang Kategori?
                  </h4>
                  <p className="text-[11px] text-amber-805 leading-relaxed font-sans font-medium">
                    Ini akan mengembalikan daftar kategori ke bawaan awal yaitu: <strong className="font-bold">Personal, Work, Finance, Social, Devices</strong>. Kategori kustom yang Anda buat akan terhapus. Lanjutkan?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={executeResetCategories}
                      className="flex-1 py-2 bg-amber-600 hover:bg-amber-750 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95 text-center"
                    >
                      Ya, Atur Ulang
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryToReset(false)}
                      className="flex-1 py-2 bg-white border border-stone-250 text-stone-700 font-bold rounded-lg text-[10px] uppercase tracking-wider hover:bg-stone-50 transition-all cursor-pointer text-center"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}

              {/* Form to Add Category */}
              {!categoryToDelete && !categoryToReset && (
                <form onSubmit={handleAddCategory} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nama kategori baru..."
                    value={newCatName}
                    onChange={(e) => {
                      setNewCatName(e.target.value);
                      if (categoryError) setCategoryError(null);
                    }}
                    className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:border-stone-400 focus:bg-white outline-none text-xs font-bold text-stone-900 transition-all font-sans"
                    maxLength={25}
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-850 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95 text-center"
                  >
                    Tambah
                  </button>
                </form>
              )}

              {/* Categories list */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-stone-500 tracking-wider">Daftar Kategori Aktif</label>
                <div className="divide-y divide-stone-100 border border-stone-200/60 rounded-xl overflow-hidden bg-stone-50/35">
                  {categories.map((cat, index) => {
                    const isEditing = editingCatIndex === index;
                    return (
                      <div key={index} className="flex items-center justify-between p-3 gap-2">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <input
                              type="text"
                              value={editingCatValue}
                              onChange={(e) => {
                                setEditingCatValue(e.target.value);
                                if (categoryError) setCategoryError(null);
                              }}
                              className="flex-1 px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg outline-none text-xs text-stone-900 font-bold"
                              maxLength={25}
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditCategory(index)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                            >
                              Simpan
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCatIndex(null)}
                              className="px-2.5 py-1.5 bg-stone-250 hover:bg-stone-300 text-stone-600 rounded-lg text-[10px] font-bold cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <Folder size={12} className={cn("text-stone-400", cat === 'Tanpa Kategori' && "text-amber-500")} />
                              <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5 font-sans">
                                {cat}
                                {cat === 'Tanpa Kategori' && (
                                  <span className="text-[8px] font-extrabold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200/50 px-1.5 py-0.5 rounded">
                                    Default Sistem
                                  </span>
                                )}
                              </span>
                            </div>
                            {cat !== 'Tanpa Kategori' && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditCategory(index, cat)}
                                  className="p-1 px-1.5 text-[9px] font-bold border border-stone-200 bg-white hover:bg-stone-50 text-stone-500 hover:text-stone-800 rounded transition-all cursor-pointer"
                                  title="Edit / Rename Kategori"
                                >
                                  Rename
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(cat)}
                                  className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded transition-all cursor-pointer"
                                  title="Hapus Kategori"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reset to defaults helper button */}
              {!categoryToDelete && !categoryToReset && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={handleResetCategories}
                    className="text-[10px] font-bold text-stone-400 hover:text-stone-600 inline-flex items-center gap-1 cursor-pointer font-sans"
                  >
                    <RefreshCw size={10} />
                    Atur Ulang ke Kategori Bawaan
                  </button>
                </div>
              )}

            </div>

            {/* Footer informational */}
            <div className="p-4 bg-stone-50 border-t border-stone-100 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsManageCategoriesOpen(false);
                  setEditingCatIndex(null);
                }}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-all w-full cursor-pointer border border-stone-200"
              >
                Tutup / Selesai
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Custom item deletion confirmation modal */}
      <ConfirmDeleteModal
        isOpen={!!itemToDelete}
        title="Hapus Kredensial?"
        description={
          itemToDelete ? (
            <>
              Apakah Anda yakin ingin menghapus kredensial <strong className="font-bold text-stone-900">"{itemToDelete.title}"</strong>?<br />Tindakan ini permanen dan tidak dapat dibatalkan.
            </>
          ) : ""
        }
        onConfirm={executeDeleteItem}
        onCancel={() => setItemToDelete(null)}
      />

      {/* Custom bulk action deletion confirmation modal */}
      <ConfirmDeleteModal
        isOpen={isBulkDeleteConfirmOpen}
        title="Hapus Banyak Kredensial?"
        description={
          <>
            Apakah Anda yakin ingin menghapus <strong className="font-bold text-red-650">{checkedItemIds.length}</strong> kredensial terpilih sekaligus?<br />Semua kredensial ini akan langsung dihapus dari vault Anda selamanya.
          </>
        }
        confirmText={`Hapus Semua (${checkedItemIds.length})`}
        onConfirm={executeBulkDelete}
        onCancel={() => setIsBulkDeleteConfirmOpen(false)}
      />

    </div>
  );
}
