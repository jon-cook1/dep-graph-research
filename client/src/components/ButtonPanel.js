import React from 'react';
import '../ButtonPanel.css';
import { FaPlay, FaPause } from 'react-icons/fa';

const ButtonPanel = ({ 
  onProcessCode, 
  onPlayPauseAnimation, 
  onSliderChange, 
  codeProcessed, 
  currentStep,
  totalSteps,
  isPlaying 
}) => {
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
          <div className="animation-controls">
            <button 
              className={`play-pause-button ${isPlaying ? 'playing' : ''}`} 
              onClick={onPlayPauseAnimation}
              aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
            >
              {isPlaying ? <FaPause /> : <FaPlay />}
            </button>
            
            <input
              type="range"
              min="0"
              max={totalSteps}
              value={currentStep}
              onChange={(e) => onSliderChange(parseInt(e.target.value, 10))}
              className="animation-slider"
              disabled={totalSteps === 0}
            />
            
            <span className="step-counter">
              {currentStep}/{totalSteps}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ButtonPanel;
