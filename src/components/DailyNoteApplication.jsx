import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, CheckCircle2, ClipboardList, Download, FileText, Filter, LogOut, Menu, MessageSquareText, Plus, Search, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthProvider";

const todayISO = () => new Date().toISOString().slice(0, 10);

const createEmptyNote = (userId) => ({
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
});

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

  if (note.blockers.trim()) lines.push("", `Blockers: ${note.blockers.trim()}`);
  if (note.tomorrow.trim()) lines.push("", `Next: ${note.tomorrow.trim()}`);

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
  const format = (d) => d.toISOString().slice(0, 10);
  return `${format(monday)} to ${format(sunday)}`;
}

function buildWeeklyReport(notes) {
  const withContent = notes.filter(
    (n) => n.summary.trim() || n.blockers.trim() || n.tomorrow.trim() || n.updates.some((u) => u.text.trim())
  );

  if (!withContent.length) {
    return "Weekly Report\n\nNo notes available for this week yet.";
  }

  const project = withContent[0]?.project || "Project";
  const range = getWeekRange(withContent[0].date);

  const workDone = [];
  const planned = [];

  withContent.forEach((note) => {
    note.updates
      .filter((u) => u.text.trim())
      .forEach((u) => workDone.push(`- ${u.text.trim()} (${note.date})`));

    if (note.tomorrow.trim()) {
      planned.push(`- ${note.tomorrow.trim()} (${note.date})`);
    }
  });

  return [
    `Weekly Report`,
    `Project: ${project}`,
    `Week: ${range}`,
    "",
    `Work Done / Current Status:`,
    ...(workDone.length ? workDone : ["- No completed updates added"]),
    "",
    `Work Planned for Next Week:`,
    ...(planned.length ? planned : ["- No next-step items added"]),
  ].join("\n");
}

