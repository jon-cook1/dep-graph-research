import React, { useEffect, useCallback, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import ReactFlow, { useNodesState, useEdgesState, useReactFlow } from 'reactflow';
import 'reactflow/dist/style.css';
import { applyStyles } from '../utils/GraphUtils';
// Removed: ace import since highlighting logic is disabled

const GraphDisplay = forwardRef(
  ({ nodes: initialNodes, edges: initialEdges, order, editorRef, activeTab, noColor }, ref) => {
    const [nodes, setNodesState, onNodesChange] = useNodesState([]);
    const [edges, setEdgesState, onEdgesChange] = useEdgesState([]);
    const { fitView } = useReactFlow();
    const animationTimeoutRef = useRef([]);
    // Removed: activeTabRef, markerIdsRef, colorClassesRef, savedHighlightsRef, savedDecompHighlightsRef, temporaryHighlightsRef
    // const activeTabRef = useRef(activeTab);
    // const markerIdsRef = useRef([]);
    // const colorClassesRef = useRef(new Map());
    // const savedHighlightsRef = useRef([]);
    // const savedDecompHighlightsRef = useRef([]);
    // const temporaryHighlightsRef = useRef([]);

    const noColorRef = useRef(noColor);
    const [coloringStarted, setColoringStarted] = useState(false);

    // Removed: createColorClass, clearHighlights, applyHighlights, applyHighlightsForTab functions

    // Updated: handleNodeClick now does nothing regarding highlighting.
    const handleNodeClick = useCallback(
      (node) => {
        // No highlighting logic for node clicks.
      },
      []
    );

    useEffect(() => {
      if (initialNodes && initialNodes.length && initialEdges && initialEdges.length) {
        const { styledNodes, styledEdges } = applyStyles(initialNodes, initialEdges);
        setNodesState(styledNodes);
        setEdgesState(styledEdges);
        fitView();
      }
    }, [initialNodes, initialEdges, setNodesState, setEdgesState, fitView]);

    // Color animation logic remains.
    const runColorAnimation = useCallback(() => {
      if (!order || !order.length) return;

      animationTimeoutRef.current.forEach(clearTimeout);
      animationTimeoutRef.current = [];
      // Removed: savedHighlightsRef, savedDecompHighlightsRef, and temporaryHighlightsRef resets

      let delay = 1000; 

      order.forEach(([id, color]) => {
        animationTimeoutRef.current.push(
          setTimeout(() => {
            setNodesState((nds) =>
              nds.map((node) => {
                if (node.id === id) {
                  // Removed: any highlighting-related logic.
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
                      strokeWidth: 6,
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

        // Removed: clearHighlights call
      },
    }));

    // Removed: useEffect handling activeTab and applying highlights.
    // useEffect(() => {
    //   activeTabRef.current = activeTab;
    //   applyHighlightsForTab(activeTab);
    // }, [activeTab, applyHighlightsForTab]);

    useEffect(() => {
      if (nodes.length && edges.length && !coloringStarted) {
        runColorAnimation();
        setColoringStarted(true);
      }
    }, [nodes, edges, runColorAnimation, coloringStarted]);

    // Removed: useEffect handling noColor changes for highlights.
    // useEffect(() => {
    //   noColorRef.current = noColor;
    //   if (noColor) {
    //     clearHighlights();
    //   } else {
    //     applyHighlightsForTab(activeTab);
    //   }
    // }, [noColor, applyHighlightsForTab, clearHighlights, activeTab]);

    return (
      <div className="graph-display">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          onNodeClick={(_, node) => handleNodeClick(node)} // Node click now does nothing regarding highlighting.
        />
      </div>
    );
  }
);

export default GraphDisplay;
