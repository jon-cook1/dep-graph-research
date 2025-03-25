import json
import ast
import random
from collections import defaultdict, deque
from typing import Dict, List, Tuple, Set

SELECTED_PROGRAM = "Original"
BUILTINS = {'input', 'float', 'int', 'print', 'round', 'math'}

# ---------------------
# AST Visitors
# ---------------------

class DependencyCollector(ast.NodeVisitor):
    def __init__(self) -> None:
        self.dependencies: Set[str] = set()
    
    def visit_Name(self, node: ast.AST) -> None:
        if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load) and node.id not in BUILTINS:
            self.dependencies.add(node.id)

class AssignmentVisitor(ast.NodeVisitor):
    def __init__(self) -> None:
        self.graph: Dict[str, Set[str]] = defaultdict(set)
    
    def visit_Assign(self, node: ast.AST) -> None:
        collector = DependencyCollector()
        collector.visit(node.value)
        for target in node.targets:
            if isinstance(target, ast.Name):
                self.graph[target.id].update(collector.dependencies)

# ---------------------
# Graph Utility Functions
# ---------------------

def topological_sort(graph: Dict[str, List[str]]) -> List[str]:
    """Return a topologically sorted list of nodes from the dependency graph."""
    visited = set()
    order = []
    stack = []
    visiting = set()
    for node in graph:
        if node not in visited:
            stack.append((node, False))
            while stack:
                current, processed = stack.pop()
                if processed:
                    order.append(current)
                    visited.add(current)
                    visiting.remove(current)
                    continue
                if current in visiting:
                    raise ValueError("Cycle detected in dependency graph")
                if current in visited:
                    continue
                visiting.add(current)
                stack.append((current, True))
                for dep in reversed(graph.get(current, [])):
                    if dep not in visited:
                        stack.append((dep, False))
    return order

def get_all_nodes(raw_graph: Dict[str, List[str]]) -> Set[str]:
    """Return a set of all nodes present in the raw graph."""
    nodes = set(raw_graph.keys())
    for deps in raw_graph.values():
        nodes.update(deps)
    return nodes


