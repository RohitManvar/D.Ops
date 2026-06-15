import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Calendar, Check, X, Plus, Trash2, Layers, Edit2, GripVertical } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthProvider';
import { useToast } from '@/components/ui/toast';
import { containerVariants } from '@/lib/animations';

import { 
  DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, 
  useSensor, useSensors, defaultDropAnimationSideEffects 
} from '@dnd-kit/core';
import { 
  SortableContext, arrayMove, sortableKeyboardCoordinates, 
  verticalListSortingStrategy, useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const STATUS_OPTIONS = ['Pending', 'Ongoing', 'Progress', 'Paused', 'Completed'];

const STATUS_COLORS = {
  'Pending': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'Ongoing': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  'Progress': 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  'Paused': 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  'Completed': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
};

// --- Sortable Components ---
function SortablePhase({ phase, phaseTasksCount, editingPhase, editingPhaseName, setEditingPhase, setEditingPhaseName, handleRenamePhase, handleDeletePhase, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: `phase-${phase}`, 
    data: { type: 'Phase', phase } 
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="mb-8 last:mb-0 relative">
      <div className="bg-slate-100/80 dark:bg-slate-800/80 border-y border-slate-200 dark:border-slate-700 px-4 py-2 flex items-center sticky top-0 z-10 backdrop-blur-md shadow-sm group/phase">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing hover:bg-slate-200 dark:hover:bg-slate-700 p-1.5 rounded-lg mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <GripVertical className="w-4 h-4" />
        </div>
        <Layers className="w-4 h-4 mr-2 text-blue-500" />
        {editingPhase === phase ? (
          <form onSubmit={(e) => handleRenamePhase(phase, e)} className="flex items-center">
            <input autoFocus className="text-sm font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-2 py-0.5 outline-none focus:ring-2 ring-blue-500" value={editingPhaseName} onChange={e => setEditingPhaseName(e.target.value)} onBlur={() => setEditingPhase(null)} />
          </form>
        ) : (
          <>
            <h2 className="font-bold text-slate-700 dark:text-slate-200 text-sm">{phase}</h2>
            <span className="ml-3 px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-xs text-slate-500 font-medium">{phaseTasksCount} tasks</span>
            
            {phase !== 'General' && (
              <div className="ml-auto flex items-center gap-1 opacity-0 group-hover/phase:opacity-100 transition-opacity">
                <button onClick={() => { setEditingPhase(phase); setEditingPhaseName(phase); }} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" title="Rename Phase"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDeletePhase(phase)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" title="Delete Phase"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            )}
          </>
        )}
      </div>
      <div className="flex flex-col">
        {children}
      </div>
    </div>
  );
}

function SortableTask({ task, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: `task-${task.id}`, 
    data: { type: 'Task', task } 
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="relative group/task border-b border-slate-100 dark:border-slate-800/50 last:border-b-0 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
      <div {...attributes} {...listeners} className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-blue-500 opacity-0 group-hover/task:opacity-100 transition-opacity z-10">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="pl-6">
        {children}
      </div>
    </div>
  );
}


export default function WholeSprintTimeline() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [newTaskTitles, setNewTaskTitles] = useState({});
  
  const [customPhases, setCustomPhases] = useState(() => {
    const saved = localStorage.getItem('customPhases');
    const parsed = saved ? JSON.parse(saved) : [];
    return parsed.length > 0 ? parsed : ['General'];
  });
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');
  const [editingPhase, setEditingPhase] = useState(null);
  const [editingPhaseName, setEditingPhaseName] = useState('');

  // DnD States
  const [activeId, setActiveId] = useState(null);
  const [activeData, setActiveData] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    localStorage.setItem('customPhases', JSON.stringify(customPhases));
  }, [customPhases]);

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user?.id, projectId]);

  const fetchTasks = async () => {
    setLoading(true);
    let query = supabase.from('tasks').select('*').eq('user_id', user.id);
    
    if (projectId) {
      const { data: sprintsData } = await supabase.from('sprints').select('id').eq('project_id', projectId);
      if (sprintsData && sprintsData.length > 0) {
        const sprintIds = sprintsData.map(s => s.id);
        query = query.in('sprint_id', sprintIds);
      } else {
        setTasks([]);
        setLoading(false);
        return;
      }
    }
    
    const { data, error } = await query; // order sorting done locally now to support float index

    if (error) {
      addToast("Failed to load tasks", "error");
    } else {
      const sortedData = (data || []).sort((a,b) => {
        if (a.order_index !== b.order_index) return (a.order_index || 0) - (b.order_index || 0);
        return new Date(a.created_at) - new Date(b.created_at);
      });
      setTasks(sortedData);
      
      const dbPhases = Array.from(new Set(sortedData.map(t => t.phase || 'General')));
      setCustomPhases(prev => {
        const newPhases = [...prev];
        dbPhases.forEach(p => {
          if (!newPhases.includes(p)) newPhases.push(p);
        });
        return newPhases;
      });
    }
    setLoading(false);
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
    setActiveData(event.active.data.current);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;
    
    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === 'Task') {
      const activeTask = activeData.task;
      const overPhase = overData?.type === 'Phase' ? overData.phase : overData?.task?.phase;

      if (overPhase && activeTask.phase !== overPhase) {
        setTasks(prev => prev.map(t => t.id === activeTask.id ? { ...t, phase: overPhase } : t));
      }
    }
  };

  const handleDragEnd = async (event) => {
    setActiveId(null);
    setActiveData(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Reorder Phases
    if (activeData?.type === 'Phase' && overData?.type === 'Phase') {
      if (activeData.phase !== overData.phase) {
        const oldIndex = customPhases.indexOf(activeData.phase);
        const newIndex = customPhases.indexOf(overData.phase);
        setCustomPhases(arrayMove(customPhases, oldIndex, newIndex));
      }
      return;
    }

    // Reorder Tasks
    if (activeData?.type === 'Task') {
      const activeTask = activeData.task;
      const overTask = overData?.type === 'Task' ? overData.task : null;
      const overPhase = overData?.type === 'Phase' ? overData.phase : overData?.task?.phase;

      if (!overPhase) return;

      const overPhaseTasks = tasks.filter(t => t.phase === overPhase).sort((a,b) => (a.order_index||0) - (b.order_index||0));
      let newOrderIndex = activeTask.order_index || 0;

      if (activeTask.phase === overPhase && activeTask.id === overTask?.id) return; // Dropped in place

      // Use a new array to simulate the placement
      const newArray = overPhaseTasks.filter(t => t.id !== activeTask.id);
      let insertIndex = newArray.length;
      if (overTask) {
        insertIndex = newArray.findIndex(t => t.id === overTask.id);
        const isBelow = over.rect.top > active.rect.top;
        if (isBelow) insertIndex++;
      }

      newArray.splice(insertIndex, 0, activeTask);

      const prevTask = newArray[insertIndex - 1];
      const nextTask = newArray[insertIndex + 1];

      if (!prevTask && !nextTask) newOrderIndex = 0;
      else if (!prevTask) newOrderIndex = (nextTask.order_index || 0) - 1000;
      else if (!nextTask) newOrderIndex = (prevTask.order_index || 0) + 1000;
      else newOrderIndex = ((prevTask.order_index || 0) + (nextTask.order_index || 0)) / 2;

      // Optimistic update
      setTasks(prev => prev.map(t => t.id === activeTask.id ? { ...t, phase: overPhase, order_index: newOrderIndex } : t).sort((a,b) => (a.order_index||0) - (b.order_index||0)));

      const { error } = await supabase.from('tasks').update({ phase: overPhase, order_index: newOrderIndex }).eq('id', activeTask.id);
      if (error) {
        addToast("Error saving order: " + error.message, "error");
        fetchTasks();
      }
    }
  };

  const handleAddTask = async (e, phase) => {
    e.preventDefault();
    const title = newTaskTitles[phase] || '';
    if (!title.trim()) return;

    // Put it at the bottom of the current phase
    const phaseTasks = tasks.filter(t => t.phase === phase).sort((a,b) => (a.order_index||0) - (b.order_index||0));
    const newOrderIndex = phaseTasks.length > 0 ? (phaseTasks[phaseTasks.length - 1].order_index || 0) + 1000 : 0;

    const payload = {
      title: title.trim(),
      status: 'Pending',
      phase: phase,
      order_index: newOrderIndex,
      user_id: user.id
    };

    if (projectId) {
      const { data: sprints } = await supabase.from('sprints').select('id').eq('project_id', projectId).limit(1);
      if (sprints && sprints.length > 0) {
        payload.sprint_id = sprints[0].id;
      } else {
        const { data: newSprint } = await supabase.from('sprints').insert({ 
          goal: 'Initial Sprint', 
          project_id: projectId, 
          user_id: user.id 
        }).select().single();
        if (newSprint) {
          payload.sprint_id = newSprint.id;
        }
      }
    }

    const { data, error } = await supabase.from('tasks').insert(payload).select().single();
    if (error) {
      addToast(error.message, "error");
    } else {
      setTasks([...tasks, data]);
      setNewTaskTitles({ ...newTaskTitles, [phase]: '' });
      addToast("Task created", "success");
    }
  };

  const handleEditTask = (task) => {
    setEditingTaskId(task.id);
    setEditForm({
      title: task.title,
      status: task.status || 'Pending',
      progress: task.progress || '0%',
      start_date: task.start_date || '',
      end_date: task.end_date || ''
    });
  };

  const handleSaveTask = async (id) => {
    let finalProgress = String(editForm.progress || '0%').trim();
    if (!finalProgress.endsWith('%')) {
      const val = parseInt(finalProgress, 10);
      finalProgress = isNaN(val) ? '0%' : `${val}%`;
    }

    const payload = {
      title: editForm.title,
      status: editForm.status,
      progress: finalProgress,
      start_date: editForm.start_date || null,
      end_date: editForm.end_date || null
    };

    const { data, error } = await supabase.from('tasks').update(payload).eq('id', id).select().single();
    if (error) {
      addToast(error.message, "error");
    } else {
      setTasks(tasks.map(t => t.id === id ? data : t));
      addToast("Task updated", "success");
    }
    setEditingTaskId(null);
  };

  const handleDeleteTask = async (id) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) {
      setTasks(tasks.filter(t => t.id !== id));
      addToast("Task deleted", "success");
    } else {
      addToast(error.message, "error");
    }
  };

  const updateTaskDirectly = async (id, updates) => {
    const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).select().single();
    if (!error) {
      setTasks(tasks.map(t => t.id === id ? data : t));
      addToast("Status updated", "success");
    } else {
      addToast(error.message, "error");
    }
  };

  const handleAddPhase = (e) => {
    e.preventDefault();
    if (newPhaseName.trim() && !customPhases.includes(newPhaseName.trim())) {
      setCustomPhases([...customPhases, newPhaseName.trim()]);
      setNewPhaseName('');
      setIsAddingPhase(false);
    }
  };

  const handleRenamePhase = async (oldPhase, e) => {
    e.preventDefault();
    const newPhase = editingPhaseName.trim();
    if (!newPhase || newPhase === oldPhase) {
      setEditingPhase(null);
      return;
    }

    const { error } = await supabase.from('tasks').update({ phase: newPhase }).eq('phase', oldPhase).eq('user_id', user.id);
    if (error) {
      addToast(error.message, "error");
    } else {
      setTasks(tasks.map(t => t.phase === oldPhase ? { ...t, phase: newPhase } : t));
      if (customPhases.includes(oldPhase)) {
        setCustomPhases(customPhases.map(p => p === oldPhase ? newPhase : p));
      }
      setEditingPhase(null);
      addToast("Phase renamed", "success");
    }
  };

  const handleDeletePhase = async (phaseName) => {
    if (!window.confirm(`Are you sure you want to delete the phase "${phaseName}"? All tasks inside will be moved to "General".`)) return;

    const { error } = await supabase.from('tasks').update({ phase: 'General' }).eq('phase', phaseName).eq('user_id', user.id);
    if (error) {
      addToast(error.message, "error");
    } else {
      setTasks(tasks.map(t => t.phase === phaseName ? { ...t, phase: 'General' } : t));
      setCustomPhases(customPhases.filter(p => p !== phaseName));
      addToast("Phase deleted", "success");
    }
  };

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d)) return "-";
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  };

  const allPhases = customPhases;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f7f6f3] dark:bg-slate-900"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
  };

  return (
    <div className="min-h-screen bg-[#f7f6f3] text-slate-900 dark:bg-slate-900 dark:text-slate-100 p-4 md:p-8 font-sans transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <Link to={projectId ? `/project/${projectId}` : "/"}>
              <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-500" />
              Product Plan
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Manage tasks grouped by phases, timelines, and execution progress in one view.</p>
          </div>
        </div>

        <motion.div 
          variants={containerVariants} 
          initial="hidden" 
          animate="show"
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl rounded-2xl overflow-hidden flex flex-col"
          style={{ height: 'calc(100vh - 180px)' }}
        >
          {/* Header Row */}
          <div className="h-[60px] flex items-end px-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 sticky top-0 shadow-sm z-20 pb-3 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <div className="w-[35%] pl-7">Task</div>
            <div className="w-[15%] text-center">Status (STS)</div>
            <div className="w-[20%] text-center">Timeline & % (DT / %)</div>
            <div className="w-[25%] pl-4">Progress</div>
            <div className="w-[5%] text-center"></div>
          </div>
          
          <div className="flex-1 overflow-y-auto pb-12">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={allPhases.map(p => `phase-${p}`)} strategy={verticalListSortingStrategy}>
                {allPhases.map((phase) => {
                  const phaseTasks = tasks.filter(t => (t.phase || 'General') === phase).sort((a,b) => (a.order_index||0) - (b.order_index||0));
                  
                  return (
                    <SortablePhase 
                      key={phase} 
                      phase={phase} 
                      phaseTasksCount={phaseTasks.length}
                      editingPhase={editingPhase}
                      editingPhaseName={editingPhaseName}
                      setEditingPhase={setEditingPhase}
                      setEditingPhaseName={setEditingPhaseName}
                      handleRenamePhase={handleRenamePhase}
                      handleDeletePhase={handleDeletePhase}
                    >
                      <SortableContext items={phaseTasks.map(t => `task-${t.id}`)} strategy={verticalListSortingStrategy}>
                        {phaseTasks.map((task) => {
                          const isEditing = editingTaskId === task.id;
                          let progStr = task.progress || '0%';
                          if (!progStr.endsWith('%')) {
                            const val = parseInt(progStr);
                            if (!isNaN(val)) progStr = `${val}%`;
                          }
                          const hasTimeline = task.start_date && task.end_date;

                          return (
                            <SortableTask key={task.id} task={task}>
                              <div className="min-h-[64px] flex items-center px-6">
                                {isEditing ? (
                                  <div className="flex w-full gap-4 items-center py-2" onKeyDown={e => e.key === 'Enter' && handleSaveTask(task.id)}>
                                    <div className="w-[35%]">
                                      <input autoFocus className="w-full text-sm px-3 py-2 border rounded-xl bg-white dark:bg-slate-800 dark:border-slate-600 focus:ring-2 ring-blue-500 outline-none shadow-sm" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} placeholder="Task title..." />
                                    </div>
                                    <div className="w-[15%]">
                                      <select className="w-full text-sm px-2 py-2 border rounded-xl bg-white dark:bg-slate-800 dark:border-slate-600 focus:ring-2 ring-blue-500 outline-none shadow-sm" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                      </select>
                                    </div>
                                    <div className="w-[20%] flex flex-col gap-1">
                                      <div className="flex gap-1">
                                        <input type="date" className="w-1/2 text-[10px] px-1 py-1.5 border rounded bg-white dark:bg-slate-800 dark:border-slate-600 focus:ring-2 ring-blue-500 outline-none" value={editForm.start_date} onChange={e => setEditForm({...editForm, start_date: e.target.value})} />
                                        <input type="date" className="w-1/2 text-[10px] px-1 py-1.5 border rounded bg-white dark:bg-slate-800 dark:border-slate-600 focus:ring-2 ring-blue-500 outline-none" value={editForm.end_date} onChange={e => setEditForm({...editForm, end_date: e.target.value})} />
                                      </div>
                                      <input className="w-full text-xs px-2 py-1.5 border rounded bg-white dark:bg-slate-800 dark:border-slate-600 text-center focus:ring-2 ring-blue-500 outline-none" value={editForm.progress} onChange={e => setEditForm({...editForm, progress: e.target.value})} placeholder="0%" />
                                    </div>
                                    <div className="w-[25%] flex items-center justify-center text-xs text-slate-400 italic">
                                      Editing...
                                    </div>
                                    <div className="w-[5%] flex flex-col justify-center items-end gap-1 pr-2">
                                      <button onClick={() => handleSaveTask(task.id)} className="text-emerald-600 hover:bg-emerald-100 p-1.5 rounded-lg"><Check className="w-5 h-5" /></button>
                                      <button onClick={() => setEditingTaskId(null)} className="text-slate-500 hover:bg-slate-200 p-1.5 rounded-lg"><X className="w-5 h-5" /></button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex w-full gap-4 items-center cursor-pointer py-2" onDoubleClick={() => handleEditTask(task)}>
                                    <div className="w-[35%] font-medium text-slate-800 dark:text-slate-200 pr-4" title={task.title}>
                                      {task.title}
                                    </div>
                                    
                                    <div className="w-[15%] flex justify-center">
                                      <select 
                                        className={`text-xs px-3 py-1 rounded-full font-semibold outline-none appearance-none cursor-pointer border border-transparent hover:border-slate-300 dark:hover:border-slate-600 text-center shadow-sm ${STATUS_COLORS[task.status] || STATUS_COLORS['Pending']}`}
                                        value={task.status || 'Pending'}
                                        onChange={(e) => updateTaskDirectly(task.id, { status: e.target.value })}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                      </select>
                                    </div>

                                    <div className="w-[20%] flex flex-col items-center justify-center">
                                      <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                        {hasTimeline ? `${formatDateLabel(task.start_date)} - ${formatDateLabel(task.end_date)}` : <span className="text-slate-400 italic">No dates</span>}
                                      </div>
                                      <div className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                                        {progStr}
                                      </div>
                                    </div>

                                    <div className="w-[25%] pr-4 flex items-center">
                                      {hasTimeline ? (
                                        <div className="w-full h-8 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden relative shadow-inner">
                                          <div 
                                            className={`h-full transition-all duration-700 ease-out flex items-center justify-end pr-2 ${parseInt(progStr) === 100 ? 'bg-emerald-500' : 'bg-blue-500'} relative`}
                                            style={{ width: progStr }}
                                          >
                                            {parseInt(progStr) >= 15 && (
                                              <span className="text-[11px] font-bold text-white drop-shadow-md">
                                                {progStr}
                                              </span>
                                            )}
                                            {parseInt(progStr) > 0 && parseInt(progStr) < 15 && (
                                              <span className="absolute left-full ml-2 text-[11px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                {progStr}
                                              </span>
                                            )}
                                          </div>
                                          {parseInt(progStr) === 0 && (
                                            <div className="absolute inset-0 flex items-center px-2">
                                              <span className="text-[11px] font-bold text-slate-400">0%</span>
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="w-full h-8 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex items-center justify-center opacity-50">
                                          <span className="text-[10px] text-slate-400">Add timeline to view</span>
                                        </div>
                                      )}
                                    </div>

                                    <div className="w-[5%] flex justify-end pr-2 opacity-0 group-hover/task:opacity-100 transition-opacity">
                                      <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-lg transition-colors" title="Delete Task">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </SortableTask>
                          );
                        })}
                      </SortableContext>
                      
                      {/* Add Task Row for this Phase */}
                      <div className="min-h-[50px] px-6 flex items-center bg-transparent border-t border-slate-100 dark:border-slate-800/50">
                        <form onSubmit={(e) => handleAddTask(e, phase)} className="flex items-center w-full max-w-md gap-3 group">
                          <button type="submit" className="text-slate-300 hover:text-blue-500 group-focus-within:text-blue-500 transition-colors ml-6">
                            <Plus className="w-4 h-4" />
                          </button>
                          <input 
                            type="text" 
                            placeholder={`Add new task to ${phase}...`} 
                            className="flex-1 text-sm bg-transparent border-none focus:ring-0 outline-none placeholder:text-slate-400 dark:text-slate-200"
                            value={newTaskTitles[phase] || ''}
                            onChange={(e) => setNewTaskTitles({...newTaskTitles, [phase]: e.target.value})}
                          />
                          <Button type="submit" size="sm" variant="ghost" className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 opacity-0 group-focus-within:opacity-100 transition-opacity">
                            Add
                          </Button>
                        </form>
                      </div>
                    </SortablePhase>
                  );
                })}
              </SortableContext>

              <DragOverlay dropAnimation={dropAnimation}>
                {activeData?.type === 'Phase' ? (
                  <div className="bg-slate-100/90 dark:bg-slate-800/90 border border-blue-500 shadow-2xl rounded-lg px-4 py-3 flex items-center opacity-80">
                    <Layers className="w-4 h-4 mr-2 text-blue-500" />
                    <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{activeData.phase}</span>
                  </div>
                ) : activeData?.type === 'Task' ? (
                  <div className="bg-white dark:bg-slate-900 border border-blue-500 shadow-2xl rounded-lg px-4 py-3 flex items-center opacity-90 w-[800px]">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{activeData.task.title}</span>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>

            {/* Add New Phase Section */}
            <div className="px-6 py-6 border-t border-slate-200 dark:border-slate-700 mt-4">
              {isAddingPhase ? (
                <form onSubmit={handleAddPhase} className="flex items-center gap-3">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Phase name (e.g. Design, Sprint 1)"
                    className="text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                    value={newPhaseName}
                    onChange={(e) => setNewPhaseName(e.target.value)}
                  />
                  <Button type="submit" size="sm" className="bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl">Save</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setIsAddingPhase(false)}>Cancel</Button>
                </form>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setIsAddingPhase(true)} className="rounded-xl border-dashed border-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <Plus className="w-4 h-4 mr-2" /> Add New Phase
                </Button>
              )}
            </div>
            
          </div>
        </motion.div>
      </div>
    </div>
  );
}
