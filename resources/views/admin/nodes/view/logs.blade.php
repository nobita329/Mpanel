@extends('layouts.admin')

@section('title')
    Logs — {{ $node->name }}
@endsection

@section('content-header')
    <h1>{{ $node->name }}<small>Wings Agent — Node Logs</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li><a href="{{ route('admin.nodes') }}">Nodes</a></li>
        <li><a href="{{ route('admin.nodes.view', $node->id) }}">{{ $node->name }}</a></li>
        <li class="active">Logs</li>
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
                <li><a href="{{ route('admin.nodes.view.wings-stats', $node->id) }}">Wings Stats</a></li>
                @if($firewallManagementEnabled ?? false)
                    <li><a href="{{ route('admin.nodes.view.firewall', $node->id) }}">Firewall</a></li>
                @endif
                @endif
                <li class="active"><a href="{{ route('admin.nodes.view.logs', $node->id) }}">Logs</a></li>
                <li><a href="{{ route('admin.nodes.view.backups', $node->id) }}">Backups</a></li>
            </ul>
        </div>
    </div>
</div>

{{-- ─── Log Viewer ─────────────────────────────────────────────────────────── --}}
<div class="row">
    <div class="col-xs-12">
        <div class="box box-primary" id="log-box">
            <div class="box-header with-border" style="background:#3c8dbc; color:#fff;">
                <h3 class="box-title" style="color:#fff;"><i class="fa fa-file-text-o"></i> Node Log Viewer</h3>
                <div class="box-tools pull-right" style="display:flex; align-items:center; gap:8px;">
                    {{-- Source Selector --}}
                    <select id="log-source-select" class="form-control input-sm" style="width:240px; display:inline-block;"
                            title="Select log source">
                        <option value="">— Select a log —</option>
                    </select>

                    {{-- Mode Toggle --}}
                    <div class="btn-group btn-group-sm" id="mode-group" style="display:none;">
                        <button id="btn-live" class="btn btn-success btn-sm active" title="Live — stream log in real time">
                            <i class="fa fa-play-circle"></i> Live
                        </button>
                        <button id="btn-history" class="btn btn-default btn-sm" title="History — view last N lines">
                            <i class="fa fa-history"></i> History
                        </button>
                    </div>

                    {{-- Lines selector (History mode) --}}
                    <select id="history-lines-select" class="form-control input-sm" style="width:100px; display:none;" title="Lines to load">
                        <option value="50">50 lines</option>
                        <option value="100" selected>100 lines</option>
                        <option value="200">200 lines</option>
                        <option value="500">500 lines</option>
                        <option value="1000">1000 lines</option>
                    </select>

                    {{-- Refresh / Reconnect --}}
                    <button id="btn-refresh" class="btn btn-warning btn-sm" style="display:none;" title="Refresh / Reconnect">
                        <i class="fa fa-refresh"></i> Refresh
                    </button>

                    {{-- Clear --}}
                    <button id="btn-clear" class="btn btn-default btn-sm" style="display:none;" title="Clear log output">
                        <i class="fa fa-trash-o"></i> Clear
                    </button>

                    {{-- Auto-scroll toggle --}}
                    <label id="autoscroll-label" style="color:#fff; font-weight:normal; margin:0; cursor:pointer; display:none;"
                           title="Toggle auto-scroll">
                        <input type="checkbox" id="autoscroll-check" checked style="margin-right:4px;">
                        Auto-scroll
                    </label>

                    {{-- Status badge --}}
                    <span id="log-status-badge" class="label label-default" style="font-size:12px; padding:4px 10px; display:none;">
                        <i class="fa fa-circle-o-notch fa-spin" style="margin-right:4px;"></i> Connecting…
                    </span>
                </div>
            </div>
            <div class="box-body" style="padding:0;">
                {{-- Placeholder when no source is selected --}}
                <div id="log-placeholder" style="padding:40px; text-align:center; color:#999;">
                    <i class="fa fa-file-text-o" style="font-size:42px; display:block; margin-bottom:12px;"></i>
                    Select a log source above to view logs.
                </div>

                {{-- Log output terminal --}}
                <pre id="log-output"
                     style="display:none; background:#0d1117; color:#c9d1d9; font-size:12px; font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;
                            margin:0; padding:12px 16px; overflow-y:auto; height:560px; border:none; border-radius:0 0 4px 4px; white-space:pre-wrap; word-break:break-all;"></pre>
            </div>
        </div>
    </div>
</div>

