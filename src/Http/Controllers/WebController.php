<?php

namespace Netgloo\BenjaminCore\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;

use Netgloo\BenjaminCore\Exceptions\PathNotFoundException;
use Netgloo\BenjaminCore\Services\LocaleService;
use Netgloo\BenjaminCore\Services\LocaleLinkService;


class WebController extends BaseController
{

  /**
   * Show the selected page
   *
   * @param $pagePath (String)
   * @return Response
   */
  public function showPage(Request $request, $path = '')
  {
    // Redirect trailing slash
    $uri = $request->getRequestUri();
    // if (preg_match('/(.+)\/$/', $request->getRequestUri()) !== 0)
    if (strlen($uri) > 1 && substr($uri, -1) === '/') {
      return redirect(rtrim($request->path(), '/'), 301);
    }

    // Parse the request path
    $pathInfo = LocaleService::parsePath($path);
    $pagePath = $pathInfo->pagePath;

    // Set the active language
    LocaleService::setLang($pathInfo->lang);

    // 'index' is a reserved name
    if ($pagePath === '/index') {
      error_log("index is a reserved name.");
      abort(404);
    }

    // Get the views' directory
    $viewsPath = base_path() . '/resources/views/';
    if (!is_dir($viewsPath)) {
      error_log("The directory /resources/views/ doesn't exists.");
      throw new PathNotFoundException();
    }

    // Compute the view name to be showed
    $showView = '';
    if ($pagePath === '/') {
      $showView = 'index';
    }
    else {
      $showView = ltrim(str_replace('/', '.', $pagePath), '.');
    }

    // If the view doesn't exists return a 404 Not Found
    if (!view()->exists($showView)) {
      abort(404, "View not found: $showView");
    }

    // Initialize the LocaleLinkService used inside views to set links
    LocaleLinkService::setLang($pathInfo->lang);
    LocaleLinkService::setLangDir($pathInfo->langDir);
    LocaleLinkService::setPagePath($pathInfo->pagePath);

    // Return the requested view
    return view($showView, [
      'benjamin' => 'benjamin::html',
      'activeLang' => LocaleService::getActiveLang(),
    ]);
  }


} // class
