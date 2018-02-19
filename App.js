Ext.define('Iteration_BurndownApp', {
    extend: 'Rally.app.TimeboxScopedApp',
    scopeType: 'iteration',
    _burndownChartID: 'burndownChart',

    launch: function() {
        //Write app code here
        //API Docs: https://help.rallydev.com/apps/2.1/doc/
        this._loadChart(this.getContext().getTimeboxScope());
    },

    onScopeChange: function(scope) {
      this._loadChart(scope);
    },

    _loadChart: function (scope) {

      if(this.down('#burndownChart')) {
        this.remove('burndownChart');
      }

      this.add({
        xtype: 'rallychart',
        id: 'burndownChart',
        storetype: 'Rally.data.lookback.SnapshotStore',
        storeConfig: this._getStoreConfig(scope),
        calculatorType: 'IterationBurndownCalculator',
        calculatorConfig: {
          completedScheduleStateNames: ['Accepted', 'Quality'],
          startDate: scope.record.data.StartDate,
          endDate: scope.record.data.EndDate
        },
        chartConfig: this._getChartConfig()
      });

      /*var chart = Ext.ComponentQuery.query('#burndownChart')[0];

      if(chart === undefined) {

        this.add({
          xtype: 'rallychart',
          id: 'burndownChart',
          storetype: 'Rally.data.lookback.SnapshotStore',
          storeConfig: this._getStoreConfig(scope),
          calculatorType: 'IterationBurndownCalculator',
          calculatorConfig: {
            completedScheduleStateNames: ['Accepted', 'Quality'],
            startDate: scope.record.data.StartDate,
            endDate: scope.record.data.EndDate
          },
          chartConfig: this._getChartConfig()
        });
      } else {
        var config = this._getStoreConfig(scope);
        chart.setStoreConfig(config);
        chart.refresh(config);
      }*/
    },

    _getStoreConfig: function (scope) {
      return [
        {
          find: {
            "$or": [
              {"_TypeHierarchy": "HierarchicalRequirement"},
              {"_TypeHierarchy": "Defect"}
            ],
            'Iteration' : scope.record.data.ObjectID
          },
          fetch: ["TaskRemainingTotal"]
        }
      ]
    },

    _getChartConfig: function() {
      return {
        title: {
          text: 'Iteration Burndown'
        },
        xAxis: {
          tickmarkPlacement: 'on'
        },
        yAxis: [
          {
            title: {text: 'Hours'},
            min: 0
          },
          {
            title: { text: 'Number of Stories'},
            opposite: true
          }
        ],
        chart: {
          zoomtype: 'xy'
        }
      }
    }
});
