import React, { useState, useMemo, useRef } from 'react';
import { jsPDF } from 'jspdf';
import {
  FileText, Plus, Search, Trash2, Calendar, Clock,
  MoreVertical, File, ChevronRight, Edit3, Grid, List as ListIcon,
  Image as ImageIcon, Paperclip, X, Download, FileSpreadsheet, FileArchive, FileType,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { INITIAL_NOTES } from '../mockData';
import { Note } from '../types';
import { supabase } from '../lib/supabase';

export default function NotesDoc({ notes, setNotes }: { notes: Note[], setNotes: React.Dispatch<React.SetStateAction<Note[]>> }) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon size={20} />;
    if (mimeType.includes('pdf')) return <FileType size={20} className="text-rose-500" />;
    if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) return <FileSpreadsheet size={20} className="text-emerald-500" />;
    if (mimeType.includes('word') || mimeType.includes('officedocument.word')) return <FileText size={20} className="text-blue-500" />;
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return <FileArchive size={20} className="text-amber-500" />;
    return <File size={20} className="text-slate-500" />;
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
    return notes.filter(n =>
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [notes, searchTerm]);

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

  const deleteNote = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotes(prev => prev.filter(n => n.id !== id));
    if (selectedNote?.id === id) setSelectedNote(null);
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
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(180, 180, 180);
      doc.text(`Generated by NexusHub - Page ${i} of ${pageCount}`, margin, doc.internal.pageSize.getHeight() - 10);
    }

    doc.save(`${selectedNote.title.replace(/\s+/g, '_')}_NexusHub.pdf`);
  };

  return (
    <div className={cn("h-auto md:h-full flex flex-col md:flex-row gap-8 transition-all duration-300 relative", isZenMode && "gap-0")}>
      {/* Sidebar List */}
      <div className={cn(
        "w-full md:w-[300px] flex flex-col gap-6 transition-all duration-300 shrink-0",
        isZenMode && "md:w-0 opacity-0 md:pointer-events-none",
        selectedNote && "hidden md:flex"
      )}>
        <div className="flex flex-col gap-4 px-1 md:px-0">
          <div className="flex items-center justify-between group/add relative">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Vault</h1>
            <div className="flex gap-2">
              <button
                onClick={() => addNote('note')}
                title="New Note"
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors border border-slate-200"
              >
                <Plus size={18} />
              </button>
              <button
                onClick={() => addNote('document')}
                title="New Document"
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg shadow-blue-500/20"
              >
                <FileText size={18} />
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-white border border-slate-200 focus:border-blue-500/50 outline-none placeholder:text-slate-400 text-sm shadow-sm"
            />
          </div>

          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={cn("flex-1 flex items-center justify-center py-1.5 rounded-md transition-all text-xs font-bold", viewMode === 'grid' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}
            >
              <Grid size={14} className="mr-2" /> GRID
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn("flex-1 flex items-center justify-center py-1.5 rounded-md transition-all text-xs font-bold", viewMode === 'list' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}
            >
              <ListIcon size={14} className="mr-2" /> LIST
            </button>
          </div>
        </div>

        <div className={cn(
          "flex-1 overflow-y-auto custom-scrollbar pr-2",
          viewMode === 'grid' ? "grid grid-cols-2 gap-3 content-start" : "flex flex-col space-y-3"
        )}>
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => setSelectedNote(note)}
              className={cn(
                "group p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 relative shadow-sm",
                selectedNote?.id === note.id
                  ? "bg-blue-50 border-blue-200 ring-1 ring-blue-100"
                  : "bg-white border-slate-200 hover:border-blue-300"
              )}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <File size={12} className={note.type === 'document' ? "text-blue-500 shrink-0" : "text-amber-500 shrink-0"} />
                  <h3 className={cn("text-sm font-bold text-slate-700 truncate", viewMode === 'grid' ? "max-w-[70px]" : "w-40")}>
                    {note.title || 'Untitled'}
                  </h3>
                </div>
                <button
                  onClick={(e) => deleteNote(e, note.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-500 transition-all shrink-0 -mt-1 -mr-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed h-8">
                {note.content || 'Start taking notes...'}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                <Clock size={10} className="shrink-0" />
                <span className="truncate">{format(new Date(note.lastModified), 'MMM d, HH:mm')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor Area */}
      <div className={cn(
        "flex-1 bg-slate-50/80 border border-slate-200 rounded-2xl shadow-sm flex flex-col relative overflow-hidden transition-all duration-500 pb-32 md:pb-0",
        isZenMode && "rounded-none border-none shadow-none bg-white",
        !selectedNote && "hidden md:flex"
      )}>
        {selectedNote ? (
          <>
            {/* Header with clear boundary */}
            <div className="h-16 md:h-24 shrink-0 border-b border-slate-200 flex items-center justify-between px-6 md:px-10 bg-white z-20">
              <div className="flex items-center gap-4 md:gap-8 flex-1">
                <button
                  onClick={() => setSelectedNote(null)}
                  className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-600"
                >
                  <Plus size={24} className="rotate-45" />
                </button>

                <div className="flex flex-col gap-1 md:gap-2 flex-1">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateSelectedNote('type' as any, selectedNote.type === 'note' ? 'document' : 'note')}
                      className={cn(
                        "px-2.5 py-0.5 rounded-md text-[10px] uppercase font-black tracking-widest border transition-all flex items-center gap-2",
                        selectedNote.type === 'document'
                          ? "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100"
                          : "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100"
                      )}
                    >
                      <div className={cn("w-1.5 h-1.5 rounded-full", selectedNote.type === 'document' ? "bg-blue-500" : "bg-amber-500")} />
                      {selectedNote.type}
                    </button>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <Clock size={10} />
                      <span>Sync {format(new Date(selectedNote.lastModified), 'HH:mm:ss')}</span>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={selectedNote.title}
                    onChange={(e) => updateSelectedNote('title', e.target.value)}
                    className="bg-transparent border-none outline-none text-lg md:text-2xl font-black text-slate-900 placeholder:text-slate-200 w-full"
                    placeholder="Enter title here..."
                  />
                </div>
              </div>

              <div className="hidden lg:flex items-center gap-3">
                <div className="flex -space-x-2">
                  {[1, 2].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm">
                      <img src={`https://picsum.photos/seed/${i + 10}/32/32`} referrerPolicy="no-referrer" alt="user" />
                    </div>
                  ))}
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                    +1
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-10">
              {/* Paper-like Workspace */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={cn(
                  "max-w-4xl mx-auto min-h-full bg-white shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] rounded-xl md:rounded-2xl p-6 md:p-16 flex flex-col transition-all relative",
                  isZenMode && "shadow-none rounded-none p-6 md:p-24",
                  isUploading && "opacity-50 pointer-events-none"
                )}
              >
                {isUploading && (
                  <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm rounded-xl md:rounded-2xl">
                    <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
                    <p className="text-sm font-black text-slate-800 uppercase tracking-widest">Syncing Resource...</p>
                  </div>
                )}
                <h1 className="hidden print:block text-4xl font-black mb-8">{selectedNote.title}</h1>
                <textarea
                  value={selectedNote.content}
                  onChange={(e) => updateSelectedNote('content', e.target.value)}
                  className="w-full flex-1 bg-transparent border-none outline-none resize-none text-slate-700 leading-relaxed md:leading-loose text-base md:text-xl placeholder:text-slate-200 font-sans min-h-[400px]"
                  placeholder="Type your thoughts here..."
                />

                {/* Attachments Section */}
                {selectedNote.attachments && selectedNote.attachments.length > 0 && (
                  <div className="mt-20 pt-10 border-t border-slate-100 space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                        <Paperclip size={14} className="text-blue-500" /> Collection ({selectedNote.attachments.length})
                      </h4>
                      <div className="h-px flex-1 bg-slate-50 ml-6" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedNote.attachments.map((file, idx) => (
                        <div key={idx} className="group/file relative bg-white border border-slate-100 rounded-xl p-3 flex items-center gap-4 hover:border-blue-400 hover:shadow-md transition-all">
                          {file.type.startsWith('image/') ? (
                            <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-50 shrink-0 border border-slate-100">
                              <img src={file.url} alt={file.name} className="w-full h-full object-cover group-hover/file:scale-110 transition-transform duration-500" />
                            </div>
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 group-hover/file:bg-blue-50 transition-colors">
                              {getFileIcon(file.type)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0 pr-8">
                            <p className="text-xs font-black text-slate-800 truncate">{file.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{(file.size / 1024).toFixed(1)} KB · {file.type.split('/')[1] || 'FILE'}</p>
                          </div>

                          <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-0 group-hover/file:opacity-100 transition-opacity z-10">
                            <button
                              onClick={() => removeAttachment(idx)}
                              className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-all"
                              title="Remove"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          <a
                            href={file.url}
                            download={file.name}
                            target="_blank"
                            rel="noreferrer"
                            className="absolute inset-0 z-0 cursor-pointer"
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
              "h-14 md:h-20 border-t border-slate-200 px-6 md:px-10 flex items-center justify-between shrink-0 bg-white z-20",
              isZenMode && "border-none"
            )}>
              <div className="flex items-center gap-4 md:gap-10">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".doc,.docx,.xls,.xlsx,.pdf,.png,.jpg,.jpeg,.csv,.txt"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className={cn(
                    "flex items-center gap-2.5 px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest transition-all",
                    isUploading
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95"
                  )}
                >
                  {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
                  <span>{isUploading ? 'Syncing...' : 'Upload Resource'}</span>
                </button>
                <span className="hidden xl:inline-block text-[9px] text-slate-300 font-medium">
                  Supports PDF, Word, Excel, Images (Max 50MB)
                </span>

                <div className="h-6 w-px bg-slate-200 hidden md:block" />

                <div className="flex items-center gap-6">
                  <button
                    onClick={() => setIsZenMode(!isZenMode)}
                    className={cn(
                      "flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest transition-colors",
                      isZenMode ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <Edit3 size={14} />
                    <span className="hidden sm:inline">{isZenMode ? 'Standard View' : 'Zen Focus'}</span>
                  </button>
                  <button
                    onClick={exportPDF}
                    className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    <File size={14} />
                    <span className="hidden sm:inline">Export PDF</span>
                  </button>
                </div>
              </div>

              <div className="hidden md:flex items-center gap-2 text-[10px] uppercase font-black tracking-[0.2em] text-slate-300">
                <span className="text-slate-400">{selectedNote.content.split(/\s+/).filter(Boolean).length}</span> WORDS
                <span className="mx-2 opacity-50">/</span>
                <span className="text-slate-400">{selectedNote.content.length}</span> CHARS
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-slate-50/50 opacity-40">
            <div className="w-20 h-20 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300">
              <FileText size={32} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-xl font-bold text-slate-800">Workspace Inactive</h3>
              <p className="max-w-[240px] text-xs font-medium text-slate-500 leading-relaxed">Select a document from the vault or create a new entry to start your workspace.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

