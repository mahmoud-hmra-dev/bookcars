<?php

namespace App\Services;

use App\Enums\AreebaInteractionOperationEnum;
use App\Enums\AreebaOperationEnum;
use App\Enums\PayResultEnum;
use GuzzleHttp\Client as GuzzleClient;
use Illuminate\Support\Facades\Log;

class AreebaPaymentService
{
    private $merchant_id;
    private $api_code;

    public function __construct() {
        $this->merchant_id = "TEST222206160001";
        $this->api_code = "9e7088633ee4c5f5567155bd8825e053";
    }

    private function createBasicAuthToken() {
        return base64_encode("merchant.{$this->merchant_id}:{$this->api_code}");
    }

    public function generateSessionId($order_id, $price) {
        $price = number_format((float)$price, 2, '.', '');
        $url = "https://epayment.areeba.com/api/rest/version/60/merchant/{$this->merchant_id}/session";

        $data = [
            "apiOperation" => AreebaOperationEnum::CREATE_CHECKOUT_SESSION,
            "interaction" => [
                'operation' => AreebaInteractionOperationEnum::PURCHASE,
            ],
            "order" => [
                "id" => $order_id,
                "amount" => strval($price),
                "currency" => "USD",
            ],
        ];

        $result = $this->callApi("POST", $url, $data);

        Log::info("Response from Areeba (generateSessionId):", (array) $result);

        if ($result && $result->result === PayResultEnum::SUCCESS) {
            $session_id = $result->session->id ?? null;
            if ($session_id) {
                Log::info("Areeba session created successfully.", [
                    'session_id' => $session_id,
                    'order_id' => $order_id,
                    'price' => $price
                ]);
                return [
                    'session_id' => $session_id,
                    'order_id' => $order_id,
                    'price' => $price
                ];
            }
        }

        Log::warning("Failed to create Areeba session. Result:", (array) $result);
        return false;
    }

    public function getPaymentResult($order_id) {
        $url = "https://epayment.areeba.com/api/rest/version/60/merchant/{$this->merchant_id}/order/{$order_id}";

        $result = $this->callApi("GET", $url);

        Log::info("Response from Areeba (getPaymentResult):", (array) $result);

        if ($result && $result->result === PayResultEnum::SUCCESS) {
            Log::info("Payment result is SUCCESS for order_id: $order_id");
            return true;
        }

        Log::warning("Payment result NOT successful for order_id: $order_id", (array) $result);
        return false;
    }

    private function callApi($method, $url, $data = []) {
        $token = $this->createBasicAuthToken();

        try {
            $headers = [
                'Authorization' => 'Basic ' . $token,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json'
            ];

            $client = new GuzzleClient(['headers' => $headers]);

            $options = [];

            if ($method === 'POST' || $method === 'PUT') {
                $options['json'] = $data;
            }

            $response = $client->request($method, $url, $options);
            $body = $response->getBody()->getContents();

            return json_decode($body);
        } catch (\Exception $exception) {
            Log::error("Areeba API Exception:");
            Log::error("METHOD: $method");
            Log::error("URL: $url");
            Log::error("DATA:", $data);
            Log::error("ERROR: " . $exception->getMessage());

            return false;
        }
    }
}
