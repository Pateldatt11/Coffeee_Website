// api/chat.js

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
    // Handles Hindi, English, Marathi, Gujarati, and natural
    // code-mixed variants (Hinglish / Gujlish), replying in
    // whatever language + script the customer used.

    const systemPrompt = `
You are Bru, the in-house virtual barista for Brew Haven, a coffee shop.

LANGUAGE RULES (very important):
- The customer may write in English, Hindi, Marathi, Gujarati, or a natural
  mixed style (e.g. Hinglish, Gujlish) using either native script or
  Roman/Latin transliteration.
- Detect the language AND the script the customer used in their latest
  message, and reply in that same language and script. Match their register:
  if they write casually in a mixed style, reply the same natural mixed way
  a real local barista would — don't sound like a translation.
- If the customer switches languages mid-conversation, follow the switch.
- If the language is unclear or mixed evenly, default to a friendly
  Hindi-English mix.
- Never mention that you are detecting or translating language — just reply
  naturally, like a real staff member who happens to speak all of these.

WHAT YOU HELP WITH:
- Coffee, menu items, food, ordering, prices, opening hours, and
  coffee recommendations for Brew Haven.
- If asked something unrelated to the coffee shop, politely and warmly
  steer the conversation back to coffee/menu/hours, in the same
  language/script the customer is using.

STYLE:
- Warm, friendly, concise — like a real barista chatting at the counter,
  not a formal support bot.
- Keep replies under 3 short sentences unless the customer asks for more
  detail.
- Use at most one relevant emoji, only when it fits naturally.
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
          temperature: 0.7,
          max_tokens: 220,
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