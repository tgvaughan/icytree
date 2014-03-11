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
    colourPallet: {value: ["blue", "red", "green", "purple", "orange"],
		   writable: true, configurable: true, enumerable: true},

    tipTextTrait: {value: "label", writable: true, configurable: true, enumerable: true},
    nodeTextTrait: {value: undefined, writable: true, configurable: true, enumerable: true},

    axis: {value: false, writable: true, configurable: true, enumerable: true},
    minAxisTicks: {value: 5, writable: true, configurable: true, enumerable: true},

    markSingletonNodes: {value: false, writable: true, configurable: true, enumerable: true},

    lineWidth: {value: 2, writable: true, configurable: true, enumerable: true},
    fontSize: {value: 11, writable: true, configurable: true, enumerable: true},
    
    zoomControl: {value: undefined, writable: true, configurable: true, enumerable: true},

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
	svg.setAttribute('preserveAspectRatio', 'none');
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
		axLine.setAttribute("stroke-width", "1px");
		axLine.setAttribute("vector-effect", "non-scaling-stroke");
		axLine.setAttribute("class", "axisLine");
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

	    var classes = "treeEdge";

	    if (colourTrait !== undefined)
		classes += " trait_" + window.btoa(colourTrait);
	    else
		path.setAttribute("stroke", "black");

	    path.setAttribute("class", classes);

	    path.setAttribute("vector-effect", "non-scaling-stroke");

	    return(path);
	}


	// Draw tree edges:
	
	for (var i=0; i<this.tree.getNodeList().length; i++) {
	    var thisNode = this.tree.getNodeList()[i];
	    var thisPos = posXform(this.nodePositions[thisNode]);

	    if (!thisNode.isRoot()) {
		var parentPos = posXform(this.nodePositions[thisNode.parent]);
		var branch = newBranch(thisPos, parentPos, selectColourTrait(thisNode));
		branch.id = thisNode;
		svg.appendChild(branch);
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

	    var text = document.createElementNS(NS, "text");
	    text.setAttribute("x", pos[0]);
	    text.setAttribute("y", pos[1]);
	    text.setAttribute("vector-effect", "non-scaling-text");
	    text.textContent = string;

	    return(text);
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

		svg.appendChild(newNodeText(thisNode, traitValue));
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
		    if (thisNode.annotation[this.nodeTextTrait] !== undefined)
			traitValue = thisNode.annotation[this.nodeTextTrait];
		    else
			traitValue = "";
		}
                
		if (traitValue !== "")
		    svg.appendChild(newNodeText(thisNode, traitValue));
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

	if (this.markSingletonNodes) {
	    for (var i=0; i<this.tree.getNodeList().length; i++) {
		var thisNode = this.tree.getNodeList()[i];
		if (thisNode.children.length !== 1)
		    continue;
		
		newNodeMark(thisNode);
	    }
	}

	// Attach event handlers for pan and zoom:

	if (this.zoomControl === undefined)
	    this.zoomControl = Object.create(ZoomControl);

	this.zoomControl.init(svg, this.lineWidth);

	// Attach event handler for edge stats popup:
	Object.create(EdgeStatsControl).init(svg, this.tree);

	return svg;
    }}
});


