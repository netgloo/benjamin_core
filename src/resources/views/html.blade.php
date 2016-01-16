<?php
if (!isset($bodyClass) || empty($bodyClass)) {
  $bodyClass = '';
}
if (!isset($head) || empty($head)) {
  $head = 'layouts.head';
}
?>
<!DOCTYPE html>
<html>
  <head>
    @if (view()->exists($head))
      @include($head)
    @endif
    <title>@yield('title')</title>
  </head>
  <body class="{{ $bodyClass }}" >
    @yield('body')
  </body>
</html>
