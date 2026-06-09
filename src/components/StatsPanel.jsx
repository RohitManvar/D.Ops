import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText, Calendar, CheckSquare, TrendingUp, Tag, BarChart
} from "lucide-react";

const todayISO = () => new Date().toISOString().slice(0, 10);

function StatCard({ icon: Icon, label, value, color = "text-slate-700 dark:text-slate-200" }) {
  return (
    <div className="rounded-2xl bg-slate-50 dark:bg-slate-700/60 p-4 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

export default function StatsPanel({ notes }) {
  const stats = useMemo(() => {
    const today = todayISO();

    // Active days = days with at least one filled note
    const activeDates = new Set(
      notes
        .filter((n) => n.summary?.trim() || n.updates.some((u) => u.text.trim()) || n.blockers?.trim())
        .map((n) => n.date)
    );

    // Tasks
    let totalDone = 0, totalTasks = 0;
    notes.forEach((n) => {
      n.updates.forEach((u) => {
        if (u.text.trim()) {
          totalTasks++;
          if (u.done) totalDone++;
        }
      });
    });

    // Completion rate
    const completionRate = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

    // Most used tag
    const tagCount = {};
    notes.forEach((n) => (n.tags || []).forEach((t) => { tagCount[t] = (tagCount[t] || 0) + 1; }));
    const topTag = Object.entries(tagCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

    // Avg tasks per active day
    const avgTasks = activeDates.size > 0 ? (totalTasks / activeDates.size).toFixed(1) : "0";

    // This month notes
    const thisMonth = today.slice(0, 7);
    const thisMonthNotes = notes.filter((n) => n.date.startsWith(thisMonth)).length;

    return { totalNotes: notes.length, activeDays: activeDates.size, totalDone, totalTasks, completionRate, topTag, avgTasks, thisMonthNotes };
  }, [notes]);

  return (
    <Card className="rounded-[28px] border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm print:hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart className="h-5 w-5" /> Your Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={FileText} label="Total Notes" value={stats.totalNotes} />
          <StatCard icon={Calendar} label="Active Days" value={stats.activeDays} />
          <StatCard icon={CheckSquare} label="Tasks Done" value={stats.totalDone} color="text-emerald-600 dark:text-emerald-400" />
          <StatCard icon={TrendingUp} label="Completion %" value={`${stats.completionRate}%`} color={stats.completionRate >= 70 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"} />
          <StatCard icon={FileText} label="This Month" value={stats.thisMonthNotes} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-700/60 p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium uppercase tracking-wide">Avg tasks/day</span>
            </div>
            <p className="text-2xl font-semibold text-slate-700 dark:text-slate-200">{stats.avgTasks}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-700/60 p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
              <Tag className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium uppercase tracking-wide">Top tag</span>
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate mt-1">{stats.topTag}</p>
          </div>
        </div>

        {/* Completion bar */}
        {stats.totalTasks > 0 && (
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-700/60 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{stats.totalDone} of {stats.totalTasks} tasks completed</span>
              <span className="font-medium">{stats.completionRate}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-400 dark:bg-emerald-500 transition-all duration-500"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
