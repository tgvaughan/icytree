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

    function getSkylineCorrectedLogL(data, skyline) {
        var logL = 0.0;

        var dt, k, dk, coalRate;

        var treeIntervalIdx = 0;
        var treeIntervalStartTime = 0.0;

        var S = 0;

        for (var i=0; i<skyline.intervalEndTimes.length; i++) {

            N = skyline.effectiveN[i];

            while (data.ages[treeIntervalIdx]<=skyline.intervalEndTimes[i]) {
                dt = data.ages[treeIntervalIdx] - treeIntervalStartTime;
                k = data.lineages[treeIntervalIdx];

                if (dt>0)
                    S += 1;

                treeIntervalStartTime = data.ages[treeIntervalIdx];

                coalRate = k*(k-1)/2/N;
                logL += -dt*coalRate;

                dk = data.lineages[treeIntervalIdx+1] - data.lineages[treeIntervalIdx];
                if (dk<0) {
                    logL += Math.log(coalRate); 
                }

                treeIntervalIdx += 1;
            }
        }

        var K = skyline.effectiveN.length;

        return logL - K - K*(K + 1)/(S - K - 1);
    }

    function getSkyline(data, epsT) {

        var effectiveN = [];
        var intervalEndTimes = [];

        var intervalStartTime = 0.0;
        var prevTime = 0.0;
        var accumulator = 0.0;
        var nCoals = 0;

        var nextEpsT = data.ages[data.ages.length-1];

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

        return {effectiveN: effectiveN,
                intervalEndTimes: intervalEndTimes};
    }

    function getGeneralizedSkyline(data, treeHeight) {

        var skylines = [];

        var maxLogL = -Infinity;
        var maxLogLidx = 0;

        var thisSkyline, thisLogL;

        for (i=0; i<100; i++) {
            epsT = treeHeight/100*i;

            thisSkyline = getSkyline(data, epsT);
            skylines.push(thisSkyline);
            thisLogL = getSkylineCorrectedLogL(data, thisSkyline);
            if (thisLogL > maxLogL) {
                maxLogL = thisLogL;
                maxLogLidx = i;
            }
        }

        return skylines[maxLogLidx];
    }

    function drawSkyline(divName, smooth, epsilon) {

        var tree = trees[currentTreeIdx];
        var data = tree.getLineagesThroughTime();

        // Coalescent trees have 1 lineage remaining above root node
        data.lineages.push(1);

        var skyline, epsT, i;

        if (epsilon === undefined)
            skyline = getGeneralizedSkyline(data, tree.root.height);
        else
            skyline = getSkyline(data, tree.root.height*epsilon);

        var trace = {
            x: [0].concat(skyline.intervalEndTimes),
            y: skyline.effectiveN.concat([skyline.effectiveN[skyline.effectiveN.length-1]]),
            mode: 'lines',
            line: {shape: smooth ? 'spline' : 'hv'},
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
