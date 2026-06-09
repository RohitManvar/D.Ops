import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart as BarChartIcon, TrendingUp, CalendarDays, CheckCircle2, ListTodo, Award, ArrowLeft } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend
} from 'recharts';

export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30days'); // '7days', '30days', 'all'

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      const { data } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });
      
      if (data) setNotes(data);
      setLoading(false);
    }
    fetchData();
  }, [user]);

  const filteredNotes = useMemo(() => {
    if (timeRange === 'all') return notes;
    const now = new Date();
    const days = timeRange === '30days' ? 30 : 7;
    const cutoff = new Date(now.setDate(now.getDate() - days)).toISOString().slice(0, 10);
    return notes.filter(n => n.date >= cutoff);
  }, [notes, timeRange]);

  const stats = useMemo(() => {
    let totalCompleted = 0;
    let totalPending = 0;
    let projectCounts = {};

    filteredNotes.forEach(note => {
      const updates = note.updates || [];
      totalCompleted += updates.filter(u => u.done).length;
      totalPending += updates.filter(u => !u.done && u.text.trim()).length;

      if (note.project) {
        projectCounts[note.project] = (projectCounts[note.project] || 0) + updates.filter(u => u.done).length;
      }
    });

    const completionRate = totalCompleted + totalPending > 0 
      ? Math.round((totalCompleted / (totalCompleted + totalPending)) * 100) 
      : 0;

    const topProject = Object.keys(projectCounts).reduce((a, b) => projectCounts[a] > projectCounts[b] ? a : b, 'None');

    return { totalCompleted, totalPending, completionRate, topProject };
  }, [filteredNotes]);

  const chartData = useMemo(() => {
    // Group by day for the chart
    return filteredNotes.map(note => {
      const updates = note.updates || [];
      return {
        date: new Date(note.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        completed: updates.filter(u => u.done).length,
        pending: updates.filter(u => !u.done && u.text.trim()).length,
      };
    });
  }, [filteredNotes]);

  if (loading) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center p-8 bg-[#f7f6f3] dark:bg-slate-900">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f6f3] dark:bg-slate-900 p-8 md:p-12">
      <div className="mx-auto max-w-6xl space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <button
              onClick={() => navigate(-1)}
              className="mb-4 flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </button>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <BarChartIcon className="h-8 w-8 text-indigo-500" />
              Analytics & Insights
            </h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Track your productivity trends and project focus.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </motion.div>
        </div>

        {/* Top Stats Row */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="rounded-[24px] border-none shadow-md bg-gradient-to-br from-white to-indigo-50/30 dark:from-slate-800 dark:to-indigo-900/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-indigo-100 p-3 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tasks Completed</p>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.totalCompleted}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="rounded-[24px] border-none shadow-md bg-gradient-to-br from-white to-amber-50/30 dark:from-slate-800 dark:to-amber-900/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-amber-100 p-3 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
                    <ListTodo className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tasks Pending</p>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.totalPending}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="rounded-[24px] border-none shadow-md bg-gradient-to-br from-white to-emerald-50/30 dark:from-slate-800 dark:to-emerald-900/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Completion Rate</p>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.completionRate}%</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="rounded-[24px] border-none shadow-md bg-gradient-to-br from-white to-purple-50/30 dark:from-slate-800 dark:to-purple-900/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-purple-100 p-3 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400">
                    <Award className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Top Project</p>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate w-[120px]">{stats.topProject}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Chart */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 0.5 }}>
          <Card className="rounded-[32px] border-slate-200 shadow-xl dark:border-slate-800 dark:bg-slate-900/60 backdrop-blur">
            <CardHeader className="px-8 pt-8">
              <CardTitle className="text-xl">Daily Output</CardTitle>
              <CardDescription>Number of tasks completed vs pending per day.</CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8 pt-2">
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }} 
                      dy={10} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }} 
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="completed" name="Completed" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="pending" name="Pending" fill="#fbbf24" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
