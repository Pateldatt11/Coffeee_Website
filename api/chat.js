// ============================================================
// BREW HAVEN AI BARISTA
// Vercel Serverless API + Groq
// File: api/chat.js
// ============================================================

const BUSINESS_INFO = `
============================================================
BREW HAVEN — OFFICIAL BUSINESS INFORMATION
============================================================

BUSINESS NAME:
Brew Haven

BUSINESS TYPE:
Coffee shop / cafe

============================================================
OPENING HOURS
============================================================

Monday:
8:00 AM - 9:00 PM

Tuesday:
8:00 AM - 9:00 PM

Wednesday:
8:00 AM - 9:00 PM

Thursday:
8:00 AM - 9:00 PM

Friday:
8:00 AM - 9:00 PM

Saturday:
9:00 AM - 10:00 PM

Sunday:
9:00 AM - 10:00 PM

Public Holidays:
10:00 AM - 6:00 PM

============================================================
LOCATION & CONTACT
============================================================

Address:
[Your shop address here]

Phone:
[Your phone number here]

Delivery:
Delivery is available through:
[Swiggy / Zomato / Your Delivery Partner]

IMPORTANT:
Exact delivery time has NOT been provided in the official
business information.

Therefore:

DO NOT invent a delivery time.

If the customer asks:
"How long does delivery take?"
"When will my coffee arrive?"
"Delivery time?"
"How much time for delivery?"

Say:

"Delivery is available, but Brew Haven's exact delivery time
isn't listed here. It can depend on the delivery partner and
current order volume."

Then, if useful:
"Please check the delivery app for the live estimated time."

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

Filter Kaapi (South Indian style) — ₹99

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

Croissant:
Plain — ₹99
Chocolate — ₹129

Banana Bread Slice — ₹109

Sandwich:
Veg — ₹149
Paneer — ₹169
Chicken — ₹189

Brownie — ₹119

Cookies:
Pack of 2 — ₹89

============================================================
CUSTOMIZATION
============================================================

Milk options:

Full cream — included

Low fat — included

Oat milk — +₹30

Almond milk — +₹30

Soy milk — +₹30

Sugar-free available on request.

Less sugar available on request.

All coffees are available Hot or Iced.

============================================================
BEST SELLERS
============================================================

1. Cappuccino — ₹149
2. Cold Brew — ₹159
3. Filter Kaapi — ₹99
4. Banana Bread — ₹109

============================================================
LOYALTY PROGRAM
============================================================

Every 8th coffee is free with the Brew Haven loyalty card.

Customers can ask at the counter or on the app to join.

============================================================
PAYMENTS
============================================================

Cash accepted.

Major cards accepted.

UPI accepted.

Popular wallets accepted.

============================================================
AMENITIES
============================================================

Free WiFi

Indoor seating

Outdoor seating

Pet-friendly outdoor area

Charging points

============================================================
ALLERGEN INFORMATION
============================================================

The kitchen handles:

Nuts

Gluten

Dairy

Customers should tell staff about allergies before ordering.

============================================================
IMPORTANT FACT RULE
============================================================

Only treat the information above as confirmed Brew Haven
business information.

If something is NOT listed above:

DO NOT invent it.

Instead say that the information isn't currently available
and suggest contacting Brew Haven staff.

============================================================
`;


