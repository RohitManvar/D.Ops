import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthProvider";
import { useToast } from "@/components/ui/toast";
import {
  X, User, Mail, Calendar, CheckSquare, FileText, Tag,
  TrendingUp, Lock, LogOut, Edit2, Check,
} from "lucide-react";

const todayISO = () => new Date().toISOString().slice(0, 10);

const AVATAR_COLORS = [
  "bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-green-500",
  "bg-amber-500", "bg-red-500", "bg-cyan-500", "bg-orange-500",
];

function avatarColor(str = "") {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name, email) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return (email?.[0] || "?").toUpperCase();
}

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

export default function ProfilePanel({ open, onClose, notes }) {
  const { user, signOut, updateProfile, updatePassword } = useAuth();
  const { addToast } = useToast();

  const displayName = user?.user_metadata?.full_name || "";
  const email = user?.email || "";
  const joinedDate = user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—";

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(displayName);
  const [savingName, setSavingName] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // ── Stats ──────────────────────────────────────────────────────────────────
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

  const handleSaveName = async () => {
    setSavingName(true);
    const { error } = await updateProfile({ full_name: nameInput.trim() });
    setSavingName(false);
    if (error) { addToast("Failed to update name", "error"); return; }
    setEditingName(false);
    addToast("Display name updated", "success");
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { addToast("Passwords don't match", "error"); return; }
    if (newPassword.length < 6) { addToast("Password must be at least 6 characters", "error"); return; }
    setSavingPassword(true);
    const { error } = await updatePassword(newPassword);
    setSavingPassword(false);
    if (error) { addToast(error.message || "Failed to update password", "error"); return; }
    addToast("Password updated successfully", "success");
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    setShowPasswordForm(false);
  };

  const initials = getInitials(displayName, email);
  const bgColor = avatarColor(email);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-sm bg-white dark:bg-slate-800 shadow-2xl overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur border-b border-slate-100 dark:border-slate-700">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <User className="h-5 w-5" /> Profile
              </h2>
              <button onClick={onClose} className="rounded-xl p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-6 space-y-6">
              {/* Avatar + Name */}
              <div className="flex flex-col items-center gap-3 text-center">
                <div className={`h-20 w-20 rounded-full ${bgColor} flex items-center justify-center text-white text-2xl font-bold shadow-lg select-none`}>
                  {initials}
                </div>

                {editingName ? (
                  <div className="flex items-center gap-2 w-full max-w-[220px]">
                    <Input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") { setEditingName(false); setNameInput(displayName); } }}
                      className="rounded-2xl text-center text-sm"
                      placeholder="Your name"
                      autoFocus
                    />
                    <Button size="icon" className="rounded-xl h-9 w-9 shrink-0" onClick={handleSaveName} disabled={savingName}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline" className="rounded-xl h-9 w-9 shrink-0" onClick={() => { setEditingName(false); setNameInput(displayName); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-lg">{displayName || "Set your name"}</p>
                    <button onClick={() => { setEditingName(true); setNameInput(displayName); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{email}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                  <Calendar className="h-3 w-3" />
                  <span>Joined {joinedDate}</span>
                </div>
              </div>

              <Separator />

              {/* Stats */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Your Stats</h3>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard icon={FileText} label="Total Notes" value={stats.totalNotes} />
                  <StatCard icon={Calendar} label="Active Days" value={stats.activeDays} />
                  <StatCard icon={CheckSquare} label="Tasks Done" value={stats.totalDone} color="text-emerald-600 dark:text-emerald-400" />
                  <StatCard icon={TrendingUp} label="Completion %" value={`${stats.completionRate}%`} color={stats.completionRate >= 70 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"} />
                  <StatCard icon={FileText} label="This Month" value={stats.thisMonthNotes} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
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
                  <div className="mt-3 rounded-2xl bg-slate-50 dark:bg-slate-700/60 p-4 space-y-2">
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
              </div>

              <Separator />

              {/* Security */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Security</h3>

                {!showPasswordForm ? (
                  <Button variant="outline" className="w-full rounded-2xl justify-start gap-2" onClick={() => setShowPasswordForm(true)}>
                    <Lock className="h-4 w-4" /> Change Password
                  </Button>
                ) : (
                  <motion.form
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={handleChangePassword}
                    className="space-y-3"
                  >
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">New Password</label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="rounded-2xl"
                        minLength={6}
                        required
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Confirm New Password</label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat password"
                        className="rounded-2xl"
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="rounded-2xl flex-1" disabled={savingPassword}>
                        {savingPassword ? "Updating..." : "Update Password"}
                      </Button>
                      <Button type="button" variant="outline" className="rounded-2xl" onClick={() => { setShowPasswordForm(false); setNewPassword(""); setConfirmPassword(""); }}>
                        Cancel
                      </Button>
                    </div>
                  </motion.form>
                )}
              </div>

              <Separator />

              {/* Sign Out */}
              <Button
                variant="outline"
                className="w-full rounded-2xl justify-start gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 border-red-200 dark:border-red-900/40"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
