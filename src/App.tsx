import React, { useState, useEffect } from "react";
import { 
  Languages, 
  Sparkles, 
  BookOpen, 
  Flame, 
  MessageSquare, 
  SearchCode, 
  GraduationCap, 
  ChevronRight,
  FlameKindling,
  Loader2,
  Trophy
} from "lucide-react";
import LanguageSelector from "./components/LanguageSelector";
import LessonCards from "./components/LessonCards";
import QuizConsole from "./components/QuizConsole";
import ConversationPartner from "./components/ConversationPartner";
import GrammarParser from "./components/GrammarParser";
import { Language, UserProgress } from "./types";

const LOCAL_STORAGE_KEY = "polyglot_companion_user_progress_v2";

export default function App() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguageId, setSelectedLanguageId] = useState<string>("es");
  const [activeTab, setActiveTab] = useState<"lessons" | "quiz" | "chat" | "grammar">("lessons");
  const [loading, setLoading] = useState<boolean>(true);
  const [errorHeader, setErrorHeader] = useState<string | null>(null);

  // Durable Progress state in localStorage
  const [progress, setProgress] = useState<UserProgress>({
    selectedLanguageId: "es",
    currentLevel: "Beginner",
    streak: 1,
    totalXP: 0,
    lastActiveDate: new Date().toISOString().split("T")[0],
    masteredWordsCount: 0
  });

  // Fetch languages list on mount
  useEffect(() => {
    async function loadLanguages() {
      try {
        const response = await fetch("/api/languages");
        const data = await response.json();
        if (response.ok) {
          setLanguages(data);
          // Sync default language
          if (data.length > 0) {
            setSelectedLanguageId(data[0].id);
          }
        } else {
          throw new Error("Unable to fetch languages catalogue.");
        }
      } catch (err: any) {
        console.error("Language loading failure:", err);
        setErrorHeader("Unable to initiate language tables. App running in fallback simulation mode.");
      } finally {
        setLoading(false);
      }
    }
    loadLanguages();
  }, []);

  // Fetch / Sync preloaded progress data in client standard storage
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProgress(parsed);
        if (parsed.selectedLanguageId) {
          setSelectedLanguageId(parsed.selectedLanguageId);
        }
      } catch (e) {
        console.warn("Storage sync failed, using default values.");
      }
    }
  }, []);

  // Sync state mutations directly back to localStorage immediately
  function saveProgress(updated: UserProgress) {
    setProgress(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  }

  function handleSelectLanguage(id: string) {
    setSelectedLanguageId(id);
    const updated = {
      ...progress,
      selectedLanguageId: id
    };
    saveProgress(updated);
  }

  function handleAddXP(xpPoints: number) {
    const today = new Date().toISOString().split("T")[0];
    let nextStreak = progress.streak;

    if (progress.lastActiveDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      
      if (progress.lastActiveDate === yesterdayStr) {
        nextStreak += 1;
      } else {
        nextStreak = 1; // reset streak if gap days exist
      }
    }

    const updated = {
      ...progress,
      totalXP: progress.totalXP + xpPoints,
      streak: nextStreak,
      lastActiveDate: today
    };

    saveProgress(updated);
  }

  function handleWordMastered(deltaCount: number) {
    const updated = {
      ...progress,
      masteredWordsCount: progress.masteredWordsCount + deltaCount
    };
    saveProgress(updated);
  }

  const selectedLanguage = languages.find(l => l.id === selectedLanguageId);

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans text-slate-800" id="main-app-container">
      {/* Dynamic Status Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-150 shadow-xs" id="app-navigation-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          
          {/* Logo brand and companion badge */}
          <div className="flex items-center gap-3" id="brand-identity-block">
            <div className="p-2.5 bg-gradient-to-tr from-brand-650 to-brand-500 bg-brand-500 rounded-xl text-white shadow-sm flex items-center justify-center">
              <Languages className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-display font-extrabold text-lg text-slate-850 tracking-tight leading-none">
                  Language Learning Companion
                </h1>
                <span className="text-[9px] font-bold font-mono tracking-wider bg-violet-100 text-violet-750 px-2 py-0.5 rounded-full">
                  AI Tutors
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium font-sans mt-0.5">Custom dialog practice, metrics & grammar breakdowns</p>
            </div>
          </div>

          {/* Quick Active metrics bar */}
          <div className="flex items-center gap-4 sm:gap-6 text-sm" id="quick-indicators-navbar">
            <div className="flex items-center gap-1.5" title="Practice every day to keep the flame burning!">
              <Flame className="w-5 h-5 text-amber-500 fill-amber-100" />
              <span className="font-bold font-mono text-slate-750">{progress.streak} Day streak</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Trophy className="w-5 h-5 text-violet-500" />
              <span className="font-bold font-mono text-slate-750">{progress.totalXP} XP</span>
            </div>

            {selectedLanguage && (
              <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
                <span className="text-2xl filter drop-shadow select-none">{selectedLanguage.flag}</span>
                <span className="font-sans font-bold text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {selectedLanguage.name}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container Core Shelf */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8" id="application-body">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32" id="root-loader">
            <Loader2 className="w-12 h-12 text-brand-500 animate-spin mb-4" />
            <h3 className="font-display font-bold text-slate-800">Initializing Core Curriculums...</h3>
            <p className="text-xs text-slate-400 mt-1">Acquiring vocabulary sets, roleplays, and grammatical patterns.</p>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Warning diagnostic banners if any issues exist */}
            {errorHeader && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-700 flex items-center gap-2" id="app-error-header">
                <Sparkles className="w-4 h-4 shrink-0 animate-ping" />
                <span>{errorHeader}</span>
              </div>
            )}

            {/* Part 1: Choose Active Tongue (Card Swiper Selector) */}
            <LanguageSelector
              languages={languages}
              selectedLanguageId={selectedLanguageId}
              onSelectLanguage={handleSelectLanguage}
              progress={progress}
            />

            {/* Part 2: Main Educational Interactive Modules */}
            {selectedLanguage ? (
              <div className="space-y-6" id="educational-modules-block">
                
                {/* Horizontal Tab controller */}
                <div className="border-b border-slate-200 flex flex-wrap gap-2" id="modules-tab-headers">
                  <button
                    onClick={() => setActiveTab("lessons")}
                    className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border-b-2 hover:text-brand-650 ${
                      activeTab === "lessons"
                        ? "border-brand-500 text-brand-600 font-extrabold"
                        : "border-transparent text-slate-500"
                    }`}
                  >
                    <BookOpen className="w-4 h-4" /> Vocabulary Flashcards
                  </button>
                  <button
                    onClick={() => setActiveTab("quiz")}
                    className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border-b-2 hover:text-brand-650 ${
                      activeTab === "quiz"
                        ? "border-brand-500 text-brand-600 font-extrabold"
                        : "border-transparent text-slate-500"
                    }`}
                  >
                    <FlameKindling className="w-4 h-4" /> Adaptive Exams
                  </button>
                  <button
                    onClick={() => setActiveTab("chat")}
                    className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border-b-2 hover:text-brand-650 ${
                      activeTab === "chat"
                        ? "border-brand-500 text-brand-600 font-extrabold"
                        : "border-transparent text-slate-500"
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" /> AI Conversational Partner
                  </button>
                  <button
                    onClick={() => setActiveTab("grammar")}
                    className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border-b-2 hover:text-brand-650 ${
                      activeTab === "grammar"
                        ? "border-brand-500 text-brand-600 font-extrabold"
                        : "border-transparent text-slate-500"
                    }`}
                  >
                    <SearchCode className="w-4 h-4" /> AI Grammar Analyzer
                  </button>
                </div>

                {/* Rendered Modules based on Active Tab Selection */}
                <div className="duration-300" id="rendered-active-module">
                  {activeTab === "lessons" && (
                    <LessonCards
                      language={selectedLanguage}
                      onAddXP={handleAddXP}
                      onWordMastered={handleWordMastered}
                    />
                  )}

                  {activeTab === "quiz" && (
                    <QuizConsole
                      language={selectedLanguage}
                      onAddXP={handleAddXP}
                    />
                  )}

                  {activeTab === "chat" && (
                    <ConversationPartner
                      language={selectedLanguage}
                      onAddXP={handleAddXP}
                    />
                  )}

                  {activeTab === "grammar" && (
                    <GrammarParser
                      language={selectedLanguage}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-200" id="empty-lang-warning">
                <GraduationCap className="w-12 h-12 text-slate-350 mx-auto mb-4" />
                <h4 className="font-display font-semibold text-slate-700">Select language</h4>
                <p className="text-xs text-slate-400 mt-1">Please select an action platform above to unlock educational units.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Humble Clean Footer */}
      <footer className="border-t border-slate-150 bg-white/70 py-6 mt-16 text-center text-xs text-slate-400" id="applet-footer">
        <p className="font-medium font-mono">Polyglot AI Companion — Empowered by server-side Gemini 3.5 AI Modules.</p>
      </footer>
    </div>
  );
}
