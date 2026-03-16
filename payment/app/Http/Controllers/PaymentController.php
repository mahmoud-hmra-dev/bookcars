<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use App\Services\AreebaPaymentService;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Redirect;
use App\Models\Payment;
use App\Models\Project;

class PaymentController extends Controller
{
    private $payment_service;

    public function __construct(AreebaPaymentService $payment_service)
    {
        $this->payment_service = $payment_service;
    }

    public function index()
    {
        $payments = Payment::all();
        return response()->json($payments);
    }

    // make hash for payment
    public function makeHash(Request $request)
    {
        $payment_details = $request->all();
        $project_id = $payment_details['project_id'] ?? null;

        if(!$project_id || !Project::where('uuid', $project_id)->exists()){
            return response()->json(['error' => 'project id is not valid'], 400);
        }

        $jsonEncodedData = json_encode($payment_details, JSON_UNESCAPED_SLASHES);
        $base64EncodedData = base64_encode($jsonEncodedData);

        $app_url = URL::to('/');
        $paymentUrl = $app_url . '/payment?p=' . $base64EncodedData;

        $paymentUrl = str_replace(['\/', '\\/'], '/', $paymentUrl);

        return response($paymentUrl, 200)->header('Content-Type', 'text/plain');
    }

    public function makePayment(Request $request)
    {
        $payment_details = $request->input('p');
        $order = base64_decode($payment_details);
        $decodedData = json_decode($order);

        $price = $decodedData->price ?? null;
        if ($price === null) {
            return view('pages.booking.payment_failed');
        }

        $call_id = Str::uuid()->toString();
        $data = $this->payment_service->generateSessionId($call_id, $price);

        if($data){
            $session_id = $data['session_id'];
            $call_id    = $data['order_id'];
            $price      = $data['price'];

            return view('pages.booking.payment', compact(
                'session_id',
                'call_id',
                'price',
                'decodedData',
                'payment_details'
            ));
        }

        return view('pages.booking.payment_failed');
    }

    public function successCallback(Request $request)
    {
        return $this->handleCallback($request, 'paid', 'successCallback');
    }

    public function cancelCallback(Request $request)
    {
        return $this->handleCallback($request, 'cancelled', 'cancelCallback');
    }

    public function errorCallback(Request $request)
    {
        return $this->handleCallback($request, 'failed', 'errorCallback');
    }

    private function handleCallback(Request $request, string $status, string $callbackField)
    {
        // ✅ حل مشكلة amp;order_id
        $order_id = $request->query('order_id') ?? $request->query('amp;order_id');
        $data     = $request->query('data');

        if (!$order_id || !$data) {
            return response('Missing order_id or data', 400);
        }

        $decodedData = json_decode(base64_decode($data));

        Payment::create([
            'project_id'      => $decodedData->project_id ?? null,
            'project_name'    => $decodedData->project_name ?? null,
            'prodact_id'      => $decodedData->prodact_id ?? null,
            'user_id'         => $decodedData->user_id ?? null,
            'firstName'       => $decodedData->firstName ?? null,
            'lastName'        => $decodedData->lastName ?? null,
            'email'           => $decodedData->email ?? null,
            'price'           => $decodedData->price ?? null,
            'currency'        => $decodedData->currency ?? null,
            'errorCallback'   => $decodedData->errorCallback ?? null,
            'successCallback' => $decodedData->successCallback ?? null,
            'cancelCallback'  => $decodedData->cancelCallback ?? null,
            'order_id'        => $order_id,
            'status'          => $status,
        ]);

        $additionalParameters = [
            'order_id' => $order_id,
            'status'   => $status,
        ];

        $baseUrl = (string) ($decodedData->{$callbackField} ?? '');
        if ($baseUrl === '') {
            return response('Callback URL missing in payload', 400);
        }

        // ✅ نبني الرابط بدون ما نلمس baseUrl
        $redirectUrl = $this->buildRedirectUrl($baseUrl, $additionalParameters);

        // ✅ حل نهائي: redirect عبر JS (ما في Location header أبداً)
        return response(
            '<!doctype html><html><head><meta charset="utf-8"></head><body>
            <script>
              window.location.replace(' . json_encode($redirectUrl) . ');
            </script>
            </body></html>',
            200
        )->header('Content-Type', 'text/html; charset=utf-8');
    }

    private function buildRedirectUrl(string $baseUrl, array $parameters): string
    {
        if (empty($parameters)) return $baseUrl;

        // append فقط - بدون تغيير baseUrl
        $pairs = [];
        foreach ($parameters as $k => $v) {
            $pairs[] = $k . '=' . urlencode((string) $v);
        }

        $sep = str_contains($baseUrl, '?') ? '&' : '?';
        return $baseUrl . $sep . implode('&', $pairs);
    }
}
