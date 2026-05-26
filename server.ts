import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini client as server-side
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Route for Nutrition Estimation
  app.post("/api/estimate-nutrition", async (req, res) => {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    // Check if API key is present
    if (!process.env.GEMINI_API_KEY) {
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
      return res.json(result);
    } catch (err: any) {
      console.error("AI Estimation Server Error:", err);
      return res.status(500).json({ error: err.message || "Failed to process request" });
    }
  });

  // Hot module replacement workaround & assets routing
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // For React/Vite router compatibility
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
