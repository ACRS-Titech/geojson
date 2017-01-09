var apiCount = 4;
var factLayer = L.layerGroup();
var shopLayer = L.layerGroup();

var superLayer = L.layerGroup();
var tenpoLayer = L.layerGroup();

var baseMaps = {
  "OpenStreetMap": L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
  "GoogleMap": L.tileLayer('http://mt{s}.google.com/vt/x={x}&y={y}&z={z}', {
    subdomains: '013'
  })
};

var map = L.map('map', {
  worldCopyJump: true,
  layers: [baseMaps.OpenStreetMap, factLayer, shopLayer, superLayer, tenpoLayer]
}).setView([36.5841324,139.8352569], 13);

L.control.layers(baseMaps, {
  'Food Shop': factLayer,
  'Crop Shop': shopLayer,
  'Hyper Market': superLayer,
  'Cured Product': tenpoLayer
}).addTo(map);

//更新youbike資料
var refresh = L.control({
  position: 'topleft'
});
refresh.onAdd = function(map) {
  var controlDiv = L.DomUtil.create('div', 'leaflet-bar');
  L.DomEvent
    .addListener(controlDiv, 'click', L.DomEvent.stopPropagation)
    .addListener(controlDiv, 'click', L.DomEvent.preventDefault)
    .addListener(controlDiv, 'click', function() {
      if (!this.querySelector('i').classList.contains('fa-spin')) {
        apiCount = 4;
        getBikeJsons();
      }
    });

  var controlUI = L.DomUtil.create('a', '', controlDiv);
  controlUI.id = 'shopRefresh';
  controlUI.title = 'Updating';
  controlUI.href = '#';
  controlUI.style.fontSize = '18px';
  controlUI.style.lineHeight = '26px';
  controlUI.style.textAlign = 'center';
  controlUI.innerHTML = '<i class="fa fa-refresh"></i>'

  return controlDiv;
};
refresh.addTo(map);

//legend
var legend = L.control({
  position: 'bottomright'
});
legend.onAdd = function(map) {
  var div = L.DomUtil.create('div', 'legend'),
    // change the names if necessary
    grades = ['Fact','Shop','Super','Tempo'];
    // change the icon path if necessary
    labels = ['insyoukuten.png','nosanbutsu.png','ryohanten.png','syokuhinkakou.png']

  // loop through our density intervals and generate a label with a colored square for each interval
  for (var i = 0; i < grades.length; i++) {
    div.innerHTML += grades[i] + (" <img src=" + labels[i] + " height = '30' width = '30'>") +'<br>'
  }
  return div;
};
legend.addTo(map);

//geolocation
var geolocation = L.control({
  position: 'topleft'
});
geolocation.onAdd = function(map) {
  var controlDiv = L.DomUtil.create('div', 'leaflet-bar');
  L.DomEvent
    .addListener(controlDiv, 'click', L.DomEvent.stopPropagation)
    .addListener(controlDiv, 'click', L.DomEvent.preventDefault)
    .addListener(controlDiv, 'click', function() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
          map.setView([position.coords.latitude, position.coords.longitude], 12);
        });
      } else {
        alert("Geolocation is not supported by this browser.");
      }
    });

  var controlUI = L.DomUtil.create('a', '', controlDiv);
  controlUI.title = 'Current Location';
  controlUI.href = '#';
  controlUI.style.fontSize = '18px';
  controlUI.style.lineHeight = '26px';
  controlUI.style.textAlign = 'center';
  controlUI.innerHTML = '<i class="fa fa-location-arrow"></i>'

  return controlDiv;
};
geolocation.addTo(map);

getShopJsons();

