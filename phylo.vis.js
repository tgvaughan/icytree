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

	var treeHeight = this.tree.root.height;

	// Position leaves
	var leaves = this.tree.getLeafList();
	for (var i=0; i<leaves.length; i++) {
	    this.nodePositions[leaves[i]] = [
		i/(leaves.length-1),
		leaves[i].height/treeHeight
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
		node.height/treeHeight
	    ];

	    return xpos;
	}
	positionInternals(this.tree.root, this.nodePositions);

	return this;
    }},

    // Visualize tree on SVG object
    // Currently assumes landscape, rectangular style.
    // Need to generalise.
    display: {value: function(width, height) {

	var xmargin = 0.05*width;
	var ymargin = 0.05*height;

	var NS="http://www.w3.org/2000/svg";

	// Create SVG element:
	var svg = document.createElementNS(NS, "svg");
	svg.setAttribute('width', width);
	svg.setAttribute('height', height);
	svg.setAttribute("id", "SVG");

	// Create border:
	var border = document.createElementNS(NS, "rect");
	border.setAttribute('width', width);
	border.setAttribute('height', height);
	border.setAttribute('fill', "none");
	border.setAttribute('stroke', "gray");
	border.setAttribute("stroke-width", "1");
	svg.appendChild(border);

	// Draw axis:

	// Draw tree:

	function nodePosXform(nodePos) {
	    var xpos = (1-nodePos[1])*(width - 2*xmargin) + xmargin;
	    var ypos = (1-nodePos[0])*(height - 2*ymargin) + ymargin;
	    return [xpos, ypos];
	}
	
	for (var i=0; i<this.tree.getNodeList().length; i++) {
	    var thisNode = this.tree.getNodeList()[i];
	    var thisPos = nodePosXform(this.nodePositions[thisNode]);

	    if (!thisNode.isRoot()) {
		var parentPos = nodePosXform(this.nodePositions[thisNode.parent]);
		var line = document.createElementNS(NS, "line");
		line.setAttribute("x1", thisPos[0]);
		line.setAttribute("y1", thisPos[1]);
		line.setAttribute("x2", parentPos[0]);
		line.setAttribute("y2", thisPos[1]);
		line.setAttribute("stroke", "black");
		line.setAttribute("stroke-width", "2");
		svg.appendChild(line);

		line = document.createElementNS(NS, "line");
		line.setAttribute("x1", parentPos[0]);
		line.setAttribute("y1", thisPos[1]);
		line.setAttribute("x2", parentPos[0]);
		line.setAttribute("y2", parentPos[1]);
		line.setAttribute("stroke", "black");
		line.setAttribute("stroke-width", "2");
		svg.appendChild(line);
	    }
	}

	return svg;
    }}
});

