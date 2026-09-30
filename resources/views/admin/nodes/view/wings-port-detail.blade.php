@extends('layouts.admin')

@section('title')
    Port {{ $port }} — {{ $node->name }}
@endsection

@section('content-header')
    <h1>{{ $node->name }}<small>Port {{ $port }} — Detail View</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li><a href="{{ route('admin.nodes') }}">Nodes</a></li>
        <li><a href="{{ route('admin.nodes.view', $node->id) }}">{{ $node->name }}</a></li>
        <li><a href="{{ route('admin.nodes.view.wings-stats', $node->id) }}">Wings Stats</a></li>
        <li class="active">Port {{ $port }}</li>
    </ol>
@endsection

@section('content')

{{-- Back button --}}
<div class="row" style="margin-bottom:10px;">
    <div class="col-xs-12">
        <a href="{{ route('admin.nodes.view.wings-stats', $node->id) }}" class="btn btn-default btn-sm">
            <i class="fa fa-arrow-left"></i> Back to Wings Stats
        </a>
    </div>
</div>

{{-- Loading indicator --}}
<div id="port-loading" class="row">
    <div class="col-xs-12">
        <div class="box box-default">
            <div class="box-body" style="padding:30px; text-align:center;">
                <i class="fa fa-refresh fa-spin fa-2x"></i>
                <p style="margin-top:10px; color:#888;">Loading port details…</p>
            </div>
        </div>
    </div>
</div>

{{-- Port-closed alert (hidden until loaded) --}}
<div id="port-closed-alert" class="row" style="display:none;">
    <div class="col-xs-12">
        <div class="callout callout-warning" style="border-left-color:#f39c12;">
            <h4><i class="fa fa-exclamation-triangle"></i> Application Not Running</h4>
            <p>No live process was found on this port. Showing historical data only.</p>
        </div>
    </div>
</div>

{{-- Error box --}}
<div id="port-error" class="row" style="display:none;">
    <div class="col-xs-12">
        <div class="box box-danger">
            <div class="box-header with-border"><h3 class="box-title"><i class="fa fa-exclamation-circle"></i> Error</h3></div>
            <div class="box-body"><p id="port-error-msg" style="color:#dd4b39;">Could not load port details.</p></div>
        </div>
    </div>
</div>

