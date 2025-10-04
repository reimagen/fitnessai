
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!geminiApiKey && process.env.NODE_ENV !== 'production') {
  // This error will appear in the server console when Next.js starts
  // or when this module is first loaded during development.
  console.error(`
    ================================================================================
    [ERROR] FITNESSAI: MISSING GEMINI API KEY
    --------------------------------------------------------------------------------
    The AI features of this application require a Gemini API Key.

    To fix this:
      1. Go to Google AI Studio to get a key: https://aistudio.google.com/app/apikey
      2. Create a file named '.env.local' in the root of your project.
      3. Add the following line to the file, replacing with your actual key:
         GEMINI_API_KEY=YOUR_API_KEY_HERE

    After adding the key, please restart your development server.
    For more details on Genkit Google AI plugin setup, see:
    https://firebase.google.com/docs/genkit/plugins/google-genai
    ================================================================================
  `);
}

export const ai = genkit({
  plugins: [
    googleAI({ apiKey: geminiApiKey }), // Explicitly pass the API key
  ],
  model: 'googleai/gemini-2.5-flash-lite', // Default model
});
