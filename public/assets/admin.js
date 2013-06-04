(function () {

var $ = window.jQuery;

/**
  A base admin controller that has access to the Discourse properties.

  @class AdminController
  @extends Discourse.Controller
  @namespace Discourse
  @module Discourse
**/

Discourse.AdminCustomizeController = Discourse.Controller.extend({});


})(this);(function () {

var $ = window.jQuery;

/**
  This controller supports interface for creating custom CSS skins in Discourse.

  @class AdminCustomizeController
  @extends Ember.Controller
  @namespace Discourse
  @module Discourse
**/

Discourse.AdminCustomizeController = Ember.ArrayController.extend({

  /**
    Create a new customization style

    @method newCustomization
  **/
  newCustomization: function() {
    var item = Discourse.SiteCustomization.create({name: Em.String.i18n("admin.customize.new_style")});
    this.pushObject(item);
    this.set('selectedItem', item);
  },

  /**
    Select a given style

    @method selectStyle
    @param {Discourse.SiteCustomization} style The style we are selecting
  **/
  selectStyle: function(style) {
    this.set('selectedItem', style);
  },

  /**
    Save the current customization

    @method save
  **/
  save: function() {
    this.get('selectedItem').save();
  },

  /**
    Destroy the current customization

    @method destroy
  **/
  destroy: function() {
    var _this = this;
    return bootbox.confirm(Em.String.i18n("admin.customize.delete_confirm"), Em.String.i18n("no_value"), Em.String.i18n("yes_value"), function(result) {
      var selected;
      if (result) {
        selected = _this.get('selectedItem');
        selected.destroy();
        _this.set('selectedItem', null);
        return _this.removeObject(selected);
      }
    });
  }

});


})(this);(function () {

var $ = window.jQuery;

/**
  This controller supports the default interface when you enter the admin section.

  @class AdminDashboardController
  @extends Ember.Controller
  @namespace Discourse
  @module Discourse
**/

Discourse.AdminDashboardController = Ember.Controller.extend({
  loading: true,
  versionCheck: null,
  problemsCheckInterval: '1 minute ago',

  foundProblems: function() {
    return(Discourse.User.current('admin') && this.get('problems') && this.get('problems').length > 0);
  }.property('problems'),

  thereWereProblems: function() {
    if(!Discourse.User.current('admin')) { return false }
    if( this.get('foundProblems') ) {
      this.set('hadProblems', true);
      return true;
    } else {
      return this.get('hadProblems') || false;
    }
  }.property('foundProblems'),

  loadProblems: function() {
    this.set('loadingProblems', true);
    this.set('problemsFetchedAt', new Date());
    var c = this;
    Discourse.AdminDashboard.fetchProblems().then(function(d) {
      c.set('problems', d.problems);
      c.set('loadingProblems', false);
      if( d.problems && d.problems.length > 0 ) {
        c.problemsCheckInterval = '1 minute ago';
      } else {
        c.problemsCheckInterval = '10 minutes ago';
      }
    });
  },

  problemsTimestamp: function() {
    return this.get('problemsFetchedAt').long();
  }.property('problemsFetchedAt')
});


})(this);(function () {

var $ = window.jQuery;

/**
  This controller supports the interface for reviewing email logs.

  @class AdminEmailLogsController
  @extends Ember.ArrayController
  @namespace Discourse
  @module Discourse
**/

Discourse.AdminEmailLogsController = Ember.ArrayController.extend(Discourse.Presence, {

  /**
    Is the "send test email" button disabled?

    @property sendTestEmailDisabled
  **/
  sendTestEmailDisabled: function() {
    return this.blank('testEmailAddress');
  }.property('testEmailAddress'),

  /**
    Sends a test email to the currently entered email address

    @method sendTestEmail
  **/
  sendTestEmail: function() {
    this.set('sentTestEmail', false);

    var adminEmailLogsController = this;
    Discourse.ajax("/admin/email_logs/test", {
      type: 'POST',
      data: { email_address: this.get('testEmailAddress') }
    }).then(function () {
      adminEmailLogsController.set('sentTestEmail', true);
    });

  }

});


})(this);(function () {

var $ = window.jQuery;

/**
  This controller supports the interface for dealing with flags in the admin section.

  @class AdminFlagsController
  @extends Ember.Controller
  @namespace Discourse
  @module Discourse
**/

Discourse.AdminFlagsController = Ember.ArrayController.extend({

  /**
    Clear all flags on a post

    @method clearFlags
    @param {Discourse.FlaggedPost} item The post whose flags we want to clear
  **/
  clearFlags: function(item) {
    var adminFlagsController = this;
    item.clearFlags().then((function() {
      adminFlagsController.removeObject(item);
    }), function() {
      bootbox.alert(Em.String.i18n("admin.flags.error"));
    });
  },

  /**
    Deletes a post

    @method deletePost
    @param {Discourse.FlaggedPost} item The post to delete
  **/
  deletePost: function(item) {
    var adminFlagsController = this;
    item.deletePost().then((function() {
      adminFlagsController.removeObject(item);
    }), function() {
      bootbox.alert(Em.String.i18n("admin.flags.error"));
    });
  },

  /**
    Are we viewing the 'old' view?

    @property adminOldFlagsView
  **/
  adminOldFlagsView: Em.computed.equal('query', 'old'),

  /**
    Are we viewing the 'active' view?

    @property adminActiveFlagsView
  **/
  adminActiveFlagsView: Em.computed.equal('query', 'active')

});


})(this);(function () {

var $ = window.jQuery;

/**
  This controller is for the widget that shows the commits to the discourse repo.

  @class AdminGithubCommitsController
  @extends Ember.ArrayController
  @namespace Discourse
  @module Discourse
**/

Discourse.AdminGithubCommitsController = Ember.ArrayController.extend({
  goToGithub: function() {
    window.open('https://github.com/discourse/discourse');
  }
});


})(this);(function () {

var $ = window.jQuery;

Discourse.AdminGroupsController = Ember.Controller.extend({
  itemController: 'adminGroup',

  edit: function(group){
    this.get('model').select(group);
    group.load();
  },

  refreshAutoGroups: function(){
    var controller = this;

    this.set('refreshingAutoGroups', true);
    Discourse.ajax('/admin/groups/refresh_automatic_groups', {type: 'POST'}).then(function(){
      controller.set('model', Discourse.Group.findAll());
      controller.set('refreshingAutoGroups',false);
    });
  },

  newGroup: function(){
    var group = Discourse.Group.create();
    group.set("loaded", true);
    var model = this.get("model");
    model.addObject(group);
    model.select(group);
  },

  save: function(group){
    if(!group.get("id")){
      group.create();
    } else {
      group.save();
    }
  },

  destroy: function(group){
    var list = this.get("model");
    if(group.get("id")){
      group.destroy().then(function(){
        list.removeObject(group);
      });
    }
  }
});



})(this);(function () {

var $ = window.jQuery;

Discourse.AdminReportsController = Ember.ObjectController.extend({
  viewMode: 'table',

  viewingTable: Em.computed.equal('viewMode', 'table'),
  viewingBarChart: Em.computed.equal('viewMode', 'barChart'),

  // Changes the current view mode to 'table'
  viewAsTable: function() {
    this.set('viewMode', 'table');
  },

  // Changes the current view mode to 'barChart'
  viewAsBarChart: function() {
    this.set('viewMode', 'barChart');
  }

});


})(this);(function () {

var $ = window.jQuery;

/**
  This controller is used for editing site content

  @class AdminSiteContentEditController
  @extends Ember.ObjectController
  @namespace Discourse
  @module Discourse
**/

Discourse.AdminSiteContentEditController = Discourse.ObjectController.extend({

  saveDisabled: function() {
    if (this.get('saving')) return true;
    if (this.blank('content.content')) return true;
    return false;
  }.property('saving', 'content.content'),

  saveChanges: function() {
    var controller = this;
    controller.setProperties({saving: true, saved: false});
    this.get('content').save().then(function () {
      controller.setProperties({saving: false, saved: true});
    });
  }

});


})(this);(function () {

var $ = window.jQuery;

/**
  This controller supports the interface for SiteSettings.

  @class AdminSiteSettingsController
  @extends Ember.ArrayController
  @namespace Discourse
  @module Discourse
**/

Discourse.AdminSiteSettingsController = Ember.ArrayController.extend(Discourse.Presence, {
  filter: null,
  onlyOverridden: false,

  /**
    The list of settings based on the current filters

    @property filteredContent
  **/
  filteredContent: function() {

    // If we have no content, don't bother filtering anything
    if (!this.present('content')) return null;

    var filter;
    if (this.get('filter')) {
      filter = this.get('filter').toLowerCase();
    }

    var adminSettingsController = this;
    return this.get('content').filter(function(item, index, enumerable) {
      if (adminSettingsController.get('onlyOverridden') && !item.get('overridden')) return false;
      if (filter) {
        if (item.get('setting').toLowerCase().indexOf(filter) > -1) return true;
        if (item.get('description').toLowerCase().indexOf(filter) > -1) return true;
        if (item.get('value').toLowerCase().indexOf(filter) > -1) return true;
        return false;
      }

      return true;
    });
  }.property('filter', 'content.@each', 'onlyOverridden'),

  /**
    Reset a setting to its default value

    @method resetDefault
    @param {Discourse.SiteSetting} setting The setting we want to revert
  **/
  resetDefault: function(setting) {
    setting.set('value', setting.get('default'));
    setting.save();
  },

  /**
    Save changes to a site setting

    @method save
    @param {Discourse.SiteSetting} setting The setting we've changed
  **/
  save: function(setting) {
    setting.save();
  },

  /**
    Cancel changes to a site setting

    @method cancel
    @param {Discourse.SiteSetting} setting The setting we've changed but want to revert
  **/
  cancel: function(setting) {
    setting.resetValue();
  }

});


})(this);(function () {

var $ = window.jQuery;

/**
  A controller related to viewing a user in the admin section

  @class AdminUserController
  @extends Discourse.ObjectController
  @namespace Discourse
  @module Discourse
**/

Discourse.AdminUserController = Discourse.ObjectController.extend({});


})(this);(function () {

var $ = window.jQuery;

/**
  This controller supports the interface for listing users in the admin section.

  @class AdminUsersListController
  @extends Ember.ArrayController
  @namespace Discourse
  @module Discourse
**/

Discourse.AdminUsersListController = Ember.ArrayController.extend(Discourse.Presence, {
  username: null,
  query: null,
  selectAll: false,
  content: null,
  loading: false,

  /**
    Triggered when the selectAll property is changed

    @event selectAll
  **/
  selectAllChanged: function() {
    var _this = this;
    this.get('content').each(function(user) {
      user.set('selected', _this.get('selectAll'));
    });
  }.observes('selectAll'),

  /**
    Triggered when the username filter is changed

    @event filterUsers
  **/
  filterUsers: Discourse.debounce(function() {
    this.refreshUsers();
  }, 250).observes('username'),

  /**
    Triggered when the order of the users list is changed

    @event orderChanged
  **/
  orderChanged: function() {
    this.refreshUsers();
  }.observes('query'),

  /**
    The title of the user list, based on which query was performed.

    @property title
  **/
  title: function() {
    return Em.String.i18n('admin.users.titles.' + this.get('query'));
  }.property('query'),

  /**
    Do we want to show the approval controls?

    @property showApproval
  **/
  showApproval: function() {
    if (!Discourse.SiteSettings.must_approve_users) return false;
    if (this.get('query') === 'new') return true;
    if (this.get('query') === 'pending') return true;
  }.property('query'),

  /**
    How many users are currently selected

    @property selectedCount
  **/
  selectedCount: function() {
    if (this.blank('content')) return 0;
    return this.get('content').filterProperty('selected').length;
  }.property('content.@each.selected'),

  /**
    Do we have any selected users?

    @property hasSelection
  **/
  hasSelection: function() {
    return this.get('selectedCount') > 0;
  }.property('selectedCount'),

  /**
    Refresh the current list of users.

    @method refreshUsers
  **/
  refreshUsers: function() {
    var adminUsersListController = this;
    adminUsersListController.set('loading', true);

    Discourse.AdminUser.findAll(this.get('query'), this.get('username')).then(function (result) {
      adminUsersListController.set('content', result);
      adminUsersListController.set('loading', false);
    })
  },


  /**
    Show the list of users.

    @method show
  **/
  show: function(term) {
    if (this.get('query') === term) {
      this.refreshUsers();
      return;
    }
    this.set('query', term);
  },

  /**
    Approve all the currently selected users.

    @method approveUsers
  **/
  approveUsers: function() {
    Discourse.AdminUser.bulkApprove(this.get('content').filterProperty('selected'));
  }

});


})(this);(function () {

var $ = window.jQuery;

/**
  Return the count of users at the given trust level.

  @method valueAtTrustLevel
  @for Handlebars
**/

Handlebars.registerHelper('valueAtTrustLevel', function(property, trustLevel) {
  var data = Ember.Handlebars.get(this, property);
  if( data ) {
    var item = data.find( function(d, i, arr) { return parseInt(d.x,10) === parseInt(trustLevel,10); } );
    if( item ) {
      return item.y;
    } else {
      return 0;
    }
  }
});


})(this);(function () {

var $ = window.jQuery;

Discourse.AdminApi = Discourse.Model.extend({
  VALID_KEY_LENGTH: 64,

  keyExists: function(){
    var key = this.get('key') || '';
    return key && key.length === this.VALID_KEY_LENGTH;
  }.property('key'),

  generateKey: function(){
    var adminApi = this;
    Discourse.ajax('/admin/api/generate_key', {type: 'POST'}).then(function (result) {
      adminApi.set('key', result.key);
    });
  },

  regenerateKey: function(){
    alert(Em.String.i18n('not_implemented'));
  }
});

Discourse.AdminApi.reopenClass({
  find: function() {
    return Discourse.ajax("/admin/api").then(function(data) {
      return Discourse.AdminApi.create(data);
    });
  }
});


})(this);(function () {

var $ = window.jQuery;

/**
  A model that stores all or some data that is displayed on the dashboard.

  @class AdminDashboard
  @extends Discourse.Model
  @namespace Discourse
  @module Discourse
**/


Discourse.AdminDashboard = Discourse.Model.extend({});

Discourse.AdminDashboard.reopenClass({

  /**
    Fetch all dashboard data. This can be an expensive request when the cached data
    has expired and the server must collect the data again.

    @method find
    @return {jqXHR} a jQuery Promise object
  **/
  find: function() {
    return Discourse.ajax("/admin/dashboard").then(function(json) {
      var model = Discourse.AdminDashboard.create(json);
      model.set('loaded', true);
      return model;
    });
  },

  /**
    Only fetch the list of problems that should be rendered on the dashboard.
    The model will only have its "problems" attribute set.

    @method fetchProblems
    @return {jqXHR} a jQuery Promise object
  **/
  fetchProblems: function() {
    return Discourse.ajax("/admin/dashboard/problems", {
      type: 'GET',
      dataType: 'json'
    }).then(function(json) {
      var model = Discourse.AdminDashboard.create(json);
      model.set('loaded', true);
      return model;
    });
  }
});


})(this);(function () {

var $ = window.jQuery;

/**
  Our data model for dealing with users from the admin section.

  @class AdminUser
  @extends Discourse.Model
  @namespace Discourse
  @module Discourse
**/

Discourse.AdminUser = Discourse.User.extend({

  deleteAllPosts: function() {
    var user = this;
    this.set('can_delete_all_posts', false);
    Discourse.ajax("/admin/users/" + (this.get('id')) + "/delete_all_posts", {type: 'PUT'}).then(function(result){
      user.set('post_count', 0);
    });
  },

  // Revoke the user's admin access
  revokeAdmin: function() {
    this.set('admin', false);
    this.set('can_grant_admin', true);
    this.set('can_revoke_admin', false);
    return Discourse.ajax("/admin/users/" + (this.get('id')) + "/revoke_admin", {type: 'PUT'});
  },

  grantAdmin: function() {
    this.set('admin', true);
    this.set('can_grant_admin', false);
    this.set('can_revoke_admin', true);
    Discourse.ajax("/admin/users/" + (this.get('id')) + "/grant_admin", {type: 'PUT'});
  },

  // Revoke the user's moderation access
  revokeModeration: function() {
    this.set('moderator', false);
    this.set('can_grant_moderation', true);
    this.set('can_revoke_moderation', false);
    return Discourse.ajax("/admin/users/" + (this.get('id')) + "/revoke_moderation", {type: 'PUT'});
  },

  grantModeration: function() {
    this.set('moderator', true);
    this.set('can_grant_moderation', false);
    this.set('can_revoke_moderation', true);
    Discourse.ajax("/admin/users/" + (this.get('id')) + "/grant_moderation", {type: 'PUT'});
  },

  refreshBrowsers: function() {
    Discourse.ajax("/admin/users/" + (this.get('id')) + "/refresh_browsers", {type: 'POST'});
    bootbox.alert("Message sent to all clients!");
  },

  approve: function() {
    this.set('can_approve', false);
    this.set('approved', true);
    this.set('approved_by', Discourse.User.current());
    Discourse.ajax("/admin/users/" + (this.get('id')) + "/approve", {type: 'PUT'});
  },

  username_lower: (function() {
    return this.get('username').toLowerCase();
  }).property('username'),

  trustLevel: function() {
    var site = Discourse.Site.instance();
    return site.get('trust_levels').findProperty('id', this.get('trust_level'));
  }.property('trust_level'),

  isBanned: (function() {
    return this.get('is_banned') === true;
  }).property('is_banned'),

  canBan: (function() {
    return !this.get('admin') && !this.get('moderator');
  }).property('admin', 'moderator'),

  banDuration: (function() {
    var banned_at = Date.create(this.banned_at);
    var banned_till = Date.create(this.banned_till);
    return banned_at.short() + " - " + banned_till.short();
  }).property('banned_till', 'banned_at'),

  ban: function() {
    var duration = parseInt(window.prompt(Em.String.i18n('admin.user.ban_duration')), 10);
    if (duration > 0) {
      Discourse.ajax("/admin/users/" + this.id + "/ban", {
        type: 'PUT',
        data: {duration: duration}
      }).then(function () {
        // succeeded
        window.location.reload();
      }, function(e) {
        // failure
        var error = Em.String.i18n('admin.user.ban_failed', { error: "http: " + e.status + " - " + e.body });
        bootbox.alert(error);
      });
    }
  },

  unban: function() {
    Discourse.ajax("/admin/users/" + this.id + "/unban", {
      type: 'PUT'
    }).then(function() {
      // succeeded
      window.location.reload();
    }, function(e) {
      // failed
      var error = Em.String.i18n('admin.user.unban_failed', { error: "http: " + e.status + " - " + e.body });
      bootbox.alert(error);
    });
  },

  impersonate: function() {
    Discourse.ajax("/admin/impersonate", {
      type: 'POST',
      data: { username_or_email: this.get('username') }
    }).then(function() {
      // succeeded
      document.location = "/";
    }, function(e) {
      // failed
      if (e.status === 404) {
        bootbox.alert(Em.String.i18n('admin.impersonate.not_found'));
      } else {
        bootbox.alert(Em.String.i18n('admin.impersonate.invalid'));
      }
    });
  },

  activate: function() {
    Discourse.ajax('/admin/users/' + this.id + '/activate', {type: 'PUT'}).then(function() {
      // succeeded
      window.location.reload();
    }, function(e) {
      // failed
      var error = Em.String.i18n('admin.user.activate_failed', { error: "http: " + e.status + " - " + e.body });
      bootbox.alert(error);
    });
  },

  deactivate: function() {
    Discourse.ajax('/admin/users/' + this.id + '/deactivate', {type: 'PUT'}).then(function() {
      // succeeded
      window.location.reload();
    }, function(e) {
      // failed
      var error = Em.String.i18n('admin.user.deactivate_failed', { error: "http: " + e.status + " - " + e.body });
      bootbox.alert(error);
    });
  },

  unblock: function() {
    Discourse.ajax('/admin/users/' + this.id + '/unblock', {type: 'PUT'}).then(function() {
      // succeeded
      window.location.reload();
    }, function(e) {
      // failed
      var error = Em.String.i18n('admin.user.unblock_failed', { error: "http: " + e.status + " - " + e.body });
      bootbox.alert(error);
    });
  },

  block: function() {
    Discourse.ajax('/admin/users/' + this.id + '/block', {type: 'PUT'}).then(function() {
      // succeeded
      window.location.reload();
    }, function(e) {
      // failed
      var error = Em.String.i18n('admin.user.block_failed', { error: "http: " + e.status + " - " + e.body });
      bootbox.alert(error);
    });
  },

  sendActivationEmail: function() {
    Discourse.ajax('/users/' + this.get('username') + '/send_activation_email').then(function() {
      // succeeded
      bootbox.alert( Em.String.i18n('admin.user.activation_email_sent') );
    }, function(e) {
      // failed
      var error = Em.String.i18n('admin.user.send_activation_email_failed', { error: "http: " + e.status + " - " + e.body });
      bootbox.alert(error);
    });
  },

  deleteForbidden: function() {
    return (this.get('post_count') > 0);
  }.property('post_count'),

  deleteButtonTitle: function() {
    if (this.get('deleteForbidden')) {
      return Em.String.i18n('admin.user.delete_forbidden');
    } else {
      return null;
    }
  }.property('deleteForbidden'),

  destroy: function() {
    var user = this;
    bootbox.confirm(Em.String.i18n("admin.user.delete_confirm"), Em.String.i18n("no_value"), Em.String.i18n("yes_value"), function(result) {
      if(result) {
        Discourse.ajax("/admin/users/" + user.get('id') + '.json', { type: 'DELETE' }).then(function(data) {
          if (data.deleted) {
            bootbox.alert(Em.String.i18n("admin.user.deleted"), function() {
              document.location = "/admin/users/list/active";
            });
          } else {
            bootbox.alert(Em.String.i18n("admin.user.delete_failed"));
            if (data.user) {
              user.mergeAttributes(data.user);
            }
          }
        }, function(jqXHR, status, error) {
          Discourse.AdminUser.find( user.get('username') ).then(function(u){ user.mergeAttributes(u); });
          bootbox.alert(Em.String.i18n("admin.user.delete_failed"));
        });
      }
    });
  }

});

Discourse.AdminUser.reopenClass({

  bulkApprove: function(users) {
    users.each(function(user) {
      user.set('approved', true);
      user.set('can_approve', false);
      return user.set('selected', false);
    });
    return Discourse.ajax("/admin/users/approve-bulk", {
      type: 'PUT',
      data: {
        users: users.map(function(u) {
          return u.id;
        })
      }
    });
  },

  find: function(username) {
    return Discourse.ajax("/admin/users/" + username).then(function (result) {
      return Discourse.AdminUser.create(result);
    });
  },

  findAll: function(query, filter) {
    return Discourse.ajax("/admin/users/list/" + query + ".json", {
      data: { filter: filter }
    }).then(function(users) {
      return users.map(function(u) {
        return Discourse.AdminUser.create(u);
      });
    });
  }
});


})(this);(function () {

var $ = window.jQuery;

/**
  Our data model for representing an email log.

  @class EmailLog
  @extends Discourse.Model
  @namespace Discourse
  @module Discourse
**/

Discourse.EmailLog = Discourse.Model.extend({});

Discourse.EmailLog.reopenClass({
  create: function(attrs) {
    if (attrs.user) {
      attrs.user = Discourse.AdminUser.create(attrs.user);
    }
    return this._super(attrs);
  },

  findAll: function(filter) {
    var result = Em.A();
    Discourse.ajax("/admin/email_logs.json", {
      data: { filter: filter }
    }).then(function(logs) {
      logs.each(function(log) {
        result.pushObject(Discourse.EmailLog.create(log));
      });
    });
    return result;
  }
});




})(this);(function () {

var $ = window.jQuery;

/**
  Our data model for interacting with flagged posts.

  @class FlaggedPost
  @extends Discourse.Post
  @namespace Discourse
  @module Discourse
**/

Discourse.FlaggedPost = Discourse.Post.extend({

  flaggers: function() {
    var r,
      _this = this;
    r = [];
    this.post_actions.each(function(a) {
      return r.push(_this.userLookup[a.user_id]);
    });
    return r;
  }.property(),

  messages: function() {
    var r,
      _this = this;
    r = [];
    this.post_actions.each(function(a) {
      if (a.message) {
        return r.push({
          user: _this.userLookup[a.user_id],
          message: a.message,
          permalink: a.permalink
        });
      }
    });
    return r;
  }.property(),

  lastFlagged: function() {
    return this.post_actions[0].created_at;
  }.property(),

  user: function() {
    return this.userLookup[this.user_id];
  }.property(),

  topicHidden: function() {
    return this.get('topic_visible') === 'f';
  }.property('topic_hidden'),

  deletePost: function() {
    if (this.get('post_number') === "1") {
      return Discourse.ajax("/t/" + this.topic_id, { type: 'DELETE', cache: false });
    } else {
      return Discourse.ajax("/posts/" + this.id, { type: 'DELETE', cache: false });
    }
  },

  clearFlags: function() {
    return Discourse.ajax("/admin/flags/clear/" + this.id, { type: 'POST', cache: false });
  },

  hiddenClass: function() {
    if (this.get('hidden') === "t") return "hidden-post";
  }.property()
});

Discourse.FlaggedPost.reopenClass({
  findAll: function(filter) {
    var result = Em.A();
    Discourse.ajax("/admin/flags/" + filter + ".json").then(function(data) {
      var userLookup = {};
      data.users.each(function(u) {
        userLookup[u.id] = Discourse.User.create(u);
      });
      data.posts.each(function(p) {
        var f = Discourse.FlaggedPost.create(p);
        f.userLookup = userLookup;
        result.pushObject(f);
      });
    });
    return result;
  }
});




})(this);(function () {

var $ = window.jQuery;

/**
  A model for a git commit to the discourse repo, fetched from the github.com api.

  @class GithubCommit
  @extends Discourse.Model
  @namespace Discourse
  @module Discourse
**/

Discourse.GithubCommit = Discourse.Model.extend({
  gravatarUrl: function(){
    if( this.get('author') && this.get('author.gravatar_id') ){
      return("https://www.gravatar.com/avatar/" + this.get('author.gravatar_id') + ".png?s=38&r=pg&d=identicon");
    } else {
      return "https://www.gravatar.com/avatar/b30fff48d257cdd17c4437afac19fd30.png?s=38&r=pg&d=identicon";
    }
  }.property("commit"),

  commitUrl: function(){
    return("https://github.com/discourse/discourse/commit/" + this.get('sha'));
  }.property("sha"),

  timeAgo: function() {
    return Date.create(this.get('commit.committer.date')).relative();
  }.property("commit.committer.date")
});

Discourse.GithubCommit.reopenClass({
  findAll: function() {
    var result = Em.A();
    Discourse.ajax( "https://api.github.com/repos/discourse/discourse/commits?callback=callback", {
      dataType: 'jsonp',
      type: 'get',
      data: { per_page: 40 }
    }).then(function (response) {
      response.data.each(function(commit) {
        result.pushObject( Discourse.GithubCommit.create(commit) );
      });
    });
    return result;
  }
});


})(this);(function () {

var $ = window.jQuery;

Discourse.Group = Discourse.Model.extend({
  loaded: false,

  userCountDisplay: function(){
    var c = this.get('user_count');
    // don't display zero its ugly
    if(c > 0) {
      return c;
    }
  }.property('user_count'),

  load: function() {
    var id = this.get('id');
    if(id && !this.get('loaded')) {
      var group = this;
      Discourse.ajax('/admin/groups/' + this.get('id') + '/users').then(function(payload){
        var users = Em.A()
        payload.each(function(user){
          users.addObject(Discourse.User.create(user));
        });
        group.set('users', users)
        group.set('loaded', true)
      });
    }
  },

  usernames: function() {
    var users = this.get('users');
    var usernames = "";
    if(users) {
      usernames = $.map(users, function(user){
        return user.get('username');
      }).join(',')
    }
    return usernames;
  }.property('users'),

  destroy: function(){
    var group = this;
    group.set('disableSave', true);

    return Discourse.ajax("/admin/groups/" + this.get("id"), {type: "DELETE"})
      .then(function(){
        group.set('disableSave', false);
      });
  },

  create: function(){
    var group = this;
    group.set('disableSave', true);

    return Discourse.ajax("/admin/groups", {type: "POST", data: {
      group: {
        name: this.get('name'),
        usernames: this.get('usernames')
      }
    }}).then(function(r){
      group.set('disableSave', false);
      group.set('id', r.id);
    });
  },


  save: function(){
    var group = this;
    group.set('disableSave', true);

    return Discourse.ajax("/admin/groups/" + this.get('id'), {type: "PUT", data: {
      group: {
        name: this.get('name'),
        usernames: this.get('usernames')
      }
    }}).then(function(r){
      group.set('disableSave', false);
    });
  }

});

Discourse.Group.reopenClass({
  findAll: function(){
    var list = Discourse.SelectableArray.create();

    Discourse.ajax("/admin/groups").then(function(groups){
      groups.each(function(group){
        list.addObject(Discourse.Group.create(group));
      });
    });

    return list;
  },

  find: function(id) {
    var promise = new Em.Deferred();

    setTimeout(function(){
      promise.resolve(Discourse.Group.create({id: 1, name: "all mods", members: ["A","b","c"]}));
    }, 1000);

    return promise;
  }
});


})(this);(function () {

var $ = window.jQuery;

Discourse.Report = Discourse.Model.extend({
  reportUrl: function() {
    return("/admin/reports/" + this.get('type'));
  }.property('type'),

  valueAt: function(numDaysAgo) {
    if (this.data) {
      var wantedDate = Date.create(numDaysAgo + ' days ago', 'en').format('{yyyy}-{MM}-{dd}');
      var item = this.data.find( function(d, i, arr) { return d.x === wantedDate; } );
      if (item) {
        return item.y;
      }
    }
    return 0;
  },

  sumDays: function(startDaysAgo, endDaysAgo) {
    if (this.data) {
      var earliestDate = Date.create(endDaysAgo + ' days ago', 'en').beginningOfDay();
      var latestDate = Date.create(startDaysAgo + ' days ago', 'en').beginningOfDay();
      var d, sum = 0;
      this.data.each(function(datum){
        d = Date.create(datum.x);
        if(d >= earliestDate && d <= latestDate) {
          sum += datum.y;
        }
      });
      return sum;
    }
  },

  todayCount: function() {
    return this.valueAt(0);
  }.property('data'),

  yesterdayCount: function() {
    return this.valueAt(1);
  }.property('data'),

  lastSevenDaysCount: function() {
    return this.sumDays(1,7);
  }.property('data'),

  lastThirtyDaysCount: function() {
    return this.sumDays(1,30);
  }.property('data'),

  sevenDaysAgoCount: function() {
    return this.valueAt(7);
  }.property('data'),

  thirtyDaysAgoCount: function() {
    return this.valueAt(30);
  }.property('data'),

  yesterdayTrend: function() {
    var yesterdayVal = this.valueAt(1);
    var twoDaysAgoVal = this.valueAt(2);
    if ( yesterdayVal > twoDaysAgoVal ) {
      return 'trending-up';
    } else if ( yesterdayVal < twoDaysAgoVal ) {
      return 'trending-down';
    } else {
      return 'no-change';
    }
  }.property('data'),

  sevenDayTrend: function() {
    var currentPeriod = this.sumDays(1,7);
    var prevPeriod = this.sumDays(8,14);
    if ( currentPeriod > prevPeriod ) {
      return 'trending-up';
    } else if ( currentPeriod < prevPeriod ) {
      return 'trending-down';
    } else {
      return 'no-change';
    }
  }.property('data'),

  thirtyDayTrend: function() {
    if( this.get('prev30Days') ) {
      var currentPeriod = this.sumDays(1,30);
      if( currentPeriod > this.get('prev30Days') ) {
        return 'trending-up';
      } else if ( currentPeriod < this.get('prev30Days') ) {
        return 'trending-down';
      }
    }
    return 'no-change';
  }.property('data', 'prev30Days'),

  icon: function() {
    switch( this.get('type') ) {
    case 'flags':
      return 'icon-flag';
    case 'likes':
      return 'icon-heart';
    default:
      return null;
    }
  }.property('type'),

  percentChangeString: function(val1, val2) {
    var val = ((val1 - val2) / val2) * 100;
    if( isNaN(val) || !isFinite(val) ) {
      return null;
    } else if( val > 0 ) {
      return '+' + val.toFixed(0) + '%';
    } else {
      return val.toFixed(0) + '%';
    }
  },

  changeTitle: function(val1, val2, prevPeriodString) {
    var title = '';
    var percentChange = this.percentChangeString(val1, val2);
    if( percentChange ) {
      title += percentChange + ' change. ';
    }
    title += 'Was ' + val2 + ' ' + prevPeriodString + '.';
    return title;
  },

  yesterdayCountTitle: function() {
    return this.changeTitle( this.valueAt(1), this.valueAt(2),'two days ago');
  }.property('data'),

  sevenDayCountTitle: function() {
    return this.changeTitle( this.sumDays(1,7), this.sumDays(8,14), 'two weeks ago');
  }.property('data'),

  thirtyDayCountTitle: function() {
    return this.changeTitle( this.sumDays(1,30), this.get('prev30Days'), 'in the previous 30 day period');
  }.property('data')

});

Discourse.Report.reopenClass({
  find: function(type) {
    var model = Discourse.Report.create({type: type});
    Discourse.ajax("/admin/reports/" + type).then(function (json) {
      // Add a percent field to each tuple
      var maxY = 0;
      json.report.data.forEach(function (row) {
        if (row.y > maxY) maxY = row.y;
      });
      if (maxY > 0) {
        json.report.data.forEach(function (row) {
          row.percentage = Math.round((row.y / maxY) * 100);
        });
      }
      model.mergeAttributes(json.report);
      model.set('loaded', true);
    });
    return(model);
  }
});


})(this);(function () {

var $ = window.jQuery;

/**
  Our data model for interacting with custom site content

  @class SiteContent
  @extends Discourse.Model
  @namespace Discourse
  @module Discourse
**/

Discourse.SiteContent = Discourse.Model.extend({

  markdown: Ember.computed.equal('format', 'markdown'),
  plainText: Ember.computed.equal('format', 'plain'),
  html: Ember.computed.equal('format', 'html'),
  css: Ember.computed.equal('format', 'css'),

  /**
    Save the content

    @method save
    @return {jqXHR} a jQuery Promise object
  **/
  save: function() {
    return Discourse.ajax("/admin/site_contents/" + this.get('content_type'), {
      type: 'PUT',
      data: {content: this.get('content')}
    });
  }

});

Discourse.SiteContent.reopenClass({

  find: function(type) {
    return Discourse.ajax("/admin/site_contents/" + type).then(function (data) {
      return Discourse.SiteContent.create(data.site_content);
    });
  }

});


})(this);(function () {

var $ = window.jQuery;

/**
  Our data model that represents types of editing site content

  @class SiteContentType
  @extends Discourse.Model
  @namespace Discourse
  @module Discourse
**/

Discourse.SiteContentType = Discourse.Model.extend({});

Discourse.SiteContentType.reopenClass({
  findAll: function() {
    var contentTypes = Em.A();
    Discourse.ajax("/admin/site_content_types").then(function(data) {
      data.forEach(function (ct) {
        contentTypes.pushObject(Discourse.SiteContentType.create(ct));
      });
    });
    return contentTypes;
  }
});


})(this);(function () {

var $ = window.jQuery;

/**
  Our data model for interacting with site customizations.

  @class SiteCustomization
  @extends Discourse.Model
  @namespace Discourse
  @module Discourse
**/

Discourse.SiteCustomization = Discourse.Model.extend({
  trackedProperties: ['enabled', 'name', 'stylesheet', 'header', 'override_default_style'],

  init: function() {
    this._super();
    this.startTrackingChanges();
  },

  description: function() {
    return "" + this.name + (this.enabled ? ' (*)' : '');
  }.property('selected', 'name'),

  changed: function() {

    var _this = this;
    if(!this.originals) return false;

    var changed = this.trackedProperties.any(function(p) {
      return _this.originals[p] !== _this.get(p);
    });

    if(changed){
      this.set('savingStatus','');
    }

    return changed;

  }.property('override_default_style', 'enabled', 'name', 'stylesheet', 'header', 'originals'),

  startTrackingChanges: function() {
    var _this = this;
    var originals = {};
    this.trackedProperties.each(function(p) {
      originals[p] = _this.get(p);
      return true;
    });
    this.set('originals', originals);
  },

  previewUrl: function() {
    return "/?preview-style=" + (this.get('key'));
  }.property('key'),

  disableSave: function() {
    return !this.get('changed') || this.get('saving');
  }.property('changed'),


  save: function() {
    this.set('savingStatus', Em.String.i18n('saving'));
    this.set('saving',true);
    var data = {
      name: this.name,
      enabled: this.enabled,
      stylesheet: this.stylesheet,
      header: this.header,
      override_default_style: this.override_default_style
    };

    var siteCustomization = this;
    return Discourse.ajax("/admin/site_customizations" + (this.id ? '/' + this.id : ''), {
      data: { site_customization: data },
      type: this.id ? 'PUT' : 'POST'
    }).then(function (result) {
      if (!siteCustomization.id) { siteCustomization.set('id', result.id); }
      siteCustomization.set('savingStatus', Em.String.i18n('saved'));
      siteCustomization.set('saving',false);
      siteCustomization.startTrackingChanges();
    });

  },

  destroy: function() {
    if(!this.id) return;
    return Discourse.ajax("/admin/site_customizations/" + this.id, {
      type: 'DELETE'
    });
  }

});

var SiteCustomizations = Ember.ArrayProxy.extend({
  selectedItemChanged: function() {
    var selected = this.get('selectedItem');
    return this.get('content').each(function(i) {
      return i.set('selected', selected === i);
    });
  }.observes('selectedItem')
});

Discourse.SiteCustomization.reopenClass({
  findAll: function() {
    var customizations = SiteCustomizations.create({ content: [], loading: true });
    Discourse.ajax("/admin/site_customizations").then(function (data) {
      if (data) {
        data.site_customizations.each(function(c) {
          customizations.pushObject(Discourse.SiteCustomization.create(c.site_customizations));
        });
      }
      customizations.set('loading', false);
    });
    return customizations;
  }
});


})(this);(function () {

var $ = window.jQuery;

/**
  Our data model for interacting with site settings.

  @class SiteSetting
  @extends Discourse.Model
  @namespace Discourse
  @module Discourse
**/

Discourse.SiteSetting = Discourse.Model.extend({

  /**
    Is the boolean setting true?

    @property enabled
  **/
  enabled: function(key, value) {

    if (arguments.length === 1) {
      // get the boolean value of the setting
      if (this.blank('value')) return false;
      return this.get('value') === 'true';

    } else {
      // set the boolean value of the setting
      this.set('value', value ? 'true' : 'false');

      // We save booleans right away, it's not like a text field where it makes sense to
      // undo what you typed in.
      this.save();
    }

  }.property('value'),

  /**
    Has the user changed the setting? If so we should save it.

    @property dirty
  **/
  dirty: function() {
    return this.get('originalValue') !== this.get('value');
  }.property('originalValue', 'value'),

  /**
    Has the setting been overridden from its default value?

    @property overridden
  **/
  overridden: function() {
    var val = this.get('value');
    var defaultVal = this.get('default');

    if (val === null) val = '';
    if (defaultVal === null) defaultVal = '';

    return val.toString() !== defaultVal.toString();
  }.property('value'),

  /**
    Reset the setting to its original value.

    @method resetValue
  **/
  resetValue: function() {
    this.set('value', this.get('originalValue'));
  },

  /**
    Save the setting's value.

    @method save
  **/
  save: function() {
    // Update the setting
    var setting = this;
    return Discourse.ajax("/admin/site_settings/" + (this.get('setting')), {
      data: { value: this.get('value') },
      type: 'PUT'
    }).then(function() {
      setting.set('originalValue', setting.get('value'));
    });
  }
});

Discourse.SiteSetting.reopenClass({

  /**
    Retrieve all settings from the server

    @method findAll
  **/
  findAll: function() {
    var result = Em.A();
    Discourse.ajax("/admin/site_settings").then(function (settings) {
      settings.site_settings.each(function(s) {
        s.originalValue = s.value;
        result.pushObject(Discourse.SiteSetting.create(s));
      });
      result.set('diags', settings.diags);
    });
    return result;
  },

  update: function(key, value) {
    return Discourse.ajax("/admin/site_settings/" + key, {
      type: 'PUT',
      data: { value: value }
    });
  }
});




})(this);(function () {

var $ = window.jQuery;

/**
  Our data model for determining whether there's a new version of Discourse

  @class VersionCheck
  @extends Discourse.Model
  @namespace Discourse
  @module Discourse
**/

Discourse.VersionCheck = Discourse.Model.extend({
  upToDate: function() {
    return this.get('missing_versions_count') === 0 || this.get('missing_versions_count') === null;
  }.property('missing_versions_count'),

  behindByOneVersion: function() {
    return this.get('missing_versions_count') === 1;
  }.property('missing_versions_count'),

  gitLink: function() {
    return "https://github.com/discourse/discourse/tree/" + this.get('installed_sha');
  }.property('installed_sha'),

  shortSha: function() {
    return this.get('installed_sha').substr(0,10);
  }.property('installed_sha')
});

Discourse.VersionCheck.reopenClass({
  find: function() {
    return Discourse.ajax('/admin/version_check').then(function(json) {
      return Discourse.VersionCheck.create(json);
    });
  }
});


})(this);(function () {

var $ = window.jQuery;

/**
  Handles routes related to api

  @class AdminApiRoute
  @extends Discourse.Route
  @namespace Discourse
  @module Discourse
**/

Discourse.AdminApiRoute = Discourse.Route.extend({

  model: function() {
    return Discourse.AdminApi.find();
  },

  renderTemplate: function() {
    this.render({into: 'admin/templates/admin'});
  }

});


})(this);(function () {

var $ = window.jQuery;

/**
  Handles routes related to customization

  @class AdminCustomizeRoute
  @extends Discourse.Route
  @namespace Discourse
  @module Discourse
**/

Discourse.AdminCustomizeRoute = Discourse.Route.extend({

  model: function() {
    return Discourse.SiteCustomization.findAll();
  },

  renderTemplate: function() {
    this.render({into: 'admin/templates/admin'});
  }

});


})(this);(function () {

var $ = window.jQuery;

/**
  Handles the default admin route

  @class AdminDashboardRoute
  @extends Discourse.Route
  @namespace Discourse
  @module Discourse
**/

Discourse.AdminDashboardRoute = Discourse.Route.extend({

  setupController: function(c) {
    this.fetchDashboardData(c);
    this.fetchGithubCommits(c);
  },

  renderTemplate: function() {
    this.render({into: 'admin/templates/admin'});
  },

  fetchDashboardData: function(c) {
    if( !c.get('dashboardFetchedAt') || Date.create('1 hour ago', 'en') > c.get('dashboardFetchedAt') ) {
      c.set('dashboardFetchedAt', new Date());
      Discourse.AdminDashboard.find().then(function(d) {
        if( Discourse.SiteSettings.version_checks ){
          c.set('versionCheck', Discourse.VersionCheck.create(d.version_check));
        }
        d.reports.each(function(report){
          c.set(report.type, Discourse.Report.create(report));
        });
        c.set('admins', d.admins);
        c.set('moderators', d.moderators);
        c.set('top_referrers', d.top_referrers);
        c.set('top_traffic_sources', d.top_traffic_sources);
        c.set('top_referred_topics', d.top_referred_topics);
        c.set('loading', false);
      });
    }

    if( !c.get('problemsFetchedAt') || Date.create(c.problemsCheckInterval, 'en') > c.get('problemsFetchedAt') ) {
      c.set('problemsFetchedAt', new Date());
      c.loadProblems();
    }
  },

  fetchGithubCommits: function(c) {
    if( !c.get('commitsCheckedAt') || Date.create('1 hour ago', 'en') > c.get('commitsCheckedAt') ) {
      c.set('commitsCheckedAt', new Date());
      c.set('githubCommits', Discourse.GithubCommit.findAll());
    }
  }
});



})(this);(function () {

var $ = window.jQuery;

/**
  Handles routes related to viewing email logs.

  @class AdminEmailLogsRoute    
  @extends Discourse.Route
  @namespace Discourse
  @module Discourse
**/

Discourse.AdminEmailLogsRoute = Discourse.Route.extend({
  model: function() {
    return Discourse.EmailLog.findAll();
  },

  renderTemplate: function() {
    this.render('admin/templates/email_logs');
  }
});


})(this);(function () {

var $ = window.jQuery;

/**
  Handles routes related to viewing active flags.

  @class AdminFlagsActiveRoute
  @extends Discourse.Route
  @namespace Discourse
  @module Discourse
**/

Discourse.AdminFlagsActiveRoute = Discourse.Route.extend({

  setupController: function() {
    var adminFlagsController = this.controllerFor('adminFlags');
    adminFlagsController.set('content', Discourse.FlaggedPost.findAll('active'));
    adminFlagsController.set('query', 'active');
  }

});




})(this);(function () {

var $ = window.jQuery;

/**
  Handles routes related to viewing old flags.

  @class AdminFlagsOldRoute
  @extends Discourse.Route
  @namespace Discourse
  @module Discourse
**/

Discourse.AdminFlagsOldRoute = Discourse.Route.extend({

  setupController: function(controller, model) {
    var adminFlagsController = this.controllerFor('adminFlags');
    adminFlagsController.set('content', Discourse.FlaggedPost.findAll('old'));
    adminFlagsController.set('query', 'old');
  }

});




})(this);(function () {

var $ = window.jQuery;

/**
  Basic route for admin flags

  @class AdminFlagsRoute    
  @extends Discourse.Route
  @namespace Discourse
  @module Discourse
**/

Discourse.AdminFlagsRoute = Discourse.Route.extend({
  renderTemplate: function() {
    this.render('admin/templates/flags');
  }
});


})(this);(function () {

var $ = window.jQuery;

Discourse.AdminGroupsRoute = Discourse.Route.extend({
  renderTemplate: function() {
    this.render('admin/templates/groups',{into: 'admin/templates/admin'});
  },

  setupController: function(controller, model) {
    controller.set('model', Discourse.Group.findAll());
  }
});



})(this);(function () {

var $ = window.jQuery;

Discourse.AdminReportsRoute = Discourse.Route.extend({
  model: function(params) {
    return(Discourse.Report.find(params.type));
  },

  renderTemplate: function() {
    this.render('admin/templates/reports', {into: 'admin/templates/admin'});
  }
});


})(this);(function () {

var $ = window.jQuery;

/**
  The base admin route

  @class AdminRoute    
  @extends Discourse.Route
  @namespace Discourse
  @module Discourse
**/

Discourse.AdminRoute = Discourse.Route.extend({
  renderTemplate: function() {
    this.render('admin/templates/admin');
  }
});


})(this);(function () {

var $ = window.jQuery;

/**
  Builds the routes for the admin section

  @method buildRoutes
  @for Discourse.AdminRoute
**/

Discourse.Route.buildRoutes(function() {
  this.resource('admin', { path: '/admin' }, function() {
    this.route('dashboard', { path: '/' });
    this.route('site_settings', { path: '/site_settings' });


    this.resource('adminSiteContents', { path: '/site_contents' }, function() {
      this.resource('adminSiteContentEdit', {path: '/:content_type'});
    });

    this.route('email_logs', { path: '/email_logs' });
    this.route('customize', { path: '/customize' });
    this.route('api', {path: '/api'});

    this.resource('adminReports', { path: '/reports/:type' });

    this.resource('adminFlags', { path: '/flags' }, function() {
      this.route('active', { path: '/active' });
      this.route('old', { path: '/old' });
    });

    this.route('groups', {path: '/groups'});

    this.resource('adminUsers', { path: '/users' }, function() {
      this.resource('adminUser', { path: '/:username' });
      this.resource('adminUsersList', { path: '/list' }, function() {
        this.route('active', { path: '/active' });
        this.route('new', { path: '/new' });
        this.route('pending', { path: '/pending' });
        this.route('admins', { path: '/admins' });
        this.route('moderators', { path: '/moderators' });
        // Trust Levels:
        this.route('newuser', { path: '/newuser' });
        this.route('basic', { path: '/basic' });
        this.route('regular', { path: '/regular' });
        this.route('leaders', { path: '/leaders' });
        this.route('elders', { path: '/elders' });
      });
    });

  });
});




})(this);(function () {

var $ = window.jQuery;

/**
  Allows users to customize site content

  @class AdminSiteContentEditRoute
  @extends Discourse.Route
  @namespace Discourse
  @module Discourse
**/

Discourse.AdminSiteContentEditRoute = Discourse.Route.extend({

  serialize: function(model) {
    return {content_type: model.get('content_type')};
  },

  model: function(params) {
    return {content_type: params.content_type};
  },

  renderTemplate: function() {
    this.render('admin/templates/site_content_edit', {into: 'admin/templates/site_contents'});
  },

  exit: function() {
    this._super();
    this.render('admin/templates/site_contents_empty', {into: 'admin/templates/site_contents'});
  },

  setupController: function(controller, model) {
    controller.set('loaded', false);
    controller.setProperties({saving: false, saved: false});

    Discourse.SiteContent.find(Em.get(model, 'content_type')).then(function (sc) {
      controller.set('content', sc);
      controller.set('loaded', true);
    })
  }


});


})(this);(function () {

var $ = window.jQuery;

/**
  Allows users to customize site content

  @class AdminSiteContentsRoute
  @extends Discourse.Route
  @namespace Discourse
  @module Discourse
**/

Discourse.AdminSiteContentsRoute = Discourse.Route.extend({

  model: function() {
    return Discourse.SiteContentType.findAll();
  },

  renderTemplate: function() {
    this.render('admin/templates/site_contents', {into: 'admin/templates/admin'});
    this.render('admin/templates/site_contents_empty', {into: 'admin/templates/site_contents'});
  }
});



})(this);(function () {

var $ = window.jQuery;

/**
  Handles routes related to viewing and editing site settings.

  @class AdminSiteSettingsRoute
  @extends Discourse.Route
  @namespace Discourse
  @module Discourse
**/

Discourse.AdminSiteSettingsRoute = Discourse.Route.extend({
  model: function() {
    return Discourse.SiteSetting.findAll();
  },

  renderTemplate: function() {
    this.render('admin/templates/site_settings', {into: 'admin/templates/admin'});
  }
});


})(this);(function () {

var $ = window.jQuery;

/**
  Handles routes related to users in the admin section.

  @class AdminUserRoute
  @extends Discourse.Route
  @namespace Discourse
  @module Discourse
**/

Discourse.AdminUserRoute = Discourse.Route.extend({
  serialize: function(params) {
    return { username: Em.get(params, 'username').toLowerCase() };
  },

  renderTemplate: function() {
    this.render('admin/templates/user', {into: 'admin/templates/admin'});
  },

  setupController: function(controller, model) {
    Discourse.AdminUser.find(Em.get(model, 'username').toLowerCase()).then(function (u) {
      controller.set('content', u);
    });
  }

});


})(this);(function () {

var $ = window.jQuery;

/**
  Handles the route that deals with listing users

  @class AdminUsersListRoute
  @extends Discourse.Route
  @namespace Discourse
  @module Discourse
**/

Discourse.AdminUsersListRoute = Discourse.Route.extend({
  renderTemplate: function() {
    this.render('admin/templates/users_list', {into: 'admin/templates/admin'});
  }
});

/**
  Handles the route that lists active users.

  @class AdminUsersListActiveRoute
  @extends Discourse.Route
  @namespace Discourse
  @module Discourse
**/
Discourse.AdminUsersListActiveRoute = Discourse.Route.extend({
  setupController: function() {
    return this.controllerFor('adminUsersList').show('active');
  }
});

/**
  Handles the route that lists new users.

  @class AdminUsersListNewRoute
  @extends Discourse.Route
  @namespace Discourse
  @module Discourse
**/
Discourse.AdminUsersListNewRoute = Discourse.Route.extend({
  setupController: function() {
    return this.controllerFor('adminUsersList').show('new');
  }
});

/**
  Handles the route that lists pending users.

  @class AdminUsersListNewRoute
  @extends Discourse.Route
  @namespace Discourse
  @module Discourse
**/
Discourse.AdminUsersListPendingRoute = Discourse.Route.extend({
  setupController: function() {
    return this.controllerFor('adminUsersList').show('pending');
  }
});

/**
  Handles the route that lists admin users.

  @class AdminUsersListAdminsRoute
  @extends Discourse.Route
  @namespace Discourse
  @module Discourse
**/
Discourse.AdminUsersListAdminsRoute = Discourse.Route.extend({
  setupController: function() {
    return this.controllerFor('adminUsersList').show('admins');
  }
});

/**
  Handles the route that lists moderators.

  @class AdminUsersListModeratorsRoute
  @extends Discourse.Route
  @namespace Discourse
  @module Discourse
**/
Discourse.AdminUsersListModeratorsRoute = Discourse.Route.extend({
  setupController: function() {
    return this.controllerFor('adminUsersList').show('moderators');
  }
});


})(this);(function () {

var $ = window.jQuery;

/**
  Handles the route that lists users at trust level 0.

  @class AdminUsersListNewuserRoute
  @extends Discourse.Route
  @namespace Discourse
  @module Discourse
**/

Discourse.AdminUsersListNewuserRoute = Discourse.Route.extend({
  setupController: function() {
    return this.controllerFor('adminUsersList').show('newuser');
  }  
});

/**
  Handles the route that lists users at trust level 1.

  @class AdminUsersListBasicRoute
  @extends Discourse.Route
  @namespace Discourse
  @module Discourse
**/
Discourse.AdminUsersListBasicRoute = Discourse.Route.extend({
  setupController: function() {
    return this.controllerFor('adminUsersList').show('basic');
  }  
});

/**
  Handles the route that lists users at trust level 2.

  @class AdminUsersListRegularRoute
  @extends Discourse.Route
  @namespace Discourse
  @module Discourse
**/
Discourse.AdminUsersListRegularRoute = Discourse.Route.extend({
  setupController: function() {
    return this.controllerFor('adminUsersList').show('regular');
  }  
});

/**
  Handles the route that lists users at trust level 3.

  @class AdminUsersListLeadersRoute
  @extends Discourse.Route
  @namespace Discourse
  @module Discourse
**/
Discourse.AdminUsersListLeadersRoute = Discourse.Route.extend({
  setupController: function() {
    return this.controllerFor('adminUsersList').show('leader');
  }  
});

/**
  Handles the route that lists users at trust level 4.

  @class AdminUsersListEldersRoute
  @extends Discourse.Route
  @namespace Discourse
  @module Discourse
**/
Discourse.AdminUsersListEldersRoute = Discourse.Route.extend({
  setupController: function() {
    return this.controllerFor('adminUsersList').show('elder');
  }  
});


})(this);Ember.TEMPLATES["admin/templates/admin"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Ember.Handlebars.helpers; data = data || {};
  var buffer = '', stack1, stack2, hashTypes, options, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var stack1, hashTypes, options;
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.title", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.title", options))));
  }

