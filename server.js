import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { tavily } from "@tavily/core";

dotenv.config();
console.log("Gemini loaded:", !!process.env.GEMINI_API_KEY);
console.log("Tavily loaded:", !!process.env.TAVILY_API_KEY);
console.log("PORT:", process.env.PORT);

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Gemini AI setup
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const tvly = tavily({
  apiKey: process.env.TAVILY_API_KEY,
});
async function needsWebSearch(message) {
  const lower = message.toLowerCase();

  const realtimeKeywords = [
    "today",
    "latest",
    "current",
    "news",
    "weather",
    "stock",
    "price",
    "score",
    "match",
    "election",
    "live",
    "breaking",
  ];

  return realtimeKeywords.some((word) => lower.includes(word));
}

// ✅ Chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    // 🔒 Input validation
    if (!message || typeof message !== "string" || message.trim() === "") {
      return res.status(400).json({
        reply: "Message cannot be empty.",
      });
    }
    const conversationHistory = history
  .map((item) => {
    const speaker =
      item.role === "assistant" ? "Assistant" : "User";
    return `${speaker}: ${item.text}`;
  })
  .join("\n");

    // 🧠 Strong system prompt (important upgrade)
    const needsRealtime = await needsWebSearch(message);

let prompt = "";

if (needsRealtime) {
  const searchResult = await tvly.search(message);

  prompt = `
You are SolveIQ AI Assistant.

Use the following live web search results to answer accurately.

Live Search Results:
${JSON.stringify(searchResult)}

Conversation History:
${conversationHistory}

Current User Question:
${message}

Answer clearly and accurately.
`;
} else {
  prompt = `
You are SolveIQ AI Assistant.

Give clear, correct, and helpful answers.
Do not guess facts.

User Question:
${message}
`;
}

    // 🤖 AI request
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text =
      response?.text?.trim?.() ||
      "Sorry, I couldn't generate a response right now.";

    return res.json({
      reply: text,
    });

  } catch (error) {
    console.error("❌ Gemini Error:", error);

    return res.status(500).json({
      reply: "⚠️ AI service error. Please try again later.",
    });
  }
});

// 🚀 Start server
const PORT = process.env.PORT || 3000;

console.log("Gemini Key Loaded:", !!process.env.GEMINI_API_KEY);
console.log("Tavily Key Loaded:", !!process.env.TAVILY_API_KEY);

app.listen(PORT, () => {
  console.log(`✅ SolveIQ AI Server running on port ${PORT}`);
});