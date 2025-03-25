// Base styles shared across all node types
const baseNodeStyle = {
  borderRadius: '50%',
  width: 120,
  height: 120,
  textAlign: 'center',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontSize: '14px',
  fontWeight: '500',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  transition: 'background 0.3s ease, transform 0.2s ease',
};

// Node styles by type
export const nodeStyles = {
  custominput: {
    ...baseNodeStyle,
    background: '#D3D3D3',
    color: '#333333',
    border: '2px solid #333333',
  },
  step: {
    ...baseNodeStyle,
    background: '#D3D3D3',
    color: '#333333',
    border: 'none',
  },
  target: {
    ...baseNodeStyle,
    background: '#D3D3D3',
    color: '#333333',
    border: '2px outset #333333',
  },
  customoutput: {
    ...baseNodeStyle,
    background: '#D3D3D3',
    color: '#333333',
    border: '2px dashed #333333',
  },
};

// Edge styles by type
export const edgeStyles = {
  passing: {
    stroke: '#FF9900',
    strokeWidth: 3,
    animated: true,
    color: '#333333',
  },
  internal: {
    stroke: '#00CCAA',
    strokeWidth: 2,
    animated: false,
    color: '#333333',
  }
};

// Function to apply styles to nodes and edges based on type
export const applyStyles = (nodes, edges) => {
  const styledNodes = nodes.map((node) => ({
    ...node,
    style: {
      ...nodeStyles[node.mytype] || baseNodeStyle,
    },
  }));

  const styledEdges = edges.map((edge) => ({
    ...edge,
    style: {
      ...edgeStyles[edge.mytype] || {},
    },
  }));

  return { styledNodes, styledEdges };
};
  