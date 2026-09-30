@extends('layouts.admin')

@section('title')
    Manager User: {{ $user->username }}
@endsection

@section('content-header')
    <h1>{{ $user->name_first }} {{ $user->name_last}}<small>{{ $user->username }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li><a href="{{ route('admin.users') }}">Users</a></li>
        <li class="active">{{ $user->username }}</li>
    </ol>
@endsection

@section('content')
<div class="row">
    @if($loginAsUserEnabled && !$user->root_admin)
        <form id="impersonateForm" action="{{ route('admin.users.impersonate', $user->id) }}" method="POST" style="display: none;">
            {!! csrf_field() !!}
        </form>
    @endif
    <form action="{{ route('admin.users.view', $user->id) }}" method="post">
        <div class="col-md-6">
            <div class="box box-primary">
                <div class="box-header with-border">
                    <div class="row" style="width:100%">
                        <div class="col-xs-6">
                            <h3 class="box-title" style="margin:0;">Identity</h3>
                        </div>
                        <div class="col-xs-6 text-right">
                            @if($loginAsUserEnabled && !$user->root_admin)
                                <button form="impersonateForm" type="submit" class="btn btn-xs btn-success"><i class="fa fa-sign-in"></i> Login as User</button>
                            @endif
                        </div>
                    </div>
                </div>
                <div class="box-body">
                    <div class="form-group">
                        <label for="email" class="control-label">Email</label>
                        <div>
                            <input type="email" name="email" value="{{ $user->email }}" class="form-control form-autocomplete-stop">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="registered" class="control-label">Username</label>
                        <div>
                            <input type="text" name="username" value="{{ $user->username }}" class="form-control form-autocomplete-stop">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="registered" class="control-label">Client First Name</label>
                        <div>
                            <input type="text" name="name_first" value="{{ $user->name_first }}" class="form-control form-autocomplete-stop">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="registered" class="control-label">Client Last Name</label>
                        <div>
                            <input type="text" name="name_last" value="{{ $user->name_last }}" class="form-control form-autocomplete-stop">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="control-label">Default Language</label>
                        <div>
                            <select name="language" class="form-control">
                                @foreach($languages as $key => $value)
                                    <option value="{{ $key }}" @if($user->language === $key) selected @endif>{{ $value }}</option>
                                @endforeach
                            </select>
                            <p class="text-muted"><small>The default language to use when rendering the Panel for this user.</small></p>
                        </div>
                    </div>
                </div>
                <div class="box-footer">
                    {!! csrf_field() !!}
                    {!! method_field('PATCH') !!}
                    <input type="submit" value="Update User" class="btn btn-primary btn-sm" {{ Auth::user()->root_admin || Auth::user()->hasAdminPermission('admin.users.update') ? '' : 'disabled' }}>
                </div>
            </div>

            <div class="box box-primary">
                <div class="box-header with-border">
                    <h3 class="box-title">Billing Information</h3>
                </div>
                <div class="box-body">
                    <div class="form-group">
                        <label for="country" class="control-label">Country</label>
                        <div>
                            <input type="text" name="country" value="{{ $user->country }}" class="form-control form-autocomplete-stop">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="address" class="control-label">Address</label>
                        <div>
                            <input type="text" name="address" value="{{ $user->address }}" class="form-control form-autocomplete-stop">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="zip_code" class="control-label">Zip Code</label>
                        <div>
                            <input type="text" name="zip_code" value="{{ $user->zip_code }}" class="form-control form-autocomplete-stop">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="credit" class="control-label">Credit Balance</label>
                        <div class="input-group">
                            <span class="input-group-addon">{{ $currency }}</span>
                            <input type="number" step="0.01" name="credit" value="{{ $user->credit }}" class="form-control form-autocomplete-stop">
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-6">
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">Password</h3>
                </div>
                <div class="box-body">
                    <div class="alert alert-success" style="display:none;margin-bottom:10px;" id="gen_pass"></div>
                    <div class="form-group no-margin-bottom">
                        <label for="password" class="control-label">Password <span class="field-optional"></span></label>
                        <div>
                            <input type="password" id="password" name="password" class="form-control form-autocomplete-stop">
                            <p class="text-muted small">Leave blank to keep this user's password the same. User will not receive any notification if password is changed.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-6">
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">Permissions</h3>
                </div>
                <div class="box-body">
                    @if(Auth::user()->root_admin)
                    <div class="form-group">
                        <label for="root_admin" class="control-label">Administrator</label>
                        <div>
                            <select name="root_admin" class="form-control">
                                <option value="0">@lang('strings.no')</option>
                                <option value="1" {{ $user->root_admin ? 'selected="selected"' : '' }}>@lang('strings.yes')</option>
                            </select>
                            <p class="text-muted"><small>Setting this to 'Yes' gives a user full administrative access.</small></p>
                        </div>
                    </div>
                    @endif
                </div>
            </div>
        </div>

        <div class="col-md-6">
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">Account Status</h3>
                </div>
                <div class="box-body">
                    <div class="form-group">
                        <label class="control-label">Current Status</label>
                        <div>
                            @if($user->is_banned)
                                <span class="label label-danger">Banned</span>
                            @elseif($user->isSuspended())
                                <span class="label label-warning">Suspended until {{ $user->suspended_until->format('Y-m-d H:i') }}</span>
                            @else
                                <span class="label label-success">Active</span>
                            @endif
                        </div>
                        @if($user->is_banned && $user->ban_reason)
                            <p class="text-muted" style="margin-top: 8px;"><small>Reason: {{ $user->ban_reason }}</small></p>
                        @endif
                        @if($user->isSuspended() && $user->suspension_reason)
                            <p class="text-muted" style="margin-top: 8px;"><small>Reason: {{ $user->suspension_reason }}</small></p>
                        @endif
                    </div>

                    <div class="form-group">
                        <label for="is_banned" class="control-label">Ban Account</label>
                        <div>
                            <select name="is_banned" class="form-control">
                                <option value="0" {{ !$user->is_banned ? 'selected' : '' }}>No</option>
                                <option value="1" {{ $user->is_banned ? 'selected' : '' }}>Yes</option>
                            </select>
                            <p class="text-muted"><small>Ban the user from logging in. This will suspend all servers owned by them.</small></p>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="ban_reason" class="control-label">Ban Reason</label>
                        <div>
                            <textarea name="ban_reason" class="form-control">{{ $user->ban_reason }}</textarea>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="suspended_until" class="control-label">Suspend Until</label>
                        <div>
                            <input type="datetime-local" name="suspended_until" value="{{ $user->suspended_until ? $user->suspended_until->format('Y-m-d\TH:i') : '' }}" class="form-control">
                            <p class="text-muted"><small>Leave blank to remove the suspension.</small></p>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="suspension_reason" class="control-label">Suspension Reason</label>
                        <div>
                            <textarea name="suspension_reason" class="form-control">{{ $user->suspension_reason }}</textarea>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </form>
    <div class="col-xs-12">
        <div class="box box-primary">
            <div class="box-header with-border">
                <h3 class="box-title">Servers</h3>
            </div>
            <div class="box-body table-responsive no-padding">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Identifier</th>
                            <th>Node</th>
                            <th>Type</th>
                            <th>Connection</th>
                            <th>Status</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($user->servers as $server)
                            <tr>
                                <td><a href="{{ route('admin.servers.view', $server->id) }}">{{ $server->name }}</a></td>
                                <td><code>{{ $server->uuidShort }}</code></td>
                                <td><a href="{{ route('admin.nodes.view', $server->node->id) }}">{{ $server->node->name }}</a></td>
                                <td>
                                    @if($server->subSplit)
                                        <span class="label label-warning">Sub-Server</span>
                                    @elseif($server->splits->isNotEmpty())
                                        <span class="label label-info">Master Server</span>
                                    @else
                                        <span class="label label-default">Standard</span>
                                    @endif
                                </td>
                                <td>
                                    <code>{{ $server->allocation->alias }}:{{ $server->allocation->port }}</code>
                                </td>
                                <td>
                                    @if($server->suspended)
                                        <span class="label label-danger">Suspended</span>
                                    @elseif(!is_null($server->status))
                                        <span class="label label-warning">{{ $server->status }}</span>
                                    @else
                                        <span class="label label-success">Active</span>
                                    @endif
                                </td>
                                <td class="text-right">
                                    <a href="{{ route('admin.servers.view', $server->id) }}" class="btn btn-sm btn-primary text-sm">Manage</a>
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    <div class="col-xs-12">
        <div class="box box-info">
            <div class="box-header with-border">
                <h3 class="box-title">Active Sessions</h3>
                <div class="box-tools pull-right">
                    <form action="{{ route('admin.users.session.revoke_all', $user->id) }}" method="POST">
                        {!! csrf_field() !!}
                        {!! method_field('DELETE') !!}
                        @if(Auth::user()->root_admin || Auth::user()->hasAdminPermission('admin.users.update'))
                            <button class="btn btn-xs btn-danger"><i class="fa fa-trash"></i> Revoke All</button>
                        @endif
                    </form>
                </div>
            </div>
            <div class="box-body table-responsive no-padding">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Device</th>
                            <th>Platform</th>
                            <th>Browser</th>
                            <th>IP Address</th>
                            <th>Location</th>
                            <th>VPN</th>
                            <th>Last Active</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($activeSessions as $session)
                            <tr>
                                <td>{{ $session->device_type }}</td>
                                <td>{{ $session->platform }}</td>
                                <td>{{ $session->browser }}</td>
                                <td>{{ $session->ip_address }}</td>
                                <td>
                                    {{ $session->city ?? 'Unknown' }}, {{ $session->state ?? 'Unknown' }} ({{ $session->country ?? 'Unknown' }})
                                </td>
                                <td>@if($session->is_vpn) <span class="label label-danger">Yes</span> @else <span class="label label-success">No</span> @endif</td>
                                <td>{{ \Carbon\Carbon::parse($session->last_active_at)->diffForHumans() }}</td>
                                <td class="text-right">
                                    <form action="{{ route('admin.users.session.revoke', ['user' => $user->id, 'session' => $session->session_id]) }}" method="POST">
                                        {!! csrf_field() !!}
                                        {!! method_field('DELETE') !!}
                                        @if(Auth::user()->root_admin || Auth::user()->hasAdminPermission('admin.users.update'))
                                            <button class="btn btn-xs btn-danger"><i class="fa fa-trash"></i> Revoke</button>
                                        @endif
                                    </form>
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    <div class="col-xs-12">
        <div class="box box-warning">
            <div class="box-header with-border">
                <h3 class="box-title">Login History (Last 50)</h3>
            </div>
            <div class="box-body table-responsive no-padding">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Logged In</th>
                            <th>Device</th>
                            <th>Platform</th>
                            <th>Browser</th>
                            <th>IP Address</th>
                            <th>Location</th>
                            <th>VPN</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($loginHistory as $history)
                            <tr>
                                <td>{{ \Carbon\Carbon::parse($history->created_at)->diffForHumans() }}</td>
                                <td>{{ $history->device_type }}</td>
                                <td>{{ $history->platform }}</td>
                                <td>{{ $history->browser }}</td>
                                <td>{{ $history->ip_address }}</td>
                                <td>
                                    {{ $history->city ?? 'Unknown' }}, {{ $history->state ?? 'Unknown' }} ({{ $history->country ?? 'Unknown' }})
                                </td>
                                <td>@if($history->is_vpn) <span class="label label-danger">Yes</span> @else <span class="label label-success">No</span> @endif</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    <div class="col-xs-12">
        <div class="box box-danger">
            <div class="box-header with-border">
                <h3 class="box-title">Delete User</h3>
            </div>
            <div class="box-body">
                <p class="no-margin">There must be no servers associated with this account in order for it to be deleted.</p>
            </div>
            <div class="box-footer">
                <form action="{{ route('admin.users.view', $user->id) }}" method="POST">
                    {!! csrf_field() !!}
                    {!! method_field('DELETE') !!}
                    @if(Auth::user()->root_admin || Auth::user()->hasAdminPermission('admin.users.delete'))
                        <input id="delete" type="submit" class="btn btn-sm btn-danger pull-right" {{ $user->servers->count() < 1 ?: 'disabled' }} value="Delete User" />
                    @endif
                </form>
            </div>
        </div>
    </div>
</div>
@endsection
