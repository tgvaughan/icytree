// Tree layout object
var Layout = Object.create({}, {
    tree: {value: undefined, writable: true, configurable: true, enumerable: true},
    nodePositions: {value: {}, writable: true, configurable: true, enumerable: true},

    init: {value: function(tree) {
	this.tree = tree;

	return this;
    }},

    // Produce a standard rectangular layout:
    standard: {value: function() {

	this.nodePositions = {};

	// Position leaves
	var leaves = this.tree.getLeafList();
	for (var i=0; i<leaves.length; i++) {
	    this.nodePositions[leaves[i]] = [
		i/(leaves.length-1),
		leaves[i].height
	    ];
	}

	// Position internal nodes
	function positionInternals(node, nodePositions) {
	    if (node.isLeaf())
		return nodePositions[node][0];

	    var xpos = 0;
	    for (var i=0; i<node.children.length; i++)
		xpos += positionInternals(node.children[i], nodePositions);

	    xpos /= node.children.length;
 
	    nodePositions[node] = [
		xpos,
		node.height
	    ];

	    return xpos;
	}
	positionInternals(this.tree.root, this.nodePositions);

	return this;
    }},

    // Visualize tree on SVG object
    display: {value: function(width, height) {

	var NS="http://www.w3.org/2000/svg";

	// Create SVG element:
	var svg = document.createElementNS(NS, "svg");
	svg.setAttribute('width', width);
	svg.setAttribute('height', height);
	svg.setAttribute("id", "SVG");

	// Create border:
	var border = document.createElementNS(NS, "rect");
	border.setAttribute('width', 100);
	border.setAttribute('height', 100);
	border.setAttribute('fill', "none");
	border.setAttribute('stroke', "gray");
	border.setAttribute("stroke-width", "2");
	svg.appendChild(border);

	return svg;
    }}
});

