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

// Node prototype object
var Node = Object.create({}, {

    parent: {value: undefined, writable: true},
    children: {value: [], writable: true},
    height: {value: undefined, writable: true},
    branchLength: {value: undefined, writable: true},
    label: {value: "", writable: true},
    annotation: {value: {}, writable: true},
    id: {value: undefined, writable: true},
    hybridID: {value: undefined, writable: true},

    // Initialiser
    init: {value: function(id) {
        this.id = id;

        this.parent =  undefined;
        this.children = [];
        this.height = undefined;
        this.branchLength = undefined;
        this.label = "";
        this.annotation = {};
        this.hybridID = undefined;

        return(this);
    }},

    // Ensure nodes with unique IDs have unique hashes.
    toString: {value: function() {
        return "node#" + this.id;
    }},
    
    addChild: {value: function(child) {
        this.children.push(child);
        child.parent = this;
    }},

    removeChild: {value: function(child) {
        var idx = this.children.indexOf(child);
        this.children.splice(idx, 1);
    }},

    isRoot: {value: function() {
        return (this.parent === undefined);
    }},

    isLeaf: {value: function() {
        return (this.children.length === 0);
    }},

    isSingleton: {value: function() {
        return (this.children.length === 1);
    }},

    isHybrid: {value: function() {
        return (this.hybridID !== undefined);
    }},

    getAncestors: {value: function() {
        if (this.isRoot())
            return [this];
        else
            return [this].concat(this.parent.getAncestors());
    }},

    // Returns true if this node is left of the argument on the
    // tree.  If one node is the direct ancestor of the other,
    // the result is undefined.
    isLeftOf: {value: function(other) {
        var ancestors = this.getAncestors().reverse();
        var otherAncestors = other.getAncestors().reverse();

        var i;
        for (i=1; i<Math.min(ancestors.length, otherAncestors.length); i++) {
            if (ancestors[i] != otherAncestors[i]) {
                var mrca = ancestors[i-1];

                return mrca.children.indexOf(ancestors[i])
                    < mrca.children.indexOf(otherAncestors[i]);
            }
        }

        return undefined;
    }},

    // Produce a deep copy of the clade below this node
    copy: {value: function() {
        
        var nodeCopy = Object.create(Node).init(this.id);
        nodeCopy.height = this.height;
        nodeCopy.branchLength = this.branchLength;
        nodeCopy.label = this.label;
        for (var key in this.annotation)
            nodeCopy.annotation[key] = this.annotation[key];
        nodeCopy.id = this.id;
        nodeCopy.hybridID = this.hybridID;

        for (var i=0; i<this.children.length; i++)
            nodeCopy.addChild(this.children[i].copy());

        return nodeCopy;
    }},

    // Apply f() to each node in subtree
    applyPreOrder: {value: function(f) {
        var res = [];

        var thisRes = f(this);
        if (thisRes !== null)
            res = res.concat(thisRes);

        for (var i=0; i<this.children.length; i++)
            res = res.concat(this.children[i].applyPreOrder(f));

        return res;
    }}
});

