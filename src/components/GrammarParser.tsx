import React, { useState } from "react";
import { Language, SentenceAnalysis } from "../types";
import { SearchCode, HelpCircle, ArrowRight, Loader2, BookOpen, AlertCircle, Copy, Check } from "lucide-react";

interface GrammarParserProps {
  language: Language;
}

const ANALYZER_PRESETS: Record<string, string[]> = {
  es: [
    "Me gustaría pedir una mesa para dos personas por favor.",
    "Si tuviera más tiempo libre, viajaría por todo Sudamérica.",
    "¿Podrías decirme dónde se encuentra la farmacia más cercana?"
  ],
  fr: [
    "S'il vous plaît, pourriez-vous me dire comment aller à la gare ?",
    "Bien que je sois un débutant, je trouve cette langue magnifique.",
    "Je voudrais réserver une chambre double avec vue sur la mer."
  ],
  ja: [
    "日本語を勉強し始めてから、日本の文化がもっと好きになりました。",
    "お会計はカードで支払うことができますか？",
    "すみません、もう少しゆっくり話していただけますか？"
  ],
  de: [
    "Könnten Sie mir bitte sagen, wann der nächste Zug abfährt?",
    "Ich lerne Deutsch, weil ich in Deutschland studieren möchte.",
    "Entschuldigung, gibt es ein gemütliches Cafe hier in der Nähe?"
  ],
  zh: [
    "请问这附近有没有好吃的传统中餐厅？",
    "虽然学习中文有点难，但是我觉得汉字非常有趣。",
    "我想买一张今天晚上去北京的高铁票。"
  ],
  it: [
    "Vorrei prenotare un tavolo all'aperto per stasera alle otto.",
    "Se fossi ricco, comprerei una bellissima villa sul Lago di Como.",
    "Scusi, saprebbe indicarmi la strada per arrivare al museo?"
  ]
};