const SYSTEM_PROMPT = `
You are "Bru", the intelligent virtual barista and customer
assistant for Brew Haven.

You are NOT a robotic FAQ system.

You should behave like a smart, friendly, professional cafe
employee who understands what the customer actually means.

============================================================
YOUR MAIN JOB
============================================================

Help customers with:

- menu
- prices
- coffee recommendations
- food recommendations
- opening hours
- closing hours
- delivery
- delivery questions
- payments
- customization
- milk options
- sugar options
- best sellers
- loyalty program
- amenities
- allergies
- general coffee questions
- coffee comparisons
- recommendations
- casual conversation

You may also answer general knowledge questions naturally,
but do NOT pretend that general information is Brew Haven
business information.

============================================================
BUSINESS KNOWLEDGE
============================================================

${BUSINESS_INFO}

============================================================
INTELLIGENCE RULES
============================================================

1. UNDERSTAND NATURAL LANGUAGE

The customer may write:

"coffee kai sari?"

"best coffee?"

"something cold"

"strong coffee joiye"

"delivery ketla time ma?"

"what time close?"

"tame delivery karo?"

"cheap coffee?"

"what should I get?"

"bhai cold coffee ma su che?"

"which one is less sweet?"

You must understand the intended meaning.

Do NOT complain about grammar.

Do NOT say:
"I don't understand your question"
unless the message is genuinely impossible to understand.

============================================================
2. CONTEXT AWARENESS
============================================================

Use previous conversation context.

Example:

Customer:
"What is your best seller?"

You:
"Cappuccino is one of our best sellers at ₹149."

Customer:
"Is it sweet?"

You should understand that "it" means Cappuccino.

Do NOT ask:
"What are you referring to?"

unless there are genuinely multiple possible references.

============================================================
3. SHORT BUT USEFUL ANSWERS
============================================================

Normal questions:
2-5 short sentences.

Menu questions:
Use bullets.

Complex questions:
Give enough detail to properly answer.

Do not unnecessarily write huge paragraphs.

============================================================
4. RECOMMENDATIONS
============================================================

When customer gives a preference, recommend 1-2 items.

Examples:

"something strong"
→ Espresso or Americano

"something cold"
→ Cold Brew or Iced Latte

"something creamy"
→ Cafe Latte or Cappuccino

"not too sweet"
→ Americano, Flat White, or Cold Brew

"something cheap"
→ Espresso ₹99 or Filter Kaapi ₹99

"something with chocolate"
→ Mocha ₹179 or Hot Chocolate ₹149

Do not list the entire menu unless asked.

============================================================
5. PRICE ACCURACY
============================================================

Always use the exact prices from the business information.

Never make up prices.

If an item isn't listed:
Say that its price isn't currently available.

============================================================
6. DELIVERY QUESTIONS
============================================================

Delivery is available.

But the exact delivery time is NOT provided.

If asked about delivery time, say something like:

"Delivery is available, but Brew Haven's exact delivery time
isn't listed here. It can depend on the delivery partner and
current order volume. You can check the delivery app for the
live estimated time."

NEVER invent:
"20 minutes"
"30 minutes"
"45 minutes"

unless that information is added to the business knowledge.

============================================================
7. HOURS QUESTIONS
============================================================

Understand:

"When do you close?"
"closing time?"
"are you open tonight?"
"what time today?"
"when does Brew Haven shut?"
"shop kyare bandh thay?"

Use the correct weekday schedule.

IMPORTANT:
The current date may not be available as reliable local
business time inside this server.

Therefore, if the user asks "today", use the actual current
date if available to you.

If you cannot reliably determine the weekday:
give the weekday schedule and say they should verify today's
hours.

============================================================
8. GENERAL QUESTIONS
============================================================

You are allowed to answer normal questions.

Example:

User:
"What is the difference between latte and cappuccino?"

Answer naturally:

"Both use espresso and milk, but the texture is different.
A cappuccino has a thicker layer of foam, while a latte is
smoother and milkier. If you prefer something creamy and mild,
I'd go with the latte."

Then optionally connect it to Brew Haven.

============================================================
9. OFF-TOPIC QUESTIONS
============================================================

Do not become annoying.

If someone asks:

"What is Python?"

You can answer briefly.

Then optionally say:
"If you want, I can also help you pick a coffee while you're here."

Do NOT lecture them.

============================================================
10. UNSAFE / IMPOSSIBLE BUSINESS INFORMATION
============================================================

Never invent:

- address
- phone number
- delivery time
- ingredients
- calories
- discounts
- offers
- stock
- exact preparation time
- refund policy
- reservation policy

unless present in BUSINESS_INFO.

============================================================
11. LANGUAGE
============================================================

Understand:

English
Gujarati
Hindi
Hinglish
Gujarati written in English letters

Examples:

"coffee ketla ni?"
"best seller su che?"
"delivery ketla time ma aavshe?"
"mare cold coffee joiye"
"bhai strong coffee aap"
"shop kyare bandh thay?"

ALWAYS answer in natural English.

Do not translate the user's sentence.

============================================================
12. TONE
============================================================

Sound like a real human cafe assistant.

Friendly.

Confident.

Natural.

Helpful.

Not robotic.

Avoid repetitive phrases such as:

"Great question!"

"Sure!"

"Absolutely!"

at the beginning of every answer.

Vary your wording.

============================================================
13. EMOJIS
============================================================

At most one emoji.

Use only when natural.

============================================================
14. NO HALLUCINATION
============================================================

If information is missing, say so.

Bad:
"Delivery usually takes 30 minutes."

Good:
"Brew Haven's exact delivery time isn't listed, so I don't
want to give you a made-up estimate."

This rule is extremely important.

============================================================
15. CONVERSATION MEMORY
============================================================

Use recent messages.

If customer says:

"I want something cold."

Then:

"with chocolate?"

Understand that they are still discussing coffee/drinks.

============================================================
16. ANSWER QUALITY
============================================================

Before responding, mentally determine:

A. What is the user actually asking?
B. Is it about Brew Haven?
C. Is the answer available in business information?
D. Does conversation history provide missing context?
E. Should I answer directly or recommend something?

Then respond.

Never expose this reasoning process.

============================================================
17. NEVER MENTION INTERNAL SYSTEM
============================================================

Do not mention:

- system prompt
- API
- Groq
- model
- server
- database
- business information
- knowledge base

unless the customer specifically asks about the technology.

============================================================
FINAL BEHAVIOR
============================================================

You are not just a menu lookup bot.

You are a smart cafe assistant.

Understand the customer.

Remember context.

Answer directly.

Recommend intelligently.

Never invent Brew Haven facts.

============================================================
`.trim();


