(function() {

  'use strict';

  angular.module('pa-datepicker', []);

})();

(function() {

  'use strict';

  angular.module('pa-datepicker').directive('paDateInput',
    ['$filter', 'DateParser', function($filter, DateParser) {

      var createDateFormatter = function(format) {
        return function(value) {
          var dateObj = new Date(value);

          if (!isNaN(dateObj.getTime())) {
            return $filter('date')(dateObj, format);
          } else {
            return null;
          }
        };
      };

      var createDateParser = function(format) {
        return function(value) {
          return DateParser.parse(value, format);
        };
      };

      return {
        require: 'ngModel',
        template: '<input type="text" class="date-input" />',
        replace: true,
        scope: {
          format: '@',
        },
        link: function(scope, elm, attrs, ngModelCtrl) {
          var format = scope.format || 'shortDate';

          ngModelCtrl.$formatters.unshift(createDateFormatter(format));
          ngModelCtrl.$parsers.unshift(createDateParser(format));
        },
      };

    }]
  );

})();

(function() {

  'use strict';

  angular.module('pa-datepicker').directive('paDatepicker', function() {

    return {
      restrict: 'E',
      controller: 'DatepickerContainerCtrl',
      controllerAs: 'container',
      bindToController: true,
      require: ['^ngModel', '^paDatepicker', '?^paDatepickerPopup'],
      templateUrl: 'templates/pa-datepicker/container.html',
      scope: {
        panels: '@',
        mode: '@',
        currentPeriod: '=?',
        startingDay: '@',
        minDate: '=',
        maxDate: '=',
        ngModel: '=',
      },
      link: function(scope, element, attrs, controllers) {
        controllers[1].popup = controllers[2];
        controllers[1].init();
      }
    };

  });

})();

(function() {

  'use strict';

  angular.module('pa-datepicker').directive('paPanel', function() {

    return {
      restrict: 'E',
      controller: 'DatepickerPanelCtrl',
      controllerAs: 'panel',
      bindToController: true,
      require: ['^paDatepicker', '^paPanel'],
      templateUrl: 'templates/pa-datepicker/panel.html',
      scope: {
        config: '=',
        period: '@',
      },
      link: function(scope, element, attrs, controllers) {
        controllers[1].container = controllers[0];
        controllers[1].init();
      }
    };

  });

})();

(function() {

  'use strict';

  angular.module('pa-datepicker').directive('paDatepickerPopup', function() {

    return {
      restrict: 'E',
      controller: 'DatepickerPopupCtrl',
      controllerAs: 'popup',
      bindToController: true,
      templateUrl: 'templates/pa-datepicker/popup.html',
      transclude: true,
      replace: true,
      scope: {
        isOpen: '=',
        closeAfterSelection: '@',
      },
      link: function(scope, element, attrs, controller) {
        controller.container = element[0];
        controller.init();
      }
    };

  });

})();

(function() {

  'use strict';

  angular.module('pa-datepicker').constant('paDatepickerConfig', {
    panels: 1,
    mode: 'single',
    startingDay: 0,
    minDate: null,
    maxDate: null,
    popup: {
      closeAfterSelection: true,
    },
  });

})();

