@extends('layouts.admin')

@section('title')
    Server — {{ $server->name }}: Details
@endsection

@section('content-header')
    <h1>{{ $server->name }}<small>Edit details for this server including owner and container.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li><a href="{{ route('admin.servers') }}">Servers</a></li>
        <li><a href="{{ route('admin.servers.view', $server->id) }}">{{ $server->name }}</a></li>
        <li class="active">Details</li>
    </ol>
@endsection

@section('content')
@include('admin.servers.partials.navigation')
<style>
input[type="datetime-local"]::-webkit-calendar-picker-indicator {
    filter: invert(0.5) sepia(1) saturate(5) hue-rotate(175deg) brightness(1.1);
}
input[type="datetime-local"]::-moz-calendar-picker-indicator {
    color: #337ab7;
}
</style>
<div class="row">
    <div class="col-xs-12">
        <div class="box box-primary">
            <div class="box-header with-border">
                <h3 class="box-title">Base Information</h3>
            </div>
            <form action="{{ route('admin.servers.view.details', $server->id) }}" method="POST">
                <div class="box-body">
                    <div class="form-group">
                        <label for="name" class="control-label">Server Name <span class="field-required"></span></label>
                        <input type="text" name="name" value="{{ old('name', $server->name) }}" class="form-control" />
                        <p class="text-muted small">Character limits: <code>a-zA-Z0-9_-</code> and <code>[Space]</code>.</p>
                    </div>
                    <div class="form-group">
                        <label for="external_id" class="control-label">External Identifier</label>
                        <input type="text" name="external_id" value="{{ old('external_id', $server->external_id) }}" class="form-control" />
                        <p class="text-muted small">Leave empty to not assign an external identifier for this server. The external ID should be unique to this server and not be in use by any other servers.</p>
                    </div>
                    <div class="form-group">
                        <label for="pUserId" class="control-label">Server Owner <span class="field-required"></span></label>
                        <select name="owner_id" class="form-control" id="pUserId">
                            <option value="{{ $server->owner_id }}" selected>{{ $server->user->email }}</option>
                        </select>
                        <p class="text-muted small">You can change the owner of this server by changing this field to an email matching another use on this system. If you do this a new daemon security token will be generated automatically.</p>
                    </div>
                    <div class="form-group">
                        <label for="description" class="control-label">Server Description</label>
                        <textarea name="description" rows="3" class="form-control">{{ old('description', $server->description) }}</textarea>
                        <p class="text-muted small">A brief description of this server.</p>
                    </div>
                    <div class="form-group">
                        <label for="exp_date" class="control-label">Server Expiry Date</label>
                        <input type="datetime-local" name="exp_date" value="{{ old('exp_date', $server->exp_date ? $server->exp_date->format('Y-m-d\TH:i') : '') }}" class="form-control" />
                        <p class="text-muted small">Set the expiry date for this server. Leave blank for no expiry.</p>
                    </div>

                    @if($billingEnabled)
                        <div class="form-group">
                            <label for="billing_plan_id" class="control-label">Billing Plan (Game)</label>
                            <select name="product_id" class="form-control">
                                <option value="">None (Custom/No Plan)</option>
                                @foreach($billingGames as $game)
                                    <option value="{{ $game->id }}" {{ $server->product_id == $game->id ? 'selected' : '' }}>
                                        {{ $game->category_name }} - {{ $game->name }} ({{ $game->price }})
                                    </option>
                                @endforeach
                            </select>
                            <p class="text-muted small">Assign a billing plan to this server. This links the server to a specific product/price.</p>
                        </div>
                    @endif
                </div>
                <div class="box-footer">
                    {!! csrf_field() !!}
                    {!! method_field('PATCH') !!}
                    <input type="submit" class="btn btn-sm btn-primary" value="Update Details" />
                </div>
            </form>
        </div>
    </div>
</div>
@endsection

@section('footer-scripts')
    @parent
    <script>
    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    $('#pUserId').select2({
        ajax: {
            url: '/admin/users/accounts.json',
            dataType: 'json',
            delay: 250,
            data: function (params) {
                return {
                    filter: { email: params.term },
                    page: params.page,
                };
            },
            processResults: function (data, params) {
                return { results: data };
            },
            cache: true,
        },
        escapeMarkup: function (markup) { return markup; },
        minimumInputLength: 2,
        templateResult: function (data) {
            if (data.loading) return escapeHtml(data.text);

            return '<div class="user-block"> \
                <img class="img-circle img-bordered-xs" src="https://www.gravatar.com/avatar/' + escapeHtml(data.md5) + '?s=120" alt="User Image"> \
                <span class="username"> \
                    <a href="#">' + escapeHtml(data.name_first) + ' ' + escapeHtml(data.name_last) +'</a> \
                </span> \
                <span class="description"><strong>' + escapeHtml(data.email) + '</strong> - ' + escapeHtml(data.username) + '</span> \
            </div>';
        },
        templateSelection: function (data) {
            if (typeof data.name_first === 'undefined') {
                data = {
                    md5: '{{ md5(strtolower($server->user->email)) }}',
                    name_first: '{{ $server->user->name_first }}',
                    name_last: '{{ $server->user->name_last }}',
                    email: '{{ $server->user->email }}',
                    id: {{ $server->owner_id }}
                };
            }

            return '<div> \
                <span> \
                    <img class="img-rounded img-bordered-xs" src="https://www.gravatar.com/avatar/' + escapeHtml(data.md5) + '?s=120" style="height:28px;margin-top:-4px;" alt="User Image"> \
                </span> \
                <span style="padding-left:5px;"> \
                    ' + escapeHtml(data.name_first) + ' ' + escapeHtml(data.name_last) + ' (<strong>' + escapeHtml(data.email) + '</strong>) \
                </span> \
            </div>';
        }
    });
    </script>
@endsection
