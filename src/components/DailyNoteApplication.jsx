import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/context/ThemeProvider";
import {
  ArrowRightCircle, CalendarDays, ChevronDown, ChevronLeft, ChevronRight,
  ClipboardList, Download, FileText, Filter, GripVertical, Keyboard,
  LayoutGrid, List, LogOut, Menu, MessageSquareText,
  Moon, Pin, PinOff, Plus, Printer, Search, Share2, Sun, Tag, Trash2, User, X,
} from "lucide-react";
import ProfilePanel from "@/components/ProfilePanel";
import SharePanel from "@/components/SharePanel";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthProvider";

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
    "",
    "Work done:",
    completed || "• No updates added yet",
  ];
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
      <Input
        value={item.text}
        onChange={(e) => onChange(item.id, { text: e.target.value })}
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
    const d = new Date(year, month - 1, 1);
    setCalMonth(d.toISOString().slice(0, 7));
  };
  const nextMonth = () => {
    const d = new Date(year, month + 1, 1);
    setCalMonth(d.toISOString().slice(0, 7));
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
    { keys: "Ctrl + K", desc: "Focus search bar" },
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
        <div className="space-y-3">
          {shortcuts.map(({ keys, desc }) => (
            <div key={keys} className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-600 dark:text-slate-400">{desc}</span>
              <kbd className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-lg font-mono whitespace-nowrap">
                {keys}
              </kbd>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-400 text-center">Press Ctrl+/ to close</p>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DailyNoteApplication() {
  const { user, signOut } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const { addToast } = useToast();

  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarView, setSidebarView] = useState("list"); // "list" | "calendar"
  const [saving, setSaving] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [customTagInput, setCustomTagInput] = useState("");

  // Custom projects — persisted in localStorage
  const [customProjects, setCustomProjects] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("dops-projects") || '["VSM Automation Tool"]');
    } catch {
      return ["VSM Automation Tool"];
    }
  });
  const [showProjectInput, setShowProjectInput] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [migrationNeeded, setMigrationNeeded] = useState(false);

  const saveTimerRef = useRef(null);
  const searchInputRef = useRef(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => { loadNotes(); }, []);

  const isSchemaError = (err) =>
    err?.message?.includes("schema cache") ||
    err?.message?.includes("column") ||
    err?.message?.includes("pinned") ||
    err?.message?.includes("tags");

  const loadNotes = async () => {
    setLoadingNotes(true);
    const { data, error } = await supabase
      .from("notes").select("*").eq("user_id", user.id).order("date", { ascending: false });
    if (error) { addToast("Failed to load notes", "error"); setLoadingNotes(false); return; }

    // Detect missing columns — if first row has no 'pinned' key, migration hasn't been run
    if (data && data.length > 0 && !("pinned" in data[0])) {
      setMigrationNeeded(true);
    }

    let allNotes = (data || []).map((n) => ({ ...n, pinned: n.pinned ?? false, tags: n.tags ?? [] }));

    const today = todayISO();
    if (!allNotes.some((n) => n.date === today)) {
      const todayNote = createEmptyNote(user.id, customProjects[0] || "VSM Automation Tool");
      todayNote.whatsapp_message = buildWhatsappMessage(todayNote);
      const { id: _tid, pinned: _tp, tags: _tt, ...todayPayload } = todayNote;
      const { data: inserted, error: insertError } = await supabase.from("notes").insert(todayPayload).select().single();
      if (insertError) {
        if (isSchemaError(insertError)) setMigrationNeeded(true);
      } else if (inserted) {
        allNotes = [{ ...inserted, pinned: false, tags: [] }, ...allNotes];
        addToast("Today's note created", "success");
      }
    }

    if (allNotes.length > 0) {
      setNotes(allNotes);
      const todayNote = allNotes.find((n) => n.date === today);
      setSelectedId(todayNote?.id || allNotes[0].id);
    }
    setLoadingNotes(false);
  };

  const saveNote = useCallback(async (noteToSave) => {
    setSaving(true);
    const { id, user_id, created_at, ...rest } = noteToSave;
    const fullPayload = { ...rest, updated_at: new Date().toISOString() };
    let { error } = await supabase
      .from("notes").update(fullPayload).eq("id", id).eq("user_id", user.id);
    if (error && isSchemaError(error)) {
      // Columns missing — retry without pinned/tags
      setMigrationNeeded(true);
      const { pinned: _p, tags: _t, ...safePayload } = fullPayload;
      ({ error } = await supabase
        .from("notes").update(safePayload).eq("id", id).eq("user_id", user.id));
    }
    if (error) addToast("Failed to save", "error");
    setSaving(false);
  }, [user.id, addToast]);

  const debouncedSave = useCallback((noteToSave) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveNote(noteToSave);
      addToast("Note saved", "success");
    }, 800);
  }, [saveNote, addToast]);

  useEffect(() => {
    if (!notes.length) return;
    if (!selectedId || !notes.find((n) => n.id === selectedId)) setSelectedId(notes[0].id);
  }, [notes, selectedId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;
      if (e.key === "n") { e.preventDefault(); addNewNote(null); }
      if (e.key === "s") {
        e.preventDefault();
        const cur = notes.find((n) => n.id === selectedId);
        if (cur) { saveNote(cur); addToast("Note saved", "success"); }
      }
      if (e.key === "k") { e.preventDefault(); searchInputRef.current?.focus(); }
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

  const updateSelected = (patch) => {
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id !== selected.id) return n;
        const next = { ...n, ...patch };
        next.whatsapp_message = buildWhatsappMessage(next);
        debouncedSave(next);
        return next;
      })
    );
  };

  const addNewNote = async (template) => {
    const currentProject = selected?.project || customProjects[0] || "VSM Automation Tool";
    const note = createEmptyNote(user.id, currentProject);
    if (template) {
      note.summary = template.data.summary;
      note.updates = template.data.updates.map((u) => ({ ...u, id: crypto.randomUUID() }));
      note.blockers = template.data.blockers;
      note.tomorrow = template.data.tomorrow;
    }
    note.whatsapp_message = buildWhatsappMessage(note);
    const { id: _localId, pinned: _lp, tags: _lt, ...insertPayload } = note;
    const { data: inserted, error } = await supabase.from("notes").insert(insertPayload).select().single();
    if (error) {
      console.error("Failed to create note:", error);
      addToast(error.message || "Failed to create note", "error");
      return;
    }
    setNotes((prev) => [{ ...inserted, pinned: false, tags: [] }, ...prev]);
    setSelectedId(inserted.id);
    setSidebarOpen(false);
    setShowTemplates(false);
    addToast(template ? `${template.name} note created` : "New note created", "success");
  };

  const jumpToDate = async (dateStr) => {
    if (!dateStr) return;
    const existing = notes.find((n) => n.date === dateStr);
    if (existing) {
      setSelectedId(existing.id);
      setSidebarOpen(false);
    } else {
      const note = createEmptyNote(user.id, selected?.project || customProjects[0] || "VSM Automation Tool");
      note.date = dateStr;
      note.whatsapp_message = buildWhatsappMessage(note);
      const { id: _jid, pinned: _jp, tags: _jt, ...jumpPayload } = note;
      const { data: inserted, error } = await supabase.from("notes").insert(jumpPayload).select().single();
      if (error) { console.error("jumpToDate insert error:", error); addToast(error.message || "Failed to create note", "error"); return; }
      setNotes((prev) =>
        [...prev, { ...inserted, pinned: false, tags: [] }].sort((a, b) => b.date.localeCompare(a.date))
      );
      setSelectedId(inserted.id);
      setSidebarOpen(false);
      addToast(`Note created for ${dateStr}`, "success");
    }
  };

  const deleteSelected = async () => {
    if (!selected) return;
    const { error } = await supabase.from("notes").delete().eq("id", selected.id).eq("user_id", user.id);
    if (error) { addToast("Failed to delete note", "error"); return; }
    const remaining = notes.filter((n) => n.id !== selected.id);
    if (remaining.length) { setNotes(remaining); setSelectedId(remaining[0].id); }
    else {
      const fresh = createEmptyNote(user.id, customProjects[0] || "VSM Automation Tool");
      fresh.whatsapp_message = buildWhatsappMessage(fresh);
      const { id: _fid, pinned: _fp, tags: _ft, ...freshPayload } = fresh;
      const { data: inserted } = await supabase.from("notes").insert(freshPayload).select().single();
      if (inserted) { setNotes([inserted]); setSelectedId(inserted.id); }
    }
    addToast("Note deleted", "deleted");
    setConfirmOpen(false);
  };

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

  const addCustomProject = () => {
    const name = newProjectName.trim();
    if (!name) return;
    const updated = customProjects.includes(name) ? customProjects : [...customProjects, name];
    setCustomProjects(updated);
    localStorage.setItem("dops-projects", JSON.stringify(updated));
    updateSelected({ project: name });
    setNewProjectName("");
    setShowProjectInput(false);
    addToast(`Project "${name}" added`, "success");
  };

  const removeCustomProject = (name) => {
    const updated = customProjects.filter((p) => p !== name);
    setCustomProjects(updated);
    localStorage.setItem("dops-projects", JSON.stringify(updated));
  };

  const carryForwardTasks = async () => {
    const incompleteTasks = selected.updates.filter((u) => !u.done && u.text.trim());
    if (!incompleteTasks.length) { addToast("No incomplete tasks to carry forward", "info"); return; }
    const tomorrow = new Date(selected.date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().slice(0, 10);
    const existingNote = notes.find((n) => n.date === tomorrowDate);
    if (existingNote) {
      const newUpdates = [
        ...existingNote.updates,
        ...incompleteTasks.map((u) => ({ id: crypto.randomUUID(), text: `[Carried] ${u.text}`, done: false })),
      ];
      setNotes((prev) => prev.map((n) => {
        if (n.id !== existingNote.id) return n;
        const next = { ...n, updates: newUpdates };
        next.whatsapp_message = buildWhatsappMessage(next);
        debouncedSave(next);
        return next;
      }));
      setSelectedId(existingNote.id);
    } else {
      const newNote = createEmptyNote(user.id, selected.project);
      newNote.date = tomorrowDate;
      newNote.updates = incompleteTasks.map((u) => ({ id: crypto.randomUUID(), text: `[Carried] ${u.text}`, done: false }));
      newNote.whatsapp_message = buildWhatsappMessage(newNote);
      const { id: _cid, pinned: _cp, tags: _ct, ...carryPayload } = newNote;
      const { data: inserted, error } = await supabase.from("notes").insert(carryPayload).select().single();
      if (error) { console.error("carryForward insert error:", error); addToast(error.message || "Failed to carry forward", "error"); return; }
      setNotes((prev) => [{ ...inserted, pinned: false, tags: [] }, ...prev]);
      setSelectedId(inserted.id);
    }
    addToast(`${incompleteTasks.length} task(s) carried forward`, "success");
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
        onConfirm={deleteSelected}
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

      <SharePanel
        open={showShare}
        onClose={() => setShowShare(false)}
        notes={notes}
      />


      {/* ── Navbar ── */}
      <motion.nav
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-0 left-0 right-0 z-30 h-14 bg-white/95 dark:bg-slate-800/95 backdrop-blur border-b border-slate-200 dark:border-slate-700 shadow-sm print:hidden"
      >
        <div className="mx-auto max-w-7xl h-full px-3 md:px-6 flex items-center justify-between gap-3">

          {/* Left — logo + mobile menu */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="lg:hidden rounded-xl p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <img src="/Do logo.png" alt="D.Ops" className="h-8 w-8 rounded-xl object-cover shrink-0" />
              <div className="hidden sm:block">
                <span className="font-semibold text-base tracking-tight">
                  D<span className="text-slate-400">.</span>Ops
                </span>
                <span className="ml-2 text-xs text-slate-400 hidden md:inline">Daily Operations</span>
              </div>
            </div>
          </div>

          {/* Center — saving indicator */}
          <div className="flex-1 flex items-center justify-center">
            <AnimatePresence>
              {saving && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full"
                >
                  <div className="animate-spin h-3 w-3 border border-slate-400 border-t-transparent rounded-full" />
                  Saving...
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Right — actions */}
          <div className="flex items-center gap-1 shrink-0">

            {/* New Note + template dropdown */}
            <div className="relative">
              <div className="flex">
                <Button
                  onClick={() => addNewNote(null)}
                  size="sm"
                  className="rounded-l-xl rounded-r-none h-8 text-xs px-3"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  <span className="hidden sm:inline">New Note</span>
                  <span className="sm:hidden">New</span>
                </Button>
                <Button
                  onClick={() => setShowTemplates(!showTemplates)}
                  size="sm"
                  className="rounded-l-none rounded-r-xl border-l border-white/20 px-2 h-8"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
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

            {/* Divider */}
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-600 mx-1 hidden sm:block" />

            {/* Export Weekly */}
            <button
              onClick={exportWeekly}
              title="Export weekly report"
              className="rounded-xl p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition"
            >
              <Download className="h-4 w-4" />
            </button>

            {/* Keyboard shortcuts */}
            <button
              onClick={() => setShowShortcuts(true)}
              title="Keyboard shortcuts (Ctrl+/)"
              className="rounded-xl p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition"
            >
              <Keyboard className="h-4 w-4" />
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
              className="rounded-xl p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Divider */}
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-600 mx-1" />

            {/* Profile avatar */}
            <button
              onClick={() => setShowProfile(true)}
              title="Your profile"
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              <div
                className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ring-2 ring-white dark:ring-slate-800"
                style={{ background: `hsl(${Math.abs(user?.email?.charCodeAt(0) * 37 || 200) % 360}, 65%, 50%)` }}
              >
                {(user?.user_metadata?.full_name?.[0] || user?.email?.[0] || "?").toUpperCase()}
              </div>
              <span className="text-xs text-slate-600 dark:text-slate-300 max-w-[100px] truncate hidden md:block">
                {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
              </span>
              <ChevronDown className="h-3 w-3 text-slate-400 hidden md:block" />
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Content — offset for fixed navbar */}
      <div className="mx-auto max-w-7xl px-3 pt-[4.5rem] pb-3 md:px-6 md:pt-[4.5rem] md:pb-6 print:px-0 print:py-0">

        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          {/* Sidebar */}
          <aside className={`${sidebarOpen ? "block" : "hidden"} lg:block print:hidden`}>
            <Card className="rounded-[28px] border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
              <CardHeader className="space-y-3">
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
          </aside>

          {/* Main Content */}
          {selected && (
            <div className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
                <Card className="rounded-[28px] border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Daily Entry</CardTitle>
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
                      <Textarea
                        value={selected.summary}
                        onChange={(e) => updateSelected({ summary: e.target.value })}
                        className="min-h-[88px] rounded-2xl"
                        placeholder="Write a short summary of today's work"
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

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Blockers</label>
                        <Textarea
                          value={selected.blockers}
                          onChange={(e) => updateSelected({ blockers: e.target.value })}
                          className="min-h-[96px] rounded-2xl"
                          placeholder="Mention blockers or pending approvals"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Plan for Tomorrow</label>
                        <Textarea
                          value={selected.tomorrow}
                          onChange={(e) => updateSelected({ tomorrow: e.target.value })}
                          className="min-h-[96px] rounded-2xl"
                          placeholder="What is planned next?"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <Card className="rounded-[28px] border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <CalendarDays className="h-5 w-5" /> Today Snapshot
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="rounded-2xl bg-[#f7f6f3] dark:bg-slate-700 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Date</p>
                        <p className="mt-1 font-medium">{selected.date}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 p-4">
                          <p className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Done</p>
                          <p className="mt-1 text-2xl font-semibold text-emerald-700 dark:text-emerald-300">{completedCount}</p>
                        </div>
                        <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 p-4">
                          <p className="text-xs uppercase tracking-wide text-amber-600 dark:text-amber-400">Pending</p>
                          <p className="mt-1 text-2xl font-semibold text-amber-700 dark:text-amber-300">{incompleteCount}</p>
                        </div>
                      </div>
                      <div className="rounded-2xl bg-[#f7f6f3] dark:bg-slate-700 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Project</p>
                        <p className="mt-1 font-medium">{selected.project}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-[28px] border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm print:hidden">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Filter className="h-5 w-5" /> Quick Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <Button variant="outline" className="w-full justify-start rounded-2xl" onClick={() => copyText(selected.whatsapp_message || buildWhatsappMessage(selected))}>
                        <MessageSquareText className="mr-2 h-4 w-4" /> Copy WhatsApp Update
                      </Button>
                      <Button variant="outline" className="w-full justify-start rounded-2xl" onClick={() => copyText(weeklyPreview)}>
                        <FileText className="mr-2 h-4 w-4" /> Copy Weekly Report
                      </Button>
                      <Button variant="outline" className="w-full justify-start rounded-2xl" onClick={() => window.print()} title="Ctrl+P">
                        <Printer className="mr-2 h-4 w-4" /> Print / Save as PDF
                      </Button>
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
            </div>
          )}
        </div>

        <Separator className="my-6 print:hidden" />
        <p className="pb-4 text-center text-xs text-slate-500 dark:text-slate-500 print:hidden">
          D.Ops — Daily project tracking, WhatsApp updates, and weekly reporting.
        </p>
      </div>
    </div>
  );
}
