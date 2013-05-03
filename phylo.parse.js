// Node prototype object
var Node = Object.create({}, {

    parent: {value: undefined, writable: true, configurable: true, enumerable: true},
    children: {value: [], writable: true, configurable: true, enumerable: true},
    height: {value: 0, writable: true, configurable: true, enumerable: true},
    label: {value: "", writable: true, configurable: true, enumerable: true},
    annotation: {value: {}, writable: true, configurable: true, enumerable: true},
    id: {value: undefined, writable: true, configurable: true, enumerable: true},

    // Initialiser
    init: {value: function(id) {
	this.parent =  undefined;
	this.children = [];
	this.height = 0;
	this.label = "";
	this.annotation = {};
	this.id = id;

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

    isRoot: {value: function() {
	return (this.parent === undefined);
    }},

    isLeaf: {value: function() {
	return (this.children.length === 0);
    }},

    // Produce a deep copy of the clade below this node
    copy: {value: function() {
	
	var nodeCopy = Object.create(Node).init(this.id);
	nodeCopy.height = this.height;
	nodeCopy.label = this.label;
	for (var key in this.annotation)
	    nodeCopy.annotation[key] = this.annotation[key];
	nodeCopy.id = this.id;

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
    root: {value: undefined, writable: true, configurable: true, enumerable: true},
    nodeList: {value: [], writable: true, configurable:true, enumberable:true},
    leafList: {value: [], writable: true, configurable:true, enumberable:true},

    // Initialiser
    init: {value: function(root) {
	this.root = root;
	this.nodeList = [];

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

    // Retrieve list of traits covering the entire tree:
    getTraitList: {value: function() {
	if (this.root === undefined)
	    return [];

	var traitList = [];

	for (var trait in this.getLeafList()[0].annotation) {
	    traitList.push(trait);
	}

	for (var i=1; i<this.getLeafList().length; i++) {
	    var thisTraitList = [];
	    for (var t=0; t<traitList.length; t++) {
		if (this.getLeafList()[i].annotation.hasOwnProperty(traitList[t]))
		    thisTraitList.push(traitList[t]);
	    }
	    traitList = thisTraitList;
	    
	    if (traitList.length===0) {
		// Can stop here - no traits left.
		break;
	    }
	}

	return traitList;
    }},

    // Return deep copy of tree:
    copy: {value: function() {
	return Object.create(Tree).init(this.root.copy());
    }}

});

// Prototype for trees constructed from Newick strings
var TreeFromNewick = Object.create(Tree, {

    // Initialiser
    init: { value: function(newick) {

	// Lex
	var tokenList = this.doLex(newick);

	// Parse
	this.root = this.doParse(tokenList);

	// Branch lengths to node heights
	this.branchLengthsToNodeHeights();

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
	["NUM", /^-?\d+(\.\d+)?([Ee]-?\d+)?/, true],
	["STRING", /^"[^"]+"/, true],
	["STRING",/^'[^']+'/, true],
	["STRING", /^[\w*%.]+/, true]

    ], writeable: false, configurable: false},

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
			tokenList.push([this.tokens[k][0], value]);
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
		throw "Error reading character " + newick[idx] + " at position " + idx;
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
	    if (tokenList[idx][0] === token) {
		idx += 1;
		return true;
	    } else {
		if (mandatory)
		    throw "Error: Expected token " + token + " but found " + tokenList[idx][0] + ".";
		else
		    return false;
	    }
	}

	// T -> N;
	function ruleT() {
	    var node = ruleN(undefined);
	    acceptToken("SEMI", true);

	    return node;
	}

	// N -> CLAH
	function ruleN(parent) {
	    var node = Object.create(Node).init(thisNodeID++);
	    if (parent !== undefined)
		parent.addChild(node);

	    ruleC(node);
	    ruleL(node);
	    ruleA(node);
	    ruleH(node);

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
	    if (acceptToken("STRING", false) || acceptToken("NUM", false)) {
		node.label = tokenList[idx-1][1];

		//indentLog(node.label);
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

	    if (acceptToken("NUM", false) || acceptToken("STRING", false))
		value = tokenList[idx-1][1];
	    
	    else if (acceptToken("OPENV", false)) {
		value = [ruleQ()].concat(ruleW());
		acceptToken("CLOSEV", true);
	    } else
		throw "Expected number, string or vector in annotation. Found " + tokenList[idx][0] + " instead.";

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

	// H -> :num|eps
	function ruleH(node) {
	    if (acceptToken("COLON", false)) {
		acceptToken("NUM", true);

		node.height = 1*tokenList[idx-1][1];

		//indentLog(":"+tokenList[idx-1][1]);
	    } else {

		// Default branch length if none given
		node.height = 1;
	    }
	}
    }},


    // Convert branch lengths to node heights
    branchLengthsToNodeHeights: {value: function() {
	var heights = this.root.applyPreOrder(function(node) {
	    if (node.parent === undefined)
		node.height = 0.0;
	    else
		node.height = node.parent.height - node.height;

	    return node.height;
	});
	var youngestHeight = Math.min.apply(null, heights);

	for (var i=0; i<this.getNodeList().length; i++)
	    this.getNodeList()[i].height -= youngestHeight;
    }}

});

// Function to read one or more trees from
// a NEXUS or (as fall-back) a Newick formatted string
var getTreesFromString = function(string) {

    var trees = [];

    var lines = string.split('\n');

    if (lines[0].trim().toLowerCase() === "#nexus") {
	// Parse as NEXUS file
	var inTrees = false;
	for (var i=0; i<lines.length; i++) {
	    var thisLine = lines[i].trim();
	    if (thisLine.length === 0)
		continue;

	    if (!inTrees) {
		if (thisLine.toLowerCase() === "begin trees;")
		    inTrees = true;
		continue;
	    }

	    if (thisLine.toLowerCase() === "end;")
		break;

	    if (thisLine.toLowerCase().indexOf("tree") !== 0)
		continue;

	    var eqIdx = thisLine.indexOf("(");
	    if (eqIdx<0)
		throw "Error parsing NEXUS";
	    
	    trees.push(Object.create(TreeFromNewick).init(thisLine.slice(eqIdx)));
	}

    } else {
	// Parse as newline-delimited Newick strings
	for (var i=0; i<lines.length; i++) {
	    var thisLine = lines[i].trim();
	    if (thisLine.length === 0)
		continue;

	    trees.push(Object.create(TreeFromNewick).init(thisLine));
	}
    }

    return trees;
};