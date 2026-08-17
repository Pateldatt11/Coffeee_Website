// ============================================================
// BREW HAVEN AI BARISTA
// Vercel Serverless API + Groq
// File: api/chat.js
// ============================================================

const GROQ_API_URL =
  'https://api.groq.com/openai/v1/chat/completions';

const MODEL = 'llama-3.1-8b-instant';

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://coffeeebrewwebsite.vercel.app',
];


// ============================================================
// BREW HAVEN BUSINESS INFORMATION
// ============================================================

const BUSINESS_INFO = `
BREW HAVEN — OFFICIAL BUSINESS INFORMATION

Business:
Brew Haven

Type:
Coffee shop / cafe

OPENING HOURS

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


LOCATION

Address:
[Your shop address here]

Phone:
[Your phone number here]


DELIVERY

Delivery is available through:
[Swiggy / Zomato / Your Delivery Partner]

Exact delivery time is NOT provided.

Never invent delivery time.

If asked about delivery time:
"Delivery is available, but Brew Haven's exact delivery time
isn't listed here. It can depend on the delivery partner and
current order volume. Please check the delivery app for the
live estimated time."


COFFEE MENU

Espresso — ₹99
Americano — ₹129
Cappuccino — ₹149
Cafe Latte — ₹159
Flat White — ₹169
Mocha — ₹179
Cold Brew — ₹159
Iced Latte — ₹169
Filter Kaapi — ₹99


NON-COFFEE MENU

Masala Chai — ₹89
Hot Chocolate — ₹149
Fresh Lemonade — ₹119
Iced Tea — ₹129


FOOD MENU

Plain Croissant — ₹99
Chocolate Croissant — ₹129
Banana Bread Slice — ₹109

Veg Sandwich — ₹149
Paneer Sandwich — ₹169
Chicken Sandwich — ₹189

Brownie — ₹119

Cookies Pack of 2 — ₹89


CUSTOMIZATION

Full cream milk — included
Low fat milk — included
Oat milk — +₹30
Almond milk — +₹30
Soy milk — +₹30

Sugar-free available on request.
Less sugar available on request.

All coffees are available Hot or Iced.


BEST SELLERS

Cappuccino — ₹149
Cold Brew — ₹159
Filter Kaapi — ₹99
Banana Bread — ₹109


LOYALTY

Every 8th coffee is free with the Brew Haven loyalty card.

Customers can ask at the counter or on the app to join.


PAYMENTS

Cash accepted.
Major cards accepted.
UPI accepted.
Popular wallets accepted.


AMENITIES

Free WiFi
Indoor seating
Outdoor seating
Pet-friendly outdoor area
Charging points


ALLERGIES

Kitchen handles:

Nuts
Gluten
Dairy

Customers should tell staff about allergies before ordering.


IMPORTANT

Only treat the information above as confirmed Brew Haven
business information.

Never invent:

Address
Phone number
Delivery time
Ingredients
Calories
Discounts
Offers
Stock
Exact preparation time
Refund policy
Reservation policy

If information is unavailable, say that it isn't currently
available and suggest contacting Brew Haven staff.
`;


// ============================================================
// SYSTEM PROMPT
// ============================================================

