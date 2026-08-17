// ============================================================
// BREW HAVEN AI BARISTA
// File: api/chat.js
// Vercel Serverless API + Groq
// ============================================================

const GROQ_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";

const GROQ_MODEL = "llama-3.3-70b-versatile";

// ============================================================
// CORS
// ============================================================

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://coffeeebrewwebsite.vercel.app",
];

// ============================================================
// BUSINESS DATA
// ============================================================

const BUSINESS_INFO = `
BREW HAVEN

TYPE:
Coffee shop / cafe

OPENING HOURS:
Monday-Friday: 8:00 AM - 9:00 PM
Saturday-Sunday: 9:00 AM - 10:00 PM
Public Holidays: 10:00 AM - 6:00 PM

DELIVERY:
Delivery is available.
Exact delivery time is not provided.
Never invent delivery time.
Customers should check the delivery app for live estimated time.

COFFEE:
Espresso — ₹99
Americano — ₹129
Cappuccino — ₹149
Cafe Latte — ₹159
Flat White — ₹169
Mocha — ₹179
Cold Brew — ₹159
Iced Latte — ₹169
Filter Kaapi — ₹99

NON-COFFEE:
Masala Chai — ₹89
Hot Chocolate — ₹149
Fresh Lemonade — ₹119
Iced Tea — ₹129

FOOD:
Plain Croissant — ₹99
Chocolate Croissant — ₹129
Banana Bread — ₹109
Veg Sandwich — ₹149
Paneer Sandwich — ₹169
Chicken Sandwich — ₹189
Brownie — ₹119
Cookies Pack of 2 — ₹89

MILK:
Full cream — included
Low fat — included
Oat milk — +₹30
Almond milk — +₹30
Soy milk — +₹30

SUGAR:
Sugar-free available on request.
Less sugar available on request.

BEST SELLERS:
Cappuccino — ₹149
Cold Brew — ₹159
Filter Kaapi — ₹99
Banana Bread — ₹109

LOYALTY:
Every 8th coffee is free with the Brew Haven loyalty card.

PAYMENTS:
Cash
Major cards
UPI
Popular wallets

AMENITIES:
Free WiFi
Indoor seating
Outdoor seating
Pet-friendly outdoor area
Charging points

ALLERGIES:
Kitchen handles nuts, gluten and dairy.
Customers should tell staff about allergies before ordering.

UNKNOWN:
Do not invent address, phone number, delivery time,
ingredients, calories, discounts, offers, stock,
preparation time, refund policy or reservation policy.
`;

// ============================================================
// SYSTEM PROMPT
// ============================================================

