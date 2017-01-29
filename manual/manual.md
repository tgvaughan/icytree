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

Once a tree is loaded, it can be explored in a variety of ways.

Panning and Zooming
-------------------

The principle method of exploration is via panning and zooming the view of the
displayed tree.  To zoom in or out, simply hover the mouse cursor over a
position of interest and scroll "up" or "down" respectively on your mouse's
scroll wheel.  To pan, simply click and drag.

Horizontal/Vertical Zooming
---------------------------

To zoom in or out in the horizontal or vertical directions only, hold down CTRL
or SHIFT while moving the scroll wheel.

Viewing Tree Edge Statistics
----------------------------

Hovering over a tree edge will cause a table to appear describing the edge.
The table will vanish when your mouse leaves he edge, but not if you hover over
the table itself.

**Note that you cannot pan or zoom if your mouse cursor is hovering over the
edge description table.**

Collapsing Clades
-----------------

Hovering over a tree edge and clicking the left mouse button will cause the
clade/sub-tree descending from that edge to be "collapsed" - i.e., drawn as
a triangle that occupies the same vertical space as a single leaf node.  This
can be useful for large trees as a means to focus attention on the bulk structure
of the tree.

The clade collapse mechanism is also applicable to networks.  However, the
concept of clade is not so easily defined in this case.  The present behaviour
is to collapse only those descendants that do not descend from recombinant
edges.

Re-rooting Trees
----------------

While for the most part IcyTree is only intended for *viewing* rather than editing
trees, it does allow users to select a new root position for the tree.  This is useful
in situations where an inference procedure has produced an unrooted tree but where the presence
of an outgroup allows the user to be certain of the true location of the root.

To re-root a tree, simply hover the mouse cursor over an edge, and click the left mouse button
while holding down the SHIFT key.  This produces a new root node exactly in the middle of the
selected edge.

Be aware that **re-rooting trees with node annotations that actually apply to immediately ancestral edges
can produce meaningless annotations**. See
[this preprint](http://biorxiv.org/content/early/2016/09/07/035360)
for more details.

The re-rooting can also be applied to networks.  However, in the case of timed
networks the lengths of the recombinant edges cannot in general be preserved
and in some circumstances may produce negative edge lengths.

Visualization style
===================

IcyTree provides a number of options for adjusting the style of visualization
presented.  These are all accessible via the Style menu, which is available once
a tree has been loaded. Each of the items in that menu are described in the
subsections below.

Node sorting
------------

The order in which child nodes appear under each parent node in the displayed
tree can be modified using the Style-&gt;"Node Sorting" menu. The default
behaviour is for child nodes to be sorted so that children possessing larger
subtrees are always positioned below (in the vertical axis of the
visualization) children with smaller subtrees.  For serially-sampled
time-trees, this gives rise to a tree that descends down the screen from left
to right. We thus refer to this kind of sorting as **descending**.

Alternatively, child nodes can be sorted in so that those possessing larger
subtrees are *above* those with smaller subtrees. This referred to in the
sorting options list as **ascending**.

Finally, child nodes can be left **unsorted**.  This leaves the ordering of the
nodes completely up to the input format.  Note that only the Newick, NEXUS and
PhyloXML formats implicitly specify an ordering, while the NeXML format does
not, so be aware that "unsorted" will always lead to an arbitrary ordering of
child nodes for NeXML trees.

Tree layouts
------------

IcyTree provides the following three tree layouts:

1. **Standard Time Tree**

    This is the layout used to draw traditional time trees and is used by default
    whenever all edge lengths are defined. Child nodes
    are evenly spaced on the vertical axis, and the vertical position of
    each parent is exactly mid-way between each child.  The horizontal
    position of each node corresponds to the time that the corresponding event
    (e.g. coalescence, speciation, sampling) occurred. 

2. **Cladogram**

    This layout uses the same vertical positioning of nodes as the time tree
    layout but positions nodes so that the distance from the left indicates the
    *rank* of each node.  The rank of any internal node is simply one more than the
    maximum rank of any of its children, while the rank of a leaf node is always
    zero.

    The cladogram layout is the only layout available to trees that do not
    have lengths defined for every edge and is automatically selected in this case.

3. **Transmission tree**

    This layout yields exactly the same horizontal node positions as as the
    standard time tree layout, but sets the vertical position of each parent to be
    identical to that of the left-most child. This allows pathogen transmission
    trees in which distinct vertical positions correspond to distinct hosts to be
    drawn.

    Note that selection of this layout disables node sorting, as in this case
    the ordering of child nodes provided by the input file is assumed to be
    significant.

Text labels
-----------

IcyTree displays Newick labels or NEXUS taxon names for leaf nodes by default.
This selection can be modified using the Style-&gt;"Tip text" menu, either by
selecting "None" to turn off tip labels entirely or by selecting one of the
other available node attributes to use in labelling the leaf nodes.

Labelling of internal nodes is off by default but can be turned on by selecting
from the available attributes listed in the Style-&gt;"Internal node text" menu.

Particularly when labelled singleton nodes (i.e. internal nodes with a single
child node) exist, internal node labels can be difficult to read.  To improve
visibility in such cases, select the Style-&gt;"Angle node label text" menu
item, which causes all text labels to be drawn at a 45 degree angle.

Edge colouring
--------------

IcyTree allows tree edges to be coloured according to the value of any of the
labels or attributes defined on the nodes. In this case, attributes are understood
to apply to the edge immediately ancestral to the node.

To use edge colouring, choose the specific attribute using the Style-&gt;"Colour
edges by" sub-menu.  When an item other than "None" is selected, edges are
coloured automatically by applying a distinct colour to each set of edges
having a distinct value for the chosen attribute.  Edges for which the chosen
attribute is undefined remain coloured black.

The specific colours used are selected by sorting the unique attribute values
(numerically if all values are numeric, lexographically otherwise) and assigned
unique colours with maximally-separated hues to make distinct attribute values
as easy to discern as possible.

Edge opacity
------------

IcyTree also allows the opacity of edges to be influenced by any label or
attribute that has numeric values that range between 0 and 1.  Just as for edge
colouring, node attributes determine the opacity of the edge immediately
ancestral to each node.

The attribute used for edge opacity can be chosen via the Style-&gt;"Edge
opacity" sub-menu. (Only compatible attributes are shown.)

Error bars
----------

Axes
----

Recombinant edges
-----------------

Searching taxa
==============

