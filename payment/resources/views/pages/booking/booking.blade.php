@extends('layouts.app')

@section('content')
<div class="container pt-5">
    <div class="row justify-content-center pt-5">
        <div class="col-md-12 box-form w-50">
            <div class="row">
                <div class="col-md-12 pb-5">
                    <span class="text-center title-reg fs-2">{{__("site.booking summary")}}</span>
                </div>
                <div class="col-md-12 fs-3 pb-4"><span class="text-center text-green fw-bolder">{{__("site.doctor name")}} : </span>{{$time->doctor->user->first_name}} {{$time->doctor->user->last_name}}</div>
                <div class="col-md-12 fs-3 pb-4"><span class="text-center text-green fw-bolder">{{__("site.date")}} : </span>{{$time->time}}</div>
                <div class="col-md-12 fs-3 pb-4"><span class="text-center text-green fw-bolder">{{__("site.visit type")}} : </span>{{$type}}</div>
                <div class="col-md-12 fs-3 pb-4"><span class="text-center text-green fw-bolder">{{__("site.visit fees")}} : </span>{{$price}} $</div>
                <div class="col-md-12 fs-3 pb-4" id="description_holder"><span class="text-center text-green fw-bolder">{{__("site.your description")}} : </span> <p id="description"></p></div>
                <div class="row">
                    <div class="col-md-12">
                        <input type="checkbox" id="agreed" class="me-1 ms-3 position-relative form-check-inline">
                        <span>{{__("site.I don't want to share my medical history with this doctor")}}</span>
                    </div>
                    <div class="col-md-8">
                        <input type="checkbox" id="agreed2" class="me-1 ms-3 position-relative form-check-inline">
                        <span>{{__("site.I Agree to the")}} <a href="{{route('paymentpolicy')}}">{{__("site.payment policy")}}</a></span>
                    </div>
                    <div class="col-md-4 d-flex justify-content-end fs-3 pb-3"><a class="btn btn-primary" id="confirmation" href="{{route('book',[$idtime,$type,"true"])}}" style="background-color: #dcdcdc; margin-left: 65px;" disabled>{{__("site.confirm")}}</a></div>
                </div>
            </div>
        </div>
    </div>
</div>
<script>
    let idtime = "{{$idtime}}";
    let type = "{{$type}}";
    let description = "";
    $("#agreed").on('change',function (event){
        let toshare = !($('#agreed:checked').length > 0);
        $("#confirmation").attr('href',"{{ route('welcome') }}/book/"+ idtime+"/"+type + "/"+toshare+"/"+description)
    })
    $('#confirmation').on("click", false);
    $('#agreed2').on('change',function() {
        if ($('#agreed2:checked').length) {
            $('#confirmation').off("click");
            $('#confirmation').css('background-color','#2b6463')
        } else {
            $('#confirmation').on("click", false);
            $('#confirmation').css('background-color','#dcdcdc');
        }
        let toshare = !($('#agreed:checked').length > 0);
        $("#confirmation").attr('href',"{{ route('welcome') }}/book/"+ idtime+"/"+type + "/"+toshare+"/"+description)
    });
    $(function () {
        description = localStorage.getItem('describe_status')
        console.log(description)
        if(description)
            $("#description").html(description)
        else
            $("#description_holder").hide();
    })
</script>
@endsection
