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

/**
 * People Lister widget
 * This is a general widget which aims to display an arbitriary number of
 * people, loading dynamically if the list is very long.
 * Also this is a first attempt at implementing a general UI component which
 * needs to be part of the frontend API as a widget.
 */

/*global $, Config, sdata */

// Namespaces
var sakai = sakai || {};
sakai.api.UI.pickerUser = {};

/**
 * Initialize the pickeruser widget
 * This is the widget loader's default callback, executing when the widget
 * is loaded on a page
 * @param tuid {String} Unique id of the widget
 * @param showSettings {Boolean} Show the settings of the widget or not
 */
sakai.pickeruser = function(tuid, showSettings){

    // Config defaults
    var default_config = {
        "mode": "search",
        "type": "people",
        "spaceName": "Space",
        "items": 25,
        "selectable": false,
        "sortOn": "lastName",
        "sortOrder": "ascending"
    };

    // Create a config object for this instance
    sakai.config.widgets.pickeruser = sakai.config.widgets.pickeruser || {};
    sakai.config.widgets.pickeruser[tuid] = default_config;

    // Create data object for this instance
    sakai.data.pickeruser = sakai.data.pickeruser || {};
    sakai.data.pickeruser[tuid] = {};
    sakai.data.pickeruser[tuid].selected = {};
    sakai.data.pickeruser[tuid].currentElementCount = 0;
    sakai.data.pickeruser[tuid].selectCount = 0;

    // Reset to defaults
    sakai.api.UI.pickerUser.reset(tuid);

    // Send out an event that says the widget is ready to
    // accept a search query to process and display. This event can be picked up
    // in a page JS code
    $(window).trigger("pickeruser_ready", [tuid]);
    
};


/**
 * Reset
 * Resets the people lister to a default state
 * @param tuid {String} Unique id of the widget
 * @returns void
 */
sakai.api.UI.pickerUser.reset = function(tuid) {

    $("#" + tuid + " .pickeruser_content").html("");
    $("#" + tuid + " .pickeruser_count").html("");
    $("#" + tuid + " .pickeruser_count_person").hide();
    $("#" + tuid + " .pickeruser_count_people").hide();
    $("#" + tuid + " .pickeruser_count_of").hide();
    $("#" + tuid + " .pickeruser_count_thousands").hide();
    sakai.data.pickeruser[tuid].selected = {};
    sakai.data.pickeruser[tuid].currentElementCount = 0;
    sakai.data.pickeruser[tuid].selectCount = 0;

};



sakai.api.UI.pickerUser.render = function(tuid, iConfig) {


    // Merge user defined config with defaults
    for (var element in iConfig) {
        if (iConfig.hasOwnProperty(element)) {
            sakai.config.widgets.pickeruser[tuid][element] = iConfig[element];
        }
    }


    if (sakai.config.widgets.pickeruser[tuid]['mode'] === 'search') {

        submitSearch = function(){
            sakai.api.UI.pickerUser.reset(tuid);
            console.log("search clicked");
            console.log($("#search_query").val());
            var searchQuery = $("#search_query").val();
            if (!searchQuery) {
                searchQuery = "*";
            }
            var pl_query = sakai.config.URL.SEARCH_USERS + "?username="+searchQuery+"&page=0&items=12&_=" + (Math.random() * 100000000000000000);
            sakai.api.UI.pickerUser.renderSearch(tuid, pl_query);
        };
// show search div
        $("#space_name").html(sakai.config.widgets.pickeruser[tuid]['spaceName']);
        $("#search_query").focus();
        $("#search_button").click(submitSearch);
        $("#pickeruser_content_search_form").submit(submitSearch);
        $("#add_button").click(function(){
console.log(sakai.data.pickeruser[tuid]["selected"]);
            $(window).trigger("pickeruser_finished", [tuid]);
        });
    }
};

/**
 * RenderSearch
 * Renders the people lister with a specified set of data. The function uses
 * a search query initially, then does the paginating and subsequent requests
 * for data automatically
 * @param tuid {String} Unique id of the widget
 * @param iSearchQuery {String} A Sakai search query
 * @param iConfig {Object} Optional config overrides
 * @returns void
 */
