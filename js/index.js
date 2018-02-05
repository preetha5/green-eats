// Globals
const URL_RECIPE = "https://api.edamam.com/search";
const URL_CITIES = "https://developers.zomato.com/api/v2.1/cities";
const URL_RESTAURANTS = "https://developers.zomato.com/api/v2.1/search";
const URL_FLICKR = "https://api.flickr.com/services/rest?jsoncallback=?"; 
const restaurant_thumb = "images/restaurant_thumb.png";  
let queryString = '';
let start = 0;
let end = 10;
let total = 0;
let slideIndex = 1;

// BEGIN: GOOGLE AUTOCOMPLETE FOR CITIES
function initAutocomplete() {
    let input = $(".search_query");
    // Create the autocomplete object, restricting the search to geographical
    // location types.
    autocomplete = new google.maps.places.Autocomplete(
        /** @type {!HTMLInputElement} */(document.getElementById('autocomplete')),
        {types: ['geocode']});
    // When the user selects an address from the dropdown, populate the address
    // fields in the form.
    autocomplete.addListener('place_changed', fillInAddress);
}

function fillInAddress(){
    // Get the place details from the autocomplete object.
  var place = autocomplete.getPlace();
}
// Bias the autocomplete object to the user's geographical location,
      // as supplied by the browser's 'navigator.geolocation' object.
      function geolocate() {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(function(position) {
            var geolocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            var circle = new google.maps.Circle({
              center: geolocation,
              radius: position.coords.accuracy
            });
            autocomplete.setBounds(circle.getBounds());
          });
        }
      }
// END: GOOGLE AUTOCOMPLETE FOR CITIES SEARCH

//Look for restaurant image on flickr if Zomato does not give one
function getFlickrImage(name){
    console.log(name);
    let flickrQuery = {
        'method': "flickr.photos.search",
        'text': name +" "+ queryString,
        'content_type': 1,
        'sort': "relevance",
        'format': "json",
        'per_page': 5,
        "api_key": "9d50e113cdfc420d07f84a3a2da5d4ef",
        };
    $.getJSON(URL_FLICKR, flickrQuery, function(data){
        if(!data.photos.photo[0]){
            $('img[alt="'+name+'"]').attr("src", restaurant_thumb);
            return;
        }
        photoId = data.photos.photo[0].id;
        let photoQuery = {
            'method': "flickr.photos.getSizes",
            'photo_id':photoId,
            'format': "json",
            "api_key": "9d50e113cdfc420d07f84a3a2da5d4ef",
        };
        $.getJSON(URL_FLICKR, photoQuery, function(data){
            path  = (data.sizes.size[1].source)? (data.sizes.size[1].source):restaurant_thumb;
            console.log("inside flickr func "+path);
            $('img[alt="'+name+'"]').attr("src", path);
        });
    });
}

function renderRestaurant(item){
    let restaurantName = item.restaurant.name;
    let restaurantImage = (item.restaurant.thumb) ? item.restaurant.thumb : getFlickrImage(restaurantName);
    if (!restaurantImage){
        restaurantImage = restaurant_thumb;
    }
    let restaurantLocation = item.restaurant.location.address;
    let directionsLink = `https://www.google.com/maps/place/${restaurantLocation}`;
    let restaurantURL = item.restaurant.url;
    let rating = item.restaurant.user_rating.aggregate_rating;
    return `
        <li class="restaurantItem">
            <a href="${restaurantURL}" target="_blank">
                <img src="${restaurantImage}" alt="${restaurantName}" />
            </a>
            <h3>${restaurantName}</h3>
            <p>${restaurantLocation}</p>
            <p>Rating : ${rating} <a href="${directionsLink}" class="getDirections" target="_blank">Get Directions</a></p>
        </li>`;
}

function processcityCB(cityInfo){
    console.log(cityInfo);
    let total = cityInfo.location_suggestions.length;
    if(total === 0){
        $(".js-results").empty();
        $(".js-results").append(`
        <p class="noResults">No results found for "${queryString}"</p>`);
        $(".js-results").addClass('results');
        return;
    }
    let cityID = cityInfo.location_suggestions[0].id;
    let restaurantQuery = {
        'entity_type': "city",
        'entity_id': cityID,
        'cuisine': '308',
        'start': start,
        'count': 10,
        "apikey": "5e07d543a08ec1f65b9ef497e9c9e1b4",
        };
    console.log(restaurantQuery);
    $.getJSON(URL_RESTAURANTS, restaurantQuery, function(data){
        console.log(data);
        let total =  data.results_found;
        let result_start = data.results_start;
        let linkPrev =  ((start) === 0) ? 'hideLink' : '';
        let linkNext = ((result_start+10)>=total) ? 'hideLink' : '';
        let restaurants = data.restaurants.map(item => renderRestaurant(item));
        //Empty and append to the results ul
        $(".js-results").empty();
        restaurantsHtml = '<h2>Restaurants</h2>'
        restaurantsHtml += restaurants.join('');
        restaurantsHtml += `
        <div class="pageCtrl">
            <a href="#" class="btn_prev carousel-control-prev-icon ${linkPrev}" aria-label="Fetch previous 10 results"></a>
            <a href="#" class="btn_next carousel-control-next-icon ${linkNext}" aria-label="Fetch next 10 results"></a>
        </div>`;
        $(".js-results").append(restaurantsHtml);
        $(".js-results").addClass('results');
    });
}

/* Call the Zomato API with city value*/
function searchRestaurants(){
    let query = { 
        'q': queryString,
        "apikey": "5e07d543a08ec1f65b9ef497e9c9e1b4",
    };
    $.getJSON(URL_CITIES, query, processcityCB);
    }

