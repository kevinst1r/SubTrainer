// Define types for our application
export interface Ingredient {
  category: string;
  image: string;
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
}

// Ingredient information data
export const INGREDIENT_INFO: Record<string, Ingredient> = {
  "Ham": { "category": "Meats", "image": "Ham.png" },
  "Ham (Double)": { "category": "Meats", "image": "HamDouble.png" },
  "Lettuce": { "category": "Veggies", "image": "Lettuce.png" },
  "Tomato": { "category": "Veggies", "image": "Tomato.png" },
  "Mayo": { "category": "Condiments", "image": "Mayo.png" },
  "Roast Beef": { "category": "Meats", "image": "RoastBeef.png" },
  "Roast Beef (Double)": { "category": "Meats", "image": "RoastBeefDouble.png" },
  "Tuna Salad": { "category": "Meats", "image": "TunaSalad.png" },
  "Cucumber": { "category": "Veggies", "image": "Cucumber.png" },
  "Turkey": { "category": "Meats", "image": "Turkey.png" },
  "Vito": { "category": "Meats", "image": "Vito.png" },
  "Onion": { "category": "Veggies", "image": "Onion.png" },
  "Oil & Vinegar": { "category": "Condiments", "image": "Oil.png" },
  "Oregano-Basil": { "category": "Condiments", "image": "Basil.png" },
  "Avocado Spread": { "category": "Condiments", "image": "AvocadoSpread.png" },
  "Vito (Double)": { "category": "Meats", "image": "VitoDouble.png" },
  "Jimmy Peppers": { "category": "Veggies", "image": "Peppers.png" },
  "Yellow Mustard": { "category": "Condiments", "image": "Mustard.png" },
  "Bacon": { "category": "Meats", "image": "Bacon.png" },
  "Sliced Pickles": { "category": "Veggies", "image": "Pickles.png" },
  "All-Natural Chicken": { "category": "Meats", "image": "Chicken.png" },
  "Provolone Cheese": { "category": "Cheese", "image": "Provolone.png" },
  "Provolone (Double)": { "category": "Cheese", "image": "ProvoloneDouble.png" },
  "Cheddar Cheese": { "category": "Cheese", "image": "Cheddar.png" },
  "Ranch": { "category": "Condiments", "image": "Ranch.png" },
  "Parmesan Cheese": { "category": "Cheese", "image": "Parmesan.png" },
  "Horseradish Sauce": { "category": "Condiments", "image": "Horseradish.png" },
  "Crispy Fried Onions": { "category": "Veggies", "image": "FriedOnions.png" }
};

export const INGREDIENT_CATEGORIES = ["All", "Meats", "Cheese", "Veggies", "Condiments", "Other"];

export const GENERAL_TIPS = [
  "Remember to wash your hands and maintain a clean workstation!",
  "Always verify bread freshness before building any sub.",
  "Keep cold ingredients chilled properly and meats safely stored.",
  "Knife skills matter: precise slicing helps presentation.",
  "Practice safe temperatures for cooked and toasted subs."
];

// Load sub data from the JSON file
export async function loadSubData(): Promise<SubData> {
  try {
    const response = await fetch('/sub_data.json');
    if (!response.ok) {
      throw new Error(`Failed to load sub data: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading sub data:', error);
    // Return sample data as fallback if we can't load from file
    return getSampleSubData();
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
      ingredient_text_size: 15
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