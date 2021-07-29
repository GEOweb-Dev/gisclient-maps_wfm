// *******************************************************************************************
//*********************************************************************************************************
//**** Functions for GEOweb - WFM integration
//**** Common functions
window.GCComponents.Functions.centerMap = function (xCoord, yCoord, srid, zoom) {
    var lonLat = new OpenLayers.LonLat(xCoord, yCoord);
    var GCMap = GisClientMap.map;
    var retValue = {result: 'ok'};
    if (srid != GCMap.projection) {
        lonLat.transform(srid, GCMap.projection);
    }
    if(!GCMap.isValidLonLat(lonLat)){
        retValue.result = 'error';
        retValue.message = 'Posizione non valida: X ' +lonLat.lon+', Y '+lonLat.lat+', SRID ' + srid;
        alert(retValue.message);
        return retValue;
    }
    if(!GCMap.getMaxExtent().containsLonLat(lonLat)){
        retValue.result = 'error';
        retValue.message = 'Posizione fuori extent: X ' +lonLat.lon+', Y '+lonLat.lat+', SRID ' + srid;
        alert(retValue.message);
        return retValue;
    }
    GCMap.setCenter(lonLat);
    GCMap.zoomToScale(zoom, true);
    return retValue;
}

window.GCComponents.Functions.centerMapOnFeature = function(layer, whereCond, values) {
    var retValue = {result: 'ok'};
    var fType = GisClientMap.getFeatureType(layer);

    if(!fType) {
        retValue.result = 'error';
        retValue.message = 'Errore: il featureType '+selectedFeatureType+' non esiste';
        return retValue;
    }

    var params = {
        featureType: layer,
        query: whereCond,
        values: values
    };
    params.projectName = GisClientMap.projectName;
    params.mapsetName = GisClientMap.mapsetName;
    params.srid = GisClientMap.map.projection;

    $.ajax({
        url: clientConfig.GISCLIENT_URL + '/services/xMapQuery.php',
        method: 'POST',
        dataType: 'json',
        data: params,
        success: function(response) {
            if(!response || typeof(response) != 'object') {
                retValue.result = 'error';
                retValue.message = 'Errore di sistema';
                return retValue;
            }
            if(!response.length) {
                retValue.result = 'error';
                retValue.message = 'Nessun risultato';
                return retValue;
            }

            var geometries = new OpenLayers.Geometry.Collection(),
                len = response.length, result, i, geometry, feature;

            for(i = 0; i < len; i++) {
                result = response[i];

                geometry = result.gc_geom && OpenLayers.Geometry.fromWKT(result.gc_geom);
                if(!geometry) continue;
                delete result.gc_geom;

                geometries.addComponent(geometry);
            }

            if (geometries.components.length < 1) {
                retValue.result = 'error';
                retValue.message = 'Nessuna geometria nel risultato della ricerca';
                return retValue;
            }

            geometries.calculateBounds();
            GisClientMap.map.zoomToExtent(geometries.bounds);

            return retValue;
        },
        error: function() {
            retValue.result = 'error';
            retValue.message = 'Errore di sistema';
            return retValue;
        }
    });
}

window.GCComponents.Functions.parseQueryString = function() {
    var match,
        pl     = /\+/g,  // Regex for replacing addition symbol with a space
        search = /([^&=]+)=?([^&]*)/g,
        decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
        query  = window.location.search.substring(1);

    var urlParams = {};
    while (match = search.exec(query))
        urlParams[decode(match[1])] = decode(match[2]);

    return urlParams;
}

window.GCComponents.Functions.updateQueryString = function(updateItems) {
    var queryStringItems = window.GCComponents.Functions.parseQueryString();
    for (var item in updateItems) {
        queryStringItems[item] = updateItems[item];
    };

    if (history.pushState) {
        var newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?';
        for (var item in queryStringItems) {
            newUrl += item + '=' + queryStringItems[item] + '&';
        };
        window.history.pushState({path:newUrl},'',newUrl);
    }
}

window.GCComponents.InitFunctions.deactivateWFMSelection = function(map) {
    var selectControls = map.getControlsBy('gc_id', 'control-querytoolbar');
    if (selectControls.length == 1)
        selectControls[0].events.register('endQueryMap', null, function(e) {
            this.wfmSelection = false;
        });
}

