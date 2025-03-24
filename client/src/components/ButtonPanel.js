import React from 'react';
import '../ButtonPanel.css';

const ButtonPanel = ({ onProcessCode, onTabChange, activeTab, onRerunAnimation, onToggleNoColor, codeProcessed }) => {
  return (
    <div className="button-panel">
      <div className="tab-buttons">
        <button
          className={`tab-button ${activeTab === 'Original' ? 'active' : ''}`}
          onClick={() => onTabChange('Original')}
        >
          Original
        </button>
        {codeProcessed && (
          <button
            className={`tab-button ${activeTab === 'Decomposed' ? 'active' : ''}`}
            onClick={() => onTabChange('Decomposed')}
          >
            Decomposed
          </button>
        )}
      </div>

      {codeProcessed && (
        <div className="no-color-toggle">
          <label htmlFor="noColorSlider">Disable Line Color</label>
          <input
            type="checkbox"
            id="noColorSlider"
            onChange={onToggleNoColor}
          />
        </div>
      )}

      <button className="process-button" onClick={onProcessCode}>
        Process Code
      </button>
      
      {codeProcessed && (
        <button className="rerun-button" onClick={onRerunAnimation}>
          Rerun Animation
        </button>
      )}
    </div>
  );
};

export default ButtonPanel;
