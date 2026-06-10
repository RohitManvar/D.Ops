import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Square, CheckCircle2, RotateCcw, Clock, BrainCircuit } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthProvider';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { containerVariants, itemVariants } from '@/lib/animations';

const POMODORO_TIME = 25 * 60; // 25 minutes in seconds

export default function FocusMode() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [timeLeft, setTimeLeft] = useState(POMODORO_TIME);
  const [isActive, setIsActive] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [loading, setLoading] = useState(true);

  // Sound references
  const alarmSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));

  useEffect(() => {
    fetchTasks();
  }, [user]);

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      handleComplete();
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const fetchTasks = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, status')
      .eq('user_id', user.id)
      .neq('status', 'Done')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTasks(data);
    }
    setLoading(false);
  };

  const toggleTimer = () => {
    if (!selectedTaskId && timeLeft === POMODORO_TIME) {
      addToast("Please select a task to focus on first", "error");
      return;
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(POMODORO_TIME);
  };

  const handleComplete = async () => {
    setIsActive(false);
    alarmSound.current.play().catch(e => console.log('Audio play failed', e));
    
    try {
      const { error } = await supabase.from('pomodoro_sessions').insert({
        user_id: user.id,
        task_id: selectedTaskId || null,
        duration_minutes: 25,
      });

      if (error) throw error;
      addToast("Pomodoro session completed and logged!", "success");
      
      // Optionally ask if they want to mark task as done
    } catch (err) {
      // In case the table doesn't exist yet, we catch the error gracefully
      console.error(err);
      addToast("Session completed, but could not save to database. Have you run the SQL migration?", "warning");
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = ((POMODORO_TIME - timeLeft) / POMODORO_TIME) * 100;

  return (
    <div className="min-h-screen bg-[#f7f6f3] dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-8 transition-colors duration-300 flex flex-col">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
        <div className="mb-8">
          <Link to="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Focus Mode
            <span className="px-3 py-1 bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 rounded-full text-sm font-medium">
              Pomodoro Timer
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Eliminate distractions and focus on a single task for 25 minutes.</p>
        </div>

        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-2xl rounded-[2rem] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 backdrop-blur-xl shadow-2xl overflow-hidden relative">
            
            {/* Background progress bar effect */}
            <div 
              className="absolute top-0 left-0 bottom-0 bg-indigo-50 dark:bg-indigo-900/20 transition-all duration-1000 ease-linear z-0"
              style={{ width: `${progress}%` }}
            />

            <div className="relative z-10 flex flex-col items-center p-12 text-center">
              
              {/* Task Selector */}
              <div className="w-full max-w-md mb-12">
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">What are you working on?</label>
                <select 
                  className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  disabled={isActive}
                >
                  <option value="" disabled>Select a pending task...</option>
                  {tasks.map(t => (
                    <option key={t.id} value={t.id}>{t.title} ({t.status})</option>
                  ))}
                  <option value="adhoc">Ad-hoc work (No specific task)</option>
                </select>
              </div>

              {/* Timer Display */}
              <div className="relative mb-12">
                <motion.div 
                  className="text-8xl md:text-9xl font-bold tracking-tighter tabular-nums text-slate-800 dark:text-slate-100"
                  animate={{ scale: isActive ? [1, 1.02, 1] : 1 }}
                  transition={{ repeat: isActive ? Infinity : 0, duration: 2, ease: "easeInOut" }}
                >
                  {formatTime(timeLeft)}
                </motion.div>
                {isActive && (
                  <motion.div 
                    className="absolute -top-6 -right-6 text-indigo-500"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                  >
                    <BrainCircuit className="h-12 w-12 opacity-50" />
                  </motion.div>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-6">
                <Button 
                  onClick={toggleTimer} 
                  className={`h-16 px-8 rounded-2xl text-lg font-medium shadow-lg transition-all ${
                    isActive 
                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-400 shadow-amber-500/20'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/25 hover:-translate-y-1'
                  }`}
                >
                  {isActive ? (
                    <><Pause className="h-6 w-6 mr-3" /> Pause Focus</>
                  ) : (
                    <><Play className="h-6 w-6 mr-3" /> {timeLeft < POMODORO_TIME ? 'Resume Focus' : 'Start Focus'}</>
                  )}
                </Button>
                
                <Button 
                  onClick={resetTimer} 
                  variant="outline" 
                  className="h-16 w-16 rounded-2xl border-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Reset Timer"
                >
                  <RotateCcw className="h-6 w-6 text-slate-500" />
                </Button>
              </div>

            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
