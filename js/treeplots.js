var TreePlots = (function () {
    function drawLTT(divName) {
	var data = trees[currentTreeIdx].getLineagesThroughTime();
	var trace = {
	    x: data.ages,
	    y: data.lineages,
	    mode: 'lines',
	    line: {shape: 'hv'},
	    type: 'scatter',
	}

	var layout = {
	    xaxis: {title: 'Age', autorange: 'reversed'},
	    yaxis: {title: 'Extant Lineages'},
	    margin: {
		l: 50,
		r: 10,
		b: 50,
		t: 10
	    }
	}

	Plotly.newPlot(divName, [trace], layout);
    }

    function drawSkyline(divName, epsilon) {
	var data = trees[currentTreeIdx].getLineagesThroughTime();

	if (epsilon === undefined)
	    epsilon = 0.0;

	var epsT = trees[currentTreeIdx].root.height*epsilon;

	var effectiveN = [];
	var intervalStartTimes = [];

	var accumulator = 0.0;
	intervalStartTime = 0.0;

	var nCoals = 0;

	for (var i=1; i<data.lineages.length; i++) {
	    dt = data.ages[i]-data.ages[i-1]
	    k = data.lineages[i-1]

	    accumulator += dt*k*(k-1)/2;

	    var isCoal = (data.lineages[i]<data.lineages[i-1]);

	    if (isCoal)
		nCoals += 1;

	    if (isCoal && data.ages[i]-intervalStartTime>=epsT) {
		// Coalescence event

		intervalStartTimes.push(intervalStartTime);
		effectiveN.push(accumulator/nCoals);

		intervalStartTime = data.ages[i];
		accumulator = 0.0;
		nCoals = 0;
	    }
	}

	var trace = {
	    x: intervalStartTimes,
	    y: effectiveN,
	    mode: 'lines',
	    line: {shape: 'hv'},
	    type: 'scatter',
	}

	var layout = {
	    xaxis: {title: 'Age', autorange: 'reversed'},
	    yaxis: {title: 'Effective Population Size'},
	    margin: {
		l: 50,
		r: 10,
		b: 50,
		t: 10
	    }
	}

	Plotly.newPlot(divName, [trace], layout);
    }


    return {
	drawLTT: drawLTT,
	drawSkyline: drawSkyline
    }
}) ();
