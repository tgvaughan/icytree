// Tree layout object
var Layout = Object.create({}, {
    tree: {value: undefined, writable: true, configurable: true, enumerable: true},
    nodePositions: {value: {}, writable: true, configurable: true, enumerable: true},

    width: {value: 640, writable: true, configurable: true, enumerable: true},
    height: {value: 480, writable: true, configurable: true, enumerable: true},

    colourTrait: {value: undefined, writable: true, configurable: true, enumerable: true},
    colourPallet: {value: ["blue", "red", "green", "purple"],
		   writable: true, configurable: true, enumerable: true},

    tipTextTrait: {value: "label", writable: true, configurable: true, enumerable: true},
    nodeTextTrait: {value: undefined, writable: true, configurable: true, enumerable: true},

    axis: {value: false, writable: true, configurable: true, enumerable: true},
    minAxisTicks: {value: 5, writable: true, configurable: true, enumerable: true},

    init: {value: function(tree) {
	this.tree = tree;
	return this;
    }},

    // Produce a standard rectangular layout:
    standard: {value: function() {

	this.nodePositions = {};

	var treeHeight = this.tree.root.height;
	var treeWidth;

	// Position leaves
	var leaves = this.tree.getLeafList();

	if (leaves.length === 1) {
	    // Special case for single-leaf trees
	    this.nodePositions[leaves[0]] = [
		0.5,
		leaves[0].height/treeHeight
	    ];
	    treeWidth = 1.0;
	} else {
	    for (var i=0; i<leaves.length; i++) {
		this.nodePositions[leaves[i]] = [
		    i/(leaves.length-1),
		    leaves[i].height/treeHeight
		];
	    }
	    treeWidth = leaves.length-1;
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
    display: {value: function() {

	// Save this for inline functions:
	var savedThis = this;

	// Margins are 5% of total dimension.
	var xmargin = 0.05*this.width;
	var ymargin = 0.05*this.height;

	function posXform(treePos) {
	    var xpos = (1-treePos[1])*(savedThis.width - 2*xmargin) + xmargin;
	    var ypos = (1-treePos[0])*(savedThis.height - 2*ymargin) + ymargin;
	    return [xpos, ypos];
	}

	// Create SVG element:
	var NS="http://www.w3.org/2000/svg";
	var svg = document.createElementNS(NS, "svg");
	svg.setAttribute("xmlns", NS);
	svg.setAttribute("version","1.1");
	svg.setAttribute('width', this.width);
	svg.setAttribute('height', this.height);

	// Draw axis:
	if (this.axis) {
	    
	    // Select number of ticks:
	    var treeHeight = this.tree.root.height;
	    var maxDelta = treeHeight/(this.minAxisTicks-1);
	    var deltaT = Math.pow(10,Math.floor(Math.log(maxDelta)/Math.log(10)))

	    // Function for drawing one tick:
	    function axisLine(thisT) {
		var thisH = thisT/treeHeight;
		var bot = [posXform([0, thisH])[0], savedThis.height];
		var top = [posXform([0, thisH])[0], 0];
		console.log(bot + " " + top);
		
		var axLine = document.createElementNS(NS, "line");
		axLine.setAttribute("x1", bot[0]);
		axLine.setAttribute("y1", bot[1]);
		axLine.setAttribute("x2", top[0]);
		axLine.setAttribute("y2", top[1]);
		axLine.setAttribute("stroke", "gray");
		axLine.setAttribute("stroke-width", 1);
		svg.appendChild(axLine);

		var axLabel = document.createElementNS(NS, "text");
		axLabel.setAttribute("x", bot[0]);
		axLabel.setAttribute("y", bot[1]);
		axLabel.setAttribute("fill", "gray");
		axLabel.textContent = thisT;
		svg.appendChild(axLabel);
	    }

	    // Draw ticks:
	    var t = 0;
	    while (t <= treeHeight) {
		axisLine(t);
		console.log(t);
		t += deltaT;
	    }
	    
	}

	// Draw tree:

	var seenColourTraitValues = [];

	function selectColour(node, pallet) {
	    if (savedThis.colourTrait === undefined)
		return "black";

	    var traitValue = node.annotation[savedThis.colourTrait];
	    var idx = seenColourTraitValues.indexOf(traitValue);

	    if (idx<0) {
		seenColourTraitValues = seenColourTraitValues.concat(traitValue);
		idx = seenColourTraitValues.length-1;
	    }

	    return pallet[idx%pallet.length];
	}

	function newBranch(childPos, parentPos, linecol, linewidth) {
	    var pathStr = "M " + childPos[0] + " " + childPos[1];
	    pathStr += " H " + parentPos[0];
	    pathStr += " V" + parentPos[1];
	    var path = document.createElementNS(NS, "path");
	    path.setAttribute("d", pathStr);
	    path.setAttribute("fill", "none");
	    path.setAttribute("stroke", linecol);
	    path.setAttribute("stroke-width", linewidth);
	    svg.appendChild(path);
	}


	// Draw tree edges:
	
	for (var i=0; i<this.tree.getNodeList().length; i++) {
	    var thisNode = this.tree.getNodeList()[i];
	    var thisPos = posXform(this.nodePositions[thisNode]);

	    if (!thisNode.isRoot()) {
		var parentPos = posXform(this.nodePositions[thisNode.parent]);
		newBranch(thisPos, parentPos, selectColour(thisNode, this.colourPallet), 1);
	    }
	}

	function newNodeText(node, string) {
	    var pos = posXform(savedThis.nodePositions[node]);

	    if (node.children.length === 1)
		pos[1] -= 2;
	    else if (node.isLeaf())
		pos[0] += 2;

	    var text = document.createElementNS(NS, "text");
	    text.setAttribute("x", pos[0]);
	    text.setAttribute("y", pos[1]);
	    text.textContent = string;
	    svg.appendChild(text);
	}


	// Draw tip labels:

	if (this.tipTextTrait !== undefined) {
	    for (var i=0; i<this.tree.getLeafList().length; i++) {
		var thisNode = this.tree.getLeafList()[i];
		var traitValue;
		if (this.tipTextTrait === "label")
		    traitValue = thisNode.label;
		else
		    traitValue = thisNode.annotation[this.tipTextTrait];

		newNodeText(thisNode, traitValue);
	    }
	}


	// Draw internal node labels:

	if (this.nodeTextTrait !== undefined) {
	    for (var i=0; i<this.tree.getNodeList().length; i++) {
		var thisNode = this.tree.getNodeList()[i];
		if (thisNode.isLeaf())
		    continue;

		var traitValue;
		if (this.nodeTextTrait === "label")
		    traitValue = thisNode.label;
		else
		    traitValue = thisNode.annotation[this.nodeTextTrait];

		newNodeText(thisNode, traitValue);
	    }
	}

	return svg;
    }}
});

