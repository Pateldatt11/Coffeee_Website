// ============================================================
// BREW HAVEN AI BARISTA
// Vercel Serverless API + Groq
// File: api/chat.js
// ============================================================

const GROQ_API_URL =
  'https://api.groq.com/openai/v1/chat/completions';

const GROQ_MODELS_URL =
  'https://api.groq.com/openai/v1/models';


// ============================================================
// MODEL PREFERENCE
// ============================================================

const PREFERRED_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
];


// ============================================================
// ALLOWED ORIGINS
// ============================================================

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://coffeeebrewwebsite.vercel.app',
];


// ============================================================
// BUSINESS INFORMATION
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


============================================================
DELIVERY
============================================================

Delivery is available through:

[Swiggy / Zomato / Your Delivery Partner]

IMPORTANT:

Exact delivery time is NOT provided.

NEVER invent delivery time.

If customer asks about delivery time:

"Delivery is available, but Brew Haven's exact delivery time
isn't listed here. It can depend on the delivery partner and
current order volume. Please check the delivery app for the
live estimated time."


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

All coffees are available Hot or Iced.


============================================================
BEST SELLERS
============================================================

1. Cappuccino — ₹149
2. Cold Brew — ₹159
3. Filter Kaapi — ₹99
4. Banana Bread — ₹109


============================================================
LOYALTY
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
ALLERGIES
============================================================

Kitchen handles:

Nuts

Gluten

Dairy

Customers should tell staff about allergies before ordering.


============================================================
IMPORTANT FACT RULE
============================================================

ONLY treat the information above as confirmed Brew Haven
information.

NEVER invent:

- address
- phone number
- delivery time
- ingredients
- calories
- discounts
- offers
- stock
- preparation time
- refund policy
- reservation policy
- opening hours different from those listed above
- prices different from those listed above

If information is not available, clearly say that the
information is not currently available.

============================================================
`;


// ============================================================
// SYSTEM PROMPT
// ============================================================

const SYSTEM_PROMPT = `
You are "Bru", the intelligent virtual barista and customer
assistant for Brew Haven.

============================================================
MOST IMPORTANT RULE
============================================================

YOU ARE NOT A GENERAL-PURPOSE AI ASSISTANT.

You are ONLY a Brew Haven cafe assistant.

Your job is to help customers with:

- Brew Haven
- coffee
- cafe drinks
- food available at Brew Haven
- menu
- prices
- best sellers
- coffee recommendations
- food recommendations
- opening hours
- closing hours
- delivery
- delivery time
- payment methods
- milk options
- sugar options
- hot or iced drinks
- loyalty program
- WiFi
- seating
- pet-friendly area
- allergies related to Brew Haven
- coffee comparisons
- cafe-related questions


============================================================
STRICT OFF-TOPIC RULE
============================================================

If the customer asks about something unrelated to Brew Haven,
coffee, cafe drinks, food, ordering, delivery, menu,
or cafe services:

DO NOT answer that question.

DO NOT explain it.

DO NOT partially answer it.

DO NOT provide general knowledge.

DO NOT solve it.

DO NOT give advice about it.

Instead reply with a short redirect in the SAME LANGUAGE
the customer used.

English:

"I'm Bru, Brew Haven's virtual barista. I can help with our
coffee, menu, prices, opening hours, delivery, and
recommendations. ☕"

Gujarati:

"હું Bru, Brew Haven નો virtual barista છું. હું તમને અમારા
coffee, menu, prices, opening hours, delivery અને
recommendations વિશે મદદ કરી શકું છું. ☕"

Hindi:

"मैं Bru, Brew Haven का virtual barista हूँ। मैं आपको हमारे
coffee, menu, prices, opening hours, delivery और
recommendations के बारे में मदद कर सकता हूँ। ☕"


============================================================
LANGUAGE RULE — EXTREMELY IMPORTANT
============================================================

ALWAYS answer in the SAME LANGUAGE used by the customer.

Examples:

Customer writes in English:
Answer in English.

Customer writes in Gujarati:
Answer in Gujarati.

Customer writes in Hindi:
Answer in Hindi.

Customer writes in Hinglish:
Answer in natural Hinglish.

Customer writes Gujarati using English letters:
Answer in Gujarati script when the meaning is clearly Gujarati.

Example:

