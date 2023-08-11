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

    edgeColourTrait: undefined,
    nodeColourTrait: undefined,

    tipTextTrait: "label",
    nodeTextTrait: undefined,
    recombTextTrait: undefined,
    labelPrec: 0,
    angleText: true,

    edgeWidthTrait: undefined,
    recombWidthTrait: undefined,

    nodeBarTrait: undefined,

    axis: "None",
    axisOffset: 0,
    maxAxisTicks: 20,

    legend: false,

    logScale: false,
    logScaleRelOffset: 0.001,

    markSingletonNodes: false,
    collapseZeroLengthEdges: true,

    displayRecomb: true,
    inlineRecomb: true,
    minRecombEdgeLength: true,

    lineWidth: 2,
    minLineWidth: 1,
    fontSize: 11,

    sortNodes: true,
    sortNodesDecending: true
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

    var edgeColourAssignment = undefined;
    var nodeColourAssignment = undefined;

    // Generate a colour pallet for N distinct trait values
    function genColourPallet (colourAssignment) {
        if (colourAssignment === undefined)
            return;

        // Taken from https://gist.github.com/mjackson/5311256
        function hslToRgb(h, s, l) {
            function hue2rgb(p, q, t) {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            }

            var r, g, b;

            if (s === 0) {
                r = g = b = l; // achromatic
            } else {
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

        colourAssignment.colourPallet = [];
        var N = colourAssignment.seenColourTraitValues.length;
        var delta = Math.min(0.33, 1/N);
        for (var idx=0; idx<N; idx++) {
            var hue = 1 - idx*delta;
            var lightness = (hue>0.1 && hue<0.5) ? 0.30 : 0.45;
            colourAssignment.colourPallet[idx] = hslToRgb(hue, 1, lightness);
        }
    }

    // Assign colours to svg elements
    function assignColours(svg, colourAssignment) {
        if (colourAssignment === undefined)
            return;
        
        genColourPallet(colourAssignment);

        var traitsAreNumeric = true;
        for (i=0; i<colourAssignment.seenColourTraitValues.length; i++) {
            var traitVal = colourAssignment.seenColourTraitValues[i];
            if (isNaN(traitVal-0)) {
                traitsAreNumeric = false;
                break;
            }
        }
        if (traitsAreNumeric) {
            colourAssignment.seenColourTraitValues.sort(function(a, b) {return a-b;});
        } else {
            colourAssignment.seenColourTraitValues.sort();
        }
        for (var t=0; t<colourAssignment.seenColourTraitValues.length; t++ ) {
            var thisVal = colourAssignment.seenColourTraitValues[t];
            var svgEls = svg.getElementsByClassName(colourAssignment.type + "trait_" + window.btoa(thisVal));
            for (var l=0; l<svgEls.length; l++) {
                svgEls[l].setAttribute(colourAssignment.attribute, colourAssignment.colourPallet[t]);
            }
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

    function drawLegend(svg, colourAssignment, offset) {
        if (colourAssignment.seenColourTraitValues.length == 0)
            return 0;

        if (offset === undefined)
            offset = 0;
        
        var legendHeight = colourAssignment.seenColourTraitValues.length*20 + 45;

        coord = svg.createSVGPoint();
        coord.x = 10;
        coord.y = TreeStyle.height - legendHeight - offset;
        transformToSVG(svg, coord);

        title = document.createElementNS(NS, "text");
        title.setAttribute("class", "axisComponent");
        title.setAttribute("x",  coord.x);
        title.setAttribute("y",  coord.y);

        var titleText;
        if (colourAssignment.type == "edge")
            titleText = "Edge colour: ";
        else
            titleText = "Node colour: ";

        var trait = colourAssignment.colourTrait;
        titleText += trait[0].toUpperCase() + trait.substr(1).toLowerCase();

        title.textContent = titleText;
        svg.appendChild(title);


        var svgFragment = document.createDocumentFragment();
        for (var i=0; i<colourAssignment.seenColourTraitValues.length; i++) {

            coord = svg.createSVGPoint();
            coord.x = 20;
            coord.y = TreeStyle.height - legendHeight + 15 + i*20 - offset;

            transformToSVG(svg, coord);

            var dot;
            if (colourAssignment.type == "edge") {
                dot = document.createElementNS(NS, "rect");
                dot.setAttribute("x", coord.x - getSVGWidth(svg, 5));
                dot.setAttribute("y", coord.y - getSVGHeight(svg, 2));
                dot.setAttribute("width", getSVGWidth(svg, 10));
                dot.setAttribute("height", getSVGHeight(svg, 4));
                dot.setAttribute("class", "axisComponent");
            } else {
                dot = document.createElementNS(NS, "ellipse");
                dot.setAttribute("cx", coord.x);
                dot.setAttribute("cy", coord.y);
                dot.setAttribute("rx", getSVGWidth(svg, 5));
                dot.setAttribute("ry", getSVGHeight(svg, 5));
                dot.setAttribute("shape-rendering", "auto");
            }
            dot.setAttribute("fill", colourAssignment.colourPallet[i]);
            dot.setAttribute("class", "axisComponent");
            svgFragment.appendChild(dot);

            label = document.createElementNS(NS, "text");
            label.setAttribute("dominant-baseline", "central");
            label.setAttribute("class", "axisComponent");
            label.setAttribute("x", coord.x + getSVGWidth(svg, 15));
            label.setAttribute("y", coord.y);
            label.setAttribute("fill", colourAssignment.colourPallet[i]);
            label.textContent = colourAssignment.seenColourTraitValues[i];
            svgFragment.appendChild(label);
        }

        svg.appendChild(svgFragment);

        return legendHeight;
    }

    // Add/update axis to tree visualization.
    function updateAxis(svg, layout) {
        // Delete any existing axis components
        while (svg.getElementsByClassName("axisComponent").length>0) {
            svg.removeChild(svg.getElementsByClassName("axisComponent")[0]);
        }

        var label, title, coord, dot;

        if (TreeStyle.axis !== "None") {

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
                axisStart = treeHeight*bottomRight[1];
                axisEnd = treeHeight*topLeft[1];
                var minDelta = (axisEnd-axisStart)/(TreeStyle.maxAxisTicks-1);
                delta = Math.pow(10,Math.ceil(Math.log(minDelta)/Math.log(10)));

                if (TreeStyle.axis === "Forward time")
                    axisStart = TreeStyle.axisOffset - delta*Math.floor((TreeStyle.axisOffset - axisStart)/delta);
                else
                    axisStart = delta*Math.ceil((axisStart + TreeStyle.axisOffset)/delta) - TreeStyle.axisOffset;
            } else {
                axisStart = Math.max(0.0, bottomRight[1]);
                axisEnd = topLeft[1];
                delta = 2*(axisEnd-axisStart)/(TreeStyle.maxAxisTicks-1);
            }


            // Draw ticks:
            var h = axisStart;
            while (h <= axisEnd) {
                label = "";
                if (!TreeStyle.logScale) {
                    if (TreeStyle.axis === "Forward time")
                        label = parseFloat((TreeStyle.axisOffset - h).toPrecision(10));
                    else
                        label = parseFloat((h + TreeStyle.axisOffset).toPrecision(10));
                    axisLine(svg, h/treeHeight, label, bottomRight[0], topLeft[0]);
                } else {
                    var trueHeight = lso*Math.pow(treeHeight/lso + 1, h) - lso;
                    if (TreeStyle.axis === "Forward time")
                        label = Number((TreeStyle.axisOffset - trueHeight).toPrecision(5)).toExponential();
                    else
                        label =  Number((trueHeight + TreeStyle.axisOffset).toPrecision(5)).toExponential();
                    axisLine(svg, h, label, bottomRight[0], topLeft[0]);
                }
                h += delta;
            }
        }

        if (TreeStyle.legend) {
            var offset = 0;
            if (edgeColourAssignment !== undefined)
                offset = drawLegend(svg, edgeColourAssignment);

            if (nodeColourAssignment !== undefined)
                drawLegend(svg, nodeColourAssignment, offset);
        }
    }

    // }}} 


    /**** Main SVG Creation Functions ****/

    // {{{ 

    // Returns value of colour trait for given node:
    function getColourTraitValue(node, colourAssignment) {
        if (colourAssignment === undefined)
            return undefined;

        var traitValue;
        if (colourAssignment.colourTrait === "Label")
            traitValue = node.label;
        else
            traitValue = node.annotation[colourAssignment.colourTrait];

        if (traitValue !== undefined && colourAssignment.seenColourTraitValues.indexOf(traitValue)<0) {
            colourAssignment.seenColourTraitValues = colourAssignment.seenColourTraitValues.concat(traitValue);
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
    function newBranch(childPos, parentPos, colourTrait, edgeWidthFactor) {
        var pathStr = "M " + childPos[0] + " " + childPos[1];
        pathStr += " H " + parentPos[0];
        pathStr += " V " + parentPos[1];
        var path = document.createElementNS(NS, "path");
        path.setAttribute("d", pathStr);
        path.setAttribute("fill", "none");

        var classes = "treeEdge";

        if (colourTrait !== undefined)
            classes += " edgetrait_" + window.btoa(colourTrait);
        else
            path.setAttribute("stroke", "black");

        path.setAttribute("stroke-width", TreeStyle.minLineWidth +
                          edgeWidthFactor*(TreeStyle.lineWidth - TreeStyle.minLineWidth));

        path.setAttribute("class", classes);

        path.setAttribute("vector-effect", "non-scaling-stroke");

        return(path);
    }

    // Draw recombination edge
    function newRecombinantBranch(childPos, childPrimePos, parentPos, colourTrait, recombWidthFactor) {
        var pathStr = "M " + childPos[0] + " " + childPos[1];
        pathStr += " L " + childPrimePos[0] + " " + childPrimePos[1];

        pathStr += " H " + parentPos[0];
        pathStr += " V " + parentPos[1];

        var path = document.createElementNS(NS, "path");
        path.setAttribute("d", pathStr);
        path.setAttribute("fill", "none");

        var classes = "treeEdge";
        if (colourTrait !== undefined)
            classes += " edgetrait_" + window.btoa(colourTrait);
        else
            path.setAttribute("stroke", "black");

        path.setAttribute("stroke-width", TreeStyle.minLineWidth +
                          recombWidthFactor*(TreeStyle.lineWidth - TreeStyle.minLineWidth));

        path.setAttribute("class", classes);

        path.setAttribute("vector-effect", "non-scaling-stroke");

        var dashLength = 3*TreeStyle.lineWidth;
        var gapLength = 1*TreeStyle.lineWidth;
        path.setAttribute("stroke-dasharray", dashLength + ", " + gapLength);

        return(path);
    }

    // Draw node text
    function newNodeText(pos, string, baseline, offset) {
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

        // Record offset to allow zoom methods to update position as required
        if (offset) {
            text.setAttribute("pixelOffsetX", offset[0]*TreeStyle.lineWidth);
            text.setAttribute("pixelOffsetY", offset[1]*TreeStyle.lineWidth);
        }

        // Choose how to define baseline of text
        text.setAttribute("dominant-baseline", baseline);

        // Limit precision of numeric labels
        if (TreeStyle.labelPrec>0) {
            text.textContent = pretty(string, TreeStyle.labelPrec);
        } else {
            text.textContent = string;
        }

        return(text);
    }

    // Draw internal node marker
    function newNodeMark(pos, colourTrait) {
        var bullet = document.createElementNS(NS, "ellipse");
        var radius = 0.0; // Will be set appropriately by ZoomControl
        bullet.setAttribute("cx", pos[0]);
        bullet.setAttribute("cy", pos[1]);
        bullet.setAttribute("rx", radius);
        bullet.setAttribute("ry", radius);
        bullet.setAttribute("shape-rendering", "auto");

        var classes = "nodeMark";
        if (colourTrait !== undefined)
            classes += " nodetrait_" + window.btoa(colourTrait);
        else
            bullet.setAttribute("fill", "black");

        bullet.setAttribute("class", classes);
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
        rect.setAttribute("id", "backgroundRect");

        rect.setAttribute("x", 0);  // Fill these in before exporting
        rect.setAttribute("y", 0);
        rect.setAttribute("width", 0);
        rect.setAttribute("height", 0);

        rect.setAttribute("fill", "white");
        svg.appendChild(rect);

        // Draw axis:
        //this.updateAxis(svg); // Drawn by zoom controller.

        var nodeID, thisNode;

        // Draw node bars:

        var traitValue;

        if (TreeStyle.nodeBarTrait !== undefined) {
            for (nodeID in layout.nodePositions) {
                thisNode = layout.tree.getNode(nodeID);

                traitValue = thisNode.annotation[TreeStyle.nodeBarTrait];
                if (traitValue !== undefined && traitValue.length === 2) {
                    var nodePos = layout.nodePositions[thisNode];
                    var minPos = posXform([nodePos[0], layout.getScaledHeight(Number(traitValue[0]))]);
                    var maxPos = posXform([nodePos[0], layout.getScaledHeight(Number(traitValue[1]))]);

                    svg.appendChild(newNodeBar(minPos, maxPos));
                }
            }
        }

        // Discard any previously-collected trait information

        edgeColourAssignment = undefined;
        if (TreeStyle.edgeColourTrait !== undefined)
            edgeColourAssignment = {type: "edge",
                                    attribute: "stroke",
                                    colourTrait: TreeStyle.edgeColourTrait,
                                    seenColourTraitValues: []};

        nodeColourAssignment = undefined;
        if (TreeStyle.nodeColourTrait !== undefined)
            nodeColourAssignment = {type: "node",
                                    attribute: "fill",
                                    colourTrait: TreeStyle.nodeColourTrait,
                                    seenColourTraitValues: []};

        // Identify maximum values for edge width traits:

        var edgeWidthTraitMax;
        if (TreeStyle.edgeWidthTrait !== undefined) {
            edgeWidthTraitMax = 0;
            for (nodeID in layout.nodePositions) {
                thisNode = layout.tree.getNode(nodeID);
                if (thisNode.annotation[TreeStyle.edgeWidthTrait] !== undefined)
                    edgeWidthTraitMax = Math.max(edgeWidthTraitMax, thisNode.annotation[TreeStyle.edgeWidthTrait]);
            }
        }

        // Draw tree edges:

        var parentPos, branch;

        for (nodeID in layout.nodePositions) {
            thisNode = layout.tree.getNode(nodeID);

            // Skip hybrid destNodes.
            if (thisNode.isHybrid() && !layout.tree.isRecombSrcNode(thisNode))
                continue;

            // Skip collapsed nodes:
            if (thisNode in layout.collapsedCladeNodes)
                continue;

            var thisPos = posXform(layout.nodePositions[thisNode]);

            if (!thisNode.isRoot())
                parentPos = posXform(layout.nodePositions[thisNode.parent]);
            else
                parentPos = posXform([layout.nodePositions[thisNode][0], 1.0]);

            var edgeWidthFactor;
            if (TreeStyle.edgeWidthTrait !== undefined && thisNode.annotation[TreeStyle.edgeWidthTrait] !== undefined)
                edgeWidthFactor = Number(thisNode.annotation[TreeStyle.edgeWidthTrait])/edgeWidthTraitMax;
            else
                edgeWidthFactor = 1.0;

            branch = newBranch(thisPos, parentPos, getColourTraitValue(thisNode, edgeColourAssignment), edgeWidthFactor);
            branch.id = thisNode;
            svg.appendChild(branch);
        }

        // Draw collapsed clades:
        var pos;

        for (nodeID in layout.collapsedCladeRoots) {
            pos = layout.nodePositions[nodeID];
            var posRoot = posXform(pos.slice(0,2));
            var posLeft = posXform(pos.slice(2,4));
            var posRight = posXform(pos.slice(4,6));

            var clade = newCollapsedClade(posRoot, posLeft, posRight);
            clade.id = nodeID;
            svg.appendChild(clade);
        }

        // Identify maximum values for recombinant edge width traits:

        var recombID, recombSrc, recombDestIdx, recombDest, recombWidthTraitMax;

        if (TreeStyle.recombWidthTrait !== undefined) {
            recombWidthTraitMax = 0;
            for (recombID in layout.tree.getRecombEdgeMap()) {
                var recombSrc = layout.tree.getRecombEdgeMap()[recombID][0];
                for (recombDestIdx=1; recombDestIdx<layout.tree.getRecombEdgeMap()[recombID].length; recombDestIdx++) {
                    var recombDest = layout.tree.getRecombEdgeMap()[recombID][recombDestIdx];
                    if (recombDest.annotation[TreeStyle.recombWidthTrait] !== undefined)
                        recombWidthTraitMax = Math.max(recombWidthTraitMax,
                                                       recombDest.annotation[TreeStyle.recombWidthTrait]);
                }
            }
        }

        // Draw recombinant edges
        
        var childPos, childPrimePos;

        if (TreeStyle.displayRecomb) {
            for (recombID in layout.tree.getRecombEdgeMap()) {
                var recombSrc = layout.tree.getRecombEdgeMap()[recombID][0];

                for (recombDestIdx=1; recombDestIdx<layout.tree.getRecombEdgeMap()[recombID].length; recombDestIdx++) {
                    var recombDest = layout.tree.getRecombEdgeMap()[recombID][recombDestIdx];

                    // Skip recombinations within a single collapsed clade:
                    if (recombSrc in layout.collapsedCladeNodes && recombDest in layout.collapsedCladeNodes &&
                        layout.collapsedCladeNodes[recombSrc] === layout.collapsedCladeNodes[recombDest])
                        continue;

                    childPos = posXform(layout.nodePositions[recombSrc]);
                    childPrimePos = posXform(layout.nodePositions[recombDest]);
                    parentPos = posXform(layout.nodePositions[recombDest.parent]);

                    var recombWidthFactor;
                    if (TreeStyle.recombWidthTrait !== undefined && recombDest.annotation[TreeStyle.recombWidthTrait] !== undefined)
                        recombWidthFactor = recombDest.annotation[TreeStyle.recombWidthTrait]/recombWidthTraitMax;
                    else
                        recombWidthFactor = 1.0;

                    branch = newRecombinantBranch(childPos, childPrimePos, parentPos,
                                                  getColourTraitValue(recombDest, edgeColourAssignment),
                                                  recombWidthFactor);
                    branch.id = recombDest;
                    svg.appendChild(branch);

                    // Get colour trait value if available
                    var colourTraitValue;
                    if (nodeColourAssignment !== undefined)
                        colourTraitValue = getColourTraitValue(recombSrc, nodeColourAssignment);

                    // Add end markers
                    svg.appendChild(newNodeMark(posXform(layout.nodePositions[recombSrc]),
                                               colourTraitValue));

                    if (TreeStyle.inlineRecomb && !(recombDest.parent in layout.collapsedCladeRoots ||
                        recombDest.parent in layout.collapsedCladeNodes))
                        svg.appendChild(newNodeMark(posXform(layout.nodePositions[recombDest.parent])));

                    if (recombDest in layout.collapsedCladeNodes)
                        svg.appendChild(newNodeMark(parentPos));

                }
            }
        }

        // Assign colours to edge trait classes:

        assignColours(svg, edgeColourAssignment);

        // Mark additional nodes:

        for (nodeID in layout.nodePositions) {
            thisNode = layout.tree.getNode(nodeID);

            if (thisNode in layout.collapsedCladeRoots
                || thisNode in layout.collapsedCladeNodes
                || thisNode.isHybrid())
                continue;

            // Get colour trait value if available
            var colourTraitValue;
            if (nodeColourAssignment !== undefined)
                colourTraitValue = getColourTraitValue(thisNode, nodeColourAssignment);
                
            // Mark coloured and/or singleton nodes if requested:
            if (colourTraitValue !== undefined ||
                (TreeStyle.markSingletonNodes && thisNode.children.length == 1)) {
                svg.appendChild(newNodeMark(posXform(layout.nodePositions[thisNode]),
                                            colourTraitValue));
            }
        }

        // Assign colours to node trait classes:

        assignColours(svg, nodeColourAssignment);

        // Set up DOM fragment to which text objects will be appended
        // (Dramatically improves rendering speed.)
        var svgFragment = document.createDocumentFragment();

        // Draw tip and recombinant edge labels:

        var i, trait;
        if (TreeStyle.tipTextTrait !== undefined) {
            for (i=0; i<layout.leafGroups.length; i++) {
                thisNode = layout.leafGroups[i][0];

                if (thisNode in layout.collapsedCladeRoots || (thisNode.isHybrid() && !layout.tree.isRecombSrcNode(thisNode)))
                    continue;

                trait = TreeStyle.tipTextTrait;

                if (trait === "label")
                    traitValue = thisNode.label;
                else {
                    if (thisNode.annotation[trait] !== undefined)
                        traitValue = thisNode.annotation[trait];
                    else
                        traitValue = "";
                }

                pos = posXform(layout.nodePositions[thisNode]);
                svgFragment.appendChild(newNodeText(pos, traitValue, "central"));
            }
        }

        if (TreeStyle.displayRecomb && TreeStyle.recombTextTrait !== undefined) {
            for (i=0; i<layout.leafGroups.length; i++) {
                thisNode = layout.leafGroups[i][0];

                if (thisNode in layout.collapsedCladeRoots ||
                        !thisNode.isHybrid() ||
                        (thisNode.isHybrid() && layout.tree.isRecombSrcNode(thisNode)))
                    continue;

                trait = TreeStyle.recombTextTrait;

                if (trait === "label")
                    traitValue = thisNode.label;
                else {
                    if (thisNode.annotation[trait] !== undefined)
                        traitValue = thisNode.annotation[trait];
                    else
                        traitValue = "";
                }

                pos = posXform(layout.nodePositions[thisNode]);

                svgFragment.appendChild(newNodeText(pos, traitValue, "central"));
            }
        }

        // Draw internal node labels:

        if (TreeStyle.nodeTextTrait !== undefined) {
            for (nodeID in layout.nodePositions) {
                thisNode = layout.tree.getNode(nodeID);

                if (thisNode.isLeaf() || thisNode in layout.collapsedCladeRoots || thisNode in layout.collapsedCladeNodes)
                    continue;

                if (TreeStyle.nodeTextTrait === "label")
                    traitValue = thisNode.label;
                else {
                    if (thisNode.annotation[TreeStyle.nodeTextTrait] !== undefined)
                        traitValue = thisNode.annotation[TreeStyle.nodeTextTrait];
                    else
                        traitValue = "";
                }

                if (traitValue !== "") {
                    pos = posXform(layout.nodePositions[thisNode]);
                    var offset = [0,0];
                    var baseline;
                    if (thisNode.children.length === 1) {
                        offset[1] = -2.5;
                        baseline = "no-change";
                    }

                    if (thisNode.children.length >1) {
                        offset[0] = 2.5;
                        baseline = "central";
                    }

                    var text = newNodeText(pos, traitValue, baseline, offset);
                    text.setAttribute("class", "internalText");
                    svgFragment.appendChild(text);
                }
            }
        }

        // Append DOM fragment containing text objects to main SVG.
        svg.appendChild(svgFragment);

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

        var clickHandler = function(event) {
            var nodeID = event.target.getAttribute("id");
            var node = layout.origTree.getNode(nodeID);

            event.preventDefault();

            if (event.shiftKey) {
                // Re-root
                TreeModControl.reroot(node);

            } else if (event.which == 3) {
                // Rotate children
                TreeModControl.rotateChildren(node);

            } else {
                // Toggle collapse
                TreeModControl.collapse(node, !event.altKey);
            }
        };

        Array.from(svg.getElementsByClassName("treeEdge")).forEach(function(el) {
            el.addEventListener("click", clickHandler);
            el.addEventListener("contextmenu", clickHandler);
        });

        Array.from(svg.getElementsByClassName("collapsedClade")).forEach(function(el) {
            el.addEventListener("click", clickHandler);
        });
    },

    reroot: function(node) {
        var layout = this.layout;

        if (layout.origTree.isRecombDestNode(node))
            return;

        var isTimeNetwork = layout.origTree.isTimeTree && Object.keys(layout.origTree.getRecombEdgeMap()).length>0;
        var isAnnotated = false;
        for (var i=0; i<layout.origTree.getNodeList().length; i++) {
            if (Object.keys(layout.origTree.getNodeList()[i].annotation).length>0) {
                isAnnotated = true;
                break;
            }
        }

        if (isTimeNetwork || isAnnotated) {

            var warningText = "<img src='images/alert.png'/>";

            var annotatedTreeWarningText =
                "You are attempting to reroot a tree/network containing node annotations. " +
                "In the case that these include annotations of the node's parental edge, " +
                "this operation will result in an incorrectly annotated tree. " +
                "(See <a target='new' href='http://biorxiv.org/content/early/2016/09/07/035360'>this preprint</a> " +
                "of Czech et al. for a detailed description of the problem.)";

            var timeNetworkWarningText =
                "You are attempting to reroot a network which includes explicit branch lengths.  " +
                "This operation cannot preserve these branch lengths and may even result in " +
                "negative branch lengths.";


            if (isTimeNetwork && isAnnotated) {
                warningText += "<ul><li>" + timeNetworkWarningText + "</li><li>" + annotatedTreeWarningText + "</li></ul>";
            } else {
                if (isTimeNetwork)
                    warningText += "<p>" + timeNetworkWarningText + "</p>";
                else
                    warningText += "<p>" + annotatedTreeWarningText + "</p>";
            }


            $("<div class='warning'/>").dialog({
                title: "Warning!",
                modal: true,
                width: 400,
                buttons: {
                    Abort: function() {
                        $(this).dialog("close");
                    },
                    Continue: function() {
                        $(this).dialog("close");
                        TreeModControl.expandAllClades();
                        layout.origTree.reroot(node);
                        update();
                    }
                },
                close: function(event, ui) {
                    $(this).dialog("destroy").remove();
                }
            }).html(warningText);
        } else {
            this.expandAllClades();
            layout.origTree.reroot(node);
            update();
        }
    },

    collapse: function(node, useCartoon) {
        // Abort on leaf nodes
        if (node.isLeaf())
            return;

        // Abort when node has only hybrid destNode leaf children
        if (node.children.filter(function(child) {
            return !layout.origTree.isRecombDestNode(child);
        }).length === 0)
            return;

        if (node.collapsed && !useCartoon) {
            node.cartoon = !node.cartoon;
        } else {
            node.collapsed = !node.collapsed;
            node.cartoon = useCartoon;
        }

        update();
    },

    expandAllClades: function() {
        for (var i=0; i<this.layout.tree.getNodeList().length; i++) {
            this.layout.origTree.getNodeList()[i].collapsed = false;
        }
    },

    rotateChildren: function(node) {

        if (node.children.length>1) {
            var firstChild = node.children[0];
            node.children.splice(0,1);
            node.children.push(firstChild);
        }

        update();
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
                this.highlightedEdge.setAttribute("stroke-width", this.oldHighlightedEdgeAttr);
                this.highlightedEdge = undefined;
            }
            return false;
        }

        if (this.highlightedEdge === undefined) {
            this.highlightedEdge = event.target;

            var newStrokeWidth = TreeStyle.lineWidth*3;

            this.oldHighlightedEdgeAttr = this.highlightedEdge.getAttribute("stroke-width");
            this.highlightedEdge.setAttribute("stroke-width", newStrokeWidth+"px");
            this.displayStatsBox(event.target.getAttribute("id"), event.pageX, event.pageY);
        } else {
            return false;
        }
    },

    displayStatsBox: function(nodeId, x, y) {

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
        this.updateNodeMarkScaling();
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

    updateNodeMarkScaling: function() {
        var nodeMarkElements = this.svg.getElementsByClassName("nodeMark");
        for (var i=0; i<nodeMarkElements.length; i++) {
            var dash = nodeMarkElements[i];

            var radius = 0.5*TreeStyle.lineWidth + Math.sqrt(1.5*TreeStyle.lineWidth);
            var w = radius/this.zoomFactorX*this.xDilation;
            var h = radius/this.zoomFactorY*this.yDilation;

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

        var verticalZoom = !event.shiftKey;
        var horizontalZoom = !event.ctrlKey;

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
        this.updateNodeMarkScaling();

        this.zeroPanOrigin(event.layerX, event.layerY);

        // Temporary work-around for bug in Chrome SVG rendering
        if (browserIsChrome())
            update();
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
        this.updateNodeMarkScaling();
    }
};

// }}}

// vim:fdm=marker
