'use strict';

angular.module($snaphy.getModuleName())
//Define your services here..
    .factory('DetailViewResource', ['Database', '$q', function(Database, $q) {
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


        return {
            getDetailViewSchema: getDetailViewSchema,
            getRelationSchema: getRelationSchema
        };

    }]);