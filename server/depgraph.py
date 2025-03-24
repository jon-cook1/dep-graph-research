import json
import ast
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

def sterilize_graph(raw_graph: Dict[str, List[str]]) -> Dict[str, List[str]]:
    """
    Prune the raw graph to include only connected nodes (via output nodes)
    and remove self-dependencies.
    """
    all_nodes = get_all_nodes(raw_graph)
    used_as_dependency = set()
    for deps in raw_graph.values():
        used_as_dependency.update(deps)
    output_nodes = {n for n in all_nodes if n not in used_as_dependency}
    
    visited = set()
    queue = deque(output_nodes)
    while queue:
        node = queue.popleft()
        if node not in visited:
            visited.add(node)
            for dep in raw_graph.get(node, []):
                if dep not in visited:
                    queue.append(dep)
    sterilized = defaultdict(list)
    for var in sorted(visited):
        sterilized[var] = sorted(
            [dep for dep in raw_graph.get(var, []) if dep in visited and dep != var]
        )
    return sterilized

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
        # Do not create an edge if the target node is an input (has no dependencies)
        if not sterilized.get(target):
            continue
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


def generate_order(sterilized: Dict[str, List[str]], variable_to_node_id: Dict[str, str]) -> List[List[str]]:
    order_steps: List[List[str]] = []
    node_colors: Dict[str, str] = {}
    pruned_edges: Set[str] = set()
    edge_colors: Dict[str, str] = {}  # Track colors of all edges
    color_palette = ["#0000FF", "#FFFF00", "#00FF00", "#FFA500", "#800080"]

    def get_edge_id(source: str, target: str) -> str:
        s_id = variable_to_node_id[source]
        t_id = variable_to_node_id[target]
        return f"edge{s_id[4:]}-{t_id[4:]}"

    def record(item_id: str, color: str):
        order_steps.append([item_id, color])
        if item_id.startswith("edge"):
            edge_colors[item_id] = color

    def trace_branch(start_node: str, color: str):
        queue = deque([(start_node, None, True)])  # (current_node, incoming_edge, all_edges_current_color)
        visited = set()

        while queue:
            current_node, incoming_edge, all_edges_current = queue.popleft()
            
            # Process edge first if exists
            if incoming_edge is not None:
                if incoming_edge not in pruned_edges:
                    prev_color = edge_colors.get(incoming_edge)
                    if prev_color is not None and prev_color != color:
                        all_edges_current = False
                    if incoming_edge not in edge_colors or color == "#FF0000":
                        record(incoming_edge, color)
                        if color == "#FF0000":
                            pruned_edges.add(incoming_edge)
                else:
                    if edge_colors.get(incoming_edge) != color:
                        all_edges_current = False
            
            # Skip if already processed (except for target nodes)
            if current_node in visited and node_colors.get(current_node) != "#FF0000":
                continue
            
            # Process node coloring
            if color == "#FF0000":
                if current_node not in node_colors or node_colors.get(current_node) != "#FF0000":
                    record(variable_to_node_id[current_node], "#FF0000")
                    node_colors[current_node] = "#FF0000"
            else:
                if current_node not in node_colors:
                    is_input_node = not sterilized.get(current_node)
                    if is_input_node:
                        if all_edges_current:
                            record(variable_to_node_id[current_node], color)
                            node_colors[current_node] = color
                    else:
                        record(variable_to_node_id[current_node], color)
                        node_colors[current_node] = color
                elif node_colors[current_node] != "#FF0000":
                    if sterilized.get(current_node):
                        record(variable_to_node_id[current_node], "#FF0000")
                        node_colors[current_node] = "#FF0000"
                        
                        for child in sterilized:
                            if current_node in sterilized[child]:
                                edge_id = get_edge_id(current_node, child)
                                if edge_id not in pruned_edges:
                                    record(edge_id, "#000000")
                                    pruned_edges.add(edge_id)
                        
                        trace_branch(current_node, "#FF0000")
                        continue

            visited.add(current_node)

            if color != "#FF0000" and node_colors.get(current_node) == "#FF0000":
                pass
            else:
                for parent in sterilized.get(current_node, []):
                    edge_id = get_edge_id(parent, current_node)
                    parent_all_edges_current = all_edges_current
                    if edge_id in edge_colors:
                        if edge_colors[edge_id] != color:
                            parent_all_edges_current = False
                    elif edge_id in pruned_edges:
                        if color != "#FF0000":
                            parent_all_edges_current = False
                    queue.append((parent, edge_id, parent_all_edges_current))

    used_as_dependency = set().union(*sterilized.values()) if sterilized else set()
    output_nodes = [n for n in sterilized if n not in used_as_dependency]
    
    for idx, out_node in enumerate(output_nodes):
        if out_node not in node_colors:
            trace_branch(out_node, color_palette[idx % len(color_palette)])

    return order_steps

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
    raw_graph = {k: list(v) for k, v in visitor.graph.items()}
    sterilized = sterilize_graph(raw_graph)
    positioned_nodes, variable_to_node_id = calculate_node_positions(sterilized)
    edges = generate_edges(sterilized, variable_to_node_id)
    order = generate_order(sterilized, variable_to_node_id)
    return {
        "sterilized_graph": sterilized,
        "positioned_nodes": positioned_nodes,
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