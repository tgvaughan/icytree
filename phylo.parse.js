// Node prototype object
var Node = Object.create({}, {

    parent: {value: undefined, writable: true, configurable: true, enumerable: true},
    children: {value: [], writable: true, configurable: true, enumerable: true},
    height: {value: 0, writable: true, configurable: true, enumerable: true},
    label: {value: "", writable: true, configurable: true, enumerable: true},
    annotation: {value: {}, writable: true, configurable: true, enumerable: true},
    idString: {value: "", writable: true, configurable: true, enumerable: true},

    // Initialiser
    init: {value: function(id) {
	this.parent =  undefined;
	this.children = [];
	this.height = 0;
	this.label = "";
	this.annotation = {};
	this.idString = "node#" + id;

	return(this);
    }},

    // Ensure nodes with unique IDs have unique hashes.
    toString: {value: function() {
	return this.idString;
    }},

    addChild: {value: function(child) {
	this.children.push(child);
	child.parent = this;
    }},

    isRoot: {value: function() {
	return (this.parent == undefined);
    }},

    isLeaf: {value: function() {
	return (this.children.length == 0);
    }},

    // Apply f() to each node in subtree
    applyPreOrder: {value: function(f) {
	var res = [];

	var thisRes = f(this);
	if (thisRes != null)
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
	if (this.nodeList.length == 0 && this.root != undefined) {
	    this.nodeList = this.root.applyPreOrder(function(node) {
		return node;
	    });
	}

	return this.nodeList;
    }},

    // Retrieve list of leaves in tree, in correct order.
    getLeafList: {value: function() {
	if (this.leafList.length == 0 && this.root != undefined) {
	    this.leafList = this.root.applyPreOrder(function(node) {
		if (node.isLeaf())
		    return node;
		else
		    return null;
	    });
	}

	return this.leafList;
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
	["OPENP", /\(/, false],
	["CLOSEP", /\)/, false],
	["COLON", /:/, false],
	["COMMA", /,/, false],
	["SEMI", /;/, false],
	["OPENA", /\[&/, false],
	["CLOSEA", /\]/, false],
	["STRING", /"[^"]+"/, true],
	["EQ", /=/, false],
	["NUM", /-?\d+(\.\d+)?([Ee]-?\d+)?/, true],
	["LABEL", /\w+/, true]
    ], writeable: false, configurable: false},

    // Lexical analysis
    doLex: { value: function(newick) {
	var tokenList = [];
	var idx = 0;
    
	while (idx<newick.length) {

	    // Skip over whitespace:
	    var wsMatch = newick.slice(idx).match(/\s/);
	    if (wsMatch != null && wsMatch.index == 0) {
		idx += wsMatch[0].length;
		continue;
	    }

	    var matchFound = false;
	    for (var k = 0; k<this.tokens.length; k++) {
		var match = newick.slice(idx).match(this.tokens[k][1]);
		if (match != null && match.index == 0) {

		    if (this.tokens[k][2]) {
			tokenList.push([this.tokens[k][0],match[0]]);
			//console.log(idx + " " + this.tokens[k][0] + ": " + match[0]);
		    } else {
			tokenList.push([this.tokens[k][0]]);
			//console.log(idx + " " + this.tokens[k][0]);
		    }

		    matchFound = true;
		    idx += match[0].length
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
	    if (tokenList[idx][0] == token) {
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
	    if (parent != undefined)
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
	    if (acceptToken("LABEL", false) || acceptToken("NUM", false)) {
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

	// D -> lab=V|eps
	function ruleD(node) {
	    acceptToken("LABEL", true);
	    var key = tokenList[idx-1][1];
	    acceptToken("EQ", true);

	    var value = undefined;
	    if (acceptToken("NUM", false) || acceptToken("LABEL", false))
		value = tokenList[idx-1][1]
	    
	    else if (acceptToken("STRING", false)) {
		value = tokenList[idx-1][1].replace(/^"(.*)"$/, "$1");
		    
	    } else
		throw "Expected number, label or string in annotation. Found " + tokenList[idx][0] + " instead.";

	    node.annotation[key] = value;
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
	    }
	}
    }},


    // Convert branch lengths to node heights
    branchLengthsToNodeHeights: {value: function() {
	var heights = this.root.applyPreOrder(function(node) {
	    if (node.parent == undefined)
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
