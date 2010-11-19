function handler (req, identifier, config, layer, urlSchema) {
    require('display').handlers.mapBase.call(this, req, identifier, config, layer, urlSchema);
}

require('sys').inherits(handler, require('display').handlers.mapBase);

handler.prototype.json = function(layer, rows) {
    layer = require('display').handlers.mapBase.prototype.json.call(this, layer, rows);

    // @TODO figure out join field handling.
    // Set the join field.
    // if (layer.stylewriter.settings && layer.stylewriter.settings.keys) {
    //     layer.stylewriter.join_field = layer.stylewriter.settings.keys[type];
    // }

    // Generate layer keymap.
    var keymap = {};
    for (var i = 0, l = rows.length; i < l; i++) {
        var fields = this.getFields(rows[i]);

        // Split fields into meta & data.
        var meta = fields.slice(0, 3);
        var data = fields.slice(3);

        var values = [];
        var id = meta[0].value;
        var foreign = meta[1].value;
        var name = meta[2].value;
        for (var j = 0, m = data.length; j < m; j++) {
            if (typeof data[j].value !== 'undefined') {
                values.push(require('display').util.ac(data[j].value));
            }
        }
        keymap[foreign] = {
            name: "<a href='" + this.replaceTokens(layer.stylewriter.settings.path, rows[i]) + "'>" + name + "</a>",
            description: values.join(' / ') + ' <small>(' + layer.title + ' - ' + layer.description + ')</small>'
        };
    };
    // Stringify for templating.
    layer.stylewriter.keymap = JSON.stringify(keymap);
    layer.stylewriter.symbolizer = 'polygon';
    return layer;
};

handler.prototype.mml = function(rows) {
    var color_ramp = this.config.settings.colors;
    var color_null = this.config.settings.colorsNull || '#000';
    var metaConfig = this.config.fields.slice(0, 3);
    var dataConfig = this.config.fields.slice(3);
    var rules = [];
    var values = [];

    // Generate a set of values between 0 and 1 representing one of the
    // different calculations for choropleth shading.
    switch (this.config.settings.mode) {
    case 'single':
        var max = this.getMax(rows);
        for (var i = 0, l = rows.length; i < l; i++) {
            var fields = this.getFields(rows[i]);
            var meta = fields.slice(0, 3);
            var data = fields.slice(3);
            var foreign = meta[1].value;
            if (data[0] && typeof data[0].value !== 'undefined') {
                var value = (data[0].value || 0) /  max;
            }
            else {
                var value = null;
            }
            values.push({foreign: foreign, value: value});
        }
        break;
    case 'split':
        for (var i = 0, l = rows.length; i < l; i++) {
            var fields = this.getFields(rows[i]);
            var meta = fields.slice(0, 3);
            var data = fields.slice(3);
            var foreign = meta[1].value;
            if ((data[0] && typeof data[0].value !== 'undefined') && (data[1] && typeof data[1].value !== 'undefined')) {
                var a = data[0].value || 0;
                var b = data[1].value || 0;
                var value = (a + b) === 0 ? 1 : a / (a+b);
            }
            else {
                var value = null;
            }
            values.push({foreign: foreign, value: value});
        }
        break;
    case 'delta':
        var max = 0;
        for (var i = 0, l = rows.length; i < l; i++) {
            var fields = this.getFields(rows[i]);
            var meta = fields.slice(0, 3);
            var data = fields.slice(3);
            var foreign = meta[1].value;
            if ((data[0] && typeof data[0].value !== 'undefined') && (data[1] && typeof data[1].value !== 'undefined')) {
                var a = data[0].value || 0;
                var b = data[1].value || 0;
                var value = (a - b) / b;
            }
            else {
                var value = null;
            }
            values.push({foreign: foreign, value: value});
            if (Math.abs(value) > max) {
                max = Math.abs(value);
            }
        }
        for (var i = 0, l = values.length; i < l; i++) {
            if (values[i].value !== null) {
                values[i].value = ((values[i].value / max) * .5) + .5;
            }
        }
        break;
    }

    for (var i = 0, l = values.length; i < l; i++) {
        var color;
        if (values[i].value !== null) {
            color = color_ramp[Math.floor(values[i].value * (color_ramp.length - 1))];
        }
        else {
            color = color_null;
        }
        rules.push({
            _template: __dirname + '/templates/choropleth',
            selector: '', // @TODO [this.config.settings.keys[type] + ' = ' + values[i].foreign],
            properties: { polygonFill: color, polygonOpacity: 0.6 }
        });
    }
    return {
        rules: rules,
        layers: '' // @TODO this.config.settings.layers[type]
    };
};

handler.prototype.getMax = function(rows) {
    if (typeof this.max === 'undefined') {
        this.max = 0;
        for (var i = 0, l = rows.length; i < l; i++) {
            if (rows[i].value && rows[i].value.type) {
                var data = this.getFields(rows[i]).slice(3);
                var data = row.slice(3);
                var value = data[0].value || 0;
                this.max = (value > this.max) ? value : this.max;
            }
        }
    }
    return this.max;
}

module.exports = handler;

