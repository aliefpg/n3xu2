import { GoogleGenAI, Type } from "@google/genai";

// The API key is injected by the environment into process.env.GEMINI_API_KEY
const getApiKey = () => {
  // Vite will replace this during build/dev
  return process.env.GEMINI_API_KEY || "";
};

let aiInstance: any = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("MISSING_API_KEY");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export interface NutritionAIResult {
  name: string;
  calories: number;
  sugar: number;
  protein: number;
  fat: number;
  carbs: number;
  sodium: number;
  type: 'food' | 'drink';
}

export async function estimateNutrition(query: string): Promise<NutritionAIResult> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
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
    throw new Error("No response from AI");
  }

  try {
    // Handle cases where the model might still wrap JSON in markdown (though responseMimeType: "application/json" should prevent this)
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr) as NutritionAIResult;
  } catch (parseError) {
    console.error("Failed to parse AI response:", text);
    throw new Error("INVALID_AI_RESPONSE");
  }
}
