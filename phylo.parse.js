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

var TreeBuilder = Object.create(Tree, {

    // Convert branch lengths to node heights
    branchLengthsToNodeHeights: {value: function(defaultBranchLength) {
        var heights = this.root.applyPreOrder(function(node) {
            if (node.parent === undefined)
                node.height = 0.0;
            else {
                if (node.branchLength !== undefined)
                    node.height = node.parent.height - node.branchLength;
                else
                    node.height = node.parent.height - defaultBranchLength;
            }

            return node.height;
        });
        var youngestHeight = Math.min.apply(null, heights);

        for (var i=0; i<this.getNodeList().length; i++)
            this.getNodeList()[i].height -= youngestHeight;
    }},

    // Strip zero length branches
    stripZeroLengthBranches: {value: function(defaultBranchLength) {
        var leaves = this.getLeafList().slice();

        for (var i=0; i<leaves.length; i++) {
            if (leaves[i].parent !== undefined && leaves[i].height == leaves[i].parent.height) {
                leaves[i].parent.label = leaves[i].label;

                leaves[i].parent.removeChild(leaves[i]);
            }
        }

        // Invalidate cached leaf and node lists
        this.leafList = [];
        this.nodeList = [];
    }}
});

// Exceptions thrown during parsing

function ParseException(message) {
    this.message = message;
}

function SkipTreeException(message) {
    this.message = message;
}

