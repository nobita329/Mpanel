@extends('layouts.admin')

@section('title')
    Wings Stats — {{ $node->name }}
@endsection

@section('content-header')
    <h1>{{ $node->name }}<small>Wings Agent — Live Node Statistics</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li><a href="{{ route('admin.nodes') }}">Nodes</a></li>
        <li><a href="{{ route('admin.nodes.view', $node->id) }}">{{ $node->name }}</a></li>
        <li class="active">Wings Stats</li>
    </ol>
@endsection

@section('content')
<div class="row">
    <div class="col-xs-12">
        <div class="nav-tabs-custom nav-tabs-floating">
            <ul class="nav nav-tabs">
                <li><a href="{{ route('admin.nodes.view', $node->id) }}">About</a></li>
                <li><a href="{{ route('admin.nodes.view.settings', $node->id) }}">Settings</a></li>
                <li><a href="{{ route('admin.nodes.view.configuration', $node->id) }}">Configuration</a></li>
                <li><a href="{{ route('admin.nodes.view.allocation', $node->id) }}">Allocation</a></li>
                <li><a href="{{ route('admin.nodes.view.servers', $node->id) }}">Servers</a></li>
                @if($liveNodeStatsEnabled)
                <li class="active"><a href="{{ route('admin.nodes.view.wings-stats', $node->id) }}">Wings Stats</a></li>
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

{{-- ═══════════════ Control Panel Section (top) ═══════════════ --}}
<div class="row" id="cp-section">
    <div class="col-xs-12">
        <div class="box box-solid" id="cp-box" style="border-color:#3c8dbc;">
            <div class="box-header with-border" style="background:#3c8dbc; color:#fff;">
                <h3 class="box-title" style="color:#fff;"><i class="fa fa-server"></i> Control Panel</h3>
                <div class="box-tools pull-right">
                    <span id="cp-status-badge" class="label label-default" style="font-size:12px; padding:4px 10px;">
                        <i class="fa fa-circle-o-notch fa-spin" style="margin-right:4px;"></i> Checking…
                    </span>
                </div>
            </div>
            <div class="box-body">
                <div class="row">
                    {{-- Wings Service Status --}}
                    <div class="col-sm-5">
                        <h4 style="margin-top:0; color:#555;"><i class="fa fa-cogs"></i> Wings Service</h4>
                        <table class="table table-condensed no-padding" style="margin:0; max-width:360px;">
                            <tbody>
                                <tr>
                                    <td style="width:120px; color:#888; padding:5px 8px;">Service</td>
                                    <td style="padding:5px 8px;"><code id="cp-service-name" style="font-size:12px;">—</code></td>
                                </tr>
                                <tr>
                                    <td style="color:#888; padding:5px 8px;">Status</td>
                                    <td style="padding:5px 8px;">
                                        <span id="cp-service-status-text" class="label label-default">—</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {{-- Wings Service Controls --}}
                    <div class="col-sm-4">
                        <h4 style="margin-top:0; color:#555;"><i class="fa fa-gamepad"></i> Wings Controls</h4>
                        <div class="btn-group" style="margin-top:4px;" id="cp-wings-btns">
                            <button id="cp-btn-start" class="btn btn-success btn-sm" onclick="cpWingsAction('start')" title="Start Wings">
                                <i class="fa fa-play"></i> Start
                            </button>
                            <button id="cp-btn-restart" class="btn btn-warning btn-sm" onclick="cpWingsAction('restart')" title="Restart Wings">
                                <i class="fa fa-refresh"></i> Restart
                            </button>
                            <button id="cp-btn-stop" class="btn btn-danger btn-sm" onclick="cpWingsAction('stop')" title="Stop Wings">
                                <i class="fa fa-stop"></i> Stop
                            </button>
                        </div>
                        <div id="cp-wings-result" style="margin-top:8px; font-size:12px;"></div>
                    </div>

                    {{-- VPS Reboot --}}
                    <div class="col-sm-3">
                        <h4 style="margin-top:0; color:#555;"><i class="fa fa-power-off"></i> VPS</h4>
                        <button class="btn btn-danger btn-sm" onclick="cpShowRebootModal()" style="margin-top:4px;">
                            <i class="fa fa-refresh"></i> Reboot VPS
                        </button>
                        <p style="margin-top:6px; font-size:11px; color:#aaa;">Full system reboot</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

{{-- ═══════════════ Reboot Confirmation Modal ═══════════════ --}}
<div class="modal fade" id="cp-reboot-modal" tabindex="-1" role="dialog" aria-labelledby="cpRebootLabel">
    <div class="modal-dialog" role="document">
        <div class="modal-content" style="border-top: 3px solid #dd4b39;">
            <div class="modal-header" style="background:#dd4b39; color:#fff; padding:12px 20px;">
                <button type="button" class="close" data-dismiss="modal" style="color:#fff; opacity:0.8;">
                    <span>&times;</span>
                </button>
                <h4 class="modal-title" id="cpRebootLabel" style="color:#fff;">
                    <i class="fa fa-exclamation-triangle"></i> Confirm VPS Reboot
                </h4>
            </div>
            <div class="modal-body">
                <div class="callout callout-danger">
                    <h4>Warning: This will reboot the entire VPS!</h4>
                    <p>All running game servers on <strong>{{ $node->name }}</strong> will be interrupted until the node comes back online. This action cannot be undone.</p>
                </div>
                <p>Are you absolutely sure you want to reboot the VPS for this node?</p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default" data-dismiss="modal">
                    <i class="fa fa-times"></i> Cancel
                </button>
                <button type="button" class="btn btn-danger" id="cp-reboot-confirm-btn" onclick="cpConfirmReboot()">
                    <i class="fa fa-refresh"></i> Yes, Reboot VPS
                </button>
            </div>
        </div>
    </div>
</div>

