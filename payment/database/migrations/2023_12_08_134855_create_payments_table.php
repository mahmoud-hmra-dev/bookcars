<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->string('project_id');
            $table->string('project_name');
            $table->string('prodact_id');
            $table->string('user_id');
            $table->string('firstName');
            $table->string('lastName');
            $table->string('email');
            $table->string('price');
            $table->string('currency');
            $table->string('errorCallback');
            $table->string('successCallback');
            $table->string('cancelCallback');
            $table->string('order_id');
            $table->string('status');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
