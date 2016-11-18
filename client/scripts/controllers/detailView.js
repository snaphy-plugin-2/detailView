(function () {
    'use strict';
}());

angular.module($snaphy.getModuleName())

//Controller for detailViewControl ..
.controller('detailViewControl', ['$scope', '$stateParams', 'Database', "DetailViewResource", "Resource", "ImageUploadingTracker", "SnaphyTemplate", "$timeout",
    function($scope, $stateParams, Database, DetailViewResource, Resource, ImageUploadingTracker, SnaphyTemplate, $timeout) {
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
                            watchRelatedModels: {},
                            saveFormData: {},
                            //Creates a backup of data  to be performed while in edit mode..
                            backupData: {},
                            //Inline search data object
                            //Store data of inline search associated with each table header.
                            inlineSearch:{}
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


                    //console.log(cache[relationName]);
                    //TODO: CREATE A NEW SERVICE AND DO ALL WORK THERE..
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



                        if (!dataContainer.persistentData.stCtrl && ctrl) {
                            dataContainer.persistentData.stCtrl = ctrl;
                        }
                        if (!tableState && dataContainer.persistentData.stCtrl) {
                            dataContainer.persistentData.stCtrl.pipe();
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





                    //Example addInlineFilterResetMethod('#automataTable', 'number', inlineSearch, header)
                    /**
                     * Add reset method for each table..
                     * @param tableId
                     * @param type
                     * @param modelObj
                     * @param columnName
                     */
                    var addInlineFilterResetMethod = function(tableId, type, modelObj, columnName){
                        if(type === "select" || type === "related.select"){
                            var element = $(tableId);
                            //Now add a Reset method to the filter..
                            addResetMethod(function(){
                                //console.log("Resetting select");
                                if(modelObj[columnName]){
                                    modelObj[columnName] = null;
                                }

                                try{
                                    //Now reinitialize the
                                    setTimeout(function() {
                                        $($(element).find('.js-select2')).select2('val', 'All');
                                    }, 0);
                                }
                                catch(e){

                                }

                            });
                        }else if (type === "text" || type === "number" || type === "date" || type === 'related') {
                            addResetMethod(function(){
                                $timeout(function(){
                                    //$($(element).find('input')).val("");
                                    //console.log("Resetting ", type);
                                    if(modelObj[columnName]){
                                        modelObj[columnName] = null;
                                    }
                                });
                            });
                        }
                    };


                    /**
                     * Return the params for ui-sref for onClick
                     * @param params
                     * @param rowObject
                     * @returns {*}
                     */
                    var getParams = function(params, rowObject) {
                        for (var key in params) {
                            if (params.hasOwnProperty(key)) {
                                if(rowObject[key]){
                                    params[key] = rowObject[key];
                                }
                            }
                        }
                        return params;
                    };



                    /**
                     * Event listener for adding reset button to the filters. To be called when reset button is called..
                     */
                    var addResetMethod = function(func) {
                        getCache().resetFilterList = getCache().resetFilterList || [];
                        getCache().resetFilterList.push(func);
                    };


                    /**
                     * Reset the saved form data..
                     * @param form
                     */
                    var resetSavedForm = function(form) {
                        //reset the tracking bar..
                        ImageUploadingTracker.resetTracker();
                        getCache().settings.saveFormData = {};
                        if (form) {
                            form.$setPristine();
                        }
                    };



                    /**
                     * change prop like access-level to level only
                     * Get the model properties name on the case of belongsTo or hasOne relationships..
                     * @param columnHeader
                     */
                    var getColumnKey = function(columnHeader) {
                        //var keyName;
                        var patt = /^[A-Z0-9a-z-$]+\./;
                        return columnHeader.replace(patt, '');
                    };



                    /**
                     * Check if to display the properties of the table or not.
                     * schema {
                     * 	tables:{
                     * 		username:{
                     * 			"display": false
                     * 		}
                     * 	}
                     * }
                     */
                    var displayProperties = function(schema, header) {
                        //First convert the header to optimal type..
                        header = header.replace(/\./, "_");
                        if (schema.tables) {
                            if (schema.tables[header]) {
                                if (schema.tables[header].display !== undefined) {
                                    if (!schema.tables[header].display) {
                                        return false;
                                    }
                                }
                            }
                        }
                        return true;
                    };

                    var convertToUnderScore = function(key){
                        if(key){
                            return key.replace(/\./, "_");
                        }
                        return "";
                    };


                    //Check if to show the text filter..
                    var showFilterType = function(header, schema){
                        if(schema.tables){
                            var keyName = convertToUnderScore(header);
                            if(schema.tables[keyName]){
                                var tableProp = schema.tables[keyName];
                                if(!tableProp){
                                    return null;
                                }
                                if(tableProp.search !== "related"){
                                    return tableProp.search;
                                }else{
                                    var type = tableProp.type;
                                    if(type === "date"){
                                        return "related.date";
                                    }
                                    else if( type === "select"){
                                        return "related.select";
                                    }
                                    else if( type === "number"){
                                        return "related.number";
                                    }else{
                                        return "related.text";
                                    }
                                }
                            }
                        }

                        return null;
                    };


                    /**
                     * Prepare where query for model. To be used in searching of  models. Used in method addWhereQuery.
                     * @param  {Object}          where      Where type object for for filtering the database. example {customerId: "324edfcs"}
                     * @param  {String}          searchType "select", "number", "date", "text"
                     * @param  {String}          columnName Name of column on which where query is applied.
                     * @param  {String or Object} data      Data assosiated with where query.
                     * @return {Object}                     Modified "where" type object for for filtering the database. example {customerId: "324edfcs"}
                     */
                    var prepareWhereQuery = function(where, searchType, columnName, data){
                        if(data){
                            if(columnName){
                                //Type may be of 3 types "select", "date", "text", "number"
                                if(searchType === "select" || searchType === "number"){
                                    where[columnName] = data;
                                }else if(searchType === "date"){
                                    //TODO CHANGE HERE TO NOT RESET EVERYTIME..
                                    where.and = [];
                                    var obj = {};
                                    obj[columnName] = {"gte" : new Date(data) };
                                    where.and.push(obj);
                                }else{
                                    where[columnName] = {
                                        like : data
                                    };
                                }
                            }


                        }

                        return where;
                    };

                    //http://stackoverflow.com/questions/1584370/how-to-merge-two-arrays-in-javascript-and-de-duplicate-items
                    /**
                     * Method to remove the duplicate entries from an array
                     * @return {[type]} [description]
                     */
                    var arrayUnique = function(array) {
                        var a = array.concat();
                        for(var i=0; i<a.length; ++i) {
                            for(var j=i+1; j<a.length; ++j) {
                                if(a[i] === a[j])
                                    a.splice(j--, 1);
                            }
                        }

                        return a;
                    };


                    //Clear the data showing in the table.
                    var clearData = function(){
                        getCache().displayed.length = 0;
                        getCache().settings.pagesReturned = 0;
                        getCache().settings.totalResults = 0;

                    };


                    var getOptions = function(header, schema){
                        if(schema.tables){
                            var keyName = header.replace(/\./, "_");
                            if(schema.tables[keyName]){
                                var tableProp = schema.tables[keyName];
                                if(tableProp.search === "select" || tableProp.type === "select"){
                                    if(tableProp.options){
                                        return tableProp.options;
                                    }
                                }
                            }
                        }

                        return null;
                    };


                    var addWhereQuery = function(model, columnName, filterType, schema){
                        getCache().settings.resetPage = true;
                        getCache().where = getCache().where  || {};
                        if(filterType === "select"){
                            if(model){
                                getCache().where = prepareWhereQuery(getCache().where, filterType, columnName, model);
                            }

                            //Now redraw the table..
                            refreshData();
                        }else if (filterType === "number") {
                            if(model){
                                getCache().where = prepareWhereQuery(getCache().where, filterType, columnName, model);
                            }
                            //Now redraw the table..
                            refreshData();
                        }
                        else if (filterType === "date") {
                            if(model){
                                getCache().where = prepareWhereQuery(getCache().where, filterType, columnName, model);

                            }
                            //Now redraw the table..
                            refreshData();

                        }else if(/^related.+/.test(filterType)){
                            if(model){
                                //First find the data....
                                if(schema.tables){
                                    var keyName = columnName.replace(/\./, "_");
                                    if(schema.tables[keyName]){
                                        //Define a $scope variable for watching query related to..each models.
                                        getCache().settings.watchRelatedModels = getCache().settings.watchRelatedModels || {};

                                        var tableProp = schema.tables[keyName];
                                        var modelName = tableProp.relatedModel;
                                        var foreignKey = tableProp.foreignKey;
                                        var searchProp = tableProp.propertyName;
                                        //Now first find the related values then add where query..
                                        var dbService = Database.loadDb(modelName);
                                        getCache().settings.watchRelatedModels[modelName] = getCache().settings.watchRelatedModels[modelName] || {};
                                        getCache().settings.watchRelatedModels[modelName].filter = getCache().settings.watchRelatedModels[modelName].filter || {};
                                        getCache().settings.watchRelatedModels[modelName].filter.where  = getCache().settings.watchRelatedModels[modelName].filter.where || {};
                                        getCache().settings.watchRelatedModels[modelName].filter.limit  = 10;
                                        getCache().settings.watchRelatedModels[modelName].filter.fields =  { id: true };
                                        //Preparing the where query..
                                        getCache().settings.watchRelatedModels[modelName].filter.where = prepareWhereQuery(getCache().settings.watchRelatedModels[modelName].filter.where, tableProp.type, searchProp, model);

                                        dbService.find({
                                            filter: getCache().settings.watchRelatedModels[modelName].filter
                                        }, function(values){
                                            //get the ids list..
                                            if(values){
                                                if(values.length){
                                                    //TODO only create if undefined..
                                                    var idList = [];
                                                    for(var i=0; i<values.length; i++){
                                                        //Collect the ids
                                                        var data = values[i];
                                                        idList.push(data.id);
                                                    }


                                                    //now prepare the where query..
                                                    if(idList.length){
                                                        //NOw remove the duplicates..
                                                        idList = arrayUnique(idList);

                                                        //PREPARE THE WHERE QUERY..
                                                        getCache().where[foreignKey] = {
                                                            inq: idList
                                                        };
                                                        //Now redraw the table..
                                                        refreshData();
                                                    }
                                                }else{
                                                    //Clear the data list..
                                                    clearData();

                                                }
                                            }else{

                                                //Clear the data..list
                                                clearData();
                                            }
                                        }, function(err){
                                            console.error(err);
                                        });

                                    }
                                }

                            }

                        }
                    };

                    //Check type of the table..
                    var checkType = function(rowObject, columnHeader) {
                        var colValue = getColValue(rowObject, columnHeader);
                        return Object.prototype.toString.call(colValue);
                    };

                    /**
                     * change prop like access_level to access only
                     * Get the key or the relationship name.
                     * @param rowObject
                     * @param columnHeader
                     * @returns {*}
                     */
                    var getKey = function(rowObject, columnHeader) {
                        var keyName;
                        if (rowObject) {
                            if (rowObject[columnHeader] !== undefined) {
                                keyName = columnHeader;
                            } else {
                                //Its a relational header properties name... map the header.. replace `customer_name` to name
                                var patt = /\.[A-Z0-9a-z]+$/;
                                keyName = columnHeader.replace(patt, '');
                            }
                        }
                        return keyName;
                    };



                    var getColValue = function(rowObject, columnHeader) {
                        var key = getKey(rowObject, columnHeader);

                        return key !== undefined ? rowObject[key] : null;
                    };


                    var dateInSeconds = function(rowObject, columnHeader, colKey) {
                        var date;
                        if(colKey){
                            //For related type object..
                            var colValue = getRelationColumnValue(rowObject, columnHeader, colKey);
                            date = toJsDate(colValue);
                            if(!date){
                                return null;
                            }else{
                                return date.getTime();
                            }
                        }
                        else{
                            var val = getColValue(rowObject, columnHeader);
                            date = new Date(val);
                            return date.getTime();
                        }
                    };

                    //Convert string to javascript date type object..
                    var toJsDate = function(str) {
                        if (!str) {
                            return null;
                        }
                        return new Date(str);
                    };


                    //TO be used in tables..
                    var getRelationColumnValue = function(rowObject, header, colKey) {
                        var colValue = getColValue(rowObject, header);
                        var isBelongToRelation = header !== colKey;
                        var hasOneRelationPropName = getColumnKey(header);
                        return (isBelongToRelation) ? colValue[hasOneRelationPropName] : colValue;
                    };

                    /**
                     * change prop like access-level to level only
                     * Get the model properties name on the case of belongsTo or hasOne relationships..
                     * @param columnHeader
                     */
                    var getColumnKey = function(columnHeader) {
                        //var keyName;
                        var patt = /^[A-Z0-9a-z-$]+\./;
                        return columnHeader.replace(patt, '');
                    };


                    var getRelationColumnType = function(rowObject, header, colKey, initialColumnType) {
                        var colValue = getRelationColumnValue(rowObject, header, colKey);
                        var hasOneRelationPropName = getColumnKey(header);
                        var isBelongToRelation = header !== colKey;
                        return (isBelongToRelation) ? checkType(colValue, hasOneRelationPropName) : initialColumnType;
                    };



                    /**
                     * Find model property for the table configuration from the config file
                     * @param  {object} configModelTableObj [description]
                     * @param  {string} propertyName        [description]
                     * @return {object}                     [description]
                     */
                    var findModelPropertyTableConfig = function(configModelTableObj, propertyName) {
                        //Convert dot to underscore..
                        var propertyName = convertToUnderScore(propertyName);
                        //get the property parameters..
                        var ModalpropertyObj = configModelTableObj;
                        if (ModalpropertyObj === undefined) {
                            return null;
                        }
                        if (ModalpropertyObj[propertyName] !== undefined) {
                            return ModalpropertyObj[propertyName];
                        }
                        return null;
                    };

                    // Used in  the automata to get the table values..
                    var getTagInfo = function(tableSchema, colKey, rowObject, header) {
                        var tableConfig = findModelPropertyTableConfig(tableSchema, colKey);
                        var colValue = getColValue(rowObject, header);
                        return tableConfig.tag[colValue];
                    };

                    /*Get related data tag info*/
                    var getRelatedDataTagInfo = function(tableConfig, colKey, rowObject, header){
                        var colVal = getRelationColumnValue(rowObject, header, colKey);
                        if(tableConfig){
                            if(tableConfig.tag){
                                var tagData = tableConfig.tag[colVal];
                                return tagData;
                            }
                        }
                    };


                    /**
                     * Initialize the edit form data from editing the form.
                     * @param  {[type]} data [description]
                     * @return {[type]}           [description]
                     */
                    var prepareDataForEdit = function(data, form) {
                        //First reset the previous data..
                        resetSavedForm(form);
                        //First create a backup of the the data in case of rollback changes/cancel
                        getCache().settings.backupData = angular.copy(data);
                        getCache().settings.saveFormData = data;
                    };


                    /**
                     * For finding array index of the data of array of objects with properties id..
                     * @return {[type]} [description]
                     */
                    var getArrayIndex = function(arrayData, id) {
                        for (var i = 0; i < arrayData.length; i++) {
                            var element = arrayData[i];
                            if (element.id.toString().trim() === id.toString().trim()) {
                                return i;
                            }
                        }
                        return null;
                    };



                    /**
                     * Method for deleting data from database and row of a table..
                     * @param  {Object} formStructure [schema of the model.]
                     * @param {Object} data        [Data going to be deleted]
                     */
                    var deleteData = function(formStructure, data) {
                        //get the model service..
                        var baseDatabase = Database.loadDb(formStructure.model);
                        $scope.dialog = {
                            message: "Do you want to delete the data?",
                            title: "Confirm Delete",
                            onCancel: function() {
                                /*Do nothing..*/
                                //Reset the dialog bar..
                                $scope.dialog.show = false;
                            },
                            onConfirm: function() {
                                var mainArrayIndex = getArrayIndex(getCache().displayed, data.id);
                                var oldDeletedData = getCache().displayed[mainArrayIndex];

                                //Reset the dialoag bar..
                                $scope.dialog.show = false;
                                baseDatabase.deleteById({
                                    id: data.id
                                }, function() {
                                    /*Delete the data from the database..*/
                                    SnaphyTemplate.notify({
                                        message: "Data successfully deleted.",
                                        type: 'success',
                                        icon: 'fa fa-check',
                                        align: 'left'
                                    });
                                }, function() {
                                    $timeout(function() {
                                        //Attach the data again..
                                        getCache().displayed.push(oldDeletedData);
                                    });

                                    //console.error(respHeader);
                                    SnaphyTemplate.notify({
                                        message: "Error deleting data.",
                                        type: 'danger',
                                        icon: 'fa fa-times',
                                        align: 'left'
                                    });
                                });
                                //Now delete the data..
                                getCache().displayed.splice(mainArrayIndex, 1);
                            },
                            show: true
                        };

                    };

                    /**
                     * Method  for checking if the form is valid.
                     * @param  {[type]} schema template schema object with property fields showing all the fields.
                     * @return {[type]}        [description]
                     */
                    var isValid = function(form) {
                        try {
                            //TODO Removing find alternate for  form.$dirty
                            if (form.validate()) {
                                if ($.isEmptyObject(form.$error)) {
                                    return true;
                                }
                            }
                        } catch (err) {
                            return false;
                        }

                        return false;
                    };


                    //Method for rollbackchanges is error occured..
                    var rollBackChanges = function() {
                        if (!$.isEmptyObject(getCache().settings.backupData)) {
                            getCache().displayed.forEach(function(data, index) {
                                if (data.id === getCache().settings.backupData.id && !$.isEmptyObject(getCache().settings.backupData)) {
                                    //rollback changes..
                                    getCache().displayed[index] = getCache().settings.backupData;
                                    //Reset backup data..
                                    getCache().settings.backupData = {};
                                    return false;
                                }
                            });
                        }
                    };



                    //Save|update the form..
                    /**
                     * Model for saving or updating the data to database..
                     * @param formStructure
                     * @param formData
                     * @param formModel
                     * @param goBack
                     * @param modelInstance referencing to the id attribute of the  form.
                     */
                    var saveForm = function(formStructure, formData, formModel, goBack, modelInstance) {
                        if(ImageUploadingTracker.isUploadInProgress()){
                            SnaphyTemplate.notify({
                                message: "Wait!! Image uploading is in progress. Please wait till the image is uploaded.",
                                type: 'danger',
                                icon: 'fa fa-times',
                                align: 'left'
                            });
                            return false;
                        }

                        if (!isValid(formData)) {
                            SnaphyTemplate.notify({
                                message: "Error data is Invalid.",
                                type: 'danger',
                                icon: 'fa fa-times',
                                align: 'left'
                            });

                            //If edit was going on revert back..
                            if (formModel.id) {
                                rollBackChanges();
                            }
                        } else {
                            //Now save the model..
                            var baseDatabase = Database.loadDb(formStructure.model);

                            var schema = {
                                "relation": getCache().schema.relations
                            };

                            var requestData = {
                                data: formModel,
                                schema: schema
                            };

                            //create a copy of the data..
                            var savedData = angular.copy(formModel);
                            var positionNewData;
                            var update;
                            if (formModel.id) {
                                update = true;

                            } else {
                                positionNewData = getCache().displayed.length;
                                //First add to the table..
                                getCache().displayed.push(savedData);
                                update = false;
                            }


                            //Now save||update the database with baseDatabase method.
                            baseDatabase.save({}, requestData, function(baseModel) {
                                if (!update) {
                                    //Now update the form with id.
                                    getCache().displayed[positionNewData].id = baseModel.data.id;
                                }
                                SnaphyTemplate.notify({
                                    message: "Data successfully saved.",
                                    type: 'success',
                                    icon: 'fa fa-check',
                                    align: 'left'
                                });
                            }, function(respHeader) {
                                //console.log("Error saving data to server");
                                //console.error(respHeader);
                                var message = "Error saving data.";
                                if(respHeader){
                                    if(respHeader.data){
                                        if(respHeader.data.error){
                                            if(respHeader.data.error.message){
                                                message = respHeader.data.error.message;
                                            }
                                        }
                                    }
                                }

                                if (update) {
                                    rollBackChanges();
                                } else {
                                    //remove the form added data..
                                    if (positionNewData > -1) {
                                        getCache().displayed.splice(positionNewData, 1);
                                    }
                                }

                                //console.error(respHeader);
                                SnaphyTemplate.notify({
                                    message: message,
                                    type: 'danger',
                                    icon: 'fa fa-times',
                                    align: 'left'
                                });
                            });

                            //Now reset the form..
                            resetSavedForm(formData);
                            closeModel(goBack, modelInstance);

                        }
                    }; //saveForm

                    //Goback or close the model..
                    var closeModel = function(goBack, modelInstance) {
                        //Reset the image upload if any...
                        ImageUploadingTracker.resetTracker();
                        if (goBack) {
                            if (modelInstance) {
                                //close the model..
                                $(modelInstance).modal('hide');
                            }
                        }
                    };






                    return {
                        getCache: getCache,
                        refreshData: refreshData,
                        resetAll: resetAll,

                        //Other table methods..
                        resetSavedForm: resetSavedForm,
                        addInlineFilterResetMethod: addInlineFilterResetMethod,
                        getParams: getParams,
                        getColumnKey: getColumnKey,
                        displayProperties: displayProperties,
                        showFilterType: showFilterType,
                        addWhereQuery: addWhereQuery,
                        getOptions: getOptions,
                        checkType: checkType,
                        getColValue: getColValue,
                        getKey: getKey,
                        findModelPropertyTableConfig: findModelPropertyTableConfig,
                        dateInSeconds: dateInSeconds,
                        toJsDate: toJsDate,
                        getTagInfo: getTagInfo,
                        getRelationColumnType: getRelationColumnType,
                        getRelationColumnValue: getRelationColumnValue,
                        getRelatedDataTagInfo: getRelatedDataTagInfo,
                        prepareDataForEdit: prepareDataForEdit,
                        deleteData: deleteData,
                        saveForm: saveForm

                    };
                }
            };

        })();

        //Call the init method..
        init();

    }//controller function..
]);