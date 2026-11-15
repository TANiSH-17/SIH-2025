import L from 'leaflet';

if (typeof window !== 'undefined') {
  window.L = L;
}

/*
 (c) 2014, Vladimir Agafonkin
 simpleheat, a tiny JavaScript library for drawing heatmaps with Canvas
 https://github.com/mourner/simpleheat
*/
var simpleheat = (function () {
  "use strict";
  function t(i) {
    return this instanceof t
      ? ((this._canvas = i = "string" == typeof i ? document.getElementById(i) : i),
        (this._ctx = i.getContext("2d")),
        (this._width = i.width),
        (this._height = i.height),
        (this._max = 1),
        void this.clear())
      : new t(i);
  }
  t.prototype = {
    defaultRadius: 25,
    defaultGradient: { 0.4: "blue", 0.6: "cyan", 0.7: "lime", 0.8: "yellow", 1.0: "red" },
    data: function (t) {
      return (this._data = t), this;
    },
    max: function (t) {
      return (this._max = t), this;
    },
    add: function (t) {
      return this._data.push(t), this;
    },
    clear: function () {
      return (this._data = []), this;
    },
    radius: function (t, i) {
      i = i || 15;
      var a = (this._circle = document.createElement("canvas")),
        s = a.getContext("2d"),
        e = (this._r = t + i);
      a.width = a.height = 2 * e;

      var radGrad = s.createRadialGradient(e, e, 0, e, e, e);
      radGrad.addColorStop(0, "rgba(0,0,0,1)");
      radGrad.addColorStop(Math.max(0.01, (t / e) * 0.6), "rgba(0,0,0,0.85)");
      radGrad.addColorStop(Math.min(0.99, (t / e)), "rgba(0,0,0,0.5)");
      radGrad.addColorStop(1, "rgba(0,0,0,0)");

      s.fillStyle = radGrad;
      s.fillRect(0, 0, 2 * e, 2 * e);
      return this;
    },
    gradient: function (t) {
      var i = document.createElement("canvas"),
        a = i.getContext("2d"),
        s = a.createLinearGradient(0, 0, 0, 256);
      i.width = 1;
      i.height = 256;
      for (var e in t) {
        s.addColorStop(+e, t[e]);
      }
      a.fillStyle = s;
      a.fillRect(0, 0, 1, 256);
      this._grad = a.getImageData(0, 0, 1, 256).data;
      return this;
    },
    draw: function (t) {
      if (!this._circle) this.radius(this.defaultRadius);
      if (!this._grad) this.gradient(this.defaultGradient);
      var i = this._ctx;
      if (!i || this._width <= 0 || this._height <= 0) return this;
      i.clearRect(0, 0, this._width, this._height);
      for (var a, s = 0, e = this._data.length; e > s; s++) {
        a = this._data[s];
        i.globalAlpha = Math.max(a[2] / this._max, t || 0.05);
        i.drawImage(this._circle, a[0] - this._r, a[1] - this._r);
      }
      var n = i.getImageData(0, 0, this._width, this._height);
      return this._colorize(n.data, this._grad), i.putImageData(n, 0, 0), this;
    },
    _colorize: function (t, i) {
      for (var a, s = 3, e = t.length; e > s; s += 4) {
        a = 4 * t[s];
        if (a) {
          t[s - 3] = i[a];
          t[s - 2] = i[a + 1];
          t[s - 1] = i[a + 2];
          // Enhance visible contrast against light map tiles
          t[s] = Math.min(255, Math.round(t[s] * 1.6 + 35));
        }
      }
    },
  };
  if (typeof window !== "undefined") {
    window.simpleheat = t;
  }
  return t;
})();

