import React, { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { ArrowLeft, Plus, CheckCircle, Send, CheckCheck, Trash2, Edit2, BarChart, FolderInput, ChevronDown } from 'lucide-react'
import ConfirmDialog from '@/components/ui/confirm-dialog'

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}-${month}-${year}`;
}

const sortOptions = [
  { value: 'newest_start', label: 'Start Date (Newest First)' },
  { value: 'oldest_start', label: 'Start Date (Oldest First)' },
  { value: 'newest_created', label: 'Recently Created' },
  { value: 'oldest_created', label: 'Oldest Created' },
]

export default function SprintPlanning() {
  const { projectId } = useParams()
  const { user } = useAuth()
  const { addToast } = useToast()
  const [sprints, setSprints] = useState([])
  const [sprintApprovals, setSprintApprovals] = useState({})
  const [loading, setLoading] = useState(true)
  const [editingSprintId, setEditingSprintId] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null })
  const [sortOrder, setSortOrder] = useState('newest_start')
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false)

  const [newGoal, setNewGoal] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [deliverables, setDeliverables] = useState('')

  const [projects, setProjects] = useState([])
  const [assignModal, setAssignModal] = useState({ open: false, sprintId: null })
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false)

  useEffect(() => {
    loadSprints()
    if (!projectId) {
      loadProjects()
    }
  }, [])

  const loadProjects = async () => {
    const { data } = await supabase.from('gantt_projects').select('id, name').eq('user_id', user.id);
    if (data) setProjects(data);
  }

  const loadSprints = async () => {
    setLoading(true)
    let query = supabase
      .from('sprints')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false })
      
    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query
    
    if (!error) {
      setSprints(data || [])
      
      const sprintIds = (data || []).map(s => s.id)
      const { data: appData } = await supabase
        .from('approvals')
        .select('target_id, status')
        .eq('target_type', 'sprint_plan')
        .eq('requester_id', user.id)
        .in('target_id', sprintIds)

      if (appData) {
        const approvalMap = {}
        appData.forEach(app => {
          approvalMap[app.target_id] = app.status
        })
        setSprintApprovals(approvalMap)
      }
    }
    setLoading(false)
  }

  const sortedSprints = React.useMemo(() => {
    const list = [...sprints]
    switch (sortOrder) {
      case 'newest_start':
        return list.sort((a, b) => new Date(b.start_date || 0) - new Date(a.start_date || 0))
      case 'oldest_start':
        return list.sort((a, b) => new Date(a.start_date || 0) - new Date(b.start_date || 0))
      case 'newest_created':
        return list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      case 'oldest_created':
        return list.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
      default:
        return list
    }
  }, [sprints, sortOrder])

  const handleSaveSprint = async (e) => {
    e.preventDefault()
    
    const finalGoal = newGoal.trim() || 'Untitled Sprint'

    if (editingSprintId) {
      const payload = {
        goal: finalGoal,
        deliverables
      }
      if (startDate) payload.start_date = startDate;
      else payload.start_date = null;
      if (endDate) payload.end_date = endDate;
      else payload.end_date = null;

      const { data, error } = await supabase.from('sprints').update(payload).eq('id', editingSprintId).select().single()

      if (error) {
        addToast(error.message, "error")
        return
      }

      const updatedSprints = sprints.map(s => s.id === editingSprintId ? data : s)
      setSprints(updatedSprints)
      addToast("Sprint updated", "success")
    } else {
      const payload = {
        goal: finalGoal,
        deliverables,
        user_id: user.id
      }
      if (startDate) payload.start_date = startDate;
      if (endDate) payload.end_date = endDate;
      
      if (projectId) {
        payload.project_id = projectId
      }

      const { data, error } = await supabase.from('sprints').insert(payload).select().single()

      if (error) {
        addToast(error.message, "error")
        return
      }

      const newSprints = [data, ...sprints]
      setSprints(newSprints)
      addToast("Sprint created", "success")
    }

    resetForm()
  }

  const resetForm = () => {
    setEditingSprintId(null)
    setNewGoal('')
    setStartDate('')
    setEndDate('')
    setDeliverables('')
    setIsModalOpen(false)
  }

  const triggerDelete = (id) => {
    setDeleteDialog({ open: true, id })
  }

  const confirmDelete = async () => {
    if (!deleteDialog.id) return
    const id = deleteDialog.id
    
    const { error } = await supabase.from('sprints').delete().eq('id', id)
    if (!error) {
      setSprints(sprints.filter(s => s.id !== id))
      addToast("Sprint deleted", "success")
    } else {
      addToast(error.message, "error")
    }
    setDeleteDialog({ open: false, id: null })
  }

  const requestApproval = async (sprintId) => {
    // Check if there is already a pending approval to avoid duplicates
    const { data: existingList } = await supabase
      .from('approvals')
      .select('id')
      .eq('target_type', 'sprint_plan')
      .eq('target_id', sprintId)
      .eq('status', 'Pending')
      .limit(1)
    
    if (existingList && existingList.length > 0) {
      addToast("Approval request already sent", "info")
      return
    }

    const { error } = await supabase.from('approvals').insert({
      target_type: 'sprint_plan',
      target_id: sprintId,
      requester_id: user.id
    })

    if (!error) {
      addToast("Sent to Reviewer for approval", "success")
    } else {
      addToast("Failed to request approval", "error")
    }
  }

  const addToGantt = async (sprint) => {
    if (!projectId) {
      addToast("Cannot add to Gantt outside of a project context.", "error")
      return
    }

    try {
      const { data, error } = await supabase
        .from('gantt_data')
        .select('tasks_json')
        .eq('project_id', projectId)
        .single()

      if (error) throw error

      let tasksJson = data.tasks_json || []
      
      let sprintCat = tasksJson.find(c => c.category === 'Sprints')
      if (!sprintCat) {
        sprintCat = {
          id: "cat-sprints-" + Date.now(),
          category: "Sprints",
          color: "bg-emerald-200",
          barColor: "bg-emerald-300",
          textColor: "text-emerald-900",
          tasks: []
        }
        tasksJson.push(sprintCat)
      }

      const existingTask = sprintCat.tasks.find(t => t.id === 'sprint-' + sprint.id)
      if (existingTask) {
        addToast("Sprint is already on the Gantt chart", "info")
        return
      }

      const newTask = {
        id: 'sprint-' + sprint.id,
        name: sprint.goal,
        progress: "0%",
        start: sprint.start_date,
        end: sprint.end_date
      }

      sprintCat.tasks.push(newTask)

      const { error: updateErr } = await supabase
        .from('gantt_data')
        .update({ tasks_json: tasksJson, updated_at: new Date().toISOString() })
        .eq('project_id', projectId)

      if (updateErr) throw updateErr

      addToast("Sprint added to Gantt Chart", "success")
    } catch (err) {
      console.error(err)
      addToast("Failed to add sprint to Gantt", "error")
    }
  }

  const handleAssignProject = async () => {
    if (!selectedProjectId || !assignModal.sprintId) return;
    
    const { error } = await supabase
      .from('sprints')
      .update({ project_id: selectedProjectId })
      .eq('id', assignModal.sprintId);
      
    if (!error) {
      setSprints(sprints.filter(s => s.id !== assignModal.sprintId));
      addToast("Sprint assigned to project", "success");
    } else {
      addToast(error.message, "error");
    }
    
    setAssignModal({ open: false, sprintId: null });
    setSelectedProjectId('');
  }

  return (
    <div className="min-h-screen bg-[#f7f6f3] dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link to={projectId ? `/project/${projectId}` : "/"}>
              <Button variant="ghost" className="mb-4 -ml-4">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to {projectId ? 'Project' : 'Dashboard'}
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{projectId ? 'Project Sprints' : 'Global Sprint Planning'}</h1>
            <p className="text-slate-500 dark:text-slate-400">Define sprint goals, assign timeframe, and request approvals.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <button 
                onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                className="flex items-center justify-between w-full sm:w-auto min-w-[220px] h-10 px-4 py-2 text-sm font-medium bg-white border rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors shadow-sm"
              >
                {sortOptions.find(o => o.value === sortOrder)?.label}
                <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
              </button>
              <AnimatePresence>
                {isSortDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsSortDropdownOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-40 right-0 w-full sm:min-w-[220px] mt-2 bg-white border rounded-xl shadow-xl border-slate-200 dark:bg-slate-800 dark:border-slate-700 overflow-hidden"
                    >
                      {sortOptions.map(option => (
                        <button
                          key={option.value}
                          className={`block w-full px-4 py-3 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${sortOrder === option.value ? 'bg-blue-50/50 text-blue-700 font-medium dark:bg-blue-900/20 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}
                          onClick={() => {
                            setSortOrder(option.value)
                            setIsSortDropdownOpen(false)
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            
            <Button onClick={() => setIsModalOpen(true)} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white h-10 shadow-md px-5">
              <Plus className="h-4 w-4 mr-2" /> Create Sprint
            </Button>
          </div>
        </div>

      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={resetForm}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed left-1/2 top-1/2 z-50 w-[95%] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-[24px] border border-slate-200 bg-white p-6 md:p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900"
            >
              <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">
                {editingSprintId ? 'Edit Sprint' : 'Create New Sprint'}
              </h2>
              <form onSubmit={handleSaveSprint} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm text-slate-500 mb-1 block">Sprint Goal</label>
                    <Textarea 
                      placeholder="E.g. Launch the new auth module..." 
                      value={newGoal} 
                      onChange={e => setNewGoal(e.target.value)} 
                      className="rounded-xl min-h-[80px]"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 mb-1 block">Start Date</label>
                    <Input 
                      type="date"
                      value={startDate} 
                      onChange={e => setStartDate(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 mb-1 block">End Date</label>
                    <Input 
                      type="date"
                      value={endDate} 
                      onChange={e => setEndDate(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-slate-500 mb-1 block">Deliverables</label>
                    <Textarea 
                      placeholder="e.g.&#10;- Auth UI&#10;- Auth API&#10;- Tests" 
                      value={deliverables} 
                      onChange={e => setDeliverables(e.target.value)}
                      className="rounded-xl min-h-[100px]"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-8">
                  <Button type="button" variant="outline" className="rounded-xl" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                    {editingSprintId ? <CheckCircle className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    {editingSprintId ? "Update Sprint" : "Create Sprint"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </>
        )}

        {assignModal.open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setAssignModal({ open: false, sprintId: null })}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed left-1/2 top-1/2 z-50 w-[95%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[24px] border border-slate-200 bg-white p-6 md:p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900"
            >
              <h2 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">
                Assign to Project
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Select a project to move this sprint into.</p>
              
              <div className="space-y-4">
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                    className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium bg-white border rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    {selectedProjectId ? projects.find(p => p.id === selectedProjectId)?.name : "Select a project..."}
                    <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
                  </button>
                  <AnimatePresence>
                    {isProjectDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setIsProjectDropdownOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-40 w-full mt-2 bg-white border rounded-xl shadow-xl border-slate-200 dark:bg-slate-800 dark:border-slate-700 overflow-hidden max-h-[200px] overflow-y-auto"
                        >
                          {projects.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              className={`block w-full px-4 py-3 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${selectedProjectId === p.id ? 'bg-blue-50/50 text-blue-700 font-medium dark:bg-blue-900/20 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}
                              onClick={() => {
                                setSelectedProjectId(p.id)
                                setIsProjectDropdownOpen(false)
                              }}
                            >
                              {p.name}
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
                
                <div className="flex justify-end gap-3 mt-8">
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => setAssignModal({ open: false, sprintId: null })}>
                    Cancel
                  </Button>
                  <Button onClick={handleAssignProject} disabled={!selectedProjectId} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                    Assign Sprint
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

        {loading ? (
          <div className="text-center py-8">Loading sprints...</div>
        ) : (
          <div className="space-y-4">
            {sortedSprints.map(s => (
              <Card key={s.id} className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50">
                <CardContent className="p-4 flex flex-col md:flex-row items-start justify-between gap-4">
                  <div>
                    <div className="flex items-start gap-3">
                      <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
                        {s.goal}
                      </h3>
                      <span className="mt-1 shrink-0 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        {s.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-slate-500">
                        {s.start_date || s.end_date ? (
                          `${formatDate(s.start_date) || 'TBD'} to ${formatDate(s.end_date) || 'TBD'}`
                        ) : (
                          'No dates scheduled'
                        )}
                      </p>
                      {sprintApprovals[s.id] && (
                        <div title={`Share Status: ${sprintApprovals[s.id]}`}>
                          <CheckCheck className={`h-4 w-4 ${sprintApprovals[s.id] === 'Read' ? 'text-blue-500' : 'text-slate-400'}`} />
                        </div>
                      )}
                    </div>
                    {s.deliverables && (
                      <div className="mt-3 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Deliverables:</span>
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {s.deliverables}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 items-center">
                    <Button variant="ghost" size="icon" onClick={() => {
                      setEditingSprintId(s.id)
                      setNewGoal(s.goal)
                      setStartDate(s.start_date)
                      setEndDate(s.end_date)
                      setDeliverables(s.deliverables || '')
                      setIsModalOpen(true)
                    }}>
                      <Edit2 className="h-4 w-4 text-slate-400 hover:text-blue-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => triggerDelete(s.id)}>
                      <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
                    </Button>
                    {projectId && (
                      <Button variant="outline" size="sm" onClick={() => addToGantt(s)} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/30">
                        <BarChart className="h-4 w-4 mr-2" /> Add to GChart
                      </Button>
                    )}
                    {!projectId && (
                      <Button variant="outline" size="sm" onClick={() => setAssignModal({ open: true, sprintId: s.id })} className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/30">
                        <FolderInput className="h-4 w-4 mr-2" /> Assign to Project
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => requestApproval(s.id)}>
                      <Send className="h-4 w-4 mr-2" /> Request Approval
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {sprints.length === 0 && !loading && (
              <div className="text-center py-12 text-slate-500">
                No sprints planned. Create one above!
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog 
        open={deleteDialog.open}
        title="Delete Sprint"
        message="Are you sure you want to delete this sprint? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteDialog({ open: false, id: null })}
      />
    </div>
  )
}