function program3(depth0,data) {
  
  var buffer = '', stack1, stack2, hashTypes, options;
  data.buffer.push("\n          <li>");
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(4, program4, data),contexts:[depth0],types:["STRING"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "admin.site_settings", options) : helperMissing.call(depth0, "linkTo", "admin.site_settings", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</li>\n          <li>");
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(6, program6, data),contexts:[depth0],types:["STRING"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "adminSiteContents", options) : helperMissing.call(depth0, "linkTo", "adminSiteContents", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</li>\n        ");
  return buffer;
  }
function program4(depth0,data) {
  
  var stack1, hashTypes, options;
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.site_settings.title", options) : helperMissing.call(depth0, "i18n", "admin.site_settings.title", options))));
  }

function program6(depth0,data) {
  
  var stack1, hashTypes, options;
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.site_content.title", options) : helperMissing.call(depth0, "i18n", "admin.site_content.title", options))));
  }

function program8(depth0,data) {
  
  var stack1, hashTypes, options;
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.users.title", options) : helperMissing.call(depth0, "i18n", "admin.users.title", options))));
  }

function program10(depth0,data) {
  
  var stack1, hashTypes, options;
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.groups.title", options) : helperMissing.call(depth0, "i18n", "admin.groups.title", options))));
  }

function program12(depth0,data) {
  
  var stack1, hashTypes, options;
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.email_logs.title", options) : helperMissing.call(depth0, "i18n", "admin.email_logs.title", options))));
  }

function program14(depth0,data) {
  
  var stack1, hashTypes, options;
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.flags.title", options) : helperMissing.call(depth0, "i18n", "admin.flags.title", options))));
  }

function program16(depth0,data) {
  
  var buffer = '', stack1, stack2, hashTypes, options;
  data.buffer.push("\n          <li>");
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(17, program17, data),contexts:[depth0],types:["STRING"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "admin.customize", options) : helperMissing.call(depth0, "linkTo", "admin.customize", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</li>\n          <li>");
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(19, program19, data),contexts:[depth0],types:["STRING"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "admin.api", options) : helperMissing.call(depth0, "linkTo", "admin.api", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</li>\n        ");
  return buffer;
  }
function program17(depth0,data) {
  
  var stack1, hashTypes, options;
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.customize.title", options) : helperMissing.call(depth0, "i18n", "admin.customize.title", options))));
  }

function program19(depth0,data) {
  
  var stack1, hashTypes, options;
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.api.title", options) : helperMissing.call(depth0, "i18n", "admin.api.title", options))));
  }

  data.buffer.push("<div class=\"container\">\n  <div class=\"row\">\n    <div class=\"full-width\">\n\n      <ul class=\"nav nav-pills\">\n        <li>");
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(1, program1, data),contexts:[depth0],types:["STRING"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "admin.dashboard", options) : helperMissing.call(depth0, "linkTo", "admin.dashboard", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</li>\n        ");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "currentUser.admin", {hash:{},inverse:self.noop,fn:self.program(3, program3, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n        <li>");
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(8, program8, data),contexts:[depth0],types:["STRING"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "adminUsersList.active", options) : helperMissing.call(depth0, "linkTo", "adminUsersList.active", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</li>\n        <li>");
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(10, program10, data),contexts:[depth0],types:["STRING"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "admin.groups", options) : helperMissing.call(depth0, "linkTo", "admin.groups", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</li>\n        <li>");
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(12, program12, data),contexts:[depth0],types:["STRING"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "admin.email_logs", options) : helperMissing.call(depth0, "linkTo", "admin.email_logs", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</li>\n        <li>");
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(14, program14, data),contexts:[depth0],types:["STRING"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "adminFlags.active", options) : helperMissing.call(depth0, "linkTo", "adminFlags.active", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</li>\n        ");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "currentUser.admin", {hash:{},inverse:self.noop,fn:self.program(16, program16, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n      </ul>\n\n      <div class='boxed white admin-content'>\n        <div class='admin-contents'>\n          ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "outlet", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("\n        </div>\n      </div>\n\n    </div>\n  </div>\n</div>\n\n");
  return buffer;
  
});
Ember.TEMPLATES["admin/templates/api"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Ember.Handlebars.helpers; data = data || {};
  var buffer = '', stack1, stack2, hashTypes, options, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = '', stack1, stack2, hashTypes, options;
  data.buffer.push("\n  <strong>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.api.key", options) : helperMissing.call(depth0, "i18n", "admin.api.key", options))));
  data.buffer.push(":</strong> ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "key", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("\n  <button class='btn' ");
  hashTypes = {'target': "STRING"};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "regenerateKey", {hash:{
    'target': ("model")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n    ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.api.regenerate", options) : helperMissing.call(depth0, "i18n", "admin.api.regenerate", options))));
  data.buffer.push("\n  </button>\n  <p>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.api.note_html", options) : helperMissing.call(depth0, "i18n", "admin.api.note_html", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</p>\n");
  return buffer;
  }

function program3(depth0,data) {
  
  var buffer = '', stack1, stack2, hashTypes, options;
  data.buffer.push("\n  <p>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.api.info_html", options) : helperMissing.call(depth0, "i18n", "admin.api.info_html", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</p>\n  <button class='btn' ");
  hashTypes = {'target': "STRING"};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "generateKey", {hash:{
    'target': ("model")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n    ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.api.generate", options) : helperMissing.call(depth0, "i18n", "admin.api.generate", options))));
  data.buffer.push("\n  </button>\n");
  return buffer;
  }

  data.buffer.push("<h3>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.api.long_title", options) : helperMissing.call(depth0, "i18n", "admin.api.long_title", options))));
  data.buffer.push("</h3>\n");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "keyExists", {hash:{},inverse:self.program(3, program3, data),fn:self.program(1, program1, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n");
  return buffer;
  
});
Ember.TEMPLATES["admin/templates/commits"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Ember.Handlebars.helpers; data = data || {};
  var buffer = '', stack1, stack2, hashTypes, options, escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing, self=this;

function program1(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n      <li>\n        <div class=\"left\">\n          <img ");
  hashTypes = {'src': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'src': ("gravatarUrl")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n        </div>\n        <div class=\"right\">\n          <span class=\"commit-message\"><a ");
  hashTypes = {'href': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'href': ("commitUrl")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push(" target=\"_blank\">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "commit.message", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</a></span><br/>\n          <span class=\"commit-meta\">");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.commits.by", options) : helperMissing.call(depth0, "i18n", "admin.commits.by", options))));
  data.buffer.push(" <span class=\"committer-name\">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "commit.author.name", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</span> - <span class=\"commit-time\">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "timeAgo", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</span></span>\n        </div>\n      </li>\n    ");
  return buffer;
  }

  data.buffer.push("<div class=\"commits-widget\">\n  <div class=\"header\" ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "goToGithub", {hash:{},contexts:[depth0],types:["STRING"],hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n    <h1>\n      <i class=\"icon icon-github\"></i>\n      ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.commits.latest_changes", options) : helperMissing.call(depth0, "i18n", "admin.commits.latest_changes", options))));
  data.buffer.push("\n    </h1>\n  </div>\n  <ul class=\"commits-list\">\n    ");
  hashTypes = {};
  stack2 = helpers.each.call(depth0, "controller", {hash:{},inverse:self.noop,fn:self.program(1, program1, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n  </ul>\n</div>\n");
  return buffer;
  
});
Ember.TEMPLATES["admin/templates/customize"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Ember.Handlebars.helpers; data = data || {};
  var buffer = '', stack1, stack2, hashTypes, options, escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing, self=this;

function program1(depth0,data) {
  
  var buffer = '', hashTypes;
  data.buffer.push("\n    <li><a ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "selectStyle", "", {hash:{},contexts:[depth0,depth0],types:["ID","ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(" ");
  hashTypes = {'class': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'class': ("this.selected:active")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push(">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "description", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</a></li>\n    ");
  return buffer;
  }

function program3(depth0,data) {
  
  var buffer = '', stack1, stack2, hashTypes, options;
  data.buffer.push("\n<div class='current-style'>\n  <div class='admin-controls'>\n    <ul class=\"nav nav-pills\">\n      <li ");
  hashTypes = {'class': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'class': ("view.stylesheetActive:active")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n        <a ");
  hashTypes = {'href': "STRING",'target': "STRING"};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "selectStylesheet", {hash:{
    'href': ("true"),
    'target': ("view")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(">");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.customize.css", options) : helperMissing.call(depth0, "i18n", "admin.customize.css", options))));
  data.buffer.push("</a>\n      </li>\n      <li ");
  hashTypes = {'class': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'class': ("view.headerActive:active")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n        <a ");
  hashTypes = {'href': "STRING",'target': "STRING"};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "selectHeader", {hash:{
    'href': ("true"),
    'target': ("view")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(">");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.customize.header", options) : helperMissing.call(depth0, "i18n", "admin.customize.header", options))));
  data.buffer.push("</a>\n      </li>\n    </ul>\n  </div>\n\n  ");
  hashTypes = {};
  stack2 = helpers['with'].call(depth0, "selectedItem", {hash:{},inverse:self.noop,fn:self.program(4, program4, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n  <br>\n  <div class='status-actions'>\n    <span>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.customize.override_default", options) : helperMissing.call(depth0, "i18n", "admin.customize.override_default", options))));
  data.buffer.push(" ");
  hashTypes = {'checkedBinding': "STRING"};
  data.buffer.push(escapeExpression(helpers.view.call(depth0, "Ember.Checkbox", {hash:{
    'checkedBinding': ("selectedItem.override_default_style")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</span>\n    <span>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.customize.enabled", options) : helperMissing.call(depth0, "i18n", "admin.customize.enabled", options))));
  data.buffer.push("  ");
  hashTypes = {'checkedBinding': "STRING"};
  data.buffer.push(escapeExpression(helpers.view.call(depth0, "Ember.Checkbox", {hash:{
    'checkedBinding': ("selectedItem.enabled")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</span>\n    ");
  hashTypes = {};
  stack2 = helpers.unless.call(depth0, "selectedItem.changed", {hash:{},inverse:self.noop,fn:self.program(9, program9, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n  </div>\n\n  <div class='buttons'>\n    <button ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "save", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(" ");
  hashTypes = {'disabled': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'disabled': ("selectedItem.disableSave")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push(" class='btn'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.customize.save", options) : helperMissing.call(depth0, "i18n", "admin.customize.save", options))));
  data.buffer.push("</button>\n    <span class='saving'>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "selectedItem.savingStatus", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</span>\n    <a ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "destroy", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(" class='delete-link'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.customize.delete", options) : helperMissing.call(depth0, "i18n", "admin.customize.delete", options))));
  data.buffer.push("</a>\n  </div>\n\n</div>\n");
  return buffer;
  }
function program4(depth0,data) {
  
  var buffer = '', stack1, stack2, hashTypes, options;
  data.buffer.push("\n    ");
  hashTypes = {'class': "STRING",'value': "ID"};
  options = {hash:{
    'class': ("style-name"),
    'value': ("name")
  },contexts:[],types:[],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.textField),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "textField", options))));
  data.buffer.push("\n    ");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "view.headerActive", {hash:{},inverse:self.noop,fn:self.program(5, program5, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n    ");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "view.stylesheetActive", {hash:{},inverse:self.noop,fn:self.program(7, program7, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n  ");
  return buffer;
  }
function program5(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n      ");
  hashTypes = {'content': "ID",'mode': "STRING"};
  options = {hash:{
    'content': ("header"),
    'mode': ("html")
  },contexts:[],types:[],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.aceEditor),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "aceEditor", options))));
  data.buffer.push("\n    ");
  return buffer;
  }

function program7(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n      ");
  hashTypes = {'content': "ID",'mode': "STRING"};
  options = {hash:{
    'content': ("stylesheet"),
    'mode': ("css")
  },contexts:[],types:[],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.aceEditor),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "aceEditor", options))));
  data.buffer.push("\n    ");
  return buffer;
  }

function program9(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n    <a class='preview-link' ");
  hashTypes = {'href': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'href': ("selectedItem.previewUrl")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push(" target='_blank'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.customize.preview", options) : helperMissing.call(depth0, "i18n", "admin.customize.preview", options))));
  data.buffer.push("</a>\n    |\n    <a href=\"/?preview-style=\" target='_blank'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.customize.undo_preview", options) : helperMissing.call(depth0, "i18n", "admin.customize.undo_preview", options))));
  data.buffer.push("</a><br>\n    ");
  return buffer;
  }

function program11(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n  <p class=\"about\">");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.customize.about", options) : helperMissing.call(depth0, "i18n", "admin.customize.about", options))));
  data.buffer.push("</p>\n");
  return buffer;
  }

  data.buffer.push("\n<div class='content-list span6'>\n  <h3>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.customize.long_title", options) : helperMissing.call(depth0, "i18n", "admin.customize.long_title", options))));
  data.buffer.push("</h3>\n  <ul>\n    ");
  hashTypes = {};
  stack2 = helpers.each.call(depth0, "model", {hash:{},inverse:self.noop,fn:self.program(1, program1, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n  </ul>\n  <button ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "newCustomization", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(" class='btn'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.customize.new", options) : helperMissing.call(depth0, "i18n", "admin.customize.new", options))));
  data.buffer.push("</button>\n</div>\n\n\n");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "selectedItem", {hash:{},inverse:self.program(11, program11, data),fn:self.program(3, program3, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n<div class='clearfix'></div>\n\n");
  return buffer;
  
});
Ember.TEMPLATES["admin/templates/dashboard"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Ember.Handlebars.helpers; data = data || {};
  var buffer = '', stack1, stack2, hashTypes, options, escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing, self=this;

function program1(depth0,data) {
  
  var buffer = '', stack1, stack2, hashTypes, options;
  data.buffer.push("\n    <div class=\"dashboard-stats detected-problems\">\n      <div class=\"look-here\"><i class=\"icon icon-warning-sign\"></i></div>\n      <div class=\"problem-messages\">\n        <p ");
  hashTypes = {'class': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'class': ("loadingProblems:invisible")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n          ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.problems_found", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.problems_found", options))));
  data.buffer.push("\n          <ul ");
  hashTypes = {'class': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'class': ("loadingProblems:invisible")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n            ");
  hashTypes = {};
  stack2 = helpers.each.call(depth0, "problem", "in", "problems", {hash:{},inverse:self.noop,fn:self.program(2, program2, data),contexts:[depth0,depth0,depth0],types:["ID","ID","ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n          </ul>\n        </p>\n        <p class=\"actions\">\n          <small>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.last_checked", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.last_checked", options))));
  data.buffer.push(": ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "problemsTimestamp", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</small>\n          <button ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "loadProblems", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(" class=\"btn btn-small\"><i class=\"icon icon-refresh\"></i>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.refresh_problems", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.refresh_problems", options))));
  data.buffer.push("</button>\n        </p>\n      </div>\n      <div class=\"clearfix\"></div>\n    </div>\n  ");
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = '', stack1, hashTypes;
  data.buffer.push("\n              <li>");
  hashTypes = {'unescaped': "STRING"};
  stack1 = helpers._triageMustache.call(depth0, "problem", {hash:{
    'unescaped': ("true")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("</li>\n            ");
  return buffer;
  }

function program4(depth0,data) {
  
  var buffer = '', stack1, hashTypes;
  data.buffer.push("\n    ");
  hashTypes = {};
  stack1 = helpers['if'].call(depth0, "thereWereProblems", {hash:{},inverse:self.noop,fn:self.program(5, program5, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n  ");
  return buffer;
  }
function program5(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n      <div class=\"dashboard-stats detected-problems\">\n        <div class=\"look-here\">&nbsp;</div>\n        <div class=\"problem-messages\">\n          <p>\n            ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.no_problems", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.no_problems", options))));
  data.buffer.push("\n            <button ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "loadProblems", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(" class=\"btn btn-small\"><i class=\"icon icon-refresh\"></i>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.refresh_problems", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.refresh_problems", options))));
  data.buffer.push("</button>\n          </p>\n        </div>\n        <div class=\"clearfix\"></div>\n      </div>\n    ");
  return buffer;
  }

function program7(depth0,data) {
  
  var buffer = '', stack1, stack2, hashTypes, options;
  data.buffer.push("\n    <div ");
  hashTypes = {'class': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'class': (":dashboard-stats :version-check versionCheck.critical_updates:critical:normal")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n      <table class=\"table table-condensed table-hover\">\n        <thead>\n          <tr>\n            <th>&nbsp;</th>\n            <th>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.installed_version", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.installed_version", options))));
  data.buffer.push("</th>\n            <th>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.latest_version", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.latest_version", options))));
  data.buffer.push("</th>\n            <th>&nbsp;</th>\n            <th>&nbsp;</th>\n          </tr>\n        </thead>\n        ");
  hashTypes = {};
  stack2 = helpers.unless.call(depth0, "loading", {hash:{},inverse:self.noop,fn:self.program(8, program8, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n      </table>\n    </div>\n  ");
  return buffer;
  }
function program8(depth0,data) {
  
  var buffer = '', stack1, stack2, hashTypes, options;
  data.buffer.push("\n          <tbody>\n            <td class=\"title\">");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.version", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.version", options))));
  data.buffer.push("</td>\n            <td class=\"version-number\"><a ");
  hashTypes = {'href': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'href': ("versionCheck.gitLink")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push(" target=\"_blank\">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "versionCheck.installed_version", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</a></td>\n            <td class=\"version-number\">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "versionCheck.latest_version", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</td>\n            <td class=\"face\">\n              ");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "versionCheck.upToDate", {hash:{},inverse:self.program(11, program11, data),fn:self.program(9, program9, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n            </td>\n            <td class=\"version-notes\">\n              ");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "versionCheck.upToDate", {hash:{},inverse:self.program(18, program18, data),fn:self.program(16, program16, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n            </td>\n          </tbody>\n        ");
  return buffer;
  }
function program9(depth0,data) {
  
  
  data.buffer.push("\n                <span class='icon update-to-date'>☻</span>\n              ");
  }

function program11(depth0,data) {
  
  var buffer = '', stack1, hashTypes;
  data.buffer.push("\n                <span ");
  hashTypes = {'class': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'class': (":icon versionCheck.critical_updates:critical-updates-available:updates-available")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n                  ");
  hashTypes = {};
  stack1 = helpers['if'].call(depth0, "versionCheck.behindByOneVersion", {hash:{},inverse:self.program(14, program14, data),fn:self.program(12, program12, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n                </span>\n              ");
  return buffer;
  }
function program12(depth0,data) {
  
  
  data.buffer.push("\n                    ☺\n                  ");
  }

function program14(depth0,data) {
  
  
  data.buffer.push("\n                    ☹\n                  ");
  }

function program16(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n                ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.up_to_date", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.up_to_date", options))));
  data.buffer.push("\n              ");
  return buffer;
  }

function program18(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n                <span class=\"critical-note\">");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.critical_available", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.critical_available", options))));
  data.buffer.push("</span>\n                <span class=\"normal-note\">");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.updates_available", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.updates_available", options))));
  data.buffer.push("</span>\n                ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.please_upgrade", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.please_upgrade", options))));
  data.buffer.push("\n              ");
  return buffer;
  }

function program20(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n        ");
  hashTypes = {'tagName': "STRING"};
  options = {hash:{
    'tagName': ("tbody")
  },contexts:[depth0,depth0],types:["STRING","ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.render),stack1 ? stack1.call(depth0, "admin/templates/reports/trust_levels_report", "users_by_trust_level", options) : helperMissing.call(depth0, "render", "admin/templates/reports/trust_levels_report", "users_by_trust_level", options))));
  data.buffer.push("\n      ");
  return buffer;
  }

function program22(depth0,data) {
  
  var hashTypes;
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "admins", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  }

function program24(depth0,data) {
  
  var hashTypes;
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "moderators", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  }

function program26(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n        ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0,depth0],types:["STRING","ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.render),stack1 ? stack1.call(depth0, "admin_report_counts", "signups", options) : helperMissing.call(depth0, "render", "admin_report_counts", "signups", options))));
  data.buffer.push("\n        ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0,depth0],types:["STRING","ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.render),stack1 ? stack1.call(depth0, "admin_report_counts", "topics", options) : helperMissing.call(depth0, "render", "admin_report_counts", "topics", options))));
  data.buffer.push("\n        ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0,depth0],types:["STRING","ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.render),stack1 ? stack1.call(depth0, "admin_report_counts", "posts", options) : helperMissing.call(depth0, "render", "admin_report_counts", "posts", options))));
  data.buffer.push("\n        ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0,depth0],types:["STRING","ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.render),stack1 ? stack1.call(depth0, "admin_report_counts", "likes", options) : helperMissing.call(depth0, "render", "admin_report_counts", "likes", options))));
  data.buffer.push("\n        ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0,depth0],types:["STRING","ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.render),stack1 ? stack1.call(depth0, "admin_report_counts", "flags", options) : helperMissing.call(depth0, "render", "admin_report_counts", "flags", options))));
  data.buffer.push("\n        ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0,depth0],types:["STRING","ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.render),stack1 ? stack1.call(depth0, "admin_report_counts", "bookmarks", options) : helperMissing.call(depth0, "render", "admin_report_counts", "bookmarks", options))));
  data.buffer.push("\n        ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0,depth0],types:["STRING","ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.render),stack1 ? stack1.call(depth0, "admin_report_counts", "favorites", options) : helperMissing.call(depth0, "render", "admin_report_counts", "favorites", options))));
  data.buffer.push("\n        ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0,depth0],types:["STRING","ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.render),stack1 ? stack1.call(depth0, "admin_report_counts", "emails", options) : helperMissing.call(depth0, "render", "admin_report_counts", "emails", options))));
  data.buffer.push("\n      ");
  return buffer;
  }

