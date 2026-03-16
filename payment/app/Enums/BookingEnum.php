<?php

namespace App\Enums;

final class BookingEnum{
    const PENDING   = "Pending";
    const APPROVED  = "Approved";
    const DECLINED  = "Declined";
    const READY     = "Ready";
    const ONGOING   = "OnGoing";
    const DONE      = "Done";
    const DOCTOR_CANCEL      = "Canceled By Doctor";
    const PATIENT_CANCEL      = "Canceled By Patient";
}
