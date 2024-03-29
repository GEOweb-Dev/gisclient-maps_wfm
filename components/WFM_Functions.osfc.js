//*********************************************************************************************************
//**** Functions for GEOweb - WFM integration
//**** OSFC integration functions
var OSFCData = {
    action: 'writeOnOFSC'
};

window.GCComponents.Functions.postMessageHandler = function (event) {
    // **** TODO: validate source
    var postData = event.data;
    if (postData.action == 'centerMap') {
        window.GCComponents.Functions.centerMap(postData.x, postData.y, postData.srid, postData.zoom);
    }
}

// **** PostMessage
window.addEventListener('message', window.GCComponents.Functions.postMessageHandler, false);

window.GCComponents.Functions.sendToWFM = function(wfmItems) {
    if (wfmItems.x && wfmItems.y && wfmItems.srid) {
        if (wfmItems.srid !== clientConfig.WFM_SRID)
            return;
        OSFCData.coordx = wfmItems.x;
        OSFCData.coordy = wfmItems.y;
    }
    else {
        if (wfmItems.wfm_outitem) {
            for (var field in wfmItems) {
                if (field !== 'wfm_outitem') {
                    var fieldVal = (typeof(wfmItems[field]) === 'undefined')?null:wfmItems[field];
                    OSFCData[field] = fieldVal;
                }
            }
        }
    }
    parent.postMessage(OSFCData,'*');
}

window.GCComponents.Functions.resetWFMData = function(){
    OSFCData = {
        action: 'writeOnOFSC'
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
