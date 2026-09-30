@extends('layouts.admin')

@section('title')
    List Users
@endsection

@section('content-header')
    <h1>Users<small>All registered users on the system.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li class="active">Users</li>
    </ol>
@endsection

@section('content')
<div class="row">
    <div class="col-xs-12">
        <div class="box box-primary">
            <div class="box-header with-border">
                <h3 class="box-title">User List</h3>
                <div class="box-tools">
                    <form action="{{ route('admin.users') }}" method="GET" style="display: inline-block;">
                        <div class="input-group input-group-sm search01" style="width: 250px;">
                            <input type="text" name="filter[email]" class="form-control pull-right" value="{{ request()->input('filter.email') }}" placeholder="Search">
                            <div class="input-group-btn">
                                <button type="submit" class="btn btn-default"><i class="fa fa-search"></i></button>
                            </div>
                        </div>
                    </form>
                    @if(Auth::user()->root_admin || Auth::user()->hasAdminPermission('admin.users.create'))
                        <a href="{{ route('admin.users.new') }}"><button type="button" class="btn btn-sm btn-primary">Create New</button></a>
                    @endif
                </div>
            </div>
            <div class="box-body table-responsive no-padding">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Email</th>
                            <th>Client Name</th>
                            <th>Username</th>
                            <th class="text-center">2FA</th>
                            <th class="text-center"><span data-toggle="tooltip" data-placement="top" title="Servers that this user is marked as the owner of.">Servers Owned</span></th>
                            <th class="text-center"><span data-toggle="tooltip" data-placement="top" title="Servers that this user can access because they are marked as a subuser.">Can Access</span></th>
                            <th class="text-center">Last Seen</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($users as $user)
                            <tr class="align-middle">
                                <td><code>{{ $user->id }}</code></td>
                                <td>
                                    <a href="{{ route('admin.users.view', $user->id) }}">{{ $user->email }}</a>
                                    @if($user->root_admin)
                                        <i class="fa fa-star text-yellow" title="Administrator"></i>
                                    @endif
                                    @if($user->is_banned)
                                        <i class="fa fa-circle text-danger" title="Banned"></i>
                                    @elseif($user->isSuspended())
                                        <i class="fa fa-circle text-warning" title="Suspended until {{ $user->suspended_until->format('Y-m-d H:i') }}"></i>
                                    @endif
                                </td>
                                <td>{{ $user->name_last }}, {{ $user->name_first }}</td>
                                <td>{{ $user->username }}</td>
                                <td class="text-center">
                                    @if($user->use_totp)
                                        <i class="fa fa-lock text-green"></i>
                                    @else
                                        <i class="fa fa-unlock text-red"></i>
                                    @endif
                                </td>
                                <td class="text-center">
                                    <a href="{{ route('admin.servers', ['filter[owner_id]' => $user->id]) }}">{{ $user->servers_count }}</a>
                                </td>
                                <td class="text-center">{{ $user->subuser_of_count }}</td>
                                <td class="text-center">
                                    @if($user->last_login_at)
                                        <span data-toggle="tooltip" data-placement="top" title="{{ Carbon\Carbon::parse($user->last_login_at)->format('Y-m-d H:i:s') }}">
                                            {{ Carbon\Carbon::parse($user->last_login_at)->diffForHumans() }}
                                        </span>
                                        <br>
                                        <small class="text-muted">{{ $user->last_login_ip }}</small>
                                    @else
                                        <span class="text-muted">Never</span>
                                    @endif
                                </td>
                                <td class="text-center"><img src="https://www.gravatar.com/avatar/{{ md5(strtolower($user->email)) }}?s=100" style="height:20px;" class="img-circle" /></td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
            @if($users->hasPages())
                <div class="box-footer with-border">
                    <div class="col-md-12 text-center">{!! $users->appends(['filter' => Request::input('filter'), 'sort' => Request::input('sort')])->render() !!}</div>
                </div>
            @endif
        </div>
    </div>
</div>
@endsection
