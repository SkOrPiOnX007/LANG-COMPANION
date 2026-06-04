import React from "react";
import { Language, UserProgress } from "../types";
import { Flame, Trophy, CheckCircle2, Sparkles, Languages } from "lucide-react";

interface LanguageSelectorProps {
  languages: Language[];
  selectedLanguageId: string;
  onSelectLanguage: (id: string) => void;
  progress: UserProgress;
}

export default function LanguageSelector({
  languages,
  selectedLanguageId,
  onSelectLanguage,
  progress,
}: LanguageSelectorProps) {
  return (
    <div className="w-full" id="language-selector-section">
      {/* Top dashboard stats shelf */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8" id="stats-panel-grid">
        <div 
          className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow"
          id="stat-streak"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-xl text-amber-500">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-mono font-medium text-slate-400 uppercase tracking-widest">Daily Streak</p>
              <h3 className="text-2xl font-display font-bold text-slate-800">{progress.streak} {progress.streak === 1 ? 'Day' : 'Days'}</h3>
            </div>
          </div>
          <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">Active</span>
        </div>

        <div 
          className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow"
          id="stat-xp"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-violet-50 rounded-xl text-violet-500">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-mono font-medium text-slate-400 uppercase tracking-widest">Total Energy XP</p>
              <h3 className="text-2xl font-display font-bold text-slate-800">{progress.totalXP} XP</h3>
            </div>
          </div>
          <span className="text-xs font-medium text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full">Level {Math.floor(progress.totalXP / 100) + 1}</span>
        </div>

        <div 
          className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow"
          id="stat-words"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-500">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-mono font-medium text-slate-400 uppercase tracking-widest">Mastered Words</p>
              <h3 className="text-2xl font-display font-bold text-slate-800">{progress.masteredWordsCount}</h3>
            </div>
          </div>
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">Vocab</span>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-display font-bold text-slate-800 flex items-center gap-2">
          <Languages className="w-5 h-5 text-brand-500" />
          Choose Your Target Language
        </h2>
        <p className="text-sm text-slate-500 mt-1">Select any language core to begin custom dynamic tutoring and AI diagnostics.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="language-cards-container">
        {languages.map((lang) => {
          const isSelected = lang.id === selectedLanguageId;
          return (
            <button
              key={lang.id}
              onClick={() => onSelectLanguage(lang.id)}
              className={`text-left w-full p-6 rounded-2xl bg-white border transition-all duration-300 relative group cursor-pointer ${
                isSelected
                  ? "border-brand-500 ring-2 ring-brand-100 shadow-md glow-selected"
                  : "border-slate-200 hover:border-slate-350 hover:shadow"
              }`}
              id={`lang-card-${lang.id}`}
            >
              {isSelected && (
                <span className="absolute top-4 right-4 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-450 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-500"></span>
                </span>
              )}

              <div className="flex items-center gap-3.5 mb-4">
                <span className="text-4xl filter drop-shadow select-none group-hover:scale-110 transition-transform">
                  {lang.flag}
                </span>
                <div>
                  <h4 className="font-display font-bold text-lg text-slate-800 group-hover:text-brand-600 transition-colors">
                    {lang.name}
                  </h4>
                  <p className="text-xs font-mono text-slate-400 font-medium">{lang.nativeName}</p>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed min-h-[48px] mb-4">
                {lang.tagline}
              </p>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1 font-mono font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded">
                  <Sparkles className="w-3 h-3 text-brand-500" /> +{lang.xpValue} XP / Session
                </span>
                <span className="font-medium text-brand-500">
                  {isSelected ? "Active Target" : "Select language ➔"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
