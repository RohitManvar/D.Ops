import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/context/AuthProvider'
import { useTheme } from '@/context/ThemeProvider'
import { supabase } from '@/lib/supabaseClient'
import SharePanel from '@/components/SharePanel'
import { 
  ClipboardList, 
  ListTodo, 
  CheckSquare, 
  LayoutGrid, 
  LogOut, 
  Moon, 
  Sun,
  ShieldCheck,
  TrendingUp,
  Inbox,
  Share2,
  Send,
  ChevronDown,
  BarChart,
  PenLine,
  Layers,
  Flag,
  Kanban,
  Activity,
  Rocket,
  Code
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import ProfilePanel from '@/components/ProfilePanel'
import GlassCard from '@/components/ui/GlassCard'

export default function DashboardHub() {
  const { user, isReviewer, signOut } = useAuth()
  const { dark, toggleTheme } = useTheme()
  const [showShare, setShowShare] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [notes, setNotes] = useState([])

  useEffect(() => {
    if (!isReviewer && user) {
      supabase
        .from("notes")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .then(({ data }) => {
          if (data) setNotes(data)
        })
    }
  }, [user, isReviewer])

  const executorLinks = [
    { 
      to: "/daily-notes", title: "Daily Notes", icon: PenLine, desc: "Your personal daily tracking and quick updates",
      color: "from-blue-500 to-cyan-400", bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-500"
    },
    { 
      to: "/daily-update", title: "Daily Update", icon: Rocket, desc: "Send your official daily status update to the reviewer",
      color: "from-emerald-500 to-teal-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-500"
    },
    { 
      to: "/backlog", title: "Product Backlog", icon: Layers, desc: "Manage features, estimates, and priorities",
      color: "from-purple-500 to-fuchsia-400", bg: "bg-purple-50 dark:bg-purple-500/10", text: "text-purple-500"
    },
    { 
      to: "/sprints", title: "Sprint Planning", icon: Flag, desc: "Define goals, assign tasks, and plan weeks",
      color: "from-amber-500 to-orange-400", bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-500"
    },
    { 
      to: "/kanban", title: "Execution Board", icon: Kanban, desc: "Kanban board for daily execution workflow",
      color: "from-rose-500 to-pink-400", bg: "bg-rose-50 dark:bg-rose-500/10", text: "text-rose-500"
    },
    { 
      to: "/github-work", title: "GitHub Work", icon: Code, desc: "Track pull requests, commits, and code reviews",
      color: "from-slate-600 to-slate-400", bg: "bg-slate-100 dark:bg-slate-500/10", text: "text-slate-600 dark:text-slate-400"
    },
    { 
      to: "/analytics", title: "Analytics & Insights", icon: Activity, desc: "View your productivity trends and project stats",
      color: "from-indigo-500 to-violet-400", bg: "bg-indigo-50 dark:bg-indigo-500/10", text: "text-indigo-500"
    },
  ]

  const reviewerLinks = [
    { 
      to: "/reviewer", title: "Reviewer Dashboard", icon: ShieldCheck, desc: "View progress, sprint reports, and approve plans",
      color: "from-blue-500 to-cyan-400", bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-500"
    },
    { 
      to: "/backlog", title: "Product Backlog (Read-Only)", icon: Layers, desc: "Review upcoming features and priorities",
      color: "from-purple-500 to-fuchsia-400", bg: "bg-purple-50 dark:bg-purple-500/10", text: "text-purple-500"
    },
  ]

  const links = isReviewer ? reviewerLinks : executorLinks

  return (
    <div className="min-h-screen bg-transparent p-8">
      <motion.nav
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-0 left-0 right-0 z-30 h-14 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border-b border-white/20 dark:border-white/5 shadow-sm print:hidden"
      >
        <div className="mx-auto max-w-7xl h-full px-3 md:px-6 flex items-center justify-between gap-3">
          {/* Left — logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <img src="/Do logo.png" alt="D.Ops" className="h-8 w-8 rounded-xl object-cover shrink-0" />
              <div className="hidden sm:block">
                <span className="font-semibold text-base tracking-tight">
                  D<span className="text-slate-400">.</span>Ops
                </span>
                <span className="ml-2 text-xs text-slate-400 hidden md:inline">Dashboard</span>
              </div>
            </div>
          </div>

          {/* Right — actions */}
          <div className="flex items-center gap-1 shrink-0">
            {!isReviewer && (
              <Button onClick={() => setShowShare(true)} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs px-3 mr-2">
                <Share2 className="h-3.5 w-3.5 mr-1.5" /> Share Work
              </Button>
            )}

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

      <div className="max-w-5xl mx-auto pt-[4.5rem]">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2">
            Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            <span className="ml-3 align-middle px-2 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 uppercase tracking-wider">{isReviewer ? 'Reviewer' : 'Executor'}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400">Select a module to continue your work.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {links.map((item, i) => (
            <motion.div
              key={item.to}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link to={item.to} className="block group">
                <GlassCard delay={0} noAnimation className={`h-full border-slate-200/50 dark:border-slate-700/50 hover:shadow-2xl hover:shadow-${item.color.split('-')[1]}-500/10 transition-all duration-300 relative overflow-hidden group-hover:-translate-y-1`}>
                  {/* Subtle hover gradient wash */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-[0.03] dark:group-hover:opacity-[0.05] transition-opacity duration-500`} />
                  
                  {/* Left accent line */}
                  <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${item.color} scale-y-0 group-hover:scale-y-100 origin-top transition-transform duration-500`} />
                  
                  {/* Watermark Icon */}
                  <item.icon className={`absolute -bottom-6 -right-6 w-32 h-32 ${item.text} opacity-[0.03] dark:opacity-[0.05] -rotate-12 group-hover:rotate-0 group-hover:scale-110 transition-all duration-700 pointer-events-none`} />

                  <div className="flex items-start gap-4 relative z-10">
                    <div className={`p-4 rounded-[20px] ${item.bg} ${item.text} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                      <item.icon className="h-7 w-7 stroke-[1.5]" />
                    </div>
                    <div className="pt-1">
                      <h2 className={`text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2 group-hover:${item.text} transition-colors`}>
                        {item.title}
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm">{item.desc}</p>
                    </div>
                  </div>
                </GlassCard>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      <SharePanel
        open={showShare}
        onClose={() => setShowShare(false)}
        notes={notes}
      />
      <ProfilePanel
        open={showProfile}
        onClose={() => setShowProfile(false)}
        notes={notes}
      />
    </div>
  )
}
