// functions/chatbot.js

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

exports.chatWithBarista = onCall(
  {
    region: 'us-central1',
    cors: true,
    secrets: [GEMINI_API_KEY],
  },
  async (request) => {
    const userMessage = request.data?.message;

    if (!userMessage || typeof userMessage !== 'string') {
      throw new HttpsError(
        'invalid-argument',
        'A message string is required.'
      );
    }

    if (userMessage.length > 500) {
      throw new HttpsError(
        'invalid-argument',
        'Message too long.'
      );
    }

    const apiKey = GEMINI_API_KEY.value();

    if (!apiKey) {
      console.error('GEMINI_API_KEY is not configured.');
      throw new HttpsError(
        'failed-precondition',
        'Gemini API key is not configured.'
      );
    }

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

    try {
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

      const responseText = await response.text();

      if (!response.ok) {
        console.error(
          'Gemini API error:',
          response.status,
          responseText
        );

        throw new HttpsError(
          'internal',
          'Gemini service failed.'
        );
      }

      let data;

      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Gemini JSON parse error:', parseError);

        throw new HttpsError(
          'internal',
          'Invalid response from Gemini.'
        );
      }

      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!reply) {
        console.error(
          'Gemini returned no text:',
          JSON.stringify(data)
        );

        throw new HttpsError(
          'internal',
          'Gemini did not return a response.'
        );
      }

      return {
        reply: reply.trim(),
      };
    } catch (error) {
      console.error('chatWithBarista error:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        'Something went wrong talking to the chatbot.'
      );
    }
  }
);