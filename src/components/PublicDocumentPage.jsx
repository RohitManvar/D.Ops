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
import { AlertCircle, FileText, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [docData, setDocData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        class: 'prose dark:prose-invert max-w-none min-h-[800px] p-8 md:p-12 bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-700 print:shadow-none print:border-none print:p-0',
      },
    },
  });

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('share_token', token)
        .single();

      if (error || !data) {
        setError("This document link is invalid or has been deleted.");
        setLoading(false);
        return;
      }

      setDocData(data);
      if (editor && !editor.isDestroyed) {
        editor.commands.setContent(data.content);
      }
      setLoading(false);
    };
    load();
  }, [token, editor]);

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
          <span className="ml-2 text-xs text-slate-400 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5">Read Only</span>
        </div>
        
        <div className="flex items-center gap-2">
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
        </div>
      </div>
    </div>
  );
}
