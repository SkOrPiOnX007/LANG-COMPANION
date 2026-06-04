import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize Gemini Client to avoid crash if API Key is missing.
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY is not defined. Features running on Gemini will fail or run in fallback modes.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY_THAT_WILL_PROMPT_SETUP",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Language definitions with standard levels, topics, and initial metadata.
const LANGUAGES = [
  {
    id: "es",
    name: "Spanish",
    nativeName: "Español",
    flag: "🇪🇸",
    tagline: "Speak the language of Gabriel García Márquez, Cervantes, and vibrant cultures across 21 countries.",
    xpValue: 15,
    levels: [
      { id: "Beginner", level: "Beginner", description: "Greetings, introductory phrases, numbers, ordering food, and common retail inquiries." },
      { id: "Intermediate", level: "Intermediate", description: "Sharing personal opinions, past stories, and discussing hobbies, weather, and basic work roles." },
      { id: "Advanced", level: "Advanced", description: "Engaging in quick intellectual discussions, idioms, cultural jokes, and complex syntax." }
    ],
    commonPhrases: [
      { phrase: "Hola, ¿cómo estás?", translation: "Hello, how are you?", pronunciation: "OH-lah, KOH-moh es-TAHS", category: "Greetings" },
      { phrase: "Mucho gusto en conocerte.", translation: "Nice to meet you.", pronunciation: "MOO-choh GOOS-toh ehn koh-noh-SEHR-teh", category: "Greetings" },
      { phrase: "Por favor, la cuenta.", translation: "The bill, please.", pronunciation: "por fah-VOR, lah KWEHN-tah", category: "Dining" },
      { phrase: "¿Cuánto cuesta esto?", translation: "How much does this cost?", pronunciation: "KWAN-to KWEHS-tah EHS-toh", category: "Shopping" },
      { phrase: "¿Dónde está la estación de tren?", translation: "Where is the train station?", pronunciation: "DOHN-deh es-TAH lah es-tah-SYOHN deh trehn", category: "Travel" }
    ],
    topics: ["Greetings & Intros", "Bistro & Restaurante", "Getting Around", "Shopping & Bargaining", "Daily Life & Habits", "Emergencies & Help"]
  },
  {
    id: "fr",
    name: "French",
    nativeName: "Français",
    flag: "🇫🇷",
    tagline: "Master the language of philosophy, high cuisine, cinema, and international diplomacy.",
    xpValue: 18,
    levels: [
      { id: "Beginner", level: "Beginner", description: "Polite greetings, introducing yourself, basic food requests, and directions." },
      { id: "Intermediate", level: "Intermediate", description: "Telling stories using passé composé, describing travel memories, and talking about movies." },
      { id: "Advanced", level: "Advanced", description: "Debating global trends, reading complex literary works, and mastering subtle subjonctif moods." }
    ],
    commonPhrases: [
      { phrase: "Bonjour, comment ça va ?", translation: "Hello, how's it going?", pronunciation: "bohn-ZHOOR, koh-mahn sah vah", category: "Greetings" },
      { phrase: "Enchanté de vous rencontrer.", translation: "Delighted to meet you.", pronunciation: "ahn-shahn-TAY duh voo rahn-cohn-TRAY", category: "Greetings" },
      { phrase: "L'addition, s'il vous plaît.", translation: "The bill, please.", pronunciation: "lah-dee-SYOHN, seel voo pleh", category: "Dining" },
      { phrase: "Où se trouvent les toilettes ?", translation: "Where are the restrooms?", pronunciation: "oo suh troov lay twah-leht", category: "Travel" },
      { phrase: "C'est délicieux !", translation: "This is delicious!", pronunciation: "seh day-lee-syuh", category: "Dining" }
    ],
    topics: ["Polite Meetings", "Bistro & Gourmet", "Wandering in Paris", "Boutique Shopping", "Art & Philosophy", "Lost & Found"]
  },
  {
    id: "ja",
    name: "Japanese",
    nativeName: "日本語",
    flag: "🇯🇵",
    tagline: "Explore a delicate system of classical hierarchy, profound politeness, and high-tech pop culture.",
    xpValue: 25,
    levels: [
      { id: "Beginner", level: "Beginner", description: "Hiragana/Katakana cues, bowing manners, numbers, simple requests and question patterns." },
      { id: "Intermediate", level: "Intermediate", description: "Polite verb conjugation (~masu Form), everyday particle grammar, and basic kanji." },
      { id: "Advanced", level: "Advanced", description: "Business Keigo (honorific speak), reading news publications, and subtle nuance distinctions." }
    ],
    commonPhrases: [
      { phrase: "こんにちは、元気ですか？", translation: "Hello, are you well?", pronunciation: "Kohn-nee-chee-wah, gehn-kee dehs-kah?", category: "Greetings" },
      { phrase: "はじめまして、よろしくお願いします。", translation: "Nice to meet you, please treat me well.", pronunciation: "Hah-jee-meh-mash-teh, yo-ro-shee-koo oh-neh-guy shee-mas", category: "Greetings" },
      { phrase: "お会計をお願いします。", translation: "The bill, please.", pronunciation: "Oh-kay-kay oh oh-neh-gah-ee shee-mahs", category: "Dining" },
      { phrase: "これはいくらですか？", translation: "How much is this?", pronunciation: "Koreh wa ee-koo-rah dehs-kah?", category: "Shopping" },
      { phrase: "駅はどこにありますか？", translation: "Where is the station located?", pronunciation: "Eh-kee wa doh-koh nee ah-ree-mahs-kah?", category: "Travel" }
    ],
    topics: ["Aisatsu & Bowing", "Izakaya & Sushi Dining", "Transit & Trains", "Akihabara Shopping", "Otaku & Pop Culture", "Polite Keigo Customs"]
  },
  {
    id: "de",
    name: "German",
    nativeName: "Deutsch",
    flag: "🇩🇪",
    tagline: "Journey through the native tongue of innovators, philosophers, compound words, and deep history.",
    xpValue: 18,
    levels: [
      { id: "Beginner", level: "Beginner", description: "Daily introductions, present tense sentences, counting, and simple shopping requests." },
      { id: "Intermediate", level: "Intermediate", description: "Integrating subordinate clauses, past descriptors (Perfekt), and typical workplace situations." },
      { id: "Advanced", level: "Advanced", description: "Dissecting academic literature, abstract debates, and complex composite nouns smoothly." }
    ],
    commonPhrases: [
      { phrase: "Hallo, wie geht's dir?", translation: "Hello, how are you?", pronunciation: "HAH-loh, vee gayts deer?", category: "Greetings" },
      { phrase: "Es freut mich, dich kennenzulernen.", translation: "Pleased to meet you.", pronunciation: "ehs froyt mikh dikh keh-nen-tsoo-ler-nen", category: "Greetings" },
      { phrase: "Die Rechnung, bitte.", translation: "The bill, please.", pronunciation: "dee REKH-noong, BIH-teh", category: "Dining" },
      { phrase: "Wo ist der nächste Bahnhof?", translation: "Where is the nearest train station?", pronunciation: "voh ist dare NEKST-uh BAHN-hohf?", category: "Travel" },
      { phrase: "Das ist ausgezeichnet !", translation: "That is excellent!", pronunciation: "dahs ist OWSS-geh-tseykh-net", category: "Dining" }
    ],
    topics: ["Kennenlernen", "Biergarten & Pretzels", "U-Bahn Navigation", "Supermarkt Grocery", "Hobbys & Freizeit", "Büro & Business"]
  },
  {
    id: "zh",
    name: "Mandarin Chinese",
    nativeName: "中文",
    flag: "🇨🇳",
    tagline: "Master a rich tonal legacy featuring beautiful character brushstrokes, business dynamics, and deep proverbs.",
    xpValue: 25,
    levels: [
      { id: "Beginner", level: "Beginner", description: "Pinyin spelling, pronunciation of four main tones, numbers, and survival greetings." },
      { id: "Intermediate", level: "Intermediate", description: "Grammar particles (了, 过, 得), telling times, ordering delicacies, and writing simple Hanzi." },
      { id: "Advanced", level: "Advanced", description: "Chinese Proverbs (Chengyu), political/business discussions, and reading standard articles." }
    ],
    commonPhrases: [
      { phrase: "你好，你怎么样？", translation: "Hello, how are you?", pronunciation: "Nǐ hǎo, nǐ zěnmeyàng?", category: "Greetings" },
      { phrase: "很高兴认识你。", translation: "Very happy to meet you.", pronunciation: "Hěn gāoxìng rènshì nǐ", category: "Greetings" },
      { phrase: "请买单。", translation: "Please bring the bill.", pronunciation: "Qǐng mǎidān", category: "Dining" },
      { phrase: "这个多少钱？", translation: "How much is this?", pronunciation: "Zhè ge duōshǎo qián?", category: "Shopping" },
      { phrase: "地铁站在哪里？", translation: "Where is the subway station?", pronunciation: "Dìtiězhàn zài nǎlǐ?", category: "Travel" }
    ],
    topics: ["Pinyin & Tones Basics", "Dim Sum Dining", "Bus & Bullet Train", "Night Market Bargains", "Social & Weixin Life", "Ancient Proverbs"]
  },
  {
    id: "it",
    name: "Italian",
    nativeName: "Italiano",
    flag: "🇮🇹",
    tagline: "Speak the lyrical, musical language of Renaissance masterworks, high fashion, opera, and family feasts.",
    xpValue: 18,
    levels: [
      { id: "Beginner", level: "Beginner", description: "Warm greetings, food ordering, simple descriptive nouns, and directions." },
      { id: "Intermediate", level: "Intermediate", description: "Sharing stories using passato prossimo, organizing plans, and describing hobbies." },
      { id: "Advanced", level: "Advanced", description: "Deep cultural arguments, literary prose reviews, and emotional subjective phrases." }
    ],
    commonPhrases: [
      { phrase: "Ciao, come stai?", translation: "Hello, how are you?", pronunciation: "chow, KOH-meh stahy", category: "Greetings" },
      { phrase: "Piacere di conoscerti.", translation: "Nice to meet you.", pronunciation: "pyah-CHEH-reh dee koh-NOH-shehr-tee", category: "Greetings" },
      { phrase: "Il conto, per favore.", translation: "The bill, please.", pronunciation: "eel KOHN-toh, pehr fah-VOH-reh", category: "Dining" },
      { phrase: "Dove si trova il bagno?", translation: "Where is the restroom?", pronunciation: "DOH-veh see TROH-vah eel BAHN-yoh", category: "Travel" },
      { phrase: "Questo cibo è favoloso !", translation: "This food is fabulous!", pronunciation: "KWEHS-toh CHEE-boh eh fah-voh-LOH-soh", category: "Dining" }
    ],
    topics: ["Incontri & Caffè", "Trattoria Ordering", "Stazione & Treni", "Boutique & Mercato", "Famiglia & Amici", "Rinascimento & Opera"]
  }
];

