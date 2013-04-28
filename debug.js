var tree, layout, svg;

// Main for testing
function main() {
    
    var newickString = document.getElementById("newickInput").innerHTML;
    newickString = newickString.replace(/&amp;/g,"&");
    tree = Object.create(TreeFromNewick).init(newickString);

    console.log("Successfully parsed tree with "
		+ tree.getNodeList().length + " nodes and "
		+ tree.getLeafList().length + " leaves.");

    layout = Object.create(Layout).init(tree).standard();
    
    var oldElement = document.getElementById("SVG");
    if (oldElement != null)
	oldElement.parentNode.removeChild(oldElement);
	
    svg = layout.display(640, 480);
    document.getElementById("output").appendChild(svg);
    console.log(svg.innerHTML);
}