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

/*global $, Config, jQuery, sakai */

/**
 * @name sakai.sites
 *
 * @class sites
 *
 * @description
 * Initialize the sites widget
 *
 * @version 0.0.1
 * @param {String} tuid Unique id of the widget
 * @param {Boolean} showSettings Show the settings of the widget or not
 */
sakai.site = function(tuid, showSettings) {

    var SITE_DATA_SERVICE = "/var/services/gimmeSiteData.json";
    var siteData = {};

    var $rootel = $("#" + tuid);
    var $site_pages_template = $("#site_pages_template", $rootel),
        $site_page_container = $("#site_page_container", $rootel),
        $site_navigation_template = $("#site_navigation_template", $rootel),
        $site_createpage_template = $("#site_createpage_template", $rootel),
        $site_navigation_container = $("#site_navigation_container", $rootel);
        $site_createpage_container = $("#site_createpage_container", $rootel);

    var getSiteData = function() {
        sakai.api.Server.loadJSON(SITE_DATA_SERVICE, function(success, data) {
            if (success) {
                siteData = data;
                setupPages();
            }
        }, tuid);

        // call setupPages
    };

    /**
     * Recursively find all the page UUIDs in the siteData structure
     */
    var findAllPages = function(root) {
        var ret = [];
        for (var i = 0, j=root.length; i<j; i++) {
            ret.push(root[i]["jcr:uuid"]);
            if (root[i].hasOwnProperty("children") && root[i].children.length) {
                var childPages = findAllPages(root[i].children);
                for (var x=0, y=childPages.length; x<y; x++) {
                    ret.push(childPages[x]);
                }
            }
        }
        return ret;
    };

    var pagesDone = 0;
    var totalPages = 0;

    var checkPagesLoaded = function() {
        pagesDone++;
        // after pages are ready to go, load the navigation
        if (pagesDone === totalPages) {
            setupNavigation();
            sakai.api.Widgets.widgetLoader.insertWidgets("site_navigation_container");
            pagesDone = 0;
        }
    };

    /**
     * Set up the pages from the site object
     */
    var setupPages = function() {
        // instantiate each page widget in the DOM
        var pages = findAllPages(siteData.pages);
        totalPages = pages.length;
        for (var i=0, j=pages.length; i<j; i++) {
            $(window).bind("sakai.page." + tuid + "." + pages[i] + ".ready", checkPagesLoaded);
        }
        $.TemplateRenderer($site_pages_template, {"site_uuid": tuid, "pages": pages}, $site_page_container);
        // just insert the pages for now
        sakai.api.Widgets.widgetLoader.insertWidgets("site_page_container");
    };

    /**
     * create a new page on this site
     */
    var createNewPage = function() {
        // create a new DOM element with a page widget in it
        // probably from a template

        // add the page to the site object

        // save the site object

        // tell navigation to show the page
    };

    var setupNavigation = function(siteObject) {
        // pass the object to the site navigation widget to render
        // site navigation might also need the tuid of the site
        $(window).unbind("sakai.site.nav.nav-" + tuid + ".ready");
        $(window).bind("sakai.site.nav.nav-" + tuid + ".ready", function() {
            debug.log("sitenavigation is ready");
            $(window).trigger("sakai.sitenavigation.nav-" + tuid + ".render", {"siteData": siteData, "canEdit": true});
        });
        $.TemplateRenderer($site_navigation_template, {"nav_tuid": "nav-" + tuid}, $site_navigation_container);
    };

    var removePageFromSite = function(page) {
        // remove page from the site data object

        // post the site data object back to the server

        // Maybe the server can handle this?
    };

    var bindSiteEvents = function() {
        $(window).unbind("sakai.site." + tuid + ".load");
        $(window).bind("sakai.site." + tuid + ".load", function(e) {
            getSiteData();
        });
    };

    /**
     * Will initiate a request to the site service.
     */
    var init = function() {
        if (showSettings) {
        }
        else {
        }
        bindSiteEvents();
        $(window).trigger("sakai.site." + tuid + ".ready");
        sakai.site[tuid] = {};
        sakai.site[tuid].isReady = true;
    };

    init();
};
sakai.api.Widgets.widgetLoader.informOnLoad("site");
