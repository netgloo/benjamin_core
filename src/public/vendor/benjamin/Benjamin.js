/*!
 * Copyright 2015, Netgloo
 * Released under the MIT License
 */

var Benjamin = {

  // ---------------------------------------------------------------------------
  // PUBLICS
  // ---------------------------------------------------------------------------

  /**
   * Set up the Benjamin object
   */
  config: function(settings) {

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
      this._loadPages();

      // When the DOM is ready...
      $(document).ready(function () {

        // Bind links inside the body
        this._bindLinks();

        // Calls to ready callbacks
        var currentPath = this._getPagePath(window.location.pathname);
        this._ready();
        this._readyPage(currentPath);

      }.bind(this));

    } // if (!this._isConfigured)

    // Register global callbacks
    if (typeof settings['before'] === 'function') {
      this._before = settings['before'];
    }
    if (typeof settings['after'] === 'function') {
      this._after = settings['after'];
    }
    if (typeof settings['ready'] === 'function') {
      this._ready = settings['ready'];
    }

    // Register pages' callbacks
    for (var property in settings) {

      if (!settings.hasOwnProperty(property)) {
        continue;
      }
      if (property.charAt(0) !== '/') {
        continue;
      }
      this._pagesConf[property] = settings[property];

    } // for

    return;
  },


  /**
   * Navigate to a page by path (e.g. "/" or "/page1").
   */
  navigateTo: function(pagePath) {
    return this._navigateToUrl(pagePath);
  },


  // ---------------------------------------------------------------------------
  // PRIVATES
  // ---------------------------------------------------------------------------

  /**
   * True if Benjamin's is already configured. Used to handle multiple calls
   * to Benjamin.config.
   */
  _isConfigured: false,


  /**
   * Current language directory. Loaded when loading pages.
   */
  _langDir: '',


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
  _pagesConf: { },


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
  _after: function(next) {
    // console.log('Default ready callback');
    return next();
  },


  /**
   * Callback after the page is changed. Executed only for the current page.
   *
   * Note: this callback is NOT executed when the page is loaded server side 
   * (and neither if History.pushState is not supported).
   */
  _afterPage: function(path, next) {
    if (this._pagesConf[path] != null) {
      if (typeof this._pagesConf[path]['after'] === 'function') {
        return this._pagesConf[path]['after'](next);
      }
    }
    // Callback not found
    return next();
  },


  /**
   * Callback before change the page. Executed on all pages.
   *
   * Note: this callback is NOT executed when the page is loaded server side 
   * (and neither if History.pushState is not supported).
   */
  _before: function(next) {
    // console.log('Default ready callback');
    return next();
  },


  /**
   * Callback before the page is changed. Executed only for the current page.
   *
   * Note: this callback is NOT executed when the page is loaded server side 
   * (and neither if History.pushState is not supported).
   */
  _beforePage: function(path, next) {
    if (this._pagesConf[path] != null) {
      if (typeof this._pagesConf[path]['before'] === 'function') {
        return this._pagesConf[path]['before'](next);
      }
    }
    // Callback not found
    return next();
  },


  /**
   * Bind links inside 'body' (skipping external links).
   */
  _bindLinks: function(event) {
    var links = [];

    // Select links filtering out external links
    var self = this;
    $("a[href]").not("[data-bj-ignore='true']").each(function () {
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


  // /**
  //  * Decode HTML
  //  */
  // _decodeHtml: function(html) {
  //   var txt = document.createElement("textarea");
  //   txt.innerHTML = html;
  //   return txt.value;
  // },


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
   * with pushState and before/after/ready callbacks will be executed.
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
    // than don't change page.
    var currentPath = window.location.pathname;
    if (linkPath === currentPath && linkHash !== '') {
      // this._jumpToAnchor(linkHash);
      // if (!back) {
      //   history.pushState({ 'url': linkUrl }, title, linkUrl);
      // }
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
      console.log('Error: page not found: ' + pagePath);
      return;
    }

    // Get page's title
    var newTitle = page.title;

    // Get page's body
    var newBody = page.body;
    // newBody = this._decodeHtml(newBody);
    var newBodyClass = page.bodyClass;

    // The following code will be executed in this order:
    //   1. Before callback (this._before)
    //   2. nextBefore
    //   3. nextBeforePage: here we effectively change the page
    //   4. nextAfter
    //   5. nextAfterPage: here the page is changed and we call the callback

    // 5. Here the page is changed
    function nextAfterPage() {

      // // If there was an hash in the url jump to it
      // if (linkHash !== '') {
      //   this._jumpToAnchor(linkHash);
      // }

      this._ready();
      this._readyPage(pagePath);

      return;
    }

    // 4. Executed next to "after callback"
    function nextAfter() {
      this._afterPage(pagePath, nextAfterPage.bind(this));
    }

    // 3. Executed next to "beforePage callback" ==> change the page
    function nextBeforePage() {

      // Push state
      history.pushState({ 'url': linkUrl }, page.title, linkUrl);

      // Replace page (title and content)
      this._replacePage(newTitle, newBody, newBodyClass);

      // After callback
      this._after(nextAfter.bind(this));
    }

    // 2. Executed next to "before callback"
    function nextBefore() {
      this._beforePage(pagePath, nextBeforePage.bind(this));
    }

    // If the navigation is a "pop" => replace the page and go directly to
    // ready callbacks (nextAfterPage), without before/after callbacks and 
    // neither pushState
    if (pop) {
      this._replacePage(newTitle, newBody, newBodyClass);
      nextAfterPage.bind(this)();
      return;
    }

    // 1. Before callbacks: here we start changing the page
    this._before(nextBefore.bind(this));

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


  // /**
  //  * Jump the browser view to the given anchor name (starting with #).
  //  *
  //  * @param name (String)
  //  */
  // _jumpToAnchor: function(name) {
  //   // TODO
  //   return;
  // },


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
   */
  _loadPages: function() {
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
        console.log('Failed loading pages from ' + self._pagesApiUrl);
        self._pagesLoadedError = true;
      }
    });
    return;
  },


  /**
   * Callback when the page is ready. Executed on all pages.
   *
   * Note: this is executed when the page is loaded server side also.
   */
  _ready: function() {
    // console.log('Default ready callback');
    return;
  },


  /**
   * Callback when the page is ready. Executed only for the current page.
   *
   * Note: this is executed when the page is loaded server side also.
   */
  _readyPage: function(path) {
    if (this._pagesConf[path] != null) {
      if (typeof this._pagesConf[path]['ready'] === 'function') {
        this._pagesConf[path]['ready']();
      }
    }
    return;
  },


  /**
   * Replace page title, body and the body's class.
   * Then re-bind all links inside the body.
   *
   * @param title (String)
   * @param body (String) HTML content
   * @param bodyClass (String)
   */
  _replacePage: function(title, body, bodyClass) {

    // Replace page's title
    document.title = title;

    // Replace the body and the body's class
    $body = $('body');
    $body.empty();
    $body.attr('class', bodyClass);
    $body.html(body);

    // (Re-)Bind links
    this._bindLinks();

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
  },


};