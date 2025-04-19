import React, { useState, useEffect } from 'react';
import './SubQuiz.css';
import { Sub, Ingredient, extractSandwichNumber, cleanSandwichName } from '../utils/dataUtils';

interface SubQuizProps {
  allSubs: Sub[];
  ingredientInfo: Record<string, Ingredient>;
  categories: string[];
  onExit?: () => void; // Add prop for exit callback
}

type QuizMode = 'guess-ingredients' | 'guess-sub' | 'guess-number' | 'guess-sub-by-number';

interface IngredientSelectionState {
  [ingredient: string]: boolean;
}

const SubQuiz: React.FC<SubQuizProps> = ({ allSubs, ingredientInfo, categories, onExit }) => {
  // Quiz modes
  const [quizMode, setQuizMode] = useState<QuizMode>('guess-ingredients');
  const [currentSub, setCurrentSub] = useState<Sub | null>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<IngredientSelectionState>({});
  const [showResults, setShowResults] = useState<boolean>(false);
  const [score, setScore] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 });
  
  // Category filtering
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortAlphabetically, setSortAlphabetically] = useState<boolean>(false);
  
  // Sub guessing options
  const [subOptions, setSubOptions] = useState<string[]>([]);
  const [selectedSubOption, setSelectedSubOption] = useState<string | null>(null);
  
  // Number guessing options
  const [numberOptions, setNumberOptions] = useState<string[]>([]);
  const [selectedNumberOption, setSelectedNumberOption] = useState<string | null>(null);
  
  // Get a random sub for the quiz
  const getRandomSub = () => {
    if (allSubs.length === 0) return null;
    
    // For number-based quizzes, we need subs with numbers
    if (quizMode === 'guess-number' || quizMode === 'guess-sub-by-number') {
      const subsWithNumbers = allSubs.filter(sub => extractSandwichNumber(sub.name) !== null);
      if (subsWithNumbers.length === 0) return null;
      const randomIndex = Math.floor(Math.random() * subsWithNumbers.length);
      return subsWithNumbers[randomIndex];
    } else {
      const randomIndex = Math.floor(Math.random() * allSubs.length);
      return allSubs[randomIndex];
    }
  };
  
  // Initialize the quiz with a random sub
  const initializeQuiz = () => {
    const newSub = getRandomSub();
    if (!newSub) return;
    
    setCurrentSub(newSub);
    setShowResults(false);
    
    // Reset ingredient selections
    const initialIngredientState: IngredientSelectionState = {};
    Object.keys(ingredientInfo).forEach(ingredient => {
      initialIngredientState[ingredient] = false;
    });
    setSelectedIngredients(initialIngredientState);
    
    // Generate options based on quiz type
    if (quizMode === 'guess-sub') {
      generateSubOptions(newSub);
    } else if (quizMode === 'guess-number') {
      generateNumberOptions(newSub);
    } else if (quizMode === 'guess-sub-by-number') {
      generateSubOptions(newSub);
    }
    
    setSelectedSubOption(null);
    setSelectedNumberOption(null);
  };
  
  // Generate options for sub guessing
  const generateSubOptions = (correctSub: Sub) => {
    const correctName = correctSub.name;
    
    // Get incorrect options
    const otherSubs = allSubs
      .filter(sub => sub.name !== correctName)
      .map(sub => sub.name);
    
    // Select 3 random incorrect options
    const randomOptions: string[] = [];
    for (let i = 0; i < 3 && otherSubs.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * otherSubs.length);
      randomOptions.push(otherSubs[randomIndex]);
      otherSubs.splice(randomIndex, 1);
    }
    
    // Add correct option and shuffle
    const finalOptions = [...randomOptions, correctName];
    setSubOptions(shuffleArray(finalOptions));
  };
  
  // Generate options for number guessing
  const generateNumberOptions = (correctSub: Sub) => {
    const correctNumber = extractSandwichNumber(correctSub.name);
    if (!correctNumber) return;
    
    // Get all numbers from subs
    const allNumbers = allSubs
      .map(sub => extractSandwichNumber(sub.name))
      .filter(num => num !== null) as string[];
    
    // Remove the correct answer
    const incorrectNumbers = allNumbers.filter(num => num !== correctNumber);
    
    // Select 3 random incorrect options
    const randomOptions: string[] = [];
    for (let i = 0; i < 3 && incorrectNumbers.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * incorrectNumbers.length);
      randomOptions.push(incorrectNumbers[randomIndex]);
      incorrectNumbers.splice(randomIndex, 1);
    }
    
    // Add correct option and shuffle
    const finalOptions = [...randomOptions, correctNumber];
    setNumberOptions(shuffleArray(finalOptions));
  };
  
  // Shuffle an array
  const shuffleArray = (array: string[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };
  
  // Exit fullscreen when changing quiz mode
  const handleModeChange = (mode: QuizMode) => {
    setQuizMode(mode);
    setScore({ correct: 0, total: 0 });
  };
  
  // Handle ingredient selection
  const handleIngredientClick = (ingredient: string) => {
    if (showResults) return;
    
    setSelectedIngredients(prev => ({
      ...prev,
      [ingredient]: !prev[ingredient]
    }));
  };
  
  // Check if an ingredient is correctly selected
  const isIngredientCorrect = (ingredient: string): string | null => {
    if (!showResults) return null;
    
    const isSelected = selectedIngredients[ingredient];
    const isCorrectIngredient = currentSub?.ingredients.includes(ingredient) || false;
    
    // Return a status string instead of just true/false
    if (isSelected && isCorrectIngredient) {
      return 'correct'; // Correctly selected an ingredient that belongs
    } else if (!isSelected && !isCorrectIngredient) {
      return 'none'; // Correctly NOT selected an ingredient that doesn't belong
    } else if (!isSelected && isCorrectIngredient) {
      return 'missing'; // Missing - should have been selected
    } else {
      return 'extra'; // Extra - selected but shouldn't have been
    }
  };
  
  // Submit answers and show results
  const handleSubmit = () => {
    if (!currentSub) return;
    
    setShowResults(true);
    
    let correctAnswers = 0;
    let totalAnswers = 0;
    
    if (quizMode === 'guess-ingredients') {
      // Check ingredients against correct ones
      const correctIngredients = currentSub.ingredients;
      const selectedCount = Object.values(selectedIngredients).filter(selected => selected).length;
      
      // If user selected exactly the right ingredients, they get a point
      if (
        selectedCount === correctIngredients.length &&
        correctIngredients.every(ingredient => selectedIngredients[ingredient]) &&
        Object.entries(selectedIngredients)
          .filter(([_, isSelected]) => isSelected)
          .every(([ingredient, _]) => correctIngredients.includes(ingredient))
      ) {
        correctAnswers = 1;
      }
      
      // Each sub counts as one point in total
      totalAnswers = 1;
    } else if (quizMode === 'guess-sub') {
      // Check sub selection
      if (selectedSubOption === currentSub.name) {
        correctAnswers = 1;
      }
      totalAnswers = 1;
    } else if (quizMode === 'guess-number') {
      // Check number selection
      const correctNumber = extractSandwichNumber(currentSub.name);
      if (selectedNumberOption === correctNumber) {
        correctAnswers = 1;
      }
      totalAnswers = 1;
    } else if (quizMode === 'guess-sub-by-number') {
      // Check sub selection
      if (selectedSubOption === currentSub.name) {
        correctAnswers = 1;
      }
      totalAnswers = 1;
    }
    
    setScore(prev => ({
      correct: prev.correct + correctAnswers,
      total: prev.total + totalAnswers
    }));
  };
  
  // Handle sub option selection
  const handleSubOptionSelect = (subName: string) => {
    if (showResults) return;
    setSelectedSubOption(subName);
  };
  
  // Handle number option selection
  const handleNumberOptionSelect = (numberOption: string) => {
    if (showResults) return;
    setSelectedNumberOption(numberOption);
  };
  
  // Find sub object by name
  const findSubByName = (name: string) => {
    return allSubs.find(sub => sub.name === name);
  };
  
  // Get filtered and sorted ingredients
  const getFilteredIngredients = (): string[] => {
    // Filter by category
    const filteredIngredients = Object.entries(ingredientInfo)
      .filter(([_, info]) => selectedCategory === 'All' || info.category === selectedCategory)
      .map(([name]) => name);
    
    // Sort by category then alphabetically or just alphabetically
    if (sortAlphabetically) {
      return filteredIngredients.sort((a, b) => a.localeCompare(b));
    } else {
      return filteredIngredients.sort((a, b) => {
        // First sort by category
        const catA = ingredientInfo[a].category;
        const catB = ingredientInfo[b].category;
        const catCompare = catA.localeCompare(catB);
        
        // If categories are the same, sort alphabetically
        if (catCompare === 0) {
          return a.localeCompare(b);
        }
        return catCompare;
      });
    }
  };
  
  // Initialize on component mount
  useEffect(() => {
    initializeQuiz();
  }, [quizMode]);
  
  // Add and remove body class to prevent scrolling
  useEffect(() => {
    document.body.classList.add('quiz-active');
    document.documentElement.classList.add('quiz-active');
    
    return () => {
      document.body.classList.remove('quiz-active');
      document.documentElement.classList.remove('quiz-active');
    };
  }, []);
  
  // If there are no subs, show an empty state
  if (allSubs.length === 0) {
    return (
      <div className="sub-quiz empty-state">
        <p className="empty-quiz">No sandwiches available for quiz.</p>
      </div>
    );
  }
  
  // Check if currentSub is null before rendering
  if (!currentSub) {
    return (
      <div className="sub-quiz empty-state">
        <p className="empty-quiz">Loading quiz...</p>
      </div>
    );
  }
  
  // Regular layout
  return (
    <div className={`sub-quiz ${showResults ? 'showing-results' : ''}`}>
      <div className="compact-header">
        <div className="back-button-container">
          <button className="quiz-back-button" onClick={onExit}>
            &larr; Back
          </button>
        </div>
      
        <div className="quiz-question">
          <h3>
            {quizMode === 'guess-ingredients' && `What ingredients are in: ${currentSub.name}?`}
            {quizMode === 'guess-sub' && 'Which sandwich contains these ingredients?'}
            {quizMode === 'guess-number' && `What is the number of: ${cleanSandwichName(currentSub.name)}?`}
            {quizMode === 'guess-sub-by-number' && `Which sandwich has number #${extractSandwichNumber(currentSub.name)}?`}
          </h3>
        </div>
        
        <div className="compact-controls">
          <div className="quiz-score">
            Score: {score.correct}/{score.total}
          </div>
        </div>
        
        <div className="quiz-compact-controls">
          <div className="quiz-mode-selector">
            <button 
              className={quizMode === 'guess-ingredients' ? 'active' : ''} 
              onClick={() => handleModeChange('guess-ingredients')}
            >
              Guess Ingredients
            </button>
            <button 
              className={quizMode === 'guess-sub' ? 'active' : ''} 
              onClick={() => handleModeChange('guess-sub')}
            >
              Guess Sub Name
            </button>
            <button 
              className={quizMode === 'guess-number' ? 'active' : ''} 
              onClick={() => handleModeChange('guess-number')}
            >
              Guess Sub Number
            </button>
            <button 
              className={quizMode === 'guess-sub-by-number' ? 'active' : ''} 
              onClick={() => handleModeChange('guess-sub-by-number')}
            >
              Guess Sub by Number
            </button>
          </div>
        </div>
      </div>
      
      {quizMode === 'guess-ingredients' && (
        <>
          <div className="ingredient-filters">
            <div className="category-filter">
              <label htmlFor="category-filter-compact">Category:</label>
              <select 
                id="category-filter-compact" 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="All">All</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            <div className="sort-toggle">
              <input 
                type="checkbox" 
                id="sort-alpha-compact"
                checked={sortAlphabetically}
                onChange={() => setSortAlphabetically(!sortAlphabetically)}
              />
              <label htmlFor="sort-alpha-compact">Sort Alphabetically</label>
            </div>
          </div>
          
          <div className="quiz-ingredients">
            {getFilteredIngredients().map(ingredient => {
              const info = ingredientInfo[ingredient];
              const ingredientStatus = isIngredientCorrect(ingredient);
              const shouldHighlight = showResults && (ingredientStatus === 'correct' || ingredientStatus === 'missing' || ingredientStatus === 'extra');
              
              return (
                <button
                  key={ingredient}
                  className={`
                    ingredient-card 
                    ${selectedIngredients[ingredient] ? 'selected' : ''}
                    ${shouldHighlight ? ingredientStatus : ''}
                  `}
                  onClick={() => handleIngredientClick(ingredient)}
                  disabled={showResults}
                >
                  {info.image && (
                    <div className="ingredient-image">
                      <img 
                        src={`/images/${info.image}`} 
                        alt={ingredient}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/icon.png';
                          target.onerror = null;
                        }}
                      />
                    </div>
                  )}
                  <span className="ingredient-name">{ingredient}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
      
      {quizMode === 'guess-sub' && (
        <>
          <div className="current-ingredients guess-sub-mode">
            <div className="quiz-ingredients-display">
              {currentSub.ingredients.map(ingredient => {
                const info = ingredientInfo[ingredient];
                return (
                  <div key={ingredient} className="ingredient-card static">
                    {info && info.image && (
                      <div className="ingredient-image">
                        <img 
                          src={`/images/${info.image}`} 
                          alt={ingredient}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/icon.png';
                            target.onerror = null;
                          }}
                        />
                      </div>
                    )}
                    <span className="ingredient-name">{ingredient}</span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="sub-options-grid">
            {subOptions.map(subName => {
              const sub = findSubByName(subName);
              return (
                <button
                  key={subName}
                  className={`
                    sub-option
                    ${selectedSubOption === subName ? 'selected' : ''}
                    ${showResults && subName === currentSub.name ? 'correct' : ''}
                    ${showResults && selectedSubOption === subName && subName !== currentSub.name ? 'incorrect' : ''}
                  `}
                  onClick={() => handleSubOptionSelect(subName)}
                  disabled={showResults}
                >
                  <div className="sub-option-content">
                    {sub && sub.image && (
                      <div className="sub-option-image">
                        <img 
                          src={`/images/${sub.image}`} 
                          alt={subName}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/icon.png';
                            target.onerror = null;
                          }}
                        />
                      </div>
                    )}
                    <span className="sub-option-name">{subName}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
      
      {quizMode === 'guess-number' && (
        <>
          <div className="current-ingredients guess-sub-mode">
            <div className="sandwich-info">
              <h3>{cleanSandwichName(currentSub.name)}</h3>
              {currentSub.image && (
                <div className="sandwich-image large-thumbnail">
                  <img 
                    src={`/images/${currentSub.image}`} 
                    alt={currentSub.name}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/icon.png';
                      target.onerror = null;
                    }}
                  />
                </div>
              )}
            </div>
          </div>
          
          <div className="number-options-grid">
            {numberOptions.map(numberOption => (
              <button
                key={numberOption}
                className={`
                  number-option
                  ${selectedNumberOption === numberOption ? 'selected' : ''}
                  ${showResults && numberOption === extractSandwichNumber(currentSub.name) ? 'correct' : ''}
                  ${showResults && selectedNumberOption === numberOption && numberOption !== extractSandwichNumber(currentSub.name) ? 'incorrect' : ''}
                `}
                onClick={() => handleNumberOptionSelect(numberOption)}
                disabled={showResults}
              >
                <div className="number-option-content">
                  <span className="number-option-value">#{numberOption}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
      
      {quizMode === 'guess-sub-by-number' && (
        <>
          <div className="current-ingredients guess-sub-mode">
            <h3>Sandwich Number: #{extractSandwichNumber(currentSub.name)}</h3>
          </div>
          
          <div className="sub-options-grid">
            {subOptions.map(subName => {
              const sub = findSubByName(subName);
              return (
                <button
                  key={subName}
                  className={`
                    sub-option
                    ${selectedSubOption === subName ? 'selected' : ''}
                    ${showResults && subName === currentSub.name ? 'correct' : ''}
                    ${showResults && selectedSubOption === subName && subName !== currentSub.name ? 'incorrect' : ''}
                  `}
                  onClick={() => handleSubOptionSelect(subName)}
                  disabled={showResults}
                >
                  <div className="sub-option-content">
                    {sub && sub.image && (
                      <div className="sub-option-image">
                        <img 
                          src={`/images/${sub.image}`} 
                          alt={subName}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/icon.png';
                            target.onerror = null;
                          }}
                        />
                      </div>
                    )}
                    <span className="sub-option-name">{cleanSandwichName(subName)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
      
      {!showResults ? (
        <button 
          className="submit-button"
          onClick={handleSubmit}
          disabled={(quizMode === 'guess-sub' || quizMode === 'guess-sub-by-number') && !selectedSubOption ||
                  quizMode === 'guess-number' && !selectedNumberOption}
        >
          Submit Answer
        </button>
      ) : (
        <div className="quiz-result-actions">
          <div className="quiz-result">
            {quizMode === 'guess-ingredients' && (
              <>
                <p>
                  Results for {currentSub.name}:
                </p>
                <div className="ingredient-results">
                  <div className="result-category">
                    <span className="result-heading correct">Correct Ingredients:</span>
                    <ul className="result-list correct">
                      {currentSub.ingredients
                        .filter(ingredient => selectedIngredients[ingredient])
                        .map(ingredient => (
                          <li key={ingredient}>{ingredient}</li>
                        ))}
                    </ul>
                  </div>
                  
                  <div className="result-category">
                    <span className="result-heading missing">Missing Ingredients:</span>
                    <ul className="result-list missing">
                      {currentSub.ingredients
                        .filter(ingredient => !selectedIngredients[ingredient])
                        .map(ingredient => (
                          <li key={ingredient}>{ingredient}</li>
                        ))}
                    </ul>
                  </div>
                  
                  <div className="result-category">
                    <span className="result-heading extra">Extra Ingredients Selected:</span>
                    <ul className="result-list extra">
                      {Object.entries(selectedIngredients)
                        .filter(([ingredient, isSelected]) => isSelected && !currentSub.ingredients.includes(ingredient))
                        .map(([ingredient]) => (
                          <li key={ingredient}>{ingredient}</li>
                        ))}
                    </ul>
                  </div>
                </div>
              </>
            )}
            
            {quizMode === 'guess-sub' && (
              <p>
                The correct answer is: 
                <span className="correct-sub">{currentSub.name}</span>
              </p>
            )}
            
            {quizMode === 'guess-number' && (
              <p>
                The correct number is: 
                <span className="correct-sub">#{extractSandwichNumber(currentSub.name)}</span>
              </p>
            )}
            
            {quizMode === 'guess-sub-by-number' && (
              <p>
                The correct sandwich is: 
                <span className="correct-sub">{cleanSandwichName(currentSub.name)}</span>
              </p>
            )}
          </div>
          
          <button 
            className="next-question-btn"
            onClick={initializeQuiz}
          >
            Next Question
          </button>
        </div>
      )}
    </div>
  );
};

export default SubQuiz; 