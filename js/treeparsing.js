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

// TreeBuilder constructor

function TreeBuilder(root) {
    Tree.call(this, root);
}

TreeBuilder.prototype = Object.create(Tree.prototype);
TreeBuilder.prototype.constructor = TreeBuilder;

// TreeBuilder methods

// Convert branch lengths to node heights
TreeBuilder.prototype.branchLengthsToNodeHeights = function(defaultBranchLength) {
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
};

// Strip zero length branches
TreeBuilder.prototype.stripZeroLengthBranches = function(defaultBranchLength) {
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
};

// Exceptions thrown during parsing

function ParseException(message) {
    this.message = message;
}

function SkipTreeException(message) {
    this.message = message;
}


// TreeFromNewick constructor

function TreeFromNewick(newick, defaultBranchLength) {

    // Lex
    var tokenList = this.doLex(newick);

    // Parse
    TreeBuilder.call(this, this.doParse(tokenList));

    // Branch lengths to node heights
    this.branchLengthsToNodeHeights(defaultBranchLength);

    // Zero root edge length means undefined
    if (this.root.branchLength === 0.0)
        this.root.branchLength = undefined;

    // Strip zero-length edges
    this.stripZeroLengthBranches();
}

TreeFromNewick.prototype = Object.create(TreeBuilder.prototype);
TreeFromNewick.prototype.constructor = TreeFromNewick;


// TreeFromNewick properties/methods

TreeFromNewick.prototype.tokens = [
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
        ["STRING", /^"(?:[^"]|"")+"/, true],
        ["STRING",/^'(?:[^']|'')+'/, true],
        ["STRING", /^[\w|*%/!.\-\+]+(?:\([^)]*\))?/, true]];

// Lexical analysis
TreeFromNewick.prototype.doLex = function(newick) {
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
                    if (this.tokens[k][0] === "STRING") {
                        value = value.replace(/^"(.*)"$/,"$1").replace(/^'(.*)'$/, "$1");
                        value = value.replace("''","'").replace('""','"');
                    }
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
};

// Assemble tree from token list
TreeFromNewick.prototype.doParse = function(tokenList) {

    var thisNodeID = 0;

    var idx = 0;
    //var indent = 0;
    return ruleT();


    /*function indentLog(string) {

    // String doesn't have a repeat method.  (Seriously!?)
            var spaces = "";
            for (var i=0; i<indent; i++)
                spaces += " ";

            console.log(spaces + string);
        }*/


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
        var node = new Node(thisNodeID++);
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

    // B -> :num A | eps
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

            ruleA(node);
        }
    }
};


// TreeFromPhyloXML constructor

function TreeFromPhyloXML (phylogenyElement, defaultBranchLength) {

    var thisNodeID = 0;

    function annotateNode(node, prefix, elements) {
        for (var j=0; j<elements.length; j++) {
            var tname = elements[j].tagName;
            var tval = elements[j].textContent;
            node.annotation[prefix + "_" + tname] = tval;
        }
    }

    function walkDom(parent, cladeElement) {
        var node = new Node(thisNodeID++);
        if (parent !== undefined)
            parent.addChild(node);


        for (var i=0; i<cladeElement.children.length; i++) {
            var childEl = cladeElement.children[i];
            var tagName = childEl.tagName;

            switch(tagName) {
                case "clade":
                    walkDom(node, childEl);
                    break;

                case "name":
                    node.label = childEl.textContent;
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
            TreeBuilder.call(this, walkDom(undefined, el));
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
}

TreeFromPhyloXML.prototype = Object.create(TreeBuilder.prototype);
TreeFromPhyloXML.prototype.constructor = TreeFromPhyloXML;


// TreeFromNeXML constructor

function TreeFromNeXML(treeElement, defaultBranchLength) {

    var thisNodeID = 0;

    var nodeElements = treeElement.getElementsByTagName("node");
    var edgeElements = treeElement.getElementsByTagName("edge");

    var root;

    var nodesByID = {};
    for (var nidx=0; nidx < nodeElements.length; nidx++) {
        var nodeEl = nodeElements[nidx];
        var node = new Node(thisNodeID++);
        node.label = nodeEl.getAttribute("label");
        nodesByID[nodeEl.getAttribute("id")] = node;

        if (nodeEl.getAttribute("root") === "true")
            root = node;
    }

    if (root === undefined)
        throw new SkipTreeException("Skipping unrooted NexML tree.");

    TreeBuilder.call(this, root);

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
}

TreeFromNeXML.prototype = Object.create(TreeBuilder.prototype);
TreeFromNeXML.prototype.constructor = TreeFromNeXML;


// Interface functions

function getTreesFromNexML(dom, defaultBranchLength) {
    var trees = [];

    var treesBlocks = dom.getElementsByTagName("trees");
    if (treesBlocks.length === 0)
        return [];

    var treeElements = treesBlocks[0].getElementsByTagName("tree");

    for (var i=0; i<treeElements.length; i++) {
        var treeEl = treeElements[i];

        try {
            trees.push(new TreeFromNeXML(treeElements[i], defaultBranchLength));
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
        trees.push(new TreeFromPhyloXML(phyloElements[i], defaultBranchLength));
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
            trees.push(new TreeFromNewick(thisLine, defaultBranchLength));
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
                var tvec = tStringArray[j].trim().split(/\s+/);
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
        if (matches !== null) {
            var eqIdx = matches[0].length;
            trees.push(new TreeFromNewick(fullLine.slice(eqIdx), defaultBranchLength));
            trees[trees.length-1].translate(tmap);
        }

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

        var parserError = dom.getElementsByTagName("parsererror").length > 0;

        if (!parserError) {
            var docTag = dom.documentElement.tagName;

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

    if (trees.length === 0)
        throw new ParseException("No trees found in file");

    return trees;
}