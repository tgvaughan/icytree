// Tree layout object
var Layout = {
    tree: undefined,
    nodePositions: {},

    init: function(tree) {
	this.tree = tree;
	this.nodePositions = {};
    },

    // Produce a standard rectangular layout:
    standard: function() {

	// Position leaves
	var leaves = [];
	for (var i=0; i<this.tree.getNodeList().length; i++) {
	    node = this.tree.getNodeList()[i];
	    if (node.isLeaf())
		leaves.push(node);
	}

	var nLeaves = leaves.length
    }
}

