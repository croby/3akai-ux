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
 * @name sakai.sitenavigation
 *
 * @class sitenavigation
 *
 * @description
 * Initialize the sitenavigation widget
 *
 * @version 0.2.0
 * @param {String} tuid Unique id of the widget
 * @param {Boolean} showSettings Show the settings of the widget or not
 */

sakai.sitenavigation = function(tuid, showSettings){

    var navigationData = {},
        siteData = {},
        canEdit = true,
        currentPage = false;

    var $rootel = $("#" + tuid),
        $sitenavigation_main = $("#sitenavigation_main", $rootel),
        $sitenavigation_settings = $("#sitenavigation_settings", $rootel),
        $sitenavigation_settings_template = $("#sitenavigation_settings_template", $rootel),
        $sitenavigation_footer_edit = $("#sitenavigation_footer_edit", $rootel),
        $sitenavigation_footer_noedit = $("#sitenavigation_footer_noedit", $rootel),
        $sitenavigation_header = $("#sitenavigation_header", $rootel),
        $sitenavigation_settings_icon = $("#sitenavigation_settings_icon", $rootel),
        $sitenavigation_tree = $("#sitenavigation_tree", $rootel);

    /**
     * Create a node for JSTree to use
     *
     * @param {Object} siteDataNode An object from the site data json
     * @return {Object} The JSTree formatted data object
     */
    var createJSTreeNode = function(siteDataNode) {
        return ret = {
            data: siteDataNode["sakai:pageTitle"],
            attr: { id: "nav_" + siteData["jcr:uuid"] + "_" + siteDataNode["jcr:uuid"] }
        };
    };

    /**
     * Create data appropriate for the navigation tree
     * This function loops over each node and all its children
     * in order to create a data object that JSTree likes
     *
     * @param {Object} root The current root that we should be creating a node for
     * @return {Array} The array of data for JSTree
     */
    var createNavTreeDataFromSiteData = function(root) {
        var ret = [];
        for (var i = 0, j=root.length; i<j; i++) {
            var thisNode = createJSTreeNode(root[i]);
            if (root[i].hasOwnProperty("children") && root[i].children.length) {   
                thisNode.children = [];
                thisNode.state = "closed";
                var children = createNavTreeDataFromSiteData(root[i].children);
                for (var x=0, y=children.length; x<y; x++) {
                    thisNode.children.push(children[x]);
                }
            }
            ret.push(thisNode);
        }
        return ret;
    };

    /**
     * Create a site node from a nav tree node
     *
     * @param {Object} navTreeNode The Nav Tree Node to turn into a site node
     * @return {Object} The site node
     */
    var createSiteNode = function(navTreeNode) {
        return ret = {
            "jcr:uuid": navTreeNode.attr.id,
            "sakai:pageTitle": navTreeNode.data
        };
    };

    /**
     * Recreate the siteData tree from the current Navigation tree data
     *
     * @param {Object} root The current root to start from (navigationData)
     * @return {Array} The new siteData tree
     */
    var createSiteDataFromNavTreeData = function(root) {
        var ret = [];
        for (var i = 0, j=root.length; i<j; i++) {
            var thisNode = createSiteNode(root[i]);
            thisNode["sakai:pagePosition"] = i;
            if (root[i].hasOwnProperty("children") && root[i].children.length) {   
                thisNode.children = [];
                var children = createSiteDataFromNavTreeData(root[i].children);
                for (var x=0, y=children.length; x<y; x++) {
                    thisNode.children.push(children[x]);
                }
            }
            ret.push(thisNode);
        }
        return ret;
    };


    /**
     * Setup the navigation tree
     */
    var setupNavTree = function() {
        var pluginArray = canEdit ?
            [ "themes", "json_data", "ui", "cookies", "dnd" ] :
            [ "themes", "json_data", "ui", "cookies" ];

        navigationData = createNavTreeDataFromSiteData(siteData.pages);
        debug.log("currentPage", currentPage);
        
        $sitenavigation_tree.jstree({
            "core": {
                "animation": 0,
                "html_titles": true
            },
            "cookies": {
                "save_selected": false
            },
            "json_data": {
                "data": navigationData
            },
            "themes": {
                "dots": false,
                "icons": true
            },
            "ui": {
                "select_limit": 1,
                "initially_select": ["nav_" + currentPage]
            },
            "plugins" : pluginArray
        }).show();
        bindJSTreeEvents();
    };

    /**
     * Bind to events in JSTree and fire appropriate events here
     */
    var bindJSTreeEvents = function() {
        // Selection
        $sitenavigation_tree.bind("select_node.jstree", function(e, data) {
            var pageID = $(data.rslt.obj[0]).attr("id").split("nav_")[1];
            $.bbq.pushState({"page": pageID});
        });

        // Moving
        $sitenavigation_tree.bind("move_node.jstree", function (e, data) {
            refreshData();
            debug.log(siteData);
        });
    };

    var refreshData = function() {
        navigationData = $sitenavigation_tree.jstree("get_json");
        debug.log($sitenavigation_tree.jstree("get_json"));
        siteData = createSiteDataFromNavTreeData(navigationData);
    };

    var deletePage = function() {
        debug.debug($sitenavigation_tree.jstree("get_selected"));
        $sitenavigation_tree.jstree("delete_node", $sitenavigation_tree.jstree("get_selected"));
        refreshData();
        $.bbq.pushState({"page":navigationData[0].attr.id});
    };

    var addPage = function(pageObj) {
        var navTreePageObj = createJSTreeNode(pageObj);
        $sitenavigation_tree.jstree("create_node", $sitenavigation_tree.jstree("get_container"), "last", navTreePageObj);
        refreshData();
    };

    // handle showing a page
    //  - handle external event to change page (for new pages)

    // handle history change
    var parseState = function(callback) {
        if ($.bbq.getState("page") && $.bbq.getState("page") !== currentPage) {
            currentPage = $.bbq.getState("page");
            $(".page", "#" + siteData["jcr:uuid"]).hide(); // rootel of the site
            $("#" + $.bbq.getState("page")).show();
            $(window).trigger("sakai.sitenavigation." + tuid + ".newState");
        } else if (!currentPage && siteData && siteData.pages) {
            $.bbq.pushState({"page": siteData["jcr:uuid"] + "_" + siteData.pages[0]["jcr:uuid"]});
        }
    };

    // handle removing a page from the tree
    // 1. check to see if the page can be deleted
    // 4. tell the site to remove it (or remove it and tell the site the new data)


    var toggleEdit = function(allowEditing) {
        if (allowEditing) {
            // Mimic normal hover action for dashboard widgets
            $sitenavigation_header.unbind("mouseenter mouseleave");
            $sitenavigation_header.bind("mouseenter", function () {
                $sitenavigation_settings_icon.show();
            });
            $sitenavigation_header.bind("mouseleave", function () {
                $sitenavigation_settings_icon.hide();
            });
            $sitenavigation_footer_noedit.hide();
            $sitenavigation_footer_edit.show();
        } else {
            $sitenavigation_footer_edit.hide();
            $sitenavigation_footer_noedit.show();
        }
    };


    /**
     * Toggle the widget settings
     *
     * @param {Boolean} show Show settings if true, hide if false
     */
    var toggleSettings = function(show) {
        if (show) {
            $sitenavigation_main.hide();
            $sitenavigation_settings.show();
        } else {
            $sitenavigation_main.show();
            $sitenavigation_settings.hide();
        }
    };

    var bindEvents = function() {
        $(window).unbind("hashchange");
        $(window).bind("hashchange", function(e) {
            parseState();
        });

        // unbind all events in this tuid namespace
        $(window).unbind("sakai.sitenavigation." + tuid);

        $(window).bind("sakai.sitenavigation." + tuid + ".render", function(e, obj) {
            debug.log("render");
            canEdit = obj.canEdit;
            siteData = obj.siteData;
            toggleEdit(canEdit);
            $(window).bind("sakai.sitenavigation."  + tuid + ".newState", function() {
                $(window).unbind("sakai.sitenavigation." + tuid + ".newState");
                setupNavTree();
            });
            $(window).trigger("hashchange");
        });

        $(window).bind("sakai.sitenavigation." + tuid + ".deletePage", function(e) {
            deletePage();
        });

        $(window).bind("sakai.sitenavigation." + tuid + ".addPage", function(e, pageObj) {
            addPage(pageObj);
        });
    };

    var init = function() {
        toggleSettings(showSettings);
        debug.log(tuid);
        if (showSettings) {
            debug.log("showSettings");
        } else {
            bindEvents();
        }
        debug.log("sakai.site.nav." + tuid + ".ready");
        $(window).trigger("sakai.site.nav." + tuid + ".ready");
    };

    init();

};

sakai.api.Widgets.widgetLoader.informOnLoad("sitenavigation");
