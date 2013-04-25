// Node prototype object
var Node = {

    parent: undefined,
    children: [],
    height: 0,
    label: "",
    annotation: {},

    // Initialiser
    init: function() {
	this.parent =  undefined;
	this.children = [];
	this.height = 0;
	this.label = "";
	this.annotation = {};

	return(this);
    },

    addChild: function(child) {
	this.children.push(child);
	child.parent = this;
    },

    isRoot: function() {
	return (this.parent == undefined);
    }
};

// Tree prototype object
var Tree = {
    root: undefined,

    // Initialiser
    init: function(root) {
	this.root = root;

	return(this);
    }
}

// Prototype for trees constructed from Newick strings
var TreeFromNewick = Object.create(Tree, {

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

    // Initialiser
    init: { value: function(newick) {

	// Lex
	var tokenList = this.doLex(newick);

	// Parse
	this.root = this.doParse(tokenList);

	return (this);
    }},

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
			console.log(idx + " " + this.tokens[k][0] + ": " + match[0]);
		    } else {
			tokenList.push([this.tokens[k][0]]);
			console.log(idx + " " + this.tokens[k][0]);
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

	var idx = 0;
	var indent = 0;

	var root = ruleT();

	return root;


	function indentLog(string) {

	    // String doesn't have a repeat method.  (Seriously!?)
	    var spaces = "";
	    for (var i=0; i<indent; i++)
		spaces += " ";

	    console.log(spaces + string);
	}

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
	    var node = Object.create(Node).init();
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

		indentLog("(");
		indent += 1;

		ruleN(node);
		ruleM(node);
		acceptToken("CLOSEP", true);

		indent -= 1;
		indentLog(")");
	    }
	}

	// M -> ,NM|eps
	function ruleM(node) {
	    if (acceptToken("COMMA", false)) {
		
		indentLog(",");
		
		ruleN(node);
		ruleM(node);
	    }
	}

	// L -> lab|num
	function ruleL(node) {
	    if (acceptToken("LABEL", false) || acceptToken("NUM", false)) {
		node.label = tokenList[idx-1][1];

		indentLog(node.label);
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
	    if (acceptToken("NUM") || acceptToken("STRING") || acceptToken("LABEL"))
		var value = tokenList[idx-1][1]
	    else
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
		var parentHeight = 0;
		if (node.parent != undefined)
		    parentHeight = node.parent.height;
		node.height = parentHeight - (1*tokenList[idx-1][1]);

		indentLog(":"+tokenList[idx-1][1]);
	    }
	}
    }}

});

// Main for testing
function main() {
    
    var newickString = document.getElementById("newickInput").innerHTML;
    newickString = newickString.replace(/&amp;/g,"&");
    var tree = Object.create(TreeFromNewick).init(newickString);
    console.log("Done!");

    console.log(tree);
}