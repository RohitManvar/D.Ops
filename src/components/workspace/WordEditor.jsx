import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { 
  ArrowLeft, Save, Bold, Italic, Underline as UnderlineIcon, 
  Strikethrough, Heading1, Heading2, Heading3, List, ListOrdered, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Undo, Redo, Printer
} from 'lucide-react';

const MenuBar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  const btnClass = (isActive) => `p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${isActive ? 'bg-slate-200 dark:bg-slate-700 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`;

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
      <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className={btnClass(false)} title="Undo"><Undo className="h-4 w-4" /></button>
      <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className={btnClass(false)} title="Redo"><Redo className="h-4 w-4" /></button>
      
      <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />

      <button onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive('bold'))} title="Bold"><Bold className="h-4 w-4" /></button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive('italic'))} title="Italic"><Italic className="h-4 w-4" /></button>
      <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={btnClass(editor.isActive('underline'))} title="Underline"><UnderlineIcon className="h-4 w-4" /></button>
      <button onClick={() => editor.chain().focus().toggleStrike().run()} className={btnClass(editor.isActive('strike'))} title="Strikethrough"><Strikethrough className="h-4 w-4" /></button>

      <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />

      <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btnClass(editor.isActive('heading', { level: 1 }))} title="Heading 1"><Heading1 className="h-4 w-4" /></button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnClass(editor.isActive('heading', { level: 2 }))} title="Heading 2"><Heading2 className="h-4 w-4" /></button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btnClass(editor.isActive('heading', { level: 3 }))} title="Heading 3"><Heading3 className="h-4 w-4" /></button>

      <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />

      <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={btnClass(editor.isActive({ textAlign: 'left' }))} title="Align Left"><AlignLeft className="h-4 w-4" /></button>
      <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={btnClass(editor.isActive({ textAlign: 'center' }))} title="Align Center"><AlignCenter className="h-4 w-4" /></button>
      <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={btnClass(editor.isActive({ textAlign: 'right' }))} title="Align Right"><AlignRight className="h-4 w-4" /></button>
      <button onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={btnClass(editor.isActive({ textAlign: 'justify' }))} title="Justify"><AlignJustify className="h-4 w-4" /></button>

      <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />

      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive('bulletList'))} title="Bullet List"><List className="h-4 w-4" /></button>
      <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive('orderedList'))} title="Ordered List"><ListOrdered className="h-4 w-4" /></button>
    </div>
  );
};

export default function WordEditor() {
  const { id, projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [docData, setDocData] = useState(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[800px] p-12 bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-700 print:shadow-none print:border-none print:p-0',
      },
    },
    onUpdate: () => {
      debouncedSave();
    }
  });

  useEffect(() => {
    if (user?.id && id) {
      loadDocument();
    }
  }, [user?.id, id]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      setTitle(data.title);
      setDocData(data);
      setLastSaved(new Date(data.updated_at));
    } catch (error) {
      console.error('Error loading document:', error);
      addToast(`Error: ${error.message || 'Failed to load document'}`, "error");
      navigate('/documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (editor && docData && !editor.isDestroyed) {
      editor.commands.setContent(docData.content);
    }
  }, [editor, docData]);

  const saveDocument = async (currentTitle, currentContent) => {
    if (!user || !id) return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from('documents')
        .update({
          title: currentTitle,
          content: currentContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving document:', error);
      addToast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  // Debounced save
  const debouncedSave = useCallback(() => {
    const handler = setTimeout(() => {
      if (editor) {
        saveDocument(title, editor.getHTML());
      }
    }, 2000);
    return () => clearTimeout(handler);
  }, [title, editor]);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    debouncedSave();
  };

  const handleManualSave = () => {
    if (editor) {
      saveDocument(title, editor.getHTML());
      addToast("Saved manually", "success");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f6f3] dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f6f3] dark:bg-[#0f172a] flex flex-col">
      {/* Top Navbar */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-white/80 backdrop-blur-md dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 z-40 print:hidden shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          <Link to={projectId ? `/project/${projectId}/documents` : "/documents"}>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Input 
            value={title}
            onChange={handleTitleChange}
            className="h-8 text-lg font-semibold bg-transparent border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus-visible:ring-1 focus-visible:ring-blue-500 px-2 max-w-sm rounded-md transition-colors"
            placeholder="Untitled Document"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            {saving ? 'Saving...' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : ''}
          </span>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="hidden sm:flex h-8 gap-1.5 rounded-lg bg-white dark:bg-slate-800">
             <Printer className="h-3.5 w-3.5" /> Print
          </Button>
          <Button size="sm" onClick={handleManualSave} className="h-8 gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            <Save className="h-3.5 w-3.5" /> Save
          </Button>
        </div>
      </div>

      {/* Editor Toolbar */}
      <div className="fixed top-14 left-0 right-0 z-30 print:hidden shadow-sm">
        <MenuBar editor={editor} />
      </div>

      {/* Editor Content Area (The "Paper") */}
      <div className="flex-1 overflow-auto pt-32 p-4 md:p-8 flex justify-center print:p-0 print:overflow-visible">
        <div className="w-full max-w-[816px] print:max-w-none">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
