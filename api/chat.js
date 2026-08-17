const BUSINESS_INFO = `
SHOP: Brew Haven

HOURS:
- Mon–Fri: 8:00 AM – 9:00 PM
- Sat–Sun: 9:00 AM – 10:00 PM
- Public holidays: 10:00 AM – 6:00 PM

LOCATION & CONTACT:
- Address: Contact Brew Haven staff for the exact address.
- Phone: Contact Brew Haven staff for phone details.
- We offer dine-in, takeaway, and delivery.

MENU — COFFEE:
- Espresso — ₹99
- Americano — ₹129
- Cappuccino — ₹149
- Cafe Latte — ₹159
- Flat White — ₹169
- Mocha — ₹179
- Cold Brew — ₹159
- Iced Latte — ₹169
- Filter Kaapi — ₹99

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

BEST SELLERS:
- Cappuccino
- Cold Brew
- Filter Kaapi
- Banana Bread

LOYALTY PROGRAM:
- Every 8th coffee free with Brew Haven loyalty card

PAYMENTS:
- Cash
- Major cards
- UPI
- Popular wallets

AMENITIES:
- Free WiFi
- Indoor + outdoor seating
- Pet-friendly outdoor area
- Charging points

ALLERGEN NOTE:
- Our kitchen handles nuts, gluten, and dairy.
- Please tell staff about any allergy before ordering.
`.trim();


// =========================================================
// SIMPLE LOCAL FALLBACK
// This ensures your college demo still works even if Groq
// temporarily fails.
// =========================================================

function getFallbackReply(message) {
  const text = message.toLowerCase().trim();

  if (
    text.includes('menu') ||
    text.includes('price') ||
    text.includes('what do you have')
  ) {
    return `Here is our menu:

☕ Coffee:
Espresso ₹99
Americano ₹129
Cappuccino ₹149
Cafe Latte ₹159
Flat White ₹169
Mocha ₹179
Cold Brew ₹159
Iced Latte ₹169
Filter Kaapi ₹99

🥤 Non-Coffee:
Masala Chai ₹89
Hot Chocolate ₹149
Fresh Lemonade ₹119
Iced Tea ₹129

🍪 Food:
Croissant ₹99 / ₹129
Banana Bread ₹109
Sandwich ₹149 / ₹169 / ₹189
Brownie ₹119
Cookies ₹89

Our best sellers are Cappuccino, Cold Brew, Filter Kaapi and Banana Bread.`;
  }

  if (
    text.includes('close') ||
    text.includes('closing') ||
    text.includes('open') ||
    text.includes('hours') ||
    text.includes('time')
  ) {
    return 'We are open Monday to Friday from 8:00 AM to 9:00 PM. On Saturday and Sunday, we are open from 9:00 AM to 10:00 PM.';
  }

  if (
    text.includes('best seller') ||
    text.includes('popular') ||
    text.includes('recommend')
  ) {
    return 'Our best sellers are Cappuccino, Cold Brew, Filter Kaapi and Banana Bread. If you want one recommendation, try the Cappuccino for ₹149.';
  }

  if (
    text.includes('deliver') ||
    text.includes('delivery') ||
    text.includes('home delivery')
  ) {
    return 'Yes, Brew Haven offers delivery. Please check with the shop for the currently available delivery partner.';
  }

  if (
    text.includes('cold')
  ) {
    return 'For something cold, I recommend our Cold Brew for ₹159 or Iced Latte for ₹169.';
  }

  if (
    text.includes('strong')
  ) {
    return 'For a strong coffee, try Espresso for ₹99 or Americano for ₹129.';
  }

  if (
    text.includes('cheap') ||
    text.includes('budget') ||
    text.includes('low price')
  ) {
    return 'Our most affordable coffee options are Espresso and Filter Kaapi, both priced at ₹99.';
  }

  if (
    text.includes('milk') ||
    text.includes('oat') ||
    text.includes('almond') ||
    text.includes('soy')
  ) {
    return 'We offer full cream and low-fat milk, plus oat, almond or soy milk for an additional ₹30.';
  }

  if (
    text.includes('wifi') ||
    text.includes('wi-fi')
  ) {
    return 'Yes, Brew Haven has free WiFi. We also have indoor and outdoor seating plus charging points.';
  }

  if (
    text.includes('payment') ||
    text.includes('upi') ||
    text.includes('card')
  ) {
    return 'We accept cash, major cards, UPI and popular wallets.';
  }

  if (
    text.includes('hello') ||
    text.includes('hi') ||
    text.includes('hey')
  ) {
    return 'Hello! I am Bru, the Brew Haven virtual barista. Ask me about our menu, prices, hours or coffee recommendations.';
  }

  return 'I can help with Brew Haven menu items, prices, opening hours, delivery, amenities and coffee recommendations. What would you like to know?';
}


