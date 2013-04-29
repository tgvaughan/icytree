window.onresize = main;
      
function deleteOldSVGElement() {
    var oldElement = document.getElementById("SVG");
    if (oldElement != null)
        oldElement.parentNode.removeChild(oldElement);
}

function displayFrameWithText(string) {
    deleteOldSVGElement();
    
    var NS="http://www.w3.org/2000/svg";
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", Math.max(window.innerWidth-250-5, 200));
    svg.setAttribute("height", Math.max(window.innerHeight-5, 200));
    svg.setAttribute("id", "SVG");

    var rect = document.createElementNS(NS, "rect");
    rect.setAttribute("x", 30);
    rect.setAttribute("y", 30);
    rect.setAttribute("width", Math.max(window.innerWidth-250-60, 200));
    rect.setAttribute("height", Math.max(window.innerHeight-60, 200));
    rect.setAttribute("rx", 15);
    rect.setAttribute("ry", 15);
    rect.setAttribute("fill", "none");
    rect.setAttribute("stroke", "gray");
    rect.setAttribute("stroke-width", 5);
    rect.setAttribute("stroke-dasharray", "10,10");
    svg.appendChild(rect);

    var text = document.createElementNS(NS, "text");
    var cx = Math.round((window.innerWidth-250)/2);
    var cy = Math.round(window.innerHeight/2);
    text.setAttribute("x", cx);
    text.setAttribute("y", cy);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("fill", "gray");
    text.setAttribute("font-family", "sans-serif");
    text.setAttribute("font-size", "40pt");
    text.textContent = string;
    svg.appendChild(text);
    
    document.getElementById("output").appendChild(svg);
}

function updateControls() {
    // Update form elements:
    if (!document.getElementById("sort").checked) {
        document.getElementById("sortOrder").disabled = true;
    } else {
        document.getElementById("sortOrder").disabled = false;
    }
    
    if (!document.getElementById("colour").checked) {
        document.getElementById("colourTrait").disabled = true;
    } else {
        document.getElementById("colourTrait").disabled = false;
    }
    
    if (!document.getElementById("tipText").checked) {
        document.getElementById("tipTextTrait").disabled = true;
    } else {
        document.getElementById("tipTextTrait").disabled = false;
    }
}

function updateTraitSelectors(traitList) {
    // Update form elements containing trait selectors
    
    var elementIDs = ["colourTrait", "tipTextTrait"];
    for (var eidx=0; eidx<elementIDs.length; eidx++) {
        var el = document.getElementById(elementIDs[eidx]);
	
        // Save currently selected element index:
        var idx = el.selectedIndex;
	
        // Clear old traits:
        el.innerHTML = "";
	
        // Ensure first element is "label" if this is a text trait
        if (elementIDs[eidx] == "tipTextTrait") {
            var selector = document.createElement("option");
            selector.setAttribute("value", "label");
            selector.textContent = "label";
            el.appendChild(selector);   
        }

        for (var i=0; i<traitList.length; i++) {
            var selector = document.createElement("option");
            selector.setAttribute("value", traitList[i]);
            selector.textContent = traitList[i];
            el.appendChild(selector);
        }

        // Restore selected index:
        if (idx>=0)
            el.selectedIndex = idx;
    }
}


/*******
 * MAIN *
 ********/

function main() {

    updateControls();
    
    var newickString = document.getElementById("pasteInput").value;
    
    if (newickString.replace(/\s+/g,"").length==0) {
        displayFrameWithText("no tree loaded");
        return;
    }

    newickString = newickString.replace(/&amp;/g,"&");
    
    try {
        var tree = Object.create(TreeFromNewick).init(newickString);
    } catch (e) {
        displayFrameWithText("error parsing Newick string");
        return;
    }

    console.log("Successfully parsed tree with "
                + tree.getNodeList().length + " nodes and "
                + tree.getLeafList().length + " leaves.");

    // Sort tree nodes
    if (document.getElementById("sort").checked) {
        var sortOrderElement = document.getElementById("sortOrder");
        if (sortOrderElement.options[sortOrderElement.selectedIndex].value=="ascending")
            tree.sortNodes(false);
        else
            tree.sortNodes(true);
    }

    // Update trait selectors:
    updateTraitSelectors(tree.getTraitList());
    
    // Determine whether colouring is required:
    
    var colourTrait = undefined;
    if (document.getElementById("colour").checked) {
        var colourTraitElement = document.getElementById("colourTrait");
	if (colourTraitElement.selectedIndex>=0) {
	    colourTrait = colourTraitElement.options[colourTraitElement.selectedIndex].value;
	}
    }
    
    // Determine whether tip labels are required:
    var tipTextTrait = undefined;
    if (document.getElementById("tipText").checked) {
        var tipTextTraitElement = document.getElementById("tipTextTrait");
        if (tipTextTraitElement.selectedIndex>=0) {
            tipTextTrait = tipTextTraitElement.options[tipTextTraitElement.selectedIndex].value;
        }
    }
	
    var layout = Object.create(Layout).init(tree).standard();
    
    layout.width = Math.max(window.innerWidth-250-5, 200);
    layout.height = Math.max(window.innerHeight-5, 200);
    layout.colourTrait = colourTrait;
    layout.tipTextTrait = tipTextTrait;
    
    var svg = layout.display();
    deleteOldSVGElement();
    svg.setAttribute("id", "SVG");
    document.getElementById("output").appendChild(svg);
    
}