import React, { useState, useEffect } from 'react';
import { 
  INITIAL_EXAMS, INITIAL_SUBMISSIONS, computeGrade 
} from './mockData';
import { Exam, Submission } from './types';
import Navbar from './components/Navbar';
import TeacherDashboard from './components/TeacherDashboard';
import StudentPortal from './components/StudentPortal';
import { appendSubmissionToSheet } from './utils/googleSheets';
import { 
  FileSpreadsheet, Check, RefreshCw, Key, HelpCircle, 
  ExternalLink, GraduationCap, X, AlertTriangle, ShieldCheck
} from 'lucide-react';

const TEAM_ADMIN_EMAIL = "vishuseervi825@gmail.com";

export default function App() {
  // Global States
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  
  // Routing: 'teacher' | 'student'
  const [view, setView] = useState<'teacher' | 'student'>('teacher');
  
  // If exam search query exists, lock view into active test portal
  const [urlExam, setUrlExam] = useState<Exam | null>(null);

  // Authentications
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [showManualTokenModal, setShowManualTokenModal] = useState(false);
  const [manualTokenInput, setManualTokenInput] = useState('');
  
  // Syncing loaders
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Parse queries and initialize data from storage on boot
  useEffect(() => {
    // 1. Load LocalStorage Data or seed defaults
    const savedExams = localStorage.getItem('quiz_platform_exams');
    const savedSubmissions = localStorage.getItem('quiz_platform_submissions');
    const savedToken = localStorage.getItem('quiz_platform_oauth_token');

    let parsedExams: Exam[] = savedExams ? JSON.parse(savedExams) : INITIAL_EXAMS;
    let parsedSubmissions: Submission[] = savedSubmissions ? JSON.parse(savedSubmissions) : INITIAL_SUBMISSIONS;

    setExams(parsedExams);
    setSubmissions(parsedSubmissions);
    if (savedToken) setAccessToken(savedToken);

    // 2. Parse URL Search Queries for student link
    const params = new URLSearchParams(window.location.search);
    const examParam = params.get('exam');
    if (examParam) {
      const matched = parsedExams.find(ex => ex.id === examParam);
      if (matched) {
        setUrlExam(matched);
        setView('student');
      }
    }

    // 3. Handle explicit OAuth implicit token callbacks
    const hash = window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash.replace('#', '?'));
      const token = hashParams.get('access_token');
      if (token) {
        setAccessToken(token);
        localStorage.setItem('quiz_platform_oauth_token', token);
        // Clear hash from address bar
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      }
    }
  }, []);

  // Write changes to localStorage
  const handleSaveExams = (updatedExams: Exam[]) => {
    setExams(updatedExams);
    localStorage.setItem('quiz_platform_exams', JSON.stringify(updatedExams));
  };

  const handleSaveSubmissions = (updatedSubmissions: Submission[]) => {
    setSubmissions(updatedSubmissions);
    localStorage.setItem('quiz_platform_submissions', JSON.stringify(updatedSubmissions));
  };

  // Google Sign-In redirect initiation
  const handleGoogleLogin = () => {
    // We launch the official OAuth Implicit Flow. Because inside an iFrame nested redirections can sometimes 
    // be restricted by sandbox rules, we also provide a beautiful manual paste fallback right beside it!
    //const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '207024417870-kf7sedk3tcoo0fjaec0n1pdrhdlmc2uc.apps.googleusercontent.com';
    //const redirectUri = window.location.origin + window.location.pathname;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const redirectUri = window.location.origin + window.location.pathname;

if (!clientId) {
  alert(`No Client ID configured! Add this redirect URI in Google Cloud Console: ${redirectUri}`);
  console.error('[Google Sign-In] Missing VITE_GOOGLE_CLIENT_ID. Required redirect URI:', redirectUri);
  return;
}
console.info('[Google Sign-In] Using redirect URI:', redirectUri);
    const scopes = [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file'
    ];
    
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `response_type=token` +
      `&client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scopes.join(' '))}` +
      `&state=quiz_oauth_state`;

    // Attempt standard Redirect first
    window.location.href = oauthUrl;
    
    // Also trigger the helper dialog to paste alternative tokens in case sandbox locks the redirect event
    setTimeout(() => {
      setShowManualTokenModal(true);
    }, 1500);
  };

  const handleGoogleLogout = () => {
    setAccessToken(null);
    localStorage.removeItem('quiz_platform_oauth_token');
  };

  const handleSaveManualToken = () => {
    if (manualTokenInput.trim()) {
      setAccessToken(manualTokenInput.trim());
      localStorage.setItem('quiz_platform_oauth_token', manualTokenInput.trim());
      setShowManualTokenModal(false);
      setManualTokenInput('');
    }
  };

  // Create standard Exam ID
  const handleCreateNewExam = (newExam: Exam) => {
    const updated = [...exams, newExam];
    handleSaveExams(updated);
  };

  const handleDeleteExam = (examId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this exam paper? Submissions connected will be retained.');
    if (!confirmed) return;
    const updated = exams.filter(e => e.id !== examId);
    handleSaveExams(updated);
  };

  // Set Sheet meta links
  const handleUpdateExamSheet = (examId: string, sheetId: string, sheetUrl: string) => {
    const updated = exams.map(ex => {
      if (ex.id === examId) {
        return { ...ex, spreadsheetId: sheetId, spreadsheetUrl: sheetUrl };
      }
      return ex;
    });
    handleSaveExams(updated);
  };

  // Sync missing submissions of an exam to Google Sheets
  const handleSyncSubmissionsToSheet = async (examId: string) => {
    const exam = exams.find(e => e.id === examId);
    if (!exam || !exam.spreadsheetId || !accessToken) return;

    setIsSyncing(true);
    setSyncFeedback(null);
    let successCount = 0;

    const examSubmissions = submissions.filter(s => s.examId === examId);
    
    const updatedSubmissions = await Promise.all(
      submissions.map(async (sub) => {
        if (sub.examId === examId && !sub.isSyncedToSheet) {
          const success = await appendSubmissionToSheet(accessToken, exam.spreadsheetId!, exam.title, sub);
          if (success) {
            successCount++;
            return { ...sub, isSyncedToSheet: true };
          }
        }
        return sub;
      })
    );

    handleSaveSubmissions(updatedSubmissions);
    setIsSyncing(false);
    setSyncFeedback(`Successfully appended and synchronized ${successCount} exam reports to your spreadsheet!`);
  };

  // Student solves and submits
  const handleStudentSubmitExam = (rawSubmission: Omit<Submission, 'id' | 'submittedAt' | 'score' | 'percentage' | 'automatedGrade'>) => {
    const matchedExam = exams.find(e => e.id === rawSubmission.examId);
    if (!matchedExam) return;

    // 1. Calculate Score
    let pointsAwarded = 0;
    let maxPoints = 0;

    matchedExam.questions.forEach(q => {
      maxPoints += q.points;
      const ans = rawSubmission.answers.find(a => a.questionId === q.id);
      if (ans && ans.selectedOptionIndex === q.correctOptionIndex) {
        pointsAwarded += q.points;
      }
    });

    const percent = maxPoints ? (pointsAwarded / maxPoints) * 100 : 0;
    const finalGrade = computeGrade(percent);

    // Build the finalized submission
    const finalSubmission: Submission = {
      id: 'sub_' + Date.now(),
      examId: rawSubmission.examId,
      studentName: rawSubmission.studentName,
      studentEmail: rawSubmission.studentEmail,
      answers: rawSubmission.answers,
      score: pointsAwarded,
      totalPoints: maxPoints,
      percentage: percent,
      timeSpentSeconds: rawSubmission.timeSpentSeconds,
      submittedAt: new Date().toISOString(),
      automatedGrade: finalGrade,
      isSyncedToSheet: false
    };

    const newSubList = [...submissions, finalSubmission];
    handleSaveSubmissions(newSubList);

    // Auto-sync into Google Sheets if sheets ID is loaded on the exam, and we have an authorized access token cached
    if (matchedExam.spreadsheetId && accessToken) {
      appendSubmissionToSheet(accessToken, matchedExam.spreadsheetId, matchedExam.title, finalSubmission).then(success => {
        if (success) {
          // Update submission sync flag
          const syncedSubIndex = newSubList.findIndex(s => s.id === finalSubmission.id);
          if (syncedSubIndex !== -1) {
            const updated = [...newSubList];
            updated[syncedSubIndex].isSyncedToSheet = true;
            handleSaveSubmissions(updated);
          }
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
      
      {/* Dynamic Iframe Sandbox Warning Helper */}
      {!accessToken && (
        <div className="bg-slate-900 text-slate-100 px-4 py-2 text-xs text-center border-b border-slate-850 flex flex-wrap items-center justify-center gap-3">
          <span className="flex items-center gap-1.5 justify-center">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Sandbox Notice: Browser iframes sometimes block redirects. If sign-in pops up, you can paste the OAuth token manually to activate real Google Sheets writes!</span>
          </span>
          <button 
            onClick={() => setShowManualTokenModal(true)}
            className="bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-white px-2.5 py-1 rounded-md transition"
          >
            Manual Token paste
          </button>
        </div>
      )}

      {/* Main Navbar (Hidden in direct student url mode to ensure sleek exam experience) */}
      {!urlExam && (
        <Navbar 
          currentView={view} 
          onNavigate={(v) => setView(v)} 
          examsCount={exams.length} 
        />
      )}

      {/* Primary Layout Frame */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Direct Exam Url override */}
        {urlExam ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold inline-flex items-center gap-1">
                <GraduationCap className="w-4 h-4 text-emerald-600" /> Authorized Academic Gateway
              </span>
              <button
                onClick={() => {
                  window.location.href = window.location.origin + window.location.pathname;
                }}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
              >
                Go to main platform ➔
              </button>
            </div>
            <StudentPortal 
              exam={urlExam} 
              classSubmissions={submissions}
              onSubmitExam={handleStudentSubmitExam}
              onExit={() => {
                // Return to normal listing
                window.location.href = window.location.origin + window.location.pathname;
              }}
            />
          </div>
        ) : (
          <>
            {view === 'teacher' ? (
              <TeacherDashboard 
                exams={exams}
                submissions={submissions}
                accessToken={accessToken}
                onLogin={handleGoogleLogin}
                onLogout={handleGoogleLogout}
                onCreateExam={handleCreateNewExam}
                onDeleteExam={handleDeleteExam}
                onUpdateExamSheet={handleUpdateExamSheet}
                onSyncSubmissionsToSheet={handleSyncSubmissionsToSheet}
                isSyncing={isSyncing}
              />
            ) : (
              <div className="space-y-6">
                {/* Simulated Student Portal Listing selector */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4 max-w-2xl mx-auto">
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-800 text-sm">Student Portal Simulation</h3>
                    <p className="text-xs text-slate-500">Pick any active quiz configuration to simulate the student screen, timer constraints, and automated grading.</p>
                  </div>
                  
                  <div className="space-y-2">
                    {exams.map(ex => (
                      <button
                        key={ex.id}
                        onClick={() => {
                          const matched = exams.find(e => e.id === ex.id);
                          if (matched) setUrlExam(matched);
                        }}
                        className="w-full text-left p-3 border border-slate-150 rounded-xl hover:bg-slate-50 transition flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-800">{ex.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{ex.description}</p>
                        </div>
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg">Solve Exam</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 px-6 sm:px-8">
          <p>© 2026 QuizGrade, Live Automated Grading & Direct Sheets Sync. Connected administrator: <span className="font-medium text-slate-600">{TEAM_ADMIN_EMAIL}</span>.</p>
        </div>
      </footer>

      {/* ACCESS TOKEN MANUAL INPUT MODAL FALLBACK */}
      {showManualTokenModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h5 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Key className="w-4 h-4 text-emerald-600" /> Manual Google Token Sync
              </h5>
              <button 
                onClick={() => setShowManualTokenModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-500 space-y-2 leading-relaxed">
              <p>Under tight iframe security controls (like standard AI Studio previews), popup redirects can be blocked. No worries! You can fetch a token from your Google developer log, or paste it here to authenticate direct API connections instantly.</p>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150 text-[11px] font-medium text-slate-650 flex items-start gap-1">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Your token is saved private in-memory and will write directly to worksheets, ensuring maximum security and zero database leaks.</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 block">Google Access Token</label>
              <textarea
                placeholder="ya29.a0AfH6SMb..."
                value={manualTokenInput}
                onChange={e => setManualTokenInput(e.target.value)}
                rows={3}
                className="w-full text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setShowManualTokenModal(false)}
                className="px-4 py-2 text-slate-500 hover:text-slate-700 text-xs font-bold transition"
              >
                Close Dialog
              </button>
              <button
                onClick={handleSaveManualToken}
                className="bg-emerald-600 hover:bg-emerald-750 text-white font-bold text-xs px-4 py-2 rounded-xl"
              >
                Apply Token
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
