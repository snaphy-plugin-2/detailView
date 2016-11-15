"use strict";
/*jshint esversion: 6 */


module.exports = function( server, databaseObj, helper, packageObj) {
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
		});
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
				var relationObj = relations[relationName];
				var modelName       = relationObj.model;
				//Only add relation if template option in the template option is present..
				if((relationObj.type === 'hasMany' ||  relationObj.type === 'hasAndBelongsToMany' ) && relationObj.templateOptions !== undefined){
					var nestedSchema = {};

					if(relationObj.type === "hasMany"){
						if(relationObj.through){
							nestedSchema.type = 'arrayValue';
							nestedSchema.key = relationName;
							nestedSchema.templateOptions = {};
							nestedSchema.templateOptions.btnText = relationObj.templateOptions.btnText;
							if(relationObj.templateOptions.searchProp){
								nestedSchema.templateOptions.searchProp = relationObj.templateOptions.searchProp;
							}
							if(relationObj.templateOptions.create){
								nestedSchema.templateOptions.create = relationObj.templateOptions.create;
							}
							if(relationObj.templateOptions.hide){
								nestedSchema.templateOptions.hide = relationObj.templateOptions.hide;
							}
							if(relationObj.templateOptions.init){
								nestedSchema.templateOptions.init = relationObj.templateOptions.init;
							}

							nestedSchema.templateOptions.model = relationObj.through;

							var throughRelationName;
							var throughSearchId;
							var throughModelObj = app.models[relationObj.through];
							var relatedModelRelationObj = throughModelObj.definition.settings.relations;
							for(var relatedModelRelation in relatedModelRelationObj){
								if(relatedModelRelationObj.hasOwnProperty(relatedModelRelation)){
									var relatedModel = relatedModelRelationObj[relatedModelRelation];
									if(modelName === relatedModel.model){
										throughRelationName = relatedModelRelation;
									}
									else if(rootModelName === relatedModel.model){
										if(relatedModel.foreignKey){
											throughSearchId = relatedModel.foreignKey;
										}else{
											throughSearchId = rootModelName.toLowerCase() + "Id";
										}
									}
								}
							}


							//console.log(nestedSchema);
							//Now get nested schema str for the relational models..
							generateTemplateStr(app, relationObj.through, nestedSchema.templateOptions);

							var belongsToSchemaThrough = {
								type           : "belongsTo",
								key            : throughRelationName,
								templateOptions: relationObj.templateOptions
							};

							//Model name of relational data..
							belongsToSchemaThrough.templateOptions.model = relationObj.model;

							if(nestedSchema.templateOptions.fields === undefined){
								nestedSchema.templateOptions.fields = [];
							}

							nestedSchema.templateOptions.fields.push(belongsToSchemaThrough);

							//Also add templateStr for related model of HasManyThrough
							generateTemplateStr(app, relationObj.model, belongsToSchemaThrough.templateOptions);


							/**
							 * HasManyThrough structure
							 * {
							 * 		relation: 'product', RELATION OF THE THROUGH MODEL
							 * 		through: 'ProductOrder' THROUGH MODEL NAME
							 * 		whereId: 'orderId' Main Model search id in the through model data. helps in filtering the data when searching through ProductOrder model
							 * }
							 */
							//Push data to hasManyThrough array..
							schema.relations.hasManyThrough.push({
								//Relation of related model in though Model property name
								throughModelRelation: throughRelationName,
								through: relationObj.through,
								whereId:  throughSearchId,
								relationName: relationName
							});
						}else{
							nestedSchema.type = 'repeatSection';
							nestedSchema.key = relationName;
							nestedSchema.templateOptions = relationObj.templateOptions;
							nestedSchema.templateOptions.model = relationObj.model;
							//console.log(nestedSchema);
							//Now get nested schema str for the relational models..
							generateTemplateStr(app, relationObj.model, nestedSchema.templateOptions);

							//Now add nestedSchema to the schema object.
							schema.relations.hasMany.push(relationName);

						}
					}
					else{
						nestedSchema.type = 'repeatSection';
						nestedSchema.key = relationName;
						nestedSchema.templateOptions = relationObj.templateOptions;
						nestedSchema.templateOptions.model = relationObj.model;
						//console.log(nestedSchema);
						//Now get nested schema str for the relational models..
						generateTemplateStr(app, relationObj.model, nestedSchema.templateOptions);

						//Now add nestedSchema to the schema object.
						schema.relations.hasAndBelongsToMany.push(relationName);
					}

					schema.fields.push(nestedSchema);
				}
				if((relationObj.type === 'hasOne' || relationObj.type === 'belongsTo') && relationObj.templateOptions !== undefined){

					if(relationObj.type === "hasOne"){
						schema.relations.hasOne.push(relationName);
					}else{
						//Add this relation to the schema..
						schema.relations.belongsTo.push(relationName);
					}

					var belongsToSchema = {
						type           : "belongsTo",
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
						//add schema
						addNestedModelRelation(app, belongsToSchema.templateOptions, relatedModelRelations, relationObj.model);
					}
					//console.log(belongsToSchema);
					//Now add this to the schema..
					schema.fields.push(belongsToSchema);
				}

			}
		}//for in loop..
	};


	/**
	 * Generate formly template structure for data entry schema. Also add relations
	 * @param app
	 * @param modelName
	 * @param schema {Object} optional
	 * @returns {*}
	 */
	var generateTemplateStr = function(app, modelName, schema){
		if(schema === undefined){
			schema = {};
			schema.model = modelName;
			schema.relations = {
				hasMany:[],
				belongsTo:[],
				hasManyThrough:[],
				hasAndBelongsToMany:[],
				hasOne:[]
			};
		}
		schema.fields   = [];
		const validationModelObj = helper.getValidationObj(modelName);
		//{validationsBackend, complexValidation}

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
				var propObj = modelProperties[propertyName].template;
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

					schema.fields.push(propObj);
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
