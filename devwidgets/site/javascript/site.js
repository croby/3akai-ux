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
sakai.site = function(tuid,showSettings){

    // Constants
    var MIN_HEIGHT = 400,
        AUTOSAVE_INTERVAL = 17000;

    // Globals
    var config = {},
        siteInfo = {},
        pages = {},
        selectedPage = false,
        pageType = {},
        pageContents = {},
        versionHistoryNeedsReset = false;

    // Selectors
    var $rootel = $("#" + tuid);

    sakai.sites.doInit = function(basepath, fullpath, url, editMode, homepage, pageEmbedProperty, dashboardEmbedProperty){
        config.basepath = basepath;
        config.startlevel = config.basepath.split("/").length;
        config.fullpath = fullpath;
        config.url = url;
        config.editMode = editMode;
        config.homepage = homepage;
        config.pageEmbedProperty = pageEmbedProperty;
        config.dashboardEmbedProperty = dashboardEmbedProperty;
        sakai.sites.config = config;
        sakai.api.Widgets.widgetLoader.insertWidgets("#"+tuid);
        loadControl();
    };

    var loadControl = function(){
        if (sakai.data.me.user.userid){
            sakai._isAnonymous = false;
        } else {
            sakai._isAnonymous = true;
        }
        if (config.editMode) {
            showAdminElements();
            sakai.sitespages.refreshSiteInfo();
        } else {
            sakai.sitespages.refreshSiteInfo();
        }
    };

    var showAdminElements = function(){
        // Show admin elements
        $li_edit_page_divider.show();
        $li_more_link.show();
        admin_init();
    };

    /**
     * Function which (re)-loads the information available on a site (async)
     * @param pageToOpen {String} URL safe title of a page which we want to open after the site info object refresh (optional)
     * @return void
     */
    sakai.sitespages.refreshSiteInfo = function(pageToOpen, loadNav) {
        var doLoadNav = true;
        if (loadNav !== undefined) {
            doLoadNav = loadNav;
        }

        // Load site information
        $.ajax({
            url: sakai.config.URL.SEARCH_PAGES,
            cache: false,
            async: false,
            data: {
                "path": config.fullpath + "_pages/",
                "items": 255
            },
            success: function(response) {

                // Init
                response = response.results;

                // Sort site objects by their path
                var compareURL = function(a,b) {
                    return a.path>b.path ? 1 : a.path<b.path ? -1 : 0;
                };
                response.sort(compareURL);

                // Create site_info object, the unique key being the partial path of the page from the root of the site
                // This will also keep the alphabetical order
                sakai.sitespages.site_info["_pages"] = {};
                for (var i=0, j=response.length; i<j; i++) {

                    if (typeof response[i] !== "undefined") {

                        // Save page data and add some helper attributes

                        // URL safe title
                        var url_safe_title = "";
                        var url_elements = response[i]["jcr:path"].split("/");
                        url_safe_title = url_elements[url_elements.length - 1];
                        response[i]["pageURLTitle"] = url_safe_title;

                        // URL safe name
                        var url_safe_name = sakai.sitespages.createURLName(response[i]["jcr:path"]);
                        response[i]["pageURLName"] = url_safe_name;

                        // Page depth
                        response[i]["pageDepth"] = url_elements.length;

                        // Page base folder
                        url_elements.pop();
                        response[i]["pageFolder"] = url_elements.join("/");

                        // Main page data
                        sakai.sitespages.site_info["_pages"][url_safe_name] = response[i];
                    }
                }

                // Create a helper function which returns the number of pages
                sakai.sitespages.site_info.number_of_pages = function() {
                    var counter = 0;
                    for (var i in sakai.sitespages.site_info._pages) {
                        if (sakai.sitespages.site_info._pages.hasOwnProperty(i)) {
                            counter++;
                        }
                    }
                    return counter;
                };

                // Open page if necessary
                if (pageToOpen && pageToOpen !== "") {
                    sakai.sitespages.openPage(pageToOpen);
                }

                // Load site navigation
                if (doLoadNav) {
                    sakai.sitespages.loadSiteNavigation();
                }
            },
            error: function(xhr, textStatus, thrownError) {
                sakai.site.site_info = {};
                debug.error("site.js: Could not load site info. \n HTTP status code: " + xhr.status);

            }

        });
    };


    // Load Navigation
    sakai.sitespages.loadSiteNavigation = function() {

        // Load site navigation
        $.ajax({
              url: config.basepath + "_navigation/content.json",
              cache: false,
              async: false,
              success: function(response){
                sakai.sitespages.pagecontents._navigation = response["sakai:pagenavigationcontent"];
                $page_nav_content.html(sakai.api.Security.saneHTML(sakai.sitespages.pagecontents._navigation));
                sakai.api.Widgets.widgetLoader.insertWidgets("page_nav_content", null, config.basepath + "_widgets/");
                $(window).trigger('hashchange');
            },
            error: function(xhr, textStatus, thrownError) {
              $(window).trigger('hashchange');
              debug.error("sitespages.js: Could not load site navigation content. \n HTTP status code: " + xhr.status);
            }
        });

    };

    /**
     * Displays a page
     * @param {Object} response
     * @param {Boolean} exists
     * @return void
     */
    var displayPage = function(response, exists){

        if (exists) {
            // Page exists

            // Store page content
            //sakai.site.pagecontents[sakai.site.selectedpage] = response;

            // If page already exists in DOM just show it, else create it
            var element_to_test = $("#" + sakai.sitespages.selectedpage);
            if (element_to_test.length > 0){
                element_to_test.show();
            } else
                {
                    // Create element
                    var $el = $("<div id=\""+ sakai.sitespages.selectedpage +"\" class=\"content\"></div>");

                    // Add sanitized content
                    var sanitizedContent = sakai.api.Security.saneHTML(response);
                    $el.html(sanitizedContent);

                    // Add element to the DOM
                    $main_content_div.append($el);
                }

            // Insert widgets
            sakai.api.Widgets.widgetLoader.insertWidgets(sakai.sitespages.selectedpage,null, config.basepath + "_widgets/");

        }
        else {
            // Page does not exist

            // Create error element
            sakai.sitespages.pagecontents[sakai.sitespages.selectedpage] = {};
            var $errorel = $("<div id=\""+ sakai.sitespages.selectedpage +"\" class=\"content\"></div>");

            // Add error element to the DOM
            $main_content_div.append($errorel);
        }

    };

    /**
     * Show the popup to create a new site.
     */
    var createNewSite = function(){
    };


    var determineLowestPositionPage = function(){
        var lowest = 9999999999999999;
        var ret = false;
        for (var i in sakai.sitespages.site_info._pages){
            if (sakai.sitespages.site_info._pages.hasOwnProperty(i) && sakai.sitespages.site_info._pages[i]["pagePosition"] && parseInt(sakai.sitespages.site_info._pages[i]["pagePosition"], 10) < lowest) {
                lowest = parseInt(sakai.sitespages.site_info._pages[i]["pagePosition"], 10);
                ret = i;
            }
        }
        return ret;
    };


    /**
     * Moves a page within a Sakai site
     * @param src_url {String} The URL of the the page we want to move
     * @param tgt_url {String} The URL of the new page location
     * @param callback {Function} Callback function which is called when the operation is successful
     */
    sakai.sitespages.movePage = function(src_url, tgt_url, callback) {

        var new_src_url = src_url.replace(sakai.sitespages.config.basepath,sakai.sitespages.config.fullpath);
        var new_tgt_url = tgt_url.replace(sakai.sitespages.config.basepath,sakai.sitespages.config.fullpath);

        var src_urlsafe_name = sakai.sitespages.createURLName(src_url);
        var tgt_urlsafe_name = sakai.sitespages.createURLName(tgt_url);

        $.ajax({
            url: src_url,
            type: "POST",
            data: {
                ":operation" : "move",
                ":dest" : new_tgt_url
            },
            success: function(data) {
                var movedPageTitle = sakai.sitespages.site_info._pages[src_urlsafe_name]["pageTitle"];

                // Remove content html tags
                $("#" + sakai.sitespages.selectedpage).remove();
                $("#" + src_urlsafe_name).remove();

                // Remove old + new from sakai.sitespages.pagecontents array
                delete sakai.sitespages.pagecontents[sakai.sitespages.selectedpage];
                delete sakai.sitespages.pagecontents[src_urlsafe_name];

                // Check in new page content to revision history
                $.ajax({
                    url: tgt_url + "/pageContent.save.html",
                    type: "POST"
                });

                // Refresh site info
                sakai.sitespages.refreshSiteInfo(tgt_urlsafe_name, false);

                // Call callback function
                callback(tgt_urlsafe_name);
            },
            error: function(xhr, text, thrown_error) {
                debug.error("sitespages_admin.js/movePage(): Failed to move page node!");
            }
        });
    };

    /**
     * Determine the highest position number of a page
     * @returns {Int} The highest page position number in the cached site info object
     */
    var determineHighestPosition = function(){
        var highest = 0;
        for (var i in sakai.sitespages.site_info._pages){
            if (sakai.sitespages.site_info._pages[i]["pagePosition"] && parseInt(sakai.sitespages.site_info._pages[i]["pagePosition"], 10) > highest){
                highest = parseInt(sakai.sitespages.site_info._pages[i]["pagePosition"], 10);
            }
        }
        return highest;
    };

    var SITE_DATA_SERVICE = "/var/services/gimmeSiteData.json";
    var uuid = "",
        siteData = {};


    var getSiteData = function() {
        // sakai.api.Server.getJSON("");

        // call setupPages
    };

    /**
     * Set up the pages from the site object
     */
    var setupPages = function() {
        // instantiate each page widget in the DOM

        // run insertWidgets
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
    };

    var removePageFromSite = function(page) {
        // remove page from the site data object

        // post the site data object back to the server

        // Maybe the server can handle this?
    };

    var bindSiteEvents = function() {
        $(window).bind("sakai.site.load." + tuid, function(e, _uuid) {
            uuid = _uuid;
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
        $(window).trigger("sakai.site.ready");
        sakai.site.isReady = true;
    };

    init();
};
sakai.api.Widgets.widgetLoader.informOnLoad("site");