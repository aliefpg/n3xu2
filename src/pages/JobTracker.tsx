import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Search, Building, MapPin, Link2, 
  Trash2, Briefcase, ExternalLink, Calendar,
  CheckCircle2, XCircle, Clock, AlertCircle,
  MoreVertical, Filter, TrendingUp, Edit2
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { JobApplication, ApplicationStatus } from '../types';
import MetricCard from '../components/MetricCard';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

const STATUS_CONFIG: Record<ApplicationStatus, { color: string; icon: any; bg: string }> = {
  Applied: { color: 'text-blue-600', bg: 'bg-blue-50', icon: Clock },
  Screening: { color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertCircle },
  Interviewing: { color: 'text-purple-600', bg: 'bg-purple-50', icon: Briefcase },
  Technical: { color: 'text-indigo-600', bg: 'bg-indigo-50', icon: Briefcase },
  Offer: { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
  Rejected: { color: 'text-rose-600', bg: 'bg-rose-50', icon: XCircle },
  Withdrawn: { color: 'text-slate-600', bg: 'bg-slate-50', icon: XCircle },
};

export default function JobTracker({ jobs, setJobs }: { jobs: JobApplication[], setJobs: React.Dispatch<React.SetStateAction<JobApplication[]>> }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'All'>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [jobToDelete, setJobToDelete] = useState<JobApplication | null>(null);

  // New Application State
  const [newJob, setNewJob] = useState({
    company: '',
    position: '',
    status: 'Applied' as ApplicationStatus,
    location: '',
    salary: '',
    url: '',
    notes: '',
    dateApplied: new Date().toISOString().split('T')[0],
    platform: '',
    source: ''
  });

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingJobId(null);
    setNewJob({
      company: '',
      position: '',
      status: 'Applied',
      location: '',
      salary: '',
      url: '',
      notes: '',
      dateApplied: new Date().toISOString().split('T')[0],
      platform: '',
      source: ''
    });
  };

  const handleAddJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJob.company || !newJob.position) return;

    if (editingJobId) {
      setJobs(prev => prev.map(j => j.id === editingJobId ? {
        ...j,
        ...newJob,
        dateApplied: new Date(newJob.dateApplied).toISOString()
      } : j));
    } else {
      const job: JobApplication = {
        id: Math.random().toString(36).substr(2, 9),
        ...newJob,
        dateApplied: new Date(newJob.dateApplied).toISOString()
      };
      setJobs([job, ...jobs]);
    }

    handleCloseModal();
  };

  const startEditJob = (job: JobApplication) => {
    setEditingJobId(job.id);
    setNewJob({
      company: job.company || '',
      position: job.position || '',
      status: job.status || 'Applied',
      location: job.location || '',
      salary: job.salary || '',
      url: job.url || '',
      notes: job.notes || '',
      dateApplied: job.dateApplied ? new Date(job.dateApplied).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      platform: job.platform || '',
      source: job.source || ''
    });
    setIsAddModalOpen(true);
  };

  const removeJob = (id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
    setJobToDelete(null);
  };

  const updateJobStatus = (id: string, status: ApplicationStatus) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status } : j));
  };

  const filteredJobs = useMemo(() => {
    if (!jobs) return [];
    return jobs.filter(j => {
      const company = j.company || '';
      const position = j.position || '';
      const matchesSearch = 
        company.toLowerCase().includes(searchTerm.toLowerCase()) || 
        position.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || j.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [jobs, searchTerm, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    if (!jobs) return { total: 0, active: 0, offers: 0, rejected: 0 };
    return {
      total: jobs.length,
      active: jobs.filter(j => ['Applied', 'Screening', 'Interviewing', 'Technical'].includes(j.status)).length,
      offers: jobs.filter(j => j.status === 'Offer').length,
      rejected: jobs.filter(j => j.status === 'Rejected').length
    };
  }, [jobs]);

  const safeFormatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Unknown Date';
      return format(d, 'MMM dd');
    } catch (e) {
      return 'Unknown Date';
    }
  };

  if (!jobs) return <div className="p-8 text-center text-slate-500 font-medium">Loading career data...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-12 relative px-1 md:px-0 min-h-[400px]">
      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{editingJobId ? 'Edit Application' : 'Track Application'}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{editingJobId ? 'Update your job application details' : 'Add a new job to your list'}</p>
              </div>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>

            <form onSubmit={handleAddJob} className="p-6 md:p-8 space-y-5 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Company Name</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input type="text" required placeholder="E.g. Google, StartupX" value={newJob.company} onChange={e => setNewJob({...newJob, company: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Position</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input type="text" required placeholder="E.g. Backend Engineer" value={newJob.position} onChange={e => setNewJob({...newJob, position: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</label>
                  <select value={newJob.status} onChange={e => setNewJob({...newJob, status: e.target.value as ApplicationStatus})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all bg-white text-slate-600">
                    {Object.keys(STATUS_CONFIG).map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input type="text" placeholder="E.g. Remote, NYC" value={newJob.location} onChange={e => setNewJob({...newJob, location: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Date Applied</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input type="date" value={newJob.dateApplied} onChange={e => setNewJob({...newJob, dateApplied: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Salary Range</label>
                  <input type="text" placeholder="E.g. $100k - $120k" value={newJob.salary} onChange={e => setNewJob({...newJob, salary: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Apply Via (Platform)</label>
                  <input type="text" placeholder="E.g. LinkedIn, Indeed, Site" value={newJob.platform} onChange={e => setNewJob({...newJob, platform: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Information Source</label>
                  <input type="text" placeholder="E.g. Referral, Job Board" value={newJob.source} onChange={e => setNewJob({...newJob, source: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="col-span-1 md:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Listing URL</label>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input type="url" placeholder="https://..." value={newJob.url} onChange={e => setNewJob({...newJob, url: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Additional Notes</label>
                <textarea placeholder="Referral from X, Interview prep notes..." value={newJob.notes} onChange={e => setNewJob({...newJob, notes: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all h-24 resize-none text-sm" />
              </div>

              <button type="submit" className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-lg transition-all sticky bottom-0">
                {editingJobId ? 'Update Application' : 'Save Application'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard 
          title="Total Apps" 
          value={stats.total} 
          subtitle="Keep moving forward!" 
          icon={Building} 
          iconClassName="text-slate-500" 
        />
        <MetricCard 
          title="Active" 
          value={stats.active} 
          subtitle="Potential progress" 
          trend={{ value: "Potensial", isPositive: true }}
          icon={Briefcase} 
          iconClassName="text-blue-505" 
        />
        <MetricCard 
          title="Offers" 
          value={stats.offers} 
          subtitle="Well done! 🥂" 
          trend={{ value: "Win 🥂", isPositive: true }}
          icon={CheckCircle2} 
          iconClassName="text-emerald-505" 
        />
        <MetricCard 
          title="Rejected" 
          value={stats.rejected} 
          subtitle="Redirected to better." 
          icon={XCircle} 
          iconClassName="text-rose-505" 
        />
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm px-4 md:px-6">
         <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
               <input type="text" placeholder="Search companies or roles..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none text-xs" />
            </div>
            <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 p-1 rounded-lg">
               <button onClick={() => setStatusFilter('All')} className={cn("px-3 py-1.5 rounded-md transition-all", statusFilter === 'All' ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-600")}>ALL</button>
               <button onClick={() => setStatusFilter('Interviewing')} className={cn("px-3 py-1.5 rounded-md transition-all", statusFilter === 'Interviewing' ? "bg-white text-purple-600 shadow-sm" : "hover:text-slate-600")}>Interviews</button>
               <button onClick={() => setStatusFilter('Offer')} className={cn("px-3 py-1.5 rounded-md transition-all", statusFilter === 'Offer' ? "bg-white text-emerald-600 shadow-sm" : "hover:text-slate-600")}>Offers</button>
            </div>
         </div>
         <button onClick={() => setIsAddModalOpen(true)} className="flex items-center justify-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-lg font-bold text-xs shadow-lg hover:bg-slate-800 transition-all">
            <Plus size={16} /> Add Application
         </button>
      </div>

      {/* List Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
        {filteredJobs.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-200">
             <Briefcase className="mx-auto text-slate-200 mb-4" size={48} />
             <p className="text-slate-400 font-medium">No applications found. Start your search today!</p>
          </div>
        ) : (
          filteredJobs.map((job) => {
            const Config = STATUS_CONFIG[job.status] || STATUS_CONFIG['Applied'];
            return (
              <div 
                key={job.id} 
                className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
              >
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div className="flex items-start gap-4">
                       <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                          <Building size={20} />
                       </div>
                       <div className="flex flex-col">
                          <div className="flex items-center gap-2 mb-1">
                             <h4 className="text-lg font-bold text-slate-900 leading-tight">{job.position}</h4>
                             <div className="relative group/status flex items-center">
                               <span className={cn(
                                 "relative px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-sm cursor-pointer hover:opacity-80 active:scale-95",
                                 Config.bg, 
                                 Config.color
                               )}>
                                 <Config.icon size={10} />
                                 <select 
                                   value={job.status} 
                                   onChange={(e) => updateJobStatus(job.id, e.target.value as ApplicationStatus)}
                                   className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                 >
                                   {Object.keys(STATUS_CONFIG).map(s => (
                                     <option key={s} value={s} className="bg-white text-slate-900">{s}</option>
                                   ))}
                                 </select>
                                 <span>{job.status}</span>
                               </span>
                             </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                             <div className="flex items-center gap-1.5">
                                <Building size={12} className="text-slate-300" />
                                <span className="text-slate-700 font-bold">{job.company}</span>
                             </div>
                             <div className="flex items-center gap-1.5">
                                <MapPin size={12} className="text-slate-300" />
                                <span>{job.location}</span>
                             </div>
                             <div className="flex items-center gap-1.5">
                                <Calendar size={12} className="text-slate-300" />
                                <span>{safeFormatDate(job.dateApplied)}</span>
                             </div>
                             {job.salary && (
                               <div className="flex items-center gap-1.5">
                                  <TrendingUp size={12} className="text-slate-300" />
                                  <span className="text-emerald-600 font-bold">{job.salary}</span>
                               </div>
                             )}
                             {job.platform && (
                               <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600 font-bold border border-slate-200">
                                  <span>Via: {job.platform}</span>
                               </div>
                             )}
                             {job.source && (
                               <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 text-[10px] text-blue-600 font-bold border border-blue-100">
                                  <span>Source: {job.source}</span>
                               </div>
                             )}
                          </div>
                       </div>
                    </div>

                    <div className="flex items-center gap-2">
                       {job.url && (
                         <a href={job.url} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-all flex items-center gap-2 text-xs font-bold" title="Open Job Listing">
                            <ExternalLink size={14} />
                            <span className="hidden sm:inline">Listing</span>
                         </a>
                       )}
                       <button onClick={() => startEditJob(job)} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Edit Application">
                          <Edit2 size={16} />
                       </button>
                       <button onClick={() => setJobToDelete(job)} className="p-2.5 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="Delete Application">
                          <Trash2 size={16} />
                       </button>
                    </div>
                 </div>

                 {job.notes && (
                   <div className="mt-4 pt-4 border-t border-slate-50 text-[11px] text-slate-400 leading-relaxed font-medium">
                      <div className="uppercase tracking-widest font-black text-[9px] mb-1">Notes</div>
                      {job.notes}
                   </div>
                 )}
              </div>
            );
          })
        )}
      </div>

      <ConfirmDeleteModal
        isOpen={!!jobToDelete}
        title="Hapus Lamaran Pekerjaan?"
        description={
          jobToDelete ? (
            <>
              Apakah Anda yakin ingin menghapus lamaran di <strong className="font-bold text-stone-900">"{jobToDelete.company}"</strong> untuk posisi <strong className="font-bold text-stone-900">"{jobToDelete.position}"</strong>?<br />Tindakan ini tidak dapat dibatalkan.
            </>
          ) : ""
        }
        onConfirm={() => removeJob(jobToDelete?.id || '')}
        onCancel={() => setJobToDelete(null)}
      />

    </div>
  );
}
