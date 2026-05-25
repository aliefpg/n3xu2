import React from 'react';
import { Trash2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  description: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ConfirmDeleteModal({
  isOpen,
  title,
  description,
  confirmText = 'Ya, Hapus',
  cancelText = 'Batal',
  onConfirm,
  onCancel,
  isLoading = false
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-[2px] flex items-center justify-center p-4 z-50 animate-fadeIn pointer-events-auto">
      <div className="bg-white rounded-3xl border border-stone-200 w-full max-w-sm shadow-2xl p-6 space-y-4 font-sans text-left">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-red-50 border border-red-100 text-red-650 rounded-full flex items-center justify-center mx-auto text-lg animate-pulse">
            ⚠️
          </div>
          <h3 className="text-sm font-black text-stone-900 tracking-tight">{title}</h3>
          <div className="text-[11px] text-stone-550 leading-relaxed font-sans font-medium">
            {description}
          </div>
        </div>
        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-black rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95 text-center"
          >
            {isLoading ? 'Menghapus...' : confirmText}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="flex-1 py-3 bg-white border border-stone-250 text-stone-700 font-bold rounded-xl text-[10px] uppercase tracking-wider hover:bg-stone-50 transition-all cursor-pointer text-center"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}
