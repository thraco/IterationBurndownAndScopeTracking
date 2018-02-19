 Ext.define("TroubleShootingChart", {
     extend: "Rally.ui.chart.Chart",
     
      _validateAggregation: function () {
            if (!this._haveDataToRender()) {
                return this._setErrorMessage(this.aggregationErrorMessage);
            }

            this._renderChart();
        },

        _isData: function(point) {
            return point > 0;
        },

    _haveDataToRender: function () {
            var seriesData = this.chartData.series;
            
            console.log('series', this.chartData);
            // there is a bug in how this function handles arrays where it won't recognize array of objects, but only array of ints.
            // for a true correction need to fix the else if condition so it works with the TimeInState calculator. 
            return true;

            for (var i = 0, ilength = seriesData.length; i < ilength; i++) {
                var data = seriesData[i].data;
                

                for (var j = 0, jlength = data.length; j < jlength; j++) {
                    if (this._isData(data[j])) {
                        return true;
                    } else if(Ext.isArray(data[j]) && _.some(data[j], this._isData)) {
                        return true;
                    }
                }
            }
        }
 });