// Endpoint 1: Retrieve available languages metadata
app.get("/api/languages", (req: Request, res: Response) => {
  res.json(LANGUAGES);
});

// Endpoint 2: Generate vocabulary learning materials based on topic, level, and language.
app.post("/api/learn/generate-lesson", async (req: Request, res: Response) => {
  const { languageId, level, topic } = req.body;
  
  if (!languageId || !level || !topic) {
    return res.status(400).json({ error: "Missing languageId, level, or topic targets." });
  }

  const selectedLang = LANGUAGES.find(l => l.id === languageId);
  if (!selectedLang) {
    return res.status(404).json({ error: "Language selected not supported." });
  }

  const prompt = `Generate a modern, highly educational vocabulary vocabulary list of exactly 6 words or short expressions in the language "${selectedLang.name}" (${selectedLang.nativeName}) for a student at "${level}" level, focusing in the topic "${topic}".
  The list must be custom tailored & natural. Assign an incremental number ID to each word.
  Create high-quality translation guides, realistic example sentences, phonetic pronunciations (e.g. Pinyin for Chinese, Romaji/Hiragana for Japanese, intuitive syllable splits for Spanish/French), parts of speech, and actionable usage notes.`;

  try {
    const ai = getGeminiClient();
    if (!process.env.GEMINI_API_KEY) {
      // Simulate placeholder data gracefully to prevent failure in preview if API key wasn't structured yet.
      return res.json(getFallbackLesson(languageId, level, topic));
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              word: { type: Type.STRING, description: "The word or short phrase written in native script (for Japanese/Chinese include characters, for others correct accent chars)." },
              phrasingGuide: { type: Type.STRING, description: "Phonetic reading guide (like Romaji/Furigana for Japanese, Pinyin for Chinese, or syllable-split sound guide for European languages)." },
              translation: { type: Type.STRING, description: "Accurate English translation." },
              partOfSpeech: { type: Type.STRING, description: "Noun, Verb, Adjective, Phrase, Adverb, Particle etc." },
              exampleSentence: { type: Type.STRING, description: "A highly practical, realistic example sentence in the language using this word." },
              exampleTranslation: { type: Type.STRING, description: "Accurate English translation of the example sentence." },
              notes: { type: Type.STRING, description: "Cultural context, pronunciation tips, or warnings about false cognates." }
            },
            required: ["id", "word", "translation", "partOfSpeech", "exampleSentence", "exampleTranslation"]
          }
        },
        systemInstruction: "You are an expert polyglot professor, language curriculum developer, and native level speech advisor. Generate helpful educational lists."
      }
    });

    const words = JSON.parse(response.text || "[]");
    res.json(words);
  } catch (error: any) {
    console.error("Gemini lesson generator failed:", error);
    res.status(500).json({ error: "Could not safely generate vocabulary learning items via AI: " + error.message, fallback: getFallbackLesson(languageId, level, topic) });
  }
});

