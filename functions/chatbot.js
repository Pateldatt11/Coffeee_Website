const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

exports.chatWithBarista = onRequest(
  {
    region: 'us-central1',

    cors: [
      'http://localhost:5173',
      'https://coffeeebrewwebsite.vercel.app',
    ],

    secrets: [GEMINI_API_KEY],
  },

  async (req, res) => {
    // =====================================================
    // OPTIONS / CORS preflight
    // =====================================================

    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }

    // =====================================================
    // Only POST
    // =====================================================

    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method not allowed.',
      });
    }

    try {
      // ===================================================
      // Get message
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

      if (userMessage.length > 500) {
        return res.status(400).json({
          error: 'Message too long.',
        });
      }

      // ===================================================
      // Gemini API key
      // ===================================================

      const apiKey = GEMINI_API_KEY.value();

      if (!apiKey) {
        console.error(
          'GEMINI_API_KEY is not configured.'
        );

        return res.status(500).json({
          error: 'Gemini API key is not configured.',
        });
      }

      // ===================================================
      // System instruction
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
      // Gemini API
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

      const responseText =
        await response.text();

      // ===================================================
      // Gemini error
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
      // Parse Gemini response
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
          error: 'Invalid response from Gemini.',
        });
      }

      // ===================================================
      // Extract reply
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
          error: 'Gemini did not return a response.',
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
        'chatWithBarista error:',
        error
      );

      return res.status(500).json({
        error:
          'Something went wrong talking to the chatbot.',
      });
    }
  }
);