function program28(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n        ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0,depth0],types:["STRING","ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.render),stack1 ? stack1.call(depth0, "admin_report_counts", "user_to_user_private_messages", options) : helperMissing.call(depth0, "render", "admin_report_counts", "user_to_user_private_messages", options))));
  data.buffer.push("\n        ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0,depth0],types:["STRING","ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.render),stack1 ? stack1.call(depth0, "admin_report_counts", "system_private_messages", options) : helperMissing.call(depth0, "render", "admin_report_counts", "system_private_messages", options))));
  data.buffer.push("\n        ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0,depth0],types:["STRING","ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.render),stack1 ? stack1.call(depth0, "admin_report_counts", "notify_moderators_private_messages", options) : helperMissing.call(depth0, "render", "admin_report_counts", "notify_moderators_private_messages", options))));
  data.buffer.push("\n        ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0,depth0],types:["STRING","ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.render),stack1 ? stack1.call(depth0, "admin_report_counts", "notify_user_private_messages", options) : helperMissing.call(depth0, "render", "admin_report_counts", "notify_user_private_messages", options))));
  data.buffer.push("\n        ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0,depth0],types:["STRING","ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.render),stack1 ? stack1.call(depth0, "admin_report_counts", "moderator_warning_private_messages", options) : helperMissing.call(depth0, "render", "admin_report_counts", "moderator_warning_private_messages", options))));
  data.buffer.push("\n      ");
  return buffer;
  }

