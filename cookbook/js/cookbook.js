var cookbookApp = angular.module('cookbookApp', ['ngSanitize']);

cookbookApp.controller('CookbookCtrl', function ($scope, $http) {
  $http.get('data/index.json').success(function(data) {
    $scope.recipes = data;
  });
  $scope.view = function(file, name) {
    $http.get('data/'+file+'.json')
      .success(function(data) {
        $scope.recipe = data;
        $scope.name = name;
      })
      .error(function() {
        alert('Error loading recipe');
        delete $scope.recipe;
        delete $scope.name;
      });
  }
  $scope.formatAmount = function(amount) {
    if (typeof(amount) === 'number') {
      // see if it converts to a fraction
      if (amount > 1) {
        var whole = Math.floor(amount);
        var fraction = amount - whole;
      } else {
        var fraction = amount;
      }
      if (amount === Math.floor(amount)) {
        return amount;
      } else if (fraction * 2 === Math.floor(fraction * 2)) {
        var formattedFraction = fraction * 2 + '/2';
      } else if (String(fraction).indexOf('0.333') === 0) {
        var formattedFraction = '1/3';
      } else if (String(fraction).indexOf('0.66') === 0) {
        var formattedFraction = '2/3';
      } else if (fraction * 4 === Math.floor(fraction * 4)) {
        var formattedFraction = fraction * 4 + '/4';
      } else if (fraction * 6 === Math.floor(fraction * 6)) {
        var formattedFraction = fraction * 6 + '/6';
      } else if (fraction * 8 === Math.floor(fraction * 8)) {
        var formattedFraction = fraction * 8 + '/8';
      } else {
        return amount;
      }
      if (whole) {
        return whole + ' ' + formattedFraction;
      } else {
        return formattedFraction;
      }
    } else {
      return amount;
    }
  };
});
