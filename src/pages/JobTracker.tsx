import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Search,
  Building,
  MapPin,
  Link2,
  Trash2,
  Briefcase,
  ExternalLink,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  MoreVertical,
  Filter,
  TrendingUp,
  Edit2,
  Bookmark,
  BellRing,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "../lib/utils";
import { JobApplication, ApplicationStatus } from "../types";
import MetricCard from "../components/MetricCard";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { color: string; icon: any; bg: string }
> = {
  Wishlist: { color: "text-slate-600", bg: "bg-slate-100", icon: Bookmark },
  Applied: { color: "text-blue-600", bg: "bg-blue-50", icon: Clock },
  Screening: { color: "text-amber-600", bg: "bg-amber-50", icon: AlertCircle },
  Interviewing: {
    color: "text-purple-600",
    bg: "bg-purple-50",
    icon: Briefcase,
  },
  Technical: { color: "text-indigo-600", bg: "bg-indigo-50", icon: Briefcase },
  Offer: { color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 },
  Rejected: { color: "text-rose-600", bg: "bg-rose-50", icon: XCircle },
  Withdrawn: { color: "text-slate-600", bg: "bg-slate-50", icon: XCircle },
};

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  Wishlist: "Draft",
  Applied: "Applied",
  Screening: "Screening",
  Interviewing: "Interviewing",
  Technical: "Technical Test",
  Offer: "Offer",
  Rejected: "Rejected",
  Withdrawn: "Withdrawn",
};

function extractDomain(urlStr: string): string {
  try {
    if (!urlStr) return "Tautan";
    let cleanUrl = urlStr.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = "https://" + cleanUrl;
    }
    const url = new URL(cleanUrl);
    let domain = url.hostname;
    if (domain.startsWith("www.")) {
      domain = domain.substring(4);
    }
    const parts = domain.split(".");
    if (parts.length > 0) {
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
    return domain;
  } catch (e) {
    return "Lowongan Pekerjaan";
  }
}

