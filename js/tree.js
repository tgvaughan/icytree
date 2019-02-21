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

// Node constructor

function Node(id) {
    this.id = id;

    this.parent =  undefined;
    this.children = [];
    this.height = undefined;
    this.branchLength = undefined;
    this.label = undefined;
    this.annotation = {};
    this.hybridID = undefined;
}

// Node methods

// Ensure nodes with unique IDs have unique hashes.
Node.prototype.toString = function() {
    return "node#" + this.id;
};

Node.prototype.addChild = function(child) {
    this.children.push(child);
    child.parent = this;
};

Node.prototype.removeChild = function(child) {
    var idx = this.children.indexOf(child);
    this.children.splice(idx, 1);
};

Node.prototype.isRoot = function() {
    return (this.parent === undefined);
};

Node.prototype.isLeaf = function() {
    return (this.children.length === 0);
};

Node.prototype.isSingleton = function() {
    return (this.children.length === 1);
};

Node.prototype.isHybrid = function() {
    return (this.hybridID !== undefined);
};

Node.prototype.getAncestors = function() {
    if (this.isRoot())
        return [this];
    else
        return [this].concat(this.parent.getAncestors());
};

// Returns true if this node is left of the argument on the
// tree.  If one node is the direct ancestor of the other,
// the result is undefined.
Node.prototype.isLeftOf = function(other) {
    var ancestors = this.getAncestors().reverse();
    var otherAncestors = other.getAncestors().reverse();

    var i;
    for (i=1; i<Math.min(ancestors.length, otherAncestors.length); i++) {
        if (ancestors[i] != otherAncestors[i]) {
            var mrca = ancestors[i-1];

            return mrca.children.indexOf(ancestors[i]) <
                mrca.children.indexOf(otherAncestors[i]);
        }
    }

    return undefined;
};

// Produce a deep copy of the clade below this node
Node.prototype.copy = function() {

    var nodeCopy = new Node(this.id);
    nodeCopy.height = this.height;
    nodeCopy.branchLength = this.branchLength;
    nodeCopy.label = this.label;
    for (var key in this.annotation)
        nodeCopy.annotation[key] = this.annotation[key];
    nodeCopy.id = this.id;
    nodeCopy.hybridID = this.hybridID;

    nodeCopy.collapsed = this.collapsed;
    nodeCopy.cartoon = this.cartoon;

    for (var i=0; i<this.children.length; i++)
        nodeCopy.addChild(this.children[i].copy());

    return nodeCopy;
};

// Apply f() to each node in subtree
Node.prototype.applyPreOrder = function(f) {
    var res = [];

    var thisRes = f(this);
    if (thisRes !== null)
        res = res.concat(thisRes);

    for (var i=0; i<this.children.length; i++)
        res = res.concat(this.children[i].applyPreOrder(f));

    return res;
};


// Tree constructor

function Tree(root) {
    this.root = root;
    this.computeNodeAges();
}

// Tree methods

// Compute node ages
Tree.prototype.computeNodeAges = function() {
    var heights = this.root.applyPreOrder(function(node) {
        if (node.parent === undefined)
            node.height = 0.0;
        else {
            if (node.branchLength !== undefined)
                node.height = node.parent.height - node.branchLength;
            else {
                node.height = NaN;
            }
        }

        return node.height;
    });
    var youngestHeight = Math.min.apply(null, heights);

    this.isTimeTree = !Number.isNaN(youngestHeight) && (heights.length>1 || this.root.branchLength !== undefined);

    for (var i=0; i<this.getNodeList().length; i++)
        this.getNodeList()[i].height -= youngestHeight;
};

// Assign new node IDs (use with care!)
Tree.prototype.reassignNodeIDs = function() {
    var nodeID = 0;
    for (var i=0; i<this.getNodeList().length; i++)
        this.getNodeList()[i].id = nodeID++;
};

// Clear various node caches:
Tree.prototype.clearCaches = function() {
    this.nodeList = undefined;
    this.nodeIDMap = undefined;
    this.leafList = undefined;
    this.recombEdgeMap = undefined;
};

