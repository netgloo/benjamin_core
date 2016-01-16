<?php

/*
|-------------------------------------------------------------------------------
| Api Routes
|-------------------------------------------------------------------------------
*/

// Route::get('/api/pages', 'Api\PagesController@getAll');
// Route::get('/api/emails/sendContactMail', 'Api\EmailsController@sendContactMail');

/*
|-------------------------------------------------------------------------------
| Web Routes
|-------------------------------------------------------------------------------
*/

Route::get('/{path}', 'WebController@showPage')->where('path', '.*');