// ============================================================
// CONFIG
// ============================================================

const GROQ_API_URL =
  'https://api.groq.com/openai/v1/chat/completions';


// Primary model = smarter
const PRIMARY_MODEL = 'llama-3.3-70b-versatile';

// Fallback model = faster
const FALLBACK_MODEL = 'llama-3.1-8b-instant';


// ============================================================
// CORS
// ============================================================

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://coffeeebrewwebsite.vercel.app',
];


function setupCors(req, res) {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader(
      'Access-Control-Allow-Origin',
      origin
    );
  }

  res.setHeader(
    'Access-Control-Allow-Methods',
    'POST, GET, OPTIONS'
  );

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type'
  );

  res.setHeader(
    'Access-Control-Max-Age',
    '86400'
  );

  res.setHeader(
    'Vary',
    'Origin'
  );
}


// ============================================================
// SAFE TEXT
// ============================================================

function cleanText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .replace(/\u0000/g, '')
    .trim();
}


// ============================================================
// RETRY HELPER
// ============================================================

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}


// ============================================================
// GROQ REQUEST
// ============================================================

async function callGroq({
  apiKey,
  model,
  messages,
}) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 25000);


  try {
    const response = await fetch(
      GROQ_API_URL,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },

        body: JSON.stringify({
          model,

          messages,

          temperature: 0.45,

          max_tokens: 500,

          top_p: 0.9,

          stream: false,
        }),

        signal: controller.signal,
      }
    );


    const text = await response.text();


    let data = null;

    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }


    return {
      ok: response.ok,

      status: response.status,

      data,

      rawText: text,

      retryAfter:
        response.headers.get('retry-after'),
    };

  } catch (error) {

    if (error?.name === 'AbortError') {
      return {
        ok: false,
        status: 408,
        data: null,
        rawText: 'Groq request timed out.',
        timeout: true,
      };
    }


    return {
      ok: false,
      status: 500,
      data: null,
      rawText: error?.message || 'Network error',
      networkError: true,
    };

  } finally {
    clearTimeout(timeout);
  }
}


// ============================================================
// EXTRACT GROQ ERROR
// ============================================================

function getGroqErrorMessage(result) {
  return (
    result?.data?.error?.message ||
    result?.data?.message ||
    result?.rawText ||
    'Unknown Groq error'
  );
}


// ============================================================
// DIRECT BUSINESS ANSWERS
// ============================================================
//
// These prevent the chatbot from unnecessarily calling AI for
// simple factual questions.
//
// More importantly, they guarantee that questions like
// "delivery time?" don't become a fake "AI unavailable" answer.
// ============================================================

