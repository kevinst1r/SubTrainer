import React from 'react';
import './SubList.css';
import { Sub, extractSandwichNumber, cleanSandwichName } from '../utils/dataUtils';

interface SubListProps {
  subs: Sub[];
  selectedSub: string | null;
  onSubSelect: (subName: string) => void;
}

const SubList: React.FC<SubListProps> = ({ subs, selectedSub, onSubSelect }) => {
  return (
    <div className="sub-list">
      <h2>Sandwiches</h2>
      <div className="list-container">
        {subs.length === 0 ? (
          <p>No sandwiches found</p>
        ) : (
          <ul>
            {subs.map((sub) => {
              const subNumber = extractSandwichNumber(sub.name);
              const cleanName = cleanSandwichName(sub.name);
              
              return (
                <li 
                  key={sub.name}
                  className={selectedSub === sub.name ? 'selected' : ''}
                  onClick={() => onSubSelect(sub.name)}
                >
                  <div className="sub-item">
                    {subNumber && <span className="sub-number">#{subNumber}</span>}
                    <span className="sub-name">{cleanName}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SubList; 