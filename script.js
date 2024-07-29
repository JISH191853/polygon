let map;
let polyCoords = [];
var mapPolygon;
var mapPolygons = [];
/** map parameters */
let mapParams = {
  Options: {
    zoom: 16,
    center: { lat: 48.09041, lng: 11.65044 },
    mapTypeId: "terrain",
    styles: [
      {
        featureType: "poi",
        elementType: "labels",
        stylers: [{ visibility: "off" }]
      }
    ]
  }
};

/** polygon parameters */
let polyParams = {
  Options: {
    strokeColor: "#FF0000",
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: "#FF0000",
    fillOpacity: 0.35,
    editable: true,
    draggable: true,
    geodesic: true
  }
};

/** map initialization */
async function initMap(center, geoJson) {
  const { Map } = await google.maps.importLibrary("maps");
  var divElements = getDOMelement(["map", "doneButton", "resetButton", "saveButton"]);
  divElements[1].onclick = function () { doneBtn(); };   //done button
  divElements[2].onclick = function () { resetBtn(); };  //reset button
  divElements[3].onclick = function () { saveBtn(); };   //save button

  if (center) { mapParams.Options.center = center; }
  mapParams.Options.zoom = 16; // Ensure zoom level is always 16
  map = new google.maps.Map(divElements[0], mapParams.Options);
  map.addListener("click", function (event) {
    refreshMap(event.latLng);
  });

  if (geoJson) {
    drawGeoJson(geoJson);
  }
}


/** function to draw GeoJSON on the map */
function drawGeoJson(geoJson) {
  // Clear existing polygons and coordinates
  mapPolygons.forEach(polygon => polygon.setMap(null));
  mapPolygons = [];
  polyCoords = [];
  updateAllCoordinates();

  const geoData = typeof geoJson === "string" ? JSON.parse(geoJson) : geoJson;
  let totalLat = 0;
  let totalLng = 0;
  let totalPoints = 0;

  geoData.features.forEach((feature) => {
    if (feature.geometry && feature.geometry.coordinates) {
      const coordinates = feature.geometry.coordinates[0];
      coordinates.forEach(coord => {
        totalLat += coord[1];
        totalLng += coord[0];
        totalPoints += 1;
      });
    }
  });

  const centerLatLng = { lat: totalLat / totalPoints, lng: totalLng / totalPoints }; //finding the center
  map.setCenter(centerLatLng);
  map.setZoom(16); // Set zoom level to 16

  geoData.features.forEach((feature) => {
    const coordinates = feature.geometry.coordinates[0].map(coord => ({ lat: coord[1], lng: coord[0] }));
    const polygonOptions = {
      ...polyParams.Options,
      paths: coordinates,
      map: map
    };
    const polygon = new google.maps.Polygon(polygonOptions);
    mapPolygons.push(polygon);
    google.maps.event.addListener(polygon.getPath(), "set_at", updateAllCoordinates);
    google.maps.event.addListener(polygon.getPath(), "insert_at", updateAllCoordinates);
  });

  updateAllCoordinates();
}


/** remove a coordinate from the list */
function removeCoordinate(index) {
  polyCoords.splice(index, 1);
  refreshMap();
}

/** refresh map and draw the polygon */
function refreshMap(latLng) {
  if (latLng) { polyCoords.push(latLng); }
  if (mapPolygon) { mapPolygon.setMap(null); }

  if (polyCoords.length > 0) {
    polyParams.Options.paths = polyCoords;
    polyParams.Options.map = map;
    mapPolygon = new google.maps.Polygon(polyParams.Options);
    google.maps.event.addListener(mapPolygon.getPath(), "set_at", capturePolygonChanges);
    google.maps.event.addListener(mapPolygon.getPath(), "insert_at", capturePolygonChanges);
  }
  capturePolygonChanges();
}
  
/** save new coordinates in array and create output container */
function capturePolygonChanges() {
  const coordDiv = document.getElementById("coordinates");
  coordDiv.innerHTML = ''; // Clear previous coordinates

  if (mapPolygon.getMap()) { // check if a map was attached
    polyCoords = [];
    mapPolygon.getPath().forEach(function (point, index) {
      polyCoords.push({ lat: point.lat(), lng: point.lng() });
      coordDiv.appendChild(createCoordinatesList(point, index));
    });
  }
  //const doneButton = document.getElementById("doneButton")
  if (polyCoords.length >= 3) {
    doneButton.style.display = "block";
  } else {
    doneButton.style.display = "none";
  }
}

