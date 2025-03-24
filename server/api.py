from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from depgraph2 import process_code

app = Flask(__name__)
# Enable CORS for the /analyze endpoint from your frontend
CORS(app, resources={r"/analyze": {"origins": "http://localhost:3000"}})

@app.route('/analyze', methods=['POST', 'OPTIONS'])
@cross_origin(origins="http://localhost:3000")
def analyze():
    payload = request.get_json()
    try:
        code = payload['Original']
    except KeyError:
        return jsonify({"error": "Missing 'Original' in payload"}), 400

    try:
        result = process_code(code)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({
        "nodes": result["positioned_nodes"],
        "edges": result["edges"],
        "order": result["order"]
    })

if __name__ == '__main__':
    app.run(debug=True, port=5001)