// Retrieve list of nodes in tree.
// (Should maybe use accessor function for this.)
Tree.prototype.getNodeList = function() {
    if (this.nodeList === undefined && this.root !== undefined) {
        this.nodeList = this.root.applyPreOrder(function(node) {
            return node;
        });
    }

    return this.nodeList;
};

// Obtain node having given string representation:
Tree.prototype.getNode = function(nodeID) {
    if (this.nodeIDMap === undefined && this.root !== undefined) {
        this.nodeIDMap = {};
        for (var i=0; i<this.getNodeList().length; i++) {
            var node = this.getNodeList()[i];
            this.nodeIDMap[node] = node;
        }
    }

    return this.nodeIDMap[nodeID];
};

// Retrieve list of leaves in tree, in correct order.
Tree.prototype.getLeafList = function() {
    if (this.leafList === undefined && this.root !== undefined) {
        this.leafList = this.root.applyPreOrder(function(node) {
            if (node.isLeaf())
                return node;
            else
                return null;
        });
    }

    return this.leafList;
};

// Retrieve map from recomb edge IDs to src/dest node pairs
Tree.prototype.getRecombEdgeMap = function() {
    if (this.recombEdgeMap === undefined) {

        var node, i;
        var hybridNodeList;
        if (this.root !== undefined) {
            hybridNodeList = this.root.applyPreOrder(function(node) {
                if (node.isHybrid())
                    return node;
                else
                    return null;
            });
        } else {
            hybridNodeList = [];
        }

        var srcHybridIDMap = {};
        var destHybridIDMap = {};
        for (i=0; i<hybridNodeList.length; i++) {
            node = hybridNodeList[i];
            if (node.isLeaf()) {
                if (node.hybridID in destHybridIDMap)
                    destHybridIDMap[node.hybridID].push(node);
                else
                    destHybridIDMap[node.hybridID] = [node];
            } else
                srcHybridIDMap[node.hybridID] = node;
        }

        var hybridID;

        this.recombEdgeMap = {};
        for (hybridID in srcHybridIDMap) {
            if (hybridID in destHybridIDMap)
                this.recombEdgeMap[hybridID] = [srcHybridIDMap[hybridID]].concat(destHybridIDMap[hybridID]);
            else
                throw "Extended Newick error: hybrid nodes must come in groups of 2 or more.";
        }

        // Edge case: leaf recombinations

        for (hybridID in destHybridIDMap) {
            if (!(hybridID in this.recombEdgeMap))
                this.recombEdgeMap[hybridID] = [].concat(destHybridIDMap[hybridID]);
        }
    }

    return this.recombEdgeMap;
};

Tree.prototype.isRecombSrcNode = function(node) {
    return node.isHybrid() && this.getRecombEdgeMap()[node.hybridID][0] == node;
};

Tree.prototype.isRecombDestNode = function(node) {
    return node.isHybrid() && this.getRecombEdgeMap()[node.hybridID][0] != node;
};

Tree.prototype.isNetwork = function() {
    return Object.keys(this.getRecombEdgeMap()).length > 0;
};

// Sort nodes according to clade sizes.
Tree.prototype.sortNodes = function(decending) {
    if (this.root === undefined)
        return;

    function sortNodesRecurse(node) {
        var size = 1;
        var childSizes = {};
        for (var i=0; i<node.children.length; i++) {
            var thisChildSize = sortNodesRecurse(node.children[i]);
            size += thisChildSize;
            childSizes[node.children[i]] = thisChildSize;
        }

        node.children.sort(function(a,b) {
            if (decending)
                return childSizes[b]-childSizes[a];
            else
                return childSizes[a]-childSizes[b];
        });

        return size;
    }

    sortNodesRecurse(this.root);

    // Clear out-of-date leaf list
    this.leafList = undefined;
};

// Shuffle nodes
Tree.prototype.shuffleNodes = function() {
    if (this.root === undefined)
        return;

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function shuffleNodesRecurse(node) {
        for (let i=0; i<node.children.length; i++)
            shuffleNodesRecurse(node.children[i]);

        shuffleArray(node.children);
    }

    shuffleNodesRecurse(this.root)
}

