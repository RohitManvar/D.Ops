import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { ArrowLeft, Plus, MoveRight } from 'lucide-react'

const STAGES = ['To Do', 'In Progress', 'Testing', 'Done']
const EXECUTION_STAGES = ['Requirement', 'Design', 'Development', 'Testing', 'Bug Fixing', 'Deployment', 'Documentation']

export default function KanbanBoard() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const [newTaskTitle, setNewTaskTitle] = useState('')

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (!error) {
      setTasks(data || [])
    }
    setLoading(false)
  }

  const handleAddTask = async (e) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    const { data, error } = await supabase.from('tasks').insert({
      title: newTaskTitle,
      status: 'To Do',
      execution_stage: 'Requirement',
      user_id: user.id
    }).select().single()

    if (error) {
      addToast(error.message, "error")
      return
    }

    setTasks([data, ...tasks])
    setNewTaskTitle('')
    addToast("Task added to Kanban", "success")
  }

  const updateTaskStatus = async (id, newStatus) => {
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', id)
    if (!error) {
      setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t))
    }
  }

  const updateExecutionStage = async (id, newStage) => {
    const { error } = await supabase.from('tasks').update({ execution_stage: newStage }).eq('id', id)
    if (!error) {
      setTasks(tasks.map(t => t.id === id ? { ...t, execution_stage: newStage } : t))
    }
  }

  const renderColumn = (status) => {
    const columnTasks = tasks.filter(t => t.status === status)
    
    return (
      <div key={status} className="flex-1 min-w-[280px] bg-slate-100 dark:bg-slate-800/30 rounded-2xl p-4">
        <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4 flex justify-between items-center">
          {status}
          <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs px-2 py-1 rounded-full">
            {columnTasks.length}
          </span>
        </h3>
        
        <div className="space-y-3">
          {columnTasks.map(t => (
            <Card key={t.id} className="rounded-xl border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 shadow-sm">
              <CardContent className="p-3">
                <p className="font-medium text-slate-900 dark:text-slate-100 text-sm mb-2">{t.title}</p>
                
                <div className="flex items-center justify-between gap-2">
                  <select 
                    value={t.execution_stage}
                    onChange={(e) => updateExecutionStage(t.id, e.target.value)}
                    className="text-[10px] h-6 rounded border border-slate-200 bg-slate-50 px-1 dark:border-slate-700 dark:bg-slate-900"
                  >
                    {EXECUTION_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>

                  <select
                    value={t.status}
                    onChange={(e) => updateTaskStatus(t.id, e.target.value)}
                    className="text-[10px] h-6 rounded border border-blue-200 bg-blue-50 text-blue-700 px-1 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-400"
                  >
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </CardContent>
            </Card>
          ))}
          {columnTasks.length === 0 && (
            <div className="text-center py-6 text-xs text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
              No tasks
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f6f3] dark:bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link to="/">
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Execution Board</h1>
            <p className="text-slate-500 dark:text-slate-400">Track daily workflow across execution stages.</p>
          </div>
          
          <form onSubmit={handleAddTask} className="flex items-center gap-2">
            <Input 
              placeholder="Quick add task..." 
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              className="w-64 rounded-xl"
            />
            <Button type="submit" className="rounded-xl">
              <Plus className="h-4 w-4" />
            </Button>
          </form>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading tasks...</div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STAGES.map(renderColumn)}
          </div>
        )}
      </div>
    </div>
  )
}
