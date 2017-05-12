(function (factory) {
    // Establish the root object, `window` (`self`) in the browser, or `global` on the server.
    // We use `self` instead of `window` for `WebWorker` support.
    var root = (typeof self === 'object' && self.self === self && self) ||
      (typeof global === 'object' && global.global === global && global);

    //AMD
    if (typeof define === 'function' && define.amd) {
      define(['leaflet', 'geodesy', 'exports'], function (L, geodesy, exports) {
        root.GridRef = factory(root, exports, L, geodesy.LatLonEllipsoidal, geodesy.OsGridRef);
      });

      //Browser global
    } else {
      root.GridRef = factory(root, {}, L, LatLon, OsGridRef);
    }
  }(function (root, m, L, LatLon, OsGridRef) {
  'use strict';

  var GRID_STEP = 100000; // metres

  L.GridRef = L.Polyline.extend({
    options: {
      color: 'gray',
      weight: 0.5,
      opacity: 1
    },

    onAdd: function (map) {
      this._map = map;
      L.Path.prototype.onAdd.apply(this, arguments);

      this.update();

      this._map.on('move zoom', this.update);
      this._map.addLayer(this);
    },

    onRemove: function (map) {
      // clean up
      map.off('viewreset move zoom', this._map);
      this.eachLayer(this.removeLayer, this);
    },

    update: function () {
      var zoom = this._map.getZoom();
      var bounds = this._map.getBounds();
      var granularity = this._getGranularity(zoom);
      var step = GRID_STEP / granularity;

      var polylinePoints = this._calcGraticule(step, bounds);
      this.setLatLngs(polylinePoints);
    },

    _calcGraticule: function (step, bounds) {
      // calculate grid start
      var newBounds = this._getGraticuleBounds(bounds, step);
      var south = newBounds.south;
      var north = newBounds.north;
      var east = newBounds.east;
      var west = newBounds.west;

      // calculate grid steps
      var sideSteps = (east - west) / step;
      var lengthSteps = (north - south) / step;

      var polylinePoints = [];

      var direction = 1; // up
      var side = 0;

      function addPoint(side, length) {
        var eastNorth = OsGridRef(west + side * step, south + length * step);
        // console.log('x ' + (west + side * step)  + ' y: ' + (south + length * step))
        var point = OsGridRef.osGridToLatLon(eastNorth);
        polylinePoints.push(new L.LatLng(point.lat, point.lon));
      }

      // draw lines lengthwise
      while (side <= sideSteps) {
        var length = 0;
        if (direction < 0) length = lengthSteps;

        var move = true;
        while (move) {
          addPoint(side, length);

          // update direction
          if (direction < 0) {
            move = length > 0;
          } else {
            move = length < lengthSteps;
          }
          length += direction;
        }
        direction = -1 * direction;
        side++;
      }

      var length = direction < 0 ? lengthSteps : 0;

      var lengthwaysDirection = direction;
      // sideways direction - returning
      direction = -1;

      // draw lines sidewise
      while (length <= lengthSteps && length >= 0) {
        var side = sideSteps;
        if (direction > 0) side = 0;

        var move = true;
        while (move) {
          addPoint(side, length);

          // update direction
          if (direction < 0) {
            move = side > 0;
          } else {
            move = side < sideSteps;
          }
          side += direction;
        }
        direction = -1 * direction;
        length += lengthwaysDirection;
      }

      return polylinePoints;
    },

    _getGranularity: function (zoom) {
      var granularity;
      if (zoom < 9) {
        granularity = 1;
      } else if (zoom < 11) {
        granularity = 10;
      } else if (zoom < 13) {
        granularity = 50;
      } else if (zoom < 15) {
        granularity = 100;
      } else {
        granularity = 1000;
      }
      return granularity;
    },

    _getGraticuleBounds: function (bounds, step) {
      var p = new LatLon(bounds.getSouth(), bounds.getWest(), LatLon.datum.WGS84);
      var grid = OsGridRef.latLonToOsGrid(p);
      var west = grid.easting;
      west -= west % step; // drop modulus
      west -= step; // add boundry
      var south = grid.northing;
      south -= south % step; // drop modulus
      south -= step; // add boundry

      p = new LatLon(bounds.getNorth(), bounds.getEast(), LatLon.datum.WGS84);
      grid = OsGridRef.latLonToOsGrid(p);
      var east = grid.easting;
      east -= east % step; // drop modulus
      east += step; // add boundry
      var north = grid.northing;
      north -= north % step; // drop modulus
      north += step; // add boundry

      // drop excess
      west = west < 0 ? 0 : west; // do not exceed
      south = south < 0 ? 0 : south; // do not exceed
      north = north > 1300000 ? 1300000 : north; // do not exceed
      east = east > 700000 ? 700000 : east; // do not exceed

      return {west: west, south: south, north: north, east: east};
    }
  });

  L.gridRef = function (options) {
    return new L.GridRef(options);
  };

  return L.GridRef;
}));
