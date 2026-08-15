// functions/index.js
//
// This is the entry point Firebase looks at when deploying functions.
// It just re-exports chatWithBarista from chatbot.js.
//
// If you add more Cloud Functions later, add more exports.* lines here,
// each pointing to its own file — keeps things organized as it grows.

const { chatWithBarista } = require('./chatbot');

exports.chatWithBarista = chatWithBarista;