<div id="wings-stats-root">
    <div class="row">
        <div class="col-xs-12">
            <div class="box box-default" id="wings-status-box">
                <div class="box-body" style="padding:20px; text-align:center;">
                    <i class="fa fa-refresh fa-spin fa-2x" id="wings-loading-icon"></i>
                    <p id="wings-status-msg" style="margin-top:10px; color:#888;">Connecting to Wings Agent…</p>
                </div>
            </div>
        </div>
    </div>

    <div id="wings-stats-main" style="display:none;">

        {{-- Row 1: CPU + Memory --}}
        <div class="row">
            <div class="col-sm-6">
                <div class="box box-primary">
                    <div class="box-header with-border">
                        <h3 class="box-title"><i class="fa fa-microchip"></i> CPU</h3>
                        <div class="box-tools pull-right"><span class="badge bg-blue" id="cpu-usage-badge">—</span></div>
                    </div>
                    <div class="box-body">
                        <div class="progress progress-sm" style="margin-bottom:8px;">
                            <div class="progress-bar progress-bar-blue" id="cpu-bar" style="width:0%"></div>
                        </div>
                        <p style="margin:0; font-size:13px;">Total: <strong id="cpu-total">—</strong> &nbsp;|&nbsp; Cores: <strong id="cpu-core-count">—</strong></p>
                        <div id="cpu-per-core" style="margin-top:8px; display:flex; flex-wrap:wrap; gap:4px;"></div>
                    </div>
                </div>
            </div>
            <div class="col-sm-6">
                <div class="box box-success">
                    <div class="box-header with-border">
                        <h3 class="box-title"><i class="fa fa-database"></i> Memory</h3>
                        <div class="box-tools pull-right"><span class="badge bg-green" id="mem-usage-badge">—</span></div>
                    </div>
                    <div class="box-body">
                        <div class="progress progress-sm" style="margin-bottom:8px;">
                            <div class="progress-bar progress-bar-green" id="mem-bar" style="width:0%"></div>
                        </div>
                        <p style="margin:0; font-size:13px;">Used: <strong id="mem-used">—</strong> / <strong id="mem-total">—</strong> &nbsp;|&nbsp; Cached: <strong id="mem-cached">—</strong></p>
                        <p style="margin:4px 0 0; font-size:13px;">Swap: <strong id="swap-used">—</strong> / <strong id="swap-total">—</strong></p>
                    </div>
                </div>
            </div>
        </div>

        {{-- Row 2: Disks --}}
        <div class="row">
            <div class="col-xs-12">
                <div class="box box-danger">
                    <div class="box-header with-border"><h3 class="box-title"><i class="fa fa-hdd-o"></i> Disk Usage</h3></div>
                    <div class="box-body" id="disk-body"><p style="color:#aaa;">Waiting…</p></div>
                </div>
            </div>
        </div>

        {{-- Row 3: Top Processes --}}
        <div class="row">
            <div class="col-xs-12">
                <div class="box box-primary">
                    <div class="box-header with-border"><h3 class="box-title"><i class="fa fa-list"></i> Top 10 Processes <small>(by CPU)</small></h3></div>
                    <div class="box-body table-responsive no-padding">
                        <table class="table table-condensed table-hover">
                            <thead>
                                <tr><th>PID</th><th>Name</th><th>User</th><th>CPU %</th><th>Mem (MiB)</th><th>Mem %</th><th>Status</th></tr>
                            </thead>
                            <tbody id="proc-tbody">
                                <tr><td colspan="7" style="text-align:center;color:#aaa;">Waiting…</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        {{-- Timeframe Selector --}}
        <div class="row">
            <div class="col-xs-12">
                <div class="box box-solid box-default" style="margin-bottom:2px;">
                    <div class="box-header with-border" style="padding:8px 15px;">
                        <h3 class="box-title" style="font-size:13px;"><i class="fa fa-clock-o"></i> Network Chart Time Window</h3>
                        <div class="box-tools pull-right">
                            <div class="btn-group" id="tf-btngroup">
                                <button class="btn btn-xs btn-default" data-tf="1440">24h</button>
                                <button class="btn btn-xs btn-default" data-tf="720">12h</button>
                                <button class="btn btn-xs btn-default" data-tf="300">5h</button>
                                <button class="btn btn-xs btn-primary"  data-tf="60">1h</button>
                                <button class="btn btn-xs btn-default" data-tf="30">30m</button>
                                <button class="btn btn-xs btn-default" data-tf="10">10m</button>
                                <button class="btn btn-xs btn-default" data-tf="5">5m</button>
                                <button class="btn btn-xs btn-default" data-tf="1">1m</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {{-- Row 4: Network Traffic Chart (live + history) --}}
        <div class="row">
            <div class="col-sm-8">
                <div class="box box-warning">
                    <div class="box-header with-border">
                        <h3 class="box-title"><i class="fa fa-line-chart"></i> Network Traffic <small>(live + history, KB/s)</small></h3>
                        <div class="box-tools pull-right">
                            <span id="hist-load-status" style="font-size:11px; color:#aaa; margin-right:6px;"></span>
                        </div>
                    </div>
                    <div class="box-body">
                        <canvas id="chart-traffic" height="80"></canvas>
                        <div class="row" style="margin-top:12px; text-align:center; font-size:12px;">
                            <div class="col-xs-3"><span class="text-muted">↓ Current</span><br><strong id="traf-in-cur" class="text-aqua">—</strong></div>
                            <div class="col-xs-3"><span class="text-muted">↓ Peak</span><br><strong id="traf-in-peak" class="text-blue">—</strong></div>
                            <div class="col-xs-3"><span class="text-muted">↑ Current</span><br><strong id="traf-out-cur" class="text-green">—</strong></div>
                            <div class="col-xs-3"><span class="text-muted">↑ Peak</span><br><strong id="traf-out-peak" class="text-yellow">—</strong></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-sm-4">
                <div class="box box-info">
                    <div class="box-header with-border">
                        <h3 class="box-title"><i class="fa fa-pie-chart"></i> Protocol Distribution</h3>
                    </div>
                    <div class="box-body">
                        <canvas id="chart-proto-bytes" height="120"></canvas>
                        <div id="proto-legend" style="margin-top:8px; font-size:11px;"></div>
                    </div>
                </div>
            </div>
        </div>

        {{-- Row 5: Packet Trend (live + history) + Protocol Packets --}}
        <div class="row">
            <div class="col-sm-8">
                <div class="box box-default">
                    <div class="box-header with-border">
                        <h3 class="box-title"><i class="fa fa-area-chart"></i> Packet Rate <small>(live + history, pkts/s)</small></h3>
                    </div>
                    <div class="box-body">
                        <canvas id="chart-packets" height="80"></canvas>
                        <div class="row" style="margin-top:12px; text-align:center; font-size:12px;">
                            <div class="col-xs-3"><span class="text-muted">↓ Current</span><br><strong id="pkt-in-cur" class="text-aqua">—</strong></div>
                            <div class="col-xs-3"><span class="text-muted">↓ Peak</span><br><strong id="pkt-in-peak" class="text-blue">—</strong></div>
                            <div class="col-xs-3"><span class="text-muted">↑ Current</span><br><strong id="pkt-out-cur" class="text-green">—</strong></div>
                            <div class="col-xs-3"><span class="text-muted">↑ Peak</span><br><strong id="pkt-out-peak" class="text-yellow">—</strong></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-sm-4">
                <div class="box box-default">
                    <div class="box-header with-border">
                        <h3 class="box-title"><i class="fa fa-pie-chart"></i> Protocol Packets</h3>
                    </div>
                    <div class="box-body">
                        <canvas id="chart-proto-pkts" height="120"></canvas>
                        <div id="proto-pkt-legend" style="margin-top:8px; font-size:11px;"></div>
                    </div>
                </div>
            </div>
        </div>

        {{-- Row 5b: Connections Chart (live + history) --}}
        <div class="row">
            <div class="col-xs-12">
                <div class="box box-info">
                    <div class="box-header with-border">
                        <h3 class="box-title"><i class="fa fa-users"></i> Connection Count <small>(live + history)</small></h3>
                    </div>
                    <div class="box-body">
                        <canvas id="chart-conns" height="60"></canvas>
                        <div class="row" style="margin-top:12px; text-align:center; font-size:12px;">
                            <div class="col-xs-3"><span class="text-muted">Incoming Now</span><br><strong id="conn-in-cur" class="text-aqua">—</strong></div>
                            <div class="col-xs-3"><span class="text-muted">Incoming Peak</span><br><strong id="conn-in-peak" class="text-blue">—</strong></div>
                            <div class="col-xs-3"><span class="text-muted">Outgoing Now</span><br><strong id="conn-out-cur" class="text-green">—</strong></div>
                            <div class="col-xs-3"><span class="text-muted">Outgoing Peak</span><br><strong id="conn-out-peak" class="text-yellow">—</strong></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {{-- Row 6: Protocol Distribution Detail Table --}}
        <div class="row">
            <div class="col-xs-12">
                <div class="box box-primary">
                    <div class="box-header with-border">
                        <h3 class="box-title"><i class="fa fa-table"></i> Protocol Distribution Detail</h3>
                    </div>
                    <div class="box-body table-responsive no-padding">
                        <table class="table table-condensed table-hover" id="proto-detail-table">
                            <thead>
                                <tr>
                                    <th>Protocol</th>
                                    <th>↓ Bytes In</th><th>↑ Bytes Out</th>
                                    <th>↓ Pkts In</th><th>↑ Pkts Out</th>
                                    <th>In %</th><th>Out %</th>
                                </tr>
                            </thead>
                            <tbody id="proto-detail-tbody">
                                <tr><td colspan="7" style="text-align:center;color:#aaa;">Waiting…</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        {{-- Row 7: Network Interfaces --}}
        <div class="row">
            <div class="col-sm-5">
                <div class="box box-warning">
                    <div class="box-header with-border">
                        <h3 class="box-title"><i class="fa fa-exchange"></i> Network Interfaces</h3>
                    </div>
                    <div class="box-body table-responsive no-padding">
                        <table class="table table-condensed table-hover">
                            <thead>
                                <tr><th>Interface</th><th>↓ KB/s</th><th>↑ KB/s</th><th>Total Recv</th><th>Total Sent</th></tr>
                            </thead>
                            <tbody id="net-tbody">
                                <tr><td colspan="5" style="text-align:center;color:#aaa;">Waiting…</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div class="col-sm-3">
                <div class="box box-info">
                    <div class="box-header with-border"><h3 class="box-title"><i class="fa fa-link"></i> Connections</h3></div>
                    <div class="box-body">
                        <div style="font-size:13px; margin-bottom:6px;">
                            <span class="label label-info" style="font-size:12px; margin-right:4px;">TCP</span>
                            <strong id="conn-tcp">—</strong>
                            <small class="text-muted" style="margin-left:6px;">
                                &darr;<span id="conn-tcp-in" title="Incoming (clients connected to this node)">—</span>
                                &uarr;<span id="conn-tcp-out" title="Outgoing (connections initiated by this node)">—</span>
                            </small>
                        </div>
                        <div style="font-size:13px;">
                            <span class="label label-warning" style="font-size:12px; margin-right:4px;">UDP</span>
                            <strong id="conn-udp">—</strong>
                            <small class="text-muted" style="margin-left:6px;">
                                &darr;<span id="conn-udp-in" title="Server UDP sockets (port &lt; ephemeral range)">—</span>
                                &uarr;<span id="conn-udp-out" title="Client UDP sockets (ephemeral port)">—</span>
                            </small>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-sm-4">
                <div class="box box-default">
                    <div class="box-header with-border"><h3 class="box-title"><i class="fa fa-clock-o"></i> Uptime</h3></div>
                    <div class="box-body">
                        <p style="font-size:15px; font-weight:bold; margin:4px 0;" id="uptime-str">—</p>
                        <p style="font-size:12px; color:#888; margin:0;">Agent version: <span id="agent-version">—</span></p>
                        <p style="font-size:11px; color:#bbb; margin:0;" id="last-updated">Last update: —</p>
                    </div>
                </div>
            </div>
        </div>

        {{-- Row 8: Open Ports Table --}}
        <div class="row">
            <div class="col-xs-12">
                <div class="box box-danger">
                    <div class="box-header with-border">
                        <h3 class="box-title"><i class="fa fa-list-ol"></i> Open Ports <small id="ports-count-badge"></small></h3>
                        <div class="box-tools pull-right">
                            <button class="btn btn-xs btn-default" id="btn-refresh-ports"><i class="fa fa-refresh"></i> Refresh</button>
                        </div>
                    </div>
                    <div style="padding:8px 15px 8px;border-bottom:1px solid #f4f4f4;">
                        <div class="input-group input-group-sm">
                            <span class="input-group-addon"><i class="fa fa-search"></i></span>
                            <input type="text" id="ports-search" class="form-control" placeholder="Filter by port, protocol, state, PID, process name…">
                            <span class="input-group-btn">
                                <button class="btn btn-default" id="btn-ports-search-clear" title="Clear filter"><i class="fa fa-times"></i></button>
                            </span>
                        </div>
                    </div>
                    <div class="box-body table-responsive no-padding">
                        <table class="table table-condensed table-hover">
                            <thead>
                                <tr>
                                    <th>Port</th><th>Protocol</th><th>State</th>
                                    <th>PID</th><th>Process</th>
                                    <th>Bytes In</th><th>Bytes Out</th><th></th>
                                </tr>
                            </thead>
                            <tbody id="ports-tbody">
                                <tr><td colspan="8" style="text-align:center;color:#aaa;">Loading…</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

    </div>{{-- /#wings-stats-main --}}
</div>{{-- /#wings-stats-root --}}
@endsection

@section('footer-scripts')
@parent
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
<script>
(function () {
"use strict";

var nodeId      = {{ $node->id }};
var ticketUrl   = '{{ route('admin.nodes.wings-agent.ticket', $node->id) }}';
var portBase    = '{{ url('admin/nodes/view/' . $node->id . '/wings-stats/port') }}';
// Panel proxy URLs (kept for actions that need CSRF / panel-side logic)
var cpControlUrl = '{{ route('admin.nodes.wings-service.control', $node->id) }}';
var cpRebootUrl  = '{{ route('admin.nodes.system.reboot', $node->id) }}';
var csrfToken    = '{{ csrf_token() }}';

// ── Agent-direct state ────────────────────────────────────────────────
var agentTicket  = null;
var agentBaseUrl = null;
var agentWsUrl   = null;
var agentWs      = null;
var ticketRefreshTimer = null;
var agentWsReconnectTimer = null;
var cpStatusTimer = null;
var pageReloadTimer = null;
var historyRetryTimer = null;
var cpActionTimers = [];
var initialized = false;
var shuttingDown = false;

function fetchTicket() {
    if (shuttingDown) return Promise.reject(new Error('Page is closing'));
    return fetch(ticketUrl, {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
    })
    .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
    })
    .then(function(d) {
        if (shuttingDown) return d;
        agentTicket  = d.ticket;
        agentBaseUrl = d.base_url;
        agentWsUrl   = d.ws_url;
        if (ticketRefreshTimer) clearTimeout(ticketRefreshTimer);
        var refreshMs = Math.max(30000, ((parseInt(d.ttl, 10) || 120) - 10) * 1000);
        ticketRefreshTimer = setTimeout(function() {
            if (shuttingDown) return;
            fetchTicket().then(function() {
                if (!shuttingDown && agentWs && agentWs.readyState === WebSocket.OPEN) {
                    agentWs.close(1000, 'ticket refresh');
                }
            }).catch(function() {});
        }, refreshMs);
        return d;
    });
}

function agentGet(path) {
    if (!agentBaseUrl || !agentTicket) return Promise.reject(new Error('No ticket'));
    return fetch(agentBaseUrl + path + (path.indexOf('?') >= 0 ? '&' : '?') + 'ticket=' + encodeURIComponent(agentTicket), {
        headers: { 'Accept': 'application/json' }
    });
}

function agentPost(path, body) {
    if (!agentBaseUrl || !agentTicket) return Promise.reject(new Error('No ticket'));
    return fetch(agentBaseUrl + path + (path.indexOf('?') >= 0 ? '&' : '?') + 'ticket=' + encodeURIComponent(agentTicket), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body)
    });
}

// ── Control Panel ─────────────────────────────────────────────────────
function cpSetStatus(active, statusText, serviceName) {
    var badge = document.getElementById('cp-status-badge');
    if (active) {
        badge.className = 'label label-success';
        badge.innerHTML = '<i class="fa fa-check-circle" style="margin-right:4px;"></i> Wings: Running';
    } else if (statusText === 'unknown' || !serviceName) {
        badge.className = 'label label-default';
        badge.innerHTML = '<i class="fa fa-question-circle" style="margin-right:4px;"></i> Wings: Unknown';
    } else {
        badge.className = 'label label-danger';
        badge.innerHTML = '<i class="fa fa-times-circle" style="margin-right:4px;"></i> Wings: Stopped';
    }

    var nameEl   = document.getElementById('cp-service-name');
    var statusEl = document.getElementById('cp-service-status-text');
    if (nameEl)   nameEl.textContent = serviceName || '—';
    if (statusEl) {
        statusEl.textContent = statusText || '—';
        statusEl.className   = 'label ' + (active ? 'label-success' : (statusText === 'inactive' ? 'label-danger' : 'label-warning'));
    }

    // Enable / disable action buttons based on state
    var btnStart   = document.getElementById('cp-btn-start');
    var btnRestart = document.getElementById('cp-btn-restart');
    var btnStop    = document.getElementById('cp-btn-stop');
    if (btnStart)   btnStart.disabled   = active;
    if (btnRestart) btnRestart.disabled = !active;
    if (btnStop)    btnStop.disabled    = !active;
}

function cpFetchStatus() {
    if (shuttingDown) return;
    agentGet('/wings-service/status')
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (shuttingDown) return;
        cpSetStatus(d.active === true, d.status || '—', d.service || '');
    })
    .catch(function() {
        if (shuttingDown) return;
        var badge = document.getElementById('cp-status-badge');
        if (badge) {
            badge.className = 'label label-warning';
            badge.innerHTML = '<i class="fa fa-exclamation-triangle" style="margin-right:4px;"></i> Wings: Agent Unreachable';
        }
    });
}

