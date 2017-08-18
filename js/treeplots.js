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
        var intervalEndTimes = [];

        intervalStartTime = data.ages[0];
        var accumulator = 0.0;
        var nCoals = 0;

        for (var i=0; i<data.lineages.length-1; i++) {
            dt = data.ages[i+1]-data.ages[i]
            k = data.lineages[i]

            accumulator += dt*k*(k-1)/2;

            var dk = data.lineages[i+1] - data.lineages[i];

            var isCoal = (dk < 0);

            if (isCoal)
                nCoals += -dk;

            if (isCoal && data.ages[i+1]-intervalStartTime>=epsT) {
                // Coalescence event

                intervalEndTimes.push(data.ages[i+1]);
                effectiveN.push(accumulator/nCoals);

                intervalStartTime = data.ages[i+1];
                accumulator = 0.0;
                nCoals = 0;
            }
        }

        var trace = {
            x: Array.concat([0], intervalEndTimes),
            y: Array.concat(effectiveN, [effectiveN[effectiveN.length-1]]),
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