// Endpoint 3: Generate dynamic interactive exercises (Quiz) based on chosen topic
app.post("/api/learn/generate-quiz", async (req: Request, res: Response) => {
  const { languageId, level, topic } = req.body;
  if (!languageId || !level || !topic) {
    return res.status(400).json({ error: "Missing required query constraints." });
  }

  const selectedLang = LANGUAGES.find(l => l.id === languageId);
  if (!selectedLang) {
    return res.status(404).json({ error: "Language target not found." });
  }

  const prompt = `Create a customized set of exactly 5 adaptive language-learning exercises for a student of ${selectedLang.name} at a "${level}" level studying the topic "${topic}".
  To test multiple aspects of speaking, listening, comprehension, and syntax:
  Return exactly 5 questions of diverse types:
  - 2 of type 'multiple-choice' (options: exactly 4 items, with 1 correct)
  - 1 of type 'fill-blank' (the question string must have a clear blank like '_____' inside. correct answer goes there)
  - 1 of type 'unscramble' (the options must contain 4 to 8 scrambled words. correctAnswer holds the reconstructed sentence)
  - 1 of type 'translation' (the question asks to translate from English to ${selectedLang.name} or vice versa)
  
  Write amazing, highly clear context hints and friendly explanations that teach the conjugation, particle, or vocabulary choice.`;

  try {
    const ai = getGeminiClient();
    if (!process.env.GEMINI_API_KEY) {
      return res.json(getFallbackQuiz(languageId, level, topic));
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING, description: "Must be exactly one of: 'multiple-choice', 'fill-blank', 'unscramble', 'translation'" },
              question: { type: Type.STRING, description: "The quiz question. Highlight grammar points nicely." },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of choice options. Required for 'multiple-choice' (4 strings) and 'unscramble' (scrambled words to shuffle, e.g. ['gato', 'el', 'duerme']). Optional for others."
              },
              correctAnswer: { type: Type.STRING, description: "Exact string match of correct choice or words." },
              explanation: { type: Type.STRING, description: "Explain why this answer is correct, highlighting spelling, conjugation, rules, or cultural notes." },
              contextHint: { type: Type.STRING, description: "Short supportive contextual tip (e.g. 'Pay attention to gender agreement', 'Formal polite style required')." }
            },
            required: ["id", "type", "question", "correctAnswer", "explanation"]
          }
        },
        systemInstruction: "You are a specialized adaptive language test assessor. Design helpful, fun, custom language challenges."
      }
    });

    const quiz = JSON.parse(response.text || "[]");
    res.json(quiz);
  } catch (error: any) {
    console.error("Gemini quiz generator failed:", error);
    res.status(500).json({ error: "Quiz API error: " + error.message, fallback: getFallbackQuiz(languageId, level, topic) });
  }
});

