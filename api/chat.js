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
    res.setHeader(
      'Access-Control-Allow-Origin',
      origin
    );
  }

  res.setHeader(
    'Access-Control-Allow-Methods',
    'POST, OPTIONS'
  );

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type'
  );

  res.setHeader(
    'Vary',
    'Origin'
  );


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
    // GET USER MESSAGE
    // ===================================================

    const userMessage = req.body?.message;


    if (
      !userMessage ||
      typeof userMessage !== 'string'
    ) {
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

    const apiKey =
      process.env.GROQ_API_KEY;


    if (!apiKey) {

      console.error(
        'GROQ_API_KEY is not configured.'
      );

      return res.status(500).json({
        error:
          'Groq API key is not configured on Vercel.',
      });
    }


    // ===================================================
    // SYSTEM PROMPT
    // ===================================================

    const systemPrompt = `
You are the friendly virtual barista for Brew Haven, a coffee shop.

Answer questions about:
- Coffee
- Menu
- Food
- Ordering
- Opening hours
- Coffee recommendations

Keep replies friendly, short and useful.

If the question is unrelated to the coffee shop,
politely redirect the customer back to coffee-related topics.

Keep replies under 3 sentences unless the customer asks for more detail.
    `.trim();


    // ===================================================
    // GROQ API REQUEST
    // ===================================================

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',

          Authorization:
            `Bearer ${apiKey}`,
        },

        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',

          messages: [
            {
              role: 'system',

              content: systemPrompt,
            },

            {
              role: 'user',

              content: userMessage,
            },
          ],

          temperature: 0.7,

          max_tokens: 200,
        }),
      }
    );


    // ===================================================
    // READ GROQ RESPONSE
    // ===================================================

    const responseText =
      await response.text();


    console.log(
      'Groq response status:',
      response.status
    );


    // ===================================================
    // GROQ ERROR
    // ===================================================

    if (!response.ok) {

      console.error(
        'Groq API error:',
        response.status,
        responseText
      );

      return res.status(502).json({
        error:
          'AI service failed.',
      });
    }


    // ===================================================
    // PARSE JSON
    // ===================================================

    let data;

    try {

      data = JSON.parse(
        responseText
      );

    } catch (error) {

      console.error(
        'Groq JSON parse error:',
        error
      );

      return res.status(502).json({
        error:
          'Invalid response received from AI service.',
      });
    }


    // ===================================================
    // GET AI RESPONSE
    // ===================================================

    const reply =
      data?.choices?.[0]
        ?.message
        ?.content;


    if (!reply) {

      console.error(
        'Groq returned no reply:',
        JSON.stringify(data)
      );

      return res.status(502).json({
        error:
          'AI service did not return a response.',
      });
    }


    // ===================================================
    // SUCCESS
    // ===================================================

    return res.status(200).json({
      reply: reply.trim(),
    });


  } catch (error) {

    console.error(
      'Vercel chatbot error:',
      error
    );

    return res.status(500).json({
      error:
        'Something went wrong talking to the AI service.',
    });
  }
}