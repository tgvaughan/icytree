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
var metadataFile;
var metadataParsed;
var metadataMap;

var layout;

// Stop jqueryui dialogs from focussing first link.
$.ui.dialog.prototype._focusTabbable = $.noop;


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

        var dataTransfer = event.originalEvent.dataTransfer;

        if (dataTransfer.files.length > 0) {
            // Load from file:

            treeFile = dataTransfer.files[0];
            loadFile();

        } else if (dataTransfer.items.length > 0) {
            // Load from string:

            dataTransfer.items[0].getAsString(function(s) {
                treeData = s;
                treeFile = null;
                reloadTreeData();
            });
        }
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
    $("#statsMenu").menu().hide();
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

        case "fileURLLoad":
            $("#loadURL").dialog("open");
            break;

        case "fileAttachMetadata":
            // Clear file input (otherwise can't reload same file)
            $("#metadataInput").replaceWith($("#metadataInput").clone(true));

            // Trigger click on file input
            if (!$(this).parent().hasClass("ui-state-disabled")) {
                $("#metadataInput").trigger("click");
            }
            break;

        case "fileExportSVG":
            exportSVG();
            break;

        case "fileExportPNG":
            exportRaster("png");
            break;

        case "fileExportJPEG":
            exportRaster("jpeg");
            break;

        case "fileExportNewick":
            exportTreeFile("newick");
            break;

        case "fileExportNEXUS":
            exportTreeFile("nexus");
            break;

        case "fileExportPhyloXML":
            exportTreeFile("phyloxml");
            break;

        case "fileExportNeXML":
            exportTreeFile("nexml");
            break;

        default:
            break;
        }
    });

    $("#styleMenu").on("menuselect", function(event, ui) {
        switch(ui.item.attr("id")) {
        case "styleMarkSingletons":
        case "styleCollapseZeroLengthEdges":
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

        case "styleSaveStyle":
            $("#styleSaveDialog").dialog("open");
            var inputBox = $("#styleSaveNameInput")
            inputBox.focus();
            inputBox.select();
            break;

        case "styleClearSavedStyles":
            $("#styleClearDialog").dialog("open");
            break;

        default:
            switch(ui.item.parent().attr("id")) {
            case "styleSort":
            case "styleLayout":
            case "styleEdgeColourTrait":
            case "styleNodeColourTrait":
            case "styleTipTextTrait":
            case "styleNodeTextTrait":
            case "styleRecombTextTrait":
            case "styleNodeBarTrait":
            case "styleEdgeWidthTrait":
            case "styleRecombWidthTrait":
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

            case "stylePredefined":
                restoreNamedTreeStyle(ui.item.text());
                break;
            }

            break;
        }
    });

    $("#searchMenu").on("menuselect", function(event, ui) {
        switch(ui.item.attr("id")) {
            case "searchNodes":
                $("#nodeSearchDialog").dialog("open");
                break;

            case "searchClear":
                clearSearchHighlight();
                break;
        }
    });

    $("#statsMenu").on("menuselect", function(event, ui) {
	switch(ui.item.attr("id")) {
	case "statsLTT":
	    $("#lttDialog").dialog("open");
	    break;
	case "statsSkyline":
	    $("#skylineDialog").dialog("open");
	    break;

        case "statsTree":
            $("#treeStatsDialog").dialog("open");
            break;
	}
    });

    $("#helpMenu").on("menuselect", function(event, ui) {
        switch(ui.item.attr("id")) {
            case "helpShortcuts":
                $("#shortcutHelp").dialog("open");
                break;
            case "helpManual":
                $("#manual").dialog("open");
                break;
            case "helpExamples":
                window.open("manual/index.html#examples", "new");
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
        open: function(){$(this).parent().focus();},
        buttons: {
            Done: function() {
                treeData = $(this).find("textArea").val();
                treeFile = null;
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

    $("#metadataInput").change(function() {
        metadataFile = $("#metadataInput").prop("files")[0];
        loadMetadata();
    });

    $("#loadURL").dialog({
        autoOpen: false,
        modal: true,
        buttons: {
            Load: function() {
                loadURL($("#urlToLoad").val());
                $(this).dialog("close");
            },
            Cancel: function() {
                $(this).dialog("close");
            }}
    });


    $("#metadataImportDialog").dialog({
        autoOpen: false,
        modal: true,
        width: 600,
        open: function(){$(this).parent().focus();},
        buttons: {
            Ok: function() {
                if (metadataParsed.errors.length === 0) {
                    var labelFieldName = $("#metadataImportDialogLabelSelection select option:selected").val();
                    metadataMap = new Map();
                    metadataParsed.data.forEach((line) => {
                        metadataMap.set(line[labelFieldName], line);
                    })
                    joinMetadata(labelFieldName);
                    update();
                }

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
        open: function(){$(this).parent().focus();},
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

    $("#styleSaveDialog").dialog({
        autoOpen: false,
        modal: true,
        width: 400,
        open: function(){$(this).parent().focus();},
        buttons: {
            Ok: function() {
                saveCurrentTreeStyle($("#styleSaveNameInput").val())
                $(this).dialog("close");
            },
            Cancel: function() {
                $(this).dialog("close");
            }}
    });

    $("#styleClearDialog").dialog({
        autoOpen: false,
        modal: true,
        width: 400,
        open: function(){$(this).parent().focus();},
        buttons: {
            Clear: function() {
                clearSavedTreeStyles();
                $(this).dialog("close");
            },
            Cancel: function() {
                $(this).dialog("close");
            }}
    });


    $("#nodeSearchDialog").dialog({
        autoOpen: false,
        modal: false,
        width: 450,
        open: function(){$(this).parent().focus();},
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

                        if (!searchText)
                            return;

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
                $("#styleEdgeColourTrait").children().each(function() {
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

    $("#lttDialog").dialog({
	autoOpen: false,
	modal: true,
	width: 500,
	height: 500,
	open: function() {
	    TreePlots.drawLTT("lttPlotOutput");
	    $(this).parent().focus();
	},
	resize: function() {
	    TreePlots.drawLTT("lttPlotOutput");
	},
	buttons: {
		Info: function() {
			window.open("manual/index.html#stats", "new");
		},
	    Ok: function() {
		$(this).dialog("close");
	    }
	}
    });

    function updateSkyline() {
        var smooth = $("#smoothCheckbox").prop("checked");
        if ($("#optimizeEpsCheckbox").prop("checked"))
            TreePlots.drawSkyline("skylinePlotOutput", smooth);
        else
            TreePlots.drawSkyline("skylinePlotOutput", smooth, $("#epsSpinner").spinner("value"));
    }

    $("#skylineDialog").dialog({
	autoOpen: false,
	modal: true,
	width: 500,
	height: 500,
	open: function() {
            updateSkyline();
	    $(this).parent().focus();
	},
	resize: function() {
            updateSkyline();
	},
        buttons: {
            Info: function() {
                window.open("manual/index.html#stats", "new");
            },
            Ok: function() {
                $(this).dialog("close");
	    }
	}
    });
    $("#epsSpinner").spinner({
	start: 0.0,
	min: 0.0,
	max: 1.0,
	step: 0.01,
	stop: function() {
	    updateSkyline();
	},
	change: function() {
	    updateSkyline();
	}
    });
    $("#epsSpinner").width(60);

    $("#optimizeEpsCheckbox").on("change", function() {
        if ($("#optimizeEpsCheckbox").prop("checked"))
            $("#epsSpinner").spinner().spinner("disable");
        else
            $("#epsSpinner").spinner().spinner("enable");
                                 
        updateSkyline();
    });

    $("#smoothCheckbox").on("change", updateSkyline);

    $("#treeStatsDialog").dialog({
        autoOpen: false,
        modal: true,
        width: 400,
        open: function() {
            var tree = trees[currentTreeIdx];
            $("#leafCountValue").text(pretty(TreeStats.nLeaves(tree)));
            $("#internalCountValue").text(pretty(TreeStats.nInternalNodes(tree)));
            $("#outDeg1CountValue").text(pretty(TreeStats.nOutDegreeNodes(tree,1)));
            $("#outDeg2CountValue").text(pretty(TreeStats.nOutDegreeNodes(tree,2)));
            $("#outDeg2PlusCountValue").text(pretty(TreeStats.nOutDegreeNodes(tree,3,true)));
            $("#rootHeightValue").text(pretty(TreeStats.rootHeight(tree)));
            $("#treeLengthValue").text(pretty(TreeStats.treeLength(tree)));
            $("#cherryCountValue").text(pretty(TreeStats.cherryCount(tree)));
            $("#collessImbalanceValue").text(pretty(TreeStats.collessImbalance(tree)));
        },
        buttons: {
            Ok: function() {
                $(this).dialog("close");
            }
        }
    });

    $("#shortcutHelp").dialog({
        autoOpen: false,
        modal: true,
        width: 450,
        height: 500,
        open: function() { $(this).parent().focus(); },
        buttons: {
            Ok: function() {
                $(this).dialog("close");
            }}
    });

    $("#manual").dialog({
        autoOpen: false,
        modal: false,
        width: 450,
        height: 500,
        open: function(){$(this).parent().focus();},
        buttons: {
            Close: function() {
                $(this).dialog("close");
            },
            "Open in new window": function () {
                window.open("manual/", "new");
                $(this).dialog("close");
            }}
    });

    $("#about").dialog({
        autoOpen: false,
        modal: true,
        width: 450,
        open: function(){$(this).parent().focus();},
        buttons: {
            Ok: function() {
                $(this).dialog("close");
            }}
    });

    $("#warning").dialog({
        autoOpen: false,
        modal: true,
        width: 450,
        open: function(){$(this).parent().focus();},
        buttons: {
            "I understand": function() {
                $(this).dialog("close");
            }}
    });

    $("#FFwarning").dialog({
        autoOpen: false,
        modal: true,
        width: 450,
        open: function(){$(this).parent().focus();},
        buttons: {
            "Continue anyway": function() {
                $(this).dialog("close");
            }}
    });

    // Check for and process URL GET parameters
    if (!maybeLoadFromHrefURL())
        update();

    // Save default style:
    saveCurrentTreeStyle("Default Style", true);

    // Display warning if required functions unavailable.
    if (!browserValid()) {
        $("#warning").dialog("open");
    }
});

// Test for use of Chrome
function browserIsChrome() {
    return navigator.userAgent.toLowerCase().indexOf("chrome") > -1;
}

// Checks for URL as parameter in HREF and, if present, loads tree file from URL
// and returns true.  Otherwise returns false.
function maybeLoadFromHrefURL() {

    var href = window.location.href;
    var idx = href.indexOf("?url=");
    if (idx<0)
        return false;
    else {
        loadURL(href.substring(idx+5));
        return true;
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
    if (trees.length>0) {
        $("#styleMenu").closest("li").find("button").first().removeClass("ui-state-disabled");
        $("#searchMenu").closest("li").find("button").first().removeClass("ui-state-disabled");
        $("#statsMenu").closest("li").find("button").first().removeClass("ui-state-disabled");
        $("#fileAttachMetadata").removeClass("ui-state-disabled")
        $("#fileExport").removeClass("ui-state-disabled");
        $("#fileExportStyle").removeClass("ui-state-disabled");
        $("#fileImportStyle").removeClass("ui-state-disabled");

        if ($("#styleLayout span").parent().text() === "Transmission Tree") {
            $("#styleSort").closest("li").addClass("ui-state-disabled");
        } else {
            $("#styleSort").closest("li").removeClass("ui-state-disabled");
        }

        if (!trees[currentTreeIdx].isTimeTree || $("#styleLayout span").parent().text() === "Cladogram") {
            $("#styleAxis").closest("li").addClass("ui-state-disabled");
            $("#styleSetAxisOffset").addClass("ui-state-disabled");
            $("#styleLogScale").addClass("ui-state-disabled");
            $("#styleNodeBarTrait").closest("li").addClass("ui-state-disabled");
	    $("#statsLTT").addClass("ui-state-disabled");
	    $("#statsSkyline").addClass("ui-state-disabled");
        } else {
            $("#styleAxis").closest("li").removeClass("ui-state-disabled");
            $("#styleSetAxisOffset").removeClass("ui-state-disabled");
            $("#styleLogScale").removeClass("ui-state-disabled");
            $("#styleNodeBarTrait").closest("li").removeClass("ui-state-disabled");
	    $("#statsLTT").removeClass("ui-state-disabled");
	    $("#statsSkyline").removeClass("ui-state-disabled");
        }

        if (!trees[currentTreeIdx].isTimeTree) {
            $("#styleLayout").closest("li").addClass("ui-state-disabled");
        } else {
            $("#styleLayout").closest("li").removeClass("ui-state-disabled");
        }
    } else {
        $("#fileAttachMetadata").addClass("ui-state-disabled");
        $("#fileExport").addClass("ui-state-disabled");
        $("#fileExportStyle").removeClass("ui-state-disabled");
        $("#fileImportStyle").removeClass("ui-state-disabled");
        $("#styleMenu").closest("li").find("button").first().addClass("ui-state-disabled");
        $("#searchMenu").closest("li").find("button").first().addClass("ui-state-disabled");
        $("#statsMenu").closest("li").find("button").first().addClass("ui-state-disabled");
    }
}

// Clear search highlighting
function clearSearchHighlight() {
    var tree = trees[currentTreeIdx];

    var akey = $("#searchAnnotationKey").val();
    $.each(tree.getNodeList(), function(nidx, node) {
        delete node.annotation[akey];
    });

    var noneElement = $($("#styleEdgeColourTrait a")[0]);
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

//Load tree data from URL
function loadURL(url) {
    function displayTreeLoadingError() {
        displayError("Tree loading error",
                     "Error loading from URL '" + url + "'");
    }

    $.get(url, null, function(data) {
        treeData = data;
        reloadTreeData();
    }, "text").fail(function(jqXHR) {
        console.log(jqXHR);
        if (jqXHR.status == 404) {
            displayTreeLoadingError();
        } else {
            proxyurl = "https://cors.io/?" + url;
            $.get(proxyurl, null, function(data) {
                if (data == "nope") {
                    displayTreeLoadingError();
                } else {
                    treeData = data;
                    reloadTreeData();
                }
            }, "text").fail(function() {
                displayTreeLoadingError();
            });
        }
    });
}

//Load metadata from CSV file
function loadMetadata() {
    // 1. Read file
    var reader = new FileReader();
    reader.onload = fileLoaded;
    reader.readAsText(metadataFile);

    function fileLoaded(evt) {
        var csv = evt.target.result;

        // 2. Try parsing the CSV
        metadataParsed = Papa.parse(csv, {
            header: true,
            skipEmptyLines: true
        });

        // 3. Display the import dialog
        if (metadataParsed.errors.length > 0) {
            $("#metadataImportDialogError").show();
            $("#metadataImportDialogLabelSelection").hide();
        } else {
            $("#metadataImportDialogError").hide();
            $("#metadataImportDialogLabelSelection").show();

            var select = $("#metadataImportDialogLabelSelection select");
            metadataParsed.meta.fields.forEach((field) => {
               select.append(new Option(field, field, field === 'label'));
            });
        }
        $("#metadataImportDialog").dialog("open");
    }
}

// Display space-filling frame with big text
function displayStartOutput() {

    var output = $("#output");

    output.removeClass();
    output.addClass("start");
    output.html("");

    var marginX = 25;
    var marginY = 30;

    var imgHeight = 220;
    var imgWidth = 414;

    // Resize image if page very small
    if (window.innerWidth-imgWidth<2*marginX) {
        var newImgWidth = window.innerWidth-2*marginX;
        imgHeight = imgHeight*newImgWidth/imgWidth;
        imgWidth = newImgWidth;
    }

    if (window.innerHeight-imgHeight<2*marginY) {
        var newImgHeight = window.innerHeight-2*marginY;
        imgWidth = imgWidth*newImgHeight/imgHeight;
        imgHeight = newImgHeight;
    }

    output.append(
            $("<img/>")
            .attr("src", "images/icytree_start_flattened.svg")
            .attr("width", imgWidth)
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

function displayError(title, message) {

    var div = $("<div/>");

    div.dialog({
        dialogClass: 'error',
        title: title,
        resizable: true,
        height: "auto",
        width: 400,
        modal: true,
        buttons: {
            Continue: function() {
                $(this).dialog("close");
            }
        },
        close: function(event, ui) {
            $(this).dialog("destroy").remove();
            update();
        }
    }).html(message);
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
        return this.nodeType == 3 && this.nodeValue.trim().length>0;
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

function selectListItemByName(listSelector, elementName) {
    selectListItem($(listSelector + ">li:contains('" +
                     (elementName || "None") +
                     "')"), false, false);
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

function itemToggledOn(el) {
    return el.find("span.ui-icon-check").length>0;
}

function setToggleItem(el, value) {
    if (value) {
        if (!itemToggledOn(el))
            el.prepend($("<span/>").addClass("ui-icon ui-icon-check"));
    } else {
        if (itemToggledOn(el))
            el.find("span.ui-icon-check").remove();
    }
}

function toggleItem (el) {
    if (el.hasClass("ui-state-disabled"))
        return;

    setToggleItem(el, !itemToggledOn(el));
    displayNotification(getItemDescription(el) + ": " + (itemToggledOn(el) ? "ON" : "OFF"))
    
    update();
}


// Update submenus containing trait selectors
function updateTraitSelectors() {
    var tree = trees[currentTreeIdx];

    var elements = [$("#styleEdgeColourTrait"),
                    $("#styleNodeColourTrait"),
                    $("#styleTipTextTrait"),
                    $("#styleRecombTextTrait"),
                    $("#styleNodeTextTrait"),
                    $("#styleNodeBarTrait"),
                    $("#styleEdgeWidthTrait"),
                    $("#styleRecombWidthTrait")];

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

            case "styleEdgeWidthTrait":
                filter = function(node, trait) {
                    if (node.isHybrid() && node.isLeaf())
                        return false;
                    var nVal = Number(node.annotation[trait]);
                    return !Number.isNaN(nVal) && nVal>=0;
                };
                traitList = ["None"];
                break;

            case "styleRecombWidthTrait":
                filter = function(node, trait) {
                    if (!node.isHybrid() || !node.isLeaf())
                        return false;
                    var nVal = Number(node.annotation[trait]);
                    return !Number.isNaN(nVal) && nVal>=0;
                };
                traitList = ["None"];
                break;

            default:
                filter = function() {return true;};
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

        traitList = ["Label"].concat(tree.getTraitList(function(node) {
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
    TreeStyle.fontSize = Math.max(5, TreeStyle.fontSize + inc);
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
                displayError("Error reading tree file", e.message);
                console.log(e);
                return;
            }

            console.log("Successfully parsed " + trees.length + " trees.");
            joinMetadata()
            update();
        }, 300);
    } else {

        // Parse small data set NOW. (No loading screen.)

        try {
            trees = getTreesFromString(treeData);
        } catch (e) {
            displayError("Error reading tree file", e.message);
            console.log(e);
            return;
        }

        console.log("Successfully parsed " + trees.length + " trees.");
        joinMetadata();
        update();
    }
}


function joinMetadata(labelFieldName) {
    if (metadataMap) {
        for (var tree of trees) {
            for (var node of tree.nodeList) {
                if (!node.label) {
                    continue;
                }
                var metadata = metadataMap.get(node.label);
                if (!metadata) {
                    continue;
                }
                for (var property in metadata) {
                    if (property === labelFieldName) {
                        continue;
                    }
                    node.annotation[property] = metadata[property];
                }
            }
        }
    }
}

// Converts SVG in output element to data URI for saving
function exportSVG() {
    if (currentTreeIdx>=trees.length || currentTreeIdx<0)
        return false;

    var svgEl = $("#output > svg")[0];

    $("#output #backgroundRect").attr("x", svgEl.viewBox.baseVal.x);
    $("#output #backgroundRect").attr("y", svgEl.viewBox.baseVal.y);
    $("#output #backgroundRect").attr("width", svgEl.viewBox.baseVal.width);
    $("#output #backgroundRect").attr("height", svgEl.viewBox.baseVal.height);

    var blob = new Blob([$("#output").html()], {type: "image/svg+xml"});
    saveAs(blob, "tree.svg");

    $("#output #backgroundRect").attr("x", 0);
    $("#output #backgroundRect").attr("y", 0);
    $("#output #backgroundRect").attr("width", 0);
    $("#output #backgroundRect").attr("height", 0);
}

function triggerRasterDownload(imgURI, format) {
    var evt = new MouseEvent('click', {
        view: window,
        bubbles: false,
        cancelable: true
    });

    var a = document.createElement('a');
    a.setAttribute('download', 'tree.' + format);
    a.setAttribute('href', imgURI);
    a.setAttribute('target', '_blank');

    a.dispatchEvent(evt);
}

function exportRaster(format) {
    if (currentTreeIdx>=trees.length || currentTreeIdx<0)
        return false;

    var canvas = $("<canvas/>")[0];
    canvas.width = $("#output").width();
    canvas.height = $("#output").height();

    var ctx = canvas.getContext('2d');

    var svgEl = $("#output > svg")[0];

    $("#output #backgroundRect").attr("x", svgEl.viewBox.baseVal.x);
    $("#output #backgroundRect").attr("y", svgEl.viewBox.baseVal.y);
    $("#output #backgroundRect").attr("width", svgEl.viewBox.baseVal.width);
    $("#output #backgroundRect").attr("height", svgEl.viewBox.baseVal.height);

    var data = (new XMLSerializer()).serializeToString(svgEl);
    var DOMURL = window.URL || window.webkitURL || window;

    $("#output #backgroundRect").attr("x", 0);
    $("#output #backgroundRect").attr("y", 0);
    $("#output #backgroundRect").attr("width", 0);
    $("#output #backgroundRect").attr("height", 0);

    var img = new Image();
    var svgBlob = new Blob([data], {type: 'image/svg+xml;charset=utf-8'});
    var url = DOMURL.createObjectURL(svgBlob);

    img.onload = function () {
        ctx.drawImage(img, 0, 0);
        DOMURL.revokeObjectURL(url);

        var imgURI = canvas
        .toDataURL('image/' + format)
        .replace('image/' + format, 'image/octet-stream');

        triggerRasterDownload(imgURI, format);
    };

    img.src = url;
}

function exportTreeFile(format) {
    if (currentTreeIdx>=trees.length || currentTreeIdx<0)
        return false;

    var tree = trees[currentTreeIdx];

    format = format.toLowerCase();

    if (tree.isNetwork() && format !== "newick" && format !== "nexus") {
        displayError("Tree exporting error",
                    "Can't yet export network to " + format + "!<br>Use Newick or NEXUS.");
        return false;
    }

    var treeString, extension;

    switch (format) {
        case "newick":
            treeString = Write.newick(tree) + "\n";
            extension = "newick";
            break;

        case "nexus":
            treeString = Write.nexus(tree) + "\n";
            extension = "nexus";
            break;

        case "phyloxml":
            treeString = Write.phyloXML(tree) + "\n";
            extension = "xml";
            break;

        case "nexml":
            treeString = Write.neXML(tree) + "\n";
            extension = "xml";
            break;

        default:
            throw "Unknown tree file format for export.";
    }

    var blob = new Blob([treeString], {type: "text/plain;charset=utf-8"});
    saveAs(blob, "tree." + extension);
}

function saveCurrentTreeStyle(name, noUpdate) {

    var styleObject = {
        edgeColourTrait: TreeStyle.edgeColourTrait || "NODEF",
        nodeColourTrait: TreeStyle.nodeColourTrait || "NODEF",

        tipTextTrait: TreeStyle.tipTextTrait || "NODEF",
        nodeTextTrait: TreeStyle.nodeTextTrait || "NODEF",
        recombTextTrait: TreeStyle.recombTextTrait || "NODEF",
        labelPrec: TreeStyle.labelPrec,
        angleText: TreeStyle.angleText,

        edgeWidthTrait: TreeStyle.edgeWidthTrait || "NODEF",
        recombWidthTrait: TreeStyle.recombWidthTrait || "NODEF",

        nodeBarTrait: TreeStyle.nodeBarTrait || "NODEF",

        axis: TreeStyle.axis,
        axisOffset: TreeStyle.axisOffset,
        maxAxisTicks: TreeStyle.maxAxisTicks,

        legend: TreeStyle.legend,

        logScale: TreeStyle.logScale,
        logScaleRelOffset: TreeStyle.logScaleRelOffset,

        markSingletonNodes: TreeStyle.markSingletonNodes,
        collapseZeroLengthEdges: TreeStyle.collapseZeroLengthEdges,

        displayRecomb: TreeStyle.displayRecomb,
        inlineRecomb: TreeStyle.inlineRecomb,
        minRecombEdgeLength: TreeStyle.minRecombEdgeLength,

        lineWidth: TreeStyle.lineWidth,
        minLineWidth: TreeStyle.minLineWidth,
        fontSize: TreeStyle.fontSize,

        sortNodes: TreeStyle.sortNodes,
        sortNodesDecending: TreeStyle.sortNodesDecending
    }

    window.localStorage.setItem(name, JSON.stringify(styleObject));

    console.log("Saved named style '" + name + "'.");

    if(!noUpdate) {
        displayNotification("Saved named style '" + name + "'.");
        update();
    }
}

function restoreNamedTreeStyle(name, noUpdate) {

    var jsonString = window.localStorage.getItem(name);
    
    if (!jsonString) {
        console.error("Named style not found.");
        return;
    }

    Object.assign(TreeStyle, JSON.parse(jsonString));
    for (const prop in TreeStyle) {
        if (TreeStyle[prop] === "NODEF")
            TreeStyle[prop] = undefined;
    }

    setToggleItem($("#styleMarkSingletons"), TreeStyle.markSingletonNodes);
    setToggleItem($("#styleCollapseZeroLengthEdges"), TreeStyle.collapseZeroLengthEdges);
    setToggleItem($("#styleDisplayRecomb"), TreeStyle.displayRecomb);
    setToggleItem($("#styleInlineRecomb"), TreeStyle.inlineRecomb);
    setToggleItem($("#styleMinRecombLength"), TreeStyle.minRecombEdgeLength);
    setToggleItem($("#styleDisplayLegend"), TreeStyle.legend);
    setToggleItem($("#styleLogScale"), TreeStyle.logScale);

    selectListItemByName("#styleAxis", TreeStyle.axis);

    selectListItemByName("#styleEdgeColourTrait", TreeStyle.edgeColourTrait);
    selectListItemByName("#styleNodeColourTrait", TreeStyle.nodeColourTrait);
    
    selectListItemByName("#styleTipTextTrait", TreeStyle.tipTextTrait);
    selectListItemByName("#styleNodeTextTrait", TreeStyle.nodeTextTrait);

    selectListItemByName("#styleRecombTextTrait", TreeStyle.recombTextTrait);
    selectListItemByName("#styleEdgeWidthTrait", TreeStyle.edgeWidthTrait);
    selectListItemByName("#styleRecombWidthTrait", TreeStyle.recombWidthTrait);

    console.log("Applied named style '" + name + "'.");

    if (!noUpdate) {
        displayNotification("Applied named style '" + name + "'.");
        update();
    }
}

function clearSavedTreeStyles(noUpdate) {
    var defaultStyle = window.localStorage.getItem("Default Style");
    window.localStorage.clear();
    window.localStorage.setItem("Default Style", defaultStyle);

    if (!noUpdate)
        update();
}

function updateSavedStylesMenu() {
    var ul = $("#stylePredefined");
    ul.html("<li>Default Style</li>");

    for (var i=0; i<window.localStorage.length; i++) {
        var name = window.localStorage.key(i);
        if (name != "Default Style")
            ul.append($("<li/>").text(name));
    }

    $("#styleMenu").menu("refresh");
}

// Hacky way to cycle through named styles.
var styleCounter = 0;
function loadNextStyle() {
    var lis = $("#stylePredefined>li")
    styleCounter += 1;
    if (styleCounter>=lis.length)
        styleCounter = 0;
    
    restoreNamedTreeStyle(lis.eq(styleCounter).text());
}

function loadPreviousStyle() {
    var lis = $("#stylePredefined>li")
    styleCounter -= 1;
    if (styleCounter<0)
        styleCounter = lis.length-1;
    
    restoreNamedTreeStyle(lis.eq(styleCounter).text());
}



// Update display according to current tree model and display settings
function update() {

    // Make sure current tree file name is displayed in title
    if (trees.length === 0) {
            document.title = "IcyTree";
    } else {
        if (treeFile !== undefined && treeFile !== null)
            document.title = "IcyTree: " + treeFile.name;
        else
            document.title = "IcyTree";
    }

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

    // Determine whether edge colouring is required:
    TreeStyle.edgeColourTrait = $("#styleEdgeColourTrait span").parent().text();
    if (TreeStyle.edgeColourTrait === "None")
        TreeStyle.edgeColourTrait = undefined;

    // Determine whether node colouring is required:
    TreeStyle.nodeColourTrait = $("#styleNodeColourTrait span").parent().text();
    if (TreeStyle.nodeColourTrait === "None")
        TreeStyle.nodeColourTrait = undefined;

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
    if (TreeStyle.nodeBarTrait === "None" || itemToggledOn($("#styleLayoutCladogram")))
        TreeStyle.nodeBarTrait = undefined;

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

    // Determine whether scaled edge widths are required
    TreeStyle.edgeWidthTrait = $("#styleEdgeWidthTrait span").parent().text();
    switch (TreeStyle.edgeWidthTrait) {
        case "None":
            TreeStyle.edgeWidthTrait = undefined;
            break;
        default:
            break;
    }


    // Determine whether scaled recomb edge widths are required
    TreeStyle.recombWidthTrait = $("#styleRecombWidthTrait span").parent().text();
    switch (TreeStyle.recombWidthTrait) {
        case "None":
            TreeStyle.recombWidthTrait = undefined;
            break;
        default:
            break;
    }

    // Determine numeric label precision
    TreeStyle.labelPrec = $("#styleLabelPrec span").parent().data("prec");

    // Determine which kind of axis (if any) should be displayed
    if (itemToggledOn($("#styleLayoutCladogram")))
        TreeStyle.axis = "None";
    else {
        TreeStyle.axis = $("#styleAxis span").parent().text();
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
    TreeStyle.collapseZeroLengthEdges = itemToggledOn($("#styleCollapseZeroLengthEdges"));
    TreeStyle.displayRecomb = itemToggledOn($("#styleDisplayRecomb"));
    TreeStyle.legend = itemToggledOn($("#styleDisplayLegend"));

    // Update saved styles menu:
    updateSavedStylesMenu();

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

    if (event.altKey || event.ctrlKey || event.metaKey)
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

    case "u":
        // Load from URL
        $("#loadURL").dialog("open");
        event.preventDefault();
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
            cycleListItem($("#styleEdgeColourTrait"));
            event.preventDefault();
            return;

        case "C":
            // Reverse cycle branch colour:
            reverseCycleListItem($("#styleEdgeColourTrait"));
            event.preventDefault();
            return;

        case "k":
            // Cycle branch colour:
            cycleListItem($("#styleNodeColourTrait"));
            event.preventDefault();
            return;

        case "K":
            // Reverse cycle branch colour:
            reverseCycleListItem($("#styleNodeColourTrait"));
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
            // Cycle edge width:
            cycleListItem($("#styleEdgeWidthTrait"));
            event.preventDefault();
            return;

        case "O":
            // Reverse cycle edge width:
            reverseCycleListItem($("#styleEdgeWidthTrait"));
            event.preventDefault();
            return;

        case "p":
            // Cycle recomb edge width:
            cycleListItem($("#styleRecombWidthTrait"));
            event.preventDefault();
            return;

        case "P":
            // Reverse cycle recomb edge width:
            reverseCycleListItem($("#styleRecombWidthTrait"));
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

        case "{":
            // Load previous style
            loadPreviousStyle();
            event.preventDefault();
            return;

        case "}":
            // Load next style
            loadNextStyle();
            event.preventDefault();
            return;

        default:
            break;
    }
}


