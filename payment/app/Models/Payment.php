<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;
    protected $fillable = [
        'project_id',
        'project_name',
        'prodact_id',
        'user_id',
        'firstName',
        'lastName',
        'email',
        'price',
        'currency',
        'errorCallback',
        'successCallback',
        'cancelCallback',
        'order_id',
        'status'
    ];
}
