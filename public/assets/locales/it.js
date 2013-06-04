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
MessageFormat.locale.it = function ( n ) {
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
    })({});I18n.translations = {"it":{"js":{"share":{"topic":"condividi un link a questo topic","post":"condividi un link a questo post","close":"chiudi","twitter":"condividi link su Twitter","facebook":"condividi link su Facebook","google+":"condividi link su Google+","email":"invia link via email"},"edit":"modifica titolo e categoria di questo topic","not_implemented":"Spiacenti, questa funzione non \u00e8 ancora stata implementata!","no_value":"No","yes_value":"Si","of_value":"di","generic_error":"Spiacenti, si \u00e8 verificato un errore.","log_in":"Log In","age":"Et\u00e0","last_post":"Ultimo post","admin_title":"Amministrazione","flags_title":"Segnalazioni","show_more":"mostra tutto","links":"Link","faq":"FAQ","you":"Tu","or":"o","now":"adesso","read_more":"continua a leggere","in_n_seconds":{"one":"in 1 secondo","other":"in {{count}} secondi"},"in_n_minutes":{"one":"in 1 minuto","other":"in {{count}} minuti"},"in_n_hours":{"one":"in 1 ora","other":"in {{count}} ore"},"in_n_days":{"one":"in 1 giorno","other":"in {{count}} giorni"},"suggested_topics":{"title":"Topic suggeriti"},"bookmarks":{"not_logged_in":"Spiacenti, devi essere loggato per fare il bookmark del post.","created":"Post salvato nei bookmark.","not_bookmarked":"Hai letto questo post; clicca per salvarlo tra i bookmark.","last_read":"Questo \u00e8 l'ultimo post che hai letto."},"new_topics_inserted":"{{count}} nuovi topic.","show_new_topics":"Clicca per mostrare.","preview":"anteprima","cancel":"cancella","save":"Salva Modifiche","saving":"Salvataggio...","saved":"Salvato!","choose_topic":{"none_found":"Nessun topic trovato.","title":{"search":"Cerca un Topic:","placeholder":"scrivi qui il titolo del topic"}},"user_action":{"user_posted_topic":"<a href='{{userUrl}}'>{{user}}</a> ha pubblicato <a href='{{topicUrl}}'>il topic</a>","you_posted_topic":"<a href='{{userUrl}}'>Tu</a> hai pubblicato <a href='{{topicUrl}}'>il topic</a>","user_replied_to_post":"<a href='{{userUrl}}'>{{user}}</a> ha risposto a <a href='{{postUrl}}'>{{post_number}}</a>","you_replied_to_post":"<a href='{{userUrl}}'>Tu</a> hai risposto a <a href='{{postUrl}}'>{{post_number}}</a>","user_replied_to_topic":"<a href='{{userUrl}}'>{{user}}</a> ha risposto <a href='{{topicUrl}}'>al topic</a>","you_replied_to_topic":"<a href='{{userUrl}}'>Tu</a> hai risposto <a href='{{topicUrl}}'>al topic</a>","user_mentioned_user":"<a href='{{user1Url}}'>{{user}}</a> ha menzionato <a href='{{user2Url}}'>{{another_user}}</a>","user_mentioned_you":"<a href='{{user1Url}}'>{{user}}</a> ha menzionato <a href='{{user2Url}}'>te</a>","you_mentioned_user":"<a href='{{user1Url}}'>Tu</a> hai menzionato <a href='{{user2Url}}'>{{user}}</a>","posted_by_user":"Pubblicato da <a href='{{userUrl}}'>{{user}}</a>","posted_by_you":"Pubblicato da <a href='{{userUrl}}'>te</a>","sent_by_user":"Inviato da <a href='{{userUrl}}'>{{user}}</a>","sent_by_you":"Inviato da <a href='{{userUrl}}'>te</a>"},"user_action_groups":{"1":"Like","2":"Like ricevuti","3":"Bookmark","4":"Topic","5":"Risposte","6":"Risposte","7":"Menzioni","9":"Citazioni","10":"Preferiti","11":"Modifiche","12":"Oggetti inviati","13":"Inbox"},"user":{"profile":"Profilo","title":"Utente","mute":"Ignora","edit":"Modifica Preferenze","download_archive":"scarica archivio dei miei post","private_message":"Messaggio Privato","private_messages":"Messaggi","activity_stream":"Attivit\u00e0","preferences":"Preferenze","bio":"Su di me","invited_by":"Invitato Da","trust_level":"Trust Level","external_links_in_new_tab":"Apri tutti i link esterni in una nuova tab","enable_quoting":"Abilita risposta con citazione su testo selezionato","moderator":"{{user}} \u00e8 un moderatore","admin":"{{user}} \u00e8 un amministratore","change_password":{"action":"cambia","success":"(email inviata)","in_progress":"(invio email)","error":"(errore)"},"change_username":{"action":"cambia","title":"Cambia Username","confirm":"Possono esserci consequenze modificando il tuo username. Sei veramente sicuro di volerlo fare?","taken":"Spiacenti, questo username \u00e8 gi\u00e0 utilizzato.","error":"Si \u00e8 verificato un errore modificando il tuo username.","invalid":"Questo username non \u00e8 valido. Deve contenere solo lettere e numeri."},"change_email":{"action":"cambia","title":"Cambia Email","taken":"Spiacenti, questa email non \u00e8 disponibile.","error":"Si \u00e8 verificato un errore modificando la tua email. Forse l'indirizzo \u00e8 gi\u00e0 utilizzato?","success":"Abbiamo inviato una email a questo indirizzo. Segui le istruzioni per confermare la modifica."},"email":{"title":"Email","instructions":"La tua email non verr\u00e0 mai mostrata in pubblico.","ok":"Sembra buona. Ti invieremo una email per confermare.","invalid":"Per favore inserisci un indirizzo email valido.","authenticated":"La tua email \u00e8 stata autenticata da {{provider}}.","frequency":"Ti invieremo una email solo se non ti abbiamo visto di recente e non hai letto ci\u00f2 che ti abbiamo inviato per email."},"name":{"title":"Nome","instructions":"La versione estesa del tuo nome, non deve necessariamente essere unica. Viene usata per agevolare la ricerca tramite menzione @name e mostrata solo nel tuo profilo.","too_short":"Il tuo nome \u00e8 troppo breve.","ok":"Il tuo nome sembra valido."},"username":{"title":"Username","instructions":"Deve essere unico, niente spazi. Gli altri utenti possono menzionarti con @username.","short_instructions":"Gli altri utenti possono menzionarti con @{{username}}.","available":"Il tuo username \u00e8 disponibile.","global_match":"L'email corrisponde allo username registrato.","global_mismatch":"Gi\u00e0 registrato. Prova {{suggestion}}?","not_available":"Non disponibile. Prova {{suggestion}}?","too_short":"Il tuo username \u00e8 troppo corto.","too_long":"Il tuo username \u00e8 troppo lungo.","checking":"Controllo disponibilit\u00e0 username...","enter_email":"Username trovato. Inserisci l'email corrispondente"},"password_confirmation":{"title":"Conferma Password"},"last_posted":"Ultimo Post","last_emailed":"Ultimo via Email","last_seen":"Ultima Visita","created":"Creato il","log_out":"Log Out","website":"Sito web","email_settings":"Email","email_digests":{"title":"Quando non visito il sito, mandami una email riassuntiva degli ultimi aggiornamenti","daily":"quotidiana","weekly":"settimanale","bi_weekly":"ogni due settimane"},"email_direct":"Ricevi un'email quando qualcuno ti cita, risponde ad un tuo post oppure menziona il tuo @username","email_private_messages":"Ricevi un'email quando qualcuno ti invia un messaggio privato","other_settings":"Altro","new_topic_duration":{"label":"Considera i topic come nuovi quando","not_viewed":"Non li ho ancora letti","last_here":"sono stati creati dopo la mia ultima visita","after_n_days":{"one":"sono stati postati nell'ultimo giorno","other":"sono stati postati negli ultimi {{count}} giorni"},"after_n_weeks":{"one":"sono stati postati nell'ultima settimana","other":"sono stati postati nelle ultime {{count}} settimane"}},"auto_track_topics":"Traccia automaticamente i topic in cui entro","auto_track_options":{"never":"mai","always":"sempre","after_n_seconds":{"one":"dopo 1 secondo","other":"dopo {{count}} secondi"},"after_n_minutes":{"one":"dopo 1 minuto","other":"dopo {{count}} minuti"}},"invited":{"title":"Inviti","user":"Utenti Invitati","none":"{{username}} non ha invitato alcun utente al sito.","redeemed":"Inviti riscattati","redeemed_at":"Riscattato il","pending":"Inviti in corso","topics_entered":"Topic Visti","posts_read_count":"Post Letti","rescind":"Rimuovi Invito","rescinded":"Invito rimosso","time_read":"Tempo di Lettura","days_visited":"Giornate di visita","account_age_days":"Et\u00e0 account in giorni"},"password":{"title":"Password","too_short":"La tua password \u00e8 troppo corta.","ok":"La tua password sembra ok."},"ip_address":{"title":"Ultimo indirizzo IP"},"avatar":{"title":"Avatar","instructions":"Usiamo <a href='https://gravatar.com' target='_blank'>Gravatar</a> per gli avatar basandoci sulla tua email"},"filters":{"all":"Tutti"},"stream":{"posted_by":"Pubblicato da da","sent_by":"Inviato da","private_message":"messaggio privato","the_topic":"il topic"}},"loading":"Caricamento...","close":"Chiudi","learn_more":"di pi\u00f9...","year":"anno","year_desc":"topic postati negli ultimi 365 giorni","month":"month","month_desc":"topic postati negli ultimi 30 giorni","week":"week","week_desc":"topic postati negli ultimi 7 giorni","first_post":"Primo post","mute":"Ignora","unmute":"Annulla ignora","best_of":{"title":"Best Of","enabled_description":"Stai guardando il \"Best Of\" di questo topic.","description":"Ci sono <b>{{count}}</b> post in questo topic. Sono tanti! Vuoi risparmiare tempo leggendo solo i post con pi\u00f9 interazioni e risposte?","enable":"Passa a \"Best Of\"","disable":"Annulla \"Best Of\""},"private_message_info":{"title":"Conversazione Privata","invite":"Invita altri utenti..."},"email":"Email","username":"Username","last_seen":"Ultima visita","created":"Registrato","trust_level":"Trust Level","create_account":{"title":"Crea Account","action":"Creane uno adesso!","invite":"Non hai ancora un account?","failed":"Qualcosa \u00e8 andato storto, forse questa email \u00e8 gi\u00e0 registrata, prova il link Password Dimenticata"},"forgot_password":{"title":"Password Dimenticata","action":"Ho dimenticato la mia password","invite":"Inserisci il tuo username ed il tuo indirizzo email, ti invieremo le istruzioni per resettare la tua password.","reset":"Password Reset","complete":"A breve dovresti ricevere un'email con le istruzioni per resettare la tua password."},"login":{"title":"Log In","username":"Login","password":"Password","email_placeholder":"indirizzo email o username","error":"Errore sconosciuto","reset_password":"Resetta Password","logging_in":"Login in corso...","or":"O","authenticating":"Autenticazione in corso...","awaiting_confirmation":"Il tuo account \u00e8 in attesa di attivazione, usa il link Password Dimenticata per ricevere una nuova mail di attivazione.","awaiting_approval":"Il tuo account non \u00e8 ancora stato approvato da un moderatore. Riceverai un'email non appena verr\u00e0 approvato.","not_activated":"Non puoi ancora effettuare il log in. Ti abbiamo mandato un'email con il link di attivazione all'indirizzo <b>{{sentTo}}</b>. Per favore segui le istruzioni in quell'email per attivare il tuo account.","resend_activation_email":"Clicca qui per ricevere nuovamente la mail di attivazione.","sent_activation_email_again":"Ti abbiamo mandato un altro link di attivazione all'indirizzo<b>{{currentEmail}}</b>. Potrebbe volerci qualche minuto prima che arrivi; controlla anche fra lo spam.","google":{"title":"con Google","message":"Autenticazione con Google (l'apertura di pop up deve essere permessa dal browser)"},"twitter":{"title":"con Twitter","message":"Autenticazione con Twitter (l'apertura di pop up deve essere permessa dal browser)"},"facebook":{"title":"con Facebook","message":"Autenticazione con Facebook (l'apertura di pop up deve essere permessa dal browser)"},"yahoo":{"title":"con Yahoo","message":"Autenticazione con Yahoo (l'apertura di pop up deve essere permessa dal browser)"},"github":{"title":"con GitHub","message":"Autenticazione con GitHub (l'apertura di pop up deve essere permessa dal browser)"},"persona":{"title":"con Persona","message":"Autenticazione con Mozilla Persona (l'apertura di pop up deve essere permessa dal browser)"}},"composer":{"posting_not_on_topic":"Stai rispondendo al topic \"{{title}}\", ma al momento stai visualizzando un topic diverso.","saving_draft_tip":"salvataggio","saved_draft_tip":"salvato","saved_local_draft_tip":"salvato in locale","similar_topics":"Il tuo topic \u00e8 simile a...","drafts_offline":"bozze offline","min_length":{"need_more_for_title":"ancora {{n}} caratteri per il titolo","need_more_for_reply":"ancora {{n}} caratteri per il post"},"save_edit":"Salva Modifica","reply_original":"Rispondi al topic originale","reply_here":"Rispondi Qui","reply":"Rispondi","cancel":"Cancella","create_topic":"Crea Topic","create_pm":"Crea Messaggio Privato","users_placeholder":"Aggiungi Utente","title_placeholder":"Scrivi il titolo qui. Qual \u00e8 l'argomento di discussione (si breve)?","reply_placeholder":"Scrivi la tua risposta qui. Usa Markdown o BBCode per formattare. Trascina o incolla un'immagine qui per caricarla.","view_new_post":"Guarda il tuo nuovo post.","saving":"Salvataggio...","saved":"Salvato!","saved_draft":"Hai una bozza di un post in corso. Clicca questo box per riprendere la scrittura.","uploading":"Uploading...","show_preview":"mostra anteprima &raquo;","hide_preview":"&laquo; nascondi anteprima","quote_post_title":"Cita l'intero post","bold_title":"Grassetto","bold_text":"testo grassetto","italic_title":"Corsivo","italic_text":"testo in corsivo","link_title":"Hyperlink","link_description":"descrizione del link","link_dialog_title":"Inserisci Link","link_optional_text":"titolo facoltativo","quote_title":"Blockquote","quote_text":"Blockquote","code_title":"Esempio di codice","code_text":"inserisci il codice qui","image_title":"Immagine","image_description":"descrizione dell'immagine","image_dialog_title":"Inserisci Immagine","image_optional_text":"titolo facoltativo","image_hosting_hint":"Hai bisogno di <a href='http://www.google.com/search?q=free+image+hosting' target='_blank'>free image hosting?</a>","olist_title":"Lista Numerata","ulist_title":"Lista non Numerata","list_item":"Elemento della lista","heading_title":"Intestazione","heading_text":"Intestazione","hr_title":"Riga Orizzontale","undo_title":"Annulla","redo_title":"Ripeti","help":"Aiuto Markdown","toggler":"nascondi o mostra il pannello di composizione","admin_options_title":"Impostazioni opzionali per lo staff","auto_close_label":"Chiusura automatica topic dopo:","auto_close_units":"giorni"},"notifications":{"title":"notifiche di menzioni @name, risposte ai tuoi post e topic, messaggi privati, etc","none":"Non hai notifiche in questo momento.","more":"guarda notifiche pi\u00f9 vecchie","mentioned":"<span title='menzionato' class='icon'>@</span> {{username}} {{link}}","quoted":"<i title='citato' class='icon icon-quote-right'></i> {{username}} {{link}}","replied":"<i title='risposto' class='icon icon-reply'></i> {{username}} {{link}}","posted":"<i title='risposto' class='icon icon-reply'></i> {{username}} {{link}}","edited":"<i title='modificato' class='icon icon-pencil'></i> {{username}} {{link}}","liked":"<i title='liked' class='icon icon-heart'></i> {{username}} {{link}}","private_message":"<i class='icon icon-envelope-alt' title='messaggio privato'></i> {{username}} ti ha mandato un messaggio privato: {{link}}","invited_to_private_message":"{{username}} ti ha invitato ad una conversazione privata: {{link}}","invitee_accepted":"<i title='ha accettato il tuo invito' class='icon icon-signin'></i> {{username}} ha accettato il tuo invito","moved_post":"<i title='post spostato' class='icon icon-arrow-right'></i> {{username}} ha spostato il post qui {{link}}","total_flagged":"totale post segnalati"},"image_selector":{"title":"Inserisci Immagine","from_my_computer":"Dal mio dispositivo","from_the_web":"Dal Web","add_image":"Aggiungi Immagine","remote_title":"immagine remota","remote_tip":"inserisci l'indirizzo dell'immagine (es. http://example.com/image.jpg)","local_title":"immagine locale","local_tip":"clicca per selezionare un'immagine dal tuo dispositivo.","upload":"Upload","uploading_image":"Carico l'immagine"},"search":{"title":"cerca topic, post, utenti o categorie","placeholder":"scrivi i termini di ricerca","no_results":"Nessun risultato.","searching":"Cerco ..."},"site_map":"vai in un'altra lista topic o categoria","go_back":"torna indietro","current_user":"vai alla tua pagina utente","favorite":{"title":"Preferito","help":{"star":"aggiungi questo topic nella tua lista dei preferiti","unstar":"rimuovi questo topic dalla tua lista dei preferiti"}},"topics":{"none":{"favorited":"Non hai alcun topic preferito. Per rendere un topic preferito, clicca la stella di fianco al titolo.","unread":"Non hai alcun topic non letto da leggere.","new":"Non hai nuovi topic da leggere.","read":"Non hai ancora letto alcun topic.","posted":"Non hai ancora postato in nessun topic.","latest":"Non ci sono post popolari. \u00c8 molto triste.","hot":"Non ci sono topic caldi.","category":"Non ci sono topic nella categoria {{category}}."},"bottom":{"latest":"Non ci sono altri topic da leggere.","hot":"Non ci sono altri topic caldi da leggere.","posted":"Non ci sono altri post da leggere.","read":"Non ci sono altri topic da leggere.","new":"Non ci sono altri nuovi topic da leggere.","unread":"Non ci sono altri topic non letti da leggere.","favorited":"Non ci sono altri topic preferiti da leggere.","category":"Non ci sono altri topic nella categoria {{category}} da leggere."}},"rank_details":{"toggle":"attica dettaglio classifica topic","show":"mostra dettaglio classifica topic","title":"Dettaglio Classifica Topic"},"topic":{"create_in":"Crea Topic in {{categoryName}}","create":"Crea Topic","create_long":"Crea un nuovo Topic","private_message":"Inizia una conversazione privata","list":"Topic","new":"nuovo topic","title":"Topic","loading_more":"Carico altri Topic...","loading":"Carico topic...","invalid_access":{"title":"Il Topic \u00e8 privato","description":"Spiacenti, non hai accesso a quel topic!"},"server_error":{"title":"Caricamento Topic fallito","description":"Spiacenti, non \u00e8 stato possibile caricare il topic, probabilmente per un problema di connessione. Per favore prova ancora. Facci sapere se il problema persiste."},"not_found":{"title":"Topic non trovato","description":"Spiacenti, il topic non \u00e8 stato trovato. Forse \u00e8 stato eliminato da un moderatore?"},"unread_posts":"hai {{unread}} vecchi post non letti in questo topic","new_posts":"ci sono {{new_posts}} nuovi post in questo topic dalla tua ultima visita","likes":{"one":"c'\u00e8 1 like in questo topic","other":"ci sono {{count}} like in questo topic"},"back_to_list":"Torna all'Elenco dei Topic","options":"Opzioni Topic","show_links":"mostra i link in questo topic","toggle_information":"informazioni sul topic","read_more_in_category":"Vuoi leggere di pi\u00f9? Guarda altri topic nella categoria {{catLink}} o {{latestLink}}.","read_more":"Vuoi leggere di pi\u00f9? {{catLink}} o {{latestLink}}.","browse_all_categories":"Guarda tutte le categorie","view_latest_topics":"guarda gli ultimi topic","suggest_create_topic":"Perch\u00e9 non creare un topic?","read_position_reset":"La tua posizione di lettura \u00e8 stata reimpostata.","jump_reply_up":"vai alla risposta precedente","jump_reply_down":"vai alla risposta successiva","deleted":"Il Topic \u00e8 stato eliminato","auto_close_notice":"Questo topic verr\u00e0 automaticamente chiuso in %{timeLeft}.","auto_close_title":"Impostazioni Auto-Chiusura","auto_close_save":"Salva","auto_close_cancel":"Cancella","auto_close_remove":"Non Auto-Chiudere questo Topic","progress":{"title":"topic progress","jump_top":"vai al primo post","jump_bottom":"vai all'ultimo post","total":"totale post","current":"post corrente"},"notifications":{"title":"","reasons":{"3_2":"Riceverai notifiche perch\u00e9 sei iscritto a questo topic.","3_1":"Riceverai notifiche perch\u00e9 hai creato questo topic.","3":"Riceverai notifiche perch\u00e9 sei iscritto a questo topic.","2_4":"Riceverai notifiche perch\u00e9 hai risposto a questo topic.","2_2":"Riceverai notifiche perch\u00e9 stai tracciando questo topic.","2":"Riceverai notifiche perch\u00e9 <a href=\"/users/{{username}}/preferences\">hai letto questo topic</a>.","1":"Verrai notificato solo se qualcuno menziona il tuo @nome o risponde ad un tuo post.","1_2":"Verrai notificato solo se qualcuno menziona il tuo @nome o risponde ad un tuo post.","0":"Stai ignorando tutte le notifiche a questo topic.","0_2":"Stai ignorando tutte le notifiche a questo topic."},"watching":{"title":"Iscritto","description":"come il Tracking, ma verrai anche notificato ad ogni nuova risposta."},"tracking":{"title":"Tracking","description":"verrai notificato dei post non letti, delle menzioni @nome, risposte ai tuoi post."},"regular":{"title":"Normale","description":"verrai notificato solo se qualcuno menziona il tuo @nome o risponde ad un tuo post."},"muted":{"title":"Ignora","description":"non riceverai nessuna notifica su questo topic e non apparir\u00e0 nel tuo tab non letti."}},"actions":{"delete":"Elimina Topic","open":"Apri Topic","close":"Chiudi Topic","auto_close":"Auto Chiusura","unpin":"Un-Pin Topic","pin":"Pin Topic","unarchive":"Togli dall'archivio il Topic","archive":"Archivia Topic","invisible":"Rendi Invisibile","visible":"Rendi Visibile","reset_read":"Reset Read Data","multi_select":"Unisci/Dividi Post","convert_to_topic":"Converti in un Topic Normale"},"reply":{"title":"Rispondi","help":"scrivi una risposta a questo topic"},"clear_pin":{"title":"Cancella pin","help":"Il topic non sar\u00e0 pi\u00f9 pinnato e non apparir\u00e0 in cima alla lista dei topic"},"share":{"title":"Condividi","help":"condividi questo topic"},"inviting":"Sto invitando...","invite_private":{"title":"Invita a Conversazione Privata","email_or_username":"L'Email o l'Username dell'invitato","email_or_username_placeholder":"indirizzo email o username","action":"Invita","success":"Grazie! Abbiamo invitato quell'utente a partecipare in questa conversazione privata.","error":"Spiacenti, si \u00e8 verificato un errore nell'invitare l'utente."},"invite_reply":{"title":"Invita gli amici a partecipare","action":"Invito Email","help":"spedisci un invito agli amici in modo che possano partecipare a questo topic","email":"Manderemo ai tuoi amici una breve mail dove potranno rispondere a questo topic cliccando su un semplice link.","email_placeholder":"indirizzo email","success":"Grazie! Abbiamo mandato un invito a <b>{{email}}</b>. Ti faremo sapere quando accetteranno l'invito. Controlla il tab inviti nella tua pagina utente per tenere traccia di chi hai invitato.","error":"Spiacenti, non abbiamo potuto invitare quella persona. Forse \u00e8 gi\u00e0 un utente iscritto?"},"login_reply":"Log In per Rispondere","filters":{"user":"Stai vedendo solo {{n_posts}} {{by_n_users}}.","n_posts":{"one":"1 post","other":"{{count}} post"},"by_n_users":{"one":"da 1 utente specifico","other":"da {{count}} utenti specifici"},"best_of":"Stai vedendo i {{n_best_posts}} {{of_n_posts}}.","n_best_posts":{"one":"1 best post","other":"{{count}} best post"},"of_n_posts":{"one":"di 1 nel topic","other":"di {{count}} nel topic"},"cancel":"Mostra nuovamente tutti i post di questo topic."},"split_topic":{"title":"Dividi Topic","action":"dividi topic","topic_name":"Nuovo nome topic:","error":"Si \u00e8 verificato un errore nella divisione del topic","instructions":{"one":"Stai per creare un nuovo topic per popolarlo con i post che hai selezionato","other":"Stai per creare un nuovo topic per popolarlo con i <b>{{count}}</b> post che hai selezionato"}},"merge_topic":{"title":"Unisci Topic","action":"unisci topic","error":"Si \u00e8 verificato un errore unendo questo topic.","instructions":{"one":"Seleziona il topic in cui desideri spostare questo post.","other":"Seleziona il topic in cui desideri spostare questi <b>{{count}}</b> post."}},"multi_select":{"select":"seleziona","selected":"selezionati ({{count}})","delete":"elimina selezionati","cancel":"annulla selezione","description":{"one":"Hai selezionato <b>1</b> post.","other":"Hai selezionato <b>{{count}}</b> post."}}},"post":{"reply":"Rispondendo a {{link}} di {{replyAvatar}} {{username}}","reply_topic":"Rispondi a {{link}}","quote_reply":"cita risposta","edit":"Modificando {{link}} di {{replyAvatar}} {{username}}","post_number":"post {{number}}","in_reply_to":"in risposta a","reply_as_new_topic":"Rispondi come Nuovo Topic","continue_discussion":"La discussione continua da {{postLink}}:","follow_quote":"vai al post quotato","deleted_by_author":"(post eliminato dall'autore)","expand_collapse":"espandi/chiudi","has_replies":{"one":"Risposta","other":"Risposte"},"errors":{"create":"Spiacenti, si \u00e8 verificato un errore durante la creazione del tuo post. Per favore, prova di nuovo.","edit":"Spiacenti, si \u00e8 verificato un errore durante la modifica del tuo post. Per favore, prova di nuovo.","upload":"Spiacenti, si \u00e8 verificato un errore durante il caricamento del file. Per favore, prova di nuovo.","upload_too_large":"Spiacenti, il file che stai cercando di caricare \u00e8 troppo grande (la dimensione massima \u00e8 {{max_size_kb}}kb), per favore ridimensionalo e prova di nuovo.","upload_too_many_images":"Spiacenti, puoi caricare un'immagine per volta.","only_images_are_supported":"Spiacenti, puoi caricare solo immagini."},"abandon":"Sei sicuro di voler abbandonare il tuo post?","archetypes":{"save":"Opzioni di Salvataggio"},"controls":{"reply":"inizia a scrivere una risposta a questo post","like":"like","edit":"modifica post","flag":"segnala questo post all'attezione dei moderatori","delete":"elimina post","undelete":"annulla eliminazione post","share":"condividi questo post","bookmark":"aggiungilo ai tuoi segnalibri","more":"Di pi\u00f9"},"actions":{"flag":"Segnala","clear_flags":{"one":"Annulla segnalazione","other":"Annulla segnalazioni"},"it_too":{"off_topic":"Segnala anche","spam":"Segnala anche","inappropriate":"Segnala anche","custom_flag":"Segnala anche","bookmark":"Anche nei segnalibri","like":"Like anche","vote":"Vota anche"},"undo":{"off_topic":"Annulla segnalazione","spam":"Annulla segnalazione","inappropriate":"Annulla segnalazione","bookmark":"Annulla segnalibro","like":"Annulla like","vote":"Annulla voto"},"people":{"off_topic":"{{icons}} segnato questo come off-topic","spam":"{{icons}} segnato questo come spam","inappropriate":"{{icons}} segnato questo come inappropriato","notify_moderators":"{{icons}} moderatori notificati","notify_moderators_with_url":"{{icons}} <a href='{{postUrl}}'>moderatori notificati</a>","notify_user":"{{icons}} ha inviato un messaggio privato","notify_user_with_url":"{{icons}} ha inviato un <a href='{{postUrl}}'>messaggio privato</a>","bookmark":"{{icons}} inserito nei segnalibri","like":"{{icons}} piaciuto","vote":"{{icons}} votato"},"by_you":{"off_topic":"Hai segnalato questo come off-topic","spam":"Hai segnalato questo come spam","inappropriate":"Hai segnalato questo come inappropriato","notify_moderators":"Hai segnalato questo all'attenzione di moderazione","notify_user":"Hai inviato un messaggio privato a questo utente","bookmark":"Hai inserito questo post nei segnalibri","like":"Hai messo Like","vote":"Hai votato per questo post"},"by_you_and_others":{"off_topic":{"one":"Tu e un altro lo avete segnalato come off-topic","other":"Tu e altre {{count}} persone lo avete segnalato come off-topic"},"spam":{"one":"Tu e un altro lo avete segnalato come spam","other":"Tu e altre {{count}} persone lo avete segnalato come spam"},"inappropriate":{"one":"Tu e un altro lo avete segnalato come inappropriato","other":"Tu e altre {{count}} persone lo avete segnalato come inappropriato"},"notify_moderators":{"one":"Tu e un altro lo avete segnalato alla moderazione","other":"Tu e altre {{count}} persone lo avete segnalato alla moderazione"},"notify_user":{"one":"Tu e un altro avete inviato un messaggio privato a questo utente","other":"Tu e altre {{count}} persone avete inviato un messaggio privato a questo utente"},"bookmark":{"one":"Tu e un altro avete messo nei segnalibri questo post","other":"Tu e altre {{count}} persone avete messo nei segnalibri questo post"},"like":{"one":"A te e un altro piace questo","other":"A te e ad altre {{count}} persone piace questo"},"vote":{"one":"Tu e un altro avete votato per questo post","other":"Tu e altre {{count}} persone avete votato per questo post"}},"by_others":{"off_topic":{"one":"1 persona lo ha segnalato come off-topic","other":"{{count}} persone hanno segnalato questo come off-topic"},"spam":{"one":"1 persona lo ha segnalato come spam","other":"{{count}} persone hanno segnalato questo come spam"},"inappropriate":{"one":"1 persona lo ha segnalato come inappropriato","other":"{{count}} persone hanno segnalato questo come inappropriato"},"notify_moderators":{"one":"1 persona lo ha segnalato per la moderazione","other":"{{count}} persone hanno segnalato questo per la moderazione"},"notify_user":{"one":"1 persona ha inviato un messaggio privato a questo utente","other":"{{count}} persone hanno inviato un messaggio privato a questo utente"},"bookmark":{"one":"1 persona ha messo nei segnalibri questo post","other":"{{count}} persone hanno messo nei segnalibri questo post"},"like":{"one":"Ad 1 persona \u00e8 piaciuto questo","other":"A {{count}} persone \u00e8 piaciuto questo"},"vote":{"one":"1 persona ha votato questo post","other":"{{count}} persone hanno votato questo post"}}},"edits":{"one":"1 modifica","other":"{{count}} modifiche","zero":"nessuna modifica"},"delete":{"confirm":{"one":"Sei sicuro di voler eliminare quel post?","other":"Sei sicuro di voler eliminare tutti quei post?"}}},"category":{"none":"(nessuna categoria)","edit":"modifica","edit_long":"Modifica Categoria","edit_uncategorized":"Modifica Non categorizzata","view":"Mostra Topic nella Categoria","general":"Generale","settings":"Impostazioni","delete":"Elimina Categoria","create":"Crea Categoria","save":"Salva Categoria","creation_error":"Si \u00e8 verificato un errore durante la creazione della categoria.","save_error":"Si \u00e8 verificato un errore durante il salvataggio della categoria..","more_posts":"guarda tutti i {{posts}} post...","name":"Nome Categoria","description":"Descrizione","topic":"topic categoria","badge_colors":"colori Badge","background_color":"colore Sfondo","foreground_color":"colore Testo","name_placeholder":"Breve e Succinto.","color_placeholder":"Qualsiasi colore web","delete_confirm":"Sei sicuro di voler eliminare quella categoria?","delete_error":"Si \u00e8 verificato un errore durante la cancellazione della categoria.","list":"Lista Categorie","no_description":"Nessuna descrizione per questa categoria.","change_in_category_topic":"Modifica Descrizione","hotness":"Hotness","already_used":"Questo colore \u00e8 gi\u00e0 in uso da un'altra categoria","is_secure":"Categoria protetta?","add_group":"Aggiungi Gruppo","security":"Protezione","allowed_groups":"Gruppi Ammessi:","auto_close_label":"Auto-chiusura topic dopo:"},"flagging":{"title":"Perch\u00e9 stai segnalando questo post?","action":"Segnala Post","notify_action":"Notifica","cant":"Spiacenti, non puoi segnalare questo post al momento.","custom_placeholder_notify_user":"Perch\u00e9 vuoi contattare privatamente o direttamente questo utente? Si specifico, costruttivo e cortese.","custom_placeholder_notify_moderators":"Perch\u00e9 questo post richiede l'attenzione di un moderatore? Facci sapere nello specifico cosa non va e fornisci opportuni link se possibile.","custom_message":{"at_least":"inserisci almeno {{n}} caratteri","more":"ancora {{n}}...","left":"{{n}} rimanenti"}},"topic_summary":{"title":"Riepilogo del Topic","links_shown":"mostra tutti i {{totalLinks}} link...","clicks":"click","topic_link":"topic link"},"topic_statuses":{"locked":{"help":"questo topic \u00e8 chiuso; non \u00e8 possibile postare nuove risposte"},"pinned":{"help":"questo topic \u00e8 pinned; sar\u00e0 mostrato in cima alla lista dei topic"},"archived":{"help":"questo topic \u00e8 archiviato; \u00e8 congelato e non pu\u00f2 essere modificato"},"invisible":{"help":"questo topic \u00e8 invisibile; non sar\u00e0 mostrato nella lista dei topic, pu\u00f2 essere raggiunto solo tramite link diretto"}},"posts":"Post","posts_long":"{{number}} post in questo topic","original_post":"Post Originale","views":"Visite","replies":"Risposte","views_long":"questo topic \u00e8 stato visto {{number}} volte","activity":"Attivit\u00e0","likes":"Like","top_contributors":"Partecipanti","category_title":"Categoria","history":"Cronologia","changed_by":"di {{author}}","categories_list":"Elenco Categorie","filters":{"latest":{"title":"Ultimi","help":"topic pi\u00f9 recenti"},"hot":{"title":"Hot","help":"una selezione dei topic pi\u00f9 attivi"},"favorited":{"title":"Preferiti","help":"topic preferiti"},"read":{"title":"Letti","help":"topic che hai letto"},"categories":{"title":"Categorie","title_in":"Categoria - {{categoryName}}","help":"tutti i topic raggruppati per categoria"},"unread":{"title":{"zero":"Non Letti","one":"Non Letti (1)","other":"Non Letti ({{count}})"},"help":"topic tracciati con post non letti"},"new":{"title":{"zero":"Nuovi","one":"Nuovi (1)","other":"Nuovi ({{count}})"},"help":"nuovi topic dall'ultima tua visita"},"posted":{"title":"Miei Post","help":"topic in cui hai postato"},"category":{"title":{"zero":"{{categoryName}}","one":"{{categoryName}} (1)","other":"{{categoryName}} ({{count}})"},"help":"ultimi topic nella categoria {{categoryName}}"}},"browser_update":"Purtroppo, <a href=\"http://www.discourse.org/faq/#browser\">la versione del browser \u00e8 data per supportare questo forum Discourse</a>. Per favore <a href=\"http://browsehappy.com\">aggiorna il tuo browser</a>.","type_to_filter":"scrivi per filtrare...","admin":{"title":"Amministrazione Discourse","moderator":"Moderatore","dashboard":{"title":"Dashboard","version":"Versione","up_to_date":"Sei aggiornato!","critical_available":"Un aggiornamento critico \u00e8 disponibile.","updates_available":"Aggiornamenti disponibili.","please_upgrade":"Per favore aggiorna!","installed_version":"Installata","latest_version":"Ultima","problems_found":"Sono stati trovati alcuni problemi con la tua installazione di Discourse:","last_checked":"Ultimo controllo","refresh_problems":"Aggiorna","no_problems":"Nessun problema trovato.","moderators":"Moderatori:","admins":"Amministratori:","private_messages_short":"PMs","private_messages_title":"Messaggi Privati","reports":{"today":"Oggi","yesterday":"Ieri","last_7_days":"Ultimi 7 Giorni","last_30_days":"Ultimi 30 Giorni","all_time":"Sempre","7_days_ago":"7 Giorni fa","30_days_ago":"30 Giorni fa","all":"Tutti","view_table":"Vedi come Tabella","view_chart":"Vedi come Grafico a Barre"}},"commits":{"latest_changes":"Ultime modifiche: ricorda di aggiorna spesso!","by":"da"},"flags":{"title":"Segnalazioni","old":"Vecchie","active":"Attive","clear":"Annulla Segnala","clear_title":"annulla tutte le segnalazioni su questo post (i post nascosti diventeranno visibili)","delete":"Cancella Post","delete_title":"cancella post (se \u00e8 il primo post il topic verr\u00e0 cancellato)","flagged_by":"Segnalato da","error":"Qualcosa \u00e8 andato storto","view_message":"view message"},"groups":{"title":"Gruppi","edit":"Modifica Gruppi","selector_placeholder":"aggiungi utenti","name_placeholder":"Nome gruppo, no spazi, come lo username"},"api":{"title":"API","long_title":"Informazioni API","key":"Key","generate":"Genera API Key","regenerate":"Rigenera API Key","info_html":"La API Key ti permetter\u00e0 di creare e aggiornare topic usando chiamate JSON.","note_html":"Conserva <strong>in modo sicuro</strong> questa chiave. Tutti gli utenti con questa chiave possono creare arbitrariamente post."},"customize":{"title":"Personalizza","long_title":"Personalizzazioni Sito","header":"Header","css":"Stylesheet","override_default":"Sovrascrivi default?","enabled":"Attivo?","preview":"anteprima","undo_preview":"annulla anteprima","save":"Salva","new":"Nuovo","new_style":"Nuovo Stile","delete":"Elimina","delete_confirm":"Elimina questa personalizzazione?","about":"La Personalizzazione del Sito di permette di modificare i fogli di stile e le testate del sito."},"email_logs":{"title":"Log Email","sent_at":"Visto il","email_type":"Tipo Email","to_address":"Indirizzo destinatario","test_email_address":"indirizzo email da testare","send_test":"manda email di test","sent_test":"spedita!"},"impersonate":{"title":"Impersona Utente","username_or_email":"Username o Email dell'Utente","help":"Usa questo strumento per impersonare un account Utente per ragioni di debug.","not_found":"Quell'utente non pu\u00f2 essere trovato.","invalid":"Spiacente, non puoi impersonare quell'utente."},"users":{"title":"Utenti","create":"Aggiungi Amministratore","last_emailed":"Ultima Email","not_found":"Spiacenti quell'username non esiste nel sistema.","new":"Nuovi","active":"Attivi","pending":"In Sospeso","approved":"Approvare?","approved_selected":{"one":"approva utente","other":"approva utenti ({{count}})"},"titles":{"active":"Utenti Attivi","new":"Nuovi Utenti","pending":"Utenti in attesa di verifica","newuser":"Utenti Trust Level 0 (New User)","basic":"Utenti Trust Level 1 (Basic User)","regular":"Utenti Trust Level 2 (Regular User)","leader":"Utenti Trust Level 3 (Leader)","elder":"Utenti Trust Level 4 (Elder)","admins":"Amministratori","moderators":"Moderatori"}},"user":{"ban_failed":"Qualcosa \u00e8 andato storto nel bannare questo utente {{error}}","unban_failed":"Qualcosa \u00e8 andato rimuovendo il ban a questo utente {{error}}","ban_duration":"Per quanto tempo vuoi bannare l'utente? (giorni)","delete_all_posts":"Cancella tutti i post","ban":"Ban","unban":"Rimuovi Ban","banned":"Bannato?","moderator":"Moderatore?","admin":"Amministratore?","show_admin_profile":"Amministratore","refresh_browsers":"Forza refresh del browser","show_public_profile":"Mostra profilo pubblico","impersonate":"Impersona","revoke_admin":"Revoca Amministratore","grant_admin":"Garantisci Amministratore","revoke_moderation":"Revoca Moderatore","grant_moderation":"Garantisci Moderatore","reputation":"Reputazione","permissions":"Permessi","activity":"Attivit\u00e0","like_count":"Like Ricevuti","private_topics_count":"Topic Privati","posts_read_count":"Post Letti","post_count":"Post Creati","topics_entered":"Topic Visitati","flags_given_count":"Segnalazioni Fatte","flags_received_count":"Segnalazioni Ricevute","approve":"Approva","approved_by":"approvato da","time_read":"Tempo di Lettura","delete":"Cancella Utente","delete_forbidden":"Questo utente non pu\u00f2 essere cancellato poich\u00e9 ci sono altri post. Cancella i suoi post prima di eliminarlo.","delete_confirm":"Sei sicuro di voler cancellare definitivamente questo utente? Questa azione \u00e8 irreversibile!","deleted":"L'utente \u00e8 stato cancellato.","delete_failed":"Si sono verificati degli errori nella cancellazione dell'utente. Assicurati che tutti i suoi post sono stati cancellati.","send_activation_email":"Invia Email di Attivazione","activation_email_sent":"Una email di attivazione \u00e8 stata inviata.","send_activation_email_failed":"Si sono verificati dei problemi durante l'invio dell'email di attivazione.","activate":"Attiva Account","activate_failed":"Si sono verificati dei problemi durante l'attivazione dell'account.","deactivate_account":"Disattiva Account","deactivate_failed":"Si sono verificati dei problemi durante la disattivazione dell'account."},"site_content":{"none":"Scegli un tipo di contenuto da modificare.","title":"Contento","edit":"Modifica Contenuto Sito"},"site_settings":{"show_overriden":"Mostra solo modificati","title":"Impostazioni Sito","reset":"resetta al default"}}}}};
I18n.locale = 'it'
;
