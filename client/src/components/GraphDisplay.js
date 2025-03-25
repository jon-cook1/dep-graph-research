import React, { useEffect, useCallback, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import ReactFlow, { useNodesState, useEdgesState, useReactFlow } from 'reactflow';
import 'reactflow/dist/style.css';
import { applyStyles } from '../utils/GraphUtils';

const GraphDisplay = forwardRef(
  ({ nodes: initialNodes, edges: initialEdges, order, editorRef, currentStep, isPlaying }, ref) => {
    const [nodes, setNodesState, onNodesChange] = useNodesState([]);
    const [edges, setEdgesState, onEdgesChange] = useEdgesState([]);
    const { fitView } = useReactFlow();
    const animationTimeoutRef = useRef([]);
    const animationInterval = useRef(null);
    const [animationStarted, setAnimationStarted] = useState(false);
    
    // Reset all node and edge colors to default
    const resetColors = useCallback(() => {
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
          animated: false,
          style: {
            ...edge.style,
            stroke: '#D3D3D3',
            strokeWidth: 2,
          },
        }))
      );
    }, [setNodesState, setEdgesState]);
    
    // Apply animation for a specific step
    const applyStepAnimation = useCallback((step) => {
      if (!order || !order.length || step < 0 || step > order.length) return;
      
      // Reset everything to default state
      resetColors();
      
      // If step is 0 and we don't want to show anything yet, just return
      if (step === 0) {
        return;
      }
      
      // For steps 1 and beyond, apply colors to nodes and edges
      // Step 1 = first item, Step order.length = last item
      const maxIndex = Math.min(step, order.length);
      
      for (let i = 0; i < maxIndex; i++) {
        const [id, color] = order[i];
        
        // Color nodes
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

        // Color edges - all with same width
        setEdgesState((eds) =>
          eds.map((edge) => {
            if (edge.id === id) {
              return {
                ...edge,
                animated: true,
                style: {
                  ...edge.style,
                  stroke: color,
                  strokeWidth: 3, // Fixed width for all edges
                },
              };
            }
            return edge;
          })
        );
      }
    }, [order, setNodesState, setEdgesState, resetColors]);

    // Initial setup of nodes and edges
    useEffect(() => {
      if (initialNodes && initialNodes.length) {
        const { styledNodes, styledEdges } = applyStyles(
          initialNodes, 
          initialEdges || []
        );
        setNodesState(styledNodes);
        setEdgesState(styledEdges);
        setTimeout(() => fitView(), 100);
        setAnimationStarted(false);
      }
    }, [initialNodes, initialEdges, setNodesState, setEdgesState, fitView]);

    // Run animation when playing state changes
    useEffect(() => {
      // Clear any existing animation timers
      if (animationInterval.current) {
        clearInterval(animationInterval.current);
        animationInterval.current = null;
      }
      
      if (isPlaying && order && order.length) {
        // Start animation from current step
        animationInterval.current = setInterval(() => {
          ref.current.goToNextStep();
        }, 500);
      }
      
      return () => {
        if (animationInterval.current) {
          clearInterval(animationInterval.current);
        }
      };
    }, [isPlaying, order, ref]);
    
    // Apply animation when current step changes
    useEffect(() => {
      if (order && order.length && currentStep >= 0) {
        applyStepAnimation(currentStep);
      }
    }, [currentStep, applyStepAnimation, order]);

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      resetGraphColors() {
        // Stop all animations
        if (animationInterval.current) {
          clearInterval(animationInterval.current);
          animationInterval.current = null;
        }
        
        animationTimeoutRef.current.forEach(clearTimeout);
        animationTimeoutRef.current = [];
        
        resetColors();
        setAnimationStarted(false);
      },
      
      goToStep(step) {
        if (order && step >= 0 && step <= order.length) {
          applyStepAnimation(step);
        }
      },
      
      goToNextStep() {
        if (order && currentStep < order.length) {
          return currentStep + 1;
        } else {
          // Stop animation if we reached the end
          if (animationInterval.current) {
            clearInterval(animationInterval.current);
            animationInterval.current = null;
          }
          return currentStep;
        }
      },
      
      goToPrevStep() {
        if (currentStep > 0) {
          return currentStep - 1;
        }
        return 0;
      },
      
      getTotalSteps() {
        return order ? order.length : 0;
      }
    }));

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