// Endpoint 4: Deep Sentence Analyzer
app.post("/api/learn/analyze", async (req: Request, res: Response) => {
  const { sentence, languageId } = req.body;
  if (!sentence || !languageId) {
    return res.status(400).json({ error: "Specify both sentence and target languageId." });
  }

  const selectedLang = LANGUAGES.find(l => l.id === languageId);
  const langName = selectedLang ? selectedLang.name : "the target language";

  const prompt = `Perform a comprehensive, pedagogical linguistic breakdown of the following sentence:
  "${sentence}" in ${langName}.
  
  Do the following:
  1. Translate the entire sentence accurately to English.
  2. Determine grammatical complexity (e.g., "Contains politeness level verbs", "Gender noun alignment", "Past tense narrative").
  3. Chunk the sentence into components (individual words, helper particles, conjugations) and translate/categorize each component with helpful explanations of what it does practically.
  4. Offer 2 alternative ways to say a similar thought in ${langName} along with English meanings (e.g. more casual, more formal, or native idioms).
  
  Provide neat, ultra-clear results.`;

  try {
    const ai = getGeminiClient();
    if (!process.env.GEMINI_API_KEY) {
      return res.json(getFallbackAnalysis(sentence, languageId));
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            originalSentence: { type: Type.STRING },
            overallTranslation: { type: Type.STRING },
            grammarComplexity: { type: Type.STRING },
            breakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING, description: "The standalone word segment or particle." },
                  meaning: { type: Type.STRING, description: "Specific English meaning in this sentence's context." },
                  partOfSpeech: { type: Type.STRING, description: "Noun, auxiliary verb, particle, adverb etc." },
                  grammarDetails: { type: Type.STRING, description: "Information like word gender, root verb, politeness tier, plural state, or case details if any." }
                },
                required: ["original", "meaning", "partOfSpeech"]
              }
            },
            alternatives: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sentence: { type: Type.STRING },
                  meaning: { type: Type.STRING }
                },
                required: ["sentence", "meaning"]
              }
            }
          },
          required: ["originalSentence", "overallTranslation", "grammarComplexity", "breakdown", "alternatives"]
        },
        systemInstruction: "You are a professional linguistic parser. Return clear pedagogical details about verbs, cases, agreement, syntax, and phrasing."
      }
    });

    const analysis = JSON.parse(response.text || "{}");
    res.json(analysis);
  } catch (error: any) {
    console.error("Gemini sentence breakdown failed:", error);
    res.status(500).json({ error: "Linguistic Analyzer API error: " + error.message, fallback: getFallbackAnalysis(sentence, languageId) });
  }
});

