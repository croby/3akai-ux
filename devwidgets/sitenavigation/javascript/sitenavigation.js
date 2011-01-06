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
        siteDataFlattened = {}, // UUID-indexed
        canEdit = true,
        currentPage = false,
        currentEntity = false,
        currentEntityType = false,
        pagesVisibility = false,
        createPageUUID = false;

    var $rootel = $("#" + tuid),
        $sitenavigation_main = $("#sitenavigation_main", $rootel),
        $sitenavigation_settings = $("#sitenavigation_settings", $rootel),
        $sitenavigation_settings_template = $("#sitenavigation_settings_template", $rootel),
        $sitenavigation_footer_edit = $("#sitenavigation_footer_edit", $rootel),
        $sitenavigation_footer_noedit = $("#sitenavigation_footer_noedit", $rootel),
        $sitenavigation_header = $("#sitenavigation_header", $rootel),
        $sitenavigation_settings_icon = $("#sitenavigation_settings_icon", $rootel),
        $sitenavigation_tree = $("#sitenavigation_tree", $rootel),
        $widget_settings_menu = $("#widget_settings_menu", $rootel),
        $sitenavigation_settings_form = $("#sitenavigation_settings_form", $rootel),
        $sitenavigation_pages_visibility = $("#sitenavigation_pages_visibility", $rootel),
        $sitenavigation_delete_page = $("#sitenavigation_delete_page", $rootel),
        $sitenavigation_create_page = $("#sitenavigation_create_page", $rootel),
        $sitenavigation_createpage_template = $("#sitenavigation_createpage_template", $rootel),
        $sitenavigation_createpage_container = $("#sitenavigation_createpage_container", $rootel);

    /**
     * Create a node for JSTree to use
     *
     * @param {Object} siteDataNode An object from the site data json
     * @return {Object} The JSTree formatted data object
     */
    var createJSTreeNode = function(siteDataNode) {
        var ret = {
            data: siteDataNode["sakai:pageTitle"],
            attr: { id: "nav_" + siteData["jcr:uuid"] + "_" + siteDataNode["jcr:uuid"] }
        };
        if (siteDataNode.hasOwnProperty("sakai:deletable")) {
            ret.attr["class"] = "deletable_" + siteDataNode["sakai:deletable"];
        }
        return ret;
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
            siteDataFlattened[root[i]["jcr:uuid"]] = root[i];
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
        var ret = {
            "jcr:uuid": navTreeNode.attr.id.split("nav_" + siteData["jcr:uuid"] + "_")[1],
            "sakai:pageTitle": navTreeNode.data
        };
        /* 
         * the class attribute is a set of space-delimited sakai:- prefixed properties
         * An example value would be "deletable_false" which translates to
         * sakai:deletable = false
         */
        if (navTreeNode.attr["class"]) {
            var classes = navTreeNode.attr["class"].split(" ");
            for (var i=0, j=classes.length; i<j; i++) {
                var classSplit = classes[i].split("_");
                ret["sakai:" + classSplit[0]] = classSplit[1];
            }
        }
        return ret;
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
            siteDataFlattened[thisNode["jcr:uuid"]] = thisNode;
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

        siteDataFlattened = {};
        navigationData = createNavTreeDataFromSiteData(siteData.pages);
        debug.log("initially selecting", currentPage);
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
            debug.log(pageID);
            if (pageID !== currentPage) {
                debug.log("pageID !== currentPage");
                $.bbq.pushState({"page": pageID});
            }
        });

        // Moving
        $sitenavigation_tree.bind("move_node.jstree", function (e, data) {
            refreshData();
            debug.log(siteData);
        });
    };

    var refreshData = function() {
        navigationData = $sitenavigation_tree.jstree("get_json", -1);
        siteDataFlattened = {};
        siteData.pages = createSiteDataFromNavTreeData(navigationData);
    };

    var deletePage = function() {
        var nodeToDelete = $sitenavigation_tree.jstree("get_selected");
        var nodeUUID = $(nodeToDelete).attr("id");
        nodeUUID = nodeUUID.split("nav_" + siteData["jcr:uuid"] + "_")[1];
        var siteDataNode = siteDataFlattened[nodeUUID];
        if (!siteDataNode.hasOwnProperty("sakai:deletable") || siteDataNode["sakai:deletable"] === "true") {
            $sitenavigation_tree.jstree("delete_node", $sitenavigation_tree.jstree("get_selected"));
            refreshData();
            if (navigationData[0]) {
                $.bbq.pushState({"page":navigationData[0].attr.id.split("nav_")[1]});
            } else {
                $.bbq.removeState("page");
            }
        }
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
        var pageState = $.bbq.getState("page");
        if (pageState && pageState !== currentPage) {
            currentPage = pageState;
            $(window).trigger("sakai.sitenavigation." + tuid + ".newState");
            var $selected = $sitenavigation_tree.jstree("get_selected");
            var $nodeToSelect = $sitenavigation_tree.find("#nav_" + pageState);
            var siteUUID = siteData["jcr:uuid"];
            var pageUUID = pageState.split(siteUUID + "_")[1];
            var $page = $("#" + pageUUID, "#" + siteUUID);
            // ensure the node is valid and that we're not selecting an already-selected node
            if ($nodeToSelect.length && $selected.attr("id") !== $nodeToSelect.attr("id")) {
                $(".page", "#" + siteUUID).hide(); // rootel of the site
                debug.log("showing", $page.selector);
                $page.find(".page").show();
                $(window).trigger("sakai.page." + siteUUID + "." + pageUUID + ".show", {"canEdit": canEdit});
                $sitenavigation_tree.jstree("deselect_node", $selected);
                $sitenavigation_tree.jstree("select_node", $nodeToSelect);
            } else if (siteData && siteData.pages && $selected.attr("id") !== $nodeToSelect.attr("id")) {
                $.bbq.pushState({"page": siteUUID + "_" + siteData.pages[0]["jcr:uuid"]});
            } else if ($selected.attr("id") === $nodeToSelect.attr("id")) {
                currentPage = pageState;
                $(".page", "#" + siteUUID).hide();
                debug.log("showing", $page.selector);
                $page.find(".page").show();
                $(window).trigger("sakai.page." + siteUUID + "." + pageUUID + ".show", {"canEdit": canEdit});
            }
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
                if (!$widget_settings_menu.is(":visible")) {
                    $sitenavigation_settings_icon.hide();
                }
            });
            $sitenavigation_footer_noedit.hide();
            $sitenavigation_footer_edit.show();
        } else {
            $sitenavigation_footer_edit.hide();
            $sitenavigation_footer_noedit.show();
        }
    };

    var savePermissions = function() {
        var selectedValue = $($sitenavigation_pages_visibility.selector).val();

        // only update if value has changed
        if(selectedValue !== pagesVisibility) {
            $.ajax({
                url: "/system/userManager/" + currentEntityType + "/" + currentEntity + ".update.html",
                type: "POST",
                data: {
                    "sakai:pages-visible": selectedValue
                },
                error: function(xhr, textStatus, thrownError) {
                    debug.error("sitenavigation.js settings update: " + xhr.status + " " + xhr.statusText);
                },
                complete: function() {
                    toggleSettings(false);
                }
            });
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
            $.TemplateRenderer($sitenavigation_settings_template, {"visible": pagesVisibility, "entity": currentEntity}, $sitenavigation_settings);
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

        $sitenavigation_settings_icon.die("click");
        $sitenavigation_settings_icon.live("click", function() {
            if($widget_settings_menu.is(":visible")) {
                $widget_settings_menu.hide();
            } else {
                var x = $sitenavigation_settings_icon.position().left;
                var y = $sitenavigation_settings_icon.position().top;
                $widget_settings_menu.css(
                    {
                      "top": y + 12 + "px",
                      "left": x + 4 + "px"
                    }
                ).show();
            }
        });

        $widget_settings_menu.die("click");
        $widget_settings_menu.live("click", function() {
            toggleSettings(true);
            $sitenavigation_settings_icon.hide();
            $widget_settings_menu.hide();
        });

        $sitenavigation_settings_form.die("submit");
        $sitenavigation_settings_form.live("submit", function() {
            savePermissions();
            return false;
        });

        $sitenavigation_delete_page.die("click");
        $sitenavigation_delete_page.live("click", function() {
            $(window).trigger("sakai.sitenavigation.deletePage.nav-site-uuid");
            return false;
        });

        
        $sitenavigation_create_page.die("click");
        $sitenavigation_create_page.live("click", function() {
            $(window).trigger("sakai.createpage." + createPageUUID + ".new");
        });
    };

    var setPermissions = function() {
        if (!sakai.currentgroup || ($.isEmptyObject(sakai.currentgroup) && $.isEmptyObject(sakai.currentgroup.data))) {
            currentEntity = sakai.data.me.user.userid;
            currentEntityType = "user";
            pagesVisibility = sakai.config.Permissions.Groups.visible["public"];
            // Commented out the two lines below for testing -- make sure to 
            // include them back in after testing has completed
            //$sitenavigation_settings_icon.remove();
            //$widget_settings_menu.remove();
        } else if (sakai.currentgroup && sakai.currentgroup.id) {
            currentEntity = sakai.currentgroup.id;
            currentEntityType = "group";
            pagesVisibility = sakai.currentgroup.data.authprofile["sakai:pages-visible"];
        }
    };

    var init = function() {
        setPermissions();
        toggleSettings(showSettings);
        debug.log(tuid);
        if (showSettings) {
            debug.log("showSettings");
        } else {
            bindEvents();
        }
        createPageUUID = tuid.replace(/^nav/, "create");
        $.TemplateRenderer($sitenavigation_createpage_template, {"create_tuid": createPageUUID}, $sitenavigation_createpage_container);
        sakai.api.Widgets.widgetLoader.insertWidgets(tuid);
        debug.log("sakai.site.nav." + tuid + ".ready");
        $(window).trigger("sakai.site.nav." + tuid + ".ready");
    };

    init();

};

sakai.api.Widgets.widgetLoader.informOnLoad("sitenavigation");
