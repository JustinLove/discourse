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
MessageFormat.locale.nl = function ( n ) {
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
    })({"topic.read_more_in_category_MF" : function(){ return "Invalid Format: Plural Function not found for locale: nl";} , "topic.read_more_MF" : function(){ return "Invalid Format: Plural Function not found for locale: nl";}});I18n.translations = {"nl":{"js":{"share":{"topic":"Deel een link naar deze topic","post":"Deel een link naar dit bericht","close":"sluit","twitter":"deel deze link op Twitter","facebook":"deel deze link op Facebook","google+":"deel deze link op Google+","email":"deel deze link via e-mail"},"edit":"bewerk de titel en categorie van deze topic","not_implemented":"Deze functie is helaas nog niet beschikbaar, sorry!","no_value":"Nee","yes_value":"Ja","of_value":"van","generic_error":"Sorry, er is iets fout gegaan.","log_in":"Log in","age":"Leeftijd","last_post":"Laatste bericht","admin_title":"Beheer","flags_title":"Meldingen","show_more":"meer...","links":"Links","faq":"FAQ","you":"Jij","or":"of","now":"zonet","read_more":"lees verder","in_n_seconds":{"one":"over 1 seconde","other":"over {{count}} secondes"},"in_n_minutes":{"one":"over 1 minuut","other":"over {{count}} minuten"},"in_n_hours":{"one":"over 1 uur","other":"over {{count}} uren"},"in_n_days":{"one":"over 1 dag","other":"over {{count}} dagen"},"suggested_topics":{"title":"Aanbevolen topics"},"bookmarks":{"not_logged_in":"Sorry, maar je moet ingelogd zijn om dit bericht aan je bladwijzers toe te kunnen voegen.","created":"Je hebt dit bericht aan je bladwijzers toegevoegd.","not_bookmarked":"Je hebt dit bericht gelezen; klik om deze aan je bladwijzers toe te voegen.","last_read":"Dit is het laatste bericht dat je gelezen hebt."},"new_topics_inserted":"{{count}} nieuwe topics.","show_new_topics":"Klik om te bekijken.","preview":"voorbeeld","cancel":"Annuleer","save":"Bewaar wijzigingen","saving":"Wordt opgeslagen...","saved":"Opgeslagen!","choose_topic":{"none_found":"Geen topics gevonden.","title":{"search":"Zoek naar een topic op naam, url of id:","placeholder":"typ hier de titel van de topic"}},"user_action":{"user_posted_topic":"<a href='{{userUrl}}'>{{user}}</a> plaatste <a href='{{topicUrl}}'>deze topic</a>","you_posted_topic":"<a href='{{userUrl}}'>Jij</a> plaatste <a href='{{topicUrl}}'>deze topic</a>","user_replied_to_post":"<a href='{{userUrl}}'>{{user}}</a> reageerde op <a href='{{postUrl}}'>{{post_number}}</a>","you_replied_to_post":"<a href='{{userUrl}}'>Jij</a> reageerde op <a href='{{postUrl}}'>{{post_number}}</a>","user_replied_to_topic":"<a href='{{userUrl}}'>{{user}}</a> reageerde op <a href='{{topicUrl}}'>the topic</a>","you_replied_to_topic":"<a href='{{userUrl}}'>Jij</a> reageerde op <a href='{{topicUrl}}'>the topic</a>","user_mentioned_user":"<a href='{{user1Url}}'>{{user}}</a> noemde <a href='{{user2Url}}'>{{another_user}}</a>","user_mentioned_you":"<a href='{{user1Url}}'>{{user}}</a> noemde <a href='{{user2Url}}'>jou</a>","you_mentioned_user":"<a href='{{user1Url}}'>Jij</a> noemde <a href='{{user2Url}}'>{{user}}</a>","posted_by_user":"Geplaatst door <a href='{{userUrl}}'>{{user}}</a>","posted_by_you":"Geplaatst door <a href='{{userUrl}}'>jou</a>","sent_by_user":"Verzonden door <a href='{{userUrl}}'>{{user}}</a>","sent_by_you":"Verzonden door <a href='{{userUrl}}'>jou</a>"},"user_action_groups":{"1":"Likes gegeven","2":"Likes ontvangen","3":"Bladwijzers","4":"Topics","5":"Antwoorden","6":"Reacties","7":"Genoemd","9":"Citaten","10":"Favorieten","11":"Wijzigingen","12":"Verzonden items","13":"Inbox"},"user":{"profile":"Profiel","title":"Lid","mute":"Negeer","edit":"Wijzig voorkeuren","download_archive":"download een archief van mijn berichten","private_message":"Priv\u00e9-bericht","private_messages":"Berichten","activity_stream":"Activiteit","preferences":"Voorkeuren","bio":"Over mij","invited_by":"Uitgenodigd door","trust_level":"Trustlevel","external_links_in_new_tab":"Open alle externe links in een nieuw tabblad","enable_quoting":"Activeer antwoord-met-citaat voor geselecteerde tekst","moderator":"{{user}} is een moderator","admin":"{{user}} is een admin","change_password":{"action":"wijzig","success":"(e-mail verzonden)","in_progress":"(e-mail wordt verzonden)","error":"(fout)"},"change_username":{"action":"wijzig","title":"Wijzig gebruikersnaam","confirm":"Het wijzigen van je gebruikersnaam kan consequenties hebben. Weet je zeker dat je dit wil doen?","taken":"Sorry, maar die gebruikersnaam is al in gebruik.","error":"Het veranderen van je gebruikersnaam is mislukt.","invalid":"Die gebruikersnaam is ongeldig. Gebruik alleen nummers en letters."},"change_email":{"action":"wijzig","title":"Wijzig e-mail","taken":"Sorry, dat e-mailadres is niet beschikbaar.","error":"Het veranderen van je e-mailadres is mislukt. Wellicht is deze al in gebruik?","success":"We hebben een mail gestuurd naar dat adres. Volg de bevestigingsinstructies in die mail."},"email":{"title":"E-mail","instructions":"Je e-mail adres zal nooit publieklijk zichtbaar zijn.","ok":"Prima. We zullen je een e-mail sturen ter bevestiging.","invalid":"Vul een geldig e-mailadres in.","authenticated":"Je e-mailadres is bevestigd door {{provider}}.","frequency":"We zullen je alleen maar mailen als we je een tijd niet gezien hebben, en als je toevallig hetgeen waarover we je mailen nog niet hebt gezien op onze site."},"name":{"title":"Naam","instructions":"De langere versie van je naam; die hoeft niet uniek te zijn.","too_short":"Je naam is te kort.","ok":"Wat een mooie naam!"},"username":{"title":"Gebruikersnaam","instructions":"Moet uniek zijn, geen spaties. Mensen kunnen naar je verwijzen als @{{username}}","short_instructions":"Mensen kunnen naar je verwijzen als @{{username}}.","available":"Je gebruikersnaam is beschikbaar.","global_match":"Je e-mailadres komt overeen met je geregistreerde gebruikersnaam.","global_mismatch":"Is al geregistreerd. Gebruikersnaam {{suggestion}} proberen?","not_available":"Niet beschikbaar. Gebruikersnaam {{suggestion}} proberen?","too_short":"Je gebruikersnaam is te kort.","too_long":"Je gebruikersnaam is te lang.","checking":"Beschikbaarheid controleren...","enter_email":"Gebruikersnaam gevonden. Vul het gekoppelde e-mailadres in."},"password_confirmation":{"title":"Nogmaals het wachtwoord"},"last_posted":"Laatste bericht","last_emailed":"Laatst gemailed","last_seen":"Laatst gezien","created":"Lid sinds","log_out":"Log uit","website":"Website","email_settings":"E-mail","email_digests":{"title":"Stuur me een mail met de laatste updates wanneer ik de site niet bezoek.","daily":"dagelijks","weekly":"wekelijks","bi_weekly":"elke twee weken"},"email_direct":"Ontvang een mail wanneer iemand je citeert, reageert op je bericht of je @gebruikersnaam noemt.","email_private_messages":"Ontvang een mail wanneer iemand je een priv\u00e9-bericht heeft gestuurd.","other_settings":"Overige","new_topic_duration":{"label":"Beschouw topics als nieuw wanneer","not_viewed":"ik ze nog heb niet bekeken","last_here":"ze geplaatst waren nadat ik hier voor het laatst was","after_n_days":{"one":"ze in de afgelopen dag geplaatst zijn","other":"ze de afgelopen {{count}} dagen geplaatst zijn"},"after_n_weeks":{"one":"ze in de afgelopen week geplaatst zijn","other":"ze in de afgelopen {{count}} weken geplaatst zijn"}},"auto_track_topics":"Houd automatisch topics bij die ik bezoek","auto_track_options":{"never":"nooit","always":"altijd","after_n_seconds":{"one":"na \u00e9\u00e9n seconde","other":"na {{count}} seconden"},"after_n_minutes":{"one":"na \u00e9\u00e9n minuut","other":"na {{count}} minuten"}},"invited":{"title":"Uitnodigingen","user":"Uitgenodigd lid","none":"{{username}} heeft nog geen mensen uitgenodigd voor deze site.","redeemed":"Verzilverde uitnodigingen","redeemed_at":"Verzilverd op","pending":"Uitstaande uitnodigingen","topics_entered":"Topics bezocht","posts_read_count":"Berichten gelezen","rescind":"Verwijder uitnodiging","rescinded":"Uitnodiging verwijderd","time_read":"Tijd gelezen","days_visited":"Dagen bezocht","account_age_days":"leeftijd van account in dagen"},"password":{"title":"Wachtwoord","too_short":"Je wachtwoord is te kort.","ok":"Je wachtwoord ziet er goed uit."},"ip_address":{"title":"Laatste IP-adres"},"avatar":{"title":"Profielfoto","instructions":"Wij gebruiken <a href='https://gravatar.com' target='_blank'>Gravatar</a> voor profielfoto's die aan je e-mailadres gekoppeld zijn"},"filters":{"all":"Alle"},"stream":{"posted_by":"Geplaatst door","sent_by":"Verzonden door","private_message":"priv\u00e9-bericht","the_topic":"de topic"}},"loading":"Laden...","close":"Sluit","learn_more":"leer meer...","year":"jaar","year_desc":"topics die in de afgelopen 365 dagen gepost zijn","month":"maand","month_desc":"topics die in de afgelopen 30 dagen gepost zijn","week":"week","week_desc":"topics die in de afgelopen 7 dagen gepost zijn","first_post":"Eerste bericht","mute":"Negeer","unmute":"Tonen","best_of":{"title":"Best of","enabled_description":"Je kijkt nu naar de 'Best of' van deze topic","description":"Er zijn <b>{{count}}</b> berichten in deze topic. Dat zijn een hoop! Zou je tijd willen besparen door alleen de berichten te zien met de meeste interactie en reacties?","enable":"Schakel naar 'Best of'-weergave","disable":"Schakel naar normale weergave"},"private_message_info":{"title":"Priv\u00e9-bericht","invite":"Nodig anderen uit..."},"email":"E-mail","username":"Gebruikersnaam","last_seen":"Laatst gezien","created":"Gemaakt op","trust_level":"Trustlevel","create_account":{"title":"Maak een account","action":"Maak er direct een!","invite":"Heb je nog geen account?","failed":"Er ging iets mis, wellicht is het e-mailadres al geregistreerd. Probeer de 'Wachtwoord vergeten'-link."},"forgot_password":{"title":"Wachtwoord vergeten","action":"Ik ben mijn wachtwoord vergeten","invite":"Vul je gebruikersnaam of e-mailadres in en we sturen je een wachtwoord-herstel-mail.","reset":"Herstel wachtwoord","complete":"Je zou binnenkort een mail moeten ontvangen met instructies hoe je je wachtwoord kan herstellen."},"login":{"title":"Log in","username":"Gebruikersnaam","password":"Wachtwoord","email_placeholder":"e-mailadres of gebruikersnaam","error":"Er is een onbekende fout opgetreden","reset_password":"Herstel wachtwoord","logging_in":"Inloggen...","or":"Of","authenticating":"Authenticatie...","awaiting_confirmation":"Je account is nog niet geactiveerd. Gebruik de 'Wachtwoord vergeten'-link om een nieuwe activatie-mail te ontvangen.","awaiting_approval":"Je account is nog niet goedgekeurd door een moderator. Je krijgt van ons een mail wanneer dat gebeurd is.","not_activated":"Je kan nog niet inloggen. We hebben je een activatie-mail gestuurd (naar <b>{{currentEmail}}</b>). Het kan een aantal minuten duren voor deze aan komt. Check ook je spamfolder.","resend_activation_email":"Klik hier om de activatiemail opnieuw te ontvangen.","sent_activation_email_again":"We hebben een nieuwe activatiemail gestuurd naar <b>{{currentEmail}}</b>. Het kan een aantal minuten duren voor deze aan komt. Check ook je spamfolder.","google":{"title":"met Google","message":"Authenticatie met Google (zorg ervoor dat je popup blocker uit staat)"},"twitter":{"title":"met Twitter","message":"Authenticatie met Twitter (zorg ervoor dat je popup blocker uit staat)"},"facebook":{"title":"met Facebook","message":"Authenticatie met Facebook (zorg ervoor dat je popup blocker uit staat)"},"cas":{"title":"met CAS","message":"Authenticatie met CAS (zorg ervoor dat je popup blocker uit staat)"},"yahoo":{"title":"met Yahoo","message":"Authenticatie met Yahoo (zorg ervoor dat je popup blocker uit staat)"},"github":{"title":"met Github","message":"Authenticatie met Github (zorg ervoor dat je popup blocker uit staat)"},"persona":{"title":"met Persona","message":"Authenticatie met Mozilla Persona (zorg ervoor dat je popup blocker uit staat)"}},"composer":{"posting_not_on_topic":"Je schrijft een antwoord in deze topic '{{title}}', maar je kijkt nu naar een ander topic.","saving_draft_tip":"wordt opgeslagen","saved_draft_tip":"opgeslagen","saved_local_draft_tip":"lokaal opgeslagen","similar_topics":"Jouw topic heeft overeenkomsten met...","drafts_offline":"concepten offline","min_length":{"need_more_for_title":"Nog {{n}} tekens nodig voor de titel","need_more_for_reply":"Nog {{n}} tekens nodig voor het antwoord"},"error":{"title_missing":"Je bent de titel vergeten.","title_too_short":"De titel moet tenminste {{min}} tekens bevatten.","title_too_long":"De titel mag maximaal {{max}} tekens bevatten.","post_missing":"Berichten kunnen niet leeg zijn.","post_length":"Berichten moeten tenminste {{min}} tekens bevatten.","category_missing":"Je hebt nog geen categorie gekozen."},"save_edit":"Bewaar wijzigingen","reply_original":"Reageer op oorspronkelijke topic","reply_here":"Reageer hier","reply":"Reageer","cancel":"Annuleer","create_topic":"Maak topic","create_pm":"Maak priv\u00e9-bericht","users_placeholder":"Voeg een lid toe","title_placeholder":"Typ hier je title. Beschrijf in \u00e9\u00e9n korte zin waar deze discussie over gaat.","reply_placeholder":"Typ hier. Gebruik Markdown of BBCode voor de tekstopmaak. Sleep of plak een afbeelding hierin om deze te uploaden.\"","view_new_post":"Bekijk je nieuwe bericht.","saving":"Opslaan...","saved":"Opgeslagen!","saved_draft":"Je hebt nog een conceptbericht open staan. Klik in dit veld om verder te gaan met bewerken.","uploading":"Uploaden...","show_preview":"laat voorbeeld zien &raquo;","hide_preview":"&laquo; verberg voorbeeld","quote_post_title":"Citeer hele bericht","bold_title":"Vet","bold_text":"Vetgedrukte tekst","italic_title":"Cursief","italic_text":"Cursieve tekst","link_title":"Hyperlink","link_description":"geef hier een omschrijving","link_dialog_title":"Voeg hyperlink toe","link_optional_text":"optionele titel","quote_title":"Citaat","quote_text":"Citaat","code_title":"Code voorbeeld","code_text":"hier de code","image_title":"Afbeelding","image_description":"geef een omschrijving voor de afbeelding op","image_dialog_title":"Voeg afbeelding toe","image_optional_text":"optionele titel","image_hosting_hint":"Heb je een <a href='http://www.google.com/search?q=free+image+hosting' target='_blank'>een gratis stek voor je afbeelding</a> nodig?","olist_title":"Genummerde lijst","ulist_title":"Lijst met bullets","list_item":"Lijstonderdeel","heading_title":"Kop","heading_text":"Kop","hr_title":"Horizontale lijn","undo_title":"Herstel","redo_title":"Opnieuw","help":"Hulp over Markdown","toggler":"verberg of toon de editor","admin_options_title":"Optionele stafinstellingen voor deze topic","auto_close_label":"Sluit topic automatisch na:","auto_close_units":"dagen"},"notifications":{"title":"notificaties van @naam vermeldingen, reacties op je berichten en topics, priv\u00e9-berichten, etc.","none":"Er zijn nu geen notificaties.","more":"bekijk oudere notificaties","mentioned":"<span title='genoemd' class='icon'>@</span> {{username}} {{link}}","quoted":"<i title='geciteerd' class='icon icon-quote-right'></i> {{username}} {{link}}","replied":"<i title='beantwoord' class='icon icon-reply'></i> {{username}} {{link}}","posted":"<i title='beantwoord' class='icon icon-reply'></i> {{username}} {{link}}","edited":"<i title='gewijzigd' class='icon icon-pencil'></i> {{username}} {{link}}","liked":"<i title='leuk' class='icon icon-heart'></i> {{username}} {{link}}","private_message":"<i class='icon icon-envelope-alt' title='priv\u00e9-bericht'></i> {{username}} {{link}}","invited_to_private_message":"<i class='icon icon-envelope-alt' title='priv\u00e9-bericht'></i> {{username}} {{link}}","invitee_accepted":"<i title='heeft je uitnodiging geaccepteerd' class='icon icon-signin'></i> {{username}} heeft je uitnodiging geaccepteerd en heeft zich ingeschreven om deel te nemen.","moved_post":"<i title='bericht verplaatst' class='icon icon-arrow-right'></i> {{username}} verplaatst naar {{link}}","total_flagged":"aantal gemarkeerde berichten"},"image_selector":{"title":"Voeg afbeelding toe","from_my_computer":"Vanaf mijn apparaat","from_the_web":"Vanaf het web","add_image":"Voeg afbeelding toe","remote_title":"externe afbeelding","remote_tip":"vul een internetadres in van een afbeelding in deze vorm: http://example.com/image.jpg","local_title":"lokale afbeelding","local_tip":"klik om een afbeelding vanaf je apparaat te selecteren.","upload":"Uploaden","uploading_image":"Afbeelding uploaden"},"search":{"title":"zoek naar topics, posts, leden of categori\u00eben","placeholder":"typ je zoekterm hier","no_results":"Geen resultaten gevonden.","searching":"Zoeken...","prefer":{"user":"er wordt voornamelijk gezocht naar berichten van @{{username}}","category":"er wordt voornamelijk gezocht naar berichten in categorie {{category}}"}},"site_map":"ga naar een andere topic-lijst of categorie","go_back":"ga terug","current_user":"ga naar je gebruikerspagina","favorite":{"title":"Favoriet","help":{"star":"Voeg deze topic toe aan je favorietenlijst","unstar":"Verwijder deze topic uit je favorietenlijst"}},"topics":{"none":{"favorited":"Je hebt nog geen topics tussen je favorieten staan. Om een topic toe te voegen, klik of druk op de ster naast de topictitel.","unread":"Je hebt geen ongelezen topics.","new":"Je hebt geen nieuwe topics om te lezen.","read":"Je hebt nog geen topics gelezen.","posted":"Je hebt nog niet in een topic gereageerd.","latest":"Er zijn geen populaire topics. Dat is jammer.","hot":"Er zijn geen polulaire topics.","category":"Er zijn geen topics in {{category}}"},"bottom":{"latest":"Er zijn geen recente topics om te lezen.","hot":"Er zijn geen polulaire topics meer om te lezen.","posted":"Er zijn geen geplaatste topics meer om te lezen.","read":"Er zijn geen gelezen topics meer om te lezen.","new":"Er zijn geen nieuwe topics meer om te lezen.","unread":"Er zijn geen ongelezen topics meer om te lezen.","favorited":"Er zijn geen favoriete topics meer om te lezen.","category":"Er zijn geen topics meer in {{category}} om te lezen"}},"rank_details":{"toggle":"schakel details topic rangorde aan/uit","show":"bekijk details topic rangorde","title":"Details topic rangorde"},"topic":{"create_in":"Maak een {{categoryName}} topic","create":"Maak topic","create_long":"Maak een nieuw topic","private_message":"Stuur een priv\u00e9-bericht","list":"Topics","new":"nieuw topic","title":"Topic","loading_more":"Er worden meer topics geladen...","loading":"Bezig met laden van topic...","invalid_access":{"title":"Topic is priv\u00e9","description":"Sorry, je hebt geen toegang tot deze topic."},"server_error":{"title":"Topic laden mislukt","description":"Sorry, we konden deze topic niet laden, waarschijnlijk door een verbindingsprobleem. Probeer het later opnieuw. Als het probleem blijft, laat het ons dan weten."},"not_found":{"title":"Topic niet gevonden","description":"Sorry, we konden de opgevraagde topic niet vinden. Wellicht is het verwijderd door een moderator?"},"unread_posts":"je hebt {{unread}} ongelezen posts in deze topic","new_posts":"er zijn {{new_posts}} nieuwe posts in deze topic sinds je dit voor het laatst gelezen hebt","likes":{"one":"er is \u00e9\u00e9n waardering in deze topic","other":"er zijn {{likes}} waarderingen in deze topic"},"back_to_list":"Terug naar topiclijst","options":"Topic opties","show_links":"laat links binnen deze topic zien","toggle_information":"Zet topic details aan/uit","read_more_in_category":"Wil je meer lezen? Kijk dan voor andere topics in {{catLink}} of {{latestLink}}.","read_more":"Wil je meer lezen? {{catLink}} of {{latestLink}}.","browse_all_categories":"Bekijk alle categorie\u00ebn","view_latest_topics":"bekijk populaire topics","suggest_create_topic":"Wil je een nieuwe topic schrijven?","read_position_reset":"Je leespositie is gereset.","jump_reply_up":"spring naar een eerdere reactie","jump_reply_down":"spring naar een latere reactie","deleted":"Deze topic is verwijderd","auto_close_notice":"Deze topic wordt automatisch over %{timeLeft} gesloten.","auto_close_title":"Instellingen voor automatisch sluiten","auto_close_save":"Opslaan","auto_close_cancel":"Annuleren","auto_close_remove":"Sluit deze topic niet automatisch","progress":{"title":"topic voortgang","jump_top":"spring naar eerste bericht","jump_bottom":"spring naar laatste bericht","total":"totaal aantal berichten","current":"huidige bericht"},"notifications":{"title":"","reasons":{"3_2":"Je ontvangt notificaties omdat je deze topic in de gaten houdt.","3_1":"Je ontvangt notificaties omdat jij deze topic gemaakt hebt.","3":"Je ontvangt notificaties omdat je deze topic in de gaten houdt.","2_4":"Je ontvangt notificaties omdat je een reactie aan deze topic hebt geplaatst.","2_2":"Je ontvangt notificaties omdat je deze topic volgt.","2":"Je ontvangt notificaties omdat je <a href=\"/users/{{username}}/preferences\">deze topic hebt gelezen</a>.","1":"Je krijgt alleen een notificatie als iemand je @naam noemt of reageert op je bericht.","1_2":"Je krijgt alleen een notificatie als iemand je @naam noemt of reageert op je bericht.","0":"Je negeert alle notificaties in deze topic.","0_2":"Je negeert alle notificaties in deze topic."},"watching":{"title":"In de gaten houden","description":"zelfde als 'volgen', plus dat je ook een notificatie krijgt van alle nieuwe berichten."},"tracking":{"title":"Volgen","description":"je krijgt een notificatie als je @naam genoemd wordt en wanneer er gereageerd wordt op je berichten. Daarnaast zie je een teller met ongelezen en nieuwe berichten."},"regular":{"title":"Normaal","description":"Je zal alleen een notificatie krijgen als iemand je @naam vermeldt of een reactie geeft op je berichten."},"muted":{"title":"Negeren","description":"je zal geen notificaties krijgen voor deze topic en het zal ook niet verschijnen in je 'ongelezen'-tab."}},"actions":{"delete":"Verwijder topic","open":"Open topic","close":"Sluit topic","auto_close":"Automatisch sluiten","unpin":"Ontpin topic","pin":"Pin topic","unarchive":"De-archiveer topic","archive":"Archiveer topic","invisible":"Maak onzichtbaar","visible":"Maak zichtbaar","reset_read":"Reset leesdata","multi_select":"Selecteer berichten voor samenvoegen/splitsen","convert_to_topic":"Zet om naar normale topic"},"reply":{"title":"Reageer","help":"Schrijf een reactie op deze topic"},"clear_pin":{"title":"Verwijder pin","help":"Annuleer de gepinde status van deze topic, zodat het niet langer bovenaan je topiclijst verschijnt."},"share":{"title":"Deel","help":"Deel een link naar deze topic"},"inviting":"Uitnodigen...","invite_private":{"title":"Stuur een priv\u00e9-bericht","email_or_username":"E-mail of gebruikersnaam van genodigde","email_or_username_placeholder":"e-mailadres of gebruikersnaam","action":"Uitnodigen","success":"Bedankt! We hebben deze persoon dit priv\u00e9-bericht gestuurd.","error":"Sorry, er is iets misgegaan bij het uitnodigen van deze persoon"},"invite_reply":{"title":"Nodig vrienden uit om te reageren","action":"Mail uitnodiging","help":"verstuur uitnodigingen naar vrienden zodat zij met \u00e9\u00e9n klik kunnen reageren op deze topic","email":"We zullen je vrienden een korte e-mail sturen waardoor zij op deze topic kunnen reageren door op een link te klikken.","email_placeholder":"e-mailadres","success":"Bedankt! We hebben een uitnodiging verstuurd naar <b>{{email}}</b>. We laten je direct weten wanneer ze je uitnodiging hebben geaccepteerd. Check de \"Uitnodigingen\"-tab op je gebruikerspagina om bij te houden wie je hebt uitgenodigd.","error":"Sorry, we kunnen deze persoon niet uitnodigen. Wellicht is deze al een lid op onze site?"},"login_reply":"Log in om te reageren","filters":{"user":"Je ziet momenteel alleen {{n_posts}} {{by_n_users}}.","n_posts":{"one":"\u00e9\u00e9n bericht","other":"{{count}} berichten"},"by_n_users":{"one":"van \u00e9\u00e9n specifiek lid","other":"van {{count}} specifieke leden"},"best_of":"Je ziet momenteel alleen {{n_best_posts}} {{of_n_posts}}","n_best_posts":{"one":"het enige 'Best of' bericht.","other":"de {{count}} 'Best of' berichten"},"of_n_posts":{"one":"","other":"van {{count}} in deze topic."},"cancel":"Laat alle posts in deze topic zien."},"split_topic":{"title":"Splits topic","action":"splits topic","topic_name":"Naam nieuwe topic:","error":"Er ging iets mis bij het splitsen van die topic.","instructions":{"one":"Je staat op het punt een nieuwe topic aan te maken en het te vullen met het bericht dat je geselecteerd hebt.","other":"Je staat op het punt een nieuwe topic aan te maken en het te vullen met de <b>{{count}}</b> berichten die je geselecteerd hebt."}},"merge_topic":{"title":"Voeg topic samen","action":"voeg topic samen","error":"There was an error merging that topic.","instructions":{"one":"Selecteer de topic waarnaar je het bericht wil verplaatsen.","other":"Selecteer de topic waarnaar je de <b>{{count}}</b> berichten wil verplaatsen."}},"multi_select":{"select":"selecteer","selected":"geselecteerd ({{count}})","delete":"verwijder geselecteerde","cancel":"annuleer selectie","description":{"one":"Je hebt <b>\u00e9\u00e9n</b> bericht geselecteerd.","other":"Je hebt <b>{{count}}</b> berichten geselecteerd."}}},"post":{"reply":"Je reageert nu op {{link}} door {{replyAvatar}} {{username}}","reply_topic":"Reageer op {{link}}","quote_reply":"citeer","edit":"Bewerk {{link}} door {{replyAvatar}} {{username}}","post_number":"bericht {{number}}","in_reply_to":"in reactie op","reply_as_new_topic":"Reageer in een nieuwe topic","continue_discussion":"Voortzetting van de discussie {{postLink}}:","follow_quote":"ga naar het geciteerde bericht","deleted_by_author":"(bericht verwijderd door de schrijver)","expand_collapse":"uit-/invouwen","has_replies":{"one":"Reactie","other":"Reacties"},"errors":{"create":"Sorry, er is iets misgegaan bij het plaatsen van je bericht. Probeer het nog eens.","edit":"Sorry, er is iets misgegaan bij het bewerken van je bericht. Probeer het nog eens.","upload":"Sorry, er is iets misgegaan bij het uploaden van je bestand. Probeer het nog eens.","upload_too_large":"Sorry, het bestand dat je wil uploaden is te groot (maximum grootte is {{max_size_kb}}kb), verklein het bestand en probeer het opnieuw.","upload_too_many_images":"Sorry, je kan maar \u00e9\u00e9n afbeelding tegelijk uploaden.","only_images_are_supported":"Sorry, je kan alleen afbeeldingen uploaden."},"abandon":"Weet je zeker dat je het schrijven van dit bericht wil afbreken?","archetypes":{"save":"Bewaar instellingen"},"controls":{"reply":"reageer op dit bericht","like":"vind dit bericht leuk","edit":"bewerk dit bericht","flag":"meld dit bericht of stuur er een notificatie over","delete":"verwijder dit bericht","undelete":"herstel dit bericht","share":"deel een link naar dit bericht","bookmark":"voeg dit bericht toe aan de bladwijzers op je gebruikerspagina","more":"Meer"},"actions":{"flag":"Markeer","clear_flags":{"one":"Verwijder markering","other":"Verwijder markeringen"},"it_too":{"off_topic":"Markeer het ook","spam":"Markeer het ook","inappropiate":"Markeer het ook","custom_flag":"Markeer het ook","bookmark":"Zet het ook in je favorieten","like":"Vind het ook leuk","vote":"Stem ook"},"undo":{"off_topic":"Verwijder markering","spam":"Verwijder markering","inappropiate":"Verwijder markering","bookmark":"Verwijder uit je favorieten","like":"Vind het niet meer leuk","vote":"Stem niet meer"},"people":{"off_topic":"{{icons}} markeerden dit als off-topic","spam":"{{icons}} markeerden dit als spam","inappropriate":"{{icons}} markeerden dit als ongepast","notify_moderators":"{{icons}} lichtte moderators in","notify_moderators_with_url":"{{icons}} <a href='{{postUrl}}'>lichtte moderators in</a>","notify_user":"{{icons}} verstuurde een priv\u00e9-bericht","notify_user_with_url":"{{icons}} verstuurde een <a href='{{postUrl}}'>priv\u00e9-bericht</a>","bookmark":"{{icons}} voegden dit toe aan hun favorieten","like":"{{icons}} vinden dit leuk","vote":"{{icons}} hebben hier op gestemd"},"by_you":{"off_topic":"Jij markeerde dit als off-topic","spam":"Jij markeerde dit als spam","inappropriate":"Jij markeerde dit als ongepast","notify_moderators":"Jij markeerde dit voor moderatie","notify_user":"Jij stuurde een priv\u00e9-bericht naar deze persoon","bookmark":"Jij voegde dit bericht toe aan je favorieten","like":"Jij vindt dit leuk","vote":"Jij hebt op dit bericht gestemd"},"by_you_and_others":{"off_topic":{"one":"Jij en iemand anders markeerden dit als off-topic","other":"Jij en {{count}} anderen markeerden dit als off-topic"},"spam":{"one":"Jij en iemand anders markeerden dit als spam","other":"Jij en {{count}} anderen markeerden dit als spam"},"inappropriate":{"one":"Jij en iemand anders markeerde dit als ongepast","other":"Jij en {{count}} anderen markeerden dit als ongepast"},"notify_moderators":{"one":"Jij en iemand anders markeerden dit voor moderatie","other":"Jij en {{count}} anderen markeerden dit voor moderatie"},"notify_user":{"one":"Jij en iemand anders stuurden een priv\u00e9-bericht naar deze persoon","other":"Jij en {{count}} anderen stuurden een priv\u00e9-bericht naar deze persoon"},"bookmark":{"one":"Jij en iemand anders voegden dit bericht toe aan de favorieten","other":"Jij en {{count}} anderen voegden dit bericht toe aan de favorieten"},"like":{"one":"Jij en iemand anders vinden dit leuk","other":"Jij en {{count}} anderen vinden dit leuk"},"vote":{"one":"Jij en iemand anders hebben op dit bericht gestemd","other":"Jij en {{count}} anderen hebben op dit bericht gestemd"}},"by_others":{"off_topic":{"one":"Iemand heeft dit bericht gemarkeerd als off-topic","other":"{{count}} Mensen hebben dit bericht gemarkeerd als off-topic"},"spam":{"one":"Iemand heeft dit bericht gemarkeerd als spam","other":"{{count}} Mensen hebben dit bericht gemarkeerd als spam"},"inappropriate":{"one":"Iemand heeft dit bericht gemarkeerd als ongepast ","other":"{{count}} Mensen hebben dit bericht gemarkeerd als ongepast"},"notify_moderators":{"one":"Iemand heeft dit bericht gemarkeerd voor moderatie","other":"{{count}} Mensen hebben dit bericht gemarkeerd voor moderatie"},"notify_user":{"one":"Iemand stuurde een priv\u00e9-bericht naar deze persoon","other":"{{count}} Mensen stuurden een priv\u00e9-bericht naar deze persoon"},"bookmark":{"one":"Iemand heeft dit bericht toegevoegd aan zijn favorieten","other":"{{count}} Mensen hebben dit bericht toegevoegd aan hun favorieten"},"like":{"one":"Iemand vindt dit leuk","other":"{{count}} Mensen vinden dit leuk"},"vote":{"one":"Iemand heeft op dit bericht gestemd","other":"{{count}} Mensen hebben op dit bericht gestemd"}}},"edits":{"one":"\u00e9\u00e9n bewerking","other":"{{count}} bewerkingen","zero":"geen bewerkingen"},"delete":{"confirm":{"one":"Weet je zeker dat je dit bericht wil verwijderen?","other":"Weet je zeker dat je al deze berichten wil verwijderen?"}}},"category":{"none":"(geen categorie)","edit":"bewerk","edit_long":"Bewerk categorie","edit_uncategorized":"Wijzig ongecategoriseerd","view":"Bekijk topics in categorie","general":"Algemeen","settings":"Instellingen","delete":"Verwijder categorie","create":"Maak categorie","save":"Bewaar categorie","creation_error":"Er ging bij het maken van de categorie iets mis.","save_error":"Er ging iets mis bij het opslaan van de categorie.","more_posts":"bekijk alle {{posts}}...","name":"Naam categorie","description":"Omschrijving","topic":"Onderwerp van de categorie","badge_colors":"badgekleuren","background_color":"achtergrondkleur","foreground_color":"voorgrondkleur","name_placeholder":"Moet kort en duidelijk zijn.","color_placeholder":"Kan elke web-kleur zijn","delete_confirm":"Weet je zeker dat je deze categorie wil verwijderen?","delete_error":"Er ging iets mis bij het verwijderen van deze categorie","list":"Lijst van categorie\u00ebn","no_description":"Er is geen omschrijving voor deze categorie","change_in_category_topic":"Wijzig omschrijving","hotness":"Populariteit","already_used":"Deze kleur is al in gebruik door een andere categorie","is_secure":"Categorie beveiligen?","add_group":"Voeg groep toe","security":"Beveiliging","allowed_groups":"Toegestane groepen:","auto_close_label":"Sluit topics automatisch na:"},"flagging":{"title":"Waarom meld je dit bericht voor moderatie?","action":"Meld bericht","notify_action":"Meld","cant":"Sorry, je kan dit bericht momenteel niet melden.","custom_placeholder_notify_user":"Wat maakt dat je de schrijver persoonlijk iets wil melden? Wees specifiek, constructief en altijd aardig.","custom_placeholder_notify_moderators":"Waarom heeft dit bericht aandacht van een moderator nodig? Laat ons specifiek weten waar je je zorgen om maakt en stuur relevante links mee waar mogelijk.","custom_message":{"at_least":"Gebruik ten minste {{n}} tekens","more":"Nog {{n}} te gaan...","left":"Nog {{n}} resterend"}},"topic_summary":{"title":"Topic samenvatting","links_shown":"laat alle {{totalLinks}} links zien...","clicks":"clicks","topic_link":"link naar topic"},"topic_statuses":{"locked":{"help":"deze topic is gesloten; nieuwe reacties worden niet langer geaccepteerd"},"pinned":{"help":"deze topic is gepind; het zal bovenaan de lijst van topics in zijn categorie staan."},"archived":{"help":"deze topic is gearchiveerd; het is bevroren en kan niet meer veranderd worden"},"invisible":{"help":"deze topic is onzichtbaar; het zal niet worden weergegeven in topiclijsten en kan alleen via een directe link bezocht worden"}},"posts":"Berichten","posts_long":"{{number}} berichten in deze topic","original_post":"Originele bericht","views":"Bekeken","replies":"Reacties","views_long":"deze topic is {{number}} keer bekeken","activity":"Activiteit","likes":"Leuk","top_contributors":"Deelnemers","category_title":"Categorie","history":"Geschiedenis","changed_by":"door {{author}}","categories_list":"Categorielijst","filters":{"latest":{"title":"Recent","help":"de meest recente topics"},"hot":{"title":"Populair","help":"een selectie van de meest populaire topics"},"favorited":{"title":"Favorieten","help":"topics die je als favoriet hebt ingesteld"},"read":{"title":"Gelezen","help":"topics die je hebt gelezen, in de volgorde wanneer je ze voor het laatst gelezen hebt"},"categories":{"title":"Categorie\u00ebn","title_in":"Categorie - {{categoryName}}","help":"alle topics gesorteerd op categorie"},"unread":{"title":{"zero":"Ongelezen","one":"Ongelezen (1)","other":"Ongelezen ({{count}})"},"help":"gevolgde topics met ongelezen berichten"},"new":{"title":{"zero":"Nieuw","one":"Nieuw (1)","other":"Nieuw ({{count}})"},"help":"nieuwe topics sinds je laatse bezoek"},"posted":{"title":"Mijn berichten","help":"topics waarin je een bericht hebt geplaatst"},"category":{"title":{"zero":"{{categoryName}}","one":"{{categoryName}} (1)","other":"{{categoryName}} ({{count}})"},"help":"recente topics in de categorie {{categoryName}}"}},"browser_update":"Helaas <a href=\"http://www.discourse.org/faq/#browser\">is je browser te oud om te kunnen werken met dit forum</a>. <a href=\"http://browsehappy.com\">Upgrade je browser</a>.","type_to_filter":"typ om te filteren...","admin":{"title":"Discourse Beheer","moderator":"Moderator","dashboard":{"title":"Dashboard","version":"versie","up_to_date":"Je bent up to date!","critical_available":"Er is een belangrijke update beschikbaar","updates_available":"Er zijn updates beschikbaar","please_upgrade":"Werk de software bij alsjeblieft","installed_version":"Ge\u00efnstalleerd","latest_version":"Recent","problems_found":"Er zijn een aantal problemen gevonden met je Discourse installatie:","last_checked":"Laatste check","refresh_problems":"Laad opnieuw","no_problems":"Er zijn geen problemen gevonden","moderators":"Moderators:","admins":"Admins:","private_messages_short":"PBs","private_messages_title":"Priv\u00e9-berichten","reports":{"today":"Vandaag","yesterday":"Gisteren","last_7_days":"Afgelopen 7 dagen","last_30_days":"Afgelopen 30 dagen","all_time":"Sinds het begin","7_days_ago":"7 Dagen geleden","30_days_ago":"30 Dagen geleden","all":"Alle","view_table":"Bekijk als tabel","view_chart":"Bekijk als staafdiagram"}},"commits":{"latest_changes":"Laatste wijzigingen: update regelmatig!","by":"door"},"flags":{"title":"Meldingen","old":"Oud","active":"Actief","clear":"Wis meldingen","clear_title":"verwijder alle meldingen over dit bericht (laat verborgen berichten weer zien)","delete":"Verwijder bericht","delete_title":"verwijder bericht (als het het eerste bericht is van een topic, verwijdert dit de topic)","flagged_by":"Gemarkeerd door","error":"Er ging iets mis","view_message":"bekijk bericht"},"groups":{"title":"Groepen","edit":"Wijzig groepen","selector_placeholder":"voeg leden toe","name_placeholder":"Groepsnaam, geen spaties, zelfde regels als bij een gebruikersnaam"},"api":{"title":"API","long_title":"API informatie","key":"Key","generate":"Genereer API Key","regenerate":"Genereer API Key opnieuw","info_html":"Met deze API key kun je met behulp van JSON calls topics maken en bewerken.","note_html":"Houd deze key <strong>geheim</strong>, gebruikers die deze key hebben kunnen zich als elke andere gebruiker voordoen op het forum en topics aanmaken."},"customize":{"title":"Aanpassingen","long_title":"Aanpassingen aan de site","header":"Header","css":"Stylesheet","override_default":"Sluit de standaard stylesheet uit","enabled":"Ingeschakeld?","preview":"voorbeeld","undo_preview":"herstel voorbeeld","save":"Opslaan","new":"Nieuw","new_style":"Nieuwe stijl","delete":"Verwijder","delete_confirm":"Verwijder deze aanpassing?","about":"Met aanpassingen aan de site kun je stylesheets en headers wijzigen. Kies of voeg een toe om te beginnen."},"email_logs":{"title":"E-mail","sent_at":"Verzonden op","email_type":"E-mailtype","to_address":"Ontvangeradres","test_email_address":"e-mailadres om te testen","send_test":"verstuur test e-mail","sent_test":"Verzonden!"},"impersonate":{"title":"Log in als gebruiker","username_or_email":"Gebruikersnaam of e-mailadres van gebruiker","help":"Gebruik dit hulpmiddel om in te loggen als een gebruiker voor debug-doeleinden.","not_found":"Die gebruiker kan niet gevonden worden.","invalid":"Sorry, maar als deze gebruiker mag je niet inloggen."},"users":{"title":"Leden","create":"Voeg beheerder toe","last_emailed":"laatste mail verstuurd naar","not_found":"Sorry, deze gebruikersnaam bestaat niet in ons systeem.","new":"Nieuw","active":"Actief","pending":"Te beoordelen","approved":"Goedgekeurd?","approved_selected":{"one":"accepteer lid","other":"accepteer {{count}} leden"},"titles":{"active":"Actieve leden","new":"Nieuwe leden","pending":"Nog niet geaccepteerde leden","newuser":"Leden met Trust Level 0 (Nieuw lid)","basic":"Leden met Trust Level 1 (Lid)","regular":"Leden met Trust Level 2 (Regulier lid)","leader":"Leden met Trust Level 3 (Leider)","elder":"Leden met Trust Level 4 (Stamoudste)","admins":"Administrators","moderators":"Moderators"}},"user":{"ban_failed":"Er ging iets fout met het blokkeren van deze gebruiker: {{error}}","unban_failed":"Er ging iets fout bij het deblokkeren van deze gebruiker: {{error}}","ban_duration":"Hoe lang wil je deze gebruiker blokkeren? (dagen)","delete_all_posts":"Verwijder alle berichten","ban":"Blokkeer","unban":"Deblokkeer","banned":"Geblokkeerd?","moderator":"Moderator?","admin":"Beheerder?","show_admin_profile":"Beheerder","refresh_browsers":"Forceer browser refresh","show_public_profile":"Bekijk openbaar profiel","impersonate":"Log in als gebruiker","revoke_admin":"Ontneem beheerdersrechten","grant_admin":"Geef Beheerdersrechten","revoke_moderation":"Ontneem modereerrechten","grant_moderation":"Geef modereerrechten","reputation":"Reputatie","permissions":"Toestemmingen","activity":"Activiteit","like_count":"Ontvangen 'Vind ik leuk'","private_topics_count":"Aantal priv\u00e9-topics","posts_read_count":"Berichten gelezen","post_count":"Berichten gemaakt","topics_entered":"Topics binnengegaan","flags_given_count":"Meldingen gedaan","flags_received_count":"Meldigen ontvangen","approve":"Accepteer","approved_by":"Geaccepteerd door","time_read":"Tijd gelezen","delete":"Verwijder gebruiker","delete_forbidden":"Deze gebruiker kan niet verwijderd worden omdat er berichten zijn. Verwijder eerst alle berichten van deze gebruiker.","delete_confirm":"Weet je zeker dat je deze gebruiker definitief wil verwijderen? Deze handeling is permanant!","deleted":"De gebruiker is verwijderd.","delete_failed":"Er ging iets mis bij het verwijderen van deze gebruiker. Zorg er voor dat alle berichten van deze gebruiker eerst verwijderd zijn.","send_activation_email":"Verstuur activatiemail","activation_email_sent":"Een activatiemail is verstuurd.","send_activation_email_failed":"Er ging iets mis bij het versturen van de activatiemail.","activate":"Activeer account","activate_failed":"Er ging iets mis bij het activeren van deze gebruiker.","deactivate_account":"Deactiveer account","deactivate_failed":"Er ging iets mis bij het deactiveren van deze gebruiker."},"site_content":{"none":"Selecteer een tekst om deze te bewerken","title":"Teksten","edit":"Bewerk teksten"},"site_settings":{"show_overriden":"Bekijk alleen bewerkte instellingen","title":"Instellingen","reset":"herstel naar standaardinstellingen"}}}}};
I18n.locale = 'nl'
;