Customer:
"coffee ketla ni che?"

Answer:
"Coffeeના ભાવ ₹99 થી શરૂ થાય છે. Espresso અને Filter Kaapi
₹99 છે."

Customer:
"best coffee kai che?"

Answer:
"જો તમને classic અને creamy coffee જોઈએ તો Cappuccino ₹149
મારી recommendation છે."

Customer:
"what is your best coffee?"

Answer:
"If you want a classic and creamy option, I'd recommend the
Cappuccino at ₹149."

Customer:
"delivery ketla time ma aavshe?"

Answer:
"Delivery available છે, પરંતુ Brew Haven નો exact delivery
time અહીં listed નથી. તે delivery partner અને current order
volume પર depend કરી શકે છે."


============================================================
DO NOT FORCE ENGLISH
============================================================

Never automatically answer every customer in English.

Match the customer's language.

Do not translate their question.

Do not say:
"I will answer in English."

Just answer naturally.


============================================================
LANGUAGE DETECTION
============================================================

Understand:

English

Gujarati

Gujarati written in English letters

Hindi

Hindi written in English letters

Hinglish

Mixed Gujarati-English

Mixed Hindi-English


============================================================
CONVERSATION MEMORY
============================================================

Use previous messages.

Example:

User:
"What is your best seller?"

Assistant:
"Cappuccino is one of our best sellers at ₹149."

User:
"Is it sweet?"

Understand that "it" means Cappuccino.

Do not unnecessarily ask:
"What are you referring to?"

Use conversation context whenever the reference is obvious.


============================================================
RECOMMENDATIONS
============================================================

Strong coffee:
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

Budget:
Espresso ₹99
Filter Kaapi ₹99

Chocolate:
Mocha ₹179
Hot Chocolate ₹149

Classic:
Cappuccino ₹149

Only recommend 1-2 items unless customer asks for more.


============================================================
DELIVERY
============================================================

Delivery is available.

Exact delivery time is NOT available.

NEVER invent:

20 minutes
30 minutes
45 minutes
1 hour

or any other delivery estimate.

If customer asks delivery time, clearly explain that the exact
time is unavailable and depends on delivery partner/current
order volume.


============================================================
OPENING HOURS
============================================================

Monday-Friday:
8:00 AM - 9:00 PM

Saturday-Sunday:
9:00 AM - 10:00 PM

Public Holidays:
10:00 AM - 6:00 PM


============================================================
PRICE ACCURACY
============================================================

Always use exact prices from BUSINESS INFORMATION.

Never invent a price.

If an item is not listed:
Say that its price is currently unavailable.


============================================================
MISSING INFORMATION
============================================================

If Brew Haven information is not available:

Do not guess.

Say:
"I don't have that Brew Haven information right now. Please
check with Brew Haven staff."


============================================================
ANSWER LENGTH
============================================================

Keep answers concise.

Simple question:
1-3 sentences.

Menu question:
Use bullets.

Recommendation:
1-2 recommendations with prices.

Do not write huge paragraphs.


============================================================
TONE
============================================================

Friendly.

Natural.

Professional.

Helpful.

Confident.

Do not sound robotic.

Do not repeatedly start with:

"Great question!"

"Sure!"

"Absolutely!"

Use at most ONE emoji.


============================================================
EXAMPLES OF QUESTIONS TO REFUSE
============================================================

"What is AI?"

"What is Python?"

"What is Java?"

"Who is Narendra Modi?"

"Who is Elon Musk?"

"What happened in the news?"

"Tell me a joke."

"Write a poem."

"Solve this maths problem."

"Help me write code."

"What is Bitcoin?"

"What is blockchain?"

"What is cricket?"

"Who won the match?"

For all of these:
DO NOT answer the question.

Redirect to Brew Haven.

============================================================
FINAL RULE
============================================================

Stay focused on Brew Haven.

You are Bru.

You are a cafe assistant.

You are NOT a general AI assistant.

Never invent Brew Haven information.

============================================================

