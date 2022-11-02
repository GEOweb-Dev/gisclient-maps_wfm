// **** OSfC TOOLBAR
window.GCComponents["Controls"].addControl('control-wfm-toolbar', function(map){
    return new  OpenLayers.Control.Panel({
        gc_id: 'control-wfm-toolbar',
        createControlMarkup:customCreateControlMarkup,
        div:document.getElementById("map-toolbar-wfm"),
        autoActivate:false,
        saveState:true,
        draw: function() {
            var controls = [
                new OpenLayers.Control.DrawFeature(
                    map.getLayersByName('layer-wfm-markpoint')[0],
                    OpenLayers.Handler.Point,
                    {
                        gc_id: 'control-wfm-markpoint',
                        iconclass:"glyphicon-white glyphicon-pushpin",
                        text:"Punto di intervento",
                        title:"Esporta coordinate per WFM",
                        eventListeners: {
                            'activate': function(e){
                                this.map.getLayersByName('layer-wfm-highlight')[0].removeAllFeatures();
                                this.map.getLayersByName('layer-wfm-highlight-manual_select')[0].removeAllFeatures();
                                this.map.getLayersByName('layer-wfm-markpoint')[0].removeAllFeatures();
                                window.GCComponents.Functions.resetWFMData();
                                if (map.currentControl != this) {
                                    map.currentControl.deactivate();
                                    var touchControl = map.getControlsByClass("OpenLayers.Control.TouchNavigation");
                                    if (touchControl.length > 0) {
                                        touchControl[0].dragPan.deactivate();
                                    }
                                }
                                map.currentControl=this;
                            },
                            'deactivate': function(e){
                                var touchControl = map.getControlsByClass("OpenLayers.Control.TouchNavigation");
                                if (touchControl.length > 0) {
                                    touchControl[0].dragPan.activate();
                                }
                                if (!this.layer.keepFeatures) {
                                    this.layer.removeAllFeatures();
                                }
                            }
                        }
                    }
                ),
                new OpenLayers.Control.DrawFeature(
                    map.getLayersByName('layer-wfm-highlight-manual_select')[0],
                    OpenLayers.Handler.Polygon,
                    {
                        gc_id: 'control-wfm-selectpdr',
                        //handlerOptions: {irregular: true},
                        iconclass:"glyphicon-white glyphicon-user",
                        text:"Selezione PDF",
                        title:"Selezione PDF",
                        eventListeners: {
                            'activate': function(){
                                this.map.getLayersByName('layer-wfm-highlight')[0].removeAllFeatures();
                                this.map.getLayersByName('layer-wfm-highlight-manual_select')[0].removeAllFeatures();
                                this.map.getLayersByName('layer-wfm-markpoint')[0].removeAllFeatures();
                                window.GCComponents.Functions.resetWFMData();
                                if (map.currentControl != this) {
                                    this.map.currentControl.deactivate();
                                    var touchControl = map.getControlsByClass("OpenLayers.Control.TouchNavigation");
                                    if (touchControl.length > 0) {
                                        touchControl[0].dragPan.deactivate();
                                    }
                                    this.map.currentControl=this;
                                }
                                //OpenLayers.Control.DrawFeature.prototype.activate.apply(this);
                            },
                            'deactivate': function(){
                                var touchControl = map.getControlsByClass("OpenLayers.Control.TouchNavigation");
                                if (touchControl.length > 0) {
                                    touchControl[0].dragPan.activate();
                                }
                                OpenLayers.Control.DrawFeature.prototype.deactivate.apply(this);
                                this.map.currentControl=this.map.defaultControl;
                            },
                        }
                    }
                )
            ];
            this.addControls(controls);
            OpenLayers.Control.Panel.prototype.draw.apply(this);
        },
        redraw: function () {
            OpenLayers.Control.Panel.prototype.redraw.apply(this);
        }
    })
});


// **** Toolbar button
window.GCComponents["SideToolbar.Buttons"].addButton (
    'button-wfm-markpoint',
    'Esporta coordinate per WFM',
    'glyphicon-white glyphicon-briefcase',
    function() {
        if (sidebarPanel.handleEvent || typeof(sidebarPanel.handleEvent) === 'undefined')
        {
            this.map.getLayersByName('layer-wfm-highlight')[0].removeAllFeatures();
            this.map.getLayersByName('layer-wfm-highlight-manual_select')[0].removeAllFeatures();
            this.map.getLayersByName('layer-wfm-markpoint')[0].removeAllFeatures();
            window.GCComponents.Functions.resetWFMData();
            if (this.active) {
                this.deactivate();
                var toolbarControl = this.map.getControlsBy('gc_id', 'control-wfm-toolbar');
                if (toolbarControl.length == 1)
                    toolbarControl[0].deactivate();
            }
            else
            {
                this.activate();
                var toolbarControl = this.map.getControlsBy('gc_id', 'control-wfm-toolbar');
                if (toolbarControl.length == 1) {
                    toolbarControl[0].activate();
                    toolbarControl[0].controls[0].activate();
                }
            }
            if (typeof(sidebarPanel.handleEvent) !== 'undefined')
                sidebarPanel.handleEvent = false;
        }
    },
    {button_group: 'tools'}
);
