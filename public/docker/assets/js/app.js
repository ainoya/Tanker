$(function(){
  Handlebars.TemplateLoader.config({prefix: "/docker/assets/hbs/"});
  Handlebars.TemplateLoader.load([
	"images",
	"breadcrumb",
	"repository",
	"image",
	"app",
    "tag-app",
    "tags",
    "tag",
  ], { complete: boot });
  Handlebars.registerHelper("formatDate", function(datetime, format) {
    return moment(datetime).format(format);
  });
});

/**
 * Boot 
 */
function boot() {

  // Models --------------------------------------------------------

  var Tag = Backbone.Model.extend({});
  var Image = Backbone.Model.extend({});
 
  // Collections ---------------------------------------------------
  
  /**
   * Image Collection
   */
  var Images = Backbone.Collection.extend({
  	model: Image,
	initialize: function(options) {
		this.imageId = options.imageId;
	},
	url : function(){
		return "/docker/api/images?id=" + this.imageId; 
	}
  });

  /**
   * Tag Collection
   */
  var Tags = Backbone.Collection.extend({
    model: Tag,
	initialize : function(options) {
		this.name = options.repositoryName
	},
    url: function() {
		return "/docker/api/repository?id=" + this.name 
	},
  });

  // Views --------------------------------------------------------

  /**
   * @class BaseView
   */
  var BaseView = Backbone.View.extend({
    load: function(model) {
      var dfd = $.Deferred();
      this.listenToOnce(model, 'sync', function () {
        dfd.resolve(model);
      }, this);
      setTimeout(function() {
        model.fetch();
      });
      return dfd.promise();
    },
    assign: function(view, selector) {
      selector = selector || view.el;
      view.setElement(this.$(selector)).render();
    },
    unassign: function(view) {
      if (!view) return;
      view.$el.text('');
    },
	navigate: function(url,name,replace) {
		//not modify breadcrumb
		if (replace ) {
			app.breadcrumb.replace(name);
		}
		app.breadcrumb.push(name);
		app.navigate(url,true);
	}
  });

  /**
   * Application View
   */
  var AppView = BaseView.extend({
	 el: '#app',
	 initialize: function() {
	 },
	 renderDefault: function() {
        var tmpl = Handlebars.TemplateLoader.get("app");
 	    this.$el.html(tmpl());
	    var view = new RepositoryView();
		this.assign(view);
	 },
	
  });

  /** 
   * Bread crumb
   */
  var BreadcrumbView = BaseView.extend( {
		el: '#breadcrumb',
		initialize:function() {
	  		this.options = { cols:[{title:"Home",url:"/docker/index.html"}] , newOne: ""};
		},
	  	replace:function(title){
			Backbone.history.fragment = '';	
			this.options.cols.pop();
			this.push(title);
		},
	  	push:function(title){
			this.options.newOne = {title:title ,url:""};
		},
		render:function() {
			var tmpl = Handlebars.TemplateLoader.get("breadcrumb");
			if (this.options.newOne != null ) {
				this.options.cols.push(this.options.newOne);
  				this.$el.html(tmpl(this.options));
				this.options.newOne = null;
			//for browser history back
			}else {
				this.options.cols.pop();
				this.$el.html(tmpl(this.options));
			}	
			return this;
		},
  });

  /**
   * Image 
   */
  var ImageView = BaseView.extend({
		events : {
			"click .image_link" : "onImageClick"
		},
	  	 initialize: function (options) {
        	this.options = _.defaults(options || {}, this.options);
        	this.render();
    	},
    	render: function() {
        	var tmpl = Handlebars.TemplateLoader.get("image");
        	var data = _.defaults({}, this.options, this.model.attributes);
        	this.$el.html(tmpl(data));
			return this;
		},
	  	onImageClick: function(e){
			var val = e.target.innerHTML;	
	      	this.navigate("docker/view/images/" + val,val.substring(0,5)+"...");	  	
			return false;
		}
  });

  /**
   *  Images
   */ 
  var ImagesView = BaseView.extend({
		el: '#view',
    	initialize: function (options) {
			var me = this;
			this.load(new Images(options)).then(function(){
				me.setImages.apply(me,arguments)
				me.render();
			});
	    },
	    setImages: function(collection) {
    	    var me = this;
    	    var images = collection.models;
    	    this.imageViewList = _.map(images, function (elm) {
		         return new ImageView({model: elm});
    		}, this);
   		 },
    	render: function() {
			var tmpl = Handlebars.TemplateLoader.get("images");
        	this.$el.html(tmpl());
        	_.each(this.imageViewList, function(child) {
				this.$("#image_data").append(child.render().el);
			});
		},
  });

  /**
   * Repository 
   */
  var RepositoryView = BaseView.extend({
		el: '#view',
		events: {
			"click #search" : "search",
			'keydown #repo': 'logKey'	
		},
		logKey: function() {
			ws.send($("#repo").val());			
		},
		search: function() {
			var name = $("#repo").val();
			this.navigate("docker/view/tags/" + name,name,true);
		},
	    initialize: function() {
			this.render();
		},
		render: function() {
        	var tmpl = Handlebars.TemplateLoader.get("repository");
 	        this.$el.html(tmpl());
		},
		show : function(repoName) {
			this.render();
			$("#repo").val(repoName);
			var view = new TagsView({repositoryName : repoName});
			this.assign(view);
		},
   });

  /**
   * TagView
   */
  var TagView = BaseView.extend({
    tagName: "tr",
    events: {
		"click" : "onClick",
	  	"click .delete_button" : "onDeleteClick"
	},
    initialize: function (options) {
		this.options = _.defaults(options || {}, this.options);
        this.render();
    },
    render: function() {
        var tmpl = Handlebars.TemplateLoader.get("tag");
        var data = _.defaults({}, this.options, this.model.attributes);
        this.$el.html(tmpl(data));
        return this;
    },
    onClick: function(ev) {
        ev.preventDefault();
		var imageId = this.model.attributes.imageId;
		var tag = this.model.attributes.id;
		this.navigate("docker/view/images/" + tag + "/" + imageId,tag);
	},
	/**
	 * Delete Button
	 */
	onDeleteClick: function(ev) {
		ev.stopPropagation();
		ev.preventDefault();
		var me = this;
		//Dialog
		bootbox.confirm("Are you sure?", function(result) {
			if (result) {
				me.model.urlRoot = "/docker/api/repository?repo=" + me.options.repositoryName + "&tag=";
				me.model.destroy({
					wait : true ,
					success: function() {
						//search again only. not push bread crumb
						new RepositoryView().show(me.options.repositoryName);
					}		 
				});
			}	
		});
    }
  });

  /**
   * Tags View
   */
  var TagsView = BaseView.extend({
	el: '#tags',
    initialize: function (options) {
		var me = this;
		me.options = options;
		this.load(new Tags(options)).then(function(){
				me.setTags.apply(me,arguments,options)
				me.render();
		});
    },
    setTags: function(collection) {
        var me = this;
        var tags = collection.models;
		this.tagViewList = _.map(tags, function (elm) {
	         var view = new TagView({model: elm, repositoryName: me.options.repositoryName});
			 return view;
        }, this);
    },
    render: function() {
		var tmpl = Handlebars.TemplateLoader.get("tags");
        this.$el.html(tmpl());
        _.each(this.tagViewList, function(child) {
			this.$("table tbody").append(child.render().el);
        }, this);
        
    },
  });

  /**
   * Application
   */ 
  var Application = Backbone.Router.extend({
    routes: {
      "docker/view/index": "app",
	  "docker/view/tags/:repoName" :"tags",
	  "docker/view/tags/:namespace/:repoName" : "tags_with_namespace",
	  "docker/view/images/:tag/:imageId" : "images",
	  "docker/view/images/:imageId" : "imageOnly"
	},
    initialize: function() {
    },
    app: function() {
	  this.appView = new AppView();
	  this.appView.renderDefault();
	  this.breadcrumb = new BreadcrumbView().render();
	},
	tags: function(repoName) {
		new RepositoryView().show(repoName);	
		this.breadcrumb.render();
	},
	tags_with_namespace : function(namespace,repoName) {
		this.tags(namespace + "/" + repoName);
	}, 
	images: function(tag,imageId) {
		var options = {imageId : imageId};
    	new ImagesView(options);
		this.breadcrumb.render();
	},
	imageOnly :function(imageId) {
		var options = {imageId : imageId};
		new ImagesView(options);
		this.breadcrumb.render();
	},
  });
	
  // Main ---------------------------------------------------------
  var app = new Application();
  Backbone.history.start({ pushState: true});
  app.app(); 

  //websocket client 
  var ws = new WebSocket("ws://" + window.location.host + "/ws");
  ws.onmessage = function(event ){
	var data = JSON.parse(event.data);
	var html = "";
	_.each(data.results,function(e) {
		var name = e.name;
		html += '<option value="' + name + '"/>';
	});
	$('#repository').html(html);
  }
}