// Endpoint 5: Chat Companion (Roleplay Chat Advisor & Grammar Correction)
app.post("/api/learn/chat-response", async (req: Request, res: Response) => {
  const { languageId, level, scenarioTitle, scenarioGoal, conversationHistory, userInput } = req.body;
  
  if (!languageId || !userInput) {
    return res.status(400).json({ error: "Missing required body parameters." });
  }

  const selectedLang = LANGUAGES.find(l => l.id === languageId);
  const langName = selectedLang ? selectedLang.name : "Spanish";

  // Reconstruct chat transcript
  const historyText = conversationHistory && conversationHistory.length > 0
    ? conversationHistory.map((m: any) => `${m.sender === 'user' ? 'Student' : 'AI Partner'}: ${m.text}`).join("\n")
    : "";

  const prompt = `You are an interactive conversational partner for a student learning ${langName}. The student's current tier is "${level || 'Beginner'}".
  The current real-life roleplay scenario is: "${scenarioTitle || 'Cafe Casual Chat'}". 
  The target scenario goal: "${scenarioGoal || 'Introduce yourself and ask for their name'}".
  
  Here is the conversation history so far:
  ${historyText}
  
  Student wrote this most recent message: "${userInput}"
  
  Please do two critical jobs:
  1. WRITE YOUR CONVERSATIONAL RESPONSE: Keep it extremely natural, friendly, and fully in character for the scenario. Match the response to the user's difficulty level (${level}). Provide an accurate translation in the translation field so the user can see it when requested.
  2. ANALYZE AND CORRECT STUDENT INPUT: Look closely at the student's message "${userInput}". If there are grammatical, structural, particle, spelling, or casing mistakes in their sentence relative to natural ${langName}, complete the 'corrections' object with the explanation of what they did wrong and how to fix it. Keep corrections encouraging, encouraging and very educational. If their sentence is perfectly correct, do NOT create a correction (leave corrections empty or set properties to null/empty).`;

  try {
    const ai = getGeminiClient();
    if (!process.env.GEMINI_API_KEY) {
      return res.json(getFallbackChatResponse(langName, userInput, level, scenarioTitle));
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            responseText: { type: Type.STRING, description: "The spoken response in the target language (e.g. Spanish, Japanese)." },
            responseTranslation: { type: Type.STRING, description: "English translation of your reply." },
            corrections: {
              type: Type.OBJECT,
              properties: {
                originalText: { type: Type.STRING, description: "The exact wrong input from the student. Leave empty if student input is correct." },
                correctedText: { type: Type.STRING, description: "The fully corrected, idiomatic and natural sentence in the target language." },
                explanation: { type: Type.STRING, description: "Encouraging, clear grammar details explaining conjugation rules, particle selections, gender matches, or typo errors in English." }
              }
            }
          },
          required: ["responseText", "responseTranslation"]
        },
        systemInstruction: `You are playing a role in a language learning game. Write short, immersive sentences (1 to 3 sentences maximum) matching the student's level. Never speak English in the 'responseText' - only write in ${langName}. Write helpful feedback in the corrections tab if the student made a mistake.`
      }
    });

    const chatResponse = JSON.parse(response.text || "{}");
    res.json(chatResponse);
  } catch (error: any) {
    console.error("Gemini chat conversation failure:", error);
    res.status(500).json({ error: "Conversation API error: " + error.message, fallback: getFallbackChatResponse(langName, userInput, level, scenarioTitle) });
  }
});


