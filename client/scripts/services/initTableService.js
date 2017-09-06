/**
 * Created by robins on 24/7/17.
 */
(function () {
    'use strict';
    // this function is strict...
}());
angular.module($snaphy.getModuleName())
//Define your services here..
    .factory('InitTableService',
        ['DetailViewResource', 'ImageUploadingTracker', 'Resource', 'TableViewResource', 'SnaphyCache', 'SnaphyTemplate', "$state", "LoginServices", "$q",
        function(DetailViewResource, ImageUploadingTracker, Resource, TableViewResource, SnaphyCache, SnaphyTemplate, $state, LoginServices, $q) {

        /**
         * Will initialize the tabular data of tableView
         * Utilizes the concept of memoization and closure
         */
        var tableViewInit = function($scope, modelName, modelId){
            var cache = {};
            return function(relationDetail, relationType){
                var relationName = relationDetail.relationName;
                if(relationType === "hasManyThrough"){
                    //Switch relation model to throughRelationModel
                    relationDetail.modelName = relationDetail.through;
                }
                if(relationName){
                    //Reset the data and create a blank object..
                    /**
                     * @param schema optional if provided the adds schema object..
                     */
                    var resetData = function(schema){
                        DetailViewResource.extend(cache[relationName], relationDetail);
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
                        //Get the where query..
                        cache[relationName].getWhere = function () {
                            return $q(function (resolve, reject) {
                                cache[relationName].where = cache[relationName].where || {};
                                if(relationDetail.searchId){
                                    cache[relationName].where[relationDetail.searchId] = modelId;
                                }

                                if(!jQuery.isEmptyObject(cache[relationName].schema)){
                                    if(cache[relationName].schema.settings){
                                        if(cache[relationName].schema.settings.tables){
                                            if(cache[relationName].schema.settings.tables.beforeLoad){
                                                LoginServices.addUserDetail.get()
                                                    .then(function (user) {
                                                        for(var key in cache[relationName].schema.settings.tables.beforeLoad){
                                                            if(cache[relationName].schema.settings.tables.beforeLoad.hasOwnProperty(key)){
                                                                var value = cache[relationName].schema.settings.tables.beforeLoad[key];
                                                                var patt = /\$user\..+/;
                                                                if(patt.test(value)){
                                                                    var valueKey = value.replace(/\$user\./, "");
                                                                    cache[relationName].where[key] = user[valueKey];
                                                                }else{
                                                                    cache[relationName].where[key] = value;
                                                                }
                                                            }
                                                        }
                                                    })
                                                    .then(function () {
                                                        resolve(cache[relationName].where);
                                                    })
                                                    .catch(function (error) {
                                                        reject(error);
                                                    });
                                            }else{
                                                resolve(cache[relationName].where);
                                            }
                                        }else{
                                            resolve(cache[relationName].where);
                                        }
                                    }else{
                                        resolve(cache[relationName].where);
                                    }
                                }else{
                                    resolve(cache[relationName].where);
                                }
                            });

                        };


                        //Add before save hook..
                        cache[relationName].beforeSaveHook = [
                            function (data) {
                                //Explicitily add model id..
                                data[relationDetail.searchId] = modelId;
                            }
                        ];

                        //This object all the settings related to current dataContainer of table view.
                        cache[relationName].settings = {
                            filterReset : false,
                            resetPage : false,
                            //tracking if absoluteSchema is fetched or not..
                            schemaFetched: false,
                            isLoading: true,
                            pagesReturned: 0,
                            totalResults: 0,
                            totalNumberOfRows: 5,
                            //Reset the filter for tracking model where query for facilitating the model search filter..
                            watchRelatedModels: {},
                            saveFormData: {},
                            //Creates a backup of data  to be performed while in edit mode..
                            backupData: {},
                            //Inline search data object
                            //Store data of inline search associated with each table header.
                            inlineSearch:{},
                            form: {}
                        };
                    };

                    //Start memoization..
                    if(!cache[relationName]){
                        cache[relationName] = {};
                        //These are those data that are not to be deleted on each data reset request..
                        cache[relationName].persistentData = {};
                        cache[relationName].resetFilterList = [];
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
                        for (var i = 0; i < getCache().resetFilterList.length; i++) {
                            //Now call each method..
                            getCache().resetFilterList[i]();
                        }
                        //Set reset filter state to be true..
                        cache[relationName].settings.filterReset = true;
                        //Now reload the table again..
                        refreshData();
                    };


                    /**
                     * Fetch the cache object..
                     * @returns {*}
                     */
                    var getCache =  function(){
                        return cache[relationName];
                    };



                    /**
                     * Add Sorting value
                     * @param tableState
                     * @param ctrl
                     */
                    var addSort = function (tableState, ctrl) {
                        if (!cache[relationName].persistentData.stCtrl && ctrl) {
                            cache[relationName].persistentData.stCtrl = ctrl;
                        }
                        if (!tableState && cache[relationName].persistentData.stCtrl) {
                            if(cache[relationName].persistentData.stCtrl){
                                if(!cache[relationName].persistentData.stCtrl.tableState()){
                                    cache[relationName].persistentData.stCtrl.pipe();
                                    return;
                                }else{
                                    tableState = cache[relationName].persistentData.stCtrl.tableState();
                                }
                            }else {
                                cache[relationName].persistentData.stCtrl.pipe();
                                return;
                            }

                        }
                        if(cache[relationName].schema){
                            if(cache[relationName].schema.settings){
                                if(cache[relationName].schema.settings.tables){
                                    if(cache[relationName].schema.settings.tables.sort){
                                        if(tableState){
                                            //Add sort
                                            if($.isEmptyObject(tableState.sort)){
                                                for(var key in cache[relationName].schema.settings.tables.sort){
                                                    if(cache[relationName].schema.settings.tables.sort.hasOwnProperty(key)){
                                                        var sortType = cache[relationName].schema.settings.tables.sort[key] === "DESC" ? true : false;
                                                        tableState.sort = {
                                                            predicate: key,
                                                            reverse: sortType
                                                        };
                                                        break;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    };



                    //Refresh the data fetched from the table..
                    var refreshData = function(tableState, ctrl) {
                        //Main container for storing all the data..
                        var dataContainer = cache[relationName];
                        var modelName     = dataContainer.modelName;
                        var searchId      = dataContainer.searchId;



                        if (!dataContainer.persistentData.stCtrl && ctrl) {
                            dataContainer.persistentData.stCtrl = ctrl;
                        }
                        if (!tableState && dataContainer.persistentData.stCtrl) {
                            dataContainer.persistentData.stCtrl.pipe();
                            return;
                        }

                        var pagination = tableState.pagination;
                        var start = tableState.pagination.start || 0; // This is NOT the page number, but the index of item in the list that you want to use to display the table.
                        var number = pagination.number || dataContainer.settings.totalNumberOfRows; // Number of entries showed per page.
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

                        //Add schema from localstorage if  present..
                        if(!$.isEmptyObject(SnaphyCache.getItem(modelName))){
                            dataContainer.schema = SnaphyCache.getItem(modelName);
                        }

                        //var before = new Date().getTime();

                        //If absoluteSchema is not present..
                        if ($.isEmptyObject(dataContainer.schema )) {
                            //First get the schema..
                            Resource.getSchema(modelName, function(schema) {
                                schema = removeParentRelationFromSchema(schema, dataContainer);

                                //Populate the schema..
                                dataContainer.schema = schema;
                                //Store the schema to the localstorage..
                                SnaphyCache.save(modelName, schema);
                                addSort(tableState, ctrl);
                                //dataContainer.where = dataContainer.where || {};
                                dataContainer.getWhere()
                                    .then(function (where) {
                                        dataContainer.where = where;
                                        return Resource.getPage(start, number, tableState, modelName, schema, dataContainer.where);
                                    })
                                    .then(function(result) {
                                        dataContainer.displayed = result.data;
                                        //set the number of pages so the pagination can update
                                        tableState.pagination.numberOfPages = result.numberOfPages;
                                        dataContainer.settings.pagesReturned = result.numberOfPages;
                                        dataContainer.settings.totalResults = result.count;
                                        //Stop the loading bar..
                                        dataContainer.settings.isLoading = false;
                                        dataContainer.settings.schemaFetched = true;
                                    })
                                    .catch(function (error) {
                                        console.error(error);
                                        //Stop the loading bar..
                                        dataContainer.settings.isLoading = false;
                                        dataContainer.settings.schemaFetched = false;
                                    })
                            }, function(httpResp){
                                console.error(httpResp);
                                //Stop the loading bar..
                                dataContainer.settings.isLoading = false;
                                dataContainer.settings.schemaFetched = false;
                            });
                        }else{
                            addSort(tableState, ctrl);
                            dataContainer.getWhere()
                                .then(function (where) {
                                    dataContainer.where = where;
                                    return Resource.getPage(start, number, tableState, modelName, dataContainer.schema, dataContainer.where);
                                })
                                .then(function(result) {
                                    dataContainer.displayed = result.data;
                                    tableState.pagination.numberOfPages = result.numberOfPages; //set the number of pages so the pagination can update
                                    dataContainer.settings.pagesReturned = result.numberOfPages;
                                    dataContainer.settings.totalResults = result.count;
                                    dataContainer.settings.isLoading = false;
                                    dataContainer.settings.schemaFetched = true;
                                })
                                .catch(function (error) {
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

                    /**
                     * Open custom url of form on save.
                     * @param schema
                     */
                    var openCustomUrl = function (schema) {
                        if(schema.settings){
                            if(schema.settings.form){
                                if(schema.settings.form.url){
                                    if(schema.settings.form.target === "_blank"){
                                        var url = $state.href(schema.settings.form.url, {});
                                        window.open(url, 'blank');
                                    }else{
                                        $state.go(schema.settings.form.url);
                                    }
                                }
                            }
                        }
                    };

                    //Copy the services method to table View resources..object..
                    var returnObj = TableViewResource(getCache, refreshData, $scope);




                    returnObj.getCache = getCache;
                    returnObj.refreshData = refreshData;
                    returnObj.resetAll = resetAll;
                    returnObj.openCustomUrl = openCustomUrl;


                    return returnObj;
                }
            };
        };



        /**
         * Remove Parent relation from schema.
         * @param schema
         * @param dataContainer
         */
        var removeParentRelationFromSchema = function(schema, dataContainer){
            //Remove from relation... and from fields. and from header..
            if(schema.relations && dataContainer.relationKey){
                if(schema.relations.hasOne){
                    var index = schema.relations.hasOne.indexOf(dataContainer.relationKey);
                    if(index > -1){
                        schema.relations.hasOne.splice(index, 1);
                    }
                }
                if(schema.relations.belongsTo){
                    var index = schema.relations.belongsTo.indexOf(dataContainer.relationKey);
                    if(index > -1){
                        schema.relations.belongsTo.splice(index, 1);
                    }
                }
            }

            if(schema.fields && dataContainer.relationKey){
                var removeIndex = [];
                for(var i=0; i<schema.fields.length; i++){
                    var field = schema.fields[i];
                    if(field){
                        if(field.key === dataContainer.relationKey){
                            removeIndex.push(i);
                        }
                    }
                }

                removeIndex.forEach(function (index) {
                    schema.fields.splice(index, 1);
                });
            }

            if(schema.header && dataContainer.relationKey){
                var headerList = schema.header;
                schema.header = [];
                for(var j=0; j < headerList.length;j++){
                    var header = headerList[j];
                    if(header){
                        var pattern = new RegExp(dataContainer.relationKey + ".+");
                        if(!pattern.test(header)){
                            schema.header.push(header);
                        }
                    }
                }

            }

            return schema;

        };

        //Return value
        return {
            tableViewInit: tableViewInit
        };
    }]);