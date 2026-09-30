@extends('layouts.admin')

@section('title')
    {{ $node->name }}
@endsection

@section('content-header')
    <h1>{{ $node->name }}<small>A quick overview of your node.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li><a href="{{ route('admin.nodes') }}">Nodes</a></li>
        <li class="active">{{ $node->name }}</li>
    </ol>
@endsection

@section('content')
<div class="row">
    <div class="col-xs-12">
        <div class="nav-tabs-custom nav-tabs-floating">
            <ul class="nav nav-tabs">
                <li class="active"><a href="{{ route('admin.nodes.view', $node->id) }}">About</a></li>
                <li><a href="{{ route('admin.nodes.view.settings', $node->id) }}">Settings</a></li>
                <li><a href="{{ route('admin.nodes.view.configuration', $node->id) }}">Configuration</a></li>
                <li><a href="{{ route('admin.nodes.view.allocation', $node->id) }}">Allocation</a></li>
                <li><a href="{{ route('admin.nodes.view.servers', $node->id) }}">Servers</a></li>
                @if($liveNodeStatsEnabled)
                <li><a href="{{ route('admin.nodes.view.wings-stats', $node->id) }}">Wings Stats</a></li>
                @if($firewallManagementEnabled ?? false)
                    <li><a href="{{ route('admin.nodes.view.firewall', $node->id) }}">Firewall</a></li>
                @endif
                @endif
                <li><a href="{{ route('admin.nodes.view.logs', $node->id) }}">Logs</a></li>
                <li><a href="{{ route('admin.nodes.view.backups', $node->id) }}">Backups</a></li>
</ul>
        </div>
    </div>
