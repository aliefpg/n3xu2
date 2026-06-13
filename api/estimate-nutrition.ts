import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini client with User-Agent header for tracking.
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export default async function handler(req: any, res: any) {
  // CORS: Restrict to specific origins
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'https://n3xu2.vercel.app'
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let { query } = req.body;
  
  // Strict validation: must be string, not empty, not too long
  if (!query || typeof query !== 'string') {
    console.warn(`Invalid query: type=${typeof query}, value=${query}`);
    return res.status(400).json({ error: "Query is required and must be a string" });
  }

  query = query.trim();
  if (query.length === 0 || query.length > 500) {
    console.warn(`Invalid query length: ${query.length}`);
    return res.status(400).json({ error: "Query must be between 1-500 characters" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('CRITICAL: GEMINI_API_KEY not configured in Vercel environment');
    return res.status(500).json({ error: "Failed to process request" });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Estimate the nutritional content for this food/drink: "${query}".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "A concise name for the item in English or Indonesian as appropriate.",
            },
            calories: {
              type: Type.NUMBER,
              description: "Total calories in kcal.",
            },
            sugar: {
              type: Type.NUMBER,
              description: "Total sugar in grams.",
            },
            protein: {
              type: Type.NUMBER,
              description: "Total protein in grams.",
            },
            fat: {
              type: Type.NUMBER,
              description: "Total fat in grams.",
            },
            carbs: {
              type: Type.NUMBER,
              description: "Total carbohydrates in grams.",
            },
            sodium: {
              type: Type.NUMBER,
              description: "Total sodium in milligrams.",
            },
            type: {
              type: Type.STRING,
              enum: ["food", "drink"],
            },
          },
          required: ["name", "calories", "sugar", "protein", "fat", "carbs", "sodium", "type"],
        },
        systemInstruction: "You are a professional nutritionist expert. Analyze food descriptions (which may be in Indonesian or English) and provide accurate nutritional estimates in standard metric units. If multiple items are mentioned (e.g., 'ayam goreng with rice'), provide a combined estimate for the whole meal. Provide typical values for a standard serving size if not specified. Be realistic about high-calorie items like fried food and sambal.",
      },
    });

    const text = response.text;
    if (!text) {
      return res.status(500).json({ error: "No response from AI" });
    }

    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(jsonStr);
    return res.status(200).json(result);
  } catch (err: any) {
    // Log error on server side only - don't expose details to client
    console.error("AI Estimation Error:", err.message);
    return res.status(500).json({ error: "Failed to process request" });
  }
}
