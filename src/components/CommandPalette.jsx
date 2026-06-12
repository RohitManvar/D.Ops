import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Calendar, LayoutDashboard, X, ListTodo, BrainCircuit, CalendarDays, Settings, Users } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthProvider';

export default function CommandPalette() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ notes: [], backlog: [] });
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef(null);

  // Toggle palette with Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Listen for custom event from UI buttons
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-command-palette', handleOpen);
    return () => window.removeEventListener('open-command-palette', handleOpen);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
      fetchAllData();
    }
  }, [isOpen]);

  const fetchAllData = async () => {
    if (!user) return;
    setLoading(true);
    
    // Fetch recent notes
    const { data: notesData } = await supabase
      .from('notes')
      .select('id, date, project, summary, updates')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(50);

    setResults({
      notes: notesData || [],
      backlog: []
    });
    setLoading(false);
  };

  const getFilteredResults = () => {
    if (!query.trim()) {
      return [
        { type: 'action', title: 'Go to Dashboard', icon: LayoutDashboard, action: () => navigate('/') },
        { type: 'action', title: 'Daily Notes', icon: FileText, action: () => navigate('/daily-notes') },
        { type: 'action', title: 'Daily Update Module', icon: FileText, action: () => navigate('/daily-update') },
        { type: 'action', title: 'Product Backlog', icon: ListTodo, action: () => navigate('/backlog') },
        { type: 'action', title: 'Focus Mode', icon: BrainCircuit, action: () => navigate('/focus') },
        { type: 'action', title: 'Timeline View', icon: CalendarDays, action: () => navigate('/timeline') },
        { type: 'action', title: 'Settings Hub', icon: Settings, action: () => navigate('/settings') },
        { type: 'action', title: 'Team Roster', icon: Users, action: () => navigate('/team') },
      ];
    }

    const q = query.toLowerCase();
    const filtered = [];

    // Filter notes
    results.notes.forEach((note) => {
      const isMatch = 
        note.date?.includes(q) || 
        note.project?.toLowerCase().includes(q) || 
        note.summary?.toLowerCase().includes(q) ||
        note.updates?.some(u => u.text?.toLowerCase().includes(q));
        
      if (isMatch) {
        filtered.push({
          type: 'note',
          title: `${note.date} - ${note.project}`,
          subtitle: note.summary || 'No summary',
          icon: Calendar,
          action: () => {
             // We navigate to /daily-notes but currently it doesn't take an ID in URL.
             // But the user could search it. For now, navigate and they can use local search.
             // Ideally we'd add ?date=YYYY-MM-DD
             navigate(`/daily-notes?date=${note.date}`);
          }
        });
      }
    });

    return filtered.slice(0, 10); // Limit to 10 results
  };

  const filteredItems = getFilteredResults();

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (!filteredItems.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
      }
      if (e.key === 'Enter' && filteredItems[selectedIndex]) {
        e.preventDefault();
        filteredItems[selectedIndex].action();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsOpen(false)}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
        >
          {/* Search Input */}
          <div className="flex items-center border-b border-slate-100 px-4 py-4 dark:border-slate-800">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              className="ml-3 flex-1 bg-transparent text-slate-900 placeholder-slate-400 outline-none dark:text-slate-100"
              placeholder="Search notes, jump to pages, or run commands..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
            />
            {loading && <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full" />}
            <button 
              onClick={() => setIsOpen(false)}
              className="ml-2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto py-2 px-2">
            {filteredItems.length === 0 ? (
              <div className="py-14 text-center text-sm text-slate-500">
                No results found for "{query}"
              </div>
            ) : (
              filteredItems.map((item, index) => {
                const Icon = item.icon;
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={index}
                    onClick={() => {
                      item.action();
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
                      isSelected 
                        ? 'bg-indigo-50 text-indigo-900 dark:bg-indigo-500/10 dark:text-indigo-100' 
                        : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      isSelected ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-1 flex-col overflow-hidden">
                      <span className="truncate text-sm font-medium">{item.title}</span>
                      {item.subtitle && (
                        <span className="truncate text-xs text-slate-500 opacity-80">{item.subtitle}</span>
                      )}
                    </div>
                    {isSelected && (
                      <span className="text-xs font-medium text-indigo-500 dark:text-indigo-400">
                        Enter ↵
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
          
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <span>Use <kbd className="rounded bg-slate-200 px-1 py-0.5 font-mono text-slate-700 dark:bg-slate-700 dark:text-slate-300">↑</kbd> <kbd className="rounded bg-slate-200 px-1 py-0.5 font-mono text-slate-700 dark:bg-slate-700 dark:text-slate-300">↓</kbd> to navigate</span>
              <span>•</span>
              <span><kbd className="rounded bg-slate-200 px-1 py-0.5 font-mono text-slate-700 dark:bg-slate-700 dark:text-slate-300">Enter</kbd> to select</span>
            </div>
            <span>D.Ops Command Palette</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
