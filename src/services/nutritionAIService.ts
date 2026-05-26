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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function estimateNutrition(query: string): Promise<NutritionAIResult> {
  const maxRetries = 3;
  let delay = 1000; // Mulai dengan delay 1 detik

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch("/api/estimate-nutrition", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Jika API Key tidak ada, tidak perlu retry karena pasti akan gagal lagi
        if (errorData.error === "MISSING_API_KEY") {
          throw new Error("MISSING_API_KEY");
        }
        
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      // Jika memang kunci API hilang, langsung stop retry
      if (error.message === "MISSING_API_KEY") {
        throw error;
      }
      
      console.warn(`Attempt ${attempt} failed to estimate nutrition. Error:`, error);
      
      if (attempt === maxRetries) {
        console.error("All nutrition estimation retry attempts exhausted.");
        throw error;
      }
      
      console.log(`Retrying in ${delay}ms...`);
      await sleep(delay);
      delay *= 2; // Exponential backoff
    }
  }

  throw new Error("Request failed");
}