// ==========================================
// FALLBACK GENERATORS (When GEMINI_API_KEY is not defined)
// ==========================================

function getFallbackLesson(langId: string, level: string, topic: string) {
  const mockVocabList: Record<string, any[]> = {
    es: [
      { id: "v1", word: "Hola", phrasingGuide: "oh-lah", translation: "Hello", partOfSpeech: "Expression", exampleSentence: "Hola, buenos días.", exampleTranslation: "Hello, good morning.", notes: "The 'h' is always silent in Spanish!" },
      { id: "v2", word: "Gracias", phrasingGuide: "grah-syahs", translation: "Thank you", partOfSpeech: "Expression", exampleSentence: "Muchas gracias por la comida.", exampleTranslation: "Thank you very much for the food.", notes: "Pronounced with a soft 'th' sound in Spain or 's' in Latin America." },
      { id: "v3", word: "Estudiante", phrasingGuide: "es-too-DYAN-teh", translation: "Student", partOfSpeech: "Noun", exampleSentence: "Yo soy estudiante de español.", exampleTranslation: "I am a Spanish student.", notes: "Nouns ending in -e are usually gender-neutral." },
      { id: "v4", word: "Aprender", phrasingGuide: "ah-prehn-DEHR", translation: "To learn", partOfSpeech: "Verb", exampleSentence: "Quiero aprender español.", exampleTranslation: "I want to learn Spanish.", notes: "An infinitive verb ending in '-er'." },
      { id: "v5", word: "Por favor", phrasingGuide: "por fah-VOR", translation: "Please", partOfSpeech: "Phrase", exampleSentence: "La cuenta, por favor.", exampleTranslation: "The bill, please.", notes: "Always use to maintain a polite and friendly interaction." },
      { id: "v6", word: "Amigo", phrasingGuide: "ah-MEE-goh", translation: "Friend", partOfSpeech: "Noun", exampleSentence: "Hola mi amigo.", exampleTranslation: "Hello my friend.", notes: "Changes to 'amiga' for female friends." }
    ],
    fr: [
      { id: "v1", word: "Bonjour", phrasingGuide: "bohn-zhoor", translation: "Hello / Good morning", partOfSpeech: "Expression", exampleSentence: "Bonjour, comment allez-vous?", exampleTranslation: "Hello, how are you?", notes: "Used throughout the day until evening when you write 'Bonsoir'." },
      { id: "v2", word: "Merci", phrasingGuide: "mair-see", translation: "Thank you", partOfSpeech: "Expression", exampleSentence: "Merci beaucoup pour l'aide.", exampleTranslation: "Thank you very much for the help.", notes: "Standard thank you. Do not pronounce the 'i' like 'ee-uh'." },
      { id: "v3", word: "L'ordinateur", phrasingGuide: "lor-dee-nah-tur", translation: "The computer", partOfSpeech: "Noun", exampleSentence: "Mon ordinateur est nouveau.", exampleTranslation: "My computer is new.", notes: "Masculine noun, using L' due to vowel beginning." },
      { id: "v4", word: "Parler", phrasingGuide: "par-lay", translation: "To speak", partOfSpeech: "Verb", exampleSentence: "Je veux parler français.", exampleTranslation: "I want to speak French.", notes: "Group 1 regular verb ending in '-er'." },
      { id: "v5", word: "S'il vous plaît", phrasingGuide: "seel-voo-pleh", translation: "Please", partOfSpeech: "Phrase", exampleSentence: "Un café, s'il vous plaît.", exampleTranslation: "A coffee, please.", notes: "Formal form. For casual conversations use 'S'il te plaît'." },
      { id: "v6", word: "Ami", phrasingGuide: "ah-mee", translation: "Friend", partOfSpeech: "Noun", exampleSentence: "C'est mon ami.", exampleTranslation: "This is my friend.", notes: "Changes to 'amie' for females, pronounced the same." }
    ],
    ja: [
      { id: "v1", word: "こんにちは", phrasingGuide: "Konnichiwa", translation: "Hello / Good afternoon", partOfSpeech: "Expression", exampleSentence: "皆さん、こんにちは。", exampleTranslation: "Hello everyone.", notes: "Written with the hiragana 'ha' (は) used as a topic particle sound." },
      { id: "v2", word: "ありがとう", phrasingGuide: "Arigatou", translation: "Thank you", partOfSpeech: "Expression", exampleSentence: "手伝ってくれてありがとう。", exampleTranslation: "Thank you for helping me.", notes: "Usually written in hiragana. Add 'gozaimasu' to make it formal." },
      { id: "v3", word: "日本語", phrasingGuide: "Nihongo", translation: "Japanese language", partOfSpeech: "Noun", exampleSentence: "日本語を勉強しています。", exampleTranslation: "I am studying Japanese.", notes: "Composed of 日 (Sun), 本 (Origin), and 語 (Language)." },
      { id: "v4", word: "食べる", phrasingGuide: "Taberu", translation: "To eat", partOfSpeech: "Verb", exampleSentence: "寿司を食べます。", exampleTranslation: "I eat sushi.", notes: "Dictionary (dictionary/plain) form of to eat. Polite form is 'tabemasu'." },
      { id: "v5", word: "学生", phrasingGuide: "Gakusei", translation: "Student", partOfSpeech: "Noun", exampleSentence: "私は学生です。", exampleTranslation: "I am a student.", notes: "Typically followed by 'desu' (to be) in polite conversations." },
      { id: "v6", word: "美味しい", phrasingGuide: "Oishii", translation: "Delicious", partOfSpeech: "Adjective", exampleSentence: "このラーメンは美味しいです。", exampleTranslation: "This ramen is delicious.", notes: "An 'i-adjective' that can directly modify nouns." }
    ]
  };

  return mockVocabList[langId] || mockVocabList["es"];
}

