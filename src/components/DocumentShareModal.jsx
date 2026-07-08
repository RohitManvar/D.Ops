import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthProvider";
import {
  X, Share2, Link, Check, Lock, Trash2, Copy, ChevronDown, Globe
} from "lucide-react";

function generateToken() {
  const arr = new Uint8Array(18);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, "0")).join("");
}

function todayISO() { return new Date().toISOString().slice(0, 10); }

export default function DocumentShareModal({ open, onClose, documentId }) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [permissionLevel, setPermissionLevel] = useState("read"); // "read" | "write" | "review"
  const [customMessage, setCustomMessage] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState(null);
  
  const [existingLinks, setExistingLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(false);

  useEffect(() => {
    if (open && user && documentId) {
      loadExisting();
    }
  }, [open, user, documentId]);

  const loadExisting = async () => {
    setLoadingLinks(true);
    const { data } = await supabase
      .from("shared_links")
      .select("*")
      .eq("user_id", user.id)
      .eq("share_type", "document")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false });
    
    setExistingLinks(data || []);
    setLoadingLinks(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const token = generateToken();
    const today = todayISO();

    const payload = {
      token,
      user_id: user.id,
      share_type: "document",
      document_id: documentId,
      date_range_start: today, // Required by DB but irrelevant for docs
      date_range_end: today,
      custom_message: customMessage.trim() || null,
      permission_level: permissionLevel,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("shared_links").insert(payload).select().single();
    if (error) {
      console.error("Share link error:", error);
      addToast(error.message || "Failed to create share link", "error");
      setGenerating(false);
      return;
    }

    const link = `${window.location.origin}/doc/${token}`;
    setGeneratedLink({ ...data, url: link });
    setExistingLinks([data, ...existingLinks]);
    setGenerating(false);
    addToast("Share link created!", "success");
  };

  const copyLink = (url) => {
    navigator.clipboard.writeText(url);
    addToast("Link copied!", "copied");
  };

  const deleteLink = async (id) => {
    await supabase.from("shared_links").delete().eq("id", id);
    setExistingLinks(prev => prev.filter(l => l.id !== id));
    if (generatedLink?.id === id) setGeneratedLink(null);
    addToast("Link deleted", "deleted");
  };

  const updateLinkPermission = async (id, newPermission) => {
    const { error } = await supabase
      .from("shared_links")
      .update({ permission_level: newPermission })
      .eq("id", id);
      
    if (error) {
      addToast("Failed to update permission", "error");
      return;
    }
    
    setExistingLinks(prev => prev.map(l => l.id === id ? { ...l, permission_level: newPermission } : l));
    if (generatedLink?.id === id) {
      setGeneratedLink({ ...generatedLink, permission_level: newPermission });
    }
    addToast("Permission updated!", "success");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-[500px] bg-white dark:bg-slate-800 shadow-2xl overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur border-b border-slate-100 dark:border-slate-700">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Share2 className="h-5 w-5" /> Share Document
              </h2>
              <button onClick={onClose} className="rounded-xl p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-6 space-y-6">
              
              {/* Permission level selection */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                  Link Permission Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[{value: "read", label: "Read Only"}, {value: "write", label: "Edit / Write"}, {value: "review", label: "Review / Comment"}].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setPermissionLevel(opt.value)}
                      className={`flex flex-col items-center justify-center gap-1 rounded-2xl border p-2 text-center transition ${
                        permissionLevel === opt.value
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm"
                          : "border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                      }`}
                    >
                      <span className="text-xs font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom message */}
              <div>
                <button
                  onClick={() => setShowCustom(v => !v)}
                  className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${showCustom ? "rotate-180" : ""}`} />
                  Add a personal note (optional)
                </button>
                <AnimatePresence>
                  {showCustom && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <textarea
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        placeholder="E.g. Hey, please review this document..."
                        rows={3}
                        className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-300"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full rounded-2xl h-11 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {generating ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white/40 border-t-white rounded-full" />
                    Generating link...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Link className="h-4 w-4" /> Generate Public Link
                  </span>
                )}
              </Button>

              {/* Generated link result */}
              <AnimatePresence>
                {generatedLink && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        <span className="text-sm font-medium">Link ready!</span>
                      </div>
                      <select 
                        value={generatedLink.permission_level || 'read'}
                        onChange={(e) => updateLinkPermission(generatedLink.id, e.target.value)}
                        className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-xs font-bold uppercase tracking-wider rounded-md px-2 py-1 border-none focus:ring-0 cursor-pointer outline-none"
                      >
                        <option value="read">Read Only</option>
                        <option value="write">Write</option>
                        <option value="review">Review</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2">
                      <span className="text-xs text-slate-500 truncate flex-1">{generatedLink.url}</span>
                      <button
                        onClick={() => copyLink(generatedLink.url)}
                        className="shrink-0 rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                      >
                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Button onClick={() => copyLink(generatedLink.url)} className="w-full rounded-xl h-9 text-sm" variant="default">
                        <Copy className="mr-2 h-3.5 w-3.5" /> Copy
                      </Button>
                      <Button onClick={() => window.open(generatedLink.url, '_blank')} className="w-full rounded-xl h-9 text-sm" variant="outline">
                        <Globe className="mr-2 h-3.5 w-3.5" /> Open
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Separator />

              {/* Existing links */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Active Links for this Document</p>
                {loadingLinks && <p className="text-xs text-slate-400">Loading...</p>}
                {!loadingLinks && existingLinks.length === 0 && (
                  <p className="text-xs text-slate-400">No active links.</p>
                )}
                {existingLinks.map(link => {
                  const url = `${window.location.origin}/doc/${link.token}`;
                  return (
                    <div key={link.id} className="rounded-2xl border border-slate-200 dark:border-slate-600 p-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <select 
                            value={link.permission_level || 'read'}
                            onChange={(e) => updateLinkPermission(link.id, e.target.value)}
                            className={`px-1 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider cursor-pointer border-none focus:ring-0 outline-none ${
                              link.permission_level === 'write' ? 'bg-blue-100 text-blue-700' : 
                              link.permission_level === 'review' ? 'bg-purple-100 text-purple-700' : 
                              'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <option value="read">Read Only</option>
                            <option value="write">Write</option>
                            <option value="review">Review</option>
                          </select>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Created on {new Date(link.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {url}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => copyLink(url)}
                          className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                        >
                          <Copy className="h-3.5 w-3.5 text-slate-400" />
                        </button>
                        <button
                          onClick={() => deleteLink(link.id)}
                          className="rounded-lg p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