export default function GrammarParser({ language }: GrammarParserProps) {
  const [inputText, setInputText] = useState<string>("");
  const [analysis, setAnalysis] = useState<SentenceAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  async function handleAnalyze(sentenceToAnalyze: string) {
    const text = sentenceToAnalyze.trim();
    if (!text) return;

    setLoading(true);
    setErrorMessage(null);
    setAnalysis(null);

    try {
      const response = await fetch("/api/learn/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentence: text,
          languageId: language.id,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setAnalysis(data);
      } else {
        throw new Error(data.error || "Linguistic decomposition failed.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An issue occurred connecting to the Gemini grammatical breakdowns.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(text: string, index: number) {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 1500);
  }

  const samples = ANALYZER_PRESETS[language.id] || ANALYZER_PRESETS["es"];

  return (
    <div className="w-full bg-white border border-slate-100 rounded-2xl p-6 shadow-sm" id="grammar-parser-component">
      <div className="pb-4 border-b border-rose-50 mb-6Shared">
        <h3 className="text-lg font-display font-bold text-slate-800 flex items-center gap-2">
          <SearchCode className="w-5 h-5 text-brand-500" />
          AI Sentence & Grammar Parser
        </h3>
        <p className="text-xs text-slate-400 font-medium">Type or pick any sentence to inspect word classifications and syntax breakdowns.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="grammar-parser-layout-grid">
        
        {/* INPUT COLUMN: Input Form & Presets */}
        <div className="md:col-span-1 space-y-4">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleAnalyze(inputText);
            }} 
            className="space-y-3"
          >
            <div>
              <label className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase block mb-1">
                Enter Custom Sentence
              </label>
              <textarea
                rows={3}
                required
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Type or paste a phrase in ${language.name}...`}
                className="w-full text-xs font-medium p-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 bg-slate-50/50 leading-relaxed placeholder:text-slate-400"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-medium py-3 rounded-xl text-xs transition shadow hover:shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Parse Sentence
                </>
              ) : (
                "Break Down Sentence ➔"
              )}
            </button>
          </form>

          {/* Preset Prompts Shelf */}
          <div className="bg-slate-50 border border-slate-150 rounded-xl p-4">
            <h4 className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase mb-2">Practice Prompts</h4>
            <div className="space-y-2">
              {samples.map((sample, idx) => (
                <button
                  key={idx}
                  disabled={loading}
                  onClick={() => {
                    setInputText(sample);
                    handleAnalyze(sample);
                  }}
                  className="w-full text-left p-3 bg-white border border-slate-100 hover:border-brand-150 rounded-lg text-xs font-medium transition text-slate-705 leading-relaxed cursor-pointer block truncate hover:text-brand-600"
                >
                  💬 {sample}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* OUTPUT COLUMN: Logical Breakdown */}
        <div className="md:col-span-2">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-50/30 rounded-xl border border-dashed border-slate-150 h-full min-h-[300px]" id="analyzer-loading">
              <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
              <p className="text-sm font-semibold text-slate-650">Deconstructing Sentence Syntax...</p>
              <p className="text-xs text-slate-400 mt-1">Extracting parts of speech, noun-congruences, and polite registers.</p>
            </div>
          )}

          {errorMessage && (
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-center text-sm text-rose-600 my-auto h-full flex flex-col justify-center min-h-[300px]">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
              <p className="font-semibold">{errorMessage}</p>
            </div>
          )}

          {!loading && !errorMessage && !analysis && (
            <div className="flex flex-col items-center justify-center text-center py-20 bg-slate-50/30 rounded-xl border border-dashed border-slate-200 h-full min-h-[300px]" id="analyzer-empty">
              <BookOpen className="w-12 h-12 text-slate-300 mb-4" />
              <h4 className="font-display font-bold text-slate-600">Grammar Diagnostics Ready</h4>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Type any sentence, configure verb groups, or choose list presets from the left panel to execute deep pedagogical analysis.
              </p>
            </div>
          )}

          {!loading && !errorMessage && analysis && (
            <div className="space-y-6" id="parsing-result-success">
              {/* Highlight Overview */}
              <div className="bg-brand-50/40 border border-brand-100 rounded-xl p-4 flex flex-col gap-1">
                <p className="text-[10px] font-mono font-bold tracking-widest text-brand-700 uppercase">Interactive Context Translation</p>
                <h3 className="text-lg font-sans font-bold text-slate-800 mt-0.5">"{analysis.overallTranslation}"</h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2 font-semibold">
                  <span className="bg-white border border-brand-100/60 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-brand-600 font-mono">
                    Complexity
                  </span>
                  <span>{analysis.grammarComplexity}</span>
                </div>
              </div>

              {/* Word/Particle Decomposition Blocks */}
              <div>
                <h4 className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase mb-3">Syntax Breakdown</h4>
                <div className="grid grid-cols-1 gap-2.5">
                  {analysis.breakdown.map((part, idx) => (
                    <div 
                      key={idx} 
                      className="border border-slate-150 rounded-xl p-3 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 hover:bg-slate-50/50 transition-colors"
                    >
                      <div>
                        {/* Word string script */}
                        <div className="flex items-baseline gap-2">
                          <span className="font-display font-extrabold text-brand-600 text-base">{part.original}</span>
                          <span className="text-[10px] font-semibold text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 uppercase">
                            {part.partOfSpeech}
                          </span>
                        </div>
                        {/* Meanings */}
                        <p className="text-xs text-slate-705 font-medium mt-1">
                          <span className="font-mono text-slate-400">Means:</span> <span className="font-semibold text-slate-700">{part.meaning}</span>
                        </p>
                      </div>

                      {part.grammarDetails && (
                        <div className="text-right sm:max-w-[50%]">
                          <p className="text-[10px] text-slate-500 bg-amber-50 border border-amber-100/50 rounded px-2 py-1 leading-normal font-sans italic text-left">
                            💡 {part.grammarDetails}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic Alternatives Column section */}
              {analysis.alternatives && analysis.alternatives.length > 0 && (
                <div className="border-t border-slate-100 pt-5">
                  <h4 className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase mb-3">Colloquial Alternatives</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {analysis.alternatives.map((alt, idx) => (
                      <div 
                        key={idx} 
                        className="bg-slate-50/70 border border-slate-150 rounded-xl p-3.5 flex flex-col justify-between relative group"
                      >
                        <div>
                          <p className="text-xs font-mono font-extrabold text-slate-800 leading-normal pr-8">
                            "{alt.sentence}"
                          </p>
                          <p className="text-[11px] text-slate-500 italic mt-1.5">
                            {alt.meaning}
                          </p>
                        </div>
                        
                        <button
                          onClick={() => handleCopy(alt.sentence, idx)}
                          className="absolute top-3 right-3 p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
                          title="Copy alternative text"
                        >
                          {copiedIndex === idx ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
