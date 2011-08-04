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
        if (self.templates[name]) throw "Template \" + name + \" exists";
        
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
            throw "Partial \" + name + \" exists";
        } else {
            self.partials[name] = templateString;
        }
    };
    
    // grabs templates from the DOM and caches them.
    // Loop through and add templates.
    // Whitespace at beginning and end of all templates inside <script> tags will 
    // be trimmed. If you want whitespace around a partial, add it in the parent, 
    // not the partial. Or do it explicitly using <br/> or &nbsp;
    self.grabTemplates = function () {        
        $('script[type="text/html"]').each(function (a, b) {
            var script = $((typeof a === 'number') ? b : a), // Zepto doesn't bind this
                text = (''.trim) ? script.html().trim() : $.trim(script.html());
            
            self[script.hasClass('partial') ? 'addPartial' : 'addTemplate'](script.attr('id'), text);
            script.remove();
        });
    };
    
    // ajax-load external template files.
    // you may specify either an array of urls (the templates
    // will be available under their basenames) or specify
    // an object (the templates will be available under the key-name).
    //
    // after successful loading, an optional callback will be called.
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
    				ich.addTemplate(key, data);
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
    self.clearAll = function () {
        for (var key in self.templates) {
            delete self[key];
        }
        self.templates = {};
        self.partials = {};
    };
    
    self.refresh = function () {
        self.clearAll();
        self.grabTemplates();
    };
}

window.ich = new ICanHaz();

// init itself on document ready
$(function () {
    ich.grabTemplates();
});