// Prototype for trees constructed from Newick strings
var TreeFromNewick = Object.create(TreeBuilder, {

    // Initialiser
    init: { value: function(newick, defaultBranchLength) {

        // Lex
        var tokenList = this.doLex(newick);

        // Parse
        this.root = this.doParse(tokenList);

        // Branch lengths to node heights
        this.branchLengthsToNodeHeights(defaultBranchLength);

        // Zero root edge length means undefined
        if (this.root.branchLength === 0.0)
            this.root.branchLength = undefined;

        // Strip zero-length edges
        this.stripZeroLengthBranches();

        return this;
    }},


    tokens: {value: [
        ["OPENP", /^\(/, false],
        ["CLOSEP", /^\)/, false],
        ["COLON", /^:/, false],
        ["COMMA", /^,/, false],
        ["SEMI", /^;/, false],
        ["OPENA", /^\[&/, false],
        ["CLOSEA", /^\]/, false],
        ["OPENV", /^{/, false],
        ["CLOSEV", /^}/, false],
        ["EQ", /^=/, false],
        ["HASH", /#/, false],
        ["STRING", /^"[^"]+"/, true],
        ["STRING",/^'[^']+'/, true],
        ["STRING", /^[\w|*%/!.\-\+]+/, true]]},

    // Lexical analysis
    doLex: { value: function(newick) {
        var tokenList = [];
        var idx = 0;
    
        while (idx<newick.length) {

            // Skip over whitespace:
            var wsMatch = newick.slice(idx).match(/^\s/);
            if (wsMatch !== null && wsMatch.index === 0) {
                idx += wsMatch[0].length;
                continue;
            }

            var matchFound = false;
            for (var k = 0; k<this.tokens.length; k++) {
                var match = newick.slice(idx).match(this.tokens[k][1]);
                if (match !== null && match.index === 0) {

                    if (this.tokens[k][2]) {
                        var value = match[0];
                        if (this.tokens[k][0] === "STRING")
                            value = value.replace(/^"(.*)"$/,"$1").replace(/^'(.*)'$/, "$1");
                        tokenList.push([this.tokens[k][0], value, idx]);
                        //console.log(idx + " " + this.tokens[k][0] + ": " + match[0]);
                    } else {
                        tokenList.push([this.tokens[k][0]]);
                        //console.log(idx + " " + this.tokens[k][0]);
                    }
                    
                    matchFound = true;
                    idx += match[0].length;
                    break;
                }
            }
            
            if (!matchFound) {
                throw new ParseException("Error reading character " + newick[idx] + " at position " + idx);
            }
            
        }

        return tokenList;
    }},

    // Assemble tree from token list
    doParse: {value: function(tokenList) {

        var thisNodeID = 0;

        var idx = 0;
        //var indent = 0;
        return ruleT();


        /*
        function indentLog(string) {

            // String doesn't have a repeat method.  (Seriously!?)
            var spaces = "";
            for (var i=0; i<indent; i++)
                spaces += " ";

            console.log(spaces + string);
        }
        */


        function acceptToken(token, mandatory) {
            if (idx<tokenList.length && tokenList[idx][0] === token) {
                idx += 1;
                return true;
            } else {
                if (mandatory)
                    throw new ParseException("Error: Expected token " + token + " but found " + tokenList[idx][0] +
                                             " (" + tokenList[idx][1] + ") at position " + tokenList[idx][2] + ".");
                else
                    return false;
            }
        }

        // T -> N;
        function ruleT() {
            var node = ruleN(undefined);
            acceptToken("SEMI", false);

            return node;
        }

        // N -> CLHAB
        function ruleN(parent) {
            var node = Object.create(Node).init(thisNodeID++);
            if (parent !== undefined)
                parent.addChild(node);

            ruleC(node);
            ruleL(node);
            ruleH(node);
            ruleA(node);
            ruleB(node);

            return node;
        }

        // C -> (NM)|eps
        function ruleC(node) {
            if (acceptToken("OPENP", false)) {

                //indentLog("(");
                //indent += 1;

                ruleN(node);
                ruleM(node);
                acceptToken("CLOSEP", true);

                //indent -= 1;
                //indentLog(")");
            }
        }

        // M -> ,NM|eps
        function ruleM(node) {
            if (acceptToken("COMMA", false)) {
                
                //indentLog(",");
                
                ruleN(node);
                ruleM(node);
            }
        }

        // L -> lab|num
        function ruleL(node) {
            if (acceptToken("STRING", false)) {
                node.label = tokenList[idx-1][1];

                //indentLog(node.label);
            }
        }

        // H -> #hybridID|eps
        function ruleH(node) {
            if (acceptToken("HASH", false)) {
                acceptToken("STRING", true);
                node.hybridID = tokenList[idx-1][1];
            }
        }

        // A -> [&DE]|eps
        function ruleA(node) {
            if (acceptToken("OPENA", false)) {
                ruleD(node);
                ruleE(node);
                acceptToken("CLOSEA", true);
            }
        }

        // D -> lab=Q|eps
        function ruleD(node) {
            acceptToken("STRING", true);
            var key = tokenList[idx-1][1];
            acceptToken("EQ", true);
            var value = ruleQ();

            node.annotation[key] = value;

            //indentLog(key + "=" + value);
        }

        // Q -> num|string|[&QW]
        function ruleQ() {
            var value = undefined;

            if (acceptToken("STRING", false))
                value = tokenList[idx-1][1];
            
            else if (acceptToken("OPENV", false)) {
                value = [ruleQ()].concat(ruleW());
                acceptToken("CLOSEV", true);
            } else
                throw new ParseException("Expected number, string or vector in annotation. Found " +
                                         tokenList[idx][0] + " instead.");

            return value;
        }

        // W -> ,QW|eps
        function ruleW() {
            if (acceptToken("COMMA", false)) {
                return [ruleQ()].concat(ruleW());
            }
            else
                return [];
        }
        
        // E -> ,DE|eps
        function ruleE(node) {
            if (acceptToken("COMMA", false)) {
                ruleD(node);
                ruleE(node);
            }
        }

        // B -> :num|eps
        function ruleB(node) {
            if (acceptToken("COLON", false)) {
                acceptToken("STRING", true);

                var length = Number(tokenList[idx-1][1]);
                if (String(length) !== "NaN")
                    node.branchLength = length;
                else
                    throw new ParseException("Expected numerical branch length. Found " +
                                             tokenList[idx-1][1] + " instead.");

                //indentLog(":"+tokenList[idx-1][1]);
            }
        }
    }}

});


// Prototype for trees constructed from PhyloXML
var TreeFromPhyloXML = Object.create(TreeBuilder, {

    // Initialiser
    init: { value: function(phylogenyElement, defaultBranchLength) {

        var thisNodeID = 0;

        function annotateNode(node, prefix, elements) {
            for (var j=0; j<elements.length; j++) {
                var tname = elements[j].tagName;
                var tval = elements[j].textContent;
                node.annotation[prefix + "_" + tname] = tval;
            }
        }

        function walkDom(parent, cladeElement) {
            var node = Object.create(Node).init(thisNodeID++);
            if (parent !== undefined)
                parent.addChild(node);


            for (var i=0; i<cladeElement.children.length; i++) {
                var childEl = cladeElement.children[i]
                var tagName = childEl.tagName;

                switch(tagName) {
                case "clade":
                    walkDom(node, childEl);
                    break;

                case "name":
                    node.label = childEl.textContent
                    break;

                case "taxonomy":
                    annotateNode(node, "taxonomy", childEl.children);
                    break;

                case "sequence":
                    annotateNode(node, "sequence", childEl.children);
                    break;

                case "confidence":
                    node.annotation["confidence_" + childEl.getAttribute("type")] = childEl.textContent;
                    break;
                   
                default:
                    break;
                }
            }

            node.branchLength = cladeElement.getAttribute("branch_length");
            if (node.branchLength === null)
                node.branchLength = undefined;

            return node;
        }

        for (var i=0; i<phylogenyElement.children.length; i++) {
            var el = phylogenyElement.children[i];
            if (el.tagName === "clade") {
                this.root = walkDom(undefined, el);
                break;
            }
        }

        // Branch lengths to node heights
        this.branchLengthsToNodeHeights(defaultBranchLength);

        // Zero root edge length means undefined
        if (this.root.branchLength === 0.0)
            this.root.branchLength = undefined;

        // Strip zero-length edges
        this.stripZeroLengthBranches();

        return this;
    }}
});


// Prototype for trees constructed from PhyloXML
var TreeFromNeXML = Object.create(TreeBuilder, {

    // Initialiser
    init: { value: function(treeElement, defaultBranchLength) {

        var thisNodeID = 0;

        var nodeElements = treeElement.getElementsByTagName("node");
        var edgeElements = treeElement.getElementsByTagName("edge");

        var nodesByID = {};
        for (var nidx=0; nidx < nodeElements.length; nidx++) {
            var nodeEl = nodeElements[nidx];
            var node = Object.create(Node).init(thisNodeID++);
            node.label = nodeEl.getAttribute("label");
            nodesByID[nodeEl.getAttribute("id")] = node;

            if (nodeEl.getAttribute("root") === "true")
                this.root = node;
        }

        if (this.root === undefined)
            throw new SkipTreeException("Skipping unrooted NexML tree.");

        for (var eidx=0; eidx < edgeElements.length; eidx++) {
            var edgeEl = edgeElements[eidx];
            var parent = nodesByID[edgeEl.getAttribute("source")];
            var child = nodesByID[edgeEl.getAttribute("target")];

            parent.addChild(child);
            child.branchLength = edgeEl.getAttribute("length");
        }

        var rootEdgeElements = treeElement.getElementsByTagName("rootedge");
        if (rootEdgeElements.length>0)
            this.root.branchLength = rootEdgeElements[0].getAttribute("length")*1.0;

        // Branch lengths to node heights
        this.branchLengthsToNodeHeights(defaultBranchLength);

        // Strip zero-length edges
        this.stripZeroLengthBranches();

        return this;
    }}
});

function getTreesFromNexML(dom, defaultBranchLength) {
    var trees = [];

    var treesBlocks = dom.getElementsByTagName("trees");
    if (treesBlocks.length == 0)
        return [];

    var treeElements = treesBlocks[0].getElementsByTagName("tree");

    for (var i=0; i<treeElements.length; i++) {
        var treeEl = treeElements[i];

        try {
            trees.push(Object.create(TreeFromNeXML).init(treeElements[i], defaultBranchLength));
        } catch (e) {
            if (e instanceof SkipTreeException)
                console.log(e.message);
            else
                throw e;
        }
    }

    return trees;
}


function getTreesFromPhyloXML(dom, defaultBranchLength) {
    var trees = [];
    
    var phyloElements = dom.getElementsByTagName("phylogeny");
    for (var i=0; i<phyloElements.length; i++) {
        trees.push(Object.create(TreeFromPhyloXML).init(phyloElements[i], defaultBranchLength));
        if (phyloElements[i].getAttribute("rooted").toLowerCase() === "false")
            console.log("Warning: File includes unrooted trees.");
    }

    return trees;
}

function getTreesFromNewick(string, defaultBranchLength) {
    var trees = [];

    var lines = string.split('\n');

    for (var i=0; i<lines.length; i++) {
        var thisLine = lines[i].trim();
        if (thisLine.length === 0)
            continue;

        try {
            trees.push(Object.create(TreeFromNewick).init(thisLine, defaultBranchLength));
        } catch (e) {
            if (e instanceof SkipTreeException)
                console.log(e.message);
            else
                throw e;
        }
    }
   
    return trees;
}

function getTreesFromNexus(string, defaultBranchLength) {
    var trees = [];
    
    var lines = string.split('\n');

    var inTrees = false;
    var fullLine = "";
    var tmap = {};
    for (var i=1; i<lines.length; i++) {

        fullLine += lines[i].trim();
        if (fullLine[fullLine.length-1] !== ";") {
            continue;
        }

        // Remove comments:
        fullLine = fullLine.replace(/\[[^&][^\]]*\]/g,"").trim();
        
        if (!inTrees) {
            if (fullLine.toLowerCase() === "begin trees;")
                inTrees = true;
            fullLine = "";
            continue;
        }

        if (fullLine.toLowerCase() === "end;")
            break;

        // Parse translate line:
        if (fullLine.toLowerCase().match("^translate")) {
            var tStringArray = fullLine.slice(9,fullLine.length-1).split(",");
            for (var j=0; j<tStringArray.length; j++) {
                var tvec = tStringArray[j].trim().split(" ");
                var tkey = tvec[0];
                var tval = tvec.slice(1).join(" ");
                tval = tval.replace(/^"(.*)"$/,"$1").replace(/^'(.*)'$/, "$1");
                tmap[tvec[0]] = tval;
            }
            fullLine = "";
            continue;
        }

        // Parse tree line:
        var matches = fullLine.toLowerCase().match(/tree (\w|\.)+ *(\[&[^\]]*] *)* *= *(\[&[^\]]*] *)* */);
        if (matches === null)
            throw new ParseException("Error parsing NEXUS");

        var eqIdx = matches[0].length;
        trees.push(Object.create(TreeFromNewick).init(fullLine.slice(eqIdx), defaultBranchLength));
        trees[trees.length-1].translate(tmap);

        fullLine = "";
    }

    return trees;
}

// Function to read one or more trees from a formatted string.
function getTreesFromString(string, defaultBranchLength) {
    
    var trees;

    if (string.substring(0, 6).toLowerCase() === "#nexus") {
        console.log("Parsing file as NEXUS.");
        trees =  getTreesFromNexus(string, defaultBranchLength);
    } else {
        var parser = new DOMParser();
        var dom = parser.parseFromString(string, "text/xml");

        var docTag = dom.documentElement.tagName;

        if (docTag !== "parsererror") {
            switch(docTag) {
            case "phyloxml":
                console.log("Parsing file as PhyloXML.");
                trees = getTreesFromPhyloXML(dom, defaultBranchLength);
                break;

            case "nex:nexml":
                console.log("Parsing file as NeXML.");
                trees = getTreesFromNexML(dom, defaultBranchLength);
                break;

            default:
                throw new ParseException("Unrecognized XML format.");
            }

        } else {
            trees =  getTreesFromNewick(string, defaultBranchLength);
        }
    }

    if (trees.length==0)
        throw new ParseException("No trees found in file");

    return trees;
};
