var pymChild = null,
    mobileThreshold = 300, //set to 500 for testing
    aspect_width = 4,
    aspect_height = 10
    ;

var $map = $('#map');

var margin = {
    top: 10,
    right: 10,
    bottom: 10,
    left: 20
};

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

/*
 * Render the graphic
 */
//check for svg
function draw_graphic(){
    if (Modernizr.svg){
        $map.empty();
        var width = $map.width();
        render(width);
        window.onresize = draw_graphic; //very important! the key to responsiveness
    }
}

function render(width) {

    var height = .6 * width;

    widthKey = 130;
    width = width - widthKey;

    var  projection = d3.geo.mercator()
        .scale(width*14)
        .center([-123.7527, 39.0082]) //long, lat
        .translate([margin.left, margin.top]);

    var path = d3.geo.path()
        .projection(projection);

    var svg = d3.select("#map").append("svg")
        .attr("width", width)
        .attr("height", height);

    //global for console
    var myObj = {};

    //format for tooltip
    var format = function(d){
        if (d) { return (d3.format("$,f"))(d) }
        else { return ""}
        }

    queue()
        .defer(d3.json, "caCountiesTopoSimple.json")
        .defer(d3.csv, "defense-bay-only.csv")
        .await(ready);

    var rateByCounty = {};

    function ready(error, ca, defense){
        //create a js object which maps county names to values
        defense.forEach(function(d) { 
            rateByCounty[d.county] = +d.value;})

        var max = d3.max(defense, function(d) { return +d.value; });

        //function to assign colors to shapes
        var color = d3.scale.threshold() //colorscale
            .domain([250000, 500000, 750000, 1000000, 1500000, 2000000])
            .range(colorbrewer.Greens[7]);

        //format for legend
        var truncate = function(d) { 
                return '$' + (d/1000000) + " m";
            };

        svg.append("path")
            .datum(topojson.feature(ca, ca.objects.subunits))
            .attr("class", "land")
            .attr("d", path);
        

        //bind geo data to the map
        svg.selectAll(".subunit")
              .data(topojson.feature(ca, ca.objects.subunits).features)
            .enter().append("path")
            .attr("class", function(d) {

                var string = d.properties.name;
                upper = string.toUpperCase();

                if (upper in rateByCounty) {
                return "subunit " + d.properties.name + " bayArea"; }
                else {
                return "subunit " + d.properties.name;
                }
            })
            .attr("d", path)
              //get color from csv call
              .style("fill", function(d){ 
                var string = d.properties.name;
                upper = string.toUpperCase();
                return color(rateByCounty[upper]);
              })
            .on("mouseover", function(d){ //tooltip
                div.transition()
                    .duration(200)
                    .style("opacity", .9);
                div.html(d.properties.fullName + "<p>" + format(rateByCounty[d.properties.name.toUpperCase()]))//warning this is an approximation
                    .style("left", (d3.event.pageX) + 10 + "px")
                    .style("top", (d3.event.pageY - 30) + "px"); 
            })
            .on("mouseout", function(d) { 
                div.transition()
                    .duration(500)
                    .style("opacity", 0.0);
            });

        //exterior border
        svg.append("path")
            .datum(topojson.mesh(ca, ca.objects.subunits, function(a, b) { return a === b;}))
            .attr("d", path)
            .attr("class", "exterior-boundary");

        //tooltip declaration
        var div = d3.select("#map").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

    //key position encoding for legend
    var y = d3.scale.linear()
        .domain([0, max]) //input data
        .range([0, .75*height]); //height of the key

    var colorBar = d3.select("#map").append("svg")
        .attr("class", "key-box")
        .attr("width", widthKey-margin.left)
        .attr("height", height)
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .append("g")
        .attr("class", "key")
        .attr("transform", "translate(" + (.25 * widthKey) + "," + margin.top * 2 + ")") //position w/in svg
        .selectAll("rect")
        .data(color.range().map(function(col) {
            var d = color.invertExtent(col);
            if (d[0] == null) d[0] = y.domain()[0];
            if (d[1] == null) d[1] = y.domain()[1];
            return d;
            console.log(d);
        }));

    //create color segments
    colorBar.enter()
        .append("rect")
            .attr("width", 40)
            .attr("y", function(d) { 
                return y(d[0]); })
            .attr("height", function(d) { 
                return y(d[1]) - y(d[0]); })
            .attr("fill", function(d) { return color(d[1]); });

    //get array of legend domain
    var colorDomain = color.domain();

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("right")
        .tickSize(40)
        .tickValues([colorDomain[1], colorDomain[3], colorDomain[5]])
        .tickFormat(truncate);

    //console.log(format(max));

    d3.select(".key")
        .call(yAxis)
        .append("text")
            .attr("class", "label")
        .attr("y", -5)
        .attr("x", 20)
        .text("Cash Value of Gear");

    //end of ready function
    }

    //send height to parent AFTER chart is built
    if (pymChild) {
        pymChild.sendHeightToParent();
    }

//end function render    
}
/*
 * NB: Use window.load instead of document.ready
 * to ensure all images have loaded
 */
$(window).load(function() {
    if (Modernizr.svg){
        pymChild = new pym.Child({
            renderCallback: draw_graphic()
        });
    }
    else { pymChild = new pym.Child();
    }
})