</div>
<div class="row">
    <div class="col-sm-8">
        <div class="row">
            <div class="col-xs-12">
                <div class="box box-primary">
                    <div class="box-header with-border">
                        <h3 class="box-title">Information</h3>
                    </div>
                    <div class="box-body table-responsive no-padding">
                        <table class="table table-hover">
                            <tr>
                                <td>Daemon Version</td>
                                <td><code data-attr="info-version"><i class="fa fa-refresh fa-fw fa-spin"></i></code> (Latest: <code>{{ $version->getDaemon() }}</code>)</td>
                            </tr>
                            <tr>
                                <td>System Information</td>
                                <td data-attr="info-system"><i class="fa fa-refresh fa-fw fa-spin"></i></td>
                            </tr>
                            <tr>
                                <td>Total CPU Threads</td>
                                <td data-attr="info-cpus"><i class="fa fa-refresh fa-fw fa-spin"></i></td>
                            </tr>
                        </table>
                    </div>
                </div>
            </div>
            {{-- Wings Agent Update Panel --}}
            <div class="col-xs-12" id="wings-agent-update-panel" style="display:none;">
                <div class="box box-warning">
                    <div class="box-header with-border">
                        <h3 class="box-title"><i class="fa fa-upload fa-fw"></i> Wings Agent Update Available</h3>
                    </div>
                    <div class="box-body">
                        <p id="wings-agent-update-msg" class="no-margin"></p>
                    </div>
                    <div class="box-footer">
                        <button id="wings-agent-update-btn" class="btn btn-warning btn-sm">
                            <i class="fa fa-upload"></i> Update Agent Now
                        </button>
                    </div>
                </div>
            </div>
            {{-- Pterodactyl Wings Daemon Update Panel --}}
            <div class="col-xs-12" id="wings-daemon-update-panel" style="display:none;">
                <div class="box box-danger">
                    <div class="box-header with-border">
                        <h3 class="box-title"><i class="fa fa-refresh fa-fw"></i> Pterodactyl Wings Update Available</h3>
                    </div>
                    <div class="box-body">
                        <p id="wings-daemon-update-msg" class="no-margin"></p>
                    </div>
                    <div class="box-footer">
                        <button id="wings-daemon-update-btn" class="btn btn-danger btn-sm">
                            <i class="fa fa-upload"></i> Update Wings Now
                        </button>
                    </div>
                </div>
            </div>
            @if ($node->description)
                <div class="col-xs-12">
                    <div class="box box-default">
                        <div class="box-header with-border">
                            Description
                        </div>
                        <div class="box-body table-responsive">
                            <pre>{{ $node->description }}</pre>
                        </div>
                    </div>
                </div>
            @endif
            <div class="col-xs-12">
                <div class="box box-danger">
                    <div class="box-header with-border">
                        <h3 class="box-title">Delete Node</h3>
                    </div>
                    <div class="box-body">
                        <p class="no-margin">Deleting a node is a irreversible action and will immediately remove this node from the panel. There must be no servers associated with this node in order to continue.</p>
                    </div>
                    <div class="box-footer">
                        <form action="{{ route('admin.nodes.view.delete', $node->id) }}" method="POST">
                            {!! csrf_field() !!}
                            {!! method_field('DELETE') !!}
                            @if(Auth::user()->root_admin || Auth::user()->hasAdminPermission('admin.nodes.delete'))
                            <button type="submit" class="btn btn-danger btn-sm pull-right" {{ ($node->servers_count < 1) ?: 'disabled' }}>Yes, Delete This Node</button>
                            @endif
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="col-sm-4">
        <div class="box box-primary">
            <div class="box-header with-border">
                <h3 class="box-title">At-a-Glance</h3>
            </div>
            <div class="box-body">
                <div class="row">
                    @if($node->maintenance_mode)
                    <div class="col-sm-12">
                        <div class="info-box bg-orange">
                            <span class="info-box-icon"><i class="ion ion-wrench"></i></span>
                            <div class="info-box-content" style="padding: 23px 10px 0;">
                                <span class="info-box-text">This node is under</span>
                                <span class="info-box-number">Maintenance</span>
                            </div>
                        </div>
                    </div>
                    @endif
                    <div class="col-sm-12">
                        <div class="info-box bg-{{ $stats['disk']['css'] }}">
                            <span class="info-box-icon"><i class="ion ion-ios-folder-outline"></i></span>
                            <div class="info-box-content" style="padding: 15px 10px 0;">
                                <span class="info-box-text">Disk Space Allocated</span>
                                <span class="info-box-number">{{ $stats['disk']['value'] }} / {{ $stats['disk']['max'] }} MiB</span>
                                <div class="progress">
                                    <div class="progress-bar" style="width: {{ $stats['disk']['percent'] }}%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-sm-12">
                        <div class="info-box bg-{{ $stats['memory']['css'] }}">
                            <span class="info-box-icon"><i class="ion ion-ios-barcode-outline"></i></span>
                            <div class="info-box-content" style="padding: 15px 10px 0;">
                                <span class="info-box-text">Memory Allocated</span>
                                <span class="info-box-number">{{ $stats['memory']['value'] }} / {{ $stats['memory']['max'] }} MiB</span>
                                <div class="progress">
                                    <div class="progress-bar" style="width: {{ $stats['memory']['percent'] }}%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-sm-12">
                        <div class="info-box bg-blue">
                            <span class="info-box-icon"><i class="ion ion-social-buffer-outline"></i></span>
                            <div class="info-box-content" style="padding: 23px 10px 0;">
                                <span class="info-box-text">Total Servers</span>
                                <span class="info-box-number">
                                    {{ $node->servers_count }}
                                    @if(!is_null($node->server_limit))
                                        / {{ $node->server_limit }}
                                    @endif
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
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

    (function getInformation() {
        $.ajax({
            method: 'GET',
            url: '/admin/nodes/view/{{ $node->id }}/system-information',
            timeout: 5000,
        }).done(function (data) {
            $('[data-attr="info-version"]').html(escapeHtml(data.version));
            $('[data-attr="info-system"]').html(escapeHtml(data.system.type) + ' (' + escapeHtml(data.system.arch) + ') <code>' + escapeHtml(data.system.release) + '</code>');
            $('[data-attr="info-cpus"]').html(data.system.cpus);
        }).fail(function (jqXHR) {

        }).always(function() {
            setTimeout(getInformation, 10000);
        });
    })();

    // ── Wings Agent Update Check ───────────────────────────────────────────
    (function checkAgentVersion() {
        var versionUrl = '{{ route('admin.nodes.wings-agent.version', $node->id) }}';
        var updateUrl  = '{{ route('admin.nodes.wings-agent.update', $node->id) }}';
        var csrfToken  = '{{ csrf_token() }}';

        fetch(versionUrl)
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.up_to_date || !data.current_version) return;

            var panel = document.getElementById('wings-agent-update-panel');
            var msg   = document.getElementById('wings-agent-update-msg');
            msg.innerHTML = 'Your Wings Agent is running <strong>v' + escapeHtml(data.current_version) + '</strong>.'
                          + ' A newer version <strong>v' + escapeHtml(data.latest_version) + '</strong> is available.';
            panel.style.display = '';

            document.getElementById('wings-agent-update-btn').addEventListener('click', function () {
                var btn = this;
                btn.disabled = true;
                btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Updating&hellip;';

                fetch(updateUrl, {
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': csrfToken, 'Content-Type': 'application/json' },
                })
                .then(function (r) { return r.json(); })
                .then(function (resp) {
                    if (resp.error) {
                        btn.innerHTML = '<i class="fa fa-times"></i> Error: ' + escapeHtml(resp.error);
                        btn.disabled = false;
                    } else {
                        btn.innerHTML = '<i class="fa fa-check"></i> Update sent — agent restarting';
                        btn.className = btn.className.replace('btn-warning', 'btn-success');
                        document.querySelector('#wings-agent-update-panel .box').className =
                            document.querySelector('#wings-agent-update-panel .box').className.replace('box-warning', 'box-success');
                    }
                })
                .catch(function () {
                    btn.innerHTML = '<i class="fa fa-times"></i> Request failed';
                    btn.disabled = false;
                });
            });
        })
        .catch(function () {
            // silently ignore version check failure
        });
    })();

    // ── Pterodactyl Wings Daemon Update Check ─────────────────────────────
    (function checkWingsDaemonVersion() {
        var versionUrl = '{{ route('admin.nodes.wings-daemon.version', $node->id) }}';
        var updateUrl  = '{{ route('admin.nodes.wings-daemon.update', $node->id) }}';
        var csrfToken  = '{{ csrf_token() }}';

        fetch(versionUrl)
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.up_to_date || !data.current_version) return;

            var panel = document.getElementById('wings-daemon-update-panel');
            var msg   = document.getElementById('wings-daemon-update-msg');
            msg.innerHTML = 'Pterodactyl Wings is running <strong>v' + escapeHtml(data.current_version) + '</strong>.'
                          + ' The latest version is <strong>v' + escapeHtml(data.latest_version) + '</strong>.';
            panel.style.display = '';

            document.getElementById('wings-daemon-update-btn').addEventListener('click', function () {
                var btn = this;
                btn.disabled = true;
                btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Updating&hellip;';

                fetch(updateUrl, {
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': csrfToken, 'Content-Type': 'application/json' },
                })
                .then(function (r) { return r.json(); })
                .then(function (resp) {
                    if (resp.error) {
                        btn.innerHTML = '<i class="fa fa-times"></i> Error: ' + escapeHtml(resp.error);
                        btn.disabled = false;
                    } else {
                        btn.innerHTML = '<i class="fa fa-check"></i> Update sent — Wings restarting';
                        btn.className = btn.className.replace('btn-danger', 'btn-success');
                        document.querySelector('#wings-daemon-update-panel .box').className =
                            document.querySelector('#wings-daemon-update-panel .box').className.replace('box-danger', 'box-success');
                    }
                })
                .catch(function () {
                    btn.innerHTML = '<i class="fa fa-times"></i> Request failed';
                    btn.disabled = false;
                });
            });
        })
        .catch(function () {
            // silently ignore version check failure
        });
    })();
    </script>
@endsection
