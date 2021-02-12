Ext.define('IterationBurndownCalculator', {
  extend: 'Rally.data.lookback.calculator.TimeSeriesCalculator',

  config: {
    completedScheduleStateNames: ['Accepted', 'Quality'],
  },

  getWorkDays: function() {
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  },

  getMetrics: function() {
    return this.config.metrics;
  },

  getSummaryMetricsConfig: function () {
    return [
      {
        as: 'InitialScope',
        f: function(seriesData, summaryMetrics) {
          var initialScope = 0;
          var index = 0;

          while(initialScope === 0 && index < seriesData.length) {
            initialScope = seriesData[index].ToDo;
            index++;
          }
          return initialScope;
        }
      },
      // I could never figure out how to get the constant value of the capacity into
      // the dataset to be used here, so this is a fallback value of zero :\
      {
        as: 'InitialCapacity',
        f: function(seriesData, summaryMetrics) {
          return 0;
        }
      }
    ];
  },

  getDerivedFieldsAfterSummary: function () {
    return [
      {
        as: 'Ideal',
        f: function(row, index, summaryMetrics, seriesData) {
          const iterationLength = seriesData.length - 1;
          const incrementAmountPerDay = summaryMetrics.InitialScope / iterationLength;

          return Math.floor(summaryMetrics.InitialScope - (incrementAmountPerDay * index));
        },
        display: 'line',
        dashStyle: 'longdash',
        zIndex: 700
      },
      // I couldn't figure out how to get the constant capacity value into the dataset
      // for calculation here, so I calculate it and override the values in the
      // _transformLumenizeDataToHighchartsSeries.
      {
        as: 'Maximum',
        f: function(row, index, summaryMetrics, seriesData) {
          return summaryMetrics.InitialCapacity;
        },
        display: 'line',
        dashStyle: 'shortdash',
        visible: false,
        zIndex: 600
      }
    ];
  },

  runCalculation: function(snapshots) {
    //TODO: Should this be checking based on the current time, or 00:00:00? I don't know.
    const tomorrow =  Ext.Date.format(new Date(new Date().getTime() + 86400000), "Y-m-d\\TH:i:s") + '.000Z';
    const weekendLength = 7 - this.getWorkDays().length;
    const dayOfWeek = Ext.Date.format(new Date(new Date().getTime()), "l"); // Day of week in long form, e.g. Friday

    /* Sets the next workday to tomorrow unless it's the end of the week, in which case it selects the next workday,
    /  based on the calculated length of the weekend. The outcome of this is that the chart will update on the last
    /  day of the week, which will not happen if the next ValidTo date is not a work day.
    /
    /  Assumes: 7-day week, sequential work week, sequential weekend, 24-hour rotation period of Earth
    */
    var nextWorkDay = tomorrow;
    if(dayOfWeek === this.getWorkDays()[this.getWorkDays().length-1]) {
        nextWorkDay = Ext.Date.format(new Date(new Date().getTime() + (weekendLength+1)*86400000), "Y-m-d\\TH:i:s") + '.000Z';
    }

    // snapshots that extend to the default date are 'current' so we should set their 'ValidTo' property to the next workday's date.
    // this prevents the Actual burndown from flatlining into the future, and forces it to only report the past and current state of things.
    Ext.Array.forEach(snapshots, function(s) {
      if(s._ValidTo === '9999-01-01T00:00:00.000Z') {
        s._ValidTo = nextWorkDay;
      }
    }, this);

    // TODO want to simply call the parent function rather than duplicating its logic below.
    //  return IterationBurndownCalculator.superclass.runCalculation(snapshots);

    var calculatorConfig = this._prepareCalculatorConfig(),
    seriesConfig = this._buildSeriesConfig(calculatorConfig);

    var calculator = this.prepareCalculator(calculatorConfig);
    calculator.addSnapshots(snapshots, this._getStartDate(snapshots), this._getEndDate(snapshots));

    return this._transformLumenizeDataToHighchartsSeries(calculator, seriesConfig);
  },

// projections aren't working the way I've intended for now, and don't have time to address so disabling.
// may want to manually implement a projection in the getDerivedFieldsAfterSummary method instead of fighting with this one.
  getProjectionsConfig: function () {
    return {
      continueWhile: function(point) {
        return point.ToDo_projection > 0;
      },
      series: [
        {field: 'ToDo'}
      ]
    };
  },

  _transformLumenizeDataToHighchartsSeries: function (calculator, seriesConfig) {
    var results = calculator.getResults();

    var seriesData = results.seriesData;
    seriesData = this._calculateMaximumBurndown(seriesData);

    var finalData = {
      series: this.lumenize.arrayOfMaps_To_HighChartsSeries(seriesData, seriesConfig),
      categories: this._buildCategoriesFromData(seriesData)
    };

    if (this.enableProjections) {
      finalData.projections = results.projections;
    }

    return finalData;
  },

  _buildSeriesConfig: function (calculatorConfig) {
    var aggregationConfig = [],
      metrics = calculatorConfig.metrics,
      derivedFieldsAfterSummary = calculatorConfig.deriveFieldsAfterSummary;

    for (var i = 0, ilength = metrics.length; i < ilength; i += 1) {
      var metric = metrics[i];
      aggregationConfig.push({
        name: metric.as || metric.field,
        type: metric.display,
        dashStyle: metric.dashStyle != null ? metric.dashStyle : "Solid",
        yAxis: metric.yAxis != null ? metric.yAxis : 0,
        visible: metric.visible != null ? metric.visible : true,
        fillOpacity: metric.fillOpacity,
        zIndex: metric.zIndex != null ? metric.zIndex : 500
      });
    }

    for (var j = 0, jlength = derivedFieldsAfterSummary.length; j < jlength; j += 1) {
      var derivedField = derivedFieldsAfterSummary[j];
      aggregationConfig.push({
        name: derivedField.as,
        type: derivedField.display,
        dashStyle: derivedField.dashStyle != null ? derivedField.dashStyle : "Solid",
        yAxis: derivedField.yAxis != null ? derivedField.yAxis : 0,
        visible: derivedField.visible != null ? derivedField.visible : true,
        fillOpacity: metric.fillOpacity,
        zIndex: derivedField.zIndex != null ? derivedField.zIndex : 500
      });
    }

    return aggregationConfig;
  },

  _calculateMaximumBurndown: function(seriesData) {
    const iterationLength = seriesData.length - 1;
    const incrementAmountPerDay = this.capacity / iterationLength;
    for(var i=0; i<seriesData.length; i++) {
      seriesData[i].Maximum = Math.floor(this.capacity - (incrementAmountPerDay * i));
    }

    return seriesData;
  }
});
