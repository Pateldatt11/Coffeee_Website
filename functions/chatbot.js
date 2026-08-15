// functions/chatbot.js
//
// Add this file to your existing `functions` folder, then import it
// from functions/index.js (see the one-line addition below this file).
//
// This function is the ONLY place your Gemini API key exists. The React
// app never sees it — it just calls this function and gets a reply back.

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

// The key is pulled from Firebase Secret Manager at runtime, not from
// your code and not from a .env file that could get committed to git.
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

exports.chatWithBarista = onCall(
  { secrets: [GEMINI_API_KEY] },
  async (request) => {
    const userMessage = request.data?.message;

    if (!userMessage || typeof userMessage !== 'string') {
      throw new HttpsError('invalid-argument', 'A message string is required.');
    }
    if (userMessage.length > 500) {
      throw new HttpsError('invalid-argument', 'Message too long.');
    }

    const apiKey = GEMINI_API_KEY.value();

    // System instruction keeps replies on-topic for a coffee shop.
    // Swap "Brew Haven" / menu details for your real shop info.
    const systemInstruction = {
      parts: [{
        text: `You are the friendly virtual barista for Brew Haven, a coffee shop.
Answer questions about coffee, the menu, ordering, and hours in a warm, brief way.
If asked something unrelated to the coffee shop, politely redirect back to coffee topics.
Keep replies under 3 sentences unless the customer asks for detail.`
      }]
    };

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction,
            contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error('Gemini API error:', response.status, errText);
        throw new HttpsError('internal', 'Chatbot service failed.');
      }

      const data = await response.json();
      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sorry, I couldn't come up with a reply. Try asking again?";

      return { reply };
    } catch (err) {
      console.error('chatWithBarista error:', err);
      throw new HttpsError('internal', 'Something went wrong talking to the chatbot.');
    }
  }
);