Introduction
============

IcyTree is a browser-based phylognetic tree viewer intended for rapid
visualization of phylogenetic trees and networks. While originally intended for
the visualization of rooted time trees such as those inferred by Bayesian
inference packages such as BEAST and MrBayes, IcyTree can be used to visualize
any rooted tree which is provided in a supported format.

In addition, IcyTree can be used to produce visualizations of phylogenetic
networks represented using the Extended Newick format.

**Warning:** IcyTree does _not_ produce visualizations of unrooted trees, but
may still display such trees as rooted if a root is implied by the input file
format.  (For instance, Newick formatted tree files always implicitly specify a
root.) It is important not to read significance into the placement of the root
in such situations. Instead, one should use a specialised unrooted tree viewer
to view such files.

IcyTree should work well on the latest desktop versions of
[Google Chrome](http://www.google.com/chrome/browser/desktop) or
[Mozilla Firefox](http://mozilla.org/firefox).
**These are the only officially supported browsers.**  While some users
report success with web browsers such as Apple's Safari, we can't guarantee
that all features of IcyTree will work on other browsers.


Input/Output
============

This section describes the various ways of getting phylogenetic data into and
out of IcyTree.

Supported input file formats
----------------------------

IcyTree supports the following input file formats:

1. Plain Newick

    These files contain one or more plain
    [Newick tree format](https://en.wikipedia.org/wiki/Newick_format) strings.
    In this format, each edge may have a length and each node may have a single
    label. Multiple Newick tree format strings are separated by newlines.

2. NEXUS files with a trees block

    [NEXUS files](http://dx.doi.org/10.1093/sysbio/46.4.590)
    contain an optional trees block which may hold one or more trees specified
    in Newick format.

3. PhyloXML

    PhyloXML (read the [paper](http://dx.doi.org/10.1186/1471-2105-10-356)
    or visit the [web page](http://www.phyloxml.org)) is a dedicated
    phylogenetic tree format and may contain one or more trees. IcyTree skips
    any unrooted trees when loading the file.

4. NeXML

    NeXML (read the [paper](http://dx.doi.org/10.1093/sysbio/sys025) or visit
    the [web page](http://www.nexml.org)) is another dedicated tree format.
    IcyTree will skip any unrooted trees when loading the file.
    

### NEXUS Annotations

While the PhyloXML and NeXML formats allow for annotation of nodes and edges,
Newick format only allows nodes to be given a single label (which may be
interpreted as referring to the node itself or the edge above it). BEAST (all
versions) and FigTree use the comment facility of NEXUS to embed annotations in
Newick strings.  (See
[here](https://code.google.com/archive/p/beast-mcmc/wikis/NexusMetacommentFormat.wiki)
for a technical description.)

IcyTree parses these annotations and makes them available
for styling the tree.

### Extended Newick

The [extended Newick format](http://dx.doi.org/10.1186/1471-2105-9-532)
provides a standard way of representing phylogenetic networks using a simple
extension of the Newick format.  IcyTree can visualize rooted networks encoded
using this format.  The specific visualization approach is most suitable for
timed networks (where all edge lengths represent lengths of time), but the
network topology of all rooted networks is faithfully represented.

Loading trees from files
------------------------

To load one or more trees from a file, simply open the File menu and select
"Load from file". This will bring up a file selection dialog box from which
you can choose a file to load.

Alternatively, simply use a mouse to drag and drop a tree file directly onto
the IcyTree window.

Once a file has been successfully loaded, it can be reloaded by selecting
"Reload file" from the File menu. If any rerooting or clade collapsing
operations have been performed on the tree, this will return it to its original
state. Also, if the file has changed since it was originally loaded, this will
load the new version. (Unfortunately, due to a long-standing Firefox bug, this
currently only works in Google Chrome.)

Entering trees directly
-----------------------

Trees can also be entered directly into IcyTree by selecting File-&gt;"Enter
tree directly".  This will open a dialog containing a text box in which trees
can be entered using their Newick representation.  (In fact, it is possible to
enter trees using any of the supported formats, although this feature is
probably most useful for simple Newick descriptions.)

Saving images
-------------

IcyTree uses Scalable Vector Graphics (SVG) to draw trees in the browser. These
graphics can be easily exported using File-&gt;"Export tree as"-&gt;"SVG
image".  Once exported, the graphic can be loaded into vector graphics editing
programs such as [Inkscape](http://inkscape.org) or [Adobe
Illustrator](http://adobe.com/products/illustrator) for modification and
conversion into other formats such as PDF, PNG, etc.

Saving tree files
-----------------

In addition to exporting graphics, IcyTree can export trees as Newick or NEXUS
files using File-&gt;"Export tree as"-&gt;"Newick file" or File-&gt;"Export
tree as"-&gt;"NEXUS file", respectively. Note that the Newick export conforms
strictly to the (Extended) Newick format - additional node annotations will not
be included in the generated file. The NEXUS file export produces a file which
includes BEAST-style node annotations.

In the case that multiple trees are loaded, only the tree currently visible is
exported.

Exploring trees
===============



Visualization style
===================

Node sorting
------------

Tree layouts
------------

Searching taxa
==============

