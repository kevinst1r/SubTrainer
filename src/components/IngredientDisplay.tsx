import React, { useState } from 'react';
import './IngredientDisplay.css';
import { Ingredient } from '../utils/dataUtils';

interface IngredientDisplayProps {
  categories: string[];
  ingredientInfo: Record<string, Ingredient>;
  imageSize: number;
  textSize: number;
}

const IngredientDisplay: React.FC<IngredientDisplayProps> = ({ 
  categories, 
  ingredientInfo,
  imageSize,
  textSize
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Filter ingredients by selected category
  const filteredIngredients = Object.entries(ingredientInfo).filter(([name, info]) => {
    if (selectedCategory === 'All') return true;
    return info.category === selectedCategory;
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
          filteredIngredients.map(([name, info]) => (
            <div key={name} className="ingredient-card">
              <div 
                className="ingredient-image"
                style={{ width: `${imageSize}px`, height: `${imageSize}px` }}
              >
                <img 
                  src={`/images/${info.image}`} 
                  alt={name}
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
                {name}
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