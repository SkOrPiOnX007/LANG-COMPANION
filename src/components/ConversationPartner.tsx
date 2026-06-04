import React, { useState, useEffect, useRef } from "react";
import { Language, ChatMessage, RoleplayScenario } from "../types";
import { MessageSquare, Sparkles, Send, Volume2, AlertTriangle, ArrowRight, HelpCircle, Loader2, Compass, CheckCircle2 } from "lucide-react";

interface ConversationPartnerProps {
  language: Language;
  onAddXP: (xp: number) => void;
}

const PRESET_SCENARIOS: Record<string, RoleplayScenario[]> = {
  general: [
    {
      id: "sc-cafe",
      title: "Gourmet Bistro Order",
      description: "Order a hot morning beverage and an accompanying breakfast item from the local café waiter.",
      locationSymbol: "☕",
      difficulty: "Easy",
      scenarioGoal: "Inquire about daily specials, order a drink, request the invoice/bill politely.",
      initialPrompt: "You are a friendly café waiter. The student is a visitor arriving to order breakfast. Respond naturally inside the language."
    },
    {
      id: "sc-transit",
      title: "Lost Transit Inquiries",
      description: "You got off at the wrong junction! Inquire with a polite passerby for navigational directions.",
      locationSymbol: "🗺️",
      difficulty: "Medium",
      scenarioGoal: "Explain that you are lost, ask for the train station or bookstore, and express sincere thanks.",
      initialPrompt: "You are a local resident walking down the street. The student seeks directions. Be helpful but conversational."
    },
    {
      id: "sc-hotel",
      title: "Hotel Check-In Lobby",
      description: "Arrive at the boutique hotel lobby desk to check on your room status, breakfast, and city views.",
      locationSymbol: "🏨",
      difficulty: "Hard",
      scenarioGoal: "Provide a fake reservation name, ask about Wi-Fi codes, confirm what times breakfast starts, and get your room key.",
      initialPrompt: "You are the professional clerk at the luxury hotel lobby desk. Welcome the student and process their reservation."
    }
  ]
};

