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

    function getSkylineLogL(data, effectiveN, intervalEndTimes) {
        var logL = 0.0;

        var dt, k, dk, coalRate;

        var treeIntervalIdx = 0;
        var treeIntervalStartTime = 0.0;

        var S = 0;

        for (var i=0; i<intervalEndTimes.length; i++) {

            N = effectiveN[i];

            while (data.ages[treeIntervalIdx]<=intervalEndTimes[i]) {
                dt = data.ages[treeIntervalIdx] - treeIntervalStartTime;
                k = data.lineages[i];

                if (dt>0)
                    S += 1;

                treeIntervalStartTime = data.ages[treeIntervalIdx];
                treeIntervalIdx += 1;

                coalRate = k*(k-1)/2/N;
                logL += -dt*coalRate;

                dk = data.lineages[i+1] - data.lineages[i];
                if (dk<0) {
                    logL += Math.log(coalRate); 
                }
            }
        }

        var K = effectiveN.length;

        return logL - K  + K*(K+1)/(S-K-1);
    }

    function drawSkyline(divName, epsilon) {
        var data = trees[currentTreeIdx].getLineagesThroughTime();

        // Coalescent trees have 1 lineage remaining above root node
        data.lineages.push(1);

        if (epsilon === undefined)
            epsilon = 0.0;

        var epsT = trees[currentTreeIdx].root.height*epsilon;

        var effectiveN = [];
        var intervalEndTimes = [];

        var intervalStartTime = 0.0;
        var prevTime = 0.0;
        var accumulator = 0.0;
        var nCoals = 0;

        for (var i=0; i<data.lineages.length; i++) {
            dt = data.ages[i]-prevTime;
            prevTime = data.ages[i];
            k = data.lineages[i];

            accumulator += dt*k*(k-1)/2;

            var dk = data.lineages[i+1] - data.lineages[i];

            var isCoal = (dk < 0);

            if (isCoal)
                nCoals += -dk;

            if (isCoal && data.ages[i]-intervalStartTime>epsT) {
                // Coalescence event

                intervalEndTimes.push(data.ages[i]);
                effectiveN.push(accumulator/nCoals);

                intervalStartTime = data.ages[i];
                accumulator = 0.0;
                nCoals = 0;
            }
        }

        console.log("logL = " + getSkylineLogL(data, effectiveN, intervalEndTimes));

        var trace = {
            x: [0].concat(intervalEndTimes),
            y: effectiveN.concat([effectiveN[effectiveN.length-1]]),
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
