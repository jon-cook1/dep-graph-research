import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import ButtonPanel from './components/ButtonPanel';
import CodeEditor from './components/CodeEditor';
import GraphDisplay from './components/GraphDisplay';
import { ReactFlowProvider } from 'reactflow';
//import { initialNodes, initialEdges, order } from './graphElements';
import initialCode from './initialCode.json';

function App() {
  const [buffers, setBuffers] = useState({
    Original: initialCode.Original,
    Decomposed: '',
  });
  const [activeTab, setActiveTab] = useState('Original');
  const [noColor, setNoColor] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [order, setOrder] = useState([]);
  const [codeProcessed, setCodeProcessed] = useState(false);
  const editorRef = useRef(null);
  const graphRef = useRef(null);

  useEffect(() => {
    const savedOriginal = localStorage.getItem('Original');
    setBuffers((prevBuffers) => ({
      ...prevBuffers,
      Original: savedOriginal || initialCode.Original,
      Decomposed: '',
    }));
  }, []);

  useEffect(() => {
    localStorage.setItem('Original', buffers.Original);
  }, [buffers.Original]);

  // Updated handleProcessCode to call the backend
  const handleProcessCode = async () => {
    const code = buffers.Original;
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
      // Update state with the nodes and edges received from the backend
      setNodes(result.nodes);
      setEdges(result.edges);
      setOrder(result.order);
      // Optionally update the decomposed code if desired.
      setBuffers((prevBuffers) => ({
        ...prevBuffers,
        Decomposed: '', // You may choose to display additional information here
      }));
      setCodeProcessed(true);
    } catch (error) {
      console.error('Error processing code:', error);
    }
  };

  const handleRerunAnimation = () => {
    if (graphRef.current) {
      graphRef.current.resetGraphColors();
    }
  };

  const handleToggleNoColor = () => {
    setNoColor((prevNoColor) => !prevNoColor);
  };

  return (
    <div className="app-container">
      <ButtonPanel
        onProcessCode={handleProcessCode}
        onTabChange={setActiveTab}
        activeTab={activeTab}
        onRerunAnimation={handleRerunAnimation}
        onToggleNoColor={handleToggleNoColor}
        codeProcessed={codeProcessed}
      />

      <div className="content-container">
        <div className="editor-section">
          <CodeEditor
            code={buffers[activeTab]}
            setCode={(newCode) =>
              setBuffers((prevBuffers) => ({
                ...prevBuffers,
                [activeTab]: newCode,
              }))
            }
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
              activeTab={activeTab}
              noColor={noColor}
            />
          </ReactFlowProvider>
        </div>
      </div>
    </div>
  );
}

export default App;
