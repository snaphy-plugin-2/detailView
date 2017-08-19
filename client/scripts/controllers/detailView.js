(function () {
    'use strict';
}());

angular.module($snaphy.getModuleName())

//Controller for detailViewControl ..
.controller('detailViewControl',
    ['$scope', '$stateParams', 'Database', "DetailViewResource", "InitTableService", "$window",
    function($scope, $stateParams, Database, DetailViewResource, InitTableService, $window) {
        //---------------------------------------GLOBAL VALUES-------------------------------

        //Checking if default templating feature is enabled..
        var defaultTemplate = $snaphy.loadSettings('detailView', "defaultTemplate");
        $snaphy.setDefaultTemplate(defaultTemplate);

        var modelName = $stateParams.model;
        var modelId = $stateParams.id;
        //Schema of the database
        $scope.detailSchema = {};
        //Data object containing the detailSchemaData block
        $scope.detailSchemaData = {};
        //Relation Schema data..
        $scope.relationSchema = {};
        //Initially enable the detail view button..
        $scope.disableDetailViewButton = false;
        //Tracking the input plugin one time initialize...like select2, datepicker.
        var inputPluginInitialize = {
            date : false,
            select2: false
        };
        //-------------------------------------------------------------------------------------


        $scope.goBack = function () {
            $window.history.back();
        };


        var init = function(){
            if(modelName){
               var databaseInstance = Database.loadDb(modelName);
               if(databaseInstance){
                   //Start the loading bar..
                   var promise = DetailViewResource.getDetailViewSchema(databaseInstance);
                       promise.then(function(success){
                            if(success){
                                DetailViewResource.copy(success, $scope.detailSchema);
                                $scope.resetData();
                            }
                       }, function(error){
                            console.error(error);
                       });
                   
                   
                   var relationPromise = DetailViewResource.getRelationSchema(databaseInstance);
                   relationPromise.then(function(success){
                            //NOTE: here using toJSON instead of raw object will remove unwanted properties like $promise from object keeping object value clean.
                            angular.copy(success, $scope.relationSchema);
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


        //--------------------------------CACHE MANAGEMENT------------------------------

        


        //---------------------------------------------------------------------------------------


        $scope.initializePlugin = function(pluginList){
            if(inputPluginInitialize){
                if(pluginList){
                    if(pluginList.length){
                        pluginList.forEach(function(pluginName){
                            if(!inputPluginInitialize[pluginName]){
                                if(pluginName === "select2"){
                                    $('.js-select2').select2();
                                }else if(pluginName === 'datepicker'){
                                    App.initHelpers(['datepicker']);
                                }else{
                                    App.initHelpers([inputPluginInitialize[pluginName]]);
                                }
                                inputPluginInitialize[pluginName] = true;
                            }
                        });
                    }
                }
            }
        };



        /**
         *
         * @param key name of the relation 'hasMany', hasOne, hasManythrough, belongsTo, hasAndBelongsToMany
         * @param value List of the relation details belongs to a particular type of relation..
         * @example  key ==> hasMany: [{}] <= value
         * @return {boolean} false to hide display or true to display the table form.
         */
        $scope.checkTableDisplay = function(key, value){
            if(key !== 'hasOne' && key !== 'belongsTo'){
                if(value){
                    if(value.length){
                        return true;
                    }
                }
            }
            return false;
        };



        /**
         * fetch the detailData of the current model from the server..
         */
        $scope.resetData = function(){
            var databaseInstance = Database.loadDb(modelName);
            var promise = DetailViewResource.getDataFromServer($scope.detailSchema, modelId, databaseInstance);
            promise.then(function(success){
                success = success || {};
                //NOTE: here using toJSON instead of raw object will remove unwanted properties like $promise from object keeping object value clean.
                //Now copying the data..
                angular.copy(success.toJSON(), $scope.detailSchemaData);
            }, function(error){
                console.error(error);
            });
        };



        /**
         * Save the detailView data to the server..
         * @param formSchema
         * @param formData
         * @param formModel
         */
        $scope.saveForm = function(formSchema, formData, formModel){
            var promise = DetailViewResource.saveForm(formSchema, formData, formModel);
            //Disable button..
            $scope.disableDetailViewButton = true;
            promise.then(function(success){
                //Enable button
                $scope.disableDetailViewButton = false;
                if(success){
                    if(success.data){
                        if(success.data.id){
                            //Update the id attribute..
                            $scope.detailSchemaData.id = success.data.id;
                        }
                    }
                }
            }, function(error){
                //Enable button
                $scope.disableDetailViewButton = false;
                console.error(error);
            });
        };

        //TableViewInit
        $scope.tableViewInit = InitTableService.tableViewInit($scope, modelName, modelId);


        //Call the init method..
        init();

    }//controller function..
]);