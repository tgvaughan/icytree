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

Both PhyloXML and NeXML formats allow for annotation of nodes and edges.  Newick only
allows nodes to be given a single label (which may be interpreted as referring to the
node itself or the edge above it). BEAST (all versions) and FigTree use the comment
facility of NEXUS to embed annotations in Newick strings.
(See [here](https://code.google.com/archive/p/beast-mcmc/wikis/NexusMetacommentFormat.wiki)
for a technical description.)

IcyTree parses these annotations and makes them available
for styling the tree.

### Extended Newick

The [extended Newick format](http://dx.doi.org/10.1186/1471-2105-9-532) provides a standard
way of representing phylogenetic networks using a simple extension of the Newick format.
IcyTree can visualize rooted networks encoded using this format.  The specific visualization approach
is most suitable for timed networks (where all edge lengths represent lengths of time), but the
network topology of all rooted networks is faithfully represented.

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

