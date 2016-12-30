# detailView plugin for Snaphy


###Plugin for representing the detail view of each modal.

####This plugin is exposed on  `/detailView` route

####Please copy the `detailView` folder to `common/settings/` after plugin installed.

##### To Install a npm module use  
`npm install moduleName --prefix ../../../ --save`   
Save the module in package.json of plugin file.


####DOCUMENTATION
1. **DetailViewSchema**  
Method: `POST`  
Route: `/model name/detailViewSchema`  
It has everything like `AbsoluteSchema` except it doesn't has __hasMany, hasManyThrough and hasAndBelongsToMany__ relation info.  
A new container property added.
Now get your data in form of arranged container.  

Output will be like..  
```
{
  "schema": {
    "model": "Order",
    "relations": {
      "belongsTo": [
        "customer"
      ],
      "hasOne": [
        "deliveries",
        "invoices"
      ]
    },
    "container": {
      "default": [
        {
          "type": "dummy",
          "key": "orderNumber"
        },
        {
          "type": "dummy",
          "key": "added"
        },
        {
          "type": "belongsTo",
          "key": "customer",
          "templateOptions": {
            "container": {
              "default": [
                {
                  "type": "dummy",
                  "key": "added"
                }
              ],
              "customerBox": [
                {
                  "type": "input",
                  "templateOptions": {
                    "container": "customerBox",
                    "type": "text",
                    "label": "Enter customer name",
                    "id": "CustomerName",
                    "inline": true,
                    "colSize": "col-xs-6"
                  },
                  "key": "name"
                }
              ],
              "subscriptionBox": []
            },
            "validations": {
              "rules": {
                "CustomerEmail": {
                  "email": true
                }
              },
              "messages": {
                "CustomerEmail": {
                  "email": "Email must be valid."
                }
              }
            }
          }
        }
      ]
    },
    "validations": {
      "rules": {
        "orderStatus": {
          "required": true,
          "valueNotEquals": ""
        }
      },
      "messages": {
        "orderStatus": {
          "required": "Please add status",
          "valueNotEquals": "Please add status"
        }
      }
    }
  }
}
```

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
    relationName,
    modelName,
    searchId <- the id representation of root model to find the model in the hasOne related model
  },
  belongsTo:{
    relationName,
    modelName,
    searchId <- the id representation of root model to find the model in the belongsTo related model
  },
  hasMany| hasAndBelongsToMany:{
    relationName,
    modelName,
    searchId <- the id representation of root model to find the model in the hasMany related model
  },
  hasManyThrough:{
    relationName,
    modelName,
    searchId <- the id representation of root model to find the model in the hasMany related model
    through <- Name of the model through which the model is related to another model.
  }
  
}
```

3. For fetching each  __hasMany, hasManyThrough and hasAndBelongsToMany__  data basic absolute schema is used.  

4. Proposal for adding summary widget for adding summary information in the detailView.


5. You can add dynamic routes in detailView add this property in `settings/detailView/admin-panel-settings.js`
```
"addRoutes":{
  //State name...
  "addSubscription": {
    "url": "/add/customer/:id",
    "templateUrl": "template link here...",
    "controller": "addSubscription"
  }
}
```


### Future Roadmap
1. Add docs for other feature.
2. Add docs for show/hide action|edit|delete button.

####Written by Robins Gupta