function getFallbackQuiz(langId: string, level: string, topic: string) {
  const genericQuestions: Record<string, any[]> = {
    es: [
      { id: "q1", type: "multiple-choice", question: "Which is the correct translation of 'Thank you'?", options: ["De nada", "Hola", "Gracias", "Adiós"], correctAnswer: "Gracias", explanation: "'Gracias' means thank you.", contextHint: "Usually said after receiving help." },
      { id: "q2", type: "fill-blank", question: "Yo _____ un estudiante de español.", correctAnswer: "soy", explanation: "For permanent state 'I am', we use 'soy' from the verb 'ser'.", contextHint: "First person conjugation of Ser." },
      { id: "q3", type: "unscramble", question: "Rearrange words to mean 'I speak Spanish':", options: ["español", "hablo", "Yo"], correctAnswer: "Yo hablo español", explanation: "The standard subject-verb-object arrangement in Spanish.", contextHint: "The verb 'hablo' conjugated for 'Yo'." },
      { id: "q4", type: "translation", question: "Translate 'Please bring the bill' inside Spanish.", correctAnswer: "La cuenta, por favor", explanation: "'La cuenta' refers to the invoice/bill.", contextHint: "Polite dining request." },
      { id: "q5", type: "multiple-choice", question: "What is the meaning of '¿Dónde está?'?", options: ["How much is?", "Where is?", "Who is?", "What is?"], correctAnswer: "Where is?", explanation: "'Dónde está' means Where is.", contextHint: "Essential travel question." }
    ],
    fr: [
      { id: "q1", type: "multiple-choice", question: "Which of the following means 'Hello/Good morning'?", options: ["Merci", "S'il vous plaît", "Bonjour", "Au revoir"], correctAnswer: "Bonjour", explanation: "'Bonjour' is the normal day greeting.", contextHint: "Warm polite greeting." },
      { id: "q2", type: "fill-blank", question: "Je _____ français.", correctAnswer: "parle", explanation: "Conjugation of 'parler' for the first person 'Je' in present tense is 'parle'.", contextHint: "First group -er verb." },
      { id: "q3", type: "unscramble", question: "Form the phrase 'This is delicious':", options: ["délicieux", "C'est", "très"], correctAnswer: "C'est très délicieux", explanation: "Constructs 'It is very delicious'.", contextHint: "Using the demonstrative contraction 'C'est'." },
      { id: "q4", type: "translation", question: "How do you write 'Thank you very much' in French?", correctAnswer: "Merci beaucoup", explanation: "'Merci' is thank you and 'beaucoup' is very much.", contextHint: "Standard polite gratitude phrase." },
      { id: "q5", type: "multiple-choice", question: "What is the gender of 'ordinateur'?", options: ["Feminine", "Masculine", "Neuter", "Both"], correctAnswer: "Masculine", explanation: "'Ordinateur' is a masculine noun.", contextHint: "Begins with a vowel, so we write l'ordinateur." }
    ],
    ja: [
      { id: "q1", type: "multiple-choice", question: "Which phrase means 'Nice to meet you' in Japanese?", options: ["ありがとう", "さようなら", "はじめまして", "すみません"], correctAnswer: "はじめまして", explanation: "'Hajimemashite' is said at first meetings.", contextHint: "Introductory expression." },
      { id: "q2", type: "fill-blank", question: "私は学生 _____ 。", correctAnswer: "です", explanation: "'Desu' works as the polite copula meaning 'to be'.", contextHint: "Polite copula copular suffix." },
      { id: "q3", type: "unscramble", question: "Unscramble to mean 'I eat sushi':", options: ["を食べます", "寿司", "私は"], correctAnswer: "私は寿司を食べます", explanation: "Subject + Object + Particle (wo) + Verb layout.", contextHint: "Particle を (wo) designates the target object." },
      { id: "q4", type: "translation", question: "Translate 'Delicious' in script:", correctAnswer: "美味しい", explanation: "'美味しい' (Oishii) means delicious.", contextHint: "Common i-adjective." },
      { id: "q5", type: "multiple-choice", question: "Which Japanese particle is used to represent the speaker's topic?", options: ["を (wo)", "に (nee)", "わ (wa)", "は (wa)"], correctAnswer: "は (wa)", explanation: "The particle 'は' is pronounced 'wa' and denotes the primary discussion topic.", contextHint: "Commonly followed by subject identifiers." }
    ]
  };

  return genericQuestions[langId] || genericQuestions["es"];
}