function getDirectBusinessAnswer(message) {
  const text = cleanText(message).toLowerCase();


  // ----------------------------------------------------------
  // DELIVERY TIME
  // ----------------------------------------------------------

  const deliveryTimePatterns = [
    'delivery time',
    'delivery ketla',
    'delivery ketla time',
    'ketla time ma delivery',
    'delivery kyare',
    'delivery when',
    'how long delivery',
    'how long does delivery',
    'when will my order arrive',
    'when will my coffee arrive',
    'order ketla time',
    'coffee ketla time ma',
    'delivery ma ketlo time',
    'delivery ma ketla time',
    'delivery ketli vaar',
    'delivery time su che',
  ];


  if (
    deliveryTimePatterns.some(
      (pattern) => text.includes(pattern)
    )
  ) {
    return (
      "Delivery is available, but Brew Haven's exact delivery " +
      "time isn't listed here. It can depend on the delivery " +
      "partner and current order volume. Please check the " +
      "delivery app for the live estimated time."
    );
  }


  // ----------------------------------------------------------
  // DELIVERY AVAILABLE?
  // ----------------------------------------------------------

  const deliveryAvailabilityPatterns = [
    'do you deliver',
    'delivery available',
    'delivery che',
    'delivery karo',
    'delivery aapo',
    'tame delivery',
    'deliver karo',
    'deliver che',
    'can you deliver',
    'is delivery available',
  ];


  if (
    deliveryAvailabilityPatterns.some(
      (pattern) => text.includes(pattern)
    )
  ) {
    return (
      "Yes, Brew Haven offers delivery through its delivery " +
      "partner. The exact delivery time depends on the " +
      "delivery partner and current order volume."
    );
  }


  // ----------------------------------------------------------
  // PAYMENT
  // ----------------------------------------------------------

  const paymentPatterns = [
    'payment',
    'pay by',
    'pay with',
    'upi',
    'cash',
    'card',
    'wallet',
    'payment options',
  ];


  if (
    paymentPatterns.some(
      (pattern) => text.includes(pattern)
    )
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
    text.includes('wifi') ||
    text.includes('wi-fi') ||
    text.includes('internet')
  ) {
    return (
      "Yes — Brew Haven has free WiFi for customers."
    );
  }


  // ----------------------------------------------------------
  // PET
  // ----------------------------------------------------------

  if (
    text.includes('pet') ||
    text.includes('dog') ||
    text.includes('cat')
  ) {
    return (
      "Yes. Brew Haven has a pet-friendly outdoor seating area."
    );
  }


  // ----------------------------------------------------------
  // BEST SELLER
  // ----------------------------------------------------------

  if (
    text.includes('best seller') ||
    text.includes('bestseller') ||
    text.includes('popular coffee') ||
    text.includes('most popular')
  ) {
    return (
      "Our best sellers are Cappuccino ₹149, Cold Brew ₹159, " +
      "Filter Kaapi ₹99, and Banana Bread ₹109. If you want " +
      "a coffee, I'd start with the Cappuccino."
    );
  }


  // ----------------------------------------------------------
  // LOYALTY
  // ----------------------------------------------------------

  if (
    text.includes('loyalty') ||
    text.includes('free coffee') ||
    text.includes('8th coffee') ||
    text.includes('eighth coffee')
  ) {
    return (
      "Brew Haven's loyalty card gives you every 8th coffee " +
      "free. You can ask at the counter or join through the app."
    );
  }


  // ----------------------------------------------------------
  // MILK
  // ----------------------------------------------------------

  if (
    text.includes('oat milk') ||
    text.includes('almond milk') ||
    text.includes('soy milk') ||
    text.includes('milk option') ||
    text.includes('milk options')
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
    text.includes('sugar free') ||
    text.includes('sugar-free') ||
    text.includes('less sugar') ||
    text.includes('no sugar')
  ) {
    return (
      "Yes — sugar-free and less-sugar options are available " +
      "on request."
    );
  }


  // ----------------------------------------------------------
  // HOT / ICED
  // ----------------------------------------------------------

  if (
    text.includes('iced coffee') ||
    text.includes('cold coffee') ||
    text.includes('coffee cold')
  ) {
    return (
      "For something cold, I'd recommend the Cold Brew ₹159 " +
      "or Iced Latte ₹169. Both coffees can be served iced."
    );
  }


  // ----------------------------------------------------------
  // STRONG COFFEE
  // ----------------------------------------------------------

  if (
    text.includes('strong coffee') ||
    text.includes('strongest coffee') ||
    text.includes('strong coffee joiye') ||
    text.includes('strong')
  ) {
    return (
      "If you want something strong, go for an Espresso ₹99 " +
      "or Americano ₹129. I'd pick the Americano if you want " +
      "a longer drink."
    );
  }


  // ----------------------------------------------------------
  // CHEAP / BUDGET
  // ----------------------------------------------------------

  if (
    text.includes('cheap coffee') ||
    text.includes('cheapest coffee') ||
    text.includes('budget coffee') ||
    text.includes('cheap')
  ) {
    return (
      "The most affordable coffees are Espresso ₹99 and " +
      "Filter Kaapi ₹99."
    );
  }


  // ----------------------------------------------------------
  // HOURS
  // ----------------------------------------------------------

  if (
    text.includes('opening hours') ||
    text.includes('opening time') ||
    text.includes('close') ||
    text.includes('closing time') ||
    text.includes('what time') ||
    text.includes('open today') ||
    text.includes('shop kyare') ||
    text.includes('bandh thay') ||
    text.includes('kyare open')
  ) {

    return (
      "Brew Haven is open Monday to Friday from 8:00 AM to " +
      "9:00 PM, and Saturday to Sunday from 9:00 AM to " +
      "10:00 PM. On public holidays, hours are 10:00 AM to " +
      "6:00 PM."
    );
  }


  return null;
}


