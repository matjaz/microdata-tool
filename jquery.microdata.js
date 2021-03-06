(function($) {    
    var items = [], widget,
    
        // CSS styles injected into head
        // TODO: need to clean this up or externalize it
        cssBlock = "#microdata-container { " +
                   "position: fixed; bottom: 10px; left: 10px; background: white; padding: 5px; color: #444; " +
                   "-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; border: 1px solid black; " +
                   "-webkit-box-shadow: 0 0 5px black; -moz-box-shadow: 0 0 5px black; box-shadow: 0 0 5px; " +
                   "font: normal 11px Droid Sans Mono, Consolas, Inconsolata, monospace; letter-spacing: -1px; " +
                   "}\n" +
                   "#microdata-container li { list-style: none; padding: 0; margin: 0; cursor: pointer; }\n" +
                   "#microdata-container>li.expanded ul { display: block; }\n" +
                   "#microdata-container li:hover { background: #ff9 }\n" +
                   "#microdata-container ul { display: none; padding: 0; margin-left: 10px; color: #999 }\n" +
                   ".microdata-highlighted { outline: 5px dashed red !important; background: yellow !important }\n" +
                   "#microdata-container .invalid { color: red !important }",
                   
        
        // validators for values in microdata
        validators = {
            text:      function(value, el) { return $.trim(value).length > 0; },
            
            url:       function(value, el) { return /^https?:\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&amp;:/~\+#]*[\w\-\@?^=%&amp;/~\+#])?$/.test(value); },
            
            int:       function(value, el) { return /^\d+$/.test(value); },
            
            float:     function(value, el) { return /^\d+([.,]\d*)?$/.test(value); },
            
            // TODO: need a proper datetime validator
            datetime:  function(value, el) { return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/.test(value); },
            
            // TODO: check the duration per http://en.wikipedia.org/wiki/ISO_8601#Durations
            duration:  function(value, el) { return /^P(([0-9.,]+[YMD])*(T[0-9.,]+[HMS])*|[0-9.,]W)$/.test(value); },
            
            // TODO: complex types require other nested entities or special treatment
            complex:   function(value, el) { return true; },
            
            // TODO: check three-letter ISO code for currency: http://www.iso.org/iso/support/faqs/faqs_widely_used_standards/widely_used_standards_other/currency_codes.htm
            currency:  function(value, el) { return /^[a-zA-Z]{3}$/.test(value); },
            
            any: function(value, el) { return true; }
        },
        
        
        // would love it if I could externalize this via cached web service
        validationRules = {
            "http://data-vocabulary.org/Event" :
                [
                     { name: "summary",     required: true,  type: "text",     validator: validators.text     },
                     { name: "url",         required: false, type: "url",      validator: validators.url      },
                     { name: "location",    required: false, type: "complex",  validator: validators.complex  }, // optionally represented by data-vocabulary.org/Organization or data-vocabulary.org/Address
                     { name: "description", required: false, type: "text",     validator: validators.text     },
                     { name: "startdate",   required: true,  type: "datetime", validator: validators.datetime },
                     { name: "enddate",     required: false, type: "datetime", validator: validators.datetime },
                     { name: "duration",    required: false, type: "duration", validator: validators.duration },
                     { name: "eventtype",   required: false, type: "text",     validator: validators.text     },
                     { name: "geo",         required: false, type: "complex",  validator: validators.complex  }, // represented by itemscope with two properties: latitude and longitude
                     { name: "photo",       required: false, type: "url",      validator: validators.url      } 
                ],
                
            "http://data-vocabulary.org/Person" :
                [
                     { name: "name",         required: false, type: "text",    validator: validators.text    },
                     { name: "fn",           required: false, type: "text",    validator: validators.text    }, // alias for "name"
                     { name: "nickname",     required: false, type: "text",    validator: validators.text    },
                     { name: "photo",        required: false, type: "url",     validator: validators.url     },
                     { name: "title",        required: false, type: "text",    validator: validators.text    },
                     { name: "role",         required: false, type: "text",    validator: validators.text    },
                     { name: "url",          required: false, type: "url",     validator: validators.url     },
                     { name: "affiliation",  required: false, type: "text",    validator: validators.text    },
                     { name: "org",          required: false, type: "text",    validator: validators.text    }, // alias for "affiliation"
                     { name: "address",      required: false, type: "complex", validator: validators.complex }, // can have subproperties street-address, city, region, postal-code, country-name
                     { name: "adr",          required: false, type: "complex", validator: validators.complex }, // alias for "address"
                     { name: "friend",       required: false, type: "url",     validator: validators.url     },
                     { name: "contact",      required: false, type: "url",     validator: validators.url     },
                     { name: "acquaintance", required: false, type: "url",     validator: validators.url     }
                     // NOTE: to define "friend", "contact" or "acquaintance", you can also use XFN rel="..."
                ],
            
            "http://data-vocabulary.org/Organization" :
                [
                     { name: "name",    required: false, type: "text",    validator: validators.text    },
                     { name: "fn",      required: false, type: "text",    validator: validators.text    }, // alias for "name"
                     { name: "org",     required: false, type: "text",    validator: validators.text    }, // alias for "name"
                     { name: "url",     required: false, type: "url",     validator: validators.url     },
                     { name: "address", required: false, type: "complex", validator: validators.complex },
                     { name: "adr",     required: false, type: "complex", validator: validators.complex }, // alias for "address"
                     { name: "tel",     required: false, type: "text",    validator: validators.text    },
                     { name: "geo",     required: false, type: "complex", validator: validators.complex }
                ],
                
            "http://data-vocabulary.org/Offer" :
                [
                     { name: "price",           required: false, type: "float",    validator: validators.float    },
                     { name: "currency",        required: false, type: "text",     validator: validators.currency },
                     { name: "pricevaliduntil", required: false, type: "datetime", validator: validators.datetime },
                     { name: "seller",          required: false, type: "complex",  validator: validators.complex  }, // can contain a Person or Organization
                     {
                         name: "condition",     required: false, type: "complex",
                         validator: function(value, el) {
                             return $(el).hasAttr('content') && $.inArray($(el).attr('content').toLowerCase(), ["new", "used", "refurbished"]);
                         }
                     }, 
                     {
                         name: "availability",  required: false, type: "complex",
                         validator: function(value, el) { 
                             return $(el).hasAttr('content') && $.inArray($(el).attr('content').toLowerCase(), ["out_of_stock", "in_stock", "instore_only", "preorder"]);
                         }
                     },
                     { name: "offerurl",        required: false, type: "url",      validator: validators.url      }, // points to a product web page that includes the offer
                     { name: "identifier",      required: false, type: "text",     validator: validators.text     }, // recognizes ASIN, ISBN, MPN, UPC, SKU; suggests including product prand and at least one of the identifiers
                     { name: "itemoffered",     required: false, type: "complex",  validator: validators.complex  }  // can contain free text, a Product or other item types
                ]
        };
    
    /**
     * Updates the list of microdata elements on the page
     */
    var refreshList = function() {
        items = $('[itemscope]', $.microdata.defaults.scope);
    };
    
    /**
     * Removes all microdata objects from widget
     */
    var clearObjects = function() {
        widget.children().remove();
    };
    
    
    /**
     * Adds a microdata object to the widget and adds a hover
     * handler to highlight the relevant element
     */
    var addObject = function(element, mdata) {
        var type = mdata.type,
            t = $('<li title="' + type + '">' + (validators.url(type)? '<a href="' + type + '">' + type.replace(/^.*\//, '') + '</a>': "[no vocabulary]") + '</li>').appendTo(widget),
            u = $('<ul/>').appendTo(t), rules = [], required = [], rule, prop, validationExists = false;
        
        if(mdata.properties.length > 0) {
            if(validationRules.hasOwnProperty(type)) {
                rules = validationRules[type];
                required = $.grep(rules, function(item) { return item.required; });
                validationExists = true;
            }
            for(var i = 0; i < mdata.properties.length; i++) {
                prop = $('<li>' + mdata.properties[i].name + ' = ' + mdata.properties[i].value + '</li>').appendTo(u);
                
                // if validation is present, validate the properties
                if(validationExists) {
                    rule = $.grep(rules, function(item) { return item.name == mdata.properties[i].name.toLowerCase(); });
                    
                    // pop the field from the required list
                    required = $.grep(required, function(item) { return item.name == mdata.properties[i].name.toLowerCase(); }, true);
                    
                    if(rule.length > 0 && !rule[0].validator(mdata.properties[i].value)) {
                        prop.addClass("invalid");
                    }
                }
            }
            
            // any required properties not defined are appended to the list
            if(required.length > 0) {
                for(var i = 0; i < required.length; i++) {
                    $('<li class="invalid">missing property: ' + required[i].name + '</li>').appendTo(u);
                }
            }
        } else {
            u.append('[no properties]');
        }
        
        t.hover(
            function() { $(element).addClass('microdata-highlighted'); },
            function() { $(element).removeClass('microdata-highlighted'); }
        ).click(function() { t.toggleClass('expanded'); return false; });
        
    };
    
    
    /**
     * Updates the list of microdata objects in the widget
     */
    var updateList = function() {
        
        clearObjects();
        refreshList();
        
        if(items.length == 0) {
            $('<li class="invalid">No microdata objects detected!</li>').appendTo(widget);
            return;
        }
        
        items.each(function() { addObject(this, parseElement(this)); });
    };
    
    
    // this function fires on DOMready
    var init = function() {
        $('<style type="text/css">' + cssBlock + '</style>').appendTo('head');
        widget = $('<ul id="microdata-container"/>').appendTo('body');
        
        updateList();
    };
    
    var parseElement = function(el) {
        if(!el.jquery) el = $(el);
        // if the element in question isn't an itemscope, return null
        if(!el.hasAttr('itemscope')) return null;
        
        var propElements = el.find('[itemprop]'), props = [];
        propElements.each(function() {
            var $p = $(this), propname = $p.attr('itemprop').toLowerCase().split(' ');
            
            for (var i = 0; i < propname.length; i++) {
                var v = $p.text();

                if ($p.is('a,area,link'))
                    v = $p.attr('href');
                else if ($p.is('audio,embed,iframe,img,source,video'))
                    v = $p.attr('src');
                else if ($p.is('object'))
                    v = $p.attr('data');
                else if ($p.is('time')) v = $p.attr('datetime') || $p.text();
                
                props.push({
                    name : propname[i],
                    value : v
                });
            }
        });
        
        return { type: el.attr('itemtype') || "", properties: props };
    };
    
    
    // expose functions for use by outside scripts via plugin
    $.microdata = {
        getItems: function() { return items; },
        updateList: updateList,
        parseElement: parseElement,
        defaults: {
            scope: 'body'
        }
    };
    
    $.fn.hasAttr = function(name) {
        return typeof this.attr(name) !== 'undefined' || this.attr(name) !== false;
    };
    
    
    // init the drop-in script
    $(init);
})(jQuery);