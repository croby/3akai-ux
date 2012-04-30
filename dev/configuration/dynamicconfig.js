define(
    [
        "jquery",
        "/system/dynamic-config/config.cachekey.json?callback=define",
    ],
    function ($, configurationMetaData) {
        var dynamicconfig = "/system/dynamic-config/config.";
        var config = {};

        if (configurationMetaData.configurationCacheKey)
        {
            dynamicconfig += configurationMetaData.configurationCacheKey + ".";
        }

        dynamicconfig += "json";

        $.ajax({
            url: dynamicconfig,
            async: false,
            dataType: 'json',
            cache: true,
            success: function (data) {
                config = data;
            }
        });

        return config;
    }
);