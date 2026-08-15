// functions/index.js

const { setGlobalOptions } = require('firebase-functions/v2');

setGlobalOptions({
  region: 'us-central1',
});

const { chatWithBarista } = require('./chatbot');

exports.chatWithBarista = chatWithBarista;