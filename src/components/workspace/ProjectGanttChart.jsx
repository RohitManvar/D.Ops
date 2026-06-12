import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit2, Trash2, Check, Plus, X, Loader2 } from 'lucide-react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { containerVariants, itemVariants } from '@/lib/animations';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthProvider';
import { useToast } from '@/components/ui/toast';

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
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [editingTask, setEditingTask] = useState(null); // { catId, taskId }
  const [editingCat, setEditingCat] = useState(null); // catId
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    if (user && projectId) {
      fetchData();
    }
  }, [user, projectId]);

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

  const saveData = async (newData) => {
    setData(newData);
    const { error } = await supabase
      .from('gantt_data')
      .update({ tasks_json: newData, updated_at: new Date().toISOString() })
      .eq('project_id', projectId);
    
    if (error) {
      addToast("Failed to save changes", "error");
    }
  };

  const { minDate, maxDate, totalWeeks, weeks, daysInWeek, dayLetters } = useMemo(() => {
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

    return { 
      minDate: projectStart, 
      maxDate: endPad, 
      totalWeeks: tWeeks, 
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
    saveData(data.map(c => {
      if (c.id === catId) {
        return { ...c, tasks: c.tasks.map(t => t.id === editForm.id ? editForm : t) };
      }
      return c;
    }));
    setEditingTask(null);
  };

  const handleDeleteTask = (catId, taskId) => {
    if(!confirm("Are you sure you want to delete this task?")) return;
    saveData(data.map(c => {
      if (c.id === catId) {
        return { ...c, tasks: c.tasks.filter(t => t.id !== taskId) };
      }
      return c;
    }));
    setEditingTask(null);
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
    if(!confirm("Are you sure you want to delete this entire category and its tasks?")) return;
    saveData(data.filter(c => c.id !== catId));
  };

  const handleSaveCategory = (catId) => {
    saveData(data.map(c => c.id === catId ? { ...c, category: editForm.category } : c));
    setEditingCat(null);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 md:p-8 transition-colors duration-300 font-sans">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <Link to={isReadOnly ? `/reviewer?tab=${sourceTab}` : "/project-gantt"}>
              <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-2" /> {isReadOnly ? "Back to Dashboard" : "Back to Projects"}
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-slate-700 dark:text-slate-200">{projectInfo.name}</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">{projectInfo.company}</p>
          </div>
          <div className="flex flex-col gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300 text-right">
            <p>Start: {minDate.toLocaleDateString()}</p>
            <p>{totalWeeks} Weeks Total</p>
          </div>
        </div>

        <motion.div 
          variants={containerVariants} 
          initial="hidden" 
          animate="show"
          className="border border-slate-200 dark:border-slate-700 overflow-x-auto shadow-sm rounded-lg"
        >
          <div className="min-w-[1200px] flex text-xs">
            {/* LEFT PANE: Task Table */}
            <div className="w-[500px] shrink-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              {/* Header */}
              <div className="h-[60px] flex items-end border-b border-slate-200 dark:border-slate-700 pb-2 font-bold px-2">
                <div className="w-[50%] pl-2">TASK</div>
                <div className="w-[12%] text-center">PROG</div>
                <div className="w-[15%] text-center">START</div>
                <div className="w-[15%] text-center">END</div>
                <div className="w-[8%] text-center">ACT</div>
              </div>

              {/* Rows */}
              <div className="flex flex-col">
                {data.map((cat) => (
                  <div key={cat.id}>
                    {/* Category Header */}
                    <div className={`${cat.color} ${cat.textColor} font-bold p-2 min-h-[36px] flex items-center justify-between border-b border-slate-200/50 dark:border-slate-700/50 group`}>
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
                          <span className="flex-1 truncate pr-2">{cat.category}</span>
                          {!isReadOnly && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingCat(cat.id); setEditForm({ category: cat.category }); }} className="p-1 hover:bg-white/50 rounded" title="Edit Category"><Edit2 className="w-3 h-3" /></button>
                              <button onClick={() => handleDeleteCategory(cat.id)} className="p-1 hover:bg-white/50 rounded text-red-600" title="Delete Category"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Tasks */}
                    {cat.tasks.map((task) => {
                      const isEditing = editingTask?.taskId === task.id;
                      
                      return (
                        <div key={task.id} className="flex items-center min-h-[36px] border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                          {isEditing ? (
                            <div className="flex w-full px-2 gap-1 items-center bg-blue-50/50 dark:bg-blue-900/10 py-1">
                              <div className="w-[50%]">
                                <input className="w-full text-xs px-2 py-1 border rounded bg-white dark:bg-slate-800 dark:border-slate-600" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                              </div>
                              <div className="w-[12%]">
                                <input className="w-full text-xs px-1 py-1 border rounded bg-white dark:bg-slate-800 dark:border-slate-600 text-center" value={editForm.progress} onChange={e => setEditForm({...editForm, progress: e.target.value})} />
                              </div>
                              <div className="w-[15%]">
                                <input type="date" className="w-full text-[10px] px-1 py-1 border rounded bg-white dark:bg-slate-800 dark:border-slate-600" value={editForm.start} onChange={e => setEditForm({...editForm, start: e.target.value})} />
                              </div>
                              <div className="w-[15%]">
                                <input type="date" className="w-full text-[10px] px-1 py-1 border rounded bg-white dark:bg-slate-800 dark:border-slate-600" value={editForm.end} onChange={e => setEditForm({...editForm, end: e.target.value})} />
                              </div>
                              <div className="w-[8%] flex justify-center gap-1">
                                <button onClick={() => handleSaveTask(cat.id)} className="text-emerald-600 hover:bg-emerald-100 p-1 rounded"><Check className="w-3 h-3" /></button>
                                <button onClick={() => setEditingTask(null)} className="text-slate-500 hover:bg-slate-200 p-1 rounded"><X className="w-3 h-3" /></button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="w-[50%] pl-4 pr-2 truncate text-slate-700 dark:text-slate-300" title={task.name}>{task.name}</div>
                              <div className="w-[12%] text-center">{task.progress}</div>
                              <div className="w-[15%] text-center">{formatDateLabel(task.start)}</div>
                              <div className="w-[15%] text-center">{formatDateLabel(task.end)}</div>
                              {!isReadOnly && (
                                <div className="w-[8%] flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleEditTask(cat.id, task)} className="text-blue-500 hover:bg-blue-100 dark:hover:bg-slate-700 p-1 rounded"><Edit2 className="w-3 h-3" /></button>
                                  <button onClick={() => handleDeleteTask(cat.id, task.id)} className="text-red-500 hover:bg-red-100 dark:hover:bg-slate-700 p-1 rounded"><Trash2 className="w-3 h-3" /></button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                    {/* Add Task Button */}
                    {!isReadOnly && (
                      <div className="h-[30px] flex items-center pl-4 border-b border-slate-100 dark:border-slate-800">
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
                        return (
                          <div key={task.id} className="min-h-[36px] border-b border-slate-100/50 dark:border-slate-800/50 relative group flex items-center">
                            {style && !isNaN(new Date(task.start)) && !isNaN(new Date(task.end)) && (
                              <motion.div
                                initial={{ scaleX: 0, opacity: 0 }}
                                animate={{ scaleX: 1, opacity: 1 }}
                                transition={{ duration: 0.3 }}
                                className={`absolute h-[20px] ${cat.barColor} rounded-sm shadow-sm opacity-90 ${!isReadOnly ? 'group-hover:opacity-100 group-hover:shadow-md cursor-pointer hover:ring-2 ring-slate-400' : ''} transition-all origin-left`}
                                style={style}
                                title={`${task.name}\n${task.start} to ${task.end}`}
                                onClick={() => !isReadOnly && handleEditTask(cat.id, task)}
                              />
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
    </div>
  );
}
