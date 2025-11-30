import React from 'react';
import './TipsDisplay.css';
import { TipObject } from '../utils/dataUtils';

interface TipsDisplayProps {
  tips: (string | TipObject)[];
  tipIcon?: string;
}

const TipsDisplay: React.FC<TipsDisplayProps> = ({ tips, tipIcon = "💡" }) => {
  if (!tips || tips.length === 0) {
    return <div className="no-tips">No tips available at the moment.</div>;
  }

  return (
    <div className="tips-display">
      <h2>Site Tips</h2>
      <div className="tips-grid">
        {tips.map((tip, index) => {
          const tipText = typeof tip === 'string' ? tip : tip.text;
          const currentIcon = typeof tip === 'object' && tip.icon ? tip.icon : tipIcon;
          
          return (
            <div key={index} className="tip-card">
              <div className="tip-icon">{currentIcon}</div>
              <div className="tip-content">{tipText}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TipsDisplay;

