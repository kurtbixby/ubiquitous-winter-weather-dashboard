const API_KEY = '3dc950d6ef571454d5a850ac774d8a03'

const oneApiBase = 'https://api.openweathermap.org/data/2.5/onecall'; // ?lat={lat}&lon={lon}&exclude={part}&appid={API key}
const geoApiBase = 'http://api.openweathermap.org/geo/1.0/direct'; // ?q={city name},{state code},{country code}&limit={limit}&appid={API key}

const WEATHER_ICON_BASE = 'http://openweathermap.org/img/wn/';

const UNIT_TYPE = 'imperial';

const SEARCH_BUTTON_ID = 'search-button';
const SEARCH_FIELD_ID = 'search-field';
const CURRENT_WEATHER_DIV_ID = 'current-weather';
const FORECAST_DIV_ID = 'future-weather'
const FORECAST_HOLDER_ID = 'forecast-holder';
const WEATHER_ID = 'weather-area';

const RECENT_SEARCH_CLASS = 'recent-city';
const RECENT_SEARCHES_DIV_ID = 'past-cities';
const CITY_STORAGE_KEY = 'recent-city-searches';
const RECENT_SEARCHES_NUMBER = 10;
let recentSearches = [];

function init() {
    recentSearches = loadCitySearches();
    createRecentSearchesSection(recentSearches);
    document.getElementById(SEARCH_BUTTON_ID).addEventListener('click', searchButtonHandler);
}

function searchButtonHandler(event) {
    event.preventDefault();

    let inputText = $('#' + SEARCH_FIELD_ID).val();
    if (inputText === '') {
        return;
    }

    searchForCity(inputText);
}

function recentSearchHandler(event) {
    let cityName = $(event.target).text();

    $('#' + SEARCH_FIELD_ID).val(cityName);

    searchForCity(cityName, true);
}

function searchForCity(inputText, isRecent = false) {
    $('#'+WEATHER_ID).show();
    getCityCoordinates(inputText)
    .then((cityData) => {
        if (!isRecent) {
            addRecentCitySearch(cityData.name);
        }
        return getWeatherData(cityData);
    })
    .then((weatherData) => {
        processCombinedWeatherData(weatherData);
    })
}

// Function abstraction for getting city data
// Allows for a possible cache down the line
function getCityCoordinates(cityName) {
    return requestCityCoordinates(cityName);
}

function requestCityCoordinates(cityName) {
    let geoCodeParams = {appid: API_KEY, q: cityName};
    let requestUrl = buildRequestUrl(geoApiBase, geoCodeParams);
    return handleRequest(requestUrl)
    .then((data) => {
        return processGeoCodeResponse(data);
    })
}

// Function abstraction for getting weather data
// Allows for a possible cache down the line
function getWeatherData(cityData) {
    return requesetWeatherData(cityData);
}

function requesetWeatherData(cityData) {
    let weatherParams = {appid: API_KEY, lat: cityData.lat, lon: cityData.lon, units: UNIT_TYPE};
    let requestUrl = buildRequestUrl(oneApiBase, weatherParams);
    return handleRequest(requestUrl)
    .then((weatherData) => {
        let combinedData = { location: cityData, weather: weatherData};
        return combinedData;
    })
}

function processCombinedWeatherData(combinedData) {
    let weatherData = combinedData.weather;
    let temp = weatherData.current.temp;
    let wind = weatherData.current.wind_speed;
    let humidity = weatherData.current.humidity;
    let uvi = weatherData.current.uvi;
    let iconName = weatherData.current.weather[0].icon;

    let currentWeather = {
        city: combinedData.location.name,
        temp: temp,
        wind: wind,
        humidity: humidity,
        uvi: uvi,
        icon: iconName,
    };

    // Clear current weather first
    buildCurrentWeather(currentWeather);

    // Clear forecast first
    let forecast = weatherData.daily.slice(1, 6);
    buildForecast(forecast);
}

function buildCurrentWeather(currentWeather) {
    let weatherElement = createCurrentWeatherElement();
    populateCurrentWeatherElement(weatherElement, currentWeather);
    $('#' + CURRENT_WEATHER_DIV_ID).html(weatherElement);
}

function createCurrentWeatherElement() {
    let holdingElement = $('<div>');
    holdingElement.append($('<h2>'));

    for (var i = 0; i < 4; i++) {
        holdingElement.append($('<p>'));
    }

    return holdingElement;
}

function populateCurrentWeatherElement(weatherElement, weatherData) {
    let title = createCurrentWeatherTitle(weatherData);
    let weatherIcon = createWeatherIcon(weatherData.icon);
    weatherElement.children('h2').text(title).append(weatherIcon);
    let subElements = weatherElement.children('p');
    $(subElements[0]).text('Temp: ' + weatherData.temp + ' F');
    $(subElements[1]).text('Wind Spd: ' + weatherData.wind + ' MPH');
    $(subElements[2]).text('Humidity: ' + weatherData.humidity + '%');
    $(subElements[3]).text('UV Index: ' + weatherData.uvi);
}

function createCurrentWeatherTitle(weatherData) {
    // Add date to the end
    return weatherData.city;
}

function buildForecast(forecastData) {
    $('#'+FORECAST_DIV_ID).show();
    $('#' + FORECAST_HOLDER_ID).html('');
    forecastData.forEach(dayForecast => {
        let dayElement = createDayForecastElement();
        let processedDay = {
            dt: dayForecast.dt,
            temp: dayForecast.temp.day,
            wind: dayForecast.wind_speed,
            humidity: dayForecast.humidity,
            icon: dayForecast.weather[0].icon,
        };
        populateDayForecastElement(dayElement.children('.card-body'), processedDay);
        $('#' + FORECAST_HOLDER_ID).append(dayElement);
    })
}