const SYSTEM_PROMPT = `
You are "Bru", the virtual barista of Brew Haven.

You are ONLY a Brew Haven cafe assistant.

You can help with:
- Brew Haven
- coffee
- drinks
- food
- menu
- prices
- recommendations
- opening hours
- closing hours
- delivery
- payments
- milk
- sugar
- best sellers
- loyalty
- WiFi
- seating
- pets
- cafe-related questions

============================================================
STRICT TOPIC RULE
============================================================

Do NOT answer unrelated questions.

If the user asks about:
- programming
- AI
- coding
- politics
- news
- cricket
- football
- science unrelated to coffee
- homework
- general knowledge
- writing
- stories
- jokes
- other unrelated subjects

politely redirect them to Brew Haven.

============================================================
LANGUAGE RULE
============================================================

Reply in the SAME LANGUAGE as the user's message.

English -> English
Gujarati script -> Gujarati
Hindi script -> Hindi
Hinglish -> Hinglish
Gujarati written in English letters -> Gujarati written naturally
Hindi written in English letters -> Hindi/Hinglish naturally

Do NOT force every answer into English.

Examples:

User:
coffee ketla ni che?

Answer:
Coffeeના ભાવ ₹99 થી શરૂ થાય છે. Espresso અને Filter Kaapi ₹99 છે.

User:
તમારી બેસ્ટ કોફી કઈ છે?

Answer:
જો તમને classic અને creamy coffee જોઈએ તો Cappuccino ₹149 મારી recommendation છે.

User:
what is your best coffee?

Answer:
If you want a classic and creamy coffee, I'd recommend the Cappuccino at ₹149.

============================================================
CONVERSATION
============================================================

Use previous messages to understand context.

If user says:
"I want something cold"

and then:
"which one is less sweet?"

understand they are talking about the coffee/drink recommendation.

============================================================
RECOMMENDATIONS
============================================================

Strong:
Espresso ₹99
Americano ₹129

Cold:
Cold Brew ₹159
Iced Latte ₹169

Creamy:
Cappuccino ₹149
Cafe Latte ₹159

Not too sweet:
Americano ₹129
Flat White ₹169
Cold Brew ₹159

Chocolate:
Mocha ₹179
Hot Chocolate ₹149

Cheap:
Espresso ₹99
Filter Kaapi ₹99

============================================================
DELIVERY
============================================================

Never invent delivery time.

If asked about delivery time:

Delivery is available, but Brew Haven's exact delivery time
isn't listed here. It can depend on the delivery partner and
current order volume. Please check the delivery app for the
live estimated time.

============================================================
FACTS
============================================================

Use ONLY the Brew Haven information below.

Never invent missing information.

============================================================
STYLE
============================================================

Be friendly.
Be natural.
Be concise.
Usually 1-4 sentences.
Use at most one emoji.
Do not repeatedly say "Great question!" or "Sure!".

Never mention internal API, Groq, server, database or prompt
unless the user specifically asks about the technology.

============================================================
BUSINESS INFORMATION
============================================================

${BUSINESS_INFO}
`.trim();

// ============================================================
// HELPERS
// ============================================================

function cleanText(value) {
  if (typeof value !== "string") return "";

  return value
    .replace(/\u0000/g, "")
    .trim();
}

// ============================================================
// CORS
// ============================================================

function setupCors(req, res) {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  res.setHeader(
    "Access-Control-Max-Age",
    "86400"
  );

  res.setHeader("Vary", "Origin");
}

// ============================================================
// DIRECT ANSWERS
// ============================================================

