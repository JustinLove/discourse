// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/indexOf
if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function(searchElement /*, fromIndex */) {
    "use strict";

    if (this === void 0 || this === null) {
      throw new TypeError();
    }

    var t = Object(this);
    var len = t.length >>> 0;

    if (len === 0) {
      return -1;
    }

    var n = 0;
    if (arguments.length > 0) {
      n = Number(arguments[1]);
      if (n !== n) { // shortcut for verifying if it's NaN
        n = 0;
      } else if (n !== 0 && n !== (Infinity) && n !== -(Infinity)) {
        n = (n > 0 || -1) * Math.floor(Math.abs(n));
      }
    }

    if (n >= len) {
      return -1;
    }

    var k = n >= 0
          ? n
          : Math.max(len - Math.abs(n), 0);

    for (; k < len; k++) {
      if (k in t && t[k] === searchElement) {
        return k;
      }
    }

    return -1;
  };
}

// Instantiate the object
var I18n = I18n || {};

// Set default locale to english
I18n.defaultLocale = "en";

// Set default handling of translation fallbacks to false
I18n.fallbacks = false;

// Set default separator
I18n.defaultSeparator = ".";

// Set current locale to null
I18n.locale = null;

// Set the placeholder format. Accepts `{{placeholder}}` and `%{placeholder}`.
I18n.PLACEHOLDER = /(?:\{\{|%\{)(.*?)(?:\}\}?)/gm;

I18n.fallbackRules = {
};

I18n.pluralizationRules = {
  en: function (n) {
    return n == 0 ? ["zero", "none", "other"] : n == 1 ? "one" : "other";
  }
};

I18n.getFallbacks = function(locale) {
  if (locale === I18n.defaultLocale) {
    return [];
  } else if (!I18n.fallbackRules[locale]) {
    var rules = []
      , components = locale.split("-");

    for (var l = 1; l < components.length; l++) {
      rules.push(components.slice(0, l).join("-"));
    }

    rules.push(I18n.defaultLocale);

    I18n.fallbackRules[locale] = rules;
  }

  return I18n.fallbackRules[locale];
}

I18n.isValidNode = function(obj, node, undefined) {
  return obj[node] !== null && obj[node] !== undefined;
};

I18n.lookup = function(scope, options) {
  var options = options || {}
    , lookupInitialScope = scope
    , translations = this.prepareOptions(I18n.translations)
    , locale = options.locale || I18n.currentLocale()
    , messages = translations[locale] || {}
    , options = this.prepareOptions(options)
    , currentScope
  ;

  if (typeof(scope) == "object") {
    scope = scope.join(this.defaultSeparator);
  }

  if (options.scope) {
    scope = options.scope.toString() + this.defaultSeparator + scope;
  }

  scope = scope.split(this.defaultSeparator);

  while (messages && scope.length > 0) {
    currentScope = scope.shift();
    messages = messages[currentScope];
  }

  if (!messages) {
    if (I18n.fallbacks) {
      var fallbacks = this.getFallbacks(locale);
      for (var fallback = 0; fallback < fallbacks.length; fallbacks++) {
        messages = I18n.lookup(lookupInitialScope, this.prepareOptions({locale: fallbacks[fallback]}, options));
        if (messages) {
          break;
        }
      }
    }

    if (!messages && this.isValidNode(options, "defaultValue")) {
        messages = options.defaultValue;
    }
  }

  return messages;
};

// Merge serveral hash options, checking if value is set before
// overwriting any value. The precedence is from left to right.
//
//   I18n.prepareOptions({name: "John Doe"}, {name: "Mary Doe", role: "user"});
//   #=> {name: "John Doe", role: "user"}
//
I18n.prepareOptions = function() {
  var options = {}
    , opts
    , count = arguments.length
  ;

  for (var i = 0; i < count; i++) {
    opts = arguments[i];

    if (!opts) {
      continue;
    }

    for (var key in opts) {
      if (!this.isValidNode(options, key)) {
        options[key] = opts[key];
      }
    }
  }

  return options;
};

I18n.interpolate = function(message, options) {
  options = this.prepareOptions(options);
  var matches = message.match(this.PLACEHOLDER)
    , placeholder
    , value
    , name
  ;

  if (!matches) {
    return message;
  }

  for (var i = 0; placeholder = matches[i]; i++) {
    name = placeholder.replace(this.PLACEHOLDER, "$1");

    value = options[name];

    if (!this.isValidNode(options, name)) {
      value = "[missing " + placeholder + " value]";
    }

    regex = new RegExp(placeholder.replace(/\{/gm, "\\{").replace(/\}/gm, "\\}"));
    message = message.replace(regex, value);
  }

  return message;
};

I18n.translate = function(scope, options) {
  options = this.prepareOptions(options);
  var translation = this.lookup(scope, options);

  try {
    if (typeof(translation) == "object") {
      if (typeof(options.count) == "number") {
        return this.pluralize(options.count, scope, options);
      } else {
        return translation;
      }
    } else {
      return this.interpolate(translation, options);
    }
  } catch(err) {
    return this.missingTranslation(scope);
  }
};

I18n.localize = function(scope, value) {
  switch (scope) {
    case "currency":
      return this.toCurrency(value);
    case "number":
      scope = this.lookup("number.format");
      return this.toNumber(value, scope);
    case "percentage":
      return this.toPercentage(value);
    default:
      if (scope.match(/^(date|time)/)) {
        return this.toTime(scope, value);
      } else {
        return value.toString();
      }
  }
};

I18n.parseDate = function(date) {
  var matches, convertedDate;

  // we have a date, so just return it.
  if (typeof(date) == "object") {
    return date;
  };

  // it matches the following formats:
  //   yyyy-mm-dd
  //   yyyy-mm-dd[ T]hh:mm::ss
  //   yyyy-mm-dd[ T]hh:mm::ss
  //   yyyy-mm-dd[ T]hh:mm::ssZ
  //   yyyy-mm-dd[ T]hh:mm::ss+0000
  //
  matches = date.toString().match(/(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?(Z|\+0000)?/);

  if (matches) {
    for (var i = 1; i <= 6; i++) {
      matches[i] = parseInt(matches[i], 10) || 0;
    }

    // month starts on 0
    matches[2] -= 1;

    if (matches[7]) {
      convertedDate = new Date(Date.UTC(matches[1], matches[2], matches[3], matches[4], matches[5], matches[6]));
    } else {
      convertedDate = new Date(matches[1], matches[2], matches[3], matches[4], matches[5], matches[6]);
    }
  } else if (typeof(date) == "number") {
    // UNIX timestamp
    convertedDate = new Date();
    convertedDate.setTime(date);
  } else if (date.match(/\d+ \d+:\d+:\d+ [+-]\d+ \d+/)) {
    // a valid javascript format with timezone info
    convertedDate = new Date();
    convertedDate.setTime(Date.parse(date))
  } else {
    // an arbitrary javascript string
    convertedDate = new Date();
    convertedDate.setTime(Date.parse(date));
  }

  return convertedDate;
};

I18n.toTime = function(scope, d) {
  var date = this.parseDate(d)
    , format = this.lookup(scope)
  ;

  if (date.toString().match(/invalid/i)) {
    return date.toString();
  }

  if (!format) {
    return date.toString();
  }

  return this.strftime(date, format);
};

I18n.strftime = function(date, format) {
  var options = this.lookup("date");

  if (!options) {
    return date.toString();
  }

  options.meridian = options.meridian || ["AM", "PM"];

  var weekDay = date.getDay()
    , day = date.getDate()
    , year = date.getFullYear()
    , month = date.getMonth() + 1
    , hour = date.getHours()
    , hour12 = hour
    , meridian = hour > 11 ? 1 : 0
    , secs = date.getSeconds()
    , mins = date.getMinutes()
    , offset = date.getTimezoneOffset()
    , absOffsetHours = Math.floor(Math.abs(offset / 60))
    , absOffsetMinutes = Math.abs(offset) - (absOffsetHours * 60)
    , timezoneoffset = (offset > 0 ? "-" : "+") + (absOffsetHours.toString().length < 2 ? "0" + absOffsetHours : absOffsetHours) + (absOffsetMinutes.toString().length < 2 ? "0" + absOffsetMinutes : absOffsetMinutes)
  ;

  if (hour12 > 12) {
    hour12 = hour12 - 12;
  } else if (hour12 === 0) {
    hour12 = 12;
  }

  var padding = function(n) {
    var s = "0" + n.toString();
    return s.substr(s.length - 2);
  };

  var f = format;
  f = f.replace("%a", options.abbr_day_names[weekDay]);
  f = f.replace("%A", options.day_names[weekDay]);
  f = f.replace("%b", options.abbr_month_names[month]);
  f = f.replace("%B", options.month_names[month]);
  f = f.replace("%d", padding(day));
  f = f.replace("%e", day);
  f = f.replace("%-d", day);
  f = f.replace("%H", padding(hour));
  f = f.replace("%-H", hour);
  f = f.replace("%I", padding(hour12));
  f = f.replace("%-I", hour12);
  f = f.replace("%m", padding(month));
  f = f.replace("%-m", month);
  f = f.replace("%M", padding(mins));
  f = f.replace("%-M", mins);
  f = f.replace("%p", options.meridian[meridian]);
  f = f.replace("%S", padding(secs));
  f = f.replace("%-S", secs);
  f = f.replace("%w", weekDay);
  f = f.replace("%y", padding(year));
  f = f.replace("%-y", padding(year).replace(/^0+/, ""));
  f = f.replace("%Y", year);
  f = f.replace("%z", timezoneoffset);

  return f;
};

I18n.toNumber = function(number, options) {
  options = this.prepareOptions(
    options,
    this.lookup("number.format"),
    {precision: 3, separator: ".", delimiter: ",", strip_insignificant_zeros: false}
  );

  var negative = number < 0
    , string = Math.abs(number).toFixed(options.precision).toString()
    , parts = string.split(".")
    , precision
    , buffer = []
    , formattedNumber
  ;

  number = parts[0];
  precision = parts[1];

  while (number.length > 0) {
    buffer.unshift(number.substr(Math.max(0, number.length - 3), 3));
    number = number.substr(0, number.length -3);
  }

  formattedNumber = buffer.join(options.delimiter);

  if (options.precision > 0) {
    formattedNumber += options.separator + parts[1];
  }

  if (negative) {
    formattedNumber = "-" + formattedNumber;
  }

  if (options.strip_insignificant_zeros) {
    var regex = {
        separator: new RegExp(options.separator.replace(/\./, "\\.") + "$")
      , zeros: /0+$/
    };

    formattedNumber = formattedNumber
      .replace(regex.zeros, "")
      .replace(regex.separator, "")
    ;
  }

  return formattedNumber;
};

I18n.toCurrency = function(number, options) {
  options = this.prepareOptions(
    options,
    this.lookup("number.currency.format"),
    this.lookup("number.format"),
    {unit: "$", precision: 2, format: "%u%n", delimiter: ",", separator: "."}
  );

  number = this.toNumber(number, options);
  number = options.format
    .replace("%u", options.unit)
    .replace("%n", number)
  ;

  return number;
};

I18n.toHumanSize = function(number, options) {
  var kb = 1024
    , size = number
    , iterations = 0
    , unit
    , precision
  ;

  while (size >= kb && iterations < 4) {
    size = size / kb;
    iterations += 1;
  }

  if (iterations === 0) {
    unit = this.t("number.human.storage_units.units.byte", {count: size});
    precision = 0;
  } else {
    unit = this.t("number.human.storage_units.units." + [null, "kb", "mb", "gb", "tb"][iterations]);
    precision = (size - Math.floor(size) === 0) ? 0 : 1;
  }

  options = this.prepareOptions(
    options,
    {precision: precision, format: "%n%u", delimiter: ""}
  );

  number = this.toNumber(size, options);
  number = options.format
    .replace("%u", unit)
    .replace("%n", number)
  ;

  return number;
};

I18n.toPercentage = function(number, options) {
  options = this.prepareOptions(
    options,
    this.lookup("number.percentage.format"),
    this.lookup("number.format"),
    {precision: 3, separator: ".", delimiter: ""}
  );

  number = this.toNumber(number, options);
  return number + "%";
};

I18n.pluralizer = function(locale) {
  pluralizer = this.pluralizationRules[locale];
  if (pluralizer !== undefined) return pluralizer;
  return this.pluralizationRules["en"];
};

I18n.findAndTranslateValidNode = function(keys, translation) {
  for (i = 0; i < keys.length; i++) {
    key = keys[i];
    if (this.isValidNode(translation, key)) return translation[key];
  }
  return null;
};

I18n.pluralize = function(count, scope, options) {
  var translation;

  try {
    translation = this.lookup(scope, options);
  } catch (error) {}

  if (!translation) {
    return this.missingTranslation(scope);
  }

  var message;
  options = this.prepareOptions(options);
  options.count = count.toString();

  pluralizer = this.pluralizer(this.currentLocale());
  key = pluralizer(Math.abs(count));
  keys = ((typeof key == "object") && (key instanceof Array)) ? key : [key];

  message = this.findAndTranslateValidNode(keys, translation);
  if (message == null) message = this.missingTranslation(scope, keys[0]);

  return this.interpolate(message, options);
};

I18n.missingTranslation = function() {
  var message = '[missing "' + this.currentLocale()
    , count = arguments.length
  ;

  for (var i = 0; i < count; i++) {
    message += "." + arguments[i];
  }

  message += '" translation]';

  return message;
};

I18n.currentLocale = function() {
  return (I18n.locale || I18n.defaultLocale);
};

// shortcuts
I18n.t = I18n.translate;
I18n.l = I18n.localize;
I18n.p = I18n.pluralize;


MessageFormat = {locale: {}};
MessageFormat.locale.zh_CN = function ( n ) {
  return "other";
};

I18n.messageFormat = (function(formats){
      var f = formats;
      return function(key, options) {
        var fn = f[key];
        if(fn){
          try {
            return fn(options);
          } catch(err) {
            return err.message;
          }
        } else {
          return 'Missing Key: ' + key
        }
        return f[key](options);
      };
    })({});I18n.translations = {"zh_CN":{"js":{"share":{"topic":"\u5206\u4eab\u4e00\u4e2a\u5230\u672c\u4e3b\u9898\u7684\u94fe\u63a5","post":"\u5206\u4eab\u4e00\u4e2a\u5230\u672c\u5e16\u7684\u94fe\u63a5","close":"\u5173\u95ed","twitter":"\u5206\u4eab\u8fd9\u4e2a\u94fe\u63a5\u5230 Twitter","facebook":"\u5206\u4eab\u8fd9\u4e2a\u94fe\u63a5\u5230 Facebook","google+":"\u5206\u4eab\u8fd9\u4e2a\u94fe\u63a5\u5230 Google+","email":"\u7528\u7535\u5b50\u90ae\u4ef6\u53d1\u9001\u8fd9\u4e2a\u94fe\u63a5"},"edit":"\u7f16\u8f91\u672c\u4e3b\u9898\u7684\u6807\u9898\u548c\u5206\u7c7b","not_implemented":"\u975e\u5e38\u62b1\u6b49\uff0c\u6b64\u529f\u80fd\u6682\u65f6\u5c1a\u672a\u5b9e\u73b0\uff01","no_value":"\u5426","yes_value":"\u662f","of_value":"\u4e4b\u4e8e","generic_error":"\u62b1\u6b49\uff0c\u53d1\u751f\u4e86\u4e00\u4e2a\u9519\u8bef\u3002","log_in":"\u767b\u5f55","age":"\u5bff\u547d","last_post":"\u6700\u540e\u4e00\u5e16","admin_title":"\u7ba1\u7406\u5458","flags_title":"\u6295\u8bc9","show_more":"\u663e\u793a\u66f4\u591a","links":"\u94fe\u63a5","faq":"\u5e38\u89c1\u95ee\u7b54\uff08FAQ\uff09","you":"\u4f60","or":"\u6216","now":"\u521a\u521a","read_more":"\u9605\u8bfb\u66f4\u591a","in_n_seconds":{"one":"\u4e00\u79d2\u5185","other":"{{count}}\u79d2\u5185"},"in_n_minutes":{"one":"\u4e00\u5206\u949f\u5185","other":"{{count}}\u5206\u949f\u5185"},"in_n_hours":{"one":"\u4e00\u5c0f\u65f6\u5185","other":"{{count}}\u5c0f\u65f6\u5185"},"in_n_days":{"one":"\u4e00\u5929\u5185","other":"{{count}}\u5929\u5185"},"suggested_topics":{"title":"\u63a8\u8350\u4e3b\u9898"},"bookmarks":{"not_logged_in":"\u62b1\u6b49\uff0c\u8981\u7ed9\u5e16\u5b50\u52a0\u4e66\u7b7e\uff0c\u4f60\u5fc5\u987b\u5148\u767b\u5f55\u3002","created":"\u4f60\u7ed9\u6b64\u5e16\u7684\u4e66\u7b7e\u5df2\u52a0\u4e0a\u3002","not_bookmarked":"\u4f60\u5df2\u7ecf\u9605\u8bfb\u8fc7\u6b64\u5e16\uff0c\u70b9\u6b64\u7ed9\u5b83\u52a0\u4e0a\u4e66\u7b7e\u3002","last_read":"\u8fd9\u662f\u4f60\u9605\u8bfb\u8fc7\u7684\u6700\u540e\u4e00\u5e16\u3002"},"new_topics_inserted":"{{count}} \u4e2a\u65b0\u4e3b\u9898\u3002","show_new_topics":"\u70b9\u6b64\u663e\u793a\u3002","preview":"\u9884\u89c8","cancel":"\u53d6\u6d88","save":"\u4fdd\u5b58\u4fee\u6539","saving":"\u4fdd\u5b58\u4e2d\u2026\u2026","saved":"\u5df2\u4fdd\u5b58\uff01","choose_topic":{"none_found":"\u6ca1\u6709\u627e\u5230\u4e3b\u9898","title":{"search":"\u901a\u8fc7\u540d\u79f0\u3001url\u6216\u8005id\uff0c\u641c\u7d22\u4e3b\u9898\uff1a","placeholder":"\u5728\u6b64\u8f93\u5165\u4e3b\u9898\u6807\u9898"}},"user_action":{"user_posted_topic":"<a href='{{userUrl}}'>{{user}}</a> \u53d1\u8d77 <a href='{{topicUrl}}'>\u672c\u4e3b\u9898</a>","you_posted_topic":"<a href='{{userUrl}}'>\u4f60</a> \u53d1\u8d77 <a href='{{topicUrl}}'>\u672c\u4e3b\u9898</a>","user_replied_to_post":"<a href='{{userUrl}}'>{{user}}</a> \u56de\u590d <a href='{{postUrl}}'>{{post_number}}</a>","you_replied_to_post":"<a href='{{userUrl}}'>\u4f60</a> \u56de\u590d <a href='{{postUrl}}'>{{post_number}}</a>","user_replied_to_topic":"<a href='{{userUrl}}'>{{user}}</a> \u56de\u590d <a href='{{topicUrl}}'>\u672c\u4e3b\u9898</a>","you_replied_to_topic":"<a href='{{userUrl}}'>\u4f60</a> \u56de\u590d <a href='{{topicUrl}}'>\u672c\u4e3b\u9898</a>","user_mentioned_user":"<a href='{{user1Url}}'>{{user}}</a> \u63d0\u5230 <a href='{{user2Url}}'>{{another_user}}</a>","user_mentioned_you":"<a href='{{user1Url}}'>{{user}}</a> \u63d0\u5230 <a href='{{user2Url}}'>\u4f60</a>","you_mentioned_user":"<a href='{{user1Url}}'>\u4f60</a> \u63d0\u5230 <a href='{{user2Url}}'>{{user}}</a>","posted_by_user":"\u53d1\u8d77\u4eba <a href='{{userUrl}}'>{{user}}</a>","posted_by_you":"\u53d1\u8d77\u4eba <a href='{{userUrl}}'>\u4f60</a>","sent_by_user":"\u53d1\u9001\u4eba <a href='{{userUrl}}'>{{user}}</a>","sent_by_you":"\u53d1\u9001\u4eba <a href='{{userUrl}}'>\u4f60</a>"},"user_action_groups":{"1":"\u7ed9\u51fa\u7684\u8d5e","2":"\u6536\u5230\u7684\u8d5e","3":"\u4e66\u7b7e","4":"\u4e3b\u9898","5":"\u56de\u590d","6":"\u56de\u5e94","7":"\u63d0\u5230","9":"\u5f15\u7528","10":"\u559c\u7231","11":"\u7f16\u8f91","12":"\u53d1\u9001\u6761\u76ee","13":"\u6536\u4ef6\u7bb1"},"user":{"profile":"\u4ecb\u7ecd\u4fe1\u606f","title":"\u7528\u6237","mute":"\u9632\u6253\u6270","edit":"\u4fee\u6539\u53c2\u6570","download_archive":"\u4e0b\u8f7d\u6211\u7684\u5e16\u5b50\u7684\u5b58\u6863","private_message":"\u79c1\u4fe1","private_messages":"\u6d88\u606f","activity_stream":"\u6d3b\u52a8","preferences":"\u8bbe\u7f6e","bio":"\u5173\u4e8e\u6211","invited_by":"\u9080\u8bf7\u8005\u4e3a","trust_level":"\u7528\u6237\u7ea7\u522b","external_links_in_new_tab":"\u59cb\u7ec8\u5728\u65b0\u7684\u6807\u7b7e\u9875\u6253\u5f00\u5916\u90e8\u94fe\u63a5","enable_quoting":"\u5728\u9ad8\u4eae\u9009\u62e9\u6587\u5b57\u65f6\u542f\u7528\u5f15\u7528\u56de\u590d","moderator":"{{user}} \u662f\u7248\u4e3b","admin":"{{user}} \u662f\u7ba1\u7406\u5458","change_password":{"action":"\u4fee\u6539","success":"\uff08\u7535\u5b50\u90ae\u4ef6\u5df2\u53d1\u9001\uff09","in_progress":"\uff08\u6b63\u5728\u53d1\u9001\u7535\u5b50\u90ae\u4ef6\uff09","error":"\uff08\u9519\u8bef\uff09"},"change_username":{"action":"\u4fee\u6539","title":"\u4fee\u6539\u7528\u6237\u540d","confirm":"\u4fee\u6539\u4f60\u7684\u7528\u6237\u540d\u53ef\u80fd\u4f1a\u5bfc\u81f4\u4e00\u4e9b\u76f8\u5173\u540e\u679c\uff0c\u4f60\u771f\u7684\u786e\u5b9a\u8981\u8fd9\u4e48\u505a\u4e48\uff1f","taken":"\u62b1\u6b49\u6b64\u7528\u6237\u540d\u5df2\u7ecf\u6709\u4eba\u4f7f\u7528\u4e86\u3002","error":"\u5728\u4fee\u6539\u4f60\u7684\u7528\u6237\u540d\u65f6\u53d1\u751f\u4e86\u9519\u8bef\u3002","invalid":"\u6b64\u7528\u6237\u540d\u4e0d\u5408\u6cd5\uff0c\u7528\u6237\u540d\u53ea\u80fd\u5305\u542b\u5b57\u6bcd\u548c\u6570\u5b57"},"change_email":{"action":"\u4fee\u6539","title":"\u4fee\u6539\u7535\u5b50\u90ae\u7bb1","taken":"\u62b1\u6b49\u6b64\u7535\u5b50\u90ae\u7bb1\u4e0d\u53ef\u7528\u3002","error":"\u62b1\u6b49\u5728\u4fee\u6539\u4f60\u7684\u7535\u5b50\u90ae\u7bb1\u65f6\u53d1\u751f\u4e86\u9519\u8bef\uff0c\u53ef\u80fd\u6b64\u90ae\u7bb1\u5df2\u7ecf\u88ab\u4f7f\u7528\u4e86\uff1f","success":"\u6211\u4eec\u53d1\u9001\u4e86\u4e00\u5c01\u786e\u8ba4\u4fe1\u5230\u6b64\u90ae\u7bb1\u5730\u5740\uff0c\u8bf7\u6309\u7167\u90ae\u7bb1\u5185\u6307\u793a\u5b8c\u6210\u786e\u8ba4\u3002"},"email":{"title":"\u7535\u5b50\u90ae\u7bb1","instructions":"\u4f60\u7684\u7535\u5b50\u90ae\u7bb1\u7edd\u4e0d\u4f1a\u516c\u5f00\u7ed9\u4ed6\u4eba\u3002","ok":"\u4e0d\u9519\u54e6\uff0c\u6211\u4eec\u4f1a\u53d1\u9001\u7535\u5b50\u90ae\u4ef6\u8ba9\u4f60\u786e\u8ba4\u3002","invalid":"\u8bf7\u586b\u5199\u6b63\u786e\u7684\u7535\u5b50\u90ae\u7bb1\u5730\u5740\u3002","authenticated":"\u4f60\u7684\u7535\u5b50\u90ae\u7bb1\u5df2\u7ecf\u88ab {{provider}} \u786e\u8ba4\u6709\u6548\u3002","frequency":"\u53ea\u6709\u5f53\u4f60\u6700\u8fd1\u4e00\u6bb5\u65f6\u95f4\u6ca1\u6709\u8bbf\u95ee\u65f6\uff0c\u6211\u4eec\u624d\u4f1a\u628a\u4f60\u672a\u8bfb\u8fc7\u7684\u5185\u5bb9\u53d1\u9001\u5230\u4f60\u7684\u7535\u5b50\u90ae\u7bb1\u3002"},"name":{"title":"\u540d\u5b57","instructions":"\u4f60\u7684\u540d\u5b57\uff0c\u4e0d\u8981\u6c42\u72ec\u4e00\u65e0\u4e8c\uff08\u53ef\u4ee5\u4e0e\u4ed6\u4eba\u7684\u540d\u5b57\u91cd\u590d\uff09\u3002\u7528\u4e8e\u5728@name\u5339\u914d\u4f60\u65f6\u53c2\u8003\uff0c\u53ea\u5728\u4f60\u7684\u7528\u6237\u9875\u9762\u663e\u793a\u3002","too_short":"\u4f60\u8bbe\u7f6e\u7684\u540d\u5b57\u592a\u77ed\u4e86\u3002","ok":"\u4f60\u7684\u540d\u5b57\u7b26\u5408\u8981\u6c42\u3002"},"username":{"title":"\u7528\u6237\u540d","instructions":"\u5fc5\u987b\u662f\u72ec\u4e00\u65e0\u4e8c\u7684\uff0c\u4e2d\u95f4\u4e0d\u80fd\u6709\u7a7a\u683c\u3002\u5176\u4ed6\u4eba\u53ef\u4ee5\u4f7f\u7528 @{{username}} \u6765\u63d0\u53ca\u4f60\u3002","short_instructions":"\u5176\u4ed6\u4eba\u53ef\u4ee5\u7528 @{{username}} \u6765\u63d0\u53ca\u4f60\u3002","available":"\u4f60\u7684\u7528\u6237\u540d\u53ef\u7528\u3002","global_match":"\u7535\u5b50\u90ae\u7bb1\u4e0e\u6ce8\u518c\u7528\u6237\u540d\u76f8\u5339\u914d\u3002","global_mismatch":"\u5df2\u88ab\u4eba\u6ce8\u518c\u3002\u8bd5\u8bd5 {{suggestion}} \uff1f","not_available":"\u4e0d\u53ef\u7528\u3002\u8bd5\u8bd5 {{suggestion}} \uff1f","too_short":"\u4f60\u8bbe\u7f6e\u7684\u7528\u6237\u540d\u592a\u77ed\u4e86\u3002","too_long":"\u4f60\u8bbe\u7f6e\u7684\u7528\u6237\u540d\u592a\u957f\u4e86\u3002","checking":"\u67e5\u770b\u7528\u6237\u540d\u662f\u5426\u53ef\u7528\u2026\u2026","enter_email":"\u627e\u5230\u7528\u6237\u540d\uff0c\u8bf7\u8f93\u5165\u5bf9\u5e94\u7535\u5b50\u90ae\u7bb1\u3002"},"password_confirmation":{"title":"\u8bf7\u518d\u6b21\u8f93\u5165\u5bc6\u7801"},"last_posted":"\u6700\u540e\u4e00\u5e16","last_emailed":"\u6700\u540e\u4e00\u6b21\u90ae\u5bc4","last_seen":"\u6700\u540e\u4e00\u6b21\u89c1\u5230","created":"\u521b\u5efa\u65f6\u95f4","log_out":"\u767b\u51fa","website":"\u7f51\u7ad9","email_settings":"\u7535\u5b50\u90ae\u7bb1","email_digests":{"title":"\u5f53\u6211\u4e0d\u8bbf\u95ee\u6b64\u7ad9\u65f6\uff0c\u5411\u6211\u7684\u90ae\u7bb1\u53d1\u9001\u6700\u65b0\u6458\u8981","daily":"\u6bcf\u5929","weekly":"\u6bcf\u5468","bi_weekly":"\u6bcf\u4e24\u5468"},"email_direct":"\u5f53\u6709\u4eba\u5f15\u7528\u4f60\u3001\u56de\u590d\u4f60\u6216\u63d0\u53ca\u4f60 @username \u65f6\u53d1\u9001\u4e00\u5c01\u90ae\u4ef6\u7ed9\u4f60","email_private_messages":"\u5f53\u6709\u4eba\u7ed9\u4f60\u53d1\u79c1\u4fe1\u65f6\u53d1\u9001\u4e00\u5c01\u90ae\u4ef6\u7ed9\u4f60","other_settings":"\u5176\u5b83","new_topic_duration":{"label":"\u8ba4\u4e3a\u4e3b\u9898\u662f\u65b0\u4e3b\u9898\uff0c\u5f53","not_viewed":"\u6211\u8fd8\u6ca1\u6709\u6d4f\u89c8\u5b83\u4eec","last_here":"\u5b83\u4eec\u662f\u5728\u6211\u6700\u8fd1\u4e00\u6b21\u8bbf\u95ee\u8fd9\u91cc\u4e4b\u540e\u53d1\u8868\u7684","after_n_days":{"one":"\u5b83\u4eec\u662f\u6628\u5929\u53d1\u8868\u7684","other":"\u5b83\u4eec\u662f\u4e4b\u524d {{count}} \u5929\u53d1\u8868\u7684"},"after_n_weeks":{"one":"\u5b83\u4eec\u662f\u4e0a\u5468\u53d1\u8868\u7684","other":"\u5b83\u4eec\u662f\u4e4b\u524d {{count}} \u5468\u53d1\u8868\u7684"}},"auto_track_topics":"\u81ea\u52a8\u8ffd\u8e2a\u6211\u8fdb\u5165\u7684\u4e3b\u9898","auto_track_options":{"never":"\u4ece\u4e0d","always":"\u59cb\u7ec8","after_n_seconds":{"one":"1 \u79d2\u4e4b\u540e","other":"{{count}} \u79d2\u4e4b\u540e"},"after_n_minutes":{"one":"1 \u5206\u949f\u4e4b\u540e","other":"{{count}} \u5206\u949f\u4e4b\u540e"}},"invited":{"title":"\u9080\u8bf7","user":"\u9080\u8bf7\u7528\u6237","none":"{{username}} \u5c1a\u672a\u9080\u8bf7\u4efb\u4f55\u7528\u6237\u5230\u672c\u7ad9\u3002","redeemed":"\u786e\u8ba4\u9080\u8bf7","redeemed_at":"\u786e\u8ba4\u65f6\u95f4","pending":"\u5f85\u5b9a\u9080\u8bf7","topics_entered":"\u5df2\u8fdb\u5165\u7684\u4e3b\u9898","posts_read_count":"\u5df2\u9605\u7684\u5e16\u5b50","rescind":"\u5220\u9664\u9080\u8bf7","rescinded":"\u9080\u8bf7\u5df2\u5220\u9664","time_read":"\u9605\u8bfb\u65f6\u95f4","days_visited":"\u8bbf\u95ee\u5929\u6570","account_age_days":"\u5e10\u53f7\u5b58\u5728\u5929\u6570"},"password":{"title":"\u5bc6\u7801","too_short":"\u4f60\u8bbe\u7f6e\u7684\u5bc6\u7801\u592a\u77ed\u4e86\u3002","ok":"\u4f60\u8bbe\u7f6e\u7684\u5bc6\u7801\u7b26\u5408\u8981\u6c42\u3002"},"ip_address":{"title":"\u6700\u540e\u4f7f\u7528\u7684IP\u5730\u5740"},"avatar":{"title":"\u5934\u50cf","instructions":"\u6211\u4eec\u76ee\u524d\u4f7f\u7528 <a href='https://gravatar.com' target='_blank'>Gravatar</a> \u6765\u57fa\u4e8e\u4f60\u7684\u90ae\u7bb1\u751f\u6210\u5934\u50cf"},"filters":{"all":"\u5168\u90e8"},"stream":{"posted_by":"\u53d1\u5e16\u4eba","sent_by":"\u53d1\u9001\u65f6\u95f4","private_message":"\u79c1\u4fe1","the_topic":"\u672c\u4e3b\u9898"}},"loading":"\u8f7d\u5165\u4e2d\u2026\u2026","close":"\u5173\u95ed","learn_more":"\u4e86\u89e3\u66f4\u591a\u2026\u2026","year":"\u5e74","year_desc":"365\u5929\u4ee5\u524d\u53d1\u8868\u7684\u4e3b\u9898","month":"\u6708","month_desc":"30\u5929\u4ee5\u524d\u53d1\u8868\u7684\u4e3b\u9898","week":"\u5468","week_desc":"7\u5929\u4ee5\u524d\u53d1\u8868\u7684\u4e3b\u9898","first_post":"\u7b2c\u4e00\u5e16","mute":"\u9632\u6253\u6270","unmute":"\u89e3\u9664\u9632\u6253\u6270","best_of":{"title":"\u4f18\u79c0","enabled_description":"\u4f60\u73b0\u5728\u6b63\u5728\u6d4f\u89c8\u672c\u4e3b\u9898\u7684\u201c\u4f18\u79c0\u201d\u89c6\u56fe\u3002","description":"\u6b64\u4e3b\u9898\u4e2d\u6709 <b>{{count}}</b> \u4e2a\u5e16\u5b50\uff0c\u662f\u4e0d\u662f\u6709\u70b9\u591a\u54e6\uff01\u4f60\u613f\u610f\u5207\u6362\u5230\u53ea\u663e\u793a\u6700\u591a\u4ea4\u4e92\u548c\u56de\u590d\u7684\u5e16\u5b50\u89c6\u56fe\u4e48\uff1f","enable":"\u5207\u6362\u5230\u201c\u4f18\u79c0\u201d\u89c6\u56fe","disable":"\u53d6\u6d88\u201c\u4f18\u79c0\u201d"},"private_message_info":{"title":"\u79c1\u4e0b\u4ea4\u6d41","invite":"\u9080\u8bf7\u5176\u4ed6\u4eba\u2026\u2026"},"email":"\u7535\u5b50\u90ae\u7bb1","username":"\u7528\u6237\u540d","last_seen":"\u6700\u540e\u4e00\u6b21\u89c1\u5230","created":"\u521b\u5efa\u65f6\u95f4","trust_level":"\u7528\u6237\u7ea7\u522b","create_account":{"title":"\u521b\u5efa\u5e10\u53f7","action":"\u73b0\u5728\u5c31\u521b\u5efa\u4e00\u4e2a\uff01","invite":"\u8fd8\u6ca1\u6709\u5e10\u53f7\u5417\uff1f","failed":"\u51fa\u95ee\u9898\u4e86\uff0c\u6709\u53ef\u80fd\u8fd9\u4e2a\u7535\u5b50\u90ae\u7bb1\u5df2\u7ecf\u88ab\u6ce8\u518c\u4e86\u3002\u8bd5\u8bd5\u5fd8\u8bb0\u5bc6\u7801\u94fe\u63a5"},"forgot_password":{"title":"\u5fd8\u8bb0\u5bc6\u7801","action":"\u6211\u5fd8\u8bb0\u4e86\u6211\u7684\u5bc6\u7801","invite":"\u8f93\u5165\u4f60\u7684\u7528\u6237\u540d\u548c\u7535\u5b50\u90ae\u7bb1\u5730\u5740\uff0c\u6211\u4eec\u4f1a\u53d1\u9001\u5bc6\u7801\u91cd\u7f6e\u90ae\u4ef6\u7ed9\u4f60\u3002","reset":"\u91cd\u7f6e\u5bc6\u7801","complete":"\u4f60\u5f88\u5feb\u4f1a\u6536\u5230\u4e00\u5c01\u7535\u5b50\u90ae\u4ef6\uff0c\u544a\u8bc9\u4f60\u5982\u4f55\u91cd\u7f6e\u5bc6\u7801\u3002"},"login":{"title":"\u767b\u5f55","username":"\u767b\u5f55","password":"\u5bc6\u7801","email_placeholder":"\u7535\u5b50\u90ae\u7bb1\u5730\u5740\u6216\u7528\u6237\u540d","error":"\u672a\u77e5\u9519\u8bef","reset_password":"\u91cd\u7f6e\u5bc6\u7801","logging_in":"\u767b\u5f55\u4e2d\u2026\u2026","or":"\u6216","authenticating":"\u9a8c\u8bc1\u4e2d\u2026\u2026","awaiting_confirmation":"\u4f60\u7684\u5e10\u53f7\u5c1a\u672a\u6fc0\u6d3b\uff0c\u70b9\u51fb\u5fd8\u8bb0\u5bc6\u7801\u94fe\u63a5\u6765\u91cd\u65b0\u53d1\u9001\u6fc0\u6d3b\u90ae\u4ef6\u3002","awaiting_approval":"\u4f60\u7684\u5e10\u53f7\u5c1a\u672a\u88ab\u8bba\u575b\u7248\u4e3b\u6279\u51c6\u3002\u4e00\u65e6\u4f60\u7684\u5e10\u53f7\u83b7\u5f97\u6279\u51c6\uff0c\u4f60\u4f1a\u6536\u5230\u4e00\u5c01\u7535\u5b50\u90ae\u4ef6\u3002","not_activated":"\u4f60\u8fd8\u4e0d\u80fd\u767b\u5f55\u3002\u6211\u4eec\u4e4b\u524d\u5728<b>{{sentTo}}</b>\u53d1\u9001\u4e86\u4e00\u5c01\u6fc0\u6d3b\u90ae\u4ef6\u7ed9\u4f60\u3002\u8bf7\u6309\u7167\u90ae\u4ef6\u4e2d\u7684\u4ecb\u7ecd\u6765\u6fc0\u6d3b\u4f60\u7684\u5e10\u53f7\u3002","resend_activation_email":"\u70b9\u51fb\u6b64\u5904\u6765\u91cd\u65b0\u53d1\u9001\u6fc0\u6d3b\u90ae\u4ef6\u3002","sent_activation_email_again":"\u6211\u4eec\u5728<b>{{currentEmail}}</b>\u53c8\u53d1\u9001\u4e86\u4e00\u5c01\u6fc0\u6d3b\u90ae\u4ef6\u7ed9\u4f60\uff0c\u90ae\u4ef6\u9001\u8fbe\u53ef\u80fd\u9700\u8981\u51e0\u5206\u949f\uff0c\u6709\u7684\u7535\u5b50\u90ae\u7bb1\u670d\u52a1\u5546\u53ef\u80fd\u4f1a\u8ba4\u4e3a\u6b64\u90ae\u4ef6\u4e3a\u5783\u573e\u90ae\u4ef6\uff0c\u8bf7\u68c0\u67e5\u4e00\u4e0b\u4f60\u90ae\u7bb1\u7684\u5783\u573e\u90ae\u4ef6\u6587\u4ef6\u5939\u3002","google":{"title":"\u4f7f\u7528\u8c37\u6b4c\u5e10\u53f7\u767b\u5f55","message":"\u4f7f\u7528\u8c37\u6b4c\uff08Google\uff09\u5e10\u53f7\u9a8c\u8bc1\u767b\u5f55\uff08\u8bf7\u786e\u4fdd\u6ca1\u6709\u7981\u6b62\u6d4f\u89c8\u5668\u5f39\u51fa\u5bf9\u8bdd\u6846\uff09"},"twitter":{"title":"\u4f7f\u7528\u63a8\u7279\u5e10\u53f7\u767b\u5f55","message":"\u4f7f\u7528\u63a8\u7279\uff08Twitter\uff09\u5e10\u53f7\u9a8c\u8bc1\u767b\u5f55\uff08\u8bf7\u786e\u4fdd\u6ca1\u6709\u7981\u6b62\u6d4f\u89c8\u5668\u5f39\u51fa\u5bf9\u8bdd\u6846\uff09"},"facebook":{"title":"\u4f7f\u7528\u8138\u4e66\u5e10\u53f7\u767b\u5f55","message":"\u4f7f\u7528\u8138\u4e66\uff08Facebook\uff09\u5e10\u53f7\u9a8c\u8bc1\u767b\u5f55\uff08\u8bf7\u786e\u4fdd\u6ca1\u6709\u7981\u6b62\u6d4f\u89c8\u5668\u5f39\u51fa\u5bf9\u8bdd\u6846\uff09"},"yahoo":{"title":"\u4f7f\u7528\u96c5\u864e\u5e10\u53f7\u767b\u5f55","message":"\u4f7f\u7528\u96c5\u864e\uff08Yahoo\uff09\u5e10\u53f7\u9a8c\u8bc1\u767b\u5f55\uff08\u8bf7\u786e\u4fdd\u6ca1\u6709\u7981\u6b62\u6d4f\u89c8\u5668\u5f39\u51fa\u5bf9\u8bdd\u6846\uff09"},"github":{"title":"\u4f7f\u7528 GitHub \u5e10\u53f7\u767b\u5f55","message":"\u4f7f\u7528 GitHub \u5e10\u53f7\u9a8c\u8bc1\u767b\u5f55\uff08\u8bf7\u786e\u4fdd\u6ca1\u6709\u7981\u6b62\u6d4f\u89c8\u5668\u5f39\u51fa\u5bf9\u8bdd\u6846\uff09"},"persona":{"title":"\u4f7f\u7528 Persona \u5e10\u53f7\u767b\u5f55","message":"\u4f7f\u7528 Mozilla Persona \u5e10\u53f7\u9a8c\u8bc1\u767b\u5f55\uff08\u8bf7\u786e\u4fdd\u6ca1\u6709\u7981\u6b62\u6d4f\u89c8\u5668\u5f39\u51fa\u5bf9\u8bdd\u6846\uff09"}},"composer":{"posting_not_on_topic":"\u4f60\u6b63\u5728\u56de\u590d\u4e3b\u9898 \"{{title}}\"\uff0c\u4f46\u662f\u5f53\u524d\u4f60\u6b63\u5728\u6d4f\u89c8\u7684\u662f\u53e6\u5916\u4e00\u4e2a\u4e3b\u9898\u3002","saving_draft_tip":"\u4fdd\u5b58\u4e2d","saved_draft_tip":"\u5df2\u4fdd\u5b58","saved_local_draft_tip":"\u5df2\u672c\u5730\u4fdd\u5b58","similar_topics":"\u4f60\u7684\u4e3b\u9898\u4e0e\u6b64\u6709\u4e9b\u7c7b\u4f3c...","drafts_offline":"\u79bb\u7ebf\u8349\u7a3f","min_length":{"need_more_for_title":"\u8bf7\u7ed9\u6807\u9898\u518d\u8f93\u5165\u81f3\u5c11 {{n}} \u4e2a\u5b57\u7b26","need_more_for_reply":"\u8bf7\u7ed9\u6b63\u6587\u5185\u5bb9\u518d\u8f93\u5165\u81f3\u5c11 {{n}} \u4e2a\u5b57\u7b26"},"save_edit":"\u4fdd\u5b58\u7f16\u8f91","reply_original":"\u56de\u590d\u539f\u59cb\u5e16","reply_here":"\u5728\u6b64\u56de\u590d","reply":"\u56de\u590d","cancel":"\u53d6\u6d88","create_topic":"\u521b\u5efa\u4e3b\u9898","create_pm":"\u521b\u5efa\u79c1\u4fe1","users_placeholder":"\u6dfb\u52a0\u4e00\u4e2a\u7528\u6237","title_placeholder":"\u5728\u6b64\u8f93\u5165\u4f60\u7684\u6807\u9898\uff0c\u7b80\u660e\u627c\u8981\u7684\u7528\u4e00\u53e5\u8bdd\u8bf4\u660e\u8ba8\u8bba\u7684\u5185\u5bb9\u3002","reply_placeholder":"\u5728\u6b64\u8f93\u5165\u4f60\u7684\u5185\u5bb9\u3002\u4f60\u53ef\u4ee5\u4f7f\u7528 Markdown\uff08\u53c2\u8003 http://wowubuntu.com/markdown/\uff09 \u6216 BBCode\uff08\u53c2\u8003 http://www.bbcode.org/reference.php\uff09 \u6765\u683c\u5f0f\u5316\u5185\u5bb9\u3002\u62d6\u62fd\u6216\u7c98\u8d34\u4e00\u5e45\u56fe\u7247\u5230\u8fd9\u513f\u5373\u53ef\u5c06\u5b83\u4e0a\u4f20\u3002","view_new_post":"\u6d4f\u89c8\u4f60\u7684\u65b0\u5e16\u5b50\u3002","saving":"\u4fdd\u5b58\u4e2d\u2026\u2026","saved":"\u5df2\u4fdd\u5b58\uff01","saved_draft":"\u4f60\u6709\u4e00\u4e2a\u5e16\u5b50\u8349\u7a3f\u5c1a\u53d1\u8868\u3002\u5728\u6846\u4e2d\u4efb\u610f\u5904\u70b9\u51fb\u5373\u53ef\u63a5\u7740\u7f16\u8f91\u3002","uploading":"\u4e0a\u4f20\u4e2d\u2026\u2026","show_preview":"\u663e\u793a\u9884\u89c8 &raquo;","hide_preview":"&laquo; \u9690\u85cf\u9884\u89c8","quote_post_title":"\u5f15\u7528\u6574\u4e2a\u5e16\u5b50","bold_title":"\u52a0\u7c97","bold_text":"\u52a0\u7c97\u6587\u5b57","italic_title":"\u659c\u4f53","italic_text":"\u659c\u4f53\u6587\u5b57","link_title":"\u94fe\u63a5","link_description":"\u5728\u6b64\u8f93\u5165\u94fe\u63a5\u63cf\u8ff0","link_dialog_title":"\u63d2\u5165\u94fe\u63a5","link_optional_text":"\u53ef\u9009\u6807\u9898","quote_title":"\u5f15\u7528","quote_text":"\u5f15\u7528","code_title":"\u4ee3\u7801","code_text":"\u5728\u6b64\u8f93\u5165\u4ee3\u7801","image_title":"\u56fe\u7247","image_description":"\u5728\u6b64\u8f93\u5165\u56fe\u7247\u63cf\u8ff0","image_dialog_title":"\u63d2\u5165\u56fe\u7247","image_optional_text":"\u53ef\u9009\u6807\u9898","image_hosting_hint":"\u9700\u8981 <a href='http://www.google.com/search?q=free+image+hosting' target='_blank'>\u514d\u8d39\u56fe\u7247\u5b58\u50a8\uff1f</a>","olist_title":"\u6570\u5b57\u5217\u8868","ulist_title":"\u7b26\u53f7\u5217\u8868","list_item":"\u5217\u8868\u6761\u76ee","heading_title":"\u6807\u9898","heading_text":"\u6807\u9898\u5934","hr_title":"\u5206\u5272\u7ebf","undo_title":"\u64a4\u9500","redo_title":"\u91cd\u505a","help":"Markdown \u7f16\u8f91\u5e2e\u52a9","toggler":"\u9690\u85cf\u6216\u663e\u793a\u7f16\u8f91\u9762\u677f","admin_options_title":"\u672c\u4e3b\u9898\u53ef\u9009\u8bbe\u7f6e","auto_close_label":"\u81ea\u52a8\u5173\u95ed\u4e3b\u9898\uff0c\u8fc7\uff1a","auto_close_units":"\u5929"},"notifications":{"title":"\u4f7f\u7528 @name \u63d0\u53ca\u5230\u4f60\uff0c\u56de\u590d\u4f60\u7684\u5e16\u5b50\u548c\u4e3b\u9898\uff0c\u79c1\u4fe1\u7b49\u7b49\u7684\u901a\u77e5\u6d88\u606f","none":"\u4f60\u5f53\u524d\u6ca1\u6709\u4efb\u4f55\u901a\u77e5\u3002","more":"\u6d4f\u89c8\u4ee5\u524d\u7684\u901a\u77e5","mentioned":"<span title='mentioned' class='icon'>@</span> {{username}} {{link}}","quoted":"<i title='quoted' class='icon icon-quote-right'></i> {{username}} {{link}}","replied":"<i title='replied' class='icon icon-reply'></i> {{username}} {{link}}","posted":"<i title='replied' class='icon icon-reply'></i> {{username}} {{link}}","edited":"<i title='edited' class='icon icon-pencil'></i> {{username}} {{link}}","liked":"<i title='liked' class='icon icon-heart'></i> {{username}} {{link}}","private_message":"<i class='icon icon-envelope-alt' title='\u79c1\u4fe1'></i> {{username}} \u53d1\u9001\u7ed9\u4f60\u4e00\u6761\u79c1\u4fe1\uff1a{{link}}","invited_to_private_message":"{{username}} \u9080\u8bf7\u4f60\u8fdb\u884c\u79c1\u4e0b\u4ea4\u6d41\uff1a{{link}}","invitee_accepted":"<i title='\u5df2\u63a5\u53d7\u4f60\u7684\u9080\u8bf7' class='icon icon-signin'></i> {{username}} \u5df2\u63a5\u53d7\u4f60\u7684\u9080\u8bf7","moved_post":"<i title='\u79fb\u52a8\u5e16\u5b50' class='icon icon-arrow-right'></i> {{username}} \u5df2\u5c06\u5e16\u5b50\u79fb\u52a8\u5230 {{link}}","total_flagged":"\u88ab\u6295\u8bc9\u5e16\u5b50\u7684\u603b\u6570"},"image_selector":{"title":"\u63d2\u5165\u56fe\u7247","from_my_computer":"\u6765\u81ea\u6211\u7684\u8bbe\u5907","from_the_web":"\u6765\u81ea\u7f51\u7edc","add_image":"\u6dfb\u52a0\u56fe\u7247","remote_title":"\u7f51\u7edc\u56fe\u7247","remote_tip":"\u8f93\u5165\u56fe\u7247\u7f51\u7edc\uff0c\u683c\u5f0f\u4e3a\uff1ahttp://example.com/image.jpg","local_title":"\u672c\u5730\u56fe\u7247","local_tip":"\u70b9\u51fb\u4ece\u4f60\u7684\u8bbe\u5907\u4e2d\u9009\u62e9\u4e00\u5f20\u56fe\u7247\u3002","upload":"\u4e0a\u4f20","uploading_image":"\u4e0a\u4f20\u56fe\u7247\u4e2d"},"search":{"title":"\u641c\u7d22\u4e3b\u9898\u3001\u5e16\u5b50\u3001\u7528\u6237\u6216\u5206\u7c7b","placeholder":"\u5728\u6b64\u8f93\u5165\u4f60\u7684\u641c\u7d22\u6761\u4ef6","no_results":"\u6ca1\u6709\u627e\u5230\u7ed3\u679c\u3002","searching":"\u641c\u7d22\u4e2d\u2026\u2026"},"site_map":"\u53bb\u53e6\u4e00\u4e2a\u4e3b\u9898\u5217\u8868\u6216\u5206\u7c7b","go_back":"\u8fd4\u56de","current_user":"\u53bb\u4f60\u7684\u7528\u6237\u9875\u9762","favorite":{"title":"\u6536\u85cf","help":{"star":"\u5c06\u6b64\u4e3b\u9898\u52a0\u5165\u4f60\u7684\u6536\u85cf\u5217\u8868","unstar":"\u5c06\u6b64\u4e3b\u9898\u4ece\u4f60\u7684\u6536\u85cf\u5217\u8868\u4e2d\u79fb\u9664"}},"topics":{"none":{"favorited":"\u4f60\u5c1a\u672a\u6536\u85cf\u4efb\u4f55\u4e3b\u9898\u3002\u8981\u6536\u85cf\u4e00\u4e2a\u4e3b\u9898\uff0c\u70b9\u51fb\u6807\u9898\u65c1\u7684\u661f\u661f\u56fe\u6807\u3002","unread":"\u4f60\u6ca1\u6709\u672a\u9605\u4e3b\u9898\u3002","new":"\u4f60\u6ca1\u6709\u65b0\u4e3b\u9898\u53ef\u8bfb\u3002","read":"\u4f60\u5c1a\u672a\u9605\u8bfb\u4efb\u4f55\u4e3b\u9898\u3002","posted":"\u4f60\u5c1a\u672a\u5728\u4efb\u4f55\u4e3b\u9898\u4e2d\u53d1\u5e16\u3002","latest":"\u4f24\u5fc3\u554a\uff0c\u6ca1\u6709\u4e3b\u9898\u3002","hot":"\u6ca1\u6709\u70ed\u95e8\u4e3b\u9898\u3002","category":"\u6ca1\u6709 {{category}} \u5206\u7c7b\u7684\u4e3b\u9898\u3002"},"bottom":{"latest":"\u6ca1\u6709\u66f4\u591a\u4e3b\u9898\u53ef\u770b\u4e86\u3002","hot":"\u6ca1\u6709\u66f4\u591a\u70ed\u95e8\u4e3b\u9898\u53ef\u770b\u4e86\u3002","posted":"\u6ca1\u6709\u66f4\u591a\u5df2\u53d1\u5e03\u4e3b\u9898\u53ef\u770b\u4e86\u3002","read":"\u6ca1\u6709\u66f4\u591a\u5df2\u9605\u4e3b\u9898\u53ef\u770b\u4e86\u3002","new":"\u6ca1\u6709\u66f4\u591a\u65b0\u4e3b\u9898\u53ef\u770b\u4e86\u3002","unread":"\u6ca1\u6709\u66f4\u591a\u672a\u9605\u4e3b\u9898\u53ef\u770b\u4e86\u3002","favorited":"\u6ca1\u6709\u66f4\u591a\u6536\u85cf\u4e3b\u9898\u53ef\u770b\u4e86\u3002","category":"\u6ca1\u6709\u66f4\u591a {{category}} \u5206\u7c7b\u7684\u4e3b\u9898\u4e86\u3002"}},"rank_details":{"toggle":"\u5207\u6362\u4e3b\u9898\u6392\u540d\u8be6\u7ec6","show":"\u663e\u793a\u4e3b\u9898\u6392\u540d\u8be6\u7ec6\u4fe1\u606f","title":"\u4e3b\u9898\u6392\u540d\u8be6\u7ec6"},"topic":{"create_in":"\u521b\u5efa\u4e00\u4e2a {{categoryName}} \u5206\u7c7b\u7684\u4e3b\u9898","create":"\u521b\u5efa\u4e3b\u9898","create_long":"\u521b\u5efa\u4e00\u4e2a\u65b0\u4e3b\u9898","private_message":"\u5f00\u542f\u4e00\u6bb5\u79c1\u4e0b\u4ea4\u6d41","list":"\u4e3b\u9898","new":"\u65b0\u4e3b\u9898","title":"\u4e3b\u9898","loading_more":"\u8f7d\u5165\u66f4\u591a\u4e3b\u9898\u4e2d\u2026\u2026","loading":"\u8f7d\u5165\u4e3b\u9898\u4e2d\u2026\u2026","invalid_access":{"title":"\u8fd9\u662f\u79c1\u5bc6\u4e3b\u9898","description":"\u62b1\u6b49\uff0c\u4f60\u6ca1\u6709\u8bbf\u95ee\u6b64\u4e3b\u9898\u7684\u6743\u9650\uff01"},"server_error":{"title":"\u8f7d\u5165\u4e3b\u9898\u5931\u8d25","description":"\u62b1\u6b49\uff0c\u65e0\u6cd5\u8f7d\u5165\u6b64\u4e3b\u9898\u3002\u6709\u53ef\u80fd\u662f\u7f51\u7edc\u8fde\u63a5\u95ee\u9898\u5bfc\u81f4\u7684\uff0c\u8bf7\u91cd\u8bd5\u3002\u5982\u679c\u95ee\u9898\u59cb\u7ec8\u5b58\u5728\uff0c\u8bf7\u544a\u8bc9\u6211\u4eec\u3002"},"not_found":{"title":"\u672a\u627e\u5230\u4e3b\u9898","description":"\u62b1\u6b49\uff0c\u65e0\u6cd5\u627e\u5230\u6b64\u4e3b\u9898\u3002\u6709\u53ef\u80fd\u5b83\u88ab\u8bba\u575b\u7248\u4e3b\u5220\u6389\u4e86\uff1f"},"unread_posts":"\u6b64\u4e3b\u9898\u4e2d\u4f60\u6709 {{unread}} \u4e2a\u5e16\u5b50\u672a\u9605","new_posts":"\u4ece\u4f60\u6700\u8fd1\u4e00\u6b21\u9605\u8bfb\u6b64\u4e3b\u9898\u540e\uff0c\u53c8\u6709 {{new_posts}} \u4e2a\u65b0\u5e16\u5b50\u53d1\u8868","likes":{"one":"\u6b64\u4e3b\u9898\u5f97\u5230\u4e86\u4e00\u4e2a\u8d5e","other":"\u6b64\u4e3b\u9898\u5f97\u5230\u4e86 {{count}} \u4e2a\u8d5e"},"back_to_list":"\u8fd4\u56de\u4e3b\u9898\u5217\u8868","options":"\u4e3b\u9898\u9009\u9879","show_links":"\u663e\u793a\u6b64\u4e3b\u9898\u4e2d\u7684\u94fe\u63a5","toggle_information":"\u5207\u6362\u4e3b\u9898\u8be6\u7ec6","read_more_in_category":"\u60f3\u9605\u8bfb\u66f4\u591a\u5185\u5bb9\uff1f\u6d4f\u89c8 {{catLink}} \u6216 {{latestLink}} \u91cc\u7684\u5176\u5b83\u4e3b\u9898\u3002","read_more":"\u60f3\u9605\u8bfb\u66f4\u591a\u5185\u5bb9\uff1f{{catLink}} \u6216 {{latestLink}}\u3002","browse_all_categories":"\u6d4f\u89c8\u6240\u6709\u5206\u7c7b","view_latest_topics":"\u6d4f\u89c8\u70ed\u95e8\u4e3b\u9898","suggest_create_topic":"\u8fd9\u5c31\u521b\u5efa\u4e00\u4e2a\u4e3b\u9898\u5427\uff01","read_position_reset":"\u4f60\u7684\u9605\u8bfb\u4f4d\u7f6e\u5df2\u7ecf\u88ab\u91cd\u7f6e\u3002","jump_reply_up":"\u8df3\u8f6c\u81f3\u66f4\u65e9\u7684\u56de\u590d","jump_reply_down":"\u8df3\u8f6c\u81f3\u66f4\u665a\u7684\u56de\u590d","deleted":"\u6b64\u4e3b\u9898\u5df2\u88ab\u5220\u9664","auto_close_notice":"\u672c\u4e3b\u9898\u5c06\u5728%{timeLeft}\u540e\u81ea\u52a8\u5173\u95ed","auto_close_title":"\u81ea\u52a8\u5173\u95ed\u8bbe\u7f6e","auto_close_save":"\u4fdd\u5b58","auto_close_cancel":"\u53d6\u6d88","auto_close_remove":"\u4e0d\u81ea\u52a8\u5173\u95ed\u8be5\u4e3b\u9898","progress":{"title":"\u4e3b\u9898\u8fdb\u5ea6","jump_top":"\u8df3\u8f6c\u5230\u7b2c\u4e00\u5e16","jump_bottom":"\u8df3\u8f6c\u5230\u6700\u540e\u4e00\u5e16","total":"\u5168\u90e8\u5e16\u5b50","current":"\u5f53\u524d\u5e16"},"notifications":{"title":"","reasons":{"3_2":"\u56e0\u4e3a\u4f60\u5728\u5173\u6ce8\u6b64\u4e3b\u9898\uff0c\u6240\u4ee5\u4f60\u5c06\u6536\u5230\u76f8\u5173\u901a\u77e5\u3002","3_1":"\u56e0\u4e3a\u4f60\u521b\u5efa\u4e86\u6b64\u4e3b\u9898\uff0c\u6240\u4ee5\u4f60\u5c06\u6536\u5230\u76f8\u5173\u901a\u77e5\u3002","3":"\u56e0\u4e3a\u4f60\u5728\u5173\u6ce8\u6b64\u4e3b\u9898\uff0c\u6240\u4ee5\u4f60\u5c06\u6536\u5230\u76f8\u5173\u901a\u77e5\u3002","2_4":"\u56e0\u4e3a\u4f60\u5728\u6b64\u4e3b\u9898\u5185\u53d1\u8868\u4e86\u56de\u590d\uff0c\u6240\u4ee5\u4f60\u5c06\u6536\u5230\u76f8\u5173\u901a\u77e5\u3002","2_2":"\u56e0\u4e3a\u4f60\u5728\u8ffd\u8e2a\u6b64\u4e3b\u9898\uff0c\u6240\u4ee5\u4f60\u5c06\u6536\u5230\u76f8\u5173\u901a\u77e5\u3002","2":"\u56e0\u4e3a\u4f60<a href=\"/users/{{username}}/preferences\">\u9605\u8bfb\u4e86\u6b64\u4e3b\u9898</a>\uff0c\u6240\u4ee5\u4f60\u5c06\u6536\u5230\u76f8\u5173\u901a\u77e5\u3002","1":"\u56e0\u4e3a\u6709\u4eba @name \u63d0\u53ca\u4e86\u4f60\u6216\u56de\u590d\u4e86\u4f60\u7684\u5e16\u5b50\uff0c\u6240\u4ee5\u4f60\u5c06\u6536\u5230\u76f8\u5173\u901a\u77e5\u3002","1_2":"\u4ec5\u5f53\u6709\u4eba @name \u63d0\u53ca\u4e86\u4f60\u6216\u56de\u590d\u4e86\u4f60\u7684\u5e16\u5b50\uff0c\u4f60\u624d\u4f1a\u6536\u5230\u76f8\u5173\u901a\u77e5\u3002","0":"\u4f60\u5c06\u5ffd\u7565\u5173\u4e8e\u6b64\u4e3b\u9898\u7684\u6240\u6709\u901a\u77e5\u3002","0_2":"\u4f60\u5c06\u5ffd\u7565\u5173\u4e8e\u6b64\u4e3b\u9898\u7684\u6240\u6709\u901a\u77e5\u3002"},"watching":{"title":"\u5173\u6ce8","description":"\u4e0e\u8ffd\u8e2a\u4e00\u6837\uff0c\u989d\u5916\u7684\u662f\u4e00\u65e6\u6709\u65b0\u5e16\u5b50\u53d1\u8868\uff0c\u4f60\u90fd\u4f1a\u6536\u5230\u901a\u77e5\u3002"},"tracking":{"title":"\u8ffd\u8e2a","description":"\u5173\u4e8e\u4f60\u7684\u672a\u9605\u5e16\u5b50\u3001@name \u63d0\u53ca\u4e0e\u5bf9\u4f60\u7684\u5e16\u5b50\u7684\u56de\u590d\uff0c\u4f60\u90fd\u4f1a\u6536\u5230\u901a\u77e5\u3002"},"regular":{"title":"\u5e38\u89c4","description":"\u53ea\u6709\u5f53\u6709\u4eba @name \u63d0\u53ca\u4f60\u6216\u8005\u56de\u590d\u4f60\u7684\u5e16\u5b50\u65f6\uff0c\u4f60\u624d\u4f1a\u6536\u5230\u901a\u77e5\u3002"},"muted":{"title":"\u9632\u6253\u6270","description":"\u4f60\u4e0d\u4f1a\u6536\u5230\u5173\u4e8e\u6b64\u4e3b\u9898\u7684\u4efb\u4f55\u901a\u77e5\uff0c\u4e5f\u4e0d\u4f1a\u5728\u4f60\u7684\u672a\u9605\u9009\u9879\u5361\u4e2d\u663e\u793a\u3002"}},"actions":{"delete":"\u5220\u9664\u4e3b\u9898","open":"\u6253\u5f00\u4e3b\u9898","close":"\u5173\u95ed\u4e3b\u9898","auto_close":"\u81ea\u52a8\u5173\u95ed","unpin":"\u89e3\u9664\u4e3b\u9898\u7f6e\u9876","pin":"\u7f6e\u9876\u4e3b\u9898","unarchive":"\u89e3\u9664\u4e3b\u9898\u5b58\u6863","archive":"\u5b58\u6863\u4e3b\u9898","invisible":"\u4f7f\u4e0d\u53ef\u89c1","visible":"\u4f7f\u53ef\u89c1","reset_read":"\u91cd\u7f6e\u9605\u8bfb\u6570\u636e","multi_select":"\u9009\u62e9\u5c06\u88ab\u5408\u5e76/\u62c6\u5206\u7684\u5e16\u5b50","convert_to_topic":"\u8f6c\u6362\u5230\u5e38\u89c4\u4e3b\u9898"},"reply":{"title":"\u56de\u590d","help":"\u5f00\u59cb\u7ed9\u672c\u4e3b\u9898\u64b0\u5199\u56de\u590d"},"clear_pin":{"title":"\u6e05\u9664\u7f6e\u9876","help":"\u5c06\u672c\u4e3b\u9898\u7684\u7f6e\u9876\u72b6\u6001\u6e05\u9664\uff0c\u8fd9\u6837\u5b83\u5c06\u4e0d\u518d\u59cb\u7ec8\u663e\u793a\u5728\u4e3b\u9898\u5217\u8868\u9876\u90e8"},"share":{"title":"\u5206\u4eab","help":"\u5206\u4eab\u4e00\u4e2a\u5230\u672c\u5e16\u7684\u94fe\u63a5"},"inviting":"\u9080\u8bf7\u4e2d\u2026\u2026","invite_private":{"title":"\u9080\u8bf7\u8fdb\u884c\u79c1\u4e0b\u4ea4\u6d41","email_or_username":"\u53d7\u9080\u4eba\u7684\u7535\u5b50\u90ae\u7bb1\u6216\u7528\u6237\u540d","email_or_username_placeholder":"\u7535\u5b50\u90ae\u7bb1\u5730\u5740\u6216\u7528\u6237\u540d","action":"\u9080\u8bf7","success":"\u8c22\u8c22\uff01\u6211\u4eec\u5df2\u7ecf\u9080\u8bf7\u8be5\u7528\u6237\u53c2\u4e0e\u6b64\u79c1\u4e0b\u4ea4\u6d41\u3002","error":"\u62b1\u6b49\uff0c\u5728\u9080\u8bf7\u8be5\u7528\u6237\u65f6\u53d1\u751f\u4e86\u9519\u8bef\u3002"},"invite_reply":{"title":"\u9080\u8bf7\u670b\u53cb\u6765\u56de\u590d","action":"\u90ae\u4ef6\u9080\u8bf7","help":"\u5411\u4f60\u7684\u670b\u53cb\u53d1\u9001\u9080\u8bf7\uff0c\u4ed6\u4eec\u53ea\u9700\u8981\u4e00\u4e2a\u70b9\u51fb\u5c31\u80fd\u56de\u590d\u8fd9\u4e2a\u4e3b\u9898","email":"\u6211\u4eec\u4f1a\u7ed9\u4f60\u7684\u670b\u53cb\u53d1\u9001\u4e00\u5c01\u90ae\u4ef6\uff0c\u4ed6\u4eec\u53ea\u9700\u8981\u70b9\u51fb\u5176\u4e2d\u7684\u4e00\u4e2a\u94fe\u63a5\u5c31\u53ef\u4ee5\u56de\u590d\u8fd9\u4e2a\u4e3b\u9898\u4e86\u3002","email_placeholder":"\u7535\u5b50\u90ae\u7bb1\u5730\u5740","success":"\u8c22\u8c22\uff01\u6211\u4eec\u5df2\u53d1\u9001\u4e00\u4e2a\u9080\u8bf7\u90ae\u4ef6\u5230<b>{{email}}</b>\u3002\u5f53\u4ed6\u4eec\u786e\u8ba4\u7684\u65f6\u5019\u6211\u4eec\u4f1a\u901a\u77e5\u4f60\u3002\u4f60\u4e5f\u53ef\u4ee5\u5728\u4f60\u7684\u7528\u6237\u9875\u9762\u7684\u9080\u8bf7\u9009\u9879\u5361\u4e0b\u67e5\u770b\u9080\u8bf7\u72b6\u6001\u3002","error":"\u62b1\u6b49\uff0c\u6211\u4eec\u4e0d\u80fd\u9080\u8bf7\u6b64\u4eba\uff0c\u53ef\u80fd\u4ed6/\u5979\u5df2\u7ecf\u662f\u672c\u7ad9\u7528\u6237\u4e86\uff1f"},"login_reply":"\u767b\u5f55\u6765\u56de\u590d","filters":{"user":"\u4f60\u5728\u6d4f\u89c8 {{n_posts}} {{by_n_users}}.","n_posts":{"one":"\u4e00\u4e2a\u5e16\u5b50","other":"{{count}} \u5e16\u5b50"},"by_n_users":{"one":"\u4e00\u4e2a\u6307\u5b9a\u7528\u6237","other":"{{count}} \u4e2a\u7528\u6237\u4e2d\u7684"},"best_of":"\u4f60\u5728\u6d4f\u89c8 {{n_best_posts}} {{of_n_posts}}.","n_best_posts":{"one":"\u4e00\u4e2a\u4f18\u79c0\u5e16\u5b50","other":"{{count}} \u4f18\u79c0\u5e16\u5b50"},"of_n_posts":{"one":"\u4e00\u4e2a\u5e16\u5b50\u4e2d\u7684","other":"{{count}} \u4e2a\u5e16\u5b50\u4e2d\u7684"},"cancel":"\u518d\u6b21\u663e\u793a\u672c\u4e3b\u9898\u4e0b\u7684\u6240\u6709\u5e16\u5b50\u3002"},"split_topic":{"title":"\u62c6\u5206\u4e3b\u9898","action":"\u62c6\u5206\u4e3b\u9898","topic_name":"\u65b0\u4e3b\u9898\u540d\uff1a","error":"\u62c6\u5206\u4e3b\u9898\u65f6\u53d1\u751f\u9519\u8bef\u3002","instructions":{"one":"\u4f60\u60f3\u5982\u4f55\u79fb\u52a8\u8be5\u5e16\uff1f","other":"\u4f60\u60f3\u5982\u4f55\u79fb\u52a8\u4f60\u6240\u9009\u62e9\u7684\u8fd9{{count}}\u7bc7\u5e16\u5b50\uff1f"}},"merge_topic":{"title":"\u5408\u5e76\u4e3b\u9898","action":"\u5408\u5e76\u4e3b\u9898","error":"\u5408\u5e76\u4e3b\u9898\u65f6\u53d1\u751f\u9519\u8bef\u3002","instructions":{"one":"\u8bf7\u9009\u62e9\u4f60\u60f3\u5c06\u90a3\u7bc7\u5e16\u5b50\u79fb\u81f3\u5176\u4e0b\u7684\u4e3b\u9898\u3002","other":"\u8bf7\u9009\u62e9\u4f60\u60f3\u5c06\u90a3{{count}}\u7bc7\u5e16\u5b50\u79fb\u81f3\u5176\u4e0b\u7684\u4e3b\u9898\u3002"}},"multi_select":{"select":"\u9009\u62e9","selected":"\u5df2\u9009\u62e9\uff08{{count}}\uff09","delete":"\u5220\u9664\u6240\u9009","cancel":"\u53d6\u6d88\u9009\u62e9","description":{"one":"\u4f60\u5df2\u9009\u62e9\u4e86<b>\u4e00\u4e2a</b>\u5e16\u5b50\u3002","other":"\u4f60\u5df2\u9009\u62e9\u4e86<b>{{count}}</b>\u4e2a\u5e16\u5b50\u3002"}}},"post":{"reply":"\u56de\u590d {{replyAvatar}} {{username}} \u53d1\u8868\u7684 {{link}}","reply_topic":"\u56de\u590d {{link}}","quote_reply":"\u5f15\u7528\u56de\u590d","edit":"\u7f16\u8f91 {{link}}","post_number":"\u5e16\u5b50 {{number}}","in_reply_to":"\u56de\u590d\u7ed9","reply_as_new_topic":"\u56de\u590d\u4e3a\u65b0\u4e3b\u9898","continue_discussion":"\u4ece {{postLink}} \u7ee7\u7eed\u8ba8\u8bba\uff1a","follow_quote":"\u8df3\u8f6c\u81f3\u6240\u5f15\u7528\u7684\u5e16\u5b50","deleted_by_author":"\uff08\u4f5c\u8005\u5220\u9664\u4e86\u5e16\u5b50\uff09","expand_collapse":"\u5c55\u5f00/\u6536\u7f29","has_replies":{"one":"\u56de\u590d","other":"\u56de\u590d"},"errors":{"create":"\u62b1\u6b49\uff0c\u5728\u521b\u5efa\u4f60\u7684\u5e16\u5b50\u65f6\u53d1\u751f\u4e86\u9519\u8bef\u3002\u8bf7\u91cd\u8bd5\u3002","edit":"\u62b1\u6b49\uff0c\u5728\u7f16\u8f91\u4f60\u7684\u5e16\u5b50\u65f6\u53d1\u751f\u4e86\u9519\u8bef\u3002\u8bf7\u91cd\u8bd5\u3002","upload":"\u62b1\u6b49\uff0c\u5728\u4e0a\u4f20\u6587\u4ef6\u65f6\u53d1\u751f\u4e86\u9519\u8bef\u3002\u8bf7\u91cd\u8bd5\u3002","upload_too_large":"\u62b1\u6b49\uff0c\u4f60\u4e0a\u4f20\u7684\u6587\u4ef6\u592a\u5927\u4e86\uff08\u6700\u5927\u4e0d\u80fd\u8d85\u8fc7 {{max_size_kb}}kb\uff09\uff0c\u8bf7\u8c03\u6574\u6587\u4ef6\u5927\u5c0f\u540e\u91cd\u65b0\u4e0a\u4f20\u3002","upload_too_many_images":"\u62b1\u6b49, \u4f60\u53ea\u80fd\u4e00\u6b21\u4e0a\u4f20\u4e00\u5f20\u56fe\u7247\u3002","only_images_are_supported":"\u62b1\u6b49\uff0c\u4f60\u53ea\u80fd\u4e0a\u4f20\u56fe\u7247\u3002"},"abandon":"\u4f60\u786e\u5b9a\u8981\u4e22\u5f03\u4f60\u7684\u5e16\u5b50\u5417\uff1f","archetypes":{"save":"\u4fdd\u5b58\u9009\u9879"},"controls":{"reply":"\u5f00\u59cb\u7ed9\u672c\u5e16\u64b0\u5199\u56de\u590d","like":"\u8d5e\u672c\u5e16","edit":"\u7f16\u8f91\u672c\u5e16","flag":"\u6295\u8bc9\u672c\u5e16\u4ee5\u63d0\u9192\u8bba\u575b\u7248\u4e3b","delete":"\u5220\u9664\u672c\u5e16","undelete":"\u6062\u590d\u672c\u5e16","share":"\u5206\u4eab\u4e00\u4e2a\u5230\u672c\u5e16\u7684\u94fe\u63a5","bookmark":"\u7ed9\u672c\u5e16\u505a\u4e66\u7b7e\u5230\u4f60\u7684\u7528\u6237\u9875","more":"\u66f4\u591a"},"actions":{"flag":"\u6295\u8bc9","clear_flags":{"one":"\u6e05\u9664\u6295\u8bc9","other":"\u6e05\u9664\u6295\u8bc9"},"it_too":{"off_topic":"\u4e5f\u6295\u8bc9","spam":"\u4e5f\u6295\u8bc9","inappropriate":"\u4e5f\u6295\u8bc9","custom_flag":"\u4e5f\u6295\u8bc9","bookmark":"\u4e5f\u505a\u4e66\u7b7e","like":"\u4e5f\u8d5e\u5b83","vote":"\u4e5f\u5bf9\u5b83\u6295\u7968"},"undo":{"off_topic":"\u64a4\u9500\u6295\u8bc9","spam":"\u64a4\u9500\u6295\u8bc9","inappropriate":"\u64a4\u9500\u6295\u8bc9","bookmark":"\u64a4\u9500\u4e66\u7b7e","like":"\u64a4\u9500\u8d5e","vote":"\u64a4\u9500\u6295\u7968"},"people":{"off_topic":"{{icons}} \u6295\u8bc9\u5b83\u504f\u79bb\u4e3b\u9898","spam":"{{icons}} \u6295\u8bc9\u5b83\u4e3a\u5783\u573e\u4fe1\u606f","inappropriate":"{{icons}} \u6295\u8bc9\u5b83\u4e3a\u4e0d\u5f53\u5185\u5bb9","notify_moderators":"{{icons}} \u5411\u7248\u4e3b\u6295\u8bc9\u5b83","notify_moderators_with_url":"{{icons}} <a href='{{postUrl}}'>\u901a\u77e5\u4e86\u7248\u4e3b</a>","notify_user":"{{icons}} \u53d1\u8d77\u4e86\u4e00\u4e2a\u79c1\u4e0b\u4ea4\u6d41","notify_user_with_url":"{{icons}} \u53d1\u9001\u4e86\u4e00\u6761<a href='{{postUrl}}'>\u79c1\u6709\u6d88\u606f</a>","bookmark":"{{icons}} \u5bf9\u5b83\u505a\u4e86\u4e66\u7b7e","like":"{{icons}} \u8d5e\u4e86\u5b83","vote":"{{icons}} \u5bf9\u5b83\u6295\u7968"},"by_you":{"off_topic":"\u4f60\u6295\u8bc9\u5b83\u504f\u79bb\u4e3b\u9898","spam":"\u4f60\u6295\u8bc9\u5b83\u4e3a\u5783\u573e\u4fe1\u606f","inappropriate":"\u4f60\u6295\u8bc9\u5b83\u4e3a\u4e0d\u5f53\u5185\u5bb9","notify_moderators":"\u4f60\u5411\u7248\u4e3b\u6295\u8bc9\u4e86\u5b83","notify_user":"\u4f60\u5bf9\u8be5\u7528\u6237\u53d1\u8d77\u4e86\u4e00\u4e2a\u79c1\u4e0b\u4ea4\u6d41","bookmark":"\u4f60\u5bf9\u8be5\u5e16\u505a\u4e86\u4e66\u7b7e","like":"\u4f60\u8d5e\u4e86\u5b83","vote":"\u4f60\u5bf9\u8be5\u5e16\u6295\u4e86\u7968"},"by_you_and_others":{"off_topic":{"one":"\u4f60\u548c\u53e6\u4e00\u4e2a\u7528\u6237\u6295\u8bc9\u5b83\u504f\u79bb\u4e3b\u9898","other":"\u4f60\u548c\u5176\u4ed6 {{count}} \u4e2a\u7528\u6237\u6295\u8bc9\u5b83\u504f\u79bb\u4e3b\u9898"},"spam":{"one":"\u4f60\u548c\u53e6\u4e00\u4e2a\u7528\u6237\u6295\u8bc9\u5b83\u4e3a\u5783\u573e\u4fe1\u606f","other":"\u4f60\u548c\u5176\u4ed6 {{count}} \u4e2a\u7528\u6237\u6295\u8bc9\u5b83\u4e3a\u5783\u573e\u4fe1\u606f"},"inappropriate":{"one":"\u4f60\u548c\u53e6\u4e00\u4e2a\u7528\u6237\u6295\u8bc9\u5b83\u4e3a\u4e0d\u5f53\u5185\u5bb9","other":"\u4f60\u548c\u5176\u4ed6 {{count}} \u4e2a\u7528\u6237\u6295\u8bc9\u5b83\u4e3a\u4e0d\u5f53\u5185\u5bb9"},"notify_moderators":{"one":"\u4f60\u548c\u53e6\u4e00\u4e2a\u7528\u6237\u5411\u7248\u4e3b\u6295\u8bc9\u4e86\u5b83","other":"\u4f60\u548c\u5176\u4ed6 {{count}} \u4e2a\u7528\u6237\u5411\u7248\u4e3b\u6295\u8bc9\u4e86\u5b83"},"notify_user":{"one":"\u4f60\u548c\u53e6\u4e00\u4e2a\u7528\u6237\u5bf9\u8be5\u7528\u6237\u53d1\u8d77\u4e86\u4e00\u4e2a\u79c1\u4e0b\u4ea4\u6d41","other":"\u4f60\u548c\u5176\u4ed6 {{count}} \u4e2a\u7528\u6237\u5bf9\u8be5\u7528\u6237\u53d1\u8d77\u4e86\u4e00\u4e2a\u79c1\u4e0b\u4ea4\u6d41"},"bookmark":{"one":"\u4f60\u548c\u53e6\u4e00\u4e2a\u7528\u6237\u5bf9\u8be5\u5e16\u505a\u4e86\u4e66\u7b7e","other":"\u4f60\u548c\u5176\u4ed6 {{count}} \u4e2a\u7528\u6237\u5bf9\u8be5\u5e16\u505a\u4e86\u4e66\u7b7e"},"like":{"one":"\u4f60\u548c\u53e6\u4e00\u4e2a\u7528\u6237\u8d5e\u4e86\u5b83","other":"\u4f60\u548c\u5176\u4ed6 {{count}} \u4e2a\u7528\u6237\u8d5e\u4e86\u5b83"},"vote":{"one":"\u4f60\u548c\u53e6\u4e00\u4e2a\u7528\u6237\u5bf9\u8be5\u5e16\u6295\u4e86\u7968","other":"\u4f60\u548c\u5176\u4ed6 {{count}} \u4e2a\u7528\u6237\u5bf9\u8be5\u5e16\u6295\u4e86\u7968"}},"by_others":{"off_topic":{"one":"\u4e00\u4e2a\u7528\u6237\u6295\u8bc9\u5b83\u504f\u79bb\u4e3b\u9898","other":"{{count}} \u4e2a\u7528\u6237\u6295\u8bc9\u5b83\u504f\u79bb\u4e3b\u9898"},"spam":{"one":"\u4e00\u4e2a\u7528\u6237\u6295\u8bc9\u5b83\u4e3a\u5783\u573e\u4fe1\u606f","other":"{{count}} \u4e2a\u7528\u6237\u6295\u8bc9\u5b83\u4e3a\u5783\u573e\u4fe1\u606f"},"inappropriate":{"one":"\u4e00\u4e2a\u7528\u6237\u6295\u8bc9\u5b83\u4e3a\u4e0d\u5f53\u5185\u5bb9","other":"{{count}} \u4e2a\u7528\u6237\u6295\u8bc9\u5b83\u4e3a\u4e0d\u5f53\u5185\u5bb9"},"notify_moderators":{"one":"\u4e00\u4e2a\u7528\u6237\u5411\u7248\u4e3b\u6295\u8bc9\u4e86\u5b83","other":"{{count}} \u4e2a\u7528\u6237\u5411\u7248\u4e3b\u6295\u8bc9\u4e86\u5b83"},"notify_user":{"one":"\u4e00\u4e2a\u7528\u6237\u5bf9\u8be5\u7528\u6237\u53d1\u8d77\u4e86\u4e00\u4e2a\u79c1\u4e0b\u4ea4\u6d41","other":"{{count}} \u4e2a\u7528\u6237\u5bf9\u8be5\u7528\u6237\u53d1\u8d77\u4e86\u4e00\u4e2a\u79c1\u4e0b\u4ea4\u6d41"},"bookmark":{"one":"\u4e00\u4e2a\u7528\u6237\u5bf9\u8be5\u5e16\u505a\u4e86\u4e66\u7b7e","other":"{{count}} \u4e2a\u7528\u6237\u5bf9\u8be5\u5e16\u505a\u4e86\u4e66\u7b7e"},"like":{"one":"\u4e00\u4e2a\u7528\u6237\u8d5e\u4e86\u5b83","other":"{{count}} \u4e2a\u7528\u6237\u8d5e\u4e86\u5b83"},"vote":{"one":"\u4e00\u4e2a\u7528\u6237\u5bf9\u8be5\u5e16\u6295\u4e86\u7968","other":"{{count}} \u4e2a\u7528\u6237\u5bf9\u8be5\u5e16\u6295\u4e86\u7968"}}},"edits":{"one":"\u4e00\u6b21\u7f16\u8f91","other":"{{count}}\u6b21\u7f16\u8f91","zero":"\u672a\u7f16\u8f91"},"delete":{"confirm":{"one":"\u4f60\u786e\u5b9a\u8981\u5220\u9664\u6b64\u5e16\u5417\uff1f","other":"\u4f60\u786e\u5b9a\u8981\u5220\u9664\u8fd9\u4e9b\u5e16\u5b50\u5417\uff1f"}}},"category":{"none":"\uff08\u672a\u5206\u7c7b\uff09","edit":"\u7f16\u8f91","edit_long":"\u7f16\u8f91\u5206\u7c7b","edit_uncategorized":"\u7f16\u8f91\u672a\u5206\u7c7b\u7684","view":"\u6d4f\u89c8\u5206\u7c7b\u4e0b\u7684\u4e3b\u9898","general":"\u901a\u5e38","settings":"\u8bbe\u7f6e","delete":"\u5220\u9664\u5206\u7c7b","create":"\u521b\u5efa\u5206\u7c7b","save":"\u4fdd\u5b58\u5206\u7c7b","creation_error":"\u521b\u5efa\u6b64\u5206\u7c7b\u65f6\u53d1\u751f\u4e86\u9519\u8bef\u3002","save_error":"\u5728\u4fdd\u5b58\u6b64\u5206\u7c7b\u65f6\u53d1\u751f\u4e86\u9519\u8bef\u3002","more_posts":"\u6d4f\u89c8\u5168\u90e8 {{posts}} \u2026\u2026","name":"\u5206\u7c7b\u540d\u79f0","description":"\u63cf\u8ff0","topic":"\u5206\u7c7b\u4e3b\u9898","badge_colors":"\u5fbd\u7ae0\u989c\u8272","background_color":"\u80cc\u666f\u8272","foreground_color":"\u524d\u666f\u8272","name_placeholder":"\u5e94\u8be5\u7b80\u660e\u627c\u8981\u3002","color_placeholder":"\u4efb\u4f55\u7f51\u7edc\u8272\u5f69","delete_confirm":"\u4f60\u786e\u5b9a\u8981\u5220\u9664\u6b64\u5206\u7c7b\u5417\uff1f","delete_error":"\u5728\u5220\u9664\u6b64\u5206\u7c7b\u65f6\u53d1\u751f\u4e86\u9519\u8bef\u3002","list":"\u5217\u51fa\u5206\u7c7b","no_description":"\u672c\u5206\u7c7b\u6ca1\u6709\u63cf\u8ff0\u4fe1\u606f\u3002","change_in_category_topic":"\u8bbf\u95ee\u5206\u7c7b\u4e3b\u9898\u6765\u7f16\u8f91\u63cf\u8ff0\u4fe1\u606f","hotness":"\u70ed\u5ea6","already_used":"\u6b64\u8272\u5f69\u5df2\u7ecf\u88ab\u53e6\u4e00\u4e2a\u5206\u7c7b\u4f7f\u7528","is_secure":"\u5b89\u5168\u7c7b\u578b\uff1f","add_group":"\u6dfb\u52a0\u5206\u7ec4","security":"\u5b89\u5168","allowed_groups":"\u6388\u6743\u7684\u5206\u7ec4\uff1a","auto_close_label":"\u81ea\u52a8\u5173\u95ed\u4e3b\u9898\uff0c\u8fc7\uff1a"},"flagging":{"title":"\u4e3a\u4f55\u8981\u7ed9\u6295\u8bc9\u672c\u5e16\uff1f","action":"\u6295\u8bc9\u5e16\u5b50","notify_action":"\u901a\u77e5","cant":"\u62b1\u6b49\uff0c\u5f53\u524d\u4f60\u4e0d\u80fd\u6295\u8bc9\u672c\u5e16\u3002","custom_placeholder_notify_user":"\u4e3a\u4f55\u4f60\u8981\u79c1\u4e0b\u8054\u7cfb\u8be5\u7528\u6237\uff1f","custom_placeholder_notify_moderators":"\u4e3a\u4f55\u672c\u5e16\u9700\u8981\u8bba\u575b\u7248\u4e3b\u7684\u5173\u6ce8\uff1f\u4e3a\u4f55\u672c\u5e16\u9700\u8981\u8bba\u575b\u7248\u4e3b\u7684\u5173\u6ce8\uff1f","custom_message":{"at_least":"\u8f93\u5165\u81f3\u5c11 {{n}} \u4e2a\u5b57\u7b26","more":"\u8fd8\u5dee {{n}} \u4e2a\u2026\u2026","left":"\u8fd8\u5269\u4e0b {{n}}"}},"topic_summary":{"title":"\u4e3b\u9898\u6982\u8981","links_shown":"\u663e\u793a\u6240\u6709 {{totalLinks}} \u4e2a\u94fe\u63a5\u2026\u2026","clicks":"\u70b9\u51fb","topic_link":"\u4e3b\u9898\u94fe\u63a5"},"topic_statuses":{"locked":{"help":"\u672c\u4e3b\u9898\u5df2\u5173\u95ed\uff0c\u4e0d\u518d\u63a5\u53d7\u65b0\u7684\u56de\u590d"},"pinned":{"help":"\u672c\u4e3b\u9898\u5df2\u7f6e\u9876\uff0c\u5b83\u5c06\u59cb\u7ec8\u663e\u793a\u5728\u5b83\u6240\u5c5e\u5206\u7c7b\u7684\u9876\u90e8"},"archived":{"help":"\u672c\u4e3b\u9898\u5df2\u5f52\u6863\uff0c\u5373\u5df2\u7ecf\u51bb\u7ed3\uff0c\u65e0\u6cd5\u4fee\u6539"},"invisible":{"help":"\u672c\u4e3b\u9898\u4e0d\u53ef\u89c1\uff0c\u5b83\u5c06\u4e0d\u88ab\u663e\u793a\u5728\u4e3b\u9898\u5217\u8868\u4e2d\uff0c\u53ea\u80fd\u901a\u8fc7\u4e00\u4e2a\u76f4\u63a5\u94fe\u63a5\u6765\u8bbf\u95ee"}},"posts":"\u5e16\u5b50","posts_long":"\u672c\u4e3b\u9898\u6709 {{number}} \u4e2a\u5e16\u5b50","original_post":"\u539f\u59cb\u5e16","views":"\u6d4f\u89c8","replies":"\u56de\u590d","views_long":"\u672c\u4e3b\u9898\u5df2\u7ecf\u88ab\u6d4f\u89c8\u8fc7 {{number}} \u6b21","activity":"\u6d3b\u52a8","likes":"\u8d5e","top_contributors":"\u53c2\u4e0e\u8005","category_title":"\u5206\u7c7b","history":"\u5386\u53f2","changed_by":"\u7531 {{author}}","categories_list":"\u5206\u7c7b\u5217\u8868","filters":{"latest":{"title":"\u6700\u65b0","help":"\u6700\u65b0\u53d1\u5e03\u7684\u5e16\u5b50"},"hot":{"title":"\u70ed\u95e8","help":"\u6700\u8fd1\u6700\u53d7\u6b22\u8fce\u7684\u4e3b\u9898"},"favorited":{"title":"\u6536\u85cf","help":"\u4f60\u6536\u85cf\u7684\u4e3b\u9898"},"read":{"title":"\u5df2\u9605","help":"\u4f60\u5df2\u7ecf\u9605\u8bfb\u8fc7\u7684\u4e3b\u9898"},"categories":{"title":"\u5206\u7c7b","title_in":"\u5206\u7c7b - {{categoryName}}","help":"\u5f52\u5c5e\u4e8e\u4e0d\u540c\u5206\u7c7b\u7684\u6240\u6709\u4e3b\u9898"},"unread":{"title":{"zero":"\u672a\u9605","one":"1\u4e2a\u672a\u9605\u4e3b\u9898","other":"{{count}}\u4e2a\u672a\u9605\u4e3b\u9898"},"help":"\u8ffd\u8e2a\u7684\u4e3b\u9898\u4e2d\u6709\u672a\u9605\u5e16\u5b50\u7684\u4e3b\u9898"},"new":{"title":{"zero":"\u65b0\u4e3b\u9898","one":"\u65b0\u4e3b\u9898\uff081\uff09","other":"\u65b0\u4e3b\u9898\uff08{{count}}\uff09"},"help":"\u4f60\u6700\u8fd1\u4e00\u6b21\u8bbf\u95ee\u540e\u7684\u65b0\u4e3b\u9898\uff0c\u4ee5\u53ca\u4f60\u8ffd\u8e2a\u7684\u4e3b\u9898\u4e2d\u6709\u65b0\u5e16\u5b50\u7684\u4e3b\u9898"},"posted":{"title":"\u6211\u7684\u5e16\u5b50","help":"\u4f60\u53d1\u8868\u8fc7\u5e16\u5b50\u7684\u4e3b\u9898"},"category":{"title":{"zero":"{{categoryName}}","one":"{{categoryName}}\uff081\uff09","other":"{{categoryName}}\uff08{{count}}\uff09"},"help":"\u5728 {{categoryName}} \u5206\u7c7b\u4e2d\u70ed\u95e8\u7684\u4e3b\u9898"}},"browser_update":"\u62b1\u6b49, <a href=\"http://www.iteriter.com/faq/#browser\">\u4f60\u7684\u6d4f\u89c8\u5668\u7248\u672c\u592a\u4f4e\uff0c\u63a8\u8350\u4f7f\u7528Chrome</a>. \u8bf7 <a href=\"http://www.google.com/chrome/\">\u5347\u7ea7\u4f60\u7684\u6d4f\u89c8\u5668</a>\u3002","type_to_filter":"\u8f93\u5165\u8fc7\u6ee4\u6761\u4ef6\u2026\u2026","admin":{"title":"\u8bba\u9053 \u7ba1\u7406","moderator":"\u7248\u4e3b","dashboard":{"title":"\u7ba1\u7406\u9762\u677f","version":"\u5b89\u88c5\u7684\u7248\u672c","up_to_date":"\u4f60\u6b63\u5728\u8fd0\u884c\u6700\u65b0\u7684\u8bba\u575b\u7248\u672c\u3002","critical_available":"\u6709\u4e00\u4e2a\u5173\u952e\u66f4\u65b0\u53ef\u7528\u3002","updates_available":"\u76ee\u524d\u6709\u53ef\u7528\u66f4\u65b0\u3002","please_upgrade":"\u8bf7\u5347\u7ea7\uff01","installed_version":"\u5df2\u5b89\u88c5","latest_version":"\u6700\u65b0\u7248\u672c","problems_found":"\u4f60\u5b89\u88c5\u7684\u8bba\u575b\u76ee\u524d\u6709\u4ee5\u4e0b\u95ee\u9898\uff1a","last_checked":"\u4e0a\u6b21\u68c0\u67e5","refresh_problems":"\u5237\u65b0","no_problems":"\u627e\u4e0d\u5230\u95ee\u9898.","moderators":"\u7248\u4e3b\uff1a","admins":"\u7ba1\u7406\u5458\uff1a","private_messages_short":"\u79c1\u4fe1","private_messages_title":"\u79c1\u5bc6\u4fe1\u606f","reports":{"today":"\u4eca\u5929","yesterday":"\u6628\u5929","last_7_days":"7 \u5929\u4ee5\u5185","last_30_days":"30 \u5929\u4ee5\u5185","all_time":"\u6240\u6709\u65f6\u95f4\u5185","7_days_ago":"7 \u5929\u4e4b\u524d","30_days_ago":"30 \u5929\u4e4b\u524d","all":"\u5168\u90e8","view_table":"\u4ee5\u8868\u683c\u5c55\u793a","view_chart":"\u4ee5\u67f1\u72b6\u56fe\u5c55\u793a"}},"commits":{"latest_changes":"\u6700\u540e\u7684\u6539\u52a8: \u8bf7\u7ecf\u5e38\u5347\u7ea7\uff01","by":"\u6765\u81ea"},"flags":{"title":"\u6295\u8bc9","old":"\u8fc7\u53bb\u7684","active":"\u6d3b\u8dc3\u7684","clear":"\u6e05\u9664\u6295\u8bc9","clear_title":"\u64a4\u9500\u672c\u5e16\u7684\u6240\u6709\u6295\u8bc9\uff08\u5df2\u9690\u85cf\u7684\u5e16\u5b50\u5c06\u4f1a\u88ab\u53d6\u6d88\u9690\u85cf\uff09","delete":"\u5220\u9664\u5e16\u5b50","delete_title":"\u5220\u9664\u5e16\u5b50\uff08\u5982\u679c\u5b83\u662f\u4e3b\u9898\u7b2c\u4e00\u5e16\uff0c\u90a3\u4e48\u5c06\u5220\u9664\u4e3b\u9898\uff09","flagged_by":"\u6295\u8bc9\u8005\u4e3a","error":"\u51fa\u9519\u4e86","view_message":"\u67e5\u770b\u6d88\u606f"},"groups":{"title":"\u7fa4\u7ec4","edit":"\u7f16\u8f91\u7fa4\u7ec4","selector_placeholder":"\u6dfb\u52a0\u7528\u6237","name_placeholder":"\u7ec4\u540d\uff0c\u4e0d\u80fd\u542b\u6709\u7a7a\u683c\uff0c\u4e0e\u7528\u6237\u540d\u89c4\u5219\u4e00\u81f4"},"api":{"title":"\u5e94\u7528\u5f00\u53d1\u63a5\u53e3\uff08API\uff09","long_title":"API\u4fe1\u606f","key":"\u5bc6\u94a5","generate":"\u751f\u6210API\u5bc6\u94a5","regenerate":"\u91cd\u65b0\u751f\u6210API\u5bc6\u94a5","info_html":"API\u5bc6\u94a5\u53ef\u4ee5\u7528\u6765\u901a\u8fc7JSON\u8c03\u7528\u521b\u5efa\u548c\u66f4\u65b0\u4e3b\u9898\u3002","note_html":"\u8bf7<strong>\u5b89\u5168\u7684</strong>\u4fdd\u7ba1\u597d\u672c\u5bc6\u94a5\uff0c\u4efb\u4f55\u62e5\u6709\u8be5\u5bc6\u94a5\u7684\u7528\u6237\u53ef\u4ee5\u4f7f\u7528\u5b83\u4ee5\u8bba\u575b\u4efb\u4f55\u7528\u6237\u7684\u540d\u4e49\u6765\u53d1\u5e16\u3002"},"customize":{"title":"\u5b9a\u5236","long_title":"\u7ad9\u70b9\u5b9a\u5236","header":"\u5934\u90e8","css":"\u5c42\u53e0\u6837\u5f0f\u8868\uff08CSS\uff09","override_default":"\u8986\u76d6\u7f3a\u7701\u503c\uff1f","enabled":"\u542f\u7528\uff1f","preview":"\u9884\u89c8","undo_preview":"\u64a4\u9500\u9884\u89c8","save":"\u4fdd\u5b58","new":"\u65b0\u5efa","new_style":"\u65b0\u6837\u5f0f","delete":"\u5220\u9664","delete_confirm":"\u5220\u9664\u672c\u5b9a\u5236\u5185\u5bb9\uff1f","about":"\u7ad9\u70b9\u5b9a\u5236\u5141\u8bb8\u4f60\u4fee\u6539\u6837\u5f0f\u8868\u548c\u7ad9\u70b9\u5934\u90e8\u3002\u9009\u62e9\u6216\u8005\u6dfb\u52a0\u4e00\u4e2a\u6765\u5f00\u59cb\u7f16\u8f91\u3002"},"email_logs":{"title":"\u7535\u5b50\u90ae\u4ef6","sent_at":"\u53d1\u9001\u65f6\u95f4","email_type":"\u90ae\u4ef6\u7c7b\u578b","to_address":"\u76ee\u7684\u5730\u5740","test_email_address":"\u6d4b\u8bd5\u7535\u5b50\u90ae\u4ef6\u5730\u5740","send_test":"\u53d1\u9001\u6d4b\u8bd5\u7535\u5b50\u90ae\u4ef6","sent_test":"\u5df2\u53d1\u9001\uff01"},"impersonate":{"title":"\u5047\u5192\u7528\u6237","username_or_email":"\u7528\u6237\u540d\u6216\u7528\u6237\u7535\u5b50\u90ae\u4ef6","help":"\u4f7f\u7528\u6b64\u5de5\u5177\u6765\u5047\u5192\u4e00\u4e2a\u7528\u6237\u5e10\u53f7\u4ee5\u65b9\u4fbf\u8c03\u8bd5\u3002","not_found":"\u65e0\u6cd5\u627e\u5230\u8be5\u7528\u6237\u3002","invalid":"\u62b1\u6b49\uff0c\u4f60\u4e0d\u80fd\u5047\u5192\u8be5\u7528\u6237\u3002"},"users":{"title":"\u7528\u6237","create":"\u6dfb\u52a0\u7ba1\u7406\u5458\u7528\u6237","last_emailed":"\u6700\u540e\u4e00\u6b21\u90ae\u5bc4","not_found":"\u62b1\u6b49\uff0c\u5728\u6211\u4eec\u7684\u7cfb\u7edf\u4e2d\u6b64\u7528\u6237\u540d\u4e0d\u5b58\u5728\u3002","new":"\u65b0\u5efa","active":"\u6d3b\u8dc3","pending":"\u5f85\u5b9a","approved":"\u5df2\u6279\u51c6\uff1f","approved_selected":{"one":"\u6279\u51c6\u7528\u6237","other":"\u6279\u51c6\u7528\u6237\uff08{{count}}\uff09"},"titles":{"active":"\u6d3b\u52a8\u7528\u6237","new":"\u65b0\u7528\u6237","pending":"\u7b49\u5f85\u5ba1\u6838\u7528\u6237","newuser":"\u4fe1\u7528\u7b49\u7ea7\u4e3a0\u7684\u7528\u6237\uff08\u65b0\u7528\u6237\uff09","basic":"\u4fe1\u7528\u7b49\u7ea7\u4e3a1\u7684\u7528\u6237\uff08\u57fa\u672c\u7528\u6237\uff09","regular":"\u4fe1\u7528\u7b49\u7ea7\u4e3a2\u7684\u7528\u6237\uff08\u5e38\u8bbf\u95ee\u7528\u6237\uff09","leader":"\u4fe1\u7528\u7b49\u7ea7\u4e3a3\u7684\u7528\u6237\uff08\u9ad8\u7ea7\u7528\u6237\uff09","elder":"\u4fe1\u7528\u7b49\u7ea7\u4e3a4\u7684\u7528\u6237\uff08\u9aa8\u7070\u7528\u6237\uff09","admins":"\u7ba1\u7406\u5458","moderators":"\u7248\u4e3b"}},"user":{"ban_failed":"\u7981\u6b62\u6b64\u7528\u6237\u65f6\u53d1\u751f\u4e86\u9519\u8bef {{error}}","unban_failed":"\u89e3\u7981\u6b64\u7528\u6237\u65f6\u53d1\u751f\u4e86\u9519\u8bef {{error}}","ban_duration":"\u4f60\u8ba1\u5212\u7981\u6b62\u8be5\u7528\u6237\u591a\u4e45\uff1f\uff08\u5929\uff09","delete_all_posts":"\u5220\u9664\u6240\u6709\u5e16\u5b50","ban":"\u7981\u6b62","unban":"\u89e3\u7981","banned":"\u5df2\u7981\u6b62\uff1f","moderator":"\u7248\u4e3b\uff1f","admin":"\u7ba1\u7406\u5458\uff1f","show_admin_profile":"\u7ba1\u7406\u5458","refresh_browsers":"\u5f3a\u5236\u6d4f\u89c8\u5668\u5237\u65b0","show_public_profile":"\u663e\u793a\u516c\u5f00\u4ecb\u7ecd","impersonate":"\u5047\u5192\u7528\u6237","revoke_admin":"\u540a\u9500\u7ba1\u7406\u5458\u8d44\u683c","grant_admin":"\u8d4b\u4e88\u7ba1\u7406\u5458\u8d44\u683c","revoke_moderation":"\u540a\u9500\u8bba\u575b\u7248\u4e3b\u8d44\u683c","grant_moderation":"\u8d4b\u4e88\u8bba\u575b\u7248\u4e3b\u8d44\u683c","reputation":"\u58f0\u8a89","permissions":"\u6743\u9650","activity":"\u6d3b\u52a8","like_count":"\u6536\u5230\u7684\u8d5e","private_topics_count":"\u79c1\u6709\u4e3b\u9898\u6570\u91cf","posts_read_count":"\u5df2\u9605\u5e16\u5b50\u6570\u91cf","post_count":"\u521b\u5efa\u7684\u5e16\u5b50\u6570\u91cf","topics_entered":"\u8fdb\u5165\u7684\u4e3b\u9898\u6570\u91cf","flags_given_count":"\u6240\u505a\u6295\u8bc9\u6570\u91cf","flags_received_count":"\u6536\u5230\u6295\u8bc9\u6570\u91cf","approve":"\u6279\u51c6","approved_by":"\u6279\u51c6\u4eba","time_read":"\u9605\u8bfb\u6b21\u6570","delete":"\u5220\u9664\u7528\u6237","delete_forbidden":"\u6b64\u7528\u6237\u8fd8\u65e0\u6cd5\u5220\u9664\uff0c\u56e0\u4e3a\u4ed6/\u5979\u8fd8\u6709\u5e16\u5b50\u3002\u8bf7\u5148\u5220\u9664\u8be5\u7528\u6237\u7684\u6240\u6709\u5e16\u5b50\u3002","delete_confirm":"\u4f60 \u786e\u5b9a \u4f60\u8981\u6c38\u4e45\u7684\u4ece\u672c\u7ad9\u5220\u9664\u6b64\u7528\u6237\uff1f\u8be5\u64cd\u4f5c\u65e0\u6cd5\u64a4\u9500\uff01","deleted":"\u8be5\u7528\u6237\u5df2\u88ab\u5220\u9664\u3002","delete_failed":"\u5728\u5220\u9664\u7528\u6237\u65f6\u53d1\u751f\u4e86\u9519\u8bef\u3002\u8bf7\u786e\u4fdd\u5220\u9664\u8be5\u7528\u6237\u524d\u5220\u9664\u4e86\u8be5\u7528\u6237\u7684\u6240\u6709\u5e16\u5b50\u3002","send_activation_email":"\u53d1\u9001\u6fc0\u6d3b\u90ae\u4ef6","activation_email_sent":"\u6fc0\u6d3b\u90ae\u4ef6\u5df2\u53d1\u9001\u3002","send_activation_email_failed":"\u5728\u53d1\u9001\u6fc0\u6d3b\u90ae\u4ef6\u65f6\u53d1\u751f\u4e86\u9519\u8bef\u3002","activate":"\u6fc0\u6d3b\u5e10\u53f7","activate_failed":"\u5728\u6fc0\u6d3b\u7528\u6237\u5e10\u53f7\u65f6\u53d1\u751f\u4e86\u9519\u8bef\u3002","deactivate_account":"\u505c\u7528\u5e10\u53f7","deactivate_failed":"\u5728\u505c\u7528\u7528\u6237\u5e10\u53f7\u65f6\u53d1\u751f\u4e86\u9519\u8bef\u3002"},"site_content":{"none":"\u9009\u62e9\u5185\u5bb9\u7c7b\u578b\u4ee5\u5f00\u59cb\u7f16\u8f91\u3002","title":"\u5185\u5bb9","edit":"\u7f16\u8f91\u7ad9\u70b9\u5185\u5bb9"},"site_settings":{"show_overriden":"\u53ea\u663e\u793a\u88ab\u8986\u76d6\u4e86\u7f3a\u7701\u503c\u7684","title":"\u8bbe\u7f6e","reset":"\u91cd\u7f6e\u4e3a\u7f3a\u7701\u503c"}}}}};
I18n.locale = 'zh_CN'
;
