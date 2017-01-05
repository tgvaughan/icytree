/**
 * @licstart  The following is the entire license notice for the
 *  JavaScript code in this page.
 *
 * Copyright (C) 2014  Tim Vaughan
 *
 *
 * The JavaScript code in this page is free software: you can
 * redistribute it and/or modify it under the terms of the GNU
 * General Public License (GNU GPL) as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option)
 * any later version.  The code is distributed WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE.  See the GNU GPL for more details.
 *
 * As additional permission under GNU GPL version 3 section 7, you
 * may distribute non-source (e.g., minimized or compacted) forms of
 * that code without the copy of the GNU GPL normally required by
 * section 4, provided you include this license notice and a URL
 * through which recipients can access the Corresponding Source.
 *
 * @licend  The above is the entire license notice
 * for the JavaScript code in this page.
 */

// Pretty print numbers
function pretty(val, prec) {
    if (val === undefined || Number.isNaN(val))
        return "NA";

    prec = typeof prec !== 'undefined' ? prec : 5;

    var nVal = Number(val);
    if (Number.isNaN(nVal))
        return val;

    val = nVal.toPrecision(prec);
    if (val.indexOf('.')<0)
        return val;

    return val.replace(/\.?0*$/,"");
}

// ---- Tree style ---- {{{

var TreeStyle = {
    width: 640,
    height: 480,

    marginTop: 40,
    marginBottom: 10,
    marginLeft: 10,
    marginRight: 40,

    colourTrait: undefined,

    tipTextTrait: "label",
    nodeTextTrait: undefined,
    recombTextTrait: undefined,
    labelPrec: 0,
    angleText: true,

    edgeOpacityTrait: undefined,
    recombOpacityTrait: undefined,

    nodeBarTrait: undefined,

    axis: false,
    axisForwards: false,
    axisOffset: 0,
    maxAxisTicks: 20,

    legend: false,

    logScale: false,
    logScaleRelOffset: 0.001,

    markSingletonNodes: false,

    displayRecomb: true,
    inlineRecomb: true,
    minRecombEdgeLength: true,

    lineWidth: 2,
    fontSize: 11,

    sortNodes: true,
    sortNodesDecending: true
};

// }}}

// ---- Tree layouts ---- {{{

function TreeLayout(tree) {
    this.origTree = tree; // Need this for tree modifications

    this.tree = tree.copy();
    this.sortTree();

    this.nodePositions = {};
    this.leafGroups = [];
    this.collapsedCladeRoots = {};
    this.collapsedCladeNodes = {};

    this.groupLeaves();

}

TreeLayout.prototype.getTotalTreeHeight = function() {
    var treeHeight = this.tree.root.height;
    if (this.tree.root.branchLength !== undefined)
        treeHeight += this.tree.root.branchLength;
    else
        treeHeight += 0.01*this.tree.root.height; // short faux root edge

    return treeHeight;
};

TreeLayout.prototype.getScaledHeight = function(height) {
    var treeHeight = this.getTotalTreeHeight();
    var lso = TreeStyle.logScaleRelOffset*treeHeight;
    if (TreeStyle.logScale) {
        return (Math.log(height + lso) - Math.log(lso))/
            (Math.log(treeHeight + lso) - Math.log(lso));
    } else {
        return height/treeHeight;
    }
};

TreeLayout.prototype.getScaledNodeHeight = function(node) {
    return this.getScaledHeight(node.height);
};

TreeLayout.prototype.sortTree = function() {
    if (TreeStyle.sortNodes) {
        this.tree.sortNodes(TreeStyle.sortNodesDescending);
    }

    if (TreeStyle.minRecombEdgeLength)
        this.tree.minimizeHybridSeparation();
};

TreeLayout.prototype.groupLeaves = function() {

    function findDescendents(node, descendents, cladeRoot, collapsedCladeNodes) {

        for (var i=0; i<node.children.length; i++) {
            var child = node.children[i];

            descendents.push(child);
            collapsedCladeNodes[child] = cladeRoot;
            findDescendents(child, descendents, cladeRoot, collapsedCladeNodes);
        }

        return descendents;
    }

    function findGroups (node, leafGroups, collapsedCladeRoots, collapsedCladeNodes) {
        if (node.isLeaf()) {
            leafGroups.push([node]);
        } else if (node.collapsed) {
            var descendents = [];
            findDescendents(node, descendents, node, collapsedCladeNodes, leafGroups);
            leafGroups.push([node, descendents]);
            collapsedCladeRoots[node] = true;
        } else {
            for (var i=0; i<node.children.length; i++) {
                var child = node.children[i];
                findGroups(child, leafGroups, collapsedCladeRoots, collapsedCladeNodes);
            }
        }
    }

    this.leafGroups = [];
    this.collapsedCladeRoots = {};
    this.collapsedCladeNodes = {};
    findGroups(this.tree.root, this.leafGroups, this.collapsedCladeRoots, this.collapsedCladeNodes);

    var i,j;

    // Add hybrid nodes to leafgroups in a sorted manner.
    var newLeafGroups = [];
    for (i=0; i<this.leafGroups.length; i++) {
        var groupRoot = this.leafGroups[i][0];
        var descendents = this.leafGroups[i][1];

        if (descendents === undefined) {
            newLeafGroups.push(this.leafGroups[i]);
            continue;
        }

        var hybridsLeft = [];
        var hybridsRight = [];

        for (j=0; j<descendents.length; j++) {
            var descendent = descendents[j];

            if (!descendent.isLeaf() || !descendent.isHybrid())
                continue;
            
            var recombID = descendent.hybridID;
            var recombSrc = this.tree.getRecombEdgeMap()[recombID][0];
            var recombDest = this.tree.getRecombEdgeMap()[recombID][1];

            // Skip recombinations within a single collapsed clade:
            if (recombSrc in this.collapsedCladeNodes && this.collapsedCladeNodes[recombSrc] === groupRoot)
                    continue;

            if (recombDest.isLeftOf(recombSrc))
                hybridsLeft.push([recombDest]);
            else
                hybridsRight.push([recombDest]);
        }

        Array.prototype.push.apply(newLeafGroups, hybridsRight);
        newLeafGroups.push(this.leafGroups[i]);
        Array.prototype.push.apply(newLeafGroups, hybridsLeft);
    }

    this.leafGroups = newLeafGroups;
};

TreeLayout.prototype.getYoungestScaledHeight = function(descendents) {
    var youngest = Number.POSITIVE_INFINITY;

    for (var i=0; i<descendents.length; i++) {
        var node = descendents[i];

        if (!(node.isHybrid() && node.isLeaf()))
            youngest = Math.min(this.getScaledNodeHeight(node), youngest);
    }

    return youngest;
};

