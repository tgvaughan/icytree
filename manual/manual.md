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

Input/Output
============

This section describes the various ways of getting phylogenetic data into and
out of IcyTree.

Supported input file formats
----------------------------

IcyTree supports the following input file formats:

1. Plain Newick

    These files contain one or more plain Newick strings as described HERE.

2. NEXUS files with a trees block

    NEXUS files contain an optional trees block which may hold one or more
    trees specified in Newick format.

3. PhyloXML

    PhyloXML is a dedicated phylogenetic tree format and may contain one or
    more trees. Note that only rooted trees can be loaded.

4. NeXML

    Like PhyloXML, NeXML is a dedicated tree format.
    

### BEAST NEXUS Annotations

NEXUS tree logs produced by BEAST include additional node metadata. IcyTree
can read this data and use it to style the visualization.

### Extended Newick


Loading trees from files
------------------------

Entering trees directly
-----------------------

Saving images
-------------

Saving tree files
-----------------

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

