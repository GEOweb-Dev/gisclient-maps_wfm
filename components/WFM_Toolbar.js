// **** Point marker draw control
window.GCComponents["Controls"].addControl('control-wfm-markpoint', function(map){
    return new OpenLayers.Control.DrawFeature(
        map.getLayersByName('layer-wfm-markpoint')[0],
        OpenLayers.Handler.Point,
        {
            gc_id: 'control-wfm-markpoint',
            eventListeners: {
                'activate': function(e){
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
                    var btnControl = map.getControlsBy('id', 'button-wfm-markpoint')[0];
                    if (btnControl.active)
                        btnControl.deactivate();

                }
            }
        }
    )
});

// **** Toolbar button
window.GCComponents["SideToolbar.Buttons"].addButton (
    'button-wfm-markpoint',
    'Esporta coordinate per WFM',
    'glyphicon-white glyphicon-pushpin',
    function() {
        if (sidebarPanel.handleEvent || typeof(sidebarPanel.handleEvent) === 'undefined')
        {
            this.map.getLayersByName('layer-wfm-highlight')[0].removeAllFeatures();
            this.map.getLayersByName('layer-wfm-markpoint')[0].removeAllFeatures();
            window.GCComponents.Functions.resetWFMData();
            if (this.active) {
                this.deactivate();
                var drawControl = this.map.getControlsBy('gc_id', 'control-wfm-markpoint');
                if (drawControl.length == 1)
                    drawControl[0].deactivate();
            }
            else
            {
                this.activate();
                var drawControl = this.map.getControlsBy('gc_id', 'control-wfm-markpoint');
                if (drawControl.length == 1)
                    drawControl[0].activate();
            }
            if (typeof(sidebarPanel.handleEvent) !== 'undefined')
                sidebarPanel.handleEvent = false;
        }
    },
    {button_group: 'tools'}
);