// Standard tree layout

function StandardTreeLayout(tree) {
    TreeLayout.call(this, tree);
    
    this.nodePositions = {};

    // Position leaves
    this.positionLeaves();

    // Position internal nodes
    this.positionInternals(this.tree.root);

    return this;
}

StandardTreeLayout.prototype = Object.create(TreeLayout.prototype);
StandardTreeLayout.prototype.constructor = StandardTreeLayout;

StandardTreeLayout.prototype.positionLeaves = function() {
    var nLeafGroups = this.leafGroups.length;
    var leafGroupRoot;

    var delta = nLeafGroups>1 ? 0.24/(nLeafGroups-1) : 0.24;

    for (var i=0; i<nLeafGroups; i++) {
        leafGroupRoot = this.leafGroups[i][0];

        var xpos = nLeafGroups>1 ? i/(nLeafGroups-1) : 0.5;

        var entry = [xpos, this.getScaledNodeHeight(leafGroupRoot)];

        if (this.leafGroups[i].length>1) {
            var descendents = this.leafGroups[i][1];
            var youngest = this.getYoungestScaledHeight(descendents);

            entry.push(xpos-delta);
            entry.push(youngest);
            entry.push(xpos+delta);
            entry.push(youngest);

            for (var j=0; j<descendents.length; j++) {
                var decNode = descendents[j];

                if (!(decNode.isLeaf() && decNode.isHybrid()))
                    this.nodePositions[decNode] = [xpos, this.getScaledNodeHeight(decNode)];
            }
        }

        this.nodePositions[leafGroupRoot] = entry;
    }
};

StandardTreeLayout.prototype.positionInternals = function(node) {
    if (node.collapsed || node.isLeaf())
        return this.nodePositions[node][0];

    var xpos = 0;
    var nonHybridCount = 0;

    for (var i=0; i<node.children.length; i++) {
        if (TreeStyle.inlineRecomb && node.children[i].isHybrid() && node.children[i].isLeaf()) {
            this.positionInternals(node.children[i]);
        } else {
            xpos += this.positionInternals(node.children[i]);
            nonHybridCount += 1;
        }
    }

    if (nonHybridCount > 0)
        xpos /= nonHybridCount;
    else
        xpos = this.nodePositions[node.children[0]][0];

    this.nodePositions[node] = [
        xpos,
        this.getScaledNodeHeight(node)
    ];

    return xpos;
};


// Produce a rectangular layout suitable for transmission trees:
function TransmissionTreeLayout (tree) {
    StandardTreeLayout.call(this, tree);
}

TransmissionTreeLayout.prototype = Object.create(StandardTreeLayout.prototype);
TransmissionTreeLayout.prototype.constructor = TransmissionTreeLayout;

// Position internal transmission tree nodes
TransmissionTreeLayout.prototype.positionInternals = function (node) {
    if (node.collapsed || node.isLeaf())
        return this.nodePositions[node][0];

    var xpos = this.positionInternals(node.children[0]);
    for (var i=1; i<node.children.length; i++)
        this.positionInternals(node.children[i]);

    this.nodePositions[node] = [
        xpos,
        this.getScaledNodeHeight(node)
    ];

    return xpos;
};

// Disable sorting for transmission trees
TransmissionTreeLayout.prototype.sortTree = function() { };


// Produce a rectangular cladogram layout
function CladogramLayout (tree) {
    StandardTreeLayout.call(this, tree);
}

CladogramLayout.prototype = Object.create(StandardTreeLayout.prototype);
CladogramLayout.prototype.constructor = CladogramLayout;

CladogramLayout.prototype.computeNodeRanks = function(node) {
    if (node in this.nodeRanks)
        return this.nodeRanks[node]; // Node already visited

    if (node.isLeaf()) {
        if (node.isHybrid()) {
            var srcNode = this.tree.getRecombEdgeMap()[node.hybridID][0];
            this.nodeRanks[node] = this.computeNodeRanks(srcNode);
        } else {
            this.nodeRanks[node] = 0;
        }
    } else {
        var maxChildRank = 0;
        for (var i=0; i<node.children.length; i++) {
            maxChildRank = Math.max(this.computeNodeRanks(node.children[i]), maxChildRank);
        }

        this.nodeRanks[node] = maxChildRank + 1;
    }

    return this.nodeRanks[node];
};

CladogramLayout.prototype.adjustRecombRanks = function() {

    // Construct map from unique node ranks to
    // the list of recomb IDs having that same rank
    var rankMap = {};

    var i, node;
    for (i=0; i<this.tree.getNodeList().length; i++) {
        node = this.tree.getNodeList()[i];
        if (this.nodeRanks[node] in rankMap)
            continue;

        rankMap[this.nodeRanks[node]] = [];
    }

    var recombID, srcNode, destNode;

    // Add recombinations to rank map
    for (recombID in this.tree.getRecombEdgeMap()) {
        srcNode = this.tree.getRecombEdgeMap()[recombID][0];

        if (this.nodeRanks[srcNode] in rankMap)
            rankMap[this.nodeRanks[srcNode]].push(recombID);
    }

    // Alter ranks of recombinations
    for (var rank in rankMap) {
        var nProbs = rankMap[rank].length;

        var offset;

        for (i=0; i<nProbs; i++) {
            offset = (i+1)/(nProbs+1);

            recombID = rankMap[rank][i];
            srcNode = this.tree.getRecombEdgeMap()[recombID][0];
            destNode = this.tree.getRecombEdgeMap()[recombID][1];
            this.nodeRanks[srcNode] += offset;
            this.nodeRanks[destNode] += offset;
        }
    }
};

CladogramLayout.prototype.adjustCollapsedRecombRanks = function() {

    var rankMap, leafGroup, groupIdx;
    var i

    for (groupIdx=0; groupIdx<this.leafGroups.length; groupIdx++) {
        leafGroup = this.leafGroups[groupIdx];

        rankMap = {};

        for (i=0; i<leafGroup.descendents; i++) {
        }

        // TODO

    }

};

CladogramLayout.prototype.getScaledNodeHeight = function(node) {
    if (this.nodeRanks === undefined) {
        this.nodeRanks = {};
        this.computeNodeRanks(this.tree.root);
        this.adjustRecombRanks();
        this.adjustCollapsedRecombRanks();
    }

    if (this.nodeRanks[this.tree.root]>0)
        return this.nodeRanks[node]/(1.01*this.nodeRanks[this.tree.root]);
    else
        return 0;
};