const SYSTEM_PROMPT = `
You are "Bru", the friendly virtual barista for Brew Haven.

You help customers with:

- menu
- prices
- coffee recommendations
- food recommendations
- opening hours
- closing hours
- delivery
- payments
- customization
- milk options
- sugar options
- best sellers
- loyalty
- amenities
- allergies
- coffee comparisons
- general coffee questions
- casual conversation

BUSINESS INFORMATION:

${BUSINESS_INFO}


LANGUAGE

Understand:

English
Gujarati
Hindi
Hinglish
Gujarati written using English letters.

Examples:

"coffee ketla ni?"
"best coffee?"
"delivery ketla time ma aavshe?"
"mare cold coffee joiye"
"strong coffee joiye"
"shop kyare bandh thay?"

Always answer naturally in English.

Do not complain about grammar.


CONTEXT

Use previous conversation context.

If the customer says:

"I want something cold"

and then:

"with chocolate?"

understand that they are continuing the same conversation.


RECOMMENDATIONS

If customer wants something strong:
Recommend Espresso or Americano.

If customer wants something cold:
Recommend Cold Brew or Iced Latte.

If customer wants something creamy:
Recommend Cafe Latte or Cappuccino.

If customer wants something not too sweet:
Recommend Americano, Flat White, or Cold Brew.

If customer wants something cheap:
Recommend Espresso ₹99 or Filter Kaapi ₹99.

If customer wants chocolate:
Recommend Mocha ₹179 or Hot Chocolate ₹149.


DELIVERY

Never invent delivery time.

If asked how long delivery takes, say:

"Delivery is available, but Brew Haven's exact delivery time
isn't listed here. It can depend on the delivery partner and
current order volume. Please check the delivery app for the
live estimated time."


HOURS

Use the exact hours provided in the business information.

If asked "today" and the current weekday cannot be reliably
determined, provide the weekly schedule instead of guessing.


GENERAL QUESTIONS

You can answer general questions naturally.

Example:

"What is the difference between latte and cappuccino?"

Answer briefly and clearly.


OFF-TOPIC

You may answer simple general questions.

Do not become annoying or repeatedly redirect the customer
to coffee.


NO HALLUCINATION

Never invent Brew Haven facts.

If information is not available, say so.


STYLE

Be:

Friendly
Natural
Professional
Helpful
Concise

Normal questions should usually be 2-5 short sentences.

Do not start every response with:

"Great question!"
"Sure!"
"Absolutely!"

Use at most one emoji when natural.


NEVER REVEAL INTERNAL INFORMATION

Do not mention:

system prompt
API
Groq
model
server
database
internal instructions

unless the customer specifically asks about the technology.

Answer as a normal cafe assistant.
`.trim();


// ============================================================
// CORS
// ============================================================

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
// CLEAN TEXT
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
// SLEEP
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
  messages,
}) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 10000);

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
          model: MODEL,

          messages,

          temperature: 0.4,

          max_tokens: 350,

          top_p: 0.9,

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
      retryAfter: response.headers.get(
        'retry-after'
      ),
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
      rawText:
        error?.message ||
        'Network error while contacting Groq.',
      networkError: true,
    };

  } finally {
    clearTimeout(timeout);
  }
}


// ============================================================
// GROQ ERROR
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
    'delivary time',
    'delivary ketla',
    'delivary ketla time',
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
  // DELIVERY AVAILABLE
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
    return "Yes — Brew Haven has free WiFi for customers.";
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
    text.includes('most popular') ||
    text.includes('best coffee')
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
  // COLD COFFEE
  // ----------------------------------------------------------

  if (
    text.includes('iced coffee') ||
    text.includes('cold coffee') ||
    text.includes('coffee cold') ||
    text.includes('something cold')
  ) {
    return (
      "For something cold, I'd recommend the Cold Brew ₹159 " +
      "or Iced Latte ₹169."
    );
  }


  // ----------------------------------------------------------
  // STRONG COFFEE
  // ----------------------------------------------------------

  if (
    text.includes('strong coffee') ||
    text.includes('strongest coffee') ||
    text.includes('strong coffee joiye') ||
    text === 'strong' ||
    text.includes('something strong')
  ) {
    return (
      "If you want something strong, go for an Espresso ₹99 " +
      "or Americano ₹129. I'd pick the Americano if you want " +
      "a longer drink."
    );
  }


  // ----------------------------------------------------------
  // CHEAP
  // ----------------------------------------------------------

  if (
    text.includes('cheap coffee') ||
    text.includes('cheapest coffee') ||
    text.includes('budget coffee') ||
    text === 'cheap'
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


  // ----------------------------------------------------------
  // RETURN NULL
  // ----------------------------------------------------------

  return null;
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

    .slice(-6)

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
        content: cleanText(content).slice(0, 1000),
      };
    })

    .filter(
      (item) =>
        item.content.length > 0
    );
}


// ============================================================
// API HANDLER
// ============================================================