function getFallbackAnalysis(sentence: string, langId: string) {
  return {
    originalSentence: sentence,
    overallTranslation: "This translated placeholder represents the sentence analytical feedback (Live Gemini connection not configured or offline).",
    grammarComplexity: "Intermediate typical phrase arrangement",
    breakdown: [
      { original: sentence.split(" ")[0] || sentence, meaning: "First element translation segment", partOfSpeech: "Noun/Subject", grammarDetails: "Extracted from your input sentence." },
      { original: sentence.split(" ").slice(1).join(" ") || "Context", meaning: "Remainder meaning summary", partOfSpeech: "Verb phrase", grammarDetails: "Demonstrates correct contextual conjugation." }
    ],
    alternatives: [
      { sentence: sentence + " por favor / お願いします", meaning: "Polite extension variant." },
      { sentence: sentence + "!", meaning: "Excited casual variant" }
    ]
  };
}

function getFallbackChatResponse(langName: string, input: string, level: string, scenario: string) {
  const corrected = input.toLowerCase().includes("hola") || input.toLowerCase().includes("bonjour") || input.trim().length > 5;
  
  return {
    responseText: `Ah, match point! I receive your message "${input}" in ${langName}. Let's carry of our practice roleplay details!`,
    responseTranslation: `I understand your practice intent. Let's keep working on mastering this level!`,
    corrections: corrected ? undefined : {
      originalText: input,
      correctedText: input + " (with expanded grammar structure)",
      explanation: "Try expressing yourself in slightly longer sentences or including typical polite endings for better immersion!"
    }
  };
}

// ----------------- VITE DEVELOPMENT SERVER SETUP AND PRODUCTION SERVING -----------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static frontend from dist in production builds.
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Dynamic fullstack language service running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
