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

    newick: {value: "", configurable: true, writable: true, enumerable: true},
    idx: {value: 0, writable: true, configurable: false},
    tokens: {value: [
	["OPENP", "\\(", false],
	["CLOSEP", "\\)", false],
	["COLON", ":", false],
	["COMMA", ",", false],
	["SEMI", ";", false],
	["OPENA", "\\[&", false],
	["CLOSEA", "\\]", false],
	["STRING", "\"\\w+\"", true],
	["EQ", "=", false],
	["NUM", "-?\\d+(\\.\\d+)?([Ee]-?\\d+)?", true],
	["LABEL", "\\w+", true]
    ], writeable: false, configurable: false},

    // Initialiser
    init: { value: function(newick) {
	this.newick = newick;
	this.idx = 0;
	this.doLex();

	return (this);
    }},

    // Lexical analysis
    doLex: { value: function() {
	var tokenList = [];
    
	while (this.idx<this.newick.length) {

	    var matchFound = false;
	    for (var k = 0; k<this.tokens.length; k++) {
		var match = this.newick.slice(this.idx).match(this.tokens[k][1]);
		if (match != null && match.index == 0) {
		    matchFound = true;
		    if (this.tokens[k][2]) {
			tokenList.push([this.tokens[k][0],match[0]]);
			console.log(this.idx + " " + this.tokens[k][0] + ": " + match[0]);
		    } else {
			tokenList.push([this.tokens[k][0]]);
			console.log(this.idx + " " + this.tokens[k][0]);
		    }

		    this.idx += match[0].length
		    break;
		}
	    }

	    if (!matchFound) {
		throw "Error reading character " + this.newick[this.idx] + " at position " + this.idx;
	    }

	}

	return tokenList;
    }}

});


function main() {
    
    var tree = Object.create(TreeFromNewick).init("(A[&deme=\"1\",reaction=\"sample\"]:1,B:1)C:0;");

}