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
MessageFormat.locale.es = function ( n ) {
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
    })({});I18n.translations = {"es":{"js":{"share":{"topic":"comparte un enlace a este tema","post":"comparte un enlace a esta publicaci\u00f3n","close":"cerrar"},"edit":"editar el t\u00edtulo y la categor\u00eda de este tema","not_implemented":"Esta caracter\u00edstica no ha sido implementada a\u00fan, \u00a1lo sentimos!","no_value":"No","yes_value":"S\u00ed","of_value":"de","generic_error":"Lo sentimos, ha ocurrido un error.","log_in":"Ingreso","age":"Edad","last_post":"\u00daltima publicaci\u00f3n","admin_title":"Admin","flags_title":"Banderas","show_more":"ver m\u00e1s","links":"Enlaces","faq":"FAQ","you":"Usted","ok":"Hecho","or":"o","now":"ahora mismo","suggested_topics":{"title":"Temas Sugeridos"},"bookmarks":{"not_logged_in":"Lo sentimos, debes haber ingresado para marcar publicaciones.","created":"Has marcado esta publicaci\u00f3n como favorita.","not_bookmarked":"Has le\u00eddo esta publicaci\u00f3n, de click para marcarla como favorita.","last_read":"Esta es la \u00faltima publicaci\u00f3n que has le\u00eddo."},"new_topics_inserted":"{{count}} nuevos temas.","show_new_topics":"Click para mostrar.","preview":"vista previa","cancel":"cancelar","save":"Guardar Cambios","saving":"Guardando...","saved":"\u00a1Guardado!","user_action_descriptions":{"6":"Respuestas"},"user":{"profile":"Perfil","title":"Usuario","mute":"Silenciar","edit":"Editar Preferencias","download_archive":"descargar un archivo con mis publicaciones","private_message":"Mensaje Privado","private_messages":"Mensajes","activity_stream":"Actividad","preferences":"Preferencias","bio":"Acerca de m\u00ed","change_password":"cambiar","invited_by":"Invitado por","trust_level":"Nivel de Confianza","external_links_in_new_tab":"Abrir todos los links externos en una nueva pesta\u00f1a","enable_quoting":"Activar respuesta citando el texto resaltado","change_username":{"action":"cambiar","title":"Cambiar Nombre de Usuario","confirm":"Pueden haber consecuencias al cambiar tu nombre de usuario. \u00bfEst\u00e1s absolutamente seguro de que deseas cambiarlo?","taken":"Lo sentimos, pero este nombre de usuario ya est\u00e1 tomado.","error":"Hubo un error al cambiar tu nombre de usuario.","invalid":"Este nombre de usuario es inv\u00e1lido. Debe incluir s\u00f3lo n\u00fameros y letras"},"change_email":{"action":"cambiar","title":"Cambiar Email","taken":"Lo sentimos, este email no est\u00e1 disponible.","error":"Hubo un error al cambiar tu email. \u00bfTal vez esa direcci\u00f3n ya est\u00e1 en uso?","success":"Te hemos enviado un email a esa direcci\u00f3n. Por favor sigue las instrucciones de confirmaci\u00f3n."},"email":{"title":"Email","instructions":"Tu email nunca ser\u00e1 mostrado al p\u00fablico.","ok":"Se ve bien. Te enviaremos un email para confirmar.","invalid":"Por favor ingresa una direcci\u00f3n de email v\u00e1lida.","authenticated":"Tu email ha sido autenticado por {{provider}}.","frequency":"S\u00f3lo te enviaremos emails si no te hemos visto recientemente y todav\u00eda no has visto lo que te estamos enviando."},"name":{"title":"Nombre","instructions":"La versi\u00f3n m\u00e1s larga de tu nombre; no tiene por qu\u00e9 ser \u00fanico. Usado para coincidir con @nombre y mostrado s\u00f3lo en la p\u00e1gina de tu usuario.","too_short":"Tu nombre es muy corto.","ok":"Tu nombre se ve bien."},"username":{"title":"Nombre de usuario","instructions":"Debe ser \u00fanico, sin espacios. La gente puede mencionarte como @{{username}}.","short_instructions":"La gente puede mencionarte como @{{username}}.","available":"Your username is available.","global_match":"Email matches the registered username.","global_mismatch":"Already registered. Try {{suggestion}}?","not_available":"Not available. Try {{suggestion}}?","too_short":"Your username is too short.","too_long":"Your username is too long.","checking":"Checking username availability...","enter_email":"Username found. Enter matching email."},"password_confirmation":{"title":"Ingrese la Contrase\u00f1a Nuevamente"},"last_posted":"\u00daltimo Publicado","last_emailed":"\u00daltimo Enviado por Email","last_seen":"\u00daltimo Visto","created":"Creado el","log_out":"Cerrar Sesi\u00f3n","website":"Sitio Web","email_settings":"Email","email_digests":{"title":"Cuando no visite el sitio, env\u00edenme un resumen v\u00eda email de las novedades","daily":"diariamente","weekly":"semanalmente","bi_weekly":"cada dos semanas"},"email_direct":"Recibir un email cuando alguien cite, responda, o mencione tu @nombredeusuario","email_private_messages":"Recibir un email cuando alguien te env\u00ede un mensaje privado","other_settings":"Otros","new_topic_duration":{"label":"Considerar que los temas son nuevos cuando","not_viewed":"Todav\u00eda no los he visto","last_here":"han sido publicados desde la \u00faltima vez que estuve aqu\u00ed","after_n_days":{"one":"han sido publicados en el \u00faltimo d\u00eda","other":"han sido publicados en los \u00faltimos {{count}} d\u00edas"},"after_n_weeks":{"one":"han sido publicados en la \u00faltima semana","other":"han sido publicados en las \u00faltimas {{count}} semanas"}},"auto_track_topics":"Seguir autom\u00e1ticamente los temas donde entro","auto_track_options":{"never":"nunca","always":"siempre","after_n_seconds":{"one":"luego de 1 segundo","other":"luego de {{count}} segundos"},"after_n_minutes":{"one":"luego de 1 minuto","other":"luego de {{count}} minutos"}},"invited":{"title":"Invitaciones","user":"Invitar Usuario","none":"{{username}} no ha invitado a ning\u00fan usuario al sitio.","redeemed":"Invitaciones Compensadas","redeemed_at":"Compensada el","pending":"Invitaciones Pendientes","topics_entered":"Temas Vistos","posts_read_count":"Publicaciones Le\u00eddas","rescind":"Eliminar Invitaci\u00f3n","rescinded":"Invitaci\u00f3n eliminada","time_read":"Tiempo de Lectura","days_visited":"D\u00edas Visitados","account_age_days":"Edad de la cuenta en d\u00edas"},"password":{"title":"Contrase\u00f1a","too_short":"Tu contrase\u00f1a es muy corta.","ok":"Tu contrase\u00f1a se ve bien."},"ip_address":{"title":"\u00daltima Direcci\u00f3n IP"},"avatar":{"title":"Avatar","instructions":"Usamos <a href='https://gravatar.com' target='_blank'>Gravatar</a> para obtener tu avatar basado en tu direcci\u00f3n de email."},"filters":{"all":"Todos"},"stream":{"posted_by":"Publicado por","sent_by":"Enviado por","private_message":"mensaje privado","the_topic":"el tema"}},"loading":"Cargando...","close":"Cerrar","learn_more":"aprender m\u00e1s...","year":"a\u00f1o","year_desc":"temas publicados en los \u00faltimos 365 d\u00edas","month":"mes","month_desc":"temas publicados en los \u00faltimos 30 d\u00edas","week":"semana","week_desc":"temas publicados en los \u00faltimos 7 d\u00edas","first_post":"Primera publicaci\u00f3n","mute":"Silenciar","unmute":"Quitar silencio","best_of":{"title":"Lo Mejor De","description":"Hay <b>{{count}}</b> publicaciones en este tema. \u00a1Son realmente muchas! \u00bfTe gustar\u00eda ahorrar algo de tiempo viendo s\u00f3lo las publicaciones con m\u00e1s interacciones y respuestas?","button":"Cambiar a la vista \"Lo Mejor De\""},"private_message_info":{"title":"Conversaci\u00f3n Privada","invite":"Invitar Otros..."},"email":"Email","username":"Nombre de usuario","last_seen":"Visto por \u00faltima vez","created":"Creado","trust_level":"Nivel de Confianza","create_account":{"title":"Crear Cuenta","action":"\u00a1Crear una ahora!","invite":"\u00bfTodav\u00eda no tienes una cuenta?","failed":"Algo sali\u00f3 mal, tal vez este email ya fue registrado, intenta con el enlace 'olvid\u00e9 la contrase\u00f1a'"},"forgot_password":{"title":"Olvid\u00e9 mi Contrase\u00f1a","action":"Olvid\u00e9 mi contrase\u00f1a","invite":"Ingresa tu nombre de usuario o tu direcci\u00f3n de email, y te enviaremos un correo electr\u00f3nico para cambiar tu contrase\u00f1a.","reset":"Cambiar Contrase\u00f1a","complete":"Dentro de poco deber\u00edas estar recibiendo un email con las instrucciones para cambiar tu contrase\u00f1a."},"login":{"title":"Iniciar Sesi\u00f3n","username":"Nombre de usuario","password":"Contrase\u00f1a","email_placeholder":"direcci\u00f3n de email o nombre de usuario","error":"Error desconocido","reset_password":"Reestabler Contrase\u00f1a","logging_in":"Iniciando sesi\u00f3n...","or":"O","authenticating":"Autenticando...","awaiting_confirmation":"Tu cuenta est\u00e1 pendiente de activaci\u00f3n, usa el enlace de 'olvid\u00e9 contrase\u00f1a' para recibir otro email de activaci\u00f3n.","awaiting_approval":"Tu cuenta todav\u00eda no ha sido aprobada por un moderador. Recibir\u00e1s un email cuando sea aprobada.","not_activated":"No puedes iniciar sesi\u00f3n todav\u00eda. Anteriormente te hemos enviado un email de activaci\u00f3n a <b>{{sentTo}}</b>. Por favor sigue las instrucciones en ese email para activar tu cuenta.","resend_activation_email":"Has click aqu\u00ed para enviar el email de activaci\u00f3n nuevamente.","sent_activation_email_again":"Te hemos enviado otro email de activaci\u00f3n a <b>{{currentEmail}}</b>. Podr\u00eda tomar algunos minutos en llegar; aseg\u00farate de revisar tu carpeta de spam.","google":{"title":"con Google","message":"Autenticando con Google (aseg\u00farate de desactivar cualquier bloqueador de pop ups)"},"twitter":{"title":"con Twitter","message":"Autenticando con Twitter (aseg\u00farate de desactivar cualquier bloqueador de pop ups)"},"facebook":{"title":"con Facebook","message":"Autenticando con Facebook (aseg\u00farate de desactivar cualquier bloqueador de pop ups)"},"yahoo":{"title":"con Yahoo","message":"Autenticando con Yahoo (aseg\u00farate de desactivar cualquier bloqueador de pop ups)"},"github":{"title":"con GitHub","message":"Autenticando con GitHub (aseg\u00farate de desactivar cualquier bloqueador de pop ups)"},"persona":{"title":"con Persona","message":"Autenticando con Mozilla Persona (aseg\u00farate de desactivar cualquier bloqueador de pop ups)"}},"composer":{"posting_not_on_topic":"Estas respondiendo al tema \"{{title}}\", pero estas viendo un tema distinto.","saving_draft_tip":"guardando","saved_draft_tip":"guardado","saved_local_draft_tip":"guardado localmente","min_length":{"at_least":"ingresa al menos {{n}} caracteres","more":"{{n}} para comenzar..."},"save_edit":"Guardar Edici\u00f3n","reply_original":"Responder en el Tema Original","reply_here":"Responder Aqu\u00ed","reply":"Responder","cancel":"Cancelar","create_topic":"Crear Tema","create_pm":"Crear Mensaje Privado","users_placeholder":"Agregar usuario","title_placeholder":"Escribe tu t\u00edtulo aqu\u00ed. Sobre qu\u00e9 trata esta discusi\u00f3n en unas pocas palabras.","reply_placeholder":"Escribe tu respuesta aqu\u00ed. Usa Markdown o BBCode para dar formato. Arrastra o pega una imagen aqu\u00ed para subirla.","view_new_post":"Ver tu nueva publicaci\u00f3n.","saving":"Guardando...","saved":"\u00a1Guardado!","saved_draft":"Tienes en progreso un borrador de una publicaci\u00f3n. Has click en cualquier parte de este recuadro para reanudar la edici\u00f3n.","uploading":"Subiendo...","show_preview":"mostrar vista previa &raquo;","hide_preview":"&laquo; ocultar vista previa","bold_title":"Strong","bold_text":"strong text","italic_title":"Emphasis","italic_text":"emphasized text","link_title":"Hyperlink","link_description":"enter link description here","link_dialog_title":"Insert Hyperlink","link_optional_text":"optional title","quote_title":"Blockquote","quote_text":"Blockquote","code_title":"Code Sample","code_text":"enter code here","image_title":"Image","image_description":"enter image description here","image_dialog_title":"Insert Image","image_optional_text":"optional title","image_hosting_hint":"Need <a href='http://www.google.com/search?q=free+image+hosting' target='_blank'>free image hosting?</a>","olist_title":"Numbered List","ulist_title":"Bulleted List","list_item":"List item","heading_title":"Heading","heading_text":"Heading","hr_title":"Horizontal Rule","undo_title":"Undo","redo_title":"Redo","help":"Markdown Editing Help"},"notifications":{"title":"notificaciones por menciones de tu @nombre, respuestas a tus publicaciones y temas, mensajes privados, etc","none":"No tienes notificaciones por el momento.","more":"ver antiguas notificaciones","mentioned":"<span title='mencionado' class='icon'>@</span> {{username}} {{link}}","quoted":"<i title='citado' class='icon icon-quote-right'></i> {{username}} {{link}}","replied":"<i title='replicado' class='icon icon-reply'></i> {{username}} {{link}}","posted":"<i title='replicado' class='icon icon-reply'></i> {{username}} {{link}}","edited":"<i title='editado' class='icon icon-pencil'></i> {{username}} {{link}}","liked":"<i title='gustaron' class='icon icon-heart'></i> {{username}} {{link}}","private_message":"<i class='icon icon-envelope-alt' title='mensaje privado'></i> {{username}} te envi\u00f3 un mensaje privado: {{link}}","invited_to_private_message":"{{username}} te invit\u00f3 a una conversaci\u00f3n privada: {{link}}","invitee_accepted":"<i title='acept\u00f3 tu invitaci\u00f3n' class='icon icon-signin'></i> {{username}} acept\u00f3 tu invitaci\u00f3n","moved_post":"<i title='publicaci\u00f3n trasladada' class='icon icon-arrow-right'></i> {{username}} traslad\u00f3 la publicaci\u00f3n a {{link}}"},"image_selector":{"title":"Insertar Imagen","from_my_computer":"Desde M\u00ed Dispositivo","from_the_web":"Desde La Web","add_image":"Agregar Imagen","remote_tip":"ingrese una direcci\u00f3n de una imagen en la siguiente forma http://ejemplo.com/imagen.jpg","local_tip":"click para seleccionar la imagen desde su dispositivo.","upload":"Subir","uploading_image":"Subiendo imagen"},"search":{"title":"buscar por temas, publicaciones, usuarios o categor\u00edas","placeholder":"escriba su b\u00fasqueda aqu\u00ed","no_results":"No se encontraron resultados.","searching":"Buscando ..."},"site_map":"ir a otra lista de temas o categor\u00eda","go_back":"volver","current_user":"ir a tu p\u00e1gina de usuario","favorite":{"title":"Favoritos","help":"agregar este tema a tu lista de favoritos"},"topics":{"none":{"favorited":"Todav\u00eda no has marcado ning\u00fan tema como favorito. Para marcar uno como favorito, has click o toca con el dedo la estrella que est\u00e1 junto al t\u00edtulo del tema.","unread":"No existen temas que sigas y que ya no hayas le\u00eddo.","new":"No tienes temas nuevos por leer.","read":"Todav\u00eda no has le\u00eddo ning\u00fan tema.","posted":"Todav\u00eda no has publicado en ning\u00fan tema.","latest":"No hay temas populares. Eso es triste.","category":"No hay temas en la categor\u00eda {{category}}."},"bottom":{"latest":"No hay m\u00e1s temas populares para leer.","posted":"No hay m\u00e1s temas publicados para leer.","read":"No hay m\u00e1s temas le\u00eddos.","new":"No hay temas nuevos para leer.","unread":"No hay m\u00e1s temas que no hayas le\u00eddos.","favorited":"No hay m\u00e1s temas favoritos para leer.","category":"No hay m\u00e1s temas en la categor\u00eda {{category}}."}},"topic":{"create_in":"Crear Tema {{categoryName}}","create":"Crear Tema","create_long":"Crear un nuevo Tema","private_message":"Comenzar una conversaci\u00f3n privada","list":"Temas","new":"nuevo tema","title":"Tema","loading_more":"Cargando m\u00e1s Temas...","loading":"Cargando tema...","invalid_access":{"title":"Este tema es privado","description":"Lo sentimos, \u00a1no tienes acceso a este tema!"},"server_error":{"title":"El tema fall\u00f3 al intentar ser cargado","description":"Lo sentimos, no pudimos cargar el tema, posiblemente debido a problemas de conexi\u00f3n. Por favor intenta nuevamente. Si el problema persiste, por favor nos lo hace saber."},"not_found":{"title":"Tema no encontrado","description":"Lo sentimos, no pudimos encontrar ese tema. \u00bfTal vez fue removido por un moderador?"},"unread_posts":"tienes {{unread}} viejas publicaciones sin leer en este tema","new_posts":"hay {{new_posts}} nuevas publicaciones en este tema desde la \u00faltima vez que lo le\u00edste","likes":{"one":"este tema le gusta a 1 persona","other":"este tema les gusta a {{count}} personas"},"back_to_list":"Volver a la Lista de Temas","options":"Opciones del Tema","show_links":"show links within this topic","toggle_information":"toggle topic details","read_more_in_category":"Want to read more? Browse other topics in {{catLink}} or {{latestLink}}.","read_more":"Want to read more? {{catLink}} or {{latestLink}}.","browse_all_categories":"Browse all categories","view_latest_topics":"view latest topics","suggest_create_topic":"Why not create a topic?","read_position_reset":"Your read position has been reset.","jump_reply_up":"jump to earlier reply","jump_reply_down":"jump to later reply","progress":{"title":"topic progress","jump_top":"jump to first post","jump_bottom":"jump to last post","total":"total posts","current":"current post"},"notifications":{"title":"","reasons":{"3_2":"You will receive notifications because you are watching this topic.","3_1":"You will receive notifications because you created this topic.","3":"You will receive notifications because you are watching this topic.","2_4":"You will receive notifications because you posted a reply to this topic.","2_2":"You will receive notifications because you are tracking this topic.","2":"You will receive notifications because you <a href=\"/users/{{username}}/preferences\">read this topic</a>.","1":"You will be notified only if someone mentions your @name or replies to your post.","1_2":"You will be notified only if someone mentions your @name or replies to your post.","0":"You are ignoring all notifications on this topic.","0_2":"You are ignoring all notifications on this topic."},"watching":{"title":"Watching","description":"same as Tracking, plus you will be notified of all new posts."},"tracking":{"title":"Tracking","description":"you will be notified of unread posts, @name mentions, and replies to your posts."},"regular":{"title":"Regular","description":"you will be notified only if someone mentions your @name or replies to your post."},"muted":{"title":"Muted","description":"you will not be notified of anything about this topic, and it will not appear on your unread tab."}},"actions":{"delete":"Delete Topic","open":"Open Topic","close":"Close Topic","unpin":"Un-Pin Topic","pin":"Pin Topic","unarchive":"Unarchive Topic","archive":"Archive Topic","invisible":"Make Invisible","visible":"Make Visible","reset_read":"Reset Read Data","multi_select":"Select for Merge/Split","convert_to_topic":"Convert to Regular Topic"},"reply":{"title":"Reply","help":"begin composing a reply to this topic"},"clear_pin":{"title":"Clear pin","help":"Clear the pinned status of this topic so it no longer appears at the top of your topic list"},"share":{"title":"Share","help":"share a link to this topic"},"inviting":"Inviting...","invite_private":{"title":"Invite to Private Message","email_or_username":"Invitee's Email or Username","email_or_username_placeholder":"email address or username","action":"Invite","success":"Thanks! We've invited that user to participate in this private message.","error":"Sorry there was an error inviting that user."},"invite_reply":{"title":"Invite Friends to Reply","action":"Email Invite","help":"send invitations to friends so they can reply to this topic with a single click","email":"We'll send your friend a brief email allowing them to reply to this topic by clicking a link.","email_placeholder":"email address","success":"Thanks! We mailed out an invitation to <b>{{email}}</b>. We'll let you know when they redeem your invitation. Check the invitations tab on your user page to keep track of who you've invited.","error":"Sorry we couldn't invite that person. Perhaps they are already a user?"},"login_reply":"Log In to Reply","filters":{"user":"You're viewing only posts by specific user(s).","best_of":"You're viewing only the 'Best Of' posts.","cancel":"Show all posts in this topic again."},"move_selected":{"title":"Move Selected Posts","topic_name":"New Topic Name:","error":"Sorry, there was an error moving those posts.","instructions":{"one":"You are about to create a new topic and populate it with the post you've selected.","other":"You are about to create a new topic and populate it with the <b>{{count}}</b> posts you've selected."}},"multi_select":{"select":"select","selected":"selected ({{count}})","delete":"delete selected","cancel":"cancel selecting","move":"move selected","description":{"one":"You have selected <b>1</b> post.","other":"You have selected <b>{{count}}</b> posts."}}},"post":{"reply":"Replying to {{link}} by {{replyAvatar}} {{username}}","reply_topic":"Reply to {{link}}","quote_reply":"quote reply","edit":"Editing {{link}} by {{replyAvatar}} {{username}}","post_number":"post {{number}}","in_reply_to":"in reply to","reply_as_new_topic":"Reply as new Topic","continue_discussion":"Continuing the discussion from {{postLink}}:","follow_quote":"go to the quoted post","deleted_by_author":"(post removed by author)","has_replies":{"one":"Respuesta","other":"Respuestas"},"errors":{"create":"Lo sentimos, hubo un error al crear tu publicaci\u00f3n. Por favor intenta de nuevo.","edit":"Lo sentimos, hubo un error al editar tu publicaci\u00f3n. Por favor intenta de nuevo.","upload":"Lo sentimos, hubo un error al subir el archivo. Por favor intenta de nuevo."},"abandon":"\u00bfEst\u00e1s seguro que deseas abandonar tu publicaci\u00f3n?","archetypes":{"save":"Grabar Opciones"},"controls":{"reply":"componer una respuesta para esta publicaci\u00f3n","like":"me gusta esta publicaci\u00f3n","edit":"edita esta publicaci\u00f3n","flag":"marca esta publicaci\u00f3n para atenci\u00f3n de los moderadores","delete":"elimina esta publicaci\u00f3n","undelete":"deshace la eliminaci\u00f3n de esta publicaci\u00f3n","share":"comparte un enlace a esta publicaci\u00f3n","bookmark":"marca esta publicaci\u00f3n como favorita en tu p\u00e1gina de usuario","more":"M\u00e1s"},"actions":{"flag":"Flag","clear_flags":{"one":"Clear flag","other":"Clear flags"},"it_too":"{{alsoName}} it too","undo":"Undo {{alsoName}}","by_you_and_others":{"zero":"You {{long_form}}","one":"You and 1 other person {{long_form}}","other":"You and {{count}} other people {{long_form}}"},"by_others":{"one":"1 person {{long_form}}","other":"{{count}} people {{long_form}}"}},"edits":{"one":"1 edit","other":"{{count}} edits","zero":"no edits"},"delete":{"confirm":{"one":"Are you sure you want to delete that post?","other":"Are you sure you want to delete all those posts?"}}},"category":{"none":"(no category)","edit":"edit","edit_long":"Edit Category","view":"View Topics in Category","delete":"Delete Category","create":"Create Category","more_posts":"view all {{posts}}...","name":"Category Name","description":"Description","topic":"category topic","color":"Color","name_placeholder":"Should be short and succinct.","color_placeholder":"Any web color","delete_confirm":"Are you sure you want to delete that category?","list":"List Categories","no_description":"There is no description for this category.","change_in_category_topic":"Edit Description"},"flagging":{"title":"Why are you flagging this post?","action":"Flag Post","cant":"Sorry, you can't flag this post at this time.","custom_placeholder":"Why does this post require moderator attention? Let us know specifically what you are concerned about, and provide relevant links where possible.","custom_message":{"at_least":"enter at least {{n}} characters","more":"{{n}} to go...","left":"{{n}} remaining"}},"topic_summary":{"title":"Topic Summary","links_shown":"show all {{totalLinks}} links..."},"topic_statuses":{"locked":{"help":"this topic is closed; it no longer accepts new replies"},"pinned":{"help":"this topic is pinned; it will display at the top of its category"},"archived":{"help":"this topic is archived; it is frozen and cannot be changed"},"invisible":{"help":"this topic is invisible; it will not be displayed in topic lists, and can only be accessed via a direct link"}},"posts":"Publicaciones","posts_long":"{{number}} publicaciones en este tema","original_post":"Publicaci\u00f3n Original","views":"Vistas","replies":"Respuestas","views_long":"este tema ha sido visto {{number}} veces","activity":"Actividad","likes":"Les gusta","top_contributors":"Participantes","category_title":"Categor\u00eda","history":"History","changed_by":"by {{author}}","categories_list":"Lista de Categor\u00edas","filters":{"latest":{"title":"Populares","help":"los temas m\u00e1s recientes m\u00e1s populares"},"favorited":{"title":"Favoritos","help":"temas que marcaste como favoritos"},"read":{"title":"Le\u00eddos","help":"temas que ya has le\u00eddo"},"categories":{"title":"Categor\u00edas","title_in":"Categor\u00eda - {{categoryName}}","help":"todos los temas agrupados por categor\u00eda"},"unread":{"title":{"zero":"No le\u00eddos","one":"No le\u00eddo (1)","other":"No le\u00eddos ({{count}})"},"help":"tracked topics with unread posts"},"new":{"title":{"zero":"Nuevos","one":"Nuevo (1)","other":"Nuevos ({{count}})"},"help":"new topics since your last visit"},"posted":{"title":"My Posts","help":"topics you have posted in"},"category":{"title":{"zero":"{{categoryName}}","one":"{{categoryName}} (1)","other":"{{categoryName}} ({{count}})"},"help":"latest topics in the {{categoryName}} category"}},"type_to_filter":"type to filter...","admin":{"title":"Discourse Admin","dashboard":{"title":"Dashboard","welcome":"Welcome to the admin section.","version":"Installed version","up_to_date":"You are running the latest version of Discourse.","critical_available":"A critical update is available.","updates_available":"Updates are available.","please_upgrade":"Please upgrade!","latest_version":"Latest version","reports":{"today":"Today","yesterday":"Yesterday","last_7_days":"Last 7 Days","last_30_days":"Last 30 Days","all_time":"All Time","7_days_ago":"7 Days Ago","30_days_ago":"30 Days Ago"}},"flags":{"title":"Flags","old":"Old","active":"Active","clear":"Clear Flags","clear_title":"dismiss all flags on this post (will unhide hidden posts)","delete":"Delete Post","delete_title":"delete post (if its the first post delete topic)","flagged_by":"Flagged by"},"customize":{"title":"Customize","header":"Header","css":"Stylesheet","override_default":"Do not include standard style sheet","enabled":"Enabled?","preview":"preview","undo_preview":"undo preview","save":"Save","delete":"Delete","delete_confirm":"Delete this customization?"},"email_logs":{"title":"Email","sent_at":"Sent At","email_type":"Email Type","to_address":"To Address","test_email_address":"email address to test","send_test":"send test email","sent_test":"sent!"},"impersonate":{"title":"Impersonate User","username_or_email":"Username or Email of User","help":"Use this tool to impersonate a user account for debugging purposes.","not_found":"That user can't be found.","invalid":"Sorry, you may not impersonate that user."},"users":{"title":"Users","create":"Add Admin User","last_emailed":"Last Emailed","not_found":"Sorry that username doesn't exist in our system.","new":"New","active":"Active","pending":"Pending","approved":"Approved?","approved_selected":{"one":"approve user","other":"approve users ({{count}})"}},"user":{"ban_failed":"Something went wrong banning this user {{error}}","unban_failed":"Something went wrong unbanning this user {{error}}","ban_duration":"How long would you like to ban the user for? (days)","delete_all_posts":"Delete all posts","ban":"Ban","unban":"Unban","banned":"Banned?","moderator":"Moderator?","admin":"Admin?","show_admin_profile":"Admin","refresh_browsers":"Force browser refresh","show_public_profile":"Show Public Profile","impersonate":"Impersonate","revoke_admin":"Revoke Admin","grant_admin":"Grant Admin","revoke_moderation":"Revoke Moderation","grant_moderation":"Grant Moderation","reputation":"Reputaci\u00f3n","permissions":"Permisos","activity":"Actividad","like_count":"Me gusta Recibidos","private_topics_count":"Private Topics Count","posts_read_count":"Posts Read","post_count":"Posts Created","topics_entered":"Topics Entered","flags_given_count":"Flags Given","flags_received_count":"Flags Received","approve":"Approve","approved_by":"approved by","time_read":"Read Time"},"site_settings":{"show_overriden":"S\u00f3lo mostrar lo sobreescrito","title":"Ajustes del Sitio","reset":"Reestabler los ajustes por defecto"}}}}};
I18n.locale = 'es'
;