function scheduleCpStatusRefresh(delay) {
    var timer = setTimeout(function() {
        cpActionTimers = cpActionTimers.filter(function(item) { return item !== timer; });
        cpFetchStatus();
    }, delay);
    cpActionTimers.push(timer);
}

function cpSetBusy(busy) {
    ['cp-btn-start','cp-btn-restart','cp-btn-stop'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.disabled = busy;
    });
}

function cpWingsAction(action) {
    var resultEl = document.getElementById('cp-wings-result');
    cpSetBusy(true);
    if (resultEl) resultEl.innerHTML = '<span class="text-muted"><i class="fa fa-spinner fa-spin"></i> Sending ' + action + ' command…</span>';

    agentPost('/wings-service/control', { action: action })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.success) {
            if (resultEl) resultEl.innerHTML = '<span class="text-success"><i class="fa fa-check"></i> ' + action.charAt(0).toUpperCase() + action.slice(1) + ' command sent successfully.</span>';
        } else {
            if (resultEl) resultEl.innerHTML = '<span class="text-danger"><i class="fa fa-times"></i> Error: ' + (d.error || 'Unknown error') + '</span>';
        }
        // Re-poll status after a short delay to reflect the new state
        scheduleCpStatusRefresh(2500);
        scheduleCpStatusRefresh(6000);
    })
    .catch(function(err) {
        if (resultEl) resultEl.innerHTML = '<span class="text-danger"><i class="fa fa-times"></i> Request failed: ' + err + '</span>';
        cpSetBusy(false);
    });
}

