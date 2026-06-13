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
  Code,
  Search,
  BrainCircuit,
  CalendarDays,
  Settings,
  Users,
  FileText,
  Plus,
  FolderKanban,
  CheckCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import ProfilePanel from '@/components/ProfilePanel'
import GlassCard from '@/components/ui/GlassCard'
import { containerVariants, itemVariants } from '@/lib/animations'

export default function DashboardHub() {
  const { user, isReviewer, signOut } = useAuth()
  const { dark, toggleTheme } = useTheme()
  const { addToast } = useToast()
  const [showShare, setShowShare] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [notes, setNotes] = useState([])
  const [projects, setProjects] = useState([])
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProject, setNewProject] = useState({ name: '', company: '' })
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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

      supabase
        .from('gantt_projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data) setProjects(data)
        })
    }
  }, [user?.id, isReviewer])

  const executorLinks = [
    { 
      to: "/daily-notes", title: "Daily Notes", icon: PenLine, desc: "Your personal daily tracking and quick updates"
    },
    { 
      to: "/daily-update", title: "Daily Update", icon: Rocket, desc: "Send your official daily status update to the reviewer"
    },
    { 
      to: "/backlog", title: "Product Backlog", icon: Layers, desc: "Manage features, estimates, and priorities"
    },
    { 
      to: "/sprints", title: "Sprint Planning", icon: Flag, desc: "Define goals, assign tasks, and plan weeks"
    },
    { 
      to: "/kanban", title: "Execution Board", icon: Kanban, desc: "Kanban board for daily execution workflow"
    },
    { 
      to: "/github-work", title: "GitHub Work", icon: Code, desc: "Track pull requests, commits, and code reviews"
    },
    { 
      to: "/analytics", title: "Analytics & Insights", icon: Activity, desc: "View your productivity trends and project stats"
    },
    {
      to: "/documents", title: "Documents", icon: FileText, desc: "Create and manage Word-like rich text documents"
    },
    {
      to: "/project-gantt", title: "All Projects (Legacy)", icon: BarChart, desc: "Detailed Gantt chart for VSM Tool Automation"
    },
    {
      to: "/settings", title: "Settings Hub", icon: Settings, desc: "Manage GitHub integrations and preferences"
    },
  ]

  const handleCreateProject = async (e) => {
    e.preventDefault()
    if (!newProject.name) return
    
    const payload = {
      user_id: user.id,
      name: newProject.name,
      company: newProject.company || 'Internal',
      start_date: new Date().toISOString().split('T')[0]
    }

    const { data, error } = await supabase.from('gantt_projects').insert(payload).select().single()
    if (error) {
      addToast("Failed to create project", "error")
    } else {
      await supabase.from('gantt_data').insert({
        project_id: data.id,
        user_id: user.id,
        tasks_json: []
      })
      setProjects([data, ...projects])
      setShowNewProject(false)
      setNewProject({ name: '', company: '' })
      addToast("Project created!", "success")
    }
  }

  const reviewerLinks = [
    { 
      to: "/reviewer", title: "Reviewer Dashboard", icon: ShieldCheck, desc: "View progress, sprint reports, and approve plans"
    },
    { 
      to: "/backlog", title: "Product Backlog (Read-Only)", icon: Layers, desc: "Review upcoming features and priorities"
    },
    {
      to: "/team", title: "Team Roster", icon: Users, desc: "View executor progress and deep work metrics"
    },
  ]

  const links = isReviewer ? reviewerLinks : executorLinks

  return (
    <div className="min-h-screen bg-transparent p-8">
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`fixed left-1/2 -translate-x-1/2 z-30 w-[95%] max-w-6xl h-14 transition-all duration-500 ease-in-out print:hidden ${
          isScrolled 
            ? "top-6 rounded-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl border border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.08)]"
            : "top-0 rounded-b-3xl bg-transparent border-transparent shadow-none"
        }`}
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

          {/* Middle — Global Search */}
          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <button
              onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
              className="flex items-center w-full gap-2 px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 text-slate-500 dark:text-slate-400 rounded-xl transition-colors group border border-transparent dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <Search className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300" />
              <span className="flex-1 text-left font-light tracking-tight">Search everywhere...</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-medium bg-white dark:bg-slate-900 rounded text-slate-400 border border-slate-200 dark:border-slate-700 shadow-sm">
                Ctrl K
              </kbd>
            </button>
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
                className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ring-2 ring-white dark:ring-slate-800 overflow-hidden"
                style={{ background: user?.user_metadata?.avatar_url ? 'transparent' : `hsl(${Math.abs(user?.email?.charCodeAt(0) * 37 || 200) % 360}, 65%, 50%)` }}
              >
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  (user?.user_metadata?.full_name?.[0] || user?.email?.[0] || "?").toUpperCase()
                )}
              </div>
              <span className="text-xs text-slate-600 dark:text-slate-300 max-w-[100px] truncate hidden md:block">
                {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
              </span>
              <ChevronDown className="h-3 w-3 text-slate-400 hidden md:block" />
            </button>
          </div>
        </div>
      </motion.nav>

      <div className="max-w-5xl mx-auto pt-20 md:pt-28">
        <div className="mb-10">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2 flex flex-wrap items-center gap-2 md:gap-3">
            Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 uppercase tracking-wider">{isReviewer ? 'Reviewer' : 'Executor'}</span>
          </h1>
          <p className="text-sm md:text-base text-slate-500 dark:text-slate-400">Manage your projects or select a global module to continue your work.</p>
        </div>

        {/* Projects Section */}
        {!isReviewer && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Your Projects</h2>
                <p className="text-sm text-slate-500">Dedicated spaces for specific project work.</p>
              </div>
              <Button onClick={() => setShowNewProject(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm">
                <Plus className="h-4 w-4 mr-2" /> Create Project
              </Button>
            </div>
            
            {showNewProject && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm">
                <h3 className="font-semibold mb-4 text-slate-900 dark:text-slate-100">New Project</h3>
                <form onSubmit={handleCreateProject} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Project Name *</label>
                    <Input required autoFocus value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} placeholder="e.g. Website Redesign" className="rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Client / Company</label>
                    <Input value={newProject.company} onChange={e => setNewProject({...newProject, company: e.target.value})} placeholder="e.g. Acme Corp" className="rounded-xl" />
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                    <Button type="button" variant="outline" className="rounded-xl" onClick={() => setShowNewProject(false)}>Cancel</Button>
                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">Save Project</Button>
                  </div>
                </form>
              </motion.div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-16">
              {projects.length === 0 && !showNewProject ? (
                <div className="col-span-full py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <FolderKanban className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-slate-500">No projects yet. Create one to get started!</p>
                </div>
              ) : (
                projects.map(proj => (
                  <Link key={proj.id} to={`/project/${proj.id}`} className="block group">
                    <div className="p-5 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl transition-colors shadow-sm hover:shadow-md h-full flex flex-col justify-between">
                      <div>
                        <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                          <FolderKanban className="h-5 w-5" />
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 leading-tight mb-1">{proj.name}</h3>
                        <p className="text-xs text-slate-500 mb-4">{proj.company}</p>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                        Created {new Date(proj.start_date).toLocaleDateString()}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>

            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Global Modules</h2>
                <p className="text-sm text-slate-500">Cross-project tools and analytics.</p>
              </div>
            </div>
          </>
        )}

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {links.map((item) => (
            <motion.div key={item.to} variants={itemVariants}>
              <Link to={item.to} className="block h-full group">
                <GlassCard delay={0} noAnimation className="h-full p-8 flex flex-col justify-between hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors duration-500 rounded-3xl">
                  <div className="flex items-center justify-between mb-8">
                    <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-800 dark:text-slate-200 group-hover:scale-110 transition-transform duration-500">
                      <item.icon className="h-6 w-6 stroke-[1.5]" />
                    </div>
                    <div className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-slate-900 group-hover:border-transparent transition-all duration-300 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-medium text-slate-900 dark:text-slate-100 mb-2 tracking-tight">
                      {item.title}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-light">
                      {item.desc}
                    </p>
                  </div>
                </GlassCard>
              </Link>
            </motion.div>
          ))}
        </motion.div>
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
