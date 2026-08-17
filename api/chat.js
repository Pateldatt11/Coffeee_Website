// api/chat.js

// =========================================================
// BREW HAVEN KNOWLEDGE BASE
// =========================================================
// EDIT THIS with your real shop details. This is what the
// bot actually knows — it will answer FROM here, not guess.
// Keeping this accurate = satisfying, correct answers for
// the most common questions customers ask a coffee shop.
// =========================================================

const BUSINESS_INFO = `
SHOP: Brew Haven

HOURS:
- Mon–Fri: 8:00 AM – 9:00 PM
- Sat–Sun: 9:00 AM – 10:00 PM
- Open on public holidays with reduced hours (10 AM – 6 PM)

LOCATION & CONTACT:
- Address: [Your shop address here]
- Phone: [Your phone number here]
- We offer dine-in, takeaway, and delivery via [Swiggy/Zomato/your delivery partner]

MENU — COFFEE:
- Espresso — ₹99
- Americano — ₹129
- Cappuccino — ₹149
- Cafe Latte — ₹159
- Flat White — ₹169
- Mocha — ₹179
- Cold Brew — ₹159
- Iced Latte — ₹169
- Filter Kaapi (South Indian style) — ₹99

MENU — NON-COFFEE:
- Masala Chai — ₹89
- Hot Chocolate — ₹149
- Fresh Lemonade — ₹119
- Iced Tea — ₹129

MENU — FOOD:
- Croissant (plain / chocolate) — ₹99 / ₹129
- Banana Bread slice — ₹109
- Sandwich (veg / paneer / chicken) — ₹149 / ₹169 / ₹189
- Brownie — ₹119
- Cookies (pack of 2) — ₹89

CUSTOMIZATION:
- Milk options: full cream, low fat, oat milk (+₹30), almond milk (+₹30), soy milk (+₹30)
- Sugar-free / less sugar available on request
- All coffees available Hot or Iced

BEST SELLERS: Cappuccino, Cold Brew, Filter Kaapi, Banana Bread

LOYALTY PROGRAM:
- Every 8th coffee free with Brew Haven loyalty card
- Ask at the counter or on the app to join

PAYMENTS: Cash, all major cards, UPI, and popular wallets accepted

AMENITIES: Free WiFi, indoor + outdoor seating, pet-friendly outdoor area, charging points

ALLERGEN NOTE: Our kitchen handles nuts, gluten, and dairy — please tell staff about any allergy before ordering
`.trim();


// =========================================================
// HANDLER
// =========================================================

