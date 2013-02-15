/**
 * jQuery Multicombo v0.2 - by @koosvdkolk
 *
 * Transforms select lists into searchable combo lists
 *
 * Dependencies: jQuery 1.6+
 *
 * Copyright (c) 2013 Koos van der Kolk https://github.com/koosvanderkolk
 * Dual licensed under the MIT and GPL licenses (same as jQuery).
 * http://docs.jquery.com/License
 **/
(function($) {
  $.multicombo = function(select, options) {
    var defaults = {
      "defaultSelectSize": 5,
      "expandedSelectSize": 15,
      "layoutFolder": "layout/",
      "classes":
      {
        "toLeftButton": "multicomboToLeftButton",
        "mainElement": "multicombo",
        "toRightButton": "multicomboToRightButton"
      }
    };

    var plugin = this;

    plugin.settings = {};
    plugin.settings = $.extend({}, defaults, options);

    var $leftSelect = $(select);
    var $rightSelect = $('<select></select>');

    var leftSelectOptionsData = [];
    var rightSelectOptionsData = [];

    var $element = $('<div class="' + plugin.settings.classes.mainElement + '"></div>');

    var $leftSearch = $('<input type="text" />');
    var $rightSearch = $('<input type="text" />');
    var $toLeftButton = $('<button class="'+plugin.settings.classes.toLeftButton+'" type="button">&lt;</button>');
    var $toRightButton = $('<button class="' + plugin.settings.classes.toRightButton + '"  type="button">&gt;</button>');

    var $leftExpandButton = $('<span style="width: 20px"><img src="'+plugin.settings.layoutFolder+'maximize.gif" /></span>');
    var $rightExpandButton = $leftExpandButton.clone();

    var $selectRow;

    /**
     * Initializes the plugin
     **/
    plugin.init = function() {
      if ($leftSelect.attr('multiple') === 'multiple' || $leftSelect.attr('multiple') === true){
        plugin.settings.type = 'multiple';
        initGuiMultiple();
      } else {
        plugin.settings.type = 'single';
        initGuiSingle();
      }


    };

    /**
     * Gets or sets the value of the combo
     * @param array values (optional) An array of values. If omitted, the
     *                       function returns the currently selected values
     **/
    plugin.val = function(values) {
      var i=0, numberOfRightSelectOptions, returnArray = [];
      var currentLeftFilterText, currentRightFilterText;

      if (values===undefined) {
        if (plugin.settings.type === 'multiple') {
          if (rightSelectOptionsData !== undefined) {
            numberOfRightSelectOptions = rightSelectOptionsData.length;
            for (i=0; i<numberOfRightSelectOptions; i++) {
              returnArray.push(rightSelectOptionsData[i].value);
            }
          }
        } else {
          return $leftSelect.val();
        }

      } else {
        //clear filters
        currentLeftFilterText = $leftSearch.val();
        filterSelect('', 'left');

        currentRightFilterText = $rightSearch.val();
        filterSelect('', 'right');

        //select and move options from right to left
        $rightSelect.val(values);
        $rightSelect.children().each(function(){
          var $option = jQuery(this);

          //inverse selection
          if ($option.attr('selected') === true || $option.attr('selected') === 'selected') {
            $option.removeAttr('selected');
          }else{
            $option.attr('selected', 'selected');
          }
        });
        moveSelectOptions('left');

        //select and move options from left to right
        $leftSelect.val(values);
        moveSelectOptions('right');

        //reset filters
        $leftSearch.val(currentLeftFilterText);
        filterSelect(currentLeftFilterText, 'left');

        $rightSearch.val(currentRightFilterText);
        filterSelect(currentRightFilterText, 'right');
      }

      return returnArray;
    };

    /**
     * Inits the GUI in case of a single select
     **/
    function initGuiSingle () {
      var $tr;

      /* create ui
      */

      /* replace select with new container element */
      $leftSelect.before($element).remove();

      /* fill container */
      var $table = jQuery('<table></table>');
      var $tbody = jQuery('<tbody></tbody>');
      $table.append($tbody);

      /* row with search inputs */
      $tr = jQuery('<tr></tr>');
      $tr.append( $('<td></td>').append($leftSearch, $leftExpandButton) );

      $tbody.append($tr);

      /* row with select */
      $selectRow = jQuery('<tr style="display:none;"></tr>');
      $selectRow.append( $('<td></td>').append($leftSelect) );
      $tbody.append($selectRow);

      /* append table and do some settings */
      $element.append($table);

      //layout of selects
      $leftSelect.attr({
        "multiple": "",
        "size": plugin.settings.defaultSelectSize
      });

      //store width of select
      plugin.settings.selectWidth = $leftSelect.width();

      //set width of search box;
      resetSearchWidth();

      //add index to left select options and store option data (for search)
      $leftSelect.children().each(function(index, option){
        var $option = $(option);
        $option.data('multicombo.index', index);
        leftSelectOptionsData.push({
          "value": $option.val(),
          "text": $(this).text(),
          "index": index
        });
        enhanceOption($option);
      });

      /* assign functions
       */

      /* search keyboard events */
      $leftSearch.bind('keyup', function(e){
        /* show select */
        $selectRow.show();

        /* check for cursor activity */
        if (e.keyCode === 38 || e.keyCode === 40) {
          /* user pressed up/down: let user move through options in select */
          $leftSearch.data('multicombo.selectUsingCursor', true);
          $leftSelect.focus();
        } else {
          /* user pressed other key: filter */
          filterSelect($(this).val(), 'left', true);
          $leftSearch.data('multicombo.selectUsingCursor', false);
        }
      });

      /* search focus event */
      $leftSearch.bind('focus', function(){
        $selectRow.show();
      })

      /* search blur event */
      $leftSearch.bind('blur', function(){
        /* get selected option value */
        $leftSearch.val($leftSelect.children(':selected').text());

        /* hide select if user not using cursor */
        if ($leftSearch.data('multicombo.selectUsingCursor') !== true) {
          $selectRow.hide();
        }
      });

      /* select blur event */
      $leftSelect.bind('blur', function(){
        /* emulate option click if user is using cursor */
        if ($leftSearch.data('multicombo.selectUsingCursor') === true) {
          $leftSelect.children(':selected').trigger('click');
        }
      });

      /* select change event */
      $leftSelect.bind('change', function(){
        /* update search */
        if ($leftSearch.data('multicombo.selectUsingCursor') === true) {
          /* emulate option click */
          $leftSearch.val($leftSelect.children(':selected').text());
        }
      });

      /* expand button */
      $leftExpandButton.click(function(){
        resizeSelect('left');
      });
    }

    /**
     * Inits the GUI in case of a multiple select
     **/
    function initGuiMultiple () {
      var $tr;

      /* create ui
      */

      /* replace select with new container element */
      $leftSelect.before($element).remove();

      /* fill container */
      var $table = jQuery('<table></table>');
      $table.append('<thead><tr><td><img src="'+plugin.settings.layoutFolder+'ico_forbidden.gif" alt="forbidden" /></td><td></td><td><img alt="forbidden" src="'+plugin.settings.layoutFolder+'ico_allowed.gif" /></td></tr></thead>');
      var $tbody = jQuery('<tbody></tbody>');
      $table.append($tbody);

      /* row with search inputs */
      $tr = jQuery('<tr></tr>');
      $tr.append( $('<td></td>').append($leftSearch, $leftExpandButton) );
      $tr.append( $('<td></td>') );
      $tr.append( $('<td></td>').append($rightSearch, $rightExpandButton) );

      $tbody.append($tr);

      /* row with selects */
      $tr = jQuery('<tr></tr>');
      $tr.append( $('<td></td>').append($leftSelect) );
      $tr.append( $('<td></td>').append($toRightButton, '<br />', $toLeftButton) );
      $tr.append( $('<td></td>').append($rightSelect) );
      $tbody.append($tr);

      /* append table and do some settings */
      $element.append($table);

      //layout of selects
      $leftSelect.attr({
        "multiple": "multiple",
        "size": plugin.settings.defaultSelectSize
      });
      $rightSelect.attr({
        "multiple": "multiple",
        "size": plugin.settings.defaultSelectSize
      });

      //store width of select
      plugin.settings.selectWidth = $leftSelect.width();

      //set width of search box;
      resetSearchWidth();

      //add index to left select options and store option data (for search)
      $leftSelect.children().each(function(index, option){
        var $option = $(option);
        $option.data('multicombo.index', index);
        leftSelectOptionsData.push({
          "value": $option.val(),
          "text": $(this).text(),
          "index": index
        });
        enhanceOption($option);
      });

      /* assign functions
       */



      $toLeftButton.click(function(){
        moveSelectOptions('left');
      });
      $toRightButton.click(function(){
        moveSelectOptions('right');
      });

      $leftSearch.bind('keyup', function(){
        filterSelect($(this).val(), 'left');
      });
      $rightSearch.bind('keyup', function(){
        filterSelect($(this).val(), 'right');
      });

      $leftExpandButton.click(function(){
        resizeSelect('left');
      });
      $rightExpandButton.click(function(){
        resizeSelect('right');
      });
    }

    /**
     * Makes sure the width of the search input equals that of the selects
     **/
    function resetSearchWidth () {
      $leftSearch.width($leftSelect.width()-$leftExpandButton.width()-5);
      $rightSearch.width($rightSelect.width()-$rightExpandButton.width()-5);
    }

    /**
     * Adds events etc to an option in the select. Should be called for each
     *   option
     * @param object $option A jQuerified option
     **/
    function enhanceOption($option) {
      /* add events
       */
      if (plugin.settings.type === 'multiple') {
        /* double click */
        $option.dblclick(function() {
          var parent = $(this).parent()[0];
          var target = parent === $leftSelect[0] ? 'right' : 'left';
          moveSelectOptions(target);
        });
      } else {
        /* click */
        $option.click(function() {
          $leftSearch.val(jQuery(this).text());
        });
      }
    }

    /**
     * Moves selected options to the other select list
     * @param string target The target select: 'left' or 'right'
     **/
    function moveSelectOptions(target) {
      var i, data;

      /* get select boxes and data */
      var selectData = getSelect(target);
      var $optionsToMove = selectData.sourceSelect.children(':selected');
      var targetData = selectData.targetData;
      var td_length = targetData.length;
      var sourceData = selectData.sourceData;
      var sd_length = sourceData.length;

      /* move the options and update data */
      $optionsToMove.each(function(){
        var $option = $(this);
        var value = $option.val();
        var index = $option.data('multicombo.index');
        var text  = $option.text();
        var moved = false;

        /* move option */
        addSelectOption($option, target);
        $option.removeAttr('selected');

        /* update data (used for search) */

        //remove it from source
        for (i=0; i<sd_length; i++) {
          if (sourceData[i].value === value) {
            sourceData.splice(i, 1);
            break;
          }
        }

        //add it to target
        data = {
          "value": value,
          "text": text,
          "index": index
        };
        if (td_length>0) {
          for (i=0; i<td_length; i++) {

            if (targetData[i].index > index) {
              targetData.splice(i, 0, data);

              moved = true;
              break;
            }
          }
        }

        if (td_length === 0 || moved === false){
          targetData.push(data);
        }
      });
    }

    /**
     * Helper function: Returns both select boxes and data, either as source
     *   or as target parameter
     * @param string targetName Which select box will be the target
     * @return object {"targetSelect": [jquerified select object],
     *                 "sourceSelect": [jquerified select object],
     *                 "targetData"  : object
     *                 "sourceData"  : object}
     **/
    function getSelect(targetName) {
      var $target, $source, targetData, sourceData;

      if (targetName === "left") {
        $target = $leftSelect;
        $source = $rightSelect;
        targetData = leftSelectOptionsData;
        sourceData = rightSelectOptionsData;
      } else {
        $target = $rightSelect;
        $source = $leftSelect;
        targetData = rightSelectOptionsData;
        sourceData = leftSelectOptionsData;
      }

      return {
        "targetSelect": $target,
        "sourceSelect": $source,
        "targetData": targetData,
        "sourceData": sourceData
      };
    }

    /**
     * Adds an option to a select
     * @param object $sourceOption A jQuerified option object
     * @param string target Name of the target select: 'left' or 'right'
     * @param boolean ignoreIndex If true, the index will not be use to
     *                              determine the order of the options.
     **/
    function addSelectOption($sourceOption, target, ignoreIndex) {
      ignoreIndex = ignoreIndex === undefined ? false : ignoreIndex;
      var moved = false;
      var $targetOptions, sourceOptionIndex, $targetOption;
      var selectData = getSelect(target);
      var $targetSelect = selectData.targetSelect;

      if (ignoreIndex === false) {
        $targetOptions = $targetSelect.children();

        sourceOptionIndex = $sourceOption.data('multicombo.index');

        $targetOptions.each(function() {
          var $targetOption = $(this);
          if ($(this).data('multicombo.index') > sourceOptionIndex) {
            $sourceOption.insertBefore($targetOption);
            moved = true;
            return false;
          }
        });

        if (moved === false) {
          $targetSelect.append($sourceOption);
        }
      } else {
        $targetSelect.append($sourceOption);
      }
    }

    /**
     * Resizes the select
     * @param string target Name of the select: 'left' or 'right'
     **/
    function resizeSelect(target) {
      var expand;
      var selectData = getSelect(target);
      var $targetSelect = selectData.targetSelect;
      var $sourceSelect = selectData.sourceSelect;

      if ($targetSelect.data('multicombo.expanded')===true) {
        expand = false;
      } else {
        expand = true;
      }

      var deltaWidth = plugin.settings.selectWidth / 2;
      if (expand === true) {
        $targetSelect.attr("size", plugin.settings.expandedSelectSize);
        $sourceSelect.attr("size", plugin.settings.expandedSelectSize);
        $targetSelect.width($targetSelect.width()+deltaWidth);
        $sourceSelect.width($sourceSelect.width()-deltaWidth);

        $targetSelect.data('multicombo.expanded', true);
      }else{
        $targetSelect.attr("size", plugin.settings.defaultSelectSize);
        $sourceSelect.attr("size", plugin.settings.defaultSelectSize);
        $targetSelect.width($targetSelect.width()-deltaWidth);
        $sourceSelect.width($sourceSelect.width()+deltaWidth);

        $targetSelect.data('multicombo.expanded', false);
      }

      resetSearchWidth();
    }

    /**
     * Filters the option in a select
     * @param string text The text used as filter
     * @param string target The target select
     * @param boolean selectFirst If true, the first option in the filtered list
     *                              will bee selected (default: false)
     **/
    function filterSelect(text, target, selectFirst) {
      selectFirst = selectFirst === undefined ? false : selectFirst;
      var optionsData, $targetSelect, option;
      var search = $.trim(text);
      var regex = new RegExp(search,'gi');

      var selectData = getSelect(target);
      $targetSelect = selectData.targetSelect;
      optionsData   = selectData.targetData;

      /* empty target select */
      $targetSelect.empty().scrollTop(0);

      /* add options which match text */
      $.each(optionsData, function(i) {
        var option = optionsData[i];
        if(option.text.match(regex) !== null) {
          var $option = $('<option>').text(option.text).val(option.value).data('multicombo.index',option.index);

          /* enhance it, add it */
          enhanceOption($option);
          addSelectOption($option, target, true);
        }
      });

      if (selectFirst === true) {
        $targetSelect.children().first().attr('selected', 'selected');
      }

    }

    /* init the plugin */
    plugin.init();
  };

  $.fn.multicombo = function(options) {
    return this.each(function() {
      if (undefined === $(this).data('multicombo')) {
        var plugin = new $.multicombo(this, options);
        $(this).data('multicombo', plugin);
      }
    });
  };
})(jQuery);
