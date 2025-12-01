import React, { useState, useEffect, useMemo, useRef } from 'react';
import './SubQuiz.css';
import { Sub, Ingredient, SubData, extractSandwichNumber, cleanSandwichName, getCategoryOrder } from '../utils/dataUtils';

interface SubQuizProps {
  allSubs: Sub[];
  subData: SubData;
  ingredientInfo: Record<string, Ingredient>;
  categories: string[];
  onExit?: () => void; // Add prop for exit callback
  score: { correct: number; total: number };
  setScore: React.Dispatch<React.SetStateAction<{ correct: number; total: number }>>;
}

  type QuizMode = 'guess-ingredients' | 'guess-sub' | 'guess-number' | 'guess-sub-by-number' | 'what-is-missing';

interface IngredientSelectionState {
  [ingredient: string]: boolean;
}

interface GroupedIngredient {
  baseName: string;
  variants: string[];
  category: string;
  image: string;
  is_lto: boolean;
}

const SubQuiz: React.FC<SubQuizProps> = ({ allSubs, subData, ingredientInfo, categories, onExit, score, setScore }) => {
  // Quiz modes
  const [quizMode, setQuizMode] = useState<QuizMode>('guess-ingredients');
  const [currentSub, setCurrentSub] = useState<Sub | null>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<IngredientSelectionState>({});
  const [showResults, setShowResults] = useState<boolean>(false);
  const [activePopover, setActivePopover] = useState<string | null>(null);
  
  // Sub Category filtering
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>([]);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const categoryMenuRef = useRef<HTMLDivElement>(null);

  // Initialize selected sub categories
  useEffect(() => {
    if (Object.keys(subData).length > 0 && selectedSubCategories.length === 0) {
      setSelectedSubCategories(Object.keys(subData));
    }
  }, [subData]);

  // Handle clicking outside category menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target as Node)) {
        setShowCategoryMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter subs based on selected categories
  const filteredSubs = useMemo(() => {
    if (selectedSubCategories.length === 0) return [];
    return Object.entries(subData)
      .filter(([category]) => selectedSubCategories.includes(category))
      .flatMap(([, subs]) => subs);
  }, [subData, selectedSubCategories]);

  // Category filtering (Ingredients)
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortAlphabetically, setSortAlphabetically] = useState<boolean>(false);
  
  // Sub guessing options
  const [subOptions, setSubOptions] = useState<string[]>([]);
  const [selectedSubOption, setSelectedSubOption] = useState<string | null>(null);
  
  // Number guessing options
  const [numberOptions, setNumberOptions] = useState<string[]>([]);
  const [selectedNumberOption, setSelectedNumberOption] = useState<string | null>(null);

  // Missing ingredient options
  const [missingIngredient, setMissingIngredient] = useState<string | null>(null);
  const [missingOptions, setMissingOptions] = useState<string[]>([]);
  const [selectedMissingOption, setSelectedMissingOption] = useState<string | null>(null);

  // Zoom state
  const [zoomLevel, setZoomLevel] = useState<number>(() => {
    const saved = localStorage.getItem('subQuizZoom');
    return saved ? parseFloat(saved) : 1.0;
  });

  // Group ingredients by base name
  const groupedIngredients = useMemo(() => {
    const groups: Record<string, GroupedIngredient> = {};

    Object.entries(ingredientInfo).forEach(([key, info]) => {
      // Normalize name: remove " xN" suffix
      const baseName = key.replace(/ x\d+$/, '');
      
      if (!groups[baseName]) {
        groups[baseName] = {
          baseName,
          variants: [],
          category: info.category,
          image: info.image,
          is_lto: !!info.is_lto
        };
      }
      
      groups[baseName].variants.push(key);
      
      // If the current key is the base name, update info to ensure accuracy
      if (key === baseName) {
        groups[baseName].category = info.category;
        groups[baseName].image = info.image;
        groups[baseName].is_lto = !!info.is_lto;
      }
    });

    // Sort variants: Base first, then x2, x3...
    Object.values(groups).forEach(group => {
      group.variants.sort((a, b) => {
        if (a === group.baseName) return -1;
        if (b === group.baseName) return 1;
        return a.localeCompare(b, undefined, { numeric: true });
      });
    });

    return Object.values(groups);
  }, [ingredientInfo]);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(Math.round((prev + 0.1) * 10) / 10, 2.0)); // Cap at 2x
  const handleZoomOut = () => setZoomLevel(prev => Math.max(Math.round((prev - 0.1) * 10) / 10, 0.5)); // Floor at 0.5x
  const handleResetZoom = () => setZoomLevel(1.0);
  
  // Get a random sub for the quiz
  const getRandomSub = () => {
    const pool = filteredSubs.length > 0 ? filteredSubs : allSubs;
    if (pool.length === 0) return null;
    
    // For number-based quizzes, we need subs with numbers
    if (quizMode === 'guess-number' || quizMode === 'guess-sub-by-number') {
      const subsWithNumbers = pool.filter(sub => extractSandwichNumber(sub.name) !== null);
      if (subsWithNumbers.length === 0) return null;
      const randomIndex = Math.floor(Math.random() * subsWithNumbers.length);
      return subsWithNumbers[randomIndex];
    } else {
      const randomIndex = Math.floor(Math.random() * pool.length);
      return pool[randomIndex];
    }
  };
  
  // Initialize the quiz with a random sub
  const initializeQuiz = () => {
    // If we're changing filters, we might want to re-roll even if we have a current sub?
    // Actually, usually we call this for "Next Question".
    // If filteredSubs changed, we might be in an invalid state if we don't re-roll, 
    // but this function is imperative.
    
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
    setActivePopover(null);
    
    // Generate options based on quiz type
    if (quizMode === 'guess-sub') {
      generateSubOptions(newSub);
    } else if (quizMode === 'guess-number') {
      generateNumberOptions(newSub);
    } else if (quizMode === 'guess-sub-by-number') {
      generateSubOptions(newSub);
    } else if (quizMode === 'what-is-missing') {
      // Select a random missing ingredient
      if (newSub.ingredients.length > 0) {
        const randomIndex = Math.floor(Math.random() * newSub.ingredients.length);
        const missing = newSub.ingredients[randomIndex];
        setMissingIngredient(missing);
        generateMissingIngredientOptions(missing, newSub.ingredients);
      }
    }
    
    setSelectedSubOption(null);
    setSelectedNumberOption(null);
    setSelectedMissingOption(null);
  };
  
  // Generate options for missing ingredient
  const generateMissingIngredientOptions = (correctIngredient: string, currentIngredients: string[]) => {
    // Get all available ingredients
    const allIngredients = Object.keys(ingredientInfo);
    
    // Filter out ingredients that are already in the sub (including the correct one)
    // We want distractors that are NOT in the sub
    const possibleDistractors = allIngredients.filter(ing => !currentIngredients.includes(ing));
    
    // Select 3 random distractors
    const randomOptions: string[] = [];
    for (let i = 0; i < 3 && possibleDistractors.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * possibleDistractors.length);
      randomOptions.push(possibleDistractors[randomIndex]);
      possibleDistractors.splice(randomIndex, 1);
    }
    
    // Add correct option and shuffle
    const finalOptions = [...randomOptions, correctIngredient];
    setMissingOptions(shuffleArray(finalOptions));
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
  };
  
  // Handle ingredient selection
  const handleIngredientClick = (groupBaseName: string, variant?: string) => {
    if (showResults) return;
    
    const group = groupedIngredients.find(g => g.baseName === groupBaseName);
    if (!group) return;

    // If variant is provided (from popover)
    if (variant) {
        const newSelected = { ...selectedIngredients };
        
        // Clear all variants of this group
        group.variants.forEach(v => delete newSelected[v]);

        // If not clearing, select the specific variant (Radio behavior)
        if (variant !== '__CLEAR__') {
            newSelected[variant] = true;
        }

        setSelectedIngredients(newSelected);
        setActivePopover(null);
        return;
    }

    // Main card click
    if (group.variants.length > 1) {
        // Toggle popover
        setActivePopover(activePopover === groupBaseName ? null : groupBaseName);
    } else {
        // Single variant - toggle directly
        const singleVariant = group.variants[0];
        setSelectedIngredients(prev => ({
            ...prev,
            [singleVariant]: !prev[singleVariant]
        }));
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
    } else if (quizMode === 'what-is-missing') {
      // Check missing ingredient selection
      if (selectedMissingOption === missingIngredient) {
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
  
  // Handle missing option selection
  const handleMissingOptionSelect = (option: string) => {
    if (showResults) return;
    setSelectedMissingOption(option);
  };

  // Find sub object by name
  const findSubByName = (name: string) => {
    return allSubs.find(sub => sub.name === name);
  };
  
  // Get filtered and sorted ingredients
  const getFilteredIngredients = (): GroupedIngredient[] => {
    // Filter by category
    const filtered = groupedIngredients
      .filter(group => {
        if (selectedCategory === 'All') return true;
        if (selectedCategory === 'LTO') return group.is_lto;
        return group.category === selectedCategory;
      });
    
    // Sort by category then alphabetically or just alphabetically
    return filtered.sort((a, b) => {
      if (sortAlphabetically) {
        return a.baseName.localeCompare(b.baseName);
      } else {
        // First sort by category
        // If it's an LTO item, treat it as "LTO" category for sorting
        const catA = a.is_lto ? "LTO" : a.category;
        const catB = b.is_lto ? "LTO" : b.category;
        
        const catCompare = getCategoryOrder(catA) - getCategoryOrder(catB);
        
        // If categories are the same, sort alphabetically
        if (catCompare === 0) {
          return a.baseName.localeCompare(b.baseName);
        }
        return catCompare;
      }
    });
  };
  
  // Initialize on component mount
  useEffect(() => {
    // Only initialize if we have categories selected or if it's the first run
    // filteredSubs will be empty initially until useEffect runs, but allSubs is there.
    // We should wait for selectedSubCategories to be populated if subData is present.
    if (Object.keys(subData).length > 0 && selectedSubCategories.length === 0) return;
    
    initializeQuiz();
  }, [quizMode, selectedSubCategories]); // Re-run when categories change
  
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
    <div 
      className={`sub-quiz ${showResults ? 'showing-results' : ''}`}
      style={{
        transform: `scale(${zoomLevel})`,
        transformOrigin: 'top left',
        width: `${100 / zoomLevel}vw`,
        height: `${100 / zoomLevel}dvh`
      }}
    >
      <div className="compact-header">
        <div className="back-button-container" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="quiz-back-button" onClick={onExit}>
            &larr; Back
          </button>
          
          <div className="sub-category-filter" ref={categoryMenuRef} style={{ position: 'relative' }}>
            <button 
              className="quiz-back-button" 
              onClick={() => setShowCategoryMenu(!showCategoryMenu)}
              title="Filter Sub Categories"
            >
              ⚙️ Filter
            </button>
            
            {showCategoryMenu && (
              <div className="category-dropdown-menu" style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                backgroundColor: '#333',
                border: '1px solid #555',
                borderRadius: '4px',
                padding: '0.5rem',
                zIndex: 1000,
                width: '200px',
                boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                marginTop: '0.2rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem', borderBottom: '1px solid #444', paddingBottom: '0.3rem' }}>
                    <button 
                        style={{ background: 'none', border: 'none', color: '#4285f4', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}
                        onClick={() => setSelectedSubCategories(Object.keys(subData))}
                    >
                        Select All
                    </button>
                </div>
                
                {Object.keys(subData).map(category => (
                  <div key={category} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <input 
                      type="checkbox" 
                      id={`cat-${category}`} 
                      checked={selectedSubCategories.includes(category)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSubCategories(prev => [...prev, category]);
                        } else {
                          // Prevent deselecting the last item
                          if (selectedSubCategories.length > 1) {
                            setSelectedSubCategories(prev => prev.filter(c => c !== category));
                          }
                        }
                      }}
                      style={{ marginRight: '0.5rem' }}
                      disabled={!selectedSubCategories.includes(category) ? false : (selectedSubCategories.length <= 1)}
                    />
                    <label htmlFor={`cat-${category}`} style={{ color: 'white', fontSize: '0.9rem', cursor: 'pointer', flex: 1 }}>{category}</label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      
        <div className="quiz-question">
          <h3>
            {quizMode === 'guess-ingredients' && `What ingredients are in: ${currentSub.name}?`}
            {quizMode === 'guess-sub' && 'Which sandwich contains these ingredients?'}
            {quizMode === 'guess-number' && `What is the number of: ${cleanSandwichName(currentSub.name)}?`}
            {quizMode === 'guess-sub-by-number' && `Which sandwich has number #${extractSandwichNumber(currentSub.name)}?`}
            {quizMode === 'what-is-missing' && `What ingredient is missing from: ${currentSub.name}?`}
          </h3>
        </div>
        
        <div className="compact-controls">
          <button 
            className="score-reset-button" 
            onClick={() => setScore({ correct: 0, total: 0 })}
            title="Reset Score"
            style={{ marginRight: '8px', background: 'none', border: '1px solid #666', color: '#aaa', borderRadius: '4px', cursor: 'pointer', padding: '2px 6px', fontSize: '0.8rem' }}
          >
            Reset
          </button>
          <div className="quiz-score">
            Score: {score.correct}/{score.total}
          </div>
          <div className="zoom-controls">
            <button onClick={handleZoomOut} title="Zoom Out" className="zoom-btn">-</button>
            <button onClick={handleResetZoom} title="Reset Zoom" className="zoom-btn reset">R</button>
            <button onClick={handleZoomIn} title="Zoom In" className="zoom-btn">+</button>
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
            <button 
              className={quizMode === 'what-is-missing' ? 'active' : ''} 
              onClick={() => handleModeChange('what-is-missing')}
            >
              What's Missing?
            </button>
          </div>
        </div>
      </div>
      
      <div className="quiz-scroll-area">
      {quizMode === 'guess-ingredients' && (
        <>
          {!showResults ? (
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
                {getFilteredIngredients().map(group => {
                  const isSelected = group.variants.some(v => selectedIngredients[v]);
                  const selectedVariant = group.variants.find(v => selectedIngredients[v]);
                  
                  // Determine display badge
                  let badge = null;
                  if (isSelected) {
                     if (selectedVariant && selectedVariant !== group.baseName) {
                        badge = selectedVariant.replace(group.baseName, '').trim();
                     } 
                     // Only show checkmark if it's the base name, otherwise the quantity is enough
                     // But if the badge is empty (e.g. selectedVariant === baseName), show check
                     if (!badge) badge = '✓';
                  }

                  return (
                    <div 
                        key={group.baseName} 
                        className="ingredient-card-wrapper" 
                        style={{ position: 'relative', height: '100%' }}
                    >
                        {activePopover === group.baseName && (
                            <div className="ingredient-popover">
                                <button 
                                    className={`popover-option ${!isSelected ? 'selected' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleIngredientClick(group.baseName, '__CLEAR__');
                                    }}
                                >
                                    0
                                </button>
                                {group.variants.map(variant => {
                                    // Label: if variant is just "Bacon" (base), show "1x" or "Reg"
                                    // If "Bacon x2", show "x2"
                                    let variantLabel = variant === group.baseName ? "1x" : variant.replace(group.baseName, '').trim();
                                    if (!variantLabel) variantLabel = "1x";

                                    return (
                                        <button 
                                            key={variant}
                                            className={`popover-option ${selectedIngredients[variant] ? 'selected' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleIngredientClick(group.baseName, variant);
                                            }}
                                        >
                                            {variantLabel}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        <button
                          className={`
                            ingredient-card 
                            ${isSelected ? 'selected' : ''}
                          `}
                          onClick={() => handleIngredientClick(group.baseName)}
                          style={{ width: '100%', height: '100%' }}
                        >
                          {group.image && (
                            <div className="ingredient-image">
                              <img 
                                src={`/images/${group.image}`} 
                                alt={group.baseName}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = '/icon.png';
                                  target.onerror = null;
                                }}
                              />
                            </div>
                          )}
                          <span className="ingredient-name">
                            {group.baseName}
                            {group.is_lto && <span className="lto-star">★</span>}
                          </span>
                          {badge && <span className="ingredient-badge">{badge}</span>}
                        </button>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="quiz-results-container">
               <div className="result-section">
                  <h4 className="result-heading correct">Correct Ingredients</h4>
                  <div className="quiz-ingredients result-grid">
                    {currentSub.ingredients
                      .filter(ingredient => selectedIngredients[ingredient])
                      .map(ingredient => {
                        const info = ingredientInfo[ingredient];
                        return (
                          <div key={ingredient} className="ingredient-card correct static">
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
                            <span className="ingredient-name">
                              {ingredient}
                              {info.is_lto && <span className="lto-star">★</span>}
                            </span>
                          </div>
                        );
                      })}
                      {currentSub.ingredients.filter(ingredient => selectedIngredients[ingredient]).length === 0 && (
                        <p className="empty-result-message">None</p>
                      )}
                  </div>
               </div>

               <div className="result-section">
                  <h4 className="result-heading missing">Missing Ingredients</h4>
                  <div className="quiz-ingredients result-grid">
                    {currentSub.ingredients
                      .filter(ingredient => !selectedIngredients[ingredient])
                      .map(ingredient => {
                        const info = ingredientInfo[ingredient];
                        return (
                          <div key={ingredient} className="ingredient-card missing static">
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
                            <span className="ingredient-name">
                              {ingredient}
                              {info.is_lto && <span className="lto-star">★</span>}
                            </span>
                          </div>
                        );
                      })}
                      {currentSub.ingredients.filter(ingredient => !selectedIngredients[ingredient]).length === 0 && (
                        <p className="empty-result-message">None</p>
                      )}
                  </div>
               </div>

               <div className="result-section">
                  <h4 className="result-heading extra">Extra Ingredients Selected</h4>
                  <div className="quiz-ingredients result-grid">
                    {Object.entries(selectedIngredients)
                      .filter(([ingredient, isSelected]) => isSelected && !currentSub.ingredients.includes(ingredient))
                      .map(([ingredient]) => {
                        const info = ingredientInfo[ingredient];
                        return (
                          <div key={ingredient} className="ingredient-card extra static">
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
                            <span className="ingredient-name">
                              {ingredient}
                              {info.is_lto && <span className="lto-star">★</span>}
                            </span>
                          </div>
                        );
                      })}
                      {Object.entries(selectedIngredients)
                        .filter(([ingredient, isSelected]) => isSelected && !currentSub.ingredients.includes(ingredient)).length === 0 && (
                        <p className="empty-result-message">None</p>
                      )}
                  </div>
               </div>
            </div>
          )}
        </>
      )}
      
      {quizMode === 'guess-sub' && (
        <>
          <div className="current-ingredients guess-sub-mode">
            <div className="quiz-ingredients-display">
              {[...currentSub.ingredients]
                .sort((a, b) => {
                  const infoA = ingredientInfo[a];
                  const infoB = ingredientInfo[b];
                  
                  if (!infoA || !infoB) return a.localeCompare(b);
                  
                  const catA = infoA.is_lto ? "LTO" : infoA.category;
                  const catB = infoB.is_lto ? "LTO" : infoB.category;
                  
                  const catCompare = getCategoryOrder(catA) - getCategoryOrder(catB);
                  
                  if (catCompare === 0) {
                    return a.localeCompare(b);
                  }
                  return catCompare;
                })
                .map(ingredient => {
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
                    <span className="ingredient-name">
                      {ingredient}
                      {info && info.is_lto && <span className="lto-star">★</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="sub-options-grid">
            {subOptions.map(subName => {
              return (
                <button
                  key={subName}
                  className={`
                    sub-option text-only
                    ${selectedSubOption === subName ? 'selected' : ''}
                    ${showResults && subName === currentSub.name ? 'correct' : ''}
                    ${showResults && selectedSubOption === subName && subName !== currentSub.name ? 'incorrect' : ''}
                  `}
                  onClick={() => handleSubOptionSelect(subName)}
                  disabled={showResults}
                >
                  <div className="sub-option-content">
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
            <div className="sandwich-info horizontal-layout">
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
          
          <div className="sub-options-grid">
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

      {quizMode === 'what-is-missing' && (
        <>
          <div className="current-ingredients guess-sub-mode">
            <div className="quiz-ingredients-display">
              {[...currentSub.ingredients]
                .filter(ing => ing !== missingIngredient) // Exclude the missing one
                .sort((a, b) => {
                  const infoA = ingredientInfo[a];
                  const infoB = ingredientInfo[b];
                  
                  if (!infoA || !infoB) return a.localeCompare(b);
                  
                  const catA = infoA.is_lto ? "LTO" : infoA.category;
                  const catB = infoB.is_lto ? "LTO" : infoB.category;
                  
                  const catCompare = getCategoryOrder(catA) - getCategoryOrder(catB);
                  
                  if (catCompare === 0) {
                    return a.localeCompare(b);
                  }
                  return catCompare;
                })
                .map(ingredient => {
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
                    <span className="ingredient-name">
                      {ingredient}
                      {info && info.is_lto && <span className="lto-star">★</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="sub-options-grid ingredients-options">
            {missingOptions.map(option => {
              const info = ingredientInfo[option];
              return (
                <button
                  key={option}
                  className={`
                    sub-option ingredient-option
                    ${selectedMissingOption === option ? 'selected' : ''}
                    ${showResults && option === missingIngredient ? 'correct' : ''}
                    ${showResults && selectedMissingOption === option && option !== missingIngredient ? 'incorrect' : ''}
                  `}
                  onClick={() => handleMissingOptionSelect(option)}
                  disabled={showResults}
                >
                  <div className="sub-option-content">
                    {info && info.image && (
                      <div className="sub-option-image ingredient-image-small">
                        <img 
                          src={`/images/${info.image}`} 
                          alt={option}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/icon.png';
                            target.onerror = null;
                          }}
                        />
                      </div>
                    )}
                    <span className="sub-option-name">{option}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
      </div>

      {!showResults ? (
        <button 
          className="submit-button"
          onClick={handleSubmit}
          disabled={
            (quizMode === 'guess-sub' || quizMode === 'guess-sub-by-number') && !selectedSubOption ||
            quizMode === 'guess-number' && !selectedNumberOption ||
            quizMode === 'what-is-missing' && !selectedMissingOption
          }
        >
          Submit Answer
        </button>
      ) : (
        <div className="quiz-result-actions">
            {quizMode === 'guess-ingredients' && (
            <div className="quiz-result">
              {(() => {
                const correctIngredients = currentSub.ingredients;
                const selectedCount = Object.values(selectedIngredients).filter(selected => selected).length;
                const isCorrect = 
                  selectedCount === correctIngredients.length &&
                  correctIngredients.every(ingredient => selectedIngredients[ingredient]) &&
                  Object.entries(selectedIngredients)
                    .filter(([_, isSelected]) => isSelected)
                    .every(([ingredient, _]) => correctIngredients.includes(ingredient));
                
                return (
                  <p>
                    {currentSub.name} <span style={{ color: isCorrect ? '#4caf50' : '#f44336', fontWeight: 'bold' }}>
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  </p>
                );
              })()}
          </div>
          )}
          
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