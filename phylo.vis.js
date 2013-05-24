/*
  phylo.js: JavaScript libraries for phylogenetic tree parsing,
  manipulation and visualization.

  Copyright (C) 2013  Tim Vaughan <tgvaughan@gmail.com>

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

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

    markInternalNodes: {value: false, writable: true, configurable: true, enumerable: true},

    lineWidth: {value: 2, writable: true, configurable: true, enumerable: true},
    fontSize: {value: 20, writable: true, configurable: true, enumerable: true},
    
    includeZoomControl: {value: true, writable: true, configurable: true, enumerable: true},

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
	svg.style.strokeWidth = this.lineWidth + "px";
	svg.style.fontSize = this.fontSize + "px";

	// Draw axis:
	if (this.axis) {
	    
	    // Select number of ticks:
	    var treeHeight = this.tree.root.height;
	    var maxDelta = treeHeight/(this.minAxisTicks-1);
	    var deltaT = Math.pow(10,Math.floor(Math.log(maxDelta)/Math.log(10)));

	    function cleanNum(num) {
		return parseFloat(num.toPrecision(12));
	    }

	    // Function for drawing one tick:
	    function axisLine(thisT) {
		var thisH = thisT/treeHeight;
		var bot = [posXform([0, thisH])[0], savedThis.height];
		var top = [posXform([0, thisH])[0], 0];
		
		var axLine = document.createElementNS(NS, "line");
		axLine.setAttribute("x1", bot[0]);
		axLine.setAttribute("y1", bot[1]);
		axLine.setAttribute("x2", top[0]);
		axLine.setAttribute("y2", top[1]);
		axLine.setAttribute("stroke", "gray");
		svg.appendChild(axLine);

		var axLabel = document.createElementNS(NS, "text");
		axLabel.setAttribute("x", bot[0]);
		axLabel.setAttribute("y", bot[1]);
		axLabel.setAttribute("fill", "gray");
		axLabel.textContent = cleanNum(thisT);
		svg.appendChild(axLabel);
	    }

	    // Draw ticks:
	    var t = 0;
	    while (t <= treeHeight) {
		axisLine(t);
		t += deltaT;
	    }
	    
	}

	// Draw tree:

	var seenColourTraitValues = [];

	function selectColourTrait(node) {
	    if (savedThis.colourTrait === undefined)
		return undefined;

	    var traitValue = node.annotation[savedThis.colourTrait];

	    if (seenColourTraitValues.indexOf(traitValue)<0) {
		seenColourTraitValues = seenColourTraitValues.concat(traitValue);
	    }

	    return traitValue;
	}

	function newBranch(childPos, parentPos, colourTrait) {
	    var pathStr = "M " + childPos[0] + " " + childPos[1];
	    pathStr += " H " + parentPos[0];
	    pathStr += " V" + parentPos[1];
	    var path = document.createElementNS(NS, "path");
	    path.setAttribute("d", pathStr);
	    path.setAttribute("fill", "none");
	    //path.setAttribute("stroke", linecol);

	    if (colourTrait !== undefined)
		path.className.baseVal = "trait_" + window.btoa(colourTrait);
	    else
		path.setAttribute("stroke", "black");

	    svg.appendChild(path);
	}


	// Draw tree edges:
	
	for (var i=0; i<this.tree.getNodeList().length; i++) {
	    var thisNode = this.tree.getNodeList()[i];
	    var thisPos = posXform(this.nodePositions[thisNode]);

	    if (!thisNode.isRoot()) {
		var parentPos = posXform(this.nodePositions[thisNode.parent]);
		newBranch(thisPos, parentPos, selectColourTrait(thisNode));
	    }
	}

	// Assign colours to trait classes:
	
	seenColourTraitValues.sort();
	for (var t=0; t<seenColourTraitValues.length; t++ ){
	    var thisVal = seenColourTraitValues[t];
	    var lines = svg.getElementsByClassName("trait_" + window.btoa(thisVal));
	    for (var l=0; l<lines.length; l++) {
		lines[l].setAttribute("stroke", this.colourPallet[t%this.colourPallet.length]);
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
		else {
		    if (thisNode.annotation[this.tipTextTrait] !== undefined)
			traitValue = thisNode.annotation[this.tipTextTrait];
		    else
			traitValue = "";
		}

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
		else {
		    if (thisNode.annotation[this.tipTextTrait] !== undefined)
			traitValue = thisNode.annotation[this.nodeTextTrait];
		    else
			traitValue = "";
		}
                
		newNodeText(thisNode, traitValue);
	    }
	}

	function newNodeMark(node) {
	    var pos = posXform(savedThis.nodePositions[node]);

	    var dash = document.createElementNS(NS, "line");
	    dash.setAttribute("x1", pos[0]-2*savedThis.lineWidth);
	    dash.setAttribute("x2", pos[0]+2*savedThis.lineWidth);
	    dash.setAttribute("y1", pos[1]-2*savedThis.lineWidth);
	    dash.setAttribute("y2", pos[1]+2*savedThis.lineWidth);
	    dash.setAttribute("stroke", "black");
	    svg.appendChild(dash);
	}

	// Mark internal nodes:

	if (this.markInternalNodes) {
	    for (var i=0; i<this.tree.getNodeList().length; i++) {
		var thisNode = this.tree.getNodeList()[i];
		if (thisNode.isLeaf())
		    continue;
		
		newNodeMark(thisNode);
	    }
	}

	// Attach event handlers for pan and zoom:

	if (this.includeZoomControl)
	    ZoomControl.init(svg, this.lineWidth, this.fontSize);

	return svg;
    }}
});

// ZoomControl object
// (Just a tidy way to package up these event handlers.)
var ZoomControl = Object.create({}, {

    initialised: {value: false, writable: true, configurable: true, enumerable: true},

    svg: {value: undefined, writable: true, configurable: true, enumerable: true},
    lineWidth: {value: 2, writable: true, configurable: true, enumerable: true},
    fontSize: {value: 20, writable: true, configurable: true, enumerable: true},

    zoomFactor: {value: 1, writable: true, configurable: true, enumerable: true},
    centre: {value: [0,0], writable: true, configurable: true, enumerable: true},

    dragOrigin: {value: [0,0], writable: true, configurable: true, enumerable: false},
    oldCentre: {value: [0,0], writable: true, configurable: true, enumerable: false},

    width: {value: undefined, writable: true, configurable: true, enumerable: false},
    height: {value: undefined, writable: true, configurable: true, enumerable: false},


    init: {value: function(svg, lineWidth, fontSize) {
        this.svg = svg;
	this.lineWidth = lineWidth;
	this.fontSize = fontSize;

	// Set initial view box if undefined:
	if (!this.initialised) {
	    this.width = svg.getAttribute("width");
	    this.height = svg.getAttribute("height");
	    this.centre = [Math.round(this.width/2),
			   Math.round(this.height/2)];
	    this.zoomFactor = 1.0;
	    this.initialised = true;
	} else {
	    // Update centre on dimension change
	    var newWidth = svg.getAttribute("width");
	    if (this.width != newWidth)
		this.centre[0] = this.centre[0]*newWidth/this.width;
	    this.width = newWidth;

	    var newHeight = svg.getAttribute("height");
	    if (this.height != newHeight)
		this.centre[1] = this.centre[1]*newHeight/this.height;
	    this.height = svg.getAttribute("height");
	}

	this.updateView();

	// Add mouse event handlers
	svg.addEventListener("mousewheel",
			     this.zoomEventHandler.bind(this)); // Chrome
	svg.addEventListener("DOMMouseScroll",
			     this.zoomEventHandler.bind(this)); // FF (!!)

	svg.addEventListener("mousemove",
			     this.panEventHandler.bind(this));

    }},


    updateView: {value: function() {

	// Sanitize zoom factor
	this.zoomFactor = Math.max(this.zoomFactor,1);

	var widthZoomed = this.width/this.zoomFactor;
	var heightZoomed = this.height/this.zoomFactor;

	// Sanitize centre point
	this.centre[0] = Math.max(0.5*widthZoomed, this.centre[0]);
	this.centre[0] = Math.min(this.width-0.5*widthZoomed, this.centre[0]);

	this.centre[1] = Math.max(0.5*heightZoomed, this.centre[1]);
	this.centre[1] = Math.min(this.height-0.5*heightZoomed, this.centre[1]);
	
	var x = Math.max(0, this.centre[0] - 0.5*widthZoomed);
	var y = Math.max(0, this.centre[1] - 0.5*heightZoomed);

	this.svg.setAttribute("viewBox", x + " " + y + " "
			      + widthZoomed + " " + heightZoomed);

	// Update stroke width
	this.svg.style.strokeWidth = this.lineWidth/this.zoomFactor + "px";

	// Update text scaling
	this.svg.style.fontSize = this.fontSize/this.zoomFactor + "px";

    }},

    zoomEventHandler: {value: function(event) {
	event.preventDefault();

	var dir = (event.wheelDelta || -event.detail);
	var zoomFactorP = this.zoomFactor;
	
	if (dir>0) {
	    // Zoom nin
	    zoomFactorP *= 1.1;
	    
	} else {
	    // Zoom out
	    zoomFactorP = Math.max(1, zoomFactorP/1.1);
	}

	// Update centre so that tree coordinates under mouse don't
	// change:
	var width = this.svg.getAttribute("width");
	var height = this.svg.getAttribute("height");
	this.centre[0] += (1/this.zoomFactor - 1/zoomFactorP)*(event.layerX - 0.5*width);
	this.centre[1] += (1/this.zoomFactor - 1/zoomFactorP)*(event.layerY - 0.5*height);

	this.zoomFactor = zoomFactorP;

	this.updateView();
    }},

    panEventHandler: {value: function(event) {

	var b;
	if (event.buttons !== undefined)
	    b = event.buttons; // FF
	else
	    b = event.which;   // Chrome

	if (b == 0) {
	    this.dragOrigin = [event.layerX, event.layerY];
	    this.oldCentre = [this.centre[0], this.centre[1]];
	    return false;
	}

	event.preventDefault();
	
	// Move centre so that coordinate under mouse don't change:
	this.centre[0] = this.oldCentre[0] -
	    (event.layerX - this.dragOrigin[0])/this.zoomFactor;
	this.centre[1] = this.oldCentre[1] -
	    (event.layerY - this.dragOrigin[1])/this.zoomFactor;

	this.updateView();
    }}
});