// =========================================================
// HANDLER
// =========================================================

export default async function handler(req, res) {
  // CORS
  const allowedOrigins = [
    'http://localhost:5173',
    'https://coffeeebrewwebsite.vercel.app',
  ];

  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');


  // PREFLIGHT
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }


  // ONLY POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }


  try {
    const userMessage = req.body?.message;
    const history = Array.isArray(req.body?.history)
      ? req.body.history
      : [];


    // VALIDATE MESSAGE
    if (!userMessage || typeof userMessage !== 'string') {
      return res.status(400).json({
        error: 'A message string is required.',
      });
    }


    if (userMessage.length > 500) {
      return res.status(400).json({
        error: 'Message too long.',
      });
    }


    // GET GROQ KEY
    const apiKey = process.env.GROQ_API_KEY;


    // =====================================================
    // IF KEY IS MISSING -> FALLBACK
    // =====================================================
    if (!apiKey) {
      console.error('GROQ_API_KEY is missing. Using local fallback.');

      return res.status(200).json({
        reply: getFallbackReply(userMessage),
        source: 'fallback',
      });
    }


    // =====================================================
    // SYSTEM PROMPT
    // =====================================================

    const systemPrompt = `
You are Bru, the virtual barista for Brew Haven.

Use the following Brew Haven information to answer:

${BUSINESS_INFO}

RULES:
- Always reply in English.
- Be friendly and concise.
- Give exact prices when relevant.
- Never invent business information.
- If information is unavailable, say so honestly.
- Recommend 1 or 2 specific items when the user asks for a recommendation.
- Keep normal answers under 4 short sentences unless the full menu is requested.
`.trim();


    // BUILD HISTORY
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


    // =====================================================
    // GROQ REQUEST WITH TIMEOUT
    // =====================================================

    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 15000);


    let response;

    try {
      response = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey.trim()}`,
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [
              {
                role: 'system',
                content: systemPrompt,
              },
              ...trimmedHistory,
              {
                role: 'user',
                content: userMessage,
              },
            ],
            temperature: 0.65,
            max_tokens: 320,
          }),
        }
      );
    } finally {
      clearTimeout(timeoutId);
    }


    const responseText = await response.text();

    console.log('Groq status:', response.status);
    console.log(
      'Groq response:',
      responseText.substring(0, 1000)
    );


    // =====================================================
    // GROQ FAILED -> FALLBACK
    // =====================================================

    if (!response.ok) {
      console.error(
        'Groq API failed:',
        response.status,
        responseText
      );

      // IMPORTANT:
      // Return 200 with a useful response instead of 502.
      // Your chatbot keeps working during temporary AI issues.
      return res.status(200).json({
        reply: getFallbackReply(userMessage),
        source: 'fallback',
      });
    }


    // PARSE RESPONSE
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (error) {
      console.error('Groq JSON parse error:', error);

      return res.status(200).json({
        reply: getFallbackReply(userMessage),
        source: 'fallback',
      });
    }


    // GET REPLY
    const reply = data?.choices?.[0]?.message?.content?.trim();


    // NO REPLY -> FALLBACK
    if (!reply) {
      console.error(
        'Groq returned no valid reply:',
        JSON.stringify(data)
      );

      return res.status(200).json({
        reply: getFallbackReply(userMessage),
        source: 'fallback',
      });
    }


    // SUCCESS
    return res.status(200).json({
      reply,
      source: 'groq',
    });


  } catch (error) {
    console.error(
      'Chatbot server error:',
      error?.name,
      error?.message
    );


    // AI/network error -> chatbot still works
    return res.status(200).json({
      reply: getFallbackReply(
        req.body?.message || ''
      ),
      source: 'fallback',
    });
  }
}