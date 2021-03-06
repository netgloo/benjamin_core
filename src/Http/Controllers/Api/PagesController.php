<?php

namespace Netgloo\BenjaminCore\Http\Controllers\Api;

use Cache;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;

use Netgloo\BenjaminCore\Exceptions\PathNotFoundException;
use Netgloo\BenjaminCore\Services\LocaleService;
use Netgloo\BenjaminCore\Services\LocaleLinkService;


class PagesController extends BaseController
{

  /**
   * Return a JSON object containing the content of all the pages.
   * 
   * The returned object will have this structure:
   * 
   *     {
   *       langDir: 'en',
   *       pages: [{
   *           path: '/',
   *           title: 'Home',
   *           body: '<div> ... </div>'
   *           bodyClass: 'some-class'
   *         }, {
   *           path: '/...',
   *           title: '...',
   *           body: '...'
   *           bodyClass: '...'
   *         },
   *         ...
   *       ]
   *     }
   *
   * @return JSON
   */
  public function getAll(Request $request)
  {
    // Get the views' directory
    $viewsPath = base_path() . '/resources/views/';
    if (!is_dir($viewsPath)) {
      error_log("The directory /resources/views/ doesn't exists.");
      throw new PathNotFoundException();
    }

    // Get the lang' directory
    $langPath = base_path() . '/resources/lang/';
    if (!is_dir($langPath)) {
      error_log("The directory /resources/lang/ doesn't exists.");
      throw new PathNotFoundException();
    }

    // Get the language directory from the current url
    $path = $request->input('path');
    $pathInfo = LocaleService::parsePath($path);

    // Set the active language
    LocaleService::setLang($pathInfo->lang);

    // Init the response object
    $resp = new \stdClass();
    $resp->langDir = $pathInfo->langDir;
    $resp->pages = null;

    // Get last modification time on views or lang's messages
    $pagesLastMod = max(
      self::getLastMod($viewsPath), 
      self::getLastMod($langPath)
    );

    // Init current cache keys (language-dependent)
    $pagesKey = "pages.{$pathInfo->lang}";
    $pagesTimestampKey = "pages.{$pathInfo->lang}.timestamp";

    // Check if the cache is enabled
    $cacheEnabled = false;
    if (env('CACHE_DRIVER') !== null) {
      $cacheEnabled = true;
    }

    // If the cache is valid return the cached value
    if ($cacheEnabled) {
      $pagesLastCache = Cache::get($pagesTimestampKey);
      if ($pagesLastCache !== null && $pagesLastCache >= $pagesLastMod) {
        $resp->pages = Cache::get($pagesKey);
        return response()->json($resp);
      }
    }

    // Get the list of views
    $viewsList = self::getViewsList($viewsPath);

    // Initialize the LocaleLinkService used inside views to set links
    LocaleLinkService::setLang($pathInfo->lang);
    LocaleLinkService::setLangDir($pathInfo->langDir);

    // Fill the $pages array, containing all the pages' content
    $pages = [];
    foreach ($viewsList as $viewName) {
      $page = new \stdClass();

      // Page path
      $page->path = ($viewName === 'index') ? '' : $viewName;
      $page->path = '/' . str_replace('.', '/', $page->path);

      // Set the page's path inside the LocaleLinkService
      LocaleLinkService::setPagePath($page->path);

      // Page title
      $page->title = view(
        $viewName, 
        [
          'benjamin' => 'benjamin::title',
          'activeLang' => LocaleService::getActiveLang(),
        ]
      )->render();

      // Page body
      $page->body = view(
        $viewName, 
        [
          'benjamin' => 'benjamin::body',
          'activeLang' => LocaleService::getActiveLang(),
        ]
      )->render();

      // bodyClass
      $page->bodyClass = view(
        $viewName, 
        [
          'benjamin' => 'benjamin::bodyClass',
          'activeLang' => LocaleService::getActiveLang(),
        ]
      )->render();

      $pages[] = $page;
    }

    // Cache the value
    if ($cacheEnabled) {
      Cache::forever($pagesKey, $pages);
      Cache::forever($pagesTimestampKey, time());
    }

    // Response
    $resp->pages = $pages;

    return response()->json($resp);
  }


  // --------------------------------------------------------------------------
  // PRIVATES
  // --------------------------------------------------------------------------

   /**
   * Returns the last modification time for all files and directories inside 
   * the given directory.
   * 
   * @param $dirPath (String)
   * @param $cacheTime (String)
   * @return (int) The unix timestamp for the last modification
   */
  private function getLastMod($dirPath)
  {
    $dirInfo = new \SplFileInfo($dirPath);
    $lastMod = $dirInfo->getMTime();

    // Check files and subdirectories
    $iter = new \FilesystemIterator($dirPath);
    foreach ($iter as $fileInfo) {

      if ($fileInfo->isDir()) {
        $mtime = self::getLastMod($fileInfo->getPathname());
      }
      else {
        $mtime = $fileInfo->getMTime();
      }

      if ($mtime > $lastMod) {
        $lastMod = $mtime;
      }
    }

    return $lastMod;
  }


   /**
   * Return a list of all available views in the given directory.
   * 
   * These files will be skipped:
   *   - Each file or directory starting with '_'
   *   - Directory /errors
   *   - Directory /layouts
   *   - Directory /templates
   *   - Directory /vendor
   *   - Files not ending with '.blade.php'
   * 
   * @param $dirPath (String)
   * @param $checkSubDir (Boolean) Default true. If false, all subdirectories
   *   inside the current directory ($dirPath) will be skipped.
   * @return Array
   */
  private function getViewsList($dirPath, $checkSubDir = true)
  {
    $viewsList = [];
    $iter = new \FilesystemIterator($dirPath);
    foreach ($iter as $fileInfo) {
      $filename = $fileInfo->getFilename();

      if ($filename[0] === '_') {
        continue;
      }

      // Directories
      if ($fileInfo->isDir()) {
        if (!$checkSubDir) {
          continue;
        }
        if ($filename === 'errors' || $filename === 'layouts' || 
            $filename === 'templates' || $filename === 'vendor') {
          continue;
        }
        // $subViews = self::getViewsList($fileInfo->getPathname(), false);
        $subViews = self::getViewsList($fileInfo->getPathname());

        // Prepend directory name and add the view name to current list
        foreach ($subViews as $subViewName) {
          $viewsList[] = $filename . '.' . $subViewName;
        }

        continue;
      }

      // Files
      if (substr($filename, -10) !== '.blade.php') {
        continue;
      }
      $viewName = substr($filename, 0, -10);
      $viewsList[] = $viewName;
    }

    return $viewsList;
  }


} // class