function createDayForecastElement() {
    let holdingElement = $('<div>').addClass('card');
    let bodyElement = $('<div>').addClass('card-body flex-column align-items-center bg-info rounded');
    holdingElement.append(bodyElement);

    let dateElement = $('<h3>').addClass('text-center');
    let iconElement = $('<img>').addClass('mx-auto d-block');
    let tempElement = $('<p>').addClass('text-center');
    let windElement = $('<p>').addClass('text-center');
    let humidityElement = $('<p>').addClass('text-center');
    bodyElement.append(
        dateElement, iconElement,
        tempElement, windElement, humidityElement
    );
    
    return holdingElement;
}

function populateDayForecastElement(forecastElement, weatherData) {
    console.log(weatherData);
    let dateString = moment(weatherData.dt, 'X').format('MM/DD/YYYY');
    forecastElement.children('h3').text(dateString);
    forecastElement.children('img').attr('src', getWeatherIcon(weatherData.icon));
    let subElements = forecastElement.children('p');
    $(subElements[0]).text('Temp: ' + weatherData.temp + ' F');
    $(subElements[1]).text('Wind Spd: ' + weatherData.wind + ' MPH');
    $(subElements[2]).text('Humidity: ' + weatherData.humidity + '%');
}

function kelvinToFahrenheit(kTemp) {
    let cTemp = kTemp - 273.15;
    let fTemp = ((9 * cTemp) / 5) + 32;
    return fTemp;
}

// function oneApiHandler(event) {
//     console.debug('One Api Handler');

//     let cityData = { appid: API_KEY, lat: 30.2711286, lon: -97.7436995, units: 'imperial'};
//     let requestUrl = buildRequestUrl(oneApiBase, cityData);
    
//     handleRequest(requestUrl).
//     then(data => {
//         console.log(data);
//     })
//     // fetch(requestUrl).then(response => {
//     //     console.log(response);
//     //     return response.json();
//     // }).then(data => {
//     //     console.log(data);
//     // })
// }

function handleRequest(requestUrl) {
    return fetch(requestUrl).then(response => {
        console.log(response);
        return response.json();
    })
}

function processGeoCodeResponse(responseData) {
    let cityData = responseData[0];
    let selectedData = {
        name: cityData.name,
        lat: cityData.lat,
        lon: cityData.lon,
        country: cityData.country,
        name: cityData.name,
    };
    if (cityData.hasOwnProperty('state')) {
        selectedData.state = cityData.state;
    }
    return selectedData;
}

function createWeatherIcon(iconName) {
    return $('<img>').attr('src', getWeatherIcon(iconName));
}

function getWeatherIcon(iconName) {
    // Giant switch to act as a whitelist of sorts for the icons
    switch(iconName) {
        case '01d':
        case '01n':
        case '02d':
        case '02n':
        case '03d':
        case '03n':
        case '04d':
        case '04n':
        case '09d':
        case '09n':
        case '10d':
        case '10n':
        case '04d':
        case '04n':
        case '09d':
        case '09n':
        case '10d':
        case '10n':
        case '11d':
        case '11n':
        case '13d':
        case '13n':
        case '50d':
        case '50n':
            return `${WEATHER_ICON_BASE}${iconName}@2x.png`;
        default:
            return '';
    }
}

function buildRequestUrl(baseUrl, queryParams) {
    if (Object.keys(queryParams).length < 1) {
        return baseUrl;
    }

    let finalUrl = baseUrl + '?';
    let paramsArray = Object.keys(queryParams);
    // Guaranteed to have at least one parameter due to the initial conditional
    // The first parameter doesn't lead with an &
    finalUrl = finalUrl + `${paramsArray[0]}=${queryParams[paramsArray[0]]}`;
    for (var i = 1; i < paramsArray.length; i++) {
        let key = paramsArray[i];
        finalUrl = finalUrl + `&${key}=${queryParams[key]}`;
    }

    return finalUrl;
}

function addRecentCitySearch(cityData) {
    recentSearches.unshift(cityData);
    if (recentSearches.length > RECENT_SEARCHES_NUMBER) {
        recentSearches = recentSearches.slice(0, RECENT_SEARCHES_NUMBER);
    }
    saveCitySearches(recentSearches);
    let holder = $('#'+RECENT_SEARCHES_DIV_ID);
    holder.prepend(buildRecentCityElement(cityData));
    while (holder.children().length > RECENT_SEARCHES_NUMBER) {
        holder.children(':last-child').remove();
    }
}

function createRecentSearchesSection(recentCities) {
    recentCities.forEach(city => $('#'+RECENT_SEARCHES_DIV_ID).append(buildRecentCityElement(city)));
}

function buildRecentCityElement(cityName) {
    let element = $('<button>').text(cityName).addClass('btn btn-secondary btn-lg btn-block').on('click', recentSearchHandler);
    return element;
}

function saveCitySearches(citySearches) {
    localStorage.setItem(CITY_STORAGE_KEY, JSON.stringify(citySearches));
}

function loadCitySearches() {
    let retrievedValue = localStorage.getItem(CITY_STORAGE_KEY);
    if (retrievedValue == null) {
        return [];
    } else {
        return JSON.parse(retrievedValue);
    }
}

init();