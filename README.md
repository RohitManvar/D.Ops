# D.Ops Daily Notes & Operations

A powerful, fast, and feature-rich Daily Operations Workspace built with React 19, Vite, Tailwind CSS, and Supabase. 

D.Ops is designed to help you track daily summaries, log blockers, plan for tomorrow, and manage project updates seamlessly.

## 🚀 Features

- **Authentication & Security:** Fully protected routing with Supabase authentication.
- **Rich Markdown Editor:** A distraction-free markdown editing experience for logging summaries, blockers, and tomorrow's plans.
- **Global Command Palette (Ctrl+K):** Instantly search across your historical notes and navigate the application via keyboard.
- **Analytics Dashboard:** Visual tracking of your productivity, completed tasks, pending tasks, and top projects using interactive charts.
- **Progressive Web App (PWA):** Installable on desktop and mobile devices with caching and offline support.
- **Real-Time Data Sync:** Secure cloud database storage via Supabase with automatic syncing across devices.
- **Dark Mode Support:** Beautifully designed light and dark modes tailored for developer aesthetics.

## 🛠️ Technology Stack

- **Frontend:** React 19, Vite
- **Styling:** Tailwind CSS, Framer Motion (for micro-animations), Lucide React (for icons)
- **Editor:** `@uiw/react-md-editor`
- **Charts:** Recharts
- **Backend/Auth:** Supabase

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
