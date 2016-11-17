(function () {
    'use strict';
}());

angular.module($snaphy.getModuleName())

//Controller for detailViewControl ..
.controller('detailViewControl', ['$scope', '$stateParams', 'Database', "DetailViewResource", "Resource", "ImageUploadingTracker",
    function($scope, $stateParams, Database, DetailViewResource, Resource, ImageUploadingTracker) {
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
        //-------------------------------------------------------------------------------------


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


        /**
         * Will initialize the tabular data of tableView
         * Utilizes the concept of memoization and closure
         */
        $scope.tableViewInit = (function(){
            var cache = {};
            return function(relationDetail, relationType){
                var relationName = relationDetail.relationName;
                if(relationName){
                    //Reset the data and create a blank object..
                    /**
                     *
                     * @param schema optional if provided the adds schema object..
                     */
                    var resetData = function(schema){
                        cache[relationName] = {};
                        angular.copy(relationDetail, cache[relationName]);
                        //Also add the relation type..
                        cache[relationName].relationType = relationType;
                        if(schema){
                            //Absolute schema that is fetched from server..
                            cache[relationName].schema = schema;
                        }else{
                            //Absolute schema that is fetched from server..
                            cache[relationName].schema = {};
                        }

                        //Data to be displayed in the table..
                        cache[relationName].displayed = [];
                        //Where object for adding filtering..
                        cache[relationName].where = {};
                        cache[relationName].where[relationDetail.searchId] = modelId;
                        //This object all the settings related to current dataContainer of table view.
                        cache[relationName].settings = {
                            filterReset : false,
                            resetPage : false,
                            //tracking if absoluteSchema is fetched or not..
                            schemaFetched: false,
                            isLoading: true,
                            pagesReturned: 0,
                            totalResults: 0,
                            //Reset the filter for tracking model where query for facilitating the model search filter..
                            watchRelatedModels: {}
                        };
                    };

                    //Start memoization..
                    if(!cache[relationName]){
                        resetData();
                    }


                    /**
                     * For resetting all filter and table on reset button click..
                     */
                    var resetAll = function() {
                        //reset the tracking bar..
                        ImageUploadingTracker.resetTracker();
                        var schema = cache[relationName].schema;
                        //Now reset the data..
                        resetData(schema);

                        //TODO: Uncomment it later..
                        /*for (var i = 0; i < resetFilterList.length; i++) {
                            //Now call each method..
                            resetFilterList[i]();
                        }*/
                        //Set reset filter state to be true..
                        cache[relationName].settings.filterReset = true;
                        //Now reload the table again..
                        refreshData();
                    };


                    //console.log(cache[relationName]);
                    //TODO: CREATE A NEW SERVICE AND DO ALL WORK THERE..
                    //TODO: FETCH THE ABSOLUTE SCHEMA For each model..
                    //TODO: LOAD THE DATA FROM THE SERVER WITH SEARCH LIST ID EMBEDED IN THE FILTER
                    //TODO: OPTION TO EDIT, DELETE, PRINT each set of row.
                    //TODO: IN  CASE OF HASANDBELONGSTOMANY OPTION TO REMOVE ALSO.
                    //TODO: BUTTON TO EXPORT DATA..
                    //TODO: BUTTON TO PRINT VARIOUS DATA.
                    //TODO: BUTTON TO CREATE NEW DATA WITH SEARCH ID EMBEDDED ALREADY.

                    /**
                     * Fetch the cache object..
                     * @returns {*}
                     */
                    var getCache =  function(){
                        return cache[relationName];
                    };

                    //Refresh the data fetched from the table..
                    var refreshData = function(tableState, ctrl) {
                        //Main container for storing all the data..
                        var dataContainer = cache[relationName];
                        var modelName     = dataContainer.modelName;
                        var searchId      = dataContainer.searchId;



                        if (!dataContainer.settings.stCtrl && ctrl) {
                            dataContainer.settings.stCtrl = ctrl;
                        }
                        if (!tableState && dataContainer.settings.stCtrl) {
                            dataContainer.settings.stCtrl.pipe();
                            return;
                        }

                        var pagination = tableState.pagination;
                        var start = tableState.pagination.start || 0; // This is NOT the page number, but the index of item in the list that you want to use to display the table.
                        var number = pagination.number || 5; // Number of entries showed per page.
                        //If a page is reset state i.e some filter is applied then move back to 1 page..
                        if(dataContainer.settings.resetPage){
                            tableState.pagination.start = 0;
                            start = 0;
                            dataContainer.settings.resetPage = false;
                        }

                        if(dataContainer.settings.filterReset){
                            tableState.pagination.start = 0;
                            start = 0;
                            //Reset the search parameter..
                            tableState.pagination.search = {};
                            //Also reset the search filters
                            tableState.search = {};
                            //Again reset back to false..
                            dataContainer.settings.filterReset = false;
                        }

                        //If absoluteSchema is not present..
                        if ($.isEmptyObject(dataContainer.schema )) {
                            //First get the schema..
                            Resource.getSchema(modelName, function(schema) {
                                //Populate the schema..
                                dataContainer.schema = schema;
                                console.log(schema);
                                dataContainer.where = dataContainer.where || {};

                                Resource.getPage(start, number, tableState, modelName, schema, dataContainer.where).then(function(result) {
                                    dataContainer.displayed = result.data;
                                    //set the number of pages so the pagination can update
                                    tableState.pagination.numberOfPages = result.numberOfPages;
                                    dataContainer.settings.pagesReturned = result.numberOfPages;
                                    dataContainer.settings.totalResults = result.count;
                                    //Stop the loading bar..
                                    dataContainer.settings.isLoading = false;
                                    dataContainer.settings.schemaFetched = true;
                                });
                            }, function(httpResp){
                                console.error(httpResp);
                                //Stop the loading bar..
                                dataContainer.settings.isLoading = false;
                                dataContainer.settings.schemaFetched = false;
                            });
                        }else{
                            Resource.getPage(start, number, tableState, modelName, dataContainer.schema, dataContainer.where).then(function(result) {
                                dataContainer.displayed = result.data;
                                tableState.pagination.numberOfPages = result.numberOfPages; //set the number of pages so the pagination can update
                                dataContainer.settings.pagesReturned = result.numberOfPages;
                                dataContainer.settings.totalResults = result.count;
                                dataContainer.settings.isLoading = false;
                                dataContainer.settings.schemaFetched = true;
                            },function(httpResp){
                                console.error(httpResp);
                                //Stop the loading bar..
                                dataContainer.settings.isLoading = false;
                                dataContainer.settings.schemaFetched = false;
                                SnaphyTemplate.notify({
                                    message: "Error occured. Please click on the reset button to go back to normal.",
                                    type: 'danger',
                                    icon: 'fa fa-times',
                                    align: 'left'
                                });
                            });
                        }
                    };

                    return {
                        getCache: getCache,
                        refreshData: refreshData,
                        resetAll: resetAll

                    };
                }
            };

        })();

        //Call the init method..
        init();

    }//controller function..
]);