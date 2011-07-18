/*!
  ICanHaz.js -- by @HenrikJoreteg
*/
/*global jQuery  */
function ICanHaz() {
    var self = this,
        activeSequence = 0,
        pendingRequestCounter = 0,
        loadingCallbacks = [],

        // Firing all callbacks when calling grabTemplates repeatedly.
        // eg. pre-load templates with:
        // $(function () {ich.grabTemplates(function () {
        //   ... all templates are now ready for use ...
        // });})
        finishedLoading = function () {
            var callbacks = loadingCallbacks;
            loadingCallbacks = [];
            for (var i = 0; i < callbacks.length; i++) {
                callbacks[i]();
            }
        },

        // check the <script> tag for type and name of the template/partial
        // if no ("id" attribute) is found then parse it from the "src" path
        add = function (script, text) {
            var type = script.hasClass('partial')
                    ? 'addPartial'
                    : 'addTemplate',
                name = script.attr('id')
                    || script.attr('src')
                        .split(/[\\\/]/).pop() // chop directory path
                        .split(/[\.\?\#]/).shift(); // chop extension, fragment, query
            self[type](name, text);
        };

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
        var embeddedTemplates = $('script[type="text/html"]:not([src])'),
            remoteTemplates = $('script[type="text/html"][src]'),
            requestSequence = activeSequence;

        if (callback) loadingCallbacks.push(callback);

        // parse templates embedded in <script> tags 
        embeddedTemplates.each(function (a, b) {
            var script = $((typeof a === 'number') ? b : a),
                text = (''.trim) ? script.html().trim() : $.trim(script.html());
            add(script, text);
            script.remove();
        });

        // fetch external templates specified via "src" attribute
        pendingRequestCounter += remoteTemplates.length;
        remoteTemplates.each(function (a, b) {
            var script = $((typeof a === 'number') ? b : a);
            script.detach();
            $.ajax({url: script.prop('src'), dataType: 'text',
                success: function (template) {
                    if (requestSequence === activeSequence) {
                        var text = (''.trim) ? template.trim() : $.trim(template);
                        add(script, text);
                    }
                },
                error: function () {
                    throw "Failed to load remote template " + script.prop('src');
                },
                complete: function () {
                    script.remove();
                    if (requestSequence === activeSequence && --pendingRequestCounter === 0)
                        finishedLoading();
                }
            });
        });

        if (pendingRequestCounter === 0) finishedLoading();
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
            names,
            title,
            basename = /([^\/]+)\.[^.]+$/;

        // enables String-Array-format for loading
        if (templates instanceof Array) {
            var i,
                l = templates.length;

            names = {};
            for (i = 0; i<l; i++) {
                title = templates[i].match(basename);
                names[title[1]] = templates[i];
            }
        } else {
            names = templates;
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

        // kick off loading
        for (var key in names) {
            loads++;
            loadNext(key, names[key]);
        }
    };

    // clears all retrieval functions and empties caches
    // resets any previous callbacks
    self.clearAll = function () {
        for (var key in self.templates) {
            delete self[key];
        }
        self.templates = {};
        self.partials = {};
        activeSequence++;
        pendingRequestCounter = 0;
        loadingCallbacks = [];
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
