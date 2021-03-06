/*!
 * Copyright 2016, Netgloo
 * Released under the MIT License
 */

(function() {

var Benjamin = {

  // --------------------------------------------------------------------------
  // PUBLICS
  // --------------------------------------------------------------------------

  /**
   * Set up the Benjamin object.
   */
  init: function(settings) {

    // Main configurations: run these only once
    if (!this._isConfigured) {

      this._isConfigured = true;

      // Set up popState listener
      this._initPopState();

      // Set up the first history state
      if (!this._useStandardNavigation()) {
        var currentUrl = window.location.href;
        var currentTitle = document.title;
        history.replaceState({ 'url': currentUrl }, currentTitle, currentUrl);
      }

      // Start load pages (async)
      var self = this;
      this._loadPages(function() {

        // Set the current page: we compute this after _loadPages since it 
        // loads the current langDir also
        self._currentPage = self._getPagePath(window.location.pathname);

        // When pages are loded and the DOM is ready
        $(document).ready(function() {

          // Bind links inside the body
          self._bindLinks();

          // Calls to ready callbacks
          self._ready();
          self._readyPage(self._currentPage);

        }.bind(self));

      }); // this._loadPages

    } // if (!this._isConfigured)

    return;
  },


  /**
   * Navigate to a page by path (e.g. "/" or "/page1").
   */
  navigateTo: function(pagePath) {
    return this._navigateToUrl(pagePath);
  },


  /**
   * Bind a callback to an event.
   * 
   * Usage:
   *   on(Object)          --> Bind global events. 
   *   on(String, Object)  --> Bind per-page events.
   */
  on: function(first, second) {

    // If the first parameter is a string --> Bind per-page events (the 
    // object containing the events is in the second parameter).
    if (this._isString(first)) {
      this.onPage(first, second);
      return;
    }

    // If the first parameter is an array --> Bind per-page events on each 
    // string in the array (the object containing the events is in the second
    // parameter).
    if (this._isArray(first)) {
      for (var i = 0; i < first.length; i++) {
        if (this._isString(first[i])) {
          this.onPage(first[i], second);
        }
      } // for
      return;
    } // if

    // The first parameter is an object --> Get events
    for (var property in first) {

      if (!first.hasOwnProperty(property)) {
        continue;
      }

      if (typeof first[property] !== 'function') {
        this._log(
          "Warning: the callback for " + property + " is not a function"
        );
        return;
      }

      switch (property) {
        case 'init':
          // We run the init callback just now (binding this to window)
          first[property].call(window);
          break;
        case 'ready':
          this._ready = first[property];
          break;
        case 'out':
          this._out = first[property];
          break;
        case 'in':
          this._in = first[property];
          break;
        default:
          this._log("Warning: invalid callback name: " + property);
          break;
      }

    } // for property

    return;
  },


  /**
   * Bind a callback on a page's event. The same as "on(String, Object)"
   *
   * @param pagePath (String)
   * @param callbacks (Object)
   */
  onPage: function(pagePath, callbacks) {

    // Check pagePath
    if (pagePath.length === 0 || pagePath.charAt(0) !== '/') {
      this._log("Warning: invalid page name: " + pagePath);
      return;
    }

    // Get callbacks
    for (var property in callbacks) {

      if (!callbacks.hasOwnProperty(property)) {
        continue;
      }

      var validName = 
        property === 'ready' || 
        property === 'out' ||
        property === 'in';
        
      if (!validName) {
        this._log("Warning: invalid callback name: " + property);
        return;
      }

      if (typeof callbacks[property] !== 'function') {
        this._log(
          "Warning: the callback for " + property + " is not a function"
        );
        return;
      }

      if (this._pagesCallbacks[pagePath] === undefined) {
        this._pagesCallbacks[pagePath] = { };
      }
      this._pagesCallbacks[pagePath][property] = callbacks[property];

    } // for property

    return;
  },


  // --------------------------------------------------------------------------
  // PRIVATES
  // --------------------------------------------------------------------------

  /**
   * The current page.
   */
  _currentPage: '',


  /**
   * True if Benjamin's is already configured. Used to handle multiple calls
   * to Benjamin.config.
   */
  _isConfigured: false,


  /**
   * Current language directory. Loaded when loading pages.
   */
  _langDir: '',


  /**
   * Store the timestamp of the last transition.
   * A transition is a chain of operations that will changes the current page.
   * It starts when there is the intent to change the page's content and it 
   * ends when the page is ready. In practice is composed by the sequence of
   * these callbacks: out -> in -> ready.
   * This transition's timestamp is used to stop the execution of a transition
   * if a newer one is started.
   */
  _lastTransition: 0,


  // /**
  //  * Jquery selector used to bind links.
  //  */
  // _linkSelector: 'a[href]',


  /**
   * Pages.
   */
  _pages: { },


  /**
   * The api url used to retriving all the pages.
   */
  _pagesApiUrl: '/api/pages',


  /**
   * Pages settings.
   */
  _pagesCallbacks: { },


  /**
   * True when all the pages are loaded from the server.
   */
  _pagesLoaded: false,


  /**
   * True if we fail to load pages from server.
   */
  _pagesLoadedError: false,


  /**
   * Local link regular expression.
   */
  _reInternalUrl: new RegExp(location.host),


  /**
   * Callback after the page is changed. Executed on all pages.
   *
   * Note: this callback is NOT executed when the page is loaded server side 
   * (and neither if History.pushState is not supported).
   */
  _in: function(next) {
    // this._log('Default ready callback');
    return next();
  },


  /**
   * Callback after the page is changed. Executed only for the current page.
   *
   * Note: this callback is NOT executed when the page is loaded server side 
   * (and neither if History.pushState is not supported).
   */
  _inPage: function(path, next) {
    if (this._pagesCallbacks[path] !== undefined) {
      if (this._pagesCallbacks[path]['in'] !== undefined) {
        return this._pagesCallbacks[path]['in'](next);
      }
    }
    // Callback not found
    return next();
  },


  /**
   * Return true if the variable is an Array
   */
  _isArray: function(elem) {
    return $.isArray(elem);
  },


  /**
   * Return true if the variable is a String
   */
  _isString: function(elem) {
    return typeof elem === 'string' || elem instanceof String;
  },


  /**
   * Bind links inside 'body' (skipping external links).
   */
  _bindLinks: function(event) {
    var links = [];

    // Select links filtering out external links
    var self = this;
    $("a[href]").not("[data-bj-ignore]").each(function () {
      var link = this;
      if (self._isInternalUrl(link.href)) {
        links.push($(link));
      }
    });

    // Bind click event on each (local) link
    for (var i = 0; i < links.length; ++i) {
      links[i].bind('click', this._linkClickHandler.bind(this));
    }

    return;
  },


   /**
    * Create a transition timestamp and set it to _lastTransition.
    *
    * @return (int)
    */
  _createTransitionTimestamp: function() {
    this._lastTransition = Date.now();
    return this._lastTransition;
  },


  /**
   * Return true if the given timestamp tt is older than the _lastTransition.
   *
   * @param tt (int)
   * @return (Boolean)
   */
  _isTransitionOld: function(tt) {
    return this._lastTransition > tt;
  },


  /**
   * Return the hash part of a link object as a string with the '#' initial
   * character.
   * If the hash is empty will be returned only the string '#', for example:
   *   - /example.com#hash  ==> '#fragment'
   *   - /example.com       ==> ''
   *   - /example.com#      ==> '#'
   *
   * @param link (Object)
   * @return (String)
   */
  _getLinkHash: function(link) {
    if (link.hash !== '') {
      return link.hash;
    }
    if (link.href.slice(-1) === '#') {
      return '#';
    }
    return '';
  },


  /**
   * Return the page path string:
   *   - Add a slash at the start if there isn't (this is needed for an IE fix).
   *   - Removing any trailing slash if it is not the root directory
   *   - Removing the language directory from the path (_langDir)
   *
   * @param path (String)
   * @return (String)
   */
  _getPagePath: function(path) {

    var pagePath = path;

    // if (pagePath.length === 0) {
    //   // Return the current path
    //   // TODO
    // }

    // Add a slash at the start if there isn't
    if (pagePath.length === 0 || pagePath.charAt(0) !== '/') {
      pagePath = '/' + pagePath;
    }

    // Remove any trailing slash
    pagePath = this._removeTrailingSlash(pagePath);

    // Remove the language dir
    if (this._langDir.length !== 0) {
      var langPath = '/' + this._langDir;
      if (pagePath === langPath) {
        pagePath = '/';
      }
      else if (pagePath.indexOf(langPath + '/') === 0) {
        pagePath = pagePath.replace(langPath, '');
      }
    }

    return pagePath;
  },


  /**
   * Navigate to a page url. The page url is taken from the given link object, 
   * from the link.href property, and **must be an internal url**.
   *
   * If "pop" is false (default value) will be added the url in the history 
   * with pushState and out/in/ready callbacks will be executed.
   * If "pop" is true it means navigation is inside the history, so only the
   * ready callback is executed (like was a new load page) and pushState is
   * not used.
   *
   * @param link (Object)
   * @param pop (Boolean) Default = false.
   */
  _navigateToLink: function(link, pop) {
  
    if (typeof pop === 'undefined') {
      pop = false;
    }

    // Remove any trailing slash from the link's path
    var normLink = document.createElement('a');
    normLink.href = link.href;
    normLink.pathname = this._removeTrailingSlash(normLink.pathname);

    // Get link's parts
    var linkUrl = normLink.href;
    var linkPath = normLink.pathname;
    var linkHash = this._getLinkHash(normLink);

    // If the link's path is the current path AND there is an hash in the url
    // than do not change page.
    var currentPath = window.location.pathname;
    if (linkPath === currentPath && linkHash !== '') {
      location.hash = linkHash;
      return;
    }

    // Get the page's path (stripping out the langDir)
    var pagePath = this._getPagePath(linkPath);

    // Get the page with the given path
    var page = null;
    for (var i = 0; i < this._pages.length; i++) {
      if (this._pages[i].path === pagePath) {
        page = this._pages[i];
        break;
      }
    }

    // Page not found
    if (page === null) {
      this._log('Error: page not found: ' + pagePath);
      return;
    }

    // Get page's title
    var newTitle = page.title;

    // Get page's body
    var newBody = page.body;
    var newBodyClass = page.bodyClass;

    // The following code will be executed in this order:
    //   1. out callback ==> this._out
    //   2. pageOutNext
    //   3. inNext: here we effectively change the page
    //   4. inPageNext
    //   5. readyNexy: here the page is changed and we call ready callbacks

    // 5. Here the page is ready (already changed)
    function readyNext(tt) {
      if (this._isTransitionOld(tt)) {
        return;
      }

      this._ready();
      this._readyPage(pagePath);

      return;
    }

    // 4. Executed next to "in" callback
    function inPageNext(tt) {
      if (this._isTransitionOld(tt)) {
        return;
      }
      this._inPage(pagePath, readyNext.bind(this, tt));
      return;
    }

    // 3. Executed next to "outPage callback" ==> change the page
    function inNext(tt) {
      if (this._isTransitionOld(tt)) {
        return;
      }

      // Replace page (title and content)
      this._replacePage(pagePath, newTitle, newBody, newBodyClass);

      // Push state
      history.pushState({ 'url': linkPath }, page.title, linkPath);

      // If there was an hash in the url jump to it
      if (linkHash !== '') {
        // TODO: this also push another state in the browser history while
        // only one history state should be pushed
        location.hash = linkHash;
      }

      // In callback
      this._in(inPageNext.bind(this, tt));

      return;
    }

    // 2. Executed next to "out callback"
    function outPageNext(tt) {
      // If this transition is older than the last one (this._lastTransition) 
      // we can stop the execution here.
      if (this._isTransitionOld(tt)) {
        return;
      }

      this._outPage(this._currentPage, inNext.bind(this, tt));
      return;
    }

    // If the navigation is a "pop" => replace the page and go directly to
    // ready callbacks, without out/insert callbacks and neither pushState.
    if (pop) {
      this._replacePage(pagePath, newTitle, newBody, newBodyClass);
      readyNext.bind(this)();
      return;
    }

    // Get the transition's timestamp. A transition for changing page starts 
    // here and will finish at point 5, when the ready callback is 
    // executed.
    var tt = this._createTransitionTimestamp();

    // 1. Out callback: the current page is going to be changed
    this._out(outPageNext.bind(this, tt));

    return;
  },


   /**
    * See _navigateToLink(link, pop)
    *
    * @param url (String)
    * @param pop (Boolean)
    */
  _navigateToUrl: function(url, pop) {
    // Create a link object
    var link = document.createElement("a");
    link.href = url;
    return this._navigateToLink(link, pop);
  },


  /**
   * Callback when the current page is going to be changed. Executed on all 
   * pages.
   *
   * Note: this callback is NOT executed when the page is loaded server side 
   * (and neither if History.pushState is not supported).
   */
  _out: function(next) {
    // this._log('Default out callback');
    return next();
  },


 /**
   * Callback when the page is going to be changed. Executed only for the 
   * current page.
   *
   * Note: this callback is NOT executed when the page is loaded server side 
   * (and neither if History.pushState is not supported).
   */
  _outPage: function(path, next) {
    if (this._pagesCallbacks[path] !== undefined) {
      if (this._pagesCallbacks[path]['out'] !== undefined) {
        return this._pagesCallbacks[path]['out'](next);
      }
    }
    // Callback not found
    return next();
  },


  /**
   * Bind the 'popstate' event (back/forward browser history).
   */
  _initPopState: function() {
    
    // Using standard navigation?
    if (this._useStandardNavigation()) {
      return;
    }

    var self = this;
    window.addEventListener('popstate', function(event) {
      // event.state is equal to the data-attribute of pushState
      if (event.state == null) {
        return;
      }
      // if (!self._isInternalUrl(event.state.url)) {
      //   return;
      // }
      self._navigateToUrl(event.state.url, true);
      return;
    });

    return;
  },


  /**
   * Return true if the given url is an external url (compared with 
   * location.host)
   *
   * @param url (String)
   */
  _isInternalUrl: function(url) {
    return this._reInternalUrl.test(url);
  },


  /**
   * Event handler for click on link.
   */
  _linkClickHandler: function(event) {

    // Standard navigation ==> Default link action
    if (this._useStandardNavigation()) {
      return;
    }

    event.preventDefault();
    this._navigateToLink(event.currentTarget);

    return;
  },


  /**
   * Send an ajax GET call to the url in the variable '_pagesApiUrl' and store
   * the result inside the '_pages' variable.
   *
   * When the pages are succesfully loaded the variable '_isPagesLoaded' will
   * be setted to true.
   *
   * If the ajax call will fail, the variable '_pagesLoadedError' will be 
   * setted to true.
   *
   * @param completeCallback (Function) This function will be called when
   *   the ajax call completes.
   */
  _loadPages: function(completeCallback) {
    var self = this;
    $.ajax({
      url: self._pagesApiUrl,
      data: { path: window.location.pathname },
      dataType: 'json',
      success: function(data) {
        self._langDir = data.langDir;
        self._pages = data.pages;
      },
      error: function() {
        self._log('Failed loading pages from ' + self._pagesApiUrl);
        self._pagesLoadedError = true;
      },
      complete: completeCallback,
    });
    return;
  },


  /**
   * Log a text message with console.log
   */
  _log: function(message) {
    console.log('Benjamin: ' + message);
  },

  /**
   * Callback when the page is ready. Executed on all pages.
   *
   * Note: this is executed when the page is loaded server side also.
   */
  _ready: function() {
    // this._log('Default ready callback');
    return;
  },


  /**
   * Callback when the page is ready. Executed only for the current page.
   *
   * Note: this is executed when the page is loaded server side also.
   */
  _readyPage: function(path) {
    if (this._pagesCallbacks[path] !== undefined) {
      if (this._pagesCallbacks[path]['ready'] !== undefined) {
        return this._pagesCallbacks[path]['ready']();
      }
    }
    return;
  },


  /**
   * Replace page title, body and the body's class.
   * Then re-bind all links inside the body and set the current page inside
   * this._currentPage.
   *
   * @param pagePath (String)
   * @param title (String)
   * @param body (String) HTML content
   * @param bodyClass (String)
   */
  _replacePage: function(pagePath, title, body, bodyClass) {

    // Replace page's title
    document.title = title;

    // Replace the body and the body's class
    $body = $('body');
    $body.empty();
    $body.attr('class', bodyClass);
    $body.html(body);

    // (Re-)Bind links
    this._bindLinks();

    // Set current page
    this._currentPage = pagePath;

    return;
  },


  /**
   * Remove trailing slashes from the given path.
   *
   * @param path (String)
   * @return (String)
   */
  _removeTrailingSlash: function(path) {
    if (path.length > 1 && path.slice(-1) === '/') {
      return path.replace(/\/+$/, '');
    }
    return path;
  },


  /**
   * This function is used to check if should be used the "standard" navigation
   * behaviour (i.e. reload the page from the server) or the Benjamin's 
   * behaviour.
   *
   * Returns true if history.pushState is not supported OR the variable
   * '_pagesLoadedError' is true.
   *
   * @return (Boolean)
   */
  _useStandardNavigation: function() {
    return (!history.pushState || this._pagesLoadedError);
  }


}; // var Benjamin

// Initialize the Benjamin object
Benjamin.init();

// Exports Benjamin as global name
window.Benjamin = Benjamin;

})();