export default function DailyNoteApplication() {
  const { user, signOut } = useAuth();
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const saveTimerRef = useRef(null);

  // Load notes from Supabase on mount
  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    setLoadingNotes(true);
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (error) {
      console.error("Error loading notes:", error);
      setLoadingNotes(false);
      return;
    }

    if (data && data.length > 0) {
      setNotes(data);
      setSelectedId(data[0].id);
    } else {
      // Create initial note for new users
      const initial = createEmptyNote(user.id);
      initial.whatsapp_message = buildWhatsappMessage(initial);
      const { data: inserted, error: insertError } = await supabase
        .from("notes")
        .insert(initial)
        .select()
        .single();

      if (!insertError && inserted) {
        setNotes([inserted]);
        setSelectedId(inserted.id);
      }
    }
    setLoadingNotes(false);
  };

  // Debounced save to Supabase
  const saveNote = useCallback(async (noteToSave) => {
    setSaving(true);
    const { id, user_id, ...rest } = noteToSave;
    const { error } = await supabase
      .from("notes")
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) console.error("Save error:", error);
    setSaving(false);
  }, [user.id]);

  const debouncedSave = useCallback((noteToSave) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveNote(noteToSave), 600);
  }, [saveNote]);

  useEffect(() => {
    if (!notes.length) return;
    if (!selectedId || !notes.find((n) => n.id === selectedId)) {
      setSelectedId(notes[0].id);
    }
  }, [notes, selectedId]);

  const filtered = useMemo(() => {
    return notes.filter((n) => {
      const haystack = `${n.date} ${n.project} ${n.summary} ${n.blockers} ${n.tomorrow} ${n.updates.map((u) => u.text).join(" ")}`.toLowerCase();
      return haystack.includes(query.toLowerCase());
    });
  }, [notes, query]);

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

  const addNewNote = async () => {
    const note = createEmptyNote(user.id);
    note.whatsapp_message = buildWhatsappMessage(note);

    const { data: inserted, error } = await supabase
      .from("notes")
      .insert(note)
      .select()
      .single();

    if (error) {
      console.error("Error creating note:", error);
      return;
    }

    setNotes((prev) => [inserted, ...prev]);
    setSelectedId(inserted.id);
    setSidebarOpen(false);
  };

  const deleteSelected = async () => {
    if (!selected) return;

    const { error } = await supabase
      .from("notes")
      .delete()
      .eq("id", selected.id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting note:", error);
      return;
    }

    const remaining = notes.filter((n) => n.id !== selected.id);
    if (remaining.length) {
      setNotes(remaining);
      setSelectedId(remaining[0].id);
    } else {
      // Create a fresh note if all deleted
      const fresh = createEmptyNote(user.id);
      fresh.whatsapp_message = buildWhatsappMessage(fresh);
      const { data: inserted } = await supabase.from("notes").insert(fresh).select().single();
      if (inserted) {
        setNotes([inserted]);
        setSelectedId(inserted.id);
      }
    }
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
  };

  const weeklyPreview = useMemo(() => {
    if (!selected) return "";
    const week = getWeekRange(selected.date);
    const weekNotes = notes.filter((n) => getWeekRange(n.date) === week);
    return buildWeeklyReport(weekNotes);
  }, [notes, selected]);

  const completedCount = selected?.updates.filter((u) => u.done).length || 0;

  if (loadingNotes) {
    return (
      <div className="min-h-screen bg-[#f7f6f3] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
            D<span className="text-slate-400">.</span>Ops
          </h1>
          <p className="text-sm text-slate-500 mb-4">Loading your notes...</p>
          <div className="animate-spin h-6 w-6 border-2 border-slate-900 border-t-transparent rounded-full mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f6f3] text-slate-900">
      <div className="mx-auto max-w-7xl px-3 py-3 md:px-6 md:py-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur md:p-5"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <Button variant="outline" size="icon" className="rounded-2xl md:hidden" onClick={() => setSidebarOpen((v) => !v)}>
                <Menu className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                  D<span className="text-slate-400">.</span>Ops
                </h1>
                <p className="mt-1 text-sm text-slate-600">Daily tracking, WhatsApp updates, and weekly report export.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {saving && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <div className="animate-spin h-3 w-3 border border-slate-400 border-t-transparent rounded-full" />
                  Saving...
                </span>
              )}
              <span className="text-xs text-slate-400 hidden md:block">{user?.email}</span>
              <Button onClick={addNewNote} className="rounded-2xl">
                <Plus className="mr-2 h-4 w-4" /> New Note
              </Button>
              <Button variant="outline" onClick={exportWeekly} className="rounded-2xl">
                <Download className="mr-2 h-4 w-4" /> Export Weekly
              </Button>
              <Button variant="outline" size="icon" className="rounded-2xl" onClick={signOut} title="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <aside className={`${sidebarOpen ? "block" : "hidden"} lg:block`}>
            <Card className="rounded-[28px] border-slate-200 bg-white shadow-sm">
              <CardHeader className="space-y-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ClipboardList className="h-5 w-5" /> Notes
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes" className="rounded-2xl border-slate-200 pl-9" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {filtered.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => {
                      setSelectedId(note.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full rounded-2xl border p-3 text-left transition ${selected?.id === note.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-[#fcfcfb] hover:bg-slate-50"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{note.project}</p>
                        <p className={`text-xs ${selected?.id === note.id ? "text-slate-300" : "text-slate-500"}`}>{note.date}</p>
                      </div>
                      <Badge variant={selected?.id === note.id ? "secondary" : "outline"}>{note.updates.filter((u) => u.text.trim()).length}</Badge>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </aside>

          {selected && (
            <div className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
                <Card className="rounded-[28px] border-slate-200 bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Daily Entry</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Date</label>
                        <Input type="date" value={selected.date} onChange={(e) => updateSelected({ date: e.target.value })} className="rounded-2xl" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Project</label>
                        <Input value={selected.project} onChange={(e) => updateSelected({ project: e.target.value })} className="rounded-2xl" />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Summary</label>
                      <Textarea value={selected.summary} onChange={(e) => updateSelected({ summary: e.target.value })} className="min-h-[88px] rounded-2xl" placeholder="Write a short summary of today's work" />
                    </div>

                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-700">Work Updates</label>
                        <Button variant="outline" onClick={addUpdateRow} className="rounded-2xl">
                          <Plus className="mr-2 h-4 w-4" /> Add
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {selected.updates.map((item) => (
                          <div key={item.id} className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-[#fcfcfb] p-3">
                            <Checkbox checked={item.done} onCheckedChange={(checked) => changeUpdate(item.id, { done: !!checked })} />
                            <Input value={item.text} onChange={(e) => changeUpdate(item.id, { text: e.target.value })} className="rounded-2xl" placeholder="Completed API integration for project setup" />
                            <Button variant="ghost" size="icon" onClick={() => removeUpdate(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Blockers</label>
                        <Textarea value={selected.blockers} onChange={(e) => updateSelected({ blockers: e.target.value })} className="min-h-[96px] rounded-2xl" placeholder="Mention blockers or pending approvals" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Plan for Tomorrow</label>
                        <Textarea value={selected.tomorrow} onChange={(e) => updateSelected({ tomorrow: e.target.value })} className="min-h-[96px] rounded-2xl" placeholder="What is planned next?" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <Card className="rounded-[28px] border-slate-200 bg-white shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <CalendarDays className="h-5 w-5" /> Today Snapshot
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="rounded-2xl bg-[#f7f6f3] p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Date</p>
                        <p className="mt-1 font-medium">{selected.date}</p>
                      </div>
                      <div className="rounded-2xl bg-[#f7f6f3] p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Completed</p>
                        <p className="mt-1 text-2xl font-semibold">{completedCount}</p>
                      </div>
                      <div className="rounded-2xl bg-[#f7f6f3] p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Project</p>
                        <p className="mt-1 font-medium">{selected.project}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-[28px] border-slate-200 bg-white shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Filter className="h-5 w-5" /> Quick Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-slate-600">
                      <Button variant="outline" className="w-full justify-start rounded-2xl" onClick={() => copyText(selected.whatsapp_message || buildWhatsappMessage(selected))}>
                        <MessageSquareText className="mr-2 h-4 w-4" /> Copy WhatsApp Update
                      </Button>
                      <Button variant="outline" className="w-full justify-start rounded-2xl" onClick={() => copyText(weeklyPreview)}>
                        <FileText className="mr-2 h-4 w-4" /> Copy Weekly Report
                      </Button>
                      <Button variant="outline" className="w-full justify-start rounded-2xl" onClick={deleteSelected}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Current Note
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Tabs defaultValue="whatsapp" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-white">
                  <TabsTrigger value="whatsapp">WhatsApp Update</TabsTrigger>
                  <TabsTrigger value="weekly">Weekly Report</TabsTrigger>
                </TabsList>

                <TabsContent value="whatsapp">
                  <Card className="rounded-[28px] border-slate-200 bg-white shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <MessageSquareText className="h-5 w-5" /> WhatsApp Update Generator
                      </CardTitle>
                    </CardHeader>
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
                  <Card className="rounded-[28px] border-slate-200 bg-white shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <FileText className="h-5 w-5" /> Weekly Report Export
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-2xl bg-[#f7f6f3] p-4 text-sm text-slate-600">
                        Week Range: <span className="font-medium text-slate-900">{getWeekRange(selected.date)}</span>
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

        <Separator className="my-6" />
        <p className="pb-4 text-center text-xs text-slate-500">D.Ops — Daily project tracking, WhatsApp updates, and weekly reporting.</p>
      </div>
    </div>
  );
}