function cpShowRebootModal() {
    var modal = document.getElementById('cp-reboot-modal');
    if (modal && typeof jQuery !== 'undefined') {
        jQuery(modal).modal('show');
    }
}

function cpConfirmReboot() {
    var btn = document.getElementById('cp-reboot-confirm-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Rebooting…'; }

    agentPost('/system/reboot', { confirm: true })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        var modal = document.getElementById('cp-reboot-modal');
        if (modal && typeof jQuery !== 'undefined') {
            jQuery(modal).modal('hide');
        }
        if (d.success) {
            var badge = document.getElementById('cp-status-badge');
            if (badge) {
                badge.className = 'label label-warning';
                badge.innerHTML = '<i class="fa fa-refresh fa-spin" style="margin-right:4px;"></i> Rebooting…';
            }
            // Show toast-style alert
            var alert = document.createElement('div');
            alert.className = 'alert alert-warning alert-dismissible';
            alert.style.cssText = 'position:fixed;top:70px;right:20px;z-index:9999;min-width:320px;box-shadow:0 2px 10px rgba(0,0,0,0.3);';
            alert.innerHTML = '<button type="button" class="close" data-dismiss="alert">&times;</button><strong><i class="fa fa-refresh fa-spin"></i> VPS Rebooting!</strong> The node will be offline for a short time.';
            document.body.appendChild(alert);
            setTimeout(function() {
                if (alert.parentNode) alert.parentNode.removeChild(alert);
            }, 15000);
        } else {
            alert('Reboot failed: ' + (d.error || 'Unknown error'));
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa fa-refresh"></i> Yes, Reboot VPS'; }
        }
    })
    .catch(function(err) {
        alert('Reboot request failed: ' + err);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa fa-refresh"></i> Yes, Reboot VPS'; }
    });
}

// Poll status every 15 seconds
cpFetchStatus();
cpStatusTimer = setInterval(cpFetchStatus, 15000);

// Expose control-panel functions to global scope (required by inline onclick handlers)
window.cpWingsAction    = cpWingsAction;
window.cpShowRebootModal = cpShowRebootModal;
window.cpConfirmReboot  = cpConfirmReboot;

// ── helpers ──────────────────────────────────────────────────────────
function fmtBytes(b) {
    b = +b||0;
    if (b < 1024) return b+' B';
    if (b < 1048576) return (b/1024).toFixed(1)+' KB';
    if (b < 1073741824) return (b/1048576).toFixed(1)+' MB';
    return (b/1073741824).toFixed(2)+' GB';
}
function fmtKB(kb) {
    kb = +kb||0;
    if (kb < 1024) return kb.toFixed(1)+' KB/s';
    return (kb/1024).toFixed(2)+' MB/s';
}
function fmtUptime(s) {
    s = Math.floor(+s||0);
    var d=Math.floor(s/86400), h=Math.floor((s%86400)/3600), m=Math.floor((s%3600)/60), sec=s%60;
    var p=[]; if(d)p.push(d+'d'); if(h)p.push(h+'h'); if(m)p.push(m+'m'); p.push(sec+'s');
    return p.join(' ');
}
function fmtTime(ms) {
    var d = new Date(ms);
    return d.getHours().toString().padStart(2,'0')+':'+
           d.getMinutes().toString().padStart(2,'0')+':'+
           d.getSeconds().toString().padStart(2,'0');
}
function colorForPct(pct) { return pct>=90?'danger':pct>=70?'warning':'success'; }
function barClass(pct)    { return pct>=90?'progress-bar-red':pct>=70?'progress-bar-yellow':'progress-bar-blue'; }
function escHtml(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── History buffer ────────────────────────────────────────────────────
// Stores {at:ms, recvKB, sentKB, pktsIn, pktsOut} for all SSE + loaded history points
var historyBuffer  = [];
var activeMinutes  = 60;   // default 1h window

function addToHistory(pt) {
    historyBuffer.push(pt);
    if (historyBuffer.length > 50000) historyBuffer.shift();
}
function applyTimeframe(minutes) {
    activeMinutes = minutes;
    document.querySelectorAll('#tf-btngroup [data-tf]').forEach(function(btn) {
        var tf = parseInt(btn.getAttribute('data-tf'), 10);
        btn.className = 'btn btn-xs ' + (tf === minutes ? 'btn-primary' : 'btn-default');
    });
    redrawLineCharts();
}
function redrawLineCharts() {
    var now    = Date.now();
    var cutoff = now - (activeMinutes * 60000);
    var pts    = historyBuffer.filter(function(p) { return p.at >= cutoff; });
    var labels = pts.map(function(p) { return fmtTime(p.at); });

    chartTraffic.data.labels           = labels;
    chartTraffic.data.datasets[0].data = pts.map(function(p) { return p.recvKB; });
    chartTraffic.data.datasets[1].data = pts.map(function(p) { return p.sentKB; });
    chartTraffic.update('none');

    chartPackets.data.labels           = labels;
    chartPackets.data.datasets[0].data = pts.map(function(p) { return p.pktsIn; });
    chartPackets.data.datasets[1].data = pts.map(function(p) { return p.pktsOut; });
    chartPackets.update('none');

    chartConns.data.labels           = labels;
    chartConns.data.datasets[0].data = pts.map(function(p) { return p.connIn || 0; });
    chartConns.data.datasets[1].data = pts.map(function(p) { return p.connOut || 0; });
    chartConns.update('none');

    // Connection stat boxes
    var safeMax = function(arr) { return arr.length ? Math.max.apply(null, arr) : 0; };
    var connIns  = pts.map(function(p) { return p.connIn || 0; });
    var connOuts = pts.map(function(p) { return p.connOut || 0; });
    var lastPt   = pts.length > 0 ? pts[pts.length - 1] : null;
    var ciCur = document.getElementById('conn-in-cur');
    var coCur = document.getElementById('conn-out-cur');
    var ciPeak = document.getElementById('conn-in-peak');
    var coPeak = document.getElementById('conn-out-peak');
    if (ciCur)  ciCur.textContent  = lastPt ? (lastPt.connIn  || 0) : '—';
    if (coCur)  coCur.textContent  = lastPt ? (lastPt.connOut || 0) : '—';
    if (ciPeak) ciPeak.textContent = safeMax(connIns).toString();
    if (coPeak) coPeak.textContent = safeMax(connOuts).toString();
}

// ── Chart.js setup ────────────────────────────────────────────────────
function makeDataset(label, color, fill) {
    return {
        label: label, data: [],
        borderColor: color, backgroundColor: fill || 'transparent',
        borderWidth: 2, pointRadius: 0, tension: 0.3, fill: !!fill
    };
}
function initLineChart(canvasId, ds) {
    return new Chart(document.getElementById(canvasId).getContext('2d'), {
        type: 'line',
        data: { labels: [], datasets: ds },
        options: {
            animation: false, responsive: true,
            plugins: { legend: { display: true, labels: { boxWidth: 12, font: { size: 11 } } } },
            scales: {
                x: { display: true, ticks: { maxTicksLimit: 10, font: { size: 9 }, maxRotation: 0 } },
                y: { beginAtZero: true, ticks: { font: { size: 11 } } }
            }
        }
    });
}
var chartTraffic = initLineChart('chart-traffic', [
    makeDataset('↓ Recv KB/s', '#00c0ef', 'rgba(0,192,239,0.1)'),
    makeDataset('↑ Send KB/s', '#00a65a', 'rgba(0,166,90,0.1)')
]);
var chartPackets = initLineChart('chart-packets', [
    makeDataset('↓ Pkts/s', '#3c8dbc', 'rgba(60,141,188,0.1)'),
    makeDataset('↑ Pkts/s', '#f39c12', 'rgba(243,156,18,0.1)')
]);
var chartConns = initLineChart('chart-conns', [
    makeDataset('Incoming', '#f39c12', 'rgba(243,156,18,0.1)'),
    makeDataset('Outgoing', '#00c0ef', 'rgba(0,192,239,0.1)')
]);
function initPieChart(canvasId) {
    return new Chart(document.getElementById(canvasId).getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['TCP','UDP','ICMP','Other'],
            datasets: [{ data:[0,0,0,0], backgroundColor:['#3c8dbc','#00a65a','#f39c12','#dd4b39'], borderWidth:2 }]
        },
        options: { animation:false, responsive:true, plugins:{ legend:{display:false} } }
    });
}
var chartProtoBytes = initPieChart('chart-proto-bytes');
var chartProtoPkts  = initPieChart('chart-proto-pkts');