sakai.api.UI.pickerUser.renderSearch = function(tuid, iSearchQuery) {
//sakai.api.UI.pickerUser.renderSearch = function(tuid, iConfig) {

    // Init
    var $pl_container = $("#" + tuid + " .pickeruser_content");

    // Merge user defined config with defaults
/*    for (var element in iConfig) {
        if (iConfig.hasOwnProperty(element)) {
            sakai.config.widgets.pickeruser[tuid][element] = iConfig[element];
        }
    }*/

    // Parse search query
    var searchQuery = {};
    var main_parts = iSearchQuery.split("?");
    searchQuery.url = main_parts[0];
    var arguments = main_parts[1].split("&");
    for (var i=0, il = arguments.length; i < il; i++) {
        var kv_pair = arguments[i].split("=");
        searchQuery[kv_pair[0]] = kv_pair[1];
    }

    // Alter search query according to config
    searchQuery.items = sakai.config.widgets.pickeruser[tuid].items;


    // Add hash to search query in case it's not there to prevent caching
    if (!searchQuery["_"]) {
        searchQuery["_"] = (Math.random() * 100000000000000000);
    }

    // Render the first page of results
    sakai.api.UI.pickerUser.addPage(tuid, 0, searchQuery);

};

/**
 * addPage
 * Adds another page of search result to the People lister's result list
 * @param tuid {String} The instance ID of a widget
 * @pageNumber {Int} The page we want to load
 * @searchQuery {Object} An object containing the search query elements
 * @returns void
 */
