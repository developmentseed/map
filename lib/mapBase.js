function handler (req, identifier, config, layer, urlSchema) {
    require('display').handlers.base.call(this, req, identifier, config);
    this.layer = layer;
    this.urlSchema = urlSchema;
}

require('sys').inherits(handler, require('display').handlers.base);

handler.prototype.json = function(layer, rows) {
    layer.stylewriter.url_mml = ''; // 'http://' + [app.set('settings')('publicHostname'), 'map', req.param('section'), res.params.entityType, identifier + '.mml'].join('/');
    layer.stylewriter.url_stylewriter = ''; // 'http://' + [app.set('settings')('tileLiveHostname'), 'tile/${mapfile}/${z}/${x}/${y}.${format}'].join('/');
    return layer;
};

handler.prototype.geojson = function(row) {
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

handler.prototype.mml = function(row) {
    return {};
};

module.exports = handler;

