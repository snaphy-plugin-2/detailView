/**
 * Created by robins on 2/12/15.
 */
'use strict';
/*jslint browser: true*/
/*$snaphy*/
//This is the setting file of the plugin..TO be configured according to the user needs..
var settings = {
  "defaultTemplate": true,
  "detailViewId": "#detailViewWidget",
  //add template name to add template path..for those not give template.. by default template will be used..
  "addRoutes":{
      //State name...
      /*"addSubscription": {
        "url": "/add",
        "templateUrl": "/danzFoodsPlugin/views/mainDataEntry.html",
        "controller": "addSubscription"
      },
    */
  }
};



//Now adding settings to the main index file..
$snaphy.addSettings('detailView', settings);