sakai.api.UI.pickerUser.addPage = function(tuid, pageNumber, searchQuery) {

    // Create new container for the bit we load. This is then appended to the
    // main container
    var $pl_pageContainer = $("<ul id=\"pickeruser_page_" + pageNumber + "\" class=\"pickeruser_page loadinganim\"></ul>");
    var $pl_container = $("#" + tuid + " .pickeruser_content");

    // Aadd relevant config elements to the search query
    searchQuery.page = pageNumber;
    searchQuery.sortOn = sakai.config.widgets.pickeruser[tuid]["sortOn"];
    searchQuery.sortOrder = sakai.config.widgets.pickeruser[tuid]["sortOrder"];

    // Construct search query
    var sq = searchQuery.url + "?";
    for (var e in searchQuery) {
        if (searchQuery.hasOwnProperty(e) && e !== "url") {
            sq += e + "=" + searchQuery[e] + "&";
        }
    }

    // Display empty new container with loading anim
    $pl_container.append($pl_pageContainer);

    // Make the request
    $.ajax({
        url: sq,
        type: "GET",
        success: function(rawData) {

            // Eval profile data for now and extend it with additional info
            for (var i = 0, il = rawData.results.length; i < il; i++) {
                var resultObject = rawData.results[i];

                // Eval json strings if any
                for (var j in resultObject) {
                    if (resultObject.hasOwnProperty(j) && typeof resultObject[j] === "string" && resultObject[j].charAt(0) === "{") {
                        rawData.results[i][j] = $.parseJSON(resultObject[j]);
                    }
                }

                // Determine what to put under the name. See if specified key exists in main object or under basic profile info
                var subNameInfo = "";
                var iSubNameInfo = sakai.config.widgets.pickeruser[tuid]["subNameInfo"];
                if (iSubNameInfo !== "" && typeof iSubNameInfo === "string") {
                    if (rawData.results[i][iSubNameInfo]) {
                        subNameInfo = rawData.results[i][iSubNameInfo];
                    } else if (rawData.results[i]["basic"][iSubNameInfo]) {
                        subNameInfo = rawData.results[i]["basic"][iSubNameInfo];
                    }
                }
                rawData.results[i]["subNameInfo"] = subNameInfo;
            }

            // Render the results data template
            var pageHTML = $.TemplateRenderer("#" + tuid + " .pickeruser_content_search_pagetemplate", rawData);

            // Remove loading animation
            $pl_pageContainer.removeClass("loadinganim");

            // Inject results into DOM
            $pl_pageContainer.html(pageHTML);


            // Wire loading the next page when user scrolls to the bottom of the list
            if ((rawData.total > searchQuery.items) || (rawData.total === -1)) {
                $pl_container.bind("scroll", function(e){

                    if ((e.target.scrollHeight - e.target.scrollTop - $(e.target).height() ) === 0) {
                        $pl_container.unbind("scroll");
                        sakai.api.UI.pickerUser.addPage(tuid, (pageNumber + 1), searchQuery);
                    }
                });
            }


            // Wire item selection
            if (sakai.config.widgets.pickeruser[tuid].selectable) {

                $("#" + tuid + " .pickeruser_page li").live("click", function(e){

                    // Check if user click on top of a link
                    if (e.target.tagName.toLowerCase() !== "a") {
                        // Remove from selected list
                        if ($(this).hasClass("pickeruser_selected")) {
                            $(this).removeClass("pickeruser_selected");
                            delete sakai.data.pickeruser[tuid]["selected"][$(this).attr("data-userid")];
                            for (var i = 0; i < rawData.results.length; i++) {
                                if (rawData.results[i]['rep:userId'] == [$(this).attr("data-userid")]) {
                                    delete sakai.data.pickeruser[tuid]["selected"][$(this).attr("data-userid")];
                                    sakai.data.pickeruser[tuid].selectCount -= 1;
                                }
                            }
                        } else {
                            // Add to selected list
                            $(this).addClass("pickeruser_selected");
                            //sakai.data.pickeruser[tuid]["selected"][$(this).attr("data-userid")] = "";
                            for (var i = 0; i < rawData.results.length; i++) {
                                if (rawData.results[i]['rep:userId'] == [$(this).attr("data-userid")]) {
                                    sakai.data.pickeruser[tuid].selectCount += 1;
                                    sakai.data.pickeruser[tuid]["selected"][$(this).attr("data-userid")] = rawData.results[i];
                                }
                            }
                        }
                    }
                });
            }

            //Update known total amount of displayed elements
            sakai.data.pickeruser[tuid].currentElementCount += rawData.results.length;

            //Set search result count
            if ((rawData.total === -1) || (rawData.total > 1000)) {
                // If we don't know the total display what we know
                $("#" + tuid + " .pickeruser_count").html(sakai.data.pickeruser[tuid].currentElementCount);
                $("#" + tuid + " .pickeruser_count_people").show();
                $("#" + tuid + " .pickeruser_count_of").show();
                $("#" + tuid + " .pickeruser_count_thousands").show();

            } else {
                // If we know the exact total display it
                $("#" + tuid + " .pickeruser_count").html(rawData.total);
                if (rawData.total === 1) {
                    $("#" + tuid + " .pickeruser_count_person").show();
                } else {
                    $("#" + tuid + " .pickeruser_count_people").show();
                }
            }


            // Wire sorting select dropdown
            $("#" + tuid + " .pickeruser_sort_on").bind("change", function(e){
                // Reset everything
                sakai.api.UI.pickerUser.reset(tuid);

                // Set config to new sort key
                sakai.config.widgets.pickeruser[tuid]["sortOn"] = $(this).val();

                // Start from scratch
                sakai.api.UI.pickerUser.addPage(tuid, 0, searchQuery);

            });

        },
        error: function(xhr, status, thrown) {

            // If it's likely to be a genuine server error
            if ($pl_pageContainer.length === 0) {
                $pl_container.html($("#" + tuid + " .pickeruser_error_template").html());
            } else {
                // Probably it's the last page of the result set
                $pl_pageContainer.last().remove();
                $("#" + tuid + " .pickeruser_count_of").hide();
                $("#" + tuid + " .pickeruser_count_thousands").hide();
            }
        }
    });
};


sakai.api.Widgets.widgetLoader.informOnLoad("pickeruser");
