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
 * /dev/lib/jquery/plugins/jqmodal.sakai-edited.js
 * /dev/lib/misc/trimpath.template.js (TrimpathTemplates)
 */
require(["jquery", "sakai/sakai.api.core"], function($, sakai) {

    /**
     * @name sakai_global.profilesection
     *
     * @class profilesection
     *
     * @description
     * Initialize the profilesection widget
     *
     * @version 0.0.1
     * @param {String} tuid Unique id of the widget
     * @param {Boolean} showSettings Show the settings of the widget or not
     */
    sakai_global.newprofilesection = function( tuid, showSettings, widgetData ) {
        debug.log(widgetData);
        /////////////////////////////
        // Configuration variables //
        /////////////////////////////

        var editing = false,
            userid = false,
            multiple = false;

        ///////////////////
        // CSS Selectors //
        ///////////////////

        var $rootel = $("#" + tuid),
            $newprofilesection_container = $("#newprofilesection_container", $rootel),
            $newprofilesection_header = $("#newprofilesection_header", $rootel),
            $newprofilesection_header_template = $("#newprofilesection_header_template", $rootel),
            $newprofilesection_body = $("#newprofilesection_body", $rootel),
            $newprofilesection_body_template = $("#newprofilesection_body_template", $rootel),
            $newprofilesection_view_template = $("#newprofilesection_view_template", $rootel),
            $newprofilesection_edit_template = $("#newprofilesection_edit_template", $rootel),
            $newprofilesection_edit_multiple_template = $("#newprofilesection_edit_multiple_template", $rootel),
            $newprofilesection_sections_multiple = false,
            $newprofilesection_add_button = false,
            $form = false;

        var getMultipleValues = function( values ) {
            var uniqueContainers = $( "div.newprofilesection_multiple_section" );
            var multipleValues = {};
            $.each(uniqueContainers, function( i, elt ) {
                multipleValues[ $( elt ).attr( "id" ).replace( "form_group_", "" ) ] = {
                    order: i
                };
            });
            $.each(values, function( i, val ) {
                // Each ID is of format fieldtitle_formuniqueid
                var field = i.substring(0,i.lastIndexOf("_"));
                var mvKey = i.substring(i.lastIndexOf("_")+1);
                multipleValues[mvKey][field] = val;
            });
            values = multipleValues;
            return values;
        }

        var saveValues = function() {
            var values = $form.serializeObject(false);
            if ( multiple ) {
                values = getMultipleValues( values );
            }

            debug.log(values);

            // Get tags & Categories if they're in this form
            // save data
            sakai.api.User.updateUserProfile(userid, widgetData.sectionid, values, multiple, function(success, data) {
                if (success) {
                    // TODO Show save notification
                    debug.log("saved data");
                } else {
                    // TODO Show error notification
                    debug.log("failed to save data");                    
                }
            });

            return false;
        };

        var handleShown = function( e, showing ) {
            debug.log("handleShown", showing, widgetData.sectionid);
        };

        var removeSection = function( unique ) {
            $( "div#form_group_" + unique ).remove();
            // TODO Save removal of this section 
            if ( $( "div.newprofilesection_multiple_section" ).length === 0 ) {
                $( "button.profile-section-save-button", $rootel ).show();
            } 
        };

        var addEmptySection = function( section, template ) {
            var unique = "" + Math.round(Math.random() * 1000000000);
            var sectionHTML = sakai.api.Util.TemplateRenderer( template, {
                sectionid: widgetData.sectionid,
                section: section,
                unique: unique
            });
            $newprofilesection_sections_multiple.append( sakai.api.i18n.General.process( sectionHTML ) );
            $( "button.profile-section-save-button", $rootel ).show();
            $( "button#newprofilesection_remove_link_" + unique, $rootel).bind("click", function() {
                removeSection(unique);
            });
        };

        var renderMultiForm = function ( template, section, data ) {
            multiple = true;
            var multHTML = sakai.api.Util.TemplateRenderer( $newprofilesection_edit_multiple_template, {
                sectionid: widgetData.sectionid,
                section: section
            });
            $newprofilesection_body.html( sakai.api.i18n.General.process( multHTML ) );
            
            // Grab the new container to render into
            $newprofilesection_sections_multiple = $( "#newprofilesection_sections_" + widgetData.sectionid );
            $newprofilesection_add_button = $( "#newprofilesection_add_" + widgetData.sectionid );
            $newprofilesection_add_button.bind("click", function() {
                addEmptySection( section, template );
            });

            if (data[widgetData.sectionid].elements) {
                debug.log("data", data[widgetData.sectionid]);
                // render the sections
                // $("button.profile-section-save-button", $rootel).show();
            }
        };

        var renderSection = function( success, data ) {
            if ( success ) {
                var section = sakai.config.Profile.configuration.defaultConfig[ widgetData.sectionid ];
                var template = $newprofilesection_view_template;
                if ( editing ) {
                    template = $newprofilesection_edit_template;
                }

                debug.log(section);
                // Render header
                var headerHTML = sakai.api.Util.TemplateRenderer($newprofilesection_header_template, {
                    section: section
                });
                $newprofilesection_header.html( sakai.api.i18n.General.process( headerHTML ) );

                // If it is a multiple section, we have to render it with some love
                if ( section.multiple ) {
                    renderMultiForm( template, section, data );
                } else {
                    var bodyHTML = sakai.api.Util.TemplateRenderer( template, {
                        sectionid: widgetData.sectionid,
                        section: section,
                        data: data[widgetData.sectionid].elements,
                        unique: false
                    });
                    $newprofilesection_body.html( sakai.api.i18n.General.process( bodyHTML ) );
                }

                if (editing) {
                    $form = $("#newprofilesection_form_" + widgetData.sectionid, $rootel);
                    var validateOpts = {
                        submitHandler: saveValues,
                        messages: {}
                    };
                    // Set the custom error messages per field
                    $.each(section.elements, function( i, elt ) {
                        if (elt.errorMessage) {
                            validateOpts.messages[ i ] = {
                                required: sakai.api.i18n.General.process(elt.errorMessage)
                            };
                        }
                    });
                    sakai.api.Util.Forms.validate($form, validateOpts);
                }
            }
        };

        var getData = function( callback ) {
            sakai.api.User.getUser( userid, function( success, data ) {
                if ( $.isFunction( callback ) ) {
                    callback( success, data );
                }
                debug.log(data);
            });
        };

        var init = function() {
            debug.log("init");
            userid = sakai_global.profile.main.data.userid;
            editing = userid && userid === sakai.data.me.user.userid;
            getData(renderSection);
        };

        $(window).bind(tuid + ".shown.sakai", handleShown);
        init();
    };

    sakai.api.Widgets.widgetLoader.informOnLoad("newprofilesection");
});
