'use strict';

angular.module($snaphy.getModuleName())
//Define your services here..
    .factory('DetailViewResource', ['Database', '$q', function(Database, $q) {
        //-------------------------------GLOBAL VARIABLE-------------------------------------------------
        var detailViewId = $snaphy.loadSettings('detailView', "detailViewId");
        //-------------------------------------------------------------------------------------------

        //Copying one object to another..
        var extend = function(original, context, key) {
            for (key in context) {
                if (context.hasOwnProperty(key)) {
                    if (Object.prototype.toString.call(context[key]) === '[object Object]') {
                        original[key] = extend(original[key] || {}, context[key]);
                    } else {
                        original[key] = context[key];
                    }
                }
            }
            return original;
        };

        /**
         * Returns promise object
         * @param databaseService
         */
        var getDetailViewSchema = function(databaseService) {
            var deferred = $q.defer();
            if(databaseService){
                databaseService.getDetailSchema({}, {}, function(values) {
                    var schema = {};
                    extend(schema, values.schema);
                    deferred.resolve(schema);
                }, function(httpResp) {
                    deferred.reject(httpResp);
                });
            }else{
                deferred.reject("DatabaseService is required");
            }

            return deferred.promise;
        };

        /**
         * Fetch schema for model relation detail
         * @param databaseService
         */
        var getRelationSchema = function(databaseService) {
            var deferred = $q.defer();
            if(databaseService){
                databaseService.getModelRelationSchema({}, {}, function(values) {
                    var schema = {};
                    extend(schema, values.schema);
                    deferred.resolve(schema);
                }, function(httpResp) {
                    deferred.reject(httpResp);
                });
            }else{
                deferred.reject("DatabaseService is required");
            }

            return deferred.promise;
        };


        /**
         * @param id Css element parent block element..
         */
        var startLoadingbar = function(id){
            if(id){
                $(id).addClass('block-opt-refresh');
            }
        };



        /**
         * @param id Css element parent block element..
         */
        var stopLoadingbar = function(id){
            if(id) {
                $(id).removeClass('block-opt-refresh');
            }
        };


        var prepareFilterObject = function(schema){
            var filter = {};
            if(schema){
                if(schema.relations){
                    //Clear the include filter first..
                    filter.include = [];
                    if (schema.relations.belongsTo) {
                        if (schema.relations.belongsTo.length) {
                            schema.relations.belongsTo.forEach(function(relationName) {
                                var includeObj = {
                                    "relation": relationName
                                };
                                filter.include.push(includeObj);
                            });
                        }
                    }

                    if (schema.relations.hasOne) {
                        if (schema.relations.hasOne.length) {
                            schema.relations.hasOne.forEach(function(relationName) {
                                var includeObj = {
                                    "relation": relationName
                                };
                                filter.include.push(includeObj);
                            });
                        }
                    }

                }
            }
            return filter;
        };

        var getDataFromServer = function(schema, modelId, databaseService){
            var deferred = $q.defer();
            if(databaseService){
                //Prepare the filter object...
                var filter = prepareFilterObject(schema);
                startLoadingbar(detailViewId);
                //Now fetch the data..from server..
                databaseService.findById({
                    id: modelId,
                    filter: filter
                }, function(success){
                    deferred.resolve(success);
                    stopLoadingbar(detailViewId);
                    //
                }, function(respHeader){
                    deferred.reject(respHeader);
                    stopLoadingbar(detailViewId);
                });
            }else{
                deferred.reject("DatabaseService is required");
            }
            return deferred.promise;
        };


        return {
            getDetailViewSchema: getDetailViewSchema,
            getRelationSchema: getRelationSchema,
            getDataFromServer: getDataFromServer,
            startLoadingbar: startLoadingbar,
            stopLoadingbar: stopLoadingbar
        };

    }]);