function handler (req, identifier, config, layer, urlSchema) {
    require('display').handlers.base.call(this, req, identifier, config);
    this.layer = layer;
    this.urlSchema = urlSchema;
}

require('sys').inherits(handler, require('display').handlers.base);

handler.prototype.setOverrides = function(row) {
    if (this.settings._overrideKey) {
        var value = this.getFieldValue(row, this.settings._overrideKey);
        if (value) {
            if (this.config['settings_' + value]) {
                for (var key in this.config['settings_' + value]) {
                    this.settings[key] = this.config['settings_' + value][key];
                }
                return true;
            }
        }
    }
    return false;
}

handler.prototype.makeResourceURL = function(resource) {
    // @TODO throw error if mapPublicURL is not defined.
   var publicURL = require('expresslane').app.set('settings')('mapPublicURL');
    var params = {};
    for (var key in this.req.params) {
        params[key] = this.req.params[key];
    }
    params.resource = resource;
    params.layer = this.identifier;
    return publicURL + this.replaceTokens(this.urlSchema, {}, params);
};

handler.prototype.json = function(layer, rows) {
    this.setOverrides(rows.length ? rows[0] : {});
    layer.stylewriter.url_mml = this.makeResourceURL('mml');
    layer.stylewriter.url_stylewriter = require('expresslane').app.set('settings')('mapTileLiveURL');
    layer.stylewriter.url_stylewriter += '/tile/${mapfile}/${z}/${x}/${y}.${format}';
    return layer;
};

handler.prototype.geojson = function(row) {
    this.setOverrides(row ? row : {});

    var fields = this.getFields(row);
    var properties = {};
    var values = [];

    // Split fields into meta & data.
    var meta = fields.slice(0, 3);
    var data = fields.slice(3);
    var id = meta[0].value;
    var foreign = meta[1].value;
    var name = meta[2].value;

    // Handle data.
    for (var i = 0, l = data.length; i < l; i++) {
        var field = data[i];
        if (typeof field.value !== 'undefined') {
            properties[field.field] = parseFloat(field.value);
            properties['_' + field.field + '_null'] = 0;
            values.push(require('display').util.ac(field.value));
        }
        else {
            // This is a workaround for the fact that Cascadenik
            // cannot do mixed type comparisons on the same field.
            properties[field.field] = 0;
            properties['_' + field.field + '_null'] = 1;
        }
    }

    properties[this.identifier + '_name'] = "<a href='" + this.replaceTokens(this.config.settings.path, row) + "'>" + name + "</a>";
    properties[this.identifier + '_description'] = values.join(' / ') + ' <small>(' + this.layer.title + ' - ' + this.layer.description + ')</small>';
    return properties;
};

handler.prototype.mml = function(rows) {
    this.setOverrides(rows.length ? rows[0] : {});

    return {};
};

module.exports = handler;

