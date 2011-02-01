/**
 *
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
 *
 */


/**
 * @class Communication
 *
 * @description
 * Communication related convenience functions. This should only hold
 * functions which are used across multiple pages, and does not constitute
 * functionality related to a single area/pag
 *
 * @namespace
 * Communication related convenience functions
 */
define(["jquery"], function($) {
    return {
        /**
         * Sends a Sakai message to one or more users. If a group id is received, the
         * message is sent to users that are members of that group.
         *
         * @param {Array|String} to Array with the ids of the users or groups to post a
         *   message to or a String with one user or group id.
         * @param {String} from Who the message is from - userid
         * @param {String} subject The subject for this message
         * @param {String} body The text that this message will contain
         * @param {String} [category="message"] The category for this message
         * @param {String} [reply] The id of the message you are replying on
         * @param {Function} [callback] A callback function which is executed at the end of the operation
         * @param {Boolean} [sendMail] True if a mail needs to be sent, False if no mail is needed. Unles specified false the default will be true and a mail will be sent
         * @param {Boolean|String} [mailContent] False or String of content that contains HTML or regular text
         *
         */
        sendMessage : function(to, from, subject, body, category, reply, callback, sendMail, context) {

            var toUsers = "";              // aggregates all message recipients
            var sendDone = false;          // has the send been issued?

            ///////////////////////
            // UTILITY FUNCTIONS //
            ///////////////////////

            /**
             * Adds the given userids (String or Array) to the current list of recipients
             * @param {Array|String} userids Either a single userid (String) or a list
             * of userids (Array) to be added to the current list of recipients
             * @return None
             */
            var addRecipient = function(userids) {
                // append comma if the list already exists
                if(toUsers) {
                    toUsers += ",";
                }
                if(typeof(userids) === "string" && $.trim(userids) !== "") {
                    userids = $.trim(userids);
                    toUsers += "internal:" + userids;
                } else if(typeof(userids) === "object") {
                    toUsers += "internal:" + userids.join(",internal:");
                    toUsers = toUsers.replace(/internal\:\,/g, "");
                }
            };

            var buildEmailParams = function(){
                var toSend = {
                    "sakai:type": "smtp",
                    "sakai:sendstate": "pending",
                    "sakai:messagebox": "outbox",
                    "sakai:to": toUsers,
                    "sakai:from": sakai.data.me.user.userid,
                    "sakai:subject": subject,
                    "sakai:body": body,
                    "sakai:category": "message",
                    "_charset_": "utf-8"
                };

                switch(context){
                    case "new_message":
                        toSend["sakai:templatePath"] = templatePath = "/var/templates/new_message";
                        toSend["sakai:templateParams"] = {
                            "jcr:primaryType": "nt:unstructured",
                            "sender": {
                                "value": sakai.data.me.profile.basic.elements.firstName.value + " " + sakai.data.me.profile.basic.elements.lastName.value,
                                "jcr:primaryType": "nt:unstructured"
                            },
                            "system": {
                                "value": "Sakai",
                                "jcr:primaryType": "nt:unstructured"
                            },
                            "subject": {
                                "value": subject,
                                "jcr:primaryType": "nt:unstructured"
                            },
                            "body": {
                                "value": body,
                                "jcr:primaryType": "nt:unstructured"
                            },
                            "link": {
                                "value": sakai.config.SakaiDomain + sakai.config.URL.INBOX_URL,
                                "jcr:primaryType": "nt:unstructured"
                            }
                        };
                        break;
                    case "join_request":
                        toSend["sakai:templatePath"] = templatePath = "var/templates/join_request";
                        toSend["sakai:templateParams"] = {
                            "jcr:primaryType": "nt:unstructured",
                            "sender": {
                                "value": sakai.data.me.profile.basic.elements.firstName.value + " " + sakai.data.me.profile.basic.elements.lastName.value,
                                "jcr:primaryType": "nt:unstructured"
                            },
                            "system": {
                                "value": "Sakai",
                                "jcr:primaryType": "nt:unstructured"
                            },
                            "name": {
                                "value": sakai_global.currentgroup.data.authprofile["sakai:group-title"],
                                "jcr:primaryType": "nt:unstructured"
                            },
                            "profilelink": {
                                "value": sakai.config.SakaiDomain + "~" + sakai.data.me.user.userid,
                                "jcr:primaryType": "nt:unstructured"
                            },
                            "acceptlink" :{
                                "value": sakai.config.SakaiDomain + sakai.config.URL.GROUP_EDIT_URL + "?id=" +  sakai_global.currentgroup.id,
                                "jcr:primaryType": "nt:unstructured"
                            }
                        };
                        break;
                    case "group_invitation":
                        toSend["sakai:templatePath"] = templatePath = "var/templates/group_invitation";
                        toSend["sakai:templateParams"] = {
                            "jcr:primaryType": "nt:unstructured",
                            "sender": {
                                "value": sakai.data.me.profile.basic.elements.firstName.value + " " + sakai.data.me.profile.basic.elements.lastName.value,
                                "jcr:primaryType": "nt:unstructured"
                            },
                            "system": {
                                "value": "Sakai",
                                "jcr:primaryType": "nt:unstructured"
                            },
                            "name": {
                                "value": sakai_global.currentgroup.data.authprofile["sakai:group-title"],
                                "jcr:primaryType": "nt:unstructured"
                            },
                            "body": {
                                "value": body,
                                "jcr:primaryType": "nt:unstructured"
                            },
                            "link": {
                                "value": sakai.config.SakaiDomain + "~" + sakai_global.currentgroup.id,
                                "jcr:primaryType": "nt:unstructured"
                            }
                        };
                        break;
                    case "shared_content":
                        toSend["sakai:templatePath"] = templatePath = "var/templates/shared_content";
                        toSend["sakai:templateParams"] = {
                            "jcr:primaryType": "nt:unstructured",
                            "sender": {
                                "value": sakai.data.me.profile.basic.elements.firstName.value + " " + sakai.data.me.profile.basic.elements.lastName.value,
                                "jcr:primaryType": "nt:unstructured"
                            },
                            "system": {
                                "value": "Sakai",
                                "jcr:primaryType": "nt:unstructured"
                            },
                            "name": {
                                "value": sakai.content_profile.content_data.data["sakai:pooled-content-file-name"],
                                "jcr:primaryType": "nt:unstructured"
                            },
                            "description": {
                                "value": sakai.content_profile.content_data.data["sakai:description"],
                                "jcr:primaryType": "nt:unstructured"
                            },
                            "body": {
                                "value": body,
                                "jcr:primaryType": "nt:unstructured"
                            },
                            "link": {
                                "value": sakai.content_profile.content_data.url,
                                "jcr:primaryType": "nt:unstructured"
                            }
                        };
                        break;
                    case "contact_invitation":
                        toSend["sakai:templatePath"] = templatePath = "var/templates/contact_invitation";
                        toSend["sakai:templateParams"] = {
                            "jcr:primaryType": "nt:unstructured",
                            "sender": {
                                "value": sakai.data.me.profile.basic.elements.firstName.value + " " + sakai.data.me.profile.basic.elements.lastName.value,
                                "jcr:primaryType": "nt:unstructured"
                            },
                            "system": {
                                "value": "Sakai",
                                "jcr:primaryType": "nt:unstructured"
                            },
                            "body": {
                                "value": body,
                                "jcr:primaryType": "nt:unstructured"
                            },
                            "link": {
                                "value": sakai.config.SakaiDomain + "~" + sakai.data.me.user.userid +"?accept=true",
                                "jcr:primaryType": "nt:unstructured"
                            }
                        };
                        break;
                    default:
                        break;
                }

                // Message category
                if (category) {
                    toSend["sakai:category"] = category;
                } else {
                    toSend["sakai:category"] = "message";
                }

                // See if this is a reply or not
                if (reply) {
                    toSend["sakai:previousmessage"] = reply;
                }
                return toSend;
            };

            var doSendMail = function() {
                // Basic message details
                var toSend = buildEmailParams();


                // Send message
                $.ajax({
                    url: "/~" + from + "/message.create.html",
                    type: "POST",
                    data: toSend,
                    success: function(data) {
                        if ($.isFunction(callback)) {
                            callback(true, data);
                        }
                    },
                    error: function(xhr, textStatus, thrownError) {
                        if ($.isFunction(callback)) {
                            callback(false, xhr);
                        }
                    }
                });
                // the send has been issued
                sendDone = true;
            };

            var doSendMessage = function() {
                // Basic message details
                var toSend = {
                    "sakai:type": "internal",
                    "sakai:sendstate": "pending",
                    "sakai:messagebox": "outbox",
                    "sakai:to": toUsers,
                    "sakai:from": from,
                    "sakai:subject": subject,
                    "sakai:body":body,
                    "_charset_":"utf-8"
                };

                // Message category
                if (category) {
                    toSend["sakai:category"] = category;
                } else {
                    toSend["sakai:category"] = "message";
                }

                // See if this is a reply or not
                if (reply) {
                    toSend["sakai:previousmessage"] = reply;
                }

                // Send message
                $.ajax({
                    url: "/~" + from + "/message.create.html",
                    type: "POST",
                    data: toSend,
                    success: function(data){
                        if ($.isFunction(callback)) {
                            callback(true, data);
                        }
                    },
                    error: function(xhr, textStatus, thrownError){
                        if ($.isFunction(callback)) {
                            callback(false, xhr);
                        }
                    }
                });
                // the send has been issued
                sendDone = true;
            };

            //////////////////
            // MAIN ROUTINE //
            //////////////////

            var reqs = [];
            if (typeof(to) === "string") {
                var id = to;
                to = [];
                to[0] = id;
            }

            if (typeof(to) === "object") {
                for (i = 0; i < to.length; i++) {
                    reqs[reqs.length] = {
                        "url": "/~" + to[i] + "/public/authprofile.json",
                        "method": "GET"
                    };
                }
            } else {
                // unrecognized type
                debug.warn("sakai.api.Communication.sendMessage(): invalid argument ('to' not an Array or String).");

                if ($.isFunction(callback)) {
                    callback(false, xhr);
                }
            }

            $.ajax({
                url: "/system/batch",
                method: "POST",
                data: {
                    "requests": $.toJSON(reqs)
                },
                success: function(data){
                    // array of recipients
                    addRecipient(to);
                    // send now if we have only a list of users ("thread" safe?)
                    if (!sendDone) {
                        if (sendMail) {
                            doSendMail();
                        } else {
                            doSendMessage();
                        }
                    }
                }
            });
        },

        /**
         * Sends a message to all members of a group
         *
         * @param {String} groupID The user ID of the recipient
         * @param {String} message The text of the message
         * @return {Boolean} true or false depending on whether the sending was successful or not
         */
        sendMessageToGroup : function(groupID, message) {
            /**
             * SAKIII-599: Unable to currently send a message via:
             *  - /~userid/message.create.html or
             *  - /~groupid/message.create.html
             *
             * Until backend support is available, sakai.api.Communication.sendMessage
             * has been modified to support groupids. Any groupids included in the 'to'
             * list argument will be expanded and messages sent to those users.
             *
             * Once backend support to message a group directly is available, it will be
             * important to complete this function to support posting messages to group
             * pages directly and to track messages sent to groups as opposed to
             * individual users (i.e. Message sent to: "user1, user2, group5" instead of
             * Message sent to: "user1, user2, [list of users in group5]")
             */
        },

        /**
         * Invites a user to become a contact of the logged in user
         *
         * @param {String} groupID The user ID of the recipient
         * @param {String} message The text of the message
         * @return {Boolean} true or false depending on whether the sending was successful or not
         */
        inviteUser : function(userID) {

        }
    };
});
