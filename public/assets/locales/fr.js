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
MessageFormat.locale.fr = function (n) {
  if (n >= 0 && n < 2) {
    return 'one';
  }
  return 'other';
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
    })({});I18n.translations = {"fr":{"js":{"share":{"topic":"partager un lien vers cette discussion","post":"partager un lien vers ce message","close":"fermer","twitter":"partager ce lien sur Twitter","facebook":"partager ce lien sur Facebook","google+":"partager ce lien sur Google+","email":"envoyer ce lien par email"},"edit":"\u00e9diter le titre et la cat\u00e9gorie de cette discussion","not_implemented":"Cette fonctionnalit\u00e9 n'a pas encore \u00e9t\u00e9 impl\u00e9ment\u00e9e, d\u00e9sol\u00e9.","no_value":"Non","yes_value":"Oui","of_value":"de","generic_error":"D\u00e9sol\u00e9, une erreur est survenue.","log_in":"Connexion","age":"\u00c2ge","last_post":"dernier message","admin_title":"Admin","flags_title":"Signalements","show_more":"afficher plus","links":"Liens","faq":"FAQ","you":"vous","or":"ou","now":"\u00e0 l'instant","read_more":"lire la suite","in_n_seconds":{"one":"dans 1 seconde","other":"dans {{count}} secondes"},"in_n_minutes":{"one":"dans 1 minute","other":"dans {{count}} minutes"},"in_n_hours":{"one":"dans 1 heure","other":"dans {{count}} heures"},"in_n_days":{"one":"dans 1 jour","other":"dans {{count}} jours"},"suggested_topics":{"title":"discussions propos\u00e9es"},"bookmarks":{"not_logged_in":"D\u00e9sol\u00e9 vous devez \u00eatre connect\u00e9 pour placer ce message dans vos signets.","created":"Vous avez plac\u00e9 ce message dans vos signets.","not_bookmarked":"Vous avez lu ce message; Cliquez pour le placer dans vos signets.","last_read":"Voici le dernier message que vous avez lu."},"new_topics_inserted":"{{count}} nouvelles discussions.","show_new_topics":"Cliquez pour afficher.","preview":"pr\u00e9visualiser","cancel":"annuler","save":"Sauvegarder les changements","saving":"Sauvegarde en cours...","saved":"Sauvegard\u00e9 !","choose_topic":{"none_found":"Aucune discussion trouv\u00e9e.","title":{"search":"Rechechez une discussion par son nom, url ou id :","placeholder":"renseignez ici le titre de la discussion"}},"user_action":{"user_posted_topic":"<a href='{{userUrl}}'>{{user}}</a> \u00e0 d\u00e9marr\u00e9 <a href='{{topicUrl}}'>la discussion</a>","you_posted_topic":"<a href='{{userUrl}}'>Vous</a> avez d\u00e9marr\u00e9 <a href='{{topicUrl}}'>la discussion</a>","user_replied_to_post":"<a href='{{userUrl}}'>{{user}}</a> \u00e0 r\u00e9pondu \u00e0 <a href='{{postUrl}}'>{{post_number}}</a>","you_replied_to_post":"<a href='{{userUrl}}'>Vous</a> avez r\u00e9pondu \u00e0 <a href='{{postUrl}}'>{{post_number}}</a>","user_replied_to_topic":"<a href='{{userUrl}}'>{{user}}</a> \u00e0 particip\u00e9 \u00e0 <a href='{{topicUrl}}'>la discussion</a>","you_replied_to_topic":"<a href='{{userUrl}}'>Vous</a> avez particip\u00e9 \u00e0 <a href='{{topicUrl}}'>la discussion</a>","user_mentioned_user":"<a href='{{user1Url}}'>{{user}}</a> \u00e0 mentionn\u00e9 <a href='{{user2Url}}'>{{another_user}}</a>","user_mentioned_you":"<a href='{{user2Url}}'>Vous</a> avez \u00e9t\u00e9 mentionn\u00e9 par <a href='{{user1Url}}'>{{user}}</a>","you_mentioned_user":"<a href='{{user1Url}}'>Vous</a> avez mentionn\u00e9 <a href='{{user2Url}}'>{{user}}</a>","posted_by_user":"R\u00e9dig\u00e9 par <a href='{{userUrl}}'>{{user}}</a>","posted_by_you":"R\u00e9dig\u00e9 par <a href='{{userUrl}}'>vous</a>","sent_by_user":"Envoy\u00e9 par <a href='{{userUrl}}'>{{user}}</a>","sent_by_you":"Envoy\u00e9 par <a href='{{userUrl}}'>vous</a>"},"user_action_groups":{"1":"J'aime donn\u00e9s","2":"J'aime re\u00e7us","3":"Signets","4":"Discussions","5":"R\u00e9ponses donn\u00e9es","6":"R\u00e9ponses re\u00e7ues","7":"Mentions","9":"Citations","10":"Favoris","11":"Editions","12":"El\u00e9ments envoy\u00e9s","13":"El\u00e9ments re\u00e7us"},"user":{"profile":"profil","title":"Utilisateur","mute":"couper","edit":"\u00c9diter les pr\u00e9f\u00e9rences","download_archive":"t\u00e9l\u00e9charger l'archive de mes messages","private_message":"Message priv\u00e9","private_messages":"Messages","activity_stream":"Activit\u00e9","preferences":"Pr\u00e9f\u00e9rences","bio":"\u00c0 propos de moi","invited_by":"Invit\u00e9 par","trust_level":"Niveau de confiance","external_links_in_new_tab":"Ouvrir tous les liens externes dans un nouvel onglet","enable_quoting":"Activer la citation automatique du texte surlign\u00e9","moderator":"{{user}} est un mod\u00e9rateur","admin":"{{user}} est un administrateur","change_password":{"action":"modifier","success":"(email envoy\u00e9)","in_progress":"(email en cours d'envoi)","error":"(erreur)"},"change_username":{"action":"changer","title":"Changer le pseudo","confirm":"Changer de pseudo peut avoir des cons\u00e9quences. \u00cates-vous absolument s\u00fbr de le vouloir ?","taken":"D\u00e9sol\u00e9, ce pseudo est d\u00e9j\u00e0 pris","error":"Il y a eu une erreur en changeant votre pseudo.","invalid":"Ce pseudo est invalide. Il ne doit \u00eatre compos\u00e9 que de lettres et de chiffres."},"change_email":{"action":"changer","title":"Changer d'email","taken":"D\u00e9sol\u00e9, cette adresse email est indisponible.","error":"Il y a eu une erreur lors du changement d'email. Cette adresse est peut-\u00eatre d\u00e9j\u00e0 utilis\u00e9e ?","success":"Nous vous avons envoy\u00e9 un mail \u00e0 cette adresse. Merci de suivre les instructions."},"email":{"title":"Email","instructions":"Votre adresse email ne sera jamais comuniqu\u00e9e.","ok":"\u00c7a \u00e0 l'air bien ! On vous envoie un mail pour confirmer.","invalid":"Merci d'entrer une adresse email valide","authenticated":"Votre adresse email a \u00e9t\u00e9 authentifi\u00e9e par {{provider}}.","frequency":"Nous vous envoyons des mails contenant uniquement des informations que vous n'avez pas d\u00e9j\u00e0 vues lors d'une pr\u00e9c\u00e9dente connexion."},"name":{"title":"Nom","instructions":"Votre nom complet (pas n\u00e9cessairement unique).","too_short":"Votre nom est trop court.","ok":"Votre nom \u00e0 l'air sympa !."},"username":{"title":"Pseudo","instructions":"Doit \u00eatre unique et ne pas contenir d'espace. Les gens pourrons vous mentionner avec @pseudo.","short_instructions":"Les gens peuvent vous mentionner avec @{{username}}.","available":"Votre pseudo est disponible.","global_match":"L'adresse email correspond au pseudo enregistr\u00e9.","global_mismatch":"D\u00e9j\u00e0 enregistr\u00e9. Essayez {{suggestion}} ?","not_available":"Pas disponible. Essayez {{suggestion}} ?","too_short":"Votre pseudo est trop court.\"","too_long":"Votre pseudo est trop long.","checking":"V\u00e9rification de la disponibilit\u00e9 de votre pseudo...","enter_email":"Pseudo trouv\u00e9. Entrez l'adresse email correspondante."},"password_confirmation":{"title":"Confirmation"},"last_posted":"Dernier message","last_emailed":"Dernier mail","last_seen":"Dernier vu","created":"Cr\u00e9\u00e9 \u00e0","log_out":"D\u00e9connexion","website":"site internet","email_settings":"Email","email_digests":{"title":"Quand je ne visite pas ce site, m'envoyer un r\u00e9sum\u00e9 par mail des nouveaut\u00e9s","daily":"quotidiennes","weekly":"hebdomadaires","bi_weekly":"bi-mensuelles"},"email_direct":"Recevoir un mail quand quelqu'un vous cite, r\u00e9pond \u00e0 votre message ou mentionne votre @pseudo","email_private_messages":"Recevoir un mail quand quelqu'un vous envoie un message priv\u00e9","other_settings":"Autre","new_topic_duration":{"label":"Consid\u00e9rer une discussion comme nouvelle quand","not_viewed":"Je ne les ai pas encore vues","last_here":"elles ont \u00e9t\u00e9 publi\u00e9es depuis ma derni\u00e8re visite","after_n_days":{"one":"elles ont \u00e9t\u00e9 publi\u00e9es hier","other":"elles ont \u00e9t\u00e9 publi\u00e9es lors des {{count}} derniers jours"},"after_n_weeks":{"one":"elles ont \u00e9t\u00e9 publi\u00e9es la semaine derni\u00e8re","other":"elles ont \u00e9t\u00e9 publi\u00e9es lors des {{count}} derni\u00e8res semaines"}},"auto_track_topics":"Suivre automatiquement les discussions que j'ai post\u00e9es","auto_track_options":{"never":"jamais","always":"toujours","after_n_seconds":{"one":"dans une seconde","other":"dans {{count}} secondes"},"after_n_minutes":{"one":"dans une minute","other":"dans {{count}} minutes"}},"invited":{"title":"Invit\u00e9s","user":"Utilisateurs invit\u00e9s","none":"{{username}} n'a invit\u00e9 personne sur le site.","redeemed":"Invit\u00e9s","redeemed_at":"Invit\u00e9s","pending":"Invit\u00e9s en attente","topics_entered":"discussions post\u00e9es","posts_read_count":"Messages lus","rescind":"Supprimer l'invitation","rescinded":"Invit\u00e9 supprim\u00e9","time_read":"Temps de lecture","days_visited":"nombre de jours de visite","account_age_days":"\u00c2ge du compte en jours"},"password":{"title":"Mot de passe","too_short":"Votre mot de passe est trop court","ok":"Votre mot de passe est correct"},"ip_address":{"title":"Derni\u00e8res adresses IP"},"avatar":{"title":"Avatar","instructions":"Nous utilisons <a href='https://gravatar.com' target='_blank'>Gravatar</a> pour associer votre avatar avec votre adresse email."},"filters":{"all":"Tout"},"stream":{"posted_by":"R\u00e9dig\u00e9 par","sent_by":"Envoy\u00e9 par","private_message":"message priv\u00e9","the_topic":"La discussion"}},"loading":"Chargement...","close":"Fermeture","learn_more":"en savoir plus...","year":"an","year_desc":"discussions post\u00e9es dans les 365 derniers jours","month":"mois","month_desc":"discussions post\u00e9es dans les 30 derniers jours","week":"semaine","week_desc":"discussions post\u00e9es dans les 7 derniers jours","first_post":"premier message","mute":"D\u00e9sactiver","unmute":"activer","best_of":{"title":"les plus populaires","description":"Il y a <b>{{count}}</b> messages dans cette discussion. C'est beaucoup ! Voulez-vous gagner du temps en basculant sur la liste des messages poss\u00e9dant le plus d'interactions et de r\u00e9ponses ?","enabled_description":"vous \u00eates actuellement en train de consulter seulement les messages les plus populaires de cette discussion.","enable":"ne voir que les plus populaires","disable":"R\u00e9-afficher tous les messages"},"private_message_info":{"title":"discussion priv\u00e9e","invite":"Inviter d'autres utilisateurs..."},"email":"Email","username":"Pseudo","last_seen":"Derni\u00e8re vue","created":"Cr\u00e9\u00e9","trust_level":"Niveau de confiance","create_account":{"title":"Cr\u00e9er un compte","action":"Cr\u00e9er !","invite":"Vous n'avez pas encore de compte ?","failed":"Quelque chose s'est mal pass\u00e9, peut-\u00eatre que cette adresse email est d\u00e9j\u00e0 enregistr\u00e9e, essayez le lien Mot de passe oubli\u00e9."},"forgot_password":{"title":"Mot de passe oubli\u00e9 ?","action":"J'ai oubli\u00e9 mon mot de passe","invite":"Entrez votre pseudo ou votre adresse email, et vous recevrez un nouveau mot de passe par mail","reset":"R\u00e9initialiser votre mot de passe","complete":"Vous allez recevoir un mail contenant les instructions pour r\u00e9initialiser votre mot de passe."},"login":{"title":"Connexion","username":"Pseudo","password":"Mot de passe","email_placeholder":"adresse email ou pseudo","error":"Erreur inconnue","reset_password":"R\u00e9initialiser le mot de passe","logging_in":"Connexion en cours...","or":"ou","authenticating":"Authentification...","awaiting_confirmation":"Votre compte est en attente d'activation, utilisez le lien mot de passe oubli\u00e9 pour demander un nouveau mail d'activation.","awaiting_approval":"Votre compte n'a pas encore \u00e9t\u00e9 approuv\u00e9 par un mod\u00e9rateur. Vous recevrez une confirmation par mail lors de l'activation.","not_activated":"Vous ne pouvez pas vous encore vous connecter. Nous vous avons envoy\u00e9 un email d'activation \u00e0 <b>{{sentTo}}</b>. Merci de suivre les instructions afin d'activer votre compte.","resend_activation_email":"Cliquez ici pour r\u00e9envoyer l'email d'activation.","sent_activation_email_again":"Nous venous de vous envoyer un nouvel email d'activation \u00e0 <b>{{currentEmail}}</b>. Il peut prendre quelques minutes \u00e0 arriver; n'oubliez pas de v\u00e9rifier votre r\u00e9pertoire spam.","google":{"title":"via Google","message":"Authentification via Google (assurez-vous que les popups ne soient pas bloqu\u00e9es)"},"twitter":{"title":"via Twitter","message":"Authentification via Twitter (assurez-vous que les popups ne soient pas bloqu\u00e9es)"},"facebook":{"title":"via Facebook","message":"Authentification via Facebook (assurez-vous que les popups ne soient pas bloqu\u00e9es)"},"cas":{"title":"via CAS","message":"Authentification via CAS (assurez-vous que les popups ne soient pas bloqu\u00e9es)"},"yahoo":{"title":"via Yahoo","message":"Authentification via Yahoo (assurez-vous que les popups ne soient pas bloqu\u00e9es)"},"github":{"title":"via GitHub","message":"Authentification via GitHub (assurez-vous que les popups ne soient pas bloqu\u00e9es)"},"persona":{"title":"via Persona","message":"Authentification via Mozilla Persona (assurez-vous que les popups ne soient pas bloqu\u00e9es)"}},"composer":{"posting_not_on_topic":"Vous r\u00e9pondez \u00e0 la discussion \"{{title}}\", mais vous \u00eates actuellement en train de consulter une autre discussion.","saving_draft_tip":"sauvegarde...","saved_draft_tip":"sauvegard\u00e9","saved_local_draft_tip":"sauvegard\u00e9 en local","similar_topics":"Votre message est trop similaire \u00e0...","drafts_offline":"sauvegard\u00e9 hors ligne","min_length":{"need_more_for_title":"{{n}} caract\u00e8res restant pour le titre","need_more_for_reply":"{{n}} caract\u00e8res restant pour le message"},"error":{"title_missing":"Le titre est obligatoire.","title_too_short":"Le titre doit avoir au moins {{min}} caract\u00e8res.","title_too_long":"Le titre ne doit pas d\u00e9passer les {{max}} caract\u00e8res.","post_missing":"Le message ne peut \u00eatre vide.","post_length":"Le mesasge doit avoir au moins {{min}} caract\u00e8res.","category_missing":"Vous devez choisir une cat\u00e9gorie."},"save_edit":"Sauvegarder la modification","reply_original":"R\u00e9pondre \u00e0 la discussion initiale","reply_here":"R\u00e9pondre ici","reply":"R\u00e9pondre","cancel":"annuler","create_topic":"Cr\u00e9er une discussion","create_pm":"Cr\u00e9er un message priv\u00e9.","quote_post_title":"Citer le message en entier","bold_title":"Gras","bold_text":"texte en gras","italic_title":"Italique","italic_text":"texte en italique","link_title":"Lien","link_description":"renseignez ici la description du lien","link_dialog_title":"Ins\u00e9rez le lien","link_optional_text":"titre optionnel","quote_title":"Citation","quote_text":"Citation","code_title":"Bout de code","code_text":"renseignez ici votre code","image_title":"Image","image_description":"renseignez ici la description de l'image","image_dialog_title":"Ins\u00e9rez l'image","image_optional_text":"titre optionnel","image_hosting_hint":"Besoin <a href='https://www.google.fr/search?q=h\u00e9bergement+d'image+gratuit' target='_blank'>d'un h\u00e9bergeur d'image gratuit ?</a>","olist_title":"Liste num\u00e9rot\u00e9e","ulist_title":"Liste \u00e0 puces","list_item":"El\u00e9ment","heading_title":"Titre","heading_text":"Titre","hr_title":"Barre horizontale","undo_title":"Annuler","redo_title":"Refaire","help":"Aide Markdown","toggler":"Afficher ou cacher le composer","admin_options_title":"Param\u00e8tres optionels pour cette discussion","auto_close_label":"Fermer automatiquement cette discussion apr\u00e8s :","auto_close_units":"jours","users_placeholder":"Ajouter un utilisateur","title_placeholder":"Choisissez un titre ici. Sur quoi porte cette discussion en quelques mots ?","reply_placeholder":"Saisissez votre r\u00e9ponse ici. Utilisez le Markdown ou le BBCode pour le formatage. Vous pouvez d\u00e9poser ou coller une image ici.","view_new_post":"Voir votre nouveau message.","saving":"Sauvegarde...","saved":"Sauvegard\u00e9 !","saved_draft":"Vous avez un brouillon en attente. Cliquez n'importe o\u00f9 pour en reprendre l'\u00e9dition","uploading":"Envoi en cours...","show_preview":"afficher la pr\u00e9visualisation &raquo;","hide_preview":"&laquo; cacher la pr\u00e9visualisation"},"notifications":{"title":"Notification des mentions de votre @pseudo, r\u00e9ponses \u00e0 vos discussions ou messages, etc.","none":"Vous n'avez aucune notification pour le moment","more":"voir les anciennes notifications","mentioned":"<span title='mentionn\u00e9' class='icon'>@</span> {{username}} {{link}}","quoted":"<i title='cit\u00e9' class='icon icon-quote-right'></i> {{username}} {{link}}","replied":"<i title='avec r\u00e9ponse' class='icon icon-reply'></i> {{username}} {{link}}","posted":"<i title='avec r\u00e9ponse' class='icon icon-reply'></i> {{username}} {{link}}","edited":"<i title='\u00e9dit\u00e9' class='icon icon-pencil'></i> {{username}} {{link}}","liked":"<i title='appr\u00e9ci\u00e9' class='icon icon-heart'></i> {{username}} {{link}}","private_message":"<i class='icon icon-envelope-altk' title='messag\u00b2e priv\u00e9'></i> {{username}} vous a envoy\u00e9 un message: {{link}}","invited_to_private_message":"{{username}} vous a invit\u00e9 \u00e0 une discussion priv\u00e9e: {{link}}","invitee_accepted":"<i title='a accept\u00e9 votre invitation' class='icon icon-signin'></i> {{username}} a accept\u00e9 votre invitation","moved_post":"<i title='moved post' class='icon icon-arrow-right'></i> {{username}} a d\u00e9plac\u00e9 le message vers {{link}}","total_flagged":"Nombre total de messages signal\u00e9s"},"image_selector":{"title":"Ins\u00e9rer une image","from_my_computer":"Local","from_the_web":"Depuis internet","add_image":"Ajouter une image","remote_title":"Image distante","remote_tip":"saisissez l'url de l'image","local_title":"Image locale","local_tip":"Cliquez pour s\u00e9lectionner une image depuis votre ordinateur.","upload":"Envoyer","uploading_image":"Image en cours d'envoi"},"search":{"title":"Rechercher les discussions, messages, utilisateurs ou cat\u00e9gories","placeholder":"saisir votre requ\u00eate ici","no_results":"Aucun r\u00e9sultat.","searching":"Recherche en cours ...","prefer":{"user":"La recherche priorisera les r\u00e9sultats de @{{username}}","category":"La recherche priorisera les r\u00e9sultats de la cat\u00e9gorie : {{category}}"}},"site_map":"voir une autre liste des discussions ou une cat\u00e9gorie","go_back":"retour","current_user":"voir la page de l'utilisateur","favorite":{"title":"Favoris","help":{"star":"ajouter cette discussion \u00e0 vos favoris","unstar":"enlever cette discussion de vos favoris"}},"topics":{"none":{"favorited":"Vous n'avez aucune discussion favorite pour le moment. Pour ajouter une discussion aux favoris, cliquez sur l'\u00e9toile suivant le titre","unread":"Vous avez des discussions non lues.","new":"Vous n'avez aucune discussion non lue.","read":"Vous n'avez lu aucune discussion pour le moment.","posted":"Vous n'avez \u00e9crit aucun message pour le moment.","latest":"Il n'y a aucune discussion pour le moment. C'est triste...","hot":"Il n'y a aucune discussion populaire pour le moment.","category":"Il n'y a aucune discussion sur {{category}}."},"bottom":{"latest":"Il n'y a plus de discussion \u00e0 lire.","hot":"Il n'y a plus de discussion populaire \u00e0 lire.","posted":"Il n'y a plus de discussion \u00e0 lire.","read":"Il n'y a plus de discussion \u00e0 lire.","new":"Il n'y a plus de discussion \u00e0 lire.","unread":"Il n'y a plus de discussion \u00e0 lire.","favorited":"Il n'y a plus de discussion favorites \u00e0 lire.","category":"Il n'y a plus de discussion sur {{category}} \u00e0 lire."}},"rank_details":{"toggle":"afficher/cacher le d\u00e9tail du classement des discussions","show":"afficher le d\u00e9tail du classement des discussions","title":"D\u00e9tail du classement des discussions"},"topic":{"create_in":"Cr\u00e9er une discussion dans la cat\u00e9gorie {{categoryName}}","create":"Cr\u00e9er une discussion","create_long":"Cr\u00e9er une nouvelle discussion","private_message":"Commencer une discussion priv\u00e9e","list":"Liste des discussions","new":"nouvelle discussion","title":"discussions","loading_more":"Afficher plus de discussions...","loading":"Chargement des discussions en cours...","invalid_access":{"title":"discussion priv\u00e9e","description":"D\u00e9sol\u00e9, vous n'avez pas acc\u00e8s \u00e0 cette discussion !"},"server_error":{"title":"discussion impossible \u00e0 charger","description":"D\u00e9sol\u00e9, nous n'avons pu charger cette discussion, probablement du \u00e0 un probl\u00e8me de connexion. Merci de r\u00e9essayer \u00e0 nouveau. Si le probl\u00e8me persiste, merci de nous le faire savoir."},"not_found":{"title":"discussion non trouv\u00e9e","description":"D\u00e9sol\u00e9, nous n'avons pas trouv\u00e9 cette discussion. Peut-\u00eatre a t-elle \u00e9t\u00e9 d\u00e9truite ?"},"unread_posts":"vous avez {{unread}} messages non lus dans cette discussion","new_posts":"il y a {{new_posts}} nouveaux messages dans cette discussion depuis la derni\u00e8re fois","likes":{"one":"1 personne \u00e0 aim\u00e9 cette discussion","other":"{{count}} personnes ont aim\u00e9s cette discussion"},"back_to_list":"Retour \u00e0 la liste des discussions","options":"options de la discussion","show_links":"afficher les liens de cette discussion","toggle_information":"afficher les d\u00e9tails de la discussion","read_more_in_category":"Vous voulez en lire plus ? Afficher d'autres discussions dans {{catLink}} ou {{latestLink}}.","read_more":"Vous voulez en lire plus? {{catLink}} or {{latestLink}}.","browse_all_categories":"Voir toutes les cat\u00e9gories","view_latest_topics":"voir la liste des discussions populaires","suggest_create_topic":"pourquoi ne pas cr\u00e9er une nouvelle discussion ?","read_position_reset":"Votre position de lecture \u00e0 \u00e9t\u00e9 remise \u00e0 z\u00e9ro.","jump_reply_up":"aller \u00e0 des r\u00e9ponses pr\u00e9c\u00e9dentes","jump_reply_down":"allez \u00e0 des r\u00e9ponses ult\u00e9rieures","deleted":"cette discussion \u00e0 \u00e9t\u00e9 supprim\u00e9e","auto_close_notice":"Cette discussion sera automatiquement ferm\u00e9e %{timeLeft}.","auto_close_title":"Param\u00e8tres de fermeture automatique","auto_close_save":"Sauvegarder","auto_close_cancel":"Annuler","auto_close_remove":"Ne pas fermer automatiquement cette discussion","progress":{"title":"progession dans la discussion","jump_top":"aller au premier message","jump_bottom":"aller au dernier message","total":"total messages","current":"message courant"},"notifications":{"title":"","reasons":{"3_2":"Vous recevrez des notifications car vous suivez attentivement cette discussion.","3_1":"Vous recevrez des notifications car vous avez cr\u00e9\u00e9 cette discussion.","3":"Vous recevrez des notifications car vous suivez cette discussion.","2_4":"Vous recevrez des notifications car vous avez post\u00e9 une r\u00e9ponse dans cette discussion.","2_2":"Vous recevrez des notifications car vous suivez cette discussion.","2":"Vous recevrez des notifications car vous <a href=\"/users/{{username}}/preferences\">lu cette discussion</a>.","1":"Vous serez notifi\u00e9 seulement si un utilisateur mentionne votre @pseudo ou r\u00e9ponds \u00e0 vos messages.","1_2":"Vous serez notifi\u00e9 seulement si un utilisateur mentionne votre @pseudo ou r\u00e9ponds \u00e0 vos messages.","0":"Vous ignorez toutes les notifications de cette discussion.","0_2":"Vous ignorez toutes les notifications de cette discussion."},"watching":{"title":"Suivre attentivement","description":"pareil que le suivi simple, plus une notification syst\u00e9matique pour chaque nouveau message."},"tracking":{"title":"Suivi simple","description":"vous serez notifi\u00e9 des messages non lus, des mentions de votre @pseudo et des r\u00e9ponses \u00e0 vos messages."},"regular":{"title":"Normal","description":"vous recevrez des notifications seuelement si un utilisateur mentionne votre @pseudo ou r\u00e9pond \u00e0 un de vos messages"},"muted":{"title":"Silencieux","description":"vous ne recevrez aucune notification de cette discussion et elle n'apparaitra pas dans l'onglet des discussions non lues"}},"actions":{"delete":"Supprimer la discussion","open":"Ouvrir la discussion","close":"Fermer la discussion","auto_close":"Fermeture automatique","unpin":"D\u00e9-\u00e9pingler la discussion","pin":"\u00c9pingler la discussion","unarchive":"D\u00e9-archiver la discussion","archive":"Archiver la discussion","invisible":"Rendre invisible","visible":"Rendre visible","reset_read":"R\u00e9initialiser les lectures","multi_select":"Basculer sur la multi-s\u00e9lection","convert_to_topic":"Convertir en discussion normale"},"reply":{"title":"R\u00e9pondre","help":"commencez \u00e0 r\u00e9pondre \u00e0 cette discussion"},"clear_pin":{"title":"D\u00e9s\u00e9pingler","help":"D\u00e9s\u00e9pingler cette discussion afin qu'elle n'apparaisse plus en t\u00eate des discussions"},"share":{"title":"Partager","help":"partager un lien vers cette discussion"},"inviting":"Inviter...","invite_private":{"title":"Inviter dans la discussion priv\u00e9e","email_or_username":"Adresse email ou @pseudo de l'invit\u00e9","email_or_username_placeholder":"Adresse email ou @pseudo","action":"Inviter","success":"Merci ! Vous avez invit\u00e9 cet utilisateur \u00e0 participer \u00e0 la discussion priv\u00e9e.","error":"D\u00e9sol\u00e9, il y a eu une erreur lors de l'invitation de cet utilisateur"},"invite_reply":{"title":"Inviter des amis \u00e0 r\u00e9pondre","action":"Envoyer l'invitation","help":"envoyer des invitations \u00e0 des amis pour qu'ils puissent participer \u00e0 cette discussion en un simple clic","email":"Nous allons envoyer un mail \u00e0 votre ami pour lui permettre de participer \u00e0 cette conversation.","email_placeholder":"adresse email","success":"Merci ! Nous avons envoy\u00e9 un mail \u00e0 <b>{{email}}</b>. Suivez vos invitations dans l'onglet pr\u00e9vu \u00e0 cet effet sur votre page utilisateur.","error":"D\u00e9sol\u00e9 nous ne pouvons pas inviter cette personne."},"login_reply":"Connectez-vous pour r\u00e9pondre","filters":{"user":"Vous voyez seulement {{n_posts}} {{by_n_users}}.","n_posts":{"one":"1 message","other":"{{count}} messages"},"by_n_users":{"one":"de l'utilisateur","other":"r\u00e9dig\u00e9s par {{count}} utilisateurs"},"best_of":"Vous voyez seulement {{n_best_posts}} {{of_n_posts}} de cette discussion.","n_best_posts":{"one":"le message","other":"les {{count}} messages"},"of_n_posts":{"one":"le plus populaire","other":"les plus populaires"},"cancel":"R\u00e9-afficher l'ensemble des messages de cette discussion."},"split_topic":{"title":"Scinder la discussion","action":"scinder la discussion","topic_name":"Nom de la nouvelle discussion :","error":"Il y a eu une erreur lors du scindage de la discussion.","instructions":{"one":"Vous \u00eates sur le point de cr\u00e9er une nouvelle discussion avec le message que vous avez s\u00e9lectionn\u00e9.","other":"Vous \u00eates sur le point de cr\u00e9er une nouvelle discussion avec les <b>{{count}}</b> messages que vous avez s\u00e9lectionn\u00e9."}},"merge_topic":{"title":"Fusionner la discussion","action":"fusionner la discussion","error":"Il y a eu une erreur lors de la fusion.","instructions":{"one":"Merci de s\u00e9lectionner la discussion dans laquelle vous souhaitez d\u00e9placer le message que vous avez s\u00e9lectionn\u00e9.","other":"Merci de s\u00e9lectionner la discussion dans laquelle vous souhaitez d\u00e9placer les <b>{{count}}</b> messages que vous avez s\u00e9lectionn\u00e9."}},"multi_select":{"select":"s\u00e9lectioner","selected":"({{count}}) s\u00e9lection\u00e9s","delete":"supprimer la s\u00e9lection","cancel":"annuler la s\u00e9lection","description":{"one":"vous avez s\u00e9lectionn\u00e9 <b>1</b> message.","other":"Vous avez s\u00e9lectionn\u00e9 <b>{{count}}</b> messages."}}},"post":{"reply":"R\u00e9pondre \u00e0 {{link}} par {{replyAvatar}} {{username}}","reply_topic":"R\u00e9pondre \u00e0 {{link}}","quote_reply":"Citer","edit":"\u00c9diter {{link}} par {{replyAvatar}} {{username}}","post_number":"message {{number}}","in_reply_to":"R\u00e9ponse courte","reply_as_new_topic":"R\u00e9pondre dans une nouvelle conversation","continue_discussion":"Continuer la discussion suivante {{postLink}}:","follow_quote":"Voir le message cit\u00e9","deleted_by_author":"(message supprim\u00e9 par son auteur)","expand_collapse":"\u00e9tendre/r\u00e9duire","has_replies":{"one":"R\u00e9ponse","other":"R\u00e9ponses"},"errors":{"create":"D\u00e9sol\u00e9, il y a eu une erreur lors de la publication de votre message. Merci de r\u00e9essayer.","edit":"D\u00e9sol\u00e9, il y a eu une erreur lors de l'\u00e9dition de votre message. Merci de r\u00e9essayer.","upload":"D\u00e9sol\u00e9, il y a eu une erreur lors de l'envoi du fichier. Merci de r\u00e9essayer.","upload_too_large":"D\u00e9sol\u00e9, le fichier que vous \u00eates en train d'envoyer est trop grand (maximum {{max_size_kb}}Kb). Merci de le redimensionner et de r\u00e9essayer.","upload_too_many_images":"D\u00e9sol\u00e9, vous ne pouvez envoyer qu'une seule image \u00e0 la fois.","only_images_are_supported":"D\u00e9sol\u00e9, seulement l'envoi d'image est support\u00e9."},"abandon":"Voulez-vous vraiment abandonner ce message ?","archetypes":{"save":"Sauvegarder les options"},"controls":{"reply":"R\u00e9diger une r\u00e9ponse \u00e0 ce message","like":"J'aime ce message","edit":"\u00c9diter ce message","flag":"Signaler ce message \u00e0 la mod\u00e9ration","delete":"Supprimer ce message","undelete":"Annuler la suppression de ce message","share":"Partager un lien vers ce message","bookmark":"Ajouter ce message \u00e0 ma page utilisateur","more":"Plus"},"actions":{"flag":"Signaler","clear_flags":{"one":"Annuler le signalement","other":"Annuler les signalements"},"it_too":{"off_topic":"Le signaler \u00e9galement","spam":"Le signaler \u00e9galement","inappropriate":"Le signaler \u00e9galement","custom_flag":"Le signaler \u00e9galement","bookmark":"L'ajouter \u00e9galement en favoris","like":"L'aimer \u00e9galement","vote":"Votez pour lui \u00e9galement"},"undo":{"off_topic":"Annuler le signalement","spam":"Annuler le signalement","inappropriate":"Annuler le signalement","bookmark":"L'enlever des favoris","like":"Annuler j'aime","vote":"Retirer votre vote"},"people":{"off_topic":"{{icons}} l'ont signal\u00e9 comme \u00e9tant hors-sujet","spam":"{{icons}} l'ont signal\u00e9 comme \u00e9tant du spam","inappropriate":"{{icons}} l'ont signal\u00e9 comme inapropri\u00e9","notify_moderators":"{{icons}} l'ont signal\u00e9 pour mod\u00e9ration","notify_moderators_with_url":"{{icons}} <a href='{{postUrl}}'>l'ont signal\u00e9 pour mod\u00e9ration</a>","notify_user":"{{icons}} ont d\u00e9marr\u00e9 une conversation priv\u00e9e","notify_user_with_url":"{{icons}} ont d\u00e9marr\u00e9 une <a href='{{postUrl}}'>conversation priv\u00e9e</a>","bookmark":"{{icons}} l'ont ajout\u00e9 \u00e0 leurs favoris","like":"{{icons}} l'ont aim\u00e9","vote":"{{icons}} ont vot\u00e9 pour"},"by_you":{"off_topic":"Vous l'avez signal\u00e9 comme \u00e9tant hors-sujet","spam":"Vous l'avez signal\u00e9 comme \u00e9tant du spam","inappropriate":"Vous l'avez signal\u00e9 comme inapropri\u00e9","notify_moderators":"Vous l'avez signal\u00e9 pour mod\u00e9ration","notify_user":"Vous avez d\u00e9marr\u00e9 une conversation priv\u00e9e avec cet utilisateur","bookmark":"Vous l'avez ajout\u00e9 \u00e0 vos favoris","like":"Vous l'avez aim\u00e9","vote":"Vous avez vot\u00e9 pour"},"by_you_and_others":{"off_topic":{"one":"Vous et 1 autre personne l'avez signal\u00e9 comme \u00e9tant hors-sujet","other":"Vous et {{count}} autres personnes l'avez signal\u00e9 comme \u00e9tant hors-sujet"},"spam":{"one":"Vous et 1 autre personne l'avez signal\u00e9 comme \u00e9tant du spam","other":"Vous et {{count}} autres personnes l'avez signal\u00e9 comme \u00e9tant du spam"},"inappropriate":{"one":"Vous et 1 autre personne l'avez signal\u00e9 comme inapropri\u00e9","other":"Vous et {{count}} autres personnes l'avez signal\u00e9 comme inapropri\u00e9"},"notify_moderators":{"one":"Vous et 1 autre personne l'avez signal\u00e9 pour mod\u00e9ration","other":"Vous et {{count}} autres personnes l'avez signal\u00e9 pour mod\u00e9ration"},"notify_user":{"one":"Vous et 1 autre personne avez d\u00e9marr\u00e9 une conversation priv\u00e9e avec cet utilisateur","other":"Vous et {{count}} autres personnes avez d\u00e9marr\u00e9 une conversation priv\u00e9e avec cet utilisateur"},"bookmark":{"one":"Vous et 1 autre personne l'avez ajout\u00e9 \u00e0 vos favoris","other":"Vous et {{count}} autres personnes l'avez ajout\u00e9 \u00e0 vos favoris"},"like":{"one":"Vous et 1 autre personne l'avez aim\u00e9","other":"Vous et {{count}} autres personnes l'avez aim\u00e9"},"vote":{"one":"Vous et 1 autre personne avez vot\u00e9 pour","other":"Vous et {{count}} autres personnes avez vot\u00e9 pour"}},"by_others":{"off_topic":{"one":"1 personne l'a signal\u00e9 comme \u00e9tant hors-sujet","other":"{{count}} personnes l'ont signal\u00e9 comme \u00e9tant hors-sujet"},"spam":{"one":"1 personne l'a signal\u00e9 comme \u00e9tant du spam","other":"{{count}} personnes l'ont signal\u00e9 comme \u00e9tant du spam"},"inappropriate":{"one":"1 personne l'a signal\u00e9 comme inapropri\u00e9","other":"{{count}} personnes l'ont signal\u00e9 comme inapropri\u00e9"},"notify_moderators":{"one":"1 personne l'a signal\u00e9 pour mod\u00e9ration","other":"{{count}} personnes l'ont signal\u00e9 pour mod\u00e9ration"},"notify_user":{"one":"1 personne a d\u00e9marr\u00e9 une conversation priv\u00e9e avec cet utilisateur","other":"{{count}} personnes ont d\u00e9marr\u00e9 une conversation priv\u00e9e avec cet utilisateur"},"bookmark":{"one":"1 personne l'a ajout\u00e9 \u00e0 vos favoris","other":"{{count}} personnes l'ont ajout\u00e9 \u00e0 vos favoris"},"like":{"one":"1 personne l'a aim\u00e9","other":"{{count}} personnes l'ont aim\u00e9"},"vote":{"one":"1 personne a vot\u00e9 pour","other":"{{count}} personnes ont vot\u00e9 pour"}}},"edits":{"one":"une \u00e9dition","other":"{{count}} \u00e9ditions","zero":"pas d'\u00e9dition"},"delete":{"confirm":{"one":"\u00cates-vous s\u00fbr de vouloir supprimer ce message ?","other":"\u00cates-vous s\u00fbr de vouloir supprimer tous ces messages ?"}}},"category":{"none":"(pas de cat\u00e9gorie)","edit":"\u00e9diter","edit_long":"Editer la cat\u00e9gorie","edit_uncategorized":"Editer les non cat\u00e9goriser","view":"Voir les discussions dans cette cat\u00e9gorie","general":"G\u00e9n\u00e9ral","settings":"Param\u00e8tres","delete":"Supprimer la cat\u00e9gorie","create":"Cr\u00e9er la cat\u00e9gorie","save":"Enregistrer la cat\u00e9gorie","creation_error":"Il y a eu une erreur lors de la cr\u00e9ation de la cat\u00e9gorie.","save_error":"Il y a eu une erreur lors de la sauvegarde de la cat\u00e9gorie.","more_posts":"voir tous les {{posts}}...","name":"Nom de la cat\u00e9gorie","description":"Description","topic":"Cat\u00e9gorie de la discussion","badge_colors":"Couleurs du badge","background_color":"Couleur du fond","foreground_color":"Couleur du texte","name_placeholder":"Devrait \u00eatre concis.","color_placeholder":"N'importe quelle couleur","delete_confirm":"Voulez-vous vraiment supprimer cette cat\u00e9gorie ?","delete_error":"Il y a eu une erreur lors de la suppression.","list":"Liste des categories","no_description":"Il n'y a pas de description pour cette cat\u00e9gorie.","change_in_category_topic":"visitez les discussions de cette cat\u00e9gorie pour en \u00e9diter la description","hotness":"Buzz","already_used":"Cette couleur est d\u00e9j\u00e0 utilis\u00e9e par une autre cat\u00e9gorie","is_secure":"Cat\u00e9gorie s\u00e9curis\u00e9e ?","add_group":"Ajouter un groupe","security":"S\u00e9curit\u00e9","allowed_groups":"Groupes permis :","auto_close_label":"Fermer automatiquement apr\u00e8s :"},"flagging":{"title":"Pourquoi voulez-vous signaler ce message ?","action":"Signaler ce message","notify_action":"Notifier","cant":"D\u00e9sol\u00e9, vous ne pouvez pas signaler ce message pour le moment","custom_placeholder_notify_user":"Pour quelles raisons contactez-vous cet utilisateur par messagerie priv\u00e9e ?","custom_placeholder_notify_moderators":"Pourquoi ce message requiert-il l'attention des mod\u00e9rateur ? Dites-nous ce qui vous d\u00e9range sp\u00e9cifiquement, et fournissez des liens pertinents si possible.","custom_message":{"at_least":"saisissez au moins {{n}} caract\u00e8res","more":"{{n}} restants...","left":"{{n}} restants"}},"topic_summary":{"title":"R\u00e9sum\u00e9 de la discussion","links_shown":"montrer les {{totalLinks}} liens...","clicks":"clics","topic_link":"lien de la discussion"},"topic_statuses":{"locked":{"help":"cette discussion est close, elle n'accepte plus de nouvelles r\u00e9ponses"},"pinned":{"help":"cette discussion est \u00e9pingl\u00e9e, elle s'affichera en haut de sa cat\u00e9gorie"},"archived":{"help":"cette discussion est archiv\u00e9e, elle est gel\u00e9e et ne peut \u00eatre modifi\u00e9e"},"invisible":{"help":"cette discussion est invisible, elle ne sera pas affich\u00e9e dans la liste des discussions et est seulement accessible via un lien direct"}},"posts":"Messages","posts_long":"{{number}} messages dans cette discussion","original_post":"Message original","views":"Vues","replies":"R\u00e9ponses","views_long":"cette discussion a \u00e9t\u00e9 vue {{number}} fois","activity":"Activit\u00e9","likes":"J'aime","top_contributors":"Participants","category_title":"Cat\u00e9gorie","history":"Historique","changed_by":"par {{author}}","categories_list":"Liste des cat\u00e9gories","filters":{"latest":{"title":"R\u00e9centes","help":"discussions r\u00e9centes"},"hot":{"title":"Populaires","help":"discussions populaires"},"favorited":{"title":"Favoris","help":"discussions que vous avez ajout\u00e9es \u00e0 vos favoris"},"read":{"title":"Lues","help":"discussions que vous avez lues"},"categories":{"title":"Cat\u00e9gories","title_in":"Cat\u00e9gorie - {{categoryName}}","help":"toutes les discussions regroup\u00e9es par categorie"},"unread":{"title":{"zero":"Non lue (0)","one":"Non lue (1)","other":"Non lues ({{count}})"},"help":"discussions suivies contenant des r\u00e9ponses non lues"},"new":{"title":{"zero":"Nouvelle (0)","one":"Nouvelle (1)","other":"Nouvelles ({{count}})"},"help":"nouvelles discussions depuis votre derni\u00e8re visite"},"posted":{"title":"Mes messages","help":"discussions auxquelles vous avez particip\u00e9"},"category":{"title":{"zero":"{{categoryName}} (0)","one":"{{categoryName}} (1)","other":"{{categoryName}} ({{count}})"},"help":"discussions populaires dans la cat\u00e9gorie {{categoryName}}"}},"browser_update":"Malheureusement, <a href=\"http://www.discourse.org/faq/#browser\">votre navigateur est trop vieux pour afficher ce forum Discourse</a>. Merci <a href=\"%{url}\">de mettre \u00e0 jour votre navigateur</a>.","type_to_filter":"Commencez \u00e0 taper pour filter...","admin":{"title":"Administation Discourse","moderator":"Mod\u00e9rateur","dashboard":{"title":"Panel d'administration","version":"Version de Discourse","up_to_date":"Vous utilisez la derni\u00e8re version de Discourse.","critical_available":"Une mise \u00e0 jour critique est disponible.","updates_available":"Des mises \u00e0 jour sont disponibles.","please_upgrade":"Veuillez mettre \u00e0 jour !","installed_version":"Version install\u00e9e","latest_version":"Derni\u00e8re version","problems_found":"Quelques probl\u00e8mes ont \u00e9t\u00e9 trouv\u00e9s dans votre installation de Discourse :","last_checked":"Derni\u00e8re v\u00e9rification","refresh_problems":"Rafra\u00eechir","no_problems":"Aucun probl\u00e8me n'\u00e0 \u00e9t\u00e9 trouv\u00e9.","moderators":"Mod\u00e9rateurs :","admins":"Administateurs :","private_messages_short":"MPs","private_messages_title":"Messages Priv\u00e9s","reports":{"today":"Aujourd'hui","yesterday":"hier","last_7_days":"les 7 derniers jours","last_30_days":"les 30 derniers jours","all_time":"depuis toujours","7_days_ago":"il y a 7 jours","30_days_ago":"il y a 30 jours","all":"tous","view_table":"Tableau","view_chart":"Graphique \u00e0 barre"}},"commits":{"latest_changes":"derniers changements: merci de mettre \u00e0 jour r\u00e9guli\u00e8rement !","by":"par"},"flags":{"title":"Signalements","old":"Vieux","active":"Actifs","clear":"Vider les signalements","clear_title":"Rejeter tous les signalements sur ce message (va r\u00e9afficher les messages cach\u00e9s)","delete":"Supprimer le message","delete_title":"supprimer le message (va supprimer la discussion si c'est le premier message)","flagged_by":"Signal\u00e9 par","error":"Quelque chose s'est mal pass\u00e9","view_message":"Voir le message"},"groups":{"title":"Groupes","edit":"Editer les groupes","selector_placeholder":"ajouter des utilisateurs","name_placeholder":"Nom du groupe, sans espace, m\u00eames r\u00e8gles que pour les noms d'utilisateurs"},"api":{"title":"API","long_title":"Informations sur l'API","key":"Cl\u00e9","generate":"G\u00e9n\u00e9rer une cl\u00e9 pour l'API","regenerate":"Reg\u00e9n\u00e9rer une cl\u00e9 pour l'API","info_html":"Cette cl\u00e9 vous permettra de cr\u00e9er et mettre \u00e0 jour des discussions \u00e0 l'aide d'appels JSON.","note_html":"Gardez cette cl\u00e9 <strong>secr\u00eate</strong> ! Tous les personnes qui la poss\u00e8de peuvent cr\u00e9er des messages sur ce forum au nom de n'import quel utilisateur."},"customize":{"title":"Personnaliser","long_title":"Personnalisation du site","header":"En-t\u00eate","css":"Feuille de style","override_default":"Outrepasser les r\u00e9glages par d\u00e9faut ?","enabled":"Activ\u00e9 ?","preview":"pr\u00e9visualiser","undo_preview":"annuler la pr\u00e9visualisation","save":"Sauvegarder","new":"Nouveau","new_style":"Nouveau style","delete":"Supprimer","delete_confirm":"Supprimer cette personnalisation","about":"Vous pouvez modifier les feuillets de styles et en-t\u00eates de votre site. Choisissez ou ajouter un style pour commencer l'\u00e9dition."},"email_logs":{"title":"Historique des mails","sent_at":"Envoyer \u00e0","email_type":"Type d'email","to_address":"\u00c0 l'adresse","test_email_address":"Adresse mail \u00e0 tester","send_test":"Envoyer le mail de test","sent_test":"Envoy\u00e9 !"},"impersonate":{"title":"Se faire passer pour un utilisateur","username_or_email":"Pseudo ou adresse mail de l'utilisateur","help":"Utiliser cet outil pour usurper l'identit\u00e9 d'un utilisateur (d\u00e9veloppeur).","not_found":"Cet utilisateur n'a pas \u00e9t\u00e9 trouv\u00e9.","invalid":"D\u00e9sol\u00e9, vous ne pouvez pas vous faire passer pour cet utilisateur."},"users":{"title":"Utilisateurs","create":"Ajouter un administateur","last_emailed":"Derniers contacts","not_found":"D\u00e9sol\u00e9 cet utilisateur n'existe pas dans notre syst\u00e8me.","new":"Nouveau","active":"Actif","pending":"En attente","approved":"Approuv\u00e9 ?","approved_selected":{"one":"Approuver l'utilisateur","other":"Approuver les {{count}} utilisateurs"},"titles":{"active":"Utilisateurs actifs","new":"Nouveaux utilisateurs","pending":"Utilisateur en attente","newuser":"Utilisateurs de niveau 0 (Nouveaux utilisateurs)","basic":"Utilisateurs de niveau 1 (Utilisateurs basiques)","regular":"Utilisateurs de niveau 2 (Utilisateurs r\u00e9guliers)","leader":"Utilisateurs de niveau 3 (Utilisateurs exp\u00e9riment\u00e9s)","elder":"Utilisateurs de niveau 4 (Utilisateurs avanc\u00e9s)","admins":"Administrateurs","moderators":"Mod\u00e9rateurs"}},"user":{"ban_failed":"Il y a eu un probl\u00e8me pendant le bannissement de cet utilisateur {{error}}","unban_failed":"Il y a eu un probl\u00e8me pendant le d\u00e9bannissement de cet utilisateur {{error}}","ban_duration":"Pour combien de temps voulez-vous bannir cet utilisateur ? (jours)","delete_all_posts":"Supprimer tous les messages","ban":"Bannir","unban":"D\u00e9bannir","banned":"Banni ?","moderator":"Mod\u00e9rateur ?","admin":"Admin ?","show_admin_profile":"Admin","refresh_browsers":"Forcer le rafra\u00eechissement du navigateur","show_public_profile":"Montrer un profil public","impersonate":"Imiter","revoke_admin":"R\u00e9voquer les droits d'admin","grant_admin":"Accorder les droits d'admin","revoke_moderation":"R\u00e9voquer les droits de mod\u00e9ration","grant_moderation":"Accorder les droits de mod\u00e9ration","reputation":"R\u00e9putation","permissions":"permissions","activity":"activit\u00e9","like_count":"J'aime re\u00e7us","private_topics_count":"compte des discussions priv\u00e9es","posts_read_count":"messages lus","post_count":"messages post\u00e9s","topics_entered":"discussions avec participation","flags_given_count":"flags donn\u00e9s","flags_received_count":"flags re\u00e7us","approve":"Approuver","approved_by":"approuv\u00e9 par","time_read":"Temps de lecture","delete":"Supprimer cet utilisateur","delete_forbidden":"Cet utilisateur ne peut pas \u00eatre supprim\u00e9 car il y a des messages. Veuillez supprimmez tous ses messages.","delete_confirm":"\u00cates-vous vraiment s\u00fbr de vouloir supprimmer d\u00e9finitivement cet utilisateur de votre site ? Cette action est permanente !","deleted":"L'utilisateur a \u00e9t\u00e9 supprimm\u00e9.","delete_failed":"Il y a eu une erreur lors de la suppression de l'utilisateur. Veuillez vous assurez que tous ses messages sont bien supprimm\u00e9s.","send_activation_email":"Envoyer le mail d'activation","activation_email_sent":"Un email d'activation a \u00e9t\u00e9 envoy\u00e9.","send_activation_email_failed":"Il y a eu un probl\u00e8me lors de l'envoie du mail d'activation.","activate":"Activer le compte","activate_failed":"Il y a eu un probl\u00e8me lors de l'activation du compte.","deactivate_account":"D\u00e9sactive le compte","deactivate_failed":"Il y a eu un probl\u00e8me lors de la d\u00e9sactivation du compte."},"site_content":{"none":"Choisissez un type de contenu afin de commencer l'\u00e9dition.","title":"Contenu du site","edit":"Modifier le contenu du site"},"site_settings":{"show_overriden":"Ne montrer que ce qui a \u00e9t\u00e9 chang\u00e9","title":"Param\u00e8tres du site","reset":"r\u00e9tablir par d\u00e9faut"}}}}};
I18n.locale = 'fr'
;
