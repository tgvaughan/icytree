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

var Write = (function () {

    function newickRecurse(node, annotate) {
        var res = "";
        if (!node.isLeaf()) {
            res += "(";
            for (var i=0; i<node.children.length; i++) {
                if (i>0)
                    res += ",";
                res += newickRecurse(node.children[i], annotate);
            }
            res += ")";
        }

        if (node.label !== undefined)
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

    function newickWriter(tree) {
        var newickStr = "";

        if (tree.root !== undefined)
            newickStr += newickRecurse(tree.root) + ";";

        return newickStr;
    }

    function nexusWriter(tree) {
        var nexusStr = "#NEXUS\n\nbegin trees;\n"

        if (tree.root !== undefined)
            nexusStr += "\ttree tree_1 = [&R] " + newickRecurse(tree.root, true) + ";" + "\n";

        nexusStr += "end;";

        return nexusStr;
    }


    var phyloXMLNS = "http://www.phyloxml.org";

    function phyloXMLRecurse(node, doc) {

        var clade = doc.createElementNS(phyloXMLNS, "clade");

        if (node.label !== undefined && node.label !== "") {
            var name = doc.createElementNS(phyloXMLNS, "name");
            name.textContent = node.label;
            clade.appendChild(name);
        }

        for (key in node.annotation) {
            var property = doc.createElementNS(phyloXMLNS, "property");
            property.setAttribute("applies_to", "node");
            property.setAttribute("datatype", "xsd:string");
            property.setAttribute("ref", key);
            property.textContent = node.annotation[key];
            clade.appendChild(property);
        }

        if (node.branchLength !== undefined)
            clade.setAttribute("branch_length", node.branchLength);

        for (var i=0; i<node.children.length; i++)
            clade.appendChild(phyloXMLRecurse(node.children[i], doc));

        return clade;
    }

    function phyloXMLWriter(tree) {
        var doc = document.implementation.createDocument(phyloXMLNS, "phyloxml");

        if (tree.root !== undefined) {
            var phylogeny = doc.createElementNS(phyloXMLNS, "phylogeny");
            phylogeny.setAttribute("rooted", "true");

            phylogeny.appendChild(phyloXMLRecurse(tree.root, doc));

            doc.documentElement.appendChild(phylogeny);
        }

        return new XMLSerializer().serializeToString(doc);
    }

    function neXMLWriter(tree) {
    }

    return {
        newick: newickWriter,
        nexus: nexusWriter,
        phyloXML: phyloXMLWriter,
        neXML: neXMLWriter
    };
}) ();
