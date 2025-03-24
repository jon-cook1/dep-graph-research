import React, { useEffect, useCallback, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import ReactFlow, { useNodesState, useEdgesState, useReactFlow } from 'reactflow';
import 'reactflow/dist/style.css';
import { applyStyles } from '../utils/GraphUtils';
import ace from 'ace-builds';

const GraphDisplay = forwardRef(
  ({ nodes: initialNodes, edges: initialEdges, order, editorRef, activeTab, noColor }, ref) => {
    const [nodes, setNodesState, onNodesChange] = useNodesState([]);
    const [edges, setEdgesState, onEdgesChange] = useEdgesState([]);
    const { fitView } = useReactFlow();
    const animationTimeoutRef = useRef([]);
    const activeTabRef = useRef(activeTab);
    const noColorRef = useRef(noColor);
    const [coloringStarted, setColoringStarted] = useState(false);
    const markerIdsRef = useRef([]);
    const colorClassesRef = useRef(new Map());
    const savedHighlightsRef = useRef([]);
    const savedDecompHighlightsRef = useRef([]);
    const temporaryHighlightsRef = useRef([]); // Temporary highlights for clicked nodes

    const createColorClass = (color) => {
      if (!colorClassesRef.current.has(color)) {
        const className = `highlight-${color.replace('#', '')}`;
        const style = document.createElement('style');
        style.innerHTML = `
          .${className} {
            position: absolute;
            background: ${color}40;
            z-index: 20;
          }
        `;
        document.head.appendChild(style);
        colorClassesRef.current.set(color, className);
      }
      return colorClassesRef.current.get(color);
    };

    const clearHighlights = useCallback(() => {
      if (editorRef.current && editorRef.current.editor) {
        const session = editorRef.current.editor.getSession();
        markerIdsRef.current.forEach((markerId) => session.removeMarker(markerId));
        markerIdsRef.current = [];
      }
    }, [editorRef]);

    const applyHighlights = useCallback(
      (highlights) => {
        if (editorRef.current && editorRef.current.editor) {
          const session = editorRef.current.editor.getSession();
          markerIdsRef.current.forEach((markerId) => session.removeMarker(markerId));
          markerIdsRef.current = [];

          highlights.forEach(({ lineNumbers, color }) => {
            const colorClass = createColorClass(color);
            lineNumbers.forEach((line) => {
              const Range = ace.require('ace/range').Range;
              const markerId = session.addMarker(new Range(line - 1, 0, line - 1, 1), colorClass, 'fullLine');
              markerIdsRef.current.push(markerId);
            });
          });
        }
      },
      [editorRef]
    );

    const applyHighlightsForTab = useCallback(
      (currentTab) => {
        if (noColorRef.current) {
          clearHighlights();
          return;
        }

        const highlights = currentTab === 'Original' ? savedHighlightsRef.current : savedDecompHighlightsRef.current;
        applyHighlights(highlights.concat(temporaryHighlightsRef.current)); // Apply both standard and temp highlights
      },
      [applyHighlights, clearHighlights]
    );

    const handleNodeClick = useCallback(
      (node) => {
        const highlights = activeTabRef.current === 'Original' ? node.code_lines : node.decomp_code_lines;
        if (highlights) {
          // Bypass noColor setting for node-click highlights
          temporaryHighlightsRef.current = [{ lineNumbers: highlights, color: '#ffbf00' }];
          applyHighlights(temporaryHighlightsRef.current); // Directly apply highlights for clicked node
        }
      },
      [applyHighlights]
    );

    useEffect(() => {
      if (initialNodes.length && initialEdges.length) {
        const { styledNodes, styledEdges } = applyStyles(initialNodes, initialEdges);
        setNodesState(styledNodes);
        setEdgesState(styledEdges);
        fitView();
      }
    }, [initialNodes, initialEdges, setNodesState, setEdgesState, fitView]);

    const runColorAnimation = useCallback(() => {
      if (!order || !order.length) return;

      animationTimeoutRef.current.forEach(clearTimeout);
      animationTimeoutRef.current = [];
      savedHighlightsRef.current = [];
      savedDecompHighlightsRef.current = [];
      temporaryHighlightsRef.current = []; // Clear temporary highlights

      let delay = 1000; 

      order.forEach(([id, color]) => {
        animationTimeoutRef.current.push(
          setTimeout(() => {
            setNodesState((nds) =>
              nds.map((node) => {
                if (node.id === id) {
                  if (node.code_lines) {
                    savedHighlightsRef.current.push({ lineNumbers: node.code_lines, color });
                  }
                  if (node.decomp_code_lines) {
                    savedDecompHighlightsRef.current.push({ lineNumbers: node.decomp_code_lines, color });
                  }

                  if (!noColorRef.current) {
                    applyHighlightsForTab(activeTabRef.current);
                  } else {
                    clearHighlights();
                  }

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
    }, [order, setNodesState, setEdgesState, applyHighlightsForTab, clearHighlights]);

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

        clearHighlights();
      },
    }));

    useEffect(() => {
      activeTabRef.current = activeTab;
      applyHighlightsForTab(activeTab);
    }, [activeTab, applyHighlightsForTab]);

    useEffect(() => {
      if (nodes.length && edges.length && !coloringStarted) {
        runColorAnimation();
        setColoringStarted(true);
      }
    }, [nodes, edges, runColorAnimation, coloringStarted]);

    useEffect(() => {
      noColorRef.current = noColor;
      if (noColor) {
        clearHighlights();
      } else {
        applyHighlightsForTab(activeTab);
      }
    }, [noColor, applyHighlightsForTab, clearHighlights, activeTab]);

    return (
      <div className="graph-display">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          onNodeClick={(_, node) => handleNodeClick(node)} // Add node click handler
        />
      </div>
    );
  }
);

export default GraphDisplay;
