/*!
  ICanHaz.js -- by @HenrikJoreteg
*/
/*global jQuery  */
function ICanHaz() {
    var self = this;
    self.VERSION = "@VERSION@";
    self.templates = {};
    self.partials = {};
    
    // public function for adding templates
    // We're enforcing uniqueness to avoid accidental template overwrites.
    // If you want a different template, it should have a different name.
    self.addTemplate = function (name, templateString) {
        if (self[name]) throw "Invalid name: " + name + ".";
        if (self.templates[name]) throw "Template " + name + " exists";

        self.templates[name] = templateString;
        self[name] = function (data, raw) {
            data = data || {};
            var result = Mustache.to_html(self.templates[name], data, self.partials);
            return raw ? result : $(result);
        };
    };

    // public function for adding partials
    self.addPartial = function (name, templateString) {
        if (self.partials[name]) {
            throw "Partial " + name + " exists";
        } else {
            self.partials[name] = templateString;
        }
    };

    // grabs templates from the DOM and caches them.
    // Takes an optional callback function as argument that fires when all
    // templates and partials have loaded (locally embedded and remote includes).
    // Loop through and add templates.
    // Whitespace at beginning and end of all templates inside <script> tags will 
    // be trimmed. If you want whitespace around a partial, add it in the parent, 
    // not the partial. Or do it explicitly using <br/> or &nbsp;
    self.grabTemplates = function (callback) {
        var externalTemplates = {},
            externalCounter = 0;
        $('script[type="text/html"]').each(function (a, b) {
            var script = $((typeof a === 'number') ? b : a); // Zepto doesn't bind this
            if (!script.attr('src')) {
                text = (''.trim) ? script.html().trim() : $.trim(script.html());
            } else {
                var id = script.attr('id') || externalCounter++;
                var src = script.attr('src');
                externalTemplates[id] = src;
            }
            self[script.hasClass('partial') ? 'addPartial' : 'addTemplate'](script.attr('id'), text);
            script.remove();
        });

        // load the external templates
        if (externalTemplates != {}) {
            self.loadTemplates(externalTemplates, callback);
        }
    };

    // ajax-load external template files.
    // you may specify either an array of urls (the templates
    // will be available under their basenames) or specify
    // an object (the templates will be available under the key-name).
    // filenames with leading underscores will be interpreted as partial
    // (inspired by rails' behaviour
    //
    // after successful loading, an optional callback will be called.
    // this allows for lazy-loading of templates.
    //
    // ich.loadTemplates({
    //   start:'js/templates/start.mustache',
    //   test: 'other/path/test.mustache'
    // }, callback);
    //
    // *OR*
    //
    // loadTemplates([
    //   'javascripts/templates/start.mustache',
    //   'other/path/test.mustache'
    // ], callback);
    self.loadTemplates = function (templates, callback) {
        var loads = 0,
            key,
            src,
            basename = /([^\/]+)\.[^.]+$/;
 
        for (item in templates) {
            if (templates.hasOwnProperty(item)) {
                if (/^\d+$/.test(item)) {
                    key = templates[item].match(basename)[1];
                } else {
                    key = item;
                }

                // kick off loading for this item
                loads++;
                loadNext(key, templates[item]);
            }
        }

        // handles loading of one url
        function loadNext(key, url) {
            $.ajax({
                url: url,
                success: function (data) {
                    if (key[0] === '_') {
                        ich.addPartial(key.substr(1), data);
                    } else {
                        ich.addTemplate(key, data);
                    }
                    if (--loads <= 0 && typeof(callback) === 'function') {callback();}
                },
                error: function (xhr, type) {
                    if (--loads <= 0 && typeof(callback) === 'function') {callback();}
                    throw 'error while loading '+url+': '+type;
                }
            });
        }
    };

    // clears all retrieval functions and empties caches
    self.clearAll = function () {
        for (var key in self.templates) {
            delete self[key];
        }
        self.templates = {};
        self.partials = {};
    };

    self.refresh = function (callback) {
        self.clearAll();
        self.grabTemplates(callback);
    };
}

window.ich = new ICanHaz();

// init itself on document ready
$(function () {
    ich.grabTemplates();
});
