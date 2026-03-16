<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Payment Gateway</title>

    <!-- JS -->
    <script src="{{ config('app.url') }}/js/manifest.js"></script>

    <script
        @isset($is_react)
            @if($is_react) defer @endif
        @endisset
        src="{{ config('app.url') }}/js/vendor.js">
    </script>

    <script src="{{ config('app.url') }}/js/app.js"></script>

    <!-- Firebase -->
    <script src="https://www.gstatic.com/firebasejs/5.5.9/firebase.js"></script>
    <script src="https://www.gstatic.com/firebasejs/5.5.9/firebase-app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/5.5.9/firebase-messaging.js"></script>

    <!-- Global JS Vars -->
    <script>
        const _token = '{{ csrf_token() }}';
        const BASE_URL = '{{ config('app.url') }}/';
    </script>

    <!-- Fonts -->
    <link rel="dns-prefetch" href="//fonts.gstatic.com">
    <link href="{{ config('app.url') }}/font/Fredoka-Regular.ttf" rel="stylesheet">

    <!-- CSS -->
    <link href="{{ config('app.url') }}/css/app.css" rel="stylesheet">
    <link href="{{ config('app.url') }}/css/main.css" rel="stylesheet">
    <link href="{{ config('app.url') }}/css/dashboard.css" rel="stylesheet">
    <link href="{{ config('app.url') }}/css/register.css" rel="stylesheet">
    <link href="{{ config('app.url') }}/css/doctors.css" rel="stylesheet">
    <link href="{{ config('app.url') }}/css/contact.css" rel="stylesheet">

    @stack('extra_styles')
</head>

<body class="bg-body"
      style="background-image: url('{{ config('app.url') }}/images/bg.jpg');
             background-attachment: fixed;
             background-size: cover;">

    <div id="app">
        <main class="pt-5 mt-2 pb-5">
            @yield('content')
        </main>
    </div>

    @stack('extra_scripts')
</body>
</html>
