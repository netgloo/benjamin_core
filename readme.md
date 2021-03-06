## Benjamin Core

<!-- [![Latest Version on Packagist][ico-version]][link-packagist] -->
<!-- [![Software License][ico-license]](license.md) -->
<!-- [![Build Status][ico-travis]][link-travis] -->
<!-- [![Coverage Status][ico-scrutinizer]][link-scrutinizer] -->
<!-- [![Quality Score][ico-code-quality]][link-code-quality] -->
<!-- [![Total Downloads][ico-downloads]][link-downloads] -->

**Note:** This is the core code for Benjamin platform. If you need to install Benjamin go [here](http://github.com/netgloo/benjamin) instead.

### Install In Laravel

Add the package via Composer:

``` bash
$ composer require netgloo/benjamin_core
```

Add the service provider to Laravel, in `config/app.php`:

``` php
  'providers' => [
    
    //

    Netgloo\BenjaminCore\BenjaminCoreServiceProvider::class,

  ]
```

Add publish scripts on `post-install-cmd` and `post-update-cmd` events on project's root `composer.json`, to enable auto publishing of public assets:

``` javascript
  "scripts": {
    "post-install-cmd": [
      //
      "php artisan vendor:publish --tag=public --force"
    ],
    "post-update-cmd": [
      //
      "php artisan vendor:publish --tag=public --force"
    ],
  }
```

<!--
### Usage

``` php
$skeleton = new League\Skeleton();
echo $skeleton->echoPhrase('Hello, League!');
```
-->

### Change Log

Please see [changelog](changelog.md) for more information what has changed recently.

<!--
## Testing

``` bash
$ composer test
```
-->

### Contributing

Please see [contributing](contributing.md) and [conduct](conduct.md) for details.

### Security

If you discover any security related issues, please email info@netgloo.com instead of using the issue tracker.

<!--
## Credits

- [Netgloo][link-author]

- [All Contributors][link-contributors]
-->

### License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.

[ico-version]: https://img.shields.io/packagist/v/netgloo/benjamin_core.svg?style=flat-square
[ico-license]: https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square
[ico-travis]: https://img.shields.io/travis/netgloo/benjamin_core/master.svg?style=flat-square
[ico-scrutinizer]: https://img.shields.io/scrutinizer/coverage/g/netgloo/benjamin_core.svg?style=flat-square
[ico-code-quality]: https://img.shields.io/scrutinizer/g/netgloo/benjamin_core.svg?style=flat-square
[ico-downloads]: https://img.shields.io/packagist/dt/netgloo/benjamin_core.svg?style=flat-square

[link-packagist]: https://packagist.org/packages/netgloo/benjamin_core
[link-travis]: https://travis-ci.org/netgloo/benjamin_core
[link-scrutinizer]: https://scrutinizer-ci.com/g/netgloo/benjamin_core/code-structure
[link-code-quality]: https://scrutinizer-ci.com/g/netgloo/benjamin_core
[link-downloads]: https://packagist.org/packages/netgloo/benjamin_core
[link-author]: https://github.com/netgloo
[link-contributors]: ../../contributors
