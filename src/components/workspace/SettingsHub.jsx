import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Save, Code, Palette, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthProvider';
import { useTheme } from '@/context/ThemeProvider';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { containerVariants, itemVariants } from '@/lib/animations';

export default function SettingsHub() {
  const { user } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    role: '',
    githubToken: ''
  });

  useEffect(() => {
    if (user) {
      setProfile(prev => ({
        ...prev,
        name: user.user_metadata?.full_name || '',
      }));
      fetchProfileData();
      
      // Load github token from local storage
      const token = localStorage.getItem('github_pat');
      if (token) {
        setProfile(prev => ({ ...prev, githubToken: token }));
      }
    }
  }, [user]);

  const fetchProfileData = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setProfile(prev => ({
          ...prev,
          role: data.role || 'executor',
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // 1. Save GitHub Token to LocalStorage
      if (profile.githubToken) {
        localStorage.setItem('github_pat', profile.githubToken);
      } else {
        localStorage.removeItem('github_pat');
      }

      // 2. Update user metadata
      if (profile.name !== user.user_metadata?.full_name) {
        await supabase.auth.updateUser({
          data: { full_name: profile.name }
        });
      }

      addToast("Settings saved successfully", "success");
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f6f3] dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-8 transition-colors duration-300">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link to="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Settings & Integrations
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Manage your preferences, connections, and profile.</p>
        </div>

        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
          
          {/* GitHub Integration */}
          <motion.div variants={itemVariants}>
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <Code className="h-4 w-4" />
                  </div>
                  GitHub Integration
                </CardTitle>
                <CardDescription>Connect your GitHub account to view PRs and Commits on the dashboard.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Personal Access Token (Classic or Fine-grained)</label>
                    <Input 
                      type="password" 
                      placeholder="ghp_xxxxxxxxxxxx" 
                      value={profile.githubToken}
                      onChange={(e) => setProfile({...profile, githubToken: e.target.value})}
                      className="max-w-md font-mono"
                    />
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <ShieldCheck className="h-3 w-3" />
                      Stored locally in your browser. Never sent to our servers.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* User Profile */}
          <motion.div variants={itemVariants}>
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Display Name</label>
                    <Input 
                      value={profile.name}
                      onChange={(e) => setProfile({...profile, name: e.target.value})}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Account Role</label>
                    <Input 
                      value={profile.role === 'reviewer' ? 'Manager / Reviewer' : 'Developer / Executor'}
                      disabled
                      className="bg-slate-50 dark:bg-slate-900 text-slate-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Appearance */}
          <motion.div variants={itemVariants}>
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 flex items-center justify-center">
                    <Palette className="h-4 w-4" />
                  </div>
                  Appearance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                  <div>
                    <h3 className="font-medium">Theme Preference</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Toggle between light and dark mode</p>
                  </div>
                  <Button onClick={toggleTheme} variant="outline" className="rounded-xl">
                    {dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Save Action */}
          <motion.div variants={itemVariants} className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={loading} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 px-8">
              {loading ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Preferences
            </Button>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
