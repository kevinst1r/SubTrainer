import React, { useState, useEffect } from 'react';
import './SubTrainer.css';
import { SubData, IngredientData, INGREDIENT_CATEGORIES, GENERAL_TIPS, loadSortingConfig, loadSiteTips, TipObject } from '../utils/dataUtils';
import SubList from './SubList';
import IngredientDisplay from './IngredientDisplay';
import SubDetails from './SubDetails';
import SubQuiz from './SubQuiz';
import TipsDisplay from './TipsDisplay';

interface SubTrainerProps {
  subData: SubData;
  ingredientData: IngredientData;
}

const SubTrainer: React.FC<SubTrainerProps> = ({ subData, ingredientData }) => {
  const [activeTab, setActiveTab] = useState<string>('subList');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortingConfig, setSortingConfig] = useState({
    sort_mode: "category",
    ingredient_image_size: 64,
    ui_text_size: 20,
    ingredient_text_size: 15,
    tip_icon: "💡"
  });
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [randomTip, setRandomTip] = useState<string | TipObject>('');
  const [allTips, setAllTips] = useState<(string | TipObject)[]>([]);
  const [score, setScore] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 });

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
    
    // Load tips and set a random one
    const initializeTips = async () => {
      const loadedTips = await loadSiteTips();
      if (loadedTips && loadedTips.length > 0) {
        setAllTips(loadedTips);
        const randomIndex = Math.floor(Math.random() * loadedTips.length);
        setRandomTip(loadedTips[randomIndex]);
      } else {
        // Fallback
        setAllTips(GENERAL_TIPS);
        const randomIndex = Math.floor(Math.random() * GENERAL_TIPS.length);
        setRandomTip(GENERAL_TIPS[randomIndex]);
      }
    };
    initializeTips();
  }, []);

  // Helper to render random tip
  const renderRandomTip = () => {
    if (!randomTip) return null;
    const text = typeof randomTip === 'string' ? randomTip : randomTip.text;
    const icon = (typeof randomTip === 'object' && randomTip.icon) ? randomTip.icon : sortingConfig.tip_icon;
    return <p>{icon} <strong>Tip:</strong> {text}</p>;
  };

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
          return subData[selectedCategory].some(s => s.name === sub.name);
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
          className={activeTab === 'tips' ? 'active' : ''}
          onClick={() => setActiveTab('tips')}
        >
          Tips
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
          {renderRandomTip()}
        </div>
      </div>

      {activeTab !== 'ingredients' && activeTab !== 'tips' && (
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
      )}

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
            ingredientInfo={ingredientData}
            imageSize={sortingConfig.ingredient_image_size}
            textSize={sortingConfig.ingredient_text_size}
            sortMode={sortingConfig.sort_mode}
          />
        )}

        {activeTab === 'tips' && (
          <TipsDisplay tips={allTips} tipIcon={sortingConfig.tip_icon} />
        )}
        
        {activeTab === 'quiz' && (
          <SubQuiz 
            allSubs={allSubs}
            subData={subData}
            ingredientInfo={ingredientData}
            categories={INGREDIENT_CATEGORIES}
            onExit={handleExitQuiz}
            score={score}
            setScore={setScore}
          />
        )}

        {activeTab !== 'quiz' && activeTab !== 'ingredients' && activeTab !== 'tips' && selectedSubObject && (
          <SubDetails 
            sub={selectedSubObject} 
            ingredientData={ingredientData}
          />
        )}
      </div>
    </div>
  );
};

export default SubTrainer;