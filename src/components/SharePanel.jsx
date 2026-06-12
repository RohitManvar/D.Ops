import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthProvider";
import {
  X, Share2, Link, Calendar, FileText, Check,
  Globe, Lock, Trash2, Copy, ChevronDown, UserCheck
} from "lucide-react";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function todayISO() { return new Date().toISOString().slice(0, 10); }

function generateToken() {
  const arr = new Uint8Array(18);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, "0")).join("");
}

export default function SharePanel({ open, onClose, notes }) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [shareType, setShareType] = useState("month"); // "note" | "week" | "month"
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [customMessage, setCustomMessage] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [existingLinks, setExistingLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [showExisting, setShowExisting] = useState(false);

  const [reviewers, setReviewers] = useState([]);
  const [selectedReviewer, setSelectedReviewer] = useState("");
  const [sharingDirectly, setSharingDirectly] = useState(false);

  // New state for module selection
  const [targetModule, setTargetModule] = useState("daily_notes"); // "daily_notes" | "product_backlog" | "sprint_plan" | "project_gantt"
  const [sprints, setSprints] = useState([]);
  const [selectedSprint, setSelectedSprint] = useState("");
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");

  // Fetch reviewers and sprints
  useMemo(() => {
    if (open && user) {
      // Reviewers
      supabase.from('profiles').select('*').eq('role', 'reviewer').then(({ data }) => {
        if (data && data.length > 0) {
          setReviewers(data);
          setSelectedReviewer(data[0].id);
        }
      });
      // Sprints
      supabase.from('sprints').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => {
        if (data && data.length > 0) {
          setSprints(data);
          setSelectedSprint(data[0].id);
        }
      });
      // Gantt Projects
      supabase.from('gantt_projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => {
        if (data && data.length > 0) {
          setProjects(data);
          setSelectedProject(data[0].id);
        }
      });
    }
  }, [open, user]);

  // Derive month/week options from notes
  const months = useMemo(() => {
    const set = new Set(notes.map(n => n.date.slice(0, 7)));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [notes]);

  const selectedMonth = selectedDate.slice(0, 7);

  const previewNotes = useMemo(() => {
    if (shareType === "note") return notes.filter(n => n.date === selectedDate);
    if (shareType === "week") {
      const d = new Date(selectedDate);
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const mon = new Date(d); mon.setDate(d.getDate() + diff);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      const monStr = mon.toISOString().slice(0, 10);
      const sunStr = sun.toISOString().slice(0, 10);
      return notes.filter(n => n.date >= monStr && n.date <= sunStr);
    }
    if (shareType === "month") return notes.filter(n => n.date.startsWith(selectedMonth));
    return [];
  }, [shareType, selectedDate, selectedMonth, notes]);

  const handleGenerate = async () => {
    setGenerating(true);
    const token = generateToken();
    const today = todayISO();

    let dateRangeStart = selectedDate;
    let dateRangeEnd = selectedDate;

    if (shareType === "week") {
      const d = new Date(selectedDate);
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const mon = new Date(d); mon.setDate(d.getDate() + diff);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      dateRangeStart = mon.toISOString().slice(0, 10);
      dateRangeEnd = sun.toISOString().slice(0, 10);
    } else if (shareType === "month") {
      const [y, m] = selectedMonth.split("-").map(Number);
      dateRangeStart = `${selectedMonth}-01`;
      dateRangeEnd = new Date(y, m, 0).toISOString().slice(0, 10);
    }

    const payload = {
      token,
      user_id: user.id,
      share_type: shareType,
      date_range_start: dateRangeStart,
      date_range_end: dateRangeEnd,
      custom_message: customMessage.trim() || null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("shared_links").insert(payload).select().single();
    if (error) {
      console.error("Share link error:", error);
      addToast(error.message || "Failed to create share link", "error");
      setGenerating(false);
      return;
    }

    const link = `${window.location.origin}/share/${token}`;
    setGeneratedLink({ ...data, url: link });
    setGenerating(false);
    addToast("Share link created!", "success");
  };

  const handleDirectShare = async () => {
    if (!selectedReviewer) return;
    setSharingDirectly(true);

    let targetType = targetModule;
    let targetId = null;

    if (targetModule === "daily_notes") {
      const targetNote = previewNotes[0];
      if (!targetNote) {
        addToast("No note to share", "error");
        setSharingDirectly(false);
        return;
      }
      targetType = "daily_update";
      targetId = targetNote.id;
    } else if (targetModule === "product_backlog") {
      targetId = user.id; // use user's ID as the target ID for their backlog
    } else if (targetModule === "sprint_plan") {
      if (!selectedSprint) {
        addToast("No sprint selected", "error");
        setSharingDirectly(false);
        return;
      }
      targetId = selectedSprint;
    } else if (targetModule === "project_gantt") {
      if (!selectedProject) {
        addToast("No project selected", "error");
        setSharingDirectly(false);
        return;
      }
      targetId = selectedProject;
    }

    const { error } = await supabase.from('approvals').insert({
      target_type: targetType,
      target_id: targetId,
      requester_id: user.id,
      reviewer_id: selectedReviewer,
      feedback: customMessage.trim() || null
    });

    setSharingDirectly(false);
    if (error) {
      addToast(error.message, "error");
    } else {
      addToast(`Shared ${targetModule.replace('_', ' ')} directly with Reviewer!`, "success");
      onClose();
    }
  };

  const copyLink = (url) => {
    navigator.clipboard.writeText(url);
    addToast("Link copied!", "copied");
  };

  const loadExisting = async () => {
    setLoadingLinks(true);
    const { data } = await supabase
      .from("shared_links")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    setExistingLinks(data || []);
    setLoadingLinks(false);
    setShowExisting(true);
  };

  const deleteLink = async (id) => {
    await supabase.from("shared_links").delete().eq("id", id);
    setExistingLinks(prev => prev.filter(l => l.id !== id));
    addToast("Link deleted", "deleted");
  };

  const shareTypeOptions = [
    { value: "note", label: "Single Day", icon: FileText, desc: "Share one day's note" },
    { value: "week", label: "Week", icon: Calendar, desc: "Share a full week" },
    { value: "month", label: "Month", icon: Globe, desc: "Share an entire month with calendar" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-[500px] bg-white dark:bg-slate-800 shadow-2xl overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur border-b border-slate-100 dark:border-slate-700">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Share2 className="h-5 w-5" /> Share with Manager
              </h2>
              <button onClick={onClose} className="rounded-xl p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-6 space-y-6">
              
              {/* Module selection */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 block">Module to Share</label>
                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-xl overflow-x-auto hide-scrollbar">
                  {['daily_notes', 'product_backlog', 'sprint_plan', 'project_gantt'].map(mod => (
                    <button
                      key={mod}
                      onClick={() => setTargetModule(mod)}
                      className={`flex-1 min-w-[100px] text-xs font-medium py-2 px-3 rounded-lg transition-colors whitespace-nowrap ${
                        targetModule === mod 
                          ? 'bg-white dark:bg-slate-800 shadow text-blue-600 dark:text-blue-400'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      {mod === 'daily_notes' ? 'Daily Notes' : mod === 'product_backlog' ? 'Product Backlog' : mod === 'sprint_plan' ? 'Sprint Planning' : 'Project Gantt'}
                    </button>
                  ))}
                </div>
              </div>

              {targetModule === "daily_notes" && (
                <>
                  {/* Share type */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 block">Date Range</label>
                    <div className="grid grid-cols-3 gap-2">
                      {shareTypeOptions.map(({ value, label, icon: Icon, desc }) => (
                        <button
                          key={value}
                          onClick={() => setShareType(value)}
                          className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition ${
                            shareType === value
                              ? "border-slate-900 dark:border-slate-300 bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900"
                              : "border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="text-xs font-medium">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date selector */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                      {shareType === "month" ? "Select month" : shareType === "week" ? "Select a date in that week" : "Select date"}
                    </label>
                    {shareType === "month" ? (
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedDate(e.target.value + "-01")}
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-300"
                      >
                        {months.map(m => {
                          const [y, mo] = m.split("-");
                          return <option key={m} value={m}>{MONTH_NAMES[parseInt(mo) - 1]} {y}</option>;
                        })}
                      </select>
                    ) : (
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-300"
                      />
                    )}
                  </div>

                  {/* Preview count */}
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-700/50 px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Notes included</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{previewNotes.length}</span>
                  </div>
                </>
              )}

              {targetModule === "product_backlog" && (
                <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    You are sharing your entire Product Backlog for review.
                  </p>
                </div>
              )}

              {targetModule === "sprint_plan" && (
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Select Sprint</label>
                  {sprints.length === 0 ? (
                    <p className="text-sm text-slate-500">No sprints available.</p>
                  ) : (
                    <select
                      value={selectedSprint}
                      onChange={(e) => setSelectedSprint(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-300"
                    >
                      {sprints.map(s => (
                        <option key={s.id} value={s.id}>{s.goal} ({s.start_date})</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {targetModule === "project_gantt" && (
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Select Project Gantt Chart</label>
                  {projects.length === 0 ? (
                    <p className="text-sm text-slate-500">No projects available.</p>
                  ) : (
                    <select
                      value={selectedProject}
                      onChange={(e) => setSelectedProject(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-300"
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Custom message */}
              <div>
                <button
                  onClick={() => setShowCustom(v => !v)}
                  className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${showCustom ? "rotate-180" : ""}`} />
                  Add a message for your manager (optional)
                </button>
                <AnimatePresence>
                  {showCustom && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <textarea
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        placeholder="E.g. Hi, here's my work summary for this month..."
                        rows={3}
                        className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-300"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Generate public link button (Only for Daily Notes) */}
              <div className="space-y-3">
                {targetModule === "daily_notes" && (
                  <Button
                    onClick={handleGenerate}
                    disabled={generating || previewNotes.length === 0}
                    className="w-full rounded-2xl h-11"
                    variant="outline"
                  >
                    {generating ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin h-4 w-4 border-2 border-slate-500 border-t-transparent rounded-full" />
                        Generating link...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Link className="h-4 w-4" /> Generate Public Link
                      </span>
                    )}
                  </Button>
                )}

                {/* Direct Share Section */}
                <div className={targetModule === "daily_notes" ? "pt-2" : ""}>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                    Or Share Directly with Reviewer
                  </label>
                  <div className="flex flex-col gap-2">
                    <select
                      value={selectedReviewer}
                      onChange={(e) => setSelectedReviewer(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-300"
                    >
                      {reviewers.length === 0 && <option value="">No reviewers found</option>}
                      {reviewers.map(r => (
                        <option key={r.id} value={r.id}>{r.email}</option>
                      ))}
                    </select>
                    
                    <Button
                      onClick={handleDirectShare}
                      disabled={
                        sharingDirectly || 
                        !selectedReviewer ||
                        (targetModule === 'daily_notes' && previewNotes.length === 0) ||
                        (targetModule === 'sprint_plan' && !selectedSprint) ||
                        (targetModule === 'project_gantt' && !selectedProject)
                      }
                      className="w-full rounded-2xl h-11 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {sharingDirectly ? "Sharing..." : (
                        <span className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4" /> Share with Reviewer
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {previewNotes.length === 0 && (
                <p className="text-xs text-center text-slate-400">No notes found for the selected period.</p>
              )}

              {/* Generated link result */}
              <AnimatePresence>
                {generatedLink && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 space-y-3"
                  >
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                      <Check className="h-4 w-4" />
                      <span className="text-sm font-medium">Link ready!</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2">
                      <span className="text-xs text-slate-500 truncate flex-1">{generatedLink.url}</span>
                      <button
                        onClick={() => copyLink(generatedLink.url)}
                        className="shrink-0 rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                      >
                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                      </button>
                    </div>
                    <Button
                      onClick={() => copyLink(generatedLink.url)}
                      className="w-full rounded-xl h-9 text-sm"
                    >
                      <Copy className="mr-2 h-3.5 w-3.5" /> Copy Link
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              <Separator />

              {/* Existing links */}
              {!showExisting ? (
                <button
                  onClick={loadExisting}
                  className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition flex items-center gap-1.5"
                >
                  <Lock className="h-3.5 w-3.5" /> View previously shared links
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Previously shared</p>
                  {loadingLinks && <p className="text-xs text-slate-400">Loading...</p>}
                  {!loadingLinks && existingLinks.length === 0 && (
                    <p className="text-xs text-slate-400">No links yet.</p>
                  )}
                  {existingLinks.map(link => (
                    <div key={link.id} className="rounded-2xl border border-slate-200 dark:border-slate-600 p-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 capitalize">
                          {link.share_type} · {link.date_range_start}
                          {link.date_range_start !== link.date_range_end ? ` → ${link.date_range_end}` : ""}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {window.location.origin}/share/{link.token}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => copyLink(`${window.location.origin}/share/${link.token}`)}
                          className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                        >
                          <Copy className="h-3.5 w-3.5 text-slate-400" />
                        </button>
                        <button
                          onClick={() => deleteLink(link.id)}
                          className="rounded-lg p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
