# Quiz.AI - Live Automated Grading & Google Sheets Sync

<div align="center">
  <video src="public/quiz_working.mp4" width="100%" style="max-width: 800px; border-radius: 16px;" autoplay muted loop playsinline></video>
</div>

An advanced, responsive, and secure academic portal designed to facilitate real-time quiz creation, automatic grading, and seamless Google Sheets integration. Built with React, TypeScript, TailwindCSS, and the Google Sheets API.

View the application in Google AI Studio: [AI Studio App Link](https://ai.studio/apps/9c45d251-d7b7-4fce-8a17-5986607ea0fc)

---

## 🚀 Key Features

### 👨‍🏫 Teacher Dashboard
- **Comprehensive Analytics**: View completion rates, average scores, time spent, and grade distributions.
- **Dynamic Quiz Builder**: Create timed or untimed quizzes with customized question points and multiple-choice options.
- **Spreadsheet Syncing**: Link quizzes to Google Sheets with automated headers and row-appending.
- **Manual Sheet Integration**: Input Sheet IDs manually to hook into existing student report files.

### 🎓 Student Portal
- **Interactive Academic Gateway**: Clean, immersive testing UI with automated timed sessions.
- **Real-time Scoring & Grading**: Compute grade distributions (A+, A, B, C, D, F) instantly upon quiz completion.
- **Immediate Feedback**: Display detailed score spectrum analysis and answers overview.

### 🔐 Integrations & Authentication
- **Official Google OAuth 2.0 Flow**: Authentic client-side credentials synchronization.
- **IFrame Sandbox Safe Mode**: Manual OAuth token entry fallback to ensure reliable operation within sandboxed environments (like Google AI Studio Applet previews).

---

## 🛠️ Tech Stack
- **Frontend Core**: React 19, TypeScript
- **Styling**: TailwindCSS 4 (via `@tailwindcss/vite` plugin), Lucide React (Icons)
- **Charts & Visualization**: Recharts
- **Build Tool**: Vite
- **APIs Used**: Google Sheets API v4, Google Drive API

---

## 📂 Project Structure
- `src/components/`: Modular presentation components
  - [`Navbar.tsx`](file:///Users/harshul/Contribution/quizzzz/src/components/Navbar.tsx): Tab-based view navigation
  - [`TeacherDashboard.tsx`](file:///Users/harshul/Contribution/quizzzz/src/components/TeacherDashboard.tsx): Detailed analytics, quiz builder, and sync actions
  - [`StudentPortal.tsx`](file:///Users/harshul/Contribution/quizzzz/src/components/StudentPortal.tsx): Interactive test interface and exam submission module
- `src/utils/`: Core integration helpers
  - [`googleSheets.ts`](file:///Users/harshul/Contribution/quizzzz/src/utils/googleSheets.ts): Google Sheets API v4 communication layers
- `src/types.ts`: Clean TypeScript interface declarations
- `src/mockData.ts`: Default academic examinations and submission logs

---

## ⚙️ Running Locally

### Prerequisites
- Node.js (v18+)
- npm

### Installation & Run Steps
1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory:
   ```env
   VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
   ```
   *(For details on generating a Google Client ID, refer to the [Google Sign-In Setup Guide](file:///Users/harshul/Contribution/quizzzz/GOOGLE_SIGN_IN_GUIDE.md))*

3. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   The app will run locally at `http://localhost:3000`.

---

## 📘 Documentation Guides
- **[Google OAuth Setup Guide](file:///Users/harshul/Contribution/quizzzz/GOOGLE_SIGN_IN_GUIDE.md)**: Full steps to enable Google Sheets & Drive API, configure credentials, and map authorized JavaScript origins.