// **** Toolbar integration
$(function(){
    window.GCComponents["QueryToolbar.Actions"].addAction(
            'wfm-mark',
            function(featureType, feature) {
                var selectControls = feature.layer.map.getControlsBy('gc_id', 'control-querytoolbar');
                if (selectControls[0].wfmSelection) {
                    return '<a class="olControlButtonItemInactive olButton olLikeButton" href="#" featureType="' + featureType.typeName
                    + '" featureId="' + feature.id
                    +'" action="wfm-mark" title="" style="margin:0"><span class="glyphicon-white glyphicon-check"></span></a>';
                }
                return "";
            },
            function(featureTypeName, featureId, objQueryToolbar) {
                var wfmLayer = objQueryToolbar.map.getLayersByName('layer-wfm-highlight')[0];
                // **** bring Vector layer on top
                var origLayerIndex = objQueryToolbar.map.getLayerIndex(wfmLayer);
                var maxIndex = objQueryToolbar.map.getLayerIndex(objQueryToolbar.map.layers[objQueryToolbar.map.layers.length -1]);
                if(origLayerIndex < maxIndex) objQueryToolbar.map.raiseLayer(wfmLayer, (maxIndex - origLayerIndex -1));
                objQueryToolbar.map.resetLayersZIndex();

                var feature = objQueryToolbar.findFeature(featureId);
                var newFeature = feature.clone();
                newFeature.featureTypeName = feature.featureTypeName;

                // **** Remove features of the same type
                var oldFeatures = [];
                var featureTypeArr = [featureTypeName];
                var featureNum = 1;
                for (var i=0; i<clientConfig.WFM_LAYERS.length; i++) {
                    if (clientConfig.WFM_LAYERS[i].layers.indexOf(featureTypeName) > -1) {
                        featureTypeArr = clientConfig.WFM_LAYERS[i].layers;
                        featureNum = clientConfig.WFM_LAYERS[i].numfeats;
                    }
                }
                for (var i=0; i<wfmLayer.features.length; i++) {
                    if (featureTypeArr.indexOf(wfmLayer.features[i].featureTypeName) > -1) {
                        oldFeatures.push(wfmLayer.features[i]);
                    }
                }
                wfmLayer.removeFeatures(oldFeatures);
                wfmLayer.addFeatures([newFeature]);
            }
    );
});

