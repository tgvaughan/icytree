var svg;

// Main for testing
function main() {
    
    var newickString = document.getElementById("newickInput").innerHTML;
    newickString = newickString.replace(/&amp;/g,"&");
    var tree = Object.create(TreeFromNewick).init(newickString);

    console.log("Successfully parsed tree with "
		+ tree.getNodeList().length + " nodes and "
		+ tree.getLeafList().length + " leaves.");

    var layout = Object.create(Layout).init(tree).standard();
    
    var oldElement = document.getElementById("SVG");
    if (oldElement != null)
	oldElement.parentNode.removeChild(oldElement);
	

    var width = Math.max(window.innerWidth*0.9, 100);
    var height = Math.max(window.innerHeight-200, 200);

    svg = layout.display(width, height);
    document.getElementById("output").appendChild(svg);
    console.log(svg.innerHTML);
}