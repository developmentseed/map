function handler (req, identifier, config, layer, urlSchema) {
    require('display').handlers.mapBase.call(this, req, identifier, config, layer, urlSchema);
}

require('sys').inherits(handler, require('display').handlers.mapBase);

handler.prototype.json = function(layer, rows) {
    layer = require('display').handlers.mapBase.prototype.json.call(this, layer, rows);

    // Set the name, value fields using the layer identifier to avoid
    // collisions with other point layers.
    layer.stylewriter.name_field = this.identifier + '_name';
    layer.stylewriter.value_field = this.identifier + '_description';
    layer.stylewriter.symbolizer = 'point';
    return layer;
};

handler.prototype.mml = function(rows) {
    var rules = [];
    var metaConfig = this.config.fields.slice(0, 3);
    var dataConfig = this.config.fields.slice(3);

    var a = {
        field: dataConfig[0].field,
        values: [],
        breaks: []
    };
    for (var i = 0, l = rows.length; i < l; i++) {
        var data = this.getFields(rows[i]).slice(3);
        if (data[0] && typeof data[0].value !== 'undefined') {
            a.values.push(data[0].value);
        }
    }
    a.breaks = require('stylewriter-node').breaks.equal(a.values, 11);

    // Add rule for each break range.
    for (var i = 0; i < 10; i++) { // a
        var selector = [
            '_' + a.field + '_null = 0',
            a.field + ' \>= ' + a.breaks[i],
            a.field + ' \<= ' + a.breaks[i + 1]
        ];
        var properties = {
            width: 2 + (i * 3),
            height: 2 + (i * 3),
            fill: '#222',
            lineColor: '#222',
            lineWidth: 0,
            metaOutput: [this.identifier + '_name', this.identifier + '_description'].join(', '),
        };
        rules.push({
            _template: __dirname + '/templates/points',
            null: false,
            selector: selector,
            properties: properties
        });
    }

    // Add rule for null values
    var selector = ['_' + a.field + '_null = 1'];
    var properties = {
        width: 4,
        height: 4,
        fill: '#fff',
        lineColor: '#444',
        lineWidth: 2,
        metaOutput: [this.identifier + '_name', this.identifier + '_description'].join(', ')
    };
    rules.push({
        _template: __dirname + '/templates/points',
        null: true,
        selector: selector,
        properties: properties
    });

    return {
        rules: rules,
        layers: [
            {
                file: '', // @TODO config.url_geojson,
                type: 'ogr',
                id: 'data',
                layer: 'OGRGeoJSON'
            }
        ]
    };
};

module.exports = handler;
