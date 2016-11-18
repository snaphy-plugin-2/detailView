(function () {
    'use strict';
    // this function is strict...
}());
angular.module($snaphy.getModuleName())
//Define your services here..
    .factory('DetailViewResource', ['Database', '$q', 'ImageUploadingTracker', 'SnaphyTemplate', function(Database, $q, ImageUploadingTracker, SnaphyTemplate) {
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

        //Copy data from one object to another without assignment..
        var copy = function(targetObj, destinationObj){
            for(var key in targetObj){
                if(targetObj.hasOwnProperty(key)){
                    destinationObj[key] = targetObj[key];
                }
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
                deferred.reject("Database Service is required");
            }
            return deferred.promise;
        };


        /**
         * Method  for checking if the automata form is valid.
         * @param  {[type]} form template schema object with property fields showing all the fields.
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





        /**
         * Model for saving the model structure..
         * @param formSchema
         * @param formData form validation and other data related to form.
         * @param formModel  Data going to save to server.
         */
        var saveForm = function(formSchema, formData, formModel) {
            var deferred = $q.defer();
            if(ImageUploadingTracker.isUploadInProgress()){
                SnaphyTemplate.notify({
                    message: "Wait!! Image uploading is in progress. Please wait till the image is uploaded.",
                    type: 'danger',
                    icon: 'fa fa-times',
                    align: 'left'
                });
                deferred.reject("Wait!! image uploading in progress.");
            }
            if (!isValid(formData)) {
                SnaphyTemplate.notify({
                    message: "Error data is Invalid.",
                    type: 'danger',
                    icon: 'fa fa-times',
                    align: 'left'
                });
                deferred.reject("Error data is invalid.");
            }
            else
            {
                //Now save the model..
                var baseDatabase = Database.loadDb(formSchema.model);
                var schema = {
                    "relation": formSchema.relations
                };

                formModel = formModel || {};

                var requestData = {
                    data: formModel, //here toJSON remove unwanted property like $promise from object.
                    schema: schema
                };

                //Start Loading bar..
                startLoadingbar(detailViewId);

                //Now save||update the database with baseDatabase method.
                baseDatabase.save({}, requestData, function(baseModel) {
                    SnaphyTemplate.notify({
                        message: "Data successfully saved.",
                        type: 'success',
                        icon: 'fa fa-check',
                        align: 'left'
                    });

                    deferred.resolve(baseModel);
                    //Stop Loading bar..
                    stopLoadingbar(detailViewId);

                }, function(respHeader) {
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

                    //console.error(respHeader);
                    SnaphyTemplate.notify({
                        message: message,
                        type: 'danger',
                        icon: 'fa fa-times',
                        align: 'left'
                    });

                    deferred.reject(respHeader);
                    //Stop Loading bar..
                    stopLoadingbar(detailViewId);
                });
            }
            return deferred.promise;
        }; //saveForm




        return {
            getDetailViewSchema: getDetailViewSchema,
            getRelationSchema: getRelationSchema,
            getDataFromServer: getDataFromServer,
            startLoadingbar: startLoadingbar,
            stopLoadingbar: stopLoadingbar,
            saveForm: saveForm,
            copy: copy,
            extend: extend
        };

    }]);