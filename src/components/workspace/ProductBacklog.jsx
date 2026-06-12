import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { ArrowLeft, Plus, Trash2, CheckCheck, Send, CheckCircle, Edit2 } from 'lucide-react'
import ConfirmDialog from '@/components/ui/confirm-dialog'

export default function ProductBacklog() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [features, setFeatures] = useState([])
  const [shareStatus, setShareStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingFeatureId, setEditingFeatureId] = useState(null)
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null })

  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPriority, setNewPriority] = useState('Medium')
  const [newEst, setNewEst] = useState('')

  useEffect(() => {
    loadFeatures()
  }, [])

  const loadFeatures = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('features')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      if (error.message.includes('relation "features" does not exist')) {
        addToast("Please run the SQL migration script in Supabase first.", "error")
      } else {
        addToast("Failed to load backlog", "error")
      }
    } else {
      setFeatures(data || [])
      
      const { data: appDataList } = await supabase
        .from('approvals')
        .select('status, created_at')
        .eq('target_type', 'product_backlog')
        .eq('requester_id', user.id)
        .eq('target_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        
      if (appDataList && appDataList.length > 0) {
        setShareStatus(appDataList[0])
      }
    }
    setLoading(false)
  }

  const handleSaveFeature = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    if (editingFeatureId) {
      const { data, error } = await supabase.from('features').update({
        title: newTitle,
        description: newDesc,
        priority: newPriority,
        estimation: newEst
      }).eq('id', editingFeatureId).select().single()

      if (error) {
        addToast(error.message, "error")
        return
      }

      setFeatures(features.map(f => f.id === editingFeatureId ? data : f))
      addToast("Feature updated", "success")
    } else {
      const { data, error } = await supabase.from('features').insert({
        title: newTitle,
        description: newDesc,
        priority: newPriority,
        estimation: newEst,
        user_id: user.id
      }).select().single()

      if (error) {
        addToast(error.message, "error")
        return
      }

      setFeatures([data, ...features])
      addToast("Feature added to backlog", "success")
    }

    resetForm()
  }

  const resetForm = () => {
    setEditingFeatureId(null)
    setNewTitle('')
    setNewDesc('')
    setNewPriority('Medium')
    setNewEst('')
  }

  const triggerDelete = (id) => {
    setDeleteDialog({ open: true, id })
  }

  const confirmDelete = async () => {
    if (!deleteDialog.id) return
    const id = deleteDialog.id
    
    const { error } = await supabase.from('features').delete().eq('id', id)
    if (!error) {
      setFeatures(features.filter(f => f.id !== id))
      addToast("Feature deleted", "success")
    }
    setDeleteDialog({ open: false, id: null })
  }

  return (
    <div className="min-h-screen bg-[#f7f6f3] dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link to="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            Product Backlog
            {shareStatus && (
              <div title={`Latest Share: ${shareStatus.status}`} className="flex items-center gap-1 text-sm font-normal text-slate-500 bg-white dark:bg-slate-800 px-3 py-1 rounded-full shadow-sm border border-slate-100 dark:border-slate-700">
                <span className="text-[10px]">Shared {new Date(shareStatus.created_at).toLocaleDateString()}</span>
                <CheckCheck className={`h-4 w-4 ${shareStatus.status === 'Read' ? 'text-blue-500' : 'text-slate-400'}`} />
              </div>
            )}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Manage your master list of features and prioritize tasks.</p>
        </div>

        <Card className="mb-8 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800">
          <CardContent className="pt-6">
            <form onSubmit={handleSaveFeature} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <Input 
                    placeholder="Feature Title" 
                    value={newTitle} 
                    onChange={e => setNewTitle(e.target.value)} 
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <select 
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus-visible:ring-slate-300"
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>
                <div>
                  <Input 
                    placeholder="Estimate (e.g. 3 days)" 
                    value={newEst} 
                    onChange={e => setNewEst(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <Textarea 
                placeholder="Feature Description" 
                value={newDesc} 
                onChange={e => setNewDesc(e.target.value)}
                className="rounded-xl"
              />
              <div className="flex justify-end gap-2">
                {editingFeatureId && (
                  <Button type="button" variant="outline" className="rounded-xl" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
                <Button type="submit" className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                  {editingFeatureId ? <CheckCircle className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  {editingFeatureId ? "Update Feature" : "Add Feature"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-8">Loading backlog...</div>
        ) : (
          <div className="space-y-4">
            {features.map(f => (
              <Card key={f.id} className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50">
                <CardContent className="p-4 flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-3">
                      {f.title}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        f.priority === 'High' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        f.priority === 'Medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {f.priority}
                      </span>
                    </h3>
                    {f.description && <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 whitespace-pre-wrap">{f.description}</p>}
                    {f.estimation && <p className="text-slate-400 text-xs mt-2 font-mono">Estimate: {f.estimation}</p>}
                  </div>
                  <div className="flex gap-1 items-center">
                    <Button variant="ghost" size="icon" onClick={() => {
                      setEditingFeatureId(f.id)
                      setNewTitle(f.title)
                      setNewDesc(f.description || '')
                      setNewPriority(f.priority)
                      setNewEst(f.estimation || '')
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}>
                      <Edit2 className="h-4 w-4 text-slate-400 hover:text-blue-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => triggerDelete(f.id)}>
                      <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {features.length === 0 && !loading && (
              <div className="text-center py-12 text-slate-500">
                No features in backlog yet. Add one above!
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog 
        open={deleteDialog.open}
        title="Delete Feature"
        message="Are you sure you want to delete this feature? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteDialog({ open: false, id: null })}
      />
    </div>
  )
}
