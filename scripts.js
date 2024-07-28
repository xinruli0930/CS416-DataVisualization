// Load CSV files and process data
const loadData = async (date) => {
    console.log(`Loading data for: ${date}`); // Debug log
    const data = await d3.csv(`Data/${date}.csv`);
    console.log(`Data loaded: `, data); // Debug log

    // Aggregate data by country
    const aggregatedData = Array.from(d3.group(data, d => d.Country_Region), ([key, values]) => ({
        key,
        value: {
            Confirmed: d3.sum(values, d => +d.Confirmed),
            Deaths: d3.sum(values, d => +d.Deaths),
            Lat: d3.mean(values, d => +d.Lat),
            Long_: d3.mean(values, d => +d.Long_)
        }
    }));

    // Calculate total confirmed cases and deaths
    const totalConfirmed = d3.sum(data, d => +d.Confirmed);
    const totalDeaths = d3.sum(data, d => +d.Deaths);

    console.log(`Data processed for: ${date}`, { totalConfirmed, totalDeaths, aggregatedData }); // Debug log

    return { data, aggregatedData, totalConfirmed, totalDeaths };
};

// Format number with commas
const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// Display Totals
const displayTotals = (totalConfirmed, totalDeaths) => {
    console.log(`Displaying totals: ${totalConfirmed} confirmed, ${totalDeaths} deaths`); // Debug log
    d3.select("#total-confirmed").text(`Total Confirmed Cases: ${formatNumber(totalConfirmed)}`);
    d3.select("#total-deaths").text(`Total Deaths: ${formatNumber(totalDeaths)}`);
};

// Create Map
const createMap = (aggregatedData) => {
    console.log(`Creating map with data: `, aggregatedData); // Debug log
    const width = 1200, height = 800;
    const projection = d3.geoMercator().scale(200).translate([width / 2, height / 2]);
    const path = d3.geoPath().projection(projection);

    // Clear existing SVG elements
    d3.select("#map").selectAll("*").remove();

    const svg = d3.select("#map").append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("display", "block")
        .style("margin", "auto");

    // Ensure only one tooltip exists
    d3.selectAll(".tooltip").remove();

    // Create tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    d3.json("Data/world-110m.json").then(world => {
        svg.append("path")
            .datum(topojson.feature(world, world.objects.countries))
            .attr("d", path)
            .attr("fill", "#cccccc")
            .attr("stroke", "#333333");

        // Plot COVID-19 data by country
        svg.selectAll("circle")
            .data(aggregatedData)
            .enter()
            .append("circle")
            .attr("cx", d => projection([d.value.Long_, d.value.Lat])[0])
            .attr("cy", d => projection([d.value.Long_, d.value.Lat])[1])
            .attr("r", d => Math.sqrt(d.value.Confirmed) / 100)
            .attr("fill", "red")
            .on("mouseover", (event, d) => {
                tooltip.transition().duration(200).style("opacity", .9);
                tooltip.html(`${d.key}<br>Confirmed: ${formatNumber(d.value.Confirmed)}<br>Deaths: ${formatNumber(d.value.Deaths)}`)
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mousemove", (event) => {
                tooltip.style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", () => {
                tooltip.transition().duration(500).style("opacity", 0);
            });

        // Add annotations
        addAnnotations(svg, projection, aggregatedData);
    });
};

// Add Annotations Function
const addAnnotations = (svg, projection, aggregatedData) => {
    // Find the country with the highest confirmed cases
    const maxConfirmed = d3.max(aggregatedData, d => d.value.Confirmed);
    const maxCountry = aggregatedData.find(d => d.value.Confirmed === maxConfirmed);

    const annotations = [
        {
            note: { label: `Highest confirmed cases: ${maxCountry.key}`, title: "Covid-19" },
            x: projection([maxCountry.value.Long_, maxCountry.value.Lat])[0],
            y: projection([maxCountry.value.Long_, maxCountry.value.Lat])[1],
            dx: -100,  
            dy: 50,
            color: "red",
            connector: { end: "arrow" }
        }
    ];

    const makeAnnotations = d3.annotation()
        .type(d3.annotationCalloutElbow)
        .annotations(annotations);

    svg.append("g")
        .attr("class", "annotation-group")
        .call(makeAnnotations);
};

// Update Dashboard
const updateDashboard = async (date) => {
    console.log(`Updating dashboard for date: ${date}`); // Debug log
    const { aggregatedData, totalConfirmed, totalDeaths } = await loadData(date);
    displayTotals(totalConfirmed, totalDeaths);
    createMap(aggregatedData);
};

// Initialize the visualization
const init = () => {
    const dates = ["04-2020", "07-2020", "10-2020", "11-2020", "04-2021", "07-2021", "10-2021", "11-2021", "04-2022", "07-2022", "10-2022", "11-2022", "01-2023"];
    createTimeline(dates);
    updateDashboard(dates[0]); // Load initial data
};

// Create Timeline
const createTimeline = (dates) => {
    console.log(`Creating timeline with dates: `, dates); // Debug log
    const timeline = d3.select("#timeline");
    dates.forEach(date => {
        timeline.append("button")
            .text(date)
            .on("click", () => {
                console.log(`Button clicked for date: ${date}`); // Debug log
                updateDashboard(date);
            });
    });
};

init();