(function() {

  'use strict';

  angular.module('pa-datepicker').service('DateParser',
    function($locale, orderByFilter) {

      this.parsers = {};

      var formatCodeToRegex = {
        'yyyy': {
          regex: '\\d{4}',
          apply: function(value) { this.year = +value; }
        },
        'yy': {
          regex: '\\d{2}',
          apply: function(value) { this.year = +value + 2000; }
        },
        'y': {
          regex: '\\d{1,4}',
          apply: function(value) { this.year = +value; }
        },
        'MMMM': {
          regex: $locale.DATETIME_FORMATS.MONTH.join('|'),
          apply: function(value) { this.month = $locale.DATETIME_FORMATS.MONTH.indexOf(value); }
        },
        'MMM': {
          regex: $locale.DATETIME_FORMATS.SHORTMONTH.join('|'),
          apply: function(value) { this.month = $locale.DATETIME_FORMATS.SHORTMONTH.indexOf(value); }
        },
        'MM': {
          regex: '0?[1-9]|1[0-2]',
          apply: function(value) { this.month = value - 1; }
        },
        'M': {
          regex: '0?[1-9]|1[0-2]',
          apply: function(value) { this.month = value - 1; }
        },
        'dd': {
          regex: '0?[1-9]|[12][0-9]|3[01]',
          apply: function(value) { this.date = +value; }
        },
        'd': {
          regex: '0?[1-9]|[12][0-9]|3[01]',
          apply: function(value) { this.date = +value; }
        },
        'EEEE': {
          regex: $locale.DATETIME_FORMATS.DAY.join('|')
        },
        'EEE': {
          regex: $locale.DATETIME_FORMATS.SHORTDAY.join('|')
        }
      };

      function createParser(format) {
        var map = [], regex = format.split('');

        angular.forEach(formatCodeToRegex, function(data, code) {
          var index = format.indexOf(code);

          if (index > -1) {
            format = format.split('');

            regex[index] = '(' + data.regex + ')';
            format[index] = '$'; // Custom symbol to define consumed part of format
            for (var i = index + 1, n = index + code.length; i < n; i++) {
              regex[i] = '';
              format[i] = '$';
            }
            format = format.join('');

            map.push({ index: index, apply: data.apply });
          }
        });

        return {
          regex: new RegExp('^' + regex.join('') + '$'),
          map: orderByFilter(map, 'index')
        };
      }

      this.parse = function(input, format) {
        if ( !angular.isString(input) || !format ) {
          return input;
        }

        format = $locale.DATETIME_FORMATS[format] || format;

        if ( !this.parsers[format] ) {
          this.parsers[format] = createParser(format);
        }

        var parser = this.parsers[format],
            regex = parser.regex,
            map = parser.map,
            results = input.match(regex);

        if ( results && results.length ) {
          var fields = { year: 1900, month: 0, date: 1, hours: 0 }, dt;

          for( var i = 1, n = results.length; i < n; i++ ) {
            var mapper = map[i-1];
            if ( mapper.apply ) {
              mapper.apply.call(fields, results[i]);
            }
          }

          if ( isValid(fields.year, fields.month, fields.date) ) {
            dt = new Date( fields.year, fields.month, fields.date, fields.hours);
          }

          return dt;
        }
      };

      // Check if date is valid for specific month (and year for February).
      // Month: 0 = Jan, 1 = Feb, etc
      function isValid(year, month, date) {
        if ( month === 1 && date > 28) {
            return date === 29 && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0);
        }

        if ( month === 3 || month === 5 || month === 8 || month === 10) {
            return date < 31;
        }

        return true;
      }

    }
  );

})();

