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
        /////////////////////////////
        // Configuration variables //
        /////////////////////////////

        var editing = false,
            userid = false,
            multiple = false,
            multipleSectionLength = 0;

        ///////////////////
        // CSS Selectors //
        ///////////////////

        var $rootel = $( "#" + tuid ),
            $newprofilesection_container = $( "#newprofilesection_container", $rootel ),
            $newprofilesection_header = $( "#newprofilesection_header", $rootel ),
            $newprofilesection_header_template = $( "#newprofilesection_header_template", $rootel ),
            $newprofilesection_body = $( "#newprofilesection_body", $rootel ),
            $newprofilesection_body_template = $( "#newprofilesection_body_template", $rootel ),
            $newprofilesection_view_template = $( "#newprofilesection_view_template", $rootel ),
            $newprofilesection_edit_template = $( "#newprofilesection_edit_template", $rootel ),
            $newprofilesection_edit_multiple_template = $( "#newprofilesection_edit_multiple_template", $rootel ),
            $newprofilesection_view_multiple_template = $( "#newprofilesection_view_multiple_template" , $rootel ),
            $newprofilesection_view_no_results_template = $( "#newprofilesection_view_no_results_template", $rootel ),
            $newprofilesection_sections_multiple = false,
            $newprofilesection_add_button = false,
            $form = false;

        // Transform the form values from a multiple-assign section into a different data structure
        var getMultipleValues = function( values ) {
            var uniqueContainers = $( "div.newprofilesection_multiple_section" );
            var multipleValues = {};
            $.each( uniqueContainers, function( i, elt ) {
                multipleValues[ $( elt ).attr( "id" ).replace( "form_group_", "" ) ] = {
                    order: i
                };
            });
            $.each( values, function( i, val ) {
                // Each ID is of format fieldtitle_formuniqueid
                var field = i.substring( 0, i.lastIndexOf( "_" ));
                var mvKey = i.substring( i.lastIndexOf( "_" ) + 1 );
                multipleValues[ mvKey ][ field ] = val;
            });
            values = multipleValues;
            return values;
        };

        var saveValues = function() {
            var values = $form.serializeObject( false );
            if ( multiple ) {
                values = getMultipleValues( values );
            }
            // Get tags & Categories if they're in this form
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

        // Remove a section from the a multi-assign section
        var removeSection = function( unique ) {
            $( "div#form_group_" + unique ).remove();
            sakai.api.User.deleteUserProfileSection( userid, widgetData.sectionid, unique, function() {
                debug.log("removed");
            });
            debug.log($( "div.newprofilesection_multiple_section" ).length );
            if ( $( "div.newprofilesection_multiple_section" ).length === 0 ) {
                $( "button.profile-section-save-button", $rootel ).hide();
            }
        };

        // Add a new section to a multi-assign section
        var addEmptySection = function( section, template ) {
            var unique = "" + Math.round( Math.random() * 1000000000 );
            multipleSectionLength++;
            var sectionHTML = sakai.api.Util.TemplateRenderer( template, {
                sectionid: widgetData.sectionid,
                section: section,
                unique: unique,
                order: multipleSectionLength
            });
            $newprofilesection_sections_multiple.append( sakai.api.i18n.General.process( sectionHTML ) );
            $( "button.profile-section-save-button", $rootel ).show();
            $( "button#newprofilesection_remove_link_" + unique, $rootel ).bind( "click", function() {
                removeSection( unique );
            });
        };

        var sectionHasElements = function( section ) {
            var empty = false;
            $.each( section, function( i, elt ) {
                if ( $.isPlainObject( elt ) ) {
                    empty = true;
                }
            });
            return empty;
        };

        var renderEmptySection = function( userProfile, section ) {
            debug.log("renderEmptySection", userProfile);
            var sectionKey = "THIS_PERSON_HASNT_ADDED_" + widgetData.sectionid.toUpperCase();
            var messageKey = "";
            if (sakai.api.i18n.getValueForKey( sectionKey, "newprofilesection") !== sectionKey ) {
                messageKey = sectionKey;
            }
            var emptyHTML = sakai.api.Util.TemplateRenderer( $newprofilesection_view_no_results_template, {
                userid: userid,
                displayName: sakai.api.User.getDisplayName( userProfile ),
                section: section.label
            });
            if ( messageKey ) {
                
            }
            $newprofilesection_body.html( sakai.api.i18n.General.process( emptyHTML ) );
        };

        // Render a multi-assign section
        var renderMultiSection = function ( template, section, data ) {
            multiple = true;
            var multiTemplate = editing ? $newprofilesection_edit_multiple_template : $newprofilesection_view_multiple_template;

            var multHTML = sakai.api.Util.TemplateRenderer( multiTemplate, {
                sectionid: widgetData.sectionid,
                section: section
            });
            $newprofilesection_body.html( sakai.api.i18n.General.process( multHTML ) );
            
            // Grab the new container to render into
            $newprofilesection_sections_multiple = $( "#newprofilesection_sections_" + widgetData.sectionid );
            if ( editing ) {
                $newprofilesection_add_button = $( "#newprofilesection_add_" + widgetData.sectionid );
                $newprofilesection_add_button.bind("click", function() {
                    addEmptySection( section, template );
                });
            }

            // If there is some data, render each section
            if ( data[ widgetData.sectionid ].elements ) {
                var subSections = [];
                // Convert the sectionData into an array so we can order it
                $.each( data[ widgetData.sectionid ].elements, function( uid, sectionData ) {
                    if ( $.isPlainObject( sectionData ) ) {
                        var obj = {};
                        obj[ uid ] = sectionData;
                        subSections.push( obj );
                    }
                });
                // Sort the sections by order
                subSections = subSections.sort( function ( a, b ) {
                    return _.values( a )[ 0 ].order - _.values( b )[ 0 ].order;
                });
                $.each( subSections, function( i, sectionData ) {
                    if ( $.isPlainObject( sectionData ) ) {
                        // Just keep incrementing, since we're not supporting re-ordering yet
                        multipleSectionLength = _.values( sectionData )[ 0 ].order > multipleSectionLength ? _.values( sectionData )[ 0 ].order : multipleSectionLength;
                        var uid = _.keys( sectionData )[ 0 ];
                        debug.log(section);
                        var sectionHTML = sakai.api.Util.TemplateRenderer( template, {
                            section: section,
                            unique: uid,
                            data: _.values( sectionData )[ 0 ],
                            order: _.values( sectionData )[ 0 ].order
                        });
                        $newprofilesection_sections_multiple.append( sakai.api.i18n.General.process( sectionHTML ) );
                        if ( editing ) {
                            $( "button#newprofilesection_remove_link_" + uid, $rootel ).bind( "click", function() {
                                removeSection( uid );
                            });
                        }
                    }
                });
                if ( editing && subSections.length ) {
                    $( "button.profile-section-save-button", $rootel ).show();
                } else if ( !subSections.length ) {
                    renderEmptySection( data );
                } else if ( !editing ){
                    $( ".newprofilesection_multiple_sections hr:last" ).hide();
                }
            } else {
                renderEmptySection( data );
            }
        };

        var renderSection = function( success, data ) {
            if ( success ) {
                var section = sakai.config.Profile.configuration.defaultConfig[ widgetData.sectionid ];
                var template = $newprofilesection_view_template;
                if ( editing ) {
                    template = $newprofilesection_edit_template;
                }

                // Render header
                var headerHTML = sakai.api.Util.TemplateRenderer( $newprofilesection_header_template, {
                    section: section
                });
                $newprofilesection_header.html( sakai.api.i18n.General.process( headerHTML ) );

                // If it is a multiple section, we have to render it with some love
                if ( section.multiple ) {
                    renderMultiSection( template, section, data );
                } else {
                    if ( sectionHasElements( data[ widgetData.sectionid ].elements ) ) {
                        var bodyHTML = sakai.api.Util.TemplateRenderer( template, {
                            sectionid: widgetData.sectionid,
                            section: section,
                            data: data[ widgetData.sectionid ].elements,
                            unique: false,
                            sakai: sakai
                        });
                        $newprofilesection_body.html( sakai.api.i18n.General.process( bodyHTML ) );
                    } else {
                        renderEmptySection( data, section );
                    }

                }

                if (editing) {
                    $form = $( "#newprofilesection_form_" + widgetData.sectionid, $rootel );
                    var validateOpts = {
                        submitHandler: saveValues,
                        messages: {}
                    };
                    // Set the custom error messages per field
                    $.each( section.elements, function( i, elt ) {
                        if ( elt.errorMessage ) {
                            validateOpts.messages[ i ] = {
                                required: sakai.api.i18n.General.process( elt.errorMessage )
                            };
                        }
                    });
                    sakai.api.Util.Forms.validate( $form, validateOpts );
                }
            }
        };

        var getData = function( callback ) {
            if ( editing && sakai.data.me.profile && $.isFunction( callback ) ) {
                callback( true, sakai.data.me.profile );
            } else {
                sakai.api.User.getUser( userid, function( success, data ) {
                    if ( $.isFunction( callback ) ) {
                        callback( success, data );
                    }
                });
            }
        };

        var init = function() {
            $(window).bind(tuid + ".shown.sakai", handleShown);
            userid = sakai_global.profile.main.data.userid;
            editing = userid && userid === sakai.data.me.user.userid;
            getData(renderSection);
        };

        init();
    };

    sakai.api.Widgets.widgetLoader.informOnLoad("newprofilesection");
});
