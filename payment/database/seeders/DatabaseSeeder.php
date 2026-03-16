<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Project;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // create project
        Project::create([
            'uuid' => '4d2ff084-1afd-4c6a-b2e7-6e8de34bd6c8',
            'name' => 'controtrack_test',
            'status'=>1

        ]);
    }
}