window.GCComponents["Layers"].addLayer('layer-wfm-highlight-manual_select', {
    displayInLayerSwitcher:false,
    styleMap: new OpenLayers.StyleMap({
        'default': {
            fill: false,
            fillColor: "red",
            fillOpacity: 0.9,
            hoverFillColor: "white",
            hoverFillOpacity: 0.9,
            strokeColor: "red",
            strokeOpacity: 0.9,
            strokeWidth: 10,
            strokeLinecap: "round",
            strokeDashstyle: "solid",
            hoverStrokeColor: "red",
            hoverStrokeOpacity: 1,
            hoverStrokeWidth: 10,
            pointRadius: 8,
            hoverPointRadius: 1,
            hoverPointUnit: "%",
            pointerEvents: "visiblePainted",
            cursor: "inherit"
        },
        'select': {
            fill: true,
            fillColor: "red",
            fillOpacity: 0.9,
            hoverFillColor: "white",
            hoverFillOpacity: 0.9,
            strokeColor: "red",
            strokeOpacity: 1,
            strokeWidth: 10,
            strokeLinecap: "round",
            strokeDashstyle: "solid",
            hoverStrokeColor: "red",
            hoverStrokeOpacity: 1,
            hoverStrokeWidth: 10,
            pointRadius: 8,
            hoverPointRadius: 1,
            hoverPointUnit: "%",
            pointerEvents: "visiblePainted",
            cursor: "pointer"
        },
        'temporary': {
            fill: true,
            fillColor: "EEA652",
            fillOpacity: 0.2,
            hoverFillColor: "white",
            hoverFillOpacity: 0.8,
            strokeColor: "#EEA652",
            strokeOpacity: 1,
            strokeLinecap: "round",
            strokeWidth: 4,
            strokeDashstyle: "solid",
            hoverStrokeColor: "red",
            hoverStrokeOpacity: 1,
            hoverStrokeWidth: 0.2,
            pointRadius: 6,
            hoverPointRadius: 1,
            hoverPointUnit: "%",
            pointerEvents: "visiblePainted",
            cursor: "pointer"
        }
    })
}, {
    "sketchcomplete": function(obj) {
        // **** Get main selection control
        var selectControls = this.map.getControlsBy('gc_id', 'control-querytoolbar');
        if (selectControls.length != 1)
            return;
        if (!selectControls[0].controls)
            return;
        var selectControl = selectControls[0];

        // **** insert configured WFS layers
        if (typeof(clientConfig.WFM_LAYERS_MANUAL_SELECT) === 'undefined') {
            return;
        }
        var featureTypes = '';
        var selectLayers = [];
        var selectControlAuto = this.map.getControlsBy('gc_id', 'control-wfm-autoselect')[0];
        for (var i=0; i<clientConfig.WFM_LAYERS_MANUAL_SELECT.length; i++) {
            var featureTypesAuto = '';
            var selectLayersAuto = [];

            for (var j=0; j<clientConfig.WFM_LAYERS_MANUAL_SELECT[i].layers.length; j++) {
                var tmpLayer = selectControl.getLayerFromFeature(clientConfig.WFM_LAYERS_MANUAL_SELECT[i].layers[j]);
                var idx;
                for (idx = 0; idx < selectLayersAuto.length; idx++)  {
                    if (selectLayersAuto[idx].id === tmpLayer.id)
                        break;
                }
                if (idx === selectLayersAuto.length)
                    selectLayersAuto.push(tmpLayer);
                featureTypesAuto += clientConfig.WFM_LAYERS_MANUAL_SELECT[i].layers[j] + ',';
            }

            selectControlAuto.layers = selectLayersAuto;
            selectControlAuto.queryFeatureType = featureTypesAuto.substring(0, featureTypesAuto.length -1);
            selectControlAuto.wfsCache = selectControls[0].wfsCache;
            selectControlAuto.resultLayer = this;
            selectControlAuto.maxVectorFeatures = clientConfig.WFM_LAYERS_MANUAL_SELECT[i].numfeats;
            selectControlAuto.maxFeatures = clientConfig.WFM_LAYERS_MANUAL_SELECT[i].numfeats;
            selectControlAuto.activate();
            selectControlAuto.select(obj.feature.geometry);
            selectControlAuto.deactivate();
        }
        return false;
    },
    "featureadded": function(obj) {
        var features = obj.object.features;
        this.wfmExportData = {};
        var wfmArrayData = [];
        for (var i = 0; i < features.length; i++) {
            for (var j=0; j<clientConfig.WFM_LAYERS_MANUAL_SELECT.length; j++) {
                if (clientConfig.WFM_LAYERS_MANUAL_SELECT[j].layers.indexOf(features[i].featureTypeName) > -1) {
                    for (var k = 0; k < clientConfig.WFM_LAYERS_MANUAL_SELECT[j].fields.length; k++) {
                        var dataField = clientConfig.WFM_LAYERS_MANUAL_SELECT[j].outvars[k];
                        var dataValue = features[i].attributes[clientConfig.WFM_LAYERS_MANUAL_SELECT[j].fields[k]];
                        if (clientConfig.WFM_LAYERS_MANUAL_SELECT[j].numfeats > 1) {
                            var tmpObj = {};
                            tmpObj[dataField] = dataValue;
                            wfmArrayData.push(tmpObj);
                        }
                        else {
                            this.wfmExportData[dataField] = dataValue;
                        }
                    }
                    var outItemName = clientConfig.WFM_LAYERS_MANUAL_SELECT[j].outitem;
                    if (outItemName != 'undefined') {
                        this.wfmExportData['wfm_outitem'] = outItemName;
                        if (wfmArrayData.length > 0) {
                            this.wfmExportData[outItemName] = wfmArrayData;
                        }
                    }
                }
            }
        }

        //window.GCComponents.Functions.sendToWFM(wfmExportData);
    }
});