// ── Peaks + previous proto snapshot for rate calculation ────────────
var peaks = { trafficIn: 0, trafficOut: 0, pktsIn: 0, pktsOut: 0 };
var prevProtoSnap = null;  // previous cumulative proto counters
var prevProtoAt   = null;  // timestamp of previous proto snapshot (ms)

// ── Render functions ──────────────────────────────────────────────────
function renderCPU(cpu) {
    var pct = Math.min(100, Math.max(0, cpu.usage_percent||0));
    document.getElementById('cpu-usage-badge').textContent = pct.toFixed(1)+'%';
    var bar = document.getElementById('cpu-bar');
    bar.style.width = pct+'%'; bar.className = 'progress-bar '+barClass(pct);
    document.getElementById('cpu-total').textContent = pct.toFixed(1)+'%';
    var perCore = cpu.per_core||[];
    document.getElementById('cpu-core-count').textContent = perCore.length;
    document.getElementById('cpu-per-core').innerHTML = perCore.map(function(v,i){
        var cp = Math.min(100,Math.max(0,v));
        return '<span style="background:#3c8dbc;color:#fff;border-radius:3px;padding:2px 5px;font-size:11px;" title="Core '+i+': '+cp.toFixed(1)+'%">C'+i+': '+cp.toFixed(1)+'%</span>';
    }).join('');
}
function renderMemory(mem) {
    var pct = Math.min(100, Math.max(0, mem.used_percent||0));
    document.getElementById('mem-usage-badge').textContent = pct.toFixed(1)+'%';
    var bar = document.getElementById('mem-bar');
    bar.style.width = pct+'%'; bar.className = 'progress-bar '+barClass(pct);
    document.getElementById('mem-used').textContent   = (mem.used_mb||0).toFixed(0)+' MiB';
    document.getElementById('mem-total').textContent  = (mem.total_mb||0).toFixed(0)+' MiB';
    document.getElementById('mem-cached').textContent = (mem.cached_mb||0).toFixed(0)+' MiB';
    document.getElementById('swap-used').textContent  = (mem.swap_used_mb||0).toFixed(0)+' MiB';
    document.getElementById('swap-total').textContent = (mem.swap_total_mb||0).toFixed(0)+' MiB';
}
function renderDisks(disks) {
    var html = '<div class="row">';
    (disks||[]).forEach(function(d){
        var pct = Math.min(100,Math.max(0,d.used_percent||0));
        html += '<div class="col-sm-4" style="margin-bottom:12px;">'
            +'<small><b>'+escHtml(d.mount)+'</b> <span style="color:#999;">'+escHtml(d.device)+'</span></small>'
            +'<div class="progress progress-sm" title="'+pct.toFixed(1)+'%" style="margin:4px 0 2px;">'
            +'<div class="progress-bar progress-bar-'+colorForPct(pct)+'" style="width:'+pct+'%"></div></div>'
            +'<small>'+d.used_gb+' / '+d.total_gb+' GiB ('+pct.toFixed(1)+'%)</small></div>';
    });
    html += '</div>';
    document.getElementById('disk-body').innerHTML = html;
}
function renderNetwork(nets) {
    var rows = (nets||[]).map(function(n){
        return '<tr>'
            +'<td><code>'+escHtml(n.interface)+'</code></td>'
            +'<td>'+fmtKB(n.speed_recv_kb)+'</td>'
            +'<td>'+fmtKB(n.speed_send_kb)+'</td>'
            +'<td>'+fmtBytes(n.bytes_recv)+'</td>'
            +'<td>'+fmtBytes(n.bytes_sent)+'</td>'
            +'</tr>';
    }).join('');
    document.getElementById('net-tbody').innerHTML = rows || '<tr><td colspan="5" style="text-align:center;color:#aaa;">No interfaces.</td></tr>';

    var totalRecvKB = 0, totalSentKB = 0;
    (nets||[]).forEach(function(n){ totalRecvKB += n.speed_recv_kb||0; totalSentKB += n.speed_send_kb||0; });
    if (totalRecvKB > peaks.trafficIn)  peaks.trafficIn  = totalRecvKB;
    if (totalSentKB > peaks.trafficOut) peaks.trafficOut = totalSentKB;
    document.getElementById('traf-in-cur').textContent   = fmtKB(totalRecvKB);
    document.getElementById('traf-in-peak').textContent  = fmtKB(peaks.trafficIn);
    document.getElementById('traf-out-cur').textContent  = fmtKB(totalSentKB);
    document.getElementById('traf-out-peak').textContent = fmtKB(peaks.trafficOut);
    return { recvKB: totalRecvKB, sentKB: totalSentKB };
}
function renderProto(proto) {
    if (!proto) return { pktsIn: 0, pktsOut: 0 };

    var tcpPi  = proto.tcp_in_segs       || 0;
    var tcpPo  = proto.tcp_out_segs      || 0;
    var udpPi  = proto.udp_in_datagrams  || 0;
    var udpPo  = proto.udp_out_datagrams || 0;
    var icmpPi = proto.icmp_in_msgs  || 0;
    var icmpPo = proto.icmp_out_msgs || 0;
    var otherPi = 0, otherPo = 0;

    var totIn  = proto.ip_in_receive   || 0;
    var totOut = proto.ip_out_requests || 0;

    // Real per-protocol byte counters are only available when the kernel exposes
    // TCP InOctets in /proc/net/snmp (Linux ≥ 4.14 with CONFIG_IP_TCP_STATS).
    // When absent (tcp_in_bytes === 0), we must avoid subtracting segment×512
    // estimates from the real ip_in_receive total — that gap shows up as a
    // phantom "Other = 98 GB" row.  Instead, distribute ip_in_receive
    // proportionally across protocols by packet share.
    var tcpB, tcpBo, udpB, udpBo, icmpB, icmpBo;
    var otherB = 0, otherBo = 0;
    var bytesEstimated = false;

    if ((proto.tcp_in_bytes || 0) > 0) {
        // Real byte counters available — use them directly.
        tcpB   = proto.tcp_in_bytes  || 0;
        tcpBo  = proto.tcp_out_bytes || 0;
        udpB   = proto.udp_in_bytes  || 0;
        udpBo  = proto.udp_out_bytes || 0;
        icmpB  = 0;
        icmpBo = 0;
        otherB  = Math.max(0, totIn  - tcpB  - udpB);
        otherBo = Math.max(0, totOut - tcpBo - udpBo);
    } else if (totIn > 0) {
        // No real per-protocol byte counters.  Distribute ip_in_receive
        // proportionally by packet count — this keeps the total accurate and
        // eliminates the misleading "Other" residual (Other has 0 packets, so
        // it should also have 0 bytes).
        bytesEstimated = true;
        var totPktsIn  = tcpPi + udpPi + icmpPi || 1;
        var totPktsOut = tcpPo + udpPo + icmpPo || 1;
        tcpB   = Math.round(tcpPi  / totPktsIn  * totIn);
        udpB   = Math.round(udpPi  / totPktsIn  * totIn);
        icmpB  = Math.round(icmpPi / totPktsIn  * totIn);
        tcpBo  = Math.round(tcpPo  / totPktsOut * totOut);
        udpBo  = Math.round(udpPo  / totPktsOut * totOut);
        icmpBo = Math.round(icmpPo / totPktsOut * totOut);
    } else {
        // No ip_in_receive either — fall back to fixed-size estimates.
        bytesEstimated = true;
        tcpB   = tcpPi  * 512;  tcpBo  = tcpPo  * 512;
        udpB   = udpPi  * 512;  udpBo  = udpPo  * 512;
        icmpB  = icmpPi * 84;   icmpBo = icmpPo * 84;
        totIn  = tcpB  + udpB  + icmpB;
        totOut = tcpBo + udpBo + icmpBo;
    }

    // Compute per-second packet rates by diffing consecutive cumulative counters
    var rateIn = 0, rateOut = 0;
    var nowMs = Date.now();
    if (prevProtoSnap !== null && prevProtoAt !== null) {
        var dt = (nowMs - prevProtoAt) / 1000;
        if (dt > 0) {
            var pTcpI  = prevProtoSnap.tcp_in_segs       || 0;
            var pTcpO  = prevProtoSnap.tcp_out_segs      || 0;
            var pUdpI  = prevProtoSnap.udp_in_datagrams  || 0;
            var pUdpO  = prevProtoSnap.udp_out_datagrams || 0;
            var pIcmpI = prevProtoSnap.icmp_in_msgs      || 0;
            var pIcmpO = prevProtoSnap.icmp_out_msgs     || 0;
            rateIn  = Math.max(0, (tcpPi+udpPi+icmpPi) - (pTcpI+pUdpI+pIcmpI)) / dt;
            rateOut = Math.max(0, (tcpPo+udpPo+icmpPo) - (pTcpO+pUdpO+pIcmpO)) / dt;
        }
    }
    prevProtoSnap = proto;
    prevProtoAt   = nowMs;

    if (peaks.pktsIn  < rateIn)  peaks.pktsIn  = rateIn;
    if (peaks.pktsOut < rateOut) peaks.pktsOut = rateOut;
    document.getElementById('pkt-in-cur').textContent   = rateIn.toFixed(1)+'/s';
    document.getElementById('pkt-in-peak').textContent  = peaks.pktsIn.toFixed(1)+'/s';
    document.getElementById('pkt-out-cur').textContent  = rateOut.toFixed(1)+'/s';
    document.getElementById('pkt-out-peak').textContent = peaks.pktsOut.toFixed(1)+'/s';

    var colors  = ['#3c8dbc','#00a65a','#f39c12','#dd4b39'];
    // Only include "Other" in charts/legend when it has actual bytes (real counters available)
    var chartByteData = otherB > 0 ? [tcpB,udpB,icmpB,otherB] : [tcpB,udpB,icmpB];
    var chartPktData  = otherPi > 0 ? [tcpPi,udpPi,icmpPi,otherPi] : [tcpPi,udpPi,icmpPi];
    var chartColors   = otherB > 0 ? colors : colors.slice(0,3);
    chartProtoBytes.data.labels   = otherB  > 0 ? ['TCP','UDP','ICMP','Other'] : ['TCP','UDP','ICMP'];
    chartProtoPkts.data.labels    = otherPi > 0 ? ['TCP','UDP','ICMP','Other'] : ['TCP','UDP','ICMP'];
    chartProtoBytes.data.datasets[0].backgroundColor = chartColors;
    chartProtoPkts.data.datasets[0].backgroundColor  = chartColors;
    chartProtoBytes.data.datasets[0].data = chartByteData;
    chartProtoBytes.update('none');
    chartProtoPkts.data.datasets[0].data  = chartPktData;
    chartProtoPkts.update('none');

    var byteTot = (tcpB+udpB+icmpB+otherB)   || 1;
    var pktTot  = (tcpPi+udpPi+icmpPi+otherPi) || 1;
    var legendProtos = [['TCP',tcpB,0],['UDP',udpB,1],['ICMP',icmpB,2]];
    if (otherB > 0) legendProtos.push(['Other',otherB,3]);
    document.getElementById('proto-legend').innerHTML =
        legendProtos.map(function(r){
            return '<span style="display:inline-block;width:10px;height:10px;background:'+colors[r[2]]+';margin-right:3px;border-radius:2px;"></span>'
                +r[0]+': '+(bytesEstimated?'~':'')+fmtBytes(r[1])+' ('+((r[1]/byteTot)*100).toFixed(1)+'%) ';
        }).join('');
    document.getElementById('proto-pkt-legend').innerHTML =
        [['TCP',tcpPi],['UDP',udpPi],['ICMP',icmpPi],['Other',otherPi]].filter(function(r){ return r[1]>0||r[0]!=='Other'; }).map(function(r,i){
            return '<span style="display:inline-block;width:10px;height:10px;background:'+colors[Math.min(i,3)]+';margin-right:3px;border-radius:2px;"></span>'
                +r[0]+': '+r[1].toLocaleString()+' ('+((r[1]/pktTot)*100).toFixed(1)+'%) ';
        }).join('');

    var totalBytesIn = totIn || 1, totalBytesOut = totOut || 1;
    var est = bytesEstimated ? ' <span title="Bytes are estimated from packet counts — kernel does not expose per-protocol byte counters" style="color:#aaa;font-size:10px;">(est.)</span>' : '';
    var tableRows = [
        ['TCP',  tcpB,  tcpBo,  tcpPi,  tcpPo,  'label-info'],
        ['UDP',  udpB,  udpBo,  udpPi,  udpPo,  'label-warning'],
        ['ICMP', icmpB, icmpBo, icmpPi, icmpPo, 'label-default'],
    ];
    // Only add Other row when it has real bytes (non-zero and real counters)
    if (otherB > 0 || otherPi > 0) {
        tableRows.push(['Other', otherB, otherBo, otherPi, otherPo, 'label-danger']);
    }
    tableRows.push(['<b>Total</b>', tcpB+udpB+icmpB+otherB, tcpBo+udpBo+icmpBo+otherBo,
        tcpPi+udpPi+icmpPi, tcpPo+udpPo+icmpPo, 'label-primary']);
    var rows = tableRows.map(function(r){
        var isTotal = r[0] === '<b>Total</b>';
        var inPct  = ((r[1]/(totalBytesIn||1))*100).toFixed(1);
        var outPct = ((r[2]/(totalBytesOut||1))*100).toFixed(1);
        var byteInStr  = (bytesEstimated && !isTotal) ? '~'+fmtBytes(r[1]) : fmtBytes(r[1]);
        var byteOutStr = (bytesEstimated && !isTotal) ? '~'+fmtBytes(r[2]) : fmtBytes(r[2]);
        return '<tr>'
            +'<td><span class="label '+r[5]+'">'+r[0]+'</span>'+(isTotal?est:'')+'</td>'
            +'<td>'+byteInStr+'</td><td>'+byteOutStr+'</td>'
            +'<td>'+Number(r[3]).toLocaleString()+'</td><td>'+Number(r[4]).toLocaleString()+'</td>'
            +'<td>'+(isTotal?'100%':inPct+'%')+'</td>'
            +'<td>'+(isTotal?'100%':outPct+'%')+'</td>'
            +'</tr>';
    }).join('');
    document.getElementById('proto-detail-tbody').innerHTML = rows;
    return { pktsIn: rateIn, pktsOut: rateOut };
}
function renderConnections(conns) {
    document.getElementById('conn-tcp').textContent     = (conns&&conns.tcp_total!=null)    ? conns.tcp_total    : '—';
    document.getElementById('conn-udp').textContent     = (conns&&conns.udp_total!=null)    ? conns.udp_total    : '—';
    document.getElementById('conn-tcp-in').textContent  = (conns&&conns.tcp_incoming!=null) ? conns.tcp_incoming : '—';
    document.getElementById('conn-tcp-out').textContent = (conns&&conns.tcp_outgoing!=null) ? conns.tcp_outgoing : '—';
    document.getElementById('conn-udp-in').textContent  = (conns&&conns.udp_incoming!=null) ? conns.udp_incoming : '—';
    document.getElementById('conn-udp-out').textContent = (conns&&conns.udp_outgoing!=null) ? conns.udp_outgoing : '—';
}
function renderUptime(seconds, version, ts) {
    document.getElementById('uptime-str').textContent    = fmtUptime(seconds);
    document.getElementById('agent-version').textContent = version||'—';
    document.getElementById('last-updated').textContent  = 'Last update: '+(new Date(ts)).toLocaleTimeString();
}
function renderProcesses(procs) {
    var rows = (procs||[]).map(function(p){
        var sc = p.status==='S' ? '#3c8dbc' : (p.status==='R' ? '#00a65a' : '#aaa');
        return '<tr>'
            +'<td><code>'+p.pid+'</code></td>'
            +'<td><b>'+escHtml(p.name)+'</b></td>'
            +'<td>'+escHtml(p.user||'—')+'</td>'
            +'<td><span class="badge bg-blue">'+(p.cpu_percent||0).toFixed(1)+'%</span></td>'
            +'<td>'+(p.mem_mb||0).toFixed(1)+'</td>'
            +'<td>'+(p.mem_percent||0).toFixed(2)+'%</td>'
            +'<td><span style="color:'+sc+';font-weight:bold;">'+escHtml(p.status||'—')+'</span></td>'
            +'</tr>';
    }).join('');
    document.getElementById('proc-tbody').innerHTML = rows||'<tr><td colspan="7" style="text-align:center;color:#aaa;">No data.</td></tr>';
}

