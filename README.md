# D.Ops Daily Notes & Operations

A powerful, fast, and feature-rich Daily Operations Workspace built with React 19, Vite, Tailwind CSS, and Supabase. 

D.Ops is designed to help you track daily summaries, plan projects with advanced Gantt charts, author rich documents, and manage project updates seamlessly.

## 🚀 Features

- **Authentication & Security:** Fully protected routing with Supabase authentication.
- **Project Hub & Sprint Planning:** Manage multiple projects, categorize by studio, log sprints, and oversee deliverables.
- **Interactive Gantt Chart:** Advanced drag-and-drop timeline planning. 
  - **Double-Click Edit:** Instantly edit task details or category names inline.
  - **Context Menus:** Right-click tasks or sprints to trigger WhatsApp-style quick actions (⭐ Highlight, ✔️✔️ Mark Complete, 🚩 Flag Milestone).
  - **Undo History:** Built-in history stack (Ctrl+Z) for mistake-free planning.
- **Notion-style Document Editor:** A full-featured Rich Text Editor built with TipTap.
  - Features include customizable text sizes, highlight/font colors, task lists, code blocks, tables, and a **Format Painter**.
  - **Exporting:** Download your documents as PDF, Word (.docx), Markdown, or HTML.
  - **Public Share Links:** Securely share read-only versions of your documents via unique generated URLs.
- **Global Command Palette (Ctrl+K):** Instantly search across your historical notes and navigate the application via keyboard.
- **Analytics Dashboard:** Visual tracking of your productivity, completed tasks, pending tasks, and top projects using interactive charts.
- **Progressive Web App (PWA):** Installable on desktop and mobile devices with caching and offline support.
- **Real-Time Data Sync:** Secure cloud database storage via Supabase with automatic syncing across devices.
- **Dark Mode Support:** Beautifully designed light and dark modes tailored for developer aesthetics.

## 🛠️ Technology Stack

- **Frontend:** React 19, Vite
- **Styling:** Tailwind CSS, Framer Motion (for micro-animations), Lucide React (for icons)
- **Editors:** TipTap (Rich Text), `@uiw/react-md-editor` (Markdown)
- **Charts:** Recharts
- **Backend/Auth:** Supabase
- **PDF Generation:** `html2pdf.js`

## 🏃‍♂️ Running Locally

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

## 📝 License

This project is open-source and available under the MIT License.