/*
 (c) 2014, Vladimir Agafonkin
 Leaflet.heat, a tiny and fast heatmap plugin for Leaflet.
 https://github.com/Leaflet/Leaflet.heat
*/
L.HeatLayer = (L.Layer ? L.Layer : L.Class).extend({
  initialize: function (t, i) {
    this._latlngs = t || [];
    L.setOptions(this, i);
  },
  setLatLngs: function (t) {
    this._latlngs = t || [];
    return this.redraw();
  },
  addLatLng: function (t) {
    this._latlngs.push(t);
    return this.redraw();
  },
  setOptions: function (t) {
    L.setOptions(this, t);
    if (this._heat) this._updateOptions();
    return this.redraw();
  },
  redraw: function () {
    if (!this._heat || this._frame || (this._map && this._map._animating)) return this;
    this._frame = L.Util.requestAnimFrame(this._redraw, this);
    return this;
  },
  onAdd: function (t) {
    this._map = t;
    if (!this._canvas) this._initCanvas();
    t._panes.overlayPane.appendChild(this._canvas);
    t.on("moveend", this._reset, this);
    t.on("resize", this._reset, this);
    t.on("viewreset", this._reset, this);
    if (t.options.zoomAnimation && L.Browser.any3d) {
      t.on("zoomanim", this._animateZoom, this);
    }
    this._reset();
  },
  onRemove: function (t) {
    if (this._canvas && this._canvas.parentNode) {
      this._canvas.parentNode.removeChild(this._canvas);
    }
    t.off("moveend", this._reset, this);
    t.off("resize", this._reset, this);
    t.off("viewreset", this._reset, this);
    if (t.options.zoomAnimation && L.Browser.any3d) {
      t.off("zoomanim", this._animateZoom, this);
    }
  },
  addTo: function (t) {
    t.addLayer(this);
    return this;
  },
  _initCanvas: function () {
    var t = (this._canvas = L.DomUtil.create("canvas", "leaflet-heatmap-layer leaflet-layer"));
    var i = L.DomUtil.testProp(["transformOrigin", "WebkitTransformOrigin", "msTransformOrigin"]);
    t.style[i] = "50% 50%";
    var a = this._map.getSize();
    t.width = Math.max(a.x, 100);
    t.height = Math.max(a.y, 100);
    var s = this._map.options.zoomAnimation && L.Browser.any3d;
    L.DomUtil.addClass(t, "leaflet-zoom-" + (s ? "animated" : "hide"));
    this._heat = simpleheat(t);
    this._updateOptions();
  },
  _updateOptions: function () {
    if (!this._heat) return;
    this._heat.radius(this.options.radius || this._heat.defaultRadius, this.options.blur);
    if (this.options.gradient) this._heat.gradient(this.options.gradient);
    if (this.options.max) this._heat.max(this.options.max);
  },
  _reset: function () {
    if (!this._map || !this._canvas) return;
    var i = this._map.getSize();
    if (i.x <= 0 || i.y <= 0) return;
    var t = this._map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this._canvas, t);
    if (this._canvas.width !== i.x || this._canvas.height !== i.y) {
      this._canvas.width = this._heat._width = i.x;
      this._canvas.height = this._heat._height = i.y;
    }
    this._redraw();
  },
  _redraw: function () {
    if (!this._map || !this._heat) return;
    var l = this._map.getSize();
    if (l.x <= 0 || l.y <= 0) return;

    var t,
      i,
      a,
      s,
      e,
      n,
      h,
      o,
      r,
      d = [],
      _ = this._heat._r || 30,
      m = new L.Bounds(L.point([-_, -_]), l.add([_, _])),
      c = void 0 === this.options.max ? 1 : this.options.max,
      g = Math.max(Math.floor(_ / 2), 1),
      p = [],
      v = this._map._getMapPanePos(),
      w = v.x % g,
      y = v.y % g;

    for (t = 0, i = this._latlngs.length; i > t; t++) {
      var pt = this._latlngs[t];
      if (!pt) continue;
      a = this._map.latLngToContainerPoint(pt);
      if (m.contains(a)) {
        e = Math.floor((a.x - w) / g) + 2;
        n = Math.floor((a.y - y) / g) + 2;
        var intensity = void 0 !== pt.alt ? pt.alt : (void 0 !== pt[2] ? +pt[2] : 1);
        r = intensity;
        p[n] = p[n] || [];
        s = p[n][e];
        if (s) {
          s[0] = (s[0] * s[2] + a.x * r) / (s[2] + r);
          s[1] = (s[1] * s[2] + a.y * r) / (s[2] + r);
          s[2] += r;
        } else {
          p[n][e] = [a.x, a.y, r];
        }
      }
    }
    for (t = 0, i = p.length; i > t; t++) {
      if (p[t]) {
        for (h = 0, o = p[t].length; o > h; h++) {
          s = p[t][h];
          if (s) d.push([Math.round(s[0]), Math.round(s[1]), Math.min(s[2], c)]);
        }
      }
    }
    this._heat.data(d).draw(this.options.minOpacity || 0.25);
    this._frame = null;
  },
  _animateZoom: function (t) {
    var i = this._map.getZoomScale(t.zoom),
      a = this._map._getCenterOffset(t.center)._multiplyBy(-i).subtract(this._map._getMapPanePos());
    if (L.DomUtil.setTransform) {
      L.DomUtil.setTransform(this._canvas, a, i);
    } else {
      this._canvas.style[L.DomUtil.TRANSFORM] = L.DomUtil.getTranslateString(a) + " scale(" + i + ")";
    }
  },
});

L.heatLayer = function (t, i) {
  return new L.HeatLayer(t, i);
};

export default L;
