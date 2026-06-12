import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, FolderKanban, Calendar, Trash2, Edit2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { containerVariants, itemVariants } from '@/lib/animations';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthProvider';
import { useToast } from '@/components/ui/toast';

export default function ProjectList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', company: '', startDate: '' });
  const [editingProject, setEditingProject] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', company: '', startDate: '' });

  useEffect(() => {
    if (user) fetchProjects();
  }, [user]);

  const fetchProjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('gantt_projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      addToast(error.message, "error");
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newProject.name) return;
    
    const payload = {
      user_id: user.id,
      name: newProject.name,
      company: newProject.company || 'Internal',
      start_date: newProject.startDate || new Date().toISOString().split('T')[0]
    };

    const { data, error } = await supabase.from('gantt_projects').insert(payload).select().single();
    if (error) {
      addToast("Failed to create project: " + error.message, "error");
    } else {
      // Also create an empty task list entry for it
      await supabase.from('gantt_data').insert({
        project_id: data.id,
        user_id: user.id,
        tasks_json: []
      });
      
      setProjects([data, ...projects]);
      setShowNew(false);
      navigate(`/project-gantt/${data.id}`);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    e.preventDefault();
    if (confirm("Are you sure you want to delete this project? All associated tasks will be lost.")) {
      const { error } = await supabase.from('gantt_projects').delete().eq('id', id);
      if (error) {
        addToast("Error deleting project", "error");
      } else {
        setProjects(projects.filter(p => p.id !== id));
      }
    }
  };

  const handleStartEdit = (e, proj) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingProject(proj.id);
    setEditForm({ name: proj.name, company: proj.company, startDate: proj.start_date });
  };

  const handleSaveEdit = async (e, id) => {
    e.stopPropagation();
    e.preventDefault();
    if (!editForm.name) return;
    
    const payload = {
      name: editForm.name,
      company: editForm.company,
      start_date: editForm.startDate
    };

    const { error } = await supabase.from('gantt_projects').update(payload).eq('id', id);
    if (error) {
      addToast("Failed to update project", "error");
    } else {
      setProjects(projects.map(p => p.id === id ? { ...p, ...payload } : p));
    }
    setEditingProject(null);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 md:p-8 transition-colors duration-300 font-sans">
      <div className="max-w-5xl mx-auto pt-10">
        <div className="mb-10 flex items-start justify-between">
          <div>
            <Link to="/">
              <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2">Projects</h1>
            <p className="text-slate-500 dark:text-slate-400">Select a project to view its Gantt chart, or create a new one.</p>
          </div>
          <Button onClick={() => setShowNew(!showNew)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm">
            <Plus className="h-4 w-4 mr-2" /> Create Project
          </Button>
        </div>

        {showNew && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold mb-4">New Project Details</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Project Name *</label>
                <input required autoFocus value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Website Redesign" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Company / Client</label>
                <input value={newProject.company} onChange={e => setNewProject({...newProject, company: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Acme Corp" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input type="date" value={newProject.startDate} onChange={e => setNewProject({...newProject, startDate: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="md:col-span-3 flex justify-end gap-2 mt-2">
                <Button type="button" variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">Save & Continue</Button>
              </div>
            </form>
          </motion.div>
        )}

        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.length === 0 && !showNew ? (
              <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                <FolderKanban className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">No projects yet</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1 mb-4">Create your first project to start planning.</p>
                <Button onClick={() => setShowNew(true)} variant="outline" className="rounded-xl">Create Project</Button>
              </div>
            ) : (
              projects.map(proj => (
                <motion.div key={proj.id} variants={itemVariants}>
                  {editingProject === proj.id ? (
                    <div className="h-full p-6 bg-white dark:bg-slate-800 border border-blue-500 dark:border-blue-500 rounded-3xl shadow-md">
                      <h3 className="font-semibold mb-3">Edit Project</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium mb-1">Project Name *</label>
                          <input required autoFocus value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full px-2 py-1.5 text-sm border rounded bg-white dark:bg-slate-900 dark:border-slate-700" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">Company / Client</label>
                          <input value={editForm.company} onChange={e => setEditForm({...editForm, company: e.target.value})} className="w-full px-2 py-1.5 text-sm border rounded bg-white dark:bg-slate-900 dark:border-slate-700" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">Start Date</label>
                          <input type="date" value={editForm.startDate} onChange={e => setEditForm({...editForm, startDate: e.target.value})} className="w-full px-2 py-1.5 text-sm border rounded bg-white dark:bg-slate-900 dark:border-slate-700" />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                        <Button variant="ghost" size="sm" onClick={() => setEditingProject(null)}>Cancel</Button>
                        <Button size="sm" onClick={(e) => handleSaveEdit(e, proj.id)} className="bg-blue-600 hover:bg-blue-700 text-white">Save</Button>
                      </div>
                    </div>
                  ) : (
                    <Link to={`/project-gantt/${proj.id}`} className="block h-full group">
                      <div className="h-full p-6 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors duration-300 rounded-3xl relative overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md">
                        <div>
                          <div className="flex items-start justify-between mb-4">
                            <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-500">
                              <FolderKanban className="h-5 w-5" />
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => handleStartEdit(e, proj)} className="text-slate-300 hover:text-blue-500 p-1">
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button onClick={(e) => handleDelete(e, proj.id)} className="text-slate-300 hover:text-red-500 p-1">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight mb-1">{proj.name}</h2>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{proj.company}</p>
                        </div>
                        <div className="flex items-center text-xs text-slate-400 dark:text-slate-500 font-medium">
                          <Calendar className="h-3.5 w-3.5 mr-1.5" /> Start: {new Date(proj.start_date).toLocaleDateString()}
                        </div>
                      </div>
                    </Link>
                  )}
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