function program30(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n        ");
  hashTypes = {'tagName': "STRING"};
  options = {hash:{
    'tagName': ("tbody")
  },contexts:[depth0,depth0],types:["STRING","ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.render),stack1 ? stack1.call(depth0, "admin/templates/reports/per_day_counts_report", "visits", options) : helperMissing.call(depth0, "render", "admin/templates/reports/per_day_counts_report", "visits", options))));
  data.buffer.push("\n      ");
  return buffer;
  }

function program32(depth0,data) {
  
  var buffer = '', stack1, hashTypes;
  data.buffer.push("\n        ");
  hashTypes = {};
  stack1 = helpers.each.call(depth0, "data", "in", "top_referred_topics.data", {hash:{},inverse:self.noop,fn:self.program(33, program33, data),contexts:[depth0,depth0,depth0],types:["ID","ID","ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n      ");
  return buffer;
  }
function program33(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n          <tbody>\n            <tr>\n              <td class=\"title\"><a href=\"/t/");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.unbound.call(depth0, "data.topic_slug", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("/");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.unbound.call(depth0, "data.topic_id", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("\">");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.shorten),stack1 ? stack1.call(depth0, "data.topic_title", options) : helperMissing.call(depth0, "shorten", "data.topic_title", options))));
  data.buffer.push("</a></td>\n              <td class=\"value\">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "data.num_clicks", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</td>\n            </tr>\n          </tbody>\n        ");
  return buffer;
  }

function program35(depth0,data) {
  
  var buffer = '', stack1, hashTypes;
  data.buffer.push("\n        ");
  hashTypes = {};
  stack1 = helpers.each.call(depth0, "top_traffic_sources.data", {hash:{},inverse:self.noop,fn:self.program(36, program36, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n      ");
  return buffer;
  }
function program36(depth0,data) {
  
  var buffer = '', hashTypes;
  data.buffer.push("\n          <tbody>\n            <tr>\n              <td class=\"title\">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "domain", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</td>\n              <td class=\"value\">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "num_clicks", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</td>\n              <td class=\"value\">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "num_topics", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</td>\n              <td class=\"value\">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "num_users", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</td>\n            </tr>\n          </tbody>\n        ");
  return buffer;
  }

function program38(depth0,data) {
  
  var buffer = '', stack1, hashTypes;
  data.buffer.push("\n        ");
  hashTypes = {};
  stack1 = helpers.each.call(depth0, "top_referrers.data", {hash:{},inverse:self.noop,fn:self.program(39, program39, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n      ");
  return buffer;
  }
function program39(depth0,data) {
  
  var buffer = '', stack1, stack2, hashTypes, options;
  data.buffer.push("\n          <tbody>\n            <tr>\n              <td class=\"title\">");
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(40, program40, data),contexts:[depth0,depth0],types:["STRING","ID"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "adminUser", "", options) : helperMissing.call(depth0, "linkTo", "adminUser", "", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</td>\n              <td class=\"value\">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "num_clicks", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</td>\n              <td class=\"value\">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "num_topics", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</td>\n            </tr>\n          </tbody>\n        ");
  return buffer;
  }
function program40(depth0,data) {
  
  var hashTypes;
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.unbound.call(depth0, "username", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  }

  data.buffer.push("<div class=\"dashboard-left\">\n  ");
  hashTypes = {};
  stack1 = helpers['if'].call(depth0, "foundProblems", {hash:{},inverse:self.program(4, program4, data),fn:self.program(1, program1, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n\n  ");
  hashTypes = {};
  stack1 = helpers['if'].call(depth0, "Discourse.SiteSettings.version_checks", {hash:{},inverse:self.noop,fn:self.program(7, program7, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n\n  <div class=\"dashboard-stats trust-levels\">\n    <table class=\"table table-condensed table-hover\">\n      <thead>\n        <tr>\n          <th>&nbsp;</th>\n          <th>0</th>\n          <th>1</th>\n          <th>2</th>\n          <th>3</th>\n          <th>4</th>\n        </tr>\n      </thead>\n      ");
  hashTypes = {};
  stack1 = helpers.unless.call(depth0, "loading", {hash:{},inverse:self.noop,fn:self.program(20, program20, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n    </table>\n  </div>\n\n  <div class=\"dashboard-stats totals\">\n    <span class=\"title\"><i class='icon icon-trophy'></i> ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.admins", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.admins", options))));
  data.buffer.push("</span>\n    <span class=\"value\">");
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(22, program22, data),contexts:[depth0],types:["STRING"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "adminUsersList.admins", options) : helperMissing.call(depth0, "linkTo", "adminUsersList.admins", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</span>\n    <span class=\"title\"><i class='icon icon-magic'></i> ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.moderators", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.moderators", options))));
  data.buffer.push("</span>\n    <span class=\"value\">");
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(24, program24, data),contexts:[depth0],types:["STRING"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "adminUsersList.moderators", options) : helperMissing.call(depth0, "linkTo", "adminUsersList.moderators", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</span>\n  </div>\n\n  <div class=\"dashboard-stats\">\n    <table class=\"table table-condensed table-hover\">\n      <thead>\n        <tr>\n          <th>&nbsp;</th>\n          <th>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.reports.today", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.reports.today", options))));
  data.buffer.push("</th>\n          <th>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.reports.yesterday", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.reports.yesterday", options))));
  data.buffer.push("</th>\n          <th>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.reports.last_7_days", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.reports.last_7_days", options))));
  data.buffer.push("</th>\n          <th>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.reports.last_30_days", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.reports.last_30_days", options))));
  data.buffer.push("</th>\n          <th>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.reports.all", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.reports.all", options))));
  data.buffer.push("</th>\n        </tr>\n      </thead>\n      ");
  hashTypes = {};
  stack2 = helpers.unless.call(depth0, "loading", {hash:{},inverse:self.noop,fn:self.program(26, program26, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n    </table>\n  </div>\n\n  <div class=\"dashboard-stats\">\n    <table class=\"table table-condensed table-hover\">\n      <thead>\n        <tr>\n          <th class=\"title\" title=\"");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.private_messages_title", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.private_messages_title", options))));
  data.buffer.push("\"><i class=\"icon icon-envelope-alt\"></i> ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.private_messages_short", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.private_messages_short", options))));
  data.buffer.push("</th>\n          <th>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.reports.today", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.reports.today", options))));
  data.buffer.push("</th>\n          <th>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.reports.yesterday", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.reports.yesterday", options))));
  data.buffer.push("</th>\n          <th>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.reports.last_7_days", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.reports.last_7_days", options))));
  data.buffer.push("</th>\n          <th>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.reports.last_30_days", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.reports.last_30_days", options))));
  data.buffer.push("</th>\n          <th>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.reports.all", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.reports.all", options))));
  data.buffer.push("</th>\n        </tr>\n      </thead>\n      ");
  hashTypes = {};
  stack2 = helpers.unless.call(depth0, "loading", {hash:{},inverse:self.noop,fn:self.program(28, program28, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n    </table>\n  </div>\n\n  <div class=\"dashboard-stats\">\n    <table class=\"table table-condensed table-hover\">\n      <thead>\n        <tr>\n          <th>&nbsp;</th>\n          <th>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.reports.today", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.reports.today", options))));
  data.buffer.push("</th>\n          <th>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.reports.yesterday", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.reports.yesterday", options))));
  data.buffer.push("</th>\n          <th>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.reports.7_days_ago", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.reports.7_days_ago", options))));
  data.buffer.push("</th>\n          <th>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.reports.30_days_ago", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.reports.30_days_ago", options))));
  data.buffer.push("</th>\n        </tr>\n      </thead>\n      ");
  hashTypes = {};
  stack2 = helpers.unless.call(depth0, "loading", {hash:{},inverse:self.noop,fn:self.program(30, program30, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n    </table>\n  </div>\n</div>\n\n<div class=\"dashboard-right\">\n  ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0,depth0],types:["STRING","ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.render),stack1 ? stack1.call(depth0, "admin/templates/commits", "githubCommits", options) : helperMissing.call(depth0, "render", "admin/templates/commits", "githubCommits", options))));
  data.buffer.push("\n\n  <div class=\"dashboard-stats\">\n    <table class=\"table table-condensed table-hover\">\n      <thead>\n        <tr>\n          <th class=\"title\">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "top_referred_topics.title", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(" (");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.reports.last_30_days", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.reports.last_30_days", options))));
  data.buffer.push(")</th>\n          <th>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "top_referred_topics.ytitles.num_clicks", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</th>\n        </tr>\n      </thead>\n      ");
  hashTypes = {};
  stack2 = helpers.unless.call(depth0, "loading", {hash:{},inverse:self.noop,fn:self.program(32, program32, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n    </table>\n  </div>\n\n  <div class=\"dashboard-stats\">\n    <table class=\"table table-condensed table-hover\">\n      <thead>\n        <tr>\n          <th class=\"title\">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "top_traffic_sources.title", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(" (");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.reports.last_30_days", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.reports.last_30_days", options))));
  data.buffer.push(")</th>\n          <th>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "top_traffic_sources.ytitles.num_clicks", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</th>\n          <th>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "top_traffic_sources.ytitles.num_topics", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</th>\n          <th>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "top_traffic_sources.ytitles.num_users", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</th>\n        </tr>\n      </thead>\n      ");
  hashTypes = {};
  stack2 = helpers.unless.call(depth0, "loading", {hash:{},inverse:self.noop,fn:self.program(35, program35, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n    </table>\n  </div>\n\n  <div class=\"dashboard-stats\">\n    <table class=\"table table-condensed table-hover\">\n      <thead>\n        <tr>\n          <th class=\"title\">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "top_referrers.title", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(" (");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.reports.last_30_days", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.reports.last_30_days", options))));
  data.buffer.push(")</th>\n          <th>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "top_referrers.ytitles.num_clicks", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</th>\n          <th>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "top_referrers.ytitles.num_topics", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</th>\n        </tr>\n      </thead>\n      ");
  hashTypes = {};
  stack2 = helpers.unless.call(depth0, "loading", {hash:{},inverse:self.noop,fn:self.program(38, program38, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n    </table>\n  </div>\n</div>\n<div class='clearfix'></div>\n");
  return buffer;
  
});
Ember.TEMPLATES["admin/templates/email_logs"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Ember.Handlebars.helpers; data = data || {};
  var buffer = '', stack1, stack2, hashTypes, options, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, self=this, functionType="function", blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("<span class='result-message'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.email_logs.sent_test", options) : helperMissing.call(depth0, "i18n", "admin.email_logs.sent_test", options))));
  data.buffer.push("</span>");
  return buffer;
  }

function program3(depth0,data) {
  
  var buffer = '', stack1, options, hashTypes;
  data.buffer.push("\n    ");
  options = {hash:{},inverse:self.noop,fn:self.program(4, program4, data),contexts:[],types:[],hashTypes:hashTypes,data:data};
  if (stack1 = helpers.group) { stack1 = stack1.call(depth0, options); }
  else { stack1 = depth0.group; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  hashTypes = {};
  if (!helpers.group) { stack1 = blockHelperMissing.call(depth0, stack1, options); }
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n  ");
  return buffer;
  }
function program4(depth0,data) {
  
  var buffer = '', stack1, stack2, hashTypes, options;
  data.buffer.push("\n      ");
  hashTypes = {'contentBinding': "STRING",'tagName': "STRING",'itemTagName': "STRING"};
  options = {hash:{
    'contentBinding': ("model"),
    'tagName': ("tbody"),
    'itemTagName': ("tr")
  },inverse:self.noop,fn:self.program(5, program5, data),contexts:[],types:[],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.collection),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "collection", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n    ");
  return buffer;
  }
function program5(depth0,data) {
  
  var buffer = '', stack1, stack2, hashTypes, options;
  data.buffer.push("\n          <td>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.date),stack1 ? stack1.call(depth0, "created_at", options) : helperMissing.call(depth0, "date", "created_at", options))));
  data.buffer.push("</td>\n          <td>\n            ");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "user", {hash:{},inverse:self.program(11, program11, data),fn:self.program(6, program6, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n          </td>\n          <td><a href='mailto:");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.unbound.call(depth0, "to_address", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("'>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "to_address", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</a></td>\n          <td>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "email_type", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</td>\n      ");
  return buffer;
  }
function program6(depth0,data) {
  
  var buffer = '', stack1, stack2, hashTypes, options;
  data.buffer.push("\n              ");
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(7, program7, data),contexts:[depth0,depth0],types:["STRING","ID"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "adminUser", "user", options) : helperMissing.call(depth0, "linkTo", "adminUser", "user", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n              ");
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(9, program9, data),contexts:[depth0,depth0],types:["STRING","ID"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "adminUser", "user", options) : helperMissing.call(depth0, "linkTo", "adminUser", "user", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n            ");
  return buffer;
  }
function program7(depth0,data) {
  
  var stack1, hashTypes, options;
  hashTypes = {'imageSize': "STRING"};
  options = {hash:{
    'imageSize': ("tiny")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.avatar),stack1 ? stack1.call(depth0, "user", options) : helperMissing.call(depth0, "avatar", "user", options))));
  }

function program9(depth0,data) {
  
  var hashTypes;
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "user.username", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  }

function program11(depth0,data) {
  
  
  data.buffer.push("\n              &mdash;\n            ");
  }

  data.buffer.push("<div class='admin-controls'>\n  <div class='span5 controls'>\n    ");
  hashTypes = {'value': "ID",'placeholderKey': "STRING"};
  options = {hash:{
    'value': ("testEmailAddress"),
    'placeholderKey': ("admin.email_logs.test_email_address")
  },contexts:[],types:[],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.textField),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "textField", options))));
  data.buffer.push("\n  </div>\n  <div class='span10 controls'>\n    <button class='btn' ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "sendTestEmail", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(" ");
  hashTypes = {'disabled': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'disabled': ("sendTestEmailDisabled")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push(">");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.email_logs.send_test", options) : helperMissing.call(depth0, "i18n", "admin.email_logs.send_test", options))));
  data.buffer.push("</button>\n    ");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "sentTestEmail", {hash:{},inverse:self.noop,fn:self.program(1, program1, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n  </div>\n</div>\n\n<table class='table'>\n  <tr>\n    <th>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.email_logs.sent_at", options) : helperMissing.call(depth0, "i18n", "admin.email_logs.sent_at", options))));
  data.buffer.push("</th>\n    <th>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "user.title", options) : helperMissing.call(depth0, "i18n", "user.title", options))));
  data.buffer.push("</th>\n    <th>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.email_logs.to_address", options) : helperMissing.call(depth0, "i18n", "admin.email_logs.to_address", options))));
  data.buffer.push("</th>\n    <th>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.email_logs.email_type", options) : helperMissing.call(depth0, "i18n", "admin.email_logs.email_type", options))));
  data.buffer.push("</th>\n  </tr>\n\n  ");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "model.length", {hash:{},inverse:self.noop,fn:self.program(3, program3, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n\n</table>\n");
  return buffer;
  
});
Ember.TEMPLATES["admin/templates/flags"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Ember.Handlebars.helpers; data = data || {};
  var buffer = '', stack1, stack2, hashTypes, options, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var stack1, hashTypes, options;
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.flags.active", options) : helperMissing.call(depth0, "i18n", "admin.flags.active", options))));
  }

function program3(depth0,data) {
  
  var stack1, hashTypes, options;
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.flags.old", options) : helperMissing.call(depth0, "i18n", "admin.flags.old", options))));
  }

function program5(depth0,data) {
  
  var buffer = '', stack1, stack2, hashTypes, options;
  data.buffer.push("\n    <tr ");
  hashTypes = {'class': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'class': ("hiddenClass")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n      <td class='user'>");
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(6, program6, data),contexts:[depth0,depth0],types:["STRING","ID"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "adminUser", "flag.user", options) : helperMissing.call(depth0, "linkTo", "adminUser", "flag.user", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</td>\n      <td class='excerpt'>");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "flag.topicHidden", {hash:{},inverse:self.noop,fn:self.program(8, program8, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("<h3><a href='");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.unbound.call(depth0, "flag.url", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("'>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "flag.title", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</a></h3><br>");
  hashTypes = {'unescaped': "STRING"};
  stack2 = helpers._triageMustache.call(depth0, "flag.excerpt", {hash:{
    'unescaped': ("true")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n      </td>\n      <td class='flaggers'>");
  hashTypes = {};
  stack2 = helpers.each.call(depth0, "flag.flaggers", {hash:{},inverse:self.noop,fn:self.program(10, program10, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</td>\n      <td class='last-flagged'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.date),stack1 ? stack1.call(depth0, "flag.lastFlagged", options) : helperMissing.call(depth0, "date", "flag.lastFlagged", options))));
  data.buffer.push("</td>\n      <td class='action'>\n        ");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "adminActiveFlagsView", {hash:{},inverse:self.noop,fn:self.program(13, program13, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n      </td>\n    </tr>\n\n      ");
  hashTypes = {};
  stack2 = helpers.each.call(depth0, "flag.messages", {hash:{},inverse:self.noop,fn:self.program(15, program15, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n    ");
  return buffer;
  }
function program6(depth0,data) {
  
  var stack1, hashTypes, options;
  hashTypes = {'imageSize': "STRING"};
  options = {hash:{
    'imageSize': ("small")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.avatar),stack1 ? stack1.call(depth0, "flag.user", options) : helperMissing.call(depth0, "avatar", "flag.user", options))));
  }

function program8(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("<i title='");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "topic_statuses.invisible.help", options) : helperMissing.call(depth0, "i18n", "topic_statuses.invisible.help", options))));
  data.buffer.push("' class='icon icon-eye-close'></i> ");
  return buffer;
  }

function program10(depth0,data) {
  
  var stack1, stack2, hashTypes, options;
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(11, program11, data),contexts:[depth0,depth0],types:["STRING","ID"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "adminUser", "", options) : helperMissing.call(depth0, "linkTo", "adminUser", "", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  else { data.buffer.push(''); }
  }
function program11(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  hashTypes = {'imageSize': "STRING"};
  options = {hash:{
    'imageSize': ("small")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.avatar),stack1 ? stack1.call(depth0, "", options) : helperMissing.call(depth0, "avatar", "", options))));
  data.buffer.push(" ");
  return buffer;
  }

function program13(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n          <button title='");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.flags.clear_title", options) : helperMissing.call(depth0, "i18n", "admin.flags.clear_title", options))));
  data.buffer.push("' class='btn' ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "clearFlags", "flag", {hash:{},contexts:[depth0,depth0],types:["ID","ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(">");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.flags.clear", options) : helperMissing.call(depth0, "i18n", "admin.flags.clear", options))));
  data.buffer.push("</button>\n          <button title='");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.flags.delete_title", options) : helperMissing.call(depth0, "i18n", "admin.flags.delete_title", options))));
  data.buffer.push("' class='btn' ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "deletePost", "flag", {hash:{},contexts:[depth0,depth0],types:["ID","ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(">");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.flags.delete", options) : helperMissing.call(depth0, "i18n", "admin.flags.delete", options))));
  data.buffer.push("</button>\n        ");
  return buffer;
  }

function program15(depth0,data) {
  
  var buffer = '', stack1, stack2, hashTypes, options;
  data.buffer.push("\n        <tr>\n          <td></td>\n          <td class='message'>\n            <div>");
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(16, program16, data),contexts:[depth0,depth0],types:["STRING","ID"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "adminUser", "user", options) : helperMissing.call(depth0, "linkTo", "adminUser", "user", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push(" ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "message", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(" <a href=\"");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.unbound.call(depth0, "permalink", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("\">");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.flags.view_message", options) : helperMissing.call(depth0, "i18n", "admin.flags.view_message", options))));
  data.buffer.push("</a></div>\n          </td>\n          <td></td>\n          <td></td>\n          <td></td>\n        </tr>\n      ");
  return buffer;
  }
function program16(depth0,data) {
  
  var stack1, hashTypes, options;
  hashTypes = {'imageSize': "STRING"};
  options = {hash:{
    'imageSize': ("small")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.avatar),stack1 ? stack1.call(depth0, "user", options) : helperMissing.call(depth0, "avatar", "user", options))));
  }

  data.buffer.push("<div class='admin-controls'>\n  <div class='span15'>\n    <ul class=\"nav nav-pills\">\n      <li>");
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(1, program1, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "adminFlags.active", options) : helperMissing.call(depth0, "linkTo", "adminFlags.active", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</li>\n      <li>");
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(3, program3, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "adminFlags.old", options) : helperMissing.call(depth0, "linkTo", "adminFlags.old", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</li>\n    </ul>\n  </div>\n</div>\n\n<table class='admin-flags'>\n  <thead>\n    <tr>\n      <th class='user'></th>\n      <th class='excerpt'></th>\n      <th class='flaggers'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.flags.flagged_by", options) : helperMissing.call(depth0, "i18n", "admin.flags.flagged_by", options))));
  data.buffer.push("</th>\n      <th class='last-flagged'></th>\n      <th class='action'></th>\n    </tr>\n  </thead>\n  <tbody>\n    ");
  hashTypes = {};
  stack2 = helpers.each.call(depth0, "flag", "in", "content", {hash:{},inverse:self.noop,fn:self.program(5, program5, data),contexts:[depth0,depth0,depth0],types:["ID","ID","ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n  </tbody>\n</table>\n");
  return buffer;
  
});
Ember.TEMPLATES["admin/templates/groups"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Ember.Handlebars.helpers; data = data || {};
  var buffer = '', stack1, stack2, hashTypes, options, escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing, self=this;

function program1(depth0,data) {
  
  var buffer = '', hashTypes;
  data.buffer.push("\n        <li>\n        <a href=\"#\" ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "edit", "group", {hash:{},contexts:[depth0,depth0],types:["STRING","ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(" ");
  hashTypes = {'class': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'class': ("group.active")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push(">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "group.name", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(" <span class=\"count\">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "group.userCountDisplay", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</span></a>\n        </li>\n      ");
  return buffer;
  }

function program3(depth0,data) {
  
  var buffer = '', stack1, hashTypes;
  data.buffer.push("\n      ");
  hashTypes = {};
  stack1 = helpers['if'].call(depth0, "model.active.loaded", {hash:{},inverse:self.program(13, program13, data),fn:self.program(4, program4, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n    ");
  return buffer;
  }
function program4(depth0,data) {
  
  var buffer = '', stack1, hashTypes;
  data.buffer.push("\n        ");
  hashTypes = {};
  stack1 = helpers['with'].call(depth0, "model.active", {hash:{},inverse:self.noop,fn:self.program(5, program5, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n      ");
  return buffer;
  }
function program5(depth0,data) {
  
  var buffer = '', stack1, stack2, hashTypes, options;
  data.buffer.push("\n          ");
  hashTypes = {};
  stack1 = helpers['if'].call(depth0, "automatic", {hash:{},inverse:self.program(8, program8, data),fn:self.program(6, program6, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n\n          ");
  hashTypes = {'usernames': "ID",'id': "STRING",'placeholderKey': "STRING",'tabindex': "STRING"};
  options = {hash:{
    'usernames': ("usernames"),
    'id': ("group-users"),
    'placeholderKey': ("admin.groups.selector_placeholder"),
    'tabindex': ("1")
  },contexts:[],types:[],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.userSelector),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "userSelector", options))));
  data.buffer.push("\n          <div class='controls'>\n            <button ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "save", "", {hash:{},contexts:[depth0,depth0],types:["ID","ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(" ");
  hashTypes = {'disabled': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'disabled': ("disableSave")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push(" class='btn'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.customize.save", options) : helperMissing.call(depth0, "i18n", "admin.customize.save", options))));
  data.buffer.push("</button>\n            ");
  hashTypes = {};
  stack2 = helpers.unless.call(depth0, "automatic", {hash:{},inverse:self.noop,fn:self.program(10, program10, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n          </div>\n        ");
  return buffer;
  }
function program6(depth0,data) {
  
  var buffer = '', hashTypes;
  data.buffer.push("\n            <h3>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "name", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</h3>\n          ");
  return buffer;
  }

function program8(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n            ");
  hashTypes = {'value': "ID",'placeholderKey': "STRING"};
  options = {hash:{
    'value': ("name"),
    'placeholderKey': ("admin.groups.name_placeholder")
  },contexts:[],types:[],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.textField),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "textField", options))));
  data.buffer.push("\n          ");
  return buffer;
  }

function program10(depth0,data) {
  
  var buffer = '', stack1, hashTypes;
  data.buffer.push("\n              ");
  hashTypes = {};
  stack1 = helpers['if'].call(depth0, "id", {hash:{},inverse:self.noop,fn:self.program(11, program11, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n            ");
  return buffer;
  }
function program11(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n                <a ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "destroy", "", {hash:{},contexts:[depth0,depth0],types:["ID","ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(" class='delete-link'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.customize.delete", options) : helperMissing.call(depth0, "i18n", "admin.customize.delete", options))));
  data.buffer.push("</a>\n              ");
  return buffer;
  }

function program13(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n        <div class='spinner'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "loading", options) : helperMissing.call(depth0, "i18n", "loading", options))));
  data.buffer.push("</div>\n      ");
  return buffer;
  }

function program15(depth0,data) {
  
  
  data.buffer.push("\n      nothing here yet\n    ");
  }

  data.buffer.push("<!-- work in progress, please ignore -->\n<div class='row groups'>\n  <div class='content-list span6'>\n    <h3>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.groups.edit", options) : helperMissing.call(depth0, "i18n", "admin.groups.edit", options))));
  data.buffer.push("</h3>\n    <ul>\n      ");
  hashTypes = {};
  stack2 = helpers.each.call(depth0, "group", "in", "model", {hash:{},inverse:self.noop,fn:self.program(1, program1, data),contexts:[depth0,depth0,depth0],types:["ID","ID","ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n    </ul>\n    <div class='controls'>\n      <button class='btn' ");
  hashTypes = {'disabled': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'disabled': ("refreshingAutoGroups")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push(" ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "refreshAutoGroups", {hash:{},contexts:[depth0],types:["STRING"],hashTypes:hashTypes,data:data})));
  data.buffer.push(">Refresh</button>\n      <button class='btn' ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "newGroup", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(">New</button>\n    </div>\n  </div>\n\n  <div class='content-editor'>\n    ");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "model.active", {hash:{},inverse:self.program(15, program15, data),fn:self.program(3, program3, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n  </div>\n</div>\n");
  return buffer;
  
});
Ember.TEMPLATES["admin/templates/reports"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Ember.Handlebars.helpers; data = data || {};
  var buffer = '', stack1, hashTypes, escapeExpression=this.escapeExpression, self=this, helperMissing=helpers.helperMissing;

function program1(depth0,data) {
  
  var buffer = '', stack1, stack2, hashTypes, options;
  data.buffer.push("\n  <h3>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "title", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</h3>\n\n  <button class='btn'\n          ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "viewAsTable", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("\n          ");
  hashTypes = {'disabled': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'disabled': ("viewingTable")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push(">");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.reports.view_table", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.reports.view_table", options))));
  data.buffer.push("</button>\n\n  <button class='btn'\n          ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "viewAsBarChart", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("\n          ");
  hashTypes = {'disabled': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'disabled': ("viewingBarChart")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push(">");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.dashboard.reports.view_chart", options) : helperMissing.call(depth0, "i18n", "admin.dashboard.reports.view_chart", options))));
  data.buffer.push("</button>\n\n  <table class='table report'>\n    <tr>\n      <th>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "xaxis", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</th>\n      <th>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "yaxis", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</th>\n    </tr>\n\n    ");
  hashTypes = {};
  stack2 = helpers.each.call(depth0, "row", "in", "data", {hash:{},inverse:self.noop,fn:self.program(2, program2, data),contexts:[depth0,depth0,depth0],types:["ID","ID","ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n  </table>\n\n");
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = '', stack1, hashTypes;
  data.buffer.push("\n      <tr>\n        <td>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "row.x", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</td>\n        <td>\n          ");
  hashTypes = {};
  stack1 = helpers['if'].call(depth0, "viewingTable", {hash:{},inverse:self.noop,fn:self.program(3, program3, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n          ");
  hashTypes = {};
  stack1 = helpers['if'].call(depth0, "viewingBarChart", {hash:{},inverse:self.noop,fn:self.program(5, program5, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n        </td>\n      </tr>\n    ");
  return buffer;
  }
function program3(depth0,data) {
  
  var buffer = '', hashTypes;
  data.buffer.push("\n            ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "row.y", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("\n          ");
  return buffer;
  }

function program5(depth0,data) {
  
  var buffer = '', hashTypes;
  data.buffer.push("\n            <div class='bar-container'>\n              <div class='bar' style=\"width: ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.unbound.call(depth0, "row.percentage", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("%\">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "row.y", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</div>\n            </div>\n          ");
  return buffer;
  }

function program7(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n  ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "loading", options) : helperMissing.call(depth0, "i18n", "loading", options))));
  data.buffer.push("\n");
  return buffer;
  }

  hashTypes = {};
  stack1 = helpers['if'].call(depth0, "loaded", {hash:{},inverse:self.program(7, program7, data),fn:self.program(1, program1, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n");
  return buffer;
  
});
Ember.TEMPLATES["admin/templates/reports/per_day_counts_report"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Ember.Handlebars.helpers; data = data || {};
  var buffer = '', hashTypes, escapeExpression=this.escapeExpression;


  data.buffer.push("<tr>\n  <td class=\"title\"><a ");
  hashTypes = {'href': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'href': ("reportUrl")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push(">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "title", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</a></td>\n  <td class=\"value\">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "todayCount", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</td>\n  <td class=\"value\">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "yesterdayCount", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</td>\n  <td class=\"value\">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "sevenDaysAgoCount", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</td>\n  <td class=\"value\">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "thirtyDaysAgoCount", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</td>\n</tr>\n");
  return buffer;
  
});
Ember.TEMPLATES["admin/templates/reports/summed_counts_report"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Ember.Handlebars.helpers; data = data || {};
  var buffer = '', stack1, hashTypes, escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = '', hashTypes;
  data.buffer.push("\n      <i ");
  hashTypes = {'class': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'class': (":icon icon")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push("></i>\n    ");
  return buffer;
  }

  data.buffer.push("<tr>\n  <td class=\"title\">\n    ");
  hashTypes = {};
  stack1 = helpers['if'].call(depth0, "icon", {hash:{},inverse:self.noop,fn:self.program(1, program1, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n    <a ");
  hashTypes = {'href': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'href': ("reportUrl")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push(">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "title", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</a>\n  </td>\n  <td class=\"value\">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "todayCount", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</td>\n  <td ");
  hashTypes = {'class': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'class': (":value yesterdayTrend")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push(" ");
  hashTypes = {'title': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'title': ("yesterdayCountTitle")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push(">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "yesterdayCount", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(" <i class=\"icon up icon-caret-up\"></i><i class=\"icon down icon-caret-down\"></i></td>\n  <td ");
  hashTypes = {'class': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'class': (":value sevenDayTrend")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push(" ");
  hashTypes = {'title': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'title': ("sevenDayCountTitle")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push(">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "lastSevenDaysCount", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(" <i class=\"icon up icon-caret-up\"></i><i class=\"icon down icon-caret-down\"></i></td>\n  <td ");
  hashTypes = {'class': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'class': (":value thirtyDayTrend")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push(" ");
  hashTypes = {'title': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'title': ("thirtyDayCountTitle")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push(">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "lastThirtyDaysCount", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(" <i class=\"icon up icon-caret-up\"></i><i class=\"icon down icon-caret-down\"></i></td>\n  <td class=\"value\">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "total", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</td>\n</tr>\n");
  return buffer;
  
});
Ember.TEMPLATES["admin/templates/reports/trust_levels_report"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Ember.Handlebars.helpers; data = data || {};
  var buffer = '', stack1, stack2, hashTypes, options, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var stack1, hashTypes, options;
  hashTypes = {};
  options = {hash:{},contexts:[depth0,depth0],types:["ID","INTEGER"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.valueAtTrustLevel),stack1 ? stack1.call(depth0, "data", 0, options) : helperMissing.call(depth0, "valueAtTrustLevel", "data", 0, options))));
  }

function program3(depth0,data) {
  
  var stack1, hashTypes, options;
  hashTypes = {};
  options = {hash:{},contexts:[depth0,depth0],types:["ID","INTEGER"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.valueAtTrustLevel),stack1 ? stack1.call(depth0, "data", 1, options) : helperMissing.call(depth0, "valueAtTrustLevel", "data", 1, options))));
  }

function program5(depth0,data) {
  
  var stack1, hashTypes, options;
  hashTypes = {};
  options = {hash:{},contexts:[depth0,depth0],types:["ID","INTEGER"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.valueAtTrustLevel),stack1 ? stack1.call(depth0, "data", 2, options) : helperMissing.call(depth0, "valueAtTrustLevel", "data", 2, options))));
  }

function program7(depth0,data) {
  
  var stack1, hashTypes, options;
  hashTypes = {};
  options = {hash:{},contexts:[depth0,depth0],types:["ID","INTEGER"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.valueAtTrustLevel),stack1 ? stack1.call(depth0, "data", 3, options) : helperMissing.call(depth0, "valueAtTrustLevel", "data", 3, options))));
  }

function program9(depth0,data) {
  
  var stack1, hashTypes, options;
  hashTypes = {};
  options = {hash:{},contexts:[depth0,depth0],types:["ID","INTEGER"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.valueAtTrustLevel),stack1 ? stack1.call(depth0, "data", 4, options) : helperMissing.call(depth0, "valueAtTrustLevel", "data", 4, options))));
  }

  data.buffer.push("<tr>\n  <td class=\"title\">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "title", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</td>\n  <td class=\"value\">");
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(1, program1, data),contexts:[depth0],types:["STRING"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "adminUsersList.newuser", options) : helperMissing.call(depth0, "linkTo", "adminUsersList.newuser", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</td>\n  <td class=\"value\">");
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(3, program3, data),contexts:[depth0],types:["STRING"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "adminUsersList.basic", options) : helperMissing.call(depth0, "linkTo", "adminUsersList.basic", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</td>\n  <td class=\"value\">");
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(5, program5, data),contexts:[depth0],types:["STRING"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "adminUsersList.regular", options) : helperMissing.call(depth0, "linkTo", "adminUsersList.regular", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</td>\n  <td class=\"value\">");
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(7, program7, data),contexts:[depth0],types:["STRING"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "adminUsersList.leaders", options) : helperMissing.call(depth0, "linkTo", "adminUsersList.leaders", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</td>\n  <td class=\"value\">");
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(9, program9, data),contexts:[depth0],types:["STRING"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "adminUsersList.elders", options) : helperMissing.call(depth0, "linkTo", "adminUsersList.elders", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</td>\n</tr>\n");
  return buffer;
  
});
Ember.TEMPLATES["admin/templates/site_content_edit"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Ember.Handlebars.helpers; data = data || {};
  var buffer = '', stack1, hashTypes, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = '', stack1, hashTypes;
  data.buffer.push("\n  <h3>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "title", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</h3>\n  <p class='description'>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "description", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</p>\n\n  ");
  hashTypes = {};
  stack1 = helpers['if'].call(depth0, "markdown", {hash:{},inverse:self.noop,fn:self.program(2, program2, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n\n  ");
  hashTypes = {};
  stack1 = helpers['if'].call(depth0, "plainText", {hash:{},inverse:self.noop,fn:self.program(4, program4, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n\n  ");
  hashTypes = {};
  stack1 = helpers['if'].call(depth0, "html", {hash:{},inverse:self.noop,fn:self.program(6, program6, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n\n  ");
  hashTypes = {};
  stack1 = helpers['if'].call(depth0, "css", {hash:{},inverse:self.noop,fn:self.program(8, program8, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n\n\n\n  <div class='controls'>\n    <button class='btn' ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "saveChanges", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(" ");
  hashTypes = {'disabled': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'disabled': ("saveDisabled")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n      ");
  hashTypes = {};
  stack1 = helpers['if'].call(depth0, "saving", {hash:{},inverse:self.program(12, program12, data),fn:self.program(10, program10, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n    </button>\n    ");
  hashTypes = {};
  stack1 = helpers['if'].call(depth0, "saved", {hash:{},inverse:self.noop,fn:self.program(14, program14, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n  </div>\n\n");
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n    ");
  hashTypes = {'value': "ID"};
  options = {hash:{
    'value': ("model.content")
  },contexts:[],types:[],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.pagedown),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "pagedown", options))));
  data.buffer.push("\n  ");
  return buffer;
  }

function program4(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n    ");
  hashTypes = {'value': "ID",'class': "STRING"};
  options = {hash:{
    'value': ("model.content"),
    'class': ("plain")
  },contexts:[],types:[],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.textarea),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "textarea", options))));
  data.buffer.push("\n  ");
  return buffer;
  }

function program6(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n    ");
  hashTypes = {'content': "ID",'mode': "STRING"};
  options = {hash:{
    'content': ("model.content"),
    'mode': ("html")
  },contexts:[],types:[],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.aceEditor),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "aceEditor", options))));
  data.buffer.push("\n  ");
  return buffer;
  }

function program8(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n    ");
  hashTypes = {'content': "ID",'mode': "STRING"};
  options = {hash:{
    'content': ("model.content"),
    'mode': ("css")
  },contexts:[],types:[],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.aceEditor),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "aceEditor", options))));
  data.buffer.push("\n  ");
  return buffer;
  }

function program10(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n        ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "saving", options) : helperMissing.call(depth0, "i18n", "saving", options))));
  data.buffer.push("\n      ");
  return buffer;
  }

function program12(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n        ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "save", options) : helperMissing.call(depth0, "i18n", "save", options))));
  data.buffer.push("\n      ");
  return buffer;
  }

function program14(depth0,data) {
  
  var stack1, hashTypes, options;
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "saved", options) : helperMissing.call(depth0, "i18n", "saved", options))));
  }

function program16(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n  <div class='spinner'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "loading", options) : helperMissing.call(depth0, "i18n", "loading", options))));
  data.buffer.push("</div>\n");
  return buffer;
  }

  hashTypes = {};
  stack1 = helpers['if'].call(depth0, "loaded", {hash:{},inverse:self.program(16, program16, data),fn:self.program(1, program1, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n");
  return buffer;
  
});
Ember.TEMPLATES["admin/templates/site_contents"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Ember.Handlebars.helpers; data = data || {};
  var buffer = '', stack1, stack2, hashTypes, options, escapeExpression=this.escapeExpression, self=this, helperMissing=helpers.helperMissing;

function program1(depth0,data) {
  
  var buffer = '', stack1, stack2, hashTypes, options;
  data.buffer.push("\n        <li>\n          ");
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(2, program2, data),contexts:[depth0,depth0],types:["STRING","ID"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "adminSiteContentEdit", "type", options) : helperMissing.call(depth0, "linkTo", "adminSiteContentEdit", "type", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n        </li>\n      ");
  return buffer;
  }
function program2(depth0,data) {
  
  var hashTypes;
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "type.title", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  }

  data.buffer.push("<div class='row'>\n  <div class='content-list span6'>\n    <h3>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.site_content.edit", options) : helperMissing.call(depth0, "i18n", "admin.site_content.edit", options))));
  data.buffer.push("</h3>\n    <ul>\n      ");
  hashTypes = {};
  stack2 = helpers.each.call(depth0, "type", "in", "content", {hash:{},inverse:self.noop,fn:self.program(1, program1, data),contexts:[depth0,depth0,depth0],types:["ID","ID","ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n    </ul>\n  </div>\n\n  <div class='content-editor'>\n    ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "outlet", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("\n  </div>\n</div>\n");
  return buffer;
  
});
Ember.TEMPLATES["admin/templates/site_contents_empty"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Ember.Handlebars.helpers; data = data || {};
  var buffer = '', stack1, hashTypes, options, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;


  data.buffer.push("<p>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.site_content.none", options) : helperMissing.call(depth0, "i18n", "admin.site_content.none", options))));
  data.buffer.push("</p>\n");
  return buffer;
  
});
Ember.TEMPLATES["admin/templates/site_settings"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Ember.Handlebars.helpers; data = data || {};
  var buffer = '', stack1, hashTypes, options, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;


  data.buffer.push("<div class='admin-controls'>\n  <div class='search controls'>\n  <label>\n    ");
  hashTypes = {'type': "STRING",'checked': "ID"};
  options = {hash:{
    'type': ("checkbox"),
    'checked': ("onlyOverridden")
  },contexts:[],types:[],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.input),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "input", options))));
  data.buffer.push("\n    ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.site_settings.show_overriden", options) : helperMissing.call(depth0, "i18n", "admin.site_settings.show_overriden", options))));
  data.buffer.push("\n  </label>\n  </div>\n  <div class='search controls'>\n    ");
  hashTypes = {'value': "ID",'placeHolderKey': "STRING"};
  options = {hash:{
    'value': ("filter"),
    'placeHolderKey': ("type_to_filter")
  },contexts:[],types:[],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.textField),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "textField", options))));
  data.buffer.push("\n  </div>\n\n</div>\n\n");
  hashTypes = {'contentBinding': "STRING",'classNames': "STRING",'itemViewClass': "STRING"};
  options = {hash:{
    'contentBinding': ("filteredContent"),
    'classNames': ("form-horizontal settings"),
    'itemViewClass': ("Discourse.SiteSettingView")
  },contexts:[],types:[],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.collection),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "collection", options))));
  data.buffer.push("\n\n<!-- will remove as soon as I figure out what is going on -->\n<p><small>Diagnostics: last_message_processed ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "diags.last_message_processed", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</small></p>\n");
  return buffer;
  
});
Ember.TEMPLATES["admin/templates/site_settings/setting_bool"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Ember.Handlebars.helpers; data = data || {};
  var buffer = '', stack1, hashTypes, escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = '', hashTypes;
  data.buffer.push("\n  <div class='span4 offset1'>\n    <h3>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.unbound.call(depth0, "setting", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</h3>\n  </div>\n  <div class=\"span11\">\n    ");
  hashTypes = {'checkedBinding': "STRING",'value': "STRING"};
  data.buffer.push(escapeExpression(helpers.view.call(depth0, "Ember.Checkbox", {hash:{
    'checkedBinding': ("enabled"),
    'value': ("true")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("\n    ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.unbound.call(depth0, "description", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("\n  </div>\n");
  return buffer;
  }

  hashTypes = {};
  stack1 = helpers['with'].call(depth0, "view.content", {hash:{},inverse:self.noop,fn:self.program(1, program1, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n");
  return buffer;
  
});
Ember.TEMPLATES["admin/templates/site_settings/setting_string"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Ember.Handlebars.helpers; data = data || {};
  var buffer = '', stack1, hashTypes, escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing, self=this;

function program1(depth0,data) {
  
  var buffer = '', stack1, stack2, hashTypes, options;
  data.buffer.push("\n  <div class='span4 offset1'>\n     <h3>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.unbound.call(depth0, "setting", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</h3>\n  </div>\n  <div class=\"span11\">\n    ");
  hashTypes = {'value': "ID",'classNames': "STRING"};
  options = {hash:{
    'value': ("value"),
    'classNames': ("input-xxlarge")
  },contexts:[],types:[],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.textField),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "textField", options))));
  data.buffer.push("\n    <div class='desc'>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.unbound.call(depth0, "description", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</div>\n  </div>\n  ");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "dirty", {hash:{},inverse:self.program(4, program4, data),fn:self.program(2, program2, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n");
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = '', hashTypes;
  data.buffer.push("\n    <div class='span3'>\n      <button class='btn ok' ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "save", "", {hash:{},contexts:[depth0,depth0],types:["ID","ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("><i class='icon-ok'></i></button>\n      <button class='btn cancel' ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "cancel", "", {hash:{},contexts:[depth0,depth0],types:["ID","ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("><i class='icon-remove'></i></button>\n    </div>\n  ");
  return buffer;
  }

function program4(depth0,data) {
  
  var buffer = '', stack1, hashTypes;
  data.buffer.push("\n    ");
  hashTypes = {};
  stack1 = helpers['if'].call(depth0, "overridden", {hash:{},inverse:self.noop,fn:self.program(5, program5, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n  ");
  return buffer;
  }
function program5(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n      <button class='btn' href='#' ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "resetDefault", "", {hash:{},contexts:[depth0,depth0],types:["ID","ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(">");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.site_settings.reset", options) : helperMissing.call(depth0, "i18n", "admin.site_settings.reset", options))));
  data.buffer.push("</button>\n    ");
  return buffer;
  }

  hashTypes = {};
  stack1 = helpers['with'].call(depth0, "view.content", {hash:{},inverse:self.noop,fn:self.program(1, program1, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n");
  return buffer;
  
});
Ember.TEMPLATES["admin/templates/user"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Ember.Handlebars.helpers; data = data || {};
  var buffer = '', stack1, stack2, hashTypes, options, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n        <i class='icon icon-user'></i>\n        ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.show_public_profile", options) : helperMissing.call(depth0, "i18n", "admin.user.show_public_profile", options))));
  data.buffer.push("\n      ");
  return buffer;
  }

function program3(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n          <button class='btn' ");
  hashTypes = {'target': "STRING"};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "impersonate", {hash:{
    'target': ("content")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n            <i class='icon icon-screenshot'></i>\n            ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.impersonate", options) : helperMissing.call(depth0, "i18n", "admin.user.impersonate", options))));
  data.buffer.push("\n          </button>\n      ");
  return buffer;
  }

function program5(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n      <button class='btn' ");
  hashTypes = {'target': "STRING"};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "refreshBrowsers", {hash:{
    'target': ("content")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n        ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.refresh_browsers", options) : helperMissing.call(depth0, "i18n", "admin.user.refresh_browsers", options))));
  data.buffer.push("\n      </button>\n      ");
  return buffer;
  }

function program7(depth0,data) {
  
  var buffer = '', stack1, stack2, hashTypes, options;
  data.buffer.push("\n        ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.approved_by", options) : helperMissing.call(depth0, "i18n", "admin.user.approved_by", options))));
  data.buffer.push("\n\n        ");
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(8, program8, data),contexts:[depth0,depth0],types:["STRING","ID"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "adminUser", "approved_by", options) : helperMissing.call(depth0, "linkTo", "adminUser", "approved_by", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n        ");
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(10, program10, data),contexts:[depth0,depth0],types:["STRING","ID"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "adminUser", "approved_by", options) : helperMissing.call(depth0, "linkTo", "adminUser", "approved_by", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n      ");
  return buffer;
  }
function program8(depth0,data) {
  
  var stack1, hashTypes, options;
  hashTypes = {'imageSize': "STRING"};
  options = {hash:{
    'imageSize': ("small")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.avatar),stack1 ? stack1.call(depth0, "approved_by", options) : helperMissing.call(depth0, "avatar", "approved_by", options))));
  }

function program10(depth0,data) {
  
  var hashTypes;
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "approved_by.username", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  }

function program12(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n        ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "no_value", options) : helperMissing.call(depth0, "i18n", "no_value", options))));
  data.buffer.push("\n      ");
  return buffer;
  }

function program14(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n        <button class='btn' ");
  hashTypes = {'target': "STRING"};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "approve", {hash:{
    'target': ("content")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n          <i class='icon icon-ok'></i>\n          ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.approve", options) : helperMissing.call(depth0, "i18n", "admin.user.approve", options))));
  data.buffer.push("\n        </button>\n      ");
  return buffer;
  }

function program16(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n        ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "yes_value", options) : helperMissing.call(depth0, "i18n", "yes_value", options))));
  data.buffer.push("\n      ");
  return buffer;
  }

function program18(depth0,data) {
  
  var buffer = '', stack1, hashTypes;
  data.buffer.push("\n        ");
  hashTypes = {};
  stack1 = helpers['if'].call(depth0, "can_deactivate", {hash:{},inverse:self.noop,fn:self.program(19, program19, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n      ");
  return buffer;
  }
function program19(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n          <button class='btn' ");
  hashTypes = {'target': "STRING"};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "deactivate", {hash:{
    'target': ("content")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(">");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.deactivate_account", options) : helperMissing.call(depth0, "i18n", "admin.user.deactivate_account", options))));
  data.buffer.push("</button>\n        ");
  return buffer;
  }

function program21(depth0,data) {
  
  var buffer = '', stack1, hashTypes;
  data.buffer.push("\n        ");
  hashTypes = {};
  stack1 = helpers['if'].call(depth0, "can_send_activation_email", {hash:{},inverse:self.noop,fn:self.program(22, program22, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n        ");
  hashTypes = {};
  stack1 = helpers['if'].call(depth0, "can_activate", {hash:{},inverse:self.noop,fn:self.program(24, program24, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n      ");
  return buffer;
  }
function program22(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n          <button class='btn' ");
  hashTypes = {'target': "STRING"};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "sendActivationEmail", {hash:{
    'target': ("content")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n            <i class='icon icon-envelope-alt'></i>\n            ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.send_activation_email", options) : helperMissing.call(depth0, "i18n", "admin.user.send_activation_email", options))));
  data.buffer.push("\n          </button>\n        ");
  return buffer;
  }

function program24(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n          <button class='btn' ");
  hashTypes = {'target': "STRING"};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "activate", {hash:{
    'target': ("content")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n            <i class='icon icon-ok'></i>\n            ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.activate", options) : helperMissing.call(depth0, "i18n", "admin.user.activate", options))));
  data.buffer.push("\n          </button>\n        ");
  return buffer;
  }

function program26(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n        <button class='btn' ");
  hashTypes = {'target': "STRING"};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "revokeAdmin", {hash:{
    'target': ("content")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n          <i class='icon icon-trophy'></i>\n          ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.revoke_admin", options) : helperMissing.call(depth0, "i18n", "admin.user.revoke_admin", options))));
  data.buffer.push("\n        </button>\n      ");
  return buffer;
  }

function program28(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n        <button class='btn' ");
  hashTypes = {'target': "STRING"};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "grantAdmin", {hash:{
    'target': ("content")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n          <i class='icon icon-trophy'></i>\n          ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.grant_admin", options) : helperMissing.call(depth0, "i18n", "admin.user.grant_admin", options))));
  data.buffer.push("\n        </button>\n      ");
  return buffer;
  }

function program30(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n        <button class='btn' ");
  hashTypes = {'target': "STRING"};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "revokeModeration", {hash:{
    'target': ("content")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n          <i class='icon icon-magic'></i>\n          ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.revoke_moderation", options) : helperMissing.call(depth0, "i18n", "admin.user.revoke_moderation", options))));
  data.buffer.push("\n        </button>\n      ");
  return buffer;
  }

function program32(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n        <button class='btn' ");
  hashTypes = {'target': "STRING"};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "grantModeration", {hash:{
    'target': ("content")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n          <i class='icon icon-magic'></i>\n          ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.grant_moderation", options) : helperMissing.call(depth0, "i18n", "admin.user.grant_moderation", options))));
  data.buffer.push("\n        </button>\n      ");
  return buffer;
  }

function program34(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n      <button class='btn btn-danger' ");
  hashTypes = {'target': "STRING"};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "unban", {hash:{
    'target': ("content")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n        <i class='icon icon-ban-circle'></i>\n        ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.unban", options) : helperMissing.call(depth0, "i18n", "admin.user.unban", options))));
  data.buffer.push("\n      </button>\n      ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "banDuration", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("\n    ");
  return buffer;
  }

function program36(depth0,data) {
  
  var buffer = '', stack1, hashTypes;
  data.buffer.push("\n      ");
  hashTypes = {};
  stack1 = helpers['if'].call(depth0, "canBan", {hash:{},inverse:self.noop,fn:self.program(37, program37, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n    ");
  return buffer;
  }
function program37(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n        <button class='btn btn-danger' ");
  hashTypes = {'target': "STRING"};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "ban", {hash:{
    'target': ("content")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n          <i class='icon icon-ban-circle'></i>\n          ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.ban", options) : helperMissing.call(depth0, "i18n", "admin.user.ban", options))));
  data.buffer.push("\n        </button>\n      ");
  return buffer;
  }

function program39(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n        <button class='btn' ");
  hashTypes = {'target': "STRING"};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "unblock", {hash:{
    'target': ("content")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n          <i class='icon icon-thumbs-up'></i>\n          ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.unblock", options) : helperMissing.call(depth0, "i18n", "admin.user.unblock", options))));
  data.buffer.push("\n        </button>\n      ");
  return buffer;
  }

function program41(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n        <button class='btn btn-danger' ");
  hashTypes = {'target': "STRING"};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "block", {hash:{
    'target': ("content")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n          <i class='icon icon-ban-circle'></i>\n          ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.block", options) : helperMissing.call(depth0, "i18n", "admin.user.block", options))));
  data.buffer.push("\n        </button>\n      ");
  return buffer;
  }

function program43(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n        <button class='btn btn-danger' ");
  hashTypes = {'target': "STRING"};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "deleteAllPosts", {hash:{
    'target': ("content")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n          <i class='icon icon-trash'></i>\n          ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.delete_all_posts", options) : helperMissing.call(depth0, "i18n", "admin.user.delete_all_posts", options))));
  data.buffer.push("\n        </button>\n      ");
  return buffer;
  }

  data.buffer.push("<section class='details'>\n\n  <div class='display-row'>\n    <div class='field'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "user.username.title", options) : helperMissing.call(depth0, "i18n", "user.username.title", options))));
  data.buffer.push("</div>\n    <div class='value'>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "username", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</div>\n    <div class='controls'>\n      ");
  hashTypes = {'class': "STRING"};
  options = {hash:{
    'class': ("btn")
  },inverse:self.noop,fn:self.program(1, program1, data),contexts:[depth0,depth0],types:["STRING","ID"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "user.activity", "content", options) : helperMissing.call(depth0, "linkTo", "user.activity", "content", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n      ");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "can_impersonate", {hash:{},inverse:self.noop,fn:self.program(3, program3, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n    </div>\n  </div>\n\n  <div class='display-row'>\n    <div class='field'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "user.email.title", options) : helperMissing.call(depth0, "i18n", "user.email.title", options))));
  data.buffer.push("</div>\n    <div class='value'><a href=\"mailto:");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.unbound.call(depth0, "email", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("\">");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "email", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</a></div>\n  </div>\n\n  <div class='display-row' style='height: 50px'>\n    <div class='field'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "user.avatar.title", options) : helperMissing.call(depth0, "i18n", "user.avatar.title", options))));
  data.buffer.push("</div>\n    <div class='value'>");
  hashTypes = {'imageSize': "STRING"};
  options = {hash:{
    'imageSize': ("large")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.avatar),stack1 ? stack1.call(depth0, "content", options) : helperMissing.call(depth0, "avatar", "content", options))));
  data.buffer.push("</div>\n  </div>\n\n  <div class='display-row' style='height: 50px'>\n    <div class='field'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "user.ip_address.title", options) : helperMissing.call(depth0, "i18n", "user.ip_address.title", options))));
  data.buffer.push("</div>\n    <div class='value'>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "ip_address", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</div>\n    <div class='controls'>\n      ");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "currentUser.admin", {hash:{},inverse:self.noop,fn:self.program(5, program5, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n    </div>\n  </div>\n\n</section>\n\n\n<section class='details'>\n  <h1>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.permissions", options) : helperMissing.call(depth0, "i18n", "admin.user.permissions", options))));
  data.buffer.push("</h1>\n\n  <div class='display-row'>\n    <div class='field'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.users.approved", options) : helperMissing.call(depth0, "i18n", "admin.users.approved", options))));
  data.buffer.push("</div>\n    <div class='value'>\n      ");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "approved", {hash:{},inverse:self.program(12, program12, data),fn:self.program(7, program7, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n\n    </div>\n    <div class='controls'>\n      ");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "can_approve", {hash:{},inverse:self.noop,fn:self.program(14, program14, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n    </div>\n  </div>\n\n  <div class='display-row'>\n    <div class='field'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.users.active", options) : helperMissing.call(depth0, "i18n", "admin.users.active", options))));
  data.buffer.push("</div>\n    <div class='value'>\n      ");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "active", {hash:{},inverse:self.program(12, program12, data),fn:self.program(16, program16, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n    </div>\n    <div class='controls'>\n      ");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "active", {hash:{},inverse:self.program(21, program21, data),fn:self.program(18, program18, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n    </div>\n  </div>\n\n  <div class='display-row'>\n    <div class='field'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.admin", options) : helperMissing.call(depth0, "i18n", "admin.user.admin", options))));
  data.buffer.push("</div>\n    <div class='value'>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "admin", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</div>\n    <div class='controls'>\n      ");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "can_revoke_admin", {hash:{},inverse:self.noop,fn:self.program(26, program26, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n      ");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "can_grant_admin", {hash:{},inverse:self.noop,fn:self.program(28, program28, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n    </div>\n\n  </div>\n  <div class='display-row'>\n    <div class='field'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.moderator", options) : helperMissing.call(depth0, "i18n", "admin.user.moderator", options))));
  data.buffer.push("</div>\n    <div class='value'>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "moderator", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</div>\n    <div class='controls'>\n      ");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "can_revoke_moderation", {hash:{},inverse:self.noop,fn:self.program(30, program30, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n      ");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "can_grant_moderation", {hash:{},inverse:self.noop,fn:self.program(32, program32, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n    </div>\n\n  </div>\n  <div class='display-row'>\n    <div class='field'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "trust_level", options) : helperMissing.call(depth0, "i18n", "trust_level", options))));
  data.buffer.push("</div>\n    <div class='value'>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "trustLevel.name", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</div>\n  </div>\n  <div class='display-row'>\n    <div class='field'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.banned", options) : helperMissing.call(depth0, "i18n", "admin.user.banned", options))));
  data.buffer.push("</div>\n    <div class='value'>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "isBanned", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</div>\n    <div class='controls'>\n    ");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "isBanned", {hash:{},inverse:self.program(36, program36, data),fn:self.program(34, program34, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n    </div>\n  </div>\n  <div class='display-row'>\n    <div class='field'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.blocked", options) : helperMissing.call(depth0, "i18n", "admin.user.blocked", options))));
  data.buffer.push("</div>\n    <div class='value'>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "blocked", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</div>\n    <div class='controls'>\n      ");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "blocked", {hash:{},inverse:self.program(41, program41, data),fn:self.program(39, program39, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n      ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.block_explanation", options) : helperMissing.call(depth0, "i18n", "admin.user.block_explanation", options))));
  data.buffer.push("\n    </div>\n  </div>\n</section>\n\n<section class='details'>\n  <h1>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.activity", options) : helperMissing.call(depth0, "i18n", "admin.user.activity", options))));
  data.buffer.push("</h1>\n\n  <div class='display-row'>\n    <div class='field'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "created", options) : helperMissing.call(depth0, "i18n", "created", options))));
  data.buffer.push("</div>\n    <div class='value'>");
  hashTypes = {'unescaped': "STRING"};
  stack2 = helpers._triageMustache.call(depth0, "created_at_age", {hash:{
    'unescaped': ("true")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</div>\n  </div>\n  <div class='display-row'>\n    <div class='field'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.users.last_emailed", options) : helperMissing.call(depth0, "i18n", "admin.users.last_emailed", options))));
  data.buffer.push("</div>\n    <div class='value'>");
  hashTypes = {'unescaped': "STRING"};
  stack2 = helpers._triageMustache.call(depth0, "last_emailed_age", {hash:{
    'unescaped': ("true")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</div>\n  </div>\n  <div class='display-row'>\n    <div class='field'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "last_seen", options) : helperMissing.call(depth0, "i18n", "last_seen", options))));
  data.buffer.push("</div>\n    <div class='value'>");
  hashTypes = {'unescaped': "STRING"};
  stack2 = helpers._triageMustache.call(depth0, "last_seen_age", {hash:{
    'unescaped': ("true")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</div>\n  </div>\n  <div class='display-row'>\n    <div class='field'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.like_count", options) : helperMissing.call(depth0, "i18n", "admin.user.like_count", options))));
  data.buffer.push("</div>\n    <div class='value'>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "like_count", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</div>\n  </div>\n  <div class='display-row'>\n    <div class='field'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.topics_entered", options) : helperMissing.call(depth0, "i18n", "admin.user.topics_entered", options))));
  data.buffer.push("</div>\n    <div class='value'>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "topics_entered", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</div>\n  </div>\n  <div class='display-row'>\n    <div class='field'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.post_count", options) : helperMissing.call(depth0, "i18n", "admin.user.post_count", options))));
  data.buffer.push("</div>\n    <div class='value'>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "post_count", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</div>\n    <div class='controls'>\n      ");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "can_delete_all_posts", {hash:{},inverse:self.noop,fn:self.program(43, program43, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n    </div>\n  </div>\n  <div class='display-row'>\n    <div class='field'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.posts_read_count", options) : helperMissing.call(depth0, "i18n", "admin.user.posts_read_count", options))));
  data.buffer.push("</div>\n    <div class='value'>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "posts_read_count", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</div>\n  </div>\n  <div class='display-row'>\n    <div class='field'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.flags_given_count", options) : helperMissing.call(depth0, "i18n", "admin.user.flags_given_count", options))));
  data.buffer.push("</div>\n    <div class='value'>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "flags_given_count", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</div>\n  </div>\n  <div class='display-row'>\n    <div class='field'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.flags_received_count", options) : helperMissing.call(depth0, "i18n", "admin.user.flags_received_count", options))));
  data.buffer.push("</div>\n    <div class='value'>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "flags_received_count", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</div>\n  </div>\n  <div class='display-row'>\n    <div class='field'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.private_topics_count", options) : helperMissing.call(depth0, "i18n", "admin.user.private_topics_count", options))));
  data.buffer.push("</div>\n    <div class='value'>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "private_topics_count", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</div>\n  </div>\n  <div class='display-row'>\n    <div class='field'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.time_read", options) : helperMissing.call(depth0, "i18n", "admin.user.time_read", options))));
  data.buffer.push("</div>\n    <div class='value'>");
  hashTypes = {'unescaped': "STRING"};
  stack2 = helpers._triageMustache.call(depth0, "time_read", {hash:{
    'unescaped': ("true")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</div>\n  </div>\n  <div class='display-row'>\n    <div class='field'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "user.invited.days_visited", options) : helperMissing.call(depth0, "i18n", "user.invited.days_visited", options))));
  data.buffer.push("</div>\n    <div class='value'>");
  hashTypes = {'unescaped': "STRING"};
  stack2 = helpers._triageMustache.call(depth0, "days_visited", {hash:{
    'unescaped': ("true")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</div>\n  </div>\n</section>\n\n<section>\n  <hr/>\n  <button class=\"btn btn-danger pull-right\" ");
  hashTypes = {'target': "STRING"};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "destroy", {hash:{
    'target': ("content")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(" ");
  hashTypes = {'disabled': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'disabled': ("deleteForbidden")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push(" ");
  hashTypes = {'title': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'title': ("deleteButtonTitle")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n    <i class=\"icon icon-trash\"></i>\n    ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.delete", options) : helperMissing.call(depth0, "i18n", "admin.user.delete", options))));
  data.buffer.push("\n  </button>\n</section>\n<div class=\"clearfix\"></div>\n");
  return buffer;
  
});
Ember.TEMPLATES["admin/templates/users_list"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Ember.Handlebars.helpers; data = data || {};
  var buffer = '', stack1, stack2, hashTypes, options, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var stack1, hashTypes, options;
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.users.active", options) : helperMissing.call(depth0, "i18n", "admin.users.active", options))));
  }

function program3(depth0,data) {
  
  var stack1, hashTypes, options;
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.users.new", options) : helperMissing.call(depth0, "i18n", "admin.users.new", options))));
  }

function program5(depth0,data) {
  
  var buffer = '', stack1, stack2, hashTypes, options;
  data.buffer.push("\n        <li>");
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(6, program6, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "adminUsersList.pending", options) : helperMissing.call(depth0, "linkTo", "adminUsersList.pending", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</li>\n      ");
  return buffer;
  }
function program6(depth0,data) {
  
  var stack1, hashTypes, options;
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.users.pending", options) : helperMissing.call(depth0, "i18n", "admin.users.pending", options))));
  }

function program8(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n  <div id='selected-controls'>\n    <button ");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "approveUsers", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push(" class='btn'>");
  hashTypes = {'countBinding': "STRING"};
  options = {hash:{
    'countBinding': ("selectedCount")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.countI18n),stack1 ? stack1.call(depth0, "admin.users.approved_selected", options) : helperMissing.call(depth0, "countI18n", "admin.users.approved_selected", options))));
  data.buffer.push("</button>\n  </div>\n");
  return buffer;
  }

function program10(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n  <div class='admin-loading'>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "loading", options) : helperMissing.call(depth0, "i18n", "loading", options))));
  data.buffer.push("</div>\n");
  return buffer;
  }

function program12(depth0,data) {
  
  var buffer = '', stack1, hashTypes;
  data.buffer.push("\n  ");
  hashTypes = {};
  stack1 = helpers['if'].call(depth0, "model.length", {hash:{},inverse:self.program(35, program35, data),fn:self.program(13, program13, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n");
  return buffer;
  }
function program13(depth0,data) {
  
  var buffer = '', stack1, stack2, hashTypes, options;
  data.buffer.push("\n    <table class='table'>\n      <tr>\n        ");
  hashTypes = {};
  stack1 = helpers['if'].call(depth0, "showApproval", {hash:{},inverse:self.noop,fn:self.program(14, program14, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n        <th>&nbsp;</th>\n        <th>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "username", options) : helperMissing.call(depth0, "i18n", "username", options))));
  data.buffer.push("</th>\n        <th>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "email", options) : helperMissing.call(depth0, "i18n", "email", options))));
  data.buffer.push("</th>\n        <th>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.users.last_emailed", options) : helperMissing.call(depth0, "i18n", "admin.users.last_emailed", options))));
  data.buffer.push("</th>\n        <th>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "last_seen", options) : helperMissing.call(depth0, "i18n", "last_seen", options))));
  data.buffer.push("</th>\n        <th>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.topics_entered", options) : helperMissing.call(depth0, "i18n", "admin.user.topics_entered", options))));
  data.buffer.push("</th>\n        <th>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.posts_read_count", options) : helperMissing.call(depth0, "i18n", "admin.user.posts_read_count", options))));
  data.buffer.push("</th>\n        <th>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.user.time_read", options) : helperMissing.call(depth0, "i18n", "admin.user.time_read", options))));
  data.buffer.push("</th>\n        <th>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "created", options) : helperMissing.call(depth0, "i18n", "created", options))));
  data.buffer.push("</th>\n        ");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "showApproval", {hash:{},inverse:self.noop,fn:self.program(16, program16, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n        <th>&nbsp;</th>\n\n      </tr>\n\n      ");
  hashTypes = {};
  stack2 = helpers.each.call(depth0, "model", {hash:{},inverse:self.noop,fn:self.program(18, program18, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n\n    </table>\n  ");
  return buffer;
  }
function program14(depth0,data) {
  
  var buffer = '', hashTypes;
  data.buffer.push("\n          <th>");
  hashTypes = {'checkedBinding': "STRING"};
  data.buffer.push(escapeExpression(helpers.view.call(depth0, "Ember.Checkbox", {hash:{
    'checkedBinding': ("selectAll")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</th>\n        ");
  return buffer;
  }

function program16(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n          <th>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.users.approved", options) : helperMissing.call(depth0, "i18n", "admin.users.approved", options))));
  data.buffer.push("</th>\n        ");
  return buffer;
  }

function program18(depth0,data) {
  
  var buffer = '', stack1, stack2, hashTypes, options;
  data.buffer.push("\n        <tr ");
  hashTypes = {'class': "STRING"};
  data.buffer.push(escapeExpression(helpers.bindAttr.call(depth0, {hash:{
    'class': ("selected")
  },contexts:[],types:[],hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n          ");
  hashTypes = {};
  stack1 = helpers['if'].call(depth0, "showApproval", {hash:{},inverse:self.noop,fn:self.program(19, program19, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n          <td>");
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(22, program22, data),contexts:[depth0,depth0],types:["STRING","ID"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "adminUser", "", options) : helperMissing.call(depth0, "linkTo", "adminUser", "", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</td>\n          <td>");
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(24, program24, data),contexts:[depth0,depth0],types:["STRING","ID"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "adminUser", "", options) : helperMissing.call(depth0, "linkTo", "adminUser", "", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</td>\n          <td>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.shorten),stack1 ? stack1.call(depth0, "email", options) : helperMissing.call(depth0, "shorten", "email", options))));
  data.buffer.push("</td>\n          <td>");
  hashTypes = {};
  stack2 = helpers.unbound.call(depth0, "last_emailed_age", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</td>\n          <td>");
  hashTypes = {};
  stack2 = helpers.unbound.call(depth0, "last_seen_age", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</td>\n          <td>");
  hashTypes = {};
  stack2 = helpers.unbound.call(depth0, "topics_entered", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</td>\n          <td>");
  hashTypes = {};
  stack2 = helpers.unbound.call(depth0, "posts_read_count", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</td>\n          <td>");
  hashTypes = {};
  stack2 = helpers.unbound.call(depth0, "time_read", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</td>\n\n          <td>");
  hashTypes = {};
  stack2 = helpers.unbound.call(depth0, "created_at_age", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</td>\n\n          ");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "showApproval", {hash:{},inverse:self.noop,fn:self.program(26, program26, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n          <td>\n            ");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "admin", {hash:{},inverse:self.noop,fn:self.program(31, program31, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n            ");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "moderator", {hash:{},inverse:self.noop,fn:self.program(33, program33, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n          <td>\n        </tr>\n      ");
  return buffer;
  }
function program19(depth0,data) {
  
  var buffer = '', stack1, hashTypes;
  data.buffer.push("\n            <td>\n              ");
  hashTypes = {};
  stack1 = helpers['if'].call(depth0, "can_approve", {hash:{},inverse:self.noop,fn:self.program(20, program20, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n            </td>\n          ");
  return buffer;
  }
function program20(depth0,data) {
  
  var buffer = '', hashTypes;
  data.buffer.push("\n                ");
  hashTypes = {'checkedBinding': "STRING"};
  data.buffer.push(escapeExpression(helpers.view.call(depth0, "Ember.Checkbox", {hash:{
    'checkedBinding': ("selected")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("\n              ");
  return buffer;
  }

function program22(depth0,data) {
  
  var stack1, hashTypes, options;
  hashTypes = {'imageSize': "STRING"};
  options = {hash:{
    'imageSize': ("small")
  },contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.avatar),stack1 ? stack1.call(depth0, "", options) : helperMissing.call(depth0, "avatar", "", options))));
  }

function program24(depth0,data) {
  
  var hashTypes;
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers.unbound.call(depth0, "username", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  }

function program26(depth0,data) {
  
  var buffer = '', stack1, hashTypes;
  data.buffer.push("\n          <td>\n            ");
  hashTypes = {};
  stack1 = helpers['if'].call(depth0, "approved", {hash:{},inverse:self.program(29, program29, data),fn:self.program(27, program27, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n          </td>\n          ");
  return buffer;
  }
function program27(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n              ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "yes_value", options) : helperMissing.call(depth0, "i18n", "yes_value", options))));
  data.buffer.push("\n            ");
  return buffer;
  }

function program29(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n              ");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "no_value", options) : helperMissing.call(depth0, "i18n", "no_value", options))));
  data.buffer.push("\n            ");
  return buffer;
  }

function program31(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("<i class=\"icon-trophy\" title=\"");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.title", options) : helperMissing.call(depth0, "i18n", "admin.title", options))));
  data.buffer.push("\"></i>");
  return buffer;
  }

function program33(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("<i class=\"icon-magic\" title=\"");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "admin.moderator", options) : helperMissing.call(depth0, "i18n", "admin.moderator", options))));
  data.buffer.push("\"></i>");
  return buffer;
  }

function program35(depth0,data) {
  
  var buffer = '', stack1, hashTypes, options;
  data.buffer.push("\n    <p>");
  hashTypes = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.i18n),stack1 ? stack1.call(depth0, "search.no_results", options) : helperMissing.call(depth0, "i18n", "search.no_results", options))));
  data.buffer.push("</p>\n  ");
  return buffer;
  }

  data.buffer.push("<div class='admin-controls'>\n  <div class='span15'>\n    <ul class=\"nav nav-pills\">\n      <li>");
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(1, program1, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "adminUsersList.active", options) : helperMissing.call(depth0, "linkTo", "adminUsersList.active", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</li>\n      <li>");
  hashTypes = {};
  options = {hash:{},inverse:self.noop,fn:self.program(3, program3, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers.linkTo),stack1 ? stack1.call(depth0, "adminUsersList.new", options) : helperMissing.call(depth0, "linkTo", "adminUsersList.new", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("</li>\n      ");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "Discourse.SiteSettings.must_approve_users", {hash:{},inverse:self.noop,fn:self.program(5, program5, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n    </ul>\n  </div>\n  <div class='span5 username controls'>\n    ");
  hashTypes = {'value': "ID",'placeholderKey': "STRING"};
  options = {hash:{
    'value': ("username"),
    'placeholderKey': ("username")
  },contexts:[],types:[],hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.textField),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "textField", options))));
  data.buffer.push("\n  </div>\n</div>\n\n");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "hasSelection", {hash:{},inverse:self.noop,fn:self.program(8, program8, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n\n<h2>");
  hashTypes = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "title", {hash:{},contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data})));
  data.buffer.push("</h2>\n<br/>\n\n");
  hashTypes = {};
  stack2 = helpers['if'].call(depth0, "loading", {hash:{},inverse:self.program(12, program12, data),fn:self.program(10, program10, data),contexts:[depth0],types:["ID"],hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n");
  return buffer;
  
});
(function () {

var $ = window.jQuery;

/*global ace:true */

/**
  A view that wraps the ACE editor (http://ace.ajax.org/)

  @class AceEditorView
  @extends Discourse.View
  @namespace Discourse
  @module Discourse
**/

Discourse.AceEditorView = Discourse.View.extend({
  mode: 'css',
  classNames: ['ace-wrapper'],

  contentChanged: (function() {
    if (this.editor && !this.skipContentChangeEvent) {
      return this.editor.getSession().setValue(this.get('content'));
    }
  }).observes('content'),

  render: function(buffer) {
    buffer.push("<div class='ace'>");
    if (this.get('content')) {
      buffer.push(Handlebars.Utils.escapeExpression(this.get('content')));
    }
    return buffer.push("</div>");
  },

  willDestroyElement: function() {
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }
  },

  didInsertElement: function() {

    var aceEditorView = this;

    var initAce = function() {
      aceEditorView.editor = ace.edit(aceEditorView.$('.ace')[0]);
      aceEditorView.editor.setTheme("ace/theme/chrome");
      aceEditorView.editor.setShowPrintMargin(false);
      aceEditorView.editor.getSession().setMode("ace/mode/" + (aceEditorView.get('mode')));
      aceEditorView.editor.on("change", function(e) {
        aceEditorView.skipContentChangeEvent = true;
        aceEditorView.set('content', aceEditorView.editor.getSession().getValue());
        aceEditorView.skipContentChangeEvent = false;
      });
    };

    if (window.ace) {
      initAce();
    } else {
      $LAB.script('http://d1n0x3qji82z53.cloudfront.net/src-min-noconflict/ace.js').wait(initAce);
    }
  }
});


Discourse.View.registerHelper('aceEditor', Discourse.AceEditorView);


})(this);(function () {

var $ = window.jQuery;

Discourse.AdminApiView = Discourse.View.extend({
  templateName: 'admin/templates/api'
});


})(this);(function () {

var $ = window.jQuery;

/*global Mousetrap:true */

/**
  A view to handle site customizations

  @class AdminCustomizeView
  @extends Discourse.View
  @namespace Discourse
  @module Discourse
**/

Discourse.AdminCustomizeView = Discourse.View.extend({
  templateName: 'admin/templates/customize',
  classNames: ['customize'],

  init: function() {
    this._super();
    this.set('selected', 'stylesheet');
  },

  headerActive: (function() {
    return this.get('selected') === 'header';
  }).property('selected'),

  stylesheetActive: (function() {
    return this.get('selected') === 'stylesheet';
  }).property('selected'),

  selectHeader: function() {
    this.set('selected', 'header');
  },

  selectStylesheet: function() {
    this.set('selected', 'stylesheet');
  },

  didInsertElement: function() {
    var _this = this;
    return Mousetrap.bindGlobal(['meta+s', 'ctrl+s'], function() {
      _this.get('controller').save();
      return false;
    });
  },

  willDestroyElement: function() {
    return Mousetrap.unbindGlobal('meta+s', 'ctrl+s');
  }

});


})(this);(function () {

var $ = window.jQuery;

/**
  The default view in the admin section

  @class AdminDashboardView
  @extends Discourse.View
  @namespace Discourse
  @module Discourse
**/

Discourse.AdminDashboardView = Discourse.View.extend({
  templateName: 'admin/templates/dashboard'
});




})(this);(function () {

var $ = window.jQuery;

Discourse.AdminReportCountsView = Discourse.View.extend({
  templateName: 'admin/templates/reports/summed_counts_report',
  tagName: 'tbody'
});


})(this);(function () {

var $ = window.jQuery;

/**
  A view to display a site setting with edit controls

  @class SiteSettingView
  @extends Discourse.View
  @namespace Discourse
  @module Discourse
**/

Discourse.SiteSettingView = Discourse.View.extend({
  classNameBindings: [':row', ':setting', 'content.overridden'],

  templateName: function() {

    // If we're editing a boolean, return a different template
    if (this.get('content.type') === 'bool') return 'admin/templates/site_settings/setting_bool'

    // Default to string editor
    return 'admin/templates/site_settings/setting_string';

  }.property('content.type')

});


})(this);(function () {

var $ = window.jQuery;



})(this);