export default async function handler(req, res) {
  // =====================================================
  // CORS
  // =====================================================

  const allowedOrigins = [
    'http://localhost:5173',
    'https://coffeeebrewwebsite.vercel.app',
  ];

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');


  // =====================================================
  // OPTIONS / PREFLIGHT
  // =====================================================

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }


  // =====================================================
  // ONLY POST
  // =====================================================

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }


  try {

    // ===================================================
    // GET USER MESSAGE + HISTORY
    // ===================================================

    const userMessage = req.body?.message;
    const history = Array.isArray(req.body?.history)
      ? req.body.history
      : [];


    if (!userMessage || typeof userMessage !== 'string') {
      return res.status(400).json({
        error: 'A message string is required.',
      });
    }


    // ===================================================
    // MESSAGE LENGTH
    // ===================================================

    if (userMessage.length > 500) {
      return res.status(400).json({
        error: 'Message too long.',
      });
    }


    // ===================================================
    // GROQ API KEY
    // ===================================================

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      console.error('GROQ_API_KEY is not configured.');
      return res.status(500).json({
        error: 'Groq API key is not configured on Vercel.',
      });
    }


    // ===================================================
    // SYSTEM PROMPT
    // ===================================================
    // This is the actual lever that improves answer quality.
    // A model can't "learn" from chats, but it responds much
    // better when told EXACTLY how to format, when to ask a
    // follow-up, and when to proactively suggest something —
    // instead of just "answer questions."
    // ===================================================

    const systemPrompt = `
You are Bru, the in-house virtual barista for Brew Haven, a coffee shop.

KNOWLEDGE YOU HAVE (this is real, current shop information — use it
to answer directly and specifically, including exact prices and times
when relevant):

${BUSINESS_INFO}

HOW TO ANSWER — READ THIS CAREFULLY:

1. BE SPECIFIC, NEVER VAGUE.
   - Bad: "We have several coffee options."
   - Good: "Cappuccino is ₹149, Cold Brew is ₹159 — Cappuccino's our best seller."
   - Always give the real price, real time, or real item name from the
     knowledge above. A vague answer is a failed answer.

2. FORMAT MENU / MULTI-ITEM ANSWERS AS A SHORT LIST.
   - If a customer asks for the menu, prices, or "what do you have",
     use short line breaks or a dash-separated list, not one long
     paragraph. Easy to scan on a phone screen.

3. ALWAYS END WITH ONE SMALL NEXT STEP WHEN IT MAKES SENSE.
   - After answering, if natural, add ONE short suggestion or question —
     e.g. "Want me to recommend something cold?" or "Should I suggest a
     pairing snack?" This makes the chat feel helpful, not just a lookup.
   - Skip this if the customer's question was already fully closed
     (e.g. "what time do you close" doesn't need a follow-up).

4. USE PREFERENCES TO RECOMMEND, DON'T JUST LIST EVERYTHING.
   - If a customer says things like "something strong", "not too sweet",
     "cold", "cheap", or "quick" — narrow it down to 1–2 specific picks
     from the menu, not the whole list.

5. IF INFORMATION IS MISSING FROM THE KNOWLEDGE ABOVE:
   - Say so honestly in one short sentence, and point them to staff or
     a phone call. NEVER invent a price, ingredient, or policy that
     isn't listed above — a wrong price is worse than no answer.

6. IF THE QUESTION IS UNRELATED TO THE SHOP:
   - Give one short, warm sentence acknowledging it, then steer back
     to coffee/menu/hours. Don't lecture the customer.

LANGUAGE RULE:
- Always reply in English only, regardless of what language the
  customer writes in. Keep it natural, friendly English — not stiff
  or overly formal, like a real person at the counter would text.

STYLE:
- Warm, concise, confident. 2–4 short sentences unless the customer
  clearly wants more detail (e.g. asked for the full menu).
- At most one relevant emoji, only when it genuinely fits — don't
  force one into every reply.
- Never start every message the same way (e.g. don't always open with
  "Great question!" or "Sure!"). Vary the opening naturally.
    `.trim();


    // ===================================================
    // BUILD MESSAGE LIST (with light recent history)
    // ===================================================

    const trimmedHistory = history
      .filter(
        (item) =>
          item &&
          typeof item.text === 'string' &&
          (item.role === 'user' || item.role === 'bot')
      )
      .slice(-6)
      .map((item) => ({
        role: item.role === 'bot' ? 'assistant' : 'user',
        content: item.text,
      }));


    // ===================================================
    // GROQ API REQUEST
    // ===================================================

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            ...trimmedHistory,
            { role: 'user', content: userMessage },
          ],
          temperature: 0.65,
          max_tokens: 320,
        }),
      }
    );


    // ===================================================
    // READ GROQ RESPONSE
    // ===================================================

    const responseText = await response.text();

    console.log('Groq response status:', response.status);


    // ===================================================
    // GROQ ERROR
    // ===================================================

    if (!response.ok) {
      console.error('Groq API error:', response.status, responseText);
      return res.status(502).json({
        error: 'AI service failed.',
      });
    }


    // ===================================================
    // PARSE JSON
    // ===================================================

    let data;

    try {
      data = JSON.parse(responseText);
    } catch (error) {
      console.error('Groq JSON parse error:', error);
      return res.status(502).json({
        error: 'Invalid response received from AI service.',
      });
    }


    // ===================================================
    // GET AI RESPONSE
    // ===================================================

    const reply = data?.choices?.[0]?.message?.content;

    if (!reply) {
      console.error('Groq returned no reply:', JSON.stringify(data));
      return res.status(502).json({
        error: 'AI service did not return a response.',
      });
    }


    // ===================================================
    // SUCCESS
    // ===================================================

    return res.status(200).json({
      reply: reply.trim(),
    });


  } catch (error) {

    console.error('Vercel chatbot error:', error);

    return res.status(500).json({
      error: 'Something went wrong talking to the AI service.',
    });
  }
}