const getDaysDiff = (closingDateStr: string | undefined): number | null => {
  if (!closingDateStr) return null;
  try {
    const closingDate = new Date(closingDateStr);
    if (isNaN(closingDate.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    closingDate.setHours(0, 0, 0, 0);
    const diffTime = closingDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (e) {
    return null;
  }
};

const getDeadlineStatus = (closingDateStr: string | undefined) => {
  if (!closingDateStr) return null;
  try {
    const closingDate = new Date(closingDateStr);
    if (isNaN(closingDate.getTime())) return null;

    const today = new Date();
    // Reset hours to compare dates only
    today.setHours(0, 0, 0, 0);
    closingDate.setHours(0, 0, 0, 0);

    const diffTime = closingDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        status: "Passed",
        text: `Closed ${Math.abs(diffDays)}d ago`,
        className: "bg-rose-50 text-rose-700 border-rose-100",
        label: "Sudah Tutup",
      };
    } else if (diffDays === 0) {
      return {
        status: "Today",
        text: "TUTUP HARI INI",
        className:
          "bg-amber-50 text-amber-700 border-amber-200 animate-pulse font-extrabold",
        label: "Hari Ini",
      };
    } else if (diffDays <= 3) {
      return {
        status: "Soon",
        text: `Tutup ${diffDays} hari lagi`,
        className: "bg-amber-50 text-amber-700 border-amber-200 font-bold",
        label: "Segera Tutup",
      };
    } else {
      return {
        status: "Active",
        text: `Tutup ${diffDays} hari lagi`,
        className:
          "bg-indigo-50/70 text-indigo-700 border-indigo-100 font-medium",
        label: `${diffDays} hari lagi`,
      };
    }
  } catch (e) {
    return null;
  }
};

export default function JobTracker({
  jobs,
  setJobs,
}: {
  jobs: JobApplication[];
  setJobs: React.Dispatch<React.SetStateAction<JobApplication[]>>;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    ApplicationStatus | "All" | "Closed" | "Active"
  >("All");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [jobToDelete, setJobToDelete] = useState<JobApplication | null>(null);

  // Deadline Reminder Modal State
  const [isDeadlinePopupOpen, setIsDeadlinePopupOpen] = useState(false);

  const urgentDeadlineJobs = useMemo(() => {
    return jobs
      .filter((job) => {
        // Hanya ingatkan lowongan di 'Wishlist' yang memiliki closingDate, dan tenggat waktu belum terlewati (>= 0 hari lagi)
        if (job.status !== "Wishlist" || !job.closingDate) return false;
        const diff = getDaysDiff(job.closingDate);
        return diff !== null && diff >= 0;
      })
      .map((job) => {
        const diff = getDaysDiff(job.closingDate)!;
        return {
          ...job,
          diffDays: diff,
          statusConfig: getDeadlineStatus(job.closingDate),
        };
      })
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [jobs]);

  // New Application State
  const [newJob, setNewJob] = useState({
    company: "",
    position: "",
    status: "Wishlist" as ApplicationStatus,
    location: "",
    salary: "",
    url: "",
    notes: "",
    dateApplied: new Date().toISOString().split("T")[0],
    closingDate: "",
    platform: "",
    source: "",
  });

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingJobId(null);
    setNewJob({
      company: "",
      position: "",
      status: "Wishlist",
      location: "",
      salary: "",
      url: "",
      notes: "",
      dateApplied: new Date().toISOString().split("T")[0],
      closingDate: "",
      platform: "",
      source: "",
    });
  };

  const handleAddJob = (e: React.FormEvent) => {
    e.preventDefault();
    const isWishlist = newJob.status === "Wishlist";

    // Auto-populate for wishlist if empty
    let company = newJob.company;
    let position = newJob.position;

    if (isWishlist) {
      if (!newJob.url) return; // url is required for wishlist
      company = extractDomain(newJob.url);
      position = "Tinjau Link Lowongan";
    } else {
      if (!company || !position) return;
    }

    const jobData = {
      ...newJob,
      company,
      position,
    };

    const savedId = editingJobId || Math.random().toString(36).substr(2, 9);
    const savedJob: JobApplication = {
      id: savedId,
      ...jobData,
      dateApplied: new Date(newJob.dateApplied).toISOString(),
      closingDate: newJob.closingDate
        ? new Date(newJob.closingDate).toISOString()
        : undefined,
    };

    if (editingJobId) {
      setJobs((prev) =>
        prev.map((j) => (j.id === editingJobId ? savedJob : j)),
      );
    } else {
      setJobs((prev) => [savedJob, ...prev]);
    }

    handleCloseModal();
  };

  const startEditJob = (job: JobApplication) => {
    setEditingJobId(job.id);
    setNewJob({
      company: job.company || "",
      position: job.position || "",
      status: job.status || "Applied",
      location: job.location || "",
      salary: job.salary || "",
      url: job.url || "",
      notes: job.notes || "",
      dateApplied: job.dateApplied
        ? new Date(job.dateApplied).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      closingDate: job.closingDate
        ? new Date(job.closingDate).toISOString().split("T")[0]
        : "",
      platform: job.platform || "",
      source: job.source || "",
    });
    setIsAddModalOpen(true);
  };

  const removeJob = (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    setJobToDelete(null);
  };

  const updateJobStatus = (id: string, status: ApplicationStatus) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status } : j)));
  };

  const filteredJobs = useMemo(() => {
    if (!jobs) return [];

    const filtered = jobs.filter((j) => {
      const company = j.company || "";
      const position = j.position || "";
      const matchesSearch =
        company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        position.toLowerCase().includes(searchTerm.toLowerCase());
      const isExpiredWish = j.status === "Wishlist" && getDaysDiff(j.closingDate) !== null && getDaysDiff(j.closingDate)! < 0;
      const matchesStatus =
        statusFilter === "All"
          ? true
          : statusFilter === "Closed"
          ? ["Rejected", "Withdrawn"].includes(j.status) || isExpiredWish
          : statusFilter === "Active"
          ? ["Applied", "Screening", "Interviewing", "Technical"].includes(j.status)
          : statusFilter === "Wishlist"
          ? j.status === "Wishlist" && !isExpiredWish
          : j.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    if (statusFilter === "Wishlist") {
      return [...filtered].sort((a, b) => {
        if (!a.closingDate) return 1;
        if (!b.closingDate) return -1;
        return (
          new Date(a.closingDate).getTime() - new Date(b.closingDate).getTime()
        );
      });
    }

    return filtered;
  }, [jobs, searchTerm, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    if (!jobs) return { wishlist: 0, active: 0, offers: 0, closed: 0 };
    
    let wishlistCount = 0;
    let activeCount = 0;
    let offersCount = 0;
    let closedCount = 0;

    jobs.forEach((j) => {
      const isExpiredWish =
        j.status === "Wishlist" &&
        getDaysDiff(j.closingDate) !== null &&
        getDaysDiff(j.closingDate)! < 0;

      if (j.status === "Wishlist") {
        if (isExpiredWish) {
          closedCount++;
        } else {
          wishlistCount++;
        }
      } else if (
        ["Applied", "Screening", "Interviewing", "Technical"].includes(j.status)
      ) {
        activeCount++;
      } else if (j.status === "Offer") {
        offersCount++;
      } else if (["Rejected", "Withdrawn"].includes(j.status)) {
        closedCount++;
      }
    });

    return {
      wishlist: wishlistCount,
      active: activeCount,
      offers: offersCount,
      closed: closedCount,
    };
  }, [jobs]);

  const safeFormatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "Unknown Date";
      return format(d, "MMM dd");
    } catch (e) {
      return "Unknown Date";
    }
  };

  if (!jobs)
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
        Loading career data...
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-12 relative px-1 md:px-0 min-h-[400px]">
      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {editingJobId ? "Edit Application" : "Track Application"}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {editingJobId
                    ? "Update your job application details"
                    : "Add a new job to your list"}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <Plus size={24} className="rotate-45" />
              </button>
            </div>

            <form
              onSubmit={handleAddJob}
              className="p-6 md:p-8 space-y-5 overflow-y-auto custom-scrollbar"
            >
              {/* Type Selector Toggle */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() =>
                    setNewJob((prev) => ({ ...prev, status: "Wishlist" }))
                  }
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all text-center",
                    newJob.status === "Wishlist"
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  📌 Simpan Dulu (Draft)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setNewJob((prev) => ({
                      ...prev,
                      status:
                        prev.status === "Wishlist" ? "Applied" : prev.status,
                    }))
                  }
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all text-center",
                    newJob.status !== "Wishlist"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  🚀 Catat Lamaran Baru
                </button>
              </div>

              {newJob.status === "Wishlist" ? (
                /* simplified form for saving/wishlisting */
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-4 p-4 rounded-xl bg-indigo-50/50 border border-indigo-100/60">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 flex items-center gap-1">
                        <Link2 size={12} className="text-indigo-500" /> Link
                        Lowongan Pekerjaan{" "}
                        <span className="text-red-500 font-bold">*</span>
                      </label>
                      <input
                        type="url"
                        required
                        placeholder="Paste job link here (https://...)"
                        value={newJob.url}
                        onChange={(e) =>
                          setNewJob({ ...newJob, url: e.target.value })
                        }
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm bg-white font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 flex items-center gap-1">
                        <Calendar size={12} className="text-indigo-500" />{" "}
                        Deadline Lowongan (Closing Date)
                      </label>
                      <input
                        type="date"
                        value={newJob.closingDate}
                        onChange={(e) =>
                          setNewJob({ ...newJob, closingDate: e.target.value })
                        }
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm bg-white"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* detailed form for tracking application status */
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Company Name
                      </label>
                      <div className="relative">
                        <Building
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
                          size={15}
                        />
                        <input
                          type="text"
                          required
                          placeholder="E.g. Google"
                          value={newJob.company}
                          onChange={(e) =>
                            setNewJob({ ...newJob, company: e.target.value })
                          }
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all text-sm bg-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Position / Role
                      </label>
                      <div className="relative">
                        <Briefcase
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
                          size={15}
                        />
                        <input
                          type="text"
                          required
                          placeholder="E.g. Product Manager"
                          value={newJob.position}
                          onChange={(e) =>
                            setNewJob({ ...newJob, position: e.target.value })
                          }
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all text-sm bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Status Lamaran
                      </label>
                      <select
                        value={newJob.status}
                        onChange={(e) =>
                          setNewJob({
                            ...newJob,
                            status: e.target.value as ApplicationStatus,
                          })
                        }
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all bg-white text-sm text-slate-750"
                      >
                        {Object.keys(STATUS_CONFIG)
                          .filter((status) => status !== "Wishlist")
                          .map((status) => (
                            <option key={status} value={status}>
                              {STATUS_LABELS[status as ApplicationStatus] ||
                                status}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Location
                      </label>
                      <div className="relative">
                        <MapPin
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
                          size={15}
                        />
                        <input
                          type="text"
                          placeholder="E.g. Jakarta, Remote"
                          value={newJob.location}
                          onChange={(e) =>
                            setNewJob({ ...newJob, location: e.target.value })
                          }
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all text-sm bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Tanggal Melamar
                      </label>
                      <div className="relative">
                        <Calendar
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
                          size={15}
                        />
                        <input
                          type="date"
                          value={newJob.dateApplied}
                          onChange={(e) =>
                            setNewJob({
                              ...newJob,
                              dateApplied: e.target.value,
                            })
                          }
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all text-sm bg-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Deadline (Closing Date)
                      </label>
                      <div className="relative">
                        <Calendar
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
                          size={15}
                        />
                        <input
                          type="date"
                          value={newJob.closingDate}
                          onChange={(e) =>
                            setNewJob({
                              ...newJob,
                              closingDate: e.target.value,
                            })
                          }
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all text-sm bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Gaji (Range Gaji)
                      </label>
                      <input
                        type="text"
                        placeholder="E.g. Rp 10jt - Rp 15jt"
                        value={newJob.salary}
                        onChange={(e) =>
                          setNewJob({ ...newJob, salary: e.target.value })
                        }
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all text-sm bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Platform Melamar
                      </label>
                      <input
                        type="text"
                        placeholder="E.g. LinkedIn, Kalibrr"
                        value={newJob.platform}
                        onChange={(e) =>
                          setNewJob({ ...newJob, platform: e.target.value })
                        }
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all text-sm bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Sumber Informasi
                      </label>
                      <input
                        type="text"
                        placeholder="E.g. Referral, Instagram"
                        value={newJob.source}
                        onChange={(e) =>
                          setNewJob({ ...newJob, source: e.target.value })
                        }
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all text-sm bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Listing URL (Link Lowongan)
                      </label>
                      <div className="relative">
                        <Link2
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
                          size={15}
                        />
                        <input
                          type="url"
                          placeholder="https://..."
                          value={newJob.url}
                          onChange={(e) =>
                            setNewJob({ ...newJob, url: e.target.value })
                          }
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all text-sm font-mono text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Catatan Lainnya
                    </label>
                    <textarea
                      placeholder="Referral dari Kak X, info resume dll..."
                      value={newJob.notes}
                      onChange={(e) =>
                        setNewJob({ ...newJob, notes: e.target.value })
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all h-20 resize-none text-sm bg-white"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-lg transition-all sticky bottom-0 text-sm mt-6"
              >
                {editingJobId ? "Update Informasi" : "Simpan Informasi"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Draft"
          value={stats.wishlist}
          subtitle="Tinjau deadline & info"
          icon={Bookmark}
          iconClassName="text-slate-500"
        />
        <MetricCard
          title="Applied"
          value={stats.active}
          subtitle="Dalam proses"
          trend={{ value: "Aktif", isPositive: true }}
          icon={Briefcase}
          iconClassName="text-indigo-500"
        />
        <MetricCard
          title="Offers"
          value={stats.offers}
          subtitle="Tawaran diterima"
          trend={{ value: "Sukses", isPositive: true }}
          icon={CheckCircle2}
          iconClassName="text-emerald-500"
        />
        <MetricCard
          title="Rejected"
          value={stats.closed}
          subtitle="Ditolak / mengundurkan diri"
          icon={XCircle}
          iconClassName="text-rose-500"
        />
      </div>

      {/* Active Deadline Banner */}
      {(() => {
        const activeUrgentJobs = urgentDeadlineJobs.filter(
          (j) => j.diffDays >= 0 && j.diffDays <= 5,
        );
        if (activeUrgentJobs.length === 0) return null;

        const minDiffDays = Math.min(
          ...activeUrgentJobs.map((j) => j.diffDays),
        );

        return (
          <div className="bg-gradient-to-r from-rose-50/80 to-amber-50/40 border border-amber-200 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs animate-fade-in">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 select-none text-xl animate-pulse">
                ⏰
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-900 flex flex-wrap items-center gap-2">
                  Batas Pendaftaran Mendekati Deadline!
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] bg-amber-500 text-white font-extrabold uppercase tracking-wider whitespace-nowrap shrink-0">
                    {activeUrgentJobs.length} Lowongan
                  </span>
                </h4>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Beberapa lowongan pekerjaan Anda akan segera ditutup dalam{" "}
                  {minDiffDays === 0
                    ? "hari ini"
                    : `${minDiffDays} hari mendatang`}
                  . Jangan sampai melewatkan kesempatan emas ini!
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsDeadlinePopupOpen(true)}
              className="w-full sm:w-auto px-5 py-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-500/10 hover:shadow-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              Tinjau Deadline Terdekat ↗
            </button>
          </div>
        );
      })()}

      {/* Filter and Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm px-4 md:px-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Search companies or roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none text-xs"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setStatusFilter("All")}
              className={cn(
                "px-2.5 py-1.5 rounded-md transition-all",
                statusFilter === "All"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "hover:text-slate-600",
              )}
            >
              All ({jobs.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("Wishlist")}
              className={cn(
                "px-2.5 py-1.5 rounded-md transition-all",
                statusFilter === "Wishlist"
                  ? "bg-white text-slate-700 shadow-sm font-black"
                  : "hover:text-slate-600",
              )}
            >
              Draft ({stats.wishlist})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("Active")}
              className={cn(
                "px-2.5 py-1.5 rounded-md transition-all",
                statusFilter === "Active"
                  ? "bg-white text-indigo-600 shadow-sm font-black"
                  : "hover:text-slate-600",
              )}
            >
              Applied ({stats.active})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("Offer")}
              className={cn(
                "px-2.5 py-1.5 rounded-md transition-all",
                statusFilter === "Offer"
                  ? "bg-white text-emerald-600 shadow-sm"
                  : "hover:text-slate-600",
              )}
            >
              Offers ({stats.offers})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("Closed")}
              className={cn(
                "px-2.5 py-1.5 rounded-md transition-all",
                statusFilter === "Closed"
                  ? "bg-white text-rose-600 shadow-sm font-black"
                  : "hover:text-slate-600",
              )}
            >
              Closed ({stats.closed})
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-stretch sm:justify-end">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs shadow-lg hover:bg-slate-800 transition-all shrink-0"
          >
            <Plus size={16} /> Add Application
          </button>
        </div>
      </div>

      {/* List Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
        {filteredJobs.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-200">
            <Briefcase className="mx-auto text-slate-200 mb-4" size={48} />
            <p className="text-slate-400 font-medium">
              No applications found. Start your search today!
            </p>
          </div>
        ) : (
          filteredJobs.map((job) => {
            const isExpiredWish = job.status === "Wishlist" && getDaysDiff(job.closingDate) !== null && getDaysDiff(job.closingDate)! < 0;
            const Config = isExpiredWish 
              ? { color: "text-rose-600", bg: "bg-rose-50", icon: XCircle }
              : (STATUS_CONFIG[job.status] || STATUS_CONFIG["Applied"]);
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
                        <h4 className="text-lg font-bold text-slate-900 leading-tight">
                          {job.position}
                        </h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="relative group/status flex items-center">
                            <span
                              className={cn(
                                "relative px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-sm cursor-pointer hover:opacity-80 active:scale-95",
                                Config.bg,
                                Config.color,
                              )}
                            >
                              <Config.icon size={10} />
                              <select
                                value={job.status}
                                onChange={(e) =>
                                  updateJobStatus(
                                    job.id,
                                    e.target.value as ApplicationStatus,
                                  )
                                }
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              >
                                {Object.keys(STATUS_CONFIG).map((s) => (
                                  <option
                                    key={s}
                                    value={s}
                                    className="bg-white text-slate-900"
                                  >
                                    {STATUS_LABELS[s as ApplicationStatus] || s}
                                  </option>
                                ))}
                              </select>
                              <span>
                                {isExpiredWish ? "Expired (Tenggat Lewat)" : (STATUS_LABELS[job.status] || job.status)}
                              </span>
                            </span>
                          </div>
                          {(() => {
                            if (job.status !== "Wishlist") return null; // Hanya tampilkan deadline untuk Wishlist
                            const deadline = getDeadlineStatus(job.closingDate);
                            if (!deadline) return null;
                            return (
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[9px] border flex items-center gap-1 shadow-xs",
                                  deadline.className,
                                )}
                              >
                                <Clock size={9} />
                                {deadline.text}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Building size={12} className="text-slate-300" />
                          <span className="text-slate-700 font-bold">
                            {job.company}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin size={12} className="text-slate-300" />
                          <span>{job.location}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-slate-300" />
                          <span>
                            {job.status === "Wishlist"
                              ? "Disimpan: "
                              : "Melamar: "}
                            {safeFormatDate(job.dateApplied)}
                          </span>
                        </div>
                        {job.salary && (
                          <div className="flex items-center gap-1.5">
                            <TrendingUp size={12} className="text-slate-300" />
                            <span className="text-emerald-600 font-bold">
                              {job.salary}
                            </span>
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
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-all flex items-center gap-2 text-xs font-bold"
                        title="Open Job Listing"
                      >
                        <ExternalLink size={14} />
                        <span className="hidden sm:inline">Listing</span>
                      </a>
                    )}
                    {job.status === "Wishlist" && job.closingDate && (
                      <button
                        onClick={() => setIsDeadlinePopupOpen(true)}
                        className="p-2.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 bg-amber-50/50 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                        title="Lihat status countdown deadline"
                      >
                        <Clock
                          size={14}
                          className="text-amber-500 animate-pulse"
                        />
                        <span className="hidden sm:inline">Deadline Info</span>
                      </button>
                    )}
                    <button
                      onClick={() => startEditJob(job)}
                      className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Edit Application"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => setJobToDelete(job)}
                      className="p-2.5 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                      title="Delete Application"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {job.notes && (
                  <div className="mt-4 pt-4 border-t border-slate-50 text-[11px] text-slate-400 leading-relaxed font-medium">
                    <div className="uppercase tracking-widest font-black text-[9px] mb-1">
                      Notes
                    </div>
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
              Apakah Anda yakin ingin menghapus lamaran di{" "}
              <strong className="font-bold text-stone-900">
                "{jobToDelete.company}"
              </strong>{" "}
              untuk posisi{" "}
              <strong className="font-bold text-stone-900">
                "{jobToDelete.position}"
              </strong>
              ?<br />
              Tindakan ini tidak dapat dibatalkan.
            </>
          ) : (
            ""
          )
        }
        onConfirm={() => removeJob(jobToDelete?.id || "")}
        onCancel={() => setJobToDelete(null)}
      />

      {/* Deadline Reminder Popup Modal */}
      {isDeadlinePopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col p-6 animate-scale-in border border-slate-150 max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 tracking-tight">
                <BellRing size={18} className="text-amber-500 animate-bounce" />
                🚨 Batas Akhir & Pengingat Deadline
              </h3>
              <button
                type="button"
                onClick={() => setIsDeadlinePopupOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-lg cursor-pointer text-md font-bold"
              >
                ✕
              </button>
            </div>

            {(() => {
              const activeUrgentJobs = urgentDeadlineJobs.filter(
                (j) => j.diffDays !== null && j.diffDays >= 0 && j.diffDays <= 5
              );
              if (activeUrgentJobs.length === 0) {
                return (
                  <p className="text-[11px] text-slate-500 mb-4 font-semibold leading-relaxed">
                    Berikut adalah daftar semua lowongan pekerjaan aktif Anda yang memiliki tenggat waktu penutupan (closing date).
                  </p>
                );
              }
              const minDiffDays = Math.min(...activeUrgentJobs.map((j) => j.diffDays));
              return (
                <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 mb-4 text-xs font-semibold text-amber-900 leading-relaxed">
                  📢 Beberapa lowongan pekerjaan Anda akan segera ditutup dalam{" "}
                  {minDiffDays === 0 ? "hari ini" : `${minDiffDays} hari mendatang`}. Jangan sampai melewatkan kesempatan emas ini!
                </div>
              );
            })()}

            <div className="space-y-3 overflow-y-auto flex-1 pr-1 max-h-[55vh] custom-scrollbar">
              {urgentDeadlineJobs.length === 0 ? (
                <div className="text-center py-12 space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto text-xl bg-opacity-80">
                    🎉
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-slate-900">
                      Tidak Ada Deadline Aktif
                    </h4>
                    <p className="text-[10px] text-slate-400 font-semibold px-6 leading-relaxed">
                      Luar biasa! Semua data lowongan Anda saat ini tidak
                      memiliki batas waktu penutupan yang diatur, atau Anda
                      belum menambahkan info deadline.
                    </p>
                  </div>
                </div>
              ) : (
                urgentDeadlineJobs.map((job) => {
                  let alertBadgeClass =
                    "bg-stone-50 border-stone-100 text-stone-600";
                  let urgensiText = `${job.diffDays ?? 0} hari lagi`;
                  let isUrgent = false;

                  if (job.diffDays !== null) {
                    if (job.diffDays < 0) {
                      alertBadgeClass =
                        "bg-rose-50 border-rose-100 text-rose-700 font-bold";
                      urgensiText = "⚠️ Sudah Tutup";
                    } else if (job.diffDays === 0) {
                      alertBadgeClass =
                        "bg-rose-100 border-rose-250 text-rose-700 font-black animate-pulse";
                      urgensiText = "🔥 TUTUP HARI INI";
                      isUrgent = true;
                    } else if (job.diffDays === 1) {
                      alertBadgeClass =
                        "bg-amber-100 border-amber-250 text-amber-850 font-black";
                      urgensiText = "⚠️ Tutup Besok";
                      isUrgent = true;
                    } else if (job.diffDays <= 3) {
                      alertBadgeClass =
                        "bg-amber-50 border-amber-150 text-amber-700 font-bold";
                      urgensiText = `⚠️ ${job.diffDays} Hari Lagi`;
                    } else {
                      alertBadgeClass =
                        "bg-indigo-50 border-indigo-100 text-indigo-700 font-medium";
                      urgensiText = `⏱️ ${job.diffDays} Hari Lagi`;
                    }
                  }

                  return (
                    <div
                      key={job.id}
                      className={cn(
                        "p-3.5 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all",
                        isUrgent
                          ? "bg-rose-50/30 border-rose-100/80 shadow-2xs"
                          : "bg-slate-50/50 border-slate-100",
                      )}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="text-xs font-black text-slate-900">
                            {job.position}
                          </h5>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-md text-[9px] border font-extrabold uppercase tracking-wide",
                              alertBadgeClass,
                            )}
                          >
                            {urgensiText}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                          <span>🏢 {job.company}</span>
                          {job.location && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span>📍 {job.location}</span>
                            </>
                          )}
                        </p>
                        {job.status === "Wishlist" && job.closingDate && (
                          <p className="text-[10px] text-slate-400 font-semibold">
                            Selesai:{" "}
                            {format(new Date(job.closingDate), "dd MMMM yyyy")}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 w-full sm:w-auto mt-2 sm:mt-0">
                        {job.url && (
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-xl text-[10px] uppercase font-bold tracking-wider shadow-2xs flex items-center gap-1 transition-all flex-1 sm:flex-none text-center justify-center cursor-pointer"
                          >
                            Listing ↗
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setIsDeadlinePopupOpen(false);
                            startEditJob(job);
                          }}
                          className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-xl text-[10px] uppercase font-bold tracking-wider hover:shadow-xs transition-all flex-1 sm:flex-none text-center justify-center cursor-pointer"
                        >
                          Kelola
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsDeadlinePopupOpen(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all cursor-pointer text-center"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