// }}}

// ---- Display Module ---- {{{
var Display = (function() {

    var NS="http://www.w3.org/2000/svg";

    /***** General Private Methods *****/
 
    // {{{

    // Transform from tree to SVG coordinates
    function posXform (treePos) {
        var xpos = (1-treePos[1])*TreeStyle.width;
        var ypos = (1-treePos[0])*TreeStyle.height;
        return [xpos, ypos];
    }

    // Transform from SVG to tree coordinates
    function invXform (svgPos) {
        var treePosY = 1 - svgPos[0]/TreeStyle.width;
        var treePosX = 1 - svgPos[1]/TreeStyle.height;

        return [treePosX, treePosY];
    }

    function transformToSVG (svg, coord) {
        if (svg.viewBox.baseVal !== null ||
            (svg.viewBox.baseVal.width === 0 && svg.viewBox.baseVal.height === 0)) {
            coord.x = svg.viewBox.baseVal.x +  coord.x*svg.viewBox.baseVal.width/TreeStyle.width;
            coord.y = svg.viewBox.baseVal.y +  coord.y*svg.viewBox.baseVal.height/TreeStyle.height;
        }

        return coord;
    }

    function getSVGWidth (svg, screenWidth) {
        if (svg.viewBox.baseVal === null ||
            svg.viewBox.baseVal.width === 0 ||
            svg.viewBox.baseVal.height === 0)
            return screenWidth;
        else
            return screenWidth*svg.viewBox.baseVal.width/TreeStyle.width;
    }

    function getSVGHeight (svg, screenHeight) {
        if (svg.viewBox.baseVal === null ||
            svg.viewBox.baseVal.width === 0 ||
            svg.viewBox.baseVal.height === 0)
            return screenHeight;
        else
            return screenHeight*svg.viewBox.baseVal.height/TreeStyle.height;
    }

    var seenColourTraitValues = [];
    var colourPallet = [];

    // Generate a colour pallet for N distinct trait values
    function genColourPallet (N) {

        // Taken from https://gist.github.com/mjackson/5311256
        function hslToRgb(h, s, l) {
            var r, g, b;

            if (s === 0) {
                r = g = b = l; // achromatic
            } else {
                function hue2rgb(p, q, t) {
                    if (t < 0) t += 1;
                    if (t > 1) t -= 1;
                    if (t < 1/6) return p + (q - p) * 6 * t;
                    if (t < 1/2) return q;
                    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                    return p;
                }

                var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                var p = 2 * l - q;

                r = hue2rgb(p, q, h + 1/3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1/3);
            }

            function paddedHex(x) {
                s = Math.floor(x*255).toString(16);
                return s.length == 2 ? s : "0" + s;
            }

            return "#" + paddedHex(r) + paddedHex(g) + paddedHex(b);
        }

        colourPallet = [];
        var delta = Math.min(0.33, 1/N);
        for (var idx=0; idx<N; idx++) {
            var hue = 1 - idx*delta;
            var lightness = (hue>0.1 && hue<0.5) ? 0.30 : 0.45;
            colourPallet[idx] = hslToRgb(hue, 1, lightness);
        }
    }

   // }}}

    /***** Axis Drawing *****/

    // {{{

    // Function for drawing one tick:
    function axisLine(svg, thisH, thisLabel, lower, upper) {
        var bot = posXform([lower, thisH]);
        var top = posXform([upper, thisH]);

        var axLine = document.createElementNS(NS, "line");
        axLine.setAttribute("x1", bot[0]);
        axLine.setAttribute("y1", bot[1]);
        axLine.setAttribute("x2", top[0]);
        axLine.setAttribute("y2", top[1]);
        axLine.setAttribute("stroke", "gray");
        axLine.setAttribute("stroke-width", "1px");
        axLine.setAttribute("vector-effect", "non-scaling-stroke");
        axLine.setAttribute("class", "axisComponent");
        svg.appendChild(axLine);

        var axLabel = document.createElementNS(NS, "text");
        axLabel.setAttribute("x", bot[0]);
        axLabel.setAttribute("y", bot[1]);
        axLabel.setAttribute("fill", "gray");
        axLabel.setAttribute("class", "axisComponent");
        axLabel.textContent = thisLabel;

        svg.appendChild(axLabel);
    }

    // Add/update axis to tree visualization.
    function updateAxis(svg, layout) {
        // Delete any existing axis components
        while (svg.getElementsByClassName("axisComponent").length>0) {
            svg.removeChild(svg.getElementsByClassName("axisComponent")[0]);
        }

        if (TreeStyle.axis) {

            // Select tick number and spacing
            var treeHeight = layout.getTotalTreeHeight();
            var lso = TreeStyle.logScaleRelOffset*treeHeight;

            // Acquire coordinates of viewBox
            var topLeft, bottomRight;
            if (svg.viewBox.baseVal === null) {
                topLeft = invXform([0,0]);
                bottomRight = invXform([TreeStyle.width, TreeStyle.height]);
            } else {
                topLeft = invXform([svg.viewBox.baseVal.x, svg.viewBox.baseVal.y]);
                bottomRight = invXform([svg.viewBox.baseVal.x + svg.viewBox.baseVal.width,
                        svg.viewBox.baseVal.y + svg.viewBox.baseVal.height]);
            }

            var axisStart, axisEnd, delta;
            if (!TreeStyle.logScale) {
                axisStart = treeHeight*Math.max(0.0, bottomRight[1]);
                axisEnd = treeHeight*Math.min(1.0, topLeft[1]);
                var minDelta = (axisEnd-axisStart)/(TreeStyle.maxAxisTicks-1);
                delta = Math.pow(10,Math.ceil(Math.log(minDelta)/Math.log(10)));
                axisStart = delta*Math.ceil(axisStart/delta);
            } else {
                axisStart = Math.max(0.0, bottomRight[1]);
                axisEnd = topLeft[1];
                delta = 2*(axisEnd-axisStart)/(TreeStyle.maxAxisTicks-1);
            }


            // Draw ticks:
            var h = axisStart;
            while (h <= axisEnd) {
                var label = "";
                if (!TreeStyle.logScale) {
                    if (TreeStyle.axisForwards)
                        label = parseFloat((TreeStyle.axisOffset - h).toPrecision(5));
                    else
                        label = parseFloat((h + TreeStyle.axisOffset).toPrecision(5));
                    axisLine(svg, h/treeHeight, label, bottomRight[0], topLeft[0]);
                } else {
                    var trueHeight = lso*Math.pow(treeHeight/lso + 1, h) - lso;
                    if (TreeStyle.axisForwards)
                        label = Number((TreeStyle.axisOffset - trueHeight).toPrecision(5)).toExponential();
                    else
                        label =  Number((trueHeight + TreeStyle.axisOffset).toPrecision(5)).toExponential();
                    axisLine(svg, h, label, bottomRight[0], topLeft[0]);
                }
                h += delta;
            }
        }

        if (TreeStyle.legend && seenColourTraitValues !== null) {

            if (seenColourTraitValues.length>0) {
                var coord = svg.createSVGPoint();
                coord.x = 10;
                coord.y = TreeStyle.height - seenColourTraitValues.length*20 - 30 - 15;
                transformToSVG(svg, coord);

                var title = document.createElementNS(NS, "text");
                title.setAttribute("class", "axisComponent");
                title.setAttribute("x",  coord.x);
                title.setAttribute("y",  coord.y);
                //title.textContent = "Legend:";
                var trait = TreeStyle.colourTrait;
                title.textContent = trait[0].toUpperCase() + trait.substr(1).toLowerCase();
                svg.appendChild(title);
            }

            for (var i=0; i<seenColourTraitValues.length; i++) {

                var coord = svg.createSVGPoint();
                coord.x = 20;
                coord.y = TreeStyle.height - seenColourTraitValues.length*20 - 30 + i*20;
                transformToSVG(svg, coord);

                var dot = document.createElementNS(NS, "rect");
                dot.setAttribute("x", coord.x - getSVGWidth(svg, 5));
                dot.setAttribute("y", coord.y - getSVGHeight(svg, 5));
                dot.setAttribute("width", getSVGWidth(svg, 10));
                dot.setAttribute("height", getSVGHeight(svg, 10));
                dot.setAttribute("fill", colourPallet[i]);
                dot.setAttribute("class", "axisComponent");
                svg.appendChild(dot);

                var label = document.createElementNS(NS, "text");
                label.setAttribute("class", "axisComponent");
                label.setAttribute("x", coord.x + getSVGWidth(svg, 15));
                label.setAttribute("y", coord.y + getSVGHeight(svg, 5));
                label.setAttribute("fill", colourPallet[i]);
                label.textContent = seenColourTraitValues[i];
                svg.appendChild(label);
            }

        }
    }

    // }}} 


    /**** Main SVG Creation Functions ****/

    // {{{ 

    // Returns value of colour trait for given node:
    function getColourTraitValue(node) {
        if (TreeStyle.colourTrait === undefined)
            return undefined;

        var traitValue;
        if (TreeStyle.colourTrait === "Label")
            traitValue = node.label;
        else
            traitValue = node.annotation[TreeStyle.colourTrait];

        if (traitValue !== undefined && seenColourTraitValues.indexOf(traitValue)<0) {
            seenColourTraitValues = seenColourTraitValues.concat(traitValue);
        }

        return traitValue;
    }

    // Draw node height error bars:
    function newNodeBar(minPos, maxPos) {

        var bar = document.createElementNS(NS, "line");
        bar.setAttribute("x1", minPos[0]);
        bar.setAttribute("y1", minPos[1]);
        bar.setAttribute("x2", maxPos[0]);
        bar.setAttribute("y2", maxPos[1]);
        bar.setAttribute("vector-effect", "non-scaling-stroke");
        bar.setAttribute("stroke", "black");
        bar.setAttribute("stroke-opacity", "0.4");
        bar.setAttribute("stroke-width", TreeStyle.lineWidth*3);
        bar.setAttribute("class", "errorBar");
        return(bar);
    }

    // Draw tree edge
    function newBranch(childPos, parentPos, colourTrait, edgeOpacityFactor) {
        var pathStr = "M " + childPos[0] + " " + childPos[1];
        pathStr += " H " + parentPos[0];
        pathStr += " V " + parentPos[1];
        var path = document.createElementNS(NS, "path");
        path.setAttribute("d", pathStr);
        path.setAttribute("fill", "none");

        var classes = "treeEdge";

        if (colourTrait !== undefined)
            classes += " trait_" + window.btoa(colourTrait);
        else
            path.setAttribute("stroke", "black");

        path.setAttribute("stroke-opacity", edgeOpacityFactor);

        path.setAttribute("class", classes);

        path.setAttribute("vector-effect", "non-scaling-stroke");

        return(path);
    }

    // Draw recombination edge
    function newRecombinantBranch(childPos, childPrimePos, parentPos, colourTrait, recombOpacityFactor) {
        var pathStr = "M " + childPos[0] + " " + childPos[1];
        pathStr += " L " + childPrimePos[0] + " " + childPrimePos[1];

        pathStr += " H " + parentPos[0];
        pathStr += " V " + parentPos[1];

        var path = document.createElementNS(NS, "path");
        path.setAttribute("d", pathStr);
        path.setAttribute("fill", "none");

        var classes = "treeEdge";
        if (colourTrait !== undefined)
            classes += " trait_" + window.btoa(colourTrait);
        else
            path.setAttribute("stroke", "black");

        path.setAttribute("stroke-opacity", recombOpacityFactor);

        path.setAttribute("class", classes);

        path.setAttribute("vector-effect", "non-scaling-stroke");
        path.setAttribute("stroke-dasharray", "5, 2");

        return(path);
    }

    // Draw node text
    function newNodeText(pos, string, offset) {
        var text = document.createElementNS(NS, "text");

        if (offset) {
            pos[0] += offset[0]*TreeStyle.lineWidth;
            pos[1] += offset[1]*TreeStyle.lineWidth;
        }

        text.setAttribute("x", pos[0]);
        text.setAttribute("y", pos[1]);

        if (TreeStyle.angleText) {
            text.setAttribute("angle", -45);
            text.setAttribute("transform", "rotate(-45 " + pos[0] + " " + pos[1] + ")");
        }

        if (offset) {
            text.setAttribute("pixelOffsetX", offset[0]*TreeStyle.lineWidth);
            text.setAttribute("pixelOffsetY", offset[1]*TreeStyle.lineWidth);
        }

        // text.setAttribute("vector-effect", "non-scaling-text"); // I wish

        // Limit precision of numeric labels
        if (TreeStyle.labelPrec>0) {
            text.textContent = pretty(string, TreeStyle.labelPrec);
        } else {
            text.textContent = string;
        }

        return(text);
    }

    // Draw internal node marker
    function newNodeMark(pos) {
        var bullet = document.createElementNS(NS, "ellipse");
        bullet.setAttribute("cx", pos[0]);
        bullet.setAttribute("cy", pos[1]);
        bullet.setAttribute("rx", 2*TreeStyle.lineWidth);
        bullet.setAttribute("ry", 2*TreeStyle.lineWidth);
        bullet.setAttribute("fill", "black");
        bullet.setAttribute("shape-rendering", "auto");
        bullet.setAttribute("class","internalNodeMark");
        return(bullet);
    }

    // Draw collapsed clade
    function newCollapsedClade(rootPos, bottomLeftPos, bottomRightPos) {

        var vertexString = rootPos[0] + "," + rootPos[1] +
            " " + bottomLeftPos[0] + "," + bottomLeftPos[1] +
            " " + bottomRightPos[0] + "," + bottomRightPos[1];

        var polygon = document.createElementNS(NS, "polygon");

        polygon.setAttribute("class", "collapsedClade");

        polygon.setAttribute("points", vertexString);
        polygon.setAttribute("fill", "gray");
        polygon.setAttribute("stroke", "black");
        polygon.setAttribute("vector-effect", "non-scaling-stroke");
        polygon.setAttribute("shape-rendering", "auto");

        return(polygon);
    }


    function createSVG(layout) {
        // Create SVG element:
        var svg = document.createElementNS(NS, "svg");
        svg.setAttribute("xmlns", NS);
        svg.setAttribute("version","1.1");
        svg.setAttribute('width', TreeStyle.width);
        svg.setAttribute('height', TreeStyle.height);
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.style.strokeWidth = TreeStyle.lineWidth + "px";
        svg.style.fontSize = TreeStyle.fontSize + "px";
        svg.style.fontFamily = "sans-serif";

        // Add white background rectangle:
        var rect = document.createElementNS(NS, "rect");
        rect.setAttribute("x", 0);
        rect.setAttribute("y", 0);
        rect.setAttribute("width", TreeStyle.width);
        rect.setAttribute("height", TreeStyle.height);
        rect.setAttribute("fill", "white");
        svg.appendChild(rect);

        // Draw axis:
        //this.updateAxis(svg); // Drawn by zoom controller.

        var nodeID, thisNode;

        // Draw node bars:

        if (TreeStyle.nodeBarTrait !== undefined) {
            for (nodeID in layout.nodePositions) {
                thisNode = layout.tree.getNode(nodeID);

                var traitValue = thisNode.annotation[TreeStyle.nodeBarTrait];
                if (traitValue !== undefined && traitValue.length === 2) {
                    var nodePos = layout.nodePositions[thisNode];
                    var minPos = posXform([nodePos[0], layout.getScaledHeight(Number(traitValue[0]))]);
                    var maxPos = posXform([nodePos[0], layout.getScaledHeight(Number(traitValue[1]))]);

                    svg.appendChild(newNodeBar(minPos, maxPos));
                }
            }
        }

        // Discard any previously-collected trait information
        seenColourTraitValues = [];

        // Draw tree edges:

        for (nodeID in layout.nodePositions) {
            thisNode = layout.tree.getNode(nodeID);

            // Skip leaf hybrid nodes.
            if (thisNode.isHybrid() && thisNode.isLeaf())
                continue;

            // Skip collapsed nodes:
            if (thisNode in layout.collapsedCladeNodes)
                continue;

            var thisPos = posXform(layout.nodePositions[thisNode]);

            var parentPos;
            if (!thisNode.isRoot())
                parentPos = posXform(layout.nodePositions[thisNode.parent]);
            else
                parentPos = posXform([layout.nodePositions[thisNode][0], 1.0]);

            var edgeOpacityFactor;
            if (TreeStyle.edgeOpacityTrait !== undefined && thisNode.annotation[TreeStyle.edgeOpacityTrait] !== undefined)
                edgeOpacityFactor = thisNode.annotation[TreeStyle.edgeOpacityTrait];
            else
                edgeOpacityFactor = 1.0;

            var branch = newBranch(thisPos, parentPos, getColourTraitValue(thisNode), edgeOpacityFactor);
            branch.id = thisNode;
            svg.appendChild(branch);
        }

        // Draw collapsed clades:
        for (nodeID in layout.collapsedCladeRoots) {
            var pos = layout.nodePositions[nodeID];
            var posRoot = posXform(pos.slice(0,2));
            var posLeft = posXform(pos.slice(2,4));
            var posRight = posXform(pos.slice(4,6));

            var clade = newCollapsedClade(posRoot, posLeft, posRight);
            clade.id = nodeID;
            svg.appendChild(clade);
        }

        // Draw recombinant edges

        if (TreeStyle.displayRecomb) {
            for (var recombID in layout.tree.getRecombEdgeMap()) {
                var recombSrc = layout.tree.getRecombEdgeMap()[recombID][0];
                var recombDest = layout.tree.getRecombEdgeMap()[recombID][1];

                // Skip recombinations within a single collapsed clade:
                if (recombSrc in layout.collapsedCladeNodes && recombDest in layout.collapsedCladeNodes &&
                    layout.collapsedCladeNodes[recombSrc] === layout.collapsedCladeNodes[recombDest])
                    continue;

                var childPos = posXform(layout.nodePositions[recombSrc]);
                var childPrimePos = posXform(layout.nodePositions[recombDest]);
                var parentPos = posXform(layout.nodePositions[recombDest.parent]);

                var recombOpacityFactor;
                if (TreeStyle.recombOpacityTrait !== undefined && recombDest.annotation[TreeStyle.recombOpacityTrait] !== undefined)
                    recombOpacityFactor = recombDest.annotation[TreeStyle.recombOpacityTrait];
                else
                    recombOpacityFactor = 1.0;

                var branch = newRecombinantBranch(childPos, childPrimePos, parentPos,
                                                  getColourTraitValue(recombDest), recombOpacityFactor);
                branch.id = recombDest;
                svg.appendChild(branch);

                // Add end markers
                svg.appendChild(newNodeMark(posXform(layout.nodePositions[recombSrc])));

                if (TreeStyle.inlineRecomb && !(recombDest.parent in layout.collapsedCladeRoots ||
                                                recombDest.parent in layout.collapsedCladeNodes))
                    svg.appendChild(newNodeMark(posXform(layout.nodePositions[recombDest.parent])));

                if (recombDest in layout.collapsedCladeNodes)
                    svg.appendChild(newNodeMark(parentPos));
            }
        }

        // Assign colours to trait classes:

        genColourPallet(seenColourTraitValues.length);

        var traitsAreNumeric = true;
        for (i=0; i<seenColourTraitValues.length; i++) {
            var traitVal = seenColourTraitValues[i];
            if (isNaN(traitVal-0)) {
                traitsAreNumeric = false;
                break;
            }
        }
        if (traitsAreNumeric) {
            seenColourTraitValues.sort(function(a, b) {return a-b;});
        } else {
            seenColourTraitValues.sort();
        }
        for (var t=0; t<seenColourTraitValues.length; t++ ) {
            var thisVal = seenColourTraitValues[t];
            var lines = svg.getElementsByClassName("trait_" + window.btoa(thisVal));
            for (var l=0; l<lines.length; l++) {
                lines[l].setAttribute("stroke", colourPallet[t]);
            }
        }

        // Draw tip and recombinant edge labels:

        if (TreeStyle.tipTextTrait !== undefined) {
            for (var i=0; i<layout.leafGroups.length; i++) {
                thisNode = layout.leafGroups[i][0];

                if (thisNode in layout.collapsedCladeRoots || thisNode.isHybrid())
                    continue;

                var trait = TreeStyle.tipTextTrait;

                var traitValue;
                if (trait === "label")
                    traitValue = thisNode.label;
                else {
                    if (thisNode.annotation[trait] !== undefined)
                        traitValue = thisNode.annotation[trait];
                    else
                        traitValue = "";
                }

                var pos = posXform(layout.nodePositions[thisNode]);
                svg.appendChild(newNodeText(pos, traitValue));
            }
        }

        if (TreeStyle.displayRecomb && TreeStyle.recombTextTrait !== undefined) {
            for (var i=0; i<layout.leafGroups.length; i++) {
                thisNode = layout.leafGroups[i][0];

                if (thisNode in layout.collapsedCladeRoots || !thisNode.isHybrid() || !thisNode.isLeaf())
                    continue;

                var trait = TreeStyle.recombTextTrait;

                var traitValue;
                if (trait === "label")
                    traitValue = thisNode.label;
                else {
                    if (thisNode.annotation[trait] !== undefined)
                        traitValue = thisNode.annotation[trait];
                    else
                        traitValue = "";
                }

                var pos = posXform(layout.nodePositions[thisNode]);

                svg.appendChild(newNodeText(pos, traitValue));
            }
        }


        // Draw internal node labels:

        if (TreeStyle.nodeTextTrait !== undefined) {
            for (nodeID in layout.nodePositions) {
                thisNode = layout.tree.getNode(nodeID);

                if (thisNode.isLeaf() || thisNode in layout.collapsedCladeRoots || thisNode in layout.collapsedCladeNodes)
                    continue;

                var traitValue;
                if (TreeStyle.nodeTextTrait === "label")
                    traitValue = thisNode.label;
                else {
                    if (thisNode.annotation[TreeStyle.nodeTextTrait] !== undefined)
                        traitValue = thisNode.annotation[TreeStyle.nodeTextTrait];
                    else
                        traitValue = "";
                }

                if (traitValue !== "") {
                    var pos = posXform(layout.nodePositions[thisNode]);
                    var offset = [0,0];
                    if (thisNode.children.length === 1)
                        offset[1] = -2.5;

                    if (thisNode.children.length >1)
                        offset[0] = 2.5;

                    var text = newNodeText(pos, traitValue, offset);
                    text.setAttribute("class", "internalText");
                    svg.appendChild(text);
                }
            }
        }

        // Mark internal nodes:

        for (nodeID in layout.nodePositions) {
            thisNode = layout.tree.getNode(nodeID);

            if (thisNode in layout.collapsedCladeRoots || thisNode in layout.collapsedCladeNodes)
                continue;

            if (TreeStyle.markSingletonNodes && thisNode.children.length == 1) {
                svg.appendChild(newNodeMark(posXform(layout.nodePositions[thisNode])));
            }
            // else {
            //     if (thisNode.isHybrid()) {
            //         if (thisNode.children.length == 1)
            //             svg.appendChild(newNodeMark(posXform(layout.nodePositions[thisNode])));
            //         else if (TreeStyle.inlineRecomb && thisNode.isLeaf())
            //             svg.appendChild(newNodeMark(posXform(layout.nodePositions[thisNode.parent])));
            //     }
            // }
        }

        // Attach event handlers for pan and zoom:
        ZoomControl.init(svg, layout);

        // Attach event handler for edge stats popup:
        EdgeStatsControl.init(svg, layout);

        // Handler for tree modifications:
        TreeModControl.init(svg, layout);

        return svg;
    }

    // }}}

    return {
        updateAxis: updateAxis,
        createSVG: createSVG
    };
}) ();

