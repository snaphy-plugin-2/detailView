//global angular, $snaphy
'use strict';

angular.module($snaphy.getModuleName())

//Controller for detailViewControl ..
.controller('detailViewControl', ['$scope', '$stateParams', 'Database',
    function($scope, $stateParams, Database) {
        //---------------------------------------GLOBAL VALUES-------------------------------
        //Checking if default templating feature is enabled..
        const defaultTemplate = $snaphy.loadSettings('detailView', "defaultTemplate");
        $snaphy.setDefaultTemplate(defaultTemplate);
        const redirectOtherWise = $snaphy.loadSettings('login', 'onLoginRedirectState');
        //Use Database.getDb(pluginName, PluginDatabaseName) to get the Database Resource.

        const modelName = $stateParams.model;
        const modelId = $stateParams.id;


        //-------------------------------------------------------------------------------------


        const init = function(){
            if(modelName){
               let databaseInstance = Database.loadDb(modelName);
               if(databaseInstance){
                    //Start the loading bar..
                    //TODO: fetch the absolute schema..
                    //TODO: fetch the model of the respective id with all the related data..required...
               }else{
                   //TODO: Go to default template.
                   //Notfiy unknown location..

               }
            }else{
                //TODO: Go to default template..
                //Notfiy unknown location..

            }
        };

    }//controller function..
]);