// ============================================================
// BREW HAVEN AI BARISTA
// File: api/chat.js
// Vercel Serverless API + Groq
// ============================================================

const GROQ_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";

const GROQ_MODEL =
  "llama-3.3-70b-versatile";


// ============================================================
// CORS
// ============================================================

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://coffeeebrewwebsite.vercel.app",
];

function setupCors(req, res) {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader(
      "Access-Control-Allow-Origin",
      origin
    );
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

  res.setHeader(
    "Vary",
    "Origin"
  );
}


// ============================================================
// BUSINESS DATA
// ============================================================

const BUSINESS_INFO = `
BREW HAVEN
Coffee shop / cafe

============================================================
OPENING HOURS
============================================================

Monday       8:00 AM - 9:00 PM
Tuesday      8:00 AM - 9:00 PM
Wednesday    8:00 AM - 9:00 PM
Thursday     8:00 AM - 9:00 PM
Friday       8:00 AM - 9:00 PM
Saturday     9:00 AM - 10:00 PM
Sunday       9:00 AM - 10:00 PM

Public Holidays:
10:00 AM - 6:00 PM


============================================================
DELIVERY
============================================================

Delivery is available.

Exact delivery time is NOT provided.

Never invent a delivery time.

Delivery time depends on:
- delivery partner
- current order volume

For live delivery time:
Tell customer to check the delivery app.


============================================================
COFFEE MENU
============================================================

Espresso — ₹99
Americano — ₹129
Cappuccino — ₹149
Cafe Latte — ₹159
Flat White — ₹169
Mocha — ₹179
Cold Brew — ₹159
Iced Latte — ₹169
Filter Kaapi — ₹99


============================================================
NON-COFFEE MENU
============================================================

Masala Chai — ₹89
Hot Chocolate — ₹149
Fresh Lemonade — ₹119
Iced Tea — ₹129


============================================================
FOOD MENU
============================================================

Plain Croissant — ₹99
Chocolate Croissant — ₹129
Banana Bread Slice — ₹109

Veg Sandwich — ₹149
Paneer Sandwich — ₹169
Chicken Sandwich — ₹189

Brownie — ₹119

Cookies Pack of 2 — ₹89


============================================================
CUSTOMIZATION
============================================================

Full cream milk — included
Low fat milk — included
Oat milk — +₹30
Almond milk — +₹30
Soy milk — +₹30

Sugar-free available on request.

Less sugar available on request.

All coffees can be served Hot or Iced.


============================================================
BEST SELLERS
============================================================

Cappuccino — ₹149
Cold Brew — ₹159
Filter Kaapi — ₹99
Banana Bread — ₹109


============================================================
LOYALTY
============================================================

Every 8th coffee is free with the Brew Haven loyalty card.


============================================================
PAYMENTS
============================================================

Cash
Major cards
UPI
Popular wallets


============================================================
AMENITIES
============================================================

Free WiFi
Indoor seating
Outdoor seating
Pet-friendly outdoor area
Charging points


============================================================
ALLERGIES
============================================================

Kitchen handles:

Nuts
Gluten
Dairy

Customers should inform staff about allergies before ordering.


============================================================
UNKNOWN INFORMATION
============================================================

Do NOT invent:

address
phone number
delivery time
ingredients
calories
discounts
offers
stock
preparation time
refund policy
reservation policy

If information is not available:
Say you don't have that information.
`;


// ============================================================
// SYSTEM PROMPT
// ============================================================