function renderStats(data) {
    renderCPU(data.cpu||{});
    renderMemory(data.memory||{});
    renderDisks(data.disks);
    var net   = renderNetwork(data.network);
    var proto = renderProto(data.proto);
    // Append live point to history buffer and redraw charts
    var connData = data.connections || {};
    var connIn   = (connData.tcp_incoming || 0) + (connData.udp_incoming || 0);
    var connOut  = (connData.tcp_outgoing || 0) + (connData.udp_outgoing || 0);
    addToHistory({
        at:      Date.now(),
        recvKB:  net   ? net.recvKB   : 0,
        sentKB:  net   ? net.sentKB   : 0,
        pktsIn:  proto ? proto.pktsIn  : 0,
        pktsOut: proto ? proto.pktsOut : 0,
        connIn:  connIn,
        connOut: connOut
    });
    redrawLineCharts();
    renderConnections(data.connections);
    renderUptime(data.uptime_seconds||0, data.version, data.timestamp);
    renderProcesses(data.top_processes);
    if (data.ports && data.ports.length > 0) renderPortsTable(data.ports);
    document.getElementById('wings-status-box').style.display = 'none';
    document.getElementById('wings-stats-main').style.display = '';
}

// ── Ports table ───────────────────────────────────────────────────────
var allPorts = [];

