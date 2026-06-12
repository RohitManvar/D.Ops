import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DebouncedTextarea } from "@/components/ui/debounced-textarea";
import { containerVariants, itemVariants } from '@/lib/animations';
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/context/ThemeProvider";
import {
  ArrowLeft, ArrowRightCircle, CalendarDays, ChevronDown, ChevronLeft, ChevronRight,
  ClipboardList, Download, FileText, Filter, GripVertical, Keyboard,
  LayoutGrid, List, LogOut, Menu, MessageSquareText, BarChart,
  Moon, Pin, PinOff, Plus, Printer, Search, Share2, Sun, Tag, Trash2, User, X, CheckCheck
} from "lucide-react";
import ProfilePanel from "@/components/ProfilePanel";
import StatsPanel from "@/components/StatsPanel";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthProvider";
import { addToOfflineQueue, flushOfflineQueue } from "@/lib/offlineSync";
import { useNotesManager } from "@/hooks/useNotesManager";

const todayISO = () => new Date().toISOString().slice(0, 10);

const TEMPLATES = [
  {
    name: "Daily Standup", icon: "📋",
    data: {
      summary: "",
      updates: [
        { id: crypto.randomUUID(), text: "", done: false },
        { id: crypto.randomUUID(), text: "", done: false },
        { id: crypto.randomUUID(), text: "", done: false },
      ],
      blockers: "", tomorrow: "",
    },
  },
  {
    name: "Meeting Notes", icon: "🤝",
    data: {
      summary: "Meeting with: \nAgenda: ",
      updates: [
        { id: crypto.randomUUID(), text: "Discussion point 1", done: false },
        { id: crypto.randomUUID(), text: "Action item 1", done: false },
      ],
      blockers: "", tomorrow: "Follow-up on action items",
    },
  },
  {
    name: "Sprint Review", icon: "🚀",
    data: {
      summary: "Sprint #: Review",
      updates: [
        { id: crypto.randomUUID(), text: "Feature completed: ", done: true },
        { id: crypto.randomUUID(), text: "Bug fixed: ", done: true },
        { id: crypto.randomUUID(), text: "Pending: ", done: false },
      ],
      blockers: "", tomorrow: "Next sprint planning",
    },
  },
  {
    name: "Bug Report", icon: "🐛",
    data: {
      summary: "Bug: ",
      updates: [
        { id: crypto.randomUUID(), text: "Steps to reproduce: ", done: false },
        { id: crypto.randomUUID(), text: "Expected behavior: ", done: false },
        { id: crypto.randomUUID(), text: "Fix applied: ", done: false },
      ],
      blockers: "Blocked by: ", tomorrow: "Verify fix in staging",
    },
  },
];

const PRESET_TAGS = ["Development", "Meeting", "Design", "Bug Fix", "Review", "Planning", "Research", "Deployment"];

const DATE_FILTERS = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "This Week", value: "this-week" },
  { label: "Last Week", value: "last-week" },
  { label: "This Month", value: "this-month" },
];

const TAG_COLORS = {
  Development: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Meeting: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  Design: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  "Bug Fix": "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  Review: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Planning: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  Research: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  Deployment: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
};

function createEmptyNote(userId, project = "VSM Automation Tool") {
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    date: todayISO(),
    project,
    summary: "",
    updates: [
      { id: crypto.randomUUID(), text: "", done: false },
      { id: crypto.randomUUID(), text: "", done: false },
      { id: crypto.randomUUID(), text: "", done: false },
    ],
    blockers: "",
    tomorrow: "",
    whatsapp_message: "",
    pinned: false,
    tags: [],
  };
}

function buildWhatsappMessage(note) {
  const completed = note.updates
    .filter((u) => u.text.trim())
    .map((u) => `• ${u.text.trim()}`)
    .join("\n");
  const lines = [
    `Daily Update – ${note.date}`,
    `Project: ${note.project || "Project"}`,
    ""
  ];

  if (note.summary?.trim()) {
    lines.push(note.summary.trim());
  }
  
  if (completed) {
    lines.push(completed);
  }

  if (note.blockers?.trim()) lines.push("", `Blockers: ${note.blockers.trim()}`);
  if (note.tomorrow?.trim()) lines.push("", `Next: ${note.tomorrow.trim()}`);
  return lines.join("\n");
}

function getWeekRange(dateString) {
  const date = new Date(dateString);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return `${fmt(monday)} to ${fmt(sunday)}`;
}