const SYSTEM_PROMPT = `
You are "Bru", the virtual barista of Brew Haven.

You are a cafe customer assistant.

Your job is ONLY to help with:

- Brew Haven
- coffee
- cafe drinks
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
- hot/iced drinks
- best sellers
- loyalty
- WiFi
- seating
- pets
- cafe services
- coffee comparisons
- food recommendations


============================================================
VERY IMPORTANT: TOPIC RESTRICTION
============================================================

You are NOT a general-purpose AI assistant.

If the user asks something unrelated to Brew Haven,
coffee, cafe, food, drinks, ordering, delivery,
payments or cafe services:

DO NOT answer that question.

Politely redirect them to Brew Haven.

Example:

"I'm Bru, Brew Haven's virtual barista. I can help with our
coffee, menu, prices, opening hours, delivery and
recommendations. ☕"


============================================================
LANGUAGE RULE
============================================================

THIS RULE IS VERY IMPORTANT.

Reply in the SAME LANGUAGE as the user's latest message.

English → English.

Gujarati script → Gujarati script.

Hindi script → Hindi script.

Gujarati written in English letters → Gujarati written
naturally in English letters.

Hinglish → Hinglish.

Do NOT automatically answer everything in English.

Examples:

User:
"તમારી બેસ્ટ કોફી કઈ છે?"

Answer in Gujarati.

User:
"coffee ketla ni che?"

Answer naturally in Gujarati/English-letter Gujarati.

Example:
"Coffee na prices ₹99 thi start thay che. Espresso ane
Filter Kaapi ₹99 che."

User:
"what is your best coffee?"

Answer in English.

User:
"mujhe strong coffee chahiye"

Answer in Hindi/Hinglish.

NEVER translate the user's question unnecessarily.


============================================================
CONVERSATION MEMORY
============================================================

Use the previous messages.

Example:

User:
"What is your best seller?"

Assistant:
"Cappuccino is one of our best sellers at ₹149."

User:
"Is it sweet?"

Understand "it" = Cappuccino.


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
Cafe Latte ₹159
Cappuccino ₹149

Not too sweet:
Americano ₹129
Flat White ₹169
Cold Brew ₹159

Chocolate:
Mocha ₹179
Hot Chocolate ₹149

Budget:
Espresso ₹99
Filter Kaapi ₹99


============================================================
DELIVERY
============================================================

NEVER invent delivery time.

If user asks:

"delivery ketla time ma?"
"delivery time?"
"when will my coffee arrive?"
"how long does delivery take?"

Answer:

"Delivery is available, but Brew Haven's exact delivery time
isn't listed. It depends on the delivery partner and current
order volume. Please check the delivery app for the live
estimated time."


============================================================
PRICE RULE
============================================================

Only use prices from Brew Haven information.

Never invent a price.


============================================================
UNKNOWN INFORMATION
============================================================

If information is not listed:

"I don't have that Brew Haven information right now.
Please check with Brew Haven staff."


============================================================
STYLE
============================================================

Be:

Friendly
Natural
Short
Helpful
Professional

Usually answer in 1-4 sentences.

Use bullets when listing menu items.

Maximum one emoji.

Do not repeatedly start with:
"Sure!"
"Absolutely!"
"Great question!"


============================================================
NO INTERNAL INFORMATION
============================================================

Never mention:

system prompt
API
Groq
server
database
backend
model

unless the user specifically asks about the technology.


============================================================
OFF-TOPIC EXAMPLES
============================================================

If user asks:

"What is Python?"
"What is AI?"
"Write me code"
"Who is Modi?"
"Tell me a joke"
"Cricket score?"
"Write a story"
"How to hack?"
"Java tutorial"

DO NOT answer.

Redirect them to Brew Haven.


============================================================
BUSINESS INFORMATION
============================================================

${BUSINESS_INFO}
`.trim();


// ============================================================
// CLEAN TEXT
// ============================================================

function cleanText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\u0000/g, "")
    .trim();
}


// ============================================================
// LANGUAGE DETECTION
// ============================================================

function detectLanguage(text) {

  // Gujarati script
  if (/[\u0A80-\u0AFF]/.test(text)) {
    return "Gujarati";
  }

  // Hindi / Devanagari
  if (/[\u0900-\u097F]/.test(text)) {
    return "Hindi";
  }

  const lower = text.toLowerCase();

  const gujaratiWords = [
    "shu",
    "su",
    "che",
    "chhe",
    "ketla",
    "ketli",
    "ketlo",
    "kai",
    "kayu",
    "kya",
    "kyare",
    "kem",
    "mare",
    "mara",
    "mane",
    "joiye",
    "joia",
    "aapsho",
    "aapo",
    "karo",
    "thay",
    "bandh",
    "open",
    "sari",
    "saru",
    "strong",
    "cold",
  ];

  const hindiWords = [
    "mujhe",
    "mera",
    "meri",
    "chahiye",
    "kya",
    "kaise",
    "kitna",
    "kitni",
    "kab",
    "hai",
    "hain",
    "accha",
    "achhi",
    "chaiye",
  ];

  const words = lower.split(/\s+/);

  const gujaratiScore =
    gujaratiWords.filter(
      (word) => words.includes(word)
    ).length;

  const hindiScore =
    hindiWords.filter(
      (word) => words.includes(word)
    ).length;

  if (gujaratiScore > hindiScore && gujaratiScore > 0) {
    return "Gujarati";
  }

  if (hindiScore > gujaratiScore && hindiScore > 0) {
    return "Hindi";
  }

  return "English";
}


