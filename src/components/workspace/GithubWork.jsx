import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Code, ArrowLeft, Key, ExternalLink, GitPullRequest, MessageSquare, GitCommit, Activity } from 'lucide-react';
import { containerVariants, itemVariants } from '@/lib/animations';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';

export default function GithubWork() {
  const navigate = useNavigate();
  
  const [token, setToken] = useState(() => localStorage.getItem('github_pat') || '');
  const [username, setUsername] = useState(() => localStorage.getItem('github_username') || '');
  const [isConnected, setIsConnected] = useState(!!localStorage.getItem('github_pat'));
  
  const [inputToken, setInputToken] = useState('');
  const [inputUsername, setInputUsername] = useState('');

  const [openPRs, setOpenPRs] = useState([]);
  const [reviewRequests, setReviewRequests] = useState([]);
  const [recentCommits, setRecentCommits] = useState([]);
  const [loading, setLoading] = useState(false);

  const [workflowRuns, setWorkflowRuns] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.provider_token) {
        localStorage.setItem('github_pat', session.provider_token);
        setToken(session.provider_token);
        setIsConnected(true);
        
        try {
          const res = await fetch('https://api.github.com/user', {
            headers: { Authorization: `token ${session.provider_token}` }
          });
          const data = await res.json();
          if (data.login) {
            localStorage.setItem('github_username', data.login);
            setUsername(data.login);
          }
        } catch(e) {
          console.error("Failed to fetch username", e);
        }
      }
    });
  }, []);

  const handleOAuthConnect = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        scopes: 'repo read:user',
        redirectTo: window.location.origin + '/github-work'
      }
    });
    if (error) {
      console.error(error);
      alert("Failed to connect GitHub: " + error.message);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('github_pat');
    localStorage.removeItem('github_username');
    setToken('');
    setUsername('');
    setIsConnected(false);
    setOpenPRs([]);
    setReviewRequests([]);
    setRecentCommits([]);
    setWorkflowRuns([]);
  };

  useEffect(() => {
    if (!isConnected || !token || !username) return;

    async function fetchGithubData() {
      setLoading(true);
      try {
        const headers = {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        };

        // 1. Fetch Open PRs by Author
        const prsRes = await fetch(`https://api.github.com/search/issues?q=is:pr+is:open+author:${username}`, { headers });
        const prsData = await prsRes.json();
        if (prsData.items) setOpenPRs(prsData.items.slice(0, 5));

        // 2. Fetch Review Requests
        const reviewRes = await fetch(`https://api.github.com/search/issues?q=is:pr+is:open+review-requested:${username}`, { headers });
        const reviewData = await reviewRes.json();
        if (reviewData.items) setReviewRequests(reviewData.items.slice(0, 5));

        // 3. Fetch Recent Commits
        const commitsRes = await fetch(`https://api.github.com/search/commits?q=author:${username}&sort=author-date&order=desc`, { headers });
        const commitsData = await commitsRes.json();
        if (commitsData.items) setRecentCommits(commitsData.items.slice(0, 10));

        // 4. Fetch Latest Workflow Runs from the most recently updated repo
        const reposRes = await fetch(`https://api.github.com/user/repos?sort=updated&per_page=1`, { headers });
        const reposData = await reposRes.json();
        if (reposData.length > 0) {
          const repoFullName = reposData[0].full_name;
          const runsRes = await fetch(`https://api.github.com/repos/${repoFullName}/actions/runs?per_page=5`, { headers });
          const runsData = await runsRes.json();
          if (runsData.workflow_runs) setWorkflowRuns(runsData.workflow_runs);
        }

      } catch (err) {
        console.error("Error fetching GitHub data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchGithubData();
  }, [isConnected, token, username]);

  return (
    <div className="min-h-screen bg-transparent p-8 md:p-12">
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
              <Code className="h-8 w-8 text-slate-700 dark:text-slate-300" />
              GitHub Work
            </h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Track pull requests, commits, and code reviews.
            </p>
          </motion.div>
          {isConnected && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <Button variant="outline" onClick={handleDisconnect} className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20">
                Disconnect GitHub
              </Button>
            </motion.div>
          )}
        </div>

        {!isConnected ? (
          /* Connect Screen */
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <GlassCard className="max-w-xl mx-auto border-slate-200/50 dark:border-slate-700/50 p-8">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                  <Code className="h-8 w-8 text-slate-700 dark:text-slate-300" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Connect with GitHub</h2>
                <p className="text-slate-500 dark:text-slate-400">
                  Securely link your GitHub account to D.Ops using Supabase OAuth. We will never store your password.
                </p>
              </div>

              <Button onClick={handleOAuthConnect} className="w-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 py-6 rounded-xl text-md">
                <Code className="mr-2 h-5 w-5" /> Connect via GitHub OAuth
              </Button>
            </GlassCard>
          </motion.div>
        ) : (
          /* Dashboard Screen */
          <motion.div 
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <div className="space-y-8">
              {/* Open PRs */}
              <motion.div variants={itemVariants} className="h-full">
                <GlassCard className="border border-white/40 dark:border-white/10 p-8 rounded-3xl h-full flex flex-col">
                  <h2 className="text-xl font-medium flex items-center gap-3 mb-6 text-slate-900 dark:text-slate-100 tracking-tight">
                    <div className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <GitPullRequest className="h-5 w-5 text-slate-600 dark:text-slate-300 stroke-[1.5]" />
                    </div>
                    My Open PRs
                  </h2>
                  {loading ? (
                    <p className="text-slate-500 font-light">Loading...</p>
                  ) : openPRs.length === 0 ? (
                    <p className="text-slate-500 text-sm font-light">No open pull requests.</p>
                  ) : (
                    <div className="space-y-2">
                      {openPRs.map(pr => (
                        <a key={pr.id} href={pr.html_url} target="_blank" rel="noreferrer" className="block group p-4 rounded-2xl hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors duration-300">
                          <div className="flex justify-between items-center gap-4">
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-0.5">{pr.title}</p>
                              <p className="text-xs text-slate-500 font-light">{pr.repository_url.split('/').slice(-2).join('/')} #{pr.number}</p>
                            </div>
                            <div className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 flex shrink-0 items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-slate-900 group-hover:border-transparent transition-all duration-300 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </GlassCard>
              </motion.div>

              {/* Review Requests */}
              <motion.div variants={itemVariants} className="h-full">
                <GlassCard className="border border-white/40 dark:border-white/10 p-8 rounded-3xl h-full flex flex-col">
                  <h2 className="text-xl font-medium flex items-center gap-3 mb-6 text-slate-900 dark:text-slate-100 tracking-tight">
                    <div className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-slate-600 dark:text-slate-300 stroke-[1.5]" />
                    </div>
                    Review Requests
                  </h2>
                  {loading ? (
                    <p className="text-slate-500 font-light">Loading...</p>
                  ) : reviewRequests.length === 0 ? (
                    <p className="text-slate-500 text-sm font-light">No pending reviews.</p>
                  ) : (
                    <div className="space-y-2">
                      {reviewRequests.map(pr => (
                        <a key={pr.id} href={pr.html_url} target="_blank" rel="noreferrer" className="block group p-4 rounded-2xl hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors duration-300">
                          <div className="flex justify-between items-center gap-4">
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-0.5">{pr.title}</p>
                              <p className="text-xs text-slate-500 font-light">From: {pr.user.login} • {pr.repository_url.split('/').slice(-2).join('/')}</p>
                            </div>
                            <div className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 flex shrink-0 items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-slate-900 group-hover:border-transparent transition-all duration-300 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            </div>

            {/* Recent Commits */}
            <motion.div variants={itemVariants} className="h-full">
              <GlassCard className="border border-white/40 dark:border-white/10 p-8 rounded-3xl h-full flex flex-col">
                <h2 className="text-xl font-medium flex items-center gap-3 mb-6 text-slate-900 dark:text-slate-100 tracking-tight">
                  <div className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <GitCommit className="h-5 w-5 text-slate-600 dark:text-slate-300 stroke-[1.5]" />
                  </div>
                  Recent Activity
                </h2>
                {loading ? (
                  <p className="text-slate-500 font-light">Loading...</p>
                ) : recentCommits.length === 0 ? (
                  <p className="text-slate-500 text-sm font-light">No recent activity found.</p>
                ) : (
                  <div className="space-y-2">
                    {recentCommits.map(commit => (
                      <div key={commit.sha} className="flex gap-4 items-center p-3 rounded-2xl hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors">
                        <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          <GitCommit className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-200 truncate">{commit.commit.message.split('\n')[0]}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-500 font-light">{commit.repository.full_name}</span>
                            <span className="text-[10px] text-slate-400 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-medium">
                              {new Date(commit.commit.author.date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </motion.div>

            {/* Recent Workflow Runs */}
            <motion.div variants={itemVariants} className="h-full lg:col-span-2">
              <GlassCard className="border border-white/40 dark:border-white/10 p-8 rounded-3xl h-full flex flex-col">
                <h2 className="text-xl font-medium flex items-center gap-3 mb-6 text-slate-900 dark:text-slate-100 tracking-tight">
                  <div className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-slate-600 dark:text-slate-300 stroke-[1.5]" />
                  </div>
                  Recent Actions Builds
                </h2>
                {loading ? (
                  <p className="text-slate-500 font-light">Loading...</p>
                ) : workflowRuns.length === 0 ? (
                  <p className="text-slate-500 text-sm font-light">No recent workflow runs found.</p>
                ) : (
                  <div className="space-y-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {workflowRuns.map(run => (
                      <a key={run.id} href={run.html_url} target="_blank" rel="noreferrer" className="block group p-5 rounded-2xl hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors duration-300 border border-transparent hover:border-white/40 dark:hover:border-white/10">
                        <div className="flex justify-between items-center gap-4">
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">{run.name}</p>
                            <p className="text-xs text-slate-500 font-light">{run.repository.full_name} • {run.head_branch}</p>
                          </div>
                          <span className={`px-2.5 py-1 text-[10px] uppercase font-semibold rounded-full ${
                            run.conclusion === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            run.conclusion === 'failure' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {run.conclusion || run.status}
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