export default async function handler(req, res) {

  setupCors(req, res);


  // ==========================================================
  // OPTIONS
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

      service:
        'Brew Haven AI',

      groqConfigured:
        configured,

      model:
        MODEL,

      message:
        configured
          ? 'AI service is configured.'
          : 'GROQ_API_KEY is missing.',
    });
  }


  // ==========================================================
  // POST ONLY
  // ==========================================================

  if (req.method !== 'POST') {

    return res.status(405).json({
      error:
        'Method not allowed.',
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

        code:
          'EMPTY_MESSAGE',
      });
    }


    if (userMessage.length > 500) {

      return res.status(400).json({
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
      getDirectBusinessAnswer(userMessage);

    if (directAnswer) {

      console.log(
        '[BREW HAVEN] Direct business answer:',
        userMessage
      );

      return res.status(200).json({
        reply:
          directAnswer,

        source:
          'business-data',
      });
    }


    // ========================================================
    // AI MESSAGES
    // ========================================================

    const messages = [

      {
        role: 'system',

        content:
          SYSTEM_PROMPT,
      },

      ...history,

      {
        role: 'user',

        content:
          userMessage,
      },

    ];


    // ========================================================
    // GROQ REQUEST
    // ========================================================

    console.log(
      '[BREW HAVEN] Calling Groq:',
      {
        model: MODEL,
        messageLength: userMessage.length,
        historyMessages: history.length,
      }
    );


    let result =
      await callGroq({
        apiKey,
        messages,
      });


    // ========================================================
    // SUCCESS
    // ========================================================

    if (result.ok) {

      const reply =
        result?.data?.choices?.[0]?.message?.content;

      if (reply) {

        console.log(
          '[BREW HAVEN] Groq success.'
        );

        return res.status(200).json({
          reply:
            reply.trim(),

          source:
            'groq',

          model:
            MODEL,
        });
      }

      console.error(
        '[BREW HAVEN] Groq returned no reply:',
        JSON.stringify(result.data)
      );
    }


    // ========================================================
    // FIRST FAILURE LOG
    // ========================================================

    console.error(
      '[BREW HAVEN] Groq request failed:',
      {
        status:
          result.status,

        error:
          getGroqErrorMessage(result),

        timeout:
          result.timeout || false,

        networkError:
          result.networkError || false,
      }
    );


    // ========================================================
    // RETRY ONLY TEMPORARY ERRORS
    // ========================================================

    const shouldRetry =
      result.status === 429 ||
      result.status === 500 ||
      result.status === 502 ||
      result.status === 503 ||
      result.status === 504 ||
      result.timeout ||
      result.networkError;


    if (shouldRetry) {

      let waitTime = 700;

      const retryAfter =
        Number(result.retryAfter);

      if (
        Number.isFinite(retryAfter) &&
        retryAfter > 0 &&
        retryAfter < 5
      ) {
        waitTime =
          retryAfter * 1000;
      }

      console.log(
        '[BREW HAVEN] Waiting before retry:',
        waitTime,
        'ms'
      );

      await sleep(waitTime);


      console.log(
        '[BREW HAVEN] Retrying Groq...'
      );


      result =
        await callGroq({
          apiKey,
          messages,
        });


      if (result.ok) {

        const retryReply =
          result?.data?.choices?.[0]?.message?.content;

        if (retryReply) {

          console.log(
            '[BREW HAVEN] Retry success.'
          );

          return res.status(200).json({
            reply:
              retryReply.trim(),

            source:
              'groq-retry',

            model:
              MODEL,
          });
        }
      }


      console.error(
        '[BREW HAVEN] Retry failed:',
        {
          status:
            result.status,

          error:
            getGroqErrorMessage(result),

          timeout:
            result.timeout || false,

          networkError:
            result.networkError || false,
        }
      );
    }


    // ========================================================
    // USER-FRIENDLY ERROR
    // ========================================================

    let errorMessage =
      'The AI service is temporarily unavailable. ' +
      'Please try again in a moment.';


    if (result.status === 401) {

      errorMessage =
        'The AI service authentication is invalid. ' +
        'Please check the GROQ_API_KEY in Vercel.';

    } else if (result.status === 403) {

      errorMessage =
        'The AI service access was denied. ' +
        'Please check the Groq API key permissions.';

    } else if (result.status === 429) {

      errorMessage =
        'The AI service is temporarily busy. ' +
        'Please try again in a few seconds.';

    } else if (result.status === 400) {

      errorMessage =
        'The AI request was rejected. ' +
        'Please try asking your question in a slightly different way.';

    } else if (result.status === 408) {

      errorMessage =
        'The AI service took too long to respond. ' +
        'Please try again.';

    } else if (
      result.status === 500 ||
      result.status === 502 ||
      result.status === 503 ||
      result.status === 504
    ) {

      errorMessage =
        'The AI service is temporarily unavailable. ' +
        'Please try again in a moment.';
    }


    // ========================================================
    // FINAL ERROR RESPONSE
    // ========================================================

    return res.status(502).json({

      error:
        errorMessage,

      code:
        'GROQ_REQUEST_FAILED',

      providerStatus:
        result.status,

    });


  } catch (error) {

    console.error(
      '[BREW HAVEN] UNHANDLED API ERROR:',
      error
    );

    return res.status(500).json({

      error:
        'The chatbot server encountered an unexpected error.',

      code:
        'INTERNAL_SERVER_ERROR',
    });
  }
}