// ============================================================
// DIRECT BUSINESS ANSWERS
// ============================================================

function getDirectBusinessAnswer(message) {

  const text =
    cleanText(message).toLowerCase();

  const language =
    detectLanguage(message);


  // ==========================================================
  // GREETING
  // ==========================================================

  const greetings = [
    "hi",
    "hy",
    "hii",
    "hiii",
    "hello",
    "hey",
    "heyy",
    "namaste",
  ];

  if (greetings.includes(text)) {

    if (language === "Gujarati") {
      return {
        reply:
          "હાય! Brew Haven માં આપનું સ્વાગત છે ☕ હું તમને coffee, menu, prices, opening hours, delivery અને recommendations વિશે મદદ કરી શકું છું.",
        source: "business-data",
      };
    }

    if (language === "Hindi") {
      return {
        reply:
          "हाय! Brew Haven में आपका स्वागत है ☕ मैं आपको coffee, menu, prices, opening hours, delivery और recommendations में मदद कर सकता हूँ।",
        source: "business-data",
      };
    }

    return {
      reply:
        "Hey! Welcome to Brew Haven ☕ I can help with our coffee, menu, prices, opening hours, delivery and recommendations.",
      source: "business-data",
    };
  }


  // ==========================================================
  // BEST SELLER
  // ==========================================================

  if (
    text.includes("best seller") ||
    text.includes("bestseller") ||
    text.includes("most popular") ||
    text.includes("popular coffee") ||
    text.includes("best coffee") ||
    text.includes("best drink") ||
    text.includes("best seller su")
  ) {

    if (language === "Gujarati") {
      return {
        reply:
          "અમારા best sellers Cappuccino ₹149, Cold Brew ₹159, Filter Kaapi ₹99 અને Banana Bread ₹109 છે. Coffee માટે હું Cappuccino recommend કરું છું.",
        source: "business-data",
      };
    }

    if (language === "Hindi") {
      return {
        reply:
          "हमारे best sellers Cappuccino ₹149, Cold Brew ₹159, Filter Kaapi ₹99 और Banana Bread ₹109 हैं। Coffee के लिए मैं Cappuccino recommend करूंगा।",
        source: "business-data",
      };
    }

    return {
      reply:
        "Our best sellers are Cappuccino ₹149, Cold Brew ₹159, Filter Kaapi ₹99, and Banana Bread ₹109. For coffee, I'd recommend the Cappuccino.",
      source: "business-data",
    };
  }


  // ==========================================================
  // CLOSING / OPENING TIME
  // ==========================================================

  const asksHours =
    text.includes("close time") ||
    text.includes("closing time") ||
    text.includes("closing hours") ||
    text.includes("what time do you close") ||
    text.includes("when do you close") ||
    text.includes("close") ||
    text.includes("opening time") ||
    text.includes("opening hours") ||
    text.includes("open time") ||
    text.includes("what time do you open") ||
    text.includes("when do you open") ||
    text.includes("shop kyare") ||
    text.includes("kyare bandh") ||
    text.includes("bandh thay") ||
    text.includes("kyare open");

  if (asksHours) {

    if (language === "Gujarati") {
      return {
        reply:
          "Brew Haven Monday થી Friday 8:00 AM થી 9:00 PM સુધી ખુલ્લું રહે છે. Saturday અને Sunday 9:00 AM થી 10:00 PM સુધી, અને public holidays પર 10:00 AM થી 6:00 PM સુધી ખુલ્લું રહે છે.",
        source: "business-data",
      };
    }

    if (language === "Hindi") {
      return {
        reply:
          "Brew Haven Monday से Friday 8:00 AM से 9:00 PM तक खुला रहता है। Saturday और Sunday 9:00 AM से 10:00 PM तक, और public holidays पर 10:00 AM से 6:00 PM तक खुला रहता है।",
        source: "business-data",
      };
    }

    return {
      reply:
        "Brew Haven is open Monday to Friday from 8:00 AM to 9:00 PM, Saturday and Sunday from 9:00 AM to 10:00 PM, and public holidays from 10:00 AM to 6:00 PM.",
      source: "business-data",
    };
  }


  // ==========================================================
  // DELIVERY TIME
  // ==========================================================

  if (
    text.includes("delivery time") ||
    text.includes("delivary time") ||
    text.includes("delivery ketla") ||
    text.includes("delivary ketla") ||
    text.includes("ketla time ma delivery") ||
    text.includes("ketlo time delivery") ||
    text.includes("delivery kyare") ||
    text.includes("how long delivery") ||
    text.includes("how long does delivery") ||
    text.includes("when will my order arrive") ||
    text.includes("when will my coffee arrive") ||
    text.includes("order ketla time") ||
    text.includes("coffee ketla time ma") ||
    text.includes("delivery ma ketlo time") ||
    text.includes("delivery ma ketla time") ||
    text.includes("delivery ketli vaar")
  ) {

    if (language === "Gujarati") {
      return {
        reply:
          "Delivery available છે, પરંતુ Brew Haven નો exact delivery time અહીં આપેલો નથી. તે delivery partner અને current order volume પર depend કરે છે. Live estimated time માટે delivery app check કરો.",
        source: "business-data",
      };
    }

    if (language === "Hindi") {
      return {
        reply:
          "Delivery available है, लेकिन Brew Haven का exact delivery time यहाँ दिया नहीं गया है। यह delivery partner और current order volume पर depend करता है। Live estimated time के लिए delivery app check करें.",
        source: "business-data",
      };
    }

    return {
      reply:
        "Delivery is available, but Brew Haven's exact delivery time isn't listed. It depends on the delivery partner and current order volume. Please check the delivery app for the live estimated time.",
      source: "business-data",
    };
  }


  // ==========================================================
  // DELIVERY AVAILABLE
  // ==========================================================

  if (
    text.includes("do you deliver") ||
    text.includes("delivery available") ||
    text.includes("delivery che") ||
    text.includes("delivery karo") ||
    text.includes("delivery aapo") ||
    text.includes("tame delivery") ||
    text.includes("deliver karo") ||
    text.includes("can you deliver")
  ) {

    if (language === "Gujarati") {
      return {
        reply:
          "હા, Brew Haven delivery આપે છે. Exact delivery time delivery partner અને current order volume પર depend કરે છે.",
        source: "business-data",
      };
    }

    if (language === "Hindi") {
      return {
        reply:
          "हाँ, Brew Haven delivery देता है। Exact delivery time delivery partner और current order volume पर depend करता है.",
        source: "business-data",
      };
    }

    return {
      reply:
        "Yes, Brew Haven offers delivery. The exact delivery time depends on the delivery partner and current order volume.",
      source: "business-data",
    };
  }


  // ==========================================================
  // PAYMENT
  // ==========================================================

  if (
    text.includes("payment") ||
    text.includes("payment option") ||
    text.includes("payment options") ||
    text.includes("how can i pay") ||
    text.includes("upi") ||
    text.includes("cash") ||
    text.includes("card") ||
    text.includes("wallet")
  ) {

    if (language === "Gujarati") {
      return {
        reply:
          "Brew Haven માં Cash, major cards, UPI અને popular digital wallets દ્વારા payment કરી શકો છો.",
        source: "business-data",
      };
    }

    if (language === "Hindi") {
      return {
        reply:
          "Brew Haven में Cash, major cards, UPI और popular digital wallets से payment कर सकते हैं.",
        source: "business-data",
      };
    }

    return {
      reply:
        "Brew Haven accepts cash, major cards, UPI, and popular digital wallets.",
      source: "business-data",
    };
  }


  // ==========================================================
  // WIFI
  // ==========================================================

  if (
    text.includes("wifi") ||
    text.includes("wi-fi")
  ) {

    return {
      reply:
        language === "Gujarati"
          ? "હા, Brew Haven માં free WiFi available છે."
          : language === "Hindi"
          ? "हाँ, Brew Haven में free WiFi available है."
          : "Yes, Brew Haven has free WiFi for customers.",
      source: "business-data",
    };
  }


  // ==========================================================
  // PET
  // ==========================================================

  if (
    text.includes("pet friendly") ||
    text.includes("pets allowed") ||
    text.includes("dog allowed") ||
    text.includes("cat allowed")
  ) {

    return {
      reply:
        language === "Gujarati"
          ? "હા, Brew Haven માં pet-friendly outdoor seating area છે."
          : language === "Hindi"
          ? "हाँ, Brew Haven में pet-friendly outdoor seating area है."
          : "Yes. Brew Haven has a pet-friendly outdoor seating area.",
      source: "business-data",
    };
  }


  // ==========================================================
  // MILK
  // ==========================================================

  if (
    text.includes("milk option") ||
    text.includes("milk options") ||
    text.includes("oat milk") ||
    text.includes("almond milk") ||
    text.includes("soy milk")
  ) {

    return {
      reply:
        language === "Gujarati"
          ? "Full cream અને low-fat milk included છે. Oat, almond અને soy milk માટે +₹30 છે."
          : language === "Hindi"
          ? "Full cream और low-fat milk included हैं। Oat, almond और soy milk के लिए +₹30 है."
          : "Full cream and low-fat milk are included. Oat, almond and soy milk are available for +₹30.",
      source: "business-data",
    };
  }


  // ==========================================================
  // SUGAR
  // ==========================================================

  if (
    text.includes("sugar free") ||
    text.includes("sugar-free") ||
    text.includes("less sugar") ||
    text.includes("no sugar")
  ) {

    return {
      reply:
        language === "Gujarati"
          ? "હા, sugar-free અને less-sugar options request પર available છે."
          : language === "Hindi"
          ? "हाँ, sugar-free और less-sugar options request पर available हैं."
          : "Yes, sugar-free and less-sugar options are available on request.",
      source: "business-data",
    };
  }


  // ==========================================================
  // COLD COFFEE
  // ==========================================================

  if (
    text.includes("cold coffee") ||
    text.includes("iced coffee") ||
    text.includes("something cold") ||
    text.includes("coffee cold")
  ) {

    return {
      reply:
        language === "Gujarati"
          ? "કંઈક cold જોઈએ તો Cold Brew ₹159 અથવા Iced Latte ₹169 try કરો. ☕"
          : language === "Hindi"
          ? "अगर कुछ cold चाहिए तो Cold Brew ₹159 या Iced Latte ₹169 try करें. ☕"
          : "For something cold, I'd recommend Cold Brew ₹159 or Iced Latte ₹169. ☕",
      source: "business-data",
    };
  }


  // ==========================================================
  // STRONG COFFEE
  // ==========================================================

  if (
    text.includes("strong coffee") ||
    text.includes("strongest coffee") ||
    text.includes("something strong") ||
    text === "strong" ||
    text.includes("strong coffee joiye")
  ) {

    return {
      reply:
        language === "Gujarati"
          ? "Strong coffee માટે Espresso ₹99 અથવા Americano ₹129 સારું રહેશે. Longer drink જોઈએ તો Americano લો."
          : language === "Hindi"
          ? "Strong coffee के लिए Espresso ₹99 या Americano ₹129 अच्छा रहेगा। Longer drink चाहिए तो Americano लें."
          : "For a strong coffee, go for Espresso ₹99 or Americano ₹129. Choose Americano if you want a longer drink.",
      source: "business-data",
    };
  }


  // ==========================================================
  // CHEAP
  // ==========================================================

  if (
    text.includes("cheap coffee") ||
    text.includes("cheapest coffee") ||
    text.includes("budget coffee") ||
    text === "cheap"
  ) {

    return {
      reply:
        language === "Gujarati"
          ? "સૌથી affordable coffee Espresso ₹99 અને Filter Kaapi ₹99 છે."
          : language === "Hindi"
          ? "सबसे affordable coffee Espresso ₹99 और Filter Kaapi ₹99 हैं."
          : "The most affordable coffees are Espresso ₹99 and Filter Kaapi ₹99.",
      source: "business-data",
    };
  }


  // ==========================================================
  // LOYALTY
  // ==========================================================

  if (
    text.includes("loyalty") ||
    text.includes("loyalty card") ||
    text.includes("free coffee") ||
    text.includes("8th coffee")
  ) {

    return {
      reply:
        language === "Gujarati"
          ? "Brew Haven loyalty card સાથે દરેક 8મી coffee free મળે છે."
          : language === "Hindi"
          ? "Brew Haven loyalty card के साथ हर 8वीं coffee free मिलती है."
          : "With the Brew Haven loyalty card, every 8th coffee is free.",
      source: "business-data",
    };
  }


  // ==========================================================
  // MENU
  // ==========================================================

  if (
    text === "menu" ||
    text === "show menu" ||
    text === "menu please" ||
    text.includes("coffee menu")
  ) {

    return {
      reply:
        "☕ Coffee Menu:\n" +
        "• Espresso — ₹99\n" +
        "• Americano — ₹129\n" +
        "• Cappuccino — ₹149\n" +
        "• Cafe Latte — ₹159\n" +
        "• Flat White — ₹169\n" +
        "• Mocha — ₹179\n" +
        "• Cold Brew — ₹159\n" +
        "• Iced Latte — ₹169\n" +
        "• Filter Kaapi — ₹99",
      source: "business-data",
    };
  }


  return null;
}


