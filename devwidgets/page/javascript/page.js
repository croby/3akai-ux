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

/*global $ */

var sakai = sakai || {};

/**
 * @name sakai.page
 *
 * @class page
 *
 * @description
 * Initialize the page widget
 *
 * @version 0.0.1
 * @param {String} tuid Unique id of the widget
 * @param {Boolean} showSettings Show the settings of the widget or not
 */
sakai.page = function(tuid, showSettings, placement) {

    var PAGE_DATA_SERVICE = "/var/services/getPageData.json";
    var pageData = {};
    var $rootel = $("#" + tuid);

    var toolbarSetupReady = false,
        autosavecontent = false,
        isShowingDropdown = false,
        isShowingContext = false,
        newwidget_id = false,
        newwidget_uid = false,
        isEditingNewPage = false,
        oldSelectedPage = false,
        mytemplates = false,
        isReady = false,
        updatingExistingWidget = false,
        pageEmbedProperty = "";
    
    var dataLoaded = false,
        siteUUID = false,
        canEdit = false;

    var page_editor = "page_editor", // tinyMCE needs the string
        $page_editor = $("#page_editor", $rootel),
        $insert_dialog = $("#insert_dialog", $rootel),
        $page_edit_button = $("#page_edit_button", $rootel),
        $page_show = $("#page_show", $rootel),
        $page_edit = $("#page_edit", $rootel),
        $cancel_button = $("#page_save_options_bottom .cancel-button", $rootel),
        $save_button = $("#page_save_options_bottom .save_button", $rootel),
        $context_menu = $("#context_menu", $rootel),
        $context_settings = $("#context_settings", $rootel);
    
    var $elm1_ifr = $("#elm1_ifr", $rootel);
    var $elm1_toolbar1 = $("#elm1_toolbar1", $rootel);
    var $elm1_toolbar2 = $("#elm1_toolbar2", $rootel);
    var $elm1_toolbar3 = $("#elm1_toolbar3", $rootel);
    var $elm1_toolbar4 = $("#elm1_toolbar4", $rootel);
    var $elm1_external = $("#elm1_external", $rootel);
    var $toolbarplaceholder = $("#toolbarplaceholder", $rootel);
    var $toolbarcontainer = $("#toolbarcontainer", $rootel);
    var $placeholderforeditor = $("#placeholderforeditor", $rootel);
    var $title_input_container = $("#title-input-container", $rootel);
    var $fl_tab_content_editor = $("#fl-tab-content-editor", $rootel);


    var $li_edit_page_divider = $("#li_edit_page_divider", $rootel);
    var $li_edit_page = $("#li_edit_page", $rootel);

    var $page_nav_content = $("#page_nav_content", $rootel);
    var $pagetitle = $("#pagetitle", $rootel);
    var $webpage_edit = $("#webpage_edit", $rootel);
    var $tool_edit = $("#tool_edit", $rootel);
    var $insert_more_menu = $("#insert_more_menu", $rootel);
    var $more_menu = $("#more_menu", $rootel);
    var $page_content = $("#page_content", $rootel);
    var $more_link = $("#more_link", $rootel);
    var $li_more_link = $("#li_more_link", $rootel);
    var $print_page = $("#print_page", $rootel);
    var $content_page_options = $("#content_page_options", $rootel);
    var $page_page_options = $("#page_page_options", $rootel);
    var $more_revision_history = $("#more_revision_history", $rootel);
    var $more_save_as_template = $("#more_save_as_template", $rootel);
    var $more_change_layout = $("#more_change_layout", $rootel);

    

    // TinyMCE selectors, please note that it is not possible to cache these
    // since they get created at runtime
    var elm1_menu_formatselect = "#menu_elm1_elm1_formatselect_menu";
    var elm1_menu_fontselect = "#menu_elm1_elm1_fontselect_menu";
    var elm1_menu_fontsizeselect = "#menu_elm1_elm1_fontsizeselect_menu";

    /**
     * Toggle between edit and view mode
     * Also handles adding and removing control from the tinyMCE editor
     *
     * @param {Boolean} edit If we should show edit mode
     */
    var toggleMode = function(edit) {
        if (edit) {
            $page_show.hide();
            $page_edit.show();
            tinyMCE.execCommand('mceAddControl', false, page_editor);
            debug.log('addControl', page_editor);
        } else {
            $page_edit.hide();
            $page_show.show();
            tinyMCE.execCommand('mceRemoveControl', false, page_editor);
        }
    };

    /**
     * Display the page in view mode
     */
    var displayPage = function() {
        toggleMode(false);
        $page_content.html(pageData["sakai:pageContent"]);
        sakai.api.Widgets.widgetLoader.insertWidgets(tuid);
    };

    /**
     * Display the page in edit mode
     */
    var editPage = function() {
        toggleMode(true);
    };
    
    // ==========
    // = TinyMCE =
    // ==========

    var tinyMCEOptions = {
        // General options
        mode : "exact",
        theme: "advanced",

        // For a built-in list of plugins with doc: http://wiki.moxiecode.com/index.php/TinyMCE:Plugins
        plugins: "safari,advhr,inlinepopups,preview,noneditable,nonbreaking,xhtmlxtras,template,table,autoresize,insertmore",

        // Context Menu
        theme_advanced_buttons1: "formatselect,fontselect,fontsizeselect,bold,italic,underline,|,forecolor,backcolor,|,justifyleft,justifycenter,justifyright,justifyfull,|,bullist,numlist,|,outdent,indent,|,table,link,insertmore",
        theme_advanced_buttons2:"",
        theme_advanced_buttons3:"",
        // set this to external|top|bottom
        theme_advanced_toolbar_location: "top",
        theme_advanced_toolbar_align: "left",
        theme_advanced_statusbar_location: "none",
        handle_node_change_callback: "sakai.page.mySelectionEvent",
        init_instance_callback: "sakai.page.startEditPage",

        // Example content CSS (should be your site CSS)
        content_css: sakai.config.URL.TINY_MCE_CONTENT_CSS,

        // Editor CSS - custom Sakai Styling
        editor_css: sakai.config.URL.TINY_MCE_EDITOR_CSS,

        // Drop lists for link/image/media/template dialogs
        template_external_list_url: "lists/template_list.js",
        external_link_list_url: "lists/link_list.js",
        external_image_list_url: "lists/image_list.js",
        media_external_list_url: "lists/media_list.js",

        // Use the native selects
        use_native_selects : true,

        // Replace tabs by spaces.
        nonbreaking_force_tab : true,

        // Security
        verify_html : true,
        cleanup : true,
        entity_encoding : "named",
        invalid_elements : "script",
        valid_elements : ""+
            "@[id|class|style|title|dir<ltr?rtl|lang|xml::lang|onclick|ondblclick|onmousedown|onmouseup|onmouseover|onmousemove|onmouseout|onkeypress|onkeydown|onkeyup],"+
            "a[href|rel|rev|target|title|type],"+
            "address[],"+
            "b[],"+
            "blink[],"+
            "blockquote[align|cite|clear|height|type|width],"+
            "br[clear],"+
            "caption[align|height|valign|width],"+
            "center[align|height|width],"+
            "col[align|bgcolor|char|charoff|span|valign|width],"+
            "colgroup[align|bgcolor|char|charoff|span|valign|width],"+
            "comment[],"+
            "em[],"+
            "embed[src|class|id|autostart]"+
            "font[color|face|font-weight|point-size|size],"+
            "h1[align|clear|height|width],"+
            "h2[align|clear|height|width],"+
            "h3[align|clear|height|width],"+
            "h4[align|clear|height|width],"+
            "h5[align|clear|height|width],"+
            "h6[align|clear|height|width],"+
            "hr[align|clear|color|noshade|size|width],"+
            "i[],"+
            "img[align|alt|border|height|hspace|src|vspace|width],"+
            "li[align|clear|height|type|value|width],"+
            "marquee[behavior|bgcolor|direction|height|hspace|loop|scrollamount|scrolldelay|vspace|width],"+
            "ol[align|clear|height|start|type|width],"+
            "p[align|clear|height|width],"+
            "pre[clear|width|wrap],"+
            "s[],"+
            "small[],"+
            "span[align],"+
            "strike[],"+
            "strong[],"+
            "sub[],"+
            "sup[],"+
            "table[align|background|bgcolor|border|bordercolor|bordercolordark|bordercolorlight|"+
                   "bottompadding|cellpadding|cellspacing|clear|cols|height|hspace|leftpadding|"+
                   "rightpadding|rules|summary|toppadding|vspace|width],"+
            "tbody[align|bgcolor|char|charoff|valign],"+
            "td[abbr|align|axis|background|bgcolor|bordercolor|"+
               "bordercolordark|bordercolorlight|char|charoff|headers|"+
               "height|nowrap|rowspan|scope|valign|width],"+
            "tfoot[align|bgcolor|char|charoff|valign],"+
            "th[abbr|align|axis|background|bgcolor|bordercolor|"+
               "bordercolordark|bordercolorlight|char|charoff|headers|"+
               "height|nowrap|rowspan|scope|valign|width],"+
            "thead[align|bgcolor|char|charoff|valign],"+
            "tr[align|background|bgcolor|bordercolor|"+
               "bordercolordark|bordercolorlight|char|charoff|"+
               "height|nowrap|valign],"+
            "tt[],"+
            "u[],"+
            "ul[align|clear|height|start|type|width]"+
            "video[src|class|autoplay|controls|height|width|preload|loop]"
    };

    var setupTinyMCEPlugins = function() {
        // TODO: move this out of a plugin, place it where the current
        // embedcontent button is, and put embedcontent in the select box
        // there's a JIRA for this

        // Creates a new plugin class and a custom listbox for the insert more menu
        tinymce.create('tinymce.plugins.InsertMorePlugin', {
            createControl: function(n, cm) {
                if ( n === 'insertmore' ) {
                        var insertMoreBox = cm.createListBox('insertmore', {
                         title : 'Insert More',
                         onselect : function(v) {
                             if (v==="link") {
                                 $insert_dialog.jqmShow();
                             } else if (v==="hr") {
                                 tinyMCE.get(page_editor).execCommand('InsertHorizontalRule');
                             } else {
                                 renderSelectedWidget(v);
                             }
                             $("#" + page_editor + "_insertmore").get(0).selectedIndex = 0;
                         }
                    });

                    insertMoreBox.add("Page Link", 'link');
                    insertMoreBox.add("Horizontal Line", 'hr');

                    // Vars for media and goodies
                    var media = {}; media.items = [];
                    var goodies = {}; goodies.items = [];
                    var sidebar = {}; sidebar.items = [];

                    // Fill in media and goodies
                    for (var i in sakai.widgets.widgets){
                        if (i) {
                            var widget = sakai.widgets.widgets[i];
                            if (widget[pageEmbedProperty] && widget.showinmedia) {
                                media.items.push(widget);
                            }
                            if (widget[pageEmbedProperty] && widget.showinsakaigoodies) {
                                goodies.items.push(widget);
                            }
                            if (widget[pageEmbedProperty] && widget.showinsidebar){
                                sidebar.items.push(widget);
                            }
                        }
                    }

                    $(media.items).each(function(i,val) {
                        insertMoreBox.add(val.name, val.id);
                    });
                    $(goodies.items).each(function(i,val) {
                        insertMoreBox.add(val.name, val.id);
                    });
                    $(sidebar.items).each(function(i,val) {
                        insertMoreBox.add(val.name, val.id);
                    });

                    // Event handler
                    $insert_dialog.jqm({
                        modal: true,
                        overlay: 20,
                        toTop: true/*, not sure we need the onHide
                        onHide: hideSelectedWidget*/
                    });

                    // Return the new listbox instance
                    return insertMoreBox;
                }

                return null;
            }
        });

        // Register plugin
        tinymce.PluginManager.add('insertmore', tinymce.plugins.InsertMorePlugin);
    };

    sakai.page.mySelectionEvent = function(editor_id, node, undo_index, undo_levels, visual_aid, any_selection) {
        if ($("#" + siteUUID + " #" + tuid).is(":visible")) {
            debug.info("sakai.page.mySelectionEvent", siteUUID, tuid);
            var ed = tinyMCE.get(editor_id);
            $context_menu.hide();
            var selected = ed.selection.getNode();
            if (selected && selected.nodeName.toLowerCase() === "img") {
                if ($(selected).hasClass("widget_inline")){
                    $context_settings.show();
                } else {
                    $context_settings.hide();
                }
                var pos = tinymce.DOM.getPos(selected);
                $context_menu.css(
                    {
                        "top": pos.y + $("#" + editor_id).position().top + 15 + "px", 
                        "left": pos.x + $("#" + editor_id).position().left + 15 + "px", 
                        "position": "absolute"
                    }
                ).show();
            }
        }
    };

    // ===============
    // = Insert More =
    // ===============
    var insertLink = function() {

        var editor = tinyMCE.get(page_editor);
        var selection = editor.selection.getContent();

        var $choosen_links = $("#insert_links_availablelinks li.selected");

        // If user selected some text to link
        if (selection) {
            // At the moment insert only first link, should disable multiple selection at the end
            editor.execCommand('mceInsertContent', false, '<a href="#page=' + $($choosen_links[0]).data("link") + '"  class="contauthlink">' + selection + '</a>');
        } else if ($choosen_links.length > 1) {
            // If we are inserting multiple links
            var toinsert = "<ul>";
            for (var i=0, j=$choosen_links.length; i<j; i++) {
                toinsert += '<li><a href="#page=' + $($choosen_links[i]).data("link") + '" class="contauthlink">' + $($choosen_links[i]).text() + '</a></li>';
            }
            toinsert += "</ul>";
            editor.execCommand('mceInsertContent', false, toinsert);
        } else {
            // If we are insertin 1 link only, without selection
            editor.execCommand('mceInsertContent', false, '<a href="#page=' + $($choosen_links[0]).data("link") + '"  class="contauthlink">' + $($choosen_links[0]).text() + '</a>');
        }

        $('#link_dialog').jqmHide();

        return true;
    };

    sakai.page.startEditPage = function(inst) {
        if ($("#" + siteUUID + " #" + tuid).is(":visible")) {
            debug.info("sakai.page.startEditPage", siteUUID, tuid);
        }
    };

    // save page edit

    var savePageData = function(callback) {
        debug.info("savePageData");
        if ($.isFunction(callback)) {
            callback();
        }
    };

    var getPageData = function(callback) {
        sakai.api.Server.loadJSON(PAGE_DATA_SERVICE, function(success, data) {
            if (success) {
                dataLoaded = true;
                pageData = data;
            }
            if ($.isFunction(callback)) {
                callback(success);
            }
        }, tuid);
    };

    var bindPageEvents = function() {
        debug.log("sakai.page." + siteUUID + "." + tuid + ".show");
        $(window).unbind("sakai.page." + siteUUID + "." + tuid + ".show");
        $(window).bind("sakai.page." + siteUUID + "." + tuid + ".show", function(e, opts) {
            canEdit = opts.canEdit || false;
            pageEmbedProperty = opts.pageEmbedProperty || "";
            // show the edit button if this is editable
            if (canEdit) {
                setupTinyMCEPlugins();
                tinyMCE.settings = tinyMCEOptions;
                $content_page_options.show();
            }

            // get the page data if we don't already have it
            if ($.isEmptyObject(pageData)) {
                getPageData(function() {
                    displayPage();
                });
            } else {
                displayPage();
            }
        });

        $page_edit_button.die("click");
        $page_edit_button.live("click", function() {
            editPage();
        });

        $cancel_button.die("click");
        $cancel_button.live("click", function() {
            displayPage();
        });

        $save_button.die("click");
        $save_button.live("click", function() {
            savePageData(function() {
                displayPage();
            });
        });
    };

    var doInit = function(){
        siteUUID = sakai.api.Widgets.widgetLoader.widgets[tuid].placement.split("/")[0].split(tuid)[0];

        /*if (showSettings) {
        } else {
        }*/
        page_editor = page_editor + "_" + siteUUID + "_" + tuid;
        $page_editor.attr("id",page_editor);
        bindPageEvents();
        $(window).trigger("sakai.page." + siteUUID + "." + tuid + ".ready");
        sakai.page[siteUUID] = sakai.page[siteUUID] || {};
        sakai.page[siteUUID][tuid] = {};
        sakai.page[siteUUID][tuid].isReady = true;
    };

    doInit();

};

sakai.api.Widgets.widgetLoader.informOnLoad("page");
