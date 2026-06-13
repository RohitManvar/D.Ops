import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit2, Trash2, Check, Plus, X, Loader2, Star, CheckCheck, Flag } from 'lucide-react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { containerVariants, itemVariants } from '@/lib/animations';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthProvider';
import { useToast } from '@/components/ui/toast';
import ConfirmDialog from '@/components/ui/confirm-dialog';

const categoryColors = [
  { color: "bg-purple-200", barColor: "bg-purple-300", textColor: "text-purple-900" },
  { color: "bg-pink-200", barColor: "bg-pink-300", textColor: "text-pink-900" },
  { color: "bg-blue-200", barColor: "bg-blue-300", textColor: "text-blue-900" },
  { color: "bg-yellow-200", barColor: "bg-yellow-300", textColor: "text-yellow-900" },
  { color: "bg-emerald-200", barColor: "bg-emerald-300", textColor: "text-emerald-900" },
];

export default function ProjectGanttChart() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { addToast } = useToast();

  const sourceTab = new URLSearchParams(location.search).get('from') || 'project_gantt';

  const [loading, setLoading] = useState(true);
  const [projectInfo, setProjectInfo] = useState({ name: 'Project Timeline', company: 'Interactive Gantt Chart' });
  const [data, setData] = useState([]);
  const [history, setHistory] = useState([]);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [editingTask, setEditingTask] = useState(null); // { catId, taskId }
  const [editingCat, setEditingCat] = useState(null); // catId
  const [editForm, setEditForm] = useState({});
  const [dragInfo, setDragInfo] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, type: null, catId: null, taskId: null, title: '', message: '' });

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, []);

  useEffect(() => {
    if (user && projectId) {
      fetchData();
    }
  }, [user?.id, projectId]);

  const fetchData = async () => {
    setLoading(true);
    // Fetch project info
    const { data: projData, error: projErr } = await supabase
      .from('gantt_projects')
      .select('*')
      .eq('id', projectId)
      .single();
    
    if (projData) setProjectInfo(projData);

    const isReviewer = user && projData && user.id !== projData.user_id;
    setIsReadOnly(isReviewer);

    // Fetch gantt tasks
    const { data: taskData, error: taskErr } = await supabase
      .from('gantt_data')
      .select('tasks_json')
      .eq('project_id', projectId)
      .single();

    if (taskData && taskData.tasks_json) {
      setData(taskData.tasks_json);
    } else {
      setData([]);
    }
    setLoading(false);
  };

  const saveData = async (newData, addToHistory = true) => {
    if (addToHistory) {
      setHistory(prev => [...prev, data].slice(-20)); // keep last 20 actions
    }
    setData(newData);
    const { error } = await supabase
      .from('gantt_data')
      .update({ tasks_json: newData, updated_at: new Date().toISOString() })
      .eq('project_id', projectId);
    
    if (error) {
      addToast("Failed to save changes", "error");
    }
  };

  const handleUndo = () => {
    if (history.length === 0 || isReadOnly) return;
    const previousData = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    saveData(previousData, false);
    addToast("Action undone", "success");
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, isReadOnly, data]);

  const { minDate, maxDate, totalWeeks, weeks, daysInWeek, dayLetters, actualDurationStr } = useMemo(() => {
    let minD = new Date();
    if (projectInfo.start_date) {
      minD = new Date(projectInfo.start_date);
    }
    let maxD = new Date(minD);
    maxD.setDate(maxD.getDate() + 30); // Default to a month
    let hasDates = false;

    data.forEach(c => {
      c.tasks.forEach(t => {
        if (t.start && t.end) {
          const s = new Date(t.start);
          const e = new Date(t.end);
          if (!isNaN(s) && !isNaN(e)) {
            if (!hasDates || s < minD) minD = s;
            if (!hasDates || e > maxD) maxD = e;
            hasDates = true;
          }
        }
      });
    });

    // align minDate to previous Monday
    const startDay = minD.getDay();
    const diff = minD.getDate() - startDay + (startDay === 0 ? -6 : 1);
    const projectStart = new Date(minD.setDate(diff));
    projectStart.setHours(0,0,0,0);

    // Ensure at least some weeks pad at the end
    const endPad = new Date(maxD);
    endPad.setDate(endPad.getDate() + 14); // 2 weeks padding
    
    const msPerWeek = 1000 * 60 * 60 * 24 * 7;
    let tWeeks = Math.ceil((endPad - projectStart) / msPerWeek);
    if (tWeeks < 4) tWeeks = 4; // Minimum 4 weeks

    const w = [];
    let curD = new Date(projectStart);
    for (let i = 0; i < tWeeks; i++) {
      const wd = new Date(curD);
      wd.setDate(wd.getDate() + 1); // Display the Tuesday as start of week to match original UI logic, or Monday
      w.push(wd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
      curD.setDate(curD.getDate() + 7);
    }

    const actualDays = Math.floor((maxD - minD) / (1000 * 60 * 60 * 24)) + 1;
    let actualDurationStr = "0 Days";
    if (hasDates) {
      const w = Math.floor(actualDays / 7);
      const d = actualDays % 7;
      const parts = [];
      if (w > 0) parts.push(`${w} Week${w > 1 ? 's' : ''}`);
      if (d > 0) parts.push(`${d} Day${d > 1 ? 's' : ''}`);
      if (parts.length > 0) {
        actualDurationStr = parts.join(' ');
      }
    }

    return { 
      minDate: projectStart, 
      maxDate: endPad, 
      totalWeeks: tWeeks, 
      actualDurationStr,
      weeks: w,
      daysInWeek: 7,
      dayLetters: ['M', 'T', 'W', 'T', 'F', 'S', 'S']
    };
  }, [data, projectInfo]);

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d)) return "-";
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).replace(' ', '-');
  };

  const getBarStyles = (startStr, endStr) => {
    if (!startStr || !endStr) return null;
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start) || isNaN(end)) return null;

    const msPerDay = 1000 * 60 * 60 * 24;
    const diffStartDays = Math.floor((start - minDate) / msPerDay);
    const durationDays = Math.floor((end - start) / msPerDay) + 1;

    const totalDays = totalWeeks * daysInWeek;
    const widthPct = (durationDays / totalDays) * 100;
    const leftPct = (diffStartDays / totalDays) * 100;

    return { left: `${leftPct}%`, width: `${widthPct}%` };
  };

  // --- Actions ---

  const handleEditTask = (catId, task) => {
    setEditingTask({ catId, taskId: task.id });
    setEditForm({ ...task });
  };

  const handleSaveTask = (catId) => {
    let finalProgress = String(editForm.progress || '0%').trim();
    if (!finalProgress.endsWith('%')) {
      const val = parseInt(finalProgress, 10);
      finalProgress = isNaN(val) ? '0%' : `${val}%`;
    }

    const finalTask = { ...editForm, progress: finalProgress };

    saveData(data.map(c => {
      if (c.id === catId) {
        return { ...c, tasks: c.tasks.map(t => t.id === finalTask.id ? finalTask : t) };
      }
      return c;
    }));
    setEditingTask(null);
  };

  const handleDeleteTask = (catId, taskId) => {
    setDeleteDialog({
      open: true,
      type: 'task',
      catId,
      taskId,
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task? This action cannot be undone.'
    });
  };

  const confirmDelete = () => {
    if (deleteDialog.type === 'task') {
      saveData(data.map(c => {
        if (c.id === deleteDialog.catId) {
          return { ...c, tasks: c.tasks.filter(t => t.id !== deleteDialog.taskId) };
        }
        return c;
      }));
      setEditingTask(null);
    } else if (deleteDialog.type === 'category') {
      saveData(data.filter(c => c.id !== deleteDialog.catId));
    }
    setDeleteDialog({ open: false, type: null, catId: null, taskId: null, title: '', message: '' });
  };

  const handleContextMenuAction = (action) => {
    if (!contextMenu) return;
    const { type, catId, taskId } = contextMenu;

    let newData = [...data];

    if (type === 'category') {
      newData = newData.map(c => {
        if (c.id === catId) {
          if (action === 'star') return { ...c, star: !c.star };
          if (action === 'flag') return { ...c, flag: !c.flag };
          if (action === 'complete') {
            return { ...c, tasks: c.tasks.map(t => ({ ...t, progress: '100%' })) };
          }
        }
        return c;
      });
    } else if (type === 'task') {
      newData = newData.map(c => {
        if (c.id === catId) {
          return {
            ...c,
            tasks: c.tasks.map(t => {
              if (t.id === taskId) {
                if (action === 'star') return { ...t, star: !t.star };
                if (action === 'flag') return { ...t, flag: !t.flag };
                if (action === 'complete') return { ...t, progress: '100%' };
              }
              return t;
            })
          };
        }
        return c;
      });
    }

    saveData(newData);
    setContextMenu(null);
  };

  const handleAddTask = (catId) => {
    const newTask = {
      id: "t" + Date.now(),
      name: "New Task",
      progress: "0%",
      start: new Date().toISOString().split('T')[0],
      end: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    };
    const newData = data.map(c => {
      if (c.id === catId) {
        return { ...c, tasks: [...c.tasks, newTask] };
      }
      return c;
    });
    saveData(newData);
    setEditingTask({ catId, taskId: newTask.id });
    setEditForm({ ...newTask });
  };

  const handleAddCategory = () => {
    const c = categoryColors[data.length % categoryColors.length];
    const newCat = {
      id: "cat-" + Date.now(),
      category: "New Phase",
      ...c,
      tasks: []
    };
    saveData([...data, newCat]);
    setEditingCat(newCat.id);
    setEditForm({ category: newCat.category });
  };

  const handleDeleteCategory = (catId) => {
    setDeleteDialog({
      open: true,
      type: 'category',
      catId,
      taskId: null,
      title: 'Delete Phase',
      message: 'Are you sure you want to delete this entire phase and all its tasks? This action cannot be undone.'
    });
  };

  const handleSaveCategory = (catId) => {
    saveData(data.map(c => c.id === catId ? { ...c, category: editForm.category } : c));
    setEditingCat(null);
  };

  const handleDragStartNative = (e, info) => {
    if (isReadOnly) return;
    setDragInfo(info);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', info.type);
    setTimeout(() => {
      e.target.classList.add('opacity-50');
    }, 0);
  };

  const handleDragEndNative = (e) => {
    e.target.classList.remove('opacity-50');
    setDragInfo(null);
  };

  const handleDragOverNative = (e) => {
    e.preventDefault(); 
  };

  const handleDropNative = (e, targetInfo) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragInfo || isReadOnly) {
      setDragInfo(null);
      return;
    }

    let newData = JSON.parse(JSON.stringify(data)); 

    if (dragInfo.type === 'category' && targetInfo.type === 'category') {
      const [movedCat] = newData.splice(dragInfo.index, 1);
      newData.splice(targetInfo.index, 0, movedCat);
    } 
    else if (dragInfo.type === 'task' && targetInfo.type === 'task') {
      const sourceCat = newData[dragInfo.catIndex];
      const [movedTask] = sourceCat.tasks.splice(dragInfo.taskIndex, 1);
      const targetCat = newData[targetInfo.catIndex];
      targetCat.tasks.splice(targetInfo.taskIndex, 0, movedTask);
    }
    else if (dragInfo.type === 'task' && targetInfo.type === 'category') {
      const sourceCat = newData[dragInfo.catIndex];
      const [movedTask] = sourceCat.tasks.splice(dragInfo.taskIndex, 1);
      const targetCat = newData[targetInfo.index];
      targetCat.tasks.push(movedTask);
    }

    saveData(newData);
    setDragInfo(null);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 p-4 md:p-8 transition-colors duration-300 font-sans">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <Link to={isReadOnly ? `/reviewer?tab=${sourceTab}` : `/project/${projectId}`}>
              <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-2" /> {isReadOnly ? "Back to Dashboard" : "Back to Project Hub"}
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-slate-700 dark:text-slate-200">{projectInfo.name}</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">{projectInfo.company}</p>
          </div>
          <div className="flex flex-col gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300 text-right">
            <p>Start: {minDate.toLocaleDateString()}</p>
            <p>{actualDurationStr} Total</p>
          </div>
        </div>

        <motion.div 
          variants={containerVariants} 
          initial="hidden" 
          animate="show"
          className="w-full border border-slate-200 dark:border-slate-700 overflow-x-auto shadow-sm rounded-lg"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="min-w-[1200px] flex text-xs">
            {/* LEFT PANE: Task Table */}
            <div className="w-[500px] shrink-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              {/* Header */}
              <div className="h-[60px] flex items-end border-b border-slate-200 dark:border-slate-700 pb-2 font-bold px-2 sticky top-0 z-30 bg-white dark:bg-slate-900">
                <div className="w-[50%] pl-2">TASK</div>
                <div className="w-[12%] text-center">PROG</div>
                <div className="w-[14%] text-center">START</div>
                <div className="w-[14%] text-center">END</div>
                <div className="w-[10%] text-center">ACT</div>
              </div>

              {/* Rows */}
              <div className="flex flex-col">
                {data.map((cat, catIndex) => (
                  <div key={cat.id}>
                    {/* Category Header */}
                    <div 
                      draggable={!isReadOnly}
                      onDragStart={(e) => handleDragStartNative(e, { type: 'category', index: catIndex })}
                      onDragEnd={handleDragEndNative}
                      onDragOver={handleDragOverNative}
                      onDrop={(e) => handleDropNative(e, { type: 'category', index: catIndex })}
                      onDoubleClick={() => { if(!isReadOnly){ setEditingCat(cat.id); setEditForm({ category: cat.category }); } }}
                      onContextMenu={(e) => {
                        if (isReadOnly) return;
                        e.preventDefault();
                        setContextMenu({ x: e.clientX, y: e.clientY, type: 'category', catId: cat.id, item: cat });
                      }}
                      className={`${cat.color} ${cat.textColor} font-bold p-2 min-h-[36px] flex items-center justify-between border-b border-slate-200/50 dark:border-slate-700/50 group ${!isReadOnly ? 'cursor-grab active:cursor-grabbing' : ''} select-none relative`}
                    >
                      {editingCat === cat.id ? (
                        <div className="flex items-center gap-2 w-full">
                          <input 
                            autoFocus
                            className="bg-white/50 dark:bg-slate-900/50 px-2 py-1 rounded text-sm w-full outline-none ring-1 ring-slate-400"
                            value={editForm.category}
                            onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && handleSaveCategory(cat.id)}
                          />
                          <button onClick={() => handleSaveCategory(cat.id)} className="p-1 hover:bg-white/50 rounded"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingCat(null)} className="p-1 hover:bg-white/50 rounded"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <>
                          <span className="flex-1 truncate pr-2 flex items-center gap-1.5">
                            {cat.star && <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />}
                            {cat.flag && <Flag className="w-4 h-4 text-red-500 fill-red-500 flex-shrink-0" />}
                            <span className="truncate">{cat.category}</span>
                          </span>
                          {!isReadOnly && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleDeleteCategory(cat.id)} className="p-1 hover:bg-white/50 rounded text-red-600" title="Delete Phase"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Tasks */}
                    {cat.tasks.map((task, taskIndex) => {
                      const isEditing = editingTask?.taskId === task.id;
                      
                      return (
                        <div 
                          key={task.id} 
                          draggable={!isReadOnly && !isEditing}
                          onDragStart={(e) => handleDragStartNative(e, { type: 'task', catIndex, taskIndex })}
                          onDragEnd={handleDragEndNative}
                          onDragOver={handleDragOverNative}
                          onDrop={(e) => handleDropNative(e, { type: 'task', catIndex, taskIndex })}
                          onDoubleClick={() => !isReadOnly && !isEditing && handleEditTask(cat.id, task)}
                          onContextMenu={(e) => {
                            if (isReadOnly || isEditing) return;
                            e.preventDefault();
                            setContextMenu({ x: e.clientX, y: e.clientY, type: 'task', catId: cat.id, taskId: task.id, item: task });
                          }}
                          className={`flex items-center min-h-[36px] border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group ${!isReadOnly && !isEditing ? 'cursor-grab active:cursor-grabbing' : ''} select-none relative`}
                        >
                          {isEditing ? (
                            <div 
                              className="flex w-full px-2 gap-1 items-center bg-blue-50/50 dark:bg-blue-900/10 py-1"
                              onKeyDown={e => e.key === 'Enter' && handleSaveTask(cat.id)}
                            >
                              <div className="w-[50%]">
                                <input className="w-full text-xs px-2 py-1 border rounded bg-white dark:bg-slate-800 dark:border-slate-600" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                              </div>
                              <div className="w-[12%]">
                                <input className="w-full text-xs px-1 py-1 border rounded bg-white dark:bg-slate-800 dark:border-slate-600 text-center" value={editForm.progress} onChange={e => setEditForm({...editForm, progress: e.target.value})} />
                              </div>
                              <div className="w-[14%]">
                                <input type="date" className="w-full text-[10px] px-1 py-1 border rounded bg-white dark:bg-slate-800 dark:border-slate-600" value={editForm.start} onChange={e => setEditForm({...editForm, start: e.target.value})} />
                              </div>
                              <div className="w-[14%]">
                                <input type="date" className="w-full text-[10px] px-1 py-1 border rounded bg-white dark:bg-slate-800 dark:border-slate-600" value={editForm.end} onChange={e => setEditForm({...editForm, end: e.target.value})} />
                              </div>
                              <div className="w-[10%] flex justify-center gap-1">
                                <button onClick={() => handleSaveTask(cat.id)} className="text-emerald-600 hover:bg-emerald-100 p-1 rounded"><Check className="w-3 h-3" /></button>
                                <button onClick={() => setEditingTask(null)} className="text-slate-500 hover:bg-slate-200 p-1 rounded"><X className="w-3 h-3" /></button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="w-[50%] pl-4 pr-2 truncate text-slate-700 dark:text-slate-300 flex items-center gap-1.5" title={task.name}>
                                {task.star && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />}
                                {task.flag && <Flag className="w-3.5 h-3.5 text-red-500 fill-red-500 flex-shrink-0" />}
                                <span className="truncate">{task.name}</span>
                              </div>
                              <div className="w-[12%] text-center">{task.progress}</div>
                              <div className="w-[14%] text-center">{formatDateLabel(task.start)}</div>
                              <div className="w-[14%] text-center">{formatDateLabel(task.end)}</div>
                              {!isReadOnly && (
                                <div className="w-[10%] flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleDeleteTask(cat.id, task.id)} className="text-red-500 hover:bg-red-100 dark:hover:bg-slate-700 p-1 rounded" title="Delete Task"><Trash2 className="w-3 h-3" /></button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                    {/* Add Task Button */}
                    {!isReadOnly && (
                      <div 
                        className="h-[30px] flex items-center pl-4 border-b border-slate-100 dark:border-slate-800"
                        onDragOver={handleDragOverNative}
                        onDrop={(e) => handleDropNative(e, { type: 'category', index: catIndex })}
                      >
                        <button onClick={() => handleAddTask(cat.id)} className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Add Task
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add Category Button */}
                {!isReadOnly && (
                  <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                    <Button variant="outline" size="sm" onClick={handleAddCategory} className="w-full flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4" /> Add Category
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT PANE: Timeline */}
            <div className="flex-1 bg-slate-50 dark:bg-slate-900 relative">
              {/* Timeline Headers */}
              <div className="h-[60px] flex flex-col border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0 z-20">
                {/* Months / Weeks */}
                <div className="flex h-[30px] border-b border-slate-100 dark:border-slate-800">
                  {weeks.map((weekLabel, wIdx) => (
                    <div key={wIdx} className="flex-1 flex justify-center items-center border-r border-slate-200/50 dark:border-slate-700/50 font-semibold text-[10px] text-slate-600 dark:text-slate-300 whitespace-nowrap overflow-hidden">
                      {weekLabel}
                    </div>
                  ))}
                </div>
                {/* Days */}
                <div className="flex h-[30px] bg-slate-50 dark:bg-slate-800/30">
                  {Array.from({ length: totalWeeks }).map((_, wIdx) => (
                    <div key={wIdx} className="flex-1 flex border-r border-slate-200/50 dark:border-slate-700/50">
                      {dayLetters.map((letter, dIdx) => (
                        <div key={dIdx} className={`flex-1 flex justify-center items-center border-r border-slate-200/30 dark:border-slate-700/30 text-[10px] ${dIdx >= 5 ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-400' : 'text-slate-500'}`}>
                          {letter}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline Grid & Bars */}
              <div className="relative h-full">
                {/* Vertical Grid Lines */}
                <div className="absolute inset-0 flex pointer-events-none z-0">
                  {Array.from({ length: totalWeeks * daysInWeek }).map((_, dIdx) => (
                    <div 
                      key={dIdx} 
                      style={{ width: `${100 / (totalWeeks * daysInWeek)}%` }}
                      className={`h-full border-r border-slate-200/30 dark:border-slate-700/30 ${(dIdx % 7 >= 5) ? 'bg-slate-100/50 dark:bg-slate-800/20' : ''}`}
                    />
                  ))}
                </div>

                {/* Timeline Rows container */}
                <div className="flex flex-col relative z-10">
                  {data.map((cat) => (
                    <div key={cat.id}>
                      {/* Category row spacer */}
                      <div className="min-h-[36px] border-b border-slate-100/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50" />
                      
                      {/* Task rows */}
                      {cat.tasks.map((task) => {
                        const style = getBarStyles(task.start, task.end);
                        const startD = new Date(task.start);
                        const endD = new Date(task.end);
                        let durationText = "";
                        if (!isNaN(startD) && !isNaN(endD)) {
                          const diff = Math.floor((endD - startD) / (1000 * 60 * 60 * 24)) + 1;
                          if (diff > 0) {
                            const w = Math.floor(diff / 7);
                            const d = diff % 7;
                            const wStr = w > 0 ? `${w} week${w > 1 ? 's' : ''}` : '';
                            const dStr = d > 0 ? `${d} day${d > 1 ? 's' : ''}` : '';
                            durationText = `\nDuration: ${wStr}${w > 0 && d > 0 ? ', ' : ''}${dStr}`;
                          }
                        }

                        let progStr = task.progress || '0%';
                        if (!progStr.endsWith('%')) {
                          const val = parseInt(progStr);
                          if (!isNaN(val)) progStr = `${val}%`;
                        }

                        const getProgressColor = (barColor) => {
                          if (!barColor) return 'bg-black/20';
                          if (barColor.includes('purple')) return 'bg-purple-500';
                          if (barColor.includes('pink')) return 'bg-pink-500';
                          if (barColor.includes('blue')) return 'bg-blue-500';
                          if (barColor.includes('yellow')) return 'bg-yellow-500';
                          if (barColor.includes('emerald')) return 'bg-emerald-500';
                          return 'bg-black/20';
                        };

                        return (
                          <div key={task.id} className="min-h-[36px] border-b border-slate-100/50 dark:border-slate-800/50 relative group flex items-center">
                            {style && !isNaN(startD) && !isNaN(endD) && (
                              <motion.div
                                initial={{ scaleX: 0, opacity: 0 }}
                                animate={{ scaleX: 1, opacity: 1, x: 0 }}
                                transition={{ default: { duration: 0.3 }, x: { duration: 0 } }}
                                className={`absolute h-[20px] ${cat.barColor} rounded-sm shadow-sm opacity-90 ${!isReadOnly ? 'group-hover:opacity-100 group-hover:shadow-md cursor-pointer hover:ring-2 ring-slate-400' : ''} transition-all origin-left z-10 overflow-hidden`}
                                style={style}
                                title={`${task.name}\n${task.start} to ${task.end}${durationText}`}
                                onClick={() => !isReadOnly && handleEditTask(cat.id, task)}
                              >
                                <div 
                                  className={`h-full ${getProgressColor(cat.barColor)}`} 
                                  style={{ width: progStr }}
                                />
                                {task.flag && (
                                  <div className="absolute right-0 top-0 h-full flex items-center pr-1">
                                    <Flag className="w-3.5 h-3.5 text-red-600 fill-red-600 drop-shadow-sm" />
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </div>
                        );
                      })}
                      {/* Add task spacer */}
                      <div className="h-[30px] border-b border-slate-100/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50" />
                    </div>
                  ))}
                  
                  {/* Add category spacer */}
                  <div className="h-[68px] bg-slate-50 dark:bg-slate-900" />
                </div>
              </div>

            </div>
          </div>
        </motion.div>
      </div>

      {/* Context Menu (WhatsApp style reaction pill) */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-full px-3 py-2 flex items-center gap-2 transform -translate-x-1/2 -translate-y-[120%]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={() => handleContextMenuAction('star')} 
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors flex items-center justify-center group"
            title="Toggle Star"
          >
            <Star className={`w-5 h-5 ${contextMenu.item?.star ? 'text-amber-500 fill-amber-500' : 'text-slate-400 group-hover:text-amber-500'}`} />
          </button>
          
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
          
          <button 
            onClick={() => handleContextMenuAction('complete')} 
            className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-full transition-colors flex items-center justify-center group"
            title="Mark Completed"
          >
            <CheckCheck className="w-5 h-5 text-slate-400 group-hover:text-emerald-500" />
          </button>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
          
          <button 
            onClick={() => handleContextMenuAction('flag')} 
            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors flex items-center justify-center group"
            title="Toggle Flag (Milestone)"
          >
            <Flag className={`w-5 h-5 ${contextMenu.item?.flag ? 'text-red-500 fill-red-500' : 'text-slate-400 group-hover:text-red-500'}`} />
          </button>
        </div>
      )}

      <ConfirmDialog 
        open={deleteDialog.open}
        title={deleteDialog.title}
        message={deleteDialog.message}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteDialog({ open: false, type: null, catId: null, taskId: null, title: '', message: '' })}
      />
    </div>
  );
}
