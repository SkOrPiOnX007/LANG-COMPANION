import React, { useState, useEffect } from "react";
import { Language, QuizQuestion } from "../types";
import { Flame, Sparkles, AlertCircle, CheckCircle2, XCircle, ArrowRight, RefreshCw, Loader2, Award } from "lucide-react";

interface QuizConsoleProps {
  language: Language;
  onAddXP: (xp: number) => void;
}

export default function QuizConsole({ language, onAddXP }: QuizConsoleProps) {
  const [selectedLevel, setSelectedLevel] = useState<string>("Beginner");
  const [selectedTopic, setSelectedTopic] = useState<string>(language.topics[0] || "Greetings & Intros");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Unscrambling helper variables
  const [unscrambledWords, setUnscrambledWords] = useState<string[]>([]);

  useEffect(() => {
    setSelectedTopic(language.topics[0] || "Greetings & Intros");
    setQuestions([]);
    setQuizFinished(false);
    setCurrentIndex(0);
    setIsAnswered(false);
  }, [language]);

  async function startQuiz() {
    setLoading(true);
    setErrorMessage(null);
    setQuestions([]);
    setCurrentIndex(0);
    setIsAnswered(false);
    setUserAnswer("");
    setUnscrambledWords([]);
    setScore(0);
    setQuizFinished(false);

    try {
      const response = await fetch("/api/learn/generate-quiz", {
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
        setQuestions(data);
      } else {
        throw new Error(data.error || "Failed building dynamic quiz.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An error occurred fetching quiz details from Gemini API.");
    } finally {
      setLoading(false);
    }
  }

  const currentQuestion = questions[currentIndex];

  // Auto handle scrambled words selection when current question changes
  useEffect(() => {
    if (currentQuestion && currentQuestion.type === "unscramble") {
      setUnscrambledWords([]);
      setUserAnswer("");
    }
  }, [currentIndex, questions]);

  function handleSelectUnscrambleWord(word: string, idx: number) {
    if (isAnswered) return;
    const nextArr = [...unscrambledWords, word];
    setUnscrambledWords(nextArr);
    setUserAnswer(nextArr.join(" "));
  }

  function handleClearUnscramble() {
    if (isAnswered) return;
    setUnscrambledWords([]);
    setUserAnswer("");
  }

  function handleChoiceSelect(choice: string) {
    if (isAnswered) return;
    setUserAnswer(choice);
  }

  function checkAnswerSubmit() {
    if (isAnswered || !currentQuestion) return;

    const formattedUser = userAnswer.trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").toLowerCase();
    const formattedCorrect = currentQuestion.correctAnswer.trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").toLowerCase();

    // Flexible text checking for translating:
    const correct = formattedUser === formattedCorrect || 
                     (currentQuestion.type === "translation" && formattedCorrect.includes(formattedUser) && formattedUser.length > 2);

    setIsCorrect(correct);
    setIsAnswered(true);

    if (correct) {
      setScore(score + 1);
      onAddXP(10); // Standard correct awards 10 XP
    }
  }

  function handleNextQuestion() {
    setIsAnswered(false);
    setUserAnswer("");
    setUnscrambledWords([]);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setQuizFinished(true);
    }
  }

  return (
    <div className="w-full bg-white border border-slate-100 rounded-2xl p-6 shadow-sm" id="quiz-console-component">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-rose-50 mb-6">
        <div>
          <h3 className="text-lg font-display font-bold text-slate-800 flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500 animate-pulse" />
            Adaptive Exam Console
          </h3>
          <p className="text-xs text-slate-400 font-medium">Test vocab, listening, translation, and word puzzles instantly.</p>
        </div>

        {/* Action Selectors Row */}
        {!questions.length && !loading && (
          <div className="flex flex-wrap gap-2 items-center" id="quiz-filter-selectors">
            {/* Level Selector */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {language.levels.map((level) => (
                <button
                  key={level.id}
                  onClick={() => setSelectedLevel(level.id)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    selectedLevel === level.id
                      ? "bg-white text-orange-600 shadow-xs font-semibold"
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
              onChange={(e) => setSelectedTopic(e.value || e.target.value)}
              className="bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
            >
              {language.topics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <button
              onClick={startQuiz}
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-xs hover:shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              Start Exam
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20" id="loading-quiz-display">
          <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
          <p className="text-sm font-medium text-slate-600">Formulating randomized questions...</p>
          <p className="text-xs text-slate-400 mt-1">Linguistic tasks, multiple choices, and scrambled strings are aligning.</p>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-center my-6 text-sm text-rose-600" id="quiz-error">
          <p className="font-semibold">{errorMessage}</p>
          <button
            onClick={startQuiz}
            className="text-xs text-rose-700 underline mt-2 hover:text-rose-900 cursor-pointer block mx-auto"
          >
            Retry compiling session
          </button>
        </div>
      )}

      {!loading && !errorMessage && !questions.length && (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200" id="quiz-empty-prompt">
          <Award className="w-12 h-12 text-slate-350 mx-auto mb-4" />
          <h4 className="font-display font-bold text-slate-700">Practice Exam Center</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-6">
            Test your understanding in <b>{selectedLevel} {language.name}</b> on the topic <b>"{selectedTopic}"</b> using structured translation, fill-in-the-blanks, and puzzle exercises.
          </p>
          <button
            onClick={startQuiz}
            className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-5 py-2.5 rounded-xl text-xs transition shadow-md hover:shadow-lg cursor-pointer"
          >
            Generate Quiz (+10 XP / correct)
          </button>
        </div>
      )}

      {!loading && !errorMessage && questions.length > 0 && !quizFinished && currentQuestion && (
        <div className="max-w-xl mx-auto" id="quiz-board">
          {/* Progress Indicator */}
          <div className="flex justify-between items-center mb-6 text-xs text-slate-400 font-mono">
            <span className="font-semibold text-slate-500">Question {currentIndex + 1} of {questions.length}</span>
            <div className="flex gap-1">
              {questions.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentIndex
                      ? "w-8 bg-orange-500"
                      : idx < currentIndex
                      ? "w-2 bg-emerald-500"
                      : "w-2 bg-slate-200"
                  }`}
                />
              ))}
            </div>
            <span className="font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded font-mono">Score: {score}</span>
          </div>

          {/* Question Text Box */}
          <div className="mb-6 bg-slate-50 border border-slate-150 rounded-xl p-5" id="question-card">
            <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase bg-white border border-slate-200 px-2 py-0.5 rounded">
              {currentQuestion.type.toUpperCase().replace("-", " ")}
            </span>
            <h3 className="text-md sm:text-lg font-sans font-extrabold text-slate-800 mt-3 leading-relaxed">
              {currentQuestion.question}
            </h3>
            {currentQuestion.contextHint && (
              <p className="text-xs text-slate-500 italic mt-2 bg-white px-2.5 py-1.5 rounded-md border border-slate-100 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" /> {currentQuestion.contextHint}
              </p>
            )}
          </div>

          {/* Dynamic Inputs Based on Question Type */}
          <div className="mb-6" id="quiz-inputs-section">
            {currentQuestion.type === "multiple-choice" && currentQuestion.options && (
              <div className="grid grid-cols-1 gap-3">
                {currentQuestion.options.map((option, idx) => {
                  const isChosen = userAnswer === option;
                  return (
                    <button
                      key={idx}
                      disabled={isAnswered}
                      onClick={() => handleChoiceSelect(option)}
                      className={`w-full p-4 rounded-xl border text-left text-sm font-medium transition cursor-pointer flex justify-between items-center ${
                        isChosen
                          ? "border-orange-500 bg-orange-50/50 text-orange-850 shadow-xs"
                          : "border-slate-250 bg-white hover:border-slate-350 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span>{option}</span>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isChosen ? "border-orange-500 bg-orange-500" : "border-slate-350"
                      }`}>
                        {isChosen && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {currentQuestion.type === "fill-blank" && (
              <div className="space-y-3">
                <input
                  type="text"
                  disabled={isAnswered}
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Type the missing word here..."
                  className="w-full text-sm font-semibold p-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white shadow-xs"
                />
              </div>
            )}

            {currentQuestion.type === "translation" && (
              <div className="space-y-3">
                <textarea
                  rows={2}
                  disabled={isAnswered}
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Write your translation..."
                  className="w-full text-sm font-medium p-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white shadow-xs"
                />
              </div>
            )}

            {currentQuestion.type === "unscramble" && currentQuestion.options && (
              <div className="space-y-4">
                {/* Visual Unscrambled result box */}
                <div className="min-h-16 w-full p-4 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-wrap gap-2 items-center">
                  {unscrambledWords.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">Click words in sequence to formulate the correct sentence...</span>
                  ) : (
                    unscrambledWords.map((word, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 font-medium font-mono animate-fade-in shadow-xs"
                      >
                        {word}
                      </span>
                    ))
                  )}
                </div>

                {/* Scrambled source choices */}
                <div className="flex flex-wrap gap-2">
                  {currentQuestion.options.map((word, idx) => {
                    const countInSequence = unscrambledWords.filter(w => w === word).length;
                    const maxInSource = currentQuestion.options ? currentQuestion.options.filter(w => w === word).length : 0;
                    const isDisabled = isAnswered || countInSequence >= maxInSource;

                    return (
                      <button
                        key={idx}
                        disabled={isDisabled}
                        onClick={() => handleSelectUnscrambleWord(word, idx)}
                        className={`px-3 py-2 border rounded-xl text-xs font-mono font-medium transition select-none cursor-pointer ${
                          isDisabled
                            ? "bg-slate-100 border-slate-150 text-slate-350"
                            : "bg-white border-slate-250 hover:border-slate-350 text-slate-700 shadow-xs active:scale-95"
                        }`}
                      >
                        {word}
                      </button>
                    );
                  })}

                  <button
                    onClick={handleClearUnscramble}
                    disabled={isAnswered || unscrambledWords.length === 0}
                    className="ml-auto text-xs font-semibold text-rose-500 hover:text-rose-700 cursor-pointer disabled:opacity-40"
                  >
                    Clear Sequence
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Validation Feedback Box */}
          {isAnswered && (
            <div 
              className={`p-4 rounded-xl border mb-6 flex gap-3 animate-slide-in ${
                isCorrect 
                  ? "bg-emerald-50 border-emerald-100 text-emerald-850" 
                  : "bg-rose-50 border-rose-100 text-rose-850"
              }`}
              id="answer-feedback-overlay"
            >
              {isCorrect ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-500 shrink-0" />
              )}
              <div>
                <h4 className="font-bold text-sm">{isCorrect ? "Correct answer!" : "Incorrect answer"}</h4>
                <p className="text-xs mt-1">
                  <span className="font-semibold font-mono">Expected:</span> "{currentQuestion.correctAnswer}"
                </p>
                <div className="mt-2.5 pt-2 border-t border-slate-200/55 text-xs">
                  <span className="font-semibold">Linguistic Tip:</span> {currentQuestion.explanation}
                </div>
              </div>
            </div>
          )}

          {/* Core Footer Submit actions */}
          <div className="flex justify-end">
            {!isAnswered ? (
              <button
                disabled={!userAnswer.trim()}
                onClick={checkAnswerSubmit}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-xl text-xs transition shadow-md hover:shadow-lg flex items-center gap-1.5 cursor-pointer"
              >
                Submit Answer
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="bg-slate-800 hover:bg-slate-900 text-white font-medium px-6 py-2.5 rounded-xl text-xs transition shadow-md hover:shadow-lg flex items-center gap-1.5 cursor-pointer"
              >
                {currentIndex < questions.length - 1 ? "Next Question" : "Finish Exam"}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Finished quiz review scorecard */}
      {quizFinished && (
        <div className="max-w-md mx-auto text-center py-10" id="quiz-scorecard">
          <Award className="w-20 h-20 text-orange-500 mx-auto animate-bounce mb-6" />
          <h2 className="text-2xl font-display font-bold text-slate-800">Exam Session Complete!</h2>
          <p className="text-xs font-mono font-medium text-slate-500 uppercase tracking-widest mt-1">
            Subject: {selectedLevel} {language.name} ➔ {selectedTopic}
          </p>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 my-6 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400">Total Score</p>
              <h4 className="text-3xl font-display font-extrabold text-slate-850 mt-1">{score} / {questions.length}</h4>
            </div>
            <div>
              <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400">XP Points Awarded</p>
              <h3 className="text-3xl font-display font-extrabold text-emerald-600 mt-1">+{score * 10} XP</h3>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setQuestions([]);
                setQuizFinished(false);
              }}
              className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium hover:bg-slate-100 transition shadow-xs cursor-pointer"
            >
              Exits to Dashboard
            </button>
            <button
              onClick={startQuiz}
              className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-medium transition shadow flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Start New Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
