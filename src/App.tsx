import { useState, useEffect } from 'react';
import './App.css';
import SubTrainer from './components/SubTrainer';
import { loadSubData, loadIngredientData, IngredientData } from './utils/dataUtils';

interface SubData {
  [category: string]: Array<{
    name: string;
    ingredients: string[];
    tip: string;
    image: string;
  }>;
}

function App() {
  const [subData, setSubData] = useState<SubData | null>(null);
  const [ingredientData, setIngredientData] = useState<IngredientData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subs, ingredients] = await Promise.all([
          loadSubData(),
          loadIngredientData()
        ]);
        setSubData(subs);
        setIngredientData(ingredients);
        setLoading(false);
      } catch (err) {
        setError('Failed to load data. Please try again.');
        setLoading(false);
        console.error('Error loading data:', err);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!subData || !ingredientData) {
    return <div className="error">No data available</div>;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Sub Trainer</h1>
      </header>
      <main>
        <SubTrainer subData={subData} ingredientData={ingredientData} />
      </main>
      <footer>
        <p>This site is not associated with Jimmy Johns. This is an unofficial resource.</p>
      </footer>
    </div>
  );
}

export default App; 