// EdgeStatsControl object
var EdgeStatsControl = Object.create({}, {

    svg: {value: undefined, writable: true, configurable: true, enumerable: true},
    tree: {value: undefined, writable: true, configurable: true, enumerable: true},
    highlightedEdge: {value: undefined, writable: true, configurable: true, enumerable: true},
    phyloStat: {value: undefined, writable: true, configurable: true, enumerable: true},
    
    init: {value: function(svg, tree) {
	this.svg = svg;
	this.tree = tree;

	// Create stat box element:
	this.phyloStat = document.getElementById("phyloStat");
	if (this.phyloStat === null) {
	    this.phyloStat = document.createElement("div");
	    this.phyloStat.setAttribute("id", "phyloStat");
	    this.phyloStat.style.display="none";
	    this.phyloStat.style.position="absolute";
	    this.phyloStat.style.width="200px";
	    this.phyloStat.style.border="1px solid black";
	    this.phyloStat.style.background="white";
	    this.phyloStat.style.color="black";
	    this.phyloStat.style.font="10px sans-serif";
	    this.phyloStat.style.fontWeight="normal";

	    var table = document.createElement("table");
	    table.innerHTML = "<tr><td>Branch length</td><td class='psBL'></td></tr><tr><td>Parent age</td><td class='psPA'></td></tr><tr><td>Child age</td><td class='psCA'></td></tr><tr><td>Child label</td><td class='psCL'></td><tr><td>Child attribs</td><td class='psCAT'></td>"

	    table.style.width = "100%";
	    table.style.tableLayout = "fixed";
	    var colEls = table.getElementsByTagName("td");
	    for (var i=0; i<colEls.length; i++) {
		if (colEls[i].className === "")
		    colEls[i].style.width = "40%";
		else {
		    colEls[i].style.width = "auto";
		    colEls[i].style.whiteSpace = "nowrap";
		}
		colEls[i].style.textAlign = "left";
		colEls[i].style.overflow = "hidden";
		colEls[i].style.border = "1px solid black";
		colEls[i].style.fontWeight = "normal";
	    }
	    this.phyloStat.appendChild(table);

	    document.getElementsByTagName("body")[0].appendChild(this.phyloStat);
	}

	// Add event handler
	svg.addEventListener("mousemove", this.mouseMoveEventHandler.bind(this));
    }},

    mouseMoveEventHandler: {value: function(event) {
	var classAttr = event.target.getAttribute("class");
	if (classAttr === null || classAttr.split(" ").indexOf("treeEdge")<0) {
	    if (this.highlightedEdge != undefined) {
		this.hideStatsBox();
		this.highlightedEdge.removeAttribute("stroke-width");
		this.highlightedEdge = undefined;
	    }
	    return false;
	}

	if (this.highlightedEdge === undefined) {
	    this.highlightedEdge = event.target;
	    var curStrokeWidth = Number(this.svg.style.strokeWidth.split("px")[0]);

	    // Choose new stroke width
	    var f = this.svg.width.baseVal.value/this.svg.viewBox.baseVal.width
	    var newStrokeWidth = Math.max(curStrokeWidth*1.5, 8/f);
	    
	    this.highlightedEdge.setAttribute("stroke-width", newStrokeWidth+"px");
	    this.displayStatsBox(event.target.getAttribute("id"), event.pageX, event.pageY);
	} else {
	    return false;
	}
    }},

    displayStatsBox: {value: function(nodeId, x, y) {

	var prec = 6;

	this.phyloStat.style.position="absolute";

	if (x>window.innerWidth/2) {
	    this.phyloStat.style.left = "";
	    this.phyloStat.style.right = (window.innerWidth-x) + "px";
	} else {
	    this.phyloStat.style.left = x + "px";
	    this.phyloStat.style.right = "";
	}

	if (y>window.innerHeight/2) {
	    this.phyloStat.style.top = "auto";
	    this.phyloStat.style.bottom=(window.innerHeight-y) + "px";
	} else {
	    this.phyloStat.style.top=y+"px";
	    this.phyloStat.style.bottom = "auto";
	}

	var node = this.tree.getNode(nodeId);

	// Pretty print numbers
	function pretty(val) {
	    var nVal = Number(val);
	    if (String(nVal) === "NaN")
		return val;

	    val = nVal.toPrecision(5);
	    if (val.indexOf('.')<0)
		return val;

	    return val.replace(/\.?0*$/,"");
	}

	var bl = "NA";
	var pa = "NA";
	if (node.parent != undefined) {
	    bl = pretty((node.parent.height-node.height));
	    pa = pretty(node.parent.height);
	}
	var ca = pretty(node.height);
	var cl = node.label;

	this.phyloStat.getElementsByClassName("psBL")[0].innerHTML = bl;
	this.phyloStat.getElementsByClassName("psPA")[0].innerHTML = pa;
	this.phyloStat.getElementsByClassName("psCA")[0].innerHTML = ca;
	this.phyloStat.getElementsByClassName("psCL")[0].innerHTML = cl;

	var psCAT = this.phyloStat.getElementsByClassName("psCAT")[0];
	if (Object.keys(node.annotation).length>0) {
	    var ul =  document.createElement("ul");
	    ul.style.margin = "0px";
	    ul.style.padding = "0px";
	    for (att in node.annotation) {
		var li = document.createElement("li");
		li.innerHTML = att + ": " + pretty(node.annotation[att]);
		ul.appendChild(li);
	    }

	    psCAT.innerHTML = "";
	    psCAT.appendChild(ul);

	} else {
	    psCAT.innerHTML = "NA";
	}

	this.phyloStat.style.display = "block";
    }},

    hideStatsBox: {value: function() {
	this.phyloStat.style.display = "none";
    }}

});