{{-- Main content (hidden until loaded) --}}
<div id="port-main" style="display:none;">

    {{-- Row 1: Summary card --}}
    <div class="row">
        <div class="col-sm-6">
            <div class="box box-primary">
                <div class="box-header with-border">
                    <h3 class="box-title"><i class="fa fa-info-circle"></i> Port Summary</h3>
                    <div class="box-tools pull-right">
                        <span class="badge bg-blue" id="pd-port-badge">Port {{ $port }}</span>
                    </div>
                </div>
                <div class="box-body">
                    <table class="table table-condensed no-padding" style="margin:0;">
                        <tbody>
                            <tr><td style="width:120px; color:#888;">Port</td><td><strong id="pd-port">—</strong></td></tr>
                            <tr><td style="color:#888;">Protocol</td><td><span id="pd-proto-badge" class="label label-primary">—</span></td></tr>
                            <tr><td style="color:#888;">State</td><td><span id="pd-state-badge" class="label label-default">—</span></td></tr>
                            <tr><td style="color:#888;">PID</td><td><code id="pd-pid">—</code></td></tr>
                            <tr><td style="color:#888;">Process</td><td><strong id="pd-name">—</strong></td></tr>
                            <tr><td style="color:#888;">Binary Path</td><td><code id="pd-exe" style="word-break:break-all; font-size:11px;">—</code></td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div class="col-sm-6">
            <div class="box box-warning">
                <div class="box-header with-border"><h3 class="box-title"><i class="fa fa-exchange"></i> Current Traffic</h3></div>
                <div class="box-body">
                    <div class="row text-center">
                        <div class="col-xs-6">
                            <p style="font-size:22px; font-weight:bold; color:#00c0ef; margin:0;" id="pd-total-in">—</p>
                            <small class="text-muted">Total Bytes In</small>
                        </div>
                        <div class="col-xs-6">
                            <p style="font-size:22px; font-weight:bold; color:#00a65a; margin:0;" id="pd-total-out">—</p>
                            <small class="text-muted">Total Bytes Out</small>
                        </div>
                    </div>
                    <hr style="margin:10px 0;">
                    <div class="row text-center">
                        <div class="col-xs-6">
                            <p style="font-size:16px; margin:0;" id="pd-total-pkts-in">—</p>
                            <small class="text-muted">Pkts In</small>
                        </div>
                        <div class="col-xs-6">
                            <p style="font-size:16px; margin:0;" id="pd-total-pkts-out">—</p>
                            <small class="text-muted">Pkts Out</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    {{-- Row 2: Protocol breakdown table + pie chart --}}
    <div class="row">
        <div class="col-sm-8">
            <div class="box box-info">
                <div class="box-header with-border">
                    <h3 class="box-title"><i class="fa fa-table"></i> Protocol Breakdown</h3>
                </div>
                <div class="box-body table-responsive no-padding">
                    <table class="table table-condensed table-hover">
                        <thead>
                            <tr>
                                <th>Protocol</th>
                                <th>↓ Bytes In</th><th>↑ Bytes Out</th>
                                <th>↓ Pkts In</th><th>↑ Pkts Out</th>
                                <th>↓ In %</th><th>↑ Out %</th>
                            </tr>
                        </thead>
                        <tbody id="pd-proto-tbody">
                            <tr><td colspan="7" style="text-align:center;color:#aaa;">Loading…</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div class="col-sm-4">
            <div class="box box-info">
                <div class="box-header with-border">
                    <h3 class="box-title"><i class="fa fa-pie-chart"></i> Traffic Distribution</h3>
                </div>
                <div class="box-body">
                    <canvas id="pd-proto-pie" height="160"></canvas>
                    <div id="pd-pie-legend" style="margin-top:8px; font-size:11px;"></div>
                </div>
            </div>
        </div>
    </div>

    {{-- Row 3: Active connections (remote addresses) --}}
    <div class="row">
        <div class="col-xs-12">
            <div class="box box-default">
                <div class="box-header with-border">
                    <h3 class="box-title"><i class="fa fa-globe"></i> Active Remote Connections</h3>
                    <div class="box-tools pull-right">
                        <span class="badge" id="pd-remote-count">0</span>
                    </div>
                </div>
                <div class="box-body">
                    <div id="pd-remotes" style="max-height:200px; overflow-y:auto; font-family:monospace; font-size:12px; background:#2d2d2d; color:#e0e0e0; padding:8px; border-radius:3px;">
                        <em style="color:#888;">None</em>
                    </div>
                </div>
            </div>
        </div>
    </div>

    {{-- Row 3b: Live Connection Stats --}}
    <div class="row">
        <div class="col-sm-6">
            <div class="box box-info">
                <div class="box-header with-border">
                    <h3 class="box-title"><i class="fa fa-link"></i> Live Connection Stats</h3>
                    <div class="box-tools pull-right">
                        <span class="label label-info" style="font-size:11px;"><i class="fa fa-rss"></i> Live via stream</span>
                    </div>
                </div>
                <div class="box-body no-padding">
                    <table class="table table-condensed" style="margin:0;">
                        <thead>
                            <tr>
                                <th style="width:35%;">Direction</th>
                                <th style="width:20%;">Count</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><span class="label label-success">&darr; Incoming</span></td>
                                <td><strong id="pd-conn-in">&mdash;</strong></td>
                                <td><small class="text-muted">Remote clients connected to this port</small></td>
                            </tr>
                            <tr>
                                <td><span class="label label-warning">&uarr; Outgoing</span></td>
                                <td><strong id="pd-conn-out">&mdash;</strong></td>
                                <td><small class="text-muted">Connections this process opened to remote hosts</small></td>
                            </tr>
                            <tr>
                                <td><span class="label label-primary">&Sigma; Total</span></td>
                                <td><strong id="pd-conn-total">&mdash;</strong></td>
                                <td><small class="text-muted">Incoming + outgoing</small></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div class="col-sm-6">
            <div class="box box-default">
                <div class="box-header with-border">
                    <h3 class="box-title"><i class="fa fa-server"></i> Connection Explanation</h3>
                </div>
                <div class="box-body" style="font-size:12px; color:#555; line-height:1.6;">
                    <p><span class="label label-success">&darr; Incoming</span> &nbsp; ESTABLISHED TCP sockets where a remote client connected <em>to</em> this listening port. Each entry in <em>Active Remote Connections</em> below counts as one incoming connection.</p>
                    <p style="margin:0;"><span class="label label-warning">&uarr; Outgoing</span> &nbsp; ESTABLISHED sockets opened <em>by</em> the same process (PID) to a remote host, using an ephemeral local port &mdash; typical for API calls, DB queries, etc.</p>
                </div>
            </div>
        </div>
    </div>

    {{-- Row 4: Network Traffic (live + history) --}}
    <div class="row">
        <div class="col-xs-12">
            <div class="box box-warning">
                <div class="box-header with-border">
                    <h3 class="box-title"><i class="fa fa-line-chart"></i> Network Traffic <small id="pd-tf-label">(live + history, KB/s)</small></h3>
                    <div class="box-tools pull-right">
                        <span id="pd-hist-load-status" style="font-size:11px; color:#aaa; margin-right:6px;"></span>
                        <div class="btn-group" id="pd-tf-btngroup" style="margin-right:6px;">
                            <button class="btn btn-xs btn-default" data-ptf="1440">24h</button>
                            <button class="btn btn-xs btn-default" data-ptf="720">12h</button>
                            <button class="btn btn-xs btn-default" data-ptf="300">5h</button>
                            <button class="btn btn-xs btn-primary"  data-ptf="60">1h</button>
                            <button class="btn btn-xs btn-default" data-ptf="30">30m</button>
                            <button class="btn btn-xs btn-default" data-ptf="10">10m</button>
                            <button class="btn btn-xs btn-default" data-ptf="5">5m</button>
                            <button class="btn btn-xs btn-default" data-ptf="1">1m</button>
                        </div>
                        <button class="btn btn-xs btn-default" id="btn-load-history"><i class="fa fa-refresh"></i> Reload</button>
                    </div>
                </div>
                <div class="box-body">
                    <canvas id="pd-history-traffic" height="80"></canvas>
                    <div class="row" style="margin-top:12px; text-align:center; font-size:12px;">
                        <div class="col-xs-3"><span class="text-muted">↓ Current</span><br><strong id="pd-traf-in-cur" class="text-aqua">—</strong></div>
                        <div class="col-xs-3"><span class="text-muted">↓ Peak</span><br><strong id="hist-in-peak" class="text-blue">—</strong></div>
                        <div class="col-xs-3"><span class="text-muted">↑ Current</span><br><strong id="pd-traf-out-cur" class="text-green">—</strong></div>
                        <div class="col-xs-3"><span class="text-muted">↑ Peak</span><br><strong id="hist-out-peak" class="text-yellow">—</strong></div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    {{-- Row 5: Packet Rate (live + history) --}}
    <div class="row">
        <div class="col-xs-12">
            <div class="box box-default">
                <div class="box-header with-border">
                    <h3 class="box-title"><i class="fa fa-area-chart"></i> Packet Rate <small>(live + history, pkts/s)</small></h3>
                </div>
                <div class="box-body">
                    <canvas id="pd-history-pkts" height="80"></canvas>
                    <div class="row" style="margin-top:12px; text-align:center; font-size:12px;">
                        <div class="col-xs-3"><span class="text-muted">↓ Current</span><br><strong id="pd-pkt-in-cur" class="text-aqua">—</strong></div>
                        <div class="col-xs-3"><span class="text-muted">↓ Peak</span><br><strong id="hist-pkt-in-peak" class="text-blue">—</strong></div>
                        <div class="col-xs-3"><span class="text-muted">↑ Current</span><br><strong id="pd-pkt-out-cur" class="text-green">—</strong></div>
                        <div class="col-xs-3"><span class="text-muted">↑ Peak</span><br><strong id="hist-pkt-out-peak" class="text-yellow">—</strong></div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    {{-- Row 5b: Connection Count (live + history) --}}
    <div class="row">
        <div class="col-xs-12">
            <div class="box box-info">
                <div class="box-header with-border">
                    <h3 class="box-title"><i class="fa fa-users"></i> Connection Count <small>(live + history)</small></h3>
                </div>
                <div class="box-body">
                    <canvas id="pd-history-conns" height="80"></canvas>
                    <div class="row" style="margin-top:12px; text-align:center; font-size:12px;">
                        <div class="col-xs-3"><span class="text-muted">↓ Incoming Now</span><br><strong id="pd-conn-in-cur" class="text-aqua">—</strong></div>
                        <div class="col-xs-3"><span class="text-muted">↓ Peak</span><br><strong id="hist-conn-in-peak" class="text-blue">—</strong></div>
                        <div class="col-xs-3"><span class="text-muted">↑ Outgoing Now</span><br><strong id="pd-conn-out-cur" class="text-green">—</strong></div>
                        <div class="col-xs-3"><span class="text-muted">↑ Peak</span><br><strong id="hist-conn-out-peak" class="text-yellow">—</strong></div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    {{-- Row 6: Protocol history pie (24h aggregate) --}}
    <div class="row">
        <div class="col-sm-6">
            <div class="box box-default">
                <div class="box-header with-border">
                    <h3 class="box-title"><i class="fa fa-pie-chart"></i> 24h Protocol Distribution (Bytes)</h3>
                </div>
                <div class="box-body">
                    <canvas id="pd-hist-proto-bytes" height="160"></canvas>
                    <div id="pd-hist-proto-bytes-legend" style="margin-top:8px; font-size:11px;"></div>
                </div>
            </div>
        </div>
        <div class="col-sm-6">
            <div class="box box-default">
                <div class="box-header with-border">
                    <h3 class="box-title"><i class="fa fa-pie-chart"></i> 24h Protocol Distribution (Packets)</h3>
                </div>
                <div class="box-body">
                    <canvas id="pd-hist-proto-pkts" height="160"></canvas>
                    <div id="pd-hist-proto-pkts-legend" style="margin-top:8px; font-size:11px;"></div>
                </div>
            </div>
        </div>
    </div>

