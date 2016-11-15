# detailView plugin for Snaphy


###Plugin for representing the detail view of each modal.

###This plugin is exposed on  `/detailView` route

###Please copy the `detailView` folder to `common/settings/` after plugin installed.

### TO Install a npm module use `npm install moduleName --prefix ../../../ --save` and then save the module in package.json of plugin file.


####DOCUMENTATION
1. **DetailViewSchema**  
Method: `POST`  
Route: `/model name/detailViewSchema`  
It has everything like `AbsoluteSchema` except it doesn't has __hasMany, hasManyThrough and hasAndBelongsToMany__ relation info.  
```
{
    fields, <- including hasOne and belongsTo relationships 
    validation,
    relation{
        hasOne:['relationName'],
        belongsTo:['relation name']
    }
}
```
2. **getModelRelationSchema**  
Method: `POST`  
Route: `/model name/getModelRelationSchema`  
Fetches the relation schema of a **root model** relationship.      
```
{
  hasOne:{
    modelName,
    searchId <- the id representation of root model to find the model in the hasOne related model
  },
  belongsTo:{
    modelName,
    searchId <- the id representation of root model to find the model in the belongsTo related model
  },
  hasMany| hasAndBelongsToMany:{
    modelName,
    searchId <- the id representation of root model to find the model in the hasMany related model
  },
  hasManyThrough:{
    modelName,
    searchId <- the id representation of root model to find the model in the hasMany related model
    throughModelName <- Name of the model through which the model is related to another model.
  }
  
}
```

3. For fetching each  __hasMany, hasManyThrough and hasAndBelongsToMany__  data basic absolute schema is used.  

4. Proposal for adding summary widget for adding summary information in the detailView.

####Written by Robins Gupta