// ZoomControl object
// (Just a tidy way to package up these event handlers.)
var ZoomControl = Object.create({}, {

    initialised: {value: false, writable: true, configurable: true, enumerable: true},

    svg: {value: undefined, writable: true, configurable: true, enumerable: true},
    lineWidth: {value: 2, writable: true, configurable: true, enumerable: true},

    zoomFactorX: {value: 1, writable: true, configurable: true, enumerable: true},
    zoomFactorY: {value: 1, writable: true, configurable: true, enumerable: true},
    centre: {value: [0,0], writable: true, configurable: true, enumerable: true},

    dragOrigin: {value: [0,0], writable: true, configurable: true, enumerable: false},
    oldCentre: {value: [0,0], writable: true, configurable: true, enumerable: false},

    width: {value: undefined, writable: true, configurable: true, enumerable: false},
    height: {value: undefined, writable: true, configurable: true, enumerable: false},


    init: {value: function(svg, lineWidth) {
        this.svg = svg;
	this.lineWidth = lineWidth;

	// Set initial view box if undefined:
	if (!this.initialised) {
	    this.width = svg.getAttribute("width");
	    this.height = svg.getAttribute("height");
	    this.centre = [Math.round(this.width/2),
			   Math.round(this.height/2)];
	    this.zoomFactorX = 1.0;
	    this.zoomFactorY = 1.0;
	    this.initialised = true;
	} else {
	    // Update centre on dimension change
	    var newWidth = svg.getAttribute("width");
	    if (this.width != newWidth) {
		this.centre[0] = this.centre[0]*newWidth/this.width;
		this.width = newWidth;
	    }

	    var newHeight = svg.getAttribute("height");
	    if (this.height != newHeight) {
		this.centre[1] = this.centre[1]*newHeight/this.height;
		this.height = newHeight;
	    }
	}

	this.updateView();

	// Ensure text positions are correct
	this.updateTextScaling();

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
	this.zoomFactorX = Math.max(this.zoomFactorX,1);
	this.zoomFactorY = Math.max(this.zoomFactorY,1);

	var widthZoomed = this.width/this.zoomFactorX;
	var heightZoomed = this.height/this.zoomFactorY;

	// Sanitize centre point
	this.centre[0] = Math.max(0.5*widthZoomed, this.centre[0]);
	this.centre[0] = Math.min(this.width-0.5*widthZoomed, this.centre[0]);

	this.centre[1] = Math.max(0.5*heightZoomed, this.centre[1]);
	this.centre[1] = Math.min(this.height-0.5*heightZoomed, this.centre[1]);
	
	var x = Math.max(0, this.centre[0] - 0.5*widthZoomed);
	var y = Math.max(0, this.centre[1] - 0.5*heightZoomed);

	this.svg.setAttribute("viewBox", x + " " + y + " "
			      + widthZoomed + " " + heightZoomed);

    }},

    updateTextScaling: {value: function() {
	var textElements = this.svg.getElementsByTagName("text");
	for (var i=0; i<textElements.length; i++) {
	    var textEl = textElements[i];
	    var textPosX = textEl.getAttribute("x")*1.0;
	    var textPosY = textEl.getAttribute("y")*1.0;
	    var tlate = this.svg.createSVGMatrix();
	    tlate.e = textPosX*(this.zoomFactorX - 1.0);
	    tlate.f = textPosY*(this.zoomFactorY - 1.0);

	    var scaleMat = this.svg.createSVGMatrix();
	    scaleMat.a = 1.0/this.zoomFactorX;
	    scaleMat.d = 1.0/this.zoomFactorY;
	    var scaleXform = this.svg.createSVGTransformFromMatrix(scaleMat);
	    
	    textEl.transform.baseVal.clear();
	    textEl.transform.baseVal.appendItem(scaleXform);
	    textEl.transform.baseVal.appendItem(this.svg.createSVGTransformFromMatrix(tlate));
	}
    }},

    zoomEventHandler: {value: function(event) {
	event.preventDefault();

	var dir = (event.wheelDelta || -event.detail);
	var zoomFactorXP = this.zoomFactorX;
	var zoomFactorYP = this.zoomFactorY;

	var verticalZoomOnly = event.shiftKey;

	if (dir>0) {
	    // Zoom min
	    zoomFactorYP *= 1.1;
	    if (!verticalZoomOnly)
		zoomFactorXP *= 1.1;

	    
	} else {
	    // Zoom out
	    zoomFactorYP = Math.max(1, zoomFactorYP/1.1);
	    if (!verticalZoomOnly)
		zoomFactorXP = Math.max(1, zoomFactorXP/1.1);
	}

	var width = this.svg.getAttribute("width");
	var height = this.svg.getAttribute("height");

	// Get position of mouse relative to top-left corner.
	// (This is a hack.  Should modify centre update formula to
	// make use of SVG coordinates.)
	var point = this.svg.createSVGPoint();
	point.x = this.centre[0] - 0.5*width/this.zoomFactorX;
	point.y = this.centre[1] - 0.5*height/this.zoomFactorY;
	point = point.matrixTransform(this.svg.getScreenCTM());
	point.x = event.clientX - point.x;
	point.y = event.clientY - point.y;

	// Update centre so that SVG coordinates under mouse don't
	// change:
	this.centre[0] += (1/this.zoomFactorX - 1/zoomFactorXP)*(point.x - 0.5*width);
	this.centre[1] += (1/this.zoomFactorY - 1/zoomFactorYP)*(point.y - 0.5*height);

	this.zoomFactorX = zoomFactorXP;
	this.zoomFactorY = zoomFactorYP;

	this.updateView();
	this.updateTextScaling();
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
	    (event.layerX - this.dragOrigin[0])/this.zoomFactorX;
	this.centre[1] = this.oldCentre[1] -
	    (event.layerY - this.dragOrigin[1])/this.zoomFactorY;

	this.updateView();
    }},

    // Method to revert to original (unzoomed) state
    reset: {value: function() {
	this.zoomFactorX = 1.0;
	this.zoomFactorY = 1.0;
	this.updateView();
    }}
});
