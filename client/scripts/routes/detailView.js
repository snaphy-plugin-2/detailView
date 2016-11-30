'use strict';
/*jslint browser: true*/
/*global $, jQuery, $snaphy, angular*/
angular.module($snaphy.getModuleName())
  //Routes are defined using ui.routes 
  .config(['$locationProvider', '$stateProvider', '$urlRouterProvider',
    function ($locationProvider, $stateProvider, $urlRouterProvider) {
      $locationProvider.html5Mode(false);
      //$urlRouterProvider.otherwise('/');

      //Add runtime dynamic states given in the list...
      var routesList = $snaphy.loadSettings('detailView', "addRoutes");

        if(routesList){
            for(var stateName in routesList){
                if(routesList.hasOwnProperty(stateName)){
                    var stateDetail = routesList[stateName];
                    if(stateName && stateDetail){
                        $stateProvider.state(stateName, stateDetail);
                    }
                }
            }
        }

      $stateProvider
        //Provide routes in this way..
        .state('detailView', {
          url: '/detailView/:model/:id',
          templateUrl: '/detailView/views/detailView.html',
          controller: 'detailViewControl'
        });
    }]); //config
