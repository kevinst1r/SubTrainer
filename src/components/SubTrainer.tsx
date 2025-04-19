import React, { useState, useEffect } from 'react';
import './SubTrainer.css';
import { SubData, INGREDIENT_INFO, INGREDIENT_CATEGORIES, GENERAL_TIPS, loadSortingConfig } from '../utils/dataUtils';
import SubList from './SubList';
import IngredientDisplay from './IngredientDisplay';
import SubDetails from './SubDetails';
import SubQuiz from './SubQuiz';

interface SubTrainerProps {
  subData: SubData;
}

const SubTrainer: React.FC<SubTrainerProps> = ({ subData }) => {
  const [activeTab, setActiveTab] = useState<string>('subList');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortingConfig, setSortingConfig] = useState({
    sort_mode: "category",
    ingredient_image_size: 64,
    ui_text_size: 20,
    ingredient_text_size: 15
  });
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [randomTip, setRandomTip] = useState<string>('');

  // Load sorting configuration on component mount
  useEffect(() => {
    const fetchSortingConfig = async () => {
      try {
        const config = await loadSortingConfig();
        setSortingConfig(config);
      } catch (error) {
        console.error('Error loading sorting config:', error);
      }
    };
    
    fetchSortingConfig();
    
    // Set a random tip
    const randomIndex = Math.floor(Math.random() * GENERAL_TIPS.length);
    setRandomTip(GENERAL_TIPS[randomIndex]);
  }, []);

  // Functions to handle sub selection
  const handleSubSelect = (subName: string) => {
    setSelectedSub(subName);
  };
  
  // Handler for exiting quiz mode
  const handleExitQuiz = () => {
    setActiveTab('subList');
  };

  // Flattened list of all subs for easy access
  const allSubs = Object.values(subData).flat();
  
  // Find selected sub object
  const selectedSubObject = allSubs.find(sub => sub.name === selectedSub);

  // Merge all categories into a single array for display
  const allCategories = Object.keys(subData);

  // Generate list of subs based on selected category
  const filteredSubs = selectedCategory === 'All' 
    ? allSubs 
    : allSubs.filter(sub => {
        // Match by category name
        if (Object.keys(subData).includes(selectedCategory)) {
          return subData[selectedCategory].includes(sub);
        }
        return false;
      });

  return (
    <div className="sub-trainer">
      <div className="trainer-tabs">
        <button 
          className={activeTab === 'subList' ? 'active' : ''}
          onClick={() => setActiveTab('subList')}
        >
          Sub List
        </button>
        <button 
          className={activeTab === 'ingredients' ? 'active' : ''}
          onClick={() => setActiveTab('ingredients')}
        >
          Ingredients
        </button>
        <button 
          className={activeTab === 'quiz' ? 'active' : ''}
          onClick={() => setActiveTab('quiz')}
        >
          Quiz
        </button>
      </div>
      
      <div className="tip-container">
        <div className="tip">
          <p>💡 <strong>Tip:</strong> {randomTip}</p>
        </div>
      </div>

      <div className="category-selector">
        <label htmlFor="category">Category:</label>
        <select 
          id="category" 
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="All">All</option>
          {allCategories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      <div className="trainer-content">
        {activeTab === 'subList' && (
          <SubList 
            subs={filteredSubs} 
            selectedSub={selectedSub}
            onSubSelect={handleSubSelect}
          />
        )}
        
        {activeTab === 'ingredients' && (
          <IngredientDisplay 
            categories={INGREDIENT_CATEGORIES}
            ingredientInfo={INGREDIENT_INFO}
            imageSize={sortingConfig.ingredient_image_size}
            textSize={sortingConfig.ingredient_text_size}
          />
        )}
        
        {activeTab === 'quiz' && (
          <SubQuiz 
            allSubs={allSubs}
            ingredientInfo={INGREDIENT_INFO}
            categories={INGREDIENT_CATEGORIES}
            onExit={handleExitQuiz}
          />
        )}

        {activeTab !== 'quiz' && activeTab !== 'ingredients' && selectedSubObject && (
          <SubDetails 
            sub={selectedSubObject} 
          />
        )}
      </div>
    </div>
  );
};

export default SubTrainer; 