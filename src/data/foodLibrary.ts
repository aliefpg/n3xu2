export interface FoodLibraryItem {
  name: string;
  calories: number;
  sugar: number;
  protein: number;
  fat: number;
  carbs: number;
  sodium: number;
  type: 'food' | 'drink';
}

export const COMMON_FOODS: FoodLibraryItem[] = [
  // Indonesian Favorites
  { name: "Nasi Putih (1 porsi)", calories: 204, sugar: 0.1, protein: 4.2, fat: 0.4, carbs: 44, sodium: 1, type: "food" },
  { name: "Nasi Goreng Ayam", calories: 350, sugar: 2, protein: 15, fat: 12, carbs: 45, sodium: 800, type: "food" },
  { name: "Ayam Goreng (1 potong)", calories: 246, sugar: 0, protein: 25, fat: 15, carbs: 0, sodium: 400, type: "food" },
  { name: "Sate Ayam (5 tusuk)", calories: 225, sugar: 8, protein: 20, fat: 12, carbs: 10, sodium: 600, type: "food" },
  { name: "Bakso Sapi (1 mangkok)", calories: 300, sugar: 3, protein: 18, fat: 15, carbs: 25, sodium: 1200, type: "food" },
  { name: "Mie Instan Goreng", calories: 380, sugar: 7, protein: 8, fat: 14, carbs: 54, sodium: 1100, type: "food" },
  { name: "Tempe Goreng (1 potong)", calories: 120, sugar: 0.5, protein: 7, fat: 8, carbs: 5, sodium: 200, type: "food" },
  { name: "Tahu Goreng (1 potong)", calories: 80, sugar: 0.2, protein: 5, fat: 6, carbs: 2, sodium: 150, type: "food" },
  { name: "Gado-Gado", calories: 320, sugar: 12, protein: 14, fat: 18, carbs: 28, sodium: 700, type: "food" },
  { name: "Soto Ayam", calories: 250, sugar: 2, protein: 16, fat: 10, carbs: 22, sodium: 950, type: "food" },
  
  // Western / International
  { name: "Apple (Medium)", calories: 95, sugar: 19, protein: 0.5, fat: 0.3, carbs: 25, sodium: 2, type: "food" },
  { name: "Banana", calories: 105, sugar: 14, protein: 1.3, fat: 0.4, carbs: 27, sodium: 1, type: "food" },
  { name: "Egg (Large, Boiled)", calories: 78, sugar: 0.6, protein: 6, fat: 5, carbs: 0.6, sodium: 62, type: "food" },
  { name: "Chicken Breast (100g)", calories: 165, sugar: 0, protein: 31, fat: 3.6, carbs: 0, sodium: 74, type: "food" },
  { name: "Oatmeal (1 cup)", calories: 158, sugar: 1, protein: 6, fat: 3, carbs: 27, sodium: 2, type: "food" },
  { name: "Greek Yogurt (Regular)", calories: 100, sugar: 6, protein: 10, fat: 3, carbs: 6, sodium: 45, type: "food" },
  { name: "Whey Protein Shake", calories: 120, sugar: 1, protein: 24, fat: 1.5, carbs: 3, sodium: 150, type: "drink" },
  
  // Drinks
  { name: "Es Teh Manis", calories: 90, sugar: 22, protein: 0, fat: 0, carbs: 23, sodium: 5, type: "drink" },
  { name: "Black Coffee (No Sugar)", calories: 2, sugar: 0, protein: 0.3, fat: 0, carbs: 0, sodium: 5, type: "drink" },
  { name: "Milk (Whole, 1 cup)", calories: 149, sugar: 12, protein: 8, fat: 8, carbs: 12, sodium: 105, type: "drink" },
  { name: "Coca Cola (330ml)", calories: 139, sugar: 35, protein: 0, fat: 0, carbs: 35, sodium: 13, type: "drink" },
  { name: "Orange Juice (Fresh)", calories: 110, sugar: 21, protein: 2, fat: 0.5, carbs: 26, sodium: 2, type: "drink" },
];