{{-- Legend / Info --}}
<div class="row">
    <div class="col-xs-12">
        <div class="box box-default" style="font-size:12px;">
            <div class="box-body" style="padding:12px 16px; color:#666;">
                <i class="fa fa-info-circle text-info"></i>&nbsp;
                <strong>Live mode</strong> streams log lines in real time via Server-Sent Events and requires an active Wings Agent connection.&nbsp;
                <strong>History mode</strong> loads the last N lines on demand.&nbsp;
                Use <strong>Refresh</strong> to reconnect a stalled live stream or reload history.
            </div>
        </div>
    </div>
</div>
@endsection

@section('footer-scripts')
@parent
<script>
(function () {
    'use strict';

    // ── Config ────────────────────────────────────────────────────
    var ticketUrl  = '{{ route('admin.nodes.wings-agent.ticket', $node->id) }}';

    var agentBaseUrl = '';
    var agentTicket  = '';

    function fetchTicket() {
        return fetch(ticketUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(d) {
                agentBaseUrl = d.base_url;
                agentTicket  = d.ticket;
            });
    }

    function agentGet(path) {
        return fetch(agentBaseUrl + path, {
            headers: { 'Authorization': 'Bearer ' + agentTicket }
        }).then(function(r) { return r.json(); });
    }

    var MAX_LINES = 2000; // maximum log lines kept in the terminal

    // ── State ─────────────────────────────────────────────────────
    var currentMode     = 'live';     // 'live' | 'history'
    var currentSource   = null;       // selected log source name
    var sse             = null;       // active EventSource
    var lineCount       = 0;
    var sourcesCache    = [];

    // ── DOM refs ──────────────────────────────────────────────────
    var elSelect        = document.getElementById('log-source-select');
    var elOutput        = document.getElementById('log-output');
    var elPlaceholder   = document.getElementById('log-placeholder');
    var elModeGroup     = document.getElementById('mode-group');
    var elBtnLive       = document.getElementById('btn-live');
    var elBtnHistory    = document.getElementById('btn-history');
    var elBtnRefresh    = document.getElementById('btn-refresh');
    var elBtnClear      = document.getElementById('btn-clear');
    var elLinesSelect   = document.getElementById('history-lines-select');
    var elAutoscrollLbl = document.getElementById('autoscroll-label');
    var elAutoscroll    = document.getElementById('autoscroll-check');
    var elStatusBadge   = document.getElementById('log-status-badge');

    // ── Helpers ───────────────────────────────────────────────────
    function setStatus(text, type) {
        // type: 'default' | 'success' | 'info' | 'warning' | 'danger'
        elStatusBadge.className = 'label label-' + (type || 'default');
        elStatusBadge.innerHTML = text;
        elStatusBadge.style.display = '';
    }

    function appendLine(line) {
        // Sanitize for XSS
        var safe = line
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        elOutput.innerHTML += safe + '\n';
        lineCount++;
        // Trim excess lines to avoid huge DOM
        if (lineCount > MAX_LINES + 200) {
            var text = elOutput.innerHTML;
            var cutAt = 0;
            var excess = lineCount - MAX_LINES;
            for (var i = 0; i < excess; i++) {
                var nl = text.indexOf('\n', cutAt);
                if (nl === -1) break;
                cutAt = nl + 1;
            }
            elOutput.innerHTML = text.slice(cutAt);
            lineCount = MAX_LINES;
        }
        if (elAutoscroll.checked) {
            elOutput.scrollTop = elOutput.scrollHeight;
        }
    }

    function clearOutput() {
        elOutput.innerHTML = '';
        lineCount = 0;
    }

    function showOutput() {
        elPlaceholder.style.display = 'none';
        elOutput.style.display = '';
        elModeGroup.style.display = '';
        elBtnRefresh.style.display = '';
        elBtnClear.style.display = '';
        elAutoscrollLbl.style.display = '';
    }

    function stopSSE() {
        if (sse) {
            sse.close();
            sse = null;
        }
    }

    // ── Source list loading ───────────────────────────────────────
    function loadSources() {
        agentGet('/logs/list')
            .then(function (data) {
                sourcesCache = data.logs || [];
                elSelect.innerHTML = '<option value="">— Select a log —</option>';
                sourcesCache.forEach(function (s) {
                    var opt = document.createElement('option');
                    opt.value = s.name;
                    opt.textContent = s.label + (s.available ? '' : ' (unavailable)');
                    opt.disabled = !s.available;
                    elSelect.appendChild(opt);
                });
            })
            .catch(function () {
                elSelect.innerHTML = '<option value="">⚠ Could not load log sources</option>';
            });
    }

    // ── Live streaming ────────────────────────────────────────────
    function startLive(source, lines) {
        stopSSE();
        clearOutput();
        showOutput();
        elLinesSelect.style.display = 'none';
        setStatus('<i class="fa fa-circle-o-notch fa-spin"></i> Connecting…', 'default');

        var url = agentBaseUrl + '/logs/stream?log=' + encodeURIComponent(source) + '&lines=' + encodeURIComponent(lines || 50) + '&ticket=' + encodeURIComponent(agentTicket);
        sse = new EventSource(url);

        sse.addEventListener('ready', function () {
            setStatus('<i class="fa fa-circle" style="color:#4CAF50"></i> Live', 'success');
        });

        sse.onmessage = function (e) {
            appendLine(e.data);
        };

        sse.addEventListener('end', function () {
            setStatus('<i class="fa fa-stop-circle"></i> Stream ended', 'warning');
            stopSSE();
        });

        sse.addEventListener('error', function (e) {
            appendLine('[AGENT] ' + (e.data || 'Error starting log stream'));
            setStatus('<i class="fa fa-exclamation-triangle"></i> Error', 'danger');
            stopSSE();
        });

        sse.onerror = function () {
            if (sse && sse.readyState === EventSource.CLOSED) {
                setStatus('<i class="fa fa-times-circle"></i> Disconnected', 'danger');
            }
        };
    }

    // ── History fetch ─────────────────────────────────────────────
    function loadHistory(source, lines) {
        stopSSE();
        clearOutput();
        showOutput();
        elLinesSelect.style.display = '';
        setStatus('<i class="fa fa-circle-o-notch fa-spin"></i> Loading…', 'default');

        var url = '/logs/history?log=' + encodeURIComponent(source) + '&lines=' + encodeURIComponent(lines || 100);
        agentGet(url)
            .then(function (data) {
                var lines = data.lines || [];
                if (lines.length === 0) {
                    appendLine('(no log lines returned)');
                } else {
                    lines.forEach(function (l) { appendLine(l); });
                }
                setStatus('<i class="fa fa-check-circle"></i> Loaded ' + lines.length + ' lines', 'success');
            })
            .catch(function (err) {
                appendLine('[ERROR] ' + err.message);
                setStatus('<i class="fa fa-exclamation-triangle"></i> Error', 'danger');
            });
    }

    // ── Main trigger ──────────────────────────────────────────────
    function startViewer() {
        if (!currentSource) return;
        var lines = parseInt(elLinesSelect.value) || 100;
        if (currentMode === 'live') {
            startLive(currentSource, 50);
        } else {
            loadHistory(currentSource, lines);
        }
    }

    // ── Event wiring ──────────────────────────────────────────────
    elSelect.addEventListener('change', function () {
        currentSource = elSelect.value || null;
        if (!currentSource) {
            stopSSE();
            elPlaceholder.style.display = '';
            elOutput.style.display = 'none';
            elModeGroup.style.display = 'none';
            elBtnRefresh.style.display = 'none';
            elBtnClear.style.display = 'none';
            elAutoscrollLbl.style.display = 'none';
            elStatusBadge.style.display = 'none';
            return;
        }
        startViewer();
    });

    elBtnLive.addEventListener('click', function () {
        if (currentMode === 'live') return;
        currentMode = 'live';
        elBtnLive.classList.add('active');
        elBtnHistory.classList.remove('active');
        elBtnLive.className = elBtnLive.className.replace('btn-default', 'btn-success');
        elBtnHistory.className = elBtnHistory.className.replace('btn-success', 'btn-default');
        startViewer();
    });

    elBtnHistory.addEventListener('click', function () {
        if (currentMode === 'history') return;
        currentMode = 'history';
        elBtnHistory.classList.add('active');
        elBtnLive.classList.remove('active');
        elBtnHistory.className = elBtnHistory.className.replace('btn-default', 'btn-success');
        elBtnLive.className = elBtnLive.className.replace('btn-success', 'btn-default');
        startViewer();
    });

    elBtnRefresh.addEventListener('click', function () {
        startViewer();
    });

    elBtnClear.addEventListener('click', function () {
        clearOutput();
    });

    elLinesSelect.addEventListener('change', function () {
        if (currentMode === 'history' && currentSource) {
            loadHistory(currentSource, parseInt(elLinesSelect.value) || 100);
        }
    });

    // ── Init ─────────────────────────────────────────────────────
    fetchTicket().then(function() { loadSources(); }).catch(function() {
        elSelect.innerHTML = '<option value="">⚠ Failed to obtain agent ticket</option>';
    });

    // Clean up SSE on page unload
    window.addEventListener('beforeunload', function () { stopSSE(); });
}());
</script>
@endsection