(function() {

  'use strict';

  angular.module('pa-datepicker').controller('DatepickerContainerCtrl',
    ['$scope', 'paDatepickerConfig', function($scope, paDatepickerConfig) {

      angular.extend(this, {

        init: function() {
          this.datePanels = [];
          this.selections = {};

          this.initConfig();
          this.initToday();
          this.initCurrentPeriod();
          this.initModel();
          this.initPanels();
          this.initMonitorWatcher();
        },

        initMonitorWatcher: function() {
          $scope.$watch(
            function() { return this.ngModel; }.bind(this),
            this.initModel.bind(this)
          );
        },

        initConfig: function() {
          this.config = angular.copy(paDatepickerConfig);

          angular.forEach(this.config, function(value, option) {
            if (typeof this[option] !== 'undefined') {
              this.config[option] = this[option];
            }
          }.bind(this));
        },

        initToday: function() {
          this.today = new Date();
          this.today.setHours(0, 0, 0, 0);
        },

        initPanels: function() {
          var numberOfPanels = parseInt(this.config.panels, 10);
          var base = this.getPanelStart();

          for (var i = 0; i < numberOfPanels; i++) {
            this.datePanels[i] = {
              first: i === 0,
              last: i === numberOfPanels - 1,
              year: base.getFullYear(),
              month: base.getMonth() + i - numberOfPanels + 1,
            };
          }
        },

        initCurrentPeriod: function() {
          this.currentPeriod = this.currentPeriod || 'base';
        },

        initModel: function() {
          if (this.isRange() && !this.ngModel) {
            this.ngModel = {};
          } else if (this.ngModel instanceof Date) {
            this.ngModel.setHours(0, 0, 0, 0);
          } else if (typeof(this.ngModel) === 'string' || this.ngModel instanceof String) {
            this.ngModel = new Date(this.ngModel);
            this.ngModel.setHours(0, 0, 0, 0);
          } else if (this.ngModel === null) {
            this.ngModel = undefined;
          }
        },

        getPanelStart: function() {
          if (this.isRange()) {
            return this.getRangePanelStart();
          } else {
            return this.ngModel || this.today;
          }
        },

        getRangePanelStart: function() {
          if (this.ngModel.base && this.ngModel.base.end instanceof Date) {
            if (this.ngModel.comparison && this.ngModel.comparison.end instanceof Date) {
              return this.getFurtherDate();
            } else {
              return this.ngModel.base.end;
            }
          } else {
            return this.today;
          }
        },

        getFurtherDate: function() {
          if (this.compare(this.ngModel.comparison.end, this.ngModel.base.end) > 0) {
            return this.ngModel.comparison.end;
          } else {
            return this.ngModel.base.end;
          }
        },

        updatePanels: function(month, $event) {
          $event.preventDefault();
          this.datePanels.forEach(function(p) { p.month += month; });
        },

        selectDate: function(date) {
          if (this.isRange()) {
            this.handleDateSelection(date);
          } else {
            this.ngModel = date;
            this.closePopup();
          }
        },

        handleDateSelection: function(date) {
          if (!this.isSelecting()) {
            this.startSelection(date);
          } else {
            this.stopSelection(date);
            this.closePopup();
          }
        },

        isSelecting: function() {
          return !!this.selections[this.currentPeriod];
        },

        startSelection: function(date) {
          this.selections[this.currentPeriod] = { selected: date, start: date, end: date };
        },

        previewSelection: function(date) {
          if (!this.isSelecting()) {
            return false;
          }

          var selection = this.selections[this.currentPeriod];

          if (date >= selection.selected) {
            selection.start = selection.selected;
            selection.end = date;
          } else {
            selection.start = date;
            selection.end = selection.selected;
          }
        },

        stopSelection: function(date) {
          var selection = this.selections[this.currentPeriod];

          if (date > selection.selected) {
            this.updateCurrentPeriod(selection.selected, date);
          } else {
            this.updateCurrentPeriod(date, selection.selected);
          }

          this.selections[this.currentPeriod] = null;
        },

        updateCurrentPeriod: function(start, end) {
          this.ngModel[this.currentPeriod] = { start: start, end: end };
        },

        isRange: function() {
          return this.config.mode === 'range';
        },

        isDateEnabled: function(date) {
          if (this.config.minDate && this.compare(date, this.config.minDate) < 0) {
            return false;
          } else if (this.config.maxDate && this.compare(date, this.config.maxDate) > 0) {
            return false;
          } else {
            return true;
          }
        },

        isDateSelected: function(date) {
          if (this.isRange()) {
            return this.isDateWithinBasePeriod(date) ||
              this.isDateWithinComparisonPeriod(date);
          }

          return this.ngModel instanceof Date && date.getTime() === this.ngModel.getTime();
        },

        isDateWithinBasePeriod: function(date) {
          return this.isDateWithinPeriod('base', date);
        },

        isDateWithinComparisonPeriod: function(date) {
          return this.isDateWithinPeriod('comparison', date);
        },

        isDateWithinPeriod: function(period, date) {
          if (!this.isRange()) {
            return false;
          } else if (this.isSelecting() && this.currentPeriod === period) {
            return this.isDateWithinSelection(date);
          }

          var selection = this.ngModel[period];

          if (selection && selection.start && selection.end) {
            return selection && this.compare(date, selection.start) >= 0 &&
              this.compare(date, selection.end) <= 0;
          } else {
            return false;
          }
        },

        isDateWithinSelection: function(date) {
          var selection = this.selections[this.currentPeriod];

          if (selection && selection.start && selection.end) {
            return selection && this.compare(date, selection.start) >= 0 &&
              this.compare(date, selection.end) <= 0;
          } else {
            return false;
          }
        },

        isToday: function(date) {
          return this.compare(date, this.today) === 0;
        },

        getStartingDay: function() {
          return (parseInt(this.config.startingDay, 10) % 7) || 0;
        },

        closePopup: function() {
          if (this.popup) {
            this.popup.close();
          }
        },

        compare: function(date1, date2) {
          var subject1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
          var subject2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());

          return subject1 - subject2;
        },

      });

    }]
  );

})();