def calculate_node_positions(sterilized_graph: Dict[str, List[str]]) -> Tuple[List[Dict], Dict[str, str]]:
    """
    Compute node positions for the frontend.
    Nodes on the same row are spaced 150 apart horizontally, and rows are spaced 150 vertically.
    Each node's type is determined as:
      - "customoutput" if the node is not used as a dependency,
      - "custominput" if it has no dependencies (but is not an output),
      - "step" otherwise.
    Returns a list of positioned node dictionaries and a mapping from variable to node id.
    """
    HORIZONTAL_SPACING = 150.0
    VERTICAL_SPACING = 150.0
    MAX_ITERATIONS = 10

    all_nodes = list(get_all_nodes(sterilized_graph))
    topo_order = topological_sort(sterilized_graph)
    missing_nodes = [n for n in all_nodes if n not in topo_order]
    topo_order = missing_nodes + topo_order

    # Compute depth for each node.
    depth_map = {node: 0 for node in all_nodes}
    for node in topo_order:
        if sterilized_graph.get(node):
            try:
                depth_map[node] = 1 + max(depth_map[dep] for dep in sterilized_graph[node])
            except Exception:
                depth_map[node] = 0

    depth_groups = defaultdict(list)
    node_depth = {}
    for node, depth in depth_map.items():
        depth_groups[depth].append(node)
        node_depth[node] = depth

    # Build adjacency lists (parents and children).
    upper_adj = defaultdict(list)
    lower_adj = defaultdict(list)
    for node, deps in sterilized_graph.items():
        for dep in deps:
            upper_adj[dep].append(node)
            lower_adj[node].append(dep)

    # Compute horizontal positions.
    x_positions = {}
    for depth in sorted(depth_groups.keys()):
        nodes = depth_groups[depth]
        if depth == 0:
            sorted_nodes = sorted(nodes)
        else:
            sorted_nodes = sorted(
                nodes,
                key=lambda n: sum(x_positions[d] for d in sterilized_graph[n]) / max(1, len(sterilized_graph[n]))
            )
        for idx, node in enumerate(sorted_nodes):
            x_positions[node] = (idx - len(nodes) / 2) * HORIZONTAL_SPACING

    # Refine x positions iteratively.
    for _ in range(MAX_ITERATIONS):
        for depth in sorted(depth_groups.keys(), reverse=True):
            if depth == 0:
                continue
            current_nodes = depth_groups[depth]
            node_medians = []
            for node in current_nodes:
                deps = lower_adj[node]
                if deps:
                    dep_positions = sorted(x_positions[dep] for dep in deps)
                    median = dep_positions[len(dep_positions) // 2]
                    node_medians.append((node, median))
                else:
                    node_medians.append((node, 0))
            node_medians.sort(key=lambda x: x[1])
            sorted_nodes = [n for n, _ in node_medians]
            for idx, node in enumerate(sorted_nodes):
                x_positions[node] = idx * HORIZONTAL_SPACING - (len(sorted_nodes) - 1) * HORIZONTAL_SPACING / 2

    # Determine output nodes: those not used as dependency.
    used_as_dependency = set()
    for deps in sterilized_graph.values():
        used_as_dependency.update(deps)
    output_nodes_set = {n for n in all_nodes if n not in used_as_dependency}

    positioned_nodes = []
    variable_to_node_id = {}
    counter = 1
    for var in topological_sort(sterilized_graph):
        node_id = "node" + str(counter)
        variable_to_node_id[var] = node_id

        if var in output_nodes_set:
            mytype = "customoutput"
        elif not sterilized_graph.get(var, []):
            mytype = "custominput"
        else:
            mytype = "step"

        positioned_nodes.append({
            "id": node_id,
            "mytype": mytype,
            "data": {"label": var},
            "position": {"x": x_positions[var], "y": node_depth[var] * VERTICAL_SPACING},
            "style": {"borderRadius": "50%", "width": 100, "height": 100}
        })
        counter += 1
    return positioned_nodes, variable_to_node_id

def generate_edges(sterilized: Dict[str, List[str]], variable_to_node_id: Dict[str, str]) -> List[Dict]:
    """Generate the list of edge dictionaries for the frontend.
       An edge is created only if its target node is not a custominput.
    """
    edges = []
    for target, deps in sterilized.items():
        for source in deps:
            s_id = variable_to_node_id.get(source)
            t_id = variable_to_node_id.get(target)
            if s_id and t_id:
                edge_id = "edge" + s_id.replace("node", "") + "-" + t_id.replace("node", "")
                edges.append({
                    "id": edge_id,
                    "source": s_id,
                    "target": t_id,
                    "type": "straight",
                    "style": {"stroke": "#00FFCC", "strokeWidth": 2}
                })
    return edges

def unique_color(color_palette):
    """
    If outputs exceed hardcoded 5 colors, generate as unique as possible using euclidean distance
    """
    def hex_to_rgb(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5))
    def color_dist(c1, c2): return sum((a - b) ** 2 for a, b in zip(c1, c2)) ** 0.5

    existing_rgb = [hex_to_rgb(c) for c in color_palette + ["#FF0000", "#000000"]]
    while True:
        new_color = f'#{random.randint(0, 0xFFFFFF):06X}'
        if all(color_dist(hex_to_rgb(new_color), c) > 100 for c in existing_rgb):
            return new_color