function renderRecipes(item){
    let recipeURL = item.recipe.url;
    let recipeName = item.recipe.label;
    let recipeImage = item.recipe.image;
    let calories = Math.floor(item.recipe.calories);
    let yield = item.recipe.yield;
    let template = `
        <li class="recipeItem">
            <a href="${recipeURL}" target="_blank">
                <img src="${recipeImage}" alt="${recipeName}" />
            </a>
            <h3>${recipeName}</h3>
            <p>Calories : ${calories}, Yields : ${yield}</p>
        </li>`;
    return template;

}

function processRecipeCB(data){
    console.log(data);
    total =  data.count;
    //Return if no results found
    if(total === 0){
        $(".js-results").empty();
        $(".js-results").append(`
        <p class="noResults">No results found for "${queryString}"</p>`);
        $(".js-results").addClass('results');
        return;
    }
    let linkPrev =  (start === 0) ? 'hideLink' : '';
    let linkNext = (end>=total) ? 'hideLink' : '';
    let recipes = data.hits.map(item => renderRecipes(item));
    //Empty and append to the results ul
    $(".js-results").empty();
    recipesHtml = '<h2>Recipes</h2>';
    recipesHtml += recipes.join('');
    recipesHtml += `
    <div class="pageCtrl">
    <a href="#" class= "btn_prev carousel-control-prev-icon ${linkPrev}" aria-label="Fetch previous 10 results"></a>
    <a href="#" class="btn_next carousel-control-next-icon ${linkNext}" aria-label="Fetch next 10 results"></a>
    </div>`;
    $(".js-results").append(recipesHtml);
    $(".js-results").addClass('results');
}

/* Call the EDAMAM API with ingredients/cuisine value*/
function searchRecipes(){
    let query = { 
        'q': queryString,
        'app_id': '69992146',
        'app_key': 'c6f65fe807883f1ff2522326f432f2b4',
        'health':'vegetarian',
        'from':start,
        'to':end
    };
    $.getJSON(URL_RECIPE, query, processRecipeCB);
}

/* Handle button click to fetch previous 10 results*/
function handlePrevBtn(){
    $(".js-results").on('click', '.btn_prev', function(e){
        e.preventDefault();
        start -=10;
        end -=10;
        if ($("#cook").is(':checked')){
            //Call the Edamam API again to add 5 more results to the list
            searchRecipes();
        } else 
        if ($("#eat-out").is(':checked')){
            searchRestaurants();
        }
        $('html, body').animate({
            scrollTop: $('#results').offset().top - 20
        }, 'slow');    
    })
}

/* Handle button click to fetch next 10 results*/
function handleNextBtn(){
    $(".js-results").on('click', '.btn_next', function(e){
        e.preventDefault();
        start +=10;
        end +=10;
        if ($("#cook").is(':checked')){
            //Call the Edamam API again to add 5 more results to the list
            searchRecipes();
        } else 
        if ($("#eat-out").is(':checked')){
            searchRestaurants();
        }
        $('html, body').animate({
            scrollTop: $('#results').offset().top - 20
        }, 'slow');
    })
}

/* Take the search query and call the corresponding API based
radio button selection */
function handleSearchQuery(){
    $("#form_search").submit(function(e){
        e.preventDefault();
        //reset the fetch count for items
        start = 0;
        end = 10;
        let text = $('.search_query').val().trim();
        if ($("#cook").is(':checked')){
            //queryString  = text.replace(/\s/g,'').split(',').join(' ');
            queryString = text.split(',').join(' ');
            searchRecipes();
        } else 
        if ($("#eat-out").is(':checked')){ 
            queryString = text;
            searchRestaurants();
        }
    });
}


function handleRadioSelection(){
    $(".selection input[type='radio']").on('change', function(e){
        let val = $(this).val();
        let searchboxHTML = '';
        //remove the results section to start fresh
        $(".js-results").empty();
        $(".js-results").removeClass("results");
        if(val === 'cook'){
            searchboxHTML = `
            <input type="textarea" placeholder="ingredients, recipe name or cuisine" class="search_query" required/>
            <button type="submit"> Search </button>`;
        } else
        if(val === 'eat-out'){
            searchboxHTML = `
            <input type="text" placeholder="Type a city name" class="search_query" 
            id="autocomplete" required />
            <button type="submit"> Search </button>`;
        }
        //empty and append the search box to the DOM
        $('.searchBox').empty();
        $('.searchBox').append(searchboxHTML);
        //Call the autocomplete cities API to load
        $.getScript(`https://maps.googleapis.com/maps/api/js?key=AIzaSyDJdWQmj96Rdl3SfR85u8XNw94e2_s-Ezk&libraries=places&callback=initAutocomplete`);
    })
}

function currentSlide(n){
    showSlides(n);
}

function showSlides(n){
    let slides  = $(".slide");
    $('.slide[n]')
        .fadeOut(1000)
        .next()
        .fadeIn(1000)
        .end()
        .appendTo('#slider');
}

function renderSlider(){
    $("#slider > .slide:gt(0)").hide();
    let timer = setInterval(showSlides(0), 10000);
    $('#slider').hover(function(){
        clearInterval(timer)
    }, function (){
        timer = setInterval(showSlides, 10000);
    });

}

function handleScrollTop(){
    $('#back').click(function(e){
        e.preventDefault();
        $('html, body').animate({
            scrollTop: $('#form_search').offset().top - 20
        }, 'slow');
    })
}
function launchApp(){
    handleRadioSelection();
    handleSearchQuery();
    handleNextBtn();
    handlePrevBtn();
    handleScrollTop();   
};

$(launchApp);