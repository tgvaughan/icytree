/**
 * @licstart  The following is the entire license notice for the
 *  JavaScript code in this page.
 *
 * Copyright (C) 2014  Tim Vaughan
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

// Global variables
var treeFile;
var treeData = "";
var trees = [];
var currentTreeIdx = 0;
var controlsHidden = false;

var layout;

// Page initialisation code:
$(document).ready(function() {

    $(window).on("resize", update);

    // Set up drag and drop event listeners:
    $("#output").on("dragover", function(event) {
        event.preventDefault();
        return false;
    });
    $("#output").on("dragend", function(event) {
        event.preventDefault();
        return false;
    });
    $("#output").on("drop", function (event) {
        event.preventDefault();
        treeFile = event.originalEvent.dataTransfer.files[0];
        loadFile();
    });

    // Set up keyboard handler:
    $(window).on("keypress", keyPressHandler);

    // Set up menus:
    $("#menu > li > button").button().click(function() {
        // Hack to avoid loosing ability to handle keypress events when one of
        // these buttons is clicked.
        $(this).blur();
    });

    $("#fileMenu").menu().hide();
    $("#styleMenu").menu().hide();
    $("#searchMenu").menu().hide();
    $("#helpMenu").menu().hide();

    $("#menu > li").mouseover(function() {
        if (!$(this).find("button").first().hasClass("ui-state-disabled"))
        $(this).find("ul").first().show();
    });

    $("#menu > li").mouseout(function() {
        $(this).find("ul").first().hide();
    });


    // Menu item events:

    $("#fileMenu").on("menuselect", function(event, ui) {
        switch(ui.item.attr("id")) {
            case "fileEnter":
                $("#directEntry").dialog("open");
                var textBox = $("#directEntry").find("textArea");
                textBox.focus();
                textBox.select();
                break;

            case "fileLoad":
                // Clear file input (otherwise can't reload same file)
                $("#fileInput").replaceWith($("#fileInput").clone(true));

                // Trigger click on file input
                if (!$(this).parent().hasClass("ui-state-disabled")) {
                    $("#fileInput").trigger("click");
                }
                break;

            case "fileReload":
                reloadWarning();
                loadFile();
                break;

            case "fileExportSVG":
                exportSVG();
                break;

            case "fileExportMultiSVG":
                $("#multiSVGspinner").spinner().spinner("value",2);
                $("#multiSVGDialog").dialog("open");
                break;

            case "fileExportNewick":
                exportNewick();
                break;

            case "fileExportNEXUS":
                exportNEXUS();
                break;

            default:
                break;
        }
    });

    $("#styleMenu").on("menuselect", function(event, ui) {
        switch(ui.item.attr("id")) {
            case "styleMarkSingletons":
            case "styleDisplayRecomb":
            case "styleInlineRecomb":
            case "styleMinRecombLength":
            case "styleDisplayLegend":
            case "styleAngleText":
            case "styleLogScale":
            case "styleAntiAlias":
                toggleItem(ui.item);
                break;

            case "styleSetAxisOffset":
                $("#axisOffsetDialog").dialog("open");
                var inputBox = $("#axisOffsetInput");
                inputBox.val(TreeStyle.axisOffset);
                inputBox.focus();
                inputBox.select();
                break;

            default:
                switch(ui.item.parent().attr("id")) {
                    case "styleSort":
                    case "styleLayout":
                    case "styleColourTrait":
                    case "styleTipTextTrait":
                    case "styleNodeTextTrait":
                    case "styleRecombTextTrait":
                    case "styleNodeBarTrait":
                    case "styleEdgeOpacityTrait":
                    case "styleRecombOpacityTrait":
                    case "styleLabelPrec":
                    case "styleAxis":
                        selectListItem(ui.item);
                        break;

                    case "styleFontSize":
                        if (ui.item.text().indexOf("Increase")>=0)
                            fontSizeChange(2);
                        else
                            fontSizeChange(-2);
                        break;

                    case "styleEdgeWidth":
                        if (ui.item.text().indexOf("Increase")>=0)
                            edgeWidthChange(1);
                        else
                            edgeWidthChange(-1);
                        break;
                }
                break;
        }
    });

    $("#searchMenu").on("menuselect", function(event, ui) {
        var tree = trees[currentTreeIdx];

        switch(ui.item.attr("id")) {
            case "searchNodes":
                $("#nodeSearchDialog").dialog("open");
                break;

            case "searchClear":
                clearSearchHighlight();
                break;
        }
    });

    $("#helpMenu").on("menuselect", function(event, ui) {
        switch(ui.item.attr("id")) {
            case "helpTreeNav":
                $("#navHelp").dialog("open");
                break;
            case "helpShortcuts":
                $("#shortcutHelp").dialog("open");
                break;
            case "helpGuide":
                $("#guide").dialog("open");
                break;
            case "helpAbout":
                $("#about").dialog("open");
                break;
        }
    });


    // Set up dialogs:

    $("#directEntry").dialog({
        autoOpen: false,
        modal: true,
        width: 500,
        height: 400,
        buttons: {
            Done: function() {
                treeData = $(this).find("textArea").val();
                reloadTreeData();
                $(this).dialog("close");
            },
        Clear: function() {
            $(this).find("textArea").val("");
        },
        Cancel: function() {
            $(this).dialog("close");
        }}
    });

    $("#fileInput").change(function() {
        treeFile = $("#fileInput").prop("files")[0];
        loadFile();
    });

    $("#multiSVGDialog").dialog({
        autoOpen: false,
        modal: true,
        width: 400,
        height: 300,
        buttons: {
            Export: function() {
                exportSVGMulti($("#multiSVGspinner").spinner().spinner("value"));
                $(this).dialog("close");
            },
        Cancel: function() {
            $(this).dialog("close");
        }}
    });

    $("#axisOffsetDialog").dialog({
        autoOpen: false,
        modal: true,
        width: 400,
        buttons: {
            Ok: function() {
                TreeStyle.axisOffset = Number($("#axisOffsetInput").val());
                $(this).dialog("close");
                update();
            },
            Cancel: function() {
                $(this).dialog("close");
            }}
    });

    $("#nodeSearchDialog").dialog({
        autoOpen: false,
        modal: false,
        width: 450,
        buttons: {
            Search: function() {

                var tree = trees[currentTreeIdx];

                var searchStrings = $("#searchStringInput").val().split(",");
                var akey = $("#searchAnnotationKey").val();
                var highlightType = $("input[name=searchOpt]:checked", "#nodeSearchDialog").val();

                var searchAttrib = $("#searchAttribute").val();

                var wholeAttribMatch = $("#searchWholeAttrib").prop("checked");
                var caseSensitive = $("#searchCaseSensitive").prop("checked");

                // Clear existing highlights
                $.each(tree.getNodeList(), function(nidx, node) {
                    delete node.annotation[akey];
                });

                var noMatch = true;

                $.each(searchStrings, function(eidx, str) {
                    var matchVal = eidx+1;

                    if (!caseSensitive)
                        str = str.toLowerCase();

                    // Find matching nodes
                    var matchingNodes = [];
                    $.each(tree.getNodeList(), function(nidx, node) {

                        var searchText;
                        if (searchAttrib === "Label")
                            searchText = node.label;
                        else
                            searchText = node.annotation[searchAttrib];

                        if (!caseSensitive)
                            searchText = searchText.toLowerCase();

                        if ((wholeAttribMatch && (searchText === str)) || (!wholeAttribMatch && searchText.search(str)>=0))
                            matchingNodes = matchingNodes.concat(node);
                    });

                    if (matchingNodes.length === 0)
                        return;

                    noMatch = false;

                    // Highlight additional nodes as required

                    if (highlightType === "monophyletic")
                        matchingNodes = tree.getCladeNodes(matchingNodes);

                    if (highlightType === "ancestors")
                        matchingNodes = tree.getAncestralNodes(matchingNodes);

                    // Annotate selected nodes
                    $.each(matchingNodes, function (nidx, node) {
                        node.annotation[akey] = matchVal;
                    });
                });

                if (noMatch) {
                    update();
                    return;
                }

                updateTraitSelectors();

                // Colour tree using highlighting trait
                var hlElement;
                $("#styleColourTrait").children().each(function(eidx) {
                    if ($(this).text() === akey) {
                        hlElement = $(this);
                    }
                });

                selectListItem(hlElement, false, false);

                update();
            },

            Clear: clearSearchHighlight,

            Done: function() {
                $(this).dialog("close");
            }}
    });
    $("#searchCaseSensitive").prop("checked", true);


    $("#shortcutHelp").dialog({
        autoOpen: false,
        modal: true,
        width: 450,
        buttons: {
            Ok: function() {
                $(this).dialog("close");
            }}
    });

    $("#navHelp").dialog({
        autoOpen: false,
        modal: true,
        width: 450,
        buttons: {
            Ok: function() {
                $(this).dialog("close");
            }}
    });

    $("#about").dialog({
        autoOpen: false,
        modal: true,
        width: 450,
        buttons: {
            Ok: function() {
                $(this).dialog("close");
            }}
    });

    $("#guide").dialog({
        autoOpen: false,
        modal: true,
        width: 450,
        height: 450,
        buttons: {
            Close: function() {
                $(this).dialog("close");
            }}
    });

    $("#warning").dialog({
        autoOpen: false,
        modal: true,
        width: 450,
        buttons: {
            "I understand": function() {
                $(this).dialog("close");
            }}
    });

    $("#FFwarning").dialog({
        autoOpen: false,
        modal: true,
        width: 450,
        buttons: {
            "Continue anyway": function() {
                $(this).dialog("close");
            }}
    });

    update();

    // Display warning if required functions unavailable.
    if (!browserValid()) {
        $("#warning").dialog("open");
    }

});

// Test for use of FF
function browserIsFF() {
    return navigator.userAgent.toLowerCase().indexOf("firefox") > -1;
}

function reloadWarning() {
    // Display warning when using FF until bug is fixed.
    // (Uses cookie to ensure warning only displayed once.)
    if (browserIsFF()) {
        if (document.cookie.indexOf("ffWarning") == -1) {
            $("#FFwarning").dialog("open");
            document.cookie = "ffWarning=seen";
        }
    }
}

// Tests for the presence of required browser functionality
function browserValid() {
    if (typeof FileReader === "undefined") {
        // Can't load files
        $("#fileLoad").parent().addClass("ui-state-disabled");
        return false;
    }

    return true;
}

// Ensure menu items are appropriately blurred/unblurred.
function updateMenuItems() {
    if (treeFile === undefined) {
        $("#fileReload").addClass("ui-state-disabled");
    } else {
        $("#fileReload").removeClass("ui-state-disabled");
    }

    if (trees.length>0) {
        $("#styleMenu").closest("li").find("button").first().removeClass("ui-state-disabled");
        $("#searchMenu").closest("li").find("button").first().removeClass("ui-state-disabled");
        $("#fileExport").removeClass("ui-state-disabled");

        if ($("#styleLayout span").parent().text() === "Transmission Tree") {
            $("#styleSort").closest("li").addClass("ui-state-disabled");
        } else {
            $("#styleSort").closest("li").removeClass("ui-state-disabled");
        }

        if (!trees[currentTreeIdx].isTimeTree || $("#styleLayout span").parent().text() === "Cladogram") {
            $("#styleAxis").closest("li").addClass("ui-state-disabled");
            $("#styleSetAxisOffset").addClass("ui-state-disabled");
            $("#styleLogScale").addClass("ui-state-disabled");
        } else {
            $("#styleAxis").closest("li").removeClass("ui-state-disabled");
            $("#styleSetAxisOffset").removeClass("ui-state-disabled");
            $("#styleLogScale").removeClass("ui-state-disabled");
        }

        if (!trees[currentTreeIdx].isTimeTree) {
            $("#styleLayout").closest("li").addClass("ui-state-disabled");
        } else {
            $("#styleLayout").closest("li").removeClass("ui-state-disabled");
        }
    } else {
        $("#fileExport").addClass("ui-state-disabled");
        $("#styleMenu").closest("li").find("button").first().addClass("ui-state-disabled");
        $("#searchMenu").closest("li").find("button").first().addClass("ui-state-disabled");
    }
}

// Clear search highlighting
function clearSearchHighlight() {
    var tree = trees[currentTreeIdx];

    var akey = $("#searchAnnotationKey").val();
    $.each(tree.getNodeList(), function(nidx, node) {
        delete node.annotation[akey];
    });

    var noneElement = $($("#styleColourTrait a")[0]);
    selectListItem(noneElement, true, false);
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

}

// Display space-filling frame with big text
function displayStartOutput() {

    var output = $("#output");

    output.removeClass();
    output.addClass("start");
    output.html("");

    var imgHeight = 220;
    var imgWidth = 414;
    output.append(
            $("<img/>")
            .attr("src", "images/icytree_start_flattened.svg")
            .attr("height", imgHeight)
            );

    // Pad to centre of page.
    var pad = Math.max(Math.floor((window.innerHeight-60-imgHeight)/2), 0) + "px";
    output.css("paddingTop", pad);
    output.css("paddingBottom", pad);

    pad = Math.max(Math.floor((window.innerWidth-50-imgWidth)/2), 0) + "px";
    output.css("paddingLeft", pad);
    output.css("paddingRight", pad);

    output.css("width", imgWidth+"px");
    output.css("height", imgHeight+"px");

}

function displayLoading() {

    var output = $("#output");

    output.removeClass();
    output.addClass("loading");
    output.text("Loading...");

    // Pad to centre of page. (Wish I could do this with CSS!)
    output.css("width", Math.max(Math.floor(window.innerWidth-50), 0) + "px");
    output.css("height", "100px");
    var pad = Math.max(Math.floor((window.innerHeight-60-100)/2), 0) + "px";
    output.css("paddingTop", pad);
    output.css("paddingBottom", pad);
    output.css("paddingLeft", "0px");
    output.css("paddingRight", "0px");
}

function displayError(string) {

    var output = $("#output");

    output.removeClass();
    output.addClass("error");
    var divMainStr = "<div class='main'>Could not load tree!</div>";
    var divMinorStr = "<div class='minor'>" + string + "</div>";
    output.html(divMainStr + divMinorStr);

    // Pad to centre of page. (Wish I could do this with CSS!)
    output.css("width", Math.max(Math.floor(window.innerWidth-50), 0) + "px");
    output.css("height", "100px");
    var pad = Math.max(Math.floor((window.innerHeight-60-100)/2), 0) + "px";
    output.css("paddingTop", pad);
    output.css("paddingBottom", pad);
    output.css("paddingLeft", "0px");
    output.css("paddingRight", "0px");

    setTimeout(function() {
        //displayStartOutput();
        update();
    }, 4000);
}

// Display style change notification message
function displayNotification(str, ms) {
    ms = ms === undefined ? 1000 : ms;

    $("#notify").stop(true, true);
    $("#notify div").text(str);
    $("#notify").show();
    $("#notify").fadeOut(ms);
}

// Retrieve element text content
function getItemDescription(el) {
    return el.contents().filter(function() {
        return this.nodeType == 3;
    })[0].nodeValue.trim();
}

// Retrieve text label for list item
function getListItemDescription(listElement) {
    return getItemDescription(listElement.parent().parent());
}

// Clear all output element styles.
function prepareOutputForTree() {
    var output = $("#output");
    output.removeClass();
    output.css("padding", "0px");
    output.css("width", "");
    output.css("height", "");
}

// Update checked item in list.
// el is li
function selectListItem(el, doUpdate, notify) {
    if (itemToggledOn(el))
        return;

    doUpdate = (doUpdate !== undefined) ? doUpdate : true;
    notify = (notify !== undefined) ? notify : true;

    var ul = el.parent();

    // Uncheck old selected element:
    ul.find("span").remove();

    // Check this element:
    $("<span/>").addClass("ui-icon ui-icon-check").prependTo(el);

    if (notify)
        displayNotification(getListItemDescription(el) + ": " + el.text());

    if (doUpdate)
        update();
}

// Cycle checked item in list:
function cycleListItem(el) {
    if (el.closest("li").hasClass("ui-state-disabled"))
        return;

    // el is <ul>
    var currentItem = el.find("span.ui-icon-check").closest("li");
    var nextItem;
    if (currentItem.is(el.find("li").last()) || currentItem.length === 0)
        nextItem = el.find("li").first();
    else
        nextItem = currentItem.next();

    selectListItem(nextItem);
}

// Cycle checked item in list in reverse order:
function reverseCycleListItem(el) {
    if (el.closest("li").hasClass("ui-state-disabled"))
        return;

    // el is <ul>
    var currentItem = el.find("span.ui-icon-check").closest("li");
    var nextItem;
    if (currentItem.is(el.find("li").first()) || currentItem.length === 0)
        nextItem = el.find("li").last();
    else
        nextItem = currentItem.prev();

    selectListItem(nextItem);
}

function toggleItem (el) {
    if (el.hasClass("ui-state-disabled"))
        return;

    if (el.find("span.ui-icon-check").length === 0) {
        el.prepend($("<span/>").addClass("ui-icon ui-icon-check"));
        displayNotification(getItemDescription(el) + ": ON");
    } else {
        el.find("span.ui-icon-check").remove();
        displayNotification(getItemDescription(el) + ": OFF");
    }

    update();
}

function itemToggledOn(el) {
    return el.find("span.ui-icon-check").length>0;
}

// Update submenus containing trait selectors
function updateTraitSelectors() {
    var tree = trees[currentTreeIdx];

    var elements = [$("#styleColourTrait"),
        $("#styleTipTextTrait"),
        $("#styleRecombTextTrait"),
        $("#styleNodeTextTrait"),
        $("#styleNodeBarTrait"),
        $("#styleEdgeOpacityTrait"),
        $("#styleRecombOpacityTrait")];

    $.each(elements, function (eidx, el) {

        // Save currently selected trait:
        var selectedTrait =  el.find("span").parent().text();

        // Clear old traits:
        el.html("");

        // Obtain trait list:
        var traitList;
        var filter;
        switch(el.attr('id')) {
            case "styleTipTextTrait":
                filter = function(node) {return !(node.isLeaf() && node.isHybrid());};
                traitList = ["None", "Label"];
                break;

            case "styleRecombTextTrait":
                filter = function(node) {return (node.isLeaf() && node.isHybrid());};
                traitList = ["None", "Label"];
                break;

            case "styleNodeTextTrait":
                filter = function(node) {return !node.isLeaf();};
                traitList = ["None", "Label"];
                break;

            case "styleNodeBarTrait":
                filter = function(node, trait) {
                    return !node.isLeaf() && node.annotation[trait].length == 2;
                };
                traitList = ["None"];
                break;

            case "styleEdgeOpacityTrait":
                filter = function(node, trait) {
                    if (node.isHybrid() && node.isLeaf())
                        return false;
                    var nVal = Number(node.annotation[trait]);
                    return !Number.isNaN(nVal) && nVal>=0 && nVal<=1;
                };
                traitList = ["None"];
                break;

            case "styleRecombOpacityTrait":
                filter = function(node, trait) {
                    if (!node.isHybrid() || !node.isLeaf())
                        return false;
                    var nVal = Number(node.annotation[trait]);
                    return !Number.isNaN(nVal) && nVal>=0 && nVal<=1;
                };
                traitList = ["None"];
                break;

            default:
                filter = function(node) {return true;};
                traitList = ["None", "Label"];
        }
        traitList = traitList.concat(tree.getTraitList(filter));

        // Construct selector trait lists:
        var selector, i;
        for (i=0; i<traitList.length; i++) {
            selector = $("<li />").text(traitList[i]);
            if (traitList[i] === selectedTrait)
                $("<span/>").addClass("ui-icon ui-icon-check").prependTo(selector);
            el.append(selector);
        }

        // Update search dialog trait list:

        selectedTrait = $("#searchAttribute").val();

        traitList = ["Label"].concat(tree.getTraitList(function(node, trait) {
            return node.isLeaf() && !node.isHybrid();
        }));

        $("#searchAttribute").html("");

        var akey = $("#searchAnnotationKey").val();
        for (i=0; i<traitList.length; i++) {
            if (traitList[i] == akey)
                continue;

            selector = $("<option />").text(traitList[i]);
            
            if (traitList[i] == selectedTrait)
                $(selector).attr("selected", "selected");

            $("#searchAttribute").append(selector);
        }
    });

    $("#styleMenu").menu("refresh");
}

// Alter line width used in visualisation.
function edgeWidthChange(inc) {
    TreeStyle.lineWidth = Math.max(1, TreeStyle.lineWidth + inc);
    displayNotification("Edge width: " + TreeStyle.lineWidth);
    update();
}

// Alter font size used in visualisation.
function fontSizeChange(inc) {
    TreeStyle.fontSize = Math.max(6, TreeStyle.fontSize + inc);
    displayNotification("Font size: " + TreeStyle.fontSize);
    update();
}

// Increment currently-displayed tree.
function currentTreeInc(dir, big) {
    var inc;
    if (big)
        inc = dir*Math.round(trees.length/10);
    else
        inc = dir;

    currentTreeIdx = Math.max(0, currentTreeIdx+inc);
    currentTreeIdx = Math.min(trees.length-1, currentTreeIdx);

    update();
}

// Alter currently-displayed tree.
function currentTreeChange(newVal) {
    newVal = Number(newVal);
    if (String(newVal) === "NaN") {
        updateCurrentTreeControl();
        return;
    }

    currentTreeIdx = Math.max(0, Number(newVal)-1);
    currentTreeIdx = Math.min(trees.length-1, currentTreeIdx);

    update();
}

// Ensure current tree index is within bounds,
// keeps "spin control" up to date and alters
// visibility of control depending on number of
// trees in current list.
function updateCurrentTreeControl() {

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

        var setTreeEl = document.getElementById("setTree");
        setTreeEl.value = currentTreeIdx+1;
        setTreeEl.size = String(trees.length).length;
    } else {
        selectEl.style.display = "none";
    }
}

// Update object representation of tree data from string
function reloadTreeData() {

    // Clear existing trees
    trees = [];

    // Early check for empty tree data
    if (treeData.replace(/\s+/g,"").length === 0) {
        update();
        return;
    }

    treeData = treeData.replace(/&amp;/g,"&");

    if (treeData.length>500000) {

        // Parse large data set asynchronously and display loading screen

        displayLoading();

        setTimeout(function() {

            try {
                trees = getTreesFromString(treeData);
            } catch (e) {
                displayError(e.message);
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
            displayError(e.message);
            console.log(e);
            return;
        }

        console.log("Successfully parsed " + trees.length + " trees.");
        update();
    }
}

// Converts SVG in output element to data URI for saving
function exportSVG() {
    if (currentTreeIdx>=trees.length || currentTreeIdx<0)
        return false;

    var blob = new Blob([$("#output").html()], {type: "image/svg+xml"});
    saveAs(blob, "tree.svg");
}

function exportSVGMulti(pages) {
    if (currentTreeIdx>=trees.length || currentTreeIdx<0)
        return false;

    var svgEl = $("#output > svg")[0];

    // Get full width and height
    var width = svgEl.getAttribute("width");
    var height = svgEl.getAttribute("height");

    // Height to use for each page
    var imageHeight = height/pages;

    // Record current viewbox
    var vbx = svgEl.viewBox.baseVal.x;
    var vby = svgEl.viewBox.baseVal.y;
    var vbwidth = svgEl.viewBox.baseVal.width;
    var vbheight = svgEl.viewBox.baseVal.height;

    // Record current zoom:
    var zoomFactorX = ZoomControl.zoomFactorX;
    var zoomFactorY = ZoomControl.zoomFactorY;

    // Initialise viewbox and zoom for images
    var newvbx = 0;
    var newvbwidth = width;
    var newvbheight = imageHeight;
    ZoomControl.zoomFactorX = 1;
    ZoomControl.zoomFactorY = pages;

    for (var i=0; i<pages; i++) {

        // Set viewbox location
        var newvby = i*imageHeight;

        // Update viewbox
        svgEl.setAttribute("viewBox", newvbx + " " + newvby + " " +
                           newvbwidth + " " + newvbheight);

        // Hack to ensure text looks okay
        ZoomControl.updateTextScaling();

        // Save image
        var blob = new Blob([$("#output").html()], {type: "image/svg+xml"});
        saveAs(blob, "tree_part" + i + ".svg");
    }

    // Revert to original viewbox and zoom
    svgEl.setAttribute("viewBox", vbx + " " + vby + " " +
                       vbwidth + " " + vbheight);
    ZoomControl.zoomFactorX = zoomFactorX;
    ZoomControl.zoomFactorY = zoomFactorY;
    ZoomControl.updateTextScaling();
}

// Export trees to file in Newick format
function exportNewick() {
    if (currentTreeIdx>=trees.length || currentTreeIdx<0)
        return false;

    var newickStr = trees[currentTreeIdx].getNewick() + "\n";
    var blob = new Blob([newickStr], {type: "text/plain;charset=utf-8"});
    saveAs(blob, "tree.newick");
}

// Export trees to file in NEXUS format
function exportNEXUS() {
    if (currentTreeIdx>=trees.length || currentTreeIdx<0)
        return false;

    var nexusStr = "#nexus\n\nbegin trees;\ntree tree_1 = [&R] " +
        trees[currentTreeIdx].getNewick(true) + "\n" + "end;\n";

    var blob = new Blob([nexusStr], {type: "text/plain;charset=utf-8"});
    saveAs(blob, "tree.nexus");
}

// Update display according to current tree model and display settings
function update() {

    updateCurrentTreeControl();

    updateMenuItems();

    if (trees.length === 0) {
        displayStartOutput();
        return;
    } else {
        prepareOutputForTree();
    }

    // Tree to draw
    var tree = trees[currentTreeIdx];

    // Sort tree nodes
    switch ($("#styleSort span").parent().text()) {
        case "Sorted (ascending)":
            TreeStyle.sortNodes = true;
            TreeStyle.sortNodesDescending = false;
            break;
        case "Sorted (descending)":
            TreeStyle.sortNodes = true;
            TreeStyle.sortNodesDescending = true;
            break;
        default:
            TreeStyle.sortNodes = false;
            break;
    }

    // Non-time trees can only be displayed as cladograms
    if (!tree.isTimeTree) {
        if (!itemToggledOn($("#styleLayoutCladogram"))) {
            selectListItem($("#styleLayoutCladogram"), false, false);
            displayNotification("Switching to Cladogram Layout");
        }
    }

    // Update trait selectors:
    updateTraitSelectors();

    // Determine whether colouring is required:
    TreeStyle.colourTrait = $("#styleColourTrait span").parent().text();
    if (TreeStyle.colourTrait === "None")
        TreeStyle.colourTrait = undefined;

    // Determine whether tip labels are required:
    TreeStyle.tipTextTrait = $("#styleTipTextTrait span").parent().text();
    switch (TreeStyle.tipTextTrait) {
        case "None":
            TreeStyle.tipTextTrait = undefined;
            break;
        case "Label":
            TreeStyle.tipTextTrait = "label";
            break;
        default:
            break;
    }

    // Determine whether internal node labels are required:
    TreeStyle.nodeTextTrait = $("#styleNodeTextTrait span").parent().text();
    switch (TreeStyle.nodeTextTrait) {
        case "None":
            TreeStyle.nodeTextTrait = undefined;
            break;
        case "Label":
            TreeStyle.nodeTextTrait = "label";
            break;
        default:
            break;
    }

    // Determine whether node bars are required:
    TreeStyle.nodeBarTrait = $("#styleNodeBarTrait span").parent().text();
    switch (TreeStyle.nodeBarTrait) {
        case "None":
            TreeStyle.nodeBarTrait = undefined;
            break;
        default:
            break;
    }

    // Determine whether recombinant edge labels are required:
    TreeStyle.recombTextTrait = $("#styleRecombTextTrait span").parent().text();
    switch (TreeStyle.recombTextTrait) {
        case "None":
            TreeStyle.recombTextTrait = undefined;
            break;
        case "Label":
            TreeStyle.recombTextTrait = "label";
            break;
        default:
            break;
    }

    // Determine whether edge opacities are required
    TreeStyle.edgeOpacityTrait = $("#styleEdgeOpacityTrait span").parent().text();
    switch (TreeStyle.edgeOpacityTrait) {
        case "None":
            TreeStyle.edgeOpacityTrait = undefined;
            break;
        default:
            break;
    }


    // Determine whether recomb edge opacities are required
    TreeStyle.recombOpacityTrait = $("#styleRecombOpacityTrait span").parent().text();
    switch (TreeStyle.recombOpacityTrait) {
        case "None":
            TreeStyle.recombOpacityTrait = undefined;
            break;
        default:
            break;
    }

    // Determine numeric label precision
    TreeStyle.labelPrec = $("#styleLabelPrec span").parent().data("prec");

    // Determine which kind of axis (if any) should be displayed
    if (itemToggledOn($("#styleLayoutCladogram")))
        TreeStyle.axis = false;
    else {
        switch ($("#styleAxis span").parent().text()) {
            case "Age":
                TreeStyle.axis = true;
                TreeStyle.axisForwards = false;
                break;
            case "Forwards time":
                TreeStyle.axis = true;
                TreeStyle.axisForwards = true;
                break;
            default:
                TreeStyle.axis = false;
        }
    }


    // Assign remaining style properties to TreeStyle object

    TreeStyle.logScale = !itemToggledOn($("#styleLayoutCladogram")) && itemToggledOn($("#styleLogScale"));
    TreeStyle.inlineRecomb = itemToggledOn($("#styleInlineRecomb"));
    TreeStyle.minRecombEdgeLength = itemToggledOn($("#styleMinRecombLength"));
    TreeStyle.angleText = itemToggledOn($("#styleAngleText"));

    TreeStyle.width = Math.max(window.innerWidth-5, 200);
    TreeStyle.height = Math.max(window.innerHeight-5, 200);
    TreeStyle.marginTop = 40;
    TreeStyle.marginBottom = 20;
    TreeStyle.marginLeft = 20;
    TreeStyle.marginRight = 20;

    TreeStyle.markSingletonNodes = itemToggledOn($("#styleMarkSingletons"));
    TreeStyle.displayRecomb = itemToggledOn($("#styleDisplayRecomb"));
    TreeStyle.legend = itemToggledOn($("#styleDisplayLegend"));

    // Position internal nodes
    //var layout;
    switch ($("#styleLayout span").parent().text()) {
        case "Standard Time Tree":
            layout = new StandardTreeLayout(tree);
            break;
        case "Transmission Tree":
            layout = new TransmissionTreeLayout(tree);
            break;
        case "Cladogram":
            layout = new CladogramLayout(tree);
            break;
    }

    // Display!
    $("#output").html("");
    var svg = Display.createSVG(layout);
    svg.setAttribute("id", "SVG");
    if ($("#styleAntiAlias > span").length === 0)
        svg.style.shapeRendering = "crispEdges";
    $("#output").append(svg);

    // Update bounding box (can only do this once svg is rendered).
    ZoomControl.setBBox();

    // Add log scale stretching event handler:
    function logScaleStretchHandler(event) {
        if (!event.altKey || event.shiftKey)
            return;

        event.preventDefault();

        var dir = (event.wheelDelta || -event.detail);
        if (dir>0)
            TreeStyle.logScaleRelOffset /= 1.5;
        else
            TreeStyle.logScaleRelOffset *= 1.5;
        update();
    }
    svg.addEventListener("mousewheel",
            logScaleStretchHandler); // Chrome
    svg.addEventListener("DOMMouseScroll",
            logScaleStretchHandler); // FF (!!)
}



// Keyboard event handler:
function keyPressHandler(event) {

    if (event.target !== document.body)
        return;

    if (event.altKey || event.ctrlKey)
        return;

    var eventChar = String.fromCharCode(event.charCode);

    // Presses valid at all times:

    switch (eventChar) {
        case "?":
            // Keyboard shortcut help
            $("#shortcutHelp").dialog("open");
            event.preventDefault();
            return;

        case "e":
            // Enter trees directly
            $("#fileEnter").trigger("click");
            event.preventDefault();
            return;

        case "l":
            // Load trees from file
            $("#fileLoad").trigger("click");
            event.preventDefault();
            return;

        case "r":
            // Reload:
            reloadWarning();
            loadFile();
            return;
    }

    if (trees.length === 0)
        return;

    // Presses valid only when a tree is displayed:

    switch(eventChar) {
        case "'":
            // Cycle layout:
            cycleListItem($("#styleLayout"));
            event.preventDefault();
            return;

        case "\"":
            // Cycle layout:
            reverseCycleListItem($("#styleLayout"));
            event.preventDefault();
            return;

        case "t":
            // Cycle tip text:
            cycleListItem($("#styleTipTextTrait"));
            event.preventDefault();
            return;

        case "T":
            // Reverse cycle tip text:
            reverseCycleListItem($("#styleTipTextTrait"));
            event.preventDefault();
            return;

        case "i":
            // Cycle internal node text:
            cycleListItem($("#styleNodeTextTrait"));
            event.preventDefault();
            return;

        case "I":
            // Reverse cycle internal node text:
            reverseCycleListItem($("#styleNodeTextTrait"));
            event.preventDefault();
            return;

        case "n":
            // Cycle recomb text:
            cycleListItem($("#styleRecombTextTrait"));
            event.preventDefault();
            return;

        case "N":
            // Reverse cycle recomb text:
            reverseCycleListItem($("#styleRecombTextTrait"));
            event.preventDefault();
            return;

        case "c":
            // Cycle branch colour:
            cycleListItem($("#styleColourTrait"));
            event.preventDefault();
            return;

        case "C":
            // Reverse cycle branch colour:
            reverseCycleListItem($("#styleColourTrait"));
            event.preventDefault();
            return;

        case "b":
            // Cycle node bars:
            cycleListItem($("#styleNodeBarTrait"));
            event.preventDefault();
            return;

        case "B":
            // Reverse cycle node bars:
            reverseCycleListItem($("#styleNodeBarTrait"));
            event.preventDefault();
            return;

        case "o":
            // Cycle edge opacity:
            cycleListItem($("#styleEdgeOpacityTrait"));
            event.preventDefault();
            return;

        case "O":
            // Reverse cycle edge opacity:
            reverseCycleListItem($("#styleEdgeOpacityTrait"));
            event.preventDefault();
            return;

        case "p":
            // Cycle recomb opacity:
            cycleListItem($("#styleRecombOpacityTrait"));
            event.preventDefault();
            return;

        case "P":
            // Reverse cycle recomb opacity:
            reverseCycleListItem($("#styleRecombOpacityTrait"));
            event.preventDefault();
            return;

        case "m":
            // Toggle marking of internal nodes:
            toggleItem($("#styleMarkSingletons"));
            event.preventDefault();
            return;

        case "d":
            // Toggle display of recombinant edges:
            toggleItem($("#styleDisplayRecomb"));
            event.preventDefault();
            return;

        case "w":
            // Toggle inlining of recombinant edges:
            toggleItem($("#styleInlineRecomb"));
            event.preventDefault();
            return;

        case "f":
            // Toggle inlining of recombinant edges:
            toggleItem($("#styleMinRecombLength"));
            event.preventDefault();
            return;

        case "v":
            // Toggle angled node labels:
            toggleItem($("#styleAngleText"));
            event.preventDefault();
            return;

        case "a":
            // Cycle axis display
            cycleListItem($("#styleAxis"));
            event.preventDefault();
            return;

        case "A":
            // Reverse cycle axis display
            reverseCycleListItem($("#styleAxis"));
            event.preventDefault();
            return;

        case "g":
            // Toggle legend display
            toggleItem($("#styleDisplayLegend"));
            event.preventDefault();
            return;

        case "s":
            // Toggle log scale
            toggleItem($("#styleLogScale"));
            event.preventDefault();
            return;

        case "z":
            // Reset zoom.
            ZoomControl.reset();
            event.preventDefault();
            return;

        case ".":
            // Next tree
            currentTreeInc(1, false);
            event.preventDefault();
            return;

        case ",":
            // Prev tree
            currentTreeInc(-1, false);
            event.preventDefault();
            return;

        case ">":
            // Fast-forward tree
            currentTreeInc(1, true);
            event.preventDefault();
            return;

        case "<":
            // Fast-backward tree
            currentTreeInc(-1, true);
            event.preventDefault();
            return;

        case "+":
        case "=":
            // Increase line width
            edgeWidthChange(1);
            event.preventDefault();
            return;

        case "-":
        case "_":
            // Decrease line width
            edgeWidthChange(-1);
            event.preventDefault();
            return;

        case "]":
            // Increase font size
            fontSizeChange(2);
            event.preventDefault();
            return;

        case "[":
            // Decrease font size
            fontSizeChange(-2);
            event.preventDefault();
            return;

        case "/":
            // Find nodes
            $("#nodeSearchDialog").dialog("open");
            event.preventDefault();
            return;


        default:
            break;
    }
}


