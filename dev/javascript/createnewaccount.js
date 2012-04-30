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
require(["jquery", "sakai/sakai.api.core", "misc/zxcvbn"], function($, sakai){

    sakai_global.createnewaccount = function(){


        /////////////////////////////
        // Configuration variables //
        /////////////////////////////

        var defaultUserType = "default";
        var pagestemplate = "defaultuser";

        // Links and labels
        var checkUserNameLink = "#checkUserName";
        var buttonsContainer = ".create_account_button_bar";
        var successMessage = "#success_message";
        var successMessageTitle = "#success_message_title";
        var successMessageValue = "#success_message_value";

        // Input fields
        var usernameField = "#username";
        var titleField = "#title";
        var firstNameField = "#firstName";
        var lastNameField = "#lastName";
        var emailField = "#email";
        var passwordField = "#password";
        var passwordRepeatField = "#passwordRepeat";
        var captchaField = "#uword";
        var institutionField = "#institution";
        var roleField = "#role";
        var phoneField = "#phone";
        var lmsField = "#currentLms";
        var emailContactField = "#emailContact";
        var contactMeField = "#contactMe";

        // Error fields
        var usernameTaken = "#username_taken";
        var usernameShort = "#username_short";
        var usernameSpaces = "#username_spaces";
        var usernameEmpty = "#username_empty";
        var firstNameEmpty = "#firstName_empty";
        var lastNameEmpty = "#lastName_empty";
        var emailEmpty = "#email_empty";
        var emailInvalid = "#email_invalid";
        var emailNotUnique = "#email_not_unique";
        var emailsMustMatch = "#emails_must_match";
        var passwordEmpty = "#password_empty";
        var passwordShort = "#password_short";
        var passwordRepeatEmpty = "#password_repeat_empty";
        var passwordRepeatNoMatch = "#password_repeat_nomatch";
        var errorFields = ".create_account_error_msg";
        var usernameLabel = "#username_label";
        var inputFields = ".create_account_input";
        var usernameAvailable = "#username_available";

        //CSS Classes
        var invalidFieldClass = "invalid";
        var formContainer = "#create_account_form";
        var inputFieldHoverClass = "input_field_hover";

        // Contains executable errors
        var errObj = [];

        ///////////////////////
        // Utility functions //
        ///////////////////////

        var usernameEntered = "";
        var emailEntered = "";

        /**
         * Get all of the values out of the form fields. This will return
         * a JSON object where the keys are the names of all of the form fields, and the values are
         * the values entered by the user in those fields.
         */
        var getFormValues = function(){
            // Get the values from the form.
            var values = $(formContainer).serializeObject();

            // Get the values from the captcha form.
            var captchaValues = sakai_global.captcha.getProperties();

            // Add them to the form values.
            values = $.extend(true, {}, values, captchaValues);

            return values;
        };

        var setRoleIsStudent = function (isStudent)
        {
            if (isStudent)
            {
                $(emailContactField).removeAttr ('checked');
                $(contactMeField).removeAttr ('checked');
            }
            else
            {
                $(emailContactField).attr ('checked', 'checked');
            }
        }

        var getCookie = function (key)
        {
            var
                i,
                ind,
                c_key,
                c_val,
                cookieArr = document.cookie.split(";");

            for (i=0; i< cookieArr.length;i++)
            {
                ind = cookieArr[i].indexOf("=");

                c_key = cookieArr[i].substr(0, ind);
                c_val = cookieArr[i].substr(ind + 1);

                c_key = c_key.replace(/^\s+|\s+$/g,"");
                
                if (c_key == key)
                {
                    return decodeURI(c_val);
                }
            }
        }

        ///////////////////////
        // Creating the user //
        ///////////////////////

        /*
         * Function that will actually collect all of the values out of the form and
         * will try to create the new user
         */
        var doCreateUser = function(){
            var values = getFormValues();
            //var mktgData = {};

            $("button").attr("disabled", "disabled");
            $("input").attr("disabled", "disabled");

            sakai.api.User.createUser(values.username, values.firstName, values.lastName, values.email, values.password, values.password, {
                recaptcha: {
                    challenge: values["recaptcha-challenge"],
                    response: values["recaptcha-response"]
                },
// rSmart: add collected registration data to the create user call
                ":registration": $.toJSON({
                    hubspotutk: getCookie ("hubspotutk"),
                    title: values["title"],
                    institution: values["institution"],
                    role: values["role"],
                    phone: values["phone"],
                    currentLms: values["currentLms"],
                    contactPreferences:
                    {
                        emailContact: values["emailContact"],
                        contactMe: values["contactMe"]
                    }
                })
            }, function(success, data){
                if (success) {
                    // This will hide the Create and Cancel button and offer a link back to the login page

                    // Destroy the captcha
                    sakai_global.captcha.destroy();

                    sakai.api.Util.notification.show($(successMessageTitle).html(), $(successMessageValue).html());

                    // Wait for 2 seconds
                    setTimeout(function(){
                        sakai.api.User.login({
                            "username": values.username,
                            "password": values.password
                        }, function(){
                            // Relocate to the user home space
                            document.location = "/me?welcome=true";
                        });
                    }, 2000);
                }
                else {
                    $("button").removeAttr("disabled");
                    $("input").removeAttr("disabled");
                    if (data.status === 500 || data.status === 401) {
                        if (data.responseText.indexOf("Untrusted request") !== -1) {
                            sakai_global.captcha.reload();
                            sakai_global.captcha.showError("create_account_input_error");
                        }
                    }
                }
            });
        };


        //////////////////////////////
        // Check username existence //
        //////////////////////////////

        /*
         * Check whether the username (eid) is valid and then check
         * whether the username already exists in the system.
         * checkingOnly will define whether we are just checking the existence,
         * and don't want to do anything else afterwards if set to true. If set
         * to false, it will start doing the actual creation of the user once
         * the check has been completed.
         */
        var checkUserName = function(checkingOnly, callback){
            var values = getFormValues();
            var url = sakai.config.URL.USER_EXISTENCE_SERVICE.replace(/__USERID__/g, $.trim(values.username));
            
			      return sakai.api.User.checkExistence(url, checkingOnly, callback, errObj);
        };

		var checkEmailAddress = function(checkingOnly, callback) {
            var values = getFormValues();
            var url = sakai.config.URL.USER_EMAIL_EXISTENCE_SERVICE.replace(/__EMAIL__/g, $.trim(values.email));
			
            return sakai.api.User.checkExistence(url, checkingOnly, callback, errObj);
		};
		
        var initCaptcha = function(){
            sakai.api.Widgets.widgetLoader.insertWidgets("captcha_box", false);
        };

        /**
         * Uses zxcvbn.js to determine the password strength of the user's
         * password, and displays a message inline
         */
        var checkPasswordStrength = function() {
            var currentPw = $.trim($('#password').val());
            if (currentPw) {
                // Run the zxcvbn test on the currentPw, passing in all
                // the current input values to use them as data points
                var strength = zxcvbn(currentPw,
                    [
                        $('#username').val(),
                        $('#firstName').val(),
                        $('#lastName').val(),
                        $('#email').val(),
                        $('#institution').val(),
                        $('#phone').val()
                    ]);
                $('#password_strength').show();
                var $strength = $('#password_strength .strength');
                var score = 'zero';
                var strengthPhrase = 'STRENGTH_WEAK';
                // Determine the strength phrasing and class
                switch (strength.score) {
                    case 1:
                        score = 'one';
                        break;
                    case 2:
                        strengthPhrase = 'STRENGTH_GOOD';
                        score = 'two';
                        break;
                    case 3:
                        strengthPhrase = 'STRENGTH_STRONG';
                        score = 'three';
                        break;
                    case 4:
                        strengthPhrase = 'STRENGTH_VSTRONG';
                        score = 'four';
                        break;
                    default:
                        break;
                }
                // Remove all the classes and add in the new classes and text
                $strength
                    .removeClass()
                    .addClass('strength ' + score)
                    .text(sakai.api.i18n.getValueForKey(strengthPhrase));
                $('#password_label').addClass('strength');
            } else {
                $('#password_strength').hide();
                $('#password_label').removeClass('strength');
            }
        };

        ////////////////////
        // Event Handlers //
        ////////////////////


        /*
         * If the Cancel button is clicked, we redirect them back to the login page
         */
        var doBinding = function(){

            $("#cancel_button").bind("click", function(ev){
                document.location = sakai.config.URL.GATEWAY_URL;
            });

            $("#username").bind("keyup blur", function(){
                var username = $.trim($(usernameField).val());
                if (usernameEntered != username) {
                    usernameEntered = username;
                    if (username && username.length > 2 && username.indexOf(" ") === -1) {
                        $(usernameField).removeClass("signup_form_error");
                        checkUserName(true, function(success){
                            $("#create_account_username_error").hide();
                            if (success) {
                                $(usernameField).removeClass("signup_form_error");
                                $(usernameField).addClass("username_available_icon");
                                $("." + $(usernameField)[0].id).removeClass("signup_form_error_label");
                            } else {
                                $(usernameField).removeClass("username_available_icon");
                            }
                        });
                    } else {
                        $(usernameField).removeClass("username_available_icon");
                    }
                }
            });

            $("#role").bind("change", function(){
                var role = $.trim($(roleField).val());

                setRoleIsStudent (role == 'Student');
            });

            $('#password').on('keyup', checkPasswordStrength);

            /*
             * Once the user is trying to submit the form, we check whether all the fields have valid
             * input and try to create the new account
             */
            $.validator.addMethod("nospaces", function(value, element){
                return this.optional(element) || (value.indexOf(" ") === -1);
            }, "* No spaces are allowed");

            $.validator.addMethod("validusername", function(value, element){
                return this.optional(element) || (checkUserName());
            }, "* This username is already taken.");
            
            $.validator.addMethod("emailmatch", function(value, element){
                var values = getFormValues();
                return this.optional(element) || (value === values.email);
            }, "* The emails do not match.");

            $.validator.addMethod("validemail", function(value, element){
                return this.optional(element) || (checkEmailAddress());
            }, "* This email is already taken.");

            var validateOpts = {
                rules: {
                    password: {
                        minlength: 4
                    },
                    password_repeat: {
                        equalTo: "#password"
                    },
                    username: {
                        minlength: 3,
                        nospaces: true,
                        validusername: true
                    },
                    email: {
                        email: true,
                        validemail: true
                    },
                    emailConfirm: {
                        emailmatch: true
                    },
                    role: {
                        minlength: 1,
                        required: "#role"
                    },
                    decisionrole: {
                        minlength: 1,
                        required: "#decisionrole:visible"
                    },
                    industry: {
                        minlength: 1,
                        required: "#industry:visible"
                    },
                    officephone: {
                        minlength: 7,
                        required: "#officephone:visible"
                    }
                },
                messages: {
                    firstName: $(firstNameEmpty).text(),
                    lastName: $(lastNameEmpty).text(),
                    email: {
                        required: $(emailEmpty).text(),
                        email: $(emailInvalid).text(),
                        validemail: $(emailNotUnique).text()
                    },
                    emailConfirm: {
                        emailmatch: $(emailsMustMatch).text()
                    },
                    username: {
                        required: $(usernameEmpty).text(),
                        minlength: $(usernameShort).text(),
                        nospaces: $(usernameSpaces).text()
                    },
                    password: {
                        required: $(passwordEmpty).text(),
                        minlength: $(passwordShort).text()
                    },
                    password_repeat: {
                        required: $(passwordRepeatEmpty).text(),
                        passwordmatch: $(passwordRepeatNoMatch).text()
                    }
                },
                submitHandler: function(form, validator){
                    doCreateUser();
                    return false;
                }
            };
            sakai.api.Util.Forms.validate($("#create_account_form"), validateOpts);
        };

        $("#save_account").click(function(){
            sakai_global.captcha.hideError();
            $(".signup_form_column_labels label").removeClass("signup_form_error_label");
            $(".create_account_input_error").hide("");
        });

        var doInit = function(){
            // hide body first
            $('body').hide();

            // check if using internalaccountcreation is false if so redirect
            if (!sakai.config.Authentication.allowInternalAccountCreation) {
                document.location = sakai.config.URL.GATEWAY_URL;
            }
            else {
                $('body').show();
            }

            $(inputFields).bind("mouseenter mouseleave", function(ev){
                $(this).toggleClass(inputFieldHoverClass);
            });

            // Hide success message
            $(successMessage).hide();
            // Hide username available message
            $(usernameAvailable).hide();

            // Initialize the captcha widget.
            initCaptcha();
            doBinding();
            setRoleIsStudent(false);
        };

        var renderEntity = function(){
            $(window).trigger("sakai.entity.init", ["newaccount"]);
        };

        $(window).bind("sakai.entity.ready", function(){
            renderEntity();
        });

        renderEntity();
        doInit();

    };

    sakai.api.Widgets.Container.registerForLoad("createnewaccount");
});
