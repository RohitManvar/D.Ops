import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEditor, EditorContent } from '@tiptap/react';
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
import { CharacterCount } from '@tiptap/extension-character-count';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import html2pdf from 'html2pdf.js';
import TurndownService from 'turndown';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import DocumentShareModal from '@/components/DocumentShareModal';
import { 
  ArrowLeft, Save, Bold, Italic, Underline as UnderlineIcon, 
  Strikethrough, Heading1, Heading2, Heading3, List, ListOrdered, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Undo, Redo, Printer,
  Highlighter, CheckSquare, Link as LinkIcon, Quote, Code,
  Table as TableIcon, Image as ImageIcon, Download, Share2, FileText, Type, Paintbrush
} from 'lucide-react';

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

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

const MenuBar = ({ editor }) => {
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [painterActive, setPainterActive] = useState(false);
  const [capturedMarks, setCapturedMarks] = useState(null);
  const [currentFontSize, setCurrentFontSize] = useState('16');

  useEffect(() => {
    if (!editor) return;
    const updateSize = () => {
      const size = editor.getAttributes('textStyle').fontSize;
      if (size) {
        setCurrentFontSize(size.replace(/px|pt|em|rem/g, ''));
      } else if (editor.isActive('heading', { level: 1 })) {
        setCurrentFontSize('32');
      } else if (editor.isActive('heading', { level: 2 })) {
        setCurrentFontSize('24');
      } else if (editor.isActive('heading', { level: 3 })) {
        setCurrentFontSize('20');
      } else {
        setCurrentFontSize('16');
      }
    };
    
    editor.on('selectionUpdate', updateSize);
    editor.on('transaction', updateSize);
    updateSize(); // Initial check
    
    return () => {
      editor.off('selectionUpdate', updateSize);
      editor.off('transaction', updateSize);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor || !painterActive || !capturedMarks) return;
    
    const handleMouseUp = () => {
      setTimeout(() => {
        const { empty } = editor.state.selection;
        if (!empty) {
          editor.chain().focus().unsetAllMarks().run();
          
          const chain = editor.chain().focus();
          capturedMarks.forEach(mark => {
            chain.setMark(mark.type.name, mark.attrs);
          });
          chain.run();

          setPainterActive(false);
          setCapturedMarks(null);
        }
      }, 10);
    };

    const dom = editor.view.dom;
    dom.addEventListener('mouseup', handleMouseUp);
    return () => dom.removeEventListener('mouseup', handleMouseUp);
  }, [editor, painterActive, capturedMarks]);

  if (!editor) {
    return null;
  }

  const btnClass = (isActive = false) => `
    p-2 rounded-lg transition-colors flex-shrink-0
    ${isActive 
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
    }
  `;

  return (
    <>
    <div className="flex items-center gap-1 p-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 overflow-x-auto hide-scrollbar sticky top-14 z-10">
      <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className={btnClass(false)} title="Undo"><Undo className="h-4 w-4" /></button>
      <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className={btnClass(false)} title="Redo"><Redo className="h-4 w-4" /></button>
      
      <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />

      <button 
        onClick={() => {
          if (painterActive) {
            setPainterActive(false);
            setCapturedMarks(null);
          } else {
            const marks = editor.state.selection.$from.marks();
            setCapturedMarks(marks);
            setPainterActive(true);
          }
        }} 
        className={btnClass(painterActive)} 
        title="Format Painter"
      >
        <Paintbrush className="h-4 w-4" />
      </button>

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

      <select 
        onChange={(e) => {
          const newSize = e.target.value;
          if (newSize && newSize !== '16') {
            editor.chain().focus().setFontSize(`${newSize}pt`).run();
          } else {
            editor.chain().focus().unsetFontSize().run();
          }
          setCurrentFontSize(newSize);
        }}
        value={Number(currentFontSize) || 16}
        className="h-8 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md px-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
        title="Font Size"
      >
        {FONT_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
      </select>

      <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />

      <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={btnClass(editor.isActive({ textAlign: 'left' }))} title="Align Left"><AlignLeft className="h-4 w-4" /></button>
      <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={btnClass(editor.isActive({ textAlign: 'center' }))} title="Align Center"><AlignCenter className="h-4 w-4" /></button>
      <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={btnClass(editor.isActive({ textAlign: 'right' }))} title="Align Right"><AlignRight className="h-4 w-4" /></button>
      <button onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={btnClass(editor.isActive({ textAlign: 'justify' }))} title="Justify"><AlignJustify className="h-4 w-4" /></button>

      <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />

      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive('bulletList'))} title="Bullet List"><List className="h-4 w-4" /></button>
      <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive('orderedList'))} title="Ordered List"><ListOrdered className="h-4 w-4" /></button>
      <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={btnClass(editor.isActive('taskList'))} title="Task List"><CheckSquare className="h-4 w-4" /></button>

      <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />

      <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-md p-0.5">
        <label className="cursor-pointer p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" title="Text Color">
          <Type className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          <input 
            type="color" 
            onInput={e => editor.chain().focus().setColor(e.target.value).run()} 
            value={editor.getAttributes('textStyle').color || '#000000'} 
            className="absolute opacity-0 w-0 h-0"
          />
        </label>
      </div>
      <button onClick={() => editor.chain().focus().toggleHighlight().run()} className={btnClass(editor.isActive('highlight'))} title="Highlight"><Highlighter className="h-4 w-4" /></button>

      <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />

      <button onClick={() => {
        setLinkUrl(editor.getAttributes('link').href || '');
        setLinkModalOpen(true);
      }} className={btnClass(editor.isActive('link'))} title="Hyperlink"><LinkIcon className="h-4 w-4" /></button>
      
      <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btnClass(editor.isActive('blockquote'))} title="Blockquote"><Quote className="h-4 w-4" /></button>
      <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={btnClass(editor.isActive('codeBlock'))} title="Code Block"><Code className="h-4 w-4" /></button>
      
      <button onClick={() => {
        setImageUrl('');
        setImageModalOpen(true);
      }} className={btnClass(editor.isActive('image'))} title="Insert Image"><ImageIcon className="h-4 w-4" /></button>

      <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />

      <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className={btnClass(editor.isActive('table'))} title="Insert Table"><TableIcon className="h-4 w-4" /></button>
      {editor.isActive('table') && (
        <div className="flex gap-1 bg-blue-50 dark:bg-blue-900/30 p-1 rounded-md ml-2 border border-blue-200 dark:border-blue-800">
          <button onClick={() => editor.chain().focus().addColumnAfter().run()} className="px-2 py-1 text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 rounded">Add Col</button>
          <button onClick={() => editor.chain().focus().addRowAfter().run()} className="px-2 py-1 text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 rounded">Add Row</button>
          <button onClick={() => editor.chain().focus().deleteColumn().run()} className="px-2 py-1 text-[10px] uppercase font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded">Del Col</button>
          <button onClick={() => editor.chain().focus().deleteRow().run()} className="px-2 py-1 text-[10px] uppercase font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded">Del Row</button>
          <button onClick={() => editor.chain().focus().deleteTable().run()} className="px-2 py-1 text-[10px] uppercase font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded">Del Table</button>
        </div>
      )}
    </div>

    {/* Link Modal */}
    {linkModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-700">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200 flex justify-between items-center">
            <span>Insert Link</span>
            <button onClick={() => setLinkModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">&times;</button>
          </div>
          <div className="p-4">
            <input 
              type="url" 
              placeholder="https://example.com" 
              value={linkUrl} 
              onChange={e => setLinkUrl(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (linkUrl) {
                    editor.chain().focus().setLink({ href: linkUrl }).run();
                  } else {
                    editor.chain().focus().unsetLink().run();
                  }
                  setLinkModalOpen(false);
                } else if (e.key === 'Escape') {
                  setLinkModalOpen(false);
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setLinkModalOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={() => {
                if (linkUrl) {
                  editor.chain().focus().setLink({ href: linkUrl }).run();
                } else {
                  editor.chain().focus().unsetLink().run();
                }
                setLinkModalOpen(false);
              }} className="bg-blue-600 hover:bg-blue-700 text-white">Save Link</Button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Image Modal */}
    {imageModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-700">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200 flex justify-between items-center">
            <span>Insert Image</span>
            <button onClick={() => setImageModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">&times;</button>
          </div>
          <div className="p-4">
            <input 
              type="url" 
              placeholder="https://example.com/image.png" 
              value={imageUrl} 
              onChange={e => setImageUrl(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (imageUrl) {
                    editor.chain().focus().setImage({ src: imageUrl }).run();
                  }
                  setImageModalOpen(false);
                } else if (e.key === 'Escape') {
                  setImageModalOpen(false);
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setImageModalOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={() => {
                if (imageUrl) {
                  editor.chain().focus().setImage({ src: imageUrl }).run();
                }
                setImageModalOpen(false);
              }} className="bg-blue-600 hover:bg-blue-700 text-white">Insert Image</Button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
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
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

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
      LinkExtension.configure({ openOnClick: false }),
      Image,
      CharacterCount,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
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

  // Listen for Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [title, editor]);

  const handleShare = () => {
    if (!docData) return;
    setShareModalOpen(true);
  };

  const exportToPDF = () => {
    const element = document.querySelector('.ProseMirror');
    const opt = {
      margin:       0.5,
      filename:     `${title || 'Document'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
    setExportMenuOpen(false);
  };

  const exportToMarkdown = () => {
    if (!editor) return;
    const turndownService = new TurndownService({ headingStyle: 'atx' });
    const markdown = turndownService.turndown(editor.getHTML());
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'Document'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f6f3] dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#f7f6f3] dark:bg-[#0f172a] flex flex-col overflow-hidden">
      {/* Top Navbar */}
      <div className="h-14 shrink-0 bg-white/80 backdrop-blur-md dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 print:hidden shadow-sm z-20">
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
        
        <div className="flex items-center gap-3 relative">
          <span className="hidden md:inline-block text-xs text-slate-400">
            {editor ? `${editor.storage.characterCount.words()} words` : ''}
          </span>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 hidden md:block" />
          <span className="text-xs text-slate-400">
            {saving ? 'Saving...' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : ''}
          </span>
          
          <Button variant="outline" size="sm" onClick={handleShare} className="h-8 gap-1.5 rounded-lg bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 shadow-sm ml-2">
            <Share2 className="h-3.5 w-3.5" /> Share
          </Button>

          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setExportMenuOpen(!exportMenuOpen)} className="hidden sm:flex h-8 gap-1.5 rounded-lg bg-white dark:bg-slate-800">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            {exportMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden py-1">
                  <button onClick={() => { window.print(); setExportMenuOpen(false); }} className="w-full px-4 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Printer className="h-4 w-4 text-slate-500" /> Print Document
                  </button>
                  <button onClick={exportToPDF} className="w-full px-4 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <FileText className="h-4 w-4 text-red-500" /> Download PDF
                  </button>
                  <button onClick={exportToMarkdown} className="w-full px-4 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <FileText className="h-4 w-4 text-blue-500" /> Download Markdown
                  </button>
                </div>
              </>
            )}
          </div>

          <Button size="sm" onClick={handleManualSave} className="h-8 gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            <Save className="h-3.5 w-3.5" /> Save
          </Button>
        </div>
      </div>

      {/* Editor Toolbar */}
      <div className="shrink-0 print:hidden shadow-sm z-10 relative">
        <MenuBar editor={editor} />
      </div>

      {/* Editor Content Area (The "Paper") */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center print:p-0 print:overflow-visible relative">
        <div className="w-full max-w-[816px] print:max-w-none pb-32">
          <EditorContent editor={editor} />
        </div>
      </div>

      <DocumentShareModal 
        open={shareModalOpen} 
        onClose={() => setShareModalOpen(false)} 
        documentId={id} 
      />
    </div>
  );
}
