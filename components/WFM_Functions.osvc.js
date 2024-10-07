//*********************************************************************************************************
//**** Functions for GEOweb - WFM integration
//**** OSVC integration functions

var OSVCData = {
    action: 'writeOnOSVC'
};

window.GCComponents.Functions.postMessageHandlerOSVC = function (event) {
    var postData = event.data;
    if (postData.layer) {
        var fType = GisClientMap.getFeatureType(postData.layer);
        if (!fType)
            return;

        var values = {};
        var queryString = '';
        for (var i=0; i<fType.properties.length; i++) {
            if (fType.properties[i].searchType == 0)
                continue;
            var fieldName = fType.properties[i].name;
            var valPlaceholder = 'param' + i;
            if (typeof (postData[fieldName]) != 'undefined') {
                if (queryString.length == 0) {
                    queryString += fieldName + ' = :' + valPlaceholder;
                }
                else {
                    queryString += ' AND ' + fieldName + ' = :' + valPlaceholder;
                }
                values[valPlaceholder] = postData[fieldName];
            }
        }
        if (queryString.length > 0) {
            queryString = '(' + queryString + ')';
            window.GCComponents.Functions.centerMapOnFeature(postData.layer, queryString, values);
        }
    }
    else if (postData.wkt) {
        var wktSRID = (postData.srid != null ? postData.srid : clientConfig.WFM_SRID);
        var wktPrj = new OpenLayers.Projection('EPSG:'+wktSRID);
        var geomInput = OpenLayers.Geometry.fromWKT(postData.wkt);
        if (GisClientMap.map.projection != wktPrj.projCode) {
            geomInput.transform(wktPrj, GisClientMap.map.projection);
        }
        geomInput.calculateBounds();
        GisClientMap.map.zoomToExtent(geomInput.bounds);
    }
}

// **** PostMessage
window.addEventListener('message', window.GCComponents.Functions.postMessageHandlerOSVC, false);

window.GCComponents.Functions.sendToWFM = function(wfmItems) {
    if (wfmItems.x && wfmItems.y && wfmItems.srid) {
        var srid_native = GisClientMap.map.displayProjection?GisClientMap.map.displayProjection:this.map.projection;
        var osvcCoordProp = (wfmItems.srid==srid_native?'osvc-coord':'osvc-coord-'+ wfmItems.srid.substring(wfmItems.srid.indexOf(":")+1));
        OSVCData[osvcCoordProp] = 'X:' + wfmItems.x + '|Y:' +wfmItems.y;
    }
    else {
        if (!wfmItems.wfm_outitem)
            return;
        var tagContent = '';
        for (var field in wfmItems) {
            if (field !== 'wfm_outitem') {
                var fieldVal = (typeof(wfmItems[field]) === 'undefined' || wfmItems[field] === null)?'':wfmItems[field];
                tagContent += field + ':' + fieldVal + '|';
            }
        }
        OSVCData[wfmItems.wfm_outitem] = tagContent.substring(0, tagContent.length -1);
    }
    parent.postMessage(OSVCData,'*');
}

window.GCComponents.Functions.resetWFMData = function(){
    OSVCData = {
        action: 'writeOnOSVC'
    };
    // **** Get main selection control
    var selectControls = GisClientMap.map.getControlsBy('gc_id', 'control-querytoolbar');
    if (selectControls.length != 1)
        return;
    if (!selectControls[0].controls)
        return;
    var selectControl = selectControls[0];
    selectControl.clearResults();
    if ($('#resultpanel').is(":visible"))
        sidebarPanel.hide();
    $('.panel-clearresults').css("display", "none");
}
