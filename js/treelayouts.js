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

// ---- Tree layouts ---- {{{

function TreeLayout(tree) {
    this.origTree = tree; // Need this for tree modifications

    this.tree = tree.copy();
    this.sortTree();
    this.collapseZeroLengthEdges();

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

TreeLayout.prototype.collapseZeroLengthEdges = function() {
    if (TreeStyle.collapseZeroLengthEdges) {
        this.tree.collapseZeroLengthEdges();
    }
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

            if (!this.tree.isRecombDestNode(descendent))
                continue;
            
            var recombID = descendent.hybridID;
            var recombSrc = this.tree.getRecombEdgeMap()[recombID][0];
            var recombDest = descendent;

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

        if (!(this.tree.isRecombDestNode(node)))
            youngest = Math.min(this.getScaledNodeHeight(node), youngest);
    }

    return youngest;
};

TreeLayout.prototype.getNLeafDescendents = function(descendents) {
    var n = 0;

    for (var i=0; i<descendents.length; i++) {
        var descendent = descendents[i];
        if (descendent.isLeaf() && !this.tree.isRecombDestNode(descendent))
            n += 1;
    }

    return n;
}

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
    var totalTreeWidth = 0;

    var leafGroupRoot;
    var i,j;
    var entry;

    for (i=0; i<nLeafGroups; i++) {
        leafGroupRoot = this.leafGroups[i][0];

        entry = [totalTreeWidth, this.getScaledNodeHeight(leafGroupRoot)];

        if (this.leafGroups[i].length>1) {
            var descendents = this.leafGroups[i][1];
            var youngest = this.getYoungestScaledHeight(descendents);

            if (leafGroupRoot.cartoon) {
                nLeafDescendents = this.getNLeafDescendents(descendents);
                entry.push(totalTreeWidth-0.24);
                entry.push(youngest);
                entry.push(totalTreeWidth + nLeafDescendents-1+0.24);
                entry.push(youngest);

                entry[0] = totalTreeWidth + (nLeafDescendents-1)/2;

                totalTreeWidth += nLeafDescendents;
            } else {
                entry.push(totalTreeWidth-0.24);
                entry.push(youngest);
                entry.push(totalTreeWidth+0.24);
                entry.push(youngest);

                totalTreeWidth += 1;
            }

            for (j=0; j<descendents.length; j++) {
                var descendent = descendents[j];

                if (!this.tree.isRecombDestNode(descendent))
                    this.nodePositions[descendent] = [entry[0], this.getScaledNodeHeight(descendent)];
            }
        } else {
            totalTreeWidth += 1;
        }

        this.nodePositions[leafGroupRoot] = entry;
    }

    var xform;
    if (totalTreeWidth > 1) {
        xform = function(x) {
            return x/(totalTreeWidth - 1);
        };
    } else  {
        xform = function(x) {
            return x + 0.5;
        };
    }

    for (var nodeID in this.nodePositions) {
        entry = this.nodePositions[nodeID];

        entry[0] = xform(entry[0]);
        if (entry.length>2) {
            entry[2] = xform(entry[2]);
            entry[4] = xform(entry[4]);
        }
    }

};

StandardTreeLayout.prototype.positionInternals = function(node) {
    if (node.collapsed || node.isLeaf())
        return this.nodePositions[node][0];

    var xpos = 0;
    var nonHybridCount = 0;

    for (var i=0; i<node.children.length; i++) {
        if (TreeStyle.inlineRecomb && this.tree.isRecombDestNode(node.children[i])) {
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
        if (node.isHybrid() && !this.tree.isRecombSrcNode(node)) {
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
    var nodesByRank = {};
    var destNodePs = {};

    var nodeID, node, rank;

    var i;

    // Group non-destNode nodes by rank:

    for (nodeID in this.nodeRanks) {
        node = this.tree.getNode(nodeID);
        rank = this.nodeRanks[nodeID];

        if (node.isLeaf()) {
            if (node.isHybrid())
                destNodePs[node.parent] = true;

            continue;
        }

        if (rank in nodesByRank)
            nodesByRank[rank].push(node);
        else
            nodesByRank[rank] = [node];
    }


    // Adjust potentially problematic nodes (leave recomb destNodes alone)

    for (rank in nodesByRank) {

        var movableNodes = [];

        for (i=0; i<nodesByRank[rank].length; i++) {
            node = nodesByRank[rank][i];
            if (node.isHybrid() || node in destNodePs)
                movableNodes.push(node);
        }

        if (movableNodes.length>1 || (movableNodes.length==1 && nodesByRank[rank].length - movableNodes.length>0)) {

            var delta = 1/(movableNodes.length+1);

            for (i=0; i<movableNodes.length; i++) {
                this.nodeRanks[movableNodes[i]] += (i+1)*delta;
            }
        }
    }

    // Update destNode ranks

    var recombID, hybridNodes;
    for (recombID in this.tree.getRecombEdgeMap()) {
        hybridNodes = this.tree.getRecombEdgeMap()[recombID];

        var srcNode = hybridNodes[0];

        for (i=1; i<hybridNodes.length; i++) {
            var destNode = hybridNodes[i];
            this.nodeRanks[destNode] = this.nodeRanks[srcNode];
        }
    }

};

CladogramLayout.prototype.getScaledNodeHeight = function(node) {
    if (this.nodeRanks === undefined) {
        this.nodeRanks = {};
        this.computeNodeRanks(this.tree.root);
        this.adjustRecombRanks();
    }

    if (this.nodeRanks[this.tree.root]>0)
        return this.nodeRanks[node]/(1.01*this.nodeRanks[this.tree.root]);
    else
        return 0;
};

// }}}
