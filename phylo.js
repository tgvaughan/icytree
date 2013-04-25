// Node prototype object
var Node = {

    parent: undefined,
    children: [],

    // Initialiser
    init: function() {
	this.parent =  undefined;
	this.children = [];

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
	["STRING", "\"\\w+\"", true],
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

	var idx = 0;
	var root = ruleT();

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
	}

	// C -> (NM)|eps
	function ruleC(node) {
	    if (acceptToken("OPENP", false)) {
		ruleN(node);
		ruleM(node);
		acceptToken("CLOSEP", true);
	    }
	}

	// M -> ,NM|eps
	function ruleM(node) {
	    if (acceptToken("COMMA", false)) {
		ruleN(node);
		ruleM(node);
	    }
	}

	// L -> lab|num
	function ruleL(node) {
	}

	// A -> [&DE]|eps

	// D -> lab=num|lab |eps

	// E -> ,DE|eps

	// H -> :num|eps
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