import React from 'react';
import '../ButtonPanel.css';

const ButtonPanel = ({ onProcessCode, onRerunAnimation, codeProcessed }) => {
  return (
    <div className="button-panel">
      <div className="title">
        <h2>Dependency Graph Analyzer</h2>
      </div>

      <div className="controls">
        <button className="process-button" onClick={onProcessCode}>
          Process Code
        </button>
        
        {codeProcessed && (
          <button className="rerun-button" onClick={onRerunAnimation}>
            Rerun Animation
          </button>
        )}
      </div>
    </div>
  );
};

export default ButtonPanel;
