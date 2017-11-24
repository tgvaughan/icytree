/**
 * @licstart  The following is the entire license notice for the
 *  JavaScript code in this page.
 *
 * Copyright (C) 2017  Tim Vaughan
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


var TreeStats = (function () {

    var stats = {};

    stats.nLeaves = function(tree) {
        return tree.getLeafList().length;
    }

    stats.rootHeight = function(tree) {
        if (!tree.isTimeTree)
            return undefined;
        
        return tree.root.height;
    }

    stats.treeLength = function(tree) {

        if (!tree.isTimeTree)
            return undefined;

        var length = 0.0;
        
        for (var i=0; i<tree.getNodeList().length; i++) {
            var node = tree.getNodeList()[i];

            if (!node.isRoot())
                length += node.branchLength;
        }

        return length;
    }

    stats.cherryCount = function(tree) {

        var nCherries = 0;
        
        for (var i=0; i<tree.getNodeList().length; i++) {
            var node = tree.getNodeList()[i];

            if (node.children.length == 2
                && node.children[0].isLeaf()
                && node.children[1].isLeaf())
                nCherries += 1;
        }
            
        return nCherries;
    }

    function computeCladeSizes(node, cladeSizes) {

        var thisCladeSize = node.isLeaf() ? 1 : 0;
        
        for (var i=0; i<node.children.length; i++)
            thisCladeSize += computeCladeSizes(node.children[i], cladeSizes);

        cladeSizes[node] = thisCladeSize;
        return thisCladeSize;
    }

    stats.collessImbalance = function(tree) {

        var cladeSizes = {};
        computeCladeSizes(tree.root, cladeSizes);

        var imbalance = 0;
        
        for (var i=0; i<tree.getNodeList().length; i++) {
            var node = tree.getNodeList()[i];

            if (node.children.length == 2) {
                var n0 = cladeSizes[node.children[0]];
                var n1 = cladeSizes[node.children[1]];
                imbalance += Math.abs(n1 - n0);
            }
        }

        console.log(cladeSizes)

        return imbalance;
    }

    stats.scaledImbalance = function(tree) {

        var cladeSizes = {};
        computeCladeSizes(tree.root, cladeSizes);

        var imbalance = 0;
        var nNodesIncluded = 0;
        
        for (var i=0; i<tree.getNodeList().length; i++) {
            var node = tree.getNodeList()[i];

            if (node.children.length == 2) {
                var n0 = cladeSizes[node.children[0]];
                var n1 = cladeSizes[node.children[1]];
                imbalance += Math.abs(n1 - n0)/(n1 + n0);
                nNodesIncluded += 1;
            }
        }

        return imbalance/nNodesIncluded;
    }

    return stats;
}) ()
