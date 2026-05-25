import React, { useState, useMemo, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { 
  FileText, Plus, Search, Trash2, Clock, 
  File, ChevronRight, Edit3, 
  Image as ImageIcon, Paperclip, Download, FileSpreadsheet, FileArchive, FileType,
  Loader2, FilePlus, ChevronLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { Note } from '../types';
import { supabase } from '../lib/supabase';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

const TaskChecklistIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => {
  return (
    <svg 
      viewBox="0 0 24 24" 
      width={size} 
      height={size} 
      className={className}
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a1 1 0 0 0 1 1h4" />
      <path d="m9 11 1.2 1.2 2.4-2.4" strokeWidth="2" />
      <line x1="14" y1="12" x2="17" y2="12" />
      <circle cx="10" cy="16.5" r="1" fill="currentColor" stroke="none" />
      <line x1="14" y1="16.5" x2="17" y2="16.5" />
    </svg>
  );
};

export default function NotesDoc({ notes, setNotes }: { notes: Note[], setNotes: React.Dispatch<React.SetStateAction<Note[]>> }) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'note' | 'document'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isZenMode) {
        setIsZenMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZenMode]);

  const PAGE_SIZE = 5;

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon size={18} />;
    if (mimeType.includes('pdf')) return <FileType size={18} className="text-rose-500" />;
    if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) return <FileSpreadsheet size={18} className="text-emerald-500" />;
    if (mimeType.includes('word') || mimeType.includes('officedocument.word')) return <FileText size={18} className="text-blue-500" />;
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return <FileArchive size={18} className="text-amber-500" />;
    return <File size={18} className="text-slate-400" />;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedNote) return;

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${selectedNote.id}/${fileName}`;

      const { data, error } = await supabase.storage.from('attachments').upload(filePath, file);

      if (error) {
        throw error;
      }

      if (data) {
        const { data: publicUrlData } = supabase.storage.from('attachments').getPublicUrl(filePath);
        
        const attachment = {
          id: Math.random().toString(36).substring(2, 15),
          name: file.name,
          url: publicUrlData.publicUrl,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString()
        };

        const updatedAttachments = [...(selectedNote.attachments || []), attachment];
        const updatedNote = { 
          ...selectedNote, 
          attachments: updatedAttachments,
          lastModified: new Date().toISOString() 
        };
        
        setSelectedNote(updatedNote);
        setNotes(prev => prev.map(n => n.id === selectedNote.id ? updatedNote : n));
      }
    } catch (error: any) {
      console.error("Upload failed:", error);
      alert(`Failed to upload file: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = async (indexIdx: number) => {
    if (!selectedNote || !selectedNote.attachments) return;
    
    const attachmentToRemove = selectedNote.attachments[indexIdx];
    
    if (attachmentToRemove.url.includes('supabase.co')) {
      const urlParts = attachmentToRemove.url.split('/attachments/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        try {
          await supabase.storage.from('attachments').remove([filePath]);
        } catch (err) {
          console.error("Failed to remove from storage", err);
        }
      }
    }

    const updatedAttachments = selectedNote.attachments.filter((_, i) => i !== indexIdx);
    const updatedNote = { 
      ...selectedNote, 
      attachments: updatedAttachments,
      lastModified: new Date().toISOString() 
    };
    setSelectedNote(updatedNote);
    setNotes(prev => prev.map(n => n.id === selectedNote.id ? updatedNote : n));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files?.[0];
    if (file && selectedNote) {
      // Create a mock event to reuse existing logic
      const mockEvent = {
        target: { files: [file] }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileUpload(mockEvent);
    }
  };

  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          n.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTab = activeTab === 'all' || n.type === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [notes, searchTerm, activeTab]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  const paginatedNotes = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredNotes.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredNotes, currentPage]);

  const totalPages = Math.ceil(filteredNotes.length / PAGE_SIZE);

  const addNote = (type: 'note' | 'document' = 'note') => {
    const newNote: Note = {
      id: Math.random().toString(36).substr(2, 9),
      title: type === 'document' ? 'New Document' : 'New Note',
      content: '',
      lastModified: new Date().toISOString(),
      type
    };
    setNotes([newNote, ...notes]);
    setSelectedNote(newNote);
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    if (selectedNote?.id === id) setSelectedNote(null);
    setNoteToDelete(null);
  };

  const updateSelectedNote = (field: keyof Note, value: string) => {
    if (!selectedNote) return;
    const updated = { ...selectedNote, [field]: value, lastModified: new Date().toISOString() };
    setSelectedNote(updated);
    setNotes(prev => prev.map(n => n.id === selectedNote.id ? updated : n));
  };

  const exportPDF = () => {
    if (!selectedNote) return;
    
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(selectedNote.title || 'Untitled Document', margin, 30);
    
    // Metadata
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(`Type: ${selectedNote.type} | Last Modified: ${format(new Date(selectedNote.lastModified), 'PPP')}`, margin, 40);
    
    // Horizontal Line
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, 45, pageWidth - margin, 45);
    
    // Content
    doc.setFontSize(12);
    doc.setTextColor(50, 50, 50);
    const splitContent = doc.splitTextToSize(selectedNote.content || 'No content.', pageWidth - (margin * 2));
    doc.text(splitContent, margin, 60);
    
    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(180, 180, 180);
        doc.text(`Generated by NexusHub - Page ${i} of ${pageCount}`, margin, doc.internal.pageSize.getHeight() - 10);
    }

    doc.save(`${selectedNote.title.replace(/\s+/g, '_')}_NexusHub.pdf`);
  };

  return (
    <div className={cn("h-full flex flex-col md:flex-row transition-all duration-300 relative bg-white", isZenMode && "gap-0")}>
      {/* Sidebar List */}
      <div className={cn(
        "w-full md:w-[300px] flex flex-col transition-all duration-500 shrink-0 bg-violet-50/20 border-r border-violet-100/80",
        isZenMode && "md:w-0 opacity-0 md:pointer-events-none overflow-hidden border-none",
        selectedNote && "hidden md:flex"
      )}>
        <div className="flex flex-col gap-4 p-5 pb-2">
          <div className="flex items-center justify-between px-1">
            <h1 className="text-lg font-black text-violet-950 tracking-tight">Docs</h1>
            <button 
              onClick={() => addNote('note')}
              className="w-8 h-8 flex items-center justify-center text-violet-400 hover:text-violet-900 hover:bg-violet-50 hover:shadow-sm border border-transparent hover:border-violet-100 rounded-lg transition-all active:scale-95 cursor-pointer"
              title="Buat Catatan Baru"
            >
              <Plus size={16} />
            </button>
          </div>
          
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-400 group-focus-within:text-violet-600 transition-colors" size={12} />
            <input 
              type="text" 
              placeholder="Cari dokumen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-violet-100 focus:border-violet-400 focus:ring-1 focus:ring-violet-400 outline-none text-[12px] text-slate-900 transition-all font-sans"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-violet-100/40 rounded-lg border border-violet-100/30">
            {(['all', 'note', 'document'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 py-1 rounded-md text-[10px] font-bold capitalize transition-all cursor-pointer",
                  activeTab === tab 
                    ? "bg-white text-violet-900 shadow-sm border border-violet-100" 
                    : "text-violet-500 hover:text-violet-700 hover:bg-white/40"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className={cn(
          "flex-1 overflow-y-auto custom-scrollbar px-3 py-4 flex flex-col gap-1.5",
        )}>
          {paginatedNotes.length > 0 ? (
            paginatedNotes.map((note) => (
              <div 
                key={note.id}
                onClick={() => setSelectedNote(note)}
                className={cn(
                  "group p-3 rounded-xl transition-all cursor-pointer relative border",
                  selectedNote?.id === note.id 
                    ? "bg-white border-violet-200 shadow-sm shadow-violet-100/50 z-10 scale-[1.01]" 
                    : "bg-transparent border-transparent hover:bg-white/70 hover:border-violet-100/50"
                )}
              >
                <div className="flex items-center gap-3">
                   <div className={cn(
                     "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105",
                     note.type === 'document' ? "bg-violet-600 text-white" : "bg-violet-100 text-violet-700"
                   )}>
                      {note.type === 'document' ? <TaskChecklistIcon size={12} /> : <Edit3 size={12} />}
                   </div>
                   
                   <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className={cn(
                          "text-[12px] font-bold truncate tracking-tight transition-colors",
                          selectedNote?.id === note.id ? "text-violet-950 font-black" : "text-slate-700"
                        )}>
                          {note.title || 'Tanpa Judul'}
                        </h3>
                        <div className="flex items-center gap-1 shrink-0">
                           <button 
                             onClick={(e) => {
                                e.stopPropagation();
                                setNoteToDelete(note);
                              }}
                             className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all cursor-pointer"
                           >
                              <Trash2 size={11} />
                           </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[8px] font-black uppercase tracking-wider text-violet-400 bg-violet-100/50 px-1 rounded shrink-0">
                          {format(new Date(note.lastModified), 'd MMM')}
                        </span>
                        <span className="text-violet-200 text-[10px]">&bull;</span>
                        <p className={cn(
                          "text-[9px] truncate transition-opacity font-medium",
                          selectedNote?.id === note.id ? "text-slate-600 opacity-100" : "text-slate-400 opacity-85"
                        )}>
                          {note.content || 'Mulailah mengetik...'}
                        </p>
                      </div>
                   </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center flex flex-col items-center gap-2 opacity-30">
              <Search size={24} strokeWidth={1} className="text-violet-400" />
              <p className="text-[9px] font-black uppercase tracking-widest text-violet-500">Tidak ada hasil</p>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 flex items-center justify-center gap-4 border-t border-violet-100/60 bg-violet-50/20">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-violet-400 hover:text-violet-900 hover:bg-white hover:border-violet-150 border border-transparent disabled:opacity-20 transition-all cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <div className="text-[10px] font-black uppercase tracking-widest text-violet-500 flex items-center gap-2">
              <span className="text-violet-900 bg-violet-100/60 px-1.5 py-0.5 rounded">{currentPage}</span>
              <span className="opacity-40">of</span>
              <span>{totalPages}</span>
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-violet-400 hover:text-violet-900 hover:bg-white hover:border-violet-150 border border-transparent disabled:opacity-20 transition-all cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        <div className="p-4 border-t border-violet-100 bg-violet-50/30">
            <button 
              onClick={() => addNote('document')}
              className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-violet-600/10 active:scale-95 cursor-pointer"
            >
              <FilePlus size={14} />
              Dokumen Baru
            </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className={cn(
        "flex-1 bg-white flex flex-col relative overflow-hidden transition-all duration-500 pb-32 md:pb-0",
        isZenMode && "fixed inset-0 z-[100] bg-white pt-20",
        !selectedNote && "hidden md:flex"
      )}
      >

      <ConfirmDeleteModal
        isOpen={!!noteToDelete}
        title={noteToDelete?.type === 'document' ? 'Hapus Dokumen?' : 'Hapus Catatan?'}
        description={
          noteToDelete ? (
            <>
              Apakah Anda yakin ingin menghapus {noteToDelete.type === 'document' ? 'dokumen' : 'catatan'} <strong className="font-bold text-stone-900">"{noteToDelete.title || 'Tanpa Judul'}"</strong>?<br />Tindakan ini tidak dapat dibatalkan.
            </>
          ) : ""
        }
        onConfirm={() => deleteNote(noteToDelete?.id || '')}
        onCancel={() => setNoteToDelete(null)}
      />

        {selectedNote ? (
          <>
            {/* Header */}
            <div className={cn(
              "h-20 shrink-0 flex items-center justify-between px-6 md:px-10 border-b border-violet-100/50 bg-white z-20 transition-all",
              isZenMode && "opacity-0 invisible h-0"
            )}>
               <div className="flex items-center gap-4 md:gap-6 flex-1">
                  <button 
                    onClick={() => setSelectedNote(null)}
                    className="md:hidden p-2 text-violet-400 hover:text-violet-900 bg-violet-50 hover:bg-violet-100/65 rounded-lg transition-all"
                  >
                    <ChevronRight size={18} className="rotate-180" />
                  </button>
                  
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-wider text-violet-600 px-1.5 py-0.5 rounded bg-violet-100/70 border border-violet-150"
                      )}>
                        {selectedNote.type}
                      </span>
                      <span className="text-[9px] font-bold text-violet-400 uppercase">
                        {format(new Date(selectedNote.lastModified), 'MMM d, HH:mm')}
                      </span>
                    </div>
                    <input 
                      type="text" 
                      value={selectedNote.title}
                      onChange={(e) => updateSelectedNote('title', e.target.value)}
                      className="bg-transparent border-none outline-none text-lg md:text-xl font-bold text-slate-900 placeholder:text-violet-200 w-full tracking-tight truncate font-sans"
                      placeholder={selectedNote.type === 'document' ? "Judul Dokumen" : "Judul Catatan"}
                    />
                  </div>
               </div>
               
               <div className="flex items-center gap-2 ml-4">
                  <div className="flex items-center bg-violet-50/60 p-1 rounded-lg border border-violet-100">
                    <button 
                      onClick={() => updateSelectedNote('type' as any, selectedNote.type === 'note' ? 'document' : 'note')}
                      className="w-8 h-8 flex items-center justify-center text-violet-600 hover:text-violet-900 hover:bg-white rounded-md transition-all active:scale-95 cursor-pointer"
                      title="Ubah Tipe Catatan"
                    >
                      <FileType size={16} />
                    </button>
                    <button 
                      onClick={exportPDF}
                      className="w-8 h-8 flex items-center justify-center text-violet-600 hover:text-violet-900 hover:bg-white rounded-md transition-all active:scale-95 cursor-pointer"
                      title="Ekspor ke PDF"
                    >
                      <Download size={16} />
                    </button>
                  </div>
               </div>
            </div>
            
            <div className={cn(
              "flex-1 overflow-y-auto custom-scrollbar transition-all",
              isZenMode ? "p-8 md:p-12 lg:p-20" : "p-4 md:p-6 lg:p-8"
            )}>
               <div className={cn(
                   "max-w-4xl mx-auto min-h-full bg-white transition-all relative px-4",
                   isUploading && "opacity-50 pointer-events-none"
               )}>
                 {isUploading && (
                   <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm rounded-3xl">
                      <Loader2 size={32} className="animate-spin text-slate-900 mb-4" />
                      <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Processing...</p>
                   </div>
                 )}
                 <div className="flex flex-col gap-4">
                    <textarea 
                       value={selectedNote.content}
                       onChange={(e) => updateSelectedNote('content', e.target.value)}
                       className="w-full flex-1 bg-transparent border-none outline-none resize-none text-slate-700 leading-[1.8] text-base placeholder:text-violet-200 font-sans min-h-[500px]"
                       placeholder={selectedNote.type === 'document' ? "Mulai mengetik draf isi dokumen Anda di sini..." : "Tulis catatan penting Anda..."}
                    />
                 </div>

                 {/* Attachments */}
                 {selectedNote.attachments && selectedNote.attachments.length > 0 && (
                   <div className="mt-20 pt-10 border-t border-violet-100 mb-12">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-violet-500 mb-4 font-sans">Lampiran File Pendukung</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                         {selectedNote.attachments.map((file, idx) => (
                            <div key={idx} className="group/file relative bg-gradient-to-br from-violet-50/30 to-indigo-50/20 border border-violet-100 hover:border-violet-300 rounded-2xl p-4 flex items-center gap-4 transition-all">
                               <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center border border-violet-100 text-violet-500 shrink-0">
                                  {file.type.startsWith('image/') ? (
                                    <ImageIcon size={18} />
                                  ) : getFileIcon(file.type)}
                               </div>
                               <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-slate-900 truncate mb-1">{file.name}</p>
                                  <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wider font-mono">{(file.size / 1024).toFixed(0)} KB &bull; {file.type.split('/')[1]}</p>
                               </div>
                               <button 
                                  onClick={() => removeAttachment(idx)}
                                  className="p-2 text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover/file:opacity-100 hover:bg-white rounded-lg"
                               >
                                  <Trash2 size={14} />
                                </button>
                               <a 
                                  href={file.url} 
                                  download={file.name}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="absolute inset-0 cursor-pointer"
                                />
                            </div>
                         ))}
                      </div>
                   </div>
                 )}
               </div>
            </div>
            
            {/* Bottom Toolbar */}
            <div className={cn(
              "h-16 border-t border-violet-100/50 px-6 md:px-10 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md z-20 transition-all",
              isZenMode && "fixed bottom-8 left-1/2 -translate-x-1/2 w-fit border-none bg-indigo-950/90 text-white rounded-2xl shadow-2xl backdrop-blur-xl px-4 h-12"
            )}>
               <div className="flex items-center gap-4">
                 <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileUpload}
                  multiple
                 />
                 {!isZenMode && (
                   <>
                     <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="px-4 py-2 text-violet-750 hover:text-violet-900 hover:bg-violet-50 rounded-xl text-xs font-bold transition-all border border-transparent hover:border-violet-100 cursor-pointer flex items-center gap-2"
                     >
                        <Paperclip size={14} />
                        Lampirkan File
                     </button>
                     <div className="w-px h-4 bg-violet-100" />
                   </>
                 )}
                 <button 
                  onClick={() => setIsZenMode(!isZenMode)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all border border-transparent flex items-center gap-2",
                    isZenMode ? "hover:bg-white/10 text-white" : "text-violet-750 hover:text-violet-900 hover:bg-violet-50 hover:border-violet-100 cursor-pointer"
                  )}
                 >
                    <Edit3 size={14} />
                    {isZenMode ? 'Keluar Zen Mode' : 'Zen Mode'}
                 </button>
               </div>

               {!isZenMode && (
                 <div className="hidden sm:block text-[10px] font-bold text-violet-400 uppercase tracking-[0.2em] font-mono">
                    {selectedNote.content.split(/\s+/).filter(Boolean).length} KATA &bull; {selectedNote.content.length} KARAKTER
                 </div>
               )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-violet-50/20 to-indigo-50/15">
             <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-tr from-violet-100 to-indigo-50 shadow-xl shadow-indigo-100 flex flex-col items-center justify-center text-violet-400 mb-8 border border-violet-100/40 animate-pulse animate-duration-3000">
                <TaskChecklistIcon size={40} className="text-violet-600" />
             </div>
             <div className="text-center max-w-sm">
                <h3 className="text-lg font-black text-violet-950 mb-3 tracking-tight font-sans">Pilih Catatan atau Dokumen</h3>
                <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-4">
                  Docs Workspace
                </p>
                <p className="text-xs text-slate-500 mb-10 leading-relaxed font-sans font-medium">
                  Pilih draf catatan atau dokumen pekerjaan Anda dari daftar sebelah kiri, atau buat catatan baru untuk mulai menyusun draf idemu.
                </p>
                <div className="flex items-center justify-center gap-4">
                  <button 
                      onClick={() => addNote('note')} 
                      className="px-8 py-3 bg-white text-violet-700 border border-violet-250 text-xs font-bold rounded-2xl hover:bg-violet-50 transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      Catatan Baru
                  </button>
                  <button 
                      onClick={() => addNote('document')} 
                      className="px-8 py-3 bg-violet-600 text-white text-xs font-bold rounded-2xl hover:bg-violet-700 transition-all shadow-lg shadow-violet-600/25 active:scale-95 cursor-pointer"
                    >
                      Dokumen Baru
                  </button>
                </div>
             </div>
          </div>
        )}
      </div>

    </div>
  );
}

