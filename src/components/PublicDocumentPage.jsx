import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { EditorContent, useEditor } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Highlight } from '@tiptap/extension-highlight';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Link as LinkExtension } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { AlertCircle, FileText, Printer, Download, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import html2pdf from 'html2pdf.js';

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run();
      },
    };
  },
});

export default function PublicDocumentPage() {
  const { token } = useParams();
  const { addToast } = useToast();
  const [docData, setDocData] = useState(null);
  const [permissionLevel, setPermissionLevel] = useState('read');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [reviewerFeedback, setReviewerFeedback] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Color,
      TextStyle,
      FontSize,
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      LinkExtension.configure({ openOnClick: true }),
      Image,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: '',
    editable: false,
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none min-h-[800px] p-8 md:p-12 bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-700 print:shadow-none print:border-none print:p-0 focus:outline-none',
      },
    },
  });

  useEffect(() => {
    if (editor && permissionLevel) {
      editor.setEditable(permissionLevel === 'write');
    }
  }, [editor, permissionLevel]);

  useEffect(() => {
    const load = async () => {
      // 1. Fetch link data
      const { data: linkData, error: linkError } = await supabase
        .from('shared_links')
        .select('*')
        .eq('token', token)
        .single();

      if (linkError || !linkData || linkData.share_type !== 'document') {
        setError("This document link is invalid or has been deleted.");
        setLoading(false);
        return;
      }

      setPermissionLevel(linkData.permission_level || 'read');

      // 2. Fetch document data
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', linkData.document_id)
        .single();

      if (docError || !docData) {
        setError("Document not found.");
        setLoading(false);
        return;
      }

      setDocData(docData);
      if (editor && !editor.isDestroyed) {
        editor.commands.setContent(docData.content);
      }
      setLoading(false);
    };
    load();
  }, [token, editor]);

  const saveChanges = async () => {
    if (!docData || permissionLevel !== 'write' || !editor) return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from('documents')
        .update({
          content: editor.getHTML(),
          updated_at: new Date().toISOString()
        })
        .eq('id', docData.id);

      if (error) throw error;
      addToast("Changes saved successfully", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to save changes", "error");
    } finally {
      setSaving(false);
    }
  };

  const submitFeedback = () => {
    if (!reviewerFeedback.trim()) return;
    setFeedbackSent(true);
    addToast("Feedback submitted to document owner!", "success");
  };

  const exportToPDF = () => {
    const element = document.querySelector('.ProseMirror');
    const opt = {
      margin:       0.5,
      filename:     `${docData?.title || 'Document'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f6f3] dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-6 w-6 border-2 border-slate-900 dark:border-slate-100 border-t-transparent rounded-full mx-auto" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f7f6f3] dark:bg-slate-900 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">Document Not Found</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#f7f6f3] dark:bg-[#0f172a] flex flex-col overflow-hidden">
      {/* Top Navbar */}
      <div className="h-14 shrink-0 bg-white/80 backdrop-blur-md dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 print:hidden shadow-sm z-20">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-blue-500" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">{docData.title || "Untitled Document"}</span>
          <span className={`ml-2 text-[10px] font-bold uppercase tracking-wider rounded-md px-2 py-0.5 ${
            permissionLevel === 'write' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
            permissionLevel === 'review' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
            'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
          }`}>
            {permissionLevel === 'write' ? 'Write Access' : permissionLevel === 'review' ? 'Review Mode' : 'Read Only'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {permissionLevel === 'write' && (
            <Button size="sm" onClick={saveChanges} disabled={saving} className="h-8 gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm mr-2">
              <Save className="h-3.5 w-3.5" /> {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()} className="hidden sm:flex h-8 gap-1.5 rounded-lg bg-white dark:bg-slate-800">
             <Printer className="h-3.5 w-3.5" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={exportToPDF} className="h-8 gap-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-sm">
             <Download className="h-3.5 w-3.5" /> Save PDF
          </Button>
        </div>
      </div>

      {/* Editor Content Area (The "Paper") */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center print:p-0 print:overflow-visible relative">
        <div className="w-full max-w-[816px] print:max-w-none pb-32">
          <EditorContent editor={editor} />
          
          {/* Reviewer Feedback Box */}
          {permissionLevel === 'review' && (
            <div className="mt-8 p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm print:hidden">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Reviewer Feedback</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Leave your comments or suggestions for the document owner.
              </p>
              {feedbackSent ? (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-400 text-sm flex items-center gap-2">
                  <span className="flex-1">Feedback submitted successfully. Thank you!</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    value={reviewerFeedback}
                    onChange={(e) => setReviewerFeedback(e.target.value)}
                    placeholder="Type your feedback here..."
                    rows={4}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <div className="flex justify-end">
                    <Button onClick={submitFeedback} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                      <Send className="h-4 w-4 mr-2" /> Submit Feedback
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
