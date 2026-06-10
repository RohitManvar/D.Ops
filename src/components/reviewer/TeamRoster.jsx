import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, Activity, Target, UserCheck } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { containerVariants, itemVariants } from '@/lib/animations';

export default function TeamRoster() {
  const { user } = useAuth();
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTeam();
    }
  }, [user]);

  const fetchTeam = async () => {
    setLoading(true);
    
    // Fetch all executor profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'executor');

    if (profilesData) {
      // For each executor, fetch their active sprint and recent pomodoro sessions
      const enrichedTeam = await Promise.all(profilesData.map(async (profile) => {
        
        // Fetch active sprint
        const { data: sprintData } = await supabase
          .from('sprints')
          .select('goal, end_date')
          .eq('user_id', profile.id)
          .eq('status', 'Active')
          .single();

        // Fetch pomodoro sessions (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        // Wrap in try-catch in case pomodoro_sessions doesn't exist yet
        let pomodoros = [];
        try {
          const { data: pomodoroData } = await supabase
            .from('pomodoro_sessions')
            .select('duration_minutes')
            .eq('user_id', profile.id)
            .gte('completed_at', sevenDaysAgo.toISOString());
            
          if (pomodoroData) pomodoros = pomodoroData;
        } catch (e) {
          console.log("Pomodoro table might not exist yet", e);
        }

        const deepWorkMinutes = pomodoros.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
        const deepWorkHours = (deepWorkMinutes / 60).toFixed(1);

        return {
          ...profile,
          activeSprint: sprintData || null,
          deepWorkHours,
          pomodoroCount: pomodoros.length
        };
      }));

      setTeam(enrichedTeam);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f7f6f3] dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-8 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link to="/">
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              Team Roster
              <span className="px-3 py-1 bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 rounded-full text-sm font-medium">
                Reviewer Access
              </span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Monitor active executors, their current sprints, and productivity metrics.</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading team data...</div>
        ) : (
          <motion.div 
            variants={containerVariants} 
            initial="hidden" 
            animate="show" 
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {team.length === 0 ? (
              <div className="col-span-full p-12 text-center text-slate-500 border border-dashed rounded-2xl dark:border-slate-800">
                No executors found in the system.
              </div>
            ) : (
              team.map((member) => (
                <motion.div key={member.id} variants={itemVariants}>
                  <Card className="h-full rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 backdrop-blur-xl overflow-hidden hover:shadow-xl transition-shadow">
                    <CardHeader className="border-b border-slate-100 dark:border-slate-800/50 pb-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex flex-shrink-0 items-center justify-center text-white font-bold text-lg shadow-inner">
                          {member.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                          <CardTitle className="truncate">{member.email.split('@')[0]}</CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1 truncate">
                            <UserCheck className="h-3 w-3" /> Executor
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                      
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                          <Target className="h-4 w-4" /> Current Sprint Goal
                        </div>
                        {member.activeSprint ? (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 rounded-xl text-sm border border-blue-100 dark:border-blue-800/50">
                            <p className="font-semibold line-clamp-2">{member.activeSprint.goal}</p>
                            <p className="text-xs opacity-70 mt-1">Due {new Date(member.activeSprint.end_date).toLocaleDateString()}</p>
                          </div>
                        ) : (
                          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 text-slate-500 rounded-xl text-sm border border-slate-100 dark:border-slate-800">
                            No active sprint assigned.
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                          <Activity className="h-4 w-4" /> Productivity (Last 7 Days)
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-center border border-amber-100 dark:border-amber-800/50">
                            <div className="text-2xl font-black tabular-nums tracking-tighter text-amber-600 dark:text-amber-400">{member.deepWorkHours}</div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700/60 dark:text-amber-400/60">Deep Work Hrs</div>
                          </div>
                          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-center border border-emerald-100 dark:border-emerald-800/50">
                            <div className="text-2xl font-black tabular-nums tracking-tighter text-emerald-600 dark:text-emerald-400">{member.pomodoroCount}</div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/60 dark:text-emerald-400/60">Sessions</div>
                          </div>
                        </div>
                      </div>

                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
