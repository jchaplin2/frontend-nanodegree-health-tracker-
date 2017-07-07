(function($) {
    window.app = window.app || { };

    window.app.DailyTotalView = Backbone.View.extend({
        el: $('body'), // el attaches to existing element
        self: this,
        dayTotals: [0, 0, 0, 0, 0, 0, 0],
        dayNames: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],

        events: {
            "click button#clear": "clearData"
        },

        initialize: function() {
            _.bindAll(this, 'render', "updateDayTotal"); // every function that uses 'this' as the current object should be in here
            self = this;
            var sunday = 0,
                saturday = 6;
            var localStore = window.localStorage;
            for (var i = sunday; i < saturday; i++) {
                var dayItemStorage = localStore.getItem(i);
                if (dayItemStorage) {
                    var jsonDayItemStorage = JSON.parse(dayItemStorage);
                    var totalCaloriesInDay = 0;
                    for (var j = 0; j < jsonDayItemStorage.length; j++) {
                        var dayItem = jsonDayItemStorage[j];
                        totalCaloriesInDay += dayItem["calories"];
                    }
                    this.dayTotals[i] = totalCaloriesInDay;
                }
            }
        },
        updateDayTotal: function(e) {
            var todayDateIndex = new Date().getDay();
            var dateTotal = this.dayTotals[todayDateIndex];
            dateTotal += e.get("calories");
            this.dayTotals[todayDateIndex] = dateTotal;
            this.render();
        },
        clearData: function() {
            window.localStorage.clear();
        },
        render: function() {
            $("#totals-by-day").empty();
            for (var i = 0; i < this.dayTotals.length; i++) {
                $("#totals-by-day").append("<tr> <td> " + this.dayNames[i] + " </td> <td>" + this.dayTotals[i] + " cal </td> </tr>");
            }
        }
    });
})(jQuery);