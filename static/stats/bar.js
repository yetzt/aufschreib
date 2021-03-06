function Bars() {
	var
		options = {
			type: 'bar',
			mode: 'human',
			kind: 'word',
			cat: 'all',

			bars: 'stacked',
			casesensitiv: false,
			limit: 30,
			id: 'bars_'
		};
	var
		stats,
		svg,
		sizes = {
			legendwidth: 120,
			margins: {top: 40, right: 10, bottom: 20, left: 80},
			xaxisheight: 150,
			barheight: 300,
			barwidth: 850,
			width: function () {
				return this.barwidth + this.margins.left + this.margins.right
			},
			height: function () {
				return this.barheight + this.xaxisheight + this.margins.top + this.margins.bottom
			}
		},
		bargraph = {
			catsInView: null,
			graphcontainer: null,
			yGroupMax: null,
			yStackMax: null,
			rect: null,
			x: null,
			y: null
		};

	function initBars(id, mode, kind, statshelper) {
		stats = statshelper;
		options.id = id;
		options.mode = mode;
		options.kind = kind;
		initSVG();
		linkUI();
		stats.selectActives(options, ['cat', 'kind', 'mode', 'bars']);
		stats.requestData(options, generate);
	}

	function initSVG() {
		svg = stats.initSVG(options.id, sizes.width(), sizes.height());
		var defs = svg.append("svg:defs");
		/*
		 var gradient = defs
		 .append("svg:linearGradient")
		 .attr("id", "gradient")
		 .attr("x1", "0%")
		 .attr("y1", "0%")
		 .attr("x2", "100%")
		 .attr("y2", "100%")
		 .attr("spreadMethod", "pad");

		 gradient.append("svg:stop")
		 .attr("offset", "0%")
		 .attr("stop-color", "rgba(255, 255, 255, 0.8)")
		 .attr("stop-opacity", 1);

		 gradient.append("svg:stop")
		 .attr("offset", "100%")
		 .attr("stop-color", "rgba(0, 0, 0, 0.2)")
		 .attr("stop-opacity", 1);
		 */
		var filter = defs
			.append("svg:filter")
			.attr("id", "highlight");
		filter.append("svg:feGaussianBlur")
			.attr("stdDeviation", 3)
		;
		/*
		 filter.append("svg:feOffset")
		 .attr("dx", 2)
		 .attr("dy", 2)
		 .attr("result", "offsetblur")
		 ;
		 var merge = filter.append("svg:feMerge");
		 merge.append("svg:feMergeNode");
		 merge.append("svg:feMergeNode").attr("in", "SourceGraphic");


		 var filter = defs
		 .append("svg:filter")
		 .attr("id", "blur")
		 .append("svg:feGaussianBlur")
		 .attr("stdDeviation", 5);
		 */
	}

	function linkUI() {
		d3.selectAll('.navbar-form input').on('change', change);
		d3.selectAll('#' + options.id + 'bars a').on('click', toggleBars);
		d3.select('#' + options.id + 'case a').on('click', toggleCase);
		stats.linkUIDefault(options.id);
		stats.linkUIReloads(options, ['mode', 'kind'], generate);
		stats.linkUIRegens(options, ['cat'], generate);
	}

	function toggleCase() {
		options.casesensitiv = (!options.casesensitiv);
		this.value = options.casesensitiv;
		d3.selectAll('#' + options.id + 'case li').attr('class', (options.casesensitiv ? 'active' : null));
		generate();
		stats.d3_eventCancel();
	}

	function toggleBars() {
		options.bars = d3.select(this).attr('value');
		if (options.bars === 'grouped')
			transitionGrouped();
		else if (options.bars === 'stacked')
			transitionStacked();
		stats.selectActive(options, 'bars');
		stats.d3_eventCancel();
	}

	function change() {
		if (!isNaN(this.value)) {
			options.limit = this.value;
			generate();
		}
		stats.d3_eventCancel();
	}

	function mergeCases(data) {
		var result = [];
		var entries = {};
		for (var i = 0; i < data.length; i++) {
			var name = '_' + data[i].id.toLowerCase();
			if (entries[name]) {
				entries[name].count += data[i].count;
				for (var key in data[i].counts) {
					entries[name].counts[key] = (entries[name].counts[key] || 0) + data[i].counts[key];
				}
			} else {
				entries[name] = {id: data[i].id, count: data[i].count, counts: {}};
				for (var key in data[i].counts) {
					entries[name].counts[key] = data[i].counts[key];
				}
			}
		}
		for (var key in entries)
			result.push(entries[key]);
		return result;
	}

	function generate() {
		var filterdata;
		if (!options.casesensitiv)
			filterdata = mergeCases(stats.getBaseData());
		else
			filterdata = stats.getBaseData();
		var data = [];
		for (var i = 0; i < filterdata.length; i++) {
			if (options.cat === 'all')
				data.push(filterdata[i]);
			else if (filterdata[i].counts[options.cat] > 0) {
				var cat = options.cat;
				var entry = {
					id: filterdata[i].id,
					count: filterdata[i].counts[cat],
					counts: {}
				};
				entry.counts[cat] = filterdata[i].counts[cat];
				data.push(entry);
			}
		}
		data.sort(function (a, b) {
			return b.count - a.count;
		});
		if (options.limit > 0)
			data = data.splice(0, options.limit);

		stats.setData(data);

		bargraph.catsInView = [];
		var usedcat = [];
		data.forEach(function (entry) {
			for (var key in entry.counts) {
				if (usedcat.indexOf(key) < 0) {
					usedcat.push(key);
					bargraph.catsInView.push(stats.getCatInfo(key));
				}
			}
		});

		var old = false;
		if (bargraph.graphcontainer)
			old = bargraph.graphcontainer;
		bargraph.graphcontainer = svg.append('g').style('opacity', 0);
		var graph = bargraph.graphcontainer.append('g')
			.attr('transform', 'translate(' + sizes.margins.left + ',' + sizes.margins.top + ')');
		var stack = d3.layout.stack(),
			layers = stack(
				d3.range(bargraph.catsInView.length).map(
					function (d, layernr) {
						var cat = bargraph.catsInView[d].id;
						var a = [];
						for (var i = 0; i < data.length; i++)
							a[i] = data[i].counts[cat] || 0;
						return a.map(function (y, x) {
							return {x: x, y: y, layer: layernr, total: data[x].count};
						});
					}
				)
			);
		bargraph.yGroupMax = d3.max(layers, function (layer) {
			return d3.max(layer, function (d) {
				return d.y;
			});
		});
		bargraph.yStackMax = d3.max(layers, function (layer) {
			return d3.max(layer, function (d) {
				return d.y0 + d.y;
			});
		});

		bargraph.x = d3.scale.ordinal()
			.domain(d3.range(data.length))
			.rangeRoundBands([0, sizes.barwidth], 0.08);

		bargraph.y = d3.scale.linear()
			.domain([0, bargraph.yStackMax])
			.range([sizes.barheight, 0]);

		var xAxis = d3.svg.axis()
			.scale(bargraph.x)
			.tickSize(0)
			.tickFormat(function (d, i) {
				return data[d].id;
			})
			.orient('bottom');

		var yAxis = d3.svg.axis()
			.scale(bargraph.y)
			.tickSize(sizes.barwidth)
			.orient('right');

		graph.append('g')
			.attr('class', 'xaxis')// give it a class so it can be used to select only xaxis labels below
			.attr('transform', 'translate(10,' + (sizes.barheight - 34) + ')')
			.call(xAxis)
			.call(customXAxis);

		graph.append('g')
			.attr('class', 'y axis')
			.call(yAxis)
			.call(customYAxis);

		var layer = graph.selectAll('.layer')
				.data(layers)
				.enter().append('g')
				.attr('class', 'layer')
				.style('fill', function (d, i) {
					return bargraph.catsInView[i].color;
				})
			;

		layer.selectAll('.segment')
			.data(function (d) {
				return d;
			}).enter().append('g')
			.attr('class', 'segment')
			.append('rect')
			.attr('x', function (d) {
				return bargraph.x(d.x);
			})
			.attr('y', sizes.barheight)
			.attr('width', bargraph.x.rangeBand())
			.attr('height', 0)
			.attr('title', function (d, i) {
				return 'Klasse:' + "\t\t" + bargraph.catsInView[d.layer].name + "\n" +
					'Eintrag:' + "\t\t" + data[i].id + "\n" +
					'Anzahl:' + "\t\t" + d.y + "\n" +
					(d.y === d.total ? '' : 'Insgesamt: ' + "\t" + d.total);
			});
		;

		bargraph.rect = layer.selectAll('rect');

		bargraph.rect.transition()
			.delay(function (d, i) {
				return i * 10;
			})
			.attr('y', function (d) {
				return bargraph.y(d.y0 + d.y);
			})
			.attr('height', function (d) {
				return bargraph.y(d.y0) - bargraph.y(d.y0 + d.y);
			});


		stats.legendary(graph, bargraph.catsInView, sizes.barwidth - sizes.legendwidth, 10, sizes.legendwidth);
		/*
		 for (var i = 0; i < bargraph.catsInView.length; i++) {

		 g;
		 }
		 */
		if (old) {
			bargraph.graphcontainer.style('opacity', 0).transition().duration(300).style('opacity', 1);
			old.style('opacity', 1).transition().duration(300).style('opacity', 0).each('end', function () {
				old.remove();
			});
		} else
			bargraph.graphcontainer.style('opacity', 0).transition().duration(100).style('opacity', 1);

		/*	timeout = setTimeout(function () {
		 d3.select('input[value=\'grouped\']').property('checked', true).each(change);
		 }, 2000);*/
	}

	function customXAxis(g) {
		g.selectAll('text')// select all the text elements for the xaxis
			.attr('style', 'text-anchor:end;')
			.attr('transform', function (d) {
				return 'rotate(-45)translate(' + (this.getBBox().height * -2) + ','
					+ this.getBBox().height + ')';
			});
	}

	function customYAxis(g) {
		g.selectAll("text")
			.attr("x", -4)
			.attr('style', 'text-anchor:end;')
	}

	function transitionGrouped() {
		bargraph.y.domain([0, bargraph.yGroupMax]);

		bargraph.rect.transition()
			.duration(500)
			.delay(function (d, i) {
				return i * 10;
			})
			.attr('x', function (d, i, j) {
				return bargraph.x(d.x) + bargraph.x.rangeBand() / bargraph.catsInView.length * d.layer;
			})
			.attr('width', bargraph.x.rangeBand() / bargraph.catsInView.length)
			.transition()
			.attr('y', function (d) {
				return bargraph.y(d.y);
			})
			.attr('height', function (d) {
				return sizes.barheight - bargraph.y(d.y);
			});
	}

	function transitionStacked() {
		bargraph.y.domain([0, bargraph.yStackMax]);

		bargraph.rect.transition()
			.duration(500)
			.delay(function (d, i) {
				return i * 10;
			})
			.attr('y', function (d) {
				return bargraph.y(d.y0 + d.y);
			})
			.attr('height', function (d) {
				return bargraph.y(d.y0) - bargraph.y(d.y0 + d.y);
			})
			.transition()
			.attr('x', function (d, i, j) {
				return bargraph.x(d.x);
			})
			.attr('width', bargraph.x.rangeBand());
	}

	return {
		initBars: initBars
	};
}

