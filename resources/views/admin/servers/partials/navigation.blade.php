@php
    /** @var \Pterodactyl\Models\Server $server */
    $router = app('router');
@endphp
<div class="row">
    <div class="col-xs-12">
        <div class="nav-tabs-custom nav-tabs-floating">
            <ul class="nav nav-tabs">
                <li class="{{ $router->currentRouteNamed('admin.servers.view') ? 'active' : '' }}">
                    <a href="{{ route('admin.servers.view', $server->id) }}">About</a></li>
                @if($server->isInstalled())
                    <li class="{{ $router->currentRouteNamed('admin.servers.view.details') ? 'active' : '' }}">
                        <a href="{{ route('admin.servers.view.details', $server->id) }}">Details</a>
                    </li>
                    <li class="{{ $router->currentRouteNamed('admin.servers.view.build') ? 'active' : '' }}">
                        <a href="{{ route('admin.servers.view.build', $server->id) }}">Build Configuration</a>
                    </li>
                    <li class="{{ $router->currentRouteNamed('admin.servers.view.startup') ? 'active' : '' }}">
                        <a href="{{ route('admin.servers.view.startup', $server->id) }}">Startup</a>
                    </li>
                    <li class="{{ $router->currentRouteNamed('admin.servers.view.database') ? 'active' : '' }}">
                        <a href="{{ route('admin.servers.view.database', $server->id) }}">Database</a>
                    </li>
                    <li class="{{ $router->currentRouteNamed('admin.servers.view.mounts') ? 'active' : '' }}">
                        <a href="{{ route('admin.servers.view.mounts', $server->id) }}">Mounts</a>
                    </li>
                @endif
                <li class="{{ $router->currentRouteNamed('admin.servers.view.manage') ? 'active' : '' }}">
                    <a href="{{ route('admin.servers.view.manage', $server->id) }}">Manage</a>
                </li>
                <li class="tab-danger {{ $router->currentRouteNamed('admin.servers.view.delete') ? 'active' : '' }}">
                    <a href="{{ route('admin.servers.view.delete', $server->id) }}">Delete</a>
                </li>
                <li class="tab-success">
                    <a href="/server/{{ $server->uuidShort }}" target="_blank"><i class="fa fa-external-link"></i></a>
                </li>
            </ul>
        </div>
    </div>
</div>

<div class="row">
    <div class="col-xs-12">
        @if($server->splits->isNotEmpty())
            <div class="alert alert-info" style="margin-bottom: 10px;">
                <h4><i class="icon fa fa-server"></i> Master Server</h4>
                This server is a <strong>Master Server</strong> for one or more split servers.
                The resources shown here represent the total allocated resources, but the actual usable resources are reduced by the amount allocated to sub-servers.
            </div>
        @endif
        @if($server->subSplit)
             <div class="alert alert-warning" style="margin-bottom: 10px;">
                <h4><i class="icon fa fa-link"></i> Sub-Server</h4>
                 This server is a <strong>Sub-Server</strong> split from <a href="{{ route('admin.servers.view', $server->subSplit->master_server_id) }}" style="color: #fff; text-decoration: underline;">Server ID {{ $server->subSplit->master_server_id }}</a>.
                 Resources are managed by the Server Splitter.
            </div>
        @endif
    </div>
</div>
