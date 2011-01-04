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
sakai.page = function(tuid, showSettings) {

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
        updatingExistingWidget = false;


    // Cache all the jQuery selectors we can

    var $elm1_ifr = $("#elm1_ifr");
    var $elm1_toolbar1 = $("#elm1_toolbar1");
    var $elm1_toolbar2 = $("#elm1_toolbar2");
    var $elm1_toolbar3 = $("#elm1_toolbar3");
    var $elm1_toolbar4 = $("#elm1_toolbar4");
    var $elm1_external = $("#elm1_external");
    var $toolbarplaceholder = $("#toolbarplaceholder");
    var $toolbarcontainer = $("#toolbarcontainer");
    var $placeholderforeditor = $("#placeholderforeditor");
    var $context_menu = $("#context_menu");
    var $context_settings = $("#context_settings");
    var $title_input_container = $("#title-input-container");
    var $fl_tab_content_editor = $("#fl-tab-content-editor");


    var $li_edit_page_divider = $("#li_edit_page_divider");
    var $li_edit_page = $("#li_edit_page");

    var $page_nav_content = $("#page_nav_content");
    var $pagetitle = $("#pagetitle");
    var $webpage_edit = $("#webpage_edit");
    var $tool_edit = $("#tool_edit");
    var $insert_more_menu = $("#insert_more_menu");
    var $more_menu = $("#more_menu");
    var $main_content_div = $("#main-content-div");
    var $more_link = $("#more_link");
    var $li_more_link = $("#li_more_link");
    var $print_page = $("#print_page");
    var $content_page_options = $("#content_page_options");
    var $page_page_options = $("#page_page_options");
    var $more_revision_history = $("#more_revision_history");
    var $more_save_as_template = $("#more_save_as_template");
    var $more_change_layout = $("#more_change_layout");

    // TinyMCE selectors, please note that it is not possible to cache these
    // since they get created at runtime
    var elm1_menu_formatselect = "#menu_elm1_elm1_formatselect_menu";
    var elm1_menu_fontselect = "#menu_elm1_elm1_fontselect_menu";
    var elm1_menu_fontsizeselect = "#menu_elm1_elm1_fontsizeselect_menu";

    var getPageData = function() {
        sakai.api.Server.loadJSON(PAGE_DATA_SERVICE, function(success, data) {
            if (success) {
                pageData = data;
            }
        }, tuid);
    };

    var bindPageEvents = function() {
        $(window).unbind("sakai.page." + tuid + ".load");
        $(window).bind("sakai.page." + tuid + ".load", function(e) {
            getPageData();
        });
    };

    var doInit = function(){
        if (showSettings) {
        } else {
        }
        bindPageEvents();
        $(window).trigger("sakai.page.ready", tuid);
        sakai.page.isReady = true;
    };

    doInit();

};

sakai.api.Widgets.widgetLoader.informOnLoad("page");
