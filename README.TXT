/**
 * jQuery Multicombo v0.4 - by @koosvdkolk
 **/
Transforms select lists into searchable combo lists

Example: http://www.in-silico.nl/multicombo/

Dependencies: jQuery 1.6+

Usage: 
 - call jQuery('#mySelect').multiCombo(options) to initialize
 - call jQuery('#mySelect').data('multicombo').val(array) to get/set values (just like jQuery's val function)

Where options (optional) is an object:

{
      "defaultSelectSize": 5,
      "expandedSelectSize": 15,
      "layoutFolder": "layout/",
      "classes":
      {
        "toLeftButton": "multicomboToLeftButton",
        "mainElement": "multicombo",
        "toRightButton": "multicomboToRightButton"
      }
}

 
Copyright (c) 2013-2014 Koos van der Kolk https://github.com/koosvanderkolk
Dual licensed under the MIT and GPL licenses (same as jQuery).
http://docs.jquery.com/License
