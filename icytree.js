window.onresize = update;

// Global variables
var treeFile = undefined;
var treeData = "";
var trees = [];
var currentTreeIdx = 0;
var controlsHidden = false;
var outputEl = undefined;
var zoomControl = undefined;

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

    var margin = 20;
    var menuHeight = 10;

    var output = document.getElementById("output");
    output.innerHTML = string;
    output.style.margin = margin + "px";
    output.style.border = "dashed gray 5px";
    output.style.borderRadius = "30px";

    output.style.left = "0px";
    output.style.top = menuHeight + "px";
    output.style.width = Math.max(window.innerWidth-10-2*margin, 200) + "px";
    output.style.height = "100px";
    var pad = Math.max(Math.floor((window.innerHeight-menuHeight-10-2*margin-100)/2), 0) + "px";
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

    output.style.left = "0px"
    output.style.top = "0px"
    output.style.width = "auto";
    output.style.height = "auto";
    output.style.padding = "0px";

    output.style.font = "inherit";
    output.style.textAlign = "inherit";

    output.style.color = "inherit";

}

// Update checked item in list:
function selectListItem(el) {

    // el is an <a> within the <li>
    var li = el.parentElement;
    var ul = li.parentElement;

    if (li.className === "checked")
	return;

    // Uncheck old selected element:
    ul.getElementsByClassName("checked")[0].className = "";

    // Check this element:
    li.className = "checked";

    // Update
    update();
}

// Update form elements containing trait selectors
function updateTraitSelectors(tree) {
    
    var elementIDs = ["colourTraitSelector", "tipTextTraitSelector", "nodeTextTraitSelector"];
    for (var eidx=0; eidx<elementIDs.length; eidx++) {
        var el = document.getElementById(elementIDs[eidx]);
	
        // Save currently selected trait:
        var selectedTrait =  el.getElementsByClassName("checked")[0].children[0].text;
	
        // Clear old traits:
        el.innerHTML = "";
	
        // Selector-dependent stuff:
	// Colour selector only allows traits common to _all_ nodes on tree.
	// All other selectors include the node label as an option.

	var traitList = ["None"];
        if (elementIDs[eidx] === "colourTraitSelector") {
	    traitList = traitList.concat(tree.getTraitList(true));

	} else {
	    traitList.push("Node label");
	    traitList = traitList.concat(tree.getTraitList(false));
        }

	// Construct selector trait lists:
        for (var i=0; i<traitList.length; i++) {
            var selector = document.createElement("li");
	    var a = document.createElement("a");
	    a.setAttribute("href","#");
	    a.setAttribute("onclick", "selectListItem(this); return false;");
	    a.textContent = traitList[i];
	    selector.appendChild(a);
	    if (traitList[i] === selectedTrait)
		selector.className = "checked";
	    el.appendChild(selector);
        }

    }
}

// Ensure current tree index is within bounds,
// keeps "spin control" up to date and alters
// visibility of control depending on number of
// trees in current list.
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

    var selectEl = document.getElementById("treeSelect");
    var counterEl = document.getElementById("treeCounter");

    if (trees.length>1) {
	selectEl.style.display = "block";
	counterEl.textContent = "Tree number: " +
	(currentTreeIdx+1) + " of " + trees.length;
    } else {
	selectEl.style.display = "none";
    }
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
    switch (document.getElementById("sortSelector").getElementsByClassName("checked")[0].children[0].text) {
    case "Ascending":
        tree.sortNodes(false);
	break;
    case "Descending":
        tree.sortNodes(true);
	break;
    default:
	break;
    }

    // Update trait selectors:
    updateTraitSelectors(tree);
    
    // Determine whether colouring is required:
    var colourTrait = undefined;
    var colourTraitEl = document.getElementById("colourTraitSelector").getElementsByClassName("checked")[0];
    if (colourTraitEl.textContent !== "None") {
	colourTrait = colourTraitEl.textContent;
    }
    
    // Determine whether tip labels are required:
    var tipTextTrait = undefined;
    var tipTextTraitEl = document.getElementById("tipTextTraitSelector").getElementsByClassName("checked")[0];
    if (tipTextTraitEl.textContent !== "None") {
	if (tipTextTraitEl.textContent === "Node label")
	    tipTextTrait = "label";
	else
	    tipTextTrait = tipTextTraitEl.textContent;
    }

    // Determine whether internal node labels are required:
    var nodeTextTrait = undefined;
    var nodeTextTraitEl = document.getElementById("nodeTextTraitSelector").getElementsByClassName("checked")[0];
    if (nodeTextTraitEl.textContent !== "None") {
	if (nodeTextTraitEl.textContent === "Node label")
	    nodeTextTrait = "label";
	else
	    nodeTextTrait = nodeTextTraitEl.textContent;
    }

    // Determine whether internal nodes should be marked:
    var markSingletonNodes = document.getElementById("markSingletonNodes").checked;

    // Determine whether axis should be displayed:
    var showAxis = document.getElementById("axis").checked;

    // Create layout object:
    var layout = Object.create(Layout).init(tree).standard();
    
    // Assign chosen layout properties:

    var controlsOffset;
    controlsOffset = 0;

    layout.width = Math.max(window.innerWidth-controlsOffset-5, 200);
    layout.height = Math.max(window.innerHeight-5, 200);
    layout.colourTrait = colourTrait;
    layout.tipTextTrait = tipTextTrait;
    layout.nodeTextTrait = nodeTextTrait;
    layout.markSingletonNodes = markSingletonNodes;
    layout.axis = showAxis;

    // Use existing zoom control instance:
    layout.zoomControl = zoomControl;

    // Display!
    outputEl.innerHTML = "";
    var svg = layout.display();
    svg.setAttribute("id", "SVG");
    svg.style.shapeRendering = "crispEdges";
    outputEl.appendChild(svg);

    // Enable export button:
    document.getElementById("exportSVG").disabled = false;
}

// Page initialisation code:
function initialise() {

    // Record output element
    outputEl = document.getElementById("output");
    
    // Set up drag and drop event listeners:
    outputEl.addEventListener("dragover", function(event) {
	event.preventDefault();
	return false;
    });
    outputEl.addEventListener("dragend", function(event) {
	event.preventDefault();
	return false;
    });
    outputEl.addEventListener("drop", dropInputHandler);

    // Create new zoomControl object (don't initialise):
    zoomControl = Object.create(ZoomControl, {});

    // Read tree from HTTP GET parameter if available:
    if (window.location.search.length>0 && window.location.search[0]==="?") {
	treeData = atob(window.location.search.slice(1));
	reloadTreeData();
	return;
    }

    update();
}