(function() {

  'use strict';

  angular.module('pa-datepicker').controller('DatepickerPanelCtrl',
    ['$scope', function($scope) {

      angular.extend(this, {

        init: function() {
          this.initConfigWatcher();
        },

        updatePanel: function() {
          this.setBoundaries();
          this.separateRows();
        },

        initConfigWatcher: function() {
          $scope.$watch(
            function() { return this.config; }.bind(this),
            this.updatePanel.bind(this),
            true
          );
        },

        setBoundaries: function() {
          this.start = new Date(this.config.year, this.config.month, 1);
          this.end = new Date(this.config.year, 1 + parseInt(this.config.month, 10), 0);
        },

        separateRows: function() {
          var currentDay = 1 - this.start.getDay() + this.container.getStartingDay();
          var current = new Date(this.config.year, this.config.month, currentDay);

          var start = new Date(current.getTime() - current.getTimezoneOffset() * 60000);
          var end = new Date(this.end.getTime() - this.end.getTimezoneOffset() * 60000);

          var rows = Math.ceil(((end - start) / 86400000) / 7);

          this.fillRows(rows, current);
        },

        fillRows: function(rows, current) {
          this.rows = [];

          for (var i = 0; i < rows; i++) {
            this.rows[i] = [];

            for (var j = 0; j < 7; j ++) {
              this.rows[i][j] = new Date(current.getTime());
              current.setDate(current.getDate() + 1);
            }
          }
        },

        selectDate: function(date) {
          if (this.isEnabled(date)) {
            this.container.selectDate(date);
          }
        },

        previewSelection: function(date) {
          if (this.isEnabled(date)) {
            this.container.previewSelection(date);
          }
        },

        isEnabled: function(date) {
          return this.container.isDateEnabled(date) && this.isDateInsideMonth(date);
        },

        isDisabled: function(date) {
          return !this.isEnabled(date);
        },

        isDateInsideMonth: function(date) {
          return this.container.compare(date, this.start) >= 0 &&
            this.container.compare(this.end, date) >= 0;
        },

        isDateSelected: function(date) {
          return this.isEnabled(date) && this.container.isDateSelected(date);
        },

        isDateWithinBasePeriod: function(date) {
          return this.isEnabled(date) && this.container.isDateWithinBasePeriod(date);
        },

        isDateWithinComparisonPeriod: function(date) {
          return this.isEnabled(date) && this.container.isDateWithinComparisonPeriod(date);
        },

      });

    }]
  );

})();

(function() {

  'use strict';

  angular.module('pa-datepicker').controller('DatepickerPopupCtrl',
    ['$scope', '$document', '$timeout', 'paDatepickerConfig',
    function($scope, $document, $timeout, paDatepickerConfig) {

      angular.extend(this, {

        init: function() {
          this.initOpeningWatcher();
          this.initConfig();
          this.initClickHandler();
          this.openingHandler();
        },

        initOpeningWatcher: function() {
          $scope.$watch(
            function() { return this.isOpen; }.bind(this),
            this.openingHandler.bind(this)
          );
        },

        initConfig: function() {
          this.config = angular.copy(paDatepickerConfig.popup);

          if (this.closeAfterSelection !== undefined) {
            this.config.closeAfterSelection = this.closeAfterSelection === 'true';
          }
        },

        initClickHandler: function() {
          this.clickHandler = this.onClickOutside.bind(this);
        },

        openingHandler: function() {
          var handler = function() {
            if (this.isOpen) {
              $document.bind('click', this.clickHandler);
            } else {
              $document.unbind('click', this.clickHandler);
            }
          };

          $timeout(handler.bind(this), 200);
        },

        onClickOutside: function() {
          $scope.$apply(function() {
            this.isOpen = false;
          }.bind(this));
        },

        preventClosing: function($event) {
          $event.stopPropagation();
        },

        close: function() {
          if (this.config.closeAfterSelection) {
            this.isOpen = false;
            this.openingHandler();
          }
        },

      });

    }]
  );

})();
