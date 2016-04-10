//Global variables
var map;
var places;
placeMarkers = ko.observableArray([]);

//Initialize the map
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 33.989474, lng: -84.537597},
        zoom: 10
    });

    var geocoder = new google.maps.Geocoder();

    geocodeAddress = function (place, geocoder) {
        geocoder.geocode({'address': place["BLOCK_ADDRESS"]}, function (results, status) {
            if (status === google.maps.GeocoderStatus.OK) {

                //Initialize markers
                function MarkerInit(place) {
                    this.title = place.title;
                    this.desc = place.description;
                    this.type = place.type;
                    this.infoWindow = new google.maps.InfoWindow();

                    function infoWindowTitle(place) {
                        return "<h3 class = 'view-text'>" + this.title + "</h4>";
                    }

                    function infoWindowContent(place) {
                        var contentString = "";
                        return contentString;
                    }

                    infoWindow = new google.maps.InfoWindow({
                        content: infoWindowTitle(place) + infoWindowContent(place),
                        maxWidth: 200
                    });

                    //Marker constructor
                    var marker = new google.maps.Marker({
                        position: results[0].geometry.location,
                        title: this.title,
                        titleContent: infoWindowTitle(place),
                        type: this.type,
                        map: map,
                        content: infoWindowContent(place),
                        infoWindow: this.infoWindow
                    });
                    

                    marker.addListener('click', function () {
                        //Close all infoWindows and stop all animations
                        for (var i in placeMarkers()) {
                            if (placeMarkers()[i]().mapMarker.infoWindow) {
                                placeMarkers()[i]().mapMarker.infoWindow.close();
                                placeMarkers()[i]().mapMarker.setAnimation(null);
                            }

                        }
                        //panTo marker
                        map.panTo(this.position);

                        //Animate marker
                        marker.setAnimation(google.maps.Animation.BOUNCE);

                        //Stop animating after 0.7 seconds
                        setTimeout(function () {
                            marker.setAnimation(null);
                        }, 700);

                        //Open current infoWindow
                        this.infoWindow.open(map, marker);
                    });
                    return marker;
                }

                map.setCenter(results[0].geometry.location);

                //Push observable placeMarker object into the global array that is accessible by listView
                for (var i = 0; i < 2; i++) {
                    var placeMarker = ko.observable({});
                    placeMarker().mapMarker = MarkerInit(places[i]);
                    placeMarker().visible = ko.observable(true);
                    placeMarker().contentVisible = ko.observable(true);
                    placeMarker().titleContent = placeMarker().mapMarker.titleContent;
                    placeMarker().content = placeMarker().mapMarker.content;
                    placeMarker().wikiContent = ko.observable("");

                    placeMarkers.push(placeMarker);
                }

            } else {
                alert('Geocode was not successful for the following reason: ' + status);
            }
        });
    };

    $.getJSON("data/Processed_Crime_Data.json", function (json) {
        places = JSON.parse(json);

        function myLoop() {
            setTimeout(function () {
                geocodeAddress(places[i], geocoder);
            }, 100);
        }
    });

    //Apply bindings after populating placeMarkers()[]
    ko.applyBindings(new viewModel(), view);
}

//Handle error in case Google map fails to load
function errorMap() {
    alert("Google Maps failed to load. Please check your Internet connection");
}

//ViewModel
var viewModel = function () {

    //Variables for search and list view visiblities
    self.searchVisible = ko.observable(true);
    self.listVisible = ko.observable(true);

    //Flip list visibility
    self.listReveal = function () {
        self.listVisible(!self.listVisible());
    };

    //Flip search visibility
    self.searchReveal = function () {
        self.searchVisible(!self.searchVisible());
    };

    function wikiInit(callback, index) {
        this.wikiMarkup = "";

        var wikiTitle = places[i].title.replace(" ", "_");

        //URL to search Wikipedia for articles from the title, and extract the introductory sections
        var wikiURL = "https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=&explaintext=&titles=" + places[i].title;

        //AJAX call to Wiki API
        $.ajax({
            type: "GET",
            dataType: "jsonp",
            url: wikiURL,

            success: function (result) {
                callback(result.query.pages[Object.keys(result.query.pages)[0]].extract, index);
            },
            //Error handling in case Wiki articles don't load
            error: function () {
                callback("Failed to retrieve info");
            }
        });
   }


    self.listContentReveal = function (markerObj) {

        //Flip the contentVisible property of each subsection on list
        markerObj.contentVisible(!markerObj.contentVisible());

        //Trigger the click even on the marker for the opened list item
        if (markerObj.contentVisible()) {
            //map.panTo(markerObj.mapMarker.position);
            //markerObj.mapMarker.infoWindow.open(map, markerObj.mapMarker);
            google.maps.event.trigger(markerObj.mapMarker, 'click');
        }
        else {
            //Close the infoWindow for closed list item
            markerObj.mapMarker.infoWindow.close();
        }
    };

    //Initialize variables used by the filter
    this.phraseToFilter = ko.observable("");

    this.allCategories = ko.observableArray([]); //All filterable items
    for (i in places) {
        if (this.allCategories.indexOf(places[i].type) < 0) {
            this.allCategories.push(places[i].type);
        }

    }

    this.categoriesToFilter = ko.observableArray(["Food"]);// Initial selection since everyone loves food

    //Set visibility of all markers to true
    this.unfilter = function () {
        for (var i = 0; i < placeMarkers().length; i++) {
            placeMarkers()[i]().visible(true);
            placeMarkers()[i]().mapMarker.setVisible(true);
        }
    };

    this.filterByPhrase = function () {
        var markerVisibility;
        for (var i = 0; i < placeMarkers().length; i++) {
            markerVisibility = true;
            //Match titles converted t lower case with search term converted to lower case. If match is null, set markerVisiblity to false
            if (placeMarkers()[i]().mapMarker.title.toLowerCase().match(this.phraseToFilter().toLowerCase()) === null) {
                markerVisibility = false;
            }
            //Set marker visibilities using markerVisibility
            placeMarkers()[i]().visible(markerVisibility);
            placeMarkers()[i]().mapMarker.setVisible(markerVisibility);
        }
    };

    this.filterByCategories = function () {
        var markerVisibility;

        //Nested loop that goes over all selected categories and all places
        for (var i = 0; i < placeMarkers().length; i++) {
            markerVisibility = false;
            for (var j in this.categoriesToFilter()) { //Turning this into a regular for loop causes an error: placeMarkers()[i] is not a function
                if (this.categoriesToFilter()[j] == placeMarkers()[i]().mapMarker.type) {
                    markerVisibility = true;
                }
                else {
                    continue;
                }
            }
            //Set marker visibilities
            placeMarkers()[i]().visible(markerVisibility);
            placeMarkers()[i]().mapMarker.setVisible(markerVisibility);
        }
    };
};