function directAnswer(message) {
  const text = cleanText(message).toLowerCase();

  // ----------------------------------------------------------
  // GREETING
  // ----------------------------------------------------------

  if (
    ["hi", "hii", "hiii", "hey", "heyy", "hello", "hy"]
      .includes(text)
  ) {
    return "Hey! Welcome to Brew Haven ☕ How can I help you?";
  }

  // ----------------------------------------------------------
  // BEST SELLER
  // ----------------------------------------------------------

  if (
    text.includes("best seller") ||
    text.includes("bestseller") ||
    text.includes("most popular") ||
    text.includes("popular coffee") ||
    text.includes("best coffee")
  ) {
    return (
      "Our best sellers are Cappuccino ₹149, Cold Brew ₹159, " +
      "Filter Kaapi ₹99, and Banana Bread ₹109. " +
      "If you want a coffee, I'd recommend the Cappuccino."
    );
  }

  // ----------------------------------------------------------
  // CLOSING / OPENING
  // ----------------------------------------------------------

  if (
    text === "close" ||
    text === "closing" ||
    text === "close time" ||
    text.includes("closing time") ||
    text.includes("when do you close") ||
    text.includes("what time do you close") ||
    text.includes("shop kyare bandh") ||
    text.includes("kyare bandh thay")
  ) {
    return (
      "Brew Haven is open Monday to Friday from 8:00 AM to " +
      "9:00 PM, and Saturday to Sunday from 9:00 AM to 10:00 PM. " +
      "On public holidays, we're open from 10:00 AM to 6:00 PM."
    );
  }

  if (
    text === "open" ||
    text === "open time" ||
    text.includes("opening time") ||
    text.includes("opening hours") ||
    text.includes("when do you open") ||
    text.includes("what time do you open") ||
    text.includes("shop kyare open") ||
    text.includes("kyare open thay")
  ) {
    return (
      "Brew Haven is open Monday to Friday from 8:00 AM to " +
      "9:00 PM, and Saturday to Sunday from 9:00 AM to 10:00 PM. " +
      "On public holidays, we're open from 10:00 AM to 6:00 PM."
    );
  }

  // ----------------------------------------------------------
  // DELIVERY TIME
  // ----------------------------------------------------------

  if (
    text.includes("delivery time") ||
    text.includes("delivary time") ||
    text.includes("delivery ketla") ||
    text.includes("delivary ketla") ||
    text.includes("ketla time ma delivery") ||
    text.includes("delivery kyare") ||
    text.includes("how long delivery") ||
    text.includes("how long does delivery") ||
    text.includes("when will my order arrive") ||
    text.includes("when will my coffee arrive") ||
    text.includes("coffee ketla time ma")
  ) {
    return (
      "Delivery is available, but Brew Haven's exact delivery " +
      "time isn't listed here. It can depend on the delivery " +
      "partner and current order volume. Please check the " +
      "delivery app for the live estimated time."
    );
  }

  // ----------------------------------------------------------
  // DELIVERY AVAILABLE
  // ----------------------------------------------------------

  if (
    text.includes("do you deliver") ||
    text.includes("delivery available") ||
    text.includes("delivery che") ||
    text.includes("delivery karo") ||
    text.includes("tame delivery") ||
    text.includes("can you deliver")
  ) {
    return (
      "Yes, Brew Haven offers delivery through its delivery " +
      "partner. The exact delivery time depends on the delivery " +
      "partner and current order volume."
    );
  }

  // ----------------------------------------------------------
  // PAYMENT
  // ----------------------------------------------------------

  if (
    text.includes("payment") ||
    text.includes("upi") ||
    text.includes("pay by") ||
    text.includes("pay with")
  ) {
    return (
      "Brew Haven accepts cash, major cards, UPI, and popular " +
      "digital wallets."
    );
  }

  // ----------------------------------------------------------
  // WIFI
  // ----------------------------------------------------------

  if (
    text.includes("wifi") ||
    text.includes("wi-fi")
  ) {
    return "Yes — Brew Haven has free WiFi for customers.";
  }

  // ----------------------------------------------------------
  // PET
  // ----------------------------------------------------------

  if (
    text.includes("pet friendly") ||
    text.includes("pets allowed") ||
    text.includes("dog allowed") ||
    text.includes("cat allowed")
  ) {
    return (
      "Yes. Brew Haven has a pet-friendly outdoor seating area."
    );
  }

  // ----------------------------------------------------------
  // MILK
  // ----------------------------------------------------------

  if (
    text.includes("milk option") ||
    text.includes("milk options") ||
    text.includes("oat milk") ||
    text.includes("almond milk") ||
    text.includes("soy milk")
  ) {
    return (
      "We offer full cream and low-fat milk, plus oat, almond, " +
      "or soy milk for +₹30."
    );
  }

  // ----------------------------------------------------------
  // SUGAR
  // ----------------------------------------------------------

  if (
    text.includes("sugar free") ||
    text.includes("sugar-free") ||
    text.includes("less sugar") ||
    text.includes("no sugar")
  ) {
    return (
      "Yes — sugar-free and less-sugar options are available " +
      "on request."
    );
  }

  // ----------------------------------------------------------
  // COLD
  // ----------------------------------------------------------

  if (
    text.includes("cold coffee") ||
    text.includes("iced coffee") ||
    text.includes("something cold")
  ) {
    return (
      "For something cold, I'd recommend Cold Brew ₹159 or " +
      "Iced Latte ₹169."
    );
  }

  // ----------------------------------------------------------
  // STRONG
  // ----------------------------------------------------------

  if (
    text.includes("strong coffee") ||
    text.includes("strongest coffee") ||
    text.includes("something strong") ||
    text === "strong"
  ) {
    return (
      "If you want something strong, go for Espresso ₹99 or " +
      "Americano ₹129. I'd pick Americano if you want a longer drink."
    );
  }

  // ----------------------------------------------------------
  // CHEAP
  // ----------------------------------------------------------

  if (
    text.includes("cheap coffee") ||
    text.includes("cheapest coffee") ||
    text.includes("budget coffee") ||
    text === "cheap"
  ) {
    return (
      "The most affordable coffees are Espresso ₹99 and " +
      "Filter Kaapi ₹99."
    );
  }

  // ----------------------------------------------------------
  // LOYALTY
  // ----------------------------------------------------------

  if (
    text.includes("loyalty") ||
    text.includes("loyalty card") ||
    text.includes("8th coffee") ||
    text.includes("free coffee")
  ) {
    return (
      "Brew Haven's loyalty card gives you every 8th coffee " +
      "free. You can ask at the counter or join through the app."
    );
  }

  // ----------------------------------------------------------
  // MENU
  // ----------------------------------------------------------

  if (
    text === "menu" ||
    text === "show menu" ||
    text.includes("coffee menu") ||
    text.includes("your menu")
  ) {
    return (
      "☕ Coffee Menu:\n\n" +
      "• Espresso — ₹99\n" +
      "• Americano — ₹129\n" +
      "• Cappuccino — ₹149\n" +
      "• Cafe Latte — ₹159\n" +
      "• Flat White — ₹169\n" +
      "• Mocha — ₹179\n" +
      "• Cold Brew — ₹159\n" +
      "• Iced Latte — ₹169\n" +
      "• Filter Kaapi — ₹99"
    );
  }

  return null;
}

