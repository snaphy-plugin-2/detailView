"use strict";
/*jshint esversion: 6 */


module.exports = function( server, databaseObj, helper, packageObj) {
	const _ =  require("lodash");
	/**
	 * Here server is the main app object
	 * databaseObj is the mapped database from the package.json file
	 * helper object contains all the helpers methods.
	 * packegeObj contains the packageObj file of your plugin. 
	 */

	/**
	 * Initialize the plugin at time of server start.
	 * init method should never have any argument
	 * It is a constructor and is populated once the server starts.
	 * @return {[type]} [description]
	 */
	var init = function(){
		var models = server.models();

		models.forEach(function(Model) {
			//refer to https://apidocs.strongloop.com/loopback/#app-models
			addDetailSchema(server, Model.modelName);
			getModelRelationSchema(server, Model.modelName);
		});
	};


	var getModelRelationSchema = function(app, modelName){
		var modelObj = app.models[modelName];
		modelObj.getModelRelationSchema = function(callback){
			//Now form the schema and send it to the client..
			let relations = modelObj.definition.settings.relations;
			//Get template structure..
			let schema = generateRelationStr(app, modelName, relations);
			callback(null, schema);
		};

		//Now registering the method `getAbsoluteSchema` required for robust automata plugin..
		modelObj.remoteMethod(
			'getModelRelationSchema',
			{
				returns: {arg: 'schema', type: 'object'},
				description: "Get the relation detail schema for a particular model."
			}
		);
	};





	/**
	 * Add detail schema to the models..
	 * @param app
	 * @param modelName
	 */
	var addDetailSchema = function(app, modelName){
		var modelObj = app.models[modelName];

		modelObj.getDetailSchema = function(callback) {
			//Now form the schema and send it to the client..
			let relations = modelObj.definition.settings.relations;
			//Get template structure..
			let schema = generateTemplateStr(app, modelName);

			//Now recursively add relations to the models...
			addNestedModelRelation(app, schema, relations, modelName);
			callback(null, schema);
		};

		//Now registering the method `getAbsoluteSchema` required for robust automata plugin..
		modelObj.remoteMethod(
			'getDetailSchema',
			{
				returns: {arg: 'schema', type: 'object'},
				description: "Get the detail schema for a particular model."
			}
		);
	};


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
	 * Recursive function for generating models schema. and header.
	 * @param app
	 * @param schema
	 * @param relations
	 * @param rootModelName model name of the root
	 */
	var addNestedModelRelation = function(app, schema, relations, rootModelName){
		//Now adding  prop of belongTo and hasMany method to the header and schema respectfully...
		for(var relationName in relations){
			if(relations.hasOwnProperty(relationName)){
				var relationObj = {};
					relationObj = extend({}, relations[relationName]);
				var modelName       = relationObj.model;
				if((relationObj.type === 'hasOne' || relationObj.type === 'belongsTo') && relationObj.templateOptions !== undefined){

					if(relationObj.type === "hasOne"){
						schema.relations.hasOne.push(relationName);
					}else{
						//Add this relation to the schema..
						schema.relations.belongsTo.push(relationName);
					}

					var belongsToSchema = {
						type           : relationObj.templateOptions.type || "belongsTo",
						key            : relationName,
						templateOptions: relationObj.templateOptions
					};

					belongsToSchema.templateOptions.model      = relationObj.model;
					belongsToSchema.templateOptions.foreignKey = relationObj.foreignKey === "" ? relationName + 'Id' : relationObj.foreignKey;
					//Now add nested schema to the relational model.
					generateTemplateStr(app, relationObj.model, belongsToSchema.templateOptions);

					if(belongsToSchema.templateOptions.includeRelatedModel){
						//Now if model-> related model -> related model (belongTo data is requested)
						//If some related mode of related model is requested too.. then in this case.. call this method..
						//TODO THIS CONDITION MAY LEADS TO INFINITE LOOP OF CYCLIC ERROR ..AVOID..
						//TODO ERROR PRONE USE IT CAUTIONLY....
						//console.log(relationObj.model);
						var relatedModelObj = app.models[relationObj.model];
						var relatedModelRelations = relatedModelObj.definition.settings.relations;
						belongsToSchema.templateOptions.relations = belongsToSchema.templateOptions.relations || {
								hasMany:[],
								belongsTo:[],
								hasManyThrough:[],
								hasAndBelongsToMany:[],
								hasOne:[]
							};

					}

					//add schema
					addNestedModelRelation(app, belongsToSchema.templateOptions, relatedModelRelations, relationObj.model);

					if(relations[relationName].templateOptions.container){
						schema.container[relations[relationName].templateOptions.container] = schema.container[relations[relationName].templateOptions.container] || initializeContainer();;
						schema.container[relations[relationName].templateOptions.container].schema.push(belongsToSchema);
					}else{
						//Now add this to the schema..
						schema.container.default = schema.container.default || initializeContainer();
						schema.container.default.schema.push(belongsToSchema);
						//schema.fields.push(belongsToSchema);
					}



				}

			}
		}//for in loop..
	};

	/**
	 * Fetch the searchId for a relation data..
	 */
	const getSearchId = function(relationObj){
		if(relationObj){
			if(!relationObj.foreignKey){
				return _.lowerFirst(relationObj.model) + "Id";
			}else{
				return relationObj.foreignKey;
			}
		}
	};



	/**
	 * Generate the relation schema for each model...
	 * @param app
	 * @param modelName
	 * @param relationObj
     */
	const generateRelationStr = function(app, modelName, relationObj){
		var schema = {};
		schema.model = modelName;
		schema.relations = {
			belongsTo:[],
			hasOne:[],
			hasAndBelongsToMany: [],
			hasManyThrough: [],
			hasMany: []
		};

		if(relationObj){
			for(let relationName in relationObj){
				if(relationObj.hasOwnProperty(relationName)){
					var relationData = relationObj[relationName];

					if(relationData.type === "hasOne"){
						let obj = {
							relationName: relationName,
							modelName: relationData.model,
							searchId: _.lowerFirst(modelName) + "Id"
						};
						schema.relations.hasOne.push(obj);

					} else if(relationData.type === "belongsTo"){
						let obj = {
							relationName: relationName,
							modelName: relationData.model,
							searchId: _.lowerFirst(modelName) + "Id"
						};
						schema.relations.belongsTo.push(obj);
					} else if(relationData.type === "hasMany"){
						if(relationData.through){
							let relationModelName = relationData.through;
							let relationModelObj = app.models[relationModelName];
							let relationsObjArray = relationModelObj.definition.settings.relations;
							let searchedRelationData = findRelationByModelName(modelName, relationsObjArray);

							if(searchedRelationData){
								let obj = {
									relationName: relationName,
									modelName: relationData.model,
                                    relationKey: searchedRelationData.relationName,
									searchId: getSearchId(searchedRelationData),
									through: relationModelName
								};
								schema.relations.hasManyThrough.push(obj);
							}
						}else{
							//normal hasMany case..
							let relationModelName = relationData.model;
							let relationModelObj = app.models[relationModelName];
							let relationsObjArray = relationModelObj.definition.settings.relations;
							let searchedRelationData = findRelationByModelName(modelName, relationsObjArray);
							if(searchedRelationData){
								let obj = {
									relationName: relationName,
									modelName: relationData.model,
									relationKey: searchedRelationData.relationName,
									searchId: getSearchId(searchedRelationData)
								};
								schema.relations.hasMany.push(obj);
							}
						}
					} else if(relationData.type === "hasAndBelongsToMany"){
						let obj = {
							relationName: relationName,
							modelName: relationData.model,
							searchId: _.lowerFirst(modelName) + "Id"
						};
						schema.relations.hasAndBelongsToMany.push(obj);

					}
				}
			}
		}

		return schema;
	};


	/**
	 * Search for relation object data by model name.
	 */
	const findRelationByModelName = function(modelName, relationsObjArray){
		let relationData;
		for(let key in relationsObjArray){
			if(relationsObjArray.hasOwnProperty(key)){
				if(relationsObjArray[key].model === modelName){
					relationData = JSON.parse(JSON.stringify(relationsObjArray[key]));
					relationData.relationName = key;
					break;
				}
			}
		}

		return relationData;
	};


    /**
     *  Intiailize the container object for a container type
     * @returns {{class: Array, style: {}, schema: Array, options: {}}}
     */
	const initializeContainer = function () {
		return {
            //Class in form or array..
		    class: [],
            style:{},
            //Store schema for the given container
            schema:[],
            //For storing additional options..
            options:{}
		};
    };

    /**
     * Add container definition like class or style..
     * @param schema
     * @param tableObj
     */
	const addContainerSettings = function (schema, tableObj) {
	    if(tableObj.container){
	        for(const containerName in tableObj.container){
	            if(tableObj.container.hasOwnProperty(containerName)){
                    //initializeContainer();
                    schema.container[containerName] = schema.container[containerName] || initializeContainer();
                    let settings = tableObj.container[containerName];
                    //Assign properties value to schema..
                    for(const prop in settings){
                        if(settings.hasOwnProperty(prop)){
                            schema.container[containerName][prop] = settings[prop];
                        }
                    }
                }
            }
        }
        return schema;
    };


	/**
	 * Generate formly template structure for data entry schema. Also add relations
	 * @param app
	 * @param modelName
	 * @param schema {Object} optional
	 * @returns {*}
	 */
	const generateTemplateStr = function(app, modelName, schema){
		if(schema === undefined){
			schema = {};
			schema.model = modelName;
			schema.relations = {
				belongsTo:[],
				hasOne:[]
			};
		}
		//Start adding container..
		schema.container = {};
		//Store different fields by their name,,
		schema.container.default   = schema.container.default || initializeContainer();
		const validationModelObj = helper.getValidationObj(modelName);
		//path of table data from //common/table/model.json data
		const tableModelObj = helper.getTablePath(modelName);
		//Actual table object data..
		let tableModelData = {};
		//{validationsBackend, complexValidation}
        if(tableModelObj){
            if(tableModelObj.json){
                tableModelData = helper.readPackageJsonFile(tableModelObj.json);
            }
        }

        //Add container settings stored in table definitions..file..
        addContainerSettings(schema, tableModelData);

		let
			validationObj,
			complexValidation,
			modelObj    = app.models[modelName],
			modelProperties = modelObj.definition.rawProperties;


		if(validationModelObj){
			if(validationModelObj.validationsBackend){
				validationObj = validationModelObj.validationsBackend;
			}

			if(validationModelObj.complexValidation){
				complexValidation = validationModelObj.complexValidation;
			}
		}



		let newValidationObj = {
			rules:{},
			messages:{}
		};

		for(var propertyName in modelProperties){
			if(modelProperties.hasOwnProperty(propertyName)){
				let propObj = modelProperties[propertyName].template;
				if(propObj !== undefined){
					propObj.key = propertyName;
					//also add the validation to the object..
					try{
						var validationRules = validationObj.rules[propertyName];
						var validationMessages = validationObj.messages[propertyName];

						if(propObj.templateOptions && validationRules){
							if(propObj.templateOptions.id){
								var validationName = propObj.templateOptions.id;
								//Get the validation object..
								newValidationObj.rules[validationName] = validationRules;
								newValidationObj.messages[validationName] = validationMessages;
							}
						}
					}catch(err){
						// Do nothing
						// Validation is not defined in the model definition
					}

					if(propObj.templateOptions){
						if(propObj.templateOptions.container){
							schema.container[propObj.templateOptions.container] = schema.container[propObj.templateOptions.container] || initializeContainer();
							schema.container[propObj.templateOptions.container].schema.push(propObj);
						}else{
							schema.container.default   = schema.container.default || initializeContainer();
							schema.container.default.schema.push(propObj);
						}
					}else{
						schema.container.default   = schema.container.default || initializeContainer();
						schema.container.default.schema.push(propObj);
					}

				}
			}
		}//for-in

		//This code is just for adding validation in schema..of relation properties..
		var modelRelation = modelObj.definition.settings.relations;
		for(var relationName in modelRelation){
			if(modelRelation.hasOwnProperty(relationName)){
				var relationObj = modelRelation[relationName].templateOptions;
				if(relationObj !== undefined){
					relationObj.key = relationName;
					//also add the validation to the object..
					try{
						var validationRules_ = validationObj.rules[relationName];
						var validationMessages_ = validationObj.messages[relationName];

						if(relationObj && validationRules_){
							if(relationObj.id){
								var validationName_ = relationObj.id;
								//Get the validation object..
								newValidationObj.rules[validationName_] = validationRules_;
								newValidationObj.messages[validationName_] = validationMessages_;
							}
						}

					}catch(err){
						console.error(err);
						// Do nothing
						// Validation is not defined in the model definition
					}

				}
			}
		}//for-in


		//Now also add custom validation for facilitating array type validation or other complex validation..
		//Just copy direct validation in this case..
		if(complexValidation){
			if(complexValidation.rules){
				for(var key in complexValidation.rules){
					if(complexValidation.rules.hasOwnProperty(key)){
						newValidationObj.rules[key] = complexValidation.rules[key];
						if(complexValidation.messages[key]){
							newValidationObj.messages[key] = complexValidation.messages[key];
						}

					}
				}
			}
		}


		//Now adding validation obj..
		schema.validations = newValidationObj;
		return schema;
	};




	//return all the methods that you wish to provide user to extend this plugin.
	return {
		init: init
	};
}; //module.exports
