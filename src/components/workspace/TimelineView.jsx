import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar as CalendarIcon, Clock, Layers, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { containerVariants, itemVariants } from '@/lib/animations';

export default function TimelineView() {
  const { user } = useAuth();
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Time window state
  const [windowStart, setWindowStart] = useState(new Date());
  const [windowEnd, setWindowEnd] = useState(new Date());

  useEffect(() => {
    if (user) {
      fetchSprints();
    }
  }, [user]);

  const fetchSprints = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sprints')
      .select('*, tasks(id, title, status)')
      .eq('user_id', user.id)
      .order('start_date', { ascending: true });

    if (data && data.length > 0) {
      setSprints(data);
      
      // Calculate overall window min/max to render the timeline scale
      let minDate = new Date(data[0].start_date);
      let maxDate = new Date(data[0].end_date);
      
      data.forEach(s => {
        const start = new Date(s.start_date);
        const end = new Date(s.end_date);
        if (start < minDate) minDate = start;
        if (end > maxDate) maxDate = end;
      });

      // Add 7 days padding to start and end
      minDate.setDate(minDate.getDate() - 7);
      maxDate.setDate(maxDate.getDate() + 7);

      setWindowStart(minDate);
      setWindowEnd(maxDate);
    } else {
      // Default empty window
      const now = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(now.getMonth() + 1);
      setWindowStart(now);
      setWindowEnd(nextMonth);
    }
    setLoading(false);
  };

  const getPercentage = (dateStr) => {
    const d = new Date(dateStr).getTime();
    const min = windowStart.getTime();
    const max = windowEnd.getTime();
    const pct = ((d - min) / (max - min)) * 100;
    return Math.max(0, Math.min(100, pct));
  };

  const calculateStyle = (sprint) => {
    const startPct = getPercentage(sprint.start_date);
    const endPct = getPercentage(sprint.end_date);
    const width = Math.max(endPct - startPct, 1); // min 1% width
    return {
      left: `${startPct}%`,
      width: `${width}%`
    };
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-emerald-500 border-emerald-600 text-emerald-900 dark:bg-emerald-500/20 dark:border-emerald-500/30 dark:text-emerald-300';
      case 'completed': return 'bg-slate-300 border-slate-400 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400';
      default: return 'bg-blue-500 border-blue-600 text-blue-900 dark:bg-blue-500/20 dark:border-blue-500/30 dark:text-blue-300';
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f6f3] dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-8 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        
        <div className="mb-8">
          <Link to="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Project Timeline
            <span className="px-3 py-1 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-sm font-medium">
              Gantt View
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Visualize your sprint schedules and deadlines.</p>
        </div>

        <motion.div variants={containerVariants} initial="hidden" animate="show">
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 backdrop-blur-xl overflow-hidden shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/50">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-blue-500" /> Sprint Gantt Chart
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              
              {loading ? (
                <div className="p-12 text-center text-slate-500">Loading timeline...</div>
              ) : sprints.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center text-slate-500">
                  <AlertCircle className="h-10 w-10 text-slate-300 mb-4" />
                  <p>No sprints found. Create a sprint in the Sprint Planning module to see it here.</p>
                </div>
              ) : (
                <div className="relative p-6 overflow-x-auto">
                  <div className="min-w-[800px]">
                    
                    {/* Timeline Header Scale */}
                    <div className="relative h-8 mb-4 border-b border-slate-200 dark:border-slate-700">
                      <div className="absolute left-0 -translate-x-1/2 text-xs text-slate-400 font-medium">
                        {windowStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="absolute left-[50%] -translate-x-1/2 text-xs text-slate-400 font-medium">
                        {new Date((windowStart.getTime() + windowEnd.getTime()) / 2).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="absolute left-[100%] -translate-x-1/2 text-xs text-slate-400 font-medium">
                        {windowEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>

                    {/* Timeline Rows */}
                    <div className="space-y-4">
                      {sprints.map((sprint) => (
                        <div key={sprint.id} className="relative h-14 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-800">
                          {/* Background Grid Lines */}
                          <div className="absolute inset-0 pointer-events-none border-x border-dashed border-slate-200 dark:border-slate-700/50 opacity-50 left-[50%]" />

                          {/* Sprint Bar */}
                          <motion.div 
                            variants={itemVariants}
                            className={`absolute top-2 bottom-2 rounded-lg border flex flex-col justify-center px-3 overflow-hidden shadow-sm hover:ring-2 hover:ring-blue-500/50 cursor-pointer transition-shadow ${getStatusColor(sprint.status)}`}
                            style={calculateStyle(sprint)}
                            title={`${sprint.goal}\n${sprint.start_date} - ${sprint.end_date}`}
                          >
                            <span className="text-xs font-bold truncate tracking-tight">{sprint.goal}</span>
                            <span className="text-[10px] opacity-80 truncate">
                              {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
                            </span>
                          </motion.div>
                        </div>
                      ))}
                    </div>

                    {/* Today Marker */}
                    <div 
                      className="absolute top-4 bottom-6 w-px bg-red-400 dark:bg-red-500/50 z-10 pointer-events-none flex flex-col items-center"
                      style={{ left: `${getPercentage(new Date().toISOString())}%` }}
                    >
                      <div className="bg-red-400 dark:bg-red-500/50 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm -mt-3">Today</div>
                    </div>

                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        </motion.div>

      </div>
    </div>
  );
}