function getShopJsons() {
  $('#shopRefresh i').addClass('fa-spin');

  var foodData = new L.geoJson();

  //food shop
  factLayer.clearLayers();
  $.ajax({
    url: 'fact.geojson',
    async: true,
    dataType: "json"
    success: funciton(data){
      $(data.features).each(function(key, data) {
        foodData.addData(data);
      });
    }
  }).done(function(json) {
    if (json.retVal) {
      var retVal = json.retVal;
      bikeApiFormat1(factLayer, retVal);
    }
  }).error(function() {
    alert("Unable to load Food Shop Information, please try again later!");
  }).always(function() {
    checkAllFinish();
  });;


  //new taipei
  shopLayer.clearLayers();
  var shop = $.ajax({
    url: 'https://crossorigin.me/http://data.ntpc.gov.tw/api/v1/rest/datastore/382000000A-000352-001',
    async: true,
    dataType: "json"
  }).done(function(json) {
    if (json.result && json.result.records) {
      var retVal = json.result.records;
      bikeApiFormat1(shopLayer, retVal);
    }
  }).error(function() {
    alert("Unable to load Crop Shop Information, please try again later!");
  }).always(function() {
    checkAllFinish();
  });;

  superLayer.clearLayers();
  var hyper = $.ajax({
    url: 'http://www.c-bike.com.tw/xml/stationlistopendata.aspx',
    async: true,
    dataType: "xml"
  }).done(function(xml) {
    bikeApiFormat2(superLayer, $("Station", xml));
  }).error(function() {
    alert("Unable to load Cured Product Information, please try again later!");
  }).always(function() {
    checkAllFinish();
  });;

  tenpoLayer.clearLayers();
  var pbike = $.ajax({
    url: 'http://lamperder.herokuapp.com/P-Bike.php',
    async: true,
    dataType: "json"
  }).done(function(json) {
    if (json.datas) {
      var totalData = json.datas.content.split('*');
      var coordinates = json.datas.coordinate.split('*');

      totalData.forEach(function(data, index) {
        var latlng = coordinates[index].split(','),
          content = data.split('#');
        var layer = L.marker([latlng[0], latlng[1]], {
          icon: L.divIcon({
            className: '',
            iconSize: [26, 20],
            iconAnchor: [13, 10],
            html: '<i class="icon-youbike fa fa-bicycle" style="color: ' + bikeColor(Number(content[3])) + ';"></i>'
          })
        }).addTo(tenpoLayer);

        var popupContent = [];
        popupContent.push('租賃站名稱：' + content[0])
        popupContent.push('地址：' + content[1]);
        popupContent.push('車輛狀況(目前車輛)：' + content[3]);
        popupContent.push('空位數量：' + content[2]);
        layer.bindPopup(popupContent.join('<br>'));
      });
    }
  }).error(function() {
    alert("Unable to load Hyper Market Information, please try again later!");
  }).always(function() {
    checkAllFinish();
  });

  // $.when(youbike, cbike, pbike).done(function() {
  //   $('#bikeRefresh i').removeClass('fa-spin');
  // });
}

function bikeApiFormat1(layerGroup, totalData) {
  for (var d in totalData) {
    var data = totalData[d];
    var md = data.mday;
    var mdDate = new Date(md.slice(0, 4), md.slice(4, 6), md.slice(6, 8), md.slice(8, 10), md.slice(10, 12), md.slice(12, 14), 0);

    var layer = L.marker([data.lat, data.lng], {
      icon: L.divIcon({
        className: '',
        iconSize: [26, 20],
        iconAnchor: [13, 10],
        html: '<i class="icon-youbike fa fa-bicycle" style="color: ' + bikeColor(Number(data.sbi)) + ';"></i>'
      })
    }).addTo(layerGroup);

    var popupContent = [];
    popupContent.push('資料更新時間：' + mdDate.toLocaleString())
    popupContent.push('場站代號：' + data.sno);
    popupContent.push('場站名稱：' + data.sna);
    popupContent.push('場站區域：' + data.sarea);
    popupContent.push('地址：' + data.ar);
    popupContent.push('車輛狀況(目前車輛/總停車格)：' + data.sbi + '/' + data.tot);
    popupContent.push('空位數量：' + data.bemp);
    layer.bindPopup(popupContent.join('<br>'));
  }
}

function bikeApiFormat2(layerGroup, totalData) {
  totalData.each(function(index, data) {
    var layer = L.marker([$("StationLat", data).text(), $("StationLon", data).text()], {
      icon: L.divIcon({
        className: '',
        iconSize: [26, 20],
        iconAnchor: [13, 10],
        html: '<i class="icon-youbike fa fa-bicycle" style="color: ' + bikeColor(Number($("StationNums1", data).text())) + ';"></i>'
      })
    }).addTo(cBikeLayer);

    var popupContent = [];
    popupContent.push('租賃站名稱：' + $("StationName", data).text());
    popupContent.push('場站描述：' + $("StationDesc", data).text());
    popupContent.push('地址：' + $("StationAddress", data).text());
    popupContent.push('車輛狀況(目前車輛)：' + $("StationNums1", data).text());
    popupContent.push('空位數量：' + $("StationNums2", data).text());
    popupContent.push('<img src="' + $("StationPic", data).text() + '" width="120" height="80">');
    layer.bindPopup(popupContent.join('<br>'));
  });
}

function bikeColor(count) {
  var unit = Math.floor(count / 3);
  switch (unit) {
    case 0:
      color = '#999999';
      break;
    case 1:
      color = '#eb6864';
      break;
    case 2:
      color = '#336699';
      break;
    case 3:
      color = '#f5e625';
      break;
    default:
      color = '#22b24c';
      break;
  }
  return color;
}

function checkAllFinish() {
  apiCount -= 1;
  if (apiCount === 0) {
    $('#bikeRefresh i').removeClass('fa-spin');
  }
}