function buildPortRows(ports) {
    return (ports||[]).map(function(p){
        var sc = p.state==='LISTEN' ? 'label-success' : p.state==='ESTABLISHED' ? 'label-info' : 'label-default';
        var pc = (p.protocol||'').indexOf('udp') >= 0 ? 'label-warning' : 'label-primary';
        return '<tr>'
            +'<td><strong>'+p.port+'</strong></td>'
            +'<td><span class="label '+pc+'">'+escHtml(p.protocol||'—')+'</span></td>'
            +'<td><span class="label '+sc+'">'+escHtml(p.state||'—')+'</span></td>'
            +'<td>'+(p.pid ? '<code>'+p.pid+'</code>' : '—')+'</td>'
            +'<td>'+(p.name ? '<b>'+escHtml(p.name)+'</b>' : '—')+'</td>'
            +'<td>'+fmtBytes(p.bytes_in||0)+'</td>'
            +'<td>'+fmtBytes(p.bytes_out||0)+'</td>'
            +'<td><a href="'+portBase+'/'+p.port+'?protocol='+encodeURIComponent(p.protocol||'')+'" class="btn btn-xs btn-primary"><i class="fa fa-search"></i> Details</a></td>'
            +'</tr>';
    }).join('');
}
function applyPortsFilter() {
    var q = (document.getElementById('ports-search').value || '').trim().toLowerCase();
    var filtered = q ? allPorts.filter(function(p) {
        return String(p.port).indexOf(q) >= 0
            || (p.protocol||'').toLowerCase().indexOf(q) >= 0
            || (p.state||'').toLowerCase().indexOf(q) >= 0
            || String(p.pid||'').indexOf(q) >= 0
            || (p.name||'').toLowerCase().indexOf(q) >= 0;
    }) : allPorts;
    var badgeEl = document.getElementById('ports-count-badge');
    if (badgeEl) badgeEl.textContent = filtered.length + ' / ' + allPorts.length;
    var rows = buildPortRows(filtered);
    var empty = q ? 'No ports match <em>'+escHtml(q)+'</em>.' : 'No open ports.';
    document.getElementById('ports-tbody').innerHTML = rows || '<tr><td colspan="8" style="text-align:center;color:#aaa;">'+empty+'</td></tr>';
}
function renderPortsTable(ports) {
    allPorts = ports || [];
    applyPortsFilter();
}
function loadPorts() {
    agentGet('/ports').then(function(r){ return r.json(); }).then(function(d){
        if (Array.isArray(d)) renderPortsTable(d);
    }).catch(function(){});
}
document.getElementById('btn-refresh-ports').addEventListener('click', loadPorts);
document.getElementById('ports-search').addEventListener('input', applyPortsFilter);
document.getElementById('btn-ports-search-clear').addEventListener('click', function() {
    document.getElementById('ports-search').value = '';
    applyPortsFilter();
});