/** create container with all coordinates */
function createCoordinatesList(point, index) {
  var container = createDOMelement(["div", "button"]);
  container[0].textContent = "Coordinate " + (index + 1) + ": " + point.lat() + ", " + point.lng() + " ";
  container[1].textContent = "Remove";
  container[1].onclick = function () { removeCoordinate(index); };
  container[0].appendChild(container[1]);
  return container[0];
}

function doneBtn() {      
  if (mapPolygon.getMap()) {
    mapPolygon.setMap(null); // disable the map drawing
    polyParams.Options.paths = mapPolygon.getPath(); // get the current polygon path
    polyParams.Options.map = map;
    var tempPolygon = new google.maps.Polygon(polyParams.Options); // create a new polygon
    google.maps.event.addListener(tempPolygon.getPath(), "set_at", updateAllCoordinates);
    google.maps.event.addListener(tempPolygon.getPath(), "insert_at", updateAllCoordinates);
    mapPolygons.push(tempPolygon); // store the polygon in an array

    polyCoords = [];
    polyParams.Options.paths = polyCoords;
    updateAllCoordinates();
    refreshMap();
  }
}

/** function to update UI with all coordinates */
function updateAllCoordinates() {
  const areaList = document.getElementById("areaList");
  areaList.innerHTML = ""; // Clear previous coordinates

  mapPolygons.forEach((tempPolygon, index) => {
    const areaContainer = createDOMelement(["div", "span", "button", "ul"]);

    areaContainer[1].textContent = "Area " + (index + 1); // header
    areaContainer[2].textContent = "Remove Area";   // Remove button for the whole area
    areaContainer[2].onclick = function () { removeArea(index); };

    areaContainer[0].appendChild(areaContainer[1]); //span
    areaContainer[0].appendChild(areaContainer[2]); //button
    areaContainer[0].appendChild(areaContainer[3]); //ul

    tempPolygon.getPath().forEach((point, pointIndex) => {
      const listItem = createDOMelement(["li"]);
      listItem[0].textContent = "Coordinate " + (pointIndex + 1) + ": " + point.lat() + ", " + point.lng();
      areaContainer[3].appendChild(listItem[0]); // add list item to UL
    });

    areaList.appendChild(areaContainer[0]);
  });
}

/** remove an area */
function removeArea(areaIndex) {
  mapPolygons[areaIndex].setMap(null);
  mapPolygons.splice(areaIndex, 1);
  updateAllCoordinates();
}

function saveBtn() {
  const locationNameInput = document.getElementById("locationName");
  const locationName = locationNameInput.value.trim();
  if (!locationName) {
    alert("Location name is required to save the file.");
    return;
  }

  //Construct GeoJSON data
  const geoJsonData = {
    type: "FeatureCollection",
    locationName: locationName,
    features: mapPolygons.map((polygon, index) => ({
      type: "Feature",
      properties: {
        areaName: "Area " + (index + 1),
      },
      geometry: {
        type: "Polygon",
        coordinates: [polygon.getPath().getArray().map(coord => [coord.lng(), coord.lat()])]
      }
    }))
  };

  //prepare Data for Download
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(geoJsonData));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", locationName + ".geojson");
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

function resetBtn() {
  polyCoords = [];
  currentPolygonIndex = 0;
  mapPolygons.forEach(polygon => polygon.setMap(null));
  mapPolygons = [];
  refreshMap();
  updateAllCoordinates();
}

/** create a DOM element */
function createDOMelement(tags) {
  var DOMElements = [];
  tags.forEach((element) => DOMElements.push(document.createElement(element)));
  return DOMElements;
}

/** get a DOM element by ID*/
function getDOMelement(tags) {
  var DOMElements = [];
  tags.forEach((element) => DOMElements.push(document.getElementById(element)));
  return DOMElements;
}

/** handle file upload */
document.getElementById("uploadButton").addEventListener("click", function () {
  const fileInput = document.getElementById("geoJsonUpload");
  const file = fileInput.files[0];

  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const geoJson = JSON.parse(e.target.result);
      const firstFeature = geoJson.features[0];
      const center = { lat: firstFeature.geometry.coordinates[0][0][1], lng: firstFeature.geometry.coordinates[0][0][0] };
      initMap(center, geoJson);
    };
    reader.readAsText(file);
  } else {
    alert("Please select a GeoJSON file.");
  }
});

window.initMap = initMap;