export default function ConversationPartner({ language, onAddXP }: ConversationPartnerProps) {
  const [selectedScenario, setSelectedScenario] = useState<RoleplayScenario>(PRESET_SCENARIOS.general[0]);
  const [customScenarioActive, setCustomScenarioActive] = useState<boolean>(false);
  const [customTitle, setCustomTitle] = useState<string>("");
  const [customGoal, setCustomGoal] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState<string>("");

  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTranslationIds, setActiveTranslationIds] = useState<Set<string>>(new Set());
  const [activeCorrectionIds, setActiveCorrectionIds] = useState<Set<string>>(new Set());
  
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Initialize first greeting when scenario changes
  useEffect(() => {
    resetScenarioConversation();
  }, [selectedScenario, language]);

  function resetScenarioConversation() {
    setHistory([
      {
        id: "msg-init",
        sender: "ai",
        text: getGreetingForLanguage(language.id, selectedScenario.title),
        translation: getGreetingTranslation(language.id, selectedScenario.title),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setActiveTranslationIds(new Set());
    setActiveCorrectionIds(new Set());
  }

  function getGreetingForLanguage(langId: string, scenarioTitle: string): string {
    const greetings: Record<string, string> = {
      es: `¡Hola! Bienvenido. Soy tu compañero de conversación para "${scenarioTitle}". ¿En qué te puedo ayudar hoy?`,
      fr: `Bonjour ! Bienvenue. Je suis ravi de pratiquer avec vous pour "${scenarioTitle}". Que puis-je faire pour vous ?`,
      ja: `こんにちは！いらっしゃいませ。のロールプレイ「${scenarioTitle}」へようこそ。今日はどのようなご用件でしょうか？`,
      de: `Hallo ! Herzlich willkommen. Ich helfe dir heute beim Szenario "${scenarioTitle}". Wie kann ich dir helfen?`,
      zh: `你好！欢迎你。我非常高兴能和你一起练习“${scenarioTitle}”。今天需要我帮您做点什么？`,
      it: `Ciao! Benvenuto. Sono il tuo partner di conversazione per "${scenarioTitle}". Come posso aiutarti oggi?`
    };
    return greetings[langId] || `Hello ! Welcome. Let's practice "${scenarioTitle}". How can I assist you ?`;
  }

  function getGreetingTranslation(langId: string, scenarioTitle: string): string {
    return `Hello! Welcome. I am your conversation partner for "${scenarioTitle}". How can I help you today?`;
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userMsgText = inputMessage;
    setInputMessage("");
    setLoading(true);

    const userMessage: ChatMessage = {
      id: "msg-user-" + Date.now(),
      sender: "user",
      text: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const nextHistory = [...history, userMessage];
    setHistory(nextHistory);
    scrollDown();

    try {
      const response = await fetch("/api/learn/chat-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          languageId: language.id,
          level: "Beginner",
          scenarioTitle: selectedScenario.title,
          scenarioGoal: selectedScenario.scenarioGoal,
          conversationHistory: nextHistory,
          userInput: userMsgText,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        // Evaluate user correction payload
        const aiMessage: ChatMessage = {
          id: "msg-ai-" + Date.now(),
          sender: "ai",
          text: data.responseText,
          translation: data.responseTranslation,
          corrections: data.corrections?.explanation ? {
            originalText: userMsgText,
            correctedText: data.corrections.correctedText,
            explanation: data.corrections.explanation
          } : undefined,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setHistory(prev => [...prev, aiMessage]);
        onAddXP(5); // Practicing gains 5 XP

        // Automatically highlight correction if received
        if (aiMessage.corrections) {
          setTimeout(() => {
            setActiveCorrectionIds(prev => {
              const next = new Set(prev);
              next.add(aiMessage.id);
              return next;
            });
          }, 300);
        }
      } else {
        throw new Error(data.error || "Conversation failed.");
      }
    } catch (err: any) {
      console.error(err);
      // Fallback response inside log if API goes silent
      setHistory(prev => [...prev, {
        id: "msg-ai-err-" + Date.now(),
        sender: "ai",
        text: `(AI Tutorial Companion) I understood your input "${userMsgText}". Let's continue practicing speaking in ${language.name}!`,
        translation: "Interactive simulation helper responses.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setLoading(false);
      scrollDown();
    }
  }

  function handlePronounce(text: string) {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      let locale = "en-US";
      if (language.id === "es") locale = "es-ES";
      else if (language.id === "fr") locale = "fr-FR";
      else if (language.id === "ja") locale = "ja-JP";
      else if (language.id === "de") locale = "de-DE";
      else if (language.id === "zh") locale = "zh-CN";
      else if (language.id === "it") locale = "it-IT";

      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find(v => v.lang.startsWith(locale));
      if (matchedVoice) utterance.voice = matchedVoice;
      utterance.lang = locale;
      window.speechSynthesis.speak(utterance);
    } else {
      alert(`Pronouncing: "${text}"`);
    }
  }

  function toggleTranslation(msgId: string) {
    setActiveTranslationIds(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  }

  function toggleCorrection(msgId: string) {
    setActiveCorrectionIds(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  }

  function scrollDown() {
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  function handleCreateCustomScenario(e: React.FormEvent) {
    e.preventDefault();
    if (!customTitle.trim() || !customGoal.trim()) return;

    const custom: RoleplayScenario = {
      id: "sc-custom-" + Date.now(),
      title: customTitle,
      description: `Custom context: practicing ${customTitle}`,
      locationSymbol: "🗺️",
      difficulty: "Medium",
      scenarioGoal: customGoal,
      initialPrompt: customPrompt || `Act as a partner in roleplay ${customTitle}.`
    };

    setSelectedScenario(custom);
    setCustomScenarioActive(false);
    // Reset fields
    setCustomTitle("");
    setCustomGoal("");
    setCustomPrompt("");
  }

  return (
    <div className="w-full bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row gap-6" id="chat-companion-main">
      
      {/* LEFT COLUMN: Scenario selectors & parameters stats */}
      <div className="w-full lg:w-1/3 flex flex-col gap-4 shrink-0" id="chat-scenarios-sidebar">
        <div>
          <h3 className="text-lg font-display font-bold text-slate-800 flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-500" />
            Vibe Real-Life Roleplays
          </h3>
          <p className="text-xs text-slate-400 font-medium font-sans">Practice conversations inside real contexts with instant corrections.</p>
        </div>

        {/* List of preset scenarios */}
        <div className="space-y-3" id="scenarios-list">
          {PRESET_SCENARIOS.general.map((scene) => {
            const isSelected = selectedScenario.id === scene.id;
            return (
              <button
                key={scene.id}
                onClick={() => {
                  setSelectedScenario(scene);
                  setCustomScenarioActive(false);
                }}
                className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex gap-3.5 ${
                  isSelected && !customScenarioActive
                    ? "border-emerald-500 bg-emerald-50/20 shadow-xs ring-1 ring-emerald-100"
                    : "border-slate-150 hover:border-slate-250 hover:bg-slate-50bg-white"
                }`}
              >
                <span className="text-2xl pt-0.5 select-none">{scene.locationSymbol}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <h4 className="font-display font-bold text-sm text-slate-800 tracking-tight">{scene.title}</h4>
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                      scene.difficulty === "Easy" ? "bg-cyan-50 text-cyan-600" :
                      scene.difficulty === "Medium" ? "bg-amber-50 text-amber-600" :
                      "bg-rose-50 text-rose-605 text-rose-600"
                    }`}>
                      {scene.difficulty}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-450 mt-1 leading-snug line-clamp-2">{scene.description}</p>
                </div>
              </button>
            );
          })}

          <button
            onClick={() => setCustomScenarioActive(true)}
            className={`w-full p-3 border border-dashed rounded-xl text-center text-xs font-semibold cursor-pointer transition ${
              customScenarioActive
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-slate-300 hover:border-brand-450 hover:text-brand-600 text-slate-500"
            }`}
          >
            ➕ Custom Scenario Generator
          </button>
        </div>

        {/* Custom Scenario Form */}
        {customScenarioActive && (
          <form onSubmit={handleCreateCustomScenario} className="bg-slate-50 border border-slate-150 rounded-xl p-4 space-y-3 animate-slide-in">
            <h4 className="text-xs font-bold text-slate-700">Design Custom Scenario</h4>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase font-mono block mb-1">Scenario Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Asking for help in a bookstore"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase font-mono block mb-1">Scenario Goal</label>
              <textarea
                required
                rows={2}
                placeholder="e.g. Inquire about vintage comics and ask if they take credit cards."
                value={customGoal}
                onChange={(e) => setCustomGoal(e.target.value)}
                className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 rounded-lg text-xs"
            >
              Generate AI Scenario
            </button>
          </form>
        )}

        {/* Scenario Objective card */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-150 mt-auto">
          <p className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">Current Quest Goal</p>
          <div className="mt-2 text-xs text-slate-700 leading-relaxed font-sans font-medium flex gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>{selectedScenario.scenarioGoal}</span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Chat Dialogue Room */}
      <div className="flex-1 flex flex-col h-[520px] border border-slate-150 bg-slate-50/50 rounded-2xl overflow-hidden" id="chat-dialogue-room">
        {/* Chat Console Header info */}
        <div className="bg-white border-b border-slate-150 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl select-none">{selectedScenario.locationSymbol}</span>
            <div>
              <h4 className="font-display font-extrabold text-sm text-slate-800">{selectedScenario.title}</h4>
              <p className="text-[10px] text-slate-400 font-medium">Practicing {language.name}</p>
            </div>
          </div>
          <button
            onClick={resetScenarioConversation}
            className="text-xs font-semibold text-emerald-650 hover:text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 rounded-lg border border-slate-200 transition cursor-pointer"
          >
            Restart Chat
          </button>
        </div>

        {/* Chat Stream scroll section */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" id="chat-messages-container">
          {history.map((msg) => {
            const isUser = msg.sender === "user";
            const showTrans = activeTranslationIds.has(msg.id);
            const showCorrection = activeCorrectionIds.has(msg.id);

            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[85%] ${isUser ? "ml-auto items-end" : "mr-auto items-start"} animate-fade-in`}
              >
                {/* Bubble speech */}
                <div 
                  className={`p-3.5 rounded-2xl text-xs leading-normal shadow-xs ${
                    isUser
                      ? "bg-emerald-600 text-white rounded-br-none font-medium"
                      : "bg-white text-slate-850 rounded-bl-none border border-slate-150"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  
                  {/* translation string */}
                  {!isUser && msg.translation && showTrans && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 font-mono flex items-center gap-1 font-medium bg-slate-50/50 p-2 rounded-lg leading-relaxed">
                      💡 {msg.translation}
                    </div>
                  )}
                </div>

                {/* Sub row indicators */}
                <div className="flex items-center gap-3.5 mt-1 text-[10px] text-slate-400 font-sans font-medium px-1">
                  <span>{msg.timestamp}</span>
                  
                  {!isUser && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleTranslation(msg.id)}
                        className="hover:text-emerald-600 font-semibold cursor-pointer transition select-none"
                      >
                        {showTrans ? "Hide Guide" : "Translate 🌐"}
                      </button>
                      <button
                        onClick={() => handlePronounce(msg.text)}
                        className="hover:text-slate-600 flex items-center gap-0.5 cursor-pointer transition select-none"
                      >
                        Listen <Volume2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Red warning for user correction available inside AI's message payload */}
                  {!isUser && msg.corrections && (
                    <button
                      onClick={() => toggleCorrection(msg.id)}
                      className={`font-semibold transition select-none flex items-center gap-0.5 px-1.5 py-0.5 rounded cursor-pointer ${
                        showCorrection
                          ? "bg-rose-100 text-rose-700"
                          : "bg-rose-50/80 text-rose-600 hover:bg-rose-100"
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3" /> Info Correction
                    </button>
                  )}
                </div>

                {/* Correction Breakdown Panel */}
                {!isUser && msg.corrections && showCorrection && (
                  <div className="w-full mt-2.5 p-3.5 border border-rose-100 bg-rose-50/50 rounded-xl text-xs text-rose-850 animate-slide-in">
                    <p className="font-extrabold flex items-center gap-1 text-slate-800">
                      📝 Grammar & Syntax Check
                    </p>
                    <div className="mt-2 bg-white/65 p-2 rounded-lg text-[11px] border border-rose-100/50 space-y-1">
                      <p><span className="font-semibold line-through text-slate-400">Original:</span> "{msg.corrections.originalText}"</p>
                      <p><span className="font-semibold text-emerald-600">Corrected:</span> <span className="font-mono font-bold text-slate-805 text-slate-800">{msg.corrections.correctedText}</span></p>
                    </div>
                    <p className="text-[11px] mt-2 font-sans font-semibold text-slate-700 bg-amber-50/30 p-1.5 rounded border border-amber-100/30">
                      💡 {msg.corrections.explanation}
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center gap-2 max-w-[40%] bg-slate-100 p-3 rounded-2xl rounded-bl-none text-xs text-slate-500 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Partner typing...</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input prompt Footer Form */}
        <form onSubmit={handleSendMessage} className="bg-white border-t border-slate-150 p-3.5 flex gap-2.5">
          <input
            type="text"
            required
            disabled={loading}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={`Type natural message in ${language.name}...`}
            className="flex-1 border border-slate-200 rounded-xl text-xs px-4 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
          />
          <button
            type="submit"
            disabled={loading || !inputMessage.trim()}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium p-3 rounded-xl transition shadow flex items-center justify-center cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
