@extends('layouts.app')

@section('content')

<script>
    $(window).on('load', function() {
        let desc = localStorage.getItem('describe_status')
        if(desc) {
            $('#patient_before_call_message').val(desc);
            localStorage.removeItem('describe_status');
        }
        if(window.innerWidth < 1340){
            $('#card').removeClass('w-50');
        }
    })
</script>

@endsection

@push('extra_scripts')

@php
    // ✅ نبني الروابط على APP_URL مباشرة (بدون route()) حتى ما يصير localhost
    $base = rtrim(config('app.url'), '/'); // لازم يكون https://clindr-payment.hdf.usj.edu.lb

    $successUrl = $base . '/successCallback?data=' . urlencode($payment_details) . '&order_id=' . urlencode($call_id);
    $errorUrl   = $base . '/errorCallback?data='   . urlencode($payment_details) . '&order_id=' . urlencode($call_id);
    $cancelUrl  = $base . '/cancelCallback?data='  . urlencode($payment_details) . '&order_id=' . urlencode($call_id);
@endphp

<script src="https://epayment.areeba.com/checkout/version/60/checkout.js"
        data-error="errorCallback"
        data-cancel="cancelCallback"
        data-complete="{!! $successUrl !!}">
</script>

<script type="text/javascript">
    const ERROR_URL  = @json($errorUrl);
    const CANCEL_URL = @json($cancelUrl);

    function errorCallback(error) {
        location.href = ERROR_URL; // ما عاد في &amp; أصلاً لأننا بنينا الرابط يدويًا
    }

    function cancelCallback() {
        location.href = CANCEL_URL;
    }

    $(function () {
        let configs = {
            merchant:"TEST222206160001",
            session: { id: "{{$session_id}}" },
            order: {
                description: "pay call #{{$call_id}}",
                id: "{{$call_id}}",
                amount: "{{$price}}",
                currency: "USD",
            },
            interaction: {
                operation: "PURCHASE",
                merchant: {
                    name: "{{$decodedData->project_name}}",
                    address: { line1: "HIDE", line2: "HIDE" }
                },
                displayControl: {
                    billingAddress: "HIDE",
                    customerEmail: "HIDE",
                    shipping: "HIDE"
                }
            }
        };

        Checkout.configure(configs);
        Checkout.showLightbox();
    });
</script>

@endpush
