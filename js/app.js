(function($) {
    // **Item class**: The atomic part of our Model. A model is basically a Javascript object, i.e. key-value pairs, with some helper functions to handle event triggering, persistence, etc.
    var Item = Backbone.Model.extend({
        defaults: {
            name: '',
            brand: '',
            calories: 0,
            index: -1
        }
    });

    // **List class**: A collection of `Item`s. Basically an array of Model objects with some helper functions.
    var SelectedList = Backbone.Collection.extend({
        model: Item
    });

    var SelectedListView = Backbone.View.extend({
        el: $('body'), // el attaches to existing element
        self: this,
        template: _.template($('#fooditem-template').html()),
        selectedItemsForToday: [],
        events: {
            "click button[name='addToTotal']": "selectItem",
            "click button#save": "saveData"
        },        
        initialize: function() {
            _.bindAll(this, 'render', 'getCollection', 'selectItem');
            this.collection = new SelectedList();
        },
        selectItem: function(event) {
            var currentElement = event.currentTarget;
            var $currentIndex = $(currentElement).attr("data-index");
            var e = new Item({
                name: this.collection.models[$currentIndex].get("name"),
                calories: this.collection.models[$currentIndex].get("calories"),
                index: $currentIndex
            });
            $('#selected-items', this.el).append(this.template(e.attributes));
            this.addToTotal(e);
        },
        getCollection: function() {
            return this.collection;
        },
        clearCollection: function() {
            this.collection.reset();
        },
        render: function() {
            var localStore = window.localStorage;
            var currentDay = new Date().getDay();
            var dayItemStorage = localStore.getItem(currentDay);
            if (dayItemStorage) {
                var jsonDayItemStorage = JSON.parse(dayItemStorage);
                for (var j = 0; j < jsonDayItemStorage.length; j++) {
                    var jsonItem = jsonDayItemStorage[j];
                    $('#selected-items', this.el).append(this.template(jsonItem));
                }
            }
        },
        saveData: function() {
            var todayDateIndex = new Date().getDay();
            var stringifiedObject = JSON.stringify(this.selectedItemsForToday);
            window.localStorage.setItem(todayDateIndex, stringifiedObject);
        },
        addToTotal: function(e) {
            this.selectedItemsForToday.push(e);
            self.totalView.updateDayTotal(e);
            //TODO
        }
    });

    var DailyTotalView = Backbone.View.extend({
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
            //JC self doesn't work here. why?
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

    var AppView = Backbone.View.extend({
        el: $('body'), // el attaches to existing element
        self: this,

        // `events`: Where DOM events are bound to View methods. Backbone doesn't have a separate controller to handle such bindings; it all happens in a View.
        events: {
            "click button#search": "getJSONResults",
            "click button#clear": "clearResults",
            "keypress input#search-val" : "checkAndSubmitresults"
        },

        initialize: function() {
            _.bindAll(this, 'render', 'getJSONResults', 'clearResults'); // every function that uses 'this' as the current object should be in here
            this.totalView = new DailyTotalView();
            this.selectedListView = new SelectedListView();
            self = this;
            this.selectedListView.getCollection().bind('add', this.appendItem); // collection event binder
            _(this.selectedListView.getCollection().models).each(function(item) { // in case collection is not empty
                self.appendItem(item);
                //JC why can't I update the totalView from here??
            }, this);
            this.render();
            this.totalView.render();
            this.selectedListView.render();
        },
        // `render()` now introduces a button to add a new list item.
        render: function() {
            $(this.el).append("<main id='app'><header> <h1>Health Tracker</h1> <form><input type='text' placeholder='Search' name='focus' class='search-box' id='search-val'> <button class='close-icon' type='reset'></button> <button type='button' class='appButton' id='search' > Search </button> <button class='appButton' id='save' > Save </button> <button class='appButton' id='clear' > Clear </button>  </form> </header><div id='food-options'> <h2> Food Search Results </h2> <ul id='search-results'> </ul> </div><div id='selected-food'> <h2> Selected Food Items </h2> <ul id='selected-items'> </ul> </div><div id='daily-totals'> <h2> Daily Totals </h2> <table id='totals-by-day'> </table></div> </main>");
        },
        getJSONResults: function() {
            self.clearResults();
            self.selectedListView.clearCollection();
            var e = $("#search-val").val(),
                a = "https://api.nutritionix.com/v1_1/search/" + e + "?results=0:20&fields=item_name,brand_name,item_id,nf_calories&appId=323fe4ef&appKey=9b8af06a3904049cbd7fea787d4088a6";
            $.ajax({
                method: "GET",
                url: a,
                dataType: "json",
                success: function(e) {
                    for (var a = e.hits, i = 0; i < a.length; i++) {
                        var fields = a[i].fields;
                        var item = new Item();
                        // modify item defaults

                        item.set({
                            name: fields['item_name'],
                            brandName: fields['brand_name'],
                            calories: fields['nf_calories'],
                            index: i
                        });

                        self.selectedListView.getCollection().add(item);
                        //add item to collection; view is updated via event 'add'
                    }
                },
                error: function() {
                    $("#search-results").append("<p>Couldn't get Nutritionix data. Check your internet connection or try again later.</p>");
                }
            });
        },
        checkAndSubmitresults : function(event) {
            if(event.keyCode === 13) {
                event.preventDefault();
                self.getJSONResults();
            }
        },
        clearResults: function() {
            $("#search-results").empty();
        },
        appendItem: function(item) {
            $('#search-results', this.el).append("<li class='foodItem'>  <span class='foodName'>" + item.get('name') + "</span> <span class='calorieValue'> " + item.get('calories') + " cal </span> <button name='addToTotal' class='appButton' data-index='" + item.get('index') + "'> Add </button> </li>");
        }
    });

    var appView = new AppView();
})(jQuery);