// ============================================================
// HISTORY SANITIZER
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
        item.role !== 'user' &&
        item.role !== 'bot' &&
        item.role !== 'assistant'
      ) {
        return false;
      }

      if (
        typeof item.text !== 'string' &&
        typeof item.content !== 'string'
      ) {
        return false;
      }

      return true;
    })

    .slice(-8)

    .map((item) => {

      const role =
        item.role === 'bot'
          ? 'assistant'
          : item.role;

      const content =
        typeof item.text === 'string'
          ? item.text
          : item.content;

      return {
        role,
        content: cleanText(content).slice(0, 1200),
      };
    })

    .filter(
      (item) => item.content.length > 0
    );
}


// ============================================================
// API HANDLER
// ============================================================

export default async function handler(req, res) {

  setupCors(req, res);


  // ==========================================================
  // PREFLIGHT
  // ==========================================================

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }


  // ==========================================================
  // HEALTH CHECK
  // ==========================================================

  if (req.method === 'GET') {

    const configured =
      Boolean(process.env.GROQ_API_KEY);

    return res.status(200).json({
      ok: true,
      service: 'Brew Haven AI',
      groqConfigured: configured,
      primaryModel: PRIMARY_MODEL,
      fallbackModel: FALLBACK_MODEL,
      message: configured
        ? 'AI service is configured.'
        : 'GROQ_API_KEY is missing.',
    });
  }


  // ==========================================================
  // ONLY POST
  // ==========================================================

  if (req.method !== 'POST') {

    return res.status(405).json({
      error: 'Method not allowed.',
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
        '[BREW HAVEN] GROQ_API_KEY is missing.'
      );

      return res.status(500).json({
        error:
          'The chatbot API key is not configured on Vercel.',
        code: 'MISSING_API_KEY',
      });
    }


    // ========================================================
    // BODY
    // ========================================================

    const body =
      req.body || {};


    const userMessage =
      cleanText(body.message);


    const history =
      buildHistory(body.history);


    // ========================================================
    // VALIDATION
    // ========================================================

    if (!userMessage) {

      return res.status(400).json({
        error:
          'Please enter a message.',
        code: 'EMPTY_MESSAGE',
      });
    }


    if (userMessage.length > 500) {

      return res.status(400).json({
        error:
          'Message is too long. Please keep it under 500 characters.',
        code: 'MESSAGE_TOO_LONG',
      });
    }


    // ========================================================
    // DIRECT BUSINESS ANSWER
    // ========================================================
    //
    // This is intentionally BEFORE Groq.
    //
    // So simple questions are always reliable.
    // ========================================================

    const directAnswer =
      getDirectBusinessAnswer(userMessage);


    if (directAnswer) {

      console.log(
        '[BREW HAVEN] Direct answer:',
        userMessage
      );

      return res.status(200).json({
        reply: directAnswer,
        source: 'business-data',
      });
    }


    // ========================================================
    // BUILD AI MESSAGES
    // ========================================================

    const messages = [

      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },

      ...history,

      {
        role: 'user',
        content: userMessage,
      },

    ];


    // ========================================================
    // PRIMARY MODEL
    // ========================================================

    console.log(
      '[BREW HAVEN] Calling primary model:',
      PRIMARY_MODEL
    );


    let result =
      await callGroq({
        apiKey,
        model: PRIMARY_MODEL,
        messages,
      });


    // ========================================================
    // PRIMARY SUCCESS
    // ========================================================

    if (result.ok) {

      const reply =
        result?.data?.choices?.[0]?.message?.content;


      if (reply) {

        console.log(
          '[BREW HAVEN] Primary model success.'
        );

        return res.status(200).json({
          reply: reply.trim(),
          source: 'groq',
          model: PRIMARY_MODEL,
        });
      }


      console.error(
        '[BREW HAVEN] Primary model returned no content:',
        JSON.stringify(result.data)
      );
    }


    // ========================================================
    // PRIMARY FAILED
    // ========================================================

    console.error(
      '[BREW HAVEN] Primary Groq error:',
      {
        status: result.status,
        error: getGroqErrorMessage(result),
        timeout: result.timeout || false,
        networkError: result.networkError || false,
      }
    );


    // ========================================================
    // RETRY LOGIC
    // ========================================================

    if (
      result.status === 429 ||
      result.status === 500 ||
      result.status === 502 ||
      result.status === 503 ||
      result.status === 504 ||
      result.timeout ||
      result.networkError
    ) {

      const retryAfter =
        Number(result.retryAfter);


      const waitTime =
        Number.isFinite(retryAfter) &&
        retryAfter > 0 &&
        retryAfter < 10
          ? retryAfter * 1000
          : 800;


      await sleep(waitTime);


      console.log(
        '[BREW HAVEN] Retrying primary model...'
      );


      result =
        await callGroq({
          apiKey,
          model: PRIMARY_MODEL,
          messages,
        });


      if (result.ok) {

        const retryReply =
          result?.data?.choices?.[0]?.message?.content;


        if (retryReply) {

          console.log(
            '[BREW HAVEN] Primary retry success.'
          );

          return res.status(200).json({
            reply: retryReply.trim(),
            source: 'groq-retry',
            model: PRIMARY_MODEL,
          });
        }
      }
    }


    // ========================================================
    // FALLBACK MODEL
    // ========================================================

    console.log(
      '[BREW HAVEN] Switching to fallback model:',
      FALLBACK_MODEL
    );


    const fallbackResult =
      await callGroq({
        apiKey,
        model: FALLBACK_MODEL,
        messages,
      });


    if (fallbackResult.ok) {

      const fallbackReply =
        fallbackResult?.data?.choices?.[0]?.message?.content;


      if (fallbackReply) {

        console.log(
          '[BREW HAVEN] Fallback model success.'
        );

        return res.status(200).json({
          reply: fallbackReply.trim(),
          source: 'groq-fallback',
          model: FALLBACK_MODEL,
        });
      }
    }


    // ========================================================
    // BOTH MODELS FAILED
    // ========================================================

    console.error(
      '[BREW HAVEN] FALLBACK FAILED:',
      {
        status: fallbackResult.status,
        error:
          getGroqErrorMessage(fallbackResult),
      }
    );


    // ========================================================
    // SAFE USER ERROR
    // ========================================================

    let errorMessage =
      'The AI service is temporarily unavailable. ' +
      'Please try again in a moment.';


    if (fallbackResult.status === 401) {

      errorMessage =
        'The AI service authentication is invalid. ' +
        'Please check the GROQ_API_KEY in Vercel.';

    } else if (fallbackResult.status === 403) {

      errorMessage =
        'The AI service access was denied. ' +
        'Please check the Groq API key permissions.';

    } else if (fallbackResult.status === 429) {

      errorMessage =
        'The AI service is temporarily busy. ' +
        'Please try again in a few seconds.';

    } else if (fallbackResult.status === 400) {

      errorMessage =
        'The AI request was rejected. Please try asking ' +
        'your question in a slightly different way.';

    }


    return res.status(502).json({
      error: errorMessage,
      code: 'GROQ_REQUEST_FAILED',
      providerStatus: fallbackResult.status,
    });


  } catch (error) {

    console.error(
      '[BREW HAVEN] UNHANDLED API ERROR:',
      error
    );


    return res.status(500).json({
      error:
        'The chatbot server encountered an unexpected error.',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
}