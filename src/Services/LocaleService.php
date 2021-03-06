<?php 

namespace Netgloo\BenjaminCore\Services;

use App;
use Lang;

use App\Exceptions\PathNotFoundException;


class LocaleService
{

  /**
   * Return the default 'lang' value.
   * 
   * @return (String)
   */
  public static function getDefaultLang()
  {
    return App::getLocale();
  }


  /**
   * Return the active 'lang' value.
   * 
   * @return (String)
   */
  public static function getActiveLang()
  {
    return Lang::getLocale();
  }


  /**
   * Return the list of available languages.
   * 
   * @return (Array)
   */
  public static function getAvailableLangs()
  {
    return self::getLangs();
  }


  /**
   * Return true if the multi-language support is enabled.
   * 
   * It is enabled when more than one language is available il the list of
   * supported languages.
   * 
   * @return (Boolean)
   */
  public static function isMultilangEnabled()
  {
    return (count(self::getAvailableLangs()) > 1);
  }


  /**
   * Parse the given url's path and extract these values:
   *   - lang:     the language key
   *   - langDir:  the language sub-directory name
   *   - pagePath: the page's path (an absolute path)
   * 
   * For example, if 'es' is the default language and 'en' is between available 
   * languages:
   *  
   *     $pathInfo = LocaleService::parsePath('/en/page1');
   *     $pathInfo->lang;      // 'en'
   *     $pathInfo->langDir;   // 'en'
   *     $pathInfo->pagePath;  // '/page1'
   * 
   *     $pathInfo = LocaleService::parsePath('/page1');
   *     $pathInfo->lang;      // 'es'
   *     $pathInfo->langDir;   // ''
   *     $pathInfo->pagePath;  // '/page1'
   *     
   *     // Since 'es' is the default language then the sub-directory for the 
   *     // language 'es' is the root '/' and 'es/' is treated as a normal path 
   *     // directory:
   *     $pathInfo = LocaleService::parsePath('/es/page1');
   *     $pathInfo->lang;      // 'es'
   *     $pathInfo->langDir;   // ''
   *     $pathInfo->pagePath;  // '/es/page1'
   * 
   * Available languages are taken from the directory `resources/lang`. The 
   * default language is taken from the APP_LOCALE configuration.
   *
   * If the multi-language support is disabled and we always return the default 
   * language in the `lang` property, an empty string '' as language directory
   * and the untouched path in the `pagePath` property.
   * 
   * @param $urlPath (String)
   * @return (Object)
   */
  public static function parsePath($urlPath)
  {
    $path = $urlPath;

    // If the url's path doesn't have the starting slash '/' we add it
    if (substr($urlPath, 0, 1) !== '/') {
      $path = '/' . $urlPath;
    }

    // Get default language
    $defaultLang = self::getDefaultLang();

    // Init result object
    $pathInfo = new \stdClass();
    $pathInfo->lang = $defaultLang;
    $pathInfo->langDir = '';
    $pathInfo->pagePath = $path;

    // Get the list of available languages
    $availableLangs = self::getAvailableLangs();

    // The multi-language support is not enabled
    if (!self::isMultilangEnabled()) {
      return $pathInfo;
    }

    // The path is just the root
    if ($path === '/') {
      return $pathInfo;
    }

    // Remove the default language from the available list
    if (($index = array_search($defaultLang, $availableLangs)) !== false) {
      unset($availableLangs[$index]);
    }

    // Check if there is a language sub-dir inside the path 
    // Note: $path always start with '/', it never has a trailing slash and
    // we have exluded the root case ('/') before
    $explodedPath = explode('/', $path);
    $isLangDir = in_array($explodedPath[1], $availableLangs);

    // If there is a language sub-dir then return the name
    if ($isLangDir) {
      $pathInfo->lang = $explodedPath[1];
      $pathInfo->langDir = $explodedPath[1];
      if (count($explodedPath) <= 2) {
        $pathInfo->pagePath = '/';
      }
      else {
        unset($explodedPath[1]);
        $pathInfo->pagePath = implode('/', $explodedPath);
      }
    }

    return $pathInfo;
  }


  /**
   * Change the current active language.
   * 
   * @return (String)
   */
  public static function setLang($langKey)
  {
    // Note: the Lang facade sets the active locale preserving the value
    // returned from App::getLocale(). We need to preserve this value inside 
    // the application since such value will be used to determine the default
    // lang key and to compute urls (with or without the lang subdirectory).
    // More here: http://goo.gl/yxHSYu
    Lang::setLocale($langKey);
    return;
  }


  // --------------------------------------------------------------------------
  // PRIVATES 
  // --------------------------------------------------------------------------

  /**
   * Store the list of available languages. Use the method `getLangs` to 
   * load/get this list.
   */
  private static $langs = null;


  /**
   * Return the list of available languages. Available languages are taken 
   * from the directory `resources/lang`.
   * 
   * @return (Array)
   */
  private static function getLangs() 
  {
    if (self::$langs === null) {

      // Load available languages from `resources/lang`.
      self::$langs = [];
      $langPath = base_path() . '/resources/lang/';
      if (!is_dir($langPath)) {
        error_log("The directory /resources/lang/' doesn't exists.");
        throw new PathNotFoundException();
      }
      $iter = new \FilesystemIterator($langPath);
      foreach ($iter as $fileInfo) {
        if ($fileInfo->isDir()) {
          self::$langs[] = $fileInfo->getFilename();
        }
      } // foreach

    } // if

    return self::$langs;
  }


} // class