</div>{{-- /#port-main --}}

@endsection

@section('footer-scripts')
@parent
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
<script>
(function () {
"use strict";

var portNum      = {{ (int) $port }};
var selectedProtocol = @json($selectedProtocol ?? null);
var ticketUrl    = '{{ route('admin.nodes.wings-agent.ticket', $node->id) }}';

// ── Agent-direct state ────────────────────────────────────────────────
var agentTicket  = null;
var agentBaseUrl = null;
var ticketRefreshTimer = null;

function fetchTicket() {
    return fetch(ticketUrl, {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
    })
    .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
    })
    .then(function(d) {
        agentTicket  = d.ticket;
        agentBaseUrl = d.base_url;
        if (ticketRefreshTimer) clearTimeout(ticketRefreshTimer);
        ticketRefreshTimer = setTimeout(fetchTicket, 240000);
        return d;
    });
}

function agentGet(path) {
    if (!agentBaseUrl || !agentTicket) return Promise.reject(new Error('No ticket'));
    return fetch(agentBaseUrl + path + (path.indexOf('?') >= 0 ? '&' : '?') + 'ticket=' + agentTicket, {
        headers: { 'Accept': 'application/json' }
    });
}

// Build the detail+history paths for the agent
var detailAgentPath = '/port/' + portNum + '/all' + (selectedProtocol ? '?protocol=' + encodeURIComponent(selectedProtocol) : '');
var historyAgentPath = '/history/port/' + portNum + (selectedProtocol ? '?protocol=' + encodeURIComponent(selectedProtocol) : '');

// ── Unified history buffer ────────────────────────────────────────────
// Identical structure to main Wings Stats page: {at:ms, recvKB, sentKB, pktsIn, pktsOut, connIn, connOut}
var historyBuffer     = [];
var portActiveMinutes = 60;   // default 1h
// livePrevSample tracks the last cumulative byte counters to compute rates.
// fromSSE=true means it was set by the live stream; loadHistory must not overwrite it.
var livePrevSample    = null; // {at, bytesIn, bytesOut, pktsIn, pktsOut, fromSSE}
// lastKnownConnIn/Out: accurate connection counts from the /port/N/all endpoint
// (uses packet-tap fallback). SSE PortBrief conn_incoming is always 0 for
// docker-proxied ports (ESTABLISHED-socket counting can't see Docker NAT).
// refreshDetail() updates these; each SSE tick uses them for the chart.
var lastKnownConnIn  = 0;
var lastKnownConnOut = 0;

function addToHistory(pt) {
    historyBuffer.push(pt);
    if (historyBuffer.length > 50000) historyBuffer.shift();
}

function addRatePointFromCounters(atMs, bytesIn, bytesOut, pktsIn, pktsOut, connIn, connOut) {
    var cur = {
        at: atMs,
        bytesIn: +bytesIn || 0,
        bytesOut: +bytesOut || 0,
        pktsIn: +pktsIn || 0,
        pktsOut: +pktsOut || 0
    };
    if (!livePrevSample || !livePrevSample.at || cur.at <= livePrevSample.at) {
        // First call — just store the baseline; do NOT emit a 0-value history point
        // as that would cause a visible "dip to 0" in the chart on page load.
        cur.fromSSE = true;
        livePrevSample = cur;
        return;
    }

    var dt = (cur.at - livePrevSample.at) / 1000;
    if (dt <= 0) {
        livePrevSample = cur;
        return;
    }

    var dBytesIn = cur.bytesIn >= livePrevSample.bytesIn ? (cur.bytesIn - livePrevSample.bytesIn) : cur.bytesIn;
    var dBytesOut = cur.bytesOut >= livePrevSample.bytesOut ? (cur.bytesOut - livePrevSample.bytesOut) : cur.bytesOut;
    var dPktsIn = cur.pktsIn >= livePrevSample.pktsIn ? (cur.pktsIn - livePrevSample.pktsIn) : cur.pktsIn;
    var dPktsOut = cur.pktsOut >= livePrevSample.pktsOut ? (cur.pktsOut - livePrevSample.pktsOut) : cur.pktsOut;

    addToHistory({
        at: cur.at,
        recvKB: dBytesIn / 1024 / dt,
        sentKB: dBytesOut / 1024 / dt,
        pktsIn: dPktsIn / dt,
        pktsOut: dPktsOut / dt,
        connIn: +connIn||0,
        connOut: +connOut||0
    });
    cur.fromSSE = true;
    livePrevSample = cur;
}

// ── Timeframe control ─────────────────────────────────────────────────
function applyPortTimeframe(minutes) {
    portActiveMinutes = minutes;
    var labels = {1440:'24h',720:'12h',300:'5h',60:'1h',30:'30m',10:'10m',5:'5m',1:'1m'};
    document.querySelectorAll('#pd-tf-btngroup [data-ptf]').forEach(function(btn) {
        var tf = parseInt(btn.getAttribute('data-ptf'), 10);
        btn.className = 'btn btn-xs ' + (tf === minutes ? 'btn-primary' : 'btn-default');
    });
    var labelEl = document.getElementById('pd-tf-label');
    if (labelEl) labelEl.textContent = '(live + history, KB/s)';
    redrawPortCharts();
}

function redrawPortCharts() {
    var now    = Date.now();
    var cutoff = now - (portActiveMinutes * 60000);
    var pts    = historyBuffer.filter(function(p) { return p.at >= cutoff; });

    var labels  = pts.map(function(p) { return fmtTime(p.at); });
    var recvKBs = pts.map(function(p) { return p.recvKB; });
    var sentKBs = pts.map(function(p) { return p.sentKB; });
    var pktsIn  = pts.map(function(p) { return p.pktsIn; });
    var pktsOut = pts.map(function(p) { return p.pktsOut; });
    var connIn  = pts.map(function(p) { return p.connIn || 0; });
    var connOut = pts.map(function(p) { return p.connOut || 0; });

    histTrafficChart.data.labels           = labels;
    histTrafficChart.data.datasets[0].data = recvKBs;
    histTrafficChart.data.datasets[1].data = sentKBs;
    histTrafficChart.update('none');

    histPktsChart.data.labels           = labels;
    histPktsChart.data.datasets[0].data = pktsIn;
    histPktsChart.data.datasets[1].data = pktsOut;
    histPktsChart.update('none');

    histConnsChart.data.labels           = labels;
    histConnsChart.data.datasets[0].data = connIn;
    histConnsChart.data.datasets[1].data = connOut;
    histConnsChart.update('none');

    // Connection stat boxes
    var safeMax = function(arr) { return arr.length ? Math.max.apply(null, arr) : 0; };
    var last = pts.length > 0 ? pts[pts.length - 1] : null;
    document.getElementById('pd-conn-in-cur').textContent   = last ? (last.connIn || 0)  : '—';
    document.getElementById('pd-conn-out-cur').textContent  = last ? (last.connOut || 0) : '—';
    document.getElementById('hist-conn-in-peak').textContent  = safeMax(connIn).toString();
    document.getElementById('hist-conn-out-peak').textContent = safeMax(connOut).toString();

    // Stat boxes: current (newest visible point) + peak in window
    var last2 = pts.length > 0 ? pts[pts.length - 1] : null;
    document.getElementById('pd-traf-in-cur').textContent  = last2 ? fmtKB(last2.recvKB)           : '—';
    document.getElementById('pd-traf-out-cur').textContent = last2 ? fmtKB(last2.sentKB)           : '—';
    document.getElementById('pd-pkt-in-cur').textContent   = last2 ? last2.pktsIn.toFixed(1)+'/s'  : '—';
    document.getElementById('pd-pkt-out-cur').textContent  = last2 ? last2.pktsOut.toFixed(1)+'/s' : '—';

    document.getElementById('hist-in-peak').textContent      = fmtKB(safeMax(recvKBs));
    document.getElementById('hist-out-peak').textContent     = fmtKB(safeMax(sentKBs));
    document.getElementById('hist-pkt-in-peak').textContent  = safeMax(pktsIn).toFixed(1)+'/s';
    document.getElementById('hist-pkt-out-peak').textContent = safeMax(pktsOut).toFixed(1)+'/s';
}

// ── helpers ───────────────────────────────────────────────────────────
function fmtBytes(b) {
    b = +b || 0;
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
    if (b < 1073741824) return (b/1048576).toFixed(1) + ' MB';
    return (b/1073741824).toFixed(2) + ' GB';
}
function fmtKB(kb) {
    kb = +kb||0;
    if (kb < 1024) return kb.toFixed(1)+' KB/s';
    return (kb/1024).toFixed(2)+' MB/s';
}
function fmtTime(ms) {
    var d = new Date(ms);
    return d.getHours().toString().padStart(2,'0')+':'+
           d.getMinutes().toString().padStart(2,'0')+':'+
           d.getSeconds().toString().padStart(2,'0');
}
function escHtml(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Chart factory ─────────────────────────────────────────────────────
function makePieChart(id) {
    return new Chart(document.getElementById(id).getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['TCP','UDP','ICMP','Other'],
            datasets: [{ data: [0,0,0,0], backgroundColor: ['#3c8dbc','#00a65a','#f39c12','#dd4b39'], borderWidth: 2 }]
        },
        options: { animation: false, responsive: true, plugins: { legend: { display: false } } }
    });
}
function makeLineChart(id, ds) {
    return new Chart(document.getElementById(id).getContext('2d'), {
        type: 'line',
        data: { labels: [], datasets: ds },
        options: {
            animation: false, responsive: true,
            plugins: { legend: { display: true, labels: { boxWidth: 12, font: { size: 11 } } } },
            scales: {
                x: { display: true, ticks: { maxTicksLimit: 10, font: { size: 9 }, maxRotation: 0 } },
                y: { beginAtZero: true }
            }
        }
    });
}

var histTrafficChart = makeLineChart('pd-history-traffic', [
    { label: '↓ Recv KB/s', data: [], borderColor: '#00c0ef', backgroundColor: 'rgba(0,192,239,0.1)', borderWidth: 2, pointRadius: 0, tension: 0.3, fill: true },
    { label: '↑ Sent KB/s', data: [], borderColor: '#00a65a', backgroundColor: 'rgba(0,166,90,0.1)',  borderWidth: 2, pointRadius: 0, tension: 0.3, fill: true }
]);
var histPktsChart = makeLineChart('pd-history-pkts', [
    { label: '↓ Pkts/s', data: [], borderColor: '#3c8dbc', backgroundColor: 'rgba(60,141,188,0.1)', borderWidth: 2, pointRadius: 0, tension: 0.3, fill: true },
    { label: '↑ Pkts/s', data: [], borderColor: '#f39c12', backgroundColor: 'rgba(243,156,18,0.1)',  borderWidth: 2, pointRadius: 0, tension: 0.3, fill: true }
]);
var histConnsChart = makeLineChart('pd-history-conns', [
    { label: '↓ Incoming', data: [], borderColor: '#f39c12', backgroundColor: 'rgba(243,156,18,0.1)', borderWidth: 2, pointRadius: 0, tension: 0.3, fill: true },
    { label: '↑ Outgoing', data: [], borderColor: '#00c0ef', backgroundColor: 'rgba(0,192,239,0.1)', borderWidth: 2, pointRadius: 0, tension: 0.3, fill: true }
]);
var pieChart       = makePieChart('pd-proto-pie');
var histProtoBytes = makePieChart('pd-hist-proto-bytes');
var histProtoPkts  = makePieChart('pd-hist-proto-pkts');

// ── Render port detail (static snapshot) ─────────────────────────────
function renderPortDetail(d) {
    document.getElementById('pd-port').textContent       = d.port || portNum;
    document.getElementById('pd-port-badge').textContent = 'Port ' + (d.port || portNum);
    document.getElementById('pd-pid').textContent        = d.pid || '—';
    document.getElementById('pd-name').textContent       = d.name || '—';
    document.getElementById('pd-exe').textContent        = d.exe_path || '—';
    document.getElementById('pd-total-in').textContent      = fmtBytes(d.total_bytes_in  || 0);
    document.getElementById('pd-total-out').textContent     = fmtBytes(d.total_bytes_out || 0);
    document.getElementById('pd-total-pkts-in').textContent  = Number(d.total_pkts_in  || 0).toLocaleString();
    document.getElementById('pd-total-pkts-out').textContent = Number(d.total_pkts_out || 0).toLocaleString();

    var proto = d.protocol || '';
    var isUDP = proto.indexOf('udp') >= 0;
    var protoEl = document.getElementById('pd-proto-badge');
    if (Array.isArray(d.variants) && d.variants.length > 1) {
        protoEl.textContent = 'mixed (' + d.variants.map(function(v){ return v.protocol; }).join(', ') + ')';
    } else {
        protoEl.textContent = proto || '—';
    }
    protoEl.className   = 'label ' + (isUDP ? 'label-warning' : 'label-primary');

    var stateMap = { LISTEN:'label-success', ESTABLISHED:'label-info', TIME_WAIT:'label-warning', CLOSE_WAIT:'label-danger' };
    var stateEl = document.getElementById('pd-state-badge');
    stateEl.textContent = d.state || '—';
    stateEl.className   = 'label ' + (stateMap[d.state] || 'label-default');

    // Protocol breakdown table
    var totIn  = (d.total_bytes_in  || 0) || 1;
    var totOut = (d.total_bytes_out || 0) || 1;
    var colors = ['#3c8dbc','#00a65a','#f39c12','#dd4b39'];
    var rows = [
        ['TCP',  d.tcp_bytes_in||0,  d.tcp_bytes_out||0,  d.tcp_pkts_in||0,  d.tcp_pkts_out||0,  'label-info'],
        ['UDP',  d.udp_bytes_in||0,  d.udp_bytes_out||0,  d.udp_pkts_in||0,  d.udp_pkts_out||0,  'label-warning'],
        ['ICMP', d.icmp_bytes_in||0, d.icmp_bytes_out||0, d.icmp_pkts_in||0, d.icmp_pkts_out||0, 'label-default'],
        ['Other',d.other_bytes_in||0,d.other_bytes_out||0,d.other_pkts_in||0,d.other_pkts_out||0,'label-danger'],
        ['<b>Total</b>',d.total_bytes_in||0,d.total_bytes_out||0,d.total_pkts_in||0,d.total_pkts_out||0,'label-primary']
    ].map(function(r) {
        var inPct  = ((r[1]/totIn)*100).toFixed(1);
        var outPct = ((r[2]/totOut)*100).toFixed(1);
        return '<tr>'
            +'<td><span class="label '+r[5]+'">'+r[0]+'</span></td>'
            +'<td>'+fmtBytes(r[1])+'</td>'+'<td>'+fmtBytes(r[2])+'</td>'
            +'<td>'+Number(r[3]).toLocaleString()+'</td>'+'<td>'+Number(r[4]).toLocaleString()+'</td>'
            +'<td>'+(r[0]==='<b>Total</b>'?'100%':inPct+'%')+'</td>'
            +'<td>'+(r[0]==='<b>Total</b>'?'100%':outPct+'%')+'</td>'
            +'</tr>';
    }).join('');
    document.getElementById('pd-proto-tbody').innerHTML = rows;

    // Pie chart
    pieChart.data.datasets[0].data = [d.tcp_bytes_in||0, d.udp_bytes_in||0, d.icmp_bytes_in||0, d.other_bytes_in||0];
    pieChart.update('none');
    var pieTotal = (d.tcp_bytes_in||0)+(d.udp_bytes_in||0)+(d.icmp_bytes_in||0)+(d.other_bytes_in||0)||1;
    document.getElementById('pd-pie-legend').innerHTML =
        [['TCP',d.tcp_bytes_in||0],['UDP',d.udp_bytes_in||0],['ICMP',d.icmp_bytes_in||0],['Other',d.other_bytes_in||0]].map(function(r,i){
            return '<span style="display:inline-block;width:10px;height:10px;background:'+colors[i]+';margin-right:3px;border-radius:2px;"></span>'
                +r[0]+': '+fmtBytes(r[1])+' ('+((r[1]/pieTotal)*100).toFixed(1)+'%) ';
        }).join('');

    // Live connection counts (accurate: remote_addrs + packet-tap fallback)
    var connIn  = d.conn_incoming != null ? d.conn_incoming : null;
    var connOut = d.conn_outgoing != null ? d.conn_outgoing : null;
    // Seed the module-level tracking vars so the first SSE tick can use them
    if (connIn  !== null) lastKnownConnIn  = connIn;
    if (connOut !== null) lastKnownConnOut = connOut;
    document.getElementById('pd-conn-in').textContent    = connIn  !== null ? connIn  : '—';
    document.getElementById('pd-conn-out').textContent   = connOut !== null ? connOut : '—';
    document.getElementById('pd-conn-total').textContent = (connIn !== null && connOut !== null) ? (connIn + connOut) : '—';

    // Remote addresses
    var remotes = d.remote_addrs || [];
    document.getElementById('pd-remote-count').textContent = remotes.length;
    document.getElementById('pd-remotes').innerHTML = remotes.length
        ? remotes.map(function(r){ return '<div>'+escHtml(r)+'</div>'; }).join('')
        : '<em style="color:#aaa;">No active remote connections</em>';
}

// ── History loader ─────────────────────────────────────────────────────
// Uses the same diff logic as the main Wings Stats page:
// diff consecutive net_recv_bytes / net_sent_bytes (node-wide cumulative) → KB/s
function renderLegend(containerId, labels, values, colors) {
    var total = values.reduce(function(a,b){ return a+(b||0); }, 0) || 1;
    document.getElementById(containerId).innerHTML = labels.map(function(l, i) {
        return '<span style="display:inline-block;width:10px;height:10px;background:'+colors[i]+';margin-right:3px;border-radius:2px;"></span>'
            + l + ': ' + fmtBytes(values[i]||0) + ' (' + (((values[i]||0)/total)*100).toFixed(1) + '%) ';
    }).join('');
}

function loadHistory() {
    var statusEl = document.getElementById('pd-hist-load-status');
    if (statusEl) statusEl.textContent = 'Loading history…';
    document.getElementById('btn-load-history').disabled = true;

    agentGet(historyAgentPath).then(function(r){ return r.json(); }).then(function(pts) {
        document.getElementById('btn-load-history').disabled = false;
        if (!Array.isArray(pts) || pts.length === 0) {
            if (statusEl) statusEl.textContent = 'No history yet';
            return;
        }
        var parseAt = function(at) { return new Date((at||'').replace(/(\.\d{3})\d+/,'$1')).getTime(); };
        var samples = [];
        pts.forEach(function(pt) {
            var portSnap = Array.isArray(pt.ports) ? pt.ports : [];
            var sumBytesIn = 0, sumBytesOut = 0, sumPktsIn = 0, sumPktsOut = 0;
            var sumConnIn = 0, sumConnOut = 0;
            portSnap.forEach(function(pb) {
                sumBytesIn += (pb.bytes_in || 0);
                sumBytesOut += (pb.bytes_out || 0);
                sumPktsIn += (pb.pkts_in || 0);
                sumPktsOut += (pb.pkts_out || 0);
                sumConnIn += (pb.conn_incoming || 0);
                sumConnOut += (pb.conn_outgoing || 0);
            });
            samples.push({
                at: parseAt(pt.at),
                bytesIn: sumBytesIn,
                bytesOut: sumBytesOut,
                pktsIn: sumPktsIn,
                pktsOut: sumPktsOut,
                connIn: sumConnIn,
                connOut: sumConnOut
            });
        });
        samples.sort(function(a, b) { return a.at - b.at; });
        var prev = null;
        samples.forEach(function(s) {
            if (!prev || s.at <= prev.at) {
                addToHistory({ at: s.at, recvKB: 0, sentKB: 0, pktsIn: 0, pktsOut: 0, connIn: s.connIn, connOut: s.connOut });
                prev = s;
                return;
            }
            var dt = (s.at - prev.at) / 1000;
            var dBytesIn = s.bytesIn >= prev.bytesIn ? (s.bytesIn - prev.bytesIn) : s.bytesIn;
            var dBytesOut = s.bytesOut >= prev.bytesOut ? (s.bytesOut - prev.bytesOut) : s.bytesOut;
            var dPktsIn = s.pktsIn >= prev.pktsIn ? (s.pktsIn - prev.pktsIn) : s.pktsIn;
            var dPktsOut = s.pktsOut >= prev.pktsOut ? (s.pktsOut - prev.pktsOut) : s.pktsOut;
            addToHistory({
                at: s.at,
                recvKB: dBytesIn / 1024 / dt,
                sentKB: dBytesOut / 1024 / dt,
                pktsIn: dPktsIn / dt,
                pktsOut: dPktsOut / dt,
                connIn: s.connIn,
                connOut: s.connOut
            });
            prev = s;
        });
        // Only seed livePrevSample from history if the SSE stream has not yet
        // established it. If SSE already ran, its value is more up-to-date and
        // overwriting it would cause rate spikes on the next SSE tick.
        if (samples.length > 0 && (!livePrevSample || !livePrevSample.fromSSE)) {
            var lastSample = samples[samples.length - 1];
            livePrevSample = {
                at: lastSample.at,      // use actual historical timestamp, not Date.now()
                bytesIn: lastSample.bytesIn,
                bytesOut: lastSample.bytesOut,
                pktsIn: lastSample.pktsIn,
                pktsOut: lastSample.pktsOut,
                fromSSE: false
            };
        }
        historyBuffer.sort(function(a, b) { return a.at - b.at; });
        if (statusEl) statusEl.textContent = (pts.length - 1) + ' history pts';
        redrawPortCharts();

        // Protocol history pies from last point
        var last   = pts[pts.length - 1];
        var colors = ['#3c8dbc','#00a65a','#f39c12','#dd4b39'];
        if (last && Array.isArray(last.ports) && last.ports.length > 0) {
            var tcpB = 0, udpB = 0, icmpB = 0, othB = 0;
            var tcpP = 0, udpP = 0, icmpP = 0, othP = 0;
            last.ports.forEach(function(pb) {
                var p = String(pb.protocol || '').toLowerCase();
                var bi = pb.bytes_in || 0;
                var pi = pb.pkts_in || 0;
                if (p.indexOf('tcp') === 0) { tcpB += bi; tcpP += pi; }
                else if (p.indexOf('udp') === 0) { udpB += bi; udpP += pi; }
                else if (p.indexOf('icmp') === 0) { icmpB += bi; icmpP += pi; }
                else { othB += bi; othP += pi; }
            });
            histProtoBytes.data.datasets[0].data = [tcpB, udpB, icmpB, othB];
            histProtoBytes.update('none');
            renderLegend('pd-hist-proto-bytes-legend', ['TCP','UDP','ICMP','Other'], [tcpB,udpB,icmpB,othB], colors);
            histProtoPkts.data.datasets[0].data = [tcpP, udpP, icmpP, othP];
            histProtoPkts.update('none');
            renderLegend('pd-hist-proto-pkts-legend', ['TCP','UDP','ICMP','Other'], [tcpP,udpP,icmpP,othP], colors);
        }
    }).catch(function() {
        document.getElementById('btn-load-history').disabled = false;
        if (statusEl) statusEl.textContent = 'History unavailable';
    });
}

// ── Live WebSocket stream (replaces HTTP polling) ─────────────────────────
// Connects to the wings-agent /ws/port/{n} endpoint which pushes a full
// port-detail snapshot every 3 s.  Auto-reconnects on disconnection.
var portWs = null;
var portWsReconnectTimer = null;
var portWsClosed = false;   // set true when the port itself disappears

function handlePortSnapshot(d) {
    if (!d || d.error) return;
    if (d.port_closed) {
        portWsClosed = true;
        document.getElementById('port-closed-alert').style.display = '';
        return;
    }
    renderPortDetail(d);
    addRatePointFromCounters(Date.now(),
        d.total_bytes_in  || 0,
        d.total_bytes_out || 0,
        d.total_pkts_in   || 0,
        d.total_pkts_out  || 0,
        d.conn_incoming   || 0,
        d.conn_outgoing   || 0);
    redrawPortCharts();
}

function startPortWebSocket() {
    if (!agentBaseUrl || !agentTicket) return;
    if (portWs) { portWs.onclose = null; portWs.close(); portWs = null; }
    if (portWsReconnectTimer) { clearTimeout(portWsReconnectTimer); portWsReconnectTimer = null; }

    var wsBase = agentBaseUrl.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
    var wsUrl  = wsBase + '/ws/port/' + portNum + '?ticket=' + encodeURIComponent(agentTicket);
    portWs = new WebSocket(wsUrl);

    portWs.onmessage = function(evt) {
        try { handlePortSnapshot(JSON.parse(evt.data)); } catch(ex) {}
    };

    portWs.onerror = function() {
        // will be followed by onclose — let that handle reconnect
    };

    portWs.onclose = function() {
        portWs = null;
        if (portWsClosed) return;   // port gone — do not reconnect
        portWsReconnectTimer = setTimeout(function() {
            // Refresh ticket first in case it expired, then reconnect
            fetchTicket()
                .then(startPortWebSocket)
                .catch(function() {
                    portWsReconnectTimer = setTimeout(startPortWebSocket, 5000);
                });
        }, 3000);
    };
}

// Refresh connection counts, remote_addrs, and exe_path on demand.
// The initial page load already calls this via renderPortDetail(data);
// subsequent calls are only triggered by the user clicking "Reload".
// WebSocket handles real-time traffic/state updates without any extra requests.
function refreshDetail() {
    agentGet(detailAgentPath)
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(d) {
            if (!d || d.error || d.port_closed) return;
            // Connection counts (accurate: remote_addrs + packet-tap fallback)
            var cIn  = d.conn_incoming != null ? d.conn_incoming : null;
            var cOut = d.conn_outgoing != null ? d.conn_outgoing : null;
            // Persist accurate counts so the WS chart handler can use them
            if (cIn  !== null) lastKnownConnIn  = cIn;
            if (cOut !== null) lastKnownConnOut = cOut;
            document.getElementById('pd-conn-in').textContent    = cIn  !== null ? cIn  : '—';
            document.getElementById('pd-conn-out').textContent   = cOut !== null ? cOut : '—';
            document.getElementById('pd-conn-total').textContent = (cIn !== null && cOut !== null) ? (cIn + cOut) : '—';
            // Remote addresses list
            var remotes = d.remote_addrs || [];
            document.getElementById('pd-remote-count').textContent = remotes.length;
            document.getElementById('pd-remotes').innerHTML = remotes.length
                ? remotes.map(function(r){ return '<div>'+escHtml(r)+'</div>'; }).join('')
                : '<em style="color:#aaa;">No active remote connections</em>';
            document.getElementById('pd-exe').textContent = d.exe_path || '—';
        })
        .catch(function() {});
}

