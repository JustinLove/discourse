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
MessageFormat.locale.pt = function ( n ) {
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
    })({});I18n.translations = {"pt":{"js":{"share":{"topic":"partilhe um link para este t\u00f3pico","post":"partilhe um link para esta mensagem"},"edit":"edite o t\u00edtulo ou a categoria deste t\u00f3pico","not_implemented":"Essa caracter\u00edstica ainda n\u00e3o foi implementada, desculpe!","no_value":"N\u00e3o","yes_value":"Sim","of_value":"de","generic_error":"Pedimos desculpa, ocorreu um erro.","log_in":"Log In","age":"Idade","last_post":"\u00daltimo post","admin_title":"Admin","flags_title":"Flags","show_more":"mostrar mais","links":"Links","faq":"FAQ","you":"Voc\u00ea","ok":"ok","suggested_topics":{"title":"T\u00f3picos Sugeridos"},"bookmarks":{"not_logged_in":"Desculpe, tem de estar ligado para fazer o bookmark destas mensagens.","created":"Voc\u00ea fez o bookmark desta mensagem.","not_bookmarked":"Voc\u00ea leu esta mensagem; clique para fazer o bookmark dela.","last_read":"Esta \u00e9 a \u00faltima mensagem que voc\u00ea leu."},"new_topics_inserted":"{{count}} novos t\u00f3picos.","show_new_topics":"Clque para mostrar.","preview":"prever","cancel":"cancelar","save":"Guardar Altera\u00e7\u00f5es","saving":"Guardando...","saved":"Guardado!","user_action_descriptions":{"6":"Respostas"},"user":{"profile":"Perfil","title":"Utilizador","mute":"Silenciar","edit":"Editar Prefer\u00eancias","download_archive":"fazer o download do arquivo das minhas mensagens","private_message":"Mensagem Privada","private_messages":"Mensagens","activity_stream":"Actividade","preferences":"Prefer\u00eancias","bio":"Sobre mim","change_password":"alterar","invited_by":"Convidado Por","trust_level":"N\u00edvel de Confian\u00e7a","change_username":{"action":"alterar","title":"Alterar Nome de Utilizador","confirm":"Poder\u00e1 haver consequ\u00eancias ao alterar o nome de utilizador. Tens a certeza que o queres fazer?","taken":"Desculpa, esse nome de utilizador j\u00e1 est\u00e1 a ser usado","error":"Houve um erro ao alterar o teu nome de utilizador","invalid":"Esse nome de utilizador \u00e9 inv\u00e1lido. Tem que conter apenas n\u00fameros e letras"},"change_email":{"action":"alterar","title":"Alterar Email","taken":"Desculpa, esse email n\u00e3o \u00e9 v\u00e1lido","error":"Houve um erro ao alterar o email. Talvez j\u00e1 esteja a ser utilizado?","success":"Enviamos um email para esse endere\u00e7o. Por favor segue as instru\u00e7\u00f5es de confirma\u00e7\u00e3o"},"email":{"title":"Email","instructions":"O teu email nunca vai ser vis\u00edvel publicamente","ok":"Parace est\u00e1r bem. Vamos enviar-te um email para confirmar","invalid":"Por favor introduz um endere\u00e7o de email v\u00e1lido","authenticated":"O teu email foi autenticado por {{provider}}.","frequency":"Vamos apenas enviar-te emails quando n\u00e3o te virmos \u00e0 algum tempo e tu n\u00e3o tiveres visto as coisas que te temos enviado"},"name":{"title":"Nome","instructions":"O teu nome completo; n\u00e3o precisa de ser \u00fanico.","too_short":"O teu nome \u00e9 demasiado curto","ok":"O teu nome parece estar bem"},"username":{"title":"Nome de Utilizador","instructions":"As pessoas podem mencionar-te como @{{username}}.","available":"O teu nome de utilizador est\u00e1 dispon\u00edvel.","global_match":"O email corresponde ao nome de utilizador registado.","global_mismatch":"J\u00e1 est\u00e1 registado. Tenta {{suggestion}}?","not_available":"N\u00e3o est\u00e1 dispon\u00edvel. Tenta {{suggestion}}?","too_short":"O teu nome de utilizador \u00e9 demasiado curto.","too_long":"O teu nome de utilizador \u00e9 demasiado comprido.","checking":"A verificar disponibilidade do nome de utilizador...","enter_email":"Nome de utilizador encontrado. Intruduz o email referente."},"last_posted":"\u00daltimo Post","last_emailed":"\u00daltimo Email","last_seen":"\u00daltima vez visto","created":"Criado a","log_out":"Log Out","website":"Web Site","email_settings":"Email","email_digests":{"title":"Quando n\u00e3o visito o site, enviar-me um email com um resumo do que \u00e9 novo","daily":"diariamente","weekly":"semanalmente","bi_weekly":"duas em duas semanas"},"email_direct":"Receber um email quando algu\u00e9m te cita, responde aos teus posts, ou menciona o teu @nome_de_utilizador","email_private_messages":"Recebe um email quando algu\u00e9m te envia uma mensagem privada","other_settings":"Outros","new_topic_duration":{"label":"Considerar t\u00f3picos como novos quando","not_viewed":"N\u00e3o os vi ainda","last_here":"foram postados desde a \u00faltima vez que estive l\u00e1","after_n_days":{"one":"foram postados no \u00faltimo dia","other":"foram postados nos \u00faltimos {{count}} dias"},"after_n_weeks":{"one":"foram postados na \u00faltima semana","other":"foram postados nas \u00faltimas {{count}} semanas"}},"auto_track_topics":"Automaticamente vigiar os t\u00f3picos em que eu entro","auto_track_options":{"never":"nunca","always":"sempre","after_n_seconds":{"one":"passado 1 segundo","other":"passado {{count}} segundos"},"after_n_minutes":{"one":"passado 1 minuto","other":"passado {{count}} minutos"}},"invited":{"title":"Convites","user":"Utilizadores convidados","none":"{{username}} ainda n\u00e3o convidou ningu\u00e9m para o site.","redeemed":"Convites usados","redeemed_at":"Usado em","pending":"Convites Pendentes","topics_entered":"T\u00f3picos em que entrou","posts_read_count":"Posts Vistos","rescind":"Remover Convite","rescinded":"Convite Removido","time_read":"Tempo de Leitura","days_visited":"Dias Visitados","account_age_days":"Idade da conta em dias"},"password":{"title":"Password","too_short":"A tua password \u00e9 demasiado curta.","ok":"A tua password parece est\u00e1r ok."},"ip_address":{"title":"\u00daltimo endere\u00e7o IP"},"avatar":{"title":"Avatar","instructions":"N\u00f3s utilizamos <a href='https://gravatar.com' target='_blank'>Gravatar</a> para os avatares baseados no teu email"},"filters":{"all":"Todos"},"stream":{"posted_by":"Postado por","sent_by":"Enviado por","private_message":"mansagem privada","the_topic":"o t\u00f3pico"}},"loading":"A Carregar...","close":"Fechar","learn_more":"sabe mais...","year":"ano","year_desc":"t\u00f3picos postados nos \u00faltimos 365 dias","month":"m\u00eas","month_desc":"t\u00f3picos postados nos \u00faltimos 30 dias","week":"semana","week_desc":"t\u00f3picos postados nos \u00faltimos 7 dias","first_post":"Primeiro post","mute":"Silenciar","unmute":"Reativar","best_of":{"title":"Melhor De","description":"H\u00e1 <b>{{count}}</b> posts neste t\u00f3pico. Isso \u00e9 muito! Gostarias de poupar tempo alterando a vista para mostrar apenas os posts com mais intera\u00e7\u00f5es e respostas?","button":"Alterar para a vista \"Melhor De\""},"private_message_info":{"title":"Conversas Privadas","invite":"Convidar Outros..."},"email":"Email","username":"Username","last_seen":"Visto pela \u00faltima vez","created":"Criado","trust_level":"N\u00edvel de confian\u00e7a","create_account":{"title":"Criar Conta","action":"Criar uma agora!","invite":"Ainda sem conta?","failed":"Alguma coisa correu mal, talvez este email j\u00e1 esteja registado, tenta o link para password esquecida."},"forgot_password":{"title":"Esqueci a Password","action":"Esqueci-me da minha password","invite":"Insere o teu nome de utilizador ou endere\u00e7o de email, e n\u00f3s enviamos-te um email para repor a password.","reset":"Repor Password","complete":"Dever\u00e1s receber um email com instru\u00e7\u00f5es de como repor a tua password em breve."},"login":{"title":"Log In","username":"Login","password":"Password","email_placeholder":"endere\u00e7o de email ou nome de utilizador","error":"Erro desconhecido","reset_password":"Repor Password","logging_in":"A fazer Log In...","or":"Ou","authenticating":"A auntenticar...","awaiting_confirmation":"A tua conta est\u00e1 \u00e0 espera de ativa\u00e7\u00e3o, utiliza o link 'esqueci a password' para pedir um novo link para ativar o email","awaiting_approval":"A tua conta ainda n\u00e3o foi aprovada por um moderador. Vais recever um email quando estiver aprovada.","google":{"title":"Log In com Google","message":"A autenticar com Google (garante que os bloqueadores de pop-ups n\u00e3o est\u00e1 ativos)"},"twitter":{"title":"Log In com Twitter","message":"A autenticar com Twitter (garante que os bloqueadores de pop-ups n\u00e3o est\u00e1 ativos)"},"facebook":{"title":"Log In com Facebook","message":"A autenticar com Facebook (garante que os bloqueadores de pop-ups n\u00e3o est\u00e1 ativos)"},"yahoo":{"title":"Log In com Yahoo","message":"A autenticar com Yahoo (garante que os bloqueadores de pop-ups n\u00e3o est\u00e1 ativos)"}},"composer":{"saving_draft_tip":"a guardar","saved_draft_tip":"guardado","saved_local_draft_tip":"guardado localmente","min_length":{"at_least":"insere pelo menos {{n}} caracteres","more":"{{n}} to go..."},"save_edit":"Guardar Edi\u00e7\u00e3o","reply":"Responder","create_topic":"Criar um T\u00f3pico","create_pm":"Criar uma Mensagem Privada","users_placeholder":"Adicionar um utilizador","title_placeholder":"Escreve o teu t\u00edtulo aqui. O que \u00e9 esta discu\u00e7\u00e3o sobre numa pequena frase?","reply_placeholder":"Escreve a tua resposta aqui. Utiliza Markdown ou BBCode para formatar. Arrasta ou cola aqui uma imagem para a enviar.","view_new_post":"Ver os teus novos posts.","saving":"A guardar...","saved":"Guardado!","saved_draft":"Tens um rascunho de um post em progresso. Clica em qualquer sitio nesta caixa para continuar a edi\u00e7\u00e3o.","uploading":"A enviar...","show_preview":"mostrar pr\u00e9-visualiza\u00e7\u00e3o &raquo;","hide_preview":"&laquo; esconder pr\u00e9-visualiza\u00e7\u00e3o"},"notifications":{"title":"notifica\u00e7\u00f5es de mencionamento de @nome, respostas aos teus posts e t\u00f3picos, mensagens privadas, etc","none":"N\u00e3o tens notifca\u00e7\u00f5es neste momento..","more":"ver notifica\u00e7\u00f5es antigas","mentioned":"<span title='mentioned' class='icon'>@</span> {{username}} {{link}}","quoted":"<i title='quoted' class='icon icon-quote-right'></i> {{username}} {{link}}","replied":"<i title='replied' class='icon icon-reply'></i> {{username}} {{link}}","posted":"<i title='replied' class='icon icon-reply'></i> {{username}} {{link}}","edited":"<i title='edited' class='icon icon-pencil'></i> {{username}} {{link}}","liked":"<i title='liked' class='icon icon-heart'></i> {{username}} {{link}}","private_message":"<i class='icon icon-envelope-alt' title='private message'></i> {{username}} enviou-te uma mensagem privada: {{link}}","invited_to_private_message":"{{username}} convidou-te para uma conversa privada: {{link}}","invitee_accepted":"<i title='accepted your invitation' class='icon icon-signin'></i> {{username}} aceitou o teu convite","moved_post":"<i title='moved post' class='icon icon-arrow-right'></i> {{username}} moveu o post para {{link}}"},"image_selector":{"from_my_computer":"Do meu dispositivo","from_the_web":"Da internet","add_image":"Adicionar Imagem","remote_tip":"insere o endere\u00e7o de uma imagem no formato http://example.com/image.jpg","local_tip":"clica para selecionar uma imagem no teu dispositivo.","upload":"Enviar","uploading_image":"A enviar imagem"},"search":{"title":"procurar por t\u00f3picos, posts, utilizadores, ou categorias","placeholder":"escreve aqui o teu termo de buscar","no_results":"N\u00e3o foi encontrado nenhum resultado.","searching":"A procurar ..."},"site_map":"ir para outra lista de t\u00f3picos ou categorias","go_back":"voltar atr\u00e1s","current_user":"ir para a tua p\u00e1gina de utilizador","favorite":{"title":"Favorito","help":"adicionar este t\u00f3pico \u00e0 tua lista de favoritos"},"topics":{"no_favorited":"Ainda n\u00e3o marcaste nenhum t\u00f3pico como favorito. Para marcar um t\u00f3pico como favorito, clica na estrela \u00e0 beira do t\u00edtulo.","no_unread":"N\u00e3o tens t\u00f3picos ainda n\u00e3o lidos para ler.","no_new":"N\u00e3o tens novos t\u00f3picos para ler.","no_read":"Ainda n\u00e3o leste nenhum t\u00f3pico.","no_posted":"Ainda n\u00e3o postaste em nenhum t\u00f3pico.","no_latest":"N\u00e3o h\u00e1 t\u00f3picos populares. Isso \u00e9 triste.","footer":"N\u00e3o h\u00e1 mais t\u00f3picos neste categoria. <a href=\"/categories\">Procurar todas as categorias</a> ou <a href=\"/\">ver t\u00f3picos populares</a>"},"topic":{"create_in":"Criar T\u00f3pico sobre {{categoryName}}","create":"Criar T\u00f3pico","create_long":"Criar um novo T\u00f3pico","private_message":"Come\u00e7ar uma nova conversa privada","list":"T\u00f3picos","new":"novo t\u00f3pico","title":"T\u00f3pico","loading_more":"A carregar mais t\u00f3picos...","loading":"A carregar t\u00f3pico...","missing":"T\u00f3pico n\u00e3o encontrado","not_found":{"title":"T\u00f3pico n\u00e3o encontrado","description":"Desculpa, n\u00e3o podemos encontrar esse t\u00f3pico. Talvez tenha sido apagado?"},"unread_posts":"tens {{unread}} posts antigos n\u00e3o lidos neste t\u00f3pico","new_posts":"h\u00e1 {{new_posts}} novos posts neste t\u00f3pico desde a \u00faltima vez que o leste","likes":"h\u00e1 {{likes}} gostos neste t\u00f3pico","back_to_list":"Voltar \u00e0 lista dos T\u00f3picos","options":"Op\u00e7\u00f5es do T\u00f3pico","show_links":"mostrar links dentro deste post","toggle_information":"alternar detalhes do t\u00f3pico","read_more_in_category":"Queres ler mais? Procura outros t\u00f3picos em {{catLink}} ou {{latestLink}}.","read_more":"Queres ler mais? {{catLink}} ou {{latestLink}}.","browse_all_categories":"Procurar todas as categorias","view_latest_topics":"ver t\u00f3picos populares","progress":{"title":"progresso do t\u00f3pico","jump_top":"saltar para o primeiro post","jump_bottom":"saltar para o \u00faltimo post","total":"total de posts","current":"post atual"},"notifications":{"title":"","reasons":{"3_2":"Ir\u00e1s receber notifica\u00e7\u00f5es porque est\u00e1s a observar este t\u00f3pico.","3_1":"Ir\u00e1s receber notifica\u00e7\u00f5es porque criaste este t\u00f3pico.","2_4":"Ir\u00e1s receber notifica\u00e7\u00f5es porque postaste uma resposta neste t\u00f3pico.","2_2":"Ir\u00e1s receber notifica\u00e7\u00f5es porque est\u00e1s a monitorizar este t\u00f3pico.","2":"Ir\u00e1s receber notifica\u00e7\u00f5es porque tu <a href=\"/users/{{username}}/preferences\">leste este t\u00f3pico</a>.","1":"Ir\u00e1s ser notificado apenas se algu\u00e9m menciona o teu @nome ou te responde ao teu post.","1_2":"Ir\u00e1s ser notificado apenas se algu\u00e9m menciona o teu @nome ou te responde ao teu post.","0":"Est\u00e1s a ignorar todas as notifica\u00e7\u00f5es para este t\u00f3pico.","0_2":"Est\u00e1s a ignorar todas as notifica\u00e7\u00f5es para este t\u00f3pico."},"watching":{"title":"Observar","description":"o mesmo que monitorizar, mas ainda ser\u00e1s notificado de todos os novos posts."},"tracking":{"title":"Monitorizar","description":"ser\u00e1s notificado de posts n\u00e3o lidos, mencionamentos de @nome, e respostas aos teus posts."},"regular":{"title":"Regular","description":"ir\u00e1s ser notificado apenas se algu\u00e9m menciona o teu @nome ou responde ao teu post."},"muted":{"title":"Silenciar","description":"n\u00e3o ser\u00e1s notificado relativamente a nada deste t\u00f3pico, e n\u00e3o aparecer\u00e1 na tua tab de n\u00e3o lidos."}},"actions":{"delete":"Apagar T\u00f3pico","open":"Abrir T\u00f3pico","close":"Fechar T\u00f3pico","unpin":"Desafixar T\u00f3pico","pin":"Afixar T\u00f3pico","unarchive":"Desarquivar T\u00f3pico","archive":"Arquivar T\u00f3pico","invisible":"Tornar Invis\u00edvel","visible":"Tornar Vis\u00edvel","reset_read":"Repor Data de Leitura","multi_select":"Alternar Multi-Sele\u00e7\u00e3o","convert_to_topic":"Converter a T\u00f3pico Regular"},"reply":{"title":"Responder","help":"come\u00e7a a compor uma resposta a este t\u00f3pico"},"share":{"title":"Partilhar","help":"partilhar um link para este t\u00f3pico"},"inviting":"A convidar...","invite_private":{"title":"Convidar para Conersa Privada","email_or_username":"Email ou Nome de Utilizador do Convidado","email_or_username_placeholder":"endere\u00e7o de email ou username","action":"Convite","success":"Obrigado! Convidamos esse utilizador para participar nesta conversa privada.","error":"Desculpa, houve um erro ao convidar esse utilizador."},"invite_reply":{"title":"Convidar um amigo para Responder","help":"envia convites aos teus amigos para que eles possam responder a este t\u00f3pico com um simples clique.","email":"Enviaremos ao teu amigo um pequeno email para que ele possa responder a este t\u00f3pico apenas com um clique.","email_placeholder":"endere\u00e7o de email","success":"Obrigado! Enviamos um convite para <b>{{email}}</b>. Ir\u00e1s saber quando eles utilizarem o convite. Podes dirigir-te \u00e0 tab de Convites na tua p\u00e1gina de tulizador para saberes quem j\u00e1 convidaste.","error":"Desculpa n\u00e3o pod\u00edamos convidar essa pessoa. Talvez j\u00e1 seja um utilizador?"},"login_reply":"Log In para responder","filters":{"user":"Est\u00e1s a ver apenas os posts de um utilizador especifico.","best_of":"Est\u00e1s a ver apenas os posts em 'Melhor De'.","cancel":"Mostrar todos os posts neste t\u00f3pico outra vez."},"move_selected":{"title":"Mover Posts Selectionados","topic_name":"Nome para o Novo T\u00f3pico:","error":"Desculpa, houve um erro ao tentar mover esses posts..","instructions":{"one":"Est\u00e1s prestes a criar um novo t\u00f3pico e preench\u00ea-lo com o post que selecionaste.","other":"Est\u00e1s prestes a criar um novo t\u00f3pico e preench\u00ea-lo com os <b>{{count}}</b> posts que selecionaste."}},"multi_select":{"select":"selecionar","selected":"({{count}}) selecionados","delete":"apagar selecionados","cancel":"cancelar sele\u00e7\u00e3o","move":"mover selecionados","description":{"one":"Selectionaste <b>1</b> post.","other":"Selecionaste <b>{{count}}</b> posts."}}},"post":{"reply":"Em resposta a {{link}} por {{replyAvatar}} {{username}}","reply_topic":"Responder a {{link}}","edit":"Editar {{link}}","in_reply_to":"Em resposta a","reply_as_new_topic":"Responder como um novo T\u00f3pico","continue_discussion":"Continuar a discuss\u00e3o desde {{postLink}}:","follow_quote":"ir para o post citado","deleted_by_author":"(post removido pelo autor)","has_replies":{"one":"Resposta","other":"Respostas"},"errors":{"create":"Desculpa, houve um erro ao criar o teu post. Por favor tenta outra vez.","edit":"Desculpa, houve um erro ao editar o teu post. Por favor tenta outra vez.","upload":"Desculpa, houve um erro ao enviar esse ficheiro. Por favor tenta otura vez."},"abandon":"De certeza que queres abandonar o teu post?","archetypes":{"save":"Guardar as Op\u00e7\u00f5es"},"controls":{"reply":"come\u00e7a a compor uma resposta a este t\u00f3pico","like":"gostar deste t\u00f3pico","edit":"editar este t\u00f3pico","flag":"denuncia este t\u00f3pico com uma flag para avisar os moderadores","delete":"apagar este post","undelete":"desapagar este post","share":"partilhar um link para este post","bookmark":"marcar este post na tua p\u00e1gina de utilizador","more":"Mais"},"actions":{"flag":"Flag","clear_flags":{"one":"Apagar flag","other":"Apagar flags"},"it_too":"{{alsoName}} tamb\u00e9m","undo":"Desfazer {{alsoName}}","by_you_and_others":{"zero":"Tu {{long_form}}","one":"Tu e outra pessoa {{long_form}}","other":"Tu e outras {{count}} pessoas {{long_form}}"},"by_others":{"one":"1 pessoa {{long_form}}","other":"{{count}} pessoas {{long_form}}"}},"edits":{"one":"1 edi\u00e7\u00e3o","other":"{{count}} edi\u00e7\u00f5es","zero":"sem edi\u00e7\u00f5es"},"delete":{"confirm":{"one":"Tens a certeza que queres apagar este post?","other":"Tens a certeza que queres apagar todos esses posts?"}}},"category":{"none":"(sem categoria)","edit":"editar","view":"Visualizar T\u00f3picos na Categoria","delete":"Apagar Categoria","create":"Criar Categoria","more_posts":"visualizar todos os {{posts}}...","name":"Nome da Categoria","description":"Descri\u00e7\u00e3o","topic":"t\u00f3pico da categoria","color":"Cor","name_placeholder":"Deve ser curto e sucinto.","color_placeholder":"Qualquer cor web","delete_confirm":"Tens a certeza que queres apagar esta categoria?","list":"Lista de Categorias"},"flagging":{"title":"Porque est\u00e1s a p\u00f4r uma flag neste post?","action":"Flag Post","cant":"Desculpa, n\u00e3o podes por uma flag neste momento.","custom_placeholder":"Porqu\u00ea a necessidade deste post ter aten\u00e7\u00e3o da modera\u00e7\u00e3o? Faz-nos saber especificamente quais as tuas preocupa\u00e7\u00f5es, e fornece links relevantes se poss\u00edvel.","custom_message":{"at_least":"insere pelo menos {{n}} caracteres","more":"{{n}} em falta...","left":"{{n}} restantes"}},"topic_summary":{"title":"Sum\u00e1rio do T\u00f3pico","links_shown":"mostrar todos os {{totalLinks}} links..."},"topic_statuses":{"locked":{"help":"este t\u00f3pico est\u00e1 fechado; n\u00e3o ser\u00e3o aceites mais respostas"},"pinned":{"help":"este t\u00f3pico est\u00e1 fixado; ir\u00e1 ser mostrado no topo da sua categoria"},"archived":{"help":"este t\u00f3pico est\u00e1 arquivado; est\u00e1 congelado e n\u00e3o pode ser alterado"},"invisible":{"help":"este t\u00f3pico est\u00e1 invis\u00edvel; n\u00e3o aparecer\u00e1 na listagem dos t\u00f3picos, e pode apenas ser acedido por link direto"}},"posts":"Posts","posts_long":"{{number}} posts neste t\u00f3pico","original_post":"Post Original","views":"Visualiza\u00e7\u00f5es","replies":"Respostas","views_long":"este t\u00f3pico foi visto {{number}} vezes","activity":"Atividade","likes":"Gostos","top_contributors":"Participantes","category_title":"Categoria","categories_list":"Lista de Categorias","filters":{"latest":{"title":"Populares","help":"os t\u00f3picos recentes mais populares"},"favorited":{"title":"Favoritos","help":"t\u00f3picos que marcaste como favorito"},"read":{"title":"Lido","help":"t\u00f3picos que tu leste"},"categories":{"title":"Categorias","title_in":"Categoria - {{categoryName}}","help":"todos os t\u00f3picos agrupados por categoria"},"unread":{"title":{"zero":"N\u00e3o lido","one":"N\u00e3o lido (1)","other":"N\u00e3o lidos ({{count}})"},"help":"t\u00f3picos monitorizados com posts n\u00e3o lidos"},"new":{"title":{"zero":"Novo","one":"Novo (1)","other":"Novos ({{count}})"},"help":"novos t\u00f3picos desde a tua \u00faltima visita, e t\u00f3picos monitorizados com posts novos"},"posted":{"title":"Meus posts","help":"t\u00f3picos em que postastes em"},"category":{"title":{"zero":"{{categoryName}}","one":"{{categoryName}} (1)","other":"{{categoryName}} ({{count}})"},"help":"t\u00f3picos populares na categoria {{categoryName}}"}},"type_to_filter":"escreve para filtrar...","admin":{"title":"Discourse Admin","dashboard":"Painel Administrativo","flags":{"title":"Flags","old":"Antigo","active":"Ativo","clear":"Apagar Flags","clear_title":"descartar todas a flags neste post (vai passar posts escondidos a vis\u00edveis)","delete":"Apagar Post","delete_title":"apagar post (se for o primeiro post, apagar t\u00f3pico)","flagged_by":"Flagged por"},"customize":{"title":"Personalizar","header":"Cabe\u00e7alho","css":"Stylesheet","override_default":"Sobrepor padr\u00e3o?","enabled":"Habilitado?","preview":"pr\u00e9-visualiza\u00e7\u00e3o","undo_preview":"desfazer pr\u00e9-visualiza\u00e7\u00e3o","save":"Guardar","delete":"Apagar","delete_confirm":"Apagar esta personaliza\u00e7\u00e3o?"},"email_logs":{"title":"Email","sent_at":"Enviado a","email_type":"Tipo de Email","to_address":"Para (endere\u00e7o)","test_email_address":"endere\u00e7o de email para testar","send_test":"enviar email de teste","sent_test":"enviado!"},"impersonate":{"title":"Personificar Utilizador","username_or_email":"Nome do Utilizador ou Email do Utilizador","help":"Utiliza este ferramenta para personificar uma conta de utilizador para efeitos de depura\u00e7\u00e3o.","not_found":"Esse utilizador n\u00e3o consegue ser encotrado.","invalid":"Desculpa, n\u00e3o podes personificar esse utilizador."},"users":{"title":"Utilizadores","create":"Adicionar Utilizador Admin","last_emailed":"\u00daltimo email enviado","not_found":"Desculpa, esse nome de utilizador n\u00e3o existe no nosso sistema.","new":"Novo","active":"Ativo","pending":"Pendente","approved":"Aprovado?","approved_selected":{"one":"aprovar utilizador","other":"aprovar utilizadores ({{count}})"}},"user":{"ban_failed":"Algo correu mal ao banir este utilizador {{error}}","unban_failed":"Algo n\u00e3o correu bem ao desbanir este utilizador {{error}}","ban_duration":"Por quanto tempo gostarias de banir a pessoa? (dias)","delete_all_posts":"Apagar todos os posts","ban":"Banir","unban":"Desbanir","banned":"Banido?","moderator":"Moderador?","admin":"Admin?","show_admin_profile":"Admin","refresh_browsers":"For\u00e7ar atualiza\u00e7\u00e3o da p\u00e1gina no browser","show_public_profile":"Mostrar Perfil P\u00fablico","impersonate":"Personificar","revoke_admin":"Revogar Admin","grant_admin":"Conceder Admin","revoke_moderation":"Revogar Modera\u00e7\u00e3o","grant_moderation":"Conceder Modera\u00e7\u00e3o","reputation":"Reputa\u00e7\u00e3o","permissions":"Permiss\u00f5es","activity":"Atividade","like_count":"Gostos recebidos","private_topics_count":"Contagem de t\u00f3picos privados","posts_read_count":"Posts lidos","post_count":"Posts criados","topics_entered":"T\u00f3picos que entrou","flags_given_count":"Flags dadas","flags_received_count":"Flags recebidas","approve":"Aprovar","approved_by":"aprovado por","time_read":"Tempo de leitura"},"site_settings":{"show_overriden":"Apenas mostrar valores alterados","title":"Configura\u00e7\u00f5es do Site","reset":"repor valores padr\u00e3o"}}}}};
I18n.locale = 'pt'
;