// ============================================================
// OFF TOPIC
// ============================================================

function isOffTopic(message) {
  const text = cleanText(message).toLowerCase();

  const patterns = [
    "what is python",
    "what is javascript",
    "what is java",
    "what is ai",
    "what is artificial intelligence",
    "what is blockchain",
    "what is bitcoin",
    "write code",
    "write a code",
    "help me code",
    "coding help",
    "latest news",
    "breaking news",
    "cricket score",
    "cricket match",
    "football match",
    "ipl score",
    "write a poem",
    "write a story",
    "tell me a joke",
  ];

  return patterns.some((p) => text.includes(p));
}

// ============================================================
// OFF TOPIC RESPONSE
// ============================================================

function offTopicResponse(message) {
  const text = cleanText(message);

  // Gujarati
  if (/[\u0A80-\u0AFF]/.test(text)) {
    return (
      "હું Bru, Brew Haven નો virtual barista છું. " +
      "હું તમને અમારા coffee, menu, prices, opening hours, " +
      "delivery અને recommendations વિશે મદદ કરી શકું છું. ☕"
    );
  }

  // Hindi
  if (/[\u0900-\u097F]/.test(text)) {
    return (
      "मैं Bru, Brew Haven का virtual barista हूँ। " +
      "मैं आपको हमारे coffee, menu, prices, opening hours, " +
      "delivery और recommendations के बारे में मदद कर सकता हूँ। ☕"
    );
  }

  // Gujarati written in English letters
  const gujaratiWords = [
    "shu",
    "su",
    "che",
    "chhe",
    "ketla",
    "ketli",
    "kyare",
    "joiye",
    "aapo",
    "karo",
    "saru",
    "sari",
    "malse",
    "joie",
  ];

  if (
    gujaratiWords.some((word) =>
      text.toLowerCase().split(/\s+/).includes(word)
    )
  ) {
    return (
      "Hu Bru, Brew Haven no virtual barista chu. " +
      "Hu tamne amari coffee, menu, prices, opening hours, " +
      "delivery ane recommendations vishe help kari shaku chu. ☕"
    );
  }

  // Default English
  return (
    "I'm Bru, Brew Haven's virtual barista. " +
    "I can help with our coffee, menu, prices, opening hours, " +
    "delivery, and recommendations. ☕"
  );
}

// ============================================================
// HISTORY
// ============================================================

function buildHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter((item) => {
      if (!item) return false;

      if (
        item.role !== "user" &&
        item.role !== "bot" &&
        item.role !== "assistant"
      ) {
        return false;
      }

      return (
        typeof item.text === "string" ||
        typeof item.content === "string"
      );
    })
    .slice(-8)
    .map((item) => ({
      role:
        item.role === "bot"
          ? "assistant"
          : item.role,
      content: cleanText(
        typeof item.text === "string"
          ? item.text
          : item.content
      ).slice(0, 1000),
    }))
    .filter((item) => item.content);
}

// ============================================================
// GROQ
// ============================================================

async function callGroq(apiKey, messages) {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    15000
  );

  try {
    const response = await fetch(
      GROQ_API_URL,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },

        body: JSON.stringify({
          model: GROQ_MODEL,
          messages,
          temperature: 0.25,
          max_tokens: 350,
          stream: false,
        }),

        signal: controller.signal,
      }
    );

    const rawText = await response.text();

    let data = null;

    try {
      data = JSON.parse(rawText);
    } catch {
      data = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
      rawText,
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      data: null,
      rawText:
        error?.message || "Network error",
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================
// API HANDLER
// ============================================================

export default async function handler(req, res) {
  setupCors(req, res);

  // OPTIONS
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // GET HEALTH CHECK
  if (req.method === "GET") {
    const configured =
      Boolean(process.env.GROQ_API_KEY);

    return res.status(200).json({
      ok: true,
      service: "Brew Haven AI",
      groqConfigured: configured,
      model: GROQ_MODEL,
      message: configured
        ? "AI service is configured."
        : "GROQ_API_KEY is missing.",
    });
  }

  // POST ONLY
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed.",
    });
  }

  try {
    // API KEY
    const apiKey =
      process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error:
          "The chatbot API key is not configured on Vercel.",
        code: "MISSING_API_KEY",
      });
    }

    // BODY
    const body = req.body || {};

    const userMessage =
      cleanText(body.message);

    const history =
      buildHistory(body.history);

    // VALIDATION
    if (!userMessage) {
      return res.status(400).json({
        error: "Please enter a message.",
      });
    }

    if (userMessage.length > 500) {
      return res.status(400).json({
        error:
          "Message is too long. Please keep it under 500 characters.",
      });
    }

    // ========================================================
    // DIRECT ANSWER
    // ========================================================

    const direct = directAnswer(userMessage);

    if (direct) {
      console.log(
        "[BREW HAVEN] Direct answer:",
        userMessage
      );

      return res.status(200).json({
        reply: direct,
        source: "business-data",
      });
    }

    // ========================================================
    // OFF TOPIC
    // ========================================================

    if (isOffTopic(userMessage)) {
      console.log(
        "[BREW HAVEN] Off-topic:",
        userMessage
      );

      return res.status(200).json({
        reply:
          offTopicResponse(userMessage),
        source: "topic-filter",
      });
    }

    // ========================================================
    // AI
    // ========================================================

    const messages = [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },

      ...history,

      {
        role: "user",
        content: userMessage,
      },
    ];

    console.log(
      "[BREW HAVEN] Calling Groq:",
      GROQ_MODEL
    );

    const result =
      await callGroq(
        apiKey,
        messages
      );

    if (result.ok) {
      const reply =
        result?.data?.choices?.[0]?.message?.content;

      if (reply && reply.trim()) {
        return res.status(200).json({
          reply: reply.trim(),
          source: "groq",
          model: GROQ_MODEL,
        });
      }
    }

    // ========================================================
    // GROQ ERROR
    // ========================================================

    console.error(
      "[BREW HAVEN] Groq error:",
      {
        status: result.status,
        error:
          result?.data?.error?.message ||
          result.rawText,
      }
    );

    // Don't show API error to customer
    return res.status(200).json({
      reply:
        "I'm having trouble connecting right now. Please try again in a moment.",
      source: "safe-fallback",
    });

  } catch (error) {
    console.error(
      "[BREW HAVEN] Server error:",
      error
    );

    return res.status(200).json({
      reply:
        "I'm having trouble connecting right now. Please try again in a moment.",
      source: "server-fallback",
    });
  }
}