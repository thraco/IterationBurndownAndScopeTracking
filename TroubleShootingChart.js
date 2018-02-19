Ext.define('TroubleShootingChart', {
  extend: 'Rally.ui.chart.Chart',

  _haveDataToRender: function () {
    var seriesData = this.chartData.series;

    console.log('chartData', this.chartData);

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
