import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini client with User-Agent header for tracking.
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export default async function handler(req: any, res: any) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: "Query is required" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "MISSING_API_KEY" });
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
    console.error("AI Estimation Serverless Error:", err);
    return res.status(500).json({ error: err.message || "Failed to process request" });
  }
}