// ============================================================
// OFF-TOPIC DETECTION
// ============================================================

function isOffTopic(message) {

  const text =
    cleanText(message).toLowerCase();

  const blockedTopics = [

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
    "today news",
    "breaking news",

    "politics",

    "cricket score",
    "cricket match",
    "football match",
    "ipl score",

    "write a poem",
    "write a story",
    "tell me a joke",
  ];

  return blockedTopics.some(
    (item) => text.includes(item)
  );
}


// ============================================================
// OFF-TOPIC RESPONSE
// ============================================================

function getOffTopicResponse(message) {

  const language =
    detectLanguage(message);


  if (language === "Gujarati") {

    return (
      "હું Bru, Brew Haven નો virtual barista છું. " +
      "હું તમને coffee, menu, prices, opening hours, " +
      "delivery અને recommendations વિશે મદદ કરી શકું છું. ☕"
    );
  }


  if (language === "Hindi") {

    return (
      "मैं Bru, Brew Haven का virtual barista हूँ। " +
      "मैं coffee, menu, prices, opening hours, delivery " +
      "और recommendations में मदद कर सकता हूँ। ☕"
    );
  }


  return (
    "I'm Bru, Brew Haven's virtual barista. " +
    "I can help with coffee, menu, prices, opening hours, " +
    "delivery and recommendations. ☕"
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

      if (!item) {
        return false;
      }

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

    .map((item) => {

      const role =
        item.role === "bot"
          ? "assistant"
          : item.role;

      const content =
        typeof item.text === "string"
          ? item.text
          : item.content;

      return {
        role,
        content:
          cleanText(content).slice(0, 1000),
      };
    })

    .filter(
      (item) =>
        item.content.length > 0
    );
}


// ============================================================
// GROQ REQUEST
// ============================================================

async function callGroq(apiKey, messages) {

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      20000
    );

  try {

    const response =
      await fetch(
        GROQ_API_URL,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization:
              `Bearer ${apiKey}`,
          },

          body: JSON.stringify({

            model:
              GROQ_MODEL,

            messages,

            temperature:
              0.25,

            max_tokens:
              350,

            stream:
              false,

          }),

          signal:
            controller.signal,
        }
      );


    const rawText =
      await response.text();


    let data = null;

    try {
      data =
        JSON.parse(rawText);
    } catch {
      data = null;
    }


    return {
      ok:
        response.ok,

      status:
        response.status,

      data,

      rawText,
    };

  } catch (error) {

    return {
      ok:
        false,

      status:
        500,

      data:
        null,

      rawText:
        error?.message ||
        "Network error",
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


  // ==========================================================
  // OPTIONS
  // ==========================================================

  if (
    req.method === "OPTIONS"
  ) {

    return res
      .status(204)
      .end();
  }


  // ==========================================================
  // HEALTH CHECK
  // ==========================================================

  if (
    req.method === "GET"
  ) {

    return res
      .status(200)
      .json({

        ok:
          true,

        service:
          "Brew Haven AI",

        groqConfigured:
          Boolean(
            process.env.GROQ_API_KEY
          ),

        model:
          GROQ_MODEL,

        message:
          process.env.GROQ_API_KEY
            ? "AI service is configured."
            : "GROQ_API_KEY is missing.",

      });
  }


  // ==========================================================
  // POST ONLY
  // ==========================================================

  if (
    req.method !== "POST"
  ) {

    return res
      .status(405)
      .json({
        error:
          "Method not allowed.",
      });
  }


  try {

    // ========================================================
    // API KEY
    // ========================================================

    const apiKey =
      process.env.GROQ_API_KEY;


    if (!apiKey) {

      console.error(
        "[BREW HAVEN] GROQ_API_KEY missing"
      );

      return res
        .status(500)
        .json({

          error:
            "GROQ_API_KEY is missing in Vercel.",

          code:
            "MISSING_API_KEY",

        });
    }


    // ========================================================
    // BODY
    // ========================================================

    const body =
      req.body || {};


    const userMessage =
      cleanText(
        body.message
      );


    const history =
      buildHistory(
        body.history
      );


    // ========================================================
    // VALIDATION
    // ========================================================

    if (!userMessage) {

      return res
        .status(400)
        .json({

          error:
            "Please enter a message.",

        });
    }


    if (
      userMessage.length > 500
    ) {

      return res
        .status(400)
        .json({

          error:
            "Message is too long.",

        });
    }


    // ========================================================
    // 1. DIRECT BUSINESS ANSWER
    // ========================================================

    const directAnswer =
      getDirectBusinessAnswer(
        userMessage
      );


    if (directAnswer) {

      console.log(
        "[BREW HAVEN] DIRECT:",
        userMessage
      );

      return res
        .status(200)
        .json(
          directAnswer
        );
    }


    // ========================================================
    // 2. OFF-TOPIC
    // ========================================================

    if (
      isOffTopic(
        userMessage
      )
    ) {

      console.log(
        "[BREW HAVEN] OFF TOPIC:",
        userMessage
      );

      return res
        .status(200)
        .json({

          reply:
            getOffTopicResponse(
              userMessage
            ),

          source:
            "topic-filter",

        });
    }


    // ========================================================
    // 3. AI REQUEST
    // ========================================================

    const language =
      detectLanguage(
        userMessage
      );


    const languageInstruction = `
The user's language is ${language}.

IMPORTANT:
Reply ONLY in the same language/style as the user.

Do not switch to English unless the user is using English.

If the user uses Gujarati written in English letters,
reply in natural Gujarati written in English letters.

If the user uses Gujarati script,
reply in Gujarati script.

If the user uses Hindi,
reply in Hindi.

If the user uses Hinglish,
reply in Hinglish.
`;


    const messages = [

      {
        role:
          "system",

        content:
          SYSTEM_PROMPT +
          "\n\n" +
          languageInstruction,
      },

      ...history,

      {
        role:
          "user",

        content:
          userMessage,
      },

    ];


    console.log(
      "[BREW HAVEN] Calling Groq:",
      GROQ_MODEL
    );


    // ========================================================
    // 4. GROQ
    // ========================================================

    const result =
      await callGroq(
        apiKey,
        messages
      );


    // ========================================================
    // 5. SUCCESS
    // ========================================================

    if (
      result.ok
    ) {

      const reply =
        result
          ?.data
          ?.choices?.[0]
          ?.message
          ?.content;


      if (
        reply &&
        reply.trim()
      ) {

        console.log(
          "[BREW HAVEN] GROQ SUCCESS"
        );

        return res
          .status(200)
          .json({

            reply:
              reply.trim(),

            source:
              "groq",

            model:
              GROQ_MODEL,

          });
      }
    }


    // ========================================================
    // 6. ACTUAL ERROR LOG
    // ========================================================

    console.error(
      "[BREW HAVEN] GROQ ERROR:",
      {

        status:
          result.status,

        message:
          result
            ?.data
            ?.error
            ?.message ||
          result.rawText,

      }
    );


    // ========================================================
    // 7. AI FAILED
    // ========================================================
    //
    // Don't pretend AI succeeded.
    // But return HTTP 200 so frontend doesn't show
    // ugly 502 errors.
    // ========================================================

    return res
      .status(200)
      .json({

        reply:
          language === "Gujarati"
            ? "હમણાં AI response માં થોડી સમસ્યા આવી રહી છે. Brew Haven ના menu, prices, opening hours અથવા delivery વિશે પૂછો."
            : language === "Hindi"
            ? "अभी AI response में थोड़ी समस्या आ रही है। Brew Haven के menu, prices, opening hours या delivery के बारे में पूछें."
            : "I'm having a temporary AI issue. You can still ask me about Brew Haven's menu, prices, opening hours, delivery, or recommendations.",

        source:
          "ai-fallback",

      });

  } catch (error) {

    console.error(
      "[BREW HAVEN] SERVER ERROR:",
      error
    );


    return res
      .status(200)
      .json({

        reply:
          "I'm having a temporary problem. Please ask me about Brew Haven's coffee, menu, prices, opening hours, delivery, or recommendations.",

        source:
          "server-fallback",

      });
  }
}