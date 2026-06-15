import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Layers, Flag, FileText, BarChart, Loader2, Settings, CalendarDays } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthProvider';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/ui/GlassCard';
import { containerVariants, itemVariants } from '@/lib/animations';

export default function ProjectDashboard() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id && projectId) {
      loadProject();
    }
  }, [user?.id, projectId]);

  const loadProject = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('gantt_projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (!error) {
      setProject(data);
    }
    setLoading(false);
  };

  const projectLinks = [
    { 
      to: `/project/${projectId}/backlog`, 
      title: "Product Backlog", 
      icon: Layers, 
      desc: "Manage features specific to this project" 
    },
    { 
      to: `/project/${projectId}/sprints`, 
      title: "Sprint Planning", 
      icon: Flag, 
      desc: "Plan sprints for this project" 
    },
    {
      to: `/project/${projectId}/whole-sprint`,
      title: "Product Plan",
      icon: CalendarDays,
      desc: "Holistic view of all tasks and their chronological execution"
    },
    {
      to: `/project/${projectId}/documents`, 
      title: "Documents", 
      icon: FileText, 
      desc: "Create and manage documents for this project"
    },
    {
      to: `/project-gantt/${projectId}`, 
      title: "Project Gantt", 
      icon: BarChart, 
      desc: "Detailed Gantt timeline for this project"
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-transparent p-8 text-center pt-32">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Project Not Found</h1>
        <Link to="/">
          <Button variant="outline" className="mt-4">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent p-4 md:p-8 transition-colors duration-300 font-sans">
      <div className="max-w-5xl mx-auto pt-10">
        <div className="mb-10 flex items-start justify-between">
          <div>
            <Link to="/">
              <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
              </Button>
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <BarChart className="h-4 w-4" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {project.name}
              </h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              {project.company ? `Client: ${project.company} | ` : ''} 
              Started on {new Date(project.start_date).toLocaleDateString()}
            </p>
          </div>
        </div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {projectLinks.map((item) => (
            <motion.div key={item.to} variants={itemVariants}>
              <Link to={item.to} className="block h-full group">
                <GlassCard delay={0} noAnimation className="h-full p-8 flex flex-col justify-between hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors duration-500 rounded-3xl">
                  <div className="flex items-center justify-between mb-8">
                    <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-800 dark:text-slate-200 group-hover:scale-110 transition-transform duration-500">
                      <item.icon className="h-6 w-6 stroke-[1.5]" />
                    </div>
                    <div className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-slate-900 group-hover:border-transparent transition-all duration-300 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-medium text-slate-900 dark:text-slate-100 mb-2 tracking-tight">
                      {item.title}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-light">
                      {item.desc}
                    </p>
                  </div>
                </GlassCard>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
