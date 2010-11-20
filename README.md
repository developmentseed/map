Map 0.x for Express Lane
------------------------
Map provides an API for generating the various endpoints needed to generate
[TileLive](http://github.com/developmentseed/TileLive) and
[StyleWriter](http://github.com/developmentseed/stylewriter) maps in the
context of a web app. It provides helpers to prop up endpoints for:

1. OL wax JSON (currently unreleased! bug [tmcw](http://github.com/tmcw)) for
  configuring OpenLayers maps with proper interactive data when using polygon
  based TileLive layers.
2. TileLive MML styles with Cascadenik style rules based on the data in your
  webapp.
3. GeoJSON output of data in your webapp that can be used by TileLive.

Requirements
------------
- [node.js](http://github.com/ryah/node) 0.2.x
- [express](http://github.com/visionmedia/express) 1.x
- [expresslane](http://github.com/developmentseed/expresslane)
- [hbs](http://github.com/donpark/hbs)
- [cradle](http://github.com/cloudhead/cradle) for use with CouchDB.
- [display](http://github.com/developmentseed/display)
- [stylewriter-node](http://github.com/developmentseed/stylewriter-node)

Client side:

- [openlayers](https://github.com/developmentseed/openlayers_slim)
- [stylewriter-client](http://github.com/developmentseed/stylewriter-client)

Using map
---------
Maps should be defined in `settings.js` or a sub module file required by the
main expresslane settings file like `settings.map.js`. Map expects an object
keyed by map name to be present at `require('settings').map`:

    module.exports = {
        map: {
            // Defines the `home` map
            home: {
                world: {
                    type: 'OpenLayers.Layer.MapBox',
                    visibility: "true",
                    extension: "png",
                    mapbox: true,
                    layername: "world-glass",
                    baselayer: true,
                    resolutions: '4891.96980938,2445.98490469,1222.99245234,611.496226172,305.748113086,152.874056543,76.4370282715'
                }
                // ... more layers
            }
            // ... more maps
        }
        // ... settings for other expresslane modules
    };

Defining layers
---------------
Each map object contains a keyed list of layer objects. Each layer object can
have the following attributes:

- `title`: String, title of the layer.
- `type`: String, OL layer type.
- `visibility`: String, initial layer visibility state.
- `extension`: String, tile image extension.
- `mapbox`: Boolean, whether this layer is a mapbox layer or not.
- `layername`: String, mapbox layername.
- `baselayer`: Boolean, whether this layer is a baselayer or not.
- `legend`: String, legend to use for this layer.
- `resolutions`: String, OL resolutions for this layer.
- `stylewriter`: Object, a [display](http://github.com/developmentseed/display)
  field configuration object for stylewriter layers.

@TODO: These obviously need better organization and modularity. Fix.

### Usage

The main function exposed by map is `map(req, urlSchema, map, layer, resource, rows)`:

- `req`: The request object for the current request.
- `urlSchema`: A route string representing the URL schema for map endpoints.
- `map`: String name of the map configuration to use, e.g. `home`.
- `layer`: String name of a specific layer to generate a map resource for.
- `resource`: String map resource to generate. May be: `json`, `geojson` or
   `mml` for their respective endpoint resources.
- `rows`: An array of CouchDB rows returned by a query.

Returns an object that can be rendered (`geojson`, `json` or `mml`) using the
`render(res, resource, built)` method:

- `res`: The response object for the current request.
- `resource`: String map resource to generate. May be: `json`, `geojson` or
   `mml` for their respective endpoint resources.
- `map`: Object built map from `map()`.

To simplify usage, the `fromRoute(req, urlSchema, rows)` method is provided
that will detect the ommitted parameters (`map`, `layer`, `resource`) from the
request object assuming that you use equivalently named request params.

### Providing a router endpoint

The URL schema defined should match the route path used in express and should
contain `:map`, `:layer` and `:resource` params as well as any other parameters
you will need for loading data.

    app.get('/map/:map/:layer.:resource', function(req, res, next) {
        var map = require('map');
        var rows = someLoader();
        var built = map.fromRoute(req, '/map/:map/:layer.:resource', rows);
        var resource = req.param('resource');
        map.render(res, resource, built);
    });

The router rule above would respond to the following example requests:

- `/map/home/world.json` OL Wax JSON for the `home` map with only configuration
  for the `world` layer. You could provide a JSON file by making the layer
  parameter optional by using `:layer?` in your route rule and requesting your
  JSON at `/map/home.json`.
- `/map/home/world.geojson` geojson containing features from fields defined in
  the `world` layer.
- `/map/home/world.mml` TileLive compatible MML file for the `world` layer.

