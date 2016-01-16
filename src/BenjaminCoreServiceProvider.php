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
    // // Require routes
    // if (!$this->app->routesAreCached()) {
    //   require __DIR__ . '/../../routes.php';
    // }

    // Require routes
    $this->setupRoutes($this->app->router);

    // Require views
    $this->loadViewsFrom(
      realpath(__DIR__ . '/resources/views'), 
      'benjamin_core'
    );
    

    // Use this if your package needs a config file
    // $this->publishes([
    //         __DIR__.'/config/config.php' => config_path('benjamin_core.php'),
    // ]);
    
    // Use the vendor configuration file as fallback
    // $this->mergeConfigFrom(
    //     __DIR__.'/config/config.php', 'benjamin_core'
    // );

    // Publish assets
    $this->publishes([
        __DIR__ . '/public' => public_path('vendor/benjamin'),
      ], 
      'public'
    );

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
