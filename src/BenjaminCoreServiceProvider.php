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
    // Require routes
    if (!$this->app->routesAreCached()) {
      $this->app->router->group(
        ['namespace' => 'Netgloo\BenjaminCore\Http\Controllers'], 
        function() {
          require __DIR__ . '/Http/routes.php';
        }
      );
    }

    // Require views
    $this->loadViewsFrom(
      realpath(__DIR__ . '/resources/views'), 
      'benjamin'
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
        __DIR__ . '/public' => public_path(''),
      ], 
      'public'
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
    // Register BenjaminCore
    // $this->app->bind('BenjaminCore', function($app) {
    //   return new BenjaminCore($app);
    // });
    
    // Register config file
    // config([
    //   'config/benjamin_core.php',
    // ]);

    return;
  }


  /**
   * Indicates if loading of the provider is deferred.
   *
   * @var bool
   */
  protected $defer = false;

}
