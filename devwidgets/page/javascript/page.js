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

    var autosavecontent = false,
        updatingExistingWidget = false,
        pageEmbedProperty = "",
        selectedWidgetID = false,
        selectedWidgetTUID = false,
        updateExistingWidget = false,
        currentEditView = "tinymce",
        dataLoaded = false,
        siteUUID = false,
        canEdit = false,
        tmpPageContent = false;

    var page_editor = "page_editor", // tinyMCE needs the string
        $page_editor = $("#page_editor", $rootel),
        $insert_dialog = $("#insert_dialog", $rootel),
        $page_edit_button = $("#page_edit_button", $rootel),
        $page_show = $("#page_show", $rootel),
        $page_edit = $("#page_edit", $rootel),
        $cancel_button = $("#page_save_options_bottom .cancel-button", $rootel),
        $save_button = $("#page_save_options_bottom .save_button", $rootel),
        $context_menu = $("#context_menu", $rootel),
        $context_settings = $("#context_settings", $rootel),
        $page_edit_title = $("#page_edit_title", $rootel),
        $page_title = $("#page_title", $rootel),
        $tab_html = $("#tab_html", $rootel),
        $tab_text_editor = $("#tab_text_editor", $rootel),
        $tab_preview = $("#tab_preview", $rootel),
        $html_editor = $("#html_editor", $rootel),
        $html_editor_content = $("#html_editor_content", $rootel),
        $tinymce_editor = $("#tinymce_editor", $rootel),
        $page_preview_content = $("#page_preview_content", $rootel),
        $context_remove = $("#context_remove", $rootel),
        $context_wrapping = $("#context_wrapping", $rootel),
        $dialog_content = $("#dialog_content", $rootel),
        $dialog_title = $("#dialog_title", $rootel),
        $wrapping_dialog = $("#wrapping_dialog", $rootel),
        $wrapping_left = $("#wrapping_left", $rootel),
        $wrapping_right = $("#wrapping_right", $rootel),
        $wrapping_no = $("#wrapping_no", $rootel),
        $link_dialog = $("#link_dialog", $rootel);
        

    var $page_nav_content = $("#page_nav_content", $rootel);
    var $webpage_edit = $("#webpage_edit", $rootel);
    var $tool_edit = $("#tool_edit", $rootel);
    var $insert_more_menu = $("#insert_more_menu", $rootel);
    var $more_menu = $("#more_menu", $rootel);
    var $page_content = $("#page_content", $rootel);
    var $more_link = $("#more_link", $rootel);
    var $li_more_link = $("#li_more_link", $rootel);
    var $content_page_options = $("#content_page_options", $rootel);
    var $page_page_options = $("#page_page_options", $rootel);
    var $more_revision_history = $("#more_revision_history", $rootel);
    var $more_save_as_template = $("#more_save_as_template", $rootel);
    var $more_change_layout = $("#more_change_layout", $rootel);

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
        $page_title.html(pageData["sakai:pageTitle"]);
        $page_content.html(pageData["sakai:pageContent"]);
        toggleMode(false);
        sakai.api.Widgets.widgetLoader.insertWidgets(tuid);
    };

    /**
     * Display the page in edit mode
     */
    var editPage = function() {
        $page_edit_title.val(pageData["sakai:pageTitle"]);
        registerWidgetFunctions();
        toggleMode(true);
    };
    
    // ==========
    // = TinyMCE =
    // ==========

    /**
     * All our TinyMCE options. They're put here instead of in an init block
     * to make it easier to have multiple editors going at once
     */
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
        setup : function(ed) {
            ed.onInit.add(function(ed) {
                $(window).trigger(ed.id + ".activate", {"editor_id": ed.id});
            });
            ed.onNodeChange.add(function(ed, cm, e) {
                $(window).trigger(ed.id + ".nodechange", {"editor_id": ed.id});
            });
        },

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

    /**
     * Setup our tinymce plugins, for now, just the insert more menu
     * TODO move the insert more menu out of a plugin
     */
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
                                 $link_dialog.jqmShow();
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

                    // Return the new listbox instance
                    return insertMoreBox;
                }

                return null;
            }
        });

        // Register plugin
        tinymce.PluginManager.add('insertmore', tinymce.plugins.InsertMorePlugin);
    };

    /**
     * Hide the dialog box that the widget settings are showing in and
     * clear out its html
     *
     * @param {Object} hash jqModal hash
     */
    var hideSelectedWidget = function(hash){
        hash.w.hide();
        hash.o.remove();
        $dialog_content.html("").hide();
    };

    /**
     * Insert widget modal Cancel button - hide modal
     *
     * @param {Object} tuid
     * @retuen void
     */
    var widgetCancel = function(){
        $insert_dialog.jqmHide();
    };

    /**
     * Widget finish - add widget to editor, hide modal dialog
     *
     * @param {Object} tuid
     * @return void
     */
    var widgetFinish = function(){
        // Add widget to the editor
        if (!updatingExistingWidget) {
            tinyMCE.get(page_editor).execCommand('mceInsertContent', false, '<img src="' + sakai.widgets.widgets[selectedWidgetID].img + '" id="' + selectedWidgetTUID + '" class="widget_inline" style="display:block; padding: 10px; margin: 4px" border="1"/>');
        }
        updatingExistingWidget = false;
        $insert_dialog.jqmHide();
    };

    /**
     * Register the appropriate widget cancel and save functions
     */
    var registerWidgetFunctions = function(){
        sakai.api.Widgets.Container.registerFinishFunction(function() {
            $(window).trigger(page_editor + ".widget.finish");
        });
        sakai.api.Widgets.Container.registerCancelFunction(function() {
            $(window).trigger(page_editor + ".widget.cancel");
        });
    };

    /**
     * TinyMCE handler function, handles the currently selected element in the editor
     */
    var handleSelection = function(editor_id) {
        if ($("#" + siteUUID + " #" + tuid).is(":visible")) {
            debug.info("handleSelection", siteUUID, tuid);
            $context_menu.hide();
            var selected = tinyMCE.get(editor_id).selection.getNode();
            if (selected && selected.nodeName.toLowerCase() === "img") {
                if ($(selected).hasClass("widget_inline")){
                    $context_settings.show();
                } else {
                    $context_settings.hide();
                }
                var pos = tinymce.DOM.getPos(selected);
                $context_menu.css(
                    {
                        "top": pos.y + $("#" + editor_id + "_ifr").position().top + 15 + "px", 
                        "left": pos.x + $("#" + editor_id + "_ifr").position().left + 15 + "px", 
                        "position": "absolute"
                    }
                ).show();
            }
        }
    };

    /** Widget Context Menu **/
    var showWidgetSettings = function() {
        var selected = tinyMCE.get(page_editor).selection.getNode();
        $dialog_content.hide();
        if (selected && selected.nodeName.toLowerCase() === "img" && $(selected).hasClass("widget_inline")) {
            updatingExistingWidget = true;
            $context_settings.show();
            var id = selected.getAttribute("id");
            var split = id.split("_");
            var type = split[1];
            var uid = split[2];
            var length = split[0].length + 1 + split[1].length + 1 + split[2].length + 1;
            var placement = id.substring(length);
            var widgetSettingsWidth = 650;
            selectedWidgetID = type;
            $dialog_content.hide();
            if (sakai.widgets.widgets[type]) {
                if (sakai.widgets.widgets[type].settingsWidth) {
                    widgetSettingsWidth = sakai.widgets.widgets[type].settingsWidth;
                }
                var nuid = "widget_" + type + "_" + uid;
                if (placement){
                    nuid += "_" + placement;
                }
                selectedWidgetTUID = nuid;
                $dialog_content.html(sakai.api.Security.saneHTML('<img src="' + sakai.widgets.widgets[type].img + '" id="' + nuid + '" class="widget_inline" border="1"/>'));
                $dialog_title.html(sakai.widgets.widgets[type].name);
                // TODO figure out where to save these widgets and adjust the commented out portion
                sakai.api.Widgets.widgetLoader.insertWidgets("dialog_content", true);//, sakai.sitespages.config.basepath + "_widgets/");
                $dialog_content.show();
                $insert_dialog.css({'width':widgetSettingsWidth + "px", 'margin-left':-(widgetSettingsWidth/2) + "px"}).jqmShow();
            }
        }

        $("#context_menu").hide();
    };

    var removeSelectedWidget = function() {
        var selected = tinyMCE.get(page_editor).selection.getNode();
        tinyMCE.execCommand("mceRemoveNode", true, selected);
    };

    /** Widget Wrapping **/
    var setNewStyleClass = function(classToAdd) {
        var ed = tinyMCE.get(page_editor);
        var $selected = $(ed.selection.getNode());
        $selected.removeClass("block_image").removeClass("block_image_right").removeClass("block_image_left");
        $selected.addClass(classToAdd);
        $wrapping_dialog.jqmHide();
    };

    var showWrappingDialog = function(hash){
        $context_menu.hide();
        window.scrollTo(0,0);
        hash.w.show();
    };

    /**
     * When the editor is initially ready, insert the content
     */
    var insertContent = function(editor_id) {
        tinyMCE.get(editor_id).setContent(pageData["sakai:pageContent"]);
    };

    var renderInsertLinkDialog = function(hash) {
        var $links = $('<ul id="insert_links_availablelinks"></ul>');
        var toggleSelectedOn = function(e) {
            $(this).addClass("selected");
        };
        var toggleSelectedOff = function(e) {
            $(this).removeClass("selected");
        };
        // get current pages on the site (from sitenavigation prob)
        // render a template from that list of pages
        // Create clickable page links
        for (var urlname in sakai.sitespages.site_info._pages) {
            if (sakai.sitespages.site_info._pages[urlname]) {
                var $link = $('<li id="linksel_'+ urlname +'">' + sakai.sitespages.site_info._pages[urlname]["pageTitle"] + '</li>')
                    .data("link", urlname)
                    .css({"padding-left": ((parseInt(sakai.sitespages.site_info._pages[urlname]["pageDepth"],10) - 4) * 3) + "px"})
                    .toggle(toggleSelectedOn, toggleSelectedOff);
                $links.append($link);
            }
        }

        $("#link_container").html($links);

        $("#insert_more_menu").hide();

        hash.w.show();
    };

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

        $link_dialog.jqmHide();

        return true;
    };

    /**
     * Render selected widget from the insert more menu or from settings
     *
     * @param {Object} hash
     * @return void
     */
    var renderSelectedWidget = function(widgetid) {
        var widgetSettingsWidth = 650;
        $dialog_content.hide();
        if (sakai.widgets.widgets[widgetid]){
            selectedWidgetID = widgetid;
            var tuid = "id" + Math.round(Math.random() * 1000000000);
            var id = "widget_" + widgetid + "_" + tuid;
            selectedWidgetTUID = id;
            $dialog_content.html(sakai.api.Security.saneHTML('<img src="' + sakai.widgets.widgets[widgetid].img + '" id="' + id + '" class="widget_inline" border="1"/>'));
            $("#dialog_title").html(sakai.widgets.widgets[widgetid].name);
            // TODO figure out where these widgets should save
            sakai.api.Widgets.widgetLoader.insertWidgets(tuid,true);//,sakai.sitespages.config.basepath + "_widgets/");
            if (sakai.widgets.widgets[widgetid].settingsWidth) {
                widgetSettingsWidth = sakai.widgets.widgets[widgetid].settingsWidth;
            }
            $dialog_content.show();
            window.scrollTo(0,0);
        } else if (!widgetid){
            window.scrollTo(0,0);
        }
        $insert_dialog.css({'width':widgetSettingsWidth + "px", 'margin-left':-(widgetSettingsWidth/2) + "px"}).jqmShow();
    };

    var savePageData = function(callback) {
        debug.info("savePageData");
        setTmpPageContent();
        var currentPageContent = tmpPageContent.replace(/src="..\/devwidgets\//g, 'src="/devwidgets/');
        pageData["sakai:pageContent"] = currentPageContent;
        pageData["sakai:pageTitle"] = $page_edit_title.val();
        debug.log(pageData);
        // actually save the data

        // call the callback
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

    /**
     * Get the current page content from the most recent editable view
     */
    var setTmpPageContent = function() {
        switch (currentEditView) {
            case "html":
                tmpPageContent = $html_editor_content.val();
                break;
            case "tinymce":
                tmpPageContent = tinyMCE.get(page_editor).getContent({format:"raw"});
                break;
            case "preview":
                break;
            default:
                break;
        }
    };

    /**
     * Switch the edit mode
     * Hides the current edit mode and changes to the new one, preserving
     * content across modes
     *
     * @param {String} newMode The mode to switch to, could be (html, tinymce, preview)
     */
    var switchEditMode = function(newMode) {
        if (currentEditView !== newMode) {
            setTmpPageContent();
            switch (currentEditView) {
                case "html":
                    $html_editor.hide();
                    break;
                case "tinymce":
                    $tinymce_editor.hide();
                    break;
                case "preview":
                    $page_preview_content.hide();
                    break;
                default:
                    break;
            }

            switch (newMode) {
                case "html":
                    $context_menu.hide();
                    $html_editor_content.val(tmpPageContent);
                    $html_editor.show();
                    $page_edit_title.val(pageData["sakai:pageTitle"]).show();
                    break;
                case "tinymce":
                    tinyMCE.get(page_editor).setContent(tmpPageContent);
                    $tinymce_editor.show();
                    break;
                case "preview":
                    $page_preview_content.html(tmpPageContent);
                    $page_preview_content.show();
                    sakai.api.Widgets.widgetLoader.insertWidgets($page_preview_content.attr("id"));
                    break;
                default:
                    break;
            }
            currentEditView = newMode;
        }
    };

    var initModalDialogs = function() {

        $insert_dialog.jqm({
            modal: true,
            overlay: 20,
            toTop: true,
            onHide: hideSelectedWidget
        });

        $wrapping_dialog.jqm({
            modal: true,
            overlay: 20,
            toTop: true,
            onShow: showWrappingDialog
        });
        
        $link_dialog.jqm({
            modal: true,
            overlay: 20,
            onShow: renderInsertLinkDialog,
            toTop: true
        });
    };

    /**
     * Bind all the events that happen on the page widget and delegate their handlers
     */
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
            $save_button.attr("disabled", "disabled");
            savePageData(function() {
                $save_button.removeAttr("disabled");
                displayPage();
            });
        });

        // TinyMCE bindings
        $(window).unbind(page_editor);
        $(window).bind(page_editor + ".activate", function(e, obj) {
            insertContent(obj.editor_id);
        });

        $(window).bind(page_editor + ".nodechange", function(e, obj) {
            handleSelection(obj.editor_id);
        });

        // Widget bindings from the insert more menu
        $(window).bind(page_editor + ".widget.finish", function(e, obj) {
            widgetFinish();
        });

        $(window).bind(page_editor + ".widget.cancel", function(e, obj) {
            widgetCancel();
        });

        // Bind the editor mode tabs
        $tab_html.unbind("click");
        $tab_html.bind("click", function() {
            switchEditMode('html');
        });

        $tab_text_editor.unbind("click");
        $tab_text_editor.bind("click", function() {
            switchEditMode('tinymce');
        });

        $tab_preview.unbind("click");
        $tab_preview.bind("click", function() {
            switchEditMode('preview');
        });
        
        // Context menu
        $context_settings.unbind("click");
        $context_settings.bind("click", function() {
            showWidgetSettings();
        });

        $context_remove.unbind("click");
        $context_remove.bind("click", function() {
            removeSelectedWidget();
        });

        $context_wrapping.unbind("click");
        $context_wrapping.bind("click", function() {
            $wrapping_dialog.jqmShow();
        });

        // Wrapping dialog options

        $wrapping_no.bind("click", function() {
            setNewStyleClass("block_image");
        });

        $wrapping_left.bind("click", function() {
            setNewStyleClass("block_image_left");
        });

        $wrapping_right.bind("click", function() {
            setNewStyleClass("block_image_right");
        });

    };



    var doInit = function(){
        siteUUID = sakai.api.Widgets.widgetLoader.widgets[tuid].placement.split("/")[0].split(tuid)[0];
        page_editor = page_editor + "_" + siteUUID + "_" + tuid;
        $page_editor.attr("id",page_editor);
        bindPageEvents();
        initModalDialogs();
        $(window).trigger("sakai.page." + siteUUID + "." + tuid + ".ready");
        sakai.page[siteUUID] = sakai.page[siteUUID] || {};
        sakai.page[siteUUID][tuid] = {};
        sakai.page[siteUUID][tuid].isReady = true;
    };

    doInit();

};

sakai.api.Widgets.widgetLoader.informOnLoad("page");