// Minimize distance between hybrid pairs
Tree.prototype.minimizeHybridSeparation = function() {

    var recombEdgeMap = this.getRecombEdgeMap();

    for (var recombID in recombEdgeMap) {
        var srcNode = recombEdgeMap[recombID][0];

        for (var i=1; i<recombEdgeMap[recombID].length; i++) {
            var destNode = recombEdgeMap[recombID][i];
            var destNodeP = destNode.parent;

            destNodeP.removeChild(destNode);
            if (srcNode.isLeftOf(destNodeP)) {
                destNodeP.children.splice(0,0,destNode);
            } else {
                destNodeP.children.push(destNode);
            }
        }
    }
};

// Collapse zero-length edges:
Tree.prototype.collapseZeroLengthEdges = function() {

    this.root.applyPreOrder(function(node) {

        var childrenToConsider = node.children.slice();
        while (childrenToConsider.length > 0) {
            var child = childrenToConsider.pop();

            if (child.height == node.height) {
                node.removeChild(child);

                // Does this do the right thing for polytomy dummy nodes?
                node.annotation = child.annotation;
                node.label = child.label;

                for (var j=0; j<child.children.length; j++) {
                    var grandChild = child.children[j];
                    node.addChild(grandChild);
                    childrenToConsider.push(grandChild);
                }
            }
        }

    });

    // Invalidate cached leaf and node lists
    this.clearCaches();
};

// Re-root tree:
Tree.prototype.reroot = function(edgeBaseNode) {

    this.recombEdgeMap = undefined;
    var currentRecombEdgeMap = this.getRecombEdgeMap();

    var oldRoot = this.root;
    this.root = new Node();

    var edgeBaseNodeP = edgeBaseNode.parent;
    edgeBaseNodeP.removeChild(edgeBaseNode);
    this.root.addChild(edgeBaseNode);

    if (edgeBaseNode.branchLength !== undefined)
        edgeBaseNode.branchLength /= 2;

    var node = edgeBaseNodeP;
    var prevNode = this.root;
    var BL = edgeBaseNode.branchLength;
    var nodeP;

    var usedHybridIDs = {};
    for (var recombID in currentRecombEdgeMap) {
        usedHybridIDs[recombID] = true;
    }

    function recurseReroot(node, prevNode, seenNodes, BL) {
        if (node === undefined)
            return;

        if (node in seenNodes) {

            // Handle creation of hybrid nodes

            var newHybrid = new Node();
            if (node.isHybrid())
                newHybrid.hybridID = node.hybridID;
            else {
                var newHybridID = 0;
                while (newHybridID in usedHybridIDs) {
                    newHybridID += 1;
                }
                node.hybridID = newHybridID;
                newHybrid.hybridID = newHybridID;
                usedHybridIDs[newHybridID] = true;
            }

            newHybrid.branchLength = BL;
            prevNode.addChild(newHybrid);

            return;
        } else {
            seenNodes[node] = true;
        }

        var nodeP = node.parent;

        if (nodeP !== undefined)
            nodeP.removeChild(node);
        prevNode.addChild(node);

        var tmpBL = node.branchLength;
        node.branchLength = BL;
        BL = tmpBL;

        recurseReroot(nodeP, node, seenNodes, BL);

        if (node.isHybrid()) {
            var destNodes = [];
            var destNodePs = [];

            destNodes = currentRecombEdgeMap[node.hybridID].slice(1);
            destNodePs = destNodes.map(function(destNode) {
                return destNode.parent;
            });

            // Node will no longer be hybrid
            node.hybridID = undefined;

            for (var i=0; i<destNodes.length; i++) {
                destNodePs[i].removeChild(destNodes[i]);

                recurseReroot(destNodePs[i], node, seenNodes, destNodes[i].branchLength);
            }
        }

    }

    recurseReroot(node, prevNode, {}, BL);

    // Delete singleton node left by old root

    if (oldRoot.children.length == 1 && !oldRoot.isHybrid()) {
        var child = oldRoot.children[0];
        var parent = oldRoot.parent;
        parent.removeChild(oldRoot);
        oldRoot.removeChild(child);
        parent.addChild(child);

        child.branchLength = child.branchLength + oldRoot.branchLength;
    }

    // Clear out-of-date leaf and node lists
    this.clearCaches();

    // Recompute node ages
    this.computeNodeAges();

    // Create new node IDs:
    this.reassignNodeIDs();

    // Ensure destNode leaf heights match those of corresponding srcNodes
    for (recombID in this.getRecombEdgeMap()) {
        var srcNode = this.getRecombEdgeMap()[recombID][0];
        for (i=1; i<this.getRecombEdgeMap()[recombID].length; i++) {
            var destNode = this.getRecombEdgeMap()[recombID][i];
            destNode.branchLength += destNode.height - srcNode.height;
        }
    }
};

