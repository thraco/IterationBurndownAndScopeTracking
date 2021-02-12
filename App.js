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
        change: {fn: this.onScopeChange, scope: this}
      }
    });

    this.onScopeChange();
  },

  onScopeChange: function() {
    var capacity = this._loadCapacity();

    capacity.load().then({
      success: this._loadChart,
      scope: this
    }).then({
      success: function() {
        // Success!
      },
      failure: function(error) {
        console.log('ERROR! '+error);
      }
    });
  },

  _loadCapacity: function() {
    return Ext.create('Rally.data.wsapi.Store', {
      model: 'UserIterationCapacity',
      fetch: ['Capacity', 'Iteration'],
      pageSize: 1000, //TODO: Figure out how to limit the query to the timebox scope
    });
  },

  _loadChart: function (capacity) {
    var scope = this.getContext().getTimeboxScope();
    var burnByCount = this.down('#byStoryPointCheckBox').getValue() === false;

    if(this.down('#burndownChart')) {
      this.remove('burndownChart');
    }

    var totalCap = 0;
    for(i=0; i<capacity.length; i++) {
      if(capacity[i].get('Iteration')._refObjectName === scope.record.data.Name) {
        var cap = capacity[i].get('Capacity');
        if(cap != null) {
          totalCap += cap;
        }
      }
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
        capacity: totalCap,
        metrics: [
          {
            as: 'ToDo',
            display: 'line',
            f: 'sum',
            field: 'TaskRemainingTotal',
            zIndex: 1000
          },
          {
            as: 'Scope',
            display: 'area',
            f: (burnByCount)? 'count' : 'sum',
            yAxis: 1,
            field: (burnByCount)? null : 'PlanEstimate',
            fillOpacity: .5,
            zIndex: 200
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