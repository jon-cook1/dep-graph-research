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
    } catch (error) {
      console.error('Error processing code:', error);
    }
  };

  const handleRerunAnimation = () => {
    if (graphRef.current) {
      graphRef.current.resetGraphColors();
    }
  };

  return (
    <div className="app-container">
      <ButtonPanel
        onProcessCode={handleProcessCode}
        onRerunAnimation={handleRerunAnimation}
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
            />
          </ReactFlowProvider>
        </div>
      </div>
    </div>
  );
}

export default App;
