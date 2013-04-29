// Tree layout object
var Layout = Object.create({}, {
    tree: {value: undefined, writable: true, configurable: true, enumerable: true},
    nodePositions: {value: {}, writable: true, configurable: true, enumerable: true},
    colourPallet: {value: [], writable: true, configurable: true, enumerable: true},

    init: {value: function(tree) {
	this.tree = tree;
	this.colourPallet = ["blue", "red", "green", "purple"];

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
    display: {value: function(width, height, colourTrait) {

	var xmargin = 0.05*width;
	var ymargin = 0.05*height;

	var seenTraitValues = [];

	var NS="http://www.w3.org/2000/svg";

	// Create SVG element:
	var svg = document.createElementNS(NS, "svg");
	svg.setAttribute('width', width);
	svg.setAttribute('height', height);

	// Create border:
	/*
	var border = document.createElementNS(NS, "rect");
	border.setAttribute('width', width);
	border.setAttribute('height', height);
	border.setAttribute('fill', "none");
	border.setAttribute('stroke', "gray");
	border.setAttribute("stroke-width", "1");
	svg.appendChild(border);
	*/

	// Draw axis:

	// Draw tree:

	function nodePosXform(nodePos) {
	    var xpos = (1-nodePos[1])*(width - 2*xmargin) + xmargin;
	    var ypos = (1-nodePos[0])*(height - 2*ymargin) + ymargin;
	    return [xpos, ypos];
	}

	function selectColour(node, pallet) {
	    if (colourTrait == undefined)
		return "black";

	    var traitValue = node.annotation[colourTrait];
	    var idx = seenTraitValues.indexOf(traitValue);

	    if (idx<0) {
		seenTraitValues = seenTraitValues.concat(traitValue);
		idx = seenTraitValues.length-1;
	    }

	    return pallet[idx%pallet.length];
	}

	function newLine(x1,y1,x2,y2,linecol,linewidth) {
	    var line = document.createElementNS(NS, "line");
	    line.setAttribute("x1", x1);
	    line.setAttribute("y1", y1);
	    line.setAttribute("x2", x2);
	    line.setAttribute("y2", y2);
	    line.setAttribute("stroke", linecol);
	    line.setAttribute("stroke-width", linewidth);
	    return line;
	}
	
	for (var i=0; i<this.tree.getNodeList().length; i++) {
	    var thisNode = this.tree.getNodeList()[i];
	    var thisPos = nodePosXform(this.nodePositions[thisNode]);

	    if (!thisNode.isRoot()) {
		var parentPos = nodePosXform(this.nodePositions[thisNode.parent]);

		svg.appendChild(newLine(
		    thisPos[0], thisPos[1], parentPos[0], thisPos[1],
		    selectColour(thisNode, this.colourPallet), 2));
		svg.appendChild(newLine(
		    parentPos[0], thisPos[1], parentPos[0], parentPos[1],
		    selectColour(thisNode, this.colourPallet), 2));
	    }
	}

	return svg;
    }}
});

