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
MessageFormat.locale.en = function ( n ) {
  if ( n === 1 ) {
    return "one";
  }
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
    })({"topic.read_more_in_category_MF" : function(d){
var r = "";
r += "There ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "UNREAD";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "is <a href='/unread'>1 unread</a>";
return r;
},
"other" : function(d){
var r = "";
r += "are <a href='/unread'>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " unread</a>";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " and ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "NEW";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "<a href='/new'>1 new</a> topic";
return r;
},
"other" : function(d){
var r = "";
r += "<a href='/new'>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " new</a> topics";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " remaining, or browse other topics in ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["catLink"];
return r;
} , "topic.read_more_MF" : function(d){
var r = "";
r += "There ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "UNREAD";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "is <a href='/unread'>1 unread</a>";
return r;
},
"other" : function(d){
var r = "";
r += "are <a href='/unread'>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " unread</a>";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " and ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "NEW";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "<a href='/new'>1 new</a> topic";
return r;
},
"other" : function(d){
var r = "";
r += "<a href='/new'>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " new</a> topics";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " remaining, or ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["latestLink"];
return r;
}});I18n.translations = {"en":{"js":{"share":{"topic":"share a link to this topic","post":"share a link to this post","close":"close","twitter":"share this link on Twitter","facebook":"share this link on Facebook","google+":"share this link on Google+","email":"send this link in an email"},"edit":"edit the title and category of this topic","not_implemented":"That feature hasn't been implemented yet, sorry!","no_value":"No","yes_value":"Yes","of_value":"of","generic_error":"Sorry, an error has occurred.","log_in":"Log In","age":"Age","last_post":"Last post","admin_title":"Admin","flags_title":"Flags","show_more":"show more","links":"Links","faq":"FAQ","you":"You","or":"or","now":"just now","read_more":"read more","in_n_seconds":{"one":"in 1 second","other":"in {{count}} seconds"},"in_n_minutes":{"one":"in 1 minute","other":"in {{count}} minutes"},"in_n_hours":{"one":"in 1 hour","other":"in {{count}} hours"},"in_n_days":{"one":"in 1 day","other":"in {{count}} days"},"suggested_topics":{"title":"Suggested Topics"},"bookmarks":{"not_logged_in":"Sorry, you must be logged in to bookmark posts.","created":"You've bookmarked this post.","not_bookmarked":"You've read this post; click to bookmark it.","last_read":"This is the last post you've read."},"new_topics_inserted":"{{count}} new topics.","show_new_topics":"Click to show.","preview":"preview","cancel":"cancel","save":"Save Changes","saving":"Saving...","saved":"Saved!","choose_topic":{"none_found":"No topics found.","title":{"search":"Search for a Topic by name, url or id:","placeholder":"type the topic title here"}},"user_action":{"user_posted_topic":"<a href='{{userUrl}}'>{{user}}</a> posted <a href='{{topicUrl}}'>the topic</a>","you_posted_topic":"<a href='{{userUrl}}'>You</a> posted <a href='{{topicUrl}}'>the topic</a>","user_replied_to_post":"<a href='{{userUrl}}'>{{user}}</a> replied to <a href='{{postUrl}}'>{{post_number}}</a>","you_replied_to_post":"<a href='{{userUrl}}'>You</a> replied to <a href='{{postUrl}}'>{{post_number}}</a>","user_replied_to_topic":"<a href='{{userUrl}}'>{{user}}</a> replied to <a href='{{topicUrl}}'>the topic</a>","you_replied_to_topic":"<a href='{{userUrl}}'>You</a> replied to <a href='{{topicUrl}}'>the topic</a>","user_mentioned_user":"<a href='{{user1Url}}'>{{user}}</a> mentioned <a href='{{user2Url}}'>{{another_user}}</a>","user_mentioned_you":"<a href='{{user1Url}}'>{{user}}</a> mentioned <a href='{{user2Url}}'>you</a>","you_mentioned_user":"<a href='{{user1Url}}'>You</a> mentioned <a href='{{user2Url}}'>{{user}}</a>","posted_by_user":"Posted by <a href='{{userUrl}}'>{{user}}</a>","posted_by_you":"Posted by <a href='{{userUrl}}'>you</a>","sent_by_user":"Sent by <a href='{{userUrl}}'>{{user}}</a>","sent_by_you":"Sent by <a href='{{userUrl}}'>you</a>"},"user_action_groups":{"1":"Likes Given","2":"Likes Received","3":"Bookmarks","4":"Topics","5":"Replies","6":"Responses","7":"Mentions","9":"Quotes","10":"Favorites","11":"Edits","12":"Sent Items","13":"Inbox"},"user":{"profile":"Profile","title":"User","mute":"Mute","edit":"Edit Preferences","download_archive":"download archive of my posts","private_message":"Private Message","private_messages":"Messages","activity_stream":"Activity","preferences":"Preferences","bio":"About me","invited_by":"Invited By","trust_level":"Trust Level","external_links_in_new_tab":"Open all external links in a new tab","enable_quoting":"Enable quote reply for highlighted text","moderator":"{{user}} is a moderator","admin":"{{user}} is an admin","change_password":{"action":"change","success":"(email sent)","in_progress":"(sending email)","error":"(error)"},"change_username":{"action":"change","title":"Change Username","confirm":"There could be consequences to changing your username. Are you absolutely sure you want to?","taken":"Sorry, that username is taken.","error":"There was an error changing your username.","invalid":"That username is invalid. It must only include numbers and letters"},"change_email":{"action":"change","title":"Change Email","taken":"Sorry, that email is not available.","error":"There was an error changing your email. Perhaps that address is already in use?","success":"We've sent an email to that address. Please follow the confirmation instructions."},"email":{"title":"Email","instructions":"Your email will never be shown to the public.","ok":"Looks good. We will email you to confirm.","invalid":"Please enter a valid email address.","authenticated":"Your email has been authenticated by {{provider}}.","frequency":"We'll only email you if we haven't seen you recently and you haven't already seen the thing we're emailing you about."},"name":{"title":"Name","instructions":"The longer version of your name; does not need to be unique. Used for alternate @name matching and shown only on your user page.","too_short":"Your name is too short.","ok":"Your name looks good."},"username":{"title":"Username","instructions":"Must be unique, no spaces. People can mention you as @username.","short_instructions":"People can mention you as @{{username}}.","available":"Your username is available.","global_match":"Email matches the registered username.","global_mismatch":"Already registered. Try {{suggestion}}?","not_available":"Not available. Try {{suggestion}}?","too_short":"Your username is too short.","too_long":"Your username is too long.","checking":"Checking username availability...","enter_email":"Username found. Enter matching email."},"password_confirmation":{"title":"Password Again"},"last_posted":"Last Post","last_emailed":"Last Emailed","last_seen":"Last Seen","created":"Created At","log_out":"Log Out","website":"Web Site","email_settings":"Email","email_digests":{"title":"When I don't visit the site, send me an email digest of what's new","daily":"daily","weekly":"weekly","bi_weekly":"every two weeks"},"email_direct":"Receive an email when someone quotes you, replies to your post, or mentions your @username","email_private_messages":"Receive an email when someone sends you a private message","other_settings":"Other","new_topic_duration":{"label":"Consider topics new when","not_viewed":"I haven't viewed them yet","last_here":"they were posted since I was here last","after_n_days":{"one":"they were posted in the last day","other":"they were posted in the last {{count}} days"},"after_n_weeks":{"one":"they were posted in the last week","other":"they were posted in the last {{count}} week"}},"auto_track_topics":"Automatically track topics I enter","auto_track_options":{"never":"never","always":"always","after_n_seconds":{"one":"after 1 second","other":"after {{count}} seconds"},"after_n_minutes":{"one":"after 1 minute","other":"after {{count}} minutes"}},"invited":{"title":"Invites","user":"Invited User","none":"{{username}} hasn't invited any users to the site.","redeemed":"Redeemed Invites","redeemed_at":"Redeemed At","pending":"Pending Invites","topics_entered":"Topics Entered","posts_read_count":"Posts Read","rescind":"Remove Invitation","rescinded":"Invite removed","time_read":"Read Time","days_visited":"Days Visited","account_age_days":"Account age in days"},"password":{"title":"Password","too_short":"Your password is too short.","ok":"Your password looks good."},"ip_address":{"title":"Last IP Address"},"avatar":{"title":"Avatar","instructions":"We use <a href='https://gravatar.com' target='_blank'>Gravatar</a> for avatars based on your email"},"filters":{"all":"All"},"stream":{"posted_by":"Posted by","sent_by":"Sent by","private_message":"private message","the_topic":"the topic"}},"loading":"Loading...","close":"Close","learn_more":"learn more...","year":"year","year_desc":"topics posted in the last 365 days","month":"month","month_desc":"topics posted in the last 30 days","week":"week","week_desc":"topics posted in the last 7 days","first_post":"First post","mute":"Mute","unmute":"Unmute","best_of":{"title":"Best Of","enabled_description":"You are currently viewing the \"Best Of\" view of this topic.","description":"There are <b>{{count}}</b> posts in this topic. That's a lot! Would you like to save time by showing only the best posts?","enable":"Switch to \"Best Of\" view","disable":"Cancel \"Best Of\""},"private_message_info":{"title":"Private Message","invite":"Invite Others..."},"email":"Email","username":"Username","last_seen":"Last Seen","created":"Created","trust_level":"Trust Level","create_account":{"title":"Create Account","action":"Create one now!","invite":"Don't have an account yet?","failed":"Something went wrong, perhaps this email is already registered, try the forgot password link"},"forgot_password":{"title":"Forgot Password","action":"I forgot my password","invite":"Enter your username or email address, and we'll send you a password reset email.","reset":"Reset Password","complete":"You should receive an email with instructions on how to reset your password shortly."},"login":{"title":"Log In","username":"Login","password":"Password","email_placeholder":"email address or username","error":"Unknown error","reset_password":"Reset Password","logging_in":"Logging In...","or":"Or","authenticating":"Authenticating...","awaiting_confirmation":"Your account is awaiting activation, use the forgot password link to issue another activation email.","awaiting_approval":"Your account has not been approved by a moderator yet. You will receive an email when it is approved.","not_activated":"You can't log in yet. We previously sent an activation email to you at <b>{{sentTo}}</b>. Please follow the instructions in that email to activate your account.","resend_activation_email":"Click here to send the activation email again.","sent_activation_email_again":"We sent another activation email to you at <b>{{currentEmail}}</b>. It might take a few minutes for it to arrive; be sure to check your spam folder.","google":{"title":"with Google","message":"Authenticating with Google (make sure pop up blockers are not enabled)"},"twitter":{"title":"with Twitter","message":"Authenticating with Twitter (make sure pop up blockers are not enabled)"},"facebook":{"title":"with Facebook","message":"Authenticating with Facebook (make sure pop up blockers are not enabled)"},"cas":{"title":"Log In with CAS","message":"Authenticating with CAS (make sure pop up blockers are not enabled)"},"yahoo":{"title":"with Yahoo","message":"Authenticating with Yahoo (make sure pop up blockers are not enabled)"},"github":{"title":"with GitHub","message":"Authenticating with GitHub (make sure pop up blockers are not enabled)"},"persona":{"title":"with Persona","message":"Authenticating with Mozilla Persona (make sure pop up blockers are not enabled)"}},"composer":{"posting_not_on_topic":"You are replying to the topic \"{{title}}\", but you are currently viewing a different topic.","saving_draft_tip":"saving","saved_draft_tip":"saved","saved_local_draft_tip":"saved locally","similar_topics":"Your topic is similar to...","drafts_offline":"drafts offline","min_length":{"need_more_for_title":"{{n}} to go for the title","need_more_for_reply":"{{n}} to go for the reply"},"error":{"title_missing":"Title is required.","title_too_short":"Title must be at least {{min}} characters long.","title_too_long":"Title must be less than {{max}} characters long.","post_missing":"Post can't be empty.","post_length":"Post must be at least {{min}} characters long.","category_missing":"You must choose a category."},"save_edit":"Save Edit","reply_original":"Reply on Original Topic","reply_here":"Reply Here","reply":"Reply","cancel":"Cancel","create_topic":"Create Topic","create_pm":"Create Private Message","users_placeholder":"Add a user","title_placeholder":"Type your title here. What is this discussion about in one brief sentence?","reply_placeholder":"Type here. Use Markdown or BBCode to format. Drag or paste an image to upload it.","view_new_post":"View your new post.","saving":"Saving...","saved":"Saved!","saved_draft":"You have a post draft in progress. Click anywhere in this box to resume editing.","uploading":"Uploading...","show_preview":"show preview &raquo;","hide_preview":"&laquo; hide preview","quote_post_title":"Quote whole post","bold_title":"Strong","bold_text":"strong text","italic_title":"Emphasis","italic_text":"emphasized text","link_title":"Hyperlink","link_description":"enter link description here","link_dialog_title":"Insert Hyperlink","link_optional_text":"optional title","quote_title":"Blockquote","quote_text":"Blockquote","code_title":"Code Sample","code_text":"enter code here","image_title":"Image","image_description":"enter image description here","image_dialog_title":"Insert Image","image_optional_text":"optional title","image_hosting_hint":"Need <a href='http://www.google.com/search?q=free+image+hosting' target='_blank'>free image hosting?</a>","olist_title":"Numbered List","ulist_title":"Bulleted List","list_item":"List item","heading_title":"Heading","heading_text":"Heading","hr_title":"Horizontal Rule","undo_title":"Undo","redo_title":"Redo","help":"Markdown Editing Help","toggler":"hide or show the composer panel","admin_options_title":"Optional staff settings for this topic","auto_close_label":"Auto-close topic after:","auto_close_units":"days"},"notifications":{"title":"notifications of @name mentions, replies to your posts and topics, private messages, etc","none":"You have no notifications right now.","more":"view older notifications","mentioned":"<span title='mentioned' class='icon'>@</span> {{username}} {{link}}","quoted":"<i title='quoted' class='icon icon-quote-right'></i> {{username}} {{link}}","replied":"<i title='replied' class='icon icon-reply'></i> {{username}} {{link}}","posted":"<i title='replied' class='icon icon-reply'></i> {{username}} {{link}}","edited":"<i title='edited' class='icon icon-pencil'></i> {{username}} {{link}}","liked":"<i title='liked' class='icon icon-heart'></i> {{username}} {{link}}","private_message":"<i class='icon icon-envelope-alt' title='private message'></i> {{username}} {{link}}","invited_to_private_message":"<i class='icon icon-envelope-alt' title='private message'></i> {{username}} {{link}}","invitee_accepted":"<i title='accepted your invitation' class='icon icon-signin'></i> {{username}} accepted your invitation","moved_post":"<i title='moved post' class='icon icon-arrow-right'></i> {{username}} moved to {{link}}","total_flagged":"total flagged posts"},"image_selector":{"title":"Insert Image","from_my_computer":"From My Device","from_the_web":"From The Web","add_image":"Add Image","remote_title":"remote image","remote_tip":"enter address of an image in the form http://example.com/image.jpg","local_title":"local image","local_tip":"click to select an image from your device.","upload":"Upload","uploading_image":"Uploading image"},"search":{"title":"search for topics, posts, users, or categories","placeholder":"type your search terms here","no_results":"No results found.","searching":"Searching ...","prefer":{"user":"search will prefer results by @{{username}}","category":"search will prefer results in {{category}}"}},"site_map":"go to another topic list or category","go_back":"go back","current_user":"go to your user page","favorite":{"title":"Favorite","help":{"star":"add this topic to your favorites list","unstar":"remove this topic from your favorites list"}},"topics":{"none":{"favorited":"You haven't favorited any topics yet. To favorite a topic, click or tap the star next to the title.","unread":"You have no unread topics to read.","new":"You have no new topics to read.","read":"You haven't read any topics yet.","posted":"You haven't posted in any topics yet.","latest":"There are no latest topics. That's sad.","hot":"There are no hot topics.","category":"There are no {{category}} topics."},"bottom":{"latest":"There are no more latest topics to read.","hot":"There are no more hot topics to read.","posted":"There are no more posted topics to read.","read":"There are no more read topics to read.","new":"There are no more new topics to read.","unread":"There are no more unread topics to read.","favorited":"There are no more favorited topics to read.","category":"There are no more {{category}} topics."}},"rank_details":{"toggle":"toggle topic rank details","show":"show topic rank details","title":"Topic Rank Details"},"topic":{"create_in":"Create {{categoryName}} Topic","create":"Create Topic","create_long":"Create a new Topic","private_message":"Start a private message","list":"Topics","new":"new topic","title":"Topic","loading_more":"Loading more Topics...","loading":"Loading topic...","invalid_access":{"title":"Topic is private","description":"Sorry, you don't have access to that topic!"},"server_error":{"title":"Topic failed to load","description":"Sorry, we couldn't load that topic, possibly due to a connection problem. Please try again. If the problem persists, let us know."},"not_found":{"title":"Topic not found","description":"Sorry, we couldn't find that topic. Perhaps it was removed by a moderator?"},"unread_posts":"you have {{unread}} unread old posts in this topic","new_posts":"there are {{new_posts}} new posts in this topic since you last read it","likes":{"one":"there is 1 like in this topic","other":"there are {{count}} likes in this topic"},"back_to_list":"Back to Topic List","options":"Topic Options","show_links":"show links within this topic","toggle_information":"toggle topic details","read_more_in_category":"Want to read more? Browse other topics in {{catLink}} or {{latestLink}}.","read_more":"Want to read more? {{catLink}} or {{latestLink}}.","browse_all_categories":"Browse all categories","view_latest_topics":"view latest topics","suggest_create_topic":"Why not create a topic?","read_position_reset":"Your read position has been reset.","jump_reply_up":"jump to earlier reply","jump_reply_down":"jump to later reply","deleted":"The topic has been deleted","auto_close_notice":"This topic will automatically close %{timeLeft}.","auto_close_title":"Auto-Close Settings","auto_close_save":"Save","auto_close_cancel":"Cancel","auto_close_remove":"Don't Auto-Close This Topic","progress":{"title":"topic progress","jump_top":"jump to first post","jump_bottom":"jump to last post","total":"total posts","current":"current post"},"notifications":{"title":"","reasons":{"3_2":"You will receive notifications because you are watching this topic.","3_1":"You will receive notifications because you created this topic.","3":"You will receive notifications because you are watching this topic.","2_4":"You will receive notifications because you posted a reply to this topic.","2_2":"You will receive notifications because you are tracking this topic.","2":"You will receive notifications because you <a href=\"/users/{{username}}/preferences\">read this topic</a>.","1":"You will be notified only if someone mentions your @name or replies to your post.","1_2":"You will be notified only if someone mentions your @name or replies to your post.","0":"You are ignoring all notifications on this topic.","0_2":"You are ignoring all notifications on this topic."},"watching":{"title":"Watching","description":"same as Tracking, plus you will be notified of all new posts."},"tracking":{"title":"Tracking","description":"you will be notified of @name mentions and replies to your posts, plus you will see a count of unread and new posts."},"regular":{"title":"Regular","description":"you will be notified only if someone mentions your @name or replies to your post."},"muted":{"title":"Muted","description":"you will not be notified of anything about this topic, and it will not appear on your unread tab."}},"actions":{"delete":"Delete Topic","open":"Open Topic","close":"Close Topic","auto_close":"Auto Close","unpin":"Un-Pin Topic","pin":"Pin Topic","unarchive":"Unarchive Topic","archive":"Archive Topic","invisible":"Make Invisible","visible":"Make Visible","reset_read":"Reset Read Data","multi_select":"Select for Merge/Split","convert_to_topic":"Convert to Regular Topic"},"reply":{"title":"Reply","help":"begin composing a reply to this topic"},"clear_pin":{"title":"Clear pin","help":"Clear the pinned status of this topic so it no longer appears at the top of your topic list"},"share":{"title":"Share","help":"share a link to this topic"},"inviting":"Inviting...","invite_private":{"title":"Invite to Private Message","email_or_username":"Invitee's Email or Username","email_or_username_placeholder":"email address or username","action":"Invite","success":"Thanks! We've invited that user to participate in this private message.","error":"Sorry, there was an error inviting that user."},"invite_reply":{"title":"Invite Friends to Reply","action":"Email Invite","help":"send invitations to friends so they can reply to this topic with a single click","email":"We'll send your friend a brief email allowing them to reply to this topic by clicking a link.","email_placeholder":"email address","success":"Thanks! We mailed out an invitation to <b>{{email}}</b>. We'll let you know when they redeem your invitation. Check the invitations tab on your user page to keep track of who you've invited.","error":"Sorry, we couldn't invite that person. Perhaps they are already a user?"},"login_reply":"Log In to Reply","filters":{"user":"You're viewing only {{n_posts}} {{by_n_users}}.","n_posts":{"one":"1 post","other":"{{count}} posts"},"by_n_users":{"one":"made by 1 specific user","other":"made by {{count}} specific users"},"best_of":"You're viewing the {{n_best_posts}} {{of_n_posts}}.","n_best_posts":{"one":"1 best post","other":"{{count}} best posts"},"of_n_posts":{"one":"of 1 in the topic","other":"of {{count}} in the topic"},"cancel":"Show all posts in this topic again."},"split_topic":{"title":"Split Topic","action":"split topic","topic_name":"New Topic Name:","error":"There was an error splitting that topic.","instructions":{"one":"You are about to create a new topic and populate it with the post you've selected.","other":"You are about to create a new topic and populate it with the <b>{{count}}</b> posts you've selected."}},"merge_topic":{"title":"Merge Topic","action":"merge topic","error":"There was an error merging that topic.","instructions":{"one":"Please choose the topic you'd like to move that post to.","other":"Please choose the topic you'd like to move those <b>{{count}}</b> posts to."}},"multi_select":{"select":"select","selected":"selected ({{count}})","delete":"delete selected","cancel":"cancel selecting","description":{"one":"You have selected <b>1</b> post.","other":"You have selected <b>{{count}}</b> posts."}}},"post":{"reply":"Replying to {{link}} by {{replyAvatar}} {{username}}","reply_topic":"Reply to {{link}}","quote_reply":"quote reply","edit":"Editing {{link}} by {{replyAvatar}} {{username}}","post_number":"post {{number}}","in_reply_to":"in reply to","reply_as_new_topic":"Reply as new Topic","continue_discussion":"Continuing the discussion from {{postLink}}:","follow_quote":"go to the quoted post","deleted_by_author":"(post removed by author)","expand_collapse":"expand/collapse","has_replies":{"one":"Reply","other":"Replies"},"errors":{"create":"Sorry, there was an error creating your post. Please try again.","edit":"Sorry, there was an error editing your post. Please try again.","upload":"Sorry, there was an error uploading that file. Please try again.","upload_too_large":"Sorry, the file you are trying to upload is too big (maximum size is {{max_size_kb}}kb), please resize it and try again.","upload_too_many_images":"Sorry, you can only upload one image at a time.","only_images_are_supported":"Sorry, you can only upload images."},"abandon":"Are you sure you want to abandon your post?","archetypes":{"save":"Save Options"},"controls":{"reply":"begin composing a reply to this post","like":"like this post","edit":"edit this post","flag":"flag this post for attention or send a notification about it","delete":"delete this post","undelete":"undelete this post","share":"share a link to this post","bookmark":"bookmark this post to your user page","more":"More"},"actions":{"flag":"Flag","clear_flags":{"one":"Clear flag","other":"Clear flags"},"it_too":{"off_topic":"Flag it too","spam":"Flag it too","inappropriate":"Flag it too","custom_flag":"Flag it too","bookmark":"Bookmark it too","like":"Like it too","vote":"Vote for it too"},"undo":{"off_topic":"Undo flag","spam":"Undo flag","inappropriate":"Undo flag","bookmark":"Undo bookmark","like":"Undo like","vote":"Undo vote"},"people":{"off_topic":"{{icons}} marked this as off-topic","spam":"{{icons}} marked this as spam","inappropriate":"{{icons}} marked this as inappropriate","notify_moderators":"{{icons}} notified moderators","notify_moderators_with_url":"{{icons}} <a href='{{postUrl}}'>notified moderators</a>","notify_user":"{{icons}} sent a private message","notify_user_with_url":"{{icons}} sent a <a href='{{postUrl}}'>private message</a>","bookmark":"{{icons}} bookmarked this","like":"{{icons}} liked this","vote":"{{icons}} voted for this"},"by_you":{"off_topic":"You flagged this as off-topic","spam":"You flagged this as spam","inappropriate":"You flagged this as inappropriate","notify_moderators":"You flagged this for moderation","notify_user":"You sent a private message to this user","bookmark":"You bookmarked this post","like":"You liked this","vote":"You voted for this post"},"by_you_and_others":{"off_topic":{"one":"You and 1 other flagged this as off-topic","other":"You and {{count}} other people flagged this as off-topic"},"spam":{"one":"You and 1 other flagged this as spam","other":"You and {{count}} other people flagged this as spam"},"inappropriate":{"one":"You and 1 other flagged this as inappropriate","other":"You and {{count}} other people flagged this as inappropriate"},"notify_moderators":{"one":"You and 1 other flagged this for moderation","other":"You and {{count}} other people flagged this for moderation"},"notify_user":{"one":"You and 1 other sent a private message to this user","other":"You and {{count}} other people sent a private message to this user"},"bookmark":{"one":"You and 1 other bookmarked this post","other":"You and {{count}} other people bookmarked this post"},"like":{"one":"You and 1 other liked this","other":"You and {{count}} other people liked this"},"vote":{"one":"You and 1 other voted for this post","other":"You and {{count}} other people voted for this post"}},"by_others":{"off_topic":{"one":"1 person flagged this as off-topic","other":"{{count}} people flagged this as off-topic"},"spam":{"one":"1 person flagged this as spam","other":"{{count}} people flagged this as spam"},"inappropriate":{"one":"1 person flagged this as inappropriate","other":"{{count}} people flagged this as inappropriate"},"notify_moderators":{"one":"1 person flagged this for moderation","other":"{{count}} people flagged this for moderation"},"notify_user":{"one":"1 person sent a private message to this user","other":"{{count}} sent a private message to this user"},"bookmark":{"one":"1 person bookmarked this post","other":"{{count}} people bookmarked this post"},"like":{"one":"1 person liked this","other":"{{count}} people liked this"},"vote":{"one":"1 person voted for this post","other":"{{count}} people voted for this post"}}},"edits":{"one":"1 edit","other":"{{count}} edits","zero":"no edits"},"delete":{"confirm":{"one":"Are you sure you want to delete that post?","other":"Are you sure you want to delete all those posts?"}}},"category":{"none":"(no category)","edit":"edit","edit_long":"Edit Category","edit_uncategorized":"Edit Uncategorized","view":"View Topics in Category","general":"General","settings":"Settings","delete":"Delete Category","create":"Create Category","save":"Save Category","creation_error":"There has been an error during the creation of the category.","save_error":"There was an error saving the category.","more_posts":"view all {{posts}}...","name":"Category Name","description":"Description","topic":"category topic","badge_colors":"Badge colors","background_color":"Background color","foreground_color":"Foreground color","name_placeholder":"Should be short and succinct.","color_placeholder":"Any web color","delete_confirm":"Are you sure you want to delete this category?","delete_error":"There was an error deleting the category.","list":"List Categories","no_description":"There is no description for this category.","change_in_category_topic":"Edit Description","hotness":"Hotness","already_used":"This color has been used by another category","is_secure":"Secure category?","add_group":"Add Group","security":"Security","allowed_groups":"Allowed Groups:","auto_close_label":"Auto-close topics after:"},"flagging":{"title":"Why are you flagging this post?","action":"Flag Post","take_action":"Take Action","notify_action":"Notify","cant":"Sorry, you can't flag this post at this time.","custom_placeholder_notify_user":"Why does this post require you to speak to this user directly and privately? Be specific, be constructive, and always be kind.","custom_placeholder_notify_moderators":"Why does this post require moderator attention? Let us know specifically what you are concerned about, and provide relevant links where possible.","custom_message":{"at_least":"enter at least {{n}} characters","more":"{{n}} to go...","left":"{{n}} remaining"}},"topic_summary":{"title":"Topic Summary","links_shown":"show all {{totalLinks}} links...","clicks":"clicks","topic_link":"topic link"},"topic_statuses":{"locked":{"help":"this topic is closed; it no longer accepts new replies"},"pinned":{"help":"this topic is pinned; it will display at the top of its category"},"archived":{"help":"this topic is archived; it is frozen and cannot be changed"},"invisible":{"help":"this topic is invisible; it will not be displayed in topic lists, and can only be accessed via a direct link"}},"posts":"Posts","posts_long":"{{number}} posts in this topic","original_post":"Original Post","views":"Views","replies":"Replies","views_long":"this topic has been viewed {{number}} times","activity":"Activity","likes":"Likes","top_contributors":"Participants","category_title":"Category","history":"History","changed_by":"by {{author}}","categories_list":"Categories List","filters":{"latest":{"title":"Latest","help":"the most recent topics"},"hot":{"title":"Hot","help":"a selection of the hottest topics"},"favorited":{"title":"Favorited","help":"topics you marked as favorites"},"read":{"title":"Read","help":"topics you've read, in the order that you last read them"},"categories":{"title":"Categories","title_in":"Category - {{categoryName}}","help":"all topics grouped by category"},"unread":{"title":{"zero":"Unread","one":"Unread (1)","other":"Unread ({{count}})"},"help":"tracked topics with unread posts"},"new":{"title":{"zero":"New","one":"New (1)","other":"New ({{count}})"},"help":"new topics since your last visit"},"posted":{"title":"My Posts","help":"topics you have posted in"},"category":{"title":{"zero":"{{categoryName}}","one":"{{categoryName}} (1)","other":"{{categoryName}} ({{count}})"},"help":"latest topics in the {{categoryName}} category"}},"browser_update":"Unfortunately, <a href=\"http://www.discourse.org/faq/#browser\">your browser is too old to work on this Discourse forum</a>. Please <a href=\"http://browsehappy.com\">upgrade your browser</a>.","type_to_filter":"type to filter...","admin":{"title":"Discourse Admin","moderator":"Moderator","dashboard":{"title":"Dashboard","version":"Version","up_to_date":"You're up to date!","critical_available":"A critical update is available.","updates_available":"Updates are available.","please_upgrade":"Please upgrade!","installed_version":"Installed","latest_version":"Latest","problems_found":"Some problems have been found with your installation of Discourse:","last_checked":"Last checked","refresh_problems":"Refresh","no_problems":"No problems were found.","moderators":"Moderators:","admins":"Admins:","private_messages_short":"PMs","private_messages_title":"Private Messages","reports":{"today":"Today","yesterday":"Yesterday","last_7_days":"Last 7 Days","last_30_days":"Last 30 Days","all_time":"All Time","7_days_ago":"7 Days Ago","30_days_ago":"30 Days Ago","all":"All","view_table":"View as Table","view_chart":"View as Bar Chart"}},"commits":{"latest_changes":"Latest changes: please update often!","by":"by"},"flags":{"title":"Flags","old":"Old","active":"Active","clear":"Clear Flags","clear_title":"dismiss all flags on this post (will unhide hidden posts)","delete":"Delete Post","delete_title":"delete post (if its the first post delete topic)","flagged_by":"Flagged by","error":"Something went wrong","view_message":"view message"},"groups":{"title":"Groups","edit":"Edit Groups","selector_placeholder":"add users","name_placeholder":"Group name, no spaces, same as username rule"},"api":{"title":"API","long_title":"API Information","key":"Key","generate":"Generate API Key","regenerate":"Regenerate API Key","info_html":"Your API key will allow you to create and update topics using JSON calls.","note_html":"Keep this key <strong>secret</strong>, all users that have it may create arbitrary posts on the forum as any user."},"customize":{"title":"Customize","long_title":"Site Customizations","header":"Header","css":"Stylesheet","override_default":"Do not include standard style sheet","enabled":"Enabled?","preview":"preview","undo_preview":"undo preview","save":"Save","new":"New","new_style":"New Style","delete":"Delete","delete_confirm":"Delete this customization?","about":"Site Customization allow you to modify stylesheets and headers on the site. Choose or add one to start editing."},"email_logs":{"title":"Email","sent_at":"Sent At","email_type":"Email Type","to_address":"To Address","test_email_address":"email address to test","send_test":"send test email","sent_test":"sent!"},"impersonate":{"title":"Impersonate User","username_or_email":"Username or Email of User","help":"Use this tool to impersonate a user account for debugging purposes.","not_found":"That user can't be found.","invalid":"Sorry, you may not impersonate that user."},"users":{"title":"Users","create":"Add Admin User","last_emailed":"Last Emailed","not_found":"Sorry, that username doesn't exist in our system.","new":"New","active":"Active","pending":"Pending","approved":"Approved?","approved_selected":{"one":"approve user","other":"approve users ({{count}})"},"titles":{"active":"Active Users","new":"New Users","pending":"Users Pending Review","newuser":"Users at Trust Level 0 (New User)","basic":"Users at Trust Level 1 (Basic User)","regular":"Users at Trust Level 2 (Regular User)","leader":"Users at Trust Level 3 (Leader)","elder":"Users at Trust Level 4 (Elder)","admins":"Admin Users","moderators":"Moderators"}},"user":{"ban_failed":"Something went wrong banning this user {{error}}","unban_failed":"Something went wrong unbanning this user {{error}}","ban_duration":"How long would you like to ban the user for? (days)","delete_all_posts":"Delete all posts","ban":"Ban","unban":"Unban","banned":"Banned?","moderator":"Moderator?","admin":"Admin?","blocked":"Blocked?","show_admin_profile":"Admin","refresh_browsers":"Force browser refresh","show_public_profile":"Show Public Profile","impersonate":"Impersonate","revoke_admin":"Revoke Admin","grant_admin":"Grant Admin","revoke_moderation":"Revoke Moderation","grant_moderation":"Grant Moderation","unblock":"Unblock","block":"Block","reputation":"Reputation","permissions":"Permissions","activity":"Activity","like_count":"Likes Received","private_topics_count":"Private Topics Count","posts_read_count":"Posts Read","post_count":"Posts Created","topics_entered":"Topics Entered","flags_given_count":"Flags Given","flags_received_count":"Flags Received","approve":"Approve","approved_by":"approved by","time_read":"Read Time","delete":"Delete User","delete_forbidden":"This user can't be deleted because there are posts. Delete all this user's posts first.","delete_confirm":"Are you SURE you want to permanently delete this user from the site? This action is permanent!","deleted":"The user was deleted.","delete_failed":"There was an error deleting that user. Make sure all posts are deleted before trying to delete the user.","send_activation_email":"Send Activation Email","activation_email_sent":"An activation email has been sent.","send_activation_email_failed":"There was a problem sending another activation email.","activate":"Activate Account","activate_failed":"There was a problem activating the user.","deactivate_account":"Deactivate Account","deactivate_failed":"There was a problem deactivating the user.","unblock_failed":"There was a problem unblocking the user.","block_failed":"There was a problem blocking the user.","block_explanation":"A blocked user can't post or start topics."},"site_content":{"none":"Choose a type of content to begin editing.","title":"Content","edit":"Edit Site Content"},"site_settings":{"show_overriden":"Only show overridden","title":"Settings","reset":"reset to default"}}}}};
I18n.locale = 'en'
;
