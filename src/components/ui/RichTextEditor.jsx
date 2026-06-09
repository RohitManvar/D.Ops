import React from 'react';
import MDEditor from '@uiw/react-md-editor';
import { useTheme } from '@/context/ThemeProvider';

export function RichTextEditor({ value, onChange, placeholder, minHeight = 150 }) {
  const { dark } = useTheme();

  return (
    <div className="w-full relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm transition-all focus-within:ring-2 focus-within:ring-indigo-500">
      <div data-color-mode={dark ? "dark" : "light"}>
        <MDEditor
          value={value || ''}
          onChange={(val) => onChange(val || '')}
          height={minHeight}
          preview="edit"
          hideToolbar={true}
          textareaProps={{
            placeholder: placeholder
          }}
          style={{
            borderRadius: '0',
            border: 'none',
            boxShadow: 'none',
            '--color-canvas-default': 'transparent',
            backgroundColor: dark ? '#1e293b' : '#ffffff',
          }}
        />
      </div>
    </div>
  );
}
