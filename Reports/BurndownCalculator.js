Ext.define('IterationBurndownCalculator', {
  extend: 'Rally.data.lookback.calculator.TimeSeriesCalculator',

  config: {
    completedScheduleStateNames: ['Accepted', 'Quality'],
  },

  getWorkDays: function() {
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
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
      }
    ]
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
        dashStyle: 'longdash'
      }
    ]
  },
  runCalculation: function(snapshots) {
    const tomorrow =  Ext.Date.format(new Date(new Date().getTime() + 86400000), "Y-m-d\\TH:i:s") + '.000Z';
    // snapthots that extend to the default date are 'current' so we should set their 'ValidTo' property to tomorrow's date.
    // this prevents the Actual burndown from flatlining into the future, and forces it to only report the past and current state of things.
    Ext.Array.forEach(snapshots, function(s) {
      if(s._ValidTo === '9999-01-01T00:00:00.000Z') {
        s._ValidTo = tomorrow;
      }
    }, this);

    // TODO want to simply call the parent function rather than duplicating its logic below.
  //  reutrn IterationBurndownCalculator.superclass.runCalculation(snapshots);

    var calculatorConfig = this._prepareCalculatorConfig(),
    seriesConfig = this._buildSeriesConfig(calculatorConfig);

    var calculator = this.prepareCalculator(calculatorConfig);
    calculator.addSnapshots(snapshots, this._getStartDate(snapshots), this._getEndDate(snapshots));

    return this._transformLumenizeDataToHighchartsSeries(calculator, seriesConfig);
  },
// projections aren't working the way I've intented for now, and don't have time to address so disabling.
// may want to manually implement a projection in the getDerivedFieldsAfterSummary method instead of fighting with this one.
  getProjectionsConfig: function () {
    return {
      continueWhile: function(point) {
        return point.ToDo_projectoin > 0;
      },
      series: [
        {field: 'ToDo'}
      ]
    }
  },

  _transformLumenizeDataToHighchartsSeries: function (calculator, seriesConfig) {
      var results = calculator.getResults();

      var seriesData = results.seriesData;

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
             dashStyle: metric.dashStyle || "Solid",
             yAxis: metric.yAxis || 0
         });
     }

     for (var j = 0, jlength = derivedFieldsAfterSummary.length; j < jlength; j += 1) {
         var derivedField = derivedFieldsAfterSummary[j];
         aggregationConfig.push({
             name: derivedField.as,
             type: derivedField.display,
             dashStyle: derivedField.dashStyle || "Solid",
             yAxis: derivedField.yAxis || 0
         });
     }

     return aggregationConfig;
 }
});