def generate_order(nodes: List[Dict], edges: List[Dict]) -> List[List[str]]:
    """
    Generate an ordered 2d list of [element (node or edge), color] to be colored
    """
    color_palette = ["#0000FF", "#FFFF00", "#00FF00", "#FFA500", "#800080"]
    
    output_nodes = []
    input_node_ids = set()
    seen = set()
    blocked_edge_ids = set()    # Stop when a black edge is reached, don't recolor target
    order = []

    for node in nodes:
        if node["mytype"] == "customoutput":
            output_nodes.append(node)
        elif node["mytype"] == "custominput":
            input_node_ids.add(node["id"])

    output_nodes.sort(key=lambda x: x["position"]["x"]) #force start left to right 

    def target_found(node):
        trace([node], "#FF0000")
        for edge in edges:
            if edge["source"] == node["id"]:
                blocked_edge_ids.add(edge["id"])
                order.append([edge["id"], "#000000"])

    def trace(start_nodes, color):
        cur_node_ids = set()    # avoid false target discovery if two nodes of same color share ancestor
       
        while start_nodes:
            next_edges = []
            for node in start_nodes:
                if color != "#FF0000" and node["id"] in seen:   # Avoid infinite recursion with target discovery
                    target_found(node)

                else: # Color node and form list of edges connecting to it
                    order.append([node["id"], color])
                    seen.add(node["id"])
                        # Use a list of lists for edge groups that share target. Allows sorting of these edges left to right
                    edge_group = []
                    for edge in edges:
                        if edge["target"] == node["id"] and edge["id"] not in blocked_edge_ids:
                            edge_group.append(edge)
                    next_edges.append(edge_group)
        
            # Generate next layer of nodes
            next_nodes = []
            for edge_group in next_edges:   
                for edge in edge_group:
                    for node in nodes:
                        if node["id"] == edge["source"]: # Leave input nodes in for sorting edge order logic
                            if node["id"] not in cur_node_ids:
                                next_nodes.append(node)
                                cur_node_ids.add(node["id"])
            
            next_nodes.sort(key=lambda x: x["position"]["x"])
            
            # Color edges before processing next layer of nodes
            for edge_group in next_edges:
                if len(edge_group) == 1:    # Node sourced by one edge
                    order.append([edge_group[0]["id"], color])
                else:   # Node sourced by multiple edges, sort to color left to right consistently
                    for node in next_nodes: # already sorted by x position, use to determine edge color order
                        for edge in edge_group:
                            if edge["source"] == node["id"]:
                                order.append([edge["id"], color])
                                
            new_start = []
            for node in next_nodes:
                if node["id"] not in input_node_ids:    # Remove input nodes from coloring logic
                    new_start.append(node)
            start_nodes = new_start

    # Ensure enough unique colors exist
    if len(output_nodes) > len(color_palette):
        for i in range(len(output_nodes - len(color_palette))):
            color_palette.append(unique_color(color_palette))

    # Reverse BFS from each output node
    for node, color in zip(output_nodes, color_palette):
        trace([node], color)
    return order

# ---------------------
# Main Process Function
# ---------------------

def process_code(code: str) -> Dict:
    """
    Process the provided Python code and return a dictionary containing:
      - 'sterilized_graph': The dependency graph after pruning.
      - 'positioned_nodes': Nodes with computed positions and types.
      - 'edges': Edge definitions.
      - 'order': Animation order for nodes and edges.
    """
    tree = ast.parse(code)
    visitor = AssignmentVisitor()
    visitor.visit(tree)
    graph = {k: list(v) for k, v in visitor.graph.items()}
    nodes, variable_to_node_id = calculate_node_positions(graph)
    edges = generate_edges(graph, variable_to_node_id)
    order = generate_order(nodes, edges)

    return {
        "sterilized_graph": graph,
        "positioned_nodes": nodes,
        "edges": edges,
        "order": order
    }

# ---------------------
# Test Runner
# ---------------------

if __name__ == "__main__":
    with open('code.json') as f:
        data = json.load(f)
    try:
        code = data["programs"][SELECTED_PROGRAM]
    except KeyError:
        print(f"Error: Program '{SELECTED_PROGRAM}' not found")
        exit(1)
    result = process_code(code)
    print("Sterilized Dependency Graph:")
    print(json.dumps(result["sterilized_graph"], indent=2))
    print("\nNodes:")
    for node in result["positioned_nodes"]:
        print(node)
    print("\nEdges:")
    for edge in result["edges"]:
        print(edge)
    print("\nOrder:")
    for step in result["order"]:
        print(step)