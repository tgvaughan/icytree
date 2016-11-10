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
    prec = typeof prec !== 'undefined' ? prec : 5;

    var nVal = Number(val);
    if (Number.isNaN(nVal))
        return val;

    val = nVal.toPrecision(prec);
    if (val.indexOf('.')<0)
        return val;

    return val.replace(/\.?0*$/,"");
}

// Tree style:

var TreeStyle = {
    nodePositions: {},

    width: 640,
    height: 480,

    marginTop: 40,
    marginBottom: 10,
    marginLeft: 10,
    marginRight: 40,

    colourTrait: undefined,
    seenColourTraits: [],
    colourPallet: [],

    tipTextTrait: "label",
    nodeTextTrait: undefined,
    recombTextTrait: undefined,
    labelPrec: 0,

    edgeOpacityTrait: undefined,
    recombOpacityTrait: undefined,

    nodeBarTrait: undefined,

    axis: false,
    axisForwards: false,
    axisOffset: 0,
    maxAxisTicks: 20,

    legend: false,

    logScale: false,
    logScaleRelOffset: 0.01,

    markSingletonNodes: false,

    displayRecomb: true,
    inlineRecomb: true,

    lineWidth: 2,
    fontSize: 11
};

// Tree layout

function TreeLayout(tree) {
    this.tree = tree;
}

function TimeTreeLayout(tree, useLogScale) {
    TreeLayout.call(this, tree);
    this.useLogScale = uselogScale;
}

TimeTreeLayout.prototype = Object.create(TreeLayout.prototype);
TimeTreeLayout.prototype.constructor = TimeTreeLayout;

TimeTreeLayout.prototype.getTotalTreeHeight = function() {
    var treeHeight = this.tree.root.height;
    if (this.tree.root.branchLength !== undefined)
        treeHeight += this.tree.root.branchLength;
    else
        treeHeight += 0.01*this.tree.root.height; // short faux root edge

    return treeHeight;
};

