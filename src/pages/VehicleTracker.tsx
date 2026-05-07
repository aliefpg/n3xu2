import React, { useState, useMemo } from 'react';
import { VehicleState, VehicleLog, VehiclePart, Expense } from '../types';
import { Plus, Settings, Wrench, AlertTriangle, CheckCircle2, History, Trash2, Map, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function VehicleTracker({ vehicle, setVehicle, setExpenses }: { vehicle: VehicleState, setVehicle: React.Dispatch<React.SetStateAction<VehicleState>>, setExpenses?: React.Dispatch<React.SetStateAction<Expense[]>> }) {
    const [activeTab, setActiveTab] = useState<'parts' | 'logs'>('parts');
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [newLog, setNewLog] = useState<{ distance: string, note: string, date: string }>({ distance: '', note: '', date: format(new Date(), 'yyyy-MM-dd') });

    // Servis Modal State
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
    const [newService, setNewService] = useState<{ cost: string, note: string, date: string, type: 'Servis' | 'Ganti' }>({ cost: '', note: '', date: format(new Date(), 'yyyy-MM-dd'), type: 'Servis' });

    // Add Part Modal State
    const [isAddPartModalOpen, setIsAddPartModalOpen] = useState(false);
    const [newPart, setNewPart] = useState({ name: '', intervalKm: '' });

    const totalMaintenanceCost = useMemo(() => {
        return vehicle.logs.reduce((sum, log) => sum + (log.cost || 0), 0);
    }, [vehicle.logs]);

    const groupedLogs = useMemo(() => {
        const groups: { [dateStr: string]: { totalDistance: number, logs: VehicleLog[] } } = {};
        vehicle.logs.forEach(log => {
            const dateStr = format(new Date(log.date), 'yyyy-MM-dd');
            if (!groups[dateStr]) groups[dateStr] = { totalDistance: 0, logs: [] };
            groups[dateStr].logs.push(log);
            if (log.type === 'Distance' && log.distanceAdded) {
                groups[dateStr].totalDistance += log.distanceAdded;
            }
        });
        return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
    }, [vehicle.logs]);

    const handleAddLog = (e: React.FormEvent) => {
        e.preventDefault();
        const distance = parseFloat(newLog.distance);
        if (isNaN(distance) || distance <= 0) return;

        const logDateIso = new Date(newLog.date).toISOString();

        const log: VehicleLog = {
            id: Math.random().toString(36).substr(2, 9),
            date: logDateIso,
            distanceAdded: distance,
            title: 'Perjalanan Jarak',
            note: newLog.note,
            type: 'Distance'
        };

        setVehicle(prev => ({
            ...prev,
            currentOdo: prev.currentOdo + distance,
            logs: [log, ...prev.logs],
            parts: prev.parts.map(p => {
                const remaining = p.intervalKm - ((prev.currentOdo + distance) - p.lastServiceOdo);
                let status: 'Good' | 'Warning' | 'Overdue' = 'Good';
                if (remaining <= 0) status = 'Overdue';
                else if (remaining <= 500) status = 'Warning';

                return { ...p, status };
            })
        }));

        setNewLog({ distance: '', note: '', date: format(new Date(), 'yyyy-MM-dd') });
        setIsLogModalOpen(false);
    };

    const handleDeleteLog = (logId: string) => {
        if (window.confirm('Yakin ingin menghapus riwayat ini?')) {
            setVehicle(prev => {
                const logToDelete = prev.logs.find(l => l.id === logId);
                if (!logToDelete) return prev;

                let newOdo = prev.currentOdo;
                if (logToDelete.type === 'Distance') {
                    newOdo = Math.max(0, prev.currentOdo - logToDelete.distanceAdded);
                }

                return {
                    ...prev,
                    currentOdo: newOdo,
                    logs: prev.logs.filter(l => l.id !== logId),
                    parts: prev.parts.map(p => {
                        // We only recalculate remaining km based on the new odo
                        // If we really wanted to be perfectly accurate we'd have to rollback service records too
                        // but just adjusting the currentOdo vs lastServiceOdo is enough for an approximation.
                        const remaining = p.intervalKm - (newOdo - p.lastServiceOdo);
                        let status: 'Good' | 'Warning' | 'Overdue' = 'Good';
                        if (remaining <= 0) status = 'Overdue';
                        else if (remaining <= 500) status = 'Warning';
                        return { ...p, status };
                    })
                };
            });
        }
    };

    const handleOpenServiceModal = (partId: string) => {
        setSelectedPartId(partId);
        setNewService({ cost: '', note: '', date: format(new Date(), 'yyyy-MM-dd'), type: 'Servis' });
        setIsServiceModalOpen(true);
    };

    const handleConfirmService = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPartId) return;

        const costVal = newService.cost.replace(/\D/g, '');
        const finalCost = costVal ? Number(costVal) : 0;
        const serviceDateIso = new Date(newService.date).toISOString();

        const part = vehicle.parts.find(p => p.id === selectedPartId);
        if (!part) return;

        setVehicle(prev => {
            return {
                ...prev,
                logs: [{
                    id: Math.random().toString(36).substr(2, 9),
                    date: serviceDateIso,
                    distanceAdded: 0,
                    title: newService.type === 'Ganti' ? `Ganti ${part.name}` : `Servis ${part.name}`,
                    note: newService.note,
                    cost: finalCost,
                    type: 'Maintenance'
                }, ...prev.logs],
                parts: prev.parts.map(p =>
                    p.id === selectedPartId
                        ? {
                            ...p,
                            lastServiceDate: serviceDateIso,
                            lastServiceOdo: prev.currentOdo,
                            status: 'Good'
                        }
                        : p
                )
            };
        });

        if (finalCost > 0 && setExpenses) {
            setExpenses(prev => [{
                id: Math.random().toString(36).substr(2, 9),
                amount: finalCost,
                category: 'Transport',
                date: serviceDateIso,
                description: `${newService.type === 'Ganti' ? 'Ganti Part' : 'Servis'} Motor: ${part.name}${newService.note ? ` - ${newService.note}` : ''}`,
                type: 'expense'
            }, ...prev]);
        }

        setIsServiceModalOpen(false);
    };

    const handleAddPart = (e: React.FormEvent) => {
        e.preventDefault();
        const intervalKm = parseFloat(newPart.intervalKm);
        if (!newPart.name || isNaN(intervalKm) || intervalKm <= 0) return;

        setVehicle(prev => ({
            ...prev,
            parts: [...prev.parts, {
                id: Math.random().toString(36).substr(2, 9),
                name: newPart.name,
                intervalKm,
                lastServiceDate: new Date().toISOString(),
                lastServiceOdo: prev.currentOdo,
                status: 'Good'
            }]
        }));

        setNewPart({ name: '', intervalKm: '' });
        setIsAddPartModalOpen(false);
    };

    const handleDeletePart = (partId: string) => {
        if (window.confirm('Yakin ingin menghapus part ini dari pelacakan?')) {
            setVehicle(prev => ({
                ...prev,
                parts: prev.parts.filter(p => p.id !== partId)
            }));
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 pb-12 relative px-4 md:px-0">

            {/* Header Dashboard */}
            <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative shadow-xl shadow-slate-900/20">
                <div className="absolute top-0 right-0 p-8 opacity-10"><Wrench size={120} className="text-blue-500" /></div>
                <div className="z-10 text-center md:text-left space-y-1">
                    <h2 className="text-xl md:text-2xl font-bold">Motorcycle Tracker</h2>
                    <p className="text-slate-400 text-sm">Virtual Odometer & Maintenance</p>
                </div>
                <div className="z-10 flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex flex-col items-center md:items-end bg-white/5 px-6 py-4 rounded-2xl backdrop-blur-sm border border-white/10">
                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Total Biaya</span>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-lg md:text-xl font-bold text-rose-400">Rp {totalMaintenanceCost.toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-center md:items-end bg-white/10 px-8 py-4 rounded-2xl backdrop-blur-sm border border-white/10">
                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Odometer</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl md:text-5xl font-black text-white">{vehicle.currentOdo.toLocaleString('id-ID')}</span>
                            <span className="text-slate-400 font-bold">KM</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
                <button
                    onClick={() => setActiveTab('parts')}
                    className={cn("px-6 py-3 rounded-xl text-sm font-bold transition-colors flex-1 md:flex-none", activeTab === 'parts' ? "bg-slate-900 text-white" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50")}
                >
                    Spare Parts
                </button>
                <button
                    onClick={() => setActiveTab('logs')}
                    className={cn("px-6 py-3 rounded-xl text-sm font-bold transition-colors flex-1 md:flex-none", activeTab === 'logs' ? "bg-slate-900 text-white" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50")}
                >
                    Riwayat
                </button>
                <div className="flex-1"></div>
                {activeTab === 'parts' && (
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                        <button
                            onClick={() => setIsAddPartModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                        >
                            <Plus size={14} /> Tambah Part Baru
                        </button>
                    </div>
                )}
                <button
                    onClick={() => setIsLogModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 w-full md:w-auto"
                >
                    <Plus size={18} /> <span>Tambah Jarak</span>
                </button>
            </div>

            {activeTab === 'parts' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vehicle.parts.map(part => {
                        const kmSejakServis = vehicle.currentOdo - part.lastServiceOdo;
                        const progress = Math.min(100, Math.max(0, (kmSejakServis / part.intervalKm) * 100));
                        const sisaKm = Math.max(0, part.intervalKm - kmSejakServis);
                        const isWarning = progress >= 85;
                        const isOverdue = progress >= 100;

                        return (
                            <div key={part.id} className={cn("p-5 rounded-2xl border bg-white shadow-sm transition-all relative overflow-hidden", isOverdue ? "border-rose-200 bg-rose-50/30" : isWarning ? "border-amber-200 bg-amber-50/30" : "border-slate-200")}>
                                {progress < 85 && <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-2xl -mr-10 -mt-10" />}
                                {isWarning && <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 opacity-50 rounded-full blur-2xl -mr-10 -mt-10" />}
                                {isOverdue && <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 opacity-50 rounded-full blur-2xl -mr-10 -mt-10" />}

                                <div className="flex items-start justify-between mb-4 relative z-10">
                                    <div className="pr-2">
                                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                            {part.name}
                                            <button
                                                onClick={() => handleDeletePart(part.id)}
                                                className="text-slate-300 hover:text-rose-500 transition-colors p-1 rounded-md"
                                                title="Hapus Part"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1 font-medium">Ganti tiap {part.intervalKm.toLocaleString('id-ID')} KM</p>
                                    </div>
                                    <div className={cn("p-2 rounded-lg shrink-0", isOverdue ? "bg-rose-100 text-rose-600" : isWarning ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600")}>
                                        {isOverdue ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
                                    </div>
                                </div>

                                <div className="space-y-2 mb-6 relative z-10">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-slate-500">{kmSejakServis.toLocaleString('id-ID')} KM terpakai</span>
                                        <span className={cn(isOverdue ? "text-rose-600" : isWarning ? "text-amber-600" : "text-emerald-600")}>
                                            {isOverdue ? `Lebih ${Math.abs(sisaKm).toLocaleString('id-ID')} KM` : `Sisa ${sisaKm.toLocaleString('id-ID')} KM`}
                                        </span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={cn("h-full rounded-full transition-all duration-1000", isOverdue ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-emerald-500")}
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleOpenServiceModal(part.id)}
                                    className={cn("w-full py-3 rounded-xl text-sm font-bold border transition-colors flex items-center justify-center gap-2 relative z-10", isOverdue ? "bg-rose-600 text-white border-rose-600 hover:bg-rose-700" : isWarning ? "bg-amber-500 text-white border-amber-500 hover:bg-amber-600" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900")}
                                >
                                    <Settings size={16} /> Catat Servis & Biaya
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}

            {activeTab === 'logs' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {vehicle.logs.length === 0 ? (
                        <div className="p-10 text-center text-slate-400">
                            <History size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="font-medium">Belum ada riwayat aktivitas.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 flex flex-col gap-4 p-4 md:p-6 bg-slate-50 border-t border-slate-100">
                            {groupedLogs.map(([dateStr, group]) => (
                                <div key={dateStr} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                    <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex justify-between items-center sm:px-5">
                                        <h3 className="font-bold text-slate-800 text-sm">{format(new Date(dateStr), 'EEEE, dd MMM yyyy')}</h3>
                                        <div className="text-xs font-black text-blue-600 bg-blue-100 px-3 py-1 rounded-full border border-blue-200">
                                            Total: {group.totalDistance} KM
                                        </div>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {group.logs.map(log => (
                                            <div key={log.id} className="p-4 md:p-5 flex items-center justify-between gap-4 group/log hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", log.type === 'Distance' ? "bg-blue-50 text-blue-600" : "bg-rose-50 text-rose-600")}>
                                                        {log.type === 'Distance' ? <Map size={18} /> : <Wrench size={18} />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-slate-900 text-sm md:text-base truncate">{log.title || (log.type === 'Distance' ? 'Perjalanan Jarak' : log.note || 'Perawatan')}</div>
                                                        <div className="text-xs text-slate-500 mt-0.5">
                                                            {format(new Date(log.date), 'HH:mm')}
                                                            {(log.title && log.note) && ` • ${log.note}`}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 shrink-0">
                                                    <div className="text-right">
                                                        {log.type === 'Distance' && (
                                                            <div className="text-sm font-black text-blue-600">
                                                                +{log.distanceAdded} KM
                                                            </div>
                                                        )}
                                                        {log.type === 'Maintenance' && (
                                                            <div className="text-sm font-black text-rose-500">
                                                                -Rp {log.cost?.toLocaleString('id-ID') || '0'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteLog(log.id)}
                                                        className="p-2 text-slate-200 hover:bg-rose-50 hover:text-rose-500 rounded-lg transition-colors opacity-0 group-hover/log:opacity-100"
                                                        title="Hapus Riyawat"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Modal Add Distance Log */}
            <AnimatePresence>
                {isLogModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsLogModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-md bg-white rounded-3xl shadow-2xl relative z-10 overflow-hidden"
                        >
                            <div className="p-6 md:p-8 space-y-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-900">Tambah Jarak</h3>
                                    <p className="text-slate-500 text-sm mt-1">Masukkan jarak yang ditempuh hari ini (dari Maps / estimasi) untuk menambahkan virtual odometer.</p>
                                </div>

                                <form onSubmit={handleAddLog} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tanggal Perjalanan</label>
                                        <input
                                            type="date"
                                            required
                                            value={newLog.date}
                                            onChange={e => setNewLog({ ...newLog, date: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Jarak Ditempuh (KM)</label>
                                        <input
                                            type="number"
                                            required
                                            step="0.1"
                                            min="0.1"
                                            placeholder="Contoh: 15.5"
                                            value={newLog.distance}
                                            onChange={e => setNewLog({ ...newLog, distance: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Catatan (Opsional)</label>
                                        <input
                                            type="text"
                                            placeholder="Contoh: Perjalanan ke Kantor"
                                            value={newLog.note}
                                            onChange={e => setNewLog({ ...newLog, note: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 font-bold text-slate-600"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 transition-all mt-4"
                                    >
                                        Tambahkan Jarak
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal Add Service/Maintenance */}
            <AnimatePresence>
                {isServiceModalOpen && selectedPartId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsServiceModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-md bg-white rounded-3xl shadow-2xl relative z-10 overflow-hidden"
                        >
                            <div className="p-6 md:p-8 space-y-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-900">Catat Servis</h3>
                                    <p className="text-slate-500 text-sm mt-1">
                                        Reset interval servis untuk <span className="font-bold text-slate-800">{vehicle.parts.find(p => p.id === selectedPartId)?.name}</span>.
                                    </p>
                                </div>

                                <form onSubmit={handleConfirmService} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Jenis Tindakan</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setNewService({ ...newService, type: 'Servis' })}
                                                className={cn("py-3 rounded-xl text-sm font-bold border transition-colors", newService.type === 'Servis' ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50")}
                                            >
                                                Servis Biasa
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setNewService({ ...newService, type: 'Ganti' })}
                                                className={cn("py-3 rounded-xl text-sm font-bold border transition-colors", newService.type === 'Ganti' ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50")}
                                            >
                                                Ganti Part Baru
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tanggal Tindakan</label>
                                        <input
                                            type="date"
                                            required
                                            value={newService.date}
                                            onChange={e => setNewService({ ...newService, date: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Biaya (Rp)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</span>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Contoh: 150.000"
                                                value={newService.cost}
                                                onChange={e => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    setNewService({ ...newService, cost: val ? Number(val).toLocaleString('id-ID') : '' });
                                                }}
                                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 font-bold"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Catatan Teknisi / Bengkel (Opsional)</label>
                                        <input
                                            type="text"
                                            placeholder="Contoh: Servis di AHASS, sekalian ganti baut"
                                            value={newService.note}
                                            onChange={e => setNewService({ ...newService, note: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 font-bold text-slate-600"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/25 transition-all mt-4"
                                    >
                                        Simpan Riwayat
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal Add Part */}
            <AnimatePresence>
                {isAddPartModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsAddPartModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-md bg-white rounded-3xl shadow-2xl relative z-10 overflow-hidden"
                        >
                            <div className="p-6 md:p-8 space-y-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-900">Tambah Part Manual</h3>
                                    <p className="text-slate-500 text-sm mt-1">
                                        Tambahkan spare part atau komponen perawatan dengan interval khusus.
                                    </p>
                                </div>

                                <form onSubmit={handleAddPart} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nama Part / Perawatan</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Contoh: Ganti Ban Depan"
                                            value={newPart.name}
                                            onChange={e => setNewPart({ ...newPart, name: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 font-bold text-slate-600"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Interval Jarak (KM)</label>
                                        <input
                                            type="number"
                                            required
                                            step="1"
                                            min="1"
                                            placeholder="Contoh: 15000"
                                            value={newPart.intervalKm}
                                            onChange={e => setNewPart({ ...newPart, intervalKm: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 font-bold"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-lg shadow-slate-900/25 transition-all mt-4"
                                    >
                                        Tambah Part
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}
