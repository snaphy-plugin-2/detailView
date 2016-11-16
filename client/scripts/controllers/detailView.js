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
        var redirectOtherWise = $snaphy.loadSettings('login', 'onLoginRedirectState');
        //Use Database.getDb(pluginName, PluginDatabaseName) to get the Database Resource.

        var modelName = $stateParams.model;
        var modelId = $stateParams.id;


        //-------------------------------------------------------------------------------------


        var init = function(){
            if(modelName){
               let databaseInstance = Database.loadDb(modelName);
               if(databaseInstance){
                   //Start the loading bar..
                   var promise = DetailViewResource.getDetailViewSchema(databaseInstance);
                       promise.then(function(success){
                            console.log(success);
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


        //Call the init method..
        init();

    }//controller function..
]);