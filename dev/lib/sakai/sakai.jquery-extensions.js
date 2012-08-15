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
///////////////////////////
// jQuery AJAX extention //
///////////////////////////

/*
 * We override the standard $.ajax error function, which is being executed when
 * a request fails. We will check whether the request has failed due to an authorization
 * required error, by checking the response code and then doing a request to the me service
 * to find out whether we are no longer logged in. If we are no longer logged in, and the
 * sendToLoginOnFail variable has been set in the options of the request, we will redirect
 * to the login page with the current URL encoded in the url. This will cause the system to
 * redirect to the page we used to be on once logged in.
 */
require(['jquery'], function(jQuery) {

var msie = jQuery.browser.msie;

(function($) {

    /**
    * Override default jQuery error behavior
    * @function
    * @param {String} s description
    * @param {Object} xhr xhr object
    * @param {String} status Status message
    * @param {Object} e Thrown error
    */
    $.handleError = function(s, xhr, status, e) {
        var requestStatus = xhr.status;

        // Sometimes jQuery comes back with a parse-error, although the request
        // was completely successful. In order to prevent the error method to be called
        // in this case, we need this if clause.
        if (requestStatus === 200) {
            if (s.success) {
                s.success(xhr.responseText);
            }
        }
        else {
            // if the sendToLoginOnFail hasn't been set, we assume that we want to redirect when
            // a 403 comes back
            s.sendToLoginOnFail = s.sendToLoginOnFail || true;
            if (requestStatus === 403 && s.sendToLoginOnFail) {

                var decideLoggedIn = function(response, exists) {
                    var originalURL = document.location;
                    originalURL = encodeURI(originalURL.pathname + originalURL.search + originalURL.hash);
                    var redirecturl = '/?url=' + originalURL;
                    if (exists && response.preferences && (response.preferences.uuid === 'anonymous' || !response.preferences.uuid)) {
                        document.location = redirecturl;
                    }
                };

                $.ajax({
                    url: '/system/me',
                    success: function(data) {
                        decideLoggedIn(data, true);
                    }
                });

            }

        // Handle HTTP conflicts thrown back by K2 (409) (for example when somebody tries to write to the same node at the very same time)
        // We do this by re-sending the original request with the data transparently, behind the curtains, until it succeeds.
        // This still does not eliminate a possibility of another conflict, but greatly reduces
        // the chance and works in the background until the request is successful (ie jQuery will try to re-send the initial request until the response is not 409
        // WARNING: This does not solve the locking/overwriting problem entirely, it merely takes care of high volume request related issues. Users
        // should be notified in advance by the UI when somebody else is editing a piece of content, and should actively try reduce the possibility of
        // overwriting.
/*        if (requestStatus === 409) {
            // Retry initial post
            $.ajax(s);
        }*/

        // Call original error handler, but not in the case of 409 as we want that to be transparent for users
        if ((s.error) && (requestStatus !== 409)) {
          s.error(xhr, status, e);
        }

        if (s.global) {
          $.event.trigger('ajaxError', [xhr, status, e]);
        }
          }

    };

})(jQuery);

/**
 * Append charset to each ajax request that doesn't already have it
 */
(function($) {
    var _ajax = $.ajax;
    $.extend({
        ajax: function(o) {
            if (o.data) {
                if (!o.data['_charset_']) {
                    o.data['_charset_'] = 'utf-8';
                }
            } else if (o.url.indexOf('_charset_') === -1) {
                if (o.url.indexOf('?') === -1) {
                    o.url += '?';
                } else if (o.url.lastIndexOf('&') !== o.url.length-1) {
                    o.url += '&';
                }
                o.url += '_charset_=utf-8';
            }
            if (msie) {
                var str = '' + o.url;
                o.url = '';
                for (var i = 0; i < str.length; i++) {
                    if (str.charCodeAt(i) > 127) {
                        o.url += encodeURIComponent(str[i]);
                    } else {
                        o.url += str[i];
                    }
                }
            }
            return _ajax.call(this, o);
        }
    });
})(jQuery);

/**
 * Extend jQuery to include a serializeObject function
 * which uses $.serializeArray to serialize the form
 * and then creates an object from that array
 *
 * http://stackoverflow.com/questions/1184624/serialize-form-to-json-with-jquery
 */
(function($) {
    $.fn.serializeObject = function( includeEmpty ) {
        var o = {};
        var a = this.serializeArray();
        includeEmpty = includeEmpty === false ? false : true;
        $.each(a, function() {
            if (o[this.name]) {
                if (!o[this.name].push) {
                    o[this.name] = [o[this.name]];
                }
                if (includeEmpty || $.trim(this.value) !== '') {
                    o[this.name].push(this.value || '');
                }
            } else {
                if (includeEmpty || $.trim(this.value) !== '') {
                    o[this.name] = this.value || '';
                }
            }
        });
        return o;
    };
})(jQuery);

/**
 * Make caching the default behavior for $.getScript
 */
jQuery.ajaxSetup({
    'cache': true
});

/**
 * Make sure that arrays passed in as arguments are properly encoded
 */
jQuery.ajaxSettings.traditional = true;

});
