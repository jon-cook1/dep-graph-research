import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import ButtonPanel from './components/ButtonPanel';
import CodeEditor from './components/CodeEditor';
import GraphDisplay from './components/GraphDisplay';
import { ReactFlowProvider } from 'reactflow';
import initialCode from './initialCode.json';

function App() {
  const [code, setCode] = useState(initialCode.Original);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [order, setOrder] = useState([]);
  const [codeProcessed, setCodeProcessed] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [totalSteps, setTotalSteps] = useState(0);
  
  const editorRef = useRef(null);
  const graphRef = useRef(null);

  useEffect(() => {
    const savedCode = localStorage.getItem('code');
    if (savedCode) {
      setCode(savedCode);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('code', code);
  }, [code]);

  useEffect(() => {
    if (order && order.length) {
      setTotalSteps(order.length); // One step per item in order
    } else {
      setTotalSteps(0);
    }
  }, [order]);

  const handleProcessCode = async () => {
    try {
      const response = await fetch('http://localhost:5001/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ Original: code }),
      });
      
      if (!response.ok) {
        const err = await response.json();
        console.error('Error from backend:', err.error);
        return;
      }
      
      const result = await response.json();
      setNodes(result.nodes);
      setEdges(result.edges || []);
      setOrder(result.order);
      setCodeProcessed(true);
      setCurrentStep(0); // Start at step 0 (no coloring)
      setIsPlaying(false);
    } catch (error) {
      console.error('Error processing code:', error);
    }
  };

  const handlePlayPauseAnimation = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      // If we're at the end, start over
      if (currentStep >= totalSteps) {
        setCurrentStep(0);
      }
      setIsPlaying(true);
    }
  };
  
  const handleSliderChange = (step) => {
    setCurrentStep(step);
    if (graphRef.current) {
      graphRef.current.goToStep(step);
    }
  };
  
  // Update current step when animation plays
  useEffect(() => {
    if (isPlaying && graphRef.current) {
      const interval = setInterval(() => {
        setCurrentStep((prevStep) => {
          const nextStep = graphRef.current.goToNextStep();
          
          // If we're at the end of the animation, stop playing
          if (nextStep === prevStep && prevStep === totalSteps) {
            setIsPlaying(false);
            clearInterval(interval);
          }
          
          return nextStep;
        });
      }, 500);
      
      return () => clearInterval(interval);
    }
  }, [isPlaying, totalSteps]);

  return (
    <div className="app-container">
      <ButtonPanel
        onProcessCode={handleProcessCode}
        onPlayPauseAnimation={handlePlayPauseAnimation}
        onSliderChange={handleSliderChange}
        currentStep={currentStep}
        totalSteps={totalSteps}
        isPlaying={isPlaying}
        codeProcessed={codeProcessed}
      />

      <div className="content-container">
        <div className="editor-section">
          <CodeEditor
            code={code}
            setCode={setCode}
            editorRef={editorRef}
          />
        </div>

        <div className="graph-section">
          <ReactFlowProvider>
            <GraphDisplay
              ref={graphRef}
              nodes={nodes}
              edges={edges}
              order={order}
              editorRef={editorRef}
              currentStep={currentStep}
              isPlaying={isPlaying}
            />
          </ReactFlowProvider>
        </div>
      </div>
    </div>
  );
}

export default App;