TimeTreeLayout.prototype.getScaledHeight = function(height, useLogScale) {
    var treeHeight = this.getTotalTreeHeight();
    var lso = this.logScaleRelOffset*treeHeight;
    if (useLogScale) {
        return (Math.log(height + lso) - Math.log(lso))/
            (Math.log(treeHeight + lso) - Math.log(lso));
    } else {
        return height/treeHeight;
    }
};


    // Helper methods

    transformToSVG: {value: function(svg, coord) {
        if (svg.viewBox.baseVal !== null ||
                (svg.viewBox.baseVal.width === 0 && svg.viewBox.baseVal.height === 0)) {
            coord.x = svg.viewBox.baseVal.x +  coord.x*svg.viewBox.baseVal.width/this.width;
            coord.y = svg.viewBox.baseVal.y +  coord.y*svg.viewBox.baseVal.height/this.height;
        }

        return coord;
    }},

    getSVGWidth: {value: function(svg, screenWidth) {
        if (svg.viewBox.baseVal === null ||
                svg.viewBox.baseVal.width === 0 ||
                    svg.viewBox.baseVal.height === 0)
            return screenWidth;
        else
            return screenWidth*svg.viewBox.baseVal.width/this.width;
    }},

    getSVGHeight: {value: function(svg, screenHeight) {
        if (svg.viewBox.baseVal === null ||
                svg.viewBox.baseVal.width === 0 ||
                    svg.viewBox.baseVal.height === 0)
            return screenHeight;
        else
            return screenHeight*svg.viewBox.baseVal.height/this.height;
    }},

    // Generate a colour pallet for N distinct trait values
    genColourPallet: {value: function(N) {

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

        this.colourPallet = [];
        var delta = Math.min(0.33, 1/N);
        for (var idx=0; idx<N; idx++) {
            var hue = 1 - idx*delta;
            var lightness = (hue>0.1 && hue<0.5) ? 0.30 : 0.45;
            this.colourPallet[idx] = hslToRgb(hue, 1, lightness);
        }
    }},


    // Produce a standard rectangular layout:
    standardLayout: {value: function() {

        var savedThis = this;

        this.nodePositions = {};

        var treeHeight = this.getTotalTreeHeight();
        var treeWidth;

        // Position leaves
        var leaves = this.tree.getLeafList();
        if (leaves.length === 1) {
            // Special case for single-leaf trees
            this.nodePositions[leaves[0]] = [
                0.5,
                this.getScaledHeight(leaves[0].height, this.logScale)
            ];
            treeWidth = 1.0;
        } else {
            for (var i=0; i<leaves.length; i++) {
                this.nodePositions[leaves[i]] = [
                    i/(leaves.length-1),
                    this.getScaledHeight(leaves[i].height, this.logScale)
                ];
            }
            treeWidth = leaves.length-1;
        }

        // Position internal nodes
        function positionInternals(node, nodePositions, logScale) {
            if (node.isLeaf())
                return nodePositions[node][0];

            var xpos = 0;
            var nonHybridCount = 0;

            for (var i=0; i<node.children.length; i++) {
                if (savedThis.inlineRecomb && node.children[i].isHybrid() && node.children[i].isLeaf()) {
                    positionInternals(node.children[i], nodePositions, logScale);
                } else {
                    xpos += positionInternals(node.children[i], nodePositions, logScale);
                    nonHybridCount += 1;
                }
            }

            if (nonHybridCount > 0)
                xpos /= nonHybridCount;
            else
                xpos = nodePositions[node.children[0]][0]

            nodePositions[node] = [
                xpos,
                savedThis.getScaledHeight(node.height, logScale)
            ];

            return xpos;
        }
        positionInternals(this.tree.root, this.nodePositions, this.logScale);

        return this;
    }},

    // Produce a rectangular layout suitable for transmission trees:
    transmissionLayout: {value: function() {

        var savedThis = this;

        this.nodePositions = {};

        var treeHeight = this.getTotalTreeHeight();
        var treeWidth;

        // Position leaves
        var leaves = this.tree.getLeafList();
        if (leaves.length === 1) {
            // Special case for single-leaf trees
            this.nodePositions[leaves[0]] = [
                0.5,
                this.getScaledHeight(leaves[0].height, this.logScale)
            ];
            treeWidth = 1.0;
        } else {
            for (var i=0; i<leaves.length; i++) {
                this.nodePositions[leaves[i]] = [
                    i/(leaves.length-1),
                    this.getScaledHeight(leaves[i].height, this.logScale)
                ];
            }
            treeWidth = leaves.length-1;
        }

        // Position internal nodes
        function positionInternals(node, nodePositions, logScale) {
            if (node.isLeaf())
                return nodePositions[node][0];

            var xpos = positionInternals(node.children[0], nodePositions, logScale);
            for (var i=1; i<node.children.length; i++)
                positionInternals(node.children[i], nodePositions, logScale);

            nodePositions[node] = [
                xpos,
                savedThis.getScaledHeight(node.height, logScale)
            ];

            return xpos;
        }
        positionInternals(this.tree.root, this.nodePositions, this.logScale);

        return this;
    }},

    // Transform from tree to SVG coordinates
    posXform: {value: function (treePos) {
        var xpos = (1-treePos[1])*(this.width - this.marginLeft - this.marginRight) + this.marginLeft;
        var ypos = (1-treePos[0])*(this.height - this.marginTop - this.marginBottom) + this.marginTop;
        return [xpos, ypos];
    }},


    // Transform from SVG to tree coordinates
    invXform: {value: function (svgPos) {
        var treePosY = 1 - (svgPos[0] - this.marginLeft)/(this.width - this.marginLeft - this.marginRight);
        var treePosX = 1 - (svgPos[1] - this.marginTop)/(this.height - this.marginTop - this.marginBottom);

        return [treePosX, treePosY];
    }},

    // Add/update axis to tree visualization.
    updateAxis: {value: function(svg) {

        var savedThis = this;
        var NS="http://www.w3.org/2000/svg";

        // Delete any existing axis components
        while (svg.getElementsByClassName("axisComponent").length>0) {
            svg.removeChild(svg.getElementsByClassName("axisComponent")[0]);
        }

        if (this.axis) {

            // Select tick number and spacing
            var treeHeight = this.getTotalTreeHeight();
            var lso = this.logScaleRelOffset*treeHeight;

            // Acquire coordinates of viewBox
            var topLeft, bottomRight;
            if (svg.viewBox.baseVal === null) {
                topLeft = this.invXform([0,0]);
                bottomRight = this.invXform([this.width, this.height]);
            } else {
                topLeft = this.invXform([svg.viewBox.baseVal.x, svg.viewBox.baseVal.y]);
                bottomRight = this.invXform([svg.viewBox.baseVal.x + svg.viewBox.baseVal.width,
                        svg.viewBox.baseVal.y + svg.viewBox.baseVal.height]);
            }

            var axisStart, axisEnd, delta;
            if (!this.logScale) {
                axisStart = treeHeight*Math.max(0.0, bottomRight[1]);
                axisEnd = treeHeight*Math.min(1.0, topLeft[1]);
                var minDelta = (axisEnd-axisStart)/(this.maxAxisTicks-1);
                delta = Math.pow(10,Math.ceil(Math.log(minDelta)/Math.log(10)));
                axisStart = delta*Math.ceil(axisStart/delta);
            } else {
                axisStart = Math.max(0.0, bottomRight[1]);
                axisEnd = topLeft[1];
                delta = 2*(axisEnd-axisStart)/(this.maxAxisTicks-1);
            }


            // Function for drawing one tick:
            function axisLine(thisH, thisLabel, lower, upper) {
                var bot = savedThis.posXform([lower, thisH]);
                var top = savedThis.posXform([upper, thisH]);

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

            // Draw ticks:
            var h = axisStart;
            while (h <= axisEnd) {
                var label = "";
                if (!this.logScale) {
                    if (this.axisForwards)
                        label = parseFloat((axisOffset - h).toPrecision(5));
                    else
                        label = parseFloat((h + axisOffset).toPrecision(5));
                    axisLine(h/treeHeight, label, bottomRight[0], topLeft[0]);
                } else {
                    var trueHeight = lso*Math.pow(treeHeight/lso + 1, h) - lso;
                    if (this.axisForwards)
                        label = Number((axisOffset - trueHeight).toPrecision(5)).toExponential();
                    else
                        label =  Number((trueHeight + axisOffset).toPrecision(5)).toExponential();
                    axisLine(h, label, bottomRight[0], topLeft[0]);
                }
                h += delta;
            }
        }

        if (this.legend && this.seenColourTraitValues !== null) {

            if (this.seenColourTraitValues.length>0) {
                var coord = svg.createSVGPoint();
                coord.x = 10;
                coord.y = this.height - this.seenColourTraitValues.length*20 - 30 - 15;
                this.transformToSVG(svg, coord);

                var title = document.createElementNS(NS, "text");
                title.setAttribute("class", "axisComponent");
                title.setAttribute("x",  coord.x);
                title.setAttribute("y",  coord.y);
                //title.textContent = "Legend:";
                var trait = this.colourTrait;
                title.textContent = trait[0].toUpperCase() + trait.substr(1).toLowerCase();
                svg.appendChild(title);
            }

            for (var i=0; i<this.seenColourTraitValues.length; i++) {

                var coord = svg.createSVGPoint();
                coord.x = 20;
                coord.y = this.height - this.seenColourTraitValues.length*20 - 30 + i*20;
                this.transformToSVG(svg, coord);

                var dot = document.createElementNS(NS, "rect");
                dot.setAttribute("x", coord.x - this.getSVGWidth(svg, 5));
                dot.setAttribute("y", coord.y - this.getSVGHeight(svg, 5));
                dot.setAttribute("width", this.getSVGWidth(svg, 10));
                dot.setAttribute("height", this.getSVGHeight(svg, 10));
                dot.setAttribute("fill", this.colourPallet[i]);
                dot.setAttribute("class", "axisComponent");
                svg.appendChild(dot);

                var label = document.createElementNS(NS, "text");
                label.setAttribute("class", "axisComponent");
                label.setAttribute("x", coord.x + this.getSVGWidth(svg, 15));
                label.setAttribute("y", coord.y + this.getSVGHeight(svg, 5));
                label.setAttribute("fill", this.colourPallet[i]);
                label.textContent = this.seenColourTraitValues[i];
                svg.appendChild(label);
            }

        }
    }},

    // Visualize tree on SVG object
    // Currently assumes landscape, rectangular style.
    // Need to generalise.
    display: {value: function() {

        // Save this for inline functions:
        var savedThis = this;

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
        svg.style.fontFamily = "sans-serif";

        // Add white background rectangle:
        var rect = document.createElementNS(NS, "rect");
        rect.setAttribute("x", 0);
        rect.setAttribute("y", 0);
        rect.setAttribute("width", this.width);
        rect.setAttribute("height", this.height);
        rect.setAttribute("fill", "white");
        svg.appendChild(rect);

        // Draw axis:
        //this.updateAxis(svg); // Drawn by zoom controller.

        // Draw tree:

        this.seenColourTraitValues = [];

        function selectColourTrait(node) {
            if (savedThis.colourTrait === undefined)
                return undefined;

            var traitValue = node.annotation[savedThis.colourTrait];

            if (traitValue !== undefined && savedThis.seenColourTraitValues.indexOf(traitValue)<0) {
                savedThis.seenColourTraitValues = savedThis.seenColourTraitValues.concat(traitValue);
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
            bar.setAttribute("stroke-width", savedThis.lineWidth*3);
            bar.setAttribute("class", "errorBar");
            return(bar);
        }

        if (this.nodeBarTrait !== undefined) {
            for (var i=0; i<this.tree.getNodeList().length; i++) {
                var thisNode = this.tree.getNodeList()[i];

                var traitValue = thisNode.annotation[this.nodeBarTrait];
                if (traitValue !== undefined && traitValue.length === 2) {
                    var nodePos = this.nodePositions[thisNode];
                    var minPos = this.posXform([nodePos[0],
                                               this.getScaledHeight(Number(traitValue[0]),
                                                                    this.logScale)]);
                    var maxPos = this.posXform([nodePos[0],
                                               this.getScaledHeight(Number(traitValue[1]),
                                                                    this.logScale)]);

                    svg.appendChild(newNodeBar(minPos, maxPos));
                }
            }
        }

        // Draw tree edges:

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

        for (var i=0; i<this.tree.getNodeList().length; i++) {
            var thisNode = this.tree.getNodeList()[i];

            // Skip leaf hybrid nodes.
            if (thisNode.isHybrid() && thisNode.isLeaf())
                continue;

            var thisPos = this.posXform(this.nodePositions[thisNode]);

            var parentPos;
            if (!thisNode.isRoot())
                parentPos = this.posXform(this.nodePositions[thisNode.parent]);
            else
                parentPos = this.posXform([this.nodePositions[thisNode][0], 1.0]);

            var edgeOpacityFactor;
            if (this.edgeOpacityTrait !== undefined && thisNode.annotation[this.edgeOpacityTrait] !== undefined)
                edgeOpacityFactor = thisNode.annotation[this.edgeOpacityTrait];
            else
                edgeOpacityFactor = 1.0;

            var branch = newBranch(thisPos, parentPos, selectColourTrait(thisNode), edgeOpacityFactor);
            branch.id = thisNode;
            svg.appendChild(branch);
        }

        // Draw recombinant edges

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


        if (this.displayRecomb) {
            for (var hybridID in this.tree.getHybridEdgeList()) {
                var edge = this.tree.getHybridEdgeList()[hybridID];

                var childPos = this.posXform(this.nodePositions[edge[0]]);
                var childPrimePos = this.posXform(this.nodePositions[edge[1]]);
                var parentPos = this.posXform(this.nodePositions[edge[1].parent]);

                var recombOpacityFactor;
                if (this.recombOpacityTrait !== undefined && thisNode.annotation[this.recombOpacityTrait] !== undefined)
                    recombOpacityFactor = edge[1].annotation[this.recombOpacityTrait];
                else
                    recombOpacityFactor = 1.0;

                var branch = newRecombinantBranch(childPos, childPrimePos, parentPos,
                                                  selectColourTrait(edge[1]), recombOpacityFactor);
                branch.id = edge[1];
                svg.appendChild(branch);
            }
        }

        // Assign colours to trait classes:

        this.genColourPallet(this.seenColourTraitValues.length);

        var traitsAreNumeric = true;
        for (var traitVal of this.seenColourTraitValues) {
            if (isNaN(traitVal-0)) {
                traitsAreNumeric = false;
                break;
            }
        }
        if (traitsAreNumeric) {
            this.seenColourTraitValues.sort(function(a, b) {return a-b;});
        } else {
            this.seenColourTraitValues.sort();
        }
        for (var t=0; t<this.seenColourTraitValues.length; t++ ) {
            var thisVal = this.seenColourTraitValues[t];
            var lines = svg.getElementsByClassName("trait_" + window.btoa(thisVal));
            for (var l=0; l<lines.length; l++) {
                lines[l].setAttribute("stroke", this.colourPallet[t]);
            }
        }

        // Draw tip and recombinant edge labels:

        function newNodeText(node, string) {
            var pos = savedThis.posXform(savedThis.nodePositions[node]);

            if (node.children.length === 1)
                pos[1] -= 2;

            var text = document.createElementNS(NS, "text");
            text.setAttribute("x", pos[0]);
            text.setAttribute("y", pos[1]);
            // text.setAttribute("vector-effect", "non-scaling-text"); // I wish

            // Limit precision of numeric labels
            if (savedThis.labelPrec>0 && !node.isLeaf()) {
                text.textContent = pretty(string, savedThis.labelPrec);
            } else {
                text.textContent = string;
            }

            return(text);
        }

        if (this.tipTextTrait !== undefined) {
            for (var i=0; i<this.tree.getLeafList().length; i++) {
                var thisNode = this.tree.getLeafList()[i];

                if (thisNode.isHybrid())
                    continue;

                var trait = this.tipTextTrait;

                var traitValue;
                if (trait === "label")
                    traitValue = thisNode.label;
                else {
                    if (thisNode.annotation[trait] !== undefined)
                        traitValue = thisNode.annotation[trait];
                    else
                        traitValue = "";
                }

                svg.appendChild(newNodeText(thisNode, traitValue));
            }
        }

        if (this.displayRecomb && this.recombTextTrait !== undefined) {
            for (var i=0; i<this.tree.getLeafList().length; i++) {
                var thisNode = this.tree.getLeafList()[i];

                if (!thisNode.isHybrid())
                    continue;

                var trait = this.recombTextTrait;

                var traitValue;
                if (trait === "label")
                    traitValue = thisNode.label;
                else {
                    if (thisNode.annotation[trait] !== undefined)
                        traitValue = thisNode.annotation[trait];
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

        // Mark internal nodes:

        function newNodeMark(node) {
            var pos = savedThis.posXform(savedThis.nodePositions[node]);

            var bullet = document.createElementNS(NS, "ellipse");
            bullet.setAttribute("cx", pos[0]);
            bullet.setAttribute("cy", pos[1]);
            bullet.setAttribute("rx", 2*savedThis.lineWidth);
            bullet.setAttribute("ry", 2*savedThis.lineWidth);
            bullet.setAttribute("fill", "black");
            bullet.setAttribute("shape-rendering", "auto");
            bullet.setAttribute("class","internalNodeMark");
            svg.appendChild(bullet);
        }

            for (var i=0; i<this.tree.getNodeList().length; i++) {
                var thisNode = this.tree.getNodeList()[i];

                if (this.markSingletonNodes && thisNode.children.length == 1) {
                    newNodeMark(thisNode);
                } else {
                    if (thisNode.isHybrid()) {
                        if (thisNode.children.length == 1)
                            newNodeMark(thisNode);
                        else if (this.inlineRecomb && thisNode.isLeaf())
                            newNodeMark(thisNode.parent);
                    }
                }
            }


        // Attach event handlers for pan and zoom:
        ZoomControl.init(svg, this);

        // Attach event handler for edge stats popup:
        EdgeStatsControl.init(svg, this.tree);

        return svg;
    }}
});


// EdgeStatsControl object
// Dynamically creates a table and a containing div with id phyloStat.
var EdgeStatsControl = {

    init: function(svg, tree) {
        this.svg = svg;
        this.tree = tree;

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

        var bl = "NA";
        if (node.branchLength !== undefined)
            bl = pretty(node.branchLength);

        var pa = "NA";
        if (node.parent !== undefined)
            pa = pretty(node.parent.height);

        var ca = pretty(node.height);
        var cl = node.label;

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
}


// ZoomControl object
// (Just a tidy way to package up these event handlers.)
var ZoomControl = {
    initialised: false,

    init: function(svg, layout) {
        this.svg = svg;
        this.layout = layout;

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

        // Ensure text positions and node mark sizes are correct
        this.updateNonAxisTextScaling();
        this.updateInternalNodeMarkScaling();

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


    updateView: function() {

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

        this.svg.setAttribute("viewBox", x + " " + y + " " +
                              widthZoomed + " " + heightZoomed);

        // Ensure displayed axis is up to date.
        this.layout.updateAxis(this.svg);
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
        tlate.e = textPosX*(this.zoomFactorX - 1.0);
        tlate.f = textPosY*(this.zoomFactorY - 1.0);
        var tlateXform = this.svg.createSVGTransformFromMatrix(tlate);

        var scaleMat = this.svg.createSVGMatrix();
        scaleMat.a = 1.0/this.zoomFactorX;
        scaleMat.d = 1.0/this.zoomFactorY;
        var scaleXform = this.svg.createSVGTransformFromMatrix(scaleMat);

        textEl.transform.baseVal.clear();
        textEl.transform.baseVal.appendItem(scaleXform);
        textEl.transform.baseVal.appendItem(tlateXform);
    },

    updateInternalNodeMarkScaling: function() {
        var nodeMarkElements = this.svg.getElementsByClassName("internalNodeMark");
        for (var i=0; i<nodeMarkElements.length; i++) {
            var dash = nodeMarkElements[i];

            var w = this.layout.getSVGWidth(this.svg, 2*this.layout.lineWidth);
            var h = this.layout.getSVGHeight(this.svg, 2*this.layout.lineWidth);

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