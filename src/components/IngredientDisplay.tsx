import React, { useState, useMemo } from 'react';
import './IngredientDisplay.css';
import { Ingredient } from '../utils/dataUtils';

interface IngredientDisplayProps {
  categories: string[];
  ingredientInfo: Record<string, Ingredient>;
  imageSize: number;
  textSize: number;
  sortMode?: string;
}

const IngredientDisplay: React.FC<IngredientDisplayProps> = ({ 
  categories, 
  ingredientInfo,
  imageSize,
  textSize,
  sortMode = 'category'
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Deduplicate ingredients (combine variants like "Bacon x2", "Bacon x3" into just "Bacon")
  const uniqueIngredients = useMemo(() => {
    const groups = new Map<string, string>(); // normalizedName -> bestOriginalKey

    Object.keys(ingredientInfo).forEach(key => {
      const normalized = key.replace(/ x\d+$/, '');
      
      if (!groups.has(normalized)) {
        groups.set(normalized, key);
      } else {
        // If we find the exact match (no suffix), prefer it over the suffixed version
        if (key === normalized) {
          groups.set(normalized, key);
        }
      }
    });

    return Array.from(groups.entries()).map(([normalizedName, originalKey]) => ({
      originalKey,
      displayName: normalizedName,
      info: ingredientInfo[originalKey]
    }));
  }, [ingredientInfo]);

  // Filter ingredients by selected category and sort them
  const filteredIngredients = uniqueIngredients
    .filter(({ info }) => {
      if (selectedCategory === 'All') return true;
      if (selectedCategory === 'LTO') return info.is_lto;
      return info.category === selectedCategory;
    })
    .sort((a, b) => {
      if (sortMode === 'alphabetical') {
        return a.displayName.localeCompare(b.displayName);
      }
      // Default 'category' sort: Sort by category first, then alphabetically
      const catCompare = a.info.category.localeCompare(b.info.category);
      if (catCompare === 0) {
        return a.displayName.localeCompare(b.displayName);
      }
      return catCompare;
    });

  return (
    <div className="ingredient-display">
      <h2>Ingredients</h2>
      
      <div className="ingredient-categories">
        {categories.map(category => (
          <button
            key={category}
            className={selectedCategory === category ? 'active' : ''}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>
      
      <div className="ingredients-grid">
        {filteredIngredients.length === 0 ? (
          <p className="no-ingredients">No ingredients found in this category</p>
        ) : (
          filteredIngredients.map(({ originalKey, displayName, info }) => (
            <div 
              key={originalKey} 
              className="ingredient-card"
            >
              <div 
                className="ingredient-image"
                style={{ width: `${imageSize}px`, height: `${imageSize}px` }}
              >
                <img 
                  src={`/images/${info.image}`} 
                  alt={displayName}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/icon.png';
                    target.onerror = null;
                  }}
                />
              </div>
              <span 
                className="ingredient-name"
                style={{ fontSize: `${textSize}px` }}
              >
                {displayName}
                {info.is_lto && (
                  <span className="lto-star" title="Limited Time Offer">★</span>
                )}
              </span>
              <span className="ingredient-category">{info.category}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default IngredientDisplay; 