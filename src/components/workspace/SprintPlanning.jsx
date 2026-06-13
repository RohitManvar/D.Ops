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
import { ArrowLeft, Plus, CheckCircle, Send, CheckCheck, Trash2, Edit2, BarChart } from 'lucide-react'
import ConfirmDialog from '@/components/ui/confirm-dialog'

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}-${month}-${year}`;
}

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

  const [newGoal, setNewGoal] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [deliverables, setDeliverables] = useState('')

  useEffect(() => {
    loadSprints()
  }, [])

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

  const handleSaveSprint = async (e) => {
    e.preventDefault()
    if (!newGoal.trim() || !startDate || !endDate) return

    if (editingSprintId) {
      const { data, error } = await supabase.from('sprints').update({
        goal: newGoal,
        start_date: startDate,
        end_date: endDate,
        deliverables
      }).eq('id', editingSprintId).select().single()

      if (error) {
        addToast(error.message, "error")
        return
      }

      const updatedSprints = sprints.map(s => s.id === editingSprintId ? data : s)
      setSprints(updatedSprints.sort((a, b) => new Date(b.start_date) - new Date(a.start_date)))
      addToast("Sprint updated", "success")
    } else {
      const payload = {
        goal: newGoal,
        start_date: startDate,
        end_date: endDate,
        deliverables,
        user_id: user.id
      }
      
      if (projectId) {
        payload.project_id = projectId
      }

      const { data, error } = await supabase.from('sprints').insert(payload).select().single()

      if (error) {
        addToast(error.message, "error")
        return
      }

      const newSprints = [data, ...sprints]
      setSprints(newSprints.sort((a, b) => new Date(b.start_date) - new Date(a.start_date)))
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
          <Button onClick={() => setIsModalOpen(true)} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white self-start md:self-auto shadow-md">
            <Plus className="h-4 w-4 mr-2" /> Create Sprint
          </Button>
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
      </AnimatePresence>

        {loading ? (
          <div className="text-center py-8">Loading sprints...</div>
        ) : (
          <div className="space-y-4">
            {sprints.map(s => (
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
                        {formatDate(s.start_date)} to {formatDate(s.end_date)}
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
