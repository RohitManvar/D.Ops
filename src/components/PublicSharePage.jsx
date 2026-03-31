import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { CheckSquare, Square, Calendar, AlertCircle, ArrowRight } from "lucide-react";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Su","Mo","Tu","We","Th","Fr","Sa"];

const TAG_COLORS = {
  Development: "bg-blue-100 text-blue-700",
  Meeting: "bg-purple-100 text-purple-700",
  Design: "bg-pink-100 text-pink-700",
  "Bug Fix": "bg-red-100 text-red-700",
  Review: "bg-amber-100 text-amber-700",
  Planning: "bg-green-100 text-green-700",
  Research: "bg-cyan-100 text-cyan-700",
  Deployment: "bg-orange-100 text-orange-700",
};

function TagPill({ tag }) {
  const cls = TAG_COLORS[tag] || "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {tag}
    </span>
  );
}

function NoteCard({ note, highlight }) {
  const doneTasks = note.updates?.filter(u => u.done && u.text.trim()) || [];
  const pendingTasks = note.updates?.filter(u => !u.done && u.text.trim()) || [];
  const allTasks = note.updates?.filter(u => u.text.trim()) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-5 space-y-4 ${
        highlight
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-xs font-medium uppercase tracking-wide ${highlight ? "text-slate-400" : "text-slate-400"}`}>
            {new Date(note.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
          <p className={`font-semibold text-base mt-0.5 ${highlight ? "text-white" : "text-slate-800"}`}>
            {note.project}
          </p>
        </div>
        {allTasks.length > 0 && (
          <div className={`rounded-full px-2.5 py-1 text-xs font-medium shrink-0 ${
            highlight ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600"
          }`}>
            {doneTasks.length}/{allTasks.length} done
          </div>
        )}
      </div>

      {/* Tags */}
      {(note.tags || []).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {note.tags.map(t => <TagPill key={t} tag={t} />)}
        </div>
      )}

      {/* Summary */}
      {note.summary?.trim() && (
        <p className={`text-sm leading-relaxed ${highlight ? "text-slate-300" : "text-slate-600"}`}>
          {note.summary}
        </p>
      )}

      {/* Tasks */}
      {allTasks.length > 0 && (
        <div className="space-y-1.5">
          <p className={`text-xs font-semibold uppercase tracking-wide ${highlight ? "text-slate-400" : "text-slate-400"}`}>
            Work Done
          </p>
          {allTasks.map(u => (
            <div key={u.id} className="flex items-start gap-2">
              {u.done
                ? <CheckSquare className={`h-4 w-4 mt-0.5 shrink-0 ${highlight ? "text-emerald-400" : "text-emerald-500"}`} />
                : <Square className={`h-4 w-4 mt-0.5 shrink-0 ${highlight ? "text-slate-500" : "text-slate-300"}`} />
              }
              <span className={`text-sm ${u.done ? "" : "opacity-60"} ${highlight ? "text-slate-200" : "text-slate-700"}`}>
                {u.text}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Blockers */}
      {note.blockers?.trim() && (
        <div className={`rounded-xl p-3 ${highlight ? "bg-red-900/30" : "bg-red-50"}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${highlight ? "text-red-400" : "text-red-500"}`}>
            Blockers
          </p>
          <p className={`text-sm ${highlight ? "text-red-300" : "text-red-700"}`}>{note.blockers}</p>
        </div>
      )}

      {/* Tomorrow */}
      {note.tomorrow?.trim() && (
        <div className={`flex items-start gap-2 ${highlight ? "text-slate-300" : "text-slate-500"}`}>
          <ArrowRight className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-0.5">Plan for Tomorrow</p>
            <p className="text-sm">{note.tomorrow}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function MonthCalendar({ notes, selectedDate, onSelectDate }) {
  const [calMonth, setCalMonth] = useState(() => (selectedDate || new Date().toISOString()).slice(0, 7));
  const year = parseInt(calMonth.slice(0, 4));
  const month = parseInt(calMonth.slice(5, 7)) - 1;

  const notesByDate = useMemo(() => {
    const map = {};
    notes.forEach(n => { map[n.date] = n; });
    return map;
  }, [notes]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${calMonth}-${String(d).padStart(2, "0")}`);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => { const d = new Date(year, month - 1, 1); setCalMonth(d.toISOString().slice(0, 7)); }}
          className="rounded-xl px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 transition"
        >←</button>
        <span className="font-semibold text-slate-800">{MONTH_NAMES[month]} {year}</span>
        <button
          onClick={() => { const d = new Date(year, month + 1, 1); setCalMonth(d.toISOString().slice(0, 7)); }}
          className="rounded-xl px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 transition"
        >→</button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 text-center">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-[11px] font-medium text-slate-400 py-1">{d}</div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={`e-${i}`} />;
          const note = notesByDate[dateStr];
          const hasContent = note && (note.summary?.trim() || note.updates?.some(u => u.text.trim()) || note.blockers?.trim());
          const isSelected = dateStr === selectedDate;
          const day = parseInt(dateStr.slice(8));
          return (
            <button
              key={dateStr}
              onClick={() => note && onSelectDate(dateStr)}
              disabled={!note}
              className={`relative flex flex-col items-center py-1.5 rounded-xl text-sm transition ${
                isSelected
                  ? "bg-slate-900 text-white font-semibold"
                  : note
                  ? "hover:bg-slate-100 text-slate-700 cursor-pointer"
                  : "text-slate-300 cursor-default"
              }`}
            >
              <span>{day}</span>
              {hasContent && (
                <span className={`h-1 w-1 rounded-full mt-0.5 ${isSelected ? "bg-white" : "bg-emerald-400"}`} />
              )}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400 text-center">Click a highlighted date to view that day's work</p>
    </div>
  );
}