// Tree prototype object
var Tree = Object.create({}, {
    root: {value: undefined, writable: true},
    nodeList: {value: [], writable: true},
    leafList: {value: [], writable: true},
    hybridEdgeList: {value: undefined, writable: true},

    // Initialiser
    init: {value: function(root) {
        this.root = root;
        this.nodeList = [];
        this.leafList = [];
        this.hybridEdgeList = undefined;
        

        return(this);
    }},

    // Retrieve list of nodes in tree.
    // (Should maybe use accessor function for this.)
    getNodeList: {value: function() {
        if (this.nodeList.length === 0 && this.root !== undefined) {
            this.nodeList = this.root.applyPreOrder(function(node) {
                return node;
            });
        }

        return this.nodeList;
    }},

    // Retrieve list of leaves in tree, in correct order.
    getLeafList: {value: function() {
        if (this.leafList.length === 0 && this.root !== undefined) {
            this.leafList = this.root.applyPreOrder(function(node) {
                if (node.isLeaf())
                    return node;
                else
                    return null;
            });
        }

        return this.leafList;
    }},

    // Retrieve list of node pairs specifying hybrid edges.
    // Pairs are ordered according to [source, dest].
    getHybridEdgeList: {value: function() {
        if (this.hybridEdgeList === undefined) {

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

            this.hybridEdgeList = {};
            for (var i=0; i<hybridNodeList.length; i++) {
                var node = hybridNodeList[i];
                if (node.hybridID in this.hybridEdgeList) {
                    var edge = this.hybridEdgeList[node.hybridID];
                    if (node.isLeaf())
                        edge.push(node);
                    else
                        edge.splice(0,0,node);
                } else {
                    this.hybridEdgeList[node.hybridID] = [node];
                }
            }

            for (var hybridID in this.hybridEdgeList) {
                if (this.hybridEdgeList[hybridID].length !== 2)
                    throw "Extended Newick error: hybrid nodes must come in pairs.";
            }
        }

        return this.hybridEdgeList;
    }},

    // Sort nodes according to clade sizes.
    sortNodes: {value: function(decending) {
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
        this.leafList = [];
    }},

    // Retrieve list of traits defined on tree.  Optional filter function can
    // be used to disregard traits defined on a particular subset of nodes.
    getTraitList: {value: function(filter) {
        if (this.root === undefined)
            return [];

        var traitSet = {};
        for (var i=0; i<this.getNodeList().length; i++) {
            var thisNode = this.getNodeList()[i];
            for (var trait in thisNode.annotation) {
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
    }},


    // Return deep copy of tree:
    copy: {value: function() {
        return Object.create(Tree).init(this.root.copy());
    }},

    
    // Translate labels using provided map:
    translate: {value: function(tmap) {

        var nodeList = this.getNodeList();
        for (var i=0; i<nodeList.length; i++) {
            if (tmap.hasOwnProperty(nodeList[i].label))
                nodeList[i].label = tmap[nodeList[i].label];
        }
    }},

    // Obtain node having given string representation:
    getNode: {value: function(nodeId) {
        var nodeList = this.getNodeList();
        for (var i=0; i<nodeList.length; i++) {
            if (nodeList[i].toString() == nodeId)
                return nodeList[i];
        }
        return undefined;
    }},

    // Obtain (extended) Newick representation of tree (network):
    getNewick: {value: function(annotate) {

        if (annotate === undefined)
            annotate = false;

        function newickRecurse(node) {
            var res = "";
            if (!node.isLeaf()) {
                res += "(";
                for (var i=0; i<node.children.length; i++) {
                    if (i>0)
                        res += ",";
                    res += newickRecurse(node.children[i]);
                }
                res += ")";
            }

            if (node.label.length>0)
                res += "\"" + node.label + "\"";

            if (node.hybridID !== undefined)
                res += "#" + node.hybridID;

            if (annotate) {
                var keys = Object.keys(node.annotation);
                if (keys.length>0) {
                    res += "[&";
                    for (var idx=0; idx<keys.length; idx++) {
                        var key = keys[idx];

                        if (idx>0)
                            res += ",";
                        res += "\"" + key + "\"=";
                        if (node.annotation[key] instanceof Array)
                            res += "{" + String(node.annotation[key]) + "}";
                        else
                            res += "\"" + node.annotation[key] + "\"";
                    }
                    res += "]";
                }
            }

            if (node.branchLength !== undefined)
                res += ":" + node.branchLength;
            else
                res += ":0.0";

            return res;
        }

        var newickStr = "";
        if (this.root !== undefined)
            newickStr += newickRecurse(this.root);

        return (newickStr + ";");
    }},

    // Get total length of all edges in tree
    getLength: {value: function() {
        var totalLength = 0.0;
        for (var i=0; i<this.getNodeList().length; i++) {
            var node = this.getNodeList()[i];
            if (node.isRoot())
                continue;
            totalLength += node.parent.height - node.height;
        }

        return totalLength;
    }},

    // Return list of nodes belonging to monophyletic groups involving
    // the provided node list
    getCladeNodes: {value: function(nodes) {

        function getCladeMembers(node, nodes) {

            var cladeMembers = [];

            var allChildrenAreMembers = true;
            for (var cidx=0; cidx<node.children.length; cidx++) {
                var child = node.children[cidx];

                var childCladeMembers = getCladeMembers(child, nodes)
                if (childCladeMembers.indexOf(child)<0)
                    allChildrenAreMembers = false;

                cladeMembers = cladeMembers.concat(childCladeMembers);
            }

            if (nodes.indexOf(node)>=0 || (node.children.length>0 && allChildrenAreMembers))
                cladeMembers = cladeMembers.concat(node);

            return cladeMembers;
        }

        return getCladeMembers(this.root, nodes);
    }},

    // Return list of all nodes ancestral to those in the provided node list
    getAncestralNodes: {value: function(nodes) {

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
    }}
});
