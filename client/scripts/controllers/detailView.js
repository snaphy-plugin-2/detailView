/*
jshint global angular, $snaphy
 */

'use strict';

angular.module($snaphy.getModuleName())

//Controller for detailViewControl ..
.controller('detailViewControl', ['$scope', '$stateParams', 'Database', "DetailViewResource",
    function($scope, $stateParams, Database, DetailViewResource) {
        //---------------------------------------GLOBAL VALUES-------------------------------
        //Checking if default templating feature is enabled..
        var defaultTemplate = $snaphy.loadSettings('detailView', "defaultTemplate");
        $snaphy.setDefaultTemplate(defaultTemplate);

        var modelName = $stateParams.model;
        var modelId = $stateParams.id;
        //Schema of the database
        $scope.detailSchema = $scope.detailSchema  || {};


        //-------------------------------------------------------------------------------------


        var init = function(){
            if(modelName){
               var databaseInstance = Database.loadDb(modelName);
               if(databaseInstance){
                   //Start the loading bar..
                   var promise = DetailViewResource.getDetailViewSchema(databaseInstance);
                       promise.then(function(success){
                            if(success){
                                $scope.detailSchema = success;
                                $scope.resetData();
                            }
                       }, function(error){
                            console.error(error);
                       });
                   
                   
                   var relationPromise = DetailViewResource.getRelationSchema(databaseInstance);
                   relationPromise.then(function(success){
                            console.log(success);
                       }, function(error){
                            console.error(error);
                       });

               }else{
                   //TODO: Go to default template.
                   //Notify unknown location..

               }
            }else{
                //TODO: Go to default template..
                //Notfiy unknown location..

            }
        };

        /**
         * fetch the detailData of the current model from the server..
         */
        $scope.resetData = function(){
            var databaseInstance = Database.loadDb(modelName);
            var promise = DetailViewResource.getDataFromServer($scope.detailSchema, modelId, databaseInstance);
            promise.then(function(success){
                $scope.detailSchemaData = success;
            }, function(error){
                console.error(error);
            });
        };


        //Call the init method..
        init();

    }//controller function..
]);