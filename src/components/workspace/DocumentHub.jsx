import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthProvider';
import { useTheme } from '@/context/ThemeProvider';
import { Button } from '@/components/ui/button';
import { containerVariants, itemVariants } from '@/lib/animations';
import { ArrowLeft, FileText, Plus, Search, Trash2, CalendarDays } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import ConfirmDialog from '@/components/ui/confirm-dialog';

export default function DocumentHub() {
  const { user } = useAuth();
  const { dark } = useTheme();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    if (user?.id) {
      fetchDocuments();
    }
  }, [user?.id]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
           console.error("Documents table not found. Please create it.");
           addToast("Please create the 'documents' table in Supabase first.", "error");
        } else {
           throw error;
        }
      } else {
        setDocuments(data || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDocument = async () => {
    try {
      const newDoc = {
        user_id: user.id,
        title: 'Untitled Document',
        content: '',
      };

      const { data, error } = await supabase
        .from('documents')
        .insert([newDoc])
        .select()
        .single();

      if (error) throw error;
      
      addToast("Document created", "success");
      navigate(`/documents/${data.id}`);
    } catch (error) {
      console.error('Error creating document:', error);
      if (error.code === '42P01') {
        addToast("Please create the 'documents' table in Supabase first.", "error");
      } else {
        addToast(`Error: ${error.message || 'Failed to create document'}`, "error");
      }
    }
  };

  const deleteDocument = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;
      
      setDocuments(documents.filter(doc => doc.id !== deleteId));
      addToast("Document deleted", "success");
    } catch (error) {
      console.error('Error deleting document:', error);
      addToast("Error deleting document", "error");
    } finally {
      setDeleteId(null);
    }
  };

  const filteredDocs = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f7f6f3] dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300 p-6 md:p-8">
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Document"
        message="Are you sure you want to delete this document? This action cannot be undone."
        onConfirm={deleteDocument}
        onCancel={() => setDeleteId(null)}
      />

      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl px-3">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Documents</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Create and edit Word-like documents</p>
            </div>
          </div>
          <Button 
            onClick={createDocument} 
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md self-start md:self-auto"
          >
            <Plus className="h-4 w-4 mr-2" /> New Document
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-shadow text-sm"
          />
        </div>

        {/* Document Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-20 bg-white/50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700 border-dashed">
            <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">No documents found</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
              {searchQuery ? "Try adjusting your search query." : "Get started by creating your first document."}
            </p>
            {!searchQuery && (
              <Button onClick={createDocument} className="rounded-xl bg-slate-900 dark:bg-slate-100 dark:text-slate-900">
                <Plus className="h-4 w-4 mr-2" /> Create Blank Document
              </Button>
            )}
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
          >
            {filteredDocs.map((doc) => (
              <motion.div key={doc.id} variants={itemVariants}>
                <div className="group relative h-64 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden">
                  
                  {/* Document Preview (Mockup) */}
                  <Link to={`/documents/${doc.id}`} className="flex-1 bg-slate-50 dark:bg-slate-900/50 p-4 border-b border-slate-100 dark:border-slate-700/50 overflow-hidden cursor-pointer flex justify-center pt-8">
                     <div className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 w-3/4 h-full rounded-t-md p-3 text-[8px] text-slate-300 dark:text-slate-600 overflow-hidden" dangerouslySetInnerHTML={{ __html: doc.content?.substring(0, 500) || '...' }} />
                  </Link>
                  
                  {/* Document Info */}
                  <div className="p-4 bg-white dark:bg-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link to={`/documents/${doc.id}`} className="block">
                          <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {doc.title || 'Untitled Document'}
                          </h3>
                        </Link>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                          <CalendarDays className="h-3 w-3" />
                          <span>{new Date(doc.updated_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.preventDefault(); setDeleteId(doc.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
