// Define types for our application
export interface Ingredient {
  category: string;
  image: string;
  is_lto?: boolean;
}

export interface Sub {
  name: string;
  ingredients: string[];
  tip: string;
  image: string;
}

export interface SubData {
  [category: string]: Sub[];
}

export interface SortingConfig {
  sort_mode: string;
  ingredient_image_size: number;
  ui_text_size: number;
  ingredient_text_size: number;
  tip_icon?: string;
}

export type IngredientData = Record<string, Ingredient>;

export const INGREDIENT_CATEGORIES = ["All", "Wraps", "Meats", "Cheese", "Veggies", "Condiments", "LTO"];

export const GENERAL_TIPS = [
  "Remember to wash your hands and maintain a clean workstation!",
  "Always verify bread freshness before building any sub.",
  "Keep cold ingredients chilled properly and meats safely stored.",
  "Knife skills matter: precise slicing helps presentation.",
  "Practice safe temperatures for cooked and toasted subs."
];

export interface TipObject {
  text: string;
  icon?: string;
}

// Load site tips
export async function loadSiteTips(): Promise<(string | TipObject)[]> {
  try {
    // Add timestamp to prevent caching
    const response = await fetch(`/site_tips.json?t=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`Failed to load site tips: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading site tips:', error);
    // Return default tips as fallback
    return GENERAL_TIPS;
  }
}

// Load sub data from the JSON file
export async function loadSubData(): Promise<SubData> {
  try {
    // Add timestamp to prevent caching
    const response = await fetch(`/sub_data.json?t=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`Failed to load sub data: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading sub data:', error);
    alert("Failed to load sub_data.json! Check console for details. Loading sample data instead.");
    // Return sample data as fallback if we can't load from file
    return getSampleSubData();
  }
}

// Load ingredient data
export async function loadIngredientData(): Promise<IngredientData> {
  try {
    // Add timestamp to prevent caching
    const response = await fetch(`/ingredient_data.json?t=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`Failed to load ingredient data: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading ingredient data:', error);
    return {};
  }
}

// Load sorting configuration
export async function loadSortingConfig(): Promise<SortingConfig> {
  try {
    const response = await fetch('/sorting_config.json');
    if (!response.ok) {
      throw new Error(`Failed to load sorting config: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading sorting config:', error);
    // Return default config if we can't load from file
    return {
      sort_mode: "category",
      ingredient_image_size: 64,
      ui_text_size: 20,
      ingredient_text_size: 15,
      tip_icon: "💡"
    };
  }
}

// Helper function to get sample sub data if JSON can't be loaded
function getSampleSubData(): SubData {
  return {
    "Originals": [
      {
        "name": "#1 The Pepe",
        "ingredients": [
          "Ham",
          "Provolone Cheese",
          "Lettuce",
          "Tomato",
          "Mayo"
        ],
        "tip": "Wrap sub neatly and keep ham slices folded.",
        "image": "subs/Pepe.png"
      },
      {
        "name": "#2 Big John",
        "ingredients": [
          "Roast Beef",
          "Lettuce",
          "Tomato",
          "Mayo"
        ],
        "tip": "Roast beef must be sliced fresh daily for best taste.",
        "image": "subs/BigJohn.png"
      },
      {
        "name": "#3 Totally Tuna",
        "ingredients": [
          "Tuna Salad",
          "Lettuce",
          "Tomato",
          "Cucumber"
        ],
        "tip": "Drain tuna well to avoid soggy bread.",
        "image": "subs/TotallyTuna.png"
      }
    ],
    "Favorites": [
      {
        "name": "#7 Spicy East Coast Italian",
        "ingredients": [
          "Vito (Double)",
          "Provolone Cheese",
          "Jimmy Peppers",
          "Onion",
          "Mayo",
          "Oil & Vinegar",
          "Oregano-Basil",
          "Lettuce",
          "Tomato"
        ],
        "tip": "Jimmy Peppers first so they blend with the meat flavors.",
        "image": "subs/SpicyItalian.png"
      },
      {
        "name": "#8 Billy Club",
        "ingredients": [
          "Roast Beef",
          "Ham",
          "Provolone Cheese",
          "Yellow Mustard",
          "Lettuce",
          "Tomato",
          "Mayo"
        ],
        "tip": "Yellow mustard goes lightly so as not to overpower.",
        "image": "subs/BillyClub.png"
      }
    ]
  };
}

// Helper function to extract sandwich number from name
export function extractSandwichNumber(name: string): string | null {
  if (name.startsWith('#')) {
    const parts = name.split(' ', 1);
    if (parts[0].length > 1 && /^\d+$/.test(parts[0].substring(1))) {
      return parts[0].substring(1);
    }
  }
  return null;
}

// Helper function to clean sandwich name by removing number
export function cleanSandwichName(name: string): string {
  return name.replace(/^#\d+\s+/, '').trim();
} 