export default function PublicSharePage() {
  const { token } = useParams();
  const [shareData, setShareData] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    const load = async () => {
      // Load the share link record
      const { data: link, error: linkErr } = await supabase
        .from("shared_links")
        .select("*")
        .eq("token", token)
        .single();

      if (linkErr || !link) {
        setError("This link is invalid or has been deleted.");
        setLoading(false);
        return;
      }

      // Load notes in the date range for that user
      const { data: noteData, error: noteErr } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", link.user_id)
        .gte("date", link.date_range_start)
        .lte("date", link.date_range_end)
        .order("date", { ascending: false });

      if (noteErr) {
        setError("Failed to load notes.");
        setLoading(false);
        return;
      }

      setShareData(link);
      setNotes((noteData || []).map(n => ({ ...n, tags: n.tags ?? [], updates: n.updates ?? [] })));

      // Default selected date = most recent note with content
      const withContent = (noteData || []).find(
        n => n.summary?.trim() || n.updates?.some(u => u.text.trim()) || n.blockers?.trim()
      );
      if (withContent) setSelectedDate(withContent.date);
      else if (noteData?.length) setSelectedDate(noteData[0].date);

      setLoading(false);
    };
    load();
  }, [token]);

  const selectedNote = notes.find(n => n.date === selectedDate);
  const notesWithContent = notes.filter(
    n => n.summary?.trim() || n.updates?.some(u => u.text.trim()) || n.blockers?.trim()
  );

  const totalDone = notes.reduce((acc, n) => acc + (n.updates || []).filter(u => u.done && u.text.trim()).length, 0);
  const totalTasks = notes.reduce((acc, n) => acc + (n.updates || []).filter(u => u.text.trim()).length, 0);
  const completionRate = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f6f3] flex items-center justify-center">
        <div className="text-center">
          <img src="/Do logo.png" alt="D.Ops" className="h-14 w-14 rounded-2xl mx-auto mb-4 object-cover" />
          <div className="animate-spin h-6 w-6 border-2 border-slate-900 border-t-transparent rounded-full mx-auto" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f7f6f3] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-800 mb-2">Link not found</h1>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const isMonth = shareData.share_type === "month";
  const isWeek = shareData.share_type === "week";
  const isNote = shareData.share_type === "note";

  return (
    <div className="min-h-screen bg-[#f7f6f3]">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <img src="/Do logo.png" alt="D.Ops" className="h-8 w-8 rounded-xl object-cover" />
        <div>
          <span className="font-semibold text-slate-800">D.Ops</span>
          <span className="ml-2 text-xs text-slate-400">Shared Work Summary</span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          {shareData.custom_message && (
            <div className="rounded-2xl bg-white border border-slate-200 px-5 py-4">
              <p className="text-sm text-slate-600 italic">"{shareData.custom_message}"</p>
            </div>
          )}
          <div className="rounded-2xl bg-slate-900 text-white px-5 py-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
              {isMonth ? "Monthly Report" : isWeek ? "Weekly Report" : "Daily Report"}
            </p>
            <h1 className="text-xl font-bold">
              {isMonth
                ? (() => { const [y, m] = shareData.date_range_start.split("-"); return `${MONTH_NAMES[parseInt(m)-1]} ${y}`; })()
                : isWeek
                ? `${shareData.date_range_start} → ${shareData.date_range_end}`
                : new Date(shareData.date_range_start + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
              }
            </h1>
            <p className="text-slate-400 text-sm mt-1">{notes[0]?.project || "Work Summary"}</p>
          </div>
        </motion.div>

        {/* Stats bar */}
        {totalTasks > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
            className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-slate-800">{notesWithContent.length}</p>
              <p className="text-xs text-slate-400 mt-1">Active Days</p>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{totalDone}</p>
              <p className="text-xs text-slate-400 mt-1">Tasks Done</p>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-slate-800">{completionRate}%</p>
              <p className="text-xs text-slate-400 mt-1">Completion</p>
            </div>
          </motion.div>
        )}

        {/* Month view — calendar + selected note */}
        {isMonth && (
          <div className="space-y-6">
            <MonthCalendar notes={notes} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            {selectedNote && <NoteCard note={selectedNote} highlight={false} />}
          </div>
        )}

        {/* Week / single note — list all */}
        {(isWeek || isNote) && (
          <div className="space-y-4">
            {notesWithContent.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-sm">No content found for this period.</div>
            )}
            {notesWithContent.map((note, i) => (
              <NoteCard key={note.id} note={note} highlight={i === 0} />
            ))}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 pb-4">
          Shared via D.Ops · Read-only view
        </p>
      </div>
    </div>
  );
}
