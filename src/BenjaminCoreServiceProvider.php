<?php

namespace Netgloo\BenjaminCore;

use Illuminate\Support\ServiceProvider;
use Illuminate\Routing\Router;

class BenjaminCoreServiceProvider extends ServiceProvider
{

  /**
   * Perform post-registration booting of services.
   *
   * @return void
   */
  public function boot()
  {
    // use this if your package has views
    $this->loadViewsFrom(
      realpath(__DIR__ . '/resources/views'), 
      'benjamin_core'
    );
    
    // use this if your package has routes
    $this->setupRoutes($this->app->router);
    
    // use this if your package needs a config file
    // $this->publishes([
    //         __DIR__.'/config/config.php' => config_path('skeleton.php'),
    // ]);
    
    // use the vendor configuration file as fallback
    // $this->mergeConfigFrom(
    //     __DIR__.'/config/config.php', 'skeleton'
    // );
    return;
  }


  /**
   * Define the routes for the application.
   *
   * @param  \Illuminate\Routing\Router  $router
   * @return void
   */
  public function setupRoutes(Router $router)
  {
    $router->group(
      ['namespace' => 'Netgloo\BenjaminCore\Http\Controllers'], 
      function($router) 
      {
        require __DIR__ . '/Http/routes.php';
      }
    );
    return;
  }


  /**
   * Register any package services.
   *
   * @return void
   */
  public function register()
  {
    $this->registerSkeleton();
    
    // use this if your package has a config file
    // config([
    //         'config/benjamin_core.php',
    // ]);
    return;
  }


  /**
   * Indicates if loading of the provider is deferred.
   *
   * @var bool
   */
  protected $defer = false;


  /**
   * Register BenjaminCore
   */
  private function registerSkeleton()
  {
    $this->app->bind('benjamin_core',function($app){
      return new BenjaminCore($app);
    });
    return;
  }

}