window.addEventListener('beforeunload', function() {
    if (portWs) { portWs.onclose = null; portWs.close(); portWs = null; }
    if (portWsReconnectTimer) { clearTimeout(portWsReconnectTimer); portWsReconnectTimer = null; }
});

// ── Timeframe buttons ─────────────────────────────────────────────────
document.querySelectorAll('#pd-tf-btngroup [data-ptf]').forEach(function(btn) {
    btn.addEventListener('click', function() {
        applyPortTimeframe(parseInt(btn.getAttribute('data-ptf'), 10));
    });
});

document.getElementById('btn-load-history').addEventListener('click', function() {
    loadHistory();
    refreshDetail(); // also refresh conn counts + remotes when user reloads
});

// ── Initialize ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    fetchTicket().then(function() {
    agentGet(detailAgentPath)
        .then(function(r) {
            if (!r.ok) throw new Error(r.status);
            return r.json();
        })
        .then(function(data) {
            if (data.error) throw new Error(data.error);
            document.getElementById('port-loading').style.display = 'none';

            if (data.port_closed) {
                // Port is closed — show history-only mode
                document.getElementById('port-closed-alert').style.display = '';
                document.getElementById('port-main').style.display = '';
                // Show minimal info
                document.getElementById('pd-port').textContent       = portNum;
                document.getElementById('pd-port-badge').textContent = 'Port ' + portNum;
                document.getElementById('pd-state-badge').textContent = 'CLOSED';
                document.getElementById('pd-state-badge').className   = 'label label-danger';
                document.getElementById('pd-proto-badge').textContent = '—';
                document.getElementById('pd-pid').textContent  = '—';
                document.getElementById('pd-name').textContent = 'Not running';
                document.getElementById('pd-exe').textContent  = '—';
                document.getElementById('pd-conn-in').textContent    = '0';
                document.getElementById('pd-conn-out').textContent   = '0';
                document.getElementById('pd-conn-total').textContent = '0';
                document.getElementById('pd-remotes').innerHTML = '<em style="color:#aaa;">Port is closed — no active connections</em>';
                loadHistory();
                return;
            }

            document.getElementById('port-main').style.display = '';
            renderPortDetail(data); // populates conn counts, remotes, exe_path on load
            loadHistory();
            startPortWebSocket();    // WebSocket keeps live traffic updated
        })
        .catch(function(err) {
            document.getElementById('port-loading').style.display = 'none';
            document.getElementById('port-error').style.display   = '';
            document.getElementById('port-error-msg').textContent =
                'Could not load port ' + portNum + ' details: ' + (err.message || 'Agent may be offline or port is closed.');
        });
    }).catch(function() {
        document.getElementById('port-loading').style.display = 'none';
        document.getElementById('port-error').style.display   = '';
        document.getElementById('port-error-msg').textContent = 'Failed to obtain agent ticket.';
    });
});

})();
</script>
@endsection