// ── Load history on page start ────────────────────────────────────────
function parseHistoryAt(at) {
    // Go's time.Time marshals to RFC3339Nano (up to 9 fractional digits).
    // Truncate to 3 (milliseconds) so JS Date parses it reliably everywhere.
    return new Date((at||'').replace(/(\.\d{3})\d+/, '$1')).getTime();
}

var historyRetries = 0;
function loadHistory() {
    var statusEl = document.getElementById('hist-load-status');
    if (statusEl) statusEl.textContent = 'Loading history…';
    agentGet('/history').then(function(r){ return r.json(); }).then(function(pts){
        historyRetries = 0;
        if (!Array.isArray(pts) || pts.length === 0) {
            if (statusEl) statusEl.textContent = 'No history yet';
            return;
        }
        // History points store cumulative byte totals; diff consecutive
        // points to derive KB/s (interval = 10s).
        var INTERVAL_S = 10;
        pts.forEach(function(pt, i) {
            if (i > 0) {
                var prev = pts[i - 1];
                var dRecv = (pt.net_recv_bytes||0) - (prev.net_recv_bytes||0);
                var dSent = (pt.net_sent_bytes||0) - (prev.net_sent_bytes||0);
                var dPktsIn  = (pt.net_recv_pkts||0) - (prev.net_recv_pkts||0);
                var dPktsOut = (pt.net_sent_pkts||0) - (prev.net_sent_pkts||0);
                var ptConns  = pt.connections || {};
                var ptConnIn  = (ptConns.tcp_incoming || 0) + (ptConns.udp_incoming || 0);
                var ptConnOut = (ptConns.tcp_outgoing || 0) + (ptConns.udp_outgoing || 0);
                addToHistory({
                    at:      parseHistoryAt(pt.at),
                    recvKB:  Math.max(0, dRecv)    / 1024 / INTERVAL_S,
                    sentKB:  Math.max(0, dSent)    / 1024 / INTERVAL_S,
                    pktsIn:  Math.max(0, dPktsIn)  / INTERVAL_S,
                    pktsOut: Math.max(0, dPktsOut) / INTERVAL_S,
                    connIn:  ptConnIn,
                    connOut: ptConnOut
                });
            }
        });
        // The buffer may already contain live SSE points (added before fetch
        // completed).  Sort chronologically so charts render in time order.
        historyBuffer.sort(function(a, b) { return a.at - b.at; });
        if (statusEl) statusEl.textContent = (pts.length - 1) + ' history points loaded';
        redrawLineCharts();
    }).catch(function(){
        historyRetries++;
        if (historyRetries <= 3) {
            var delay = historyRetries * 3000;
            if (statusEl) statusEl.textContent = 'Retrying history (attempt '+historyRetries+'/3)…';
            if (historyRetryTimer) clearTimeout(historyRetryTimer);
            historyRetryTimer = setTimeout(loadHistory, delay);
        } else {
            if (statusEl) statusEl.textContent = 'History unavailable';
        }
    });
}

// ── Timeframe buttons ─────────────────────────────────────────────────
document.querySelectorAll('#tf-btngroup [data-tf]').forEach(function(btn) {
    btn.addEventListener('click', function() {
        applyTimeframe(parseInt(btn.getAttribute('data-tf'), 10));
    });
});

// ── WebSocket connection (replaces 5s polling) ─────────────────────────
function clearAgentReconnectTimer() {
    if (agentWsReconnectTimer) {
        clearTimeout(agentWsReconnectTimer);
        agentWsReconnectTimer = null;
    }
}

function scheduleAgentReconnect(delay) {
    if (shuttingDown) return;
    clearAgentReconnectTimer();
    agentWsReconnectTimer = setTimeout(function() {
        agentWsReconnectTimer = null;
        if (shuttingDown) return;
        fetchTicket().then(connectWebSocket).catch(function() {
            if (shuttingDown) return;
            document.getElementById('wings-status-msg').textContent = 'Failed to refresh ticket. Retrying…';
            scheduleAgentReconnect(5000);
        });
    }, delay);
}

function connectWebSocket() {
    if (!agentWsUrl || !agentTicket || shuttingDown) return;
    clearAgentReconnectTimer();
    if (agentWs) { agentWs.onclose = null; agentWs.close(); agentWs = null; }

    agentWs = new WebSocket(agentWsUrl + '?ticket=' + encodeURIComponent(agentTicket));

    agentWs.onopen = function() {
        if (shuttingDown) return;
        document.getElementById('wings-status-box').style.display = 'none';
        document.getElementById('wings-stats-main').style.display = '';
    };

    agentWs.onmessage = function(e) {
        if (shuttingDown) return;
        try {
            var data = JSON.parse(e.data);
            renderStats(data);
            document.getElementById('wings-status-box').style.display = 'none';
            document.getElementById('wings-stats-main').style.display = '';
        } catch(ex) {}
    };

    agentWs.onerror = function() {
        if (shuttingDown) return;
        document.getElementById('wings-status-msg').textContent = 'WebSocket error. Reconnecting…';
    };

    agentWs.onclose = function() {
        if (shuttingDown) return;
        agentWs = null;
        document.getElementById('wings-status-msg').textContent  = 'Connection lost. Reconnecting in 5s…';
        document.getElementById('wings-stats-main').style.display = 'none';
        document.getElementById('wings-status-box').style.display  = '';
        scheduleAgentReconnect(5000);
    };
}

function connect() {
    document.getElementById('wings-status-box').style.display   = '';
    document.getElementById('wings-status-msg').textContent     = 'Connecting to Wings Agent…';
    document.getElementById('wings-loading-icon').style.display = '';
    connectWebSocket();
}

function shutdownLiveStats() {
    shuttingDown = true;
    clearAgentReconnectTimer();
    if (ticketRefreshTimer) { clearTimeout(ticketRefreshTimer); ticketRefreshTimer = null; }
    if (cpStatusTimer) { clearInterval(cpStatusTimer); cpStatusTimer = null; }
    if (pageReloadTimer) { clearTimeout(pageReloadTimer); pageReloadTimer = null; }
    if (historyRetryTimer) { clearTimeout(historyRetryTimer); historyRetryTimer = null; }
    cpActionTimers.forEach(clearTimeout);
    cpActionTimers = [];
    if (agentWs) {
        agentWs.onopen = null;
        agentWs.onmessage = null;
        agentWs.onerror = null;
        agentWs.onclose = null;
        agentWs.close(1000, 'page closing');
        agentWs = null;
    }
}

function initializeLiveStats() {
    if (initialized || shuttingDown) return;
    initialized = true;
    fetchTicket().then(function() {
        if (shuttingDown) return;
        connect();
        loadHistory();
        loadPorts();
        cpFetchStatus();
    }).catch(function() {
        if (shuttingDown) return;
        document.getElementById('wings-status-msg').textContent = 'Failed to obtain agent ticket. Retrying…';
        pageReloadTimer = setTimeout(function() { location.reload(); }, 5000);
    });
}

document.addEventListener('DOMContentLoaded', initializeLiveStats);
window.addEventListener('beforeunload', shutdownLiveStats);
window.addEventListener('pagehide', shutdownLiveStats);
window.addEventListener('pageshow', function(e) {
    if (e.persisted && shuttingDown) location.reload();
});
// Belt-and-suspenders: also fire on window load in case DOMContentLoaded
// already fired before this script ran (e.g., deferred execution).
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initializeLiveStats();
}

})();
</script>
@endsection
