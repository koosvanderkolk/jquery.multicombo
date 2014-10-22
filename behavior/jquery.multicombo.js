/**
 * jQuery Multicombo v0.41 - by @koosvdkolk
 *
 * Transforms select lists into searchable combo lists
 *
 * Dependencies: jQuery 1.6+
 *
 * Copyright (c) 2013 Koos van der Kolk https://github.com/koosvanderkolk
 * Dual licensed under the MIT and GPL licenses (same as jQuery).
 * http://docs.jquery.com/License
 **/
(function ($) {
  "use strict"; //ECMA5 strict mode

  $.multicombo = function (select, options) {
    var startTimestamp = new Date().getTime();
    var defaults = {
      "defaultSelectSize": 5,
      "expandedSelectSize": 15,
      "layoutFolder": "layout/",
      "filterTimeout": 300,
      "autoWidth": true,
      "lazyLoad": true, /* multicombos will be lazy loaded */
      "fitToElement": undefined,
      "leftPlaceholderText": undefined, /* text for the input placeholder */
      "rightPlaceholderText": undefined, /* text for the input placeholder */
      "placeholderText": undefined, /* overrules leftPlaceholderText and rightPlaceholderText */
      "classes":
              {
                "toLeftButton": "multicomboToLeftButton",
                "mainElement": "multicombo",
                "toRightButton": "multicomboToRightButton"
              }
    };

    var plugin = this;
    var disabled = false;

    plugin.settings = {};
    plugin.settings = $.extend({}, defaults, options);

    var leftSelectOptionsDataObj = {};
    var rightSelectOptionsDataObj = {};
    var totalNumberOfOptions = 0;
    var originalSelect = $(select).clone(true, true);

    /* container for all gui elements with events */
    var gui = {};

    /* dom elements
     */

    /* main element */
    gui.container = $('<div class="' + plugin.settings.classes.mainElement + '"></div>');

    /* selects */
    gui.leftSelect = $(select);
    gui.rightSelect = $('<select></select>');
    gui.leftSelectParent = undefined;
    gui.rightSelectParent = undefined;


    /* search inputs */
    gui.leftSearch = $('<input type="text" />');
    gui.rightSearch = $('<input type="text" />');

    //apply placeholder text
    if (plugin.settings.placeholderText !== undefined) {
      plugin.settings.leftPlaceholderText = plugin.settings.placeholderText;
      plugin.settings.rightPlaceholderText = plugin.settings.placeholderText;
    }

    if (plugin.settings.leftPlaceholderText !== undefined) {
      gui.leftSearch.attr('placeholder', plugin.settings.leftPlaceholderText);
    }

    if (plugin.settings.rightPlaceholderText !== undefined) {
      gui.rightSearch.attr('placeholder', plugin.settings.rightPlaceholderText);
    }

    /* move buttons */
    gui.toLeftButton = $('<button class="' + plugin.settings.classes.toLeftButton + '" type="button">&lt;</button>');
    gui.toRightButton = $('<button class="' + plugin.settings.classes.toRightButton + '"  type="button">&gt;</button>');

    /* (single only) */

    //open list button
    gui.openListButton = $('<span style="width: 20px"><img src="' + plugin.settings.layoutFolder + 'open_list.png" /></span>');

    //select row
    gui.selectRow = $('<div style="display:none;position:absolute; z-index:9999;"></div>');

    /**
     * Initializes the plugin
     **/
    plugin.init = function () {
      /* copy some css properties from select to new container element */
      var i, cssPropertiesToCopy = ["display"];
      for (i = 0; i < cssPropertiesToCopy.length; i++) {
        gui.container.css(cssPropertiesToCopy[i], gui.leftSelect.css(cssPropertiesToCopy[i]));
      }
      totalNumberOfOptions = gui.leftSelect.children().length;

      /* init function depends on multiple attribute */
      if (gui.leftSelect.attr('multiple') === 'multiple' || gui.leftSelect.attr('multiple') === true) {
        plugin.settings.type = 'multiple';
        initGuiMultiple();
        plugin.val(gui.leftSelect.val());


      } else {
        plugin.settings.type = 'single';
        plugin.settings.expandedSelectSize = 20;
        initGuiSingle();

        gui.leftSearch.val(plugin.text());
      }
    };

    /**
     * Gets or sets the value of the combo
     * @param array values (optional) An array of values. If omitted, the
     *                       function returns the currently selected values
     **/
    plugin.val = function (values) {
      var key, returnArray = [];
      var currentLeftFilterText, currentRightFilterText;

      if (values === undefined) {
        if (gui.container.hasClass('busy')) {
          /* multicombo still dirty, let it load new values */
          gui.container.data('valfunction')();
        }
        /* get value */
        if (plugin.settings.type === 'multiple') {
          /* multiple, get all values from right select */
          if (rightSelectOptionsDataObj !== undefined) {
            for (key in rightSelectOptionsDataObj) {
              returnArray.push(key);
            }
          }
        } else {
          /* single, use jQuery */
          return gui.leftSelect.val();
        }

      } else {
        /* set value */


        if (plugin.settings.type === 'multiple') {
          var valFunction = function () {
            /* multiple */
            detachSelects();

            //clear filters
            currentLeftFilterText = gui.leftSearch.val();
            filterSelect('', 'left', false, false);

            currentRightFilterText = gui.rightSearch.val();
            filterSelect('', 'right', false, false);

            //select and move options from right to left
            gui.rightSelect.val(values);
            gui.rightSelect.children().each(function () {
              var $option = jQuery(this);

              //inverse selection
              if ($option.attr('selected') === true || $option.attr('selected') === 'selected') {
                $option.removeAttr('selected');
              } else {
                $option.attr('selected', 'selected');
              }
            });
            moveOptions('left');

            //select and move options from left to right
            gui.leftSelect.val(values);
            moveOptions('right');

            //reset filters
            gui.leftSearch.val(currentLeftFilterText);
            filterSelect(currentLeftFilterText, 'left');

            gui.rightSearch.val(currentRightFilterText);
            filterSelect(currentRightFilterText, 'right');

            gui.container.removeClass('busy');
            gui.container.data('valfunction', null);

            attachSelects();
          };

          /* lazy loading or not? */

          if (plugin.settings.lazyLoad === true && totalNumberOfOptions > 200) {
            gui.container.data('valfunction', valFunction);
            gui.container.one('mouseenter', gui.container.data('valfunction'));
            gui.container.addClass('busy');
          } else {
            valFunction();
          }


        } else {
          /* single */
          gui.leftSelect.val(values);
          gui.leftSearch.val(gui.leftSelect.children('[value="' + values + '"]').text());
          gui.selectRow.hide();
        }

      }

      return returnArray;
    };

    /**
     * Returns the text of the selected options
     * @returns {string|returnArray}
     */
    plugin.text = function () {
      var key, returnArray = [];

      if (plugin.settings.type === 'multiple') {
        if (rightSelectOptionsDataObj !== undefined) {
          for (key in rightSelectOptionsDataObj) {
            returnArray.push(rightSelectOptionsDataObj[key].text);
          }
        }
        return returnArray;
      } else {
        var option = gui.leftSelect.children().filter(":selected")[0];
        if (option) {
          return $(option).text();
        } else {
          return null;
        }
      }
    };

    /**
     * Creates and returns a clone of the multicombo's original select
     */
    function cloneOriginalSelect() {
      return originalSelect.clone(true, true);
    }

    /**
     * Removes the multicombo and turns the select into its dull former self
     * @todo: implement
     */
    plugin.destroy = function () {
      var originalSelectClone = cloneOriginalSelect();
      var currentValue = plugin.val();

      gui.container.replaceWith(originalSelectClone);
      originalSelectClone.val(currentValue);


      /**
       * Remove garbage
       */

      /* remove bindings */
      originalSelectClone.unbind('.multicombo');


      /* remove references to prevent memory leakage */
      for (var uie in gui) {
        gui[uie] = null;
      }
      gui = null;
    };

    /**
     * Lets the plugin return to the initial state
     */
    plugin.clear = function () {
      gui.leftSearch.val('');
      gui.rightSearch.val('');
      plugin.val([]);
      filterSelect('', 'left', false, true);
      filterSelect('', 'right', false, true);
    };

    plugin.setWidth = function (width) {
      gui.leftSelect.width(width);
      gui.rightSelect.width(width);
      resetSearchWidth();
    };

    /**
     * Binds an event
     * @param {string} eventName Rowonclick, rowondoubleclick
     * @param {object} callback
     **/
    plugin.bind = function (eventName, callback) {
      eventName = eventName.toLowerCase();

      gui.leftSelect.bind('multicombo.' + eventName, callback);
    };

    /**
     * Disables the multicombo
     */
    plugin.disable = function () {
      gui.leftSelect.prop('disabled', true);
      gui.rightSelect.prop('disabled', true);
      gui.leftSearch.prop('disabled', true);
      gui.rightSearch.prop('disabled', true);

      disabled = true;
    }

    /**
     * Enables the multicombo
     */
    plugin.enable = function () {
      gui.leftSelect.prop('disabled', false);
      gui.rightSelect.prop('disabled', false);
      gui.leftSearch.prop('disabled', false);
      gui.rightSearch.prop('disabled', false);

      disabled = false;
    }

    /**
     * Inits the GUI in case of a single select
     **/
    function initGuiSingle() {
      var $tr;
      var numberOfOptions = gui.leftSelect.children().length;
      var selectWidth = gui.leftSelect.width();

      /* create ui
       */

      /* replace select with new container element */
      gui.leftSelect.before(gui.container);

      /* fill container */
      var $table = jQuery('<div></div>');
      var $tbody = jQuery('<div></div>');
      $table.append($tbody);

      /* row with search inputs */
      $tr = jQuery('<div></div>');
      $tr.append($('<div></div>').append(gui.leftSearch, gui.openListButton));

      $tbody.append($tr);

      /* row with select */
      gui.selectRow.append($('<div></div>').append(gui.leftSelect));
      $tbody.append(gui.selectRow);

      gui.leftSelectParent = gui.leftSelect.parent();
      gui.rightSelectParent = gui.rightSelect.parent();

      /* append table and do some settings */
      gui.container.append($table);

      /* store width */
      plugin.settings.selectContainerWidth = $tr.width();

      //layout of selects
      gui.leftSelect.attr({
        "multiple": false,
        "size": (numberOfOptions <= plugin.settings.expandedSelectSize ? numberOfOptions : plugin.settings.expandedSelectSize)
      });


      if (plugin.settings.autoWidth === true) {
        if (plugin.settings.fitToElement !== undefined) {
          var maxWidth = plugin.settings.fitToElement.width();
          if (selectWidth > maxWidth) {
            selectWidth = maxWidth;
          }
        }

        gui.leftSelect.css({"width": selectWidth});
      }

      //set width of search box;
      resetSearchWidth();

      //add index to left select options and store option data (for search)
      gui.leftSelect.children().each(function (index, option) {
        var $option = $(option);
        $option.attr('data-multicombo-index', index);
        $option.attr('data-multicombo-index', index);
        var value = $option.val();
        var text = $(this).text();
        var tags = $option.attr('data-multicombo-tags');

        leftSelectOptionsDataObj[value] = {"text": text, "index": index, "tags": tags};

        enhanceOption($option);
      });

      /* assign functions
       */

      /* search keyboard events */
      gui.leftSearch.bind('keyup.multicombo', function (e) {
        /* show select */
        gui.selectRow.show();

        /* check for cursor activity */
        if (e.keyCode === 38 || e.keyCode === 40) {
          /* user pressed up/down: let user move through options in select */
          gui.leftSearch.data('multicombo.usingSelect', true);
          gui.leftSelect.focus();
        } else {
          /* user pressed other key: filter */
          filterSelect($(this).val(), 'left', true);
          gui.leftSearch.data('multicombo.usingSelect', false);
        }
      });

      /* open list button */
      gui.openListButton.bind('click.multicombo', function () {
        if (disabled === false)
          gui.selectRow.toggle();
      });

      /* search focus event */
      gui.leftSearch.bind('focus.multicombo', function () {
        gui.leftSearch.data('multicombo.hasFocus', true);
        gui.selectRow.show();
      });

      /* left search click event */
      gui.leftSearch.bind('click.multicombo', function () {
        if (gui.leftSearch.data('multicombo.hasFocus') === false) {
          gui.selectRow.toggle();
        } else {
          this.select();
        }
      });

      /* search blur event */
      gui.leftSearch.bind('blur.multicombo', function () {
        gui.leftSearch.data('multicombo.hasFocus', false);

        /* get selected option value */
        gui.leftSearch.val(gui.leftSelect.children(':selected').text());

        /* hide select if user not using cursor */
        if (gui.leftSearch.data('multicombo.usingSelect') !== true) {
          gui.selectRow.hide();
        }
      });

      /* left select keyup */
      gui.leftSelect.bind('keyup.multicombo', function (e) {
        if (e.keyCode === 13 || e.keyCode === 3) {
          /* get selected option value */
          gui.leftSearch.val(gui.leftSelect.children(':selected').text());
          gui.selectRow.hide();
          onChange();
        }
      });

      /* set flag if select has focus */
      gui.leftSelect.bind('hover.multicombo', function () {
        gui.leftSearch.data('multicombo.usingSelect', true);
      });

      gui.leftSelect.bind('mouseleave.multicombo', function () {
        gui.leftSearch.data('multicombo.usingSelect', false);
      });

      /* select blur event */
      gui.leftSelect.bind('blur.multicombo', function () {
        /* set search input value */
        if (gui.leftSearch.data('multicombo.usingSelect') === true) {
          gui.leftSearch.val(gui.leftSelect.children().filter(':selected').text());
          gui.selectRow.hide();
          onChange();
        }
      });

      /* select change event */
      gui.leftSelect.bind('change.multicombo', function () {
        /* update search */
        if (gui.leftSearch.data('multicombo.usingSelect') === true) {
          gui.leftSearch.val(gui.leftSelect.children().filter(':selected').text());
        }
      });

      gui.leftSelect.bind('click.multicombo', function () {
        gui.selectRow.hide();
        onChange();
      });
    }

    /**
     * Inits the GUI in case of a multiple select
     **/
    function initGuiMultiple() {
      var $tr;
      var selectWidth = gui.leftSelect.width();

      /* create ui
       */

      /* replace select with new container element */
      gui.leftSelect.before(gui.container);

      /* fill container */
      var $table = jQuery('<table></table>');
      $table.append('<thead></thead>');
      var $tbody = jQuery('<tbody></tbody>');
      $table.append($tbody);

      /* row with search inputs */
      $tr = jQuery('<tr></tr>');
      $tr.append($('<td></td>').append(gui.leftSearch));
      $tr.append($('<td></td>'));
      $tr.append($('<td></td>').append(gui.rightSearch));

      $tbody.append($tr);

      /* row with selects */
      $tr = jQuery('<tr></tr>');
      $tr.append($('<td></td>').append(gui.leftSelect));
      $tr.append($('<td></td>').append(gui.toRightButton, '<br />', gui.toLeftButton));
      $tr.append($('<td></td>').append(gui.rightSelect));
      $tbody.append($tr);

      gui.leftSelectParent = gui.leftSelect.parent();
      gui.rightSelectParent = gui.rightSelect.parent();

      /* append table and do some settings */
      gui.container.append($table);

      //layout of selects
      gui.leftSelect.attr({
        "multiple": "multiple",
        "size": plugin.settings.defaultSelectSize
      });
      gui.rightSelect.attr({
        "multiple": "multiple",
        "size": plugin.settings.defaultSelectSize
      });

      gui.leftSelect.addClass('multicomboLeftSelect');
      gui.rightSelect.addClass('multicomboRightSelect');

      if (plugin.settings.autoWidth === true) {
        if (plugin.settings.fitToElement !== undefined) {
          var maxWidth = plugin.settings.fitToElement.width();
          if (selectWidth * 2 + 50 > maxWidth) {
            selectWidth = (maxWidth - 50) / 2;
          }
        }

        gui.leftSelect.css({"width": selectWidth});
        gui.rightSelect.css({"width": selectWidth});
      }

      //store width of select
      plugin.settings.selectContainerWidth = gui.leftSelect.parent().width();

      //set width of search box;
      resetSearchWidth();

      //add index to left select options and store option data (for search)
      gui.leftSelect.children().each(function (index, option) {
        var $option = $(option);
        $option.attr('data-multicombo-index', index);

        var value = $option.val();
        var text = $(this).text();
        var tags = $option.attr('data-multicombo-tags');

        leftSelectOptionsDataObj[value] = {"text": text, "index": index, "tags": tags};

        enhanceOption($option);
      });

      /* assign functions
       */

      gui.toLeftButton.bind('click.multicombo', function () {
        if (disabled === false) {
          moveOptions('left');
          onChange();
        }
      });
      gui.toRightButton.bind('click.multicombo', function () {
        if (disabled === false) {
          moveOptions('right');
          onChange();
        }
      });

      gui.leftSearch.bind('keyup.multicombo', function () {
        filterSelect($(this).val(), 'left');
      });
      gui.rightSearch.bind('keyup.multicombo', function () {
        filterSelect($(this).val(), 'right');
      });
    }

    /**
     * Makes sure the width of the search input equals that of the selects
     **/
    function resetSearchWidth() {
      if (plugin.settings.type === 'multiple') {
        gui.leftSearch.width(gui.leftSelect.width());
        gui.rightSearch.width(gui.rightSelect.width());
      } else {
        gui.leftSearch.width(gui.leftSelect.width() - gui.openListButton.width() - 5);
      }
    }

    /**
     * Adds events etc to an option in the select. Should be called for each
     *   option
     * @param {object} $option A jQuerified option
     **/
    function enhanceOption($option) {
      /* add events
       */
      if ($option.data('multicombo.enhanced') !== true) {
        if (plugin.settings.type === 'multiple') {
          /* double click */
          $option.bind('dblclick.multicombo', function () {
            var parent = $(this).parent()[0];
            var target = parent === gui.leftSelect[0] ? 'right' : 'left';
            moveOptions(target);
          });
        } else { //single
          /* click */
          $option.bind('click.multicombo', function () {
            var $this = jQuery(this);
            $this.attr('selected', 'selected');
            gui.leftSearch.val($this.text());
            gui.selectRow.hide();
          });
        }

        $option.data('multicombo.enhanced', true);
      }
    }

    /**
     * Enhances all options in a select
     * @param {string} target The target select: 'left' or 'right'
     */
    function enhanceOptions(target) {
      var selectData = getSelect(target);
      var $targetSelectOptions = selectData.targetSelect.children();

      $targetSelectOptions.each(function () {
        enhanceOption($(this));
      });
    }

    /**
     * Moves selected options to the other select list
     * @param {string} target The target select: 'left' or 'right'
     **/
    function moveOptions(target) {

      /* get select boxes and data */
      var selectData = getSelect(target);
      var $optionsToMove = selectData.sourceSelect.children().filter(':selected');
      var targetDataObj = selectData.targetDataObj;
      var sourceDataObj = selectData.sourceDataObj;
      var optionHTML = '';

      /* update data */
      $optionsToMove.each(function () {
        var $option = $(this);
        var value = $option.val();
        var text = $option.text();
        var index = $option.attr('data-multicombo-index');
        var tags = $option.attr('data-multicombo-tags');

        /* update data (used for search) */

        //remove it from source
        delete sourceDataObj[value];

        //add data to target
        targetDataObj[value] = {
          "text": text,
          "index": index,
          "tags": tags
        };

        optionHTML += getOptionHTML(value, targetDataObj[value]);

        //remove references, as options will be destroyed;
        $option.remove();
      });

      /* move options */
      fillSelect(optionHTML, target);
      enhanceOptions(target);

      $optionsToMove.removeAttr('selected');
    }

    /**
     * Helper function: Returns both select boxes and data, either as source
     *   or as target parameter
     * @param string targetName Which select box will be the target
     * @return object {"targetSelect": [jquerified select object],
     *                 "sourceSelect": [jquerified select object],
     *                 "targetDataObj"  : object
     *                 "sourceDataObj"  : object}
     **/
    function getSelect(targetName) {
      var $target, $source, targetDataObj, sourceDataObj;

      if (targetName === "left") {
        $target = gui.leftSelect;
        $source = gui.rightSelect;
        targetDataObj = leftSelectOptionsDataObj;
        sourceDataObj = rightSelectOptionsDataObj;
      } else {
        $target = gui.rightSelect;
        $source = gui.leftSelect;
        targetDataObj = rightSelectOptionsDataObj;
        sourceDataObj = leftSelectOptionsDataObj;
      }

      return {
        "targetSelect": $target,
        "sourceSelect": $source,
        "targetDataObj": targetDataObj,
        "sourceDataObj": sourceDataObj
      };
    }

    /**
     * Sorts options in a select
     * @param {string} target Name of the target select: 'left' or 'right'
     */
    function sortSelect(target) {
      var selectData = getSelect(target);
      var $targetSelect = selectData.targetSelect;
      var $targetOptions = $targetSelect.children();

      $targetOptions.sort(function (optionA, optionB) {
        //console.log($(optionA).attr('data-multicombo-index'), $(optionB).attr('data-multicombo-index'), parseInt($(optionA).attr('data-multicombo-index'), 10) > parseInt($(optionB).attr('data-multicombo-index'), 10));
        if (parseInt($(optionA).attr('data-multicombo-index'), 10) > parseInt($(optionB).attr('data-multicombo-index'), 10)) {
          return 1;
        } else {
          return -1;
        }
      });

      $targetSelect.empty().append($targetOptions);
    }

    /**
     * Adds option html to a select
     * @param {mixed} option  Option/options HTML or a 'jQuerified' object/collection
     * @param {string} target Name of the target select: 'left' or 'right'
     * @param {boolean} sort If true (default) the target select will be sorted
     **/
    function fillSelect(option, target, sort) {
      var selectData = getSelect(target);
      var $targetSelect = selectData.targetSelect;
      var $parent = $targetSelect.parent();

      $targetSelect.append(option);


      if (sort === undefined || sort === true) {
        sortSelect(target);
      }
    }

    /**
     * Resizes the select
     * @param string target Name of the select: 'left' or 'right'
     * @param object options  {"toggle": If true, the size will be toggled,
     *                                    if false, the select size will just
     *                                    be re-calculated,
     *                         "sizeAttr" : If true, the select's size attribute
     *                                        will be affected,
     *                         "width": If true, the select's width will be
     *                                    affected}
     **/
    function resizeSelect(target, options) {
      var defaultOptions = {
        "toggle": true,
        "sizeAttr": true,
        "width": true
      }

      if (options === undefined) {
        options = {};
      }
      options = jQuery.extend({}, defaultOptions, options);

      var expand;
      var newSize;
      var selectData = getSelect(target);
      var $targetSelect = selectData.targetSelect;
      var $sourceSelect = selectData.sourceSelect;
      var numberOfOptions = $targetSelect.children().length;

      if (options.toggle === true) {
        if ($targetSelect.data('multicombo.expanded') === true) {
          expand = false;
        } else {
          expand = true;
        }
      } else {
        expand = $targetSelect.data('multicombo.expanded');
      }


      var deltaWidth = plugin.settings.selectContainerWidth / 2;
      if (expand === true) {
        if (options.sizeAttr === true) {
          if (plugin.settings.type === 'single') {
            newSize = (numberOfOptions <= plugin.settings.expandedSelectSize ? numberOfOptions : plugin.settings.expandedSelectSize);
          } else {
            newSize = plugin.settings.expandedSelectSize;
          }

          $targetSelect.attr("size", newSize);
          $sourceSelect.attr("size", newSize);
        }

        if (options.width === true) {
          $targetSelect.width($targetSelect.width() + deltaWidth);
          $sourceSelect.width($sourceSelect.width() - deltaWidth);
        }

        $targetSelect.data('multicombo.expanded', true);
      } else {
        if (options.sizeAttr === true) {
          if (plugin.settings.type === 'single') {
            newSize = (numberOfOptions <= plugin.settings.expandedSelectSize ? numberOfOptions : plugin.settings.expandedSelectSize);
          } else {
            newSize = plugin.settings.defaultSelectSize;
          }

          $targetSelect.attr("size", newSize);
          $sourceSelect.attr("size", newSize);
        }

        if (options.width === true) {
          $targetSelect.width($targetSelect.width() - deltaWidth);
          $sourceSelect.width($sourceSelect.width() + deltaWidth);
        }

        $targetSelect.data('multicombo.expanded', false);
      }

      if (options.width === true) {
        resetSearchWidth();
      }
    }

    /**
     * Creates option HTML
     * @param {mixed} value
     * @param {object} optionDataObj {"index": the sorting index, "text": the text}
     * @returns {String}
     */
    function getOptionHTML(value, optionDataObj) {
      return '<option value="' + value + '" data-multicombo-index="' + optionDataObj.index + '" data-multicombo-tags="' + (optionDataObj.tags || "") + '">' + optionDataObj.text + '</option>';
    }

    /**
     * Detaches the selects from the DOM (increases performance)
     */
    function detachSelects() {
      gui.leftSelect.detach();
      gui.rightSelect.detach();
    }

    /**
     * Attaches the selects to the DOM
     */
    function attachSelects() {
      gui.leftSelectParent.append(gui.leftSelect);
      gui.rightSelectParent.append(gui.rightSelect);
    }

    /**
     * Filters the option in a select
     * @param {string} text The text used as filter
     * @param {string} target The target select
     * @param {boolean} selectFirst If true, the first option in the filtered list
     *                              will bee selected (default: false)
     * @param {boolean} useTimeout If true, a timeout will be used, improving the
     *                              performance (default: true)
     **/
    function filterSelect(text, target, selectFirst, useTimeout) {
      selectFirst = selectFirst === undefined ? false : selectFirst;
      useTimeout = useTimeout === undefined ? true : useTimeout;

      var $select = getSelect(target).targetSelect;

      var numberOfMs = useTimeout === true ? plugin.settings.filterTimeout : 0;

      //get and clear current timeout
      var filterTimeout = $select.data('multicombo.filterTimout');
      window.clearTimeout(filterTimeout);

      var filterFunction = function () {
        detachSelects();
        var search, regex;
        var optionsDataObj, $targetSelect;
        var dataObjProp;
        search = $.trim(text);

        if (text.indexOf('#') !== 0) {
          search = text;
          dataObjProp = 'text';
        } else {
          search = text.substr(1);
          dataObjProp = 'tags';
        }

        regex = new RegExp(search, 'gi');
        var optionsHTML = '';

        var selectData = getSelect(target);
        $targetSelect = selectData.targetSelect;
        optionsDataObj = selectData.targetDataObj;

        /* empty target select */
        $targetSelect.empty().scrollTop(0);

        /* add options which match text */
        $.each(optionsDataObj, function (value, optionDataObj) {
          if (typeof optionDataObj[dataObjProp] === 'string' && optionDataObj[dataObjProp].match(regex) !== null) {
            optionsHTML += getOptionHTML(value, optionDataObj);
          }
        });

        /* add options and enhance them */
        fillSelect(optionsHTML, target);
        enhanceOptions(target);

        if (selectFirst === true) {
          $targetSelect.children().first().attr('selected', 'selected');
        }

        if (plugin.settings.type === 'single') {
          resizeSelect('left', {
            "toggle": false,
            "sizeAttr": true,
            "width": false
          });
        }

        attachSelects();
      };

      //create new timeout
      if (useTimeout === true) {
        filterTimeout = window.setTimeout(filterFunction, numberOfMs);
      } else {
        filterFunction.call();
      }

      //store timeout
      $select.data('multicombo.filterTimout', filterTimeout);
    }

    /**
     * Helper function, called when user changes value
     */
    function onChange() {
      /*  trigger event */
      if (plugin.settings.type === 'multiple') {
        gui.leftSelect.trigger('multicombo.onchange', gui.rightSelect);
      } else {
        gui.leftSelect.trigger('multicombo.onchange', gui.leftSelect);
      }
    }

    /* init the plugin */
    plugin.init();
  };

  $.fn.multicombo = function (options) {
    return this.each(function () {
      if (undefined === $(this).data('multicombo')) {
        var plugin = new $.multicombo(this, options);
        $(this).data('multicombo', plugin);
      }
    });
  };
})(jQuery);