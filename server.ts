import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Validate critical environment variables at startup
if (!process.env.GEMINI_API_KEY) {
  console.warn('WARNING: GEMINI_API_KEY environment variable not set.');
  console.warn('Nutrition estimation will not be functional until GEMINI_API_KEY is configured.');
}

// Rate limiting middleware
const requestCounts = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10; // max requests per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userRequests = requestCounts.get(ip) || [];
  const recentRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= RATE_LIMIT_MAX) {
    return false;
  }
  
  recentRequests.push(now);
  requestCounts.set(ip, recentRequests);
  return true;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Security Headers Middleware
  const securityHeadersMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Strict-Transport-Security: Force HTTPS
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    
    // X-Frame-Options: Prevent clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    
    // X-Content-Type-Options: Prevent MIME sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Content-Security-Policy: Prevent XSS
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.jsdelivr.net; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https://generativelanguage.googleapis.com https://*.supabase.co; " +
      "frame-src 'self'"
    );
    
    // Referrer-Policy: Control referrer information
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions-Policy: Restrict browser APIs
    res.setHeader('Permissions-Policy', 'geolocation=(); microphone=(); camera=()');
    
    next();
  };

  app.use(securityHeadersMiddleware);

  // Note: Gemini client is lazily initialized inside the API route handler to handle missing keys gracefully on startup.

  // CORS Middleware - Restrict to specific origins
  const getAllowedOrigins = (): string[] => {
    if (process.env.NODE_ENV === 'production') {
      // In production, only allow your Vercel domain
      return [
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://n3xu2.vercel.app',
        'https://n3xu2.vercel.app'
      ];
    }
    // In development, allow localhost
    return ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'];
  };

  const corsMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const origin = req.get('origin');
    const allowedOrigins = getAllowedOrigins();
    
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
    
    next();
  };

  // Test endpoint: Reset rate limit (dev/test only)
  app.post("/test/reset-rate-limit", (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: "Forbidden" });
    }
    requestCounts.clear();
    res.json({ message: "Rate limit data cleared" });
  });

  // API Route for Nutrition Estimation
  app.post("/api/estimate-nutrition", corsMiddleware, async (req, res) => {
    // Rate limiting check
    const clientIP = req.ip || 'unknown';
    if (!checkRateLimit(clientIP)) {
      return res.status(429).json({ error: "Too many requests. Please try again later." });
    }

    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    // Validate query input to prevent injection attacks
    if (typeof query !== 'string' || query.length > 500) {
      return res.status(400).json({ error: "Invalid query format" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('CRITICAL: GEMINI_API_KEY is not configured in environment');
      return res.status(500).json({ error: "MISSING_API_KEY" });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
      });

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
        console.error("No response text from AI model");
        return res.status(500).json({ error: "Failed to process request" });
      }

      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const result = JSON.parse(jsonStr);
      return res.json(result);
    } catch (err: any) {
      // Log detailed error on server side only
      console.error("AI Estimation Error:", err.message);
      // Return generic error to client
      return res.status(500).json({ error: "Failed to process request" });
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
