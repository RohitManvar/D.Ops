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
  // Stats have been moved to the Analytics module where they belong.

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
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-sm bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl border-l border-white/40 dark:border-white/10 shadow-[20px_0_60px_-15px_rgba(0,0,0,0.3)] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-6">
              <h2 className="font-medium text-xl tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                </div>
                Profile
              </h2>
              <button onClick={onClose} className="rounded-full p-2 bg-white/50 hover:bg-white dark:bg-slate-800/50 dark:hover:bg-slate-700 transition-colors border border-white/20 dark:border-white/5">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            <div className="px-8 pb-8 space-y-8">
              {/* Avatar + Name */}
              <div className="flex flex-col items-center gap-4 text-center mt-2">
                <div className={`h-24 w-24 rounded-3xl ${user?.user_metadata?.avatar_url ? 'bg-transparent' : bgColor} flex items-center justify-center text-white text-3xl font-bold shadow-lg border-[3px] border-white/40 dark:border-white/10 select-none overflow-hidden`}>
                  {user?.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>

                {editingName ? (
                  <div className="flex items-center gap-2 w-full max-w-[220px]">
                    <Input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") { setEditingName(false); setNameInput(displayName); } }}
                      className="rounded-2xl text-center text-sm bg-white/50 dark:bg-slate-800/50"
                      placeholder="Your name"
                      autoFocus
                    />
                    <Button size="icon" className="rounded-xl h-9 w-9 shrink-0 bg-slate-900 text-white dark:bg-white dark:text-slate-900" onClick={handleSaveName} disabled={savingName}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline" className="rounded-xl h-9 w-9 shrink-0 bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-white/5" onClick={() => { setEditingName(false); setNameInput(displayName); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group">
                    <p className="font-medium text-xl text-slate-900 dark:text-slate-100 tracking-tight">{displayName || "Set your name"}</p>
                    <button onClick={() => { setEditingName(true); setNameInput(displayName); }} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition opacity-0 group-hover:opacity-100">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <div className="space-y-1 mt-1">
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-light">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{email}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500 font-light">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Joined {joinedDate}</span>
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />

              {/* Security */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Security</h3>

                {!showPasswordForm ? (
                  <Button variant="outline" className="w-full rounded-2xl h-12 justify-start gap-3 bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border-white/20 dark:border-white/5 text-slate-700 dark:text-slate-300 transition-all font-medium" onClick={() => setShowPasswordForm(true)}>
                    <Lock className="h-4 w-4" /> Change Password
                  </Button>
                ) : (
                  <motion.form
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={handleChangePassword}
                    className="space-y-4 bg-white/50 dark:bg-slate-800/50 p-4 rounded-3xl border border-white/20 dark:border-white/5"
                  >
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">New Password</label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="rounded-xl bg-white dark:bg-slate-900 border-white/20 dark:border-white/5"
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
                        className="rounded-xl bg-white dark:bg-slate-900 border-white/20 dark:border-white/5"
                        required
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button type="submit" className="rounded-xl flex-1 bg-slate-900 text-white dark:bg-white dark:text-slate-900" disabled={savingPassword}>
                        {savingPassword ? "Updating..." : "Update Password"}
                      </Button>
                      <Button type="button" variant="outline" className="rounded-xl bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-white/5" onClick={() => { setShowPasswordForm(false); setNewPassword(""); setConfirmPassword(""); }}>
                        Cancel
                      </Button>
                    </div>
                  </motion.form>
                )}
              </div>

              <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />

              {/* Sign Out */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Account</h3>
                <Button
                  variant="outline"
                  className="w-full rounded-2xl h-12 justify-start gap-3 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-700 border border-red-100 dark:border-red-900/20 transition-all font-medium"
                  onClick={signOut}
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