function buildWeeklyReport(notes) {
  const withContent = notes.filter(
    (n) => n.summary?.trim() || n.blockers?.trim() || n.tomorrow?.trim() || n.updates.some((u) => u.text.trim())
  );
  if (!withContent.length) return "Weekly Report\n\nNo notes available for this week yet.";
  const project = withContent[0]?.project || "Project";
  const range = getWeekRange(withContent[0].date);
  const workDone = [];
  const planned = [];
  withContent.forEach((note) => {
    note.updates.filter((u) => u.text.trim()).forEach((u) => workDone.push(`- ${u.text.trim()} (${note.date})`));
    if (note.tomorrow?.trim()) planned.push(`- ${note.tomorrow.trim()} (${note.date})`);
  });
  return [
    `Weekly Report`, `Project: ${project}`, `Week: ${range}`, "",
    `Work Done / Current Status:`, ...(workDone.length ? workDone : ["- No completed updates added"]), "",
    `Work Planned for Next Week:`, ...(planned.length ? planned : ["- No next-step items added"]),
  ].join("\n");
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function HighlightText({ text, query }) {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <span key={i} className="search-highlight">{part}</span>
          : part
      )}
    </>
  );
}

function TagPill({ tag, onRemove, small }) {
  const cls = TAG_COLORS[tag] || "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${small ? "text-[10px]" : "text-xs"} ${cls}`}>
      {tag}
      {onRemove && (
        <button onClick={onRemove} className="hover:opacity-70"><X className="h-3 w-3" /></button>
      )}
    </span>
  );
}

