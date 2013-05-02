window.onresize = update;

// Global variables
var treeFile = undefined;;
var treeData = "";
var trees = [];
var currentTreeIdx = 0;

function fileInputHandler() {
    treeFile = document.getElementById("fileInput").files[0];

    // Enable reload button:
    document.getElementById("fileReload").disabled = false;

    loadFile();
}

function pasteInputHandler() {
    treeData = document.getElementById("pasteInput").value;

    // Disable reload button:
    document.getElementById("fileReload").disabled = true;

    reloadTreeData();
}

function dropInputHandler(event) {
    event.preventDefault();

    treeFile = event.dataTransfer.files[0];

    // Enable reload
    document.getElementById("fileReload").disabled = false;

    loadFile();
}

// Load tree data from file object treeFile
function loadFile() {
    var reader = new FileReader();
    reader.onload = fileLoaded;
    reader.readAsText(treeFile);

    function fileLoaded(evt) {
	treeData = evt.target.result;
	reloadTreeData();
    }

    // Enable reload button:
    document.getElementById("fileReload").disabled = false;

}

// Display space-filling frame with big text
function displayFrameWithText(string, isError) {

    var output = document.getElementById("output");
    output.innerHTML = string;
    output.style.margin = "20px";
    output.style.border = "dashed gray 5px";
    output.style.borderRadius = "10px";

    output.style.width = Math.max(window.innerWidth-270-10-40, 200) + "px";
    output.style.height = "100px";
    var pad = Math.max(Math.floor((window.innerHeight-10-40-100)/2), 0) + "px";
    output.style.paddingTop = pad;
    output.style.paddingBottom = pad;

    output.style.font = "50px sans-serif";
    output.style.textAlign = "center";

    if (isError)
	output.style.color = "red";
    else
	output.style.color = "gray";
}

// Clear all output element styles.
function prepareOutputForTree(string) {
    var output = document.getElementById("output");
    output.innerHTML = "";
    output.style.margin = "0px";
    output.style.border = "none";

    output.style.width = "auto";
    output.style.height = "auto";
    output.style.padding = "0px";

    output.style.font = "inherit";
    output.style.textAlign = "inherit";

    output.style.color = "inherit";
}

// Update form elements containing trait selectors
function updateTraitSelectors(traitList) {
    
    var elementIDs = ["colourTrait", "tipTextTrait", "nodeTextTrait"];
    for (var eidx=0; eidx<elementIDs.length; eidx++) {
        var el = document.getElementById(elementIDs[eidx]);
	
        // Save currently selected element index:
        var idx = el.selectedIndex;
	
        // Clear old traits:
        el.innerHTML = "";
	
        // Ensure first element is "label" if this is a text trait
        if (elementIDs[eidx] !== "colourTrait") {
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

// Ensure current tree index is within bounds and
// keeps "spin control" up to date
function updateCurrentTreeIdx() {

    if (currentTreeIdx>trees.length-1)
	currentTreeIdx = trees.length-1;
    else if (currentTreeIdx<0)
	currentTreeIdx = 0;

    if (currentTreeIdx<=0) {
	document.getElementById("prevTree").disabled = true;
	document.getElementById("firstTree").disabled = true;
    } else {
	document.getElementById("prevTree").disabled = false;
	document.getElementById("firstTree").disabled = false;
    }

    if (currentTreeIdx>=trees.length-1) {
	document.getElementById("nextTree").disabled = true;
	document.getElementById("lastTree").disabled = true;
    } else {
	document.getElementById("nextTree").disabled = false;
	document.getElementById("lastTree").disabled = false;
    }

    var counterEl = document.getElementById("treeCounter");
    if (trees.length>1)
	counterEl.textContent = "Tree number: " +
	(currentTreeIdx+1) + " of " + trees.length;
    else
	counterEl.textContent = "";
}

// Update object representation of tree data from string
function reloadTreeData() {

    if (treeData.replace(/\s+/g,"").length === 0) {
        trees = [];
	update();
	return;
    }

    treeData = treeData.replace(/&amp;/g,"&");

    if (treeData.length>500000) {

	// Parse large data set asynchronously and display loading screen
	
	displayFrameWithText("loading...");

	setTimeout(function() {

	    try {
		trees = getTreesFromString(treeData);
	    } catch (e) {
		displayFrameWithText("error parsing tree data", true);
		console.log(e);
		return;
	    }
	    
	    console.log("Successfully parsed " + trees.length + " trees.");
	    update();
	}, 300);
    } else {

	// Parse small data set NOW. (No loading screen.)

	try {
	    trees = getTreesFromString(treeData);
	} catch (e) {
	    displayFrameWithText("error parsing tree data", true);
	    console.log(e);
	    return;
	}
	    
	console.log("Successfully parsed " + trees.length + " trees.");
	update();
    }
}

// Converts SVG in output element to data URI for saving
function exportSVG() {
    var outputEl = document.getElementById("output");
    var dataURI = "data:image/svg+xml;base64," + window.btoa(outputEl.innerHTML);
    window.open(dataURI);
}

// Update display according to current tree model and display settings
function update() {

    // Update tree index selector:
    updateCurrentTreeIdx();

    if (trees.length === 0) {
	displayFrameWithText("no tree loaded");
	document.getElementById("exportSVG").disabled = true;
	return;
    } else {
	prepareOutputForTree();
    }

    // Generate _copy_ of tree to draw.
    // (Allows us to revert sorting operation.)
    var tree = trees[currentTreeIdx].copy();

    // Sort tree nodes
    if (document.getElementById("sort").checked) {
        var sortOrderElement = document.getElementById("sortOrder");
        if (sortOrderElement.options[sortOrderElement.selectedIndex].value === "ascending")
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

    // Determine whether internal node labels are required:
    var nodeTextTrait = undefined;
    if (document.getElementById("nodeText").checked) {
        var nodeTextTraitElement = document.getElementById("nodeTextTrait");
        if (nodeTextTraitElement.selectedIndex>=0) {
            nodeTextTrait = nodeTextTraitElement.options[nodeTextTraitElement.selectedIndex].value;
        }
    }

    // Create layout object:
    var layout = Object.create(Layout).init(tree).standard();
    
    // Assign chosen layout properties:
    layout.width = Math.max(window.innerWidth-270-5, 200);
    layout.height = Math.max(window.innerHeight-5, 200);
    layout.colourTrait = colourTrait;
    layout.tipTextTrait = tipTextTrait;
    layout.nodeTextTrait = nodeTextTrait;
    
    // Display!
    var outputElement = document.getElementById("output");
    outputElement.innerHTML = "";
    var svg = layout.display();
    svg.setAttribute("id", "SVG");
    outputElement.appendChild(svg);

    // Enable export button:
    document.getElementById("exportSVG").disabled = false;
}

// Add event listeners, call first update()
function initialise() {

	var output = document.getElementById("output");

	output.addEventListener("dragover", function(event) {
		event.preventDefault();
		return false;
	});
	output.addEventListener("dragend", function(event) {
		event.preventDefault();
		return false;
	});
	output.addEventListener("drop", dropInputHandler);

	update();
}