window.GCComponents["Layers"].addLayer('layer-wfm-highlight', {
    displayInLayerSwitcher:false,
    styleMap: new OpenLayers.StyleMap({
        'default': {
            fill: false,
            fillColor: "red",
            fillOpacity: 0.9,
            hoverFillColor: "white",
            hoverFillOpacity: 0.9,
            strokeColor: "red",
            strokeOpacity: 0.9,
            strokeWidth: 10,
            strokeLinecap: "round",
            strokeDashstyle: "solid",
            hoverStrokeColor: "red",
            hoverStrokeOpacity: 1,
            hoverStrokeWidth: 10,
            pointRadius: 8,
            hoverPointRadius: 1,
            hoverPointUnit: "%",
            pointerEvents: "visiblePainted",
            cursor: "inherit"
        },
        'select': {
            fill: true,
            fillColor: "red",
            fillOpacity: 0.9,
            hoverFillColor: "white",
            hoverFillOpacity: 0.9,
            strokeColor: "red",
            strokeOpacity: 1,
            strokeWidth: 10,
            strokeLinecap: "round",
            strokeDashstyle: "solid",
            hoverStrokeColor: "red",
            hoverStrokeOpacity: 1,
            hoverStrokeWidth: 10,
            pointRadius: 8,
            hoverPointRadius: 1,
            hoverPointUnit: "%",
            pointerEvents: "visiblePainted",
            cursor: "pointer"
        },
        'temporary': {
            fill: true,
            fillColor: "EEA652",
            fillOpacity: 0.2,
            hoverFillColor: "white",
            hoverFillOpacity: 0.8,
            strokeColor: "#EEA652",
            strokeOpacity: 1,
            strokeLinecap: "round",
            strokeWidth: 4,
            strokeDashstyle: "solid",
            hoverStrokeColor: "red",
            hoverStrokeOpacity: 1,
            hoverStrokeWidth: 0.2,
            pointRadius: 6,
            hoverPointRadius: 1,
            hoverPointUnit: "%",
            pointerEvents: "visiblePainted",
            cursor: "pointer"
        }
    })
}, {
    "featureadded": function(obj) {
        var features = obj.object.features;
        var wfmExportData = {};
        for (var i = 0; i < features.length; i++) {
            for (var j=0; j<clientConfig.WFM_LAYERS.length; j++) {
                if (clientConfig.WFM_LAYERS[j].layers.indexOf(features[i].featureTypeName) > -1) {
                    for (var k = 0; k < clientConfig.WFM_LAYERS[j].fields.length; k++) {
                        var dataField = clientConfig.WFM_LAYERS[j].outvars[k];
                        var dataValue = features[i].attributes[clientConfig.WFM_LAYERS[j].fields[k]];
                        wfmExportData[dataField] = dataValue;
                    }
                    if (typeof(clientConfig.WFM_LAYERS[j].outitem) != 'undefined') {
                        wfmExportData['wfm_outitem'] = clientConfig.WFM_LAYERS[j].outitem;
                    }
                }
            }
        }

        window.GCComponents.Functions.sendToWFM(wfmExportData);
    }
});


