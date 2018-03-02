Ext.define('Iteration_BurndownApp', {
    extend: 'Rally.app.TimeboxScopedApp',
    scopeType: 'iteration',
    _burndownChartID: 'burndownChart',

    launch: function() {
        //Write app code here
        //API Docs: https://help.rallydev.com/apps/2.1/doc/

        this.add({
          xtype: 'rallycheckboxfield',
          fieldLabel: 'Scope in Story Points',
          id: 'byStoryPointCheckBox',
          value: false,
          listeners: {
            change: {fn: this._loadChart, scope: this}
          }
        });

        this._loadChart();
    },

    onScopeChange: function() {
      this._loadChart();
    },

    _loadChart: function () {

      var scope = this.getContext().getTimeboxScope();
      var burnByCount = this.down('#byStoryPointCheckBox').getValue() === false;

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
          endDate: scope.record.data.EndDate,
          metrics: [
            {
              as: 'ToDo',
              display: 'line',
              f: 'sum',
              field: 'TaskRemainingTotal'
            },
            {
              as: 'Scope',
              display: 'area',
              f: (burnByCount)? 'count' : 'sum',
              yAxis: 1,
              field: (burnByCount)? null : 'PlanEstimate'
            }
          ]
        },
        chartConfig: this._getChartConfig(burnByCount)
      });
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
          fetch: ["TaskRemainingTotal", "PlanEstimate"]
        }
      ]
    },

    _getChartConfig: function(burnByCount) {
      var config = {
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
          }
        ],
        chart: {
          zoomType: 'xy'
        }
      }

      if(!burnByCount) {
      config.yAxis.push({title: { text: 'Story Points'}, opposite: true});
    } else {
      config.yAxis.push({title: {text: 'Story Count'}, opposite: true});
    }

      return config
    }
});