// }}}

// ---- TreeModControl ---- {{{
var TreeModControl = {
    init: function(svg, layout) {
        this.svg = svg;
        this.layout = layout;

        var handler = function(event) {
            var nodeID = event.target.getAttribute("id");
            var node = layout.origTree.getNode(nodeID);

            if (event.ctrlKey) {
                // Re-root

                layout.origTree.reroot(node);
            } else {
                // Collapse clade

                if (node.isLeaf())
                    return;

                node.collapsed = !node.collapsed;
            }

            update();
        };

        Array.from(svg.getElementsByClassName("treeEdge")).forEach(function(el) {
            el.addEventListener("click", handler);
        });

        Array.from(svg.getElementsByClassName("collapsedClade")).forEach(function(el) {
            el.addEventListener("click", handler);
        });
    }
};

// }}}

// ---- EdgeStatsControl ---- {{{
// Dynamically creates a table and a containing div with id phyloStat.

var EdgeStatsControl = {

    init: function(svg, layout) {
        this.svg = svg;
        this.tree = layout.tree;

        // Create stat box element:
        this.phyloStat = document.getElementById("phyloStat");
        if (this.phyloStat === null) {
            this.phyloStat = document.createElement("div");
            this.phyloStat.setAttribute("id", "phyloStat");

            var table = document.createElement("table");
            table.innerHTML = "\
                <tr><td class='key'>Branch length</td> <td class='value' id='psBL'></td></tr> \
                <tr><td class='key'>Parent age</td><td class='value' id='psPA'></td></tr> \
                <tr><td class='key'>Child age</td><td class='value' id='psCA'></td></tr> \
                <tr><td class='key'>Child label</td><td class='value' id='psCL'></td> \
                <tr><td class='key'>Child attribs</td><td class='value' id='psCAT'></td>";
            this.phyloStat.appendChild(table);

            document.getElementsByTagName("body")[0].appendChild(this.phyloStat);
        }

        // Add event handler
        svg.addEventListener("mousemove", this.mouseMoveEventHandler.bind(this));

        // Avoid conflict with zooming controls:
        this.phyloStat.addEventListener("mousewheel",
                function(event) {event.preventDefault();});
        this.phyloStat.addEventListener("DOMMouseScroll",
                function(event) {event.preventDefault();});

    },

    mouseMoveEventHandler: function(event) {
        var classAttr = event.target.getAttribute("class");
        if (classAttr === null || classAttr.split(" ").indexOf("treeEdge")<0) {
            if (this.highlightedEdge !== undefined) {
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
            var f = this.svg.width.baseVal.value/this.svg.viewBox.baseVal.width;
            var newStrokeWidth = Math.max(curStrokeWidth*1.5, 8/f);

            this.highlightedEdge.setAttribute("stroke-width", newStrokeWidth+"px");
            this.displayStatsBox(event.target.getAttribute("id"), event.pageX, event.pageY);
        } else {
            return false;
        }
    },

    displayStatsBox: function(nodeId, x, y) {

        var prec = 6;
        var pixelOffset = 10;

        if (x>window.innerWidth/2) {
            this.phyloStat.style.left = "";
            this.phyloStat.style.right = (window.innerWidth-x+pixelOffset) + "px";
        } else {
            this.phyloStat.style.left = (x+pixelOffset) + "px";
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

        var bl = pretty(node.branchLength);
        var pa = (node.parent !== undefined) ?  pretty(node.parent.height) : pretty(undefined);
        var ca = pretty(node.height);
        var cl = pretty(node.label);

        document.getElementById("psBL").innerHTML = bl;
        document.getElementById("psPA").innerHTML = pa;
        document.getElementById("psCA").innerHTML = ca;
        document.getElementById("psCL").innerHTML = cl;

        var psCAT = document.getElementById("psCAT");
        if (Object.keys(node.annotation).length>0) {
            var ul =  document.createElement("ul");
            ul.style.margin = "0px";
            ul.style.padding = "0px";
            for (var att in node.annotation) {
                var li = document.createElement("li");
                li.innerHTML = att + ": ";
                if (!Array.isArray(node.annotation[att])) {
                    li.innerHTML += pretty(node.annotation[att]);
                } else {
                    for (var i = 0; i<node.annotation[att].length; i++) {
                        if (i>0)
                            li.innerHTML += ", ";
                        li.innerHTML += pretty(node.annotation[att][i]);
                    }
                }
                ul.appendChild(li);
            }

            psCAT.innerHTML = "";
            psCAT.appendChild(ul);

        } else {
            psCAT.innerHTML = "NA";
        }

        this.phyloStat.style.display = "block";
    },

    hideStatsBox: function() {
        this.phyloStat.style.display = "none";
    }
};

// }}}

// ---- ZoomControl ---- {{{
// Handles panning and zooming of displayed tree.

var ZoomControl = {
    initialised: false,

    init: function(svg, layout) {
        this.svg = svg;
        this.layout = layout;

        // Add mouse event handlers
        svg.addEventListener("mousewheel",
                this.zoomEventHandler.bind(this)); // Chrome
        svg.addEventListener("DOMMouseScroll",
                this.zoomEventHandler.bind(this)); // FF (!!)

        svg.addEventListener("mousemove",
                this.panEventHandler.bind(this));

        // Prevent default handling of these events (Firefox uses them for drag+drop.)
        svg.addEventListener("mousedown",
                function(event) {event.preventDefault();});

        svg.addEventListener("mouseup",
                function(event) {event.preventDefault();});
    },

    setBBox: function() {

        var bbox = this.svg.getBBox();

        // Addjust bbox to account for margins

        bbox.x -= TreeStyle.marginLeft;
        bbox.width += TreeStyle.marginLeft + TreeStyle.marginRight;
        bbox.y -= TreeStyle.marginTop;
        bbox.height += TreeStyle.marginTop + TreeStyle.marginBottom;

        // Adjust bbox to account for nominally-sized text labels

        var rightmostTextWidth;
        var rightmostTextPos;
        var textElements = this.svg.getElementsByTagName("text");
        for (var i=0; i<textElements.length; i++) {
            var textEl = textElements[i];
            textEl.transform.baseVal.clear();
            var textBBox = textEl.getBBox();

            if (rightmostTextWidth === undefined ||
                    (textBBox.x + textBBox.width) > (rightmostTextPos + rightmostTextWidth)) {
                rightmostTextWidth = textBBox.width;
                rightmostTextPos = textBBox.x;
            }
        }

        if (rightmostTextWidth !== undefined) {
            var W = this.svg.getAttribute("width");
            var newWidth = (rightmostTextPos-bbox.x)/(1 - rightmostTextWidth/W);
            bbox.width = Math.max(newWidth, bbox.width);
        }

        // These are the relative differences in width and height
        // between the original SVG and the viewbox expanded to
        // include all elements including those which exceed the
        // original SVG bounds.
        this.xDilation=bbox.width/this.svg.getAttribute("width");
        this.yDilation=bbox.height/this.svg.getAttribute("height");

        // Set initial view box if undefined:
        if (!this.initialised) {
            this.width = bbox.width;
            this.height = bbox.height;
            this.x = bbox.x;
            this.y = bbox.y;

            this.centre = [
                Math.round(this.x + this.width/2),
                Math.round(this.y + this.height/2) ];
            this.zoomFactorX = 1.0;
            this.zoomFactorY = 1.0;
            this.initialised = true;
        } else {
            // Update centre on dimension change
            if (this.zoomFactorX == 1) {
                this.centre[0] = Math.round(bbox.x + bbox.width/2);
            } else {
                this.zoomFactorX = this.zoomFactorX*bbox.width/this.width;
            }
            this.width = bbox.width;
            this.x = bbox.x;

            if (this.zoomFactorY == 1) {
                this.centre[1] = Math.round(bbox.y + bbox.height/2);
            } else {
                this.zoomFactorY = this.zoomFactorY*bbox.height/this.height;
            }
            this.height = bbox.height;
            this.y = bbox.y;
        }

        this.updateView();

        // Ensure text positions and node mark sizes are correct
        this.updateNonAxisTextScaling();
        this.updateInternalNodeMarkScaling();
    },

    updateView: function() {

        // Sanitize zoom factor
        this.zoomFactorX = Math.max(this.zoomFactorX,1);
        this.zoomFactorY = Math.max(this.zoomFactorY,1);

        var widthZoomed = this.width/this.zoomFactorX;
        var heightZoomed = this.height/this.zoomFactorY;

        // Sanitize centre point
        this.centre[0] = Math.max(this.x + 0.5*widthZoomed, this.centre[0]);
        this.centre[0] = Math.min(this.x + this.width - 0.5*widthZoomed, this.centre[0]);

        this.centre[1] = Math.max(this.y + 0.5*heightZoomed, this.centre[1]);
        this.centre[1] = Math.min(this.y + this.height - 0.5*heightZoomed, this.centre[1]);

        var x = Math.max(this.x, this.centre[0] - 0.5*widthZoomed);
        var y = Math.max(this.y, this.centre[1] - 0.5*heightZoomed);

        this.svg.setAttribute("viewBox", x + " " + y + " " +
                              widthZoomed + " " + heightZoomed);

        // Ensure displayed axis is up to date.
        Display.updateAxis(this.svg, this.layout);
        this.updateAxisTextScaling();

    },

    updateAxisTextScaling: function() {
        var axisElements = this.svg.getElementsByClassName("axisComponent");
        for (var i=0; i<axisElements.length; i++) {
            if (axisElements[i].tagName != "text")
                continue;

            this.updateTextElementScaling(axisElements[i]);
        }
    },

    updateNonAxisTextScaling: function() {
        var textElements = this.svg.getElementsByTagName("text");
        for (var i=0; i<textElements.length; i++) {
            if (textElements[i].className == "axisComponent")
                continue;

            this.updateTextElementScaling(textElements[i]);
        }
    },

    updateTextElementScaling: function(textEl) {
        var textPosX = textEl.getAttribute("x")*1.0;
        var textPosY = textEl.getAttribute("y")*1.0;
        var tlate = this.svg.createSVGMatrix();
        tlate.e = textPosX*(this.zoomFactorX/this.xDilation - 1.0);
        tlate.f = textPosY*(this.zoomFactorY/this.yDilation - 1.0);
        var tlateXform = this.svg.createSVGTransformFromMatrix(tlate);

        var scaleMat = this.svg.createSVGMatrix();
        scaleMat.a = 1.0/this.zoomFactorX*this.xDilation;
        scaleMat.d = 1.0/this.zoomFactorY*this.yDilation;
        var scaleXform = this.svg.createSVGTransformFromMatrix(scaleMat);

        textEl.transform.baseVal.clear();

        textEl.transform.baseVal.appendItem(scaleXform);
        textEl.transform.baseVal.appendItem(tlateXform);

        if (textEl.hasAttribute("pixelOffsetX")) {
            var oldOffset, newOffset;

            oldOffset = textEl.getAttribute("pixelOffsetX")*this.zoomFactorX/this.xDilation;
            newOffset = textEl.getAttribute("pixelOffsetX")*1.0;
            deltaX = newOffset - oldOffset;

            oldOffset = textEl.getAttribute("pixelOffsetY")*this.zoomFactorY/this.yDilation;
            newOffset = textEl.getAttribute("pixelOffsetY")*1.0;
            deltaY = newOffset - oldOffset;

            var offsetXform = this.svg.createSVGTransform();
            offsetXform.setTranslate(deltaX, deltaY);
            textEl.transform.baseVal.appendItem(offsetXform);
        }

        if (textEl.hasAttribute("angle")) {
            var rotateXform = this.svg.createSVGTransform();
            rotateXform.setRotate(textEl.getAttribute("angle")*1.0, textPosX, textPosY);
            textEl.transform.baseVal.appendItem(rotateXform);
        }
    },

    updateInternalNodeMarkScaling: function() {
        var nodeMarkElements = this.svg.getElementsByClassName("internalNodeMark");
        for (var i=0; i<nodeMarkElements.length; i++) {
            var dash = nodeMarkElements[i];

            var w = 2*TreeStyle.lineWidth/this.zoomFactorX*this.xDilation;
            var h = 2*TreeStyle.lineWidth/this.zoomFactorY*this.yDilation;

            dash.setAttribute("rx", w);
            dash.setAttribute("ry", h);
        }
    },

    zoomEventHandler: function(event) {
        event.preventDefault();

        if (event.altKey)
            return;

        var dir = (event.wheelDelta || -event.detail);

        var zoomFactorXP = this.zoomFactorX;
        var zoomFactorYP = this.zoomFactorY;

        var verticalZoom = true;
        var horizontalZoom = true;
        if (event.shiftKey) {
            horizontalZoom = false;
        } else {
            if (event.ctrlKey) {
                verticalZoom = false;
            }
        }

        if (dir>0) {
            // Zoom in
            if (verticalZoom)
                zoomFactorYP *= 1.1;
            if (horizontalZoom)
                zoomFactorXP *= 1.1;


        } else {
            // Zoom out
            if (verticalZoom)
                zoomFactorYP = Math.max(1, zoomFactorYP/1.1);
            if (horizontalZoom)
                zoomFactorXP = Math.max(1, zoomFactorXP/1.1);
        }

        var width = this.svg.getAttribute("width");
        var height = this.svg.getAttribute("height");

        // Get SVG coordinates of mouse pointer:
        var point = this.svg.createSVGPoint();
        point.x = event.clientX;
        point.y = event.clientY;
        point = point.matrixTransform(this.svg.getScreenCTM().inverse());

        // Update centre so that SVG coordinates under mouse don't change:
        this.centre[0] = point.x + (this.centre[0] - point.x)*this.zoomFactorX/zoomFactorXP;
        this.centre[1] = point.y + (this.centre[1] - point.y)*this.zoomFactorY/zoomFactorYP;

        this.zoomFactorX = zoomFactorXP;
        this.zoomFactorY = zoomFactorYP;

        this.updateView();
        this.updateNonAxisTextScaling();
        this.updateInternalNodeMarkScaling();

        this.zeroPanOrigin(event.layerX, event.layerY);
    },

    zeroPanOrigin: function(x, y) {
        this.dragOrigin = [x,y];
        this.oldCentre = [this.centre[0], this.centre[1]];
    },

    panEventHandler: function(event) {

        var b;
        if (event.buttons !== undefined)
            b = event.buttons; // FF
        else
            b = event.which;   // Chrome

        if (b === 0) {
            this.zeroPanOrigin(event.layerX, event.layerY);
            return false;
        }

        event.preventDefault();

        // Move centre so that coordinate under mouse don't change:
        this.centre[0] = this.oldCentre[0] -
            (event.layerX - this.dragOrigin[0])/this.zoomFactorX;
        this.centre[1] = this.oldCentre[1] -
            (event.layerY - this.dragOrigin[1])/this.zoomFactorY;

        this.updateView();
    },

    // Method to revert to original (unzoomed) state
    reset: function() {
        this.zoomFactorX = 1.0;
        this.zoomFactorY = 1.0;
        this.updateView();
        this.updateNonAxisTextScaling();
        this.updateInternalNodeMarkScaling();
    }
};

// }}}

// vim:fdm=marker
