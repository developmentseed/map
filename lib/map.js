function render(res, resource, built) {
    switch (resource) {
    case 'json':
    case 'mml':
        res.render(__dirname + '/templates/' + resource, { layout: false, locals: built });
        break;
    case 'geojson':
        res.send(built, { 'Content-Type': 'text/plain' });
        break;
    }
}

function load(name) {
    return require('expresslane').app.set('settings')('map')[name] || false;
}

function fromRoute(req, urlSchema, rows) {
    return map(req, urlSchema, req.params.map, req.params.layer, req.params.resource, rows);
}

function map(req, urlSchema, map, layer, resource, rows) {
    var map = load(map);
    if (map) {
        var m = new Map(req, urlSchema, resource, map);
        var built = m[resource](layer, rows);
        return built;
    }
    return false;
}

function Map(req, urlSchema, resource, map) {
    this.req = req;
    this.urlSchema = urlSchema;
    this.resource = resource;
    this.map = map;
    this.handlers = {};
    var display = require('display');
    for (var layer in map) {
        if (map[layer].stylewriter) {
            var handler = display.fieldHandler(req, layer, map[layer].stylewriter, map[layer], urlSchema);
            if (handler) {
                this.handlers[layer] = handler;
            }
        }
    }
}

/**
 * Renders a OL Wax JSON structure that describes a map layer.
 *
 * Together with geojson() and mml() this generates one of the three data
 * sources required to render TileLive style interactive maps with Open Layers.
 */
Map.prototype.json = function(layer, rows) {
    var built = { layers: [] };

    // We need this to throw a "last" flag for templating.
    var keys = [];
    for (var l in this.map) {
        keys.push(l);
    }

    for (var l in this.map) {
        // If a specific layer was specified, build only that one.
        if (!layer || l === layer) {
            var builtLayer = this.map[l];
            if (builtLayer.stylewriter) {
                builtLayer = this.handlers[l].json(builtLayer, rows);
            }
            builtLayer.last = keys.indexOf(l) === (keys.length - 1);
            built.layers.push(builtLayer);
        }
    }
    return built;
}

/**
 * Renders a GeoJSON structure that describes features on a map.
 *
 * Together with json() and mml() this generates one of the three data sources
 * required to render TileLive style interactive maps with Open Layers.
 */
Map.prototype.geojson = function(layer, rows) {
    var built = {
        'type': 'FeatureCollection',
        'features': []
    };
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var properties = {};
        for (var l in this.map) {
            // If a specific layer was specified, build only that one.
            if ((!layer || l === layer) && this.map[l].stylewriter) {
                layerProperties = this.handlers[l].geojson(row);
                for (var key in layerProperties) {
                    properties[key] = layerProperties[key];
                }
            }
        }
        built.features.push({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [
                    parseFloat(row.value.lon) || 0,
                    parseFloat(row.value.lat) || 0
                ]
            },
            properties: properties
        });
    }
    built.features = proj4Workaround(built.features);
    return built;
}

/**
 * Renders a Cascadenik MML file.
 *
 * Together with json() and geojson() this generates one of the three data
 * sources required to render TileLive style interactive maps with Open Layers.
 */
Map.prototype.mml = function(layer, rows) {
    var built = {
        rules: [],
        layers: []
    };
    for (var l in this.map) {
        // If a specific layer was specified, build only that one.
        if ((!layer || l === layer) && this.map[l].stylewriter) {
            builtLayer = this.handlers[l].mml(rows);
            if (builtLayer.rules) {
                built.rules = built.rules.concat(builtLayer.rules);
            }
            if (builtLayer.layers) {
                built.layers = built.layers.concat(builtLayer.layers);
            }
        }
    }
    return built;
}

/**
 * @TODO: Fix upstream!
 * Append two fake points that extend the bounds of the geojson
 * features. Workaround for upstream bug in proj4 that causes
 * mapnik to omit certain legitimate features, particularly ones
 * at the extremities of a dataset.
 */
function proj4Workaround(features) {
    features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-179.9, -89.9] },
        properties: {}
    });
    features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [179.9, 89.9] },
        properties: {}
    });
    return features;
}

module.exports = {
    load: load,
    map: map,
    fromRoute: fromRoute,
    render: render
};

var handlers = require('display').handlers;
handlers.mapBase = require('./mapBase');
handlers.mapChoropleth = require('./mapChoropleth');
handlers.mapPoints = require('./mapPoints');

