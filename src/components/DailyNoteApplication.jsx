import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  ArrowRightCircle, CalendarDays, ChevronDown, ClipboardList, Download,
  FileText, Filter, LayoutTemplate, LogOut, Menu, MessageSquareText,
  Moon, Pin, PinOff, Plus, Search, Sun, Tag, Trash2, X
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthProvider";

const todayISO = () => new Date().toISOString().slice(0, 10);

const TEMPLATES = [
  {
    name: "Daily Standup",
    icon: "📋",
    data: {
      summary: "",
      updates: [
        { id: crypto.randomUUID(), text: "", done: false },
        { id: crypto.randomUUID(), text: "", done: false },
        { id: crypto.randomUUID(), text: "", done: false },
      ],
      blockers: "",
      tomorrow: "",
    },
  },
  {
    name: "Meeting Notes",
    icon: "🤝",
    data: {
      summary: "Meeting with: \nAgenda: ",
      updates: [
        { id: crypto.randomUUID(), text: "Discussion point 1", done: false },
        { id: crypto.randomUUID(), text: "Action item 1", done: false },
      ],
      blockers: "",
      tomorrow: "Follow-up on action items",
    },
  },
  {
    name: "Sprint Review",
    icon: "🚀",
    data: {
      summary: "Sprint #: Review",
      updates: [
        { id: crypto.randomUUID(), text: "Feature completed: ", done: true },
        { id: crypto.randomUUID(), text: "Bug fixed: ", done: true },
        { id: crypto.randomUUID(), text: "Pending: ", done: false },
      ],
      blockers: "",
      tomorrow: "Next sprint planning",
    },
  },
  {
    name: "Bug Report",
    icon: "🐛",
    data: {
      summary: "Bug: ",
      updates: [
        { id: crypto.randomUUID(), text: "Steps to reproduce: ", done: false },
        { id: crypto.randomUUID(), text: "Expected behavior: ", done: false },
        { id: crypto.randomUUID(), text: "Fix applied: ", done: false },
      ],
      blockers: "Blocked by: ",
      tomorrow: "Verify fix in staging",
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

function createEmptyNote(userId) {
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    date: todayISO(),
    project: "VSM Automation Tool",
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

function HighlightText({ text, query }) {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return <>{parts.map((part, i) => (part.toLowerCase() === query.toLowerCase() ? <span key={i} className="search-highlight">{part}</span> : part))}</>;
}

// Tag pill component
function TagPill({ tag, onRemove, small }) {
  const colors = {
    Development: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    Meeting: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    Design: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
    "Bug Fix": "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    Review: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    Planning: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    Research: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
    Deployment: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  };
  const cls = colors[tag] || "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${small ? "text-[10px]" : "text-xs"} ${cls}`}>
      {tag}
      {onRemove && (
        <button onClick={onRemove} className="hover:opacity-70"><X className="h-3 w-3" /></button>
      )}
    </span>
  );
}

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
  const [saving, setSaving] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const saveTimerRef = useRef(null);

  useEffect(() => { loadNotes(); }, []);

  const loadNotes = async () => {
    setLoadingNotes(true);
    const { data, error } = await supabase
      .from("notes").select("*").eq("user_id", user.id).order("date", { ascending: false });
    if (error) { addToast("Failed to load notes", "error"); setLoadingNotes(false); return; }

    let allNotes = (data || []).map((n) => ({
      ...n,
      pinned: n.pinned ?? false,
      tags: n.tags ?? [],
    }));

    const today = todayISO();
    if (!allNotes.some((n) => n.date === today)) {
      const todayNote = createEmptyNote(user.id);
      todayNote.whatsapp_message = buildWhatsappMessage(todayNote);
      const { data: inserted, error: insertError } = await supabase.from("notes").insert(todayNote).select().single();
      if (!insertError && inserted) {
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
    const { error } = await supabase
      .from("notes").update({ ...rest, updated_at: new Date().toISOString() })
      .eq("id", id).eq("user_id", user.id);
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

  // Date filtering logic
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

  // Search + tag filtering
  const filtered = useMemo(() => {
    let result = dateFiltered;
    if (tagFilter) result = result.filter((n) => (n.tags || []).includes(tagFilter));
    if (query.trim()) {
      result = result.filter((n) => {
        const haystack = `${n.date} ${n.project} ${n.summary} ${n.blockers} ${n.tomorrow} ${n.updates.map((u) => u.text).join(" ")} ${(n.tags || []).join(" ")}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      });
    }
    // Sort: pinned first, then by date desc
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
    const note = createEmptyNote(user.id);
    if (template) {
      note.summary = template.data.summary;
      note.updates = template.data.updates.map((u) => ({ ...u, id: crypto.randomUUID() }));
      note.blockers = template.data.blockers;
      note.tomorrow = template.data.tomorrow;
    }
    note.whatsapp_message = buildWhatsappMessage(note);
    const { data: inserted, error } = await supabase.from("notes").insert(note).select().single();
    if (error) { addToast("Failed to create note", "error"); return; }
    setNotes((prev) => [{ ...inserted, pinned: false, tags: [] }, ...prev]);
    setSelectedId(inserted.id);
    setSidebarOpen(false);
    setShowTemplates(false);
    addToast(template ? `${template.name} note created` : "New note created", "success");
  };

  const deleteSelected = async () => {
    if (!selected) return;
    const { error } = await supabase.from("notes").delete().eq("id", selected.id).eq("user_id", user.id);
    if (error) { addToast("Failed to delete note", "error"); return; }
    const remaining = notes.filter((n) => n.id !== selected.id);
    if (remaining.length) { setNotes(remaining); setSelectedId(remaining[0].id); }
    else {
      const fresh = createEmptyNote(user.id);
      fresh.whatsapp_message = buildWhatsappMessage(fresh);
      const { data: inserted } = await supabase.from("notes").insert(fresh).select().single();
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
  };

  const removeTag = (tag) => {
    updateSelected({ tags: (selected.tags || []).filter((t) => t !== tag) });
  };

  // Carry forward incomplete tasks
  const carryForwardTasks = async () => {
    const incompleteTasks = selected.updates.filter((u) => !u.done && u.text.trim());
    if (!incompleteTasks.length) { addToast("No incomplete tasks to carry forward", "info"); return; }

    const tomorrow = new Date(selected.date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().slice(0, 10);

    // Check if a note for tomorrow already exists
    const existingNote = notes.find((n) => n.date === tomorrowDate);
    if (existingNote) {
      const newUpdates = [
        ...existingNote.updates,
        ...incompleteTasks.map((u) => ({ id: crypto.randomUUID(), text: `[Carried] ${u.text}`, done: false })),
      ];
      setNotes((prev) =>
        prev.map((n) => {
          if (n.id !== existingNote.id) return n;
          const next = { ...n, updates: newUpdates };
          next.whatsapp_message = buildWhatsappMessage(next);
          debouncedSave(next);
          return next;
        })
      );
      setSelectedId(existingNote.id);
    } else {
      const newNote = createEmptyNote(user.id);
      newNote.date = tomorrowDate;
      newNote.updates = incompleteTasks.map((u) => ({ id: crypto.randomUUID(), text: `[Carried] ${u.text}`, done: false }));
      newNote.whatsapp_message = buildWhatsappMessage(newNote);
      const { data: inserted, error } = await supabase.from("notes").insert(newNote).select().single();
      if (error) { addToast("Failed to carry forward", "error"); return; }
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

  // All unique tags across notes
  const allUsedTags = useMemo(() => {
    const s = new Set();
    notes.forEach((n) => (n.tags || []).forEach((t) => s.add(t)));
    return Array.from(s);
  }, [notes]);

  if (loadingNotes) {
    return (
      <div className="min-h-screen bg-[#f7f6f3] dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2">D<span className="text-slate-400">.</span>Ops</h1>
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

      <div className="mx-auto max-w-7xl px-3 py-3 md:px-6 md:py-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-[28px] border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 p-4 shadow-sm backdrop-blur md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <Button variant="outline" size="icon" className="rounded-2xl md:hidden" onClick={() => setSidebarOpen((v) => !v)}><Menu className="h-4 w-4" /></Button>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">D<span className="text-slate-400">.</span>Ops</h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Daily tracking, WhatsApp updates, and weekly report export.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {saving && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <div className="animate-spin h-3 w-3 border border-slate-400 border-t-transparent rounded-full" />Saving...
                </span>
              )}
              <span className="text-xs text-slate-400 hidden md:block">{user?.email}</span>
              <Button variant="outline" size="icon" className="rounded-2xl" onClick={toggleTheme} title={dark ? "Light mode" : "Dark mode"}>
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              {/* New Note with template dropdown */}
              <div className="relative">
                <div className="flex">
                  <Button onClick={() => addNewNote(null)} className="rounded-l-2xl rounded-r-none"><Plus className="mr-2 h-4 w-4" /> New Note</Button>
                  <Button onClick={() => setShowTemplates(!showTemplates)} className="rounded-l-none rounded-r-2xl border-l border-white/20 px-2">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
                <AnimatePresence>
                  {showTemplates && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                      className="absolute right-0 top-full z-20 mt-2 w-56 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-2 shadow-xl">
                      <p className="px-2 py-1 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Templates</p>
                      {TEMPLATES.map((t) => (
                        <button key={t.name} onClick={() => addNewNote(t)}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                          <span>{t.icon}</span>
                          <span>{t.name}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Button variant="outline" onClick={exportWeekly} className="rounded-2xl"><Download className="mr-2 h-4 w-4" /> Export Weekly</Button>
              <Button variant="outline" size="icon" className="rounded-2xl" onClick={signOut} title="Sign out"><LogOut className="h-4 w-4" /></Button>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          {/* Sidebar */}
          <aside className={`${sidebarOpen ? "block" : "hidden"} lg:block`}>
            <Card className="rounded-[28px] border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
              <CardHeader className="space-y-3">
                <CardTitle className="flex items-center gap-2 text-lg"><ClipboardList className="h-5 w-5" /> Notes</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes" className="rounded-2xl border-slate-200 dark:border-slate-600 pl-9" />
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
              </CardHeader>
              <CardContent className="space-y-3 max-h-[55vh] overflow-y-auto">
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
                          <Button variant="ghost" size="sm" className="rounded-xl h-8 text-xs gap-1" onClick={carryForwardTasks} title="Carry forward incomplete tasks">
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
                        <button onClick={() => setShowTagPicker(!showTagPicker)}
                          className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 dark:border-slate-600 px-2 py-0.5 text-xs text-slate-500 hover:border-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition">
                          <Tag className="h-3 w-3" /> Add tag
                        </button>
                        <AnimatePresence>
                          {showTagPicker && (
                            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                              className="absolute left-0 top-full z-20 mt-1 w-44 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-1.5 shadow-xl">
                              {PRESET_TAGS.filter((t) => !(selected.tags || []).includes(t)).map((tag) => (
                                <button key={tag} onClick={() => addTag(tag)}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                                  <TagPill tag={tag} small />
                                </button>
                              ))}
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
                        <Input type="date" value={selected.date} onChange={(e) => updateSelected({ date: e.target.value })} className="rounded-2xl" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Project</label>
                        <Input value={selected.project} onChange={(e) => updateSelected({ project: e.target.value })} className="rounded-2xl" />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Summary</label>
                      <Textarea value={selected.summary} onChange={(e) => updateSelected({ summary: e.target.value })} className="min-h-[88px] rounded-2xl" placeholder="Write a short summary of today's work" />
                    </div>

                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Work Updates</label>
                        <Button variant="outline" onClick={addUpdateRow} className="rounded-2xl"><Plus className="mr-2 h-4 w-4" /> Add</Button>
                      </div>
                      <div className="space-y-3">
                        {selected.updates.map((item) => (
                          <div key={item.id} className="flex items-start gap-2 rounded-2xl border border-slate-200 dark:border-slate-600 bg-[#fcfcfb] dark:bg-slate-700/50 p-3">
                            <Checkbox checked={item.done} onCheckedChange={(checked) => changeUpdate(item.id, { done: !!checked })} />
                            <Input value={item.text} onChange={(e) => changeUpdate(item.id, { text: e.target.value })} className={`rounded-2xl ${item.done ? "line-through opacity-60" : ""}`} placeholder="What did you work on?" />
                            <Button variant="ghost" size="icon" onClick={() => removeUpdate(item.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Blockers</label>
                        <Textarea value={selected.blockers} onChange={(e) => updateSelected({ blockers: e.target.value })} className="min-h-[96px] rounded-2xl" placeholder="Mention blockers or pending approvals" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Plan for Tomorrow</label>
                        <Textarea value={selected.tomorrow} onChange={(e) => updateSelected({ tomorrow: e.target.value })} className="min-h-[96px] rounded-2xl" placeholder="What is planned next?" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <Card className="rounded-[28px] border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg"><CalendarDays className="h-5 w-5" /> Today Snapshot</CardTitle>
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

                  <Card className="rounded-[28px] border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg"><Filter className="h-5 w-5" /> Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <Button variant="outline" className="w-full justify-start rounded-2xl" onClick={() => copyText(selected.whatsapp_message || buildWhatsappMessage(selected))}>
                        <MessageSquareText className="mr-2 h-4 w-4" /> Copy WhatsApp Update
                      </Button>
                      <Button variant="outline" className="w-full justify-start rounded-2xl" onClick={() => copyText(weeklyPreview)}>
                        <FileText className="mr-2 h-4 w-4" /> Copy Weekly Report
                      </Button>
                      {incompleteCount > 0 && (
                        <Button variant="outline" className="w-full justify-start rounded-2xl" onClick={carryForwardTasks}>
                          <ArrowRightCircle className="mr-2 h-4 w-4" /> Carry Forward ({incompleteCount})
                        </Button>
                      )}
                      <Button variant="outline" className="w-full justify-start rounded-2xl text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setConfirmOpen(true)}>
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
                    <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><MessageSquareText className="h-5 w-5" /> WhatsApp Update Generator</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <Textarea value={selected.whatsapp_message || buildWhatsappMessage(selected)} onChange={(e) => updateSelected({ whatsapp_message: e.target.value })} className="min-h-[260px] rounded-2xl font-mono text-sm" />
                      <div className="flex flex-wrap gap-2">
                        <Button className="rounded-2xl" onClick={() => copyText(selected.whatsapp_message || buildWhatsappMessage(selected))}>Copy Message</Button>
                        <Button variant="outline" className="rounded-2xl" onClick={() => updateSelected({ whatsapp_message: buildWhatsappMessage(selected) })}>Regenerate</Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="weekly">
                  <Card className="rounded-[28px] border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                    <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><FileText className="h-5 w-5" /> Weekly Report Export</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-2xl bg-[#f7f6f3] dark:bg-slate-700 p-4 text-sm text-slate-600 dark:text-slate-400">
                        Week Range: <span className="font-medium text-slate-900 dark:text-slate-100">{getWeekRange(selected.date)}</span>
                      </div>
                      <Textarea value={weeklyPreview} readOnly className="min-h-[320px] rounded-2xl font-mono text-sm" />
                      <div className="flex flex-wrap gap-2">
                        <Button className="rounded-2xl" onClick={() => copyText(weeklyPreview)}>Copy Weekly Report</Button>
                        <Button variant="outline" className="rounded-2xl" onClick={exportWeekly}><Download className="mr-2 h-4 w-4" /> Export .txt</Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        <Separator className="my-6" />
        <p className="pb-4 text-center text-xs text-slate-500 dark:text-slate-500">D.Ops — Daily project tracking, WhatsApp updates, and weekly reporting.</p>
      </div>
    </div>
  );
}
