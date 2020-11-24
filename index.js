(function(factory) {
  // Establish the root object, `window` (`self`) in the browser, or `global` on the server.
  // We use `self` instead of `window` for `WebWorker` support.
  var root =
    (typeof self === "object" && self.self === self && self) ||
    (typeof global === "object" && global.global === global && global);

  //AMD
  if (typeof define === "function" && define.amd) {
    define(["leaflet", "exports"], function(L, exports) {
      root.GridRef = factory(root, exports, L);
    });

    //Browser global
  } else {
    root.GridRef = factory(root, {}, L);
  }
})(function(root, m, L) {
  "use strict";

  // OSGB code taken from http://www.carabus.co.uk/ll_ngr.html
  function Marc(bf0, n, phi0, phi) {
    var Marc =
      bf0 *
      ((1 + n + (5 / 4) * (n * n) + (5 / 4) * (n * n * n)) * (phi - phi0) -
        (3 * n + 3 * (n * n) + (21 / 8) * (n * n * n)) *
          Math.sin(phi - phi0) *
          Math.cos(phi + phi0) +
        ((15 / 8) * (n * n) + (15 / 8) * (n * n * n)) *
          Math.sin(2 * (phi - phi0)) *
          Math.cos(2 * (phi + phi0)) -
        (35 / 24) *
          (n * n * n) *
          Math.sin(3 * (phi - phi0)) *
          Math.cos(3 * (phi + phi0)));
    return Marc;
  }

  var deg2rad = Math.PI / 180;
  var rad2deg = 180.0 / Math.PI;

  function getEastingNorthing(lat, lon) {
    var phi = lat * deg2rad; // convert latitude to radians
    var lam = lon * deg2rad; // convert longitude to radians
    var a = 6377563.396; // OSGB semi-major axis
    var b = 6356256.91; // OSGB semi-minor axis
    var e0 = 400000; // OSGB easting of false origin
    var n0 = -100000; // OSGB northing of false origin
    var f0 = 0.9996012717; // OSGB scale factor on central meridian
    var e2 = 0.0066705397616; // OSGB eccentricity squared
    var lam0 = -0.034906585039886591; // OSGB false east
    var phi0 = 0.85521133347722145; // OSGB false north
    var af0 = a * f0;
    var bf0 = b * f0;

    // easting
    var slat2 = Math.sin(phi) * Math.sin(phi);
    var nu = af0 / Math.sqrt(1 - e2 * slat2);
    var rho = (nu * (1 - e2)) / (1 - e2 * slat2);
    var eta2 = nu / rho - 1;
    var p = lam - lam0;
    var IV = nu * Math.cos(phi);
    var clat3 = Math.pow(Math.cos(phi), 3);
    var tlat2 = Math.tan(phi) * Math.tan(phi);
    var V = (nu / 6) * clat3 * (nu / rho - tlat2);
    var clat5 = Math.pow(Math.cos(phi), 5);
    var tlat4 = Math.pow(Math.tan(phi), 4);
    var VI =
      (nu / 120) *
      clat5 *
      (5 - 18 * tlat2 + tlat4 + 14 * eta2 - 58 * tlat2 * eta2);
    var east = e0 + p * IV + Math.pow(p, 3) * V + Math.pow(p, 5) * VI;

    // northing
    var n = (af0 - bf0) / (af0 + bf0);
    var M = Marc(bf0, n, phi0, phi);
    var I = M + n0;
    var II = (nu / 2) * Math.sin(phi) * Math.cos(phi);
    var III =
      (nu / 24) *
      Math.sin(phi) *
      Math.pow(Math.cos(phi), 3) *
      (5 - Math.pow(Math.tan(phi), 2) + 9 * eta2);
    var IIIA = (nu / 720) * Math.sin(phi) * clat5 * (61 - 58 * tlat2 + tlat4);
    var north = I + p * p * II + Math.pow(p, 4) * III + Math.pow(p, 6) * IIIA;

    return [Math.round(east), Math.round(north)];
  }

  function InitialLat(north, n0, af0, phi0, n, bf0) {
    var phi1 = (north - n0) / af0 + phi0;
    var M = Marc(bf0, n, phi0, phi1);
    var phi2 = (north - n0 - M) / af0 + phi1;
    var ind = 0;
    while (Math.abs(north - n0 - M) > 0.00001 && ind < 20) {
      // max 20 iterations in case of error
      ind = ind + 1;
      phi2 = (north - n0 - M) / af0 + phi1;
      M = Marc(bf0, n, phi0, phi2);
      phi1 = phi2;
    }

    return phi2;
  }

  function getLatLon(north, east) {
    var a = 6377563.396; // OSGB semi-major
    var b = 6356256.91; // OSGB semi-minor
    var e0 = 400000; // OSGB easting of false origin
    var n0 = -100000; // OSGB northing of false origin
    var f0 = 0.9996012717; // OSGB scale factor on central meridian
    var e2 = 0.0066705397616; // OSGB eccentricity squared
    var lam0 = -0.034906585039886591; // OSGB false east
    var phi0 = 0.85521133347722145; // OSGB false north
    var af0 = a * f0;
    var bf0 = b * f0;
    var n = (af0 - bf0) / (af0 + bf0);
    var Et = east - e0;
    var phid = InitialLat(north, n0, af0, phi0, n, bf0);
    var nu = af0 / Math.sqrt(1 - e2 * (Math.sin(phid) * Math.sin(phid)));
    var rho = (nu * (1 - e2)) / (1 - e2 * Math.sin(phid) * Math.sin(phid));
    var eta2 = nu / rho - 1;
    var tlat2 = Math.tan(phid) * Math.tan(phid);
    var tlat4 = Math.pow(Math.tan(phid), 4);
    var tlat6 = Math.pow(Math.tan(phid), 6);
    var clatm1 = Math.pow(Math.cos(phid), -1);
    var VII = Math.tan(phid) / (2 * rho * nu);
    var VIII =
      (Math.tan(phid) / (24 * rho * (nu * nu * nu))) *
      (5 + 3 * tlat2 + eta2 - 9 * eta2 * tlat2);
    var IX =
      (Math.tan(phid) / (720 * rho * Math.pow(nu, 5))) *
      (61 + 90 * tlat2 + 45 * tlat4);
    var phip =
      phid - Et * Et * VII + Math.pow(Et, 4) * VIII - Math.pow(Et, 6) * IX;
    var X = Math.pow(Math.cos(phid), -1) / nu;
    var XI = (clatm1 / (6 * (nu * nu * nu))) * (nu / rho + 2 * tlat2);
    var XII =
      (clatm1 / (120 * Math.pow(nu, 5))) * (5 + 28 * tlat2 + 24 * tlat4);
    var XIIA =
      (clatm1 / (5040 * Math.pow(nu, 7))) *
      (61 + 662 * tlat2 + 1320 * tlat4 + 720 * tlat6);
    var lambdap =
      lam0 +
      Et * X -
      Et * Et * Et * XI +
      Math.pow(Et, 5) * XII -
      Math.pow(Et, 7) * XIIA;

    return convert_to_wgs(phip, lambdap);
  }

  function convert_to_wgs(phip, lambdap) {
    var WGS84_AXIS = 6378137;
    var WGS84_ECCENTRIC = 0.00669438037928458;
    var OSGB_AXIS = 6377563.396;
    var OSGB_ECCENTRIC = 0.0066705397616;
    var height = 24.7; // dummy height above ellipsoid in metres
    var geo = transform(
      phip,
      lambdap,
      OSGB_AXIS,
      OSGB_ECCENTRIC,
      height,
      WGS84_AXIS,
      WGS84_ECCENTRIC,
      446.448,
      -125.157,
      542.06,
      0.1502,
      0.247,
      0.8421,
      -20.4894
    );

    // convert radians to degrees
    var wgslat = geo.latitude * rad2deg;
    var wgslon = geo.longitude * rad2deg;

    return { lat: wgslat, lng: wgslon };
  }

  function transform(lat, lon, a, e, h, a2, e2, tx, ty, tz, rx, ry, rz, s) {
    var sf = s * 0.000001;
    var h = h * 1;
    var v = a / Math.sqrt(1 - e * (Math.sin(lat) * Math.sin(lat)));
    var x = (v + h) * Math.cos(lat) * Math.cos(lon);
    var y = (v + h) * Math.cos(lat) * Math.sin(lon);
    var z = ((1 - e) * v + h) * Math.sin(lat);

    // convert rotations in seconds to radians
    var xrot = (rx / 3600) * deg2rad;
    var yrot = (ry / 3600) * deg2rad;
    var zrot = (rz / 3600) * deg2rad;

    var hx = x + x * sf - y * zrot + z * yrot + tx;
    var hy = x * zrot + y + y * sf - z * xrot + ty;
    var hz = -1 * x * yrot + y * xrot + z + z * sf + tz;

    // Convert back to lat, lon
    var lon = Math.atan(hy / hx);
    var p = Math.sqrt(hx * hx + hy * hy);
    var lat = Math.atan(hz / (p * (1 - e2)));
    v = a2 / Math.sqrt(1 - e2 * (Math.sin(lat) * Math.sin(lat)));
    var errvalue = 1.0;
    var lat0 = 0;
    while (errvalue > 0.001) {
      lat0 = Math.atan((hz + e2 * v * Math.sin(lat)) / p);
      errvalue = Math.abs(lat0 - lat);
      lat = lat0;
    }
    h = p / Math.cos(lat) - v;
    var geo = { latitude: lat, longitude: lon };
    return geo;
  }

  var GRID_STEP = 100000; // metres

  L.GridRef = L.Polyline.extend({
    options: {
      color: "gray",
      weight: 0.5,
      opacity: 1,
    },

    onAdd: function(map) {
      this._map = map;
      L.Path.prototype.onAdd.apply(this, arguments);

      this.update();

      this._map.on("move zoom", this.update);
      this._map.addLayer(this);
    },

    onRemove: function(map) {
      // clean up
      map.off("viewreset move zoom", this._map);
      this.eachLayer(this.removeLayer, this);
    },

    update: function() {
      var zoom = this._map.getZoom();
      var bounds = this._map.getBounds();
      var granularity = this._getGranularity(zoom);
      var step = GRID_STEP / granularity;

      var polylinePoints = this._calcGraticule(step, bounds);
      this.setLatLngs(polylinePoints);
    },

    _calcGraticule: function(step, bounds) {
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
        var point = getLatLon(south + length * step, west + side * step);
        polylinePoints.push([point.lat, point.lng]);
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

    _getGranularity: function(zoom) {
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

    _getGraticuleBounds: function(bounds, step) {
      // TODO: get bounds in osgb datum before converting to gridref
      var eastingNorthing = getEastingNorthing(
        bounds.getSouth(),
        bounds.getWest()
      );
      var west = eastingNorthing[0];
      west -= west % step; // drop modulus
      west -= step; // add boundry
      var south = eastingNorthing[1];
      south -= south % step; // drop modulus
      south -= step; // add boundry

      // TODO: get bounds in osgb datum before converting to gridref
      eastingNorthing = getEastingNorthing(bounds.getNorth(), bounds.getEast());
      var east = eastingNorthing[0];
      east -= east % step; // drop modulus
      east += 2 * step; // add boundry (2 x because of wrong datum?)
      var north = eastingNorthing[1];
      north -= north % step; // drop modulus
      north += step; // add boundry

      // drop excess
      west = west < 0 ? 0 : west; // do not exceed
      south = south < 0 ? 0 : south; // do not exceed
      north = north > 1300000 ? 1300000 : north; // do not exceed
      east = east > 700000 ? 700000 : east; // do not exceed

      return { west: west, south: south, north: north, east: east };
    },
  });

  L.gridRef = function(options) {
    return new L.GridRef(options);
  };

  return L.GridRef;
});