// Retrieve list of traits defined on tree.  Optional filter function can
// be used to disregard traits defined on a particular subset of nodes.
Tree.prototype.getTraitList = function(filter) {
    if (this.root === undefined)
        return [];

    var trait; // Define iteration variable

    var traitSet = {};
    for (var i=0; i<this.getNodeList().length; i++) {
        var thisNode = this.getNodeList()[i];
        for (trait in thisNode.annotation) {
            if (filter !== undefined && !filter(thisNode, trait))
                continue;
            traitSet[trait] = true;
        }
    }

    // Create list from set
    var traitList = [];
    for (trait in traitSet)
        traitList.push(trait);

    return traitList;
};


// Return deep copy of tree:
Tree.prototype.copy = function() {
    return new Tree(this.root.copy());
};


// Translate labels using provided map:
Tree.prototype.translate = function(tmap) {

    var nodeList = this.getNodeList();
    for (var i=0; i<nodeList.length; i++) {
        if (tmap.hasOwnProperty(nodeList[i].label))
            nodeList[i].label = tmap[nodeList[i].label];
    }
};

// Get total length of all edges in tree
Tree.prototype.getLength = function() {
    var totalLength = 0.0;
    for (var i=0; i<this.getNodeList().length; i++) {
        var node = this.getNodeList()[i];
        if (node.isRoot())
            continue;
        totalLength += node.parent.height - node.height;
    }

    return totalLength;
};

// Return list of nodes belonging to monophyletic groups involving
// the provided node list
Tree.prototype.getCladeNodes = function(nodes) {

    function getCladeMembers(node, nodes) {

        var cladeMembers = [];

        var allChildrenAreMembers = true;
        for (var cidx=0; cidx<node.children.length; cidx++) {
            var child = node.children[cidx];

            var childCladeMembers = getCladeMembers(child, nodes);
            if (childCladeMembers.indexOf(child)<0)
                allChildrenAreMembers = false;

            cladeMembers = cladeMembers.concat(childCladeMembers);
        }

        if (nodes.indexOf(node)>=0 || (node.children.length>0 && allChildrenAreMembers))
            cladeMembers = cladeMembers.concat(node);

        return cladeMembers;
    }

    return getCladeMembers(this.root, nodes);
};

// Return list of all nodes ancestral to those in the provided node list
Tree.prototype.getAncestralNodes = function(nodes) {

    function getAncestors(node, nodes) {
        var ancestors = [];

        for (var cidx=0; cidx<node.children.length; cidx++) {
            var child = node.children[cidx];

            ancestors = ancestors.concat(getAncestors(child, nodes));
        }

        if (nodes.indexOf(node)>=0 || ancestors.length>0)
            ancestors = ancestors.concat(node);

        return ancestors;
    }

    return getAncestors(this.root, nodes);
};

Tree.prototype.getLineagesThroughTime = function() {
    var nodeList = this.getNodeList().slice(0);

    nodeList.sort(function(nodeA, nodeB) {return nodeA.height - nodeB.height})

    res = {lineages: [], ages: []};

    var k = 0;
    for (var i=0; i<nodeList.length; i++) {
	var node = nodeList[i];

	k += 1 - node.children.length;

	res.lineages.push(k);
	res.ages.push(node.height);
    }

    return(res);
}
