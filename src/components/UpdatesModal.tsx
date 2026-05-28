import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X } from 'lucide-react';

interface PatchChange {
  title: string;
  items: string[];
  icon: string;
}

interface PatchNote {
  version: string;
  date: string;
  status: 'AKTIF' | 'SEBELUMNYA';
  sections: PatchChange[];
}

const PATCH_NOTES: PatchNote[] = [
  {
    version: "PATCH v3.2",
    date: "28 Mei 2026",
    status: "AKTIF",
    sections: [
      {
        title: "Optimasi Mobile Workout Tracker",
        icon: "🎯",
        items: [
          "Layout Personal Record (PR) di layar HP jadi lebih rapih dan tidak terpotong.",
          "Label tutorial sekarang tidak bertabrakan dengan nama gerakan.",
          "Bersihkan data dummy latihan yang nggak berguna biar fokus sama riwayat fitness asli Anda."
        ]
      },
      {
        title: "Medal Kehormatan Rekor Baru",
        icon: "🥇",
        items: [
          "Dapatkan medali emas 🥇, perak 🥈, dan perunggu 🥉 untuk rekor PR terbaik Anda di setiap gerakan.",
          "Desain placeholder cantik supaya Anda semangat buat memulai catat latihan!"
        ]
      },
      {
        title: "Fitur Istimewa NexusHub Lainnya",
        icon: "🔒",
        items: [
          "Brankas Sandi (Vault): Simpan data akun, password web, dan notes rahasia Anda secara terlindungi di saku Anda.",
          "Keuangan (Expenses) & Diet (Meals): Manajemen asupan harian & pengeluaran terjadwal dalam satu genggaman praktis."
        ]
      }
    ]
  }
];

interface UpdatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpdatesModal({ isOpen, onClose }: UpdatesModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-[10%] max-w-lg mx-auto bg-white rounded-3xl shadow-2xl z-[110] overflow-hidden border border-slate-100 flex flex-col max-h-[80vh] sm:max-h-[75vh]"
          >
            <div className="p-5 border-b border-rose-500/10 flex items-center justify-between shrink-0 bg-amber-500/5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                  <Sparkles size={18} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-950 font-sans tracking-tight">Catatan Update NexusHub</h3>
                  <p className="text-[10px] text-slate-500 font-semibold font-sans">Informasi fitur baru, optimasi, dan perbaikan Bug</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar font-sans">
              {PATCH_NOTES.map((patch, pIdx) => (
                <div key={patch.version} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 text-[10px] font-black tracking-widest bg-emerald-100 text-emerald-700 rounded-full font-mono">
                        {patch.version}
                      </span>
                      <span className="text-[11px] text-slate-450 font-bold">{patch.date}</span>
                    </div>
                    <span className="text-[10px] font-extrabold text-blue-600 bg-blue-100/50 px-2 py-0.5 rounded-md font-mono">
                      {patch.status}
                    </span>
                  </div>

                  {patch.sections.map((section, sIdx) => (
                    <div key={sIdx} className="space-y-2.5">
                      <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 block" />
                        {section.icon} {section.title}
                      </h4>
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 pl-4.5 space-y-2 text-[11px] text-slate-600 leading-relaxed font-semibold">
                        {section.items.map((item, iIdx) => (
                          <p key={iIdx} className="flex items-start gap-1.5 font-sans">
                            <span className="text-amber-500 shrink-0 select-none">•</span>
                            <span>{item}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-105 flex justify-end shrink-0 bg-slate-50">
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-[11px] uppercase tracking-wider rounded-xl transition-all shadow-md shadow-amber-500/20 cursor-pointer text-center"
              >
                Mengerti!
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
