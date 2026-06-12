import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthProvider'
import { Button } from '@/components/ui/button'
import { ArrowLeft, User, FileText, Calendar, Inbox, CheckCheck, FolderKanban, Search, Filter, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react'

export default function ReviewerDashboard() {
  const { user } = useAuth()
  
  const location = useLocation()
  
  const [executors, setExecutors] = useState([])
  const [selectedExecutorId, setSelectedExecutorId] = useState(null)
  
  const initialTab = new URLSearchParams(location.search).get('tab') || 'all'
  const [selectedTab, setSelectedTab] = useState(initialTab)
  
  const [approvals, setApprovals] = useState([])
  const [features, setFeatures] = useState([])
  const [loading, setLoading] = useState(true)
  const [contentLoading, setContentLoading] = useState(false)
  
  const [pendingCounts, setPendingCounts] = useState({})
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('all')

  useEffect(() => {
    fetchExecutors()
  }, [])

  useEffect(() => {
    if (selectedExecutorId) fetchContent()
  }, [selectedExecutorId, selectedTab])

  const fetchExecutors = async () => {
    const { data: allExecs } = await supabase.from('profiles').select('*').eq('role', 'executor')
    
    const { data: reviewerApprovals } = await supabase.from('approvals').select('requester_id, status').eq('reviewer_id', user.id)
    
    const pCounts = {}
    const sharedIds = new Set()
    
    ;(reviewerApprovals || []).forEach(a => {
      sharedIds.add(a.requester_id)
      if (a.status === 'Pending') {
        pCounts[a.requester_id] = (pCounts[a.requester_id] || 0) + 1
      }
    })
    
    setPendingCounts(pCounts)
    
    const filteredExecutors = (allExecs || []).filter(e => sharedIds.has(e.id))
    
    setExecutors(filteredExecutors)
    if (filteredExecutors.length > 0) setSelectedExecutorId(filteredExecutors[0].id)
    setLoading(false)
  }

  const fetchContent = async () => {
    setContentLoading(true)
    
    let query = supabase
      .from('approvals')
      .select('*')
      .eq('requester_id', selectedExecutorId)
      .eq('reviewer_id', user.id)
      .order('created_at', { ascending: false })

    if (selectedTab !== 'all') {
      const targetType = selectedTab === 'daily_notes' ? 'daily_update' : selectedTab
      query = query.eq('target_type', targetType)
    }

    let { data: appData } = await query

    let enrichedApprovals = appData || []

    if (enrichedApprovals.length > 0) {
      // Daily Notes
      const noteIds = enrichedApprovals.filter(a => a.target_type === 'daily_update').map(a => a.target_id)
      if (noteIds.length > 0) {
        const { data: notesData } = await supabase.from('notes').select('*').in('id', noteIds)
        if (notesData) {
          enrichedApprovals = enrichedApprovals.map(app => app.target_type === 'daily_update' ? ({ ...app, notes: notesData.find(n => n.id === app.target_id) }) : app)
        }
      } 
      
      // Sprint Plans
      const sprintIds = enrichedApprovals.filter(a => a.target_type === 'sprint_plan').map(a => a.target_id)
      if (sprintIds.length > 0) {
        const { data: sprintsData } = await supabase.from('sprints').select('*').in('id', sprintIds)
        if (sprintsData) {
          enrichedApprovals = enrichedApprovals.map(app => app.target_type === 'sprint_plan' ? ({ ...app, sprints: sprintsData.find(s => s.id === app.target_id) }) : app)
        }
      }
      
      // Project Gantt
      const projectIds = enrichedApprovals.filter(a => a.target_type === 'project_gantt').map(a => a.target_id)
      if (projectIds.length > 0) {
        const { data: projData } = await supabase.from('gantt_projects').select('*').in('id', projectIds)
        if (projData) {
          enrichedApprovals = enrichedApprovals.map(app => app.target_type === 'project_gantt' ? ({ ...app, project: projData.find(p => p.id === app.target_id) }) : app)
        }
      }

      // Auto-read any 'Pending' approvals for the current tab
      const pendingIds = enrichedApprovals.filter(a => a.status === 'Pending').map(a => a.id)
      if (pendingIds.length > 0) {
        await supabase.from('approvals').update({ status: 'Read' }).in('id', pendingIds)
        enrichedApprovals = enrichedApprovals.map(app => 
          pendingIds.includes(app.id) ? { ...app, status: 'Read' } : app
        )
        setPendingCounts(prev => ({ ...prev, [selectedExecutorId]: Math.max(0, (prev[selectedExecutorId] || 0) - pendingIds.length) }))
      }
    }
      
    setApprovals(enrichedApprovals)

    // For product backlog, always fetch the full backlog below the chat
    if (selectedTab === 'product_backlog') {
      const { data: featData } = await supabase
        .from('features')
        .select('*')
        .eq('user_id', selectedExecutorId)
        .order('created_at', { ascending: false })
      setFeatures(featData || [])
    }
    
    setContentLoading(false)
  }

  const tabs = [
    { id: 'all', label: 'All Activity', icon: Inbox },
    { id: 'daily_notes', label: 'Daily Notes', icon: FileText },
    { id: 'sprint_plan', label: 'Sprint Planning', icon: Calendar },
    { id: 'project_gantt', label: 'Gantt Charts', icon: FolderKanban },
    { id: 'product_backlog', label: 'Product Backlog', icon: Inbox },
  ]

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleDateString()
  }

  const filteredApprovals = approvals.filter(app => {
    if (dateFilter === '7days') {
      if (new Date() - new Date(app.created_at) > 7 * 24 * 60 * 60 * 1000) return false
    } else if (dateFilter === '30days') {
      if (new Date() - new Date(app.created_at) > 30 * 24 * 60 * 60 * 1000) return false
    }
    if (searchQuery) {
      const lower = searchQuery.toLowerCase()
      let matches = false
      if (app.target_type === 'daily_update' && app.notes) {
        matches = app.notes.summary?.toLowerCase().includes(lower) || app.notes.whatsapp_message?.toLowerCase().includes(lower)
      } else if (app.target_type === 'sprint_plan' && app.sprints) {
        matches = app.sprints.goal?.toLowerCase().includes(lower) || app.sprints.deliverables?.toLowerCase().includes(lower)
      } else if (app.target_type === 'project_gantt' && app.project) {
        matches = app.project.name?.toLowerCase().includes(lower) || app.project.company?.toLowerCase().includes(lower)
      }
      if (!matches) return false
    }
    return true
  }).filter((app, index, self) => index === self.findIndex(t => t.target_id === app.target_id))
  .sort((a, b) => {
    if (a.target_type === 'daily_update' && b.target_type === 'daily_update' && a.notes && b.notes) {
      const diff = new Date(a.notes.date) - new Date(b.notes.date)
      return diff === 0 ? new Date(a.created_at) - new Date(b.created_at) : diff
    }
    if (a.target_type === 'sprint_plan' && b.target_type === 'sprint_plan' && a.sprints && b.sprints) {
      const diff = new Date(a.sprints.start_date) - new Date(b.sprints.start_date)
      return diff === 0 ? new Date(a.created_at) - new Date(b.created_at) : diff
    }
    return new Date(a.created_at) - new Date(b.created_at)
  })

  const summaryStats = { daily: 0, sprints: 0, gantt: 0, backlog: 0 }
  filteredApprovals.forEach(a => {
    if (a.target_type === 'daily_update') summaryStats.daily++
    if (a.target_type === 'sprint_plan') summaryStats.sprints++
    if (a.target_type === 'project_gantt') summaryStats.gantt++
    if (a.target_type === 'product_backlog') summaryStats.backlog++
  })

  return (
    <div className="min-h-screen bg-[#f7f6f3] dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link to="/">
              <Button variant="ghost" className="mb-4 bg-white/50 hover:bg-white">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Hub
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Reviewer Dashboard</h1>
            <p className="text-slate-600 dark:text-slate-400">Directory of Executors and their shared work.</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : executors.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No Executors found in the system yet.</div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* Sidebar: Executors List */}
            <div className="w-full lg:w-72 shrink-0 bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden h-fit">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Executors</h2>
              </div>
              <div className="flex flex-col">
                {executors.map(exec => (
                  <button
                    key={exec.id}
                    onClick={() => setSelectedExecutorId(exec.id)}
                    className={`flex items-center gap-3 p-4 transition-all text-left border-b border-slate-50 dark:border-slate-700/50 last:border-0 ${
                      selectedExecutorId === exec.id 
                        ? 'bg-blue-50 dark:bg-blue-900/20' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <div className={`p-3 rounded-full ${selectedExecutorId === exec.id ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                      <User className="h-5 w-5" />
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate capitalize">
                      {exec.email.split('@')[0]}
                    </span>
                    {pendingCounts[exec.id] > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {pendingCounts[exec.id]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content Area (Chat View) */}
            <div className="flex-1 min-w-0 flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-sm overflow-hidden border border-slate-200 dark:border-slate-800 relative">
              
              {/* Chat Header (Tabs) */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 border-b border-slate-200 dark:border-slate-800 relative z-10">
                <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                  {tabs.map(tab => {
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setSelectedTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium rounded-full transition-colors whitespace-nowrap ${
                          selectedTab === tab.id
                            ? 'bg-blue-500 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {tab.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Filters & Summary */}
              {!contentLoading && approvals.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 space-y-3 relative z-10">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search updates..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="relative w-full sm:w-48">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <select 
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                      >
                        <option value="all">All Time</option>
                        <option value="7days">Last 7 Days</option>
                        <option value="30days">Last 30 Days</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">Notes: {summaryStats.daily}</span>
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">Sprints: {summaryStats.sprints}</span>
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">Gantt: {summaryStats.gantt}</span>
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">Backlog: {summaryStats.backlog}</span>
                  </div>
                </div>
              )}

              {/* Chat Messages / Content */}
              <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 relative z-10 min-h-[500px]">
                {selectedTab !== 'product_backlog' && (
                  contentLoading ? (
                  <div className="text-center py-12 text-slate-500 bg-white/50 rounded-xl inline-block px-6 mx-auto">Loading messages...</div>
                ) : filteredApprovals.length === 0 ? (
                  <div className="text-center py-8">
                    <span className="bg-[#FFEEDB] text-[#66503c] text-xs px-4 py-2 rounded-xl shadow-sm inline-block">
                      No messages match the current filters.
                    </span>
                  </div>
                ) : 
                  filteredApprovals.map(app => {
                      // Render Chat Bubble
                      return (
                        <div key={app.id} className="flex justify-start">
                        <div className="flex flex-col w-[85%] md:w-[70%] bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 p-4 rounded-2xl rounded-tl-sm shadow-sm relative border border-slate-200 dark:border-slate-700">
                          
                          {/* Daily Notes Content */}
                          {app.target_type === 'daily_update' && app.notes ? (
                            <>
                              <div className="font-bold text-xs text-blue-600 dark:text-blue-400 mb-2">
                                Daily Update • {formatDate(app.notes.date)}
                              </div>
                              <div className="text-sm whitespace-pre-wrap leading-relaxed pb-4">
                                {app.notes.whatsapp_message || app.notes.summary || 'No content provided.'}
                              </div>
                            </>
                          ) : app.target_type === 'daily_update' && !app.notes ? (
                            <div className="text-sm italic text-slate-500 pb-4">Waiting for access to view note...</div>
                          ) : null}

                          {/* Sprint Plan Content */}
                          {app.target_type === 'sprint_plan' && app.sprints ? (
                            <>
                              <div className="font-bold text-xs text-blue-600 dark:text-blue-400 mb-2">
                                Sprint Plan • {app.sprints.start_date} to {app.sprints.end_date}
                              </div>
                              <div className="text-[14px] font-semibold mb-1 whitespace-pre-wrap">
                                Goal: {app.sprints.goal}
                              </div>
                              {app.sprints.deliverables && (
                                <div className="text-[13px] text-slate-700 dark:text-slate-300 pb-4">
                                  <strong>Deliverables:</strong> {app.sprints.deliverables}
                                </div>
                              )}
                            </>
                          ) : app.target_type === 'sprint_plan' && !app.sprints ? (
                            <div className="text-sm italic text-slate-500 pb-4">Waiting for access to view sprint...</div>
                          ) : null}

                          {/* Product Backlog Content */}
                          {app.target_type === 'product_backlog' && (
                            <>
                              <div className="font-bold text-xs text-blue-600 dark:text-blue-400 mb-2">
                                Product Backlog Share
                              </div>
                              <div className="text-sm italic pb-4 text-slate-600 dark:text-slate-400">
                                Executor has shared their latest product backlog. See below for full details.
                              </div>
                            </>
                          )}

                          {/* Project Gantt Content */}
                          {app.target_type === 'project_gantt' && app.project ? (
                            <>
                              <div className="font-bold text-xs text-blue-600 dark:text-blue-400 mb-2">
                                Project Gantt Chart Shared
                              </div>
                              <div className="text-[14px] font-semibold mb-1 whitespace-pre-wrap">
                                Project: {app.project.name}
                              </div>
                              <div className="text-[13px] text-slate-700 dark:text-slate-300 pb-2">
                                Client: {app.project.company} | Started: {formatDate(app.project.start_date)}
                              </div>
                              <div className="pb-4 pt-2">
                                <Link to={`/project-gantt/${app.project.id}?from=${selectedTab}`}>
                                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                                    View Full Gantt Chart
                                  </Button>
                                </Link>
                              </div>
                            </>
                          ) : app.target_type === 'project_gantt' && !app.project ? (
                            <div className="text-sm italic text-slate-500 pb-4">Waiting for access to view Gantt chart...</div>
                          ) : null}

                          {/* Meta feedback from executor */}
                          {app.feedback && (
                            <div className="text-xs italic text-slate-500 border-t border-slate-200 dark:border-slate-700 pt-2 pb-2">
                              "{app.feedback}"
                            </div>
                          )}

                          {/* Time & Read Receipt */}
                          <div className="absolute bottom-2 right-3 flex items-center gap-1 text-[10px] text-slate-400">
                            <span>{formatTime(app.created_at)}</span>
                            <CheckCheck className={`h-3.5 w-3.5 ${app.status === 'Read' ? 'text-blue-500' : 'text-slate-300'}`} />
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}

                {/* Always show actual Backlog below chat if product_backlog tab is active */}
                {selectedTab === 'product_backlog' && !contentLoading && (
                  <div className="pt-2">
                    <div className="flex justify-between items-end mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                        Live Backlog Snapshot
                      </h3>
                      {approvals.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <span>Shared: {new Date(approvals[0].created_at).toLocaleDateString()} at {formatTime(approvals[0].created_at)}</span>
                          <CheckCheck className={`h-4 w-4 ${approvals[0].status === 'Read' ? 'text-blue-500' : 'text-slate-300'}`} />
                        </div>
                      )}
                    </div>
                    {features.length === 0 ? (
                      <div className="text-center text-sm text-slate-500">Empty backlog.</div>
                    ) : (
                      <div className="space-y-2">
                        {features.map(feat => (
                          <div key={feat.id} className="p-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{feat.title}</h4>
                                {feat.description && <p className="text-sm text-slate-500 mt-2 whitespace-pre-wrap">{feat.description}</p>}
                              </div>
                              <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                feat.priority === 'High' ? 'bg-red-100 text-red-700' :
                                feat.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {feat.priority}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
