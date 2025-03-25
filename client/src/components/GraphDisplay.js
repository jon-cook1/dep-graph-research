import React, { useEffect, useCallback, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import ReactFlow, { useNodesState, useEdgesState, useReactFlow } from 'reactflow';
import 'reactflow/dist/style.css';
import { applyStyles } from '../utils/GraphUtils';

const GraphDisplay = forwardRef(
  ({ nodes: initialNodes, edges: initialEdges, order, editorRef }, ref) => {
    const [nodes, setNodesState, onNodesChange] = useNodesState([]);
    const [edges, setEdgesState, onEdgesChange] = useEdgesState([]);
    const { fitView } = useReactFlow();
    const animationTimeoutRef = useRef([]);
    const [coloringStarted, setColoringStarted] = useState(false);

    useEffect(() => {
      if (initialNodes && initialNodes.length) {
        const { styledNodes, styledEdges } = applyStyles(
          initialNodes, 
          initialEdges || []
        );
        setNodesState(styledNodes);
        setEdgesState(styledEdges);
        setTimeout(() => fitView(), 100);
      }
    }, [initialNodes, initialEdges, setNodesState, setEdgesState, fitView]);

    const runColorAnimation = useCallback(() => {
      if (!order || !order.length) return;

      animationTimeoutRef.current.forEach(clearTimeout);
      animationTimeoutRef.current = [];
      
      let delay = 800; 

      order.forEach(([id, color]) => {
        animationTimeoutRef.current.push(
          setTimeout(() => {
            setNodesState((nds) =>
              nds.map((node) => {
                if (node.id === id) {
                  return {
                    ...node,
                    style: {
                      ...node.style,
                      background: color,
                    },
                  };
                }
                return node;
              })
            );

            setEdgesState((eds) =>
              eds.map((edge) => {
                if (edge.id === id) {
                  return {
                    ...edge,
                    animated: true,
                    style: {
                      ...edge.style,
                      stroke: color,
                      strokeWidth: 5,
                    },
                  };
                }
                return edge;
              })
            );
          }, delay)
        );

        delay += 500;
      });
    }, [order, setNodesState, setEdgesState]);

    useImperativeHandle(ref, () => ({
      resetGraphColors() {
        animationTimeoutRef.current.forEach(clearTimeout);
        animationTimeoutRef.current = [];

        setNodesState((nds) =>
          nds.map((node) => ({
            ...node,
            style: {
              ...node.style,
              background: '#D3D3D3',
            },
          }))
        );

        setEdgesState((eds) =>
          eds.map((edge) => ({
            ...edge,
            style: {
              ...edge.style,
              stroke: '#D3D3D3',
            },
          }))
        );

        setColoringStarted(false);
      },
    }));

    useEffect(() => {
      if (nodes.length && !coloringStarted) {
        runColorAnimation();
        setColoringStarted(true);
      }
    }, [nodes, runColorAnimation, coloringStarted]);

    return (
      <div className="graph-display">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
        />
      </div>
    );
  }
);

export default GraphDisplay;
