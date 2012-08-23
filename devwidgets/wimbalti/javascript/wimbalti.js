/*
 * Licensed to the Sakai Foundation (SF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The SF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */

/*
 * Dependencies
 *
 * /dev/lib/misc/trimpath.template.js (TrimpathTemplates)
 */

require(["jquery", "sakai/sakai.api.core", "sakai/sakai.api.widgets"], function($, sakai, sakaiWidgetsAPI) {

    /**
     * @name sakai_global.basiclti
     *
     * @class basiclti
     *
     * @description
     * Basiclti widget
     *
     * @version 0.0.1
     * @param {String} tuid Unique id of the widget
     * @param {Boolean} showSettings Show the settings of the widget or not
     */
    sakai_global.wimbalti = function(tuid, showSettings){


        /////////////////////////////
        // Configuration variables //
        /////////////////////////////

        var rootel = $("#" + tuid);
        var json = false;

        // Default values
        var defaultWidth = 100;
        var defaultWidthUnit = "%";
        var defaultHeight = 200;

        // Links and labels
        var basiclti = "#basiclti";
        var basicltiSettings = basiclti + "_settings";
        var basicltiSettingsCancel = basicltiSettings + "_cancel";        
        var basicltiSettingsInsert = basicltiSettings + "_insert";
        var basicltiSettingsPreviewId = tuid + "_frame";
        var basicltiSettingsPreviewFrame = "#" + basicltiSettingsPreviewId;

        // Containers
        var basicltiMainContainer = basiclti + "_main_container";

        // Classes

        // Templates
        var $basicltiSettingsPreviewTemplate = $("#basiclti_settings_preview_template", rootel);

        // see: http://www.ietf.org/rfc/rfc2396.txt Appendix B
        var urlRegExp = new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?");

        //////////////////////
        // Render functions //
        //////////////////////

        /**
         * Render the iframe for the widget
         */
        var renderIframe = function(){
            if (json) {
                json.frame_height = 800;
                json.tuidFrame = basicltiSettingsPreviewId;
                $(basicltiMainContainer, rootel).html(sakai.api.Util.TemplateRenderer($basicltiSettingsPreviewTemplate, json));
                json.launchDataUrl = sakaiWidgetsAPI.widgetLoader.widgets[tuid].placement + ".launch.html";
                if (sakai_global.group) {
                    json.launchDataUrl += "?groupid=" + sakai_global.group.groupData["sakai:group-id"];
                }
                $("#" + json.tuidFrame).attr("src", json.launchDataUrl);

                $(basicltiSettingsPreviewFrame).load(function() {
                    calculatedHeight = $(this).contents.find("body").height() + 15;

                    $(this).height(json.frame_height > calculatedHeight ? json.frame_height : calculatedHeight);
                });

                // SAKIII-314 We need to show the container, otherwise the second item won't be shown.
                $(basicltiMainContainer, rootel).show();
            }
        };

        //////////////////////
        // Global functions //
        //////////////////////

        /**
         * Display the iframe in normal mode
         * @param {Object} parameters JSON object that contains the necessary information for the iframe
         */
        var displayRemoteContent = function(parameters){
            // default to some reasonable vaules if the settings node does not have them (maybe a legacy node)
            if (parameters.border_size === null) {
                parameters.border_size = 0;
            }
            if (parameters.border_color === null) {
                parameters.border_color = "cccccc";
            }
            if (parameters.width === null) {
                parameters.width = defaultWidth;
            }
            if (parameters.width_unit === null) {
                parameters.width_unit = defaultWidthUnit;
            }
            if (parameters.frame_height === null) {
                parameters.frame_height = defaultHeight;
            }
            json = parameters;
            renderIframe();
        };

        /**
         * Save the basiclti to the jcr
         */
        var saveRemoteContent = function(){
            var saveContentAjax = function(json_data) {
                var url = sakaiWidgetsAPI.widgetLoader.widgets[tuid].placement;
                $.ajax({
                    type: "POST",
                    url: url,
                    data: json,
                    success: function(data) { 
                        displayRemoteContent(json);
                    }
                }); 
                // Because we need to use a particular servlet (LiteBasicLTI), and it
                // requires some different options, we make our own ajax call above
                // instead of using saveWidgetData for now.
                // 
                //sakai.api.Widgets.saveWidgetData(tuid, json, savedDataToJCR);                
            };

            json["lti_virtual_tool_id"] = "wimba.lti.vtool";
            json[":operation"] = "basiclti";
            json["sling:resourceType"] = "sakai/basiclti";

            saveContentAjax(json);
        };

        ///////////////////////
        // Initial functions //
        ///////////////////////

        /**
         * Function that fills in the input fields in the settings tab.
         * @param {Object} parameters A JSON object that contains the necessary information.
         * @param {Boolean} exists Does there exist a previous basiclti
         */
        var saveSettings = function(parameters, exists){
            json = {
                border_size: 0,
                border_color: "cccccc",
                frame_height: defaultHeight,
                width: defaultWidth,
                width_unit: defaultWidthUnit,
                lti_virtual_tool_id: "wimba.lti.vtool",
                isSakai2Tool: true
            };
            saveRemoteContent();
        };

        /**
         * Will fetch the URL and other parameters from the JCR and according to which
         * view we are in, fill in the settings or display an iframe.
         */
        var getRemoteContent = function() {
            // We make our own call below at the moment. Unlike most of the widgets
            // we need to interact directly with the LiteBasicLTI servlet. It's
            // also not a recursive servlet so we can't use the default .infinity.json
            // that is used under the covers for most of the calls.
            var url = sakaiWidgetsAPI.widgetLoader.widgets[tuid].placement + '.json';
            $.ajax({
                type: "GET",
                url: url,
                dataType: 'json',
                success: function(data) {
                    displayRemoteContent(data);
                },
                error: function(xhr, status, e) {
                    saveSettings(null, false);
                }
            });
        };

        getRemoteContent();
    };

    sakai.api.Widgets.widgetLoader.informOnLoad("wimbalti");
});
