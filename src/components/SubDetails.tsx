import React from 'react';
import './SubDetails.css';
import { Sub, INGREDIENT_INFO } from '../utils/dataUtils';

interface SubDetailsProps {
  sub: Sub;
}

const SubDetails: React.FC<SubDetailsProps> = ({ sub }) => {
  return (
    <div className="sub-details">
      <h2>{sub.name}</h2>
      
      <div className="sub-image-container">
        <div className="sub-image">
          <img 
            src={`/images/${sub.image}`} 
            alt={sub.name}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/icon.png';
              target.onerror = null;
            }}
          />
        </div>
      </div>

      <div className="tip-box">
        <h3>Tip</h3>
        <p>{sub.tip}</p>
      </div>

      <div className="ingredients-section">
        <h3>Ingredients</h3>
        <ul className="ingredients-list">
          {sub.ingredients.map((ingredient, index) => (
            <li key={`${ingredient}-${index}`} className="ingredient-item">
              <div className="ingredient-icon">
                {INGREDIENT_INFO[ingredient] && (
                  <img 
                    src={`/images/${INGREDIENT_INFO[ingredient].image}`} 
                    alt={ingredient}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/icon.png';
                      target.onerror = null;
                    }}
                  />
                )}
              </div>
              <span className="ingredient-name">{ingredient}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SubDetails; 