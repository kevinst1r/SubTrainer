import React, { useState, useEffect } from 'react';
import './App.css';
import SubTrainer from './components/SubTrainer';
import { loadSubData } from './utils/dataUtils';

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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await loadSubData();
        setSubData(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load sub data. Please try again.');
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

  if (!subData) {
    return <div className="error">No sub data available</div>;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Sub Trainer</h1>
      </header>
      <main>
        <SubTrainer subData={subData} />
      </main>
      <footer>
        <p>© {new Date().getFullYear()} Sub Trainer React</p>
      </footer>
    </div>
  );
}

export default App; 