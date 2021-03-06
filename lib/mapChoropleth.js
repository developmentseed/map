function handler (req, identifier, config, layer, urlSchema) {
    require('display').handlers.mapBase.call(this, req, identifier, config, layer, urlSchema);
}

require('sys').inherits(handler, require('display').handlers.mapBase);

handler.prototype.json = function(layer, rows) {
    layer = require('display').handlers.mapBase.prototype.json.call(this, layer, rows);

    // Generate layer keymap.
    var keymap = {};
    var display = require('display');
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
                values.push(display.util.ac(data[j].value));
            }
        }

        // Display 'no data' message for features without values.
        if (values.length === 0) {
            values.push('No data');
        }

        keymap[foreign] = {
            name: "<a href='" + this.replaceTokens(layer.stylewriter.settings.path, rows[i]) + "'>" + name + "</a>",
        };

        var tooltipLabel = '';
        switch (this.settings.tooltipFormat) {
            case 'pct':
                switch (this.settings.mode) {
                    // TODO: Implementing other modes here would result in code
                    // duplicated from the mml() method. This could use a
                    // refactor to make separate methods for each mode.
                    case 'delta':
                        if ((data[0] && typeof data[0].value !== 'undefined') && (data[1] && typeof data[1].value !== 'undefined')) {
                            var a = data[0].value || 0;
                            var b = data[1].value || 0;
                            tooltipLabel = (a + b) === 0 ? 1 : a / (a+b) + '%';
                        }
                        else {
                            tooltipLabel = 'No data';
                        }
                        break;
                    case 'portion':
                        // Compare the two values and determine the percent change.
                        if ((data[0] && typeof data[0].value !== 'undefined') && (data[1] && typeof data[1].value !== 'undefined')) {
                            var a = data[0].value || 0;
                            var b = data[1].value || 0;
                            tooltipLabel = Math.round(a / b * 100) + '%';
                        }
                        else {
                            tooltipLabel = 'No data';
                        }
                        break;
                    default:
                        tooltipLabel = values.join(' / ');
                        break;
                }
                break;
            default:
                tooltipLabel = values.join(' / ');
                break;
        }
        keymap[foreign].description = tooltipLabel + ' <small>(' + layer.title + (layer.description ? ' - ' + layer.description : '') + ')</small>';

    };
    // Stringify for templating.
    layer.stylewriter.join_field = this.settings.key;
    layer.stylewriter.keymap = JSON.stringify(keymap);
    layer.stylewriter.symbolizer = 'polygon';
    return layer;
};

handler.prototype.mml = function(rows) {
    require('display').handlers.mapBase.prototype.mml.call(this, rows);

    var color_ramp = this.settings.colors;
    var color_null = this.settings.colorsNull || '#000';
    var metaConfig = this.config.fields.slice(0, 3);
    var dataConfig = this.config.fields.slice(3);
    var rules = [];
    var values = [];

    // Generate a set of values between 0 and 1 representing one of the
    // different calculations for choropleth shading.
    switch (this.settings.mode) {
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
    case 'portion':
        var max = 0;
        var min = 1;
        for (var i = 0, l = rows.length; i < l; i++) {
            var fields = this.getFields(rows[i]);
            var meta = fields.slice(0, 3);
            var data = fields.slice(3);
            var foreign = meta[1].value;
            if ((data[0] && typeof data[0].value !== 'undefined') && (data[1] && typeof data[1].value !== 'undefined')) {
                var a = data[0].value || 0;
                var b = data[1].value || 0;
                var value = a / b;
            }
            else {
                var value = null;
            }
            values.push({foreign: foreign, value: value});
            if (Math.abs(value) > max) {
                max = Math.abs(value);
            }
            if (value != null && Math.abs(value) < min) {
                min = Math.abs(value);
            }
        }
        for (var i = 0, l = values.length; i < l; i++) {
            if (values[i].value !== null) {
                // Scale to use all available colors
                values[i].value = (values[i].value - min) / (max - min);
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
            id: this.identifier,
            selector: [this.settings.key + ' = ' + values[i].foreign],
            properties: { polygonFill: color, polygonOpacity: 0.6 }
        });
    }
    return {
        rules: rules,
        layers: [
            {
                file: this.settings.file,
                type: this.settings.type,
                id: this.identifier,
                name: this.identifier
            }
        ]
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