${BUSINESS_INFO}
`.trim();


// ============================================================
// CORS
// ============================================================

function setupCors(req, res) {

  const origin =
    req.headers.origin;

  if (
    origin &&
    ALLOWED_ORIGINS.includes(origin)
  ) {

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
// CLEAN TEXT
// ============================================================

function cleanText(value) {

  if (
    typeof value !== 'string'
  ) {
    return '';
  }

  return value
    .replace(/\u0000/g, '')
    .trim();
}


// ============================================================
// SLEEP
// ============================================================

function sleep(ms) {

  return new Promise(
    (resolve) =>
      setTimeout(resolve, ms)
  );
}


// ============================================================
// GET GROQ MODELS
// ============================================================

async function getAvailableModels(apiKey) {

  try {

    const response =
      await fetch(
        GROQ_MODELS_URL,
        {
          method: 'GET',

          headers: {
            Authorization:
              `Bearer ${apiKey}`,

            'Content-Type':
              'application/json',
          },
        }
      );


    const text =
      await response.text();


    let data = null;

    try {
      data =
        JSON.parse(text);
    } catch {
      data = null;
    }


    if (!response.ok) {

      console.error(
        '[BREW HAVEN] Groq models error:',
        response.status,
        data || text
      );

      return [];
    }


    if (
      !Array.isArray(
        data?.data
      )
    ) {
      return [];
    }


    return data.data
      .filter(
        (model) =>
          model &&
          model.id &&
          model.active !== false
      )
      .map(
        (model) =>
          model.id
      );

  } catch (error) {

    console.error(
      '[BREW HAVEN] Model list error:',
      error
    );

    return [];
  }
}


// ============================================================
// SELECT MODEL
// ============================================================

function selectModel(
  availableModels
) {

  for (
    const preferred of PREFERRED_MODELS
  ) {

    if (
      availableModels.includes(
        preferred
      )
    ) {

      return preferred;
    }
  }

  return null;
}


// ============================================================
// GROQ REQUEST
// ============================================================

async function callGroq({
  apiKey,
  model,
  messages,
}) {

  const controller =
    new AbortController();


  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      15000
    );


  try {

    const response =
      await fetch(
        GROQ_API_URL,
        {

          method:
            'POST',

          headers: {

            'Content-Type':
              'application/json',

            Authorization:
              `Bearer ${apiKey}`,

          },

          body:
            JSON.stringify({

              model,

              messages,

              temperature:
                0.35,

              max_tokens:
                350,

              top_p:
                0.9,

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
        JSON.parse(
          rawText
        );

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

      retryAfter:
        response.headers.get(
          'retry-after'
        ),

    };

  } catch (error) {

    if (
      error?.name ===
      'AbortError'
    ) {

      return {

        ok:
          false,

        status:
          408,

        data:
          null,

        rawText:
          'Groq request timed out.',

        timeout:
          true,

      };
    }


    return {

      ok:
        false,

      status:
        500,

      data:
        null,

      rawText:
        error?.message ||
        'Network error',

      networkError:
        true,

    };

  } finally {

    clearTimeout(
      timeout
    );

  }
}


// ============================================================
// GROQ ERROR
// ============================================================

function getGroqErrorMessage(
  result
) {

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

function getDirectBusinessAnswer(
  message
) {

  const text =
    cleanText(message)
      .toLowerCase();


  // ==========================================================
  // DELIVERY TIME
  // ==========================================================

  const deliveryTimePatterns = [

    'delivery time',
    'delivary time',

    'delivery ketla',
    'delivary ketla',

    'delivery ketla time',
    'delivary ketla time',

    'ketla time ma delivery',
    'ketlo time delivery',

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

  ];


  if (
    deliveryTimePatterns.some(
      (pattern) =>
        text.includes(pattern)
    )
  ) {

    return (
      "Delivery is available, but Brew Haven's exact delivery " +
      "time isn't listed here. It can depend on the delivery " +
      "partner and current order volume. Please check the " +
      "delivery app for the live estimated time."
    );
  }


  // ==========================================================
  // DELIVERY AVAILABLE
  // ==========================================================

  const deliveryPatterns = [

    'do you deliver',

    'delivery available',

    'delivery che',

    'delivery karo',

    'delivery aapo',

    'tame delivery',

    'deliver karo',

    'deliver che',

    'can you deliver',

  ];


  if (
    deliveryPatterns.some(
      (pattern) =>
        text.includes(pattern)
    )
  ) {

    return (
      "Yes, Brew Haven offers delivery through its delivery " +
      "partner. The exact delivery time depends on the " +
      "delivery partner and current order volume."
    );
  }


  // ==========================================================
  // PAYMENT
  // ==========================================================

  if (
    text.includes('payment') ||
    text.includes('upi') ||
    text.includes('cash') ||
    text.includes('card') ||
    text.includes('wallet')
  ) {

    return (
      "Brew Haven accepts cash, major cards, UPI, and popular " +
      "digital wallets."
    );
  }


  // ==========================================================
  // WIFI
  // ==========================================================

  if (
    text.includes('wifi') ||
    text.includes('wi-fi')
  ) {

    return (
      "Yes — Brew Haven has free WiFi for customers."
    );
  }


  // ==========================================================
  // PET
  // ==========================================================

  if (
    text.includes('pet') ||
    text.includes('dog') ||
    text.includes('cat')
  ) {

    return (
      "Yes. Brew Haven has a pet-friendly outdoor seating area."
    );
  }


  // ==========================================================
  // BEST SELLER
  // ==========================================================

  if (
    text.includes('best seller') ||
    text.includes('bestseller') ||
    text.includes('most popular') ||
    text.includes('popular coffee') ||
    text.includes('best coffee') ||
    text.includes('best drink') ||
    text.includes('best coffee su') ||
    text.includes('best seller su')
  ) {

    return (
      "Our best sellers are Cappuccino ₹149, Cold Brew ₹159, " +
      "Filter Kaapi ₹99, and Banana Bread ₹109. If you want " +
      "a coffee, I'd recommend the Cappuccino."
    );
  }


  // ==========================================================
  // LOYALTY
  // ==========================================================

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


  // ==========================================================
  // MILK
  // ==========================================================

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


  // ==========================================================
  // SUGAR
  // ==========================================================

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


  // ==========================================================
  // COLD
  // ==========================================================

  if (
    text.includes('cold coffee') ||
    text.includes('iced coffee') ||
    text.includes('something cold') ||
    text.includes('coffee cold')
  ) {

    return (
      "For something cold, I'd recommend Cold Brew ₹159 " +
      "or Iced Latte ₹169."
    );
  }


  // ==========================================================
  // STRONG
  // ==========================================================

  if (
    text.includes('strong coffee') ||
    text.includes('strongest coffee') ||
    text.includes('something strong') ||
    text.includes('strong coffee joiye') ||
    text === 'strong'
  ) {

    return (
      "If you want something strong, go for Espresso ₹99 " +
      "or Americano ₹129. I'd pick the Americano if you want " +
      "a longer drink."
    );
  }


  // ==========================================================
  // CHEAP
  // ==========================================================

  if (
    text.includes('cheap coffee') ||
    text.includes('cheapest coffee') ||
    text.includes('budget coffee') ||
    text.includes('cheap coffee joiye') ||
    text === 'cheap'
  ) {

    return (
      "The most affordable coffees are Espresso ₹99 and " +
      "Filter Kaapi ₹99."
    );
  }


  // ==========================================================
  // OPENING / CLOSING
  // ==========================================================

  if (
    text.includes('opening hours') ||
    text.includes('opening time') ||
    text.includes('closing time') ||
    text.includes('what time') ||
    text.includes('when do you close') ||
    text.includes('when does it close') ||
    text.includes('open today') ||
    text.includes('shop kyare') ||
    text.includes('bandh thay') ||
    text.includes('kyare open') ||
    text.includes('kyare bandh')
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

function buildHistory(
  history
) {

  if (
    !Array.isArray(history)
  ) {
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

        content:
          cleanText(content)
            .slice(0, 1000),

      };

    })

    .filter(
      (item) =>
        item.content.length > 0
    );
}


// ============================================================
// VERY OBVIOUS OFF-TOPIC GUARD
// ============================================================
//
// This is NOT the main intelligence layer.
// It only blocks clearly unrelated requests.
// Ambiguous/natural cafe requests are allowed to reach AI.
// ============================================================

function isObviouslyOffTopic(
  message
) {

  const text =
    cleanText(message)
      .toLowerCase();


  const offTopicPatterns = [

    // Programming
    'write code',
    'write a code',
    'coding',
    'javascript',
    'typescript',
    'python',
    'java programming',
    'c++',
    'flutter code',
    'react code',
    'html code',
    'css code',

    // General technology
    'what is ai',
    'what is artificial intelligence',
    'what is blockchain',
    'what is bitcoin',
    'what is cryptocurrency',

    // Politics
    'narendra modi',
    'donald trump',
    'politics',
    'politician',

    // Sports
    'cricket match',
    'football match',
    'ipl score',
    'who won the match',
    'sports news',

    // News
    'latest news',
    'today news',
    'breaking news',

    // Creative requests
    'write a poem',
    'write a story',
    'tell me a joke',
    'make me laugh',

  ];


  return offTopicPatterns.some(
    (pattern) =>
      text.includes(pattern)
  );
}


// ============================================================
// LANGUAGE FALLBACK
// ============================================================

function getFallbackReply(
  message
) {

  const text =
    cleanText(message);


  // Gujarati script

  if (
    /[\u0A80-\u0AFF]/.test(text)
  ) {

    return (
      "હું Bru, Brew Haven નો virtual barista છું. " +
      "હું તમને અમારા coffee, menu, prices, opening hours, " +
      "delivery અને recommendations વિશે મદદ કરી શકું છું. ☕"
    );
  }


  // Hindi / Devanagari

  if (
    /[\u0900-\u097F]/.test(text)
  ) {

    return (
      "मैं Bru, Brew Haven का virtual barista हूँ। " +
      "मैं आपको हमारे coffee, menu, prices, opening hours, " +
      "delivery और recommendations के बारे में मदद कर सकता हूँ। ☕"
    );
  }


  // Default English

  return (
    "I'm Bru, Brew Haven's virtual barista. I can help with " +
    "our coffee, menu, prices, opening hours, delivery, and " +
    "recommendations. ☕"
  );
}


// ============================================================
// API HANDLER
// ============================================================

export default async function handler(
  req,
  res
) {

  setupCors(
    req,
    res
  );


  // ==========================================================
  // OPTIONS
  // ==========================================================

  if (
    req.method === 'OPTIONS'
  ) {

    return res
      .status(204)
      .end();
  }


  // ==========================================================
  // API KEY
  // ==========================================================

  const apiKey =
    process.env.GROQ_API_KEY;


  // ==========================================================
  // GET HEALTH CHECK
  // ==========================================================

  if (
    req.method === 'GET'
  ) {

    if (!apiKey) {

      return res
        .status(500)
        .json({

          ok: false,

          service:
            'Brew Haven AI',

          groqConfigured:
            false,

          message:
            'GROQ_API_KEY is missing.',

        });
    }


    const availableModels =
      await getAvailableModels(
        apiKey
      );


    const selectedModel =
      selectModel(
        availableModels
      );


    return res
      .status(200)
      .json({

        ok: true,

        service:
          'Brew Haven AI',

        groqConfigured:
          true,

        selectedModel,

        availablePreferredModels:
          PREFERRED_MODELS.filter(
            (model) =>
              availableModels.includes(
                model
              )
          ),

        message:
          selectedModel
            ? 'AI service is configured.'
            : 'No preferred Groq model is available.',

      });
  }


  // ==========================================================
  // ONLY POST
  // ==========================================================

  if (
    req.method !== 'POST'
  ) {

    return res
      .status(405)
      .json({

        error:
          'Method not allowed.',

      });
  }


  try {

    // ========================================================
    // API KEY CHECK
    // ========================================================

    if (!apiKey) {

      return res
        .status(500)
        .json({

          error:
            'The chatbot API key is not configured on Vercel.',

          code:
            'MISSING_API_KEY',

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
            'Please enter a message.',

          code:
            'EMPTY_MESSAGE',

        });
    }


    if (
      userMessage.length > 500
    ) {

      return res
        .status(400)
        .json({

          error:
            'Message is too long. Please keep it under 500 characters.',

          code:
            'MESSAGE_TOO_LONG',

        });
    }


    // ========================================================
    // DIRECT BUSINESS ANSWER
    // ========================================================

    const directAnswer =
      getDirectBusinessAnswer(
        userMessage
      );


    if (directAnswer) {

      console.log(
        '[BREW HAVEN] Direct business answer:',
        userMessage
      );


      return res
        .status(200)
        .json({

          reply:
            directAnswer,

          source:
            'business-data',

        });
    }


    // ========================================================
    // OBVIOUS OFF-TOPIC BLOCK
    // ========================================================

    if (
      isObviouslyOffTopic(
        userMessage
      )
    ) {

      console.log(
        '[BREW HAVEN] Off-topic request blocked:',
        userMessage
      );


      return res
        .status(200)
        .json({

          reply:
            getFallbackReply(
              userMessage
            ),

          source:
            'topic-filter',

        });
    }


    // ========================================================
    // GET AVAILABLE MODEL
    // ========================================================

    const availableModels =
      await getAvailableModels(
        apiKey
      );


    const model =
      selectModel(
        availableModels
      );


    if (!model) {

      console.error(
        '[BREW HAVEN] No compatible Groq model:',
        availableModels
      );


      return res
        .status(502)
        .json({

          error:
            'No compatible AI model is currently available.',

          code:
            'NO_MODEL_AVAILABLE',

        });
    }


    // ========================================================
    // BUILD MESSAGES
    // ========================================================

    const messages = [

      {
        role:
          'system',

        content:
          SYSTEM_PROMPT,

      },

      ...history,

      {
        role:
          'user',

        content:
          userMessage,

      },

    ];


    // ========================================================
    // GROQ REQUEST
    // ========================================================

    console.log(
      '[BREW HAVEN] Calling Groq:',
      model
    );


    let result =
      await callGroq({

        apiKey,

        model,

        messages,

      });


    // ========================================================
    // SUCCESS
    // ========================================================

    if (
      result.ok
    ) {

      const reply =
        result?.data
          ?.choices?.[0]
          ?.message?.content;


      if (
        reply &&
        reply.trim()
      ) {

        console.log(
          '[BREW HAVEN] Groq success.'
        );


        return res
          .status(200)
          .json({

            reply:
              reply.trim(),

            source:
              'groq',

            model,

          });
      }
    }


    // ========================================================
    // LOG ERROR
    // ========================================================

    console.error(
      '[BREW HAVEN] Groq request failed:',
      {

        model,

        status:
          result.status,

        error:
          getGroqErrorMessage(
            result
          ),

        timeout:
          result.timeout ||
          false,

        networkError:
          result.networkError ||
          false,

      }
    );


    // ========================================================
    // RETRY
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

      let waitTime =
        700;


      const retryAfter =
        Number(
          result.retryAfter
        );


      if (
        Number.isFinite(
          retryAfter
        ) &&
        retryAfter > 0 &&
        retryAfter < 5
      ) {

        waitTime =
          retryAfter * 1000;
      }


      await sleep(
        waitTime
      );


      result =
        await callGroq({

          apiKey,

          model,

          messages,

        });


      if (
        result.ok
      ) {

        const retryReply =
          result?.data
            ?.choices?.[0]
            ?.message?.content;


        if (
          retryReply &&
          retryReply.trim()
        ) {

          return res
            .status(200)
            .json({

              reply:
                retryReply.trim(),

              source:
                'groq-retry',

              model,

            });
        }
      }


      console.error(
        '[BREW HAVEN] Groq retry failed:',
        {

          model,

          status:
            result.status,

          error:
            getGroqErrorMessage(
              result
            ),

        }
      );
    }


    // ========================================================
    // ERROR RESPONSE
    // ========================================================

    let errorMessage =
      'The AI service is temporarily unavailable. Please try again in a moment.';


    if (
      result.status === 401
    ) {

      errorMessage =
        'The AI service authentication is invalid.';

    }
    else if (
      result.status === 403
    ) {

      errorMessage =
        'The AI service access was denied.';

    }
    else if (
      result.status === 429
    ) {

      errorMessage =
        'The AI service is temporarily busy. Please try again in a few seconds.';

    }
    else if (
      result.status === 400
    ) {

      errorMessage =
        'The AI request was rejected. Please try asking differently.';

    }
    else if (
      result.status === 404
    ) {

      errorMessage =
        'The selected AI model is currently unavailable.';

    }


    return res
      .status(502)
      .json({

        error:
          errorMessage,

        code:
          'GROQ_REQUEST_FAILED',

        providerStatus:
          result.status,

      });


  } catch (error) {

    console.error(
      '[BREW HAVEN] UNHANDLED ERROR:',
      error
    );


    return res
      .status(500)
      .json({

        error:
          'The chatbot server encountered an unexpected error.',

        code:
          'INTERNAL_SERVER_ERROR',

      });
  }
}