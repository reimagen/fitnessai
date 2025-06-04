
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!geminiApiKey && process.env.NODE_ENV !== 'production') {
  // This warning will appear in the server console when Next.js starts
  // or when this module is first loaded during development.
  console.warn(`
    !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    ERROR: Missing Gemini API Key for FitnessAI
    --------------------------------------------------------------------------
    The FitnessAI app's AI features require a Gemini API Key.
    Please set either GEMINI_API_KEY or GOOGLE_API_KEY in your .env file.

    Example (.env file content):
    GEMINI_API_KEY=YOUR_ACTUAL_API_KEY_HERE

    You can obtain an API key from Google AI Studio:
    https://aistudio.google.com/app/apikey

    After adding the key, please restart your development server.
    For more details on Genkit Google AI plugin setup, see:
    https://firebase.google.com/docs/genkit/plugins/google-genai
    !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  `);
}

export const ai = genkit({
  plugins: [
    googleAI({ apiKey: geminiApiKey }), // Explicitly pass the API key
  ],
  model: 'googleai/gemini-2.0-flash', // Default model
});
