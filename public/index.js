/**
* SETUP
**/
var app = app || {};

/**
* MODELS
**/
app.Users = Backbone.Model.extend({
  url: function() {
    return 'http://localhost:3000/1/user';
  },
  defaults: {
    errors: [],
    errfor: {},
    users: []
  }
});

app.UserInfo = Backbone.Model.extend({
  url: function() {
    return '/1/user/' + this.attributes.id;
  },
  id: '',
  defaults: {
    errors: [],
    errfor: {},
    user: {}
  }
});

app.Post = Backbone.Model.extend({
  url: function() {
    return 'http://localhost:3000/1/post';
  },
  defaults: {
    errors: [],
    errfor: {},
    
    uid: '',
    title: '',
    content: ''
  }
});

app.UserPost = Backbone.Model.extend({
  url: function() {
    return 'http://localhost:3000/1/post/' + this.attributes.uid;
  },
  defaults: {
    errors: [],
    errfor: {},
    
    uid: '',
    posts: []
  }
});

app.UserCollection = Backbone.Collection.extend({
  model: app.UserInfo
});

/**
* VIEWS
**/
app.ListView = Backbone.View.extend({
  el: '#userList',
  template: _.template( $('#tmpl-user-list').html() ),
  events: {
    'click #btn-filter': 'click'
  },
  initialize: function() {
    var self = this;

    this.model = new app.Users();
    this.collections = new app.UserCollection();

    this.listenTo(this.model, 'sync', this.render);
    this.listenTo(this.model, 'change', this.render);
    this.model.fetch({
      success: function() {
        var users = self.model.get('users');

        users.sort(function (a, b) {
          if (a.Age > b.Age) return 1;
          else if (a.Age < b.Age) return -1;
          return 0;
        });
      }
    });
  },
  render: function() {
    this.$el.html(this.template( this.model.attributes ));

    this.$el.find('[data-tag=user]').each(function () {
      var me = $(this);
      var age = '' + me.data('age');

      me.addClass('age-' + age.slice(0, 1) + '0');
    });
  },
  click: function(e) {
    var me = $(e.target);
    var filter = me.data('filter');

    this.$el.find('[data-tag=user]').each(function () {
      $(this).addClass('hide');
    });

    this.$el.find('.' + filter).each(function () {
      $(this).removeClass('hide');
    });
  },
  listUser: function(e) {
    var id = $(e.target).data('user-id'); 
    var model = app.listView.collections.get(id);

    if (model) return app.userView.model.set('user', model.get('user'));

    model = new app.UserInfo();
    model.set('id', id);
    model.fetch({
      success: function() {
        app.userView.model.set('user', model.get('user'));
        app.listView.collections.push(model);
      }
    });
  }
});

app.UserPostView = Backbone.View.extend({
  el: '#userPost',
  template: _.template( $('#tmpl-user-posts').html() ),
  initialize: function(id) {
    this.model = new app.UserPost();

    this.listenTo(this.model, 'sync', this.render);
    this.listenTo(this.model, 'change', this.render);
  },  
  render: function() {
    this.$el.html(this.template( this.model.attributes ));
  }
});

app.UserView = Backbone.View.extend({
  template: _.template( $('#tmpl-user-info').html() ),
  events: {
    'click .btn-edit': 'edit',
    'click .btn-save': 'save',
    'click .btn-post-submit': 'savePost'
  },
  initialize: function(id) {
    this.$el = $('<div id=' + id + '></div>');
    this.model = new app.UserInfo();
    this.modelPost = new app.Post();

    this.listenTo(this.model, 'sync', this.render);
    this.listenTo(this.model, 'change', this.render);

    this.listenTo(this.modelPost, 'sync', this.renderPost);
    this.listenTo(this.modelPost, 'change', this.renderPost);

    this.model.set('id', id);
    this.model.fetch();
  },
  deinitialize: function() {
    this.$el = {};
    delete this.model;
  },
  render: function() {
    this.$el.html(this.template( this.model.attributes ));
    return this;
  },
  renderPost: function() {
    // 合併二個 model
    var model = this.model.attributes;
    _.extend(model, this.modelPost.attributes)

    this.$el.html(this.template( model ));
    return this;
  },  
  edit: function(e) {
    this.$el.find('.non-editable').addClass('hide');
    this.$el.find('.editable').removeClass('hide');
  },
  save: function() {
    this.model.save({
      id: this.$el.find('[name=id]').val(),
      user: {
        Name: this.$el.find('[name=name]').val(),
        Email: this.$el.find('[name=email]').val(),
        Address: this.$el.find('[name=address]').val()
      }
    });
  },
  savePost: function(e) {
    e.preventDefault();
    this.modelPost.save({
      uid: this.$el.find('[name=id]').val(),
      title: this.$el.find('[name=title]').val(),
      content: this.$el.find('[name=content]').val()
    });
  }  
});

app.UserViewPanel = Backbone.View.extend({
  el: '#userInfo',
  views: [],
  initialize: function() {
    this.userPostView = new app.UserPostView();
  },
  invalidate: function() {
    console.log('views: ', this.views);

    if (Object.keys(this.views).length > 3) {
      // prepare to remove subviews
      for (i= 0, count = Object.keys(this.views).length - 3; i < count; i++) {
        this.views[i].view.deinitialize();
      }

      this.views = this.views.slice(-3);
      console.log('invalidate views');
      console.log('views: ', this.views);
    }
  },
  renderChild: function(id) { 
    var childView = {};

    for (i = 0; i < this.views.length; i++) {
      if (this.views[i].id === id) {
        childView = this.views[i];
        break;
      }
    };   

    // make all children hidden
    this.$el.children().addClass('hide');

    if (!Object.keys(childView).length) {
      // create a new child view and mount to current element
      childView = new app.UserView(id);
      this.views.push({
        id: id,
        view: childView
      });

      this.$el.append( childView.render().$el );

      this.userPostView.model.set('uid', id);
      this.userPostView.model.fetch();
    } else {
      this.$el.find('#' + id).removeClass('hide');
    }

    this.invalidate();    
  }
});

/*
 * ROUTES
 */
app.UserRoutes = Backbone.Router.extend({
  routes: {
      ":id": "queryByUserId"
  },

  queryByUserId: function(id) {
    app.userViewPanel.renderChild(id);
  }
});

/**
* BOOTUP
**/
$(document).ready(function() {
  app.listView = new app.ListView();
  app.userViewPanel = new app.UserViewPanel();

  app.userRoutes = new app.UserRoutes();
  Backbone.history.start();
});