function SortableUpdateRow({ item, onCheck, onChange, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 rounded-2xl border border-slate-200 dark:border-slate-600 bg-[#fcfcfb] dark:bg-slate-700/50 p-3"
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-2 cursor-grab text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 touch-none"
        tabIndex={-1}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Checkbox
        checked={item.done}
        onCheckedChange={(checked) => onCheck(item.id, !!checked)}
        className="mt-2"
      />
      <DebouncedInput
        value={item.text}
        onChange={(val) => onChange(item.id, { text: val })}
        className={`rounded-2xl flex-1 ${item.done ? "line-through opacity-60" : ""}`}
        placeholder="What did you work on?"
      />
      <Button variant="ghost" size="icon" onClick={() => onRemove(item.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ActivityHeatmap({ notes }) {
  const today = todayISO();
  const noteDates = useMemo(() => {
    const s = new Set();
    notes
      .filter((n) => n.summary?.trim() || n.updates.some((u) => u.text.trim()) || n.blockers?.trim())
      .forEach((n) => s.add(n.date));
    return s;
  }, [notes]);

  const days = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Activity</p>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => (
          <div
            key={day}
            title={day}
            className={`h-3 w-3 rounded-sm transition-colors ${
              noteDates.has(day)
                ? "bg-emerald-400 dark:bg-emerald-500"
                : "bg-slate-200 dark:bg-slate-700"
            } ${day === today ? "ring-1 ring-offset-1 ring-slate-400 dark:ring-slate-500" : ""}`}
          />
        ))}
      </div>
      <p className="text-[10px] text-slate-400 dark:text-slate-500">Last 5 weeks</p>
    </div>
  );
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function CalendarSidebar({ notes, selectedId, onSelectNote, onCreateForDate }) {
  const [calMonth, setCalMonth] = useState(() => todayISO().slice(0, 7));
  const year = parseInt(calMonth.slice(0, 4));
  const month = parseInt(calMonth.slice(5, 7)) - 1;
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayISO();

  const notesByDate = useMemo(() => {
    const map = {};
    notes.forEach((n) => { map[n.date] = n; });
    return map;
  }, [notes]);

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${calMonth}-${String(d).padStart(2, "0")}`);
  }

  const prevMonth = () => {
    let newMonth = month - 1;
    let newYear = year;
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }
    setCalMonth(`${newYear}-${String(newMonth + 1).padStart(2, '0')}`);
  };
  const nextMonth = () => {
    let newMonth = month + 1;
    let newYear = year;
    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    setCalMonth(`${newYear}-${String(newMonth + 1).padStart(2, '0')}`);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="rounded-xl p-1 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">{MONTH_NAMES[month]} {year}</span>
        <button onClick={nextMonth} className="rounded-xl p-1 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-[10px] font-medium text-slate-400 dark:text-slate-500 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={`e-${i}`} />;
          const note = notesByDate[dateStr];
          const isSelected = note?.id === selectedId;
          const isToday = dateStr === today;
          const hasContent = note && (note.summary?.trim() || note.updates.some((u) => u.text.trim()) || note.blockers?.trim());
          const day = parseInt(dateStr.slice(8));
          return (
            <button
              key={dateStr}
              onClick={() => note ? onSelectNote(note.id) : onCreateForDate(dateStr)}
              title={dateStr}
              className={`relative flex flex-col items-center py-1 rounded-lg text-xs transition ${
                isSelected
                  ? "bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900"
                  : isToday
                  ? "bg-slate-100 dark:bg-slate-700 font-semibold"
                  : "hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <span>{day}</span>
              {hasContent && (
                <span className={`h-1 w-1 rounded-full mt-0.5 ${isSelected ? "bg-white dark:bg-slate-900" : "bg-emerald-400"}`} />
              )}
              {note && !hasContent && (
                <span className={`h-1 w-1 rounded-full mt-0.5 ${isSelected ? "bg-white/50" : "bg-slate-300 dark:bg-slate-600"}`} />
              )}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
        Click an empty day to create a note
      </p>
    </div>
  );
}

function ShortcutsModal({ onClose }) {
  const shortcuts = [
    { keys: "Ctrl + N", desc: "Create new note" },
    { keys: "Ctrl + S", desc: "Force save current note" },
    { keys: "Ctrl + K", desc: "Open command palette" },
    { keys: "Ctrl + P", desc: "Print / Save as PDF" },
    { keys: "Ctrl + /", desc: "Toggle this shortcuts panel" },
  ];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 w-80"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Keyboard className="h-5 w-5" /> Keyboard Shortcuts
          </h2>
          <button onClick={onClose} className="hover:opacity-70 transition"><X className="h-4 w-4" /></button>
        </div>
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
          {shortcuts.map(({ keys, desc }) => (
            <motion.div key={keys} variants={itemVariants} className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-600 dark:text-slate-400">{desc}</span>
              <kbd className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-lg font-mono whitespace-nowrap">
                {keys}
              </kbd>
            </motion.div>
          ))}
        </motion.div>
        <p className="mt-4 text-xs text-slate-400 text-center">Press Ctrl+/ to close</p>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DailyNoteApplication() {
  const { user, signOut, updateProfile } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const { addToast } = useToast();

  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarView, setSidebarView] = useState("list"); // "list" | "calendar"
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [customTagInput, setCustomTagInput] = useState("");

  // Custom projects — persisted in Supabase metadata + localStorage fallback
  const [customProjects, setCustomProjects] = useState(() => {
    try {
      if (user?.user_metadata?.customProjects) return user.user_metadata.customProjects;
      return JSON.parse(localStorage.getItem("dops-projects") || '["VSM Automation Tool"]');
    } catch {
      return ["VSM Automation Tool"];
    }
  });
  const [showProjectInput, setShowProjectInput] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const searchInputRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize the notes manager
  const {
    notes, setNotes,
    loadingNotes, saving,
    selectedId, setSelectedId,
    migrationNeeded, noteApprovals,
    loadNotes, saveNote, debouncedSave,
    updateSelected, addNewNote, jumpToDate,
    deleteSelected, carryForwardTasks
  } = useNotesManager(user, customProjects);

  const handleAddNewNote = async (template) => {
    await addNewNote(template);
    setSidebarOpen(false);
    setShowTemplates(false);
  };

  const handleJumpToDate = async (dateStr) => {
    await jumpToDate(dateStr);
    setSidebarOpen(false);
  };

  const handleDeleteSelected = async () => {
    await deleteSelected();
    setConfirmOpen(false);
  };

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!notes.length) return;
    if (!selectedId || !notes.find((n) => n.id === selectedId)) setSelectedId(notes[0].id);
  }, [notes, selectedId]);

  // Open a specific date when arriving via /daily-notes?date=YYYY-MM-DD (e.g. from the command palette)
  useEffect(() => {
    const dateParam = searchParams.get("date");
    if (!dateParam || loadingNotes) return;
    jumpToDate(dateParam);
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingNotes, searchParams]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;
      if (e.key === "n") { e.preventDefault(); handleAddNewNote(null); }
      if (e.key === "s") {
        e.preventDefault();
        const cur = notes.find((n) => n.id === selectedId);
        if (cur) { saveNote(cur); addToast("Note saved", "success"); }
      }

      if (e.key === "p") { e.preventDefault(); window.print(); }
      if (e.key === "/") { e.preventDefault(); setShowShortcuts((v) => !v); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [notes, selectedId, saveNote, addToast]);

  // Date filtering
  const dateFiltered = useMemo(() => {
    if (dateFilter === "all") return notes;
    const today = new Date(todayISO());
    const dayOfWeek = today.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    if (dateFilter === "today") return notes.filter((n) => n.date === todayISO());
    if (dateFilter === "this-week") {
      const monday = new Date(today); monday.setDate(today.getDate() + diffToMonday);
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
      return notes.filter((n) => n.date >= monday.toISOString().slice(0, 10) && n.date <= sunday.toISOString().slice(0, 10));
    }
    if (dateFilter === "last-week") {
      const thisMonday = new Date(today); thisMonday.setDate(today.getDate() + diffToMonday);
      const lastMonday = new Date(thisMonday); lastMonday.setDate(thisMonday.getDate() - 7);
      const lastSunday = new Date(lastMonday); lastSunday.setDate(lastMonday.getDate() + 6);
      return notes.filter((n) => n.date >= lastMonday.toISOString().slice(0, 10) && n.date <= lastSunday.toISOString().slice(0, 10));
    }
    if (dateFilter === "this-month") {
      const monthStart = todayISO().slice(0, 7);
      return notes.filter((n) => n.date.startsWith(monthStart));
    }
    return notes;
  }, [notes, dateFilter]);

  const filtered = useMemo(() => {
    let result = dateFiltered;
    if (tagFilter) result = result.filter((n) => (n.tags || []).includes(tagFilter));
    if (query.trim()) {
      result = result.filter((n) => {
        const haystack = `${n.date} ${n.project} ${n.summary} ${n.blockers} ${n.tomorrow} ${n.updates.map((u) => u.text).join(" ")} ${(n.tags || []).join(" ")}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      });
    }
    return [...result].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.date.localeCompare(a.date);
    });
  }, [dateFiltered, query, tagFilter]);

  const selected = notes.find((n) => n.id === selectedId) || notes[0];



  const togglePin = () => {
    updateSelected({ pinned: !selected.pinned });
    addToast(selected.pinned ? "Note unpinned" : "Note pinned", "success");
  };

  const addTag = (tag) => {
    const currentTags = selected.tags || [];
    if (!currentTags.includes(tag)) {
      updateSelected({ tags: [...currentTags, tag] });
      addToast(`Tag "${tag}" added`, "success");
    }
    setShowTagPicker(false);
    setCustomTagInput("");
  };

  const addCustomTag = () => {
    const tag = customTagInput.trim();
    if (!tag) return;
    addTag(tag);
  };

  const removeTag = (tag) => {
    updateSelected({ tags: (selected.tags || []).filter((t) => t !== tag) });
  };

  const addCustomProject = async () => {
    const trimmed = newProjectName.trim();
    if (trimmed && !customProjects.includes(trimmed)) {
      const updated = [...customProjects, trimmed];
      setCustomProjects(updated);
      localStorage.setItem("dops-projects", JSON.stringify(updated));
      await updateProfile({ customProjects: updated });
      if (selected) updateSelected({ project: trimmed });
      addToast(`Project "${trimmed}" added`, "success");
    }
    setNewProjectName("");
    setShowProjectInput(false);
  };

  const removeCustomProject = async (pName) => {
    const updated = customProjects.filter((p) => p !== pName);
    setCustomProjects(updated);
    localStorage.setItem("dops-projects", JSON.stringify(updated));
    await updateProfile({ customProjects: updated });
    if (selected && selected.project === pName) {
      updateSelected({ project: updated[0] || "Project" });
    }
    addToast(`Project "${pName}" removed`, "success");
  };



  const addUpdateRow = () => {
    updateSelected({ updates: [...selected.updates, { id: crypto.randomUUID(), text: "", done: false }] });
  };

  const changeUpdate = (id, patch) => {
    updateSelected({ updates: selected.updates.map((u) => (u.id === id ? { ...u, ...patch } : u)) });
  };

  const removeUpdate = (id) => {
    updateSelected({ updates: selected.updates.filter((u) => u.id !== id) });
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!active || !over || active.id === over.id) return;
    const oldIndex = selected.updates.findIndex((u) => u.id === active.id);
    const newIndex = selected.updates.findIndex((u) => u.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    updateSelected({ updates: arrayMove(selected.updates, oldIndex, newIndex) });
  };

  const copyText = async (text) => {
    await navigator.clipboard.writeText(text);
    addToast("Copied to clipboard!", "copied");
  };

  const exportWeekly = () => {
    const week = getWeekRange(selected.date);
    const weekNotes = notes.filter((n) => getWeekRange(n.date) === week);
    const report = buildWeeklyReport(weekNotes);
    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `weekly-report-${week.replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("Weekly report exported!", "success");
  };

  const weeklyPreview = useMemo(() => {
    if (!selected) return "";
    const week = getWeekRange(selected.date);
    const weekNotes = notes.filter((n) => getWeekRange(n.date) === week);
    return buildWeeklyReport(weekNotes);
  }, [notes, selected]);

  const completedCount = selected?.updates.filter((u) => u.done).length || 0;
  const incompleteCount = selected?.updates.filter((u) => !u.done && u.text.trim()).length || 0;

  const allUsedTags = useMemo(() => {
    const s = new Set();
    notes.forEach((n) => (n.tags || []).forEach((t) => s.add(t)));
    return Array.from(s);
  }, [notes]);

  // Available project options for the dropdown
  const projectOptions = useMemo(() => {
    const set = new Set(customProjects);
    if (selected?.project) set.add(selected.project);
    return Array.from(set);
  }, [customProjects, selected?.project]);

  if (loadingNotes) {
    return (
      <div className="min-h-screen bg-[#f7f6f3] dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2">
            D<span className="text-slate-400">.</span>Ops
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Loading your notes...</p>
          <div className="animate-spin h-6 w-6 border-2 border-slate-900 dark:border-slate-100 border-t-transparent rounded-full mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f6f3] dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Note"
        message={`Delete the note for ${selected?.date}? This action cannot be undone.`}
        onConfirm={handleDeleteSelected}
        onCancel={() => setConfirmOpen(false)}
      />

      <AnimatePresence>
        {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      </AnimatePresence>

      <ProfilePanel
        open={showProfile}
        onClose={() => setShowProfile(false)}
        notes={notes}
      />

      {/* Content */}
      <div className="mx-auto max-w-7xl px-3 py-6 md:px-6 md:py-8 print:px-0 print:py-0">
        
        {/* Top Header Row */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Link to="/">
            <Button variant="ghost" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          </Link>

          <div className="flex items-center gap-3">
            <AnimatePresence>
              {saving && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="mr-2 flex items-center gap-1.5 text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full hidden sm:flex"
                >
                  <div className="animate-spin h-3 w-3 border border-slate-400 border-t-transparent rounded-full" />
                  Saving...
                </motion.span>
              )}
            </AnimatePresence>

            <div className="relative">
              <div className="flex">
                <Button
                  onClick={() => addNewNote(null)}
                  className="rounded-l-xl rounded-r-none h-9 text-sm px-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  <span className="hidden sm:inline">New Note</span>
                  <span className="sm:hidden">New</span>
                </Button>
                <Button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="rounded-l-none rounded-r-xl border-l border-white/20 dark:border-black/10 px-2 h-9 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
              <AnimatePresence>
                {showTemplates && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                    className="absolute right-0 top-full z-50 mt-2 w-52 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-2 shadow-xl"
                  >
                    <p className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Templates</p>
                    {TEMPLATES.map((t) => (
                      <button key={t.name} onClick={() => addNewNote(t)}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                        <span>{t.icon}</span><span>{t.name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
              className="hidden md:flex items-center gap-2 px-3 h-9 text-sm bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 group"
            >
              <Search className="h-4 w-4 text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300" />
              <span className="tracking-tight mr-2">Search</span>
              <kbd className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 dark:bg-slate-900 rounded text-slate-400 border border-slate-200 dark:border-slate-700">
                Ctrl K
              </kbd>
            </button>

            <Button variant="outline" className="rounded-xl h-9 px-3" onClick={() => setShowShortcuts(true)} title="Keyboard shortcuts (Ctrl+/)">
              <Keyboard className="h-4 w-4" />
            </Button>
            
            <Button variant="outline" className="rounded-xl h-9 px-3" onClick={() => setShowStats((prev) => !prev)} title="Toggle Stats">
              <BarChart className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <motion.div 
          className="grid gap-4 lg:grid-cols-[300px_1fr]"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* Sidebar */}
          <motion.aside variants={itemVariants} className={`${sidebarOpen ? "block" : "hidden"} lg:block print:hidden`}>
            <Card className="rounded-[28px] border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
              <CardHeader className="space-y-3 p-6">
                {/* Header row with view toggle */}
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ClipboardList className="h-5 w-5" /> Notes
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSidebarView("list")}
                      title="List view"
                      className={`rounded-xl p-1.5 transition ${sidebarView === "list" ? "bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900" : "hover:bg-slate-100 dark:hover:bg-slate-700"}`}
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setSidebarView("calendar")}
                      title="Calendar view"
                      className={`rounded-xl p-1.5 transition ${sidebarView === "calendar" ? "bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900" : "hover:bg-slate-100 dark:hover:bg-slate-700"}`}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Jump to date */}
                <div>
                  <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-1 block">Jump to date</label>
                  <Input
                    type="date"
                    onChange={(e) => { if (e.target.value) jumpToDate(e.target.value); }}
                    className="rounded-2xl text-sm"
                    title="Jump to or create a note for a specific date"
                  />
                </div>

                {/* Activity heatmap */}
                <ActivityHeatmap notes={notes} />

                {sidebarView === "list" && (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        ref={searchInputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search notes (Ctrl+K)"
                        className="rounded-2xl border-slate-200 dark:border-slate-600 pl-9"
                      />
                    </div>

                    {/* Date range filter */}
                    <div className="flex flex-wrap gap-1">
                      {DATE_FILTERS.map((f) => (
                        <button key={f.value} onClick={() => setDateFilter(f.value)}
                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                            dateFilter === f.value
                              ? "bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900"
                              : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                          }`}>
                          {f.label}
                        </button>
                      ))}
                    </div>

                    {/* Tag filter */}
                    {allUsedTags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <button onClick={() => setTagFilter("")}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${!tagFilter ? "bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"}`}>
                          All Tags
                        </button>
                        {allUsedTags.map((tag) => (
                          <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? "" : tag)}
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${tagFilter === tag ? "bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"}`}>
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardHeader>

              <CardContent className="space-y-3 max-h-[55vh] overflow-y-auto">
                {sidebarView === "calendar" ? (
                  <CalendarSidebar
                    notes={notes}
                    selectedId={selectedId}
                    onSelectNote={(id) => { setSelectedId(id); setSidebarOpen(false); }}
                    onCreateForDate={jumpToDate}
                  />
                ) : (
                  <>
                    {filtered.map((note) => (
                      <button key={note.id}
                        onClick={() => { setSelectedId(note.id); setSidebarOpen(false); }}
                        className={`w-full rounded-2xl border p-3 text-left transition ${
                          selected?.id === note.id
                            ? "border-slate-900 dark:border-slate-300 bg-slate-900 dark:bg-slate-600 text-white"
                            : "border-slate-200 dark:border-slate-600 bg-[#fcfcfb] dark:bg-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700"
                        }`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              {note.pinned && <Pin className="h-3 w-3 shrink-0 text-amber-500" />}
                              <p className="truncate font-medium"><HighlightText text={note.project} query={query} /></p>
                            </div>
                            <p className={`text-xs ${selected?.id === note.id ? "text-slate-300" : "text-slate-500 dark:text-slate-400"}`}>
                              <HighlightText text={note.date} query={query} />
                            </p>
                            {(note.tags || []).length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {note.tags.map((tag) => <TagPill key={tag} tag={tag} small />)}
                              </div>
                            )}
                          </div>
                          <Badge variant={selected?.id === note.id ? "secondary" : "outline"}>
                            {note.updates.filter((u) => u.text.trim()).length}
                          </Badge>
                        </div>
                      </button>
                    ))}
                    {filtered.length === 0 && (
                      <p className="text-center text-sm text-slate-400 py-4">No notes found</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.aside>

          {/* Main Content */}
          {selected && (
            <motion.div variants={itemVariants} className="space-y-4">
              <div className={`grid gap-4 ${showStats ? "xl:grid-cols-[1fr_0.6fr_0.6fr]" : "xl:grid-cols-[1.3fr_0.7fr]"}`}>
                <Card className="rounded-[28px] border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                  <CardHeader className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">Daily Entry</CardTitle>
                        {noteApprovals[selected.id] && (
                          <div title={`Share Status: ${noteApprovals[selected.id]}`}>
                            <CheckCheck className={`h-4 w-4 ${noteApprovals[selected.id] === 'Read' ? 'text-blue-500' : 'text-slate-400'}`} />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8" onClick={togglePin} title={selected.pinned ? "Unpin" : "Pin"}>
                          {selected.pinned ? <PinOff className="h-4 w-4 text-amber-500" /> : <Pin className="h-4 w-4" />}
                        </Button>
                        {incompleteCount > 0 && (
                          <Button variant="ghost" size="sm" className="rounded-xl h-8 text-xs gap-1" onClick={carryForwardTasks}>
                            <ArrowRightCircle className="h-3.5 w-3.5" /> Carry ({incompleteCount})
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Tags row */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {(selected.tags || []).map((tag) => (
                        <TagPill key={tag} tag={tag} onRemove={() => removeTag(tag)} />
                      ))}
                      <div className="relative">
                        <button
                          onClick={() => setShowTagPicker(!showTagPicker)}
                          className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 dark:border-slate-600 px-2 py-0.5 text-xs text-slate-500 hover:border-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition"
                        >
                          <Tag className="h-3 w-3" /> Add tag
                        </button>
                        <AnimatePresence>
                          {showTagPicker && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                              className="absolute left-0 top-full z-20 mt-1 w-52 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-1.5 shadow-xl"
                            >
                              {PRESET_TAGS.filter((t) => !(selected.tags || []).includes(t)).map((tag) => (
                                <button key={tag} onClick={() => addTag(tag)}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                                  <TagPill tag={tag} small />
                                </button>
                              ))}
                              <Separator className="my-1" />
                              <div className="flex gap-1 px-1 py-1">
                                <Input
                                  value={customTagInput}
                                  onChange={(e) => setCustomTagInput(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") addCustomTag(); if (e.key === "Escape") setShowTagPicker(false); }}
                                  placeholder="Custom tag..."
                                  className="rounded-xl text-xs h-7 px-2 flex-1"
                                  autoFocus={PRESET_TAGS.filter((t) => !(selected.tags || []).includes(t)).length === 0}
                                />
                                <Button size="sm" onClick={addCustomTag} className="rounded-xl h-7 px-2 text-xs">Add</Button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-5">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Date</label>
                        <Input
                          type="date"
                          value={selected.date}
                          onChange={(e) => updateSelected({ date: e.target.value })}
                          className="rounded-2xl"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Project</label>
                        <select
                          value={selected.project}
                          onChange={(e) => {
                            if (e.target.value === "__new__") { setShowProjectInput(true); }
                            else updateSelected({ project: e.target.value });
                          }}
                          className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-300"
                        >
                          {projectOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                          <option value="__new__">+ Add new project...</option>
                        </select>
                        <AnimatePresence>
                          {showProjectInput && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                              className="flex gap-2 mt-2 overflow-hidden"
                            >
                              <Input
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                placeholder="New project name"
                                className="rounded-2xl flex-1"
                                onKeyDown={(e) => { if (e.key === "Enter") addCustomProject(); if (e.key === "Escape") { setShowProjectInput(false); setNewProjectName(""); } }}
                                autoFocus
                              />
                              <Button onClick={addCustomProject} className="rounded-2xl">Add</Button>
                              <Button variant="outline" onClick={() => { setShowProjectInput(false); setNewProjectName(""); }} className="rounded-2xl">
                                <X className="h-4 w-4" />
                              </Button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        {customProjects.length > 1 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {customProjects.map((p) => (
                              <span key={p} className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[10px] text-slate-600 dark:text-slate-300">
                                {p}
                                {customProjects.length > 1 && (
                                  <button onClick={() => removeCustomProject(p)} className="hover:opacity-70">
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Summary</label>
                      <RichTextEditor
                        value={selected.summary}
                        onChange={(val) => updateSelected({ summary: val })}
                        placeholder="Write a short summary of today's work"
                        minHeight="100px"
                      />
                    </div>

                    {/* Work Updates with drag-and-drop */}
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Work Updates
                          <span className="ml-2 text-[10px] text-slate-400 font-normal">drag to reorder</span>
                        </label>
                        <Button variant="outline" onClick={addUpdateRow} className="rounded-2xl">
                          <Plus className="mr-2 h-4 w-4" /> Add
                        </Button>
                      </div>
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={selected.updates.map((u) => u.id)} strategy={verticalListSortingStrategy}>
                          <div className="space-y-3">
                            {selected.updates.map((item) => (
                              <SortableUpdateRow
                                key={item.id}
                                item={item}
                                onCheck={(id, checked) => changeUpdate(id, { done: checked })}
                                onChange={(id, patch) => changeUpdate(id, patch)}
                                onRemove={removeUpdate}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Blockers</label>
                        <RichTextEditor
                          value={selected.blockers}
                          onChange={(val) => updateSelected({ blockers: val })}
                          placeholder="Mention blockers or pending approvals"
                          minHeight="120px"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Plan for Tomorrow</label>
                        <RichTextEditor
                          value={selected.tomorrow}
                          onChange={(val) => updateSelected({ tomorrow: val })}
                          placeholder="What is planned next?"
                          minHeight="120px"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <Card className="rounded-[28px] border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm flex flex-col h-[calc(50%-8px)]">
                    <CardHeader className="py-4 px-6 flex flex-row items-center justify-between pb-2">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <CalendarDays className="h-5 w-5" /> Today Snapshot
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="rounded-2xl bg-white/50 dark:bg-slate-700/50 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Date</p>
                        <p className="mt-1 font-medium">{selected.date}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/10 p-4">
                          <p className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Done</p>
                          <p className="mt-1 text-2xl font-semibold text-emerald-700 dark:text-emerald-300">{completedCount}</p>
                        </div>
                        <div className="rounded-2xl bg-amber-50/50 dark:bg-amber-900/10 p-4">
                          <p className="text-xs uppercase tracking-wide text-amber-600 dark:text-amber-400">Pending</p>
                          <p className="mt-1 text-2xl font-semibold text-amber-700 dark:text-amber-300">{incompleteCount}</p>
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white/50 dark:bg-slate-700/50 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Project</p>
                        <p className="mt-1 font-medium">{selected.project}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-[28px] border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm flex flex-col h-[calc(50%-8px)]">
                    <CardHeader className="py-4 px-6 pb-2">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Filter className="h-5 w-5" /> Quick Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {incompleteCount > 0 && (
                        <Button variant="outline" className="w-full justify-start rounded-2xl" onClick={carryForwardTasks}>
                          <ArrowRightCircle className="mr-2 h-4 w-4" /> Carry Forward ({incompleteCount})
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className="w-full justify-start rounded-2xl text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => setConfirmOpen(true)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Current Note
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {showStats && (
                  <div className="space-y-4">
                    <StatsPanel notes={notes} />
                  </div>
                )}
              </div>

              <Tabs defaultValue="whatsapp" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-white dark:bg-slate-800">
                  <TabsTrigger value="whatsapp">WhatsApp Update</TabsTrigger>
                  <TabsTrigger value="weekly">Weekly Report</TabsTrigger>
                </TabsList>
                <TabsContent value="whatsapp">
                  <Card className="rounded-[28px] border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <MessageSquareText className="h-5 w-5" /> WhatsApp Update Generator
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Textarea
                        value={selected.whatsapp_message || buildWhatsappMessage(selected)}
                        onChange={(e) => updateSelected({ whatsapp_message: e.target.value })}
                        className="min-h-[260px] rounded-2xl font-mono text-sm"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button className="rounded-2xl" onClick={() => copyText(selected.whatsapp_message || buildWhatsappMessage(selected))}>
                          Copy Message
                        </Button>
                        <Button variant="outline" className="rounded-2xl" onClick={() => updateSelected({ whatsapp_message: buildWhatsappMessage(selected) })}>
                          Regenerate
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="weekly">
                  <Card className="rounded-[28px] border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <FileText className="h-5 w-5" /> Weekly Report Export
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-2xl bg-[#f7f6f3] dark:bg-slate-700 p-4 text-sm text-slate-600 dark:text-slate-400">
                        Week Range: <span className="font-medium text-slate-900 dark:text-slate-100">{getWeekRange(selected.date)}</span>
                      </div>
                      <Textarea value={weeklyPreview} readOnly className="min-h-[320px] rounded-2xl font-mono text-sm" />
                      <div className="flex flex-wrap gap-2">
                        <Button className="rounded-2xl" onClick={() => copyText(weeklyPreview)}>Copy Weekly Report</Button>
                        <Button variant="outline" className="rounded-2xl" onClick={exportWeekly}>
                          <Download className="mr-2 h-4 w-4" /> Export .txt
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </motion.div>

        <Separator className="my-6 print:hidden" />
        <p className="pb-4 text-center text-xs text-slate-500 dark:text-slate-500 print:hidden">
          D.Ops — Daily project tracking, WhatsApp updates, and weekly reporting.
        </p>
      </div>
    </div>
  );
}
