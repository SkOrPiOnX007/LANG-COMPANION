import React, { useState, useEffect } from "react";
import { Language, VocabularyWord } from "../types";
import { BookOpen, RefreshCw, Layers, Star, CheckCircle, Volume2, HelpCircle, Loader2 } from "lucide-react";

interface LessonCardsProps {
  language: Language;
  onAddXP: (xp: number) => void;
  onWordMastered: (count: number) => void;
}

export default function LessonCards({ language, onAddXP, onWordMastered }: LessonCardsProps) {
  const [selectedLevel, setSelectedLevel] = useState<string>("Beginner");
  const [selectedTopic, setSelectedTopic] = useState<string>(language.topics[0] || "Greetings & Intros");
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());
  const [practiceIds, setPracticeIds] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto update topic when language changes
  useEffect(() => {
    setSelectedTopic(language.topics[0] || "Greetings & Intros");
    setWords([]);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [language]);

  async function fetchNewDeck() {
    setLoading(true);
    setErrorMessage(null);
    setWords([]);
    setCurrentIndex(0);
    setIsFlipped(false);
    
    try {
      const response = await fetch("/api/learn/generate-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          languageId: language.id,
          level: selectedLevel,
          topic: selectedTopic,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setWords(data);
      } else {
        throw new Error(data.error || "Failed loading vocabulary deck.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An issue occurred connecting with the curriculum builder.");
    } finally {
      setLoading(false);
    }
  }

  function handlePronounce(word: string, langCode: string) {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      // Try to match standard browser speech synthesis voices for Spanish, French, Japanese, German, Chinese, Italian.
      const voices = window.speechSynthesis.getVoices();
      let locale = "en-US";
      if (langCode === "es") locale = "es-ES";
      else if (langCode === "fr") locale = "fr-FR";
      else if (langCode === "ja") locale = "ja-JP";
      else if (langCode === "de") locale = "de-DE";
      else if (langCode === "zh") locale = "zh-CN";
      else if (langCode === "it") locale = "it-IT";
      
      const matchedVoice = voices.find(v => v.lang.startsWith(locale));
      if (matchedVoice) utterance.voice = matchedVoice;
      utterance.lang = locale;
      window.speechSynthesis.speak(utterance);
    } else {
      // Direct notification if synthesis is unavailable in fallback previews
      alert(`Pronouncing: "${word}"`);
    }
  }

  function markMastered() {
    if (words.length === 0) return;
    const currentWord = words[currentIndex];
    const nextMastered = new Set(masteredIds);
    
    if (!nextMastered.has(currentWord.id)) {
      nextMastered.add(currentWord.id);
      setMasteredIds(nextMastered);
      onAddXP(5); // Add XP for mastering
      onWordMastered(1);
    }
    
    // Remove from practice group if marked mastered
    const nextPractice = new Set(practiceIds);
    nextPractice.delete(currentWord.id);
    setPracticeIds(nextPractice);

    handleNextCard();
  }

  function markPractice() {
    if (words.length === 0) return;
    const currentWord = words[currentIndex];
    
    const nextPractice = new Set(practiceIds);
    nextPractice.add(currentWord.id);
    setPracticeIds(nextPractice);

    const nextMastered = new Set(masteredIds);
    nextMastered.delete(currentWord.id);
    setMasteredIds(nextMastered);

    handleNextCard();
  }

  function handleNextCard() {
    setIsFlipped(false);
    setTimeout(() => {
      if (currentIndex < words.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // Wrapped review done, scroll back to 0
        setCurrentIndex(0);
      }
    }, 200);
  }

  const currentWord = words[currentIndex];

  return (
    <div className="w-full bg-white border border-slate-100 rounded-2xl p-6 shadow-sm" id="lesson-cards-component">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-rose-50 mb-6">
        <div>
          <h3 className="text-lg font-display font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-violet-500" />
            Dynamic Vocabulary Deck
          </h3>
          <p className="text-xs text-slate-400 font-medium">Build custom spaced-repetition cards utilizing Gemini AI.</p>
        </div>

        {/* Action Selectors Row */}
        <div className="flex flex-wrap gap-2 items-center" id="vocab-filter-selectors">
          {/* Level Selector */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {language.levels.map((level) => (
              <button
                key={level.id}
                onClick={() => setSelectedLevel(level.id)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  selectedLevel === level.id
                    ? "bg-white text-brand-600 shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {level.level}
              </button>
            ))}
          </div>

          {/* Topic Selector */}
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
          >
            {language.topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <button
            onClick={fetchNewDeck}
            disabled={loading}
            className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-xs hover:shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3 3.5 h-3.5" />}
            Generate Deck
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20" id="loading-deck-display">
          <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
          <p className="text-sm font-medium text-slate-600">Summoning custom lesson cards...</p>
          <p className="text-xs text-slate-400 mt-1">Syllables, translations, and guides are being crafted specifically for you.</p>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-center my-6 text-sm text-rose-600" id="deck-error">
          <p className="font-semibold">{errorMessage}</p>
          <button
            onClick={fetchNewDeck}
            className="text-xs text-rose-700 underline mt-2 hover:text-rose-900 cursor-pointer block mx-auto"
          >
            Retry building deck
          </button>
        </div>
      )}

      {!loading && !errorMessage && words.length === 0 && (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200" id="vocab-empty-prompt">
          <Layers className="w-12 h-12 text-slate-350 mx-auto mb-4" />
          <h4 className="font-display font-bold text-slate-700">Vocabulary Studio</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-6">
            Generate customized flashcards for <b>{selectedLevel} {language.name}</b> focusing inside the topic <b>"{selectedTopic}"</b>.
          </p>
          <button
            onClick={fetchNewDeck}
            className="bg-brand-500 hover:bg-brand-600 text-white font-medium px-5 py-2.5 rounded-xl text-xs transition shadow-md hover:shadow-lg cursor-pointer"
          >
            Generate AI Flashcards (+{language.xpValue} XP)
          </button>
        </div>
      )}

      {!loading && !errorMessage && words.length > 0 && currentWord && (
        <div className="max-w-xl mx-auto" id="flashcard-deck-navigator">
          {/* Deck progress indicator dot line */}
          <div className="flex justify-between items-center mb-4 text-xs font-mono font-medium text-slate-400">
            <span>Card {currentIndex + 1} of {words.length}</span>
            <div className="flex gap-1">
              {words.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentIndex
                      ? "w-6 bg-brand-500"
                      : idx < currentIndex
                      ? "w-2 bg-emerald-400"
                      : masteredIds.has(words[idx].id)
                      ? "w-2 bg-emerald-500"
                      : practiceIds.has(words[idx].id)
                      ? "w-2 bg-orange-400"
                      : "w-2 bg-slate-200"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Core Flippable Flashcard Layout */}
          <div 
            onClick={() => setIsFlipped(!isFlipped)}
            className={`min-h-[280px] w-full rounded-2xl border transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col justify-between p-6 ${
              isFlipped 
                ? "bg-slate-50 border-brand-200 shadow-md" 
                : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
            }`}
            id="flashcard-card"
          >
            {/* Top Indicator Accent Tag */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono tracking-widest text-slate-400 uppercase font-bold">
                {currentWord.partOfSpeech || "Vocabulary"}
              </span>
              <div className="flex items-center gap-2">
                {masteredIds.has(currentWord.id) && (
                  <span className="text-emerald-600 bg-emerald-55 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                    Mastered
                  </span>
                )}
                {practiceIds.has(currentWord.id) && (
                  <span className="text-orange-600 bg-orange-55 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                    Needs Practice
                  </span>
                )}
                <span className="text-[10px] bg-slate-100 text-slate-500 font-semibold uppercase px-2 py-0.5 rounded tracking-wider">
                  {isFlipped ? "Answer Side" : "Question Side"}
                </span>
              </div>
            </div>

            {/* Middle Main Content */}
            <div className="text-center my-6 flex-1 flex flex-col justify-center items-center">
              {!isFlipped ? (
                <>
                  <h2 className="text-4xl font-display font-bold text-slate-850 tracking-tight mb-2">
                    {currentWord.word}
                  </h2>
                  
                  {currentWord.phrasingGuide && (
                    <p className="text-sm font-mono text-brand-600 bg-violet-50/50 px-3 py-1 rounded-full mt-2 font-medium">
                      {currentWord.phrasingGuide}
                    </p>
                  )}

                  <p className="text-xs text-slate-400 italic mt-4 flex items-center gap-1">
                    Click card to reveal translation & grammar rules
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-sans font-extrabold text-brand-600 mb-1">
                    {currentWord.translation}
                  </h3>
                  
                  <div className="max-w-md bg-white border border-slate-150 rounded-xl p-4 text-left my-3 space-y-2 shadow-xs">
                    <div>
                      <p className="text-[11px] font-mono text-slate-400 font-semibold uppercase tracking-wider">Usage Example:</p>
                      <p className="text-sm font-medium text-slate-800">{currentWord.exampleSentence}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-mono text-slate-400 font-semibold uppercase tracking-wider">Translation:</p>
                      <p className="text-xs text-slate-600 italic">{currentWord.exampleTranslation}</p>
                    </div>
                  </div>

                  {currentWord.notes && (
                    <p className="text-xs text-slate-450 max-w-sm leading-relaxed mt-2 bg-amber-50/40 text-slate-700 py-1.5 px-3 rounded-lg border border-amber-100/50">
                      💡 {currentWord.notes}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Bottom Accent Footer (Audio Voice & Actions) */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-100/60">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePronounce(currentWord.word, language.id);
                }}
                className="p-2 hover:bg-slate-100 text-slate-500 hover:text-brand-600 rounded-lg transition-transform hover:scale-105"
                title="Hear Pronunciation"
              >
                <Volume2 className="w-5 h-5" />
              </button>

              <span className="text-xs font-medium text-slate-400">
                Click to flip 🔄
              </span>
            </div>
          </div>

          {/* Flashcard Action Spaced-Repetition Buttons */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <button
              onClick={markPractice}
              className="border border-orange-200 hover:border-orange-300 bg-orange-50/30 hover:bg-orange-50 text-orange-700 py-3 rounded-xl text-xs font-semibold cursor-pointer transition flex items-center justify-center gap-2"
            >
              <HelpCircle className="w-4 h-4" /> Keep Practicing
            </button>
            <button
              onClick={markMastered}
              className="border border-emerald-200 hover:border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50 text-emerald-700 py-3 rounded-xl text-xs font-semibold cursor-pointer transition flex items-center justify-center gap-2"
            >
              <Star className="w-4 h-4 fill-emerald-500 text-emerald-600" /> Mark as Mastered (+5 XP)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
