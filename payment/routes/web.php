<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ProjectController;
/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

Route::get('/', function () {
    return view('welcome');
});


Route::get('payment', [PaymentController::class, 'makePayment'])->name('make_payment');
Route::get('/complete_payment', [PaymentController::class, 'paymentComplete'])->name('payment_complete');
Route::get('/cancelCallback', [PaymentController::class, 'cancelCallback'])->name('cancelCallback');
Route::get('/errorCallback', [PaymentController::class, 'errorCallback'])->name('errorCallback');
Route::get('/successCallback', [PaymentController::class, 'successCallback'])->name('successCallback');