// **** Point marker layer (TODO: style)
window.GCComponents["Layers"].addLayer('layer-wfm-markpoint', {
    displayInLayerSwitcher:false,
    styleMap: new OpenLayers.StyleMap({
        'default': {
            cursor: "inherit",
            graphicHeight: 32,
            externalGraphic: "images/wfm_marker.png"
        }
    })
}, {
    "sketchcomplete": function(obj) {
        var tmpGeom = obj.feature.geometry.clone();
        var srid = this.map.displayProjection?this.map.displayProjection:this.map.projection;
        if (srid != this.map.projection) {
            tmpGeom.transform(this.map.projection, srid);
        }
        window.GCComponents.Functions.sendToWFM({x: tmpGeom.x, y:tmpGeom.y, srid:srid});

        if (typeof(clientConfig.WFM_SRID) !== 'undefined') {
            tmpGeom = obj.feature.geometry.clone();
            srid = clientConfig.WFM_SRID;
            if (srid != this.map.projection) {
                tmpGeom.transform(this.map.projection, srid);
            }
            window.GCComponents.Functions.sendToWFM({x: tmpGeom.x, y:tmpGeom.y, srid:srid});
        }

        this.removeAllFeatures();
    },
    "featureadded": function(obj) {
        // **** Get main selection control
        var selectControls = this.map.getControlsBy('gc_id', 'control-querytoolbar');
        if (selectControls.length != 1)
            return;
        if (!selectControls[0].controls)
            return;
        var selectControl = selectControls[0];
        selectControl.controls[0].layers = [];
        // **** insert configured WFS layers
        if (typeof(clientConfig.WFM_LAYERS) === 'undefined') {
            return;
        }
        var featureTypes = '';
        var selectLayers = [];
        var selectControlAuto = this.map.getControlsBy('gc_id', 'control-wfm-autoselect')[0];

        this.keepFeatures = true;

        for (var i=0; i<clientConfig.WFM_LAYERS.length; i++) {
            if (typeof(clientConfig.WFM_LAYERS[i].auto) != undefined && clientConfig.WFM_LAYERS[i].auto) {
                var featureTypesAuto = '';
                var selectLayersAuto = [];

                for (var j=0; j<clientConfig.WFM_LAYERS[i].layers.length; j++) {
                    var tmpLayer = selectControl.getLayerFromFeature(clientConfig.WFM_LAYERS[i].layers[j]);
                    var idx;
                    for (idx = 0; idx < selectLayersAuto.length; idx++)  {
                        if (selectLayersAuto[idx].id === tmpLayer.id)
                            break;
                    }
                    if (idx === selectLayersAuto.length)
                        selectLayersAuto.push(tmpLayer);
                    featureTypesAuto += clientConfig.WFM_LAYERS[i].layers[j] + ',';
                }
                selectControlAuto.layers = selectLayersAuto;
                selectControlAuto.queryFeatureType = featureTypesAuto.substring(0, featureTypesAuto.length -1);
                selectControlAuto.wfsCache = selectControls[0].wfsCache;
                selectControlAuto.resultLayer = this.map.getLayersByName('layer-wfm-highlight')[0];
                selectControlAuto.maxFeatures = clientConfig.WFM_LAYERS[i].numfeats;
                selectControlAuto.activate();
                selectControlAuto.select(obj.feature.geometry);
                selectControlAuto.deactivate();
            }
            else {
                for (var j=0; j<clientConfig.WFM_LAYERS[i].layers.length; j++) {
                    var tmpLayer = selectControl.getLayerFromFeature(clientConfig.WFM_LAYERS[i].layers[j]);
                    var idx;
                    for (idx = 0; idx < selectLayers.length; idx++)  {
                        if (selectLayers[idx].id === tmpLayer.id)
                            break;
                    }
                    if (idx === selectLayers.length)
                        selectLayers.push(tmpLayer);
                    featureTypes += clientConfig.WFM_LAYERS[i].layers[j] + ',';
                }
            }
        }

        if (selectLayers.length > 0) {
            selectControl.controls[0].layers = selectLayers;
            selectControl.controls[0].queryFeatureType = featureTypes.substring(0, featureTypes.length -1);

            // **** Build selection rectangle
            var XCoord = obj.feature.geometry.x;
            var YCoord = obj.feature.geometry.y;
            var selWidth = (typeof(WFM_SELECTION_WIDTH) === 'undefined')?5:WFM_SELECTION_WIDTH;
            var pointLL = new OpenLayers.Geometry.Point(XCoord -selWidth, YCoord -selWidth);
            var pointLU = new OpenLayers.Geometry.Point(XCoord -selWidth, YCoord +selWidth);
            var pointRU = new OpenLayers.Geometry.Point(XCoord +selWidth, YCoord +selWidth);
            var pointRL = new OpenLayers.Geometry.Point(XCoord +selWidth, YCoord -selWidth);
            var selRectangle = new OpenLayers.Geometry.LinearRing([pointLL, pointLU, pointRU, pointRL, pointLL]);

            // **** Apply selection
            selectControl.controls[0].activate();
            selectControl.clearResults();
            selectControl.controls[0].select(selRectangle);
            selectControl.activateVectorControl();
            selectControl.resultLayer.setVisibility(true);
            selectControl.controls[0].deactivate();
            selectControl.wfmSelection = true;
        }

        this.keepFeatures = false;
    }
});

// **** Auto select click control
window.GCComponents["Controls"].addControl('control-wfm-autoselect', function(map){
    return new OpenLayers.Control.QueryMap(
        OpenLayers.Handler.Click,
        {
            gc_id: 'control-wfm-autoselect',
            baseUrl: GisClientMap.baseUrl,
            maxFeatures:1,
            deactivateAfterSelect: true,
            vectorFeaturesOverLimit: new Array(),
            eventListeners: {
                'activate': function(){
                    var selectControls = this.map.getControlsBy('gc_id', 'control-querytoolbar');
                    if (selectControls.length != 1)
                        return false;

                },
                'endQueryMap': function(event) {
                    if(event.layer.wfmExportData) {
                        window.GCComponents.Functions.sendToWFM(event.layer.wfmExportData);
                        event.layer.wfmExportData = {};
                    }
                },
                'featuresLoaded': function(featureType) {
                    for (var j=0; j<clientConfig.WFM_LAYERS_MANUAL_SELECT.length; j++) {
                        if (clientConfig.WFM_LAYERS_MANUAL_SELECT[j].layers.indexOf(featureType.typeName) > -1) {
                            if (clientConfig.WFM_LAYERS_MANUAL_SELECT[j].display) {
                                if (!this.resultLayer.hasOwnProperty('renderQueue')) {
                                    this.resultLayer.renderQueue = [featureType];
                                }
                                else {
                                    this.resultLayer.renderQueue.push(featureType);
                                }
                            }
                        }
                    }
                }
            }
        }
    )
});
