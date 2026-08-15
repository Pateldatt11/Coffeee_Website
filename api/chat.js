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
  // Handle Preflight
  // =====================================================

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }


  // =====================================================
  // POST Only
  // =====================================================

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }


  try {
    // ===================================================
    // Get Message
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
    // Message Length
    // ===================================================

    if (userMessage.length > 500) {
      return res.status(400).json({
        error: 'Message too long.',
      });
    }


    // ===================================================
    // Gemini API Key
    // ===================================================

    const apiKey =
      process.env.GEMINI_API_KEY;


    if (!apiKey) {
      console.error(
        'GEMINI_API_KEY is not configured.'
      );

      return res.status(500).json({
        error:
          'Gemini API key is not configured on Vercel.',
      });
    }


    // ===================================================
    // System Instruction
    // ===================================================

    const systemInstruction = {
      parts: [
        {
          text: `
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
          `.trim(),
        },
      ],
    };


    // ===================================================
    // Gemini API Request
    // ===================================================

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },

        body: JSON.stringify({
          systemInstruction,

          contents: [
            {
              role: 'user',

              parts: [
                {
                  text: userMessage,
                },
              ],
            },
          ],
        }),
      }
    );


    // ===================================================
    // Read Gemini Response
    // ===================================================

    const responseText =
      await response.text();


    // ===================================================
    // Gemini Error
    // ===================================================

    if (!response.ok) {
      console.error(
        'Gemini API error:',
        response.status,
        responseText
      );

      return res.status(502).json({
        error: 'Gemini service failed.',
      });
    }


    // ===================================================
    // Parse JSON
    // ===================================================

    let data;

    try {
      data = JSON.parse(responseText);
    } catch (error) {
      console.error(
        'Gemini JSON parse error:',
        error
      );

      return res.status(502).json({
        error:
          'Invalid response received from Gemini.',
      });
    }


    // ===================================================
    // Get Gemini Reply
    // ===================================================

    const reply =
      data?.candidates?.[0]
        ?.content?.parts?.[0]
        ?.text;


    if (!reply) {
      console.error(
        'Gemini returned no text:',
        JSON.stringify(data)
      );

      return res.status(502).json({
        error:
          'Gemini did not return a response.',
      });
    }


    // ===================================================
    // Success
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
        'Something went wrong talking to the chatbot